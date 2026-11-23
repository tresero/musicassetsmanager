# Tests to write

The tests each feature needs, written down as the feature is built and checked
by hand, until the test suite in #37 exists to hold them. When a test is
written, remove it from here. Database tests run against a scratch database
loaded from `db/schema.sql`, `db/roles.sql` and `db/seed/reference.sql`, never
production.

"Another Owner" below means the Owner of an account that is not the site
admin's.

## Accounts kept apart (#33)

- A second account can neither see nor change the first account's rows:
  through lists, single records, writes by ID, child rows and links.
- A record cannot link to a record in another account.

## IPI and ISNI per account (#49)

- Two accounts can each hold a person, company or artist with the same IPI or
  ISNI.
- Within one account, a second record with the same IPI or ISNI is refused.

## Accounts page (#34), `api.site_account`

- **Site admin only:** another Owner sees no rows, and is refused on insert,
  update and delete.
- **Create:** a name and a new email add the account and an open Owner invite,
  and send one invite email. A name already used by another account, ignoring
  case, is refused.
- **Existing email:** an email that already has a login is refused with the
  "already has a login" message, and no account is created.
- **Rename:** updating the name renames the account; a name in use, ignoring
  case, is refused.
- **Correct the Owner email:** until someone signs in, updating `owner_email`
  moves the invite to the new address and sends a new link; the old link stops
  working. A corrected email that already has a login is refused. Once
  someone has signed in, a changed email is refused.
- **Resend:** `resend true` sends a new link and stops the old one working. It
  is refused once someone has signed in.
- **Delete:** any account but the one the site admin is signed in to is
  deleted with its users, invites and catalog, even when that leaves no Owner.
  Deleting the site admin's own account is refused. Files in the account's
  storage are not touched.
- **Frontend:** Delete is hidden on the site admin's own account; for an
  account with users, Delete stays disabled until its name is typed.

## Invite page (#34), `api.check_invite` and `api.request_invite_link`

- An open invite returns its account, role and email.
- An accepted invite says so, and the page sends the person to sign in.
- An expired or replaced link offers a new link. `request_invite_link` returns
  the same answer whether or not an invite exists for the address, and sends a
  new link only when one is open.
- Accepting with a password the form refuses (under 10 characters, or not
  matching the confirmation) leaves the invite open and the link working.

## Users and invites (#34, #36)

- An account always keeps at least one Owner: changing or removing the last
  Owner is refused.
- A removed user is refused on their next request.
- Emails match regardless of case at sign-in and on invites.

## Local disk storage (#39), `music.check_local_storage` and `api.site_setting`

- **Refused while off:** with `allow_local_storage` off, another Owner cannot
  create storage on Local disk or switch to it, and gets the "does not let
  accounts keep files on its own disk" message.
- **Allowed when on:** with it on, the same Owner can.
- **Site admin always:** the site admin can choose Local disk for their own
  account whether the setting is on or off.
- **Existing Local kept:** storage already on Local disk can still be edited,
  for example its path, while the setting is off.
- **Only the site admin flips it:** another Owner cannot update
  `api.site_setting`, and gets the "Only the site admin can change the site
  settings" message. Every user can read it.
- **Default off:** with no `music.site_setting` row,
  `music.local_storage_allowed()` is false.

## Account roles, `api.account_role`

- **Site admin only:** another Owner cannot insert, update or delete a role or
  its permissions, and gets "Only the site admin can change the roles".
- **Owner protected:** the Owner role cannot be renamed or deleted and cannot
  lose `users.manage`; its other permissions can change.
- **Delete:** a role held by a user or an open invite in any account is
  refused, with the counts. A role with only accepted invites is deleted, and
  those invite records with it.
- **Names:** two roles cannot share a name regardless of case (`editor` and
  `Editor`). Names and descriptions are trimmed on write, and blank ones are
  refused.
- **Permissions:** `permission_ids` on update replaces the role's permissions
  exactly; left out, they are unchanged. `api.permission` is read only for
  every user.
- **Frontend:** Account roles shows only for the site admin. On Owner the name
  is read only, the users box is locked and Delete is hidden.

## Themes in the pitch comment (#67)

- A recording's themes and keywords appear in the pitch comment in the set
  order, and a comment that would pass 255 characters drops segments from the
  end until it fits.
- Every account reads the theme list; only the site admin can add to it.

## Copyright claimant (#9)

- A song, recording, release or document holds at most one claimant, a person
  or a company; both at once is refused by `<table>_claimant_one`.
- A claimant in another account is refused on write.
- `copyright_status.claimant` is the record's own when it has its own number,
  the Copyright Registration document's when the number comes from one, and
  for a recording the release's when it inherits from a release.
- Saving a document through a record's Documents tab keeps its claimant;
  merging two documents keeps the kept one's claimant, or takes the other's
  when the kept one has none.

