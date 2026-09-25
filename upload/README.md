# Upload service

PostgREST cannot accept a file upload, so files go through this service. It
issues presigned URLs so the browser talks to S3 directly, serves the local
backend when there is no S3, names files on download, and cleans up stored
files nothing refers to.

```
POST /upload/presign          where to send a file, or that it is already stored
PUT  /upload/direct?key=...   local backend only
GET  /upload/download?key=... a short-lived link to open or save a file
GET  /upload/file?...         local backend: serves a signed link
GET  /upload/health

mam-upload sweep [-dry-run] [-grace 24h]
```

Authentication is the same JWT PostgREST issues. The `account_id` claim decides
which storage configuration is used, so one service serves every account.

## Build

```bash
go build -o mam-upload .
sudo install -m755 mam-upload /usr/local/bin/
```

## Database role

The service reads the account's storage settings, and the sweep reads every
stored location. Give it its own read-only role:

```sql
CREATE ROLE mamupload LOGIN PASSWORD 'pick-something-hex';
GRANT USAGE ON SCHEMA music TO mamupload;
GRANT SELECT ON music.account_storage, music.document,
                music.audio_file, music.recording TO mamupload;
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