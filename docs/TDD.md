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

## Frontend widgets

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
