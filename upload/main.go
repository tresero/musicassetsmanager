// mam-upload: file upload service for Music Assets Manager.
//
// PostgREST cannot accept multipart bodies, so uploads go through here.
//
//   POST /upload/presign   -> {url, key, method, headers}   (s3 backends)
//   PUT  /upload/direct?key=...  -> stores the body          (local backend)
//   GET  /upload/health
//
// The client asks for a presigned URL, uploads straight to the bucket,
// then creates the document row through PostgREST with the returned key.
// For local disk there is no presigning, so the body is proxied here.
//
// Auth is the same JWT PostgREST issues. The account_id claim decides
// which storage row is used, so one service serves every account.
package main

import (
    "context"
    "crypto/rand"
    "database/sql"
    "encoding/hex"
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "regexp"
    "strings"
    "time"

    "github.com/aws/aws-sdk-go-v2/aws"
    awscfg "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/credentials"
    "github.com/aws/aws-sdk-go-v2/service/s3"
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
    Kind          string
    Endpoint      sql.NullString
    Region        sql.NullString
    Bucket        sql.NullString
    BasePath      sql.NullString
    AccessKeyID   sql.NullString
    SecretKey     sql.NullString
    PublicBaseURL sql.NullString
}

type server struct {
    cfg Config
    db  *sql.DB
}

func main() {
    cfg := Config{
	DatabaseURL: env("MAM_DATABASE_URL", ""),
	JWTSecret:   env("MAM_JWT_SECRET", ""),
	Listen:      env("MAM_LISTEN", "127.0.0.1:3001"),
	LocalRoot:   env("MAM_LOCAL_ROOT", "/var/lib/mam/files"),
	MaxBytes:    5 << 30, // 5 GiB
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

    mux := http.NewServeMux()
    mux.HandleFunc("/upload/health", s.health)
    mux.HandleFunc("/upload/presign", s.presign)
    mux.HandleFunc("/upload/direct", s.direct)

    log.Printf("listening on %s", cfg.Listen)
    log.Fatal(http.ListenAndServe(cfg.Listen, mux))
}

func env(k, def string) string {
    if v := os.Getenv(k); v != "" {
	return v
    }
    return def
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

func (s *server) storage(ctx context.Context, account string) (*Storage, error) {
    var st Storage
    err := s.db.QueryRowContext(ctx, `
	SELECT kind, endpoint, region, bucket, base_path,
	       access_key_id, secret_key, public_base_url
	  FROM music.account_storage
	 WHERE account_id = $1`, account).
	Scan(&st.Kind, &st.Endpoint, &st.Region, &st.Bucket, &st.BasePath,
	    &st.AccessKeyID, &st.SecretKey, &st.PublicBaseURL)
    if errors.Is(err, sql.ErrNoRows) {
	return nil, errors.New("no storage configured for this account")
    }
    return &st, err
}

// ----------------------------------------------------------------- key

var nonWord = regexp.MustCompile(`[^a-z0-9]+`)

func slug(s string) string {
    s = strings.ToLower(strings.TrimSpace(s))
    s = nonWord.ReplaceAllString(s, "-")
    s = strings.Trim(s, "-")
    if len(s) > 60 {
	s = s[:60]
	s = strings.Trim(s, "-")
    }
    if s == "" {
	s = "file"
    }
    return s
}

func suffix() string {
    b := make([]byte, 3)
    rand.Read(b)
    return hex.EncodeToString(b)
}

// buildKey produces documents/<year>/<slug>-<rand>.<ext>
// The random suffix avoids collisions without needing the document id,
// which does not exist until after the upload.
func buildKey(base, kind, title, filename string) string {
    ext := strings.ToLower(filepath.Ext(filename))
    if len(ext) > 10 {
	ext = ""
    }
    name := slug(title)
    if name == "file" {
	name = slug(strings.TrimSuffix(filename, filepath.Ext(filename)))
    }
    parts := []string{}
    if b := strings.Trim(base, "/"); b != "" {
	parts = append(parts, b)
    }
    parts = append(parts, kind, time.Now().Format("2006"),
	fmt.Sprintf("%s-%s%s", name, suffix(), ext))
    return strings.Join(parts, "/")
}

// ------------------------------------------------------------- handlers

func (s *server) health(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("ok"))
}

type presignReq struct {
    Title       string `json:"title"`
    Filename    string `json:"filename"`
    ContentType string `json:"content_type"`
    Kind        string `json:"kind"` // documents | audio | artwork
}

type presignResp struct {
    Method  string            `json:"method"`
    URL     string            `json:"url"`
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
    switch req.Kind {
    case "documents", "audio", "artwork":
    default:
	http.Error(w, "unknown kind", http.StatusBadRequest)
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

    key := buildKey(st.BasePath.String, req.Kind, req.Title, req.Filename)

    switch st.Kind {
    case "s3":
	if !st.Bucket.Valid || !st.AccessKeyID.Valid || !st.SecretKey.Valid {
	    http.Error(w, "storage is incomplete: bucket and keys are required",
		http.StatusBadRequest)
	    return
	}
	url, err := s.presignPut(r.Context(), st, key, req.ContentType)
	if err != nil {
	    log.Printf("presign: %v", err)
	    http.Error(w, "could not sign the upload", http.StatusInternalServerError)
	    return
	}
	writeJSON(w, presignResp{
	    Method:  "PUT",
	    URL:     url,
	    Key:     key,
	    Headers: map[string]string{"Content-Type": req.ContentType},
	    Backend: "s3",
	})

    case "local":
	// no signing possible; the client PUTs to this service instead
	writeJSON(w, presignResp{
	    Method:  "PUT",
	    URL:     "/upload/direct?key=" + key,
	    Key:     key,
	    Headers: map[string]string{"Content-Type": req.ContentType},
	    Backend: "local",
	})

    default:
	http.Error(w, "backend "+st.Kind+" does not support uploads yet",
	    http.StatusBadRequest)
    }
}

func (s *server) presignPut(ctx context.Context, st *Storage, key, ctype string) (string, error) {
    opts := []func(*awscfg.LoadOptions) error{
	awscfg.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
	    st.AccessKeyID.String, st.SecretKey.String, "")),
    }
    region := st.Region.String
    if region == "" {
	region = "us-east-1"
    }
    opts = append(opts, awscfg.WithRegion(region))

    cfg, err := awscfg.LoadDefaultConfig(ctx, opts...)
    if err != nil {
	return "", err
    }

    client := s3.NewFromConfig(cfg, func(o *s3.Options) {
	if st.Endpoint.Valid && st.Endpoint.String != "" {
	    o.BaseEndpoint = aws.String(st.Endpoint.String)
	    // most non-AWS providers need path style
	    o.UsePathStyle = true
	}
    })

    ps := s3.NewPresignClient(client, func(o *s3.PresignOptions) {
	o.Expires = 15 * time.Minute
    })

    out, err := ps.PresignPutObject(ctx, &s3.PutObjectInput{
	Bucket:      aws.String(st.Bucket.String),
	Key:         aws.String(key),
	ContentType: aws.String(ctype),
    })
    if err != nil {
	return "", err
    }
    return out.URL, nil
}

