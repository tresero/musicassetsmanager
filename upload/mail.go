package main

// Email sent from the app, through the account's sending service: Amazon
// SES or one like it, over SMTP (#70). It comes from the account's address,
// with the user who sent it as Reply-To. Mailbox providers, which cannot send
// in bulk, are refused by the database, and with no service set up nothing is
// sent. Nothing goes through the site's own mail server: that is only for
// invites (invite.go).
//
//   POST /upload/mail/test   send the signed-in user a test email
//   POST /upload/mail/send   send an email, with documents attached
//
// The settings, password included, are in music.account_mail; every send, or
// failed attempt, is logged in music.mail_sent.

import (
	"bytes"
	"context"
	"crypto/tls"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/textproto"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/lib/pq"
)

const (
	maxRecipients     = 20
	maxAttachmentSize = 20 << 20 // most providers refuse a message much past 20 MB
	smtpTimeout       = 30 * time.Second
)

type mailSettings struct {
	FromName, FromAddress, Host, Security, Username, Password string
	Port                                                      int
}

type attachment struct {
	ID         int64
	Name, Type string
	Data       []byte
}

// recordTypes are what an email can be sent from, as music.mail_sent's
// record_type check allows.
var recordTypes = map[string]bool{
	"song": true, "recording": true, "release": true,
	"contact": true, "organization": true, "document": true,
}

// noBreaks keeps a header value on one line, so nothing typed can add a
// header of its own.
func noBreaks(s string) string {
	return strings.Join(strings.Fields(strings.NewReplacer("\r", " ", "\n", " ").Replace(s)), " ")
}

func addressList(as []*mail.Address) string {
	parts := make([]string, len(as))
	for i, a := range as {
		parts[i] = a.String()
	}
	return strings.Join(parts, ", ")
}

func crlf(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, "\r\n", "\n"), "\n", "\r\n")
}

// buildMessage writes the email: plain text, with any attachments as a
// multipart/mixed message. Replies go to replyTo, the user who sent it,
// when given.
func buildMessage(from, replyTo *mail.Address, to, cc []*mail.Address, subject, text string, atts []attachment, id string) []byte {
	var b bytes.Buffer
	domain := from.Address[strings.LastIndex(from.Address, "@")+1:]
	h := func(k, v string) { fmt.Fprintf(&b, "%s: %s\r\n", k, v) }
	h("From", from.String())
	if replyTo != nil {
		h("Reply-To", replyTo.String())
	}
	h("To", addressList(to))
	if len(cc) > 0 {
		h("Cc", addressList(cc))
	}
	h("Subject", mime.QEncoding.Encode("utf-8", noBreaks(subject)))
	h("Date", time.Now().Format(time.RFC1123Z))
	h("Message-ID", fmt.Sprintf("<%s@%s>", id, domain))
	h("MIME-Version", "1.0")

	writeText := func(w io.Writer) {
		qp := quotedprintable.NewWriter(w)
		qp.Write([]byte(crlf(text)))
		qp.Close()
	}
	if len(atts) == 0 {
		h("Content-Type", "text/plain; charset=utf-8")
		h("Content-Transfer-Encoding", "quoted-printable")
		b.WriteString("\r\n")
		writeText(&b)
		return b.Bytes()
	}

	mw := multipart.NewWriter(&b)
	h("Content-Type", "multipart/mixed; boundary="+mw.Boundary())
	b.WriteString("\r\n")
	part, _ := mw.CreatePart(textproto.MIMEHeader{
		"Content-Type":              {"text/plain; charset=utf-8"},
		"Content-Transfer-Encoding": {"quoted-printable"},
	})
	writeText(part)
	for _, a := range atts {
		ct := a.Type
		if ct == "" {
			ct = "application/octet-stream"
		}
		name := noBreaks(strings.ReplaceAll(a.Name, `"`, "'"))
		part, _ := mw.CreatePart(textproto.MIMEHeader{
			"Content-Type":              {ct},
			"Content-Disposition":       {fmt.Sprintf("attachment; filename=%q", name)},
			"Content-Transfer-Encoding": {"base64"},
		})
		enc := base64.StdEncoding.EncodeToString(a.Data)
		for len(enc) > 76 {
			part.Write([]byte(enc[:76] + "\r\n"))
			enc = enc[76:]
		}
		part.Write([]byte(enc + "\r\n"))
	}
	mw.Close()
	return b.Bytes()
}

