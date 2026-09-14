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

## Frontend

One file per resource in `admin/src/resources/`, each default-exporting
`{ list, edit, create, recordRepresentation }`. `App.jsx` imports and spreads
them.

Non-`id` primary keys need an entry in the `primaryKeys` map in
`dataProvider.js`.

Deploy is `npm run build` then a hard reload. There's no server process.

## Gotchas

| Symptom | Cause |
|---|---|
| `permission denied for view X` | Missing grant on `music.X`, not just `api.X` |
| 404 on a new endpoint | Forgot the `NOTIFY` |
| RLS returns everything | View missing `security_invoker`, or no `FORCE ROW LEVEL SECURITY` |
| `cannot change name of view column` | `CREATE OR REPLACE` can't reshape. Drop first, and remember that takes the INSTEAD OF triggers with it. |
| `null value in column "account_id"` | Running SQL without a JWT. Use `SET LOCAL "request.jwt.claims"` inside the transaction. |
| Autocomplete filter matches nothing | PostgREST `ilike` needs explicit wildcards: `*term*` |
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

`RETURNING OLD` and `RETURNING NEW` replace a lot of what used to need audit
triggers.