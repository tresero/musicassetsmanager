# Music Assets Manager

A catalog and rights management system for songwriters, publishers, and
independent labels.

Track your compositions and recordings, who wrote and played on them, who owns
what percentage, where they're registered, and the paperwork behind it all.

Built because every tool in this space either gets the credits wrong (treating
"bass player" as something a person *is* rather than something they did on a
particular session) or puts your own catalog behind a subscription.

**Status:** in development, and in daily use on a working catalog.
Compositions, recordings, contacts, and companies are done. Releases,
contracts, and documents are next.

---

## What it does

**Compositions.** Title, ISWC, lyrics, alternate titles, and a pitch line for
supervisors. Writer and publisher splits with the controlled/uncontrolled
distinction that determines what you can actually license. Society
registrations with work numbers. Copyright dates and reversion tracking. Genre
and mood tagging for search.

**Recordings.** Separate from the composition they're of, because a radio edit
and an album mix are different masters with different ISRCs. Credits where one
person can hold several roles and play several instruments in a single entry.
Recorded date, country, and studio. Audio file references with format details.

**People and companies.** Contacts with IPI and ISNI, PRO affiliation, multiple
phones and emails. Companies with their own IPI. One person can be attached to
several companies, with their job title on the relationship.

**Reports.** Splits that don't total 100%. Songs missing an MLC or PRO
registration. Duplicate email addresses.

---

## Why the model is the way it is

One person can be the composer, the bass player, the arranger, and the master
owner on the same recording, and none of those on the next one. So roles are
recorded on the credit, never on the person.

A band, a pen name, and a legal name are three different things. The person who
signs the contract and the name printed on the sleeve are stored separately, so
you can have both without lying about either.

Your data lives in PostgreSQL with real constraints. If a fact is wrong, the
database refuses it. Nothing depends on a form remembering to validate.

Longer version: [docs/modeling.md](docs/modeling.md)

---

## Running it

Self-hosted. You need PostgreSQL, PostgREST, and a web server. Setup is a few
commands; see [docs/install.md](docs/install.md).

There's no hosted version and no plan for one.

---

# Storage

Files live outside the database. The database stores where a file is, not the
file itself.

Two kinds of file, and they have different requirements:

**Documents.** Split sheets, contracts, W-9s, registration confirmations. Small,
read rarely, never streamed.

**Audio.** Masters, stems, mixes, reference MP3s. Large, streamed to a browser,
sometimes multi-gigabyte on upload.

## What works

| Backend | Documents | Audio | Notes |
|---|---|---|---|
| Local disk | Yes | Yes | Simplest. One server, one filesystem. |
| S3-compatible | Yes | Yes | Presigned uploads and downloads. |
| WebDAV | Yes | Poor | No presigned URLs, so everything proxies through the app. |
| SFTP | Yes | No | Same problem, worse latency. |

S3-compatible covers more than AWS. Hetzner Object Storage, Backblaze B2,
Cloudflare R2, Wasabi, DigitalOcean Spaces, MinIO, Ceph RGW all speak the same
API. Set the endpoint and it works.

Hetzner Storage Box is **not** S3. It speaks SFTP, WebDAV, and rsync. Fine for
documents, wrong for audio, because without presigned URLs every byte of every
master has to pass through your server twice.

## Why presigned URLs matter

A multi-gigabyte master uploaded through the application is transferred twice:
browser to server, server to storage. It ties up a worker for the duration and
burns bandwidth you're paying for on both legs.

With a presigned PUT the browser talks directly to the bucket. The application
issues a signed URL, the transfer happens without touching your server, and the
client reports back when it's done.

The same applies in reverse for downloads of original files.

## Streaming is different

Playback can't use presigned URLs.

A presigned URL is unforgeable but freely shareable. Once it's issued, anyone
with the string can fetch the file until it expires, and you have no idea who.
For a tracked share link that defeats the point.

So streaming proxies through the application: validate the share token, check
expiry, log the play, then serve the bytes with Range support. The file being
streamed is a transcoded MP3 rather than the master, so the volume is
manageable.

Original-file downloads can still use presigned URLs, logged at the moment the
URL is issued.

## Self-hosting

Local disk is the default and the simplest thing that works. Point `base_path`
at a directory, make sure it's backed up, done.

Move to S3-compatible storage when the catalog outgrows the server's disk, or
when you want uploads to stop competing with everything else for bandwidth.
Hetzner Object Storage and Backblaze B2 are the cheap options; Cloudflare R2
has no egress fees, which matters if audio gets served publicly.

Everything else on this list works, with the caveats in the table.

## Multi-tenant

Storage is configured per account, not globally. One row in
`music.account_storage` per account: the backend kind, the endpoint, the bucket,
the path prefix.

That means a hosted deployment doesn't have to hold anyone's masters. A client
points the install at their own bucket, keeps their own credentials, and pays
their own storage bill. The database records where their files are; the files
stay theirs.

An operator who does want to host files can run one bucket with a per-account
key prefix, and the same config table handles it.

Credentials are not stored in the database. They live in the upload service's
config, keyed by account id, so a database dump doesn't hand over anyone's
bucket.

## The upload service

PostgREST can't accept a multipart upload, so this is a separate small service.
It:

- validates the JWT and reads the account's storage config
- issues presigned PUT URLs, or accepts a direct upload for backends that can't
  presign
- queues transcoding for audio
- proxies authenticated streams and logs playback events

Self-hosters who only want to reference files by URI can skip it entirely. The
schema works without it; you paste in a path and nothing uploads.

---

## Documentation

| | |
|---|---|
| [Modeling decisions](docs/modeling.md) | Why the schema looks like this |
| [Architecture](docs/architecture.md) | How the three layers fit together |
| [Installation](docs/install.md) | Getting it running |
| [Development](docs/development.md) | Adding tables and screens |
| [Standards](docs/standards.md) | CWR, DDEX, ISWC, ISRC, IPI, ISNI |
| [Roadmap](docs/roadmap.md) | What's next |
| [Who this is for](docs/who-this-is-for.md) | And who it isn't |
| [How I use AI](docs/how-i-use-ai.md) | The division of labor on this project |

---

## License

GNU Affero General Public License v3.0. Use it, change it, sell it. If you run
a modified version as a service for other people, publish your changes.