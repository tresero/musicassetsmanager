# Standards

What this implements, and where the edges are.

## Identifiers

| Identifier | What it identifies | Where it lives |
|---|---|---|
| ISWC | A composition | `song.iswc` |
| ISRC | A recording | `recording.isrc` |
| IPI name number | A rights holder | `contact`, `organization` |
| ISNI | A public identity | `contact`, `artist`, `organization` |
| CISAC society code | A collecting society | `pro.cisac_code` |

All are format-checked by domains. ISWC is `T` plus ten digits. ISRC is a
two-letter country code, a three-character registrant, and seven digits. IPI is
nine to eleven digits. ISNI is sixteen characters with a possible trailing X.

ISO 3166-1 alpha-2 for countries, ISO 639 for languages. The language table
includes `zxx`, the ISO 639-2 code for "no linguistic content", which is what
DDEX expects for instrumentals.

## Composition and recording are separate

This is the distinction most tools get wrong, so it is stated plainly here.

A **composition** is the written work: melody, lyrics, writers, splits, ISWC. A
**recording** is a master: a specific performance, with an ISRC and its own
credits.

A cover is a new recording of an existing composition. The composition does not
change by being covered, so covering something creates no new work, no new
ISWC, and no writer claim. `recording.is_cover` is a flag on the master.

A new composition only exists when there is new authorship. `derivation_type`
covers those cases and only those:

| Type | When |
|---|---|
| `arrangement` | Original arrangement with real authorship, not a transposition |
| `translation` | New lyrics in another language |
| `adaptation` | Substantially reworked |
| `sample` | Incorporates another work |

`derived_from_id` points at the source composition when it is in the catalog.
`based_on` is free text for a source that is not and never will be, which is
the usual case for public domain material.

An arrangement of a public domain work is its own copyrightable work. The claim
covers what was added, not the underlying material, and societies generally pay
a reduced arranger share on it.

## CWR

The composition side follows CWR conventions. Writer and publisher roles map to
its role codes. The `controlled` flag carries the CWR meaning: a share you have
the right to license, as opposed to one administered by someone else's
publisher.

That flag is what answers "can you clear this". A song where every writer row is
uncontrolled is one you recorded but do not own, and `one_stop_p` should be
false.

The writer-to-publisher chain is modeled, so a publisher share can point at the
specific writer contribution it administers.

Alternate titles use CWR title types: alternate, translated, working, formal,
part.

No CWR file generation yet.

## DDEX

Recording credits follow DDEX RIN's contributor model, where instruments are a
property of the contributor record rather than of the person. That is the same
conclusion the roles-on-the-attachment rule reaches independently.

One credit row per party per recording, carrying a list of roles and a list of
instruments. A player who was on guitar, tres, arranger, and producer is one
entry with four roles.

A credit can carry the name the performer is credited under, which DDEX treats
as the display name on the contributor. When blank it falls back to the
person's default performing name, then their legal name.

Artists on a recording are billed as main or featured with an order, matching
DDEX's display artist roles. Two main artists are a duet.

No ERN or RIN file generation yet.

## Registration

A registration is with exactly one society, so MLC and HFA are rows in `pro`
alongside performing rights societies rather than a separate concept.

`song_registration` holds one row per society per work, with the work number
that society assigned. Work numbers are nullable, because you register first and
the number arrives later.

A writer's society is recorded on the credit rather than only on the contact. In
the US you can leave a PRO and register only new material with the new one, so
back-catalog works stay where they were. The field defaults from the contact
record when left blank.

## Neighboring rights

Not covered, and deliberately separate when it is.

SoundExchange, PPL, and GVL use SCAPR and IPD identifiers rather than CISAC and
IPI, and membership does not overlap with the societies in this database. That
is a separate set of tables when it gets built, not rows in the existing ones.

Two things already captured are what those registrations need.

The country of first fixation, `recording.recorded_country`, because under the
Rome Convention eligibility in many territories depends on where the master was
first recorded. Where tracks were later overdubbed or mixed does not change it.

Master ownership with shares, because SoundExchange splits US digital
performance income 50 percent to the rights owner, 45 percent to featured
artists, and 5 percent to non-featured performers, and a co-owned master
divides the owner's half by those shares.

## Semantic web

Two tables drive JSON-LD output. `vocabulary` holds prefix and base-URI pairs
for schema.org, Music Ontology, Dublin Core, and FOAF. `schema_type` holds class
names against a vocabulary, and the URI is computed in the view rather than
stored, so a class name and its URI cannot drift apart.

The `@context` block comes straight out of the vocabulary table. Lookup tables
carry a `schema_class_id` and an optional Music Ontology term.

Output generation is not built yet.

## What has no standard

Business relationships (attorneys, sync agents, music supervisors,
distributors) have no published model. Nobody publishes one because everyone's
CRM is bespoke. That part is invented here and kept deliberately simple: a
relationship to a party, no shares, no registration implications.

Document types are likewise a local vocabulary. They are a lookup table rather
than a CHECK constraint so they can be extended without a migration.