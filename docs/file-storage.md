# File storage

Files live outside the database. The database records where a file is, not the
bytes.

Two kinds of file, and they have different requirements:

**Documents.** Split sheets, contracts, W-9s, registration confirmations.
Small, read rarely, never streamed.

**Audio.** Masters, stems, mixes, reference MP3s. Large, streamed to a browser,
sometimes multi-gigabyte on upload.

---

## Why not store files in the database

PostgreSQL can hold bytea or large objects, and for a few hundred PDFs it would
work. It stops working for audio.

Every backup carries every master. A 40 GB catalog means a 40 GB dump, every
time, and restic deduplicates less well on compressed audio than you would
hope. Replication carries it too. Streaming means pulling the whole object into
memory before the first byte reaches the client, because there is no Range
support on a bytea column.

Object storage exists for this. The database is good at relationships and
constraints; it is a poor filesystem.

---

## What works

| Backend | Documents | Audio | Notes |
|---|---|---|---|
| Local disk | Yes | Yes | Simplest. One server, one filesystem. |
| S3-compatible | Yes | Yes | Presigned uploads and downloads. |
| WebDAV | Yes | Poor | No presigned URLs, so everything proxies through the app. |
| SFTP | Yes | No | Same problem, worse latency. |

S3-compatible covers more than AWS. Hetzner Object Storage, Backblaze B2,
Cloudflare R2, Wasabi, DigitalOcean Spaces, MinIO, and Ceph RGW all speak the
same API. Set the endpoint and it works.

Hetzner Storage Box is **not** S3. It speaks SFTP, WebDAV, and rsync. Fine for
documents, wrong for audio, because without presigned URLs every byte of every
master passes through your server twice.

---

## Why presigned URLs matter

A two-gigabyte master uploaded through the application is transferred twice:
browser to server, server to storage. It occupies a worker for the duration and
burns bandwidth on both legs.

With a presigned PUT the browser talks directly to the bucket. The application
issues a signed URL valid for a few minutes and one specific object key, the
transfer happens without touching your server, and the client reports back when
it finishes.

Same in reverse for downloading an original file.

---

## Streaming is different

Playback cannot use presigned URLs.

A presigned URL is unforgeable but freely shareable. Once issued, anyone holding
the string can fetch the file until it expires, and you have no idea who. For a
tracked share link sent to a supervisor, that defeats the point.

So streaming proxies through the application: validate the share token, check
expiry, log the play, then serve bytes with Range support so scrubbing works.
The file being streamed is a transcoded MP3 rather than the master, so the
volume is manageable.

Downloads of original files can still use presigned URLs, logged at the moment
the URL is issued rather than when the transfer completes.

---

## The tradeoffs

**Local disk** is the least machinery and the least to go wrong. Your backup
already covers it. The limits are disk size, and that uploads compete with
everything else on the box for bandwidth.

**S3-compatible** removes both limits and adds a bill, an endpoint to
configure, and credentials to manage. Egress is the cost that surprises people:
Backblaze and Hetzner charge for it, Cloudflare R2 does not, which matters if
audio ends up served publicly.

**A hosted deployment** does not have to hold anyone's files. Storage is
configured per account, so a client points the install at their own bucket,
keeps their own credentials, and pays their own storage bill. The database
records where their files are; the files stay theirs. An operator who does want
to host files runs one bucket with a per-account key prefix, and the same
configuration handles it.

---

## Credentials

The access key id is stored in the clear. On its own it is an identifier, not a
secret.

The secret key is stored in `music.account_storage` and deliberately **not**
exposed through the `api` schema. The view returns a boolean saying whether a
key exists; there is no path from the HTTP API back to the value. Writing one
goes through an RPC that takes a string and returns nothing.

That leaves one realistic exposure: a database dump. Two mitigations, in order
of how much they actually help.

**Scope the key to one bucket.** Create an S3 access key limited to the bucket
this install uses, rather than an account-wide key. A leak then costs one
bucket instead of the whole storage account. This takes two minutes and is
worth more than anything below it.

**Encrypt the backup.** Restic encrypts repositories by default. If the
repository passphrase is strong, a stolen backup yields nothing.

Column-level encryption with pgcrypto is possible and was considered. It
protects a stolen dump but not a compromised host, because the passphrase has
to reach the running process somehow, and anything that can read the process
environment can read the passphrase. For a single-tenant install it is
machinery without a matching threat. It becomes worth adding when one database
holds credentials for many clients, where the blast radius of a dump is
different.

A managed KMS or HSM is the real answer to that problem: the decryption key
lives in hardware or a managed service and never exists in a form you can dump.
That is where this would go if compliance ever required it, not before.

---

## Where a file's location is recorded

Both documents and audio files carry a `storage_kind` and a `storage_uri`.

`storage_kind` says how to interpret the URI: a filesystem path for `local`, an
object key for `s3`, a full URL for `url`. Documents also have an
`external_ref` for an identifier in another system, so a document held in
something like Paperless can be linked rather than duplicated.

Nothing about the schema requires an upload service. A self-hoster can paste a
URL, keep files wherever they already keep them, and the catalog works. The
service exists to make uploading pleasant, not to make storage function.

---

## The upload service

PostgREST cannot accept a multipart upload, so this is a separate small service.

It validates the JWT, reads the account's storage configuration, and then either
issues a presigned PUT URL or accepts a direct upload for backends that cannot
presign. It also queues transcoding for audio, and proxies authenticated
streams while logging playback events.

It reads credentials directly from `music.account_storage` on its own database
connection. They never cross the API.

Written in Go: one binary, no runtime to install, and the S3 and
Range-request stories are both good.