// publicAddress says whether a mail server address is on the public
// internet. A user's settings may not point at this machine or the
// network behind it: the site's own mail server is there.
func publicAddress(ip net.IP) bool {
	if ip == nil || ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified() ||
		ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsMulticast() {
		return false
	}
	_, cgnat, _ := net.ParseCIDR("100.64.0.0/10")
	return !cgnat.Contains(ip)
}

// smtpSend delivers msg through the user's provider, encrypted (implicit
// TLS or STARTTLS) and signed in.
func smtpSend(ctx context.Context, st mailSettings, from string, rcpt []string, msg []byte) error {
	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", st.Host)
	if err != nil || len(ips) == 0 {
		return fmt.Errorf("could not find the mail server %s", st.Host)
	}
	for _, ip := range ips {
		if !publicAddress(ip) {
			return fmt.Errorf("%s is not a mail server on the internet", st.Host)
		}
	}
	addr := net.JoinHostPort(ips[0].String(), strconv.Itoa(st.Port))
	tlsConf := &tls.Config{ServerName: st.Host, MinVersion: tls.VersionTLS12}
	dialer := &net.Dialer{Timeout: smtpTimeout}

	var conn net.Conn
	if st.Security == "tls" {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsConf)
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("could not connect to %s on port %d: %v", st.Host, st.Port, err)
	}
	conn.SetDeadline(time.Now().Add(2 * smtpTimeout))
	c, err := smtp.NewClient(conn, st.Host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("the mail server did not answer: %v", err)
	}
	defer c.Close()
	if st.Security != "tls" {
		if ok, _ := c.Extension("STARTTLS"); !ok {
			return errors.New("the mail server does not offer an encrypted connection on this port")
		}
		if err := c.StartTLS(tlsConf); err != nil {
			return fmt.Errorf("could not encrypt the connection: %v", err)
		}
	}
	if err := c.Auth(smtp.PlainAuth("", st.Username, st.Password, st.Host)); err != nil {
		return fmt.Errorf("the mail server refused the username or password: %v", err)
	}
	if err := c.Mail(from); err != nil {
		return fmt.Errorf("the mail server refused the from address: %v", err)
	}
	for _, r := range rcpt {
		if err := c.Rcpt(r); err != nil {
			return fmt.Errorf("the mail server refused %s: %v", r, err)
		}
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("the mail server did not accept the message: %v", err)
	}
	return c.Quit()
}

