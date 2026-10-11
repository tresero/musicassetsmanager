# Upload service

PostgREST cannot accept a file upload, so files go through this service. It
issues presigned URLs so the browser talks to S3 directly, serves the local
backend when there is no S3, names files on download, and cleans up stored
files nothing refers to. It also emails the invites owners send from the
Users page.

```
POST /upload/presign          where to send a file, or that it is already stored
PUT  /upload/direct?key=...   local backend only
GET  /upload/download?key=... a short-lived link to open or save a file
GET  /upload/file?...         local backend: serves a signed link
GET  /upload/health

mam-upload sweep [-dry-run] [-grace 24h]
```

Authentication is the same JWT PostgREST issues. The `account_id` claim decides
which storage configuration is used, so one service serves every account. A
token whose user has been removed from the account is refused at once, as in
PostgREST.

## Invite emails

`music.send_invite` sends a notice on the `mam_invite` channel each time an
owner invites someone or resends. The service listens for it and mails the link
through the local mail server on port 25, so that server has to accept mail
from localhost. Set `MAM_APP_URL` to the app's public address and
`MAM_MAIL_FROM` to the sender; with either missing, invite emails are off and
the log says so. A notice sent while the service is down is lost; resend the
invite.

## Build

```bash
go build -o mam-upload .
sudo install -m755 mam-upload /usr/local/bin/
```

## Database role

The service reads the account's storage settings and which users belong to
which account, and the sweep reads every stored location. It has its own read-only role, `mamupload`, created by
`db/roles.sql` and granted what it reads by `db/schema.sql`. Give it a
password:

```sql
ALTER ROLE mamupload PASSWORD 'pick-something-hex';
```

## Run it

```bash
sudo useradd -r -s /usr/sbin/nologin mamupload
sudo install -m600 deploy/mam-upload.env.example /etc/mam-upload.env
sudo nano /etc/mam-upload.env
sudo install -m644 deploy/mam-upload.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mam-upload
curl localhost:3001/upload/health
```

`MAM_JWT_SECRET` has to match `jwt-secret` in `postgrest.conf` exactly, without
quotes. The same tokens authenticate both services, and a mismatch shows up as
a 401 with no useful detail. When the PostgREST secret changes, change this one
and restart.

## Keys

Every stored file is named by the SHA-256 of its contents:

```
<base_path>/audio/<sha256>.aif
<base_path>/documents/<sha256>.pdf
```

The browser hashes the file and sends the hash with the presign request. If an
object with that key exists, the service says so and the browser skips the
upload. The same file uploaded any number of times is one object.

Readable names are applied on download. The client passes a name built from the
record's title, and the service signs the link with a matching
`Content-Disposition`.

## Sweep

`mam-upload sweep` deletes stored files that no document or audio row refers
to. It only looks under `documents/`, `audio/`, and `artwork/`, leaves anything
newer than the grace period, and counts references across all rows, so a file
two recordings share is kept.

Check what it would remove before letting it run:

```bash
set -a; . /etc/mam-upload.env; set +a
/usr/local/bin/mam-upload sweep -dry-run
```

Anything put in the bucket by hand and never linked to a document shows up on
that list.

Run it nightly:

```bash
sudo install -m644 deploy/mam-sweep.service deploy/mam-sweep.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mam-sweep.timer
```

The timer runs at 3:30 each morning and catches up after downtime.

## Bucket CORS

Presigned uploads go from the browser to the bucket, so the bucket has to allow
it. Without this, uploads fail with an opaque network error.

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["https://your-domain"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

On AWS that is the bucket's Permissions tab.

## Limits

5 GiB per file, set in `main.go`. Local-disk uploads pass through the service
and hold a connection for the duration, and land on a temporary name that is
renamed on completion, so an interrupted transfer never leaves a partial file
under a real key.
## Revision History

| Date | Revision |
|---|---|
| 2026-10-08 | Database files in db/ create every role and the extensions; set app.jwt_secret |
| 2026-10-10 | Invite emails; tokens of removed users refused |
