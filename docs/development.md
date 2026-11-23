# Development

## Conventions

- `text` with a CHECK, never `char(n)` or `varchar(n)`
- `timestamptz`, never `timestamp`
- Text columns get `CHECK (col = btrim(col) AND col <> '')`
- Reference data has no timestamps. Owned data gets `created_at` and
  `updated_at` plus the shared touch trigger.
- Tables are singular: `country`, `recording`, `key_signature`
- Constraints are named explicitly. The name appears in the API error body,
  which gives the frontend something stable to map to a field error.
- Every view is created `WITH (security_invoker = true)`
- `NOTIFY pgrst, 'reload schema';` after any schema change

## Adding a reference table

Reference data is shared and read-only. No `account_id`, no RLS.

```sql
CREATE TABLE music.thing (
    id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name text NOT NULL UNIQUE,
    CONSTRAINT thing_trimmed CHECK (name = btrim(name) AND name <> '')
);

CREATE VIEW api.thing WITH (security_invoker = true) AS
  SELECT id, name FROM music.thing;

GRANT SELECT, INSERT, UPDATE, DELETE ON api.thing TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON music.thing TO app_user;
GRANT USAGE ON SEQUENCE music.thing_id_seq TO app_user;

NOTIFY pgrst, 'reload schema';
```

Then a file in `admin/src/resources/` and one line in `App.jsx`. For a
name-only lookup, the shared components in `resources/shared.jsx` cover it.

## Adding an owned table

Anything belonging to a user's catalog.

```sql
CREATE TABLE music.thing (
    id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_id uuid NOT NULL DEFAULT music.current_account()
                 REFERENCES music.account(id) ON DELETE CASCADE,
    -- ...
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON music.thing (account_id);

CREATE TRIGGER thing_touch
  BEFORE UPDATE ON music.thing
  FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();
```

Index `account_id`. When RLS arrives, its predicate is appended to every query
against the table.

## Adding a parent with child records

Follow `api.contact_write()`. The view aggregates children into `jsonb`; the
trigger does three passes per child table:

```sql
-- delete what's gone
DELETE FROM music.child c
 WHERE c.parent_id = _id
   AND c.id NOT IN (SELECT (x->>'id')::integer
                      FROM jsonb_array_elements(coalesce(NEW.children,'[]')) x
                     WHERE x->>'id' IS NOT NULL);

-- update what exists
UPDATE music.child c
   SET ...
  FROM jsonb_array_elements(coalesce(NEW.children,'[]')) x
 WHERE c.id = (x->>'id')::integer AND c.parent_id = _id;

-- insert what's new
INSERT INTO music.child (parent_id, ...)
SELECT _id, ...
  FROM jsonb_array_elements(coalesce(NEW.children,'[]')) x
 WHERE x->>'id' IS NULL;
```

The `x->>'id' IS NULL` filter separates new rows from existing ones. The
frontend sends new array items without an id.

Never supply an id on insert. `GENERATED ALWAYS AS IDENTITY` rejects it.

### Change history

Every table holding a song's, recording's, release's, person's, company's or
artist's rows is logged to `music.change_log` (#78), and a new one gets the
same three triggers in the migration that creates it, naming the record type
and the column holding its id:

```sql
CREATE TRIGGER change_log_insert AFTER INSERT ON music.song_thing
  FOR EACH ROW EXECUTE FUNCTION music.log_change('song', 'song_id');
CREATE TRIGGER change_log_update AFTER UPDATE ON music.song_thing
  FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION music.log_change('song', 'song_id');
CREATE TRIGGER change_log_delete BEFORE DELETE ON music.song_thing
  FOR EACH ROW EXECUTE FUNCTION music.log_change('song', 'song_id');
```

Deletes are logged before the row goes, so a record's entry is written before
the rows its delete cascades to, which find its account and name in the log.
A column holding an id of a person, company, role or other list gets its name
looked up in `music.change_names`, and a new child table its row label in
`music.change_row_label`; the frontend's wording is in `src/changes.js`.

## Frontend

