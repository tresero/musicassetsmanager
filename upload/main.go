// mam-upload: file service for Music Assets Manager.
//
//   POST /upload/presign             where to send a file, or that it exists
//   PUT  /upload/direct?key=...      local backend only
//   GET  /upload/download?key=...    a short-lived link to open or save a file
//   GET  /upload/file?...            local backend: serves a signed link
//   GET  /upload/health
//
//   mam-upload sweep [-dry-run] [-grace 24h]
//        delete stored files that nothing in the database refers to
//
// Keys are the SHA-256 of the file's contents, so the same file uploaded
// twice is one object. Readable names live in the database and are applied
// on download.
package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awscfg "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/aws/smithy-go"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Listen      string
	LocalRoot   string
	MaxBytes    int64
}

type Storage struct {
	Kind        string
	Endpoint    string
	Region      string
	Bucket      string
	BasePath    string
	AccessKeyID string
	SecretKey   string
}

type server struct {
	cfg Config
	db  *sql.DB
}

// Top-level prefixes this service writes under. The sweep never looks
// outside them, so anything else kept in the bucket is left alone.
var kinds = []string{"documents", "audio", "artwork"}

func main() {
	cfg := Config{
		DatabaseURL: env("MAM_DATABASE_URL", ""),
		JWTSecret:   env("MAM_JWT_SECRET", ""),
		Listen:      env("MAM_LISTEN", "127.0.0.1:3001"),
		LocalRoot:   env("MAM_LOCAL_ROOT", "/var/lib/mam/files"),
		MaxBytes:    5 << 30,
	}
	if cfg.DatabaseURL == "" || cfg.JWTSecret == "" {
		log.Fatal("MAM_DATABASE_URL and MAM_JWT_SECRET are required")
	}

	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(4)
	if err := db.Ping(); err != nil {
		log.Fatalf("database: %v", err)
	}

	s := &server{cfg: cfg, db: db}

	if len(os.Args) > 1 && os.Args[1] == "sweep" {
		fl := flag.NewFlagSet("sweep", flag.ExitOnError)
		dry := fl.Bool("dry-run", false, "report what would be deleted without deleting")
		grace := fl.Duration("grace", 24*time.Hour, "leave files younger than this alone")
		fl.Parse(os.Args[2:])
		if err := s.sweep(context.Background(), *grace, *dry); err != nil {
			log.Fatalf("sweep: %v", err)
		}
		return
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/upload/health", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
	mux.HandleFunc("/upload/presign", s.presign)
	mux.HandleFunc("/upload/direct", s.direct)
	mux.HandleFunc("/upload/download", s.download)
	mux.HandleFunc("/upload/file", s.serveSigned)

	log.Printf("listening on %s", cfg.Listen)
	log.Fatal(http.ListenAndServe(cfg.Listen, mux))
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// ---------------------------------------------------------------- auth

func (s *server) account(r *http.Request) (string, error) {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return "", errors.New("missing bearer token")
	}
	tok, err := jwt.Parse(strings.TrimPrefix(h, "Bearer "),
		func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return []byte(s.cfg.JWTSecret), nil
		})
	if err != nil || !tok.Valid {
		return "", errors.New("invalid token")
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid claims")
	}
	acct, _ := claims["account_id"].(string)
	if acct == "" {
		return "", errors.New("no account_id claim")
	}
	return acct, nil
}

// ------------------------------------------------------------- storage

