# Future features

Ideas and planned work. What exists today is in [features.md](features.md).
The Next section is what comes after it; the rest is the longer list,
including things that may never get built.

Ordered roughly by value against effort.

---

## Next

Decided and next in line. Nothing here is built yet.

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

### Pitch tracking

Opportunities, briefs, submissions, status, history. Which tracks went where,
when, and what came back.

Pure schema, no service required. Contacts and recordings already exist, so
most of it is junctions and a status vocabulary.

### Conversion

A button on a lossless file that makes an MP3 of it, 320 kbps by default, and
adds it to the recording as another file. The service pulls the master from
storage, runs ffmpeg, and stores the result. Synchronous is fine at this
scale: a five-minute song converts in a few seconds. Other targets (a 16-bit
44.1 kHz WAV for distributors, a 30-second clip) are more buttons on the same
path.

### Streaming

Every file on a recording can be streamed or downloaded by whoever a playlist
is shared with; there is no designated preview. Playback of a tracked share
link proxies through the service rather than handing out presigned URLs,
because a presigned URL is shareable and would defeat the tracking. Range
requests so scrubbing works.

### Role-based access

Postgres roles are already how PostgREST switches identity per request, so this
is grants and JWT claims rather than schema. An editor can maintain the catalog
without reaching storage settings or deleting works.

---

## Planned

### Ad hoc report builder

The fixed reports answer fixed questions: splits that do not total, unregistered
songs, expiring documents. A builder would let you pick a subject, choose
columns and filters, and save the result as a named report, without writing SQL.
The views are already shaped for it; the work is the interface.

### MCP server

An MCP server so AI assistants can read the catalog directly: look up a song's
splits, find unregistered works, draft a cue sheet. It has to be open source,
like the rest of the project.


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
work, and pays off only for someone registering enough works to feel the
manual entry.

### DDEX ERN and RIN delivery

Same reasoning. The model supports it; generating the XML is its own project.

### Similarity search

Audio embeddings and nearest-neighbor search over the catalog. pgvector makes
the storage side straightforward; the embedding model is the question.

### Inbox and submissions

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

### User manual

The docs here explain the model. A separate manual would explain the workflow:
how to enter a session, when a cover is a cover, what controlled means in
practice, how to run a registration gap report before a quarterly filing.

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