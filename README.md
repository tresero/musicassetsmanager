# Music Assets Manager

A catalog and rights management system for songwriters, publishers, and
independent labels. Tracks compositions, the people and companies attached to
them, splits, society registrations, and the paperwork behind it all.

Built because every tool in this space either models roles as an attribute of a
person — which falls apart the moment one human is the composer, the bass
player, and the master owner on the same recording — or hides the data behind a
subscription.

**Status:** in development. Compositions, contacts, organizations, and the
reference vocabularies are working. Recordings, releases, and contracts are next.

---

## Design

Business logic lives in PostgreSQL. Constraints, domains, triggers, and views
enforce the rules; the frontend is deliberately thin. If a fact is wrong, the
database refuses it — not a validation library, and not a form.

Three layers:

| Layer | What it does |
|---|---|
| PostgreSQL 18 | Tables in schema `music`. All constraints and business logic. |
| PostgREST | Publishes schema `api` — views over `music`, shaped for the client. |
| React Admin | Static SPA. CRUD screens. No server process. |

The `api` schema exists so the storage layout is not the API contract. Views
can denormalize for the client, hide internal columns, and be reshaped without
breaking anything downstream.

---

## Modeling decisions

These are the parts worth reading before using this.

**Roles belong to the attachment, not the person.** You never store "Jon is a
bass player." You store the role on the credit row. Same person, three rows,
three roles, on one recording. Instrument works the same way.

**Three identity tables, deliberately kept apart.**

| Table | What it is | Why |
|---|---|---|
| `contact` | A human | Gets paid, signs things, holds an IPI |
| `organization` | A company | Gets paid, signs things, holds an IPI |
| `artist` | A credited identity | Appears on the release |

Credits point at `artist`. Splits and agreements point at `contact` or
`organization`. A band is one artist with several member contacts. A pen name
is a second artist backed by the same contact. Display identity and legal
identity never share a row.

**ISNI identifies a public identity; IPI identifies a rights holder.** A writer
performing under their own name has one ISNI on their contact record. A pen name
or band gets its own on the artist row. `api.artist` falls back to the member's
ISNI for a solo artist and flags it as inherited.

**A writer's society is recorded per work.** In the US you can leave a PRO and
register only new material with the new one, so back-catalogue works stay where
they were. `song_writer.pro_code` defaults from the contact on insert and can be
overridden — one field to fill in normally, correct history when it matters.

**Splits are not force-balanced.** A constraint requiring 100% would block you
from saving the first row. A report view flags anything that does not total
instead. The system guides; it does not refuse work in progress.

**No sentinel rows.** No "Not Set", no "None", no `N` country. Nullable foreign
key instead.

**Natural keys where a standard defines one.** ISO 3166 country codes, ISO 639
language codes, PRO acronyms, key signature names. Integers where the vocabulary
is yours to rename — moods, genres, instruments, roles.

**Deliberate denormalization, documented in the schema.** `contact_phone` stores
one row per contact per number, so a shared switchboard is repeated. The
normalized alternative would mean two screens to enter a phone number, which is
how you end up with no phone numbers. The tradeoff is recorded in a
`COMMENT ON TABLE`.

---

## What exists

**Reference data**, loaded and ready: ISO 3166 countries, ISO 639 languages,
performing and mechanical rights societies with their territories, key
signatures with accidental counts, moods, instruments, genres (with a
self-referencing parent for hierarchy), roles grouped for the UI, and asset
statuses.

**Semantic vocabulary.** `vocabulary` holds prefix and base-URI pairs —
schema.org, Music Ontology, Dublin Core, FOAF. `schema_type` holds class names
against a vocabulary. URIs are computed in the view rather than stored, so a
class name and its URI cannot drift apart. Lookup tables carry a
`schema_class_id`, which is what will drive JSON-LD output.

**People and companies.** Contacts with generated display and sort names, IPI
and ISNI with format-checked domains, PRO affiliation. Organizations with their
own IPI. Many-to-many between them, with the job title on the relationship.
Phones and emails edited inline on the contact form, with a primary-address
constraint enforced by a partial unique index.

**Compositions.** Title, ISWC, lyrics, a pitch blurb, exclusivity and one-stop
flags, public domain, derivation (cover, arrangement, translation, adaptation,
sample) with a self-reference to the source work, copyright and reversion dates,
language, key, status. Alternate titles with CWR-style types. Writer and
publisher splits with CWR `controlled` semantics and the writer-to-publisher
chain. Society registrations with work numbers. Genre and mood tagging.

**Reports.** Splits that do not total 100. Songs missing an MLC or PRO
registration. Email addresses appearing on more than one contact.

**Auth.** A SQL function issues a signed JWT. Row-level security scaffolding is
in place — an `account` table, an `account_id` on every owned table, and a
claim-reading helper — with policies to be written when there is more than one
user.

---

## The junction pattern

React Admin's paid tier includes components for editing child records inline.
This project does not use them. The free replacement puts the work in the
database, which is where it belongs anyway:

1. The API view aggregates children into a `jsonb` column
2. An `INSTEAD OF` trigger unpacks it on write — rows with an id are updated,
   rows without are inserted, rows absent from the payload are deleted
3. The form uses `ArrayInput` and `SimpleFormIterator`, both free
4. A `transform` prop strips generated and computed columns before save

`api.contact_write()` is the reference implementation. It handles emails,
phones, and company affiliations in one function. `api.song_write()` does the
same for titles, registrations, writers, publishers, genres, and moods.

---

## Roadmap

**Next**
- Recordings, with per-credit instrument and optional points in lieu of pay
- Releases and track sequencing
- Contracts as a first-class table — term, territory, parties, covered works —
  with documents attached as evidence. `exclusive_p`, `one_stop_p`, and the
  reversion dates currently living on `song` are really contract facts, and
  should be derivable once contracts exist.
- Documents, storing a reference rather than bytes: a `storage_kind` and
  `storage_uri` pair covering local files, S3-compatible object storage, or an
  external system such as Paperless. A self-hoster can paste URIs and never run
  an upload service at all.

**Later**
- Row-level security policies, once there is a second user
- Neighbouring rights for master recordings — a separate universe with its own
  identifier system (SCAPR/IPD rather than CISAC/IPI) and no membership overlap
  with the societies table
- JSON-LD output, assembling `@context` from the vocabulary table and emitting
  a document per entity
- A public-facing site consuming the same API through a restricted anonymous
  role

---

## Reference standards

CWR for composition splits and the writer and publisher role codes. DDEX RIN for
recording credits — it confirms instrument belongs on the contributor record
rather than the person. ISO 3166, ISO 639, ISWC, ISRC, ISNI, and IPI throughout.

Business contacts — attorneys, sync agents, music supervisors — have no standard
at all. That part is invented, and kept deliberately simple.

---

## Running it

Requires PostgreSQL 18 (for `uuidv7()` and stored generated columns), PostgREST
14+, and Node 20+.

```
db/roles.sql          create the database roles
db/schema.sql         schemas, tables, views, functions, triggers
db/seed/reference.sql countries, languages, societies, and the rest
```

Copy `postgrest.conf.example`, set the connection string and a JWT secret of at
least 32 bytes, and point `db-schemas` at `api`. Build the admin app with
`npm run build` and serve `dist/` as static files, proxying `/api/*` to
PostgREST.

Bind PostgreSQL and PostgREST to loopback and terminate TLS at the reverse
proxy. Neither should be exposed directly.

---

## License

GNU Affero General Public License v3.0. You can use, modify, and distribute
this, including commercially. If you run a modified version as a network
service, you must publish your changes.