func (s *server) storage(ctx context.Context, account string) (*Storage, error) {
	var st Storage
	var endpoint, region, bucket, base, keyID, secret sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT kind, endpoint, region, bucket, base_path, access_key_id, secret_key
		  FROM music.account_storage
		 WHERE account_id = $1`, account).
		Scan(&st.Kind, &endpoint, &region, &bucket, &base, &keyID, &secret)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("no storage configured for this account")
	}
	if err != nil {
		return nil, err
	}
	st.Endpoint = strings.TrimSpace(endpoint.String)
	st.Region = strings.TrimSpace(region.String)
	st.Bucket = strings.TrimSpace(bucket.String)
	st.BasePath = strings.Trim(strings.TrimSpace(base.String), "/")
	st.AccessKeyID = strings.TrimSpace(keyID.String)
	st.SecretKey = strings.TrimSpace(secret.String)
	return &st, nil
}

func (s *server) s3Client(ctx context.Context, st *Storage) (*s3.Client, error) {
	if st.Bucket == "" || st.AccessKeyID == "" || st.SecretKey == "" {
		return nil, errors.New("storage is incomplete: bucket and keys are required")
	}
	region := st.Region
	if region == "" {
		region = "us-east-1"
	}
	cfg, err := awscfg.LoadDefaultConfig(ctx,
		awscfg.WithRegion(region),
		awscfg.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(st.AccessKeyID, st.SecretKey, "")))
	if err != nil {
		return nil, err
	}
	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		if st.Endpoint != "" {
			o.BaseEndpoint = aws.String(st.Endpoint)
			o.UsePathStyle = true
		}
	}), nil
}

func isNotFound(err error) bool {
	var nf *types.NotFound
	if errors.As(err, &nf) {
		return true
	}
	var nk *types.NoSuchKey
	if errors.As(err, &nk) {
		return true
	}
	var api smithy.APIError
	return errors.As(err, &api) &&
		(api.ErrorCode() == "NotFound" || api.ErrorCode() == "NoSuchKey")
}

// ----------------------------------------------------------------- keys

var sha256Hex = regexp.MustCompile(`^[0-9a-f]{64}$`)
var extRe = regexp.MustCompile(`^[a-z0-9]{1,10}$`)

// <base>/<kind>/<sha256>.<ext>
func contentKey(base, kind, sum, filename string) string {
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(filename), "."))
	name := sum
	if extRe.MatchString(ext) {
		name += "." + ext
	}
	parts := []string{}
	if base != "" {
		parts = append(parts, base)
	}
	return strings.Join(append(parts, kind, name), "/")
}

func validKey(key string) bool {
	return key != "" && !strings.Contains(key, "..") && !strings.HasPrefix(key, "/")
}

func (s *server) localPath(account, key string) (string, bool) {
	root := filepath.Join(s.cfg.LocalRoot, account)
	p := filepath.Join(root, filepath.Clean(key))
	return p, strings.HasPrefix(p, root+string(os.PathSeparator))
}

// -------------------------------------------------------------- presign

type presignReq struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	Kind        string `json:"kind"`
	Sha256      string `json:"sha256"`
}

type presignResp struct {
	Exists  bool              `json:"exists"`
	Method  string            `json:"method,omitempty"`
	URL     string            `json:"url,omitempty"`
	Key     string            `json:"key"`
	Headers map[string]string `json:"headers,omitempty"`
	Backend string            `json:"backend"`
}

func (s *server) presign(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	account, err := s.account(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var req presignReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<16)).Decode(&req); err != nil {
		http.Error(w, "bad request body", http.StatusBadRequest)
		return
	}
	if req.Kind == "" {
		req.Kind = "documents"
	}
	known := false
	for _, k := range kinds {
		known = known || k == req.Kind
	}
	if !known {
		http.Error(w, "unknown kind", http.StatusBadRequest)
		return
	}
	sum := strings.ToLower(strings.TrimSpace(req.Sha256))
	if !sha256Hex.MatchString(sum) {
		http.Error(w, "sha256 of the file is required", http.StatusBadRequest)
		return
	}
	if req.ContentType == "" {
		req.ContentType = "application/octet-stream"
	}

	st, err := s.storage(r.Context(), account)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	key := contentKey(st.BasePath, req.Kind, sum, req.Filename)

	switch st.Kind {
	case "s3":
		client, err := s.s3Client(r.Context(), st)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_, err = client.HeadObject(r.Context(), &s3.HeadObjectInput{
			Bucket: aws.String(st.Bucket), Key: aws.String(key)})
		if err == nil {
			writeJSON(w, presignResp{Exists: true, Key: key, Backend: "s3"})
			return
		}
		if !isNotFound(err) {
			log.Printf("head %s: %v", key, err)
			http.Error(w, "could not check storage", http.StatusBadGateway)
			return
		}
		out, err := s3.NewPresignClient(client, func(o *s3.PresignOptions) {
			o.Expires = 30 * time.Minute
		}).PresignPutObject(r.Context(), &s3.PutObjectInput{
			Bucket:      aws.String(st.Bucket),
			Key:         aws.String(key),
			ContentType: aws.String(req.ContentType),
		})
		if err != nil {
			log.Printf("presign put: %v", err)
			http.Error(w, "could not sign the upload", http.StatusInternalServerError)
			return
		}
		writeJSON(w, presignResp{
			Method: "PUT", URL: out.URL, Key: key, Backend: "s3",
			Headers: map[string]string{"Content-Type": req.ContentType},
		})

	case "local":
		p, ok := s.localPath(account, key)
		if !ok {
			http.Error(w, "bad key", http.StatusBadRequest)
			return
		}
		if _, err := os.Stat(p); err == nil {
			writeJSON(w, presignResp{Exists: true, Key: key, Backend: "local"})
			return
		}
		writeJSON(w, presignResp{
			Method: "PUT", URL: "/upload/direct?key=" + url.QueryEscape(key),
			Key: key, Backend: "local",
			Headers: map[string]string{"Content-Type": req.ContentType},
		})

	default:
		http.Error(w, "backend "+st.Kind+" does not support uploads", http.StatusBadRequest)
	}
}

// --------------------------------------------------------------- direct

func (s *server) direct(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	account, err := s.account(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	key := r.URL.Query().Get("key")
	if !validKey(key) {
		http.Error(w, "bad key", http.StatusBadRequest)
		return
	}
	st, err := s.storage(r.Context(), account)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if st.Kind != "local" {
		http.Error(w, "direct upload is only for the local backend", http.StatusBadRequest)
		return
	}
	dest, ok := s.localPath(account, key)
	if !ok {
		http.Error(w, "bad key", http.StatusBadRequest)
		return
	}
	if err := os.MkdirAll(filepath.Dir(dest), 0o750); err != nil {
		log.Printf("mkdir: %v", err)
		http.Error(w, "could not store the file", http.StatusInternalServerError)
		return
	}

	// write to a temp name and rename, so a broken upload never leaves a
	// partial file under the real key
	tmp := dest + ".part-" + randHex(4)
	f, err := os.Create(tmp)
	if err != nil {
		log.Printf("create: %v", err)
		http.Error(w, "could not store the file", http.StatusInternalServerError)
		return
	}
	n, err := io.Copy(f, io.LimitReader(r.Body, s.cfg.MaxBytes))
	f.Close()
	if err == nil {
		err = os.Rename(tmp, dest)
	}
	if err != nil {
		os.Remove(tmp)
		log.Printf("write: %v", err)
		http.Error(w, "could not store the file", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"key": key, "bytes": n})
}

func randHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// -------------------------------------------------------------- download

// A filename header that survives accents: an ASCII fallback plus the
// RFC 5987 UTF-8 form, which every current browser prefers.
func disposition(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "inline"
	}
	ascii := strings.Map(func(r rune) rune {
		if r < 32 || r > 126 || r == '"' || r == '\\' {
			return '_'
		}
		return r
	}, name)
	return fmt.Sprintf(`inline; filename="%s"; filename*=UTF-8''%s`,
		ascii, url.PathEscape(name))
}

// download answers with a short-lived link rather than redirecting, so
// the browser opens the file directly instead of fetching it twice.
func (s *server) download(w http.ResponseWriter, r *http.Request) {
	account, err := s.account(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	key := r.URL.Query().Get("key")
	name := r.URL.Query().Get("name")
	if !validKey(key) {
		http.Error(w, "bad key", http.StatusBadRequest)
		return
	}
	st, err := s.storage(r.Context(), account)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	switch st.Kind {
	case "s3":
		client, err := s.s3Client(r.Context(), st)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		out, err := s3.NewPresignClient(client, func(o *s3.PresignOptions) {
			o.Expires = 5 * time.Minute
		}).PresignGetObject(r.Context(), &s3.GetObjectInput{
			Bucket:                     aws.String(st.Bucket),
			Key:                        aws.String(key),
			ResponseContentDisposition: aws.String(disposition(name)),
		})
		if err != nil {
			log.Printf("presign get: %v", err)
			http.Error(w, "could not sign the download", http.StatusInternalServerError)
			return
		}
		writeJSON(w, map[string]string{"url": out.URL})

	case "local":
		exp := strconv.FormatInt(time.Now().Add(5*time.Minute).Unix(), 10)
		q := url.Values{}
		q.Set("a", account)
		q.Set("key", key)
		q.Set("name", name)
		q.Set("exp", exp)
		q.Set("sig", s.sign(account, key, name, exp))
		writeJSON(w, map[string]string{"url": "/upload/file?" + q.Encode()})

	default:
		http.Error(w, "backend "+st.Kind+" cannot serve files", http.StatusBadRequest)
	}
}

func (s *server) sign(parts ...string) string {
	m := hmac.New(sha256.New, []byte(s.cfg.JWTSecret))
	m.Write([]byte(strings.Join(parts, "\x00")))
	return hex.EncodeToString(m.Sum(nil))
}

// serveSigned is the local backend's equivalent of a presigned GET.
func (s *server) serveSigned(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	account, key, name, exp, sig := q.Get("a"), q.Get("key"), q.Get("name"), q.Get("exp"), q.Get("sig")

	e, err := strconv.ParseInt(exp, 10, 64)
	if err != nil || time.Now().Unix() > e ||
		!hmac.Equal([]byte(sig), []byte(s.sign(account, key, name, exp))) {
		http.Error(w, "link expired or invalid", http.StatusForbidden)
		return
	}
	if !validKey(key) {
		http.Error(w, "bad key", http.StatusBadRequest)
		return
	}
	p, ok := s.localPath(account, key)
	if !ok {
		http.Error(w, "bad key", http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Disposition", disposition(name))
	http.ServeFile(w, r, p)
}

// ----------------------------------------------------------------- sweep

// sweep deletes stored files that no document or audio row refers to.
//
// Only keys under the service's own prefixes are considered, and anything
// younger than the grace period is left alone, so a file uploaded to a
// form that has not been saved yet survives.
func (s *server) sweep(ctx context.Context, grace time.Duration, dry bool) error {
	rows, err := s.db.QueryContext(ctx,
		`SELECT account_id FROM music.account_storage WHERE kind IN ('s3', 'local')`)
	if err != nil {
		return err
	}
	var accounts []string
	for rows.Next() {
		var a string
		if err := rows.Scan(&a); err != nil {
			rows.Close()
			return err
		}
		accounts = append(accounts, a)
	}
	rows.Close()

	cutoff := time.Now().Add(-grace)
	for _, account := range accounts {
		if err := s.sweepAccount(ctx, account, cutoff, dry); err != nil {
			log.Printf("account %s: %v", account, err)
		}
	}
	return nil
}

func (s *server) referenced(ctx context.Context, account string) (map[string]bool, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT d.storage_uri FROM music.document d
		 WHERE d.account_id = $1
		UNION
		SELECT a.storage_uri FROM music.audio_file a
		  JOIN music.recording r ON r.id = a.recording_id
		 WHERE r.account_id = $1`, account)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	refs := map[string]bool{}
	for rows.Next() {
		var k sql.NullString
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		if k.Valid {
			refs[strings.TrimSpace(k.String)] = true
		}
	}
	return refs, rows.Err()
}

