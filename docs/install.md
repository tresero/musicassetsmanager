# Installation

## Requirements

- PostgreSQL 18. Needs `uuidv7()` and stored generated columns.
- PostgREST 14 or later
- Node 20 or later, to build the admin app
- Go 1.22 or later, to build the upload service
- A reverse proxy. Caddy is what this is developed against.
- S3-compatible object storage for audio. Local disk works, but every file
  then passes through the server.

## Database

```bash
createdb music_assets
psql -d music_assets -f db/roles.sql
psql -d music_assets -f db/schema.sql
psql -d music_assets -f db/seed/reference.sql
```

`roles.sql` creates `authenticator`, `app_user`, and `web_anon`. Set a real
password on `authenticator` before going further:

```sql
ALTER ROLE authenticator LOGIN PASSWORD 'something-long-and-hex';
```

Use hex or alphanumeric. Base64 output contains characters that break URI
parsing, and the password goes into a connection string.

The reference seed loads countries, languages, societies, key signatures,
instruments, genres, moods, roles, and document types. None of it is
account-scoped.

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;
```

`pgcrypto` provides `crypt()` and `gen_salt()` for password hashing in the
login function. `unaccent` is used when matching titles against society
exports, where the same work appears as both "Que Pena" and "Qué Pena". Both
ship with PostgreSQL.

## PostgREST

Copy `postgrest.conf.example` and fill it in:

```
db-uri       = "postgres://authenticator:PASSWORD@localhost:5432/music_assets"
db-schemas   = "api"
db-anon-role = "web_anon"
jwt-secret   = "at-least-32-bytes-of-random"
server-host  = "127.0.0.1"
server-port  = 3000
```

Generate the secret with `openssl rand -base64 48`. Under 32 bytes and
PostgREST refuses to start.

`chmod 600` the file. It holds two secrets.

Run it under systemd as an unprivileged user. There's an example unit in
`deploy/`.

## Admin app

```bash
cd admin
npm install
npm run build
```

`music-metadata` reads audio file headers in the browser, and `hash-wasm`
hashes files before upload. Both are in `package.json`, so `npm install`
covers them.

Set the API URL in `src/dataProvider.js` and `src/authProvider.js` before
building. If the app and the API are served from the same host, `/api` is
correct and the proxy handles the rest.

The build output in `dist/` is static files. There is no Node process in
production.

## Reverse proxy

```
music.example.com {
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy localhost:3000
    }
    handle /upload/* {
        reverse_proxy localhost:3001
    }
    handle {
        root * /path/to/admin/dist
        try_files {path} /index.html
        file_server
    }
}
```

The catch-all `handle` has to come last. Caddy evaluates `handle` blocks in
order, and one without a path matches everything, so an upload route placed
after it is never reached.

`try_files {path} /index.html` matters. The admin app uses client-side routing,
so deep links have to fall back to index.html or refreshing a page 404s.

## Upload service

Uploads, downloads, and storage cleanup go through a small Go service in
`upload/`. Its README covers building it, its database role, and the nightly
sweep timer.

## Security

Bind PostgreSQL and PostgREST to loopback. Check with `ss -tlnp | grep 5432`;
you want `127.0.0.1`, not `0.0.0.0`. An exposed PostgreSQL gets
credential-stuffed within days.

Terminate TLS at the proxy. PostgREST speaks plain HTTP and has no business
facing the internet directly.

## First user

```sql
INSERT INTO music.account (name) VALUES ('Your catalog') RETURNING id;

INSERT INTO music.user_account (account_id, email, password_hash)
VALUES ('<the uuid>', 'you@example.com',
        crypt('your-password', gen_salt('bf', 10)));
```

Then log in at the app's root URL.