package main

// Invite emails. music.send_invite notifies the mam_invite channel when an
// owner invites someone or resends; the notice carries the only copy of the
// link code, since the database keeps just its hash. Mail goes through the
// local mail server, which handles delivery and retries.

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"mime"
	"mime/quotedprintable"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	"github.com/lib/pq"
)

type invite struct {
	Email     string `json:"email"`
	Token     string `json:"token"`
	Account   string `json:"account"`
	Role      string `json:"role"`
	InvitedBy string `json:"invited_by"`
}

func (s *server) listenInvites() {
	if s.cfg.AppURL == "" || s.cfg.MailFrom == "" {
		log.Print("invites: MAM_APP_URL or MAM_MAIL_FROM not set; invite emails are off")
		return
	}
	from, err := mail.ParseAddress(s.cfg.MailFrom)
	if err != nil {
		log.Printf("invites: MAM_MAIL_FROM: %v; invite emails are off", err)
		return
	}

	l := pq.NewListener(s.cfg.DatabaseURL, 10*time.Second, time.Minute,
		func(ev pq.ListenerEventType, err error) {
			if err != nil {
				log.Printf("invites: listener: %v", err)
			}
		})
	if err := l.Listen("mam_invite"); err != nil {
		log.Printf("invites: listen: %v; invite emails are off", err)
		return
	}
	log.Print("invites: listening")

	for {
		select {
		case n := <-l.Notify:
			if n == nil {
				// Reconnected; notices sent while down are lost, and the
				// owner can resend from the Invites page.
				continue
			}
			var inv invite
			if err := json.Unmarshal([]byte(n.Extra), &inv); err != nil {
				log.Printf("invites: bad notice: %v", err)
				continue
			}
			if err := s.sendInvite(from, inv); err != nil {
				log.Printf("invites: mail to %s: %v", inv.Email, err)
			} else {
				log.Printf("invites: sent to %s", inv.Email)
			}
		case <-time.After(90 * time.Second):
			go l.Ping()
		}
	}
}

func oneLine(v string) string {
	return strings.Join(strings.Fields(v), " ")
}

func (s *server) sendInvite(from *mail.Address, inv invite) error {
	to, err := mail.ParseAddress(oneLine(inv.Email))
	if err != nil {
		return err
	}
	link := strings.TrimRight(s.cfg.AppURL, "/") + "/#/accept-invite?token=" + inv.Token
	who := oneLine(inv.InvitedBy)
	if who == "" {
		who = "Someone"
	}

	var body bytes.Buffer
	qp := quotedprintable.NewWriter(&body)
	fmt.Fprintf(qp, "%s has invited you to join %s in Music Assets Manager as %s.\r\n\r\n",
		who, oneLine(inv.Account), oneLine(inv.Role))
	fmt.Fprintf(qp, "Choose a password to accept:\r\n%s\r\n\r\n", link)
	fmt.Fprint(qp, "The link works once and expires in 7 days. If you were not expecting this, you can ignore this email.\r\n")
	qp.Close()

	id := make([]byte, 16)
	rand.Read(id)
	domain := from.Address[strings.LastIndex(from.Address, "@")+1:]

	var msg bytes.Buffer
	fmt.Fprintf(&msg, "From: %s\r\n", from.String())
	fmt.Fprintf(&msg, "To: %s\r\n", to.String())
	fmt.Fprintf(&msg, "Subject: %s\r\n", mime.QEncoding.Encode("utf-8",
		"You're invited to "+oneLine(inv.Account)))
	fmt.Fprintf(&msg, "Date: %s\r\n", time.Now().Format(time.RFC1123Z))
	fmt.Fprintf(&msg, "Message-ID: <%s@%s>\r\n", hex.EncodeToString(id), domain)
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=utf-8\r\n")
	msg.WriteString("Content-Transfer-Encoding: quoted-printable\r\n\r\n")
	msg.Write(body.Bytes())

	// Plain SMTP to the local mail server: the connection never leaves the
	// machine, and STARTTLS would fail on a certificate not made for localhost.
	c, err := smtp.Dial("localhost:25")
	if err != nil {
		return err
	}
	defer c.Close()
	if err := c.Mail(from.Address); err != nil {
		return err
	}
	if err := c.Rcpt(to.Address); err != nil {
		return err
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg.Bytes()); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return c.Quit()
}
