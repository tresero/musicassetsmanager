# Modeling decisions

If you are a programmer or database geek, understand these parts before using
or extending this.

## Roles belong to the attachment, not the person

You never store "Jon is a bass player." You store the role on the credit.

The database keeps one credit row per party per recording, carrying a list of
roles and a list of instruments. A player who was on guitar, tres, arranger,
and producer is one entry with four roles, not four near-identical rows where
you re-select the same person each time.

This is the failure that started the project. Directus wanted roles as a field
on the contact, which produces "Jon is a bass player" as a global fact. Useless
when the question is "who played bass on track 7."

## A composition is not a recording

The distinction most tools get wrong, and the one everything else depends on.

A **composition** is the written work: melody, lyrics, writers, splits, ISWC.
A **recording** is a master: one performance, with an ISRC and its own credits.

A radio edit and an album mix are two recordings of one composition, each with
its own ISRC.

The song table holds only what is true of the written work: title, ISWC,
lyrics, language, the rights flags, copyright, and derivation. Genre, mood,
key, tempo, and status describe how something sounds or where a master stands,
so they live on the recording. You pitch recordings, never compositions. The link between them is a junction rather than a foreign key, so
a medley can reference several compositions with a sequence number. Audio files
hang off the recording as formats of the same master: a WAV, a FLAC, and an MP3
of one mix.

### A cover is a recording

Recording someone else's song creates no new composition. Same writers, same
ISWC, same splits. The composition row is theirs, with the real writers and
`controlled = false`, and your recording points at it with `is_cover` set.

The distinction is pedantic on purpose, because getting it wrong produces duplicate
compositions with invented ISWCs, which is how a catalog becomes unusable.

### A new composition needs new authorship

`derivation_type` applies only when something genuinely new was written:

| Type | When |
|---|---|
| `arrangement` | Original arrangement with real authorship, not a transposition |
| `translation` | New lyrics in another language |
| `adaptation` | Substantially reworked |
| `sample` | Incorporates another work |

An arrangement of a public domain tune is its own copyrightable work. The claim
covers what you added, not the underlying melody, and societies generally pay a
reduced arranger share on it.

### Two ways to record a source

`derived_from_id` is a foreign key, so it only works when the source
composition is a row in this catalog. `based_on` is free text for when it
is not and never will be.

| Situation | derived_from_id | derivation_type | based_on |
|---|---|---|---|
| Arrangement of a PD tune | blank | arrangement | "America the Beautiful (PD)" |
| Cover | blank | blank | blank |
| Your own translation, same splits | one song, translated alt title | blank | blank |
| Someone else's translation | the original | translation | blank |

The last row is the case a foreign key is actually for: both works are yours,
both are in the catalog, and the translator has a claim on the derived work
only. The original's splits do not change.

## Who a recording is by, and who played on it

Two different lists. Credits say who performed and in what roles; artists say
whose record it is. A session player is credited but is not the artist, and a
band is the artist without any one member being credited as such.

Artists are billed as main or featured, with an order. Two main artists read
as a duet; a featured artist is appended. This is how DDEX distinguishes
display artists, and it is what a distributor will ask for.

## Performing names

A person can perform under a name other than their own. The default lives on
the person: set once, it is used on every recording they are credited on. A
single credit can override it, which covers the session player who cannot use
their own name on someone else's record because of a contract elsewhere.

The printed name is resolved when read rather than copied into each credit, so
changing someone's performing name updates every recording at once.

This is separate from the artist table. A performing name is how a person is
credited; an artist is an identity a record is released under.

## Master ownership is a list

A master can be owned by several parties, people or companies, in shares. That
matters beyond paperwork: SoundExchange pays the owner's half of US digital
performance income by those shares.

The printed P line is built from the year and the owners rather than stored,
so the notice cannot disagree with the ownership it describes.

## Alternates and stems are files, not recordings

A recording is one master. Its instrumental, TV mix, timed cuts, and stems are
files under it, typed from a lookup table, because they exist for supervisors
and music editors to download and are never released on their own.