func (s *server) sweepAccount(ctx context.Context, account string, cutoff time.Time, dry bool) error {
	st, err := s.storage(ctx, account)
	if err != nil {
		return err
	}
	refs, err := s.referenced(ctx, account)
	if err != nil {
		return err
	}

	prefixes := make([]string, len(kinds))
	for i, k := range kinds {
		if st.BasePath != "" {
			prefixes[i] = st.BasePath + "/" + k + "/"
		} else {
			prefixes[i] = k + "/"
		}
	}

	verb := "deleted"
	if dry {
		verb = "would delete"
	}
	var kept, removed int

	consider := func(key string, modified time.Time, remove func() error) {
		if refs[key] || modified.After(cutoff) {
			kept++
			return
		}
		if !dry {
			if err := remove(); err != nil {
				log.Printf("  %s: %v", key, err)
				return
			}
		}
		removed++
		log.Printf("  %s %s", verb, key)
	}

	switch st.Kind {
	case "s3":
		client, err := s.s3Client(ctx, st)
		if err != nil {
			return err
		}
		for _, prefix := range prefixes {
			p := s3.NewListObjectsV2Paginator(client, &s3.ListObjectsV2Input{
				Bucket: aws.String(st.Bucket), Prefix: aws.String(prefix)})
			for p.HasMorePages() {
				page, err := p.NextPage(ctx)
				if err != nil {
					return err
				}
				for _, o := range page.Contents {
					key := aws.ToString(o.Key)
					consider(key, aws.ToTime(o.LastModified), func() error {
						_, err := client.DeleteObject(ctx, &s3.DeleteObjectInput{
							Bucket: aws.String(st.Bucket), Key: aws.String(key)})
						return err
					})
				}
			}
		}

	case "local":
		root := filepath.Join(s.cfg.LocalRoot, account)
		err := filepath.WalkDir(root, func(p string, d fs.DirEntry, err error) error {
			if err != nil {
				if errors.Is(err, fs.ErrNotExist) {
					return nil
				}
				return err
			}
			if d.IsDir() {
				return nil
			}
			rel, err := filepath.Rel(root, p)
			if err != nil {
				return err
			}
			key := filepath.ToSlash(rel)
			managed := false
			for _, prefix := range prefixes {
				managed = managed || strings.HasPrefix(key, prefix)
			}
			if !managed {
				return nil
			}
			info, err := d.Info()
			if err != nil {
				return err
			}
			consider(key, info.ModTime(), func() error { return os.Remove(p) })
			return nil
		})
		if err != nil {
			return err
		}
	}

	log.Printf("account %s: %d kept, %d %s", account, kept, removed, verb)
	return nil
}