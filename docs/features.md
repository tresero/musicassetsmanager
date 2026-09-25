# Features

What the app does today. Anything not yet built is in
[future-features.md](future-features.md).

## Compositions

A song is the written work: title, ISWC, lyrics, language, and notes, with
flags for one stop and public domain.

**Writers** carry a role, a share, and whether you control that share. Each
writer's society is recorded on the credit and defaults from the person's own
record, so a back-catalog work registered with a former PRO stays correct.

**Publishers** carry a share, whether you control it, and which writer's share
they administer. The publisher's society shows alongside it, read from the
company record.

**Registrations** record each society a work is registered with, its work
number there, and the date.

**Alternate titles** use the CWR title types (alternate, translated, working,
formal, part), each with a language.

**Copyright** holds the registration number and date, and a reversion date with
a lead time for agreements that return rights.

**Derivation** covers arrangements, translations, adaptations, and samples.
Based on names a source outside the catalog, such as a public domain tune;
Derived from links to a source that is in it.

The song list shows each work's writer and publisher totals, so a split that
does not add up is visible without opening it.

## Recordings

A recording is one master, separate from the composition it records.

**Details**: title, which defaults from the composition when left blank;
version; ISRC; BPM; tempo, described as it feels rather than as a number; key;
whether it is instrumental or a cover; status; and a description, keywords, and
"sounds like" for pitching.

**Artists** are who the record is by, billed as main or featured and in order.
Two main artists read as a duet.

**Songs** links the composition, or several for a medley.

**Credits** are who played on it: a person or a company, with any number of
roles and instruments on one row, an optional share for points in lieu of pay,
performance notes, and the name they are credited under. A person's performing
name is used by default and can be overridden for one session.

**Tags**: genres and moods, the terms supervisors search by.

**Audio**: the master and its alternates, timed cuts, and stems, each typed and
described. See Audio files below.

**Master**: recording date, country of first fixation, the P line year, and the
owners with their shares. The P line is built from those rather than typed.

## Audio files

Drop a file on a row and its header is read in the browser before anything is
sent: format, lossless or not, sample rate, bit depth, bit rate, channels, and
length. It has been tested with WAV and AIFF, including the variants Pro Tools
and Logic write for 24-bit and uncompressed audio. A zip of stems uploads as a
single file.

The same file cannot be added twice to one recording; the form says which row
already has it, and the database refuses it on save.

Open plays or downloads a file under a readable name built from the recording
and the file's description.

## People

Names, the name they perform under, society, IPI, and ISNI. Several email
addresses and phone numbers, the companies they work for with their title at
each, and attached documents.

## Companies

Name, society, IPI, ISNI, country, and attached documents.

## Artists

The identity a record is released under: name, how it sorts, whether it is a
person or a group, and its ISNI. A solo act under its own name inherits the
member's ISNI. Members are listed with the dates they joined and left.

## Documents

Split sheets, contracts, track sheets, licenses, and the rest, each with a type,
the file itself, and dates for when it was made, signed, and expires. A document
attaches to any number of songs, recordings, people, and companies, and can be
added from either side: from the document, or from the record it belongs to.
Removing it from one record detaches it without deleting it.

## Reports

- **Split problems**: works whose writer or publisher shares do not total 100.
- **Unregistered songs**: works missing a society, MLC, or copyright
  registration.
- **Expiring documents**: anything expiring within 90 days.
- **Unattached documents**: documents no longer linked to anything.
- **Duplicate emails**: the same address on more than one person.

## Lists

The vocabularies behind the pickers are editable: audio file types, document
types, statuses, roles, instruments, genres, moods, keys, languages, countries,
and societies. Most pickers can add a missing entry without leaving the form.

## Storage

Files are stored in S3-compatible object storage or on local disk, chosen per
account. Uploads go straight from the browser to the bucket. Each file is named
by the hash of its contents, so the same file uploaded again is not stored
twice, and a nightly sweep deletes stored files nothing refers to. See
[file-storage.md](file-storage.md).

## Interface

- Save and continue keeps you on the tab you were editing; Save and close
  returns to the list.
- Delete names what it deletes.
- The menu groups the catalog, the reports, the reference lists, and settings.
- Row remove buttons are always visible.