// mailSettings is the account's sending service. Email is sent only
// through one; without it, nothing is sent.
func (s *server) mailSettings(ctx context.Context, account string) (*mailSettings, error) {
	var st mailSettings
	var name, pass sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT from_name, from_address, smtp_host, smtp_port, smtp_security, smtp_username, smtp_password
		  FROM music.account_mail WHERE account_id::text = $1`, account).
		Scan(&name, &st.FromAddress, &st.Host, &st.Port, &st.Security, &st.Username, &pass)
	if err != nil {
		return nil, errors.New("email is not set up for this account: a sending service is set up under Settings, Email sending")
	}
	if !pass.Valid || pass.String == "" {
		return nil, errors.New("the sending service has no password saved yet, under Settings, Email sending")
	}
	st.FromName, st.Password = name.String, pass.String
	return &st, nil
}

func parseAddresses(list []string) ([]*mail.Address, error) {
	var out []*mail.Address
	for _, a := range list {
		if strings.TrimSpace(a) == "" {
			continue
		}
		p, err := mail.ParseAddress(noBreaks(a))
		if err != nil {
			return nil, fmt.Errorf("%q is not an email address", a)
		}
		out = append(out, p)
	}
	return out, nil
}

type sendReq struct {
	To          []string `json:"to"`
	Cc          []string `json:"cc"`
	Subject     string   `json:"subject"`
	Text        string   `json:"text"`
	RecordType  string   `json:"record_type"`
	RecordID    int      `json:"record_id"`
	DocumentIDs []int64  `json:"document_ids"`
}

func (s *server) mailTest(w http.ResponseWriter, r *http.Request) {
	s.mailHandle(w, r, true)
}

func (s *server) mailSend(w http.ResponseWriter, r *http.Request) {
	s.mailHandle(w, r, false)
}

func (s *server) mailHandle(w http.ResponseWriter, r *http.Request, test bool) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}
	account, user, err := s.identity(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	ctx := r.Context()
	st, err := s.mailSettings(ctx, account)
	if err != nil {
		mailError(w, err)
		return
	}
	from := &mail.Address{Name: st.FromName, Address: st.FromAddress}
	var userEmail string
	if err := s.db.QueryRowContext(ctx, `SELECT email FROM music.user_account WHERE id::text = $1`, user).
		Scan(&userEmail); err != nil {
		mailError(w, errors.New("could not find your sign-in"))
		return
	}
	replyTo := &mail.Address{Address: userEmail}

	var req sendReq
	if test {
		req = sendReq{To: []string{userEmail}, Subject: "Test email from Music Assets Manager", RecordType: "test",
			Text: "This is a test from Music Assets Manager, through your account's sending service. Email sent from the app comes from " +
				st.FromAddress + ", and replies go to whoever sent it."}
	} else if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	to, err := parseAddresses(req.To)
	if err == nil && len(to) == 0 {
		err = errors.New("add at least one recipient")
	}
	cc, err2 := parseAddresses(req.Cc)
	if err == nil {
		err = err2
	}
	if err == nil && len(to)+len(cc) > maxRecipients {
		err = fmt.Errorf("send to at most %d people at once", maxRecipients)
	}
	if err == nil && strings.TrimSpace(req.Subject) == "" {
		err = errors.New("add a subject")
	}
	if err == nil && !test && req.RecordType != "" && !recordTypes[req.RecordType] {
		err = errors.New("unknown kind of record")
	}
	if err != nil {
		mailError(w, err)
		return
	}

	atts, err := s.documentAttachments(ctx, account, req.DocumentIDs)
	if err != nil {
		mailError(w, err)
		return
	}

	rcpt, bare := []string{}, []string{}
	for _, a := range append(append([]*mail.Address{}, to...), cc...) {
		rcpt = append(rcpt, a.Address)
		bare = append(bare, strings.ToLower(a.Address))
	}
	msg := buildMessage(from, replyTo, to, cc, req.Subject, req.Text, atts, randHex(16))
	sendErr := smtpSend(ctx, *st, st.FromAddress, rcpt, msg)

	listed := []map[string]any{}
	for _, a := range atts {
		listed = append(listed, map[string]any{"id": a.ID, "name": a.Name, "bytes": len(a.Data)})
	}
	attJSON, _ := json.Marshal(listed)
	var errText any
	if sendErr != nil {
		errText = sendErr.Error()
	}
	var recType, recID any
	if req.RecordType != "" {
		recType = req.RecordType
	}
	if req.RecordID > 0 {
		recID = req.RecordID
	}
	toList, ccList := []string{}, []string{}
	for _, a := range to {
		toList = append(toList, plainAddress(a))
	}
	for _, a := range cc {
		ccList = append(ccList, plainAddress(a))
	}
	if _, err := s.db.ExecContext(ctx, `
		INSERT INTO music.mail_sent (account_id, user_id, from_address, to_addresses, cc_addresses, recipients,
		                             subject, record_type, record_id, attachments, error)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		account, user, plainAddress(from), pq.Array(toList), pq.Array(ccList), pq.Array(bare),
		noBreaks(req.Subject), recType, recID, string(attJSON), errText); err != nil {
		log.Printf("mail log: %v", err)
	}
	if sendErr != nil {
		mailError(w, sendErr)
		return
	}
	writeJSON(w, map[string]any{"sent": true, "to": toList})
}

