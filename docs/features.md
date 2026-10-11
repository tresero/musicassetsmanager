# Features

What the app does today. Anything not yet built is in
[future-features.md](future-features.md).

## Compositions

A song is the written work: title, ISWC, lyrics, language, and notes, with
flags for public domain and easy clear.

**One stop** is computed, not set. A song is one stop when the publishing you
control totals 100: controlled publisher shares, or controlled writer shares
when there is no publisher, with public domain works passing. The Details tab
says so, or names the first thing in the way.

**Writers** carry a role, a share, and whether you control that share. Each
writer's society is recorded on the credit and defaults from the person's own
record, so a back-catalog work registered with a former PRO stays correct.

**Publishers** carry a share, whether you control it, and which writer's share
they administer. The publisher's society shows alongside it, read from the
company record. One company can administer several writers' shares of the same
work, one row per writer.

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
vocals (female, male, mixed, or group); whether it is instrumental or a cover;
easy clear, set by hand for a track that can be cleared quickly; status; and a
description, keywords, and "sounds like" for pitching.

**Artists** are who the record is by, billed as main or featured and in order.
Two main artists read as a duet.

**Songs** links the composition, or several for a medley.

**Credits** are who played on it: a person or a company, with any number of
roles and instruments on one row, the name they are credited under, and a note.
A person's performing name is used by default and can be overridden for one
session. Featured % is a band member's cut of the featured-artist royalty on
this recording, blank for hired players; the tab shows the total and flags one
that is not 100. Points % is a share of master income agreed in lieu of pay.

**Tags**: genres and moods, the terms supervisors search by, and the pitch
comment: the text DISCO writes into a pitched MP3, generated from the catalog.
It opens with the contact line, never dropped: ONE-STOP when the recording is,
the pitch contact's name, email, and phone, and whether stems and alternates
exist. Vocals and language, moods, tempo, genres, and sounds like follow,
trimmed from the end to fit 255 characters. The pitch contact is chosen per
recording, falling back to an active exclusive agent and then to the default
contact in Settings. The tab shows the comment with a count and a Copy button,
and a recording can carry its own text instead.

**Audio**: the master and its alternates, timed cuts, and stems, each typed and
described. See Audio files below.

**Master**: country of recording, country of commissioning, the P line year,
and the owners with their shares, each marked controlled when you can license
that share, by owning it or by agreement. The P line is built from the year and
owners rather than typed. The tab says whether the recording is one stop: the
controlled master shares total 100, no exclusive deal is active with anyone
else, and every composition it records is one stop. When it isn't, it names the
first thing in the way.

**Copyright**: the sound recording's own registration number and date, separate
from the composition's, and a reversion date with a lead time.

**Signed**: publishers and sync agents holding rights to license the master,
each with whether the deal is exclusive, its start and end dates, the agent's
share of the fee, and the signed agreement. Any number of non-exclusive deals
can run at once; an exclusive one refuses anything overlapping it.

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
added from either side: from the document, or from the record it belongs to,
where a document that already exists can be attached rather than uploaded
again. A copyright registration covering ten works is one document linked ten
times. Removing it from one record detaches it without deleting it.

## Reports

- **Split problems**: works whose writer or publisher shares do not total 100.
- **Unregistered songs**: works missing a society, MLC, or copyright
  registration.
- **Expiring documents**: anything expiring within 90 days.
- **Unattached documents**: documents no longer linked to anything.
- **Duplicate emails**: the same address on more than one person.

## Lists

The vocabularies behind the pickers are shared by every account and fixed:
audio file types, document types, vocals, statuses, roles, instruments, genres,
moods, keys, languages, countries, and societies. Users pick from them but
cannot add or change entries, so made-up values don't creep in; the operator
changes them. Anything descriptive that no list covers goes in a recording's
Keywords, Sounds like or Description, which are free text for that recording
only. Version and Tempo offer suggestions but accept any text.

Roles and instruments carry their DDEX codes; see
[standards.md](standards.md). A recording's credits offer only performer and
studio roles, leaving publishing and business roles to the tables they belong
on.

## Settings

**Pitch settings** holds the default pitch contact, used by any recording that
has no contact of its own. A new person can be added from the picker.
Storage and pitch settings belong to the account. The Recordings list can be filtered to recordings
that resolve to nobody, which would go out with nobody to call.

## Storage

Files are stored in S3-compatible object storage or on local disk, chosen per
account. Uploads go straight from the browser to the bucket. Each file is named
by the hash of its contents, so the same file uploaded again is not stored
twice, and a nightly sweep deletes stored files nothing refers to. See
[file-storage.md](file-storage.md).

## Accounts

Each account's catalog, people, companies, documents, audio and settings are
kept apart in the database by row security. A signed-in user sees and changes
only their own account's records, and a record can only link to others in the
same account. The shared lists are the only data every account sees.

Owners invite their own staff from Settings, Users. The invite email links to a
page where the person picks a password and joins with the role the owner chose.
Invites can be resent, which makes the old link stop working, or cancelled.
Owners change a user's role or remove them; a removed user is signed out on
their next request. An account always keeps at least one Owner.

## Interface

- Save and continue keeps you on the tab you were editing; Save and close
  returns to the list.
- Delete names what it deletes.
- The menu groups the catalog, the reports, and settings.
- A row missing a field it needs, like a writer without a role or a credit
  without a person or company, can't be saved; the field is marked instead of
  the row being dropped.
- The Songs and Recordings lists can be filtered by one stop and easy clear, and
  recordings by whether they have a pitch contact.
- Row remove buttons are always visible.

## Revision history

| Date | Revision |
|---|---|
| 2026-09-30 | One stop computed on songs and recordings; controlled master owners; easy clear; vocals; pitch comment and pitch contacts; attaching existing documents; DDEX codes; Pitch settings. |
| 2026-10-09 | Accounts kept apart by row security; shared lists fixed; required row fields; pitch contact quick add. |
| 2026-10-10 | Users page and email invites. |
