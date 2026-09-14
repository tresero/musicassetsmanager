# Architecture

Business logic lives in PostgreSQL. Constraints, domains, triggers, and views
enforce the rules. The frontend is deliberately thin.

## Three layers

| Layer | What it does |
|---|---|
| PostgreSQL 18 | Tables in schema `music`. All constraints and business logic. |
| PostgREST | Publishes schema `api`, views over `music` shaped for the client. |
| React Admin | Static SPA. CRUD screens. No server process. |

PostgREST turns a schema into an HTTP API directly. Point it at your tables and
your storage layout *is* your API contract. Rename a column, break every
client.

Hence two schemas. `music` holds the tables. `api` holds views over them, and
that's what gets published. The views can denormalize for the client, hide
internal columns, and be reshaped freely as long as they keep producing the
same output.

Permissions follow the same split. The web role has grants on `api` and, where
row-level security is in play, read access to the underlying tables. It never
needs write access to `music`, because the triggers do that.

## Schemas

| Schema | Contents |
|---|---|
| `music` | Tables, domains, base-table triggers |
| `api` | Views, INSTEAD OF triggers, the write functions |
| `auth` | Login function and password hashing. Not published. |

`auth` is deliberately outside PostgREST's reach. Only the login RPC is
exposed, and it's `SECURITY DEFINER` so it can read what the anonymous role
cannot.

## Roles

| Role | Purpose |
|---|---|
| `authenticator` | Logs in. Almost no privileges. Switches into the others. |
| `app_user` | Authenticated. Holds the actual grants. |
| `web_anon` | Login RPC only. Nothing else. |
| `admin` | Owns objects. Runs migrations. |

`authenticator` is `NOINHERIT`, so it can only *become* another role for the
duration of a request, never act with their combined privileges.

## Authentication

A SQL function in `auth` checks a password hash and returns a signed JWT.
PostgREST reads the `role` claim and does a `SET LOCAL ROLE` for the
transaction. Other claims are readable inside policies and defaults, which is
how `account_id` gets attached to new rows.

The frontend's auth provider is a UI concern only. It decides which screens you
see. It is not a security boundary. Anyone can call the API with curl.

## Row-level security

Scaffolding is in place: an `account` table, an `account_id` on every owned
table, and a helper function that reads the claim. Policies aren't written yet
because there's one user.

Two traps when they are.

Views must be created `WITH (security_invoker = true)`. Without it the view runs
with the owner's privileges, RLS on the base table never fires, and every user
sees every row. The API looks like it works. It just isn't enforcing anything.

And RLS doesn't apply to a table's owner, so `FORCE ROW LEVEL SECURITY` is
needed or testing as the migration role will show you everything regardless.

Reference data (countries, societies, genres) has no owner and gets no
policies. A plain `GRANT SELECT` is the whole story.

## Editing child records

React Admin's paid tier includes components for editing child records inline.
This project doesn't use them. The free replacement puts the work in the
database:

1. The API view aggregates children into a `jsonb` column
2. An `INSTEAD OF` trigger unpacks it on write. Rows with an id are updated,
   rows without are inserted, rows absent from the payload are deleted.
3. The form uses `ArrayInput` and `SimpleFormIterator`, both free
4. A `transform` prop strips generated and computed columns before save

`api.contact_write()` is the reference implementation, handling emails, phones,
and company affiliations. `api.song_write()` and `api.recording_write()` follow
it. The recording handler goes one level deeper, replacing a role list and an
instrument list nested inside each credit.

The logic ends up in the database rather than the frontend, which is where it
belongs given everything else about this project.