// direct handles local-disk uploads, which cannot be presigned.
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
    if key == "" || strings.Contains(key, "..") || strings.HasPrefix(key, "/") {
	http.Error(w, "bad key", http.StatusBadRequest)
	return
    }

    st, err := s.storage(r.Context(), account)
    if err != nil {
	http.Error(w, err.Error(), http.StatusBadRequest)
	return
    }
    if st.Kind != "local" {
	http.Error(w, "direct upload is only for the local backend",
	    http.StatusBadRequest)
	return
    }

    // account prefix keeps tenants apart on a shared disk
    dest := filepath.Join(s.cfg.LocalRoot, account, filepath.Clean(key))
    if !strings.HasPrefix(dest, filepath.Join(s.cfg.LocalRoot, account)) {
	http.Error(w, "bad key", http.StatusBadRequest)
	return
    }
    if err := os.MkdirAll(filepath.Dir(dest), 0o750); err != nil {
	log.Printf("mkdir: %v", err)
	http.Error(w, "could not store the file", http.StatusInternalServerError)
	return
    }

    f, err := os.Create(dest)
    if err != nil {
	log.Printf("create: %v", err)
	http.Error(w, "could not store the file", http.StatusInternalServerError)
	return
    }
    defer f.Close()

    n, err := io.Copy(f, io.LimitReader(r.Body, s.cfg.MaxBytes))
    if err != nil {
	os.Remove(dest)
	log.Printf("write: %v", err)
	http.Error(w, "could not store the file", http.StatusInternalServerError)
	return
    }

    writeJSON(w, map[string]any{"key": key, "bytes": n})
}

func writeJSON(w http.ResponseWriter, v any) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(v)
}