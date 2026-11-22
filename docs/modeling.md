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

Language is on both. The song's language is the lyric as written; a recording
carries its own for a version sung in another language, and when it is blank the
recording takes the language of its composition.

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

"Featured" means two different things, and the model keeps them apart. On a
distributor it means a guest, billed as "feat." In neighboring rights it means
the members of the act, as opposed to hired players. The first is billing on
the recording's artists. The second is a share on each credit, set per
recording, because who was in the band and how they split the royalty can
change from one record to the next. A credit without a featured share is a
hired player.

## Performing names

A person can perform under a name other than their own. The default lives on
the person: set once, it is used on every recording they are credited on. A
single credit can override it, which covers the session player who cannot use
their own name on someone else's record because of a contract elsewhere.

The printed name is resolved when read rather than copied into each credit, so
changing someone's performing name updates every recording at once.

The country of performance works the same way. A credit holds a country only
when the performer played somewhere other than the country of recording; the
effective country (`performed_in` on each credit in `api.recording`) is the
credit's own, else the recording's, read rather than stored, so changing the
country of recording moves every credit left blank.

This is separate from the artist table. A performing name is how a person is
credited; an artist is an identity a record is released under.

## Master ownership is a list

A master can be owned by several parties, people or companies, in shares. That
matters beyond paperwork: SoundExchange pays the owner's half of US digital
performance income by those shares.

The printed P line is built from the year and the owners rather than stored,
so the notice cannot disagree with the ownership it describes.

## A master has its own copyright

A sound recording is registered separately from the composition it records,
with its own number and date, and it carries its own termination rights. So a
recording has copyright fields of its own rather than borrowing the song's.
Reversion belongs to the deal that granted the rights, not to the
registration.

One registration often covers several records: an album registered as one
work covers each of its tracks, and a group registration covers several songs.
So the registration that applies to a record is computed, never copied onto
it: the record's own number when it has one, else a Copyright Registration
document attached to it (the number is on the document), else, for a
recording, a registered release it is on. Correcting the number on the
document or the release corrects every record that relies on it. A record's
own number wins, and it is flagged when none of its attached registration
documents agree with it. The claimant travels with the number: it is entered
where the number is, on the record or on the document, and comes along when
the registration is inherited. The registration type needs no field, since
the number's prefix (PA, SR, VA) carries it, and a transfer to the claimant
is a document of its own.

## Signed deals are about the master

A publisher or sync agent holding rights to license a recording is recorded on
the recording, with whether the deal is exclusive and its term. Non-exclusive
deals can overlap freely. An exclusive one excludes every other deal on that
recording for the dates it covers, and the database refuses an overlap in
either direction. The check runs when a save commits rather than row by row,
so rearranging several deals at once does not trip over its own intermediate
states.

Retitling, where a library registers a work under its own title, is a
publishing matter and is not recorded here.

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

Control is authority, not ownership. A master owned half by you and half by a
collaborator is fully controlled when your collaboration agreement lets either
owner grant non-exclusive licenses on behalf of both. Both rows are marked
controlled, and the database treats the recording as yours to clear.

One stop is computed from these flags rather than typed, so it can never
disagree with the splits. A composition is one stop when its controlled
publishing totals 100, counting writer shares when there is no publisher. A
recording is one stop when its controlled master shares total 100, no exclusive
deal is active with anyone else, and every composition it records is one stop.
Where it isn't, the database reports the first reason, which is what tells you
which row to fix.

## A publisher appears once per writer

The same publisher can administer several writers' shares of one work, so a
publisher row is unique per song, publisher, role, and writer rather than per
song and publisher. A publisher is a company or, for a writer who holds their
own publishing, a person.

## The pitch comment is generated

The comment written into a pitched file is built from the catalog rather than
typed: contact line first, then vocals and language, moods, tempo and themes,
then genres, keywords and sounds like, dropped from the end until it fits. The
description stays out. Fixing a mood fixes every comment that
mentions it. The contact is chosen per recording, because different recordings
are pitched by different people, with an exclusive agent and then an account
default as fallbacks. A hand-written comment can still replace the generated
one for a single recording.

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

Integers where the vocabulary is yours to rename: moods, themes, genres, instruments,
roles. Those will get edited, and cascading a rename through every referencing
row is avoidable work.

## Deliberate denormalization, documented in the schema

Phone numbers are stored one row per contact per number, so a company
switchboard appears several times. Normalizing it would mean a search step and
a second screen to enter a phone number, which is how you end up with no phone
numbers.

A phone's country code is the ITU calling code, a number rather than a country,
since one code covers several countries (1 for North America and much of the
Caribbean). `music.country.calling_code` gives the code a new number starts
on, from the user's default country.

The tradeoff is recorded in a `COMMENT ON TABLE` so the reasoning travels with
the schema rather than living in someone's memory.

## Shared addresses get a contact of their own

