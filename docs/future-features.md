# Future features

Ideas and planned work. Anything actually scheduled lives in
[roadmap.md](roadmap.md); this is the longer list, including things that may
never get built.

Ordered roughly by value against effort.

---

## Committed

### Releases

Track and disc sequencing, UPC, catalog number, label, release date per
territory, format, artwork. Distinct from playlists: a release has commercial
identity and gets delivered to DSPs.

### Playlists and tracked share links

A playlist is an ad-hoc set of recordings pulled from across the catalog, which
is what you actually send a supervisor.

One share link per recipient, each with its own token, so analytics tell you
which of the five people you sent it to actually listened. Expiry dates,
password protection, disable and re-enable, download permission per link,
optional stem access.

Events logged per link: opened, played, played to completion, downloaded track,
downloaded all.

### Upload service

The one piece PostgREST cannot do. Validates the JWT, reads the account's
storage config, issues presigned PUT URLs for S3-compatible backends or accepts
a direct upload for the rest.

Written in Go. Single binary, no runtime to install.

Self-hosters who only want to reference files by URI can skip it entirely.

### Pitch tracking

Opportunities, briefs, submissions, status, history. Which tracks went where,
when, and what came back.

Pure schema, no service required. Contacts and recordings already exist, so
most of it is junctions and a status vocabulary.

### Streaming and transcoding

Upload a master, generate an MP3 for playback. ffmpeg in a queue.

Playback proxies through the service rather than using presigned URLs, because
a presigned URL is shareable and would defeat the tracking. Range requests
supported so scrubbing works.

The largest single piece of work on this list.

---

## Planned

### Royalty and project reporting

Import statements from the MLC, PROs, and distributors. Match them to works and
recordings by ISWC, ISRC, and society work number. Report earnings per song,
per recording, per project.

Reporting, not bookkeeping. It answers "what earns" rather than replacing an
accountant.

### AI metadata suggestion

Analyze audio and suggest genre, mood, instruments, tempo, key, and keywords
against the existing vocabularies. Review and accept rather than auto-apply.

Bring your own key. A provider column so OpenRouter, OpenAI, Anthropic, or a
local model all work. No key, no feature, no cost.

### Split sheet generation

The splits are already in the database and more complete than most split sheet
tools produce. Generating the PDF is the easy half.

Signature is either a third-party integration or a token-and-timestamp
acknowledgement, depending on how much legal weight is wanted.

### Contracts

Term, territory, parties, covered works. Distinct from the document that
evidences it.

Answers questions a PDF cannot: what expires in ninety days, do I control this
in Germany, which works revert in 2028. Also gives provenance to the
`exclusive_p` and reversion fields currently floating on `song`.

### Metadata embedding

Write ID3, BWF, and Vorbis tags into files on export, populated from the
catalog. Deliverables that arrive correctly tagged.

### JSON-LD output

The vocabulary and schema_type tables already exist. Assemble `@context` from
the vocabulary table and emit a document per entity.

### Public catalog site

Astro consuming the same API through a restricted anonymous role. Artist pages,
release pages, and a browsable catalog for sync pitching.

### Row-level security policies

The scaffolding is in place. The policies wait until there is a second user,
because writing security policies against a case that does not exist is how you
get policies that do not work.

---

## Considered

### Watermarking

Encode a unique inaudible identifier per recipient per track for leak tracing.

Real feature, expensive: a separate encoded file per share per track multiplies
both storage and CPU. Wrong time.

### CWR file generation

The data model is aligned with CWR. Producing the file is a separate piece of
work, and worth doing only for someone registering enough works to feel the
manual entry.

### DDEX ERN and RIN delivery

Same reasoning. The model supports it; generating the XML is its own project.

### Similarity search

Audio embeddings and nearest-neighbour search over the catalog. pgvector makes
the storage side straightforward; the embedding model is the question.

### Inbox / submissions

Receive files from collaborators or from a brief, with metadata, into a holding
area. The reverse of sharing.

### Instrumental generation

Stem-separate a master to produce an instrumental version automatically.
Plausible with current models, unclear whether the quality is good enough to
pitch.

### Bulk import

CSV and spreadsheet import for catalogs arriving from elsewhere. Also useful as
an escape hatch for anyone leaving.

### Lyric transcription

Speech to text on the master, populating the lyric table. Cheap once audio is
reachable and an AI provider is configured.

---

## Rejected

### Hosted signup

Self-hosted by design. Whether a hosted version ever exists depends on demand,
and the schema already supports multiple accounts either way.

### General ledger accounting

Expenses, invoicing, tax. That is what an accountant's software is for. The
royalty work above is the music-specific half only.

### Social features

Discovery, following, public commenting. This is a rights database with a
sharing layer, not a network.
