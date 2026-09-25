# File storage

Files live outside the database. The database records where a file is, not the
bytes.

Two kinds of file, with different requirements:

**Documents.** Split sheets, contracts, W-9s, track sheets, registration
confirmations. Small, read rarely.

**Audio.** Masters, alternates, stems, reference copies. Large, streamed or
downloaded by supervisors, sometimes multi-gigabyte on upload.

## Why not store files in the database

PostgreSQL can hold bytea or large objects, and for a few hundred PDFs it would
work. It stops working for audio.

Every backup would carry every master. A 40 GB catalog means a 40 GB dump every
time, and replication carries it too. Streaming would mean pulling the whole
object into memory before the first byte reaches the client, since a bytea
column has no range support.

Object storage exists for this. The database is good at relationships and
constraints; it is a poor filesystem.

## What works

| Backend | Documents | Audio | Notes |
|---|---|---|---|
| S3-compatible | Yes | Yes | Presigned uploads and downloads. Recommended. |
| Local disk | Yes | Yes | Every byte passes through the server. |

S3-compatible covers more than AWS: Hetzner Object Storage, Backblaze B2,
Cloudflare R2, Wasabi, DigitalOcean Spaces, MinIO, and Ceph RGW all speak the
same API. Set the endpoint and it works.

Hetzner Storage Box is not S3. It speaks SFTP, WebDAV, and rsync, and without
presigned URLs every byte of every master would pass through the server twice.

## Where a file goes is the account's decision

Storage is configured per account, not chosen per file. The database sets each
file's storage kind from the account's settings when the file is recorded: a
web address is recorded as a URL, and anything else takes the configured
backend. Nothing lands on local disk because someone picked the wrong option.

The kind is set when a file is first recorded or its location changes, and not
otherwise, so moving an account to S3 later does not relabel files still on
local disk.

A hosted deployment does not have to hold anyone's files. A client points the
install at their own bucket, keeps their own credentials, and pays their own
storage bill.

## Files are named by their contents

A stored file's key is the SHA-256 of its contents:

```
audio/dbae1bb222005c87db7bf81bf1914c0d149f713b28277a0eb29656ef0e3e76b3.aif
documents/50f0a3b544b72c12e6322bf0fe7e6ef4f249fb3cc395cfb1bd6313c816fc3df7.pdf
```

The browser hashes the file before sending anything, reading it in pieces so a
large master is never held in memory whole. The service checks whether that
object exists, and if it does, the upload is skipped and the row links to the
stored copy.

This means the same file uploaded twice is one object, and a file left behind
by an abandoned form is replaced rather than duplicated the next time it is
dropped. It also means two recordings can share one stored file.

The cost is a bucket listing that is unreadable in the S3 console. Readable
names live in the database and are applied on download: the service signs the
download with a filename built from the record's title, with an ASCII fallback
and the RFC 5987 form so accented titles survive.

## Why presigned URLs matter

A two-gigabyte master uploaded through the application would be transferred
twice, browser to server and server to storage, occupying a worker for the
duration and paying for bandwidth on both legs.

With a presigned PUT the browser talks directly to the bucket. The service
issues a signed URL valid for one object key and a short time, and the transfer
never touches the server. Downloads work the same way in reverse.

The local backend has no presigning, so uploads pass through the service and
downloads are served from a link the service signs itself, valid for five
minutes.

## Cleaning up

A file becomes unreferenced when its row is deleted, or when it was uploaded to
a form that was never saved. `mam-upload sweep` deletes those.

It lists every object under the service's own prefixes, compares them against
every location the database records for documents and audio, and deletes what
nothing refers to. Three rules keep it safe:

- It only looks under `documents/`, `audio/`, and `artwork/`, so anything else
  kept in the bucket is left alone.
- It leaves anything younger than a grace period, 24 hours by default, so a
  file uploaded to a form still being edited survives.
- It counts references across every row, so a file two recordings share is kept
  until neither refers to it.

It runs nightly from a systemd timer and has a dry run for checking what it
would remove.

## Credentials

The access key id is stored in the clear. On its own it is an identifier, not a
secret.

The secret key is stored in `music.account_storage` and deliberately not
exposed through the `api` schema. The view returns a boolean saying whether a
key exists, and writing one goes through an RPC that returns nothing.

That leaves one realistic exposure, a database dump, with two mitigations in
order of how much they help. Scope the S3 key to one bucket, so a leak costs a
bucket rather than an account. Encrypt the backup, which restic does by
default.

Column-level encryption with pgcrypto protects a stolen dump but not a
compromised host, since the passphrase has to reach the running process. For a
single-tenant install it is machinery without a matching threat. It starts to
earn its place when one database holds credentials for many clients.