# music_tracker — conventions

Postgres 18 on Hetzner (loopback only) → PostgREST → React Admin, served by Caddy
at `musicassetsmanager.com`.

## Layout

| Thing | Where |
|---|---|
| Tables, domains, functions | schema `music` |
| Views PostgREST publishes | schema `api` |
| Login function only | schema `auth` (not exposed) |
| Frontend source | `/var/www/music-admin/src` |
| Built frontend | `/var/www/music-admin/dist` |
| PostgREST config | `/etc/postgrest/postgrest.conf` |

Roles: `authenticator` (logs in, no privileges), `app_user` (authenticated),
`web_anon` (login RPC only), `admin` (owns objects, migrations).

## Naming

- Tables singular: `country`, `pro`, `key_signature`
- Snake case throughout
- Constraints named explicitly — the name appears in the API error body
- FK columns named for what they reference: `home_country`, `pro_code`

## Column conventions

- `text` + CHECK, never `char(n)` or `varchar(n)`
- `timestamptz`, never `timestamp`
- Text columns get `CHECK (col = btrim(col) AND col <> '')`
- Natural keys where one genuinely exists (ISO codes, key names).
  Surrogates are `uuid PRIMARY KEY DEFAULT uuidv7()`
- Reference data gets no timestamps. Owned data gets `created_at`/`updated_at`
- No sentinel rows (`Not Set`, `None`, `N`). Nullable FK instead

## Reference table checklist

Reference data is shared and read-only: no `account_id`, no RLS.

```sql
-- 1. table
CREATE TABLE music.thing (
    code text PRIMARY KEY,
    name text NOT NULL,
    CONSTRAINT thing_name_key     UNIQUE (name),
    CONSTRAINT thing_name_trimmed CHECK (name = btrim(name) AND name <> '')
);

-- 2. index any FK column pointing OUT of this table
--    (Postgres does not create these automatically)
CREATE INDEX ON music.thing (some_fk_column);

-- 3. view
CREATE VIEW api.thing WITH (security_invoker = true) AS
  SELECT code, name FROM music.thing;

-- 4. grants — security_invoker means app_user needs BOTH
GRANT SELECT ON music.thing TO app_user;
GRANT SELECT ON api.thing   TO app_user;

-- 5. reload
NOTIFY pgrst, 'reload schema';
```

## Owned table checklist

Anything belonging to a user's catalog. Adds ownership and RLS.

```sql
CREATE TABLE music.work (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    account_id uuid NOT NULL REFERENCES music.account(id) ON DELETE CASCADE,
    title      text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON music.work (account_id);   -- RLS predicate hits this every query

ALTER TABLE music.work ENABLE ROW LEVEL SECURITY;
ALTER TABLE music.work FORCE  ROW LEVEL SECURITY;  -- owner bypasses RLS without this

CREATE POLICY work_account ON music.work
  FOR ALL TO app_user
  USING      (account_id = (SELECT music.current_account()))
  WITH CHECK (account_id = (SELECT music.current_account()));
```

The `(SELECT ...)` wrapper matters — it makes Postgres evaluate the claim once
as an InitPlan instead of per row.

Then the same view + grants + NOTIFY as above.

## Junction tables

Composite PK, no surrogate. Index the second column separately, since the PK
index only serves queries leading with the first.

```sql
CREATE TABLE music.pro_territory (
    pro_code     text REFERENCES music.pro(code) ON UPDATE CASCADE ON DELETE CASCADE,
    country_code text REFERENCES music.country(code) ON UPDATE CASCADE,
    PRIMARY KEY (pro_code, country_code)
);
CREATE INDEX ON music.pro_territory (country_code);
```

## Views

- Always `WITH (security_invoker = true)`. Without it the view runs as owner and
  RLS on the base table silently does nothing
- Simple single-table views are auto-updatable — INSERT/PATCH just work
- Join views are read-only until you add an `INSTEAD OF` trigger.
  Usual split: joined view for list screens, plain view for edit screens
- Denormalize in the view (`home_country_name`) so React Admin lists don't
  fire a request per row

## React Admin

Three edits per new resource, all under `/var/www/music-admin/src`:

**`dataProvider.js`** — add to the `primaryKeys` Map. Required for any
non-`id` primary key:
```js
['thing', ['code']],
```

**`App.jsx`** — add a Resource:
```jsx
<Resource name="thing" list={ListGuesser} edit={EditGuesser} recordRepresentation="name" />
```
Drop `edit` for join views until there's an INSTEAD OF trigger.

**Rebuild:**
```bash
cd /var/www/music-admin && npm run build
```
Then hard-reload (Cmd-Shift-R) — the browser caches the bundle.

`ListGuesser` prints suggested component source to the browser console. Paste
that into a real component when the generated view isn't enough.

## Common failures

| Symptom | Cause |
|---|---|
| `permission denied for view X` | Missing grant on `music.X`, not just `api.X` |
| 404 on a new endpoint | Forgot `NOTIFY pgrst, 'reload schema'` |
| RLS returns everything | View missing `security_invoker`, or no `FORCE ROW LEVEL SECURITY` |
| React Admin edits fail on a join view | Needs an `INSTEAD OF` trigger |
| Frontend changes don't appear | Didn't rebuild, or browser cached the bundle |
| Import fails on a CHECK | Real dirt in the source data — fix the data, not the constraint |

## Notes on PG 18

- Generated columns default to VIRTUAL. Virtual ones cannot be indexed, cannot
  use a domain type, and don't replicate. Say `STORED` explicitly when needed
- `uuidv7()` is built in — time-ordered, good index locality
- `WITHOUT OVERLAPS` gives declarative non-overlapping date ranges. Worth
  reaching for on agreement terms and licence periods rather than triggers
- `RETURNING OLD/NEW` covers a lot of what used to need audit triggers

## Deferred

- CISAC society code seed for `music.pro`
- Remaining lookups: role (CWR codes), rights_type, language, currency,
  address/phone/contact types
- `party` supertype — a person can be writer, publisher, and master owner at
  once. Contacts hang off `party`, ported from SQLite
- Mechanicals, and neighbouring rights for masters (separate table entirely —
  SCAPR/IPD identifiers, not CISAC/IPI)