One file per resource in `admin/src/resources/`, each default-exporting
`{ list, edit, create, recordRepresentation }`. `App.jsx` imports and spreads
them.

Non-`id` primary keys need an entry in the `primaryKeys` map in
`dataProvider.js`.

Child rows are edited with `RowIterator` or `BlockIterator` from
`resources/shared`, so every row editor wraps and spaces the same way.

The theme in `App.jsx` keeps pages to the window's width: react-admin's
layout otherwise grows to fit its widest piece (`minWidth: fit-content`), so
one wide tab bar or table makes the whole page scroll sideways. It also makes
form tabs scrollable, gives tables their own horizontal scroll, and lets
toolbars wrap. A new wide piece needs its own scroll or wrap, not a fixed
width.

Deploy is `npm run build` then a hard reload. There's no server process.

Every create and update trims its text first (`src/trim.js`), so write
functions need not `btrim` what a form sends; imports and RPCs are not
trimmed. A save the database refuses over a named constraint marks the field it is
about: add the constraint to `CONSTRAINTS` in `src/dbErrors.js` with the view
column and a plain message. Code inputs (ISWC, ISRC, UPC, ISNI, IPI) are in
`resources/codeInputs.jsx` and share their rules and wording with it through
`src/codes.js`.

## Tests

The plan is in #37; the tests each feature still needs are in `docs/TDD.md`.

- **Frontend:** Vitest. `cd admin && npm test` runs every `*.test.js` next to
  the code it tests. So far: the code rules (`codes.js`), the search query
  (`search.js`), the database error mapping (`dbErrors.js`), trimming
  (`trim.js`) and the change history wording (`changes.js`).
- **Upload service:** `cd upload && go test ./...`.
- **Database:** not yet. pgTAP against a scratch database Jon creates, never
  production.

## Gotchas

| Symptom | Cause |
|---|---|
| `permission denied for view X` | Missing grant on `music.X`, not just `api.X` |
| 404 on a new endpoint | Forgot the `NOTIFY` |
| RLS returns everything | View missing `security_invoker`, or no `FORCE ROW LEVEL SECURITY` |
| `cannot change name of view column` | `CREATE OR REPLACE` can't reshape. Drop first, and remember that takes the INSTEAD OF triggers with it. |
| `null value in column "account_id"` | Running SQL without a JWT. Use `SET LOCAL "request.jwt.claims"` inside the transaction. |
| Search box or picker matches nothing | Send React Admin's `q` filter (the default); `dataProvider.js` turns it into `search=fts(fold)` with `search.js`. A custom `filterToQuery` or `search@ilike` bypasses it. |
| Generated column write error | Strip it in the `transform` prop |
| Logged out on any 403 | The auth provider should only clear the token on 401 |

## PostgreSQL 18 notes

Generated columns default to VIRTUAL. Virtual ones cannot be indexed, cannot
use a domain type, cannot have NOT NULL, and don't replicate. Say `STORED`
explicitly.

`uuidv7()` is built in. Time-ordered, so index locality is fine.

`WITHOUT OVERLAPS` on primary and foreign keys over range types gives
declarative non-overlapping validity periods. The obvious use is contract terms
and licence windows, instead of writing triggers.

`RETURNING OLD` and `RETURNING NEW` give an update's before and after values
to the statement that asks for them. They don't replace audit triggers: an
edit in pgAdmin or a SQL fix asks for nothing, so the change log (#78) is
written by row triggers.

## Revision History

| Date | Revision |
|---|---|
| 2026-11-22 | Tests section; refused saves mark their field (`dbErrors.js`); code inputs |
| 2026-11-22 | Saves trim text (`trim.js`) |
| 2026-11-22 | `RowIterator` and `BlockIterator` for child rows |
| 2026-11-22 | Pages fit the window: theme overrides in `App.jsx` |
| 2026-11-23 | `RETURNING OLD`/`NEW` don't replace audit triggers; the change log (#78) uses row triggers |
| 2026-11-23 | Change history triggers for child tables (#78) |
