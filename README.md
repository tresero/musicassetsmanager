# Music Assets Manager

A catalog and rights management system for songwriters, publishers, and
independent labels.

Track your compositions and recordings, who wrote and played on them, who owns
what percentage, where they're registered, and the paperwork behind it all.

Built because every tool in this space either gets the credits wrong (treating
"bass player" as something a person *is* rather than something they did on a
particular session) or puts your own catalog behind a subscription.

**Status:** in development, and in daily use on a working catalog.
Compositions, recordings, audio files, people, companies, artists, and
documents are done. Releases and tracked share links for supervisors are next.

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
dates. Copyright and reversion dates. Arrangements, translations, and other
derived works, including arrangements of public domain tunes.

**Recordings.** Separate from the composition they record, because a radio edit
and an album mix are different masters with different ISRCs. Artists billed as
main or featured. Credits where one person holds several roles and plays
several instruments in a single entry, under their own name or the one they
perform under. Master owners with shares, from which the P line is built.

**Audio files.** The master plus its alternates, timed cuts, and stems. Drop a
file and its format, sample rate, bit depth, and length are read from it. The
same file is never stored twice.

**People, companies, and artists.** IPI and ISNI, society affiliation, contact
details, and who works where. A band, a pen name, and a legal name are kept
apart.

**Documents.** Split sheets, contracts, and track sheets, attachable to any
song, recording, person, or company, with expiry dates.

**Reports.** Splits that don't total 100%, songs missing a registration,
expiring documents, unattached documents, and duplicate email addresses.

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