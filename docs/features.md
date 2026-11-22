# Features

What the app does today. Anything not yet built is in
[future-features.md](future-features.md).

## Compositions

A song is the written work: title, ISWC, lyrics, language, and notes, with
flags for public domain and easy clear.

ISWCs, ISRCs, UPCs, ISNIs and IPI name numbers can be pasted however they are
written: spaces, dashes and dots are dropped and letters uppercased as you
type. On save, a wrong format or check digit (ISWC, UPC or EAN) marks the field
in red and says what is wrong, before anything is sent. An ISWC typed without
its T gets one. When the database refuses a save over one of these codes,
such as an ISRC already on another recording, the same field is marked with a
plain message.

**One stop** is computed, not set. A song is one stop when the publishing you
control totals 100: controlled publisher shares, or controlled writer shares
when there is no publisher, with public domain works passing. The Details tab
says so, or names the first thing in the way.

**Writers** carry a role, a share, and whether you control that share. Each
writer's society is recorded on the credit and defaults from the person's own
record, so a back-catalog work registered with a former PRO stays correct. The role
list offers only the writing roles: Composer, Composer And/Or Lyricist,
Composer Lyricist, Lyricist and Arranger. A new row starts on Composer Lyricist.

**Publishers** are a company, or a person who holds their own publishing. Each
carries a share, whether you control it, and which writer's share it
administers. The publisher's society shows alongside it, read from the company
or person record. A publisher for every writer on the song is one row, with
For writer left on All writers; one that administers only some writers' shares
is a row per writer. Publisher and Sub-Publisher head the role list,
and a new row starts on Publisher.

**Registrations** record each society a work is registered with, its work
number there, and the date.

**Alternate titles** use the CWR title types (alternate, translated, working,
formal, part), each with a language.

**Copyright** holds the registration number, date and claimant. A song with no number of its own
shows the registration of an attached Copyright Registration document (see
Registration as it applies, under Releases).

**Derivation** covers arrangements, translations, adaptations, and samples.
Based on names a source outside the catalog, such as a public domain tune;
Derived from links to a source that is in it.

The song list shows each work's writer and publisher totals, so a split that
does not add up is visible without opening it.

## Recordings

A recording is one master, separate from the composition it records.

**Songs**, the first tab, links the composition it records, or several for a
medley. Linking it first lets the title and language default from it.

**Details**: title, which defaults from the composition when left blank;
version; ISRC, and other ISRCs the same master earns under, such as a reissue
through a later distributor; explicit content, which starts from My settings;
BPM; tempo, described as it feels rather than as a number; key;
vocals (female, male, mixed, or group); the language of the vocal, which
defaults from the composition when left blank; whether it is instrumental or a
cover;
easy clear, set by hand for a track that can be cleared quickly; status; and a
description, keywords, and "sounds like" for pitching.

**Artists** are who the record is by, billed as main or featured and in order.
Two main artists read as a duet.

**Credits** are who played on it: a person or a company, with any number of
roles and instruments on one row, the name they are credited under, and a note.
A person's performing name is used by default and can be overridden for one
session. Featured % is a band member's cut of the featured-artist royalty on
this recording, blank for hired players; the tab shows the total and flags one
that is not 100. Points % is a share of master income agreed in lieu of pay.

**Tags**: genres, moods and themes, the terms supervisors search by, and the pitch
comment: the text DISCO writes into a pitched MP3, generated from the catalog.
It opens with the contact line, never dropped: ONE-STOP when the recording is,
the pitch contact's name, email, and phone, and whether stems, multitracks,
and alternates are available. Vocals and language, moods, tempo and themes
follow on the second line, then genres, keywords and sounds like on the third,
trimmed from the end to fit 255 characters. The description stays out.
A mood is how a recording feels (triumphant, melancholy); a theme is what it
is about or the scene it fits (patriotic, Christmas, road trip). The pitch contact is chosen per
recording, falling back to an active exclusive agent and then to the default
contact in Settings. The tab shows the comment with a count and a Copy button,
and a recording can carry its own text instead.

**Audio**: the master and its alternates, timed cuts, and stems, each typed and
described, and a Multitracks available flag set by hand, since multitrack
sessions are not uploaded. A Stem file makes the pitch comment say Stems
Available, and any type other than Full Mix or Stem says Alts Available. See
Audio files below.

**Master**: country of recording, country of commissioning, the P line year,
and the owners with their shares, each marked controlled when you can license
that share, by owning it or by agreement. The P line is built from the year and
owners rather than typed. The tab says whether the recording is one stop: the
controlled master shares total 100, no exclusive deal is active with anyone
else, and every composition it records is one stop. When it isn't, it names the
first thing in the way.

