package main

import (
	"net"
	"net/mail"
	"strings"
	"testing"
)

func TestBuildMessagePlain(t *testing.T) {
	from := &mail.Address{Name: "Ada Example", Address: "ada@example.com"}
	to := []*mail.Address{{Address: "jane@example.org"}}
	msg := string(buildMessage(from, to, nil, "Corazón split sheet\r\nBcc: evil@example.net", "Hello,\nattached.", nil, "id1"))
	head, body, _ := strings.Cut(msg, "\r\n\r\n")
	for _, want := range []string{"From: \"Ada Example\" <ada@example.com>", "To: <jane@example.org>",
		"Subject: =?utf-8?q?Coraz=C3=B3n_split_sheet_Bcc:_evil@example.net?=", "Message-ID: <id1@example.com>",
		"Content-Type: text/plain; charset=utf-8", "MIME-Version: 1.0"} {
		if !strings.Contains(head, want) {
			t.Errorf("header missing %q in\n%s", want, head)
		}
	}
	if strings.Contains(head, "\nBcc:") {
		t.Error("a line break in the subject must not add a header")
	}
	if !strings.Contains(body, "Hello,\r\nattached.") {
		t.Errorf("body lines end in CRLF: %q", body)
	}
}

func TestBuildMessageAttachment(t *testing.T) {
	from := &mail.Address{Address: "ada@example.com"}
	to := []*mail.Address{{Address: "jane@example.org"}}
	cc := []*mail.Address{{Address: "bob@example.org"}}
	att := []attachment{{Name: "Split sheet.pdf", Type: "application/pdf", Data: []byte("%PDF-1.4 hello")}}
	msg := string(buildMessage(from, to, cc, "Split", "See attached.", att, "id2"))
	for _, want := range []string{"Cc: <bob@example.org>", "Content-Type: multipart/mixed; boundary=",
		"Content-Type: application/pdf", "Content-Disposition: attachment; filename=\"Split sheet.pdf\"",
		"Content-Transfer-Encoding: base64", "JVBERi0xLjQgaGVsbG8="} {
		if !strings.Contains(msg, want) {
			t.Errorf("message missing %q", want)
		}
	}
}

func TestPublicAddress(t *testing.T) {
	for ip, want := range map[string]bool{
		"127.0.0.1": false, "::1": false, "10.1.2.3": false, "192.168.1.5": false, "172.16.0.9": false,
		"169.254.1.1": false, "0.0.0.0": false, "fd00::1": false, "100.64.0.1": false,
		"142.250.4.108": true, "2607:f8b0:4023::6c": true,
	} {
		if got := publicAddress(net.ParseIP(ip)); got != want {
			t.Errorf("publicAddress(%s) = %v, want %v", ip, got, want)
		}
	}
}
