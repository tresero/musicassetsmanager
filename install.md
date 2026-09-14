# Installation

## Requirements

- PostgreSQL 18. Needs `uuidv7()` and stored generated columns.
- PostgREST 14 or later
- Node 20 or later, to build the admin app
- A reverse proxy. Caddy is what this is developed against.

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
    handle {
        root * /path/to/admin/dist
        try_files {path} /index.html
        file_server
    }
}
```

`try_files {path} /index.html` matters. The admin app uses client-side routing,
so deep links have to fall back to index.html or refreshing a page 404s.

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