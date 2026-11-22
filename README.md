# Music Assets Manager

A catalog and rights management system for songwriters, publishers, and
independent labels.

Track your compositions and recordings, who wrote and played on them, who owns
what percentage, where they're registered, and the paperwork behind it all.

Built because every tool in this space either gets the credits wrong (treating
"bass player" as something a person *is* rather than something they did on a
particular session) or puts your own catalog behind a subscription.

**Status:** in development, and in daily use on a working catalog.
Compositions, recordings, releases, audio files, people, companies, artists,
documents, royalty statement import, and transactions are done. Tracked share
links for supervisors and profit and loss reporting are next.

[Features](docs/features.md) ·
[Modeling](docs/modeling.md) ·
[Installation](docs/install.md) ·
[Architecture](docs/architecture.md) ·
[Development](docs/development.md) ·
[File storage](docs/file-storage.md) ·
[Standards](docs/standards.md) ·
[Future features](docs/future-features.md) ·
[Who this is for](docs/who-this-is-for.md) ·
[How I use AI](docs/how-i-use-ai.md)

---

## What it does

**Compositions.** Title, ISWC, lyrics, and alternate titles. Writer and
publisher splits with the controlled and uncontrolled distinction that decides
what you can actually license. Society registrations with work numbers and
dates. Copyright registrations and their claimant. Arrangements, translations,
and other derived works, including arrangements of public domain tunes.

**Recordings.** Separate from the composition they record, because a radio edit
and an album mix are different masters with different ISRCs. Artists billed as
main or featured. Credits where one person holds several roles and plays
several instruments in a single entry, under their own name or the one they
perform under. Master owners with shares, from which the P line is built.
Whether a recording is one stop, computed from who controls the master and the
publishing, and the pitch comment DISCO carries in the file, generated from the
catalog.

**Releases.** Singles, EPs, and albums with their UPC, catalog number, label,
original release date, artists, and track list by disc. Each distributor that
carried it, with their own release ID and the dates it went live and came
down. The C line, built from the year and owner. An album registered as one
work covers each of its tracks, so the number is entered once.

**Audio files.** The master plus its alternates, timed cuts, and stems. Drop a
file and its format, sample rate, bit depth, and length are read from it. The
same file is never stored twice.

**People, companies, and artists.** IPI and ISNI, society affiliation, contact
details, and who works where. A band, a pen name, and a legal name are kept
apart.

**Documents.** Split sheets, contracts, track sheets, and copyright
registrations, attachable to any song, recording, release, person, or company,
with expiry dates. A registration's number is entered once on the document and
applies to everything it is attached to.

**Royalty statements.** Import any payer's CSV, TSV, or Excel file: a society,
the MLC, a publisher, a label, or a distributor. Each row is kept exactly as
received, and lines are matched to songs, recordings, or whole releases by
ISWC, ISRC, barcode, the payer's own work number, or title. Close titles are
suggested, never matched on their own, and a line matched by hand teaches the
payer's later statements.

**Transactions.** Income and expenses entered by hand, with receipts, split
across songs, recordings, and releases by weight, and recoupable expenses
marked against whoever they are recouped from.

**Reports.** Splits that don't total 100%, songs and recordings missing a
registration, expiring documents, unattached documents, and duplicate email
addresses.

The full list is in [docs/features.md](docs/features.md).

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

Self-hosted. You need PostgreSQL, PostgREST, a web server, and for uploads the
small Go service in `upload/`. Audio belongs in S3-compatible storage; local
disk works but puts every file through the server. See
[docs/install.md](docs/install.md).

The schema already separates accounts, so a hosted version is possible later,
with each client keeping files in their own bucket.

---

## Documentation

| | |
|---|---|
| [Features](docs/features.md) | What the app does today |
| [Modeling decisions](docs/modeling.md) | Why the schema looks like this |
| [Architecture](docs/architecture.md) | How the three layers fit together |
| [Installation](docs/install.md) | Getting it running |
| [Development](docs/development.md) | Adding tables and screens |
| [File storage](docs/file-storage.md) | Where files live, and the tradeoffs |
| [Standards](docs/standards.md) | CWR, DDEX, ISWC, ISRC, IPI, ISNI |
| [Future features](docs/future-features.md) | What's next, and what's further off |
| [Who this is for](docs/who-this-is-for.md) | And who it isn't |
| [How I use AI](docs/how-i-use-ai.md) | The division of labor on this project |

---

## License

GNU Affero General Public License v3.0. Use it, change it, sell it. If you run
a modified version as a service for other people, publish your changes.

## Revision history

| Date | Revision |
|---|---|
| 2026-09-30 | One stop and pitch comments added to the feature summary. |
| 2026-11-15 | Releases, royalty statements, and transactions added to the feature summary; status brought up to date. |