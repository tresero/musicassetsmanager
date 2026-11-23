package main

// Download a recording's stems or multitrack tracks as one zip (#43).
//
//   POST /upload/zip-link  {"recording_id": 28, "kind": "stems"}
//        a short-lived signed link to the zip, for the browser to open
//   GET  /upload/zip?...   the zip, built as it is sent
//
// Each track is stored as its own file, so the zip is made on download.
// Audio hardly compresses, so files are stored in it as they are, which
// keeps a large session quick to build.

import (
	"archive/zip"
	"crypto/hmac"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// The lists that can be zipped, and the audio file type each holds.
var zipKinds = map[string]string{"stems": "Stem", "multitracks": "Multitrack"}

var zipLabels = map[string]string{"stems": "Stems", "multitracks": "Multitracks"}

type zipFile struct {
	Key, FileName, Title, Format string
}

// zipEntryNames names each file in the zip: its own file name, else its
// description with the format's extension, else its stored key's name.
// Folders are dropped, and a name used twice gets (2), (3).
func zipEntryNames(files []zipFile) []string {
	clean := func(s string) string {
		s = strings.TrimSpace(strings.ReplaceAll(s, "\\", "/"))
		s = strings.ReplaceAll(s, " / ", " - ")
		s = path.Base(s)
		return strings.Trim(s, ". ")
	}
	used := map[string]int{}
	names := make([]string, len(files))
	for i, f := range files {
		name := clean(f.FileName)
		if name == "" && strings.TrimSpace(f.Title) != "" {
			name = strings.ReplaceAll(strings.TrimSpace(f.Title), "/", "-")
			name = strings.Join(strings.Fields(name), " ")
			if f.Format != "" {
				name += "." + strings.ToLower(f.Format)
			}
			name = clean(name)
		}
		if name == "" {
			name = clean(f.Key)
		}
		base, ext := name, path.Ext(name)
		base = strings.TrimSuffix(name, ext)
		used[strings.ToLower(name)]++
		if n := used[strings.ToLower(name)]; n > 1 {
			name = fmt.Sprintf("%s (%d)%s", base, n, ext)
			used[strings.ToLower(name)]++
		}
		names[i] = name
	}
	return names
}

type zipLinkReq struct {
	RecordingID int    `json:"recording_id"`
	Kind        string `json:"kind"`
}

func (s *server) zipLink(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	account, err := s.account(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	var req zipLinkReq
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<12)).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if _, ok := zipKinds[req.Kind]; !ok || req.RecordingID <= 0 {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	var n int
	if err := s.db.QueryRowContext(r.Context(),
		`SELECT count(*) FROM music.recording WHERE id = $1 AND account_id = $2`,
		req.RecordingID, account).Scan(&n); err != nil || n == 0 {
		http.Error(w, "no such recording", http.StatusNotFound)
		return
	}
	rec := strconv.Itoa(req.RecordingID)
	exp := strconv.FormatInt(time.Now().Add(5*time.Minute).Unix(), 10)
	q := url.Values{}
	q.Set("a", account)
	q.Set("r", rec)
	q.Set("k", req.Kind)
	q.Set("exp", exp)
	q.Set("sig", s.sign(account, "zip", rec, req.Kind, exp))
	writeJSON(w, map[string]string{"url": "/upload/zip?" + q.Encode()})
}

func (s *server) serveZip(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	account, rec, kind, exp, sig := q.Get("a"), q.Get("r"), q.Get("k"), q.Get("exp"), q.Get("sig")
	e, err := strconv.ParseInt(exp, 10, 64)
	if err != nil || time.Now().Unix() > e ||
		!hmac.Equal([]byte(sig), []byte(s.sign(account, "zip", rec, kind, exp))) {
		http.Error(w, "link expired or invalid", http.StatusForbidden)
		return
	}
	typeName, ok := zipKinds[kind]
	if !ok {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	ctx := r.Context()

	var title string
	if err := s.db.QueryRowContext(ctx,
		`SELECT title FROM music.recording WHERE id = $1 AND account_id = $2`, rec, account).
		Scan(&title); err != nil {
		http.Error(w, "no such recording", http.StatusNotFound)
		return
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT f.storage_uri, coalesce(f.file_name, ''), coalesce(f.title, ''), coalesce(f.format, '')
		  FROM music.audio_file f
		  JOIN music.audio_file_type t ON t.id = f.file_type_id
		 WHERE f.recording_id = $1 AND t.name = $2
		 ORDER BY coalesce(f.title, f.file_name), f.id`, rec, typeName)
	if err != nil {
		log.Printf("zip list: %v", err)
		http.Error(w, "could not list the files", http.StatusInternalServerError)
		return
	}
	var files []zipFile
	for rows.Next() {
		var f zipFile
		if err := rows.Scan(&f.Key, &f.FileName, &f.Title, &f.Format); err != nil {
			rows.Close()
			http.Error(w, "could not list the files", http.StatusInternalServerError)
			return
		}
		if validKey(f.Key) {
			files = append(files, f)
		}
	}
	rows.Close()
	if len(files) == 0 {
		http.Error(w, "no files to zip", http.StatusNotFound)
		return
	}

	st, err := s.storage(ctx, account)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	var client *s3.Client
	if st.Kind == "s3" {
		if client, err = s.s3Client(ctx, st); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	} else if st.Kind != "local" {
		http.Error(w, "backend "+st.Kind+" cannot serve files", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", dispositionAs("attachment", title+" - "+zipLabels[kind]+".zip"))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	zw := zip.NewWriter(w)
	names := zipEntryNames(files)
	for i, f := range files {
		var body io.ReadCloser
		switch st.Kind {
		case "s3":
			out, err := client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(st.Bucket), Key: aws.String(f.Key)})
			if err != nil {
				log.Printf("zip %s: get %s: %v", rec, f.Key, err)
				continue
			}
			body = out.Body
		case "local":
			p, ok := s.localPath(account, f.Key)
			if !ok {
				continue
			}
			fh, err := os.Open(p)
			if err != nil {
				log.Printf("zip %s: open %s: %v", rec, f.Key, err)
				continue
			}
			body = fh
		}
		entry, err := zw.CreateHeader(&zip.FileHeader{Name: names[i], Method: zip.Store, Modified: time.Now()})
		if err == nil {
			_, err = io.Copy(entry, body)
		}
		body.Close()
		if err != nil {
			log.Printf("zip %s: write %s: %v", rec, names[i], err)
			return
		}
	}
	if err := zw.Close(); err != nil {
		log.Printf("zip %s: close: %v", rec, err)
	}
}