**Copyright**: the sound recording's own registration number, date and
claimant, separate from the composition's. With no number of its own, it shows
the registration of an attached document or of a release it is on.

**Signed**: publishers and sync agents holding rights to license the master,
each with whether the deal is exclusive, its start and end dates, the agent's
share of the fee, and the signed agreement. Any number of non-exclusive deals
can run at once; an exclusive one refuses anything overlapping it.

## Releases

**Details**: title, type (single, EP, album), UPC or EAN with its check digit
verified, catalog number, label, original release date, primary genre, and the
© year and owner, which build the C line.

**Artists**, **Tracks** (recordings by disc and track number) and
**Distribution** (each distributor with its own release ID and UPC, and the
dates submitted, live and taken down).

**Copyright**: the release's own registration number, date and claimant, such
as an album registered as one work. Songs, recordings and releases use the same
fields.

**Registration as it applies**: a song, recording or release is registered by
its own number, else by an attached Copyright Registration document, and a
recording also by a release it is on, so one album registration covers each
track. Nothing is copied: when the registration is not the record's own, the
Copyright tab shows its number, date and claimant read only, with the document or
release it comes from, and **Give it its own registration** opens the fields
to type one, which then takes over. The tab warns when the record's own number
matches none of its attached registration documents. The lists' Registration
column, and Export, show it for every record.

**Documents**: files kept with the release.

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
each, and attached documents. An IPI or ISNI is used once per account.

## Companies

Name, society, IPI, ISNI, country, and attached documents. A company name is
used once per account, regardless of case; two companies that share a name are
told apart in the name, by country or entity type. An IPI or ISNI is used once
per account.

## Artists

The identity a record is released under: name, how it sorts, whether it is a
person or a group, and its ISNI. A solo act under its own name inherits the
member's ISNI. An ISNI is used once per account. Artists are listed by how they sort, or by name
when that is blank. Members are listed with the
dates they joined and left.

## Documents

Split sheets, contracts, track sheets, licenses, and the rest, each with a type,
the file itself, and dates for when it takes effect, is signed, and expires;
Same as effective date copies the effective date into Signed. A document
attaches to any number of songs, recordings, releases, people, and companies,
and receipts to transactions, and can be
added from either side: from the document, or from the record it belongs to,
where a document that already exists can be attached rather than uploaded
again. A copyright registration covering ten works is one document linked ten
times. Removing it from one record detaches it without deleting it.

A **Copyright Registration** document has a **Registration number** and a
**Claimant** (a person or a company), and its effective date is the date of
registration. Attached to a song, recording or release, it is that record's
registration, so the number and claimant are entered once, on the document.
A transfer to the claimant is its own document, such as an Assignment of
Copyright or a Work for Hire agreement, attached to the same record.

## Statements

Royalty statements import from CSV, TSV, XLS or XLSX files, from any payer: a
society, the MLC, a publisher, an administrator, a label or a distributor. Each
statement is one side: **Publishing**, whose lines are on songs, or **Master**,
whose lines are on recordings; the payer's last statement sets it. **Paid to**
names the person or company the statement pays, such as you on a BMI writer
statement and your publishing company on its publisher statement. It is
required, since paying people out later depends on it, and starts as on the
payer's last statement. The columns and side start from the last statement with the
same payer and Paid to, else the payer's last, so a writer and a publisher
layout from one society each keep their own. Statements can be filtered by
Paid to. The import
goes step by step: pick the header row and any rows to leave out at the end
(a final row reading Total, Totals, Grand total or Subtotal is left out on its
own, and can be kept), say which columns hold the amount, work number, title,
usage period and statement date, plus ISWC and writers for publishing or ISRC,
barcode, release title and artist for master, and a quantity when the amount
is a price per unit (each line's amount is then price times quantity, as on CD
Baby sales; a return is negative whether the quantity, the price or both
carry the minus), check the rows that do not read, then import. The Check step
gives the total and how many rows are negative, such as returns and
adjustments. The
columns chosen are remembered: the next statement from the same payer and Paid
to starts from them. Several amount columns can be added together, and amounts are read
with the decimal mark the file uses, 1,234.56 or 1.234,56.

Each line keeps its own usage period, read from the usage columns, such as the
MLC's usage period start and end dates; one statement can pay for many months.
The statement has one date, read from a column such as the MLC's Distribution
Date or entered at the Check step, and income is reported by it. Dates, months,
quarters and years are read.

