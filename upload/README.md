# Upload service

PostgREST cannot accept multipart bodies, so uploads go through this.

For S3 backends it returns a presigned PUT and the browser uploads straight to
the bucket, so no file passes through the server. For local disk there is
nothing to sign, so the body is proxied here instead.

## Build

```bash
cd upload
go mod tidy
go build -o mam-upload .
sudo install -m755 mam-upload /usr/local/bin/
```

## Database role

The service only needs to read one table. Give it its own role rather than
reusing the owner:

```sql
CREATE ROLE mamupload LOGIN PASSWORD 'pick-something-hex';
GRANT USAGE ON SCHEMA music TO mamupload;
GRANT SELECT ON music.account_storage TO mamupload;
```

## Run it

```bash
sudo useradd -r -s /usr/sbin/nologin mamupload
sudo install -m600 -o root -g root mam-upload.env.example /etc/mam-upload.env
sudo nano /etc/mam-upload.env      # fill in the two secrets
sudo install -m644 mam-upload.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now mam-upload
curl localhost:3001/upload/health
```

`MAM_JWT_SECRET` has to match `jwt-secret` in `postgrest.conf` exactly. The
same tokens authenticate both services.

## Caddy

Add to the existing site block, before the catch-all handle:

```
    handle /upload/* {
        reverse_proxy localhost:3001
    }
```

## S3 bucket CORS

Presigned uploads go from the browser to the bucket, so the bucket has to
allow it. Without this, uploads fail with an opaque network error.

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["https://musicassetsmanager.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

AWS: bucket, Permissions tab, CORS. Other providers have an equivalent.

## Keys

The service builds the key and returns it. The client never chooses one.

```
<base_path>/documents/2026/split-sheet-de-guantanamo-a3f9c1.pdf
<base_path>/audio/2026/de-guantanamo-master-71b0e4.wav
```

Slugged from the document title, with a short random suffix. The suffix is
there because the document id does not exist until after the upload, so it
cannot be used for uniqueness.

Renaming a document later changes `title` and leaves `storage_uri` alone, which
is the point of keeping them separate.

## Frontend

`FileUploadInput.jsx` goes in `src/resources/`. It asks for a destination,
uploads with progress, and writes the key, MIME type, and size into the form.
The document row is created by the normal save afterwards.

In `document.jsx`:

```jsx
import { FileUploadInput } from './FileUploadInput';
```

and above the storage fields:

```jsx
    <FileUploadInput kind="documents" />
```

The storage kind and location fields stay on the form. Uploading fills them in;
they can still be edited by hand for a file that lives somewhere else.

## Limits

5 GiB per file, changeable in `main.go`.

Local-disk uploads pass through the service and hold a connection for the
duration. Fine for documents, poor for masters, which is the argument for S3.