func mailError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	msg := err.Error()
	if msg != "" {
		msg = strings.ToUpper(msg[:1]) + msg[1:]
	}
	json.NewEncoder(w).Encode(map[string]string{"message": msg})
}

// documentAttachments reads the account's documents from storage, refusing
// more than maxAttachmentSize in all.
func (s *server) documentAttachments(ctx context.Context, account string, ids []int64) ([]attachment, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, storage_kind, storage_uri, coalesce(file_name, title), coalesce(mime_type, '')
		  FROM music.document WHERE account_id = $1 AND id = ANY($2) ORDER BY id`, account, pq.Array(ids))
	if err != nil {
		return nil, err
	}
	type doc struct {
		id                     int64
		kind, key, name, ctype string
	}
	var docs []doc
	for rows.Next() {
		var d doc
		if err := rows.Scan(&d.id, &d.kind, &d.key, &d.name, &d.ctype); err != nil {
			rows.Close()
			return nil, err
		}
		docs = append(docs, d)
	}
	rows.Close()
	if len(docs) != len(unique(ids)) {
		return nil, errors.New("a document to attach was not found")
	}
	st, err := s.storage(ctx, account)
	if err != nil {
		return nil, err
	}
	var client *s3.Client
	total := 0
	var out []attachment
	for _, d := range docs {
		if d.kind != st.Kind || !validKey(d.key) {
			return nil, fmt.Errorf("%s is not stored in this account's storage, so it cannot be attached", d.name)
		}
		var rc io.ReadCloser
		switch st.Kind {
		case "s3":
			if client == nil {
				if client, err = s.s3Client(ctx, st); err != nil {
					return nil, err
				}
			}
			o, err := client.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(st.Bucket), Key: aws.String(d.key)})
			if err != nil {
				return nil, fmt.Errorf("could not read %s from storage", d.name)
			}
			rc = o.Body
		case "local":
			p, ok := s.localPath(account, d.key)
			if !ok {
				return nil, fmt.Errorf("could not read %s from storage", d.name)
			}
			f, err := os.Open(p)
			if err != nil {
				return nil, fmt.Errorf("could not read %s from storage", d.name)
			}
			rc = f
		default:
			return nil, fmt.Errorf("%s cannot be attached from %s storage", d.name, st.Kind)
		}
		data, err := io.ReadAll(io.LimitReader(rc, int64(maxAttachmentSize-total)+1))
		rc.Close()
		if err != nil {
			return nil, err
		}
		total += len(data)
		if total > maxAttachmentSize {
			return nil, errors.New("the attachments come to more than 20 MB, which most mail providers refuse")
		}
		out = append(out, attachment{ID: d.id, Name: attachmentName(d.name, d.key), Type: d.ctype, Data: data})
	}
	return out, nil
}

// attachmentName gives a document titled without an extension the stored
// file's, so the recipient's mail program knows how to open it.
func attachmentName(name, key string) string {
	if path.Ext(name) != "" {
		return name
	}
	return name + strings.ToLower(path.Ext(key))
}

func unique(ids []int64) []int64 {
	seen := map[int64]bool{}
	out := []int64{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

// plainAddress is an address as the log shows it: the name as typed, not
// encoded for a mail header.
func plainAddress(a *mail.Address) string {
	name := strings.TrimSpace(noBreaks(a.Name))
	if name == "" {
		return a.Address
	}
	return name + " <" + a.Address + ">"
}
