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