The same file can appear only once on a recording. Two recordings can share
one stored file, since storage keys are made from file contents; see
[file-storage.md](file-storage.md).

## Three identity tables, deliberately kept apart

| Table | What it is | Why it exists |
|---|---|---|
| `contact` | A human | Gets paid, signs things, holds an IPI |
| `organization` | A company | Gets paid, signs things, holds an IPI |
| `artist` | A credited identity | Appears on the release |

Credits point at `artist`. Splits and agreements point at `contact` or
`organization`.

A band is one artist with several member contacts. A pen name is a second
artist backed by the same contact. A solo act under their own name is an artist
with one member. Display identity and legal identity never share a row, which
is what lets you have a stage name without pretending it's a person.

## ISNI and IPI identify different things

ISNI identifies a *public identity*. IPI identifies a *rights holder*.

A writer performing under their own name has one ISNI on their contact record.
A pen name or band is a separate public identity and gets its own ISNI on the
artist row. The API view falls back to the member's ISNI for a solo artist and
flags it as inherited, so you're not typing the same number twice.

IPI stays on contact and organization, because that's who registers works.

## A writer's society is recorded per work

In the US you can leave a PRO and register only new material with the new one.
Back-catalog works stay where they were. So "which society is this writer with"
has no single answer. It depends which song you're asking about.

The PRO on a writer credit defaults from their contact record when you leave it
blank, and can be overridden when it matters. One field to fill in normally,
correct history when you need it.

## Splits are not force-balanced

A constraint requiring shares to total 100% would stop you saving the first
row. You'd never get past one writer.

Instead there's a report view that flags anything not totalling. The system
guides; it doesn't refuse work in progress. You're chasing a co-writer for
their share half the time anyway.

Master-side shares are different again. Most credits are work for hire and
carry no share at all, so the column is nullable. A number means someone took
points instead of pay.

## Controlled is the flag that answers "can you clear this"

A share is controlled if you have the right to license it. Uncontrolled means
someone else's publisher administers it.

A composition where every writer row is uncontrolled is one you recorded but do
not own. `one_stop_p` should be false, and a supervisor asking to clear it
needs to know that before they pitch it to a client.

## Documents are references, not files

A document row records where a file is, not the bytes. `storage_kind` and
`storage_uri` cover local disk, S3-compatible object storage, or a plain URL.

Attachment works from either direction. The document form picks what it belongs
to; each parent form has a documents list. Both write the same junction rows,
one junction per target rather than a polymorphic table, so every foreign key
is real.

Removing a document from a song detaches it. It is never deleted, because the
same split sheet may cover forty other works. Anything left attached to nothing
shows up in the orphans report.

## No sentinel rows

No "Not Set", no "None", no country called `N`. A nullable foreign key means
the same thing without every query having to remember to exclude it.

## Natural keys where a standard defines one

ISO 3166 country codes, ISO 639 language codes, PRO acronyms, key signature
names. `country_code = 'CU'` reads better than `country_id = 47` and eliminates
a join in most queries.

Integers where the vocabulary is yours to rename: moods, genres, instruments,
roles. Those will get edited, and cascading a rename through every referencing
row is avoidable work.

## Deliberate denormalization, documented in the schema

Phone numbers are stored one row per contact per number, so a company
switchboard appears several times. Normalizing it would mean a search step and
a second screen to enter a phone number, which is how you end up with no phone
numbers.

The tradeoff is recorded in a `COMMENT ON TABLE` so the reasoning travels with
the schema rather than living in someone's memory.

## Shared addresses get a contact of their own

`licensing@example.com` isn't shared between three people. It belongs to the
licensing desk. Create a contact for the desk, affiliate it with the company,
and the address has one owner like everything else.

The alternative was a foreign key that points at either a person or a company
depending on a type column, which PostgreSQL can't enforce. That pattern is the
thing this project exists to avoid.