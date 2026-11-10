package main

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

const hash = "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7"

func TestContentHash(t *testing.T) {
	cases := []struct {
		base, key string
		ok        bool
	}{
		{"", "documents/" + hash + ".pdf", true},
		{"", "audio/" + hash, true},
		{"acme", "acme/artwork/" + hash + ".png", true},
		{"", "documents/x.html", false},
		{"", "documents/" + hash + ".pdf.html", false},
		{"", "scripts/" + hash + ".js", false},
		{"", "documents/" + strings.ToUpper(hash) + ".pdf", false},
		{"", "documents/sub/" + hash + ".pdf", false},
		{"acme", "documents/" + hash + ".pdf", false},
		{"acme", "other/documents/" + hash + ".pdf", false},
	}
	for _, c := range cases {
		sum, ok := contentHash(c.base, c.key)
		if ok != c.ok || (ok && sum != hash) {
			t.Errorf("contentHash(%q, %q) = %q, %v; want ok=%v", c.base, c.key, sum, ok, c.ok)
		}
	}
}

func TestServeSignedHeaders(t *testing.T) {
	root := t.TempDir()
	s := &server{cfg: Config{JWTSecret: "test", LocalRoot: root}}
	const account = "11111111-1111-1111-1111-111111111111"

	get := func(key, name string) *httptest.ResponseRecorder {
		p := filepath.Join(root, account, key)
		if err := os.MkdirAll(filepath.Dir(p), 0o750); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte("<script>alert(1)</script>"), 0o640); err != nil {
			t.Fatal(err)
		}
		exp := strconv.FormatInt(time.Now().Add(time.Minute).Unix(), 10)
		q := url.Values{"a": {account}, "key": {key}, "name": {name}, "exp": {exp},
			"sig": {s.sign(account, key, name, exp)}}
		rec := httptest.NewRecorder()
		s.serveSigned(rec, httptest.NewRequest(http.MethodGet, "/upload/file?"+q.Encode(), nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: status %d", key, rec.Code)
		}
		return rec
	}

	for _, key := range []string{"documents/" + hash + ".html", "artwork/" + hash + ".svg", "documents/" + hash} {
		h := get(key, "Split sheet").Header()
		if got := h.Get("Content-Type"); got != "application/octet-stream" {
			t.Errorf("%s: Content-Type %q", key, got)
		}
		if got := h.Get("Content-Security-Policy"); got != "sandbox" {
			t.Errorf("%s: Content-Security-Policy %q", key, got)
		}
		if got := h.Get("Content-Disposition"); !strings.HasPrefix(got, "attachment;") {
			t.Errorf("%s: Content-Disposition %q", key, got)
		}
		if got := h.Get("X-Content-Type-Options"); got != "nosniff" {
			t.Errorf("%s: X-Content-Type-Options %q", key, got)
		}
	}

	h := get("documents/"+hash+".PDF", "Split sheet").Header()
	if got := h.Get("Content-Type"); got != "application/pdf" {
		t.Errorf("pdf: Content-Type %q", got)
	}
	if got := h.Get("Content-Disposition"); !strings.HasPrefix(got, "inline;") {
		t.Errorf("pdf: Content-Disposition %q", got)
	}
	if got := h.Get("X-Content-Type-Options"); got != "nosniff" {
		t.Errorf("pdf: X-Content-Type-Options %q", got)
	}
}