The file is kept, and every row is stored exactly as it reads, for audit. The
same file cannot be imported twice. When a statement from the same payer,
paid to the same, with the same statement date is already imported, the Check step warns, naming
that file, and the import waits until the user confirms it is a different
statement. Rows are never deduplicated, since the same plays at the same rate
in another period are legitimate. A statement imported wrongly is deleted from
its page with **Delete**, lines and all, and imported again. Each line of a publishing statement is matched to a song by ISWC,
then by the payer's work number from earlier statements, then by title and a
writer's name. Titles are compared without a leading article, an article
moved to the end, or a trailing code, so RUMBA ESTA BUENA LA and LA RUMBA
ESTA BUENA ADM008 match La Rumba esta Buena. A title that fits one song
matches it; when several fit, a writer on the line decides. **Statement lines** lists the lines left unmatched. The
**Match** button on an unmatched line, there or on the statement's page, picks
the song from the catalog, with up to five suggested songs whose titles look
alike, or creates it from the line with the title and ISWC
filled in (with a Title case button for titles sent in capitals). Matching one
line also matches the payer's other lines with the same work number, now and in
later statements.

Each line of a master statement, such as one from Curve or a distributor, is
matched to a recording by its ISRC or one of its other ISRCs, then by the ISRC or work number of the payer's
earlier matched lines, then by title when exactly one recording has it; a line
with an ISRC never matches a recording with a different one. A line on a whole
release, such as an album download or a CD sale, has no ISRC and matches the
release by its barcode, or, with no track title either, by its release title
when exactly one release has it. The Match dialog suggests recordings by title, ranked by artist,
matches a whole release instead, or creates the recording from the line.
Matching a line to a recording by hand teaches the recording the line's ISRC:
as its ISRC when it has none, otherwise among its **Other ISRCs**, so later
statements from any payer match it on their own. Other ISRCs are for the same
recording earning under several ISRCs, such as a reissue through a later
distributor while the original still earns; they are also edited on the
recording's Details tab and found by search. An ISRC belongs to one recording. Changing a statement's side
unmatches its lines and matches them again.

Some lines are income on nothing in the catalog, such as BMI's cable
retransmission and NCTA payments. **Not in catalog** in the Match dialog, or on
the line's page, marks them: they stay in the statement total, leave the unmatched list, and later
statements from the payer mark the same work on their own (see
[faq.md](faq.md)). A work number made only of zeros, as BMI sends for such
lines, is stored as none.

The account's currency is set under **Money > Currency**, a page with Save and
Cancel, before the first
statement; it cannot change once statements are imported or transactions
entered. A statement in
another currency records what it paid in the account's currency, and its lines
are converted at that rate. Seeing statements needs the
money.view permission and importing or changing them money.edit; the Owner role
has both.

A song cannot be deleted while a recording records it, a statement line is
matched to it or a transaction is for it; a recording or release cannot be
deleted while a statement line is matched to it or a transaction is for it.

## Transactions

**Money > Transactions** holds income and expenses entered by hand: a mastering
bill, artwork, a sync fee, an advance. Statement income is not entered again;
imported lines are income already. Each transaction has a kind (income or
expense), a date, a category, a description, optionally the person or company
paid or paying, the amount and currency as on the bill, and notes. In another
currency than the account's it also takes the amount in the account currency,
at the rate actually paid; reports use that amount. A refund is a negative
amount of the same kind.

The **For** tab says what it was for: any number of songs, recordings and
releases, each with a weight (default 1). Each row's share is its weight over
the total, shown after saving. A transaction with none is overhead, for the
catalog as a whole. The **Receipts** tab attaches documents the same way songs
do; uploading one needs catalog.edit, since it creates a document.

An expense can be recoupable, naming the person or company it is recouped
from. Balances owed come later.

Categories are the account's own list, under **Money > Categories**, and are
added from the category picker as needed. A category in use cannot be deleted.
The account currency cannot change once transactions are entered. Seeing
transactions needs money.view and entering them money.edit.

## Reports

- **Split problems**: works whose writer or publisher shares do not total 100.
- **Unregistered songs**: works missing a society, MLC, or copyright
  registration (their own, or through an attached registration document).
- **Unregistered recordings**: recordings with no copyright registration of
  their own, through a document, or through a release, with the releases each
  is on.
- **Expiring documents**: anything expiring within 90 days.
- **Unattached documents**: documents no longer linked to anything.
- **Duplicate emails**: the same address on more than one person.

## Lists

The vocabularies behind the pickers are shared by every account: audio file
types, document types, vocals, statuses, roles, role groups, instruments,
genres, moods, themes, keys, languages, countries, vocabularies, and societies. Users
pick from them but cannot add or change entries, so made-up values don't creep
in. The site admin adds, edits and deletes entries from the Lists menu; every
list but societies and schema types can be edited there. The site admin can
also add a missing genre, mood, theme, instrument, vocals, status, document type, or
audio file type from its picker without leaving the form. Names are unique
regardless of case: typing rock picks Rock rather than offering to add it. A role carries its
DDEX code and whether it is offered as a recording credit. Anything descriptive that no list covers goes in a recording's
Keywords, Sounds like or Description, which are free text for that recording
only. Version and Tempo offer suggestions but accept any text.

Roles and instruments carry their DDEX codes; see
[standards.md](standards.md). A recording's credits offer only performer and
studio roles, leaving publishing and business roles to the tables they belong
on.

## Settings

**My settings** belong to each user, whatever their role, on one page that
opens with the current values (or the defaults: United States, English,
explicit content not set) and saves or cancels: the default country,
listed first in every country picker and filled in on a new recording's country
of recording and of commissioning. A new phone number starts on its calling
code. It is United States until set.

**Languages listed first**, also in My settings, lead every language picker
(song, alternate title, recording) in the order chosen there, followed by the
rest by name. It is English until set.

**New recordings start as** sets the explicit content a new recording starts
on: not explicit, explicit, or a clean edit. Each recording can still be
changed, and saved recordings keep what they have.

**Pitch settings** holds the default pitch contact, used by any recording that
has no contact of its own. A new person can be added from the picker.
Storage and pitch settings belong to the account. The Recordings list can be filtered to recordings
that resolve to nobody, which would go out with nobody to call.

## Storage

Files are stored in S3-compatible object storage or on local disk, chosen per
account. Uploads go straight from the browser to the bucket. Each file is named
by the hash of its contents, so the same file uploaded again is not stored
twice, and a nightly sweep deletes stored files nothing refers to. Local disk
is offered only to the site admin's account unless the site admin allows it for
every account in Site settings. See [file-storage.md](file-storage.md).

## Accounts

Each account's catalog, people, companies, documents, audio and settings are
kept apart in the database by row security. A signed-in user sees and changes
only their own account's records, and a record can only link to others in the
same account. The shared lists are the only data every account sees.

Owners invite their own staff from Settings, Users. The invite email links to a
page where the person picks a password and joins with the role the owner chose.
Email addresses are matched regardless of case, at sign-in and on invites.

Invites can be resent, which makes the old link stop working, or cancelled.
The invite page checks the link before asking for a password: it names the
account, role and email for an open invite, sends an accepted one to sign in,
and for an expired or replaced link offers to email a new one to the invited
address, without saying whether an invite exists.
Owners change a user's role or remove them; a removed user is signed out on
their next request. An account always keeps at least one Owner.

The site admin creates accounts from Settings, Accounts: a name and the email
of the first Owner, who gets an invite and sets up the rest. The page lists
every account with its Owner, user count and invite status. Until someone signs
in, the site admin can resend the invite. Editing an account renames it and,
until someone signs in, corrects the Owner's email, which moves the invite there
and sends a new link. The site admin can delete any account but their own,
with its users and catalog; for an account in use, its name must be typed to
confirm. Files in the account's storage are left alone.

The roles Owners give their users are the same for every account. The site
admin creates, renames, describes and deletes them from Settings, Account
roles, and picks what each may do: add and edit catalog data, delete whole
records, change settings, manage users, see the money, and edit it. Everyone in
an account can read its catalog; statements and transactions need the money
permission. The Owner role keeps its name and always manages users. A role cannot be
deleted while a user or an open invite in any account has it; the error gives
the counts. Role names are unique regardless of case.

## Interface

Every search box and picker ignores case and accents and matches the start of
each typed word, in any order: corazon finds Corazón, and smi cora finds
Corazón by Ann Smith. Songs are found by title, alt titles, ISWC, writers,
publishers and work numbers; recordings by title, version, ISRC, artists,
songs, credits, master owners, keywords, sounds like, description and themes; releases
by title, UPC, catalog number, label, artists and their tracks. A code
typed or pasted with dashes, dots or spaces, like T-034.524.680-1 or a UPC in
groups, finds the record that holds it.

The song, recording and release lists have a Columns button to show, hide and
reorder columns; the choice is kept in the browser. Every column sorts by what
it shows: names by name and lengths by time. Registration, which can come from
a document or a release, does not sort.