`licensing@example.com` isn't shared between three people. It belongs to the
licensing desk. Create a contact for the desk, affiliate it with the company,
and the address has one owner like everything else.

The alternative was a foreign key that points at either a person or a company
depending on a type column, which PostgreSQL can't enforce. That pattern is the
thing this project exists to avoid.

## Statements are kept as received

A statement's rows are stored exactly as the file had them, every value as
text under its own header, in one table for every payer. A payer that adds,
drops or renames a column needs no schema change, and the stored row is always
the one the payer sent. Only a few values are read out of it: the amount, the
payer's own work number, the usage period, and the song the line matched.
Matching can change; the row cannot.

A statement has one date, when the payer issued it, and income is reported by
that date. The usage period belongs to each line instead: one distribution
pays for the current month and for late usage years back, so no single period
describes the statement.

The mapping from headers to those values is kept on each statement rather than
in a table of formats, so every file records exactly how it was read, and the
next statement from the same payer starts from the last one.

A payer's work number is remembered through the lines themselves: once one line
is matched, later lines with the same number from the same payer match too.
There is no separate lookup table to fall out of step.

Each statement is one side, publishing or master, and its lines are matched
to that side only: songs for publishing, recordings or releases for master. A
publishing statement can carry ISRCs (the MLC's does), and that income is still
the work's, so the side is chosen per statement rather than guessed from the
columns. A master line on a whole release, such as an album download, is the
release's income rather than split across its tracks.

A statement can name who it pays, a person or a company, since one society
sends a writer statement to the writer and a publisher statement to the
publishing company for the same works and period. Both are income on the same
songs; keeping who was paid lets them be reported apart and keeps their two
file layouts from overwriting each other's column mapping.

A recording can earn under several ISRCs: a reissue through a later
distributor gets a new one while the original keeps earning elsewhere. The
recording keeps one ISRC of its own and a list of others, all matched alike,
rather than a second recording for the same master, which would split one
master's income in two. An ISRC belongs to one recording only.

Some income is on nothing in the catalog: cable retransmission, unreported
works, a payer's additional revenue. A line for it is marked not in catalog
rather than left unmatched or matched to something it did not earn. It counts in the statement
total, belongs to the catalog as a whole like overhead, and is remembered the
same way as a match: by work number, or by title when the line has none. A
work number made only of zeros is no work number, since BMI uses 0 for exactly
these lines.

## A song in use cannot be deleted

A song that a recording records, or that a statement line or transaction is
for, cannot be deleted; the same holds for recordings and releases with
statement lines or transactions. Removing it would silently detach the
recording, turn earned income into unmatched lines, or turn a cost into
overhead.

## Transactions are spread by weight

A hand-entered transaction is for any number of songs, recordings and releases,
each with a weight; a share is its weight over the total, computed and never
stored, so adding a row never leaves shares that do not total 100. One table
of splits with exactly one of the three set keeps "what was this for" in one
place. No splits means overhead. Amounts are kept as paid, with the amount in
the account currency beside them, since a foreign bill is converted at the rate
actually paid rather than a rate looked up later. Categories are each account's
own list; a mastering bill and a sync fee are named differently by every
catalog.

## Publishing and master royalties are accounted apart

Publishing income is earned by a composition and paid by its writer and
publisher shares. Master income is earned by a recording and paid by its owner
shares and points. Each side keeps its own balances, and nothing moves between
them.

A deal can cross-collateralize the two, recouping a master advance from
publishing royalties or the reverse. That is deliberately not modeled. Where a
contract does it, it is settled outside the catalog.

## Revision history

| Date | Revision |
|---|---|
| 2026-09-30 | Control as authority by agreement; one stop computed for songs and recordings; publisher per writer; generated pitch comment. |
| 2026-10-14 | Language on the recording, defaulting from the composition (#3). |
| 2026-10-27 | A song's publisher can be a person (#4). |
| 2026-10-28 | Phone country codes are ITU calling codes; countries carry theirs (#51). |
| 2026-11-12 | Publishing and master royalties are accounted apart; cross-collateralization is not modeled. |
| 2026-11-13 | Statements are kept as received; a song in use cannot be deleted. |
| 2026-11-14 | A statement has one date; each line has its own usage period. |
| 2026-11-14 | Statement lines can be income on no song; an all-zero work number is none. |
| 2026-11-15 | Statements have a side; master lines match recordings or releases; not in catalog; transactions spread by weight. |
| 2026-11-15 | Recordings have other ISRCs. |
| 2026-11-15 | Statements record who they pay. |
| 2026-11-15 | Releases have a copyright of their own; the registration that applies comes through documents and releases. |
| 2026-11-22 | Themes on recordings, apart from moods; themes and keywords in the generated pitch comment. |
| 2026-11-22 | Registrations carry a claimant, entered with the number and inherited with it. |
| 2026-11-22 | Country of performance on credits, defaulting to the country of recording (#42). |