## Change history (#78), `music.log_change` and `api.change_log`

- An edit through a form leaves one entry per changed row, holding only the
  changed columns; saving a form unchanged leaves none.
- A change made in SQL with no signed-in user is logged with no user, in the
  record's account.
- Deleting a song lists it under `api.deleted_record` with its writers and
  publishers; deleting a recording lists its credits with their roles and
  instruments.
- A second account reads none of the first account's entries, and no app
  user can insert, change or delete an entry.
- Deleting an account works and removes its entries.
- Every table that holds a song's, recording's, release's, person's,
  company's or artist's rows has the three `change_log_*` triggers (a query
  over `pg_trigger` against the list in `docs/development.md`).

## Codes (#18)

- **IPI and ISNI (#74):** a save with a wrong IPI or ISNI check digit is
  refused by `ipi_check_digit` / `isni_check_digit`; a 9 or 10 digit IPI is
  stored padded to 11, so it collides with the same number already stored on
  another person; a person and a company may hold the same IPI.

- **Database:** an ISWC with a wrong check digit is refused by
  `iswc_check_digit`; `music.iswc_valid` and `music.gtin_valid` accept known
  good codes and refuse a changed last digit.
- **Frontend, `codeInputs.jsx`:** a pasted `t-034.524.680-1` is saved as
  `T0345246801`, ten digits get a T, and a bad format or check digit marks the
  field red with the `CODE_MESSAGES` wording before saving. Other ISRCs names
  the bad one.
- **Frontend, a refused save:** a duplicate ISRC saved on a recording comes
  back red on the ISRC field with "Another recording already has this ISRC",
  not as a PostgreSQL notification.

## Document dates (#5)

- **Frontend:** Same as effective date copies the effective date into Signed,
  marks the form dirty, and is disabled while there is no effective date.

## Songs

- **One stop:** a song is one stop when controlled publisher shares total 100,
  or controlled writer shares when it has no publisher; a public domain work
  passes. Otherwise the reason names the first thing in the way.
- **Writer society:** a new writer credit takes the person's society; changing
  the person's society later leaves the credit's alone.
- **Role lists:** the writer role picker offers only the five writing roles and
  starts on Composer Lyricist; the publisher picker starts on Publisher.
- **Split totals:** the song list's writer and publisher totals, and the Split
  problems report, show every work whose shares don't total 100.

## Recordings

- **One stop:** a recording is one stop when controlled master shares total
  100, no exclusive deal is active with anyone else, and every composition it
  records is one stop; otherwise the reason names the first thing in the way.
- **Defaults:** a blank title and language take the composition's.
- **P line:** built from the year and the master owners, never typed.
- **Featured %:** the Credits tab flags a total that isn't 100.
- **Country of performance (#42):** a credit left blank reads the recording's
  country as `performed_in` and follows it when that changes; a credit's own
  country wins; an unknown code is refused.
- **Signed:** non-exclusive deals can overlap; an exclusive deal refuses any
  deal overlapping its dates.
- **Pitch comment:** the contact line is never dropped; it says ONE-STOP only
  for a one stop recording, Stems Available with a Stem file, Alts Available
  with any type but Full Mix or Stem, and multitracks when the flag is set. The
  contact is the recording's, else an active exclusive agent, else the
  account default. A recording's own text replaces the generated one. The
  description never appears.
- **Pitch contact filter:** the Recordings list filtered to no contact shows
  exactly the recordings that resolve to nobody.

## Releases

- **C line:** built from the © year and owner.
- **Registration as it applies:** for songs, recordings and releases, the
  record's own number wins, then an attached Copyright Registration document,
  then, for a recording, a registered release it is on. The Copyright tab
  warns when the own number matches none of the attached registration
  documents. The lists' Registration column and Export show the same.

## Audio files

- **Headers:** WAV and AIFF fixtures, including Pro Tools and Logic 24-bit and
  uncompressed variants, read the right format, sample rate, bit depth,
  channels and length.
- **Same file twice:** the form names the row that already has it, and the
  database refuses it on save.
- **Download name:** built from the recording and the file's description.

## People, companies and artists

- **Company names:** unique per account regardless of case; two accounts can
  each have the same name.
- **Artist ISNI:** a solo act under its own name shows the member's ISNI; its
  own ISNI replaces it.
- **Merge:** `music.merge_contact(keep, drop)` moves every reference to the one
  kept and deletes the other.

## Documents

- **Attach from either side:** a document attached from a record and a record
  added from the document give the same link; an existing document is attached,
  not uploaded again.
- **Detach:** removing a document from one record leaves it and its other links.
- **Merge:** merging two documents moves every link to the one kept.

## Statements

- **Import:** the header row and rows left out at the end are honored; a final
  Total, Totals, Grand total or Subtotal row is left out unless kept. Amounts
  read 1,234.56 and 1.234,56; several amount columns add up; price times
  quantity gives the amount, negative when either or both carry the minus.
  Dates, months, quarters and years read. The Check step's total and negative
  count match the file.
- **Columns remembered:** the next statement from the same payer and Paid to
  starts from the last one's columns and side, else the payer's last.
- **Duplicates:** the same file is refused; the same payer, Paid to and date
  warns and waits for confirmation. Rows are never deduplicated.
- **Publishing matching:** by ISWC, then the payer's earlier work numbers, then
  title and writer. Titles match without a leading article, with the article
  moved to the end, or with a trailing code (RUMBA ESTA BUENA LA, LA RUMBA ESTA
  BUENA ADM008 and La Rumba esta Buena); several fits are decided by a writer.
  Matching one line by hand matches the payer's other lines with that work
  number, now and later.
- **Master matching:** by ISRC or other ISRC, then the payer's earlier ISRCs and
  work numbers, then a title exactly one recording has; a line with an ISRC
  never matches a recording with a different one. A release line matches by
  barcode, else by a release title exactly one release has. Matching by hand
  teaches the recording the line's ISRC, as its own or among Other ISRCs.
- **Side change:** changing a statement's side unmatches and rematches its lines.
- **Not in catalog:** marked lines stay in the total, leave the unmatched list,
  and the payer's later lines for the same work are marked on their own. A work
  number of only zeros is stored as none.
- **Currency:** the account currency cannot change once statements or
  transactions exist; lines of a statement in another currency convert at its
  rate.
- **Permissions:** without money.view statements are not visible; without
  money.edit importing and changing them is refused.
- **Delete guards:** a song with a recording, a matched line or a transaction,
  and a recording or release with a matched line or a transaction, cannot be
  deleted. Deleting a statement removes its lines.

## Transactions

- **Shares:** each For row's share is its weight over the total; none is
  overhead.
- **Currency:** in another currency, reports use the account currency amount.
- **Categories:** a category in use cannot be deleted.
- **Receipts:** uploading one needs catalog.edit.
- **Permissions:** money.view to see, money.edit to enter.

## Reports

- **Unregistered songs** lists works missing a society, MLC or copyright
  registration, counting one through an attached document.
- **Unregistered recordings** counts a registration through a document or a
  release, and lists the releases each is on.
- **Expiring documents** lists only those expiring within 90 days;
  **Unattached documents** only those linked to nothing; **Duplicate emails**
  only addresses on more than one person.

## Shared lists

- Every account reads them; only the site admin inserts, updates or deletes,
  and the pickers offer Create only to the site admin.
- Names are unique regardless of case: typing rock picks Rock.
- A recording's credit roles are only those offered as recording credits.

## Settings

- **My settings:** each user edits only their own row, whatever their role; the
  defaults are United States, English and explicit content not set.
- **Country and languages:** the default country is listed first and filled in
  on a new recording; languages listed first lead every language picker in the
  chosen order.
- **New recordings start as:** a new recording takes the setting; saved ones
  keep theirs.

## Search

- Case and accents are ignored on both sides (corazon finds Corazón), and every
  typed word must start a word, in any order (smi cora finds Corazón by Ann
  Smith), for each field listed under Interface in `features.md`.

## Interface

- **Columns:** shown, hidden and reordered columns are kept in the browser, and
  each column sorts by what it shows.
- **Save & continue** stays on the tab and reloads computed values; **Save and
  close** returns to the list.

## Frontend widgets

- `RowIterator` and `BlockIterator`: records are numbered 1., 2., ...; the card
  holding the focused field is outlined; a row wider than the form wraps
  (#72). axe finds no contrast failure on a form with rows.
- **No sideways scroll:** at 1280, 900, 600 and 360 px, every list and every
  tab of a song, recording, release, person, company, artist, document,
  statement and transaction is no wider than the window
  (`document.documentElement.scrollWidth`). Checked by hand with Playwright
  on 2026-11-22 except statements and transactions.

- `partyInputs.jsx`: a row needing a person or company cannot be saved without
  one.
- Required row fields: a writer without a role or a credit without a person or
  company marks the field instead of dropping the row.

## Upload service

- Content addressing: the same file gets the same name, and presign reports
  when it already exists.
- The sweep keeps every referenced file and anything newer than the grace
  period, and deletes the rest.

## Revision History

| Date | Revision |
|---|---|
| 2026-11-12 | Initial version, gathered from #37 and its comments, with the Accounts tests updated for rename, email correction and deleting any account |
| 2026-11-22 | Themes in the pitch comment, copyright claimant, codes and document dates |
| 2026-11-22 | Code rules, code search and database error mapping tests written (Vitest) |
| 2026-11-22 | Tests for every feature in `features.md` not yet listed |
| 2026-11-22 | Country of performance (#42) |
| 2026-11-23 | Change history (#78) |