- Save and continue keeps you on the tab you were editing; Save and close
  returns to the list.
- Every save trims spaces and line breaks from both ends of the text typed or
  pasted, in child rows too; text that is only spaces is saved as empty.
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
| 2026-10-14 | The site admin edits the shared lists, including roles with their DDEX code and credit flag. |
| 2026-10-14 | Recordings carry their own language, defaulting from the composition; the pitch comment uses it (#3). |
| 2026-10-14 | Multitracks available flag on recordings, shown in the pitch comment (#1). |
| 2026-10-14 | The site admin adds name-only list entries from the pickers. |
| 2026-10-14 | Shared list names and sign-in emails are matched regardless of case; searches ignore case and accents (#21). |
| 2026-10-26 | Searches match the start of each word and cover writers, artists, codes and more on songs, recordings and releases; those lists have chosen, sortable columns (#47). |
| 2026-10-27 | Company names are unique per account, regardless of case (#8). |
| 2026-10-27 | A song's publisher can be a person who holds their own publishing (#4). |
| 2026-10-27 | My settings with a per-user default country; publisher roles listed first (#2). |
| 2026-10-27 | The writer role list offers only the writing roles and starts on Composer Lyricist (#50). |
| 2026-10-28 | A new phone number starts on the calling code of the user's default country (#51). |
| 2026-11-11 | IPI and ISNI are unique per account, so accounts keep their own records of the same person, company or artist (#49). |
| 2026-11-11 | The site admin creates an account by inviting its first Owner (#34). |
| 2026-11-11 | The invite page checks the link first and offers a new link when it has expired or been replaced (#34). |
| 2026-11-11 | The site admin renames accounts and corrects the first Owner's email (#34). |
| 2026-11-11 | The site admin deletes any account but their own, typing its name when it is in use (#34). |
| 2026-11-11 | Site settings; Local disk only for the site admin's account unless allowed there (#39). |
| 2026-11-11 | The site admin creates, edits and deletes account roles and their permissions. |
| 2026-11-13 | Statement import, matching and unmatched lines; songs in use cannot be deleted (#52, #53, #54). |
| 2026-11-14 | Usage period per line and a statement date, read from the file; account currency setting. |
| 2026-11-14 | Match button on unmatched lines; create a song from a line. |
| 2026-11-14 | Warn when a statement from the same payer and date is already imported. |
| 2026-11-14 | Not a song for income on no song; zero work numbers stored as none. |
| 2026-11-14 | A publisher row can be for all writers on the song. |
| 2026-11-14 | Softer title matching; suggested songs in the Match dialog. |
| 2026-11-15 | Master statements matched to recordings and releases; Not in catalog; transactions with splits, receipts and recoupable expenses. |
| 2026-11-15 | Recordings have other ISRCs, matched like their own. |
| 2026-11-15 | Language pickers list the user's languages from My settings first. |
| 2026-11-15 | The Songs tab comes first on a recording. |
| 2026-11-15 | Explicit content default in My settings; artists sort by Sorts as, else name. |
| 2026-11-15 | The import leaves out a final totals row on its own. |
| 2026-11-15 | My settings is one page with defaults, Save and Cancel. |
| 2026-11-15 | Money > Currency is one page with Save and Cancel. |
| 2026-11-15 | Statements record who they pay (Paid to). |
| 2026-11-15 | Paid to is required and starts from the payer's last statement. |
| 2026-11-15 | Album lines match releases by title; amounts can be price times quantity. |
| 2026-11-15 | Releases section; releases have a Copyright tab like songs and recordings. |
| 2026-11-15 | Copyright Registration documents carry the number; registration as it applies, through documents and releases; Unregistered recordings report. |
| 2026-11-15 | Other ISRCs and explicit content on recordings; returns and Delete on statements; inherited registrations shown in the fields; money permissions on roles. |
| 2026-11-22 | Themes on recordings, searchable and a list column; themes and keywords in the pitch comment (#67). |
| 2026-11-22 | A document's date is its effective date; Same as effective date fills in Signed (#5). |
| 2026-11-22 | Registrations name a claimant, on the record or on the Copyright Registration document, and inherited ones show it; reversion is off the Copyright tab (#9). |
| 2026-11-22 | Reversion date and lead dropped from songs, recordings and releases; reversion belongs to deals (#69). |
| 2026-11-22 | ISWC, ISRC, UPC, ISNI and IPI fields drop separators and mark a wrong format or check digit in red; a refused save marks its field; search finds codes typed with separators (#18). |
| 2026-11-22 | Every save trims text at both ends (#17). |
