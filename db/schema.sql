--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

--
-- Name: api; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA api;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;

--
-- Name: music; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA music;

--
-- Name: cisac_society_code; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.cisac_society_code AS text
	CONSTRAINT cisac_code_format CHECK ((VALUE ~ '^[0-9]{3}$'::text));

--
-- Name: email_address; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.email_address AS text
	CONSTRAINT email_format CHECK ((VALUE ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text));

--
-- Name: ipi_name_number; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.ipi_name_number AS text
	CONSTRAINT ipi_format CHECK ((VALUE ~ '^[0-9]{9,11}$'::text));

--
-- Name: isni_number; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.isni_number AS text
	CONSTRAINT isni_format CHECK ((VALUE ~ '^[0-9]{15}[0-9X]$'::text));

--
-- Name: iso_3166_alpha2; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.iso_3166_alpha2 AS text
	CONSTRAINT alpha2_format CHECK ((VALUE ~ '^[A-Z]{2}$'::text));

--
-- Name: iso_639_code; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.iso_639_code AS text
	CONSTRAINT iso_639_format CHECK ((VALUE ~ '^[a-z]{2,3}$'::text));

--
-- Name: isrc; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.isrc AS text
	CONSTRAINT isrc_format CHECK ((VALUE ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'::text));

--
-- Name: iswc; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.iswc AS text
	CONSTRAINT iswc_format CHECK ((VALUE ~ '^T[0-9]{10}$'::text));

--
-- Name: web_url; Type: DOMAIN; Schema: music; Owner: -
--

CREATE DOMAIN music.web_url AS text
	CONSTRAINT url_format CHECK ((VALUE ~ '^https?://[^[:space:]]+$'::text));

--
-- Name: account_storage_write(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.account_storage_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _acct uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM music.account_storage WHERE account_id = OLD.account_id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    _acct := coalesce(NEW.account_id, music.current_account());

    INSERT INTO music.account_storage
      (account_id, kind, endpoint, region, bucket, base_path,
       public_base_url, access_key_id, notes)
    VALUES (_acct,
            coalesce(NEW.kind, 'local'),
            NEW.endpoint, NEW.region, NEW.bucket, NEW.base_path,
            NEW.public_base_url, NEW.access_key_id, NEW.notes);

    NEW.account_id := _acct;
    NEW.key_set := false;
    RETURN NEW;
  END IF;

  UPDATE music.account_storage
     SET kind            = coalesce(NEW.kind, 'local'),
         endpoint        = NEW.endpoint,
         region          = NEW.region,
         bucket          = NEW.bucket,
         base_path       = NEW.base_path,
         public_base_url = NEW.public_base_url,
         access_key_id   = NEW.access_key_id,
         notes           = NEW.notes
   WHERE account_id = OLD.account_id;

  NEW.account_id := OLD.account_id;
  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION account_storage_write(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.account_storage_write() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: artist_write(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.artist_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _id integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM music.artist WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO music.artist (name, sort_name, kind, isni, notes)
    VALUES (btrim(NEW.name),
            nullif(btrim(coalesce(NEW.sort_name, '')), ''),
            coalesce(nullif(NEW.kind, ''), 'person'),
            nullif(btrim(coalesce(NEW.isni_own, '')), ''),
            NEW.notes)
    RETURNING id INTO _id;
  ELSE
    UPDATE music.artist
       SET name      = btrim(NEW.name),
           sort_name = nullif(btrim(coalesce(NEW.sort_name, '')), ''),
           kind      = coalesce(nullif(NEW.kind, ''), 'person'),
           isni      = nullif(btrim(coalesce(NEW.isni_own, '')), ''),
           notes     = NEW.notes
     WHERE id = OLD.id;
    _id := OLD.id;
  END IF;

  DELETE FROM music.artist_member m
   WHERE m.artist_id = _id
     AND m.contact_id NOT IN (
           SELECT (x->>'contact_id')::integer
             FROM jsonb_array_elements(coalesce(NEW.members,'[]')) x
            WHERE x->>'contact_id' IS NOT NULL);

  INSERT INTO music.artist_member (artist_id, contact_id, begin_date,
                                   end_date, notes)
  SELECT _id, (x->>'contact_id')::integer,
         nullif(x->>'begin_date','')::date,
         nullif(x->>'end_date','')::date,
         nullif(x->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.members,'[]')) x
   WHERE x->>'contact_id' IS NOT NULL
      ON CONFLICT (artist_id, contact_id) DO UPDATE
         SET begin_date = EXCLUDED.begin_date,
             end_date   = EXCLUDED.end_date,
             notes      = EXCLUDED.notes;

  NEW.id := _id;
  SELECT a.name, a.sort_name, a.kind, a.created_at, a.updated_at
    INTO NEW.name, NEW.sort_name, NEW.kind, NEW.created_at, NEW.updated_at
    FROM music.artist a WHERE a.id = _id;

  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION artist_write(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.artist_write() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: contact_write(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.contact_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _id integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM music.contact WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO music.contact (first_name, last_name, credit_name, pro_code,
                               member_ipi, isni, notes)
    VALUES (NEW.first_name, NEW.last_name,
            nullif(btrim(coalesce(NEW.credit_name,'')), ''),
            NEW.pro_code, NEW.member_ipi, NEW.isni, NEW.notes)
    RETURNING id INTO _id;
  ELSE
    UPDATE music.contact
       SET first_name = NEW.first_name, last_name = NEW.last_name,
           credit_name = nullif(btrim(coalesce(NEW.credit_name,'')), ''),
           pro_code = NEW.pro_code, member_ipi = NEW.member_ipi,
           isni = NEW.isni, notes = NEW.notes
     WHERE id = OLD.id;
    _id := OLD.id;
  END IF;

  DELETE FROM music.contact_email e
   WHERE e.contact_id = _id
     AND e.id NOT IN (SELECT (x->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.emails,'[]')) x
                       WHERE x->>'id' IS NOT NULL);
  UPDATE music.contact_email e
     SET email = x->>'email',
         is_primary = coalesce((x->>'is_primary')::boolean, false),
         note = nullif(x->>'note','')
    FROM jsonb_array_elements(coalesce(NEW.emails,'[]')) x
   WHERE e.id = (x->>'id')::integer AND e.contact_id = _id;
  INSERT INTO music.contact_email (contact_id, email, is_primary, note)
  SELECT _id, x->>'email',
         coalesce((x->>'is_primary')::boolean, false),
         nullif(x->>'note','')
    FROM jsonb_array_elements(coalesce(NEW.emails,'[]')) x
   WHERE x->>'id' IS NULL AND nullif(btrim(x->>'email'),'') IS NOT NULL;

  DELETE FROM music.contact_phone p
   WHERE p.contact_id = _id
     AND p.id NOT IN (SELECT (x->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.phones,'[]')) x
                       WHERE x->>'id' IS NOT NULL);
  UPDATE music.contact_phone p
     SET country_code = coalesce((x->>'country_code')::smallint, 1),
         number = x->>'number',
         extension = nullif(x->>'extension',''),
         is_primary = coalesce((x->>'is_primary')::boolean, false),
         note = nullif(x->>'note','')
    FROM jsonb_array_elements(coalesce(NEW.phones,'[]')) x
   WHERE p.id = (x->>'id')::integer AND p.contact_id = _id;
  INSERT INTO music.contact_phone (contact_id, country_code, number,
                                   extension, is_primary, note)
  SELECT _id, coalesce((x->>'country_code')::smallint, 1),
         x->>'number', nullif(x->>'extension',''),
         coalesce((x->>'is_primary')::boolean, false),
         nullif(x->>'note','')
    FROM jsonb_array_elements(coalesce(NEW.phones,'[]')) x
   WHERE x->>'id' IS NULL AND nullif(btrim(x->>'number'),'') IS NOT NULL;

  DELETE FROM music.contact_organization o
   WHERE o.contact_id = _id
     AND o.organization_id NOT IN (
           SELECT (x->>'organization_id')::integer
             FROM jsonb_array_elements(coalesce(NEW.organizations,'[]')) x
            WHERE x->>'organization_id' IS NOT NULL);
  INSERT INTO music.contact_organization (contact_id, organization_id,
                                          title, is_primary)
  SELECT _id, (x->>'organization_id')::integer,
         nullif(x->>'title',''),
         coalesce((x->>'is_primary')::boolean, false)
    FROM jsonb_array_elements(coalesce(NEW.organizations,'[]')) x
   WHERE x->>'organization_id' IS NOT NULL
      ON CONFLICT (contact_id, organization_id) DO UPDATE
         SET title = EXCLUDED.title, is_primary = EXCLUDED.is_primary;

  PERFORM music.sync_documents('contact_document', 'contact_id', _id,
                               NEW.documents);

  SELECT c.id, c.first_name, c.last_name, c.display_name, c.sort_name,
         c.credit_name, c.pro_code, c.member_ipi, c.isni, c.notes,
         c.created_at, c.updated_at
    INTO NEW.id, NEW.first_name, NEW.last_name, NEW.display_name, NEW.sort_name,
         NEW.credit_name, NEW.pro_code, NEW.member_ipi, NEW.isni, NEW.notes,
         NEW.created_at, NEW.updated_at
    FROM music.contact c WHERE c.id = _id;

  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION contact_write(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.contact_write() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: document_orphan_delete(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.document_orphan_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM music.document WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

--
-- Name: FUNCTION document_orphan_delete(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.document_orphan_delete() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: document_write(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.document_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _id  integer;
  _dup text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM music.document WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF coalesce(NEW.storage_kind, 'url') IN ('local', 's3') THEN
    SELECT title INTO _dup FROM music.document
     WHERE account_id = music.current_account()
       AND storage_uri = NEW.storage_uri
       AND storage_kind IN ('local', 's3')
       AND (TG_OP = 'INSERT' OR id <> OLD.id);
    IF FOUND THEN
      RAISE EXCEPTION 'This file is already the document "%". Open that one and attach it where it applies.', _dup
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO music.document (title, document_type_id, storage_kind,
                                storage_uri, external_ref, mime_type,
                                byte_size, sha256, document_date,
                                signed_on, expires_on, notes)
    VALUES (NEW.title, NEW.document_type_id,
            coalesce(NEW.storage_kind, 'url'),
            NEW.storage_uri, NEW.external_ref, NEW.mime_type,
            NEW.byte_size, NEW.sha256, NEW.document_date,
            NEW.signed_on, NEW.expires_on, NEW.notes)
    RETURNING id INTO _id;
  ELSE
    UPDATE music.document
       SET title            = NEW.title,
           document_type_id = NEW.document_type_id,
           storage_kind     = coalesce(NEW.storage_kind, 'url'),
           storage_uri      = NEW.storage_uri,
           external_ref     = NEW.external_ref,
           mime_type        = NEW.mime_type,
           byte_size        = NEW.byte_size,
           sha256           = NEW.sha256,
           document_date    = NEW.document_date,
           signed_on        = NEW.signed_on,
           expires_on       = NEW.expires_on,
           notes            = NEW.notes
     WHERE id = OLD.id;
    _id := OLD.id;
  END IF;

  DELETE FROM music.song_document sd
   WHERE sd.document_id = _id
     AND sd.song_id <> ALL (coalesce(NEW.song_ids, '{}'::integer[]));
  INSERT INTO music.song_document (song_id, document_id)
  SELECT unnest(coalesce(NEW.song_ids, '{}'::integer[])), _id
      ON CONFLICT DO NOTHING;

  DELETE FROM music.recording_document rd
   WHERE rd.document_id = _id
     AND rd.recording_id <> ALL (coalesce(NEW.recording_ids, '{}'::integer[]));
  INSERT INTO music.recording_document (recording_id, document_id)
  SELECT unnest(coalesce(NEW.recording_ids, '{}'::integer[])), _id
      ON CONFLICT DO NOTHING;

  DELETE FROM music.contact_document cd
   WHERE cd.document_id = _id
     AND cd.contact_id <> ALL (coalesce(NEW.contact_ids, '{}'::integer[]));
  INSERT INTO music.contact_document (contact_id, document_id)
  SELECT unnest(coalesce(NEW.contact_ids, '{}'::integer[])), _id
      ON CONFLICT DO NOTHING;

  DELETE FROM music.organization_document od
   WHERE od.document_id = _id
     AND od.organization_id <> ALL (coalesce(NEW.organization_ids, '{}'::integer[]));
  INSERT INTO music.organization_document (organization_id, document_id)
  SELECT unnest(coalesce(NEW.organization_ids, '{}'::integer[])), _id
      ON CONFLICT DO NOTHING;

  NEW.id := _id;
  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION document_write(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.document_write() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: login(text, text); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.login(email text, pass text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  _account uuid;
  _user    uuid;
BEGIN
  SELECT u.account_id, u.id INTO _account, _user
  FROM music.user_account u
  WHERE u.email = login.email
    AND u.password_hash = crypt(login.pass, u.password_hash);

  IF _account IS NULL THEN
    RAISE EXCEPTION 'invalid credentials' USING errcode = 'invalid_password';
  END IF;

  RETURN json_build_object(
    'token', auth.sign(json_build_object(
      'role', 'app_user',
      'account_id', _account,
      'sub', _user,
      'exp', extract(epoch FROM now() + interval '8 hours')::int
    ))
  );
END;
$$;

--
-- Name: organization_write(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.organization_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _id integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM music.organization WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO music.organization (name, pro_code, member_ipi, isni,
                                    country, notes)
    VALUES (btrim(NEW.name), NEW.pro_code, NEW.member_ipi, NEW.isni,
            NEW.country, NEW.notes)
    RETURNING id INTO _id;
  ELSE
    UPDATE music.organization
       SET name = btrim(NEW.name), pro_code = NEW.pro_code,
           member_ipi = NEW.member_ipi, isni = NEW.isni,
           country = NEW.country, notes = NEW.notes
     WHERE id = OLD.id;
    _id := OLD.id;
  END IF;

  PERFORM music.sync_documents('organization_document', 'organization_id',
                               _id, NEW.documents);

  NEW.id := _id;
  SELECT o.name, o.created_at, o.updated_at
    INTO NEW.name, NEW.created_at, NEW.updated_at
    FROM music.organization o WHERE o.id = _id;

  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION organization_write(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.organization_write() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: recording_write(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.recording_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _id    integer;
  _cid   integer;
  _title text;
  x      jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM music.recording WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  _title := nullif(btrim(coalesce(NEW.title, '')), '');

  IF _title IS NULL THEN
    SELECT s.title INTO _title
      FROM jsonb_array_elements(coalesce(NEW.songs, '[]')) y
      JOIN music.song s ON s.id = (y->>'song_id')::integer
     WHERE y->>'song_id' IS NOT NULL
     LIMIT 1;
  END IF;

  IF _title IS NULL THEN
    RAISE EXCEPTION 'a recording needs a title, or a song to take one from'
      USING HINT = 'enter a title on the Details tab, or link a composition on the Songs tab';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO music.recording (title, version_label, isrc, duration_ms, bpm,
                                 tempo, key_signature, is_instrumental, is_cover, easy_clear,
                                 vocal_type_id, parental_warning, pitch_contact_id, pitch_comment,
                                 recorded_country, commissioned_country, p_line_year,
                                 copyright_number, copyright_date,
                                 reversion_date, reversion_lead,
                                 description, keywords, sounds_like, notes,
                                 status_id)
    VALUES (_title, NEW.version_label, NEW.isrc, NEW.duration_ms, NEW.bpm,
            NEW.tempo, NEW.key_signature,
            coalesce(NEW.is_instrumental, false),
            coalesce(NEW.is_cover, false),
            coalesce(NEW.easy_clear, false),
            NEW.vocal_type_id,
            nullif(NEW.parental_warning, ''),
            NEW.pitch_contact_id,
            nullif(btrim(coalesce(NEW.pitch_comment, '')), ''),
            NEW.recorded_country, NEW.commissioned_country, NEW.p_line_year,
            nullif(btrim(coalesce(NEW.copyright_number, '')), ''),
            NEW.copyright_date, NEW.reversion_date, NEW.reversion_lead,
            NEW.description, NEW.keywords, NEW.sounds_like, NEW.notes,
            NEW.status_id)
    RETURNING id INTO _id;
  ELSE
    UPDATE music.recording
       SET title = _title, version_label = NEW.version_label,
           isrc = NEW.isrc, duration_ms = NEW.duration_ms, bpm = NEW.bpm,
           tempo = NEW.tempo, key_signature = NEW.key_signature,
           is_instrumental = coalesce(NEW.is_instrumental, false),
           is_cover = coalesce(NEW.is_cover, false),
           easy_clear = coalesce(NEW.easy_clear, false),
           vocal_type_id = NEW.vocal_type_id,
           parental_warning = nullif(NEW.parental_warning, ''),
           pitch_contact_id = NEW.pitch_contact_id,
           pitch_comment = nullif(btrim(coalesce(NEW.pitch_comment, '')), ''),
           recorded_country = NEW.recorded_country,
           commissioned_country = NEW.commissioned_country,
           p_line_year = NEW.p_line_year,
           copyright_number = nullif(btrim(coalesce(NEW.copyright_number, '')), ''),
           copyright_date = NEW.copyright_date,
           reversion_date = NEW.reversion_date,
           reversion_lead = NEW.reversion_lead,
           description = NEW.description, keywords = NEW.keywords,
           sounds_like = NEW.sounds_like, notes = NEW.notes,
           status_id = NEW.status_id
     WHERE id = OLD.id;
    _id := OLD.id;
  END IF;

  DELETE FROM music.recording_artist ra
   WHERE ra.recording_id = _id
     AND ra.artist_id NOT IN (
           SELECT (y->>'artist_id')::integer
             FROM jsonb_array_elements(coalesce(NEW.artists,'[]')) y
            WHERE y->>'artist_id' IS NOT NULL);
  INSERT INTO music.recording_artist (recording_id, artist_id, role, sequence)
  SELECT _id, (y->>'artist_id')::integer,
         coalesce(nullif(y->>'role',''), 'main'),
         coalesce(nullif(y->>'sequence','')::smallint, 1)
    FROM jsonb_array_elements(coalesce(NEW.artists,'[]')) y
   WHERE y->>'artist_id' IS NOT NULL
      ON CONFLICT (recording_id, artist_id) DO UPDATE
         SET role = EXCLUDED.role, sequence = EXCLUDED.sequence;

  DELETE FROM music.recording_owner o
   WHERE o.recording_id = _id
     AND o.id NOT IN (SELECT (y->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.owners,'[]')) y
                       WHERE y->>'id' IS NOT NULL);
  UPDATE music.recording_owner o
     SET contact_id      = nullif(y->>'contact_id','')::integer,
         organization_id = nullif(y->>'organization_id','')::integer,
         share           = nullif(y->>'share','')::numeric,
         controlled      = coalesce((y->>'controlled')::boolean, false)
    FROM jsonb_array_elements(coalesce(NEW.owners,'[]')) y
   WHERE o.id = (y->>'id')::integer AND o.recording_id = _id;
  INSERT INTO music.recording_owner (recording_id, contact_id,
                                     organization_id, share, controlled)
  SELECT _id,
         nullif(y->>'contact_id','')::integer,
         nullif(y->>'organization_id','')::integer,
         nullif(y->>'share','')::numeric,
         coalesce((y->>'controlled')::boolean, false)
    FROM jsonb_array_elements(coalesce(NEW.owners,'[]')) y
   WHERE y->>'id' IS NULL
     AND (y->>'contact_id' IS NOT NULL OR y->>'organization_id' IS NOT NULL);

  DELETE FROM music.recording_representation d
   WHERE d.recording_id = _id
     AND d.id NOT IN (SELECT (y->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.representations,'[]')) y
                       WHERE y->>'id' IS NOT NULL);
  UPDATE music.recording_representation d
     SET contact_id      = nullif(y->>'contact_id','')::integer,
         organization_id = nullif(y->>'organization_id','')::integer,
         is_exclusive    = coalesce((y->>'is_exclusive')::boolean, false),
         signed_on       = nullif(y->>'signed_on','')::date,
         ends_on         = nullif(y->>'ends_on','')::date,
         agent_share     = nullif(y->>'agent_share','')::numeric,
         document_id     = nullif(y->>'document_id','')::integer,
         notes           = nullif(y->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.representations,'[]')) y
   WHERE d.id = (y->>'id')::integer AND d.recording_id = _id;
  INSERT INTO music.recording_representation
    (recording_id, contact_id, organization_id, is_exclusive, signed_on,
     ends_on, agent_share, document_id, notes)
  SELECT _id,
         nullif(y->>'contact_id','')::integer,
         nullif(y->>'organization_id','')::integer,
         coalesce((y->>'is_exclusive')::boolean, false),
         nullif(y->>'signed_on','')::date,
         nullif(y->>'ends_on','')::date,
         nullif(y->>'agent_share','')::numeric,
         nullif(y->>'document_id','')::integer,
         nullif(y->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.representations,'[]')) y
   WHERE y->>'id' IS NULL
     AND (y->>'contact_id' IS NOT NULL OR y->>'organization_id' IS NOT NULL);

  DELETE FROM music.recording_song rs
   WHERE rs.recording_id = _id
     AND rs.song_id NOT IN (
           SELECT (y->>'song_id')::integer
             FROM jsonb_array_elements(coalesce(NEW.songs,'[]')) y
            WHERE y->>'song_id' IS NOT NULL);
  INSERT INTO music.recording_song (recording_id, song_id)
  SELECT _id, (y->>'song_id')::integer
    FROM jsonb_array_elements(coalesce(NEW.songs,'[]')) y
   WHERE y->>'song_id' IS NOT NULL
      ON CONFLICT (recording_id, song_id) DO NOTHING;

  DELETE FROM music.recording_credit c
   WHERE c.recording_id = _id
     AND c.id NOT IN (SELECT (y->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.credits,'[]')) y
                       WHERE y->>'id' IS NOT NULL);

  FOR x IN SELECT * FROM jsonb_array_elements(coalesce(NEW.credits,'[]'))
  LOOP
    IF x->>'contact_id' IS NULL AND x->>'organization_id' IS NULL THEN
      CONTINUE;
    END IF;

    IF x->>'id' IS NULL THEN
      INSERT INTO music.recording_credit
        (recording_id, contact_id, organization_id, credited_as, share,
         featured_share, notes)
      VALUES (_id,
              nullif(x->>'contact_id','')::integer,
              nullif(x->>'organization_id','')::integer,
              nullif(btrim(coalesce(x->>'credited_as','')),''),
              nullif(x->>'share','')::numeric,
              nullif(x->>'featured_share','')::numeric,
              nullif(x->>'notes',''))
      RETURNING id INTO _cid;
    ELSE
      _cid := (x->>'id')::integer;
      UPDATE music.recording_credit
         SET contact_id = nullif(x->>'contact_id','')::integer,
             organization_id = nullif(x->>'organization_id','')::integer,
             credited_as = nullif(btrim(coalesce(x->>'credited_as','')),''),
             share = nullif(x->>'share','')::numeric,
             featured_share = nullif(x->>'featured_share','')::numeric,
             notes = nullif(x->>'notes','')
       WHERE id = _cid AND recording_id = _id;
    END IF;

    DELETE FROM music.recording_credit_role
     WHERE credit_id = _cid
       AND role_id NOT IN (
         SELECT (e)::integer
           FROM jsonb_array_elements_text(coalesce(x->'role_ids','[]')) e);
    INSERT INTO music.recording_credit_role (credit_id, role_id)
    SELECT _cid, (e)::integer
      FROM jsonb_array_elements_text(coalesce(x->'role_ids','[]')) e
        ON CONFLICT DO NOTHING;

    DELETE FROM music.recording_credit_instrument
     WHERE credit_id = _cid
       AND instrument_id NOT IN (
         SELECT (e)::integer
           FROM jsonb_array_elements_text(coalesce(x->'instrument_ids','[]')) e);
    INSERT INTO music.recording_credit_instrument (credit_id, instrument_id)
    SELECT _cid, (e)::integer
      FROM jsonb_array_elements_text(coalesce(x->'instrument_ids','[]')) e
        ON CONFLICT DO NOTHING;
  END LOOP;

  DELETE FROM music.audio_file f
   WHERE f.recording_id = _id
     AND f.id NOT IN (SELECT (y->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.audio_files,'[]')) y
                       WHERE y->>'id' IS NOT NULL);
  UPDATE music.audio_file f
     SET title = nullif(y->>'title',''),
         file_type_id = coalesce(nullif(y->>'file_type_id','')::integer,
                                 music.default_audio_file_type(y->>'format')),
         storage_kind = coalesce(nullif(y->>'storage_kind',''), 'local'),
         storage_uri = y->>'storage_uri',
         format = nullif(y->>'format',''),
         is_lossless = nullif(y->>'is_lossless','')::boolean,
         sample_rate = nullif(y->>'sample_rate','')::integer,
         bit_depth = nullif(y->>'bit_depth','')::smallint,
         bit_rate_kbps = nullif(y->>'bit_rate_kbps','')::integer,
         channels = nullif(y->>'channels','')::smallint,
         duration_ms = nullif(y->>'duration_ms','')::integer,
         notes = nullif(y->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.audio_files,'[]')) y
   WHERE f.id = (y->>'id')::integer AND f.recording_id = _id;
  INSERT INTO music.audio_file (recording_id, title, file_type_id, storage_kind, storage_uri,
                                format, is_lossless, sample_rate, bit_depth,
                                bit_rate_kbps, channels, duration_ms, notes)
  SELECT _id, nullif(y->>'title',''),
         coalesce(nullif(y->>'file_type_id','')::integer,
                  music.default_audio_file_type(y->>'format')),
         coalesce(nullif(y->>'storage_kind',''), 'local'),
         y->>'storage_uri', nullif(y->>'format',''),
         nullif(y->>'is_lossless','')::boolean,
         nullif(y->>'sample_rate','')::integer,
         nullif(y->>'bit_depth','')::smallint,
         nullif(y->>'bit_rate_kbps','')::integer,
         nullif(y->>'channels','')::smallint,
         nullif(y->>'duration_ms','')::integer,
         nullif(y->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.audio_files,'[]')) y
   WHERE y->>'id' IS NULL
     AND nullif(btrim(y->>'storage_uri'),'') IS NOT NULL;

  DELETE FROM music.recording_genre g
   WHERE g.recording_id = _id
     AND g.genre_id <> ALL (coalesce(NEW.genre_ids, '{}'::integer[]));
  INSERT INTO music.recording_genre (recording_id, genre_id)
  SELECT _id, unnest(coalesce(NEW.genre_ids, '{}'::integer[]))
      ON CONFLICT DO NOTHING;

  DELETE FROM music.recording_mood m
   WHERE m.recording_id = _id
     AND m.mood_id <> ALL (coalesce(NEW.mood_ids, '{}'::integer[]));
  INSERT INTO music.recording_mood (recording_id, mood_id)
  SELECT _id, unnest(coalesce(NEW.mood_ids, '{}'::integer[]))
      ON CONFLICT DO NOTHING;

  PERFORM music.sync_documents('recording_document', 'recording_id', _id,
                               NEW.documents);

  NEW.id := _id;
  SELECT r.title, r.is_cover, r.created_at, r.updated_at
    INTO NEW.title, NEW.is_cover, NEW.created_at, NEW.updated_at
    FROM music.recording r WHERE r.id = _id;

  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION recording_write(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.recording_write() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: release_write(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.release_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _id   integer;
  _upc  text := nullif(regexp_replace(coalesce(NEW.upc, ''), '[^0-9]', '', 'g'), '');
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM music.release WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO music.release (title, release_type, upc, catalog_number, label_id,
                               release_date, c_line_year, c_line_contact_id,
                               c_line_organization_id, primary_genre_id, notes)
    VALUES (btrim(NEW.title), coalesce(nullif(NEW.release_type, ''), 'Single'), _upc,
            nullif(btrim(coalesce(NEW.catalog_number, '')), ''), NEW.label_id,
            NEW.release_date, NEW.c_line_year,
            NEW.c_line_contact_id, NEW.c_line_organization_id,
            NEW.primary_genre_id, NEW.notes)
    RETURNING id INTO _id;
  ELSE
    UPDATE music.release
       SET title = btrim(NEW.title),
           release_type = coalesce(nullif(NEW.release_type, ''), 'Single'),
           upc = _upc,
           catalog_number = nullif(btrim(coalesce(NEW.catalog_number, '')), ''),
           label_id = NEW.label_id,
           release_date = NEW.release_date,
           c_line_year = NEW.c_line_year,
           c_line_contact_id = NEW.c_line_contact_id,
           c_line_organization_id = NEW.c_line_organization_id,
           primary_genre_id = NEW.primary_genre_id,
           notes = NEW.notes,
           updated_at = now()
     WHERE id = OLD.id;
    _id := OLD.id;
  END IF;

  DELETE FROM music.release_artist a
   WHERE a.release_id = _id
     AND a.artist_id NOT IN (SELECT (y->>'artist_id')::integer
                               FROM jsonb_array_elements(coalesce(NEW.artists, '[]')) y
                              WHERE y->>'artist_id' IS NOT NULL);
  INSERT INTO music.release_artist (release_id, artist_id, role, sequence)
  SELECT _id, (y->>'artist_id')::integer,
         coalesce(nullif(y->>'role', ''), 'main'),
         coalesce(nullif(y->>'sequence', '')::smallint, 1)
    FROM jsonb_array_elements(coalesce(NEW.artists, '[]')) y
   WHERE y->>'artist_id' IS NOT NULL
      ON CONFLICT (release_id, artist_id) DO UPDATE
         SET role = EXCLUDED.role, sequence = EXCLUDED.sequence;

  IF EXISTS (SELECT (y->>'recording_id')
               FROM jsonb_array_elements(coalesce(NEW.tracks, '[]')) y
              WHERE y->>'recording_id' IS NOT NULL
              GROUP BY 1 HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'A recording can appear only once on a release.';
  END IF;

  DELETE FROM music.release_track t
   WHERE t.release_id = _id
     AND t.recording_id NOT IN (SELECT (y->>'recording_id')::integer
                                  FROM jsonb_array_elements(coalesce(NEW.tracks, '[]')) y
                                 WHERE y->>'recording_id' IS NOT NULL);
  INSERT INTO music.release_track (release_id, recording_id, disc_number, track_number)
  SELECT _id, s.recording_id, s.disc,
         row_number() OVER (PARTITION BY s.disc ORDER BY s.ord)
    FROM (SELECT (y->>'recording_id')::integer AS recording_id,
                 coalesce(nullif(y->>'disc_number', '')::smallint, 1) AS disc,
                 ord
            FROM jsonb_array_elements(coalesce(NEW.tracks, '[]')) WITH ORDINALITY AS e(y, ord)
           WHERE y->>'recording_id' IS NOT NULL) s
      ON CONFLICT (release_id, recording_id) DO UPDATE
         SET disc_number = EXCLUDED.disc_number, track_number = EXCLUDED.track_number;

  DELETE FROM music.release_distribution d
   WHERE d.release_id = _id
     AND d.id NOT IN (SELECT (y->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.distributions, '[]')) y
                       WHERE y->>'id' IS NOT NULL);
  UPDATE music.release_distribution d
     SET distributor_id = (y->>'distributor_id')::integer,
         distributor_release_id = nullif(btrim(coalesce(y->>'distributor_release_id', '')), ''),
         upc = nullif(regexp_replace(coalesce(y->>'upc', ''), '[^0-9]', '', 'g'), ''),
         submitted_on = nullif(y->>'submitted_on', '')::date,
         live_on = nullif(y->>'live_on', '')::date,
         taken_down_on = nullif(y->>'taken_down_on', '')::date,
         notes = nullif(y->>'notes', '')
    FROM jsonb_array_elements(coalesce(NEW.distributions, '[]')) y
   WHERE d.id = (y->>'id')::integer AND d.release_id = _id;
  INSERT INTO music.release_distribution (release_id, distributor_id, distributor_release_id,
                                          upc, submitted_on, live_on, taken_down_on, notes)
  SELECT _id, (y->>'distributor_id')::integer,
         nullif(btrim(coalesce(y->>'distributor_release_id', '')), ''),
         nullif(regexp_replace(coalesce(y->>'upc', ''), '[^0-9]', '', 'g'), ''),
         nullif(y->>'submitted_on', '')::date,
         nullif(y->>'live_on', '')::date,
         nullif(y->>'taken_down_on', '')::date,
         nullif(y->>'notes', '')
    FROM jsonb_array_elements(coalesce(NEW.distributions, '[]')) y
   WHERE y->>'id' IS NULL AND y->>'distributor_id' IS NOT NULL;

  PERFORM music.sync_documents('release_document', 'release_id', _id, NEW.documents);

  NEW.id := _id;
  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION release_write(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.release_write() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: set_storage_secret(text); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.set_storage_secret(secret text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE music.account_storage
     SET secret_key = nullif(btrim(secret), '')
   WHERE account_id = music.current_account();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no storage row for this account';
  END IF;
END;
$$;

--
-- Name: FUNCTION set_storage_secret(secret text); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.set_storage_secret(secret text) IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: song_write(); Type: FUNCTION; Schema: api; Owner: -
--

CREATE FUNCTION api.song_write() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  _id integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM music.song WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO music.song (title, iswc, lyrics, notes,
                            public_domain_p, easy_clear,
                            derived_from_id, derivation_type, based_on,
                            copyright_date, copyright_number,
                            reversion_date, reversion_lead, language_code)
    VALUES (NEW.title, NEW.iswc, NEW.lyrics, NEW.notes,
            coalesce(NEW.public_domain_p, false),
            coalesce(NEW.easy_clear, false),
            NEW.derived_from_id, NEW.derivation_type,
            nullif(btrim(coalesce(NEW.based_on,'')), ''),
            NEW.copyright_date, NEW.copyright_number,
            NEW.reversion_date, NEW.reversion_lead, NEW.language_code)
    RETURNING id INTO _id;
  ELSE
    UPDATE music.song
       SET title = NEW.title, iswc = NEW.iswc, lyrics = NEW.lyrics,
           notes = NEW.notes,
           public_domain_p = coalesce(NEW.public_domain_p, false),
           easy_clear = coalesce(NEW.easy_clear, false),
           derived_from_id = NEW.derived_from_id,
           derivation_type = NEW.derivation_type,
           based_on = nullif(btrim(coalesce(NEW.based_on,'')), ''),
           copyright_date = NEW.copyright_date,
           copyright_number = NEW.copyright_number,
           reversion_date = NEW.reversion_date,
           reversion_lead = NEW.reversion_lead,
           language_code = NEW.language_code
     WHERE id = OLD.id;
    _id := OLD.id;
  END IF;

  DELETE FROM music.song_title t
   WHERE t.song_id = _id
     AND t.id NOT IN (SELECT (x->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.titles,'[]')) x
                       WHERE x->>'id' IS NOT NULL);
  UPDATE music.song_title t
     SET title = x->>'title',
         title_type = coalesce(nullif(x->>'title_type',''), 'alternate'),
         language_code = nullif(x->>'language_code','')
    FROM jsonb_array_elements(coalesce(NEW.titles,'[]')) x
   WHERE t.id = (x->>'id')::integer AND t.song_id = _id;
  INSERT INTO music.song_title (song_id, title, title_type, language_code)
  SELECT _id, x->>'title',
         coalesce(nullif(x->>'title_type',''), 'alternate'),
         nullif(x->>'language_code','')
    FROM jsonb_array_elements(coalesce(NEW.titles,'[]')) x
   WHERE x->>'id' IS NULL AND nullif(btrim(x->>'title'),'') IS NOT NULL;

  DELETE FROM music.song_registration r
   WHERE r.song_id = _id
     AND r.id NOT IN (SELECT (x->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.registrations,'[]')) x
                       WHERE x->>'id' IS NOT NULL);
  UPDATE music.song_registration r
     SET pro_code = x->>'pro_code',
         work_number = nullif(x->>'work_number',''),
         registered_on = nullif(x->>'registered_on','')::date,
         notes = nullif(x->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.registrations,'[]')) x
   WHERE r.id = (x->>'id')::integer AND r.song_id = _id;
  INSERT INTO music.song_registration (song_id, pro_code, work_number,
                                       registered_on, notes)
  SELECT _id, x->>'pro_code', nullif(x->>'work_number',''),
         nullif(x->>'registered_on','')::date, nullif(x->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.registrations,'[]')) x
   WHERE x->>'id' IS NULL AND nullif(btrim(x->>'pro_code'),'') IS NOT NULL;

  DELETE FROM music.song_writer w
   WHERE w.song_id = _id
     AND w.id NOT IN (SELECT (x->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.writers,'[]')) x
                       WHERE x->>'id' IS NOT NULL);
  UPDATE music.song_writer w
     SET contact_id = (x->>'contact_id')::integer,
         role_id = (x->>'role_id')::integer,
         pro_code = nullif(x->>'pro_code',''),
         share = coalesce((x->>'share')::numeric, 0),
         controlled = coalesce((x->>'controlled')::boolean, false),
         notes = nullif(x->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.writers,'[]')) x
   WHERE w.id = (x->>'id')::integer AND w.song_id = _id;
  INSERT INTO music.song_writer (song_id, contact_id, role_id, pro_code,
                                 share, controlled, notes)
  SELECT _id, (x->>'contact_id')::integer, (x->>'role_id')::integer,
         nullif(x->>'pro_code',''),
         coalesce((x->>'share')::numeric, 0),
         coalesce((x->>'controlled')::boolean, false),
         nullif(x->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.writers,'[]')) x
   WHERE x->>'id' IS NULL AND x->>'contact_id' IS NOT NULL
     AND x->>'role_id' IS NOT NULL;

  DELETE FROM music.song_publisher p
   WHERE p.song_id = _id
     AND p.id NOT IN (SELECT (x->>'id')::integer
                        FROM jsonb_array_elements(coalesce(NEW.publishers,'[]')) x
                       WHERE x->>'id' IS NOT NULL);
  UPDATE music.song_publisher p
     SET organization_id = (x->>'organization_id')::integer,
         role_id = (x->>'role_id')::integer,
         share = coalesce((x->>'share')::numeric, 0),
         controlled = coalesce((x->>'controlled')::boolean, false),
         for_writer_id = nullif(x->>'for_writer_id','')::integer,
         notes = nullif(x->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.publishers,'[]')) x
   WHERE p.id = (x->>'id')::integer AND p.song_id = _id;
  INSERT INTO music.song_publisher (song_id, organization_id, role_id,
                                    share, controlled, for_writer_id, notes)
  SELECT _id, (x->>'organization_id')::integer, (x->>'role_id')::integer,
         coalesce((x->>'share')::numeric, 0),
         coalesce((x->>'controlled')::boolean, false),
         nullif(x->>'for_writer_id','')::integer,
         nullif(x->>'notes','')
    FROM jsonb_array_elements(coalesce(NEW.publishers,'[]')) x
   WHERE x->>'id' IS NULL AND x->>'organization_id' IS NOT NULL
     AND x->>'role_id' IS NOT NULL;

  PERFORM music.sync_documents('song_document', 'song_id', _id, NEW.documents);

  NEW.id := _id;
  SELECT s.title, s.iswc, s.based_on, s.created_at, s.updated_at
    INTO NEW.title, NEW.iswc, NEW.based_on, NEW.created_at, NEW.updated_at
    FROM music.song s WHERE s.id = _id;

  RETURN NEW;
END;
$$;

--
-- Name: FUNCTION song_write(); Type: COMMENT; Schema: api; Owner: -
--

COMMENT ON FUNCTION api.song_write() IS 'Runs as the signed-in user, so row security limits every write to that account.';

--
-- Name: b64url(bytea); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.b64url(data bytea) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT translate(encode(data, 'base64'), E'+/=\n', '-_')
$$;

--
-- Name: set_password(text, text); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.set_password(p_email text, p_password text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    AS $$
  UPDATE music.user_account
  SET password_hash = crypt(p_password, gen_salt('bf', 10))
  WHERE email = p_email
$$;

--
-- Name: sign(json); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.sign(payload json) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  WITH parts AS (
    SELECT auth.b64url(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8')) AS h,
           auth.b64url(convert_to(payload::text, 'utf8')) AS p
  )
  SELECT h || '.' || p || '.' ||
         auth.b64url(hmac(h || '.' || p, current_setting('app.jwt_secret'), 'sha256'))
  FROM parts
$$;

--
-- Name: check_representation_exclusive(); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.check_representation_exclusive() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  clash record;
BEGIN
  SELECT r.id, r.is_exclusive,
         coalesce(o.name, c.display_name) AS party
    INTO clash
    FROM music.recording_representation r
    LEFT JOIN music.organization o ON o.id = r.organization_id
    LEFT JOIN music.contact c ON c.id = r.contact_id
   WHERE r.recording_id = NEW.recording_id
     AND r.id <> NEW.id
     AND (NEW.is_exclusive OR r.is_exclusive)
     AND daterange(coalesce(r.signed_on, '-infinity'), coalesce(r.ends_on, 'infinity'), '[]')
      && daterange(coalesce(NEW.signed_on, '-infinity'), coalesce(NEW.ends_on, 'infinity'), '[]')
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION '%',
      CASE WHEN clash.is_exclusive
           THEN format('This recording is signed exclusively to %s for overlapping dates.', clash.party)
           ELSE format('An exclusive deal cannot overlap the existing deal with %s.', clash.party)
      END
      USING HINT = 'Give one deal an end date before the other starts, or make both non-exclusive.';
  END IF;

  RETURN NULL;
END;
$$;

--
-- Name: current_account(); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.current_account() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT (nullif(current_setting('request.jwt.claims', true), '')::json->>'account_id')::uuid
$$;

--
-- Name: default_audio_file_type(text); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.default_audio_file_type(p_format text) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT id FROM music.audio_file_type
   WHERE name = CASE WHEN upper(coalesce(p_format, '')) = 'ZIP'
                     THEN 'Stem' ELSE 'Full Mix' END
$$;

--
-- Name: document_storage_kind(); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.document_storage_kind() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.storage_uri IS NOT DISTINCT FROM OLD.storage_uri THEN
    NEW.storage_kind := OLD.storage_kind;
    RETURN NEW;
  END IF;

  IF NEW.storage_uri ~* '^https?://' THEN
    NEW.storage_kind := 'url';
  ELSE
    NEW.storage_kind := coalesce(
      (SELECT s.kind FROM music.account_storage s
        WHERE s.account_id = NEW.account_id),
      NEW.storage_kind);
  END IF;

  RETURN NEW;
END;
$$;

--
-- Name: documents_of(text, text, integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.documents_of(p_table text, p_col text, p_parent integer) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
  out jsonb;
BEGIN
  EXECUTE format($q$
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id', d.id,
             'title', d.title,
             'document_type_id', d.document_type_id,
             'storage_kind', d.storage_kind,
             'storage_uri', d.storage_uri,
             'mime_type', d.mime_type,
             'byte_size', d.byte_size,
             'document_date', d.document_date,
             'signed_on', d.signed_on,
             'expires_on', d.expires_on,
             'notes', d.notes) ORDER BY d.id), '[]'::jsonb)
      FROM music.%I j
      JOIN music.document d ON d.id = j.document_id
     WHERE j.%I = $1 $q$, p_table, p_col)
  INTO out USING p_parent;

  RETURN out;
END;
$_$;

--
-- Name: gtin_valid(text); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.gtin_valid(p text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
  SELECT p ~ '^[0-9]{12,13}$'
     AND (SELECT (10 - sum(substr(p, length(p) - i, 1)::int
                         * CASE WHEN i % 2 = 1 THEN 3 ELSE 1 END) % 10) % 10
            FROM generate_series(1, length(p) - 1) i) = right(p, 1)::int
$_$;

--
-- Name: FUNCTION gtin_valid(p text); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.gtin_valid(p text) IS 'True for a 12-digit UPC or 13-digit EAN whose check digit is correct.';

--
-- Name: merge_contact(integer, integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.merge_contact(p_keep integer, p_drop integer) RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE
  d      music.contact%ROWTYPE;
  fk     record;
  ux     record;
  others text;
BEGIN
  IF p_keep = p_drop THEN
    RAISE EXCEPTION 'Cannot merge a person into themselves (%).', p_keep;
  END IF;
  SELECT * INTO d FROM music.contact WHERE id = p_drop;
  IF NOT FOUND THEN RAISE EXCEPTION 'No person with id %.', p_drop; END IF;
  IF NOT EXISTS (SELECT 1 FROM music.contact WHERE id = p_keep) THEN
    RAISE EXCEPTION 'No person with id %.', p_keep;
  END IF;
  FOR fk IN
    SELECT c.conrelid AS rel, c.conrelid::regclass AS tbl, a.attname AS col, a.attnum
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.confrelid = 'music.contact'::regclass AND c.contype = 'f'
       AND array_length(c.conkey, 1) = 1
  LOOP
    FOR ux IN
      SELECT i.indkey FROM pg_index i
       WHERE i.indrelid = fk.rel AND i.indisunique
         AND i.indexprs IS NULL AND i.indpred IS NULL
         AND fk.attnum = ANY (i.indkey)
    LOOP
      SELECT string_agg(format('k.%1$I IS NOT DISTINCT FROM x.%1$I', att.attname), ' AND ')
        INTO others
        FROM unnest(ux.indkey) AS u(attnum)
        JOIN pg_attribute att ON att.attrelid = fk.rel AND att.attnum = u.attnum
       WHERE u.attnum <> fk.attnum;
      EXECUTE format(
        'DELETE FROM %s x WHERE x.%I = $1 AND EXISTS (SELECT 1 FROM %s k WHERE k.%I = $2%s)',
        fk.tbl, fk.col, fk.tbl, fk.col, coalesce(' AND ' || others, ''))
      USING p_drop, p_keep;
    END LOOP;
    EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', fk.tbl, fk.col, fk.col)
      USING p_keep, p_drop;
  END LOOP;
  UPDATE music.contact SET member_ipi = NULL, isni = NULL WHERE id = p_drop;
  UPDATE music.contact k
     SET member_ipi  = coalesce(k.member_ipi, d.member_ipi),
         isni        = coalesce(k.isni, d.isni),
         pro_code    = coalesce(k.pro_code, d.pro_code),
         credit_name = coalesce(k.credit_name, d.credit_name),
         notes       = CASE WHEN nullif(btrim(d.notes), '') IS NULL OR d.notes = k.notes THEN k.notes
                            ELSE concat_ws(E'\n', k.notes, d.notes) END
   WHERE k.id = p_keep;
  DELETE FROM music.contact WHERE id = p_drop;
END;
$_$;

--
-- Name: FUNCTION merge_contact(p_keep integer, p_drop integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.merge_contact(p_keep integer, p_drop integer) IS 'Merges a duplicate person into the one kept: every reference moves to the
kept record, skipping any that would duplicate one it already has; an IPI,
ISNI, society, or performing name only the duplicate had is carried over;
then the duplicate is deleted.';

--
-- Name: merge_document(integer, integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.merge_document(p_keep integer, p_drop integer) RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE
  d      music.document%ROWTYPE;
  fk     record;
  ux     record;
  others text;
BEGIN
  IF p_keep = p_drop THEN
    RAISE EXCEPTION 'Cannot merge a document into itself (%).', p_keep;
  END IF;
  SELECT * INTO d FROM music.document WHERE id = p_drop;
  IF NOT FOUND THEN RAISE EXCEPTION 'No document with id %.', p_drop; END IF;
  IF NOT EXISTS (SELECT 1 FROM music.document WHERE id = p_keep) THEN
    RAISE EXCEPTION 'No document with id %.', p_keep;
  END IF;
  FOR fk IN
    SELECT c.conrelid AS rel, c.conrelid::regclass AS tbl, a.attname AS col, a.attnum
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
     WHERE c.confrelid = 'music.document'::regclass AND c.contype = 'f'
       AND array_length(c.conkey, 1) = 1
  LOOP
    FOR ux IN
      SELECT i.indkey FROM pg_index i
       WHERE i.indrelid = fk.rel AND i.indisunique
         AND i.indexprs IS NULL AND i.indpred IS NULL
         AND fk.attnum = ANY (i.indkey)
    LOOP
      SELECT string_agg(format('k.%1$I IS NOT DISTINCT FROM x.%1$I', att.attname), ' AND ')
        INTO others
        FROM unnest(ux.indkey) AS u(attnum)
        JOIN pg_attribute att ON att.attrelid = fk.rel AND att.attnum = u.attnum
       WHERE u.attnum <> fk.attnum;
      EXECUTE format(
        'DELETE FROM %s x WHERE x.%I = $1 AND EXISTS (SELECT 1 FROM %s k WHERE k.%I = $2%s)',
        fk.tbl, fk.col, fk.tbl, fk.col, coalesce(' AND ' || others, ''))
      USING p_drop, p_keep;
    END LOOP;
    EXECUTE format('UPDATE %s SET %I = $1 WHERE %I = $2', fk.tbl, fk.col, fk.col)
      USING p_keep, p_drop;
  END LOOP;
  DELETE FROM music.document WHERE id = p_drop;
  UPDATE music.document k
     SET document_type_id = coalesce(k.document_type_id, d.document_type_id),
         external_ref     = coalesce(k.external_ref, d.external_ref),
         mime_type        = coalesce(k.mime_type, d.mime_type),
         byte_size        = coalesce(k.byte_size, d.byte_size),
         sha256           = coalesce(k.sha256, d.sha256),
         document_date    = coalesce(k.document_date, d.document_date),
         signed_on        = coalesce(k.signed_on, d.signed_on),
         expires_on       = coalesce(k.expires_on, d.expires_on),
         notes            = CASE WHEN nullif(btrim(d.notes), '') IS NULL OR d.notes = k.notes THEN k.notes
                                 ELSE concat_ws(E'\n', k.notes, d.notes) END
   WHERE k.id = p_keep;
END;
$_$;

--
-- Name: FUNCTION merge_document(p_keep integer, p_drop integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.merge_document(p_keep integer, p_drop integer) IS 'Merges a duplicate document into the one kept: every attachment moves to it, blank fields are filled from the duplicate, and the duplicate is deleted.';

--
-- Name: own_artist(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_artist(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.artist WHERE id = p_id) $$;

--
-- Name: FUNCTION own_artist(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_artist(p_id integer) IS 'True when the artist row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: own_contact(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_contact(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.contact WHERE id = p_id) $$;

--
-- Name: FUNCTION own_contact(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_contact(p_id integer) IS 'True when the contact row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: own_credit(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_credit(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.recording_credit WHERE id = p_id) $$;

--
-- Name: FUNCTION own_credit(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_credit(p_id integer) IS 'True when the recording_credit row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: own_document(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_document(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.document WHERE id = p_id) $$;

--
-- Name: FUNCTION own_document(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_document(p_id integer) IS 'True when the document row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: own_organization(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_organization(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.organization WHERE id = p_id) $$;

--
-- Name: FUNCTION own_organization(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_organization(p_id integer) IS 'True when the organization row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: own_recording(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_recording(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.recording WHERE id = p_id) $$;

--
-- Name: FUNCTION own_recording(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_recording(p_id integer) IS 'True when the recording row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: own_release(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_release(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.release WHERE id = p_id) $$;

--
-- Name: FUNCTION own_release(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_release(p_id integer) IS 'True when the release row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: own_song(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_song(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.song WHERE id = p_id) $$;

--
-- Name: FUNCTION own_song(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_song(p_id integer) IS 'True when the song row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: own_song_writer(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.own_song_writer(p_id integer) RETURNS boolean
    LANGUAGE sql STABLE PARALLEL SAFE
    AS $$ SELECT EXISTS (SELECT 1 FROM music.song_writer WHERE id = p_id) $$;

--
-- Name: FUNCTION own_song_writer(p_id integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.own_song_writer(p_id integer) IS 'True when the song_writer row is visible to the caller, which row security limits to the signed-in account. False for null.';

--
-- Name: recording_one_stop_reason(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.recording_one_stop_reason(p_recording integer) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT coalesce(
    (SELECT 'No composition linked'
      WHERE NOT EXISTS (SELECT 1 FROM music.recording_song rs
                         WHERE rs.recording_id = p_recording)),
    (SELECT 'No master owners entered'
      WHERE NOT EXISTS (SELECT 1 FROM music.recording_owner o
                         WHERE o.recording_id = p_recording)),
    (SELECT format('Master controlled %s%%, not 100',
                   trim_scale(coalesce(sum(o.share) FILTER (WHERE o.controlled), 0)))
       FROM music.recording_owner o
      WHERE o.recording_id = p_recording
     HAVING count(*) > 0
        AND coalesce(sum(o.share) FILTER (WHERE o.controlled), 0) <> 100),
    (SELECT format('Signed exclusively to %s', coalesce(org.name, c.display_name))
       FROM music.recording_representation d
       LEFT JOIN music.organization org ON org.id = d.organization_id
       LEFT JOIN music.contact c ON c.id = d.contact_id
      WHERE d.recording_id = p_recording AND d.is_exclusive
        AND current_date BETWEEN coalesce(d.signed_on, '-infinity')
                             AND coalesce(d.ends_on, 'infinity')
      LIMIT 1),
    (SELECT format('Publishing on %s controlled %s%%, not 100', s.title,
                   trim_scale(music.song_controlled_share(s.id)))
       FROM music.recording_song rs
       JOIN music.song s ON s.id = rs.song_id
      WHERE rs.recording_id = p_recording
        AND music.song_controlled_share(s.id) <> 100
      ORDER BY s.title LIMIT 1)
  )
$$;

--
-- Name: FUNCTION recording_one_stop_reason(p_recording integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.recording_one_stop_reason(p_recording integer) IS 'Why a recording is not one stop, or NULL when it is. One stop means the
controlled master shares total 100, no exclusive deal is active with anyone
else, and every composition it records has 100 percent controlled publishing.';

--
-- Name: recording_pitch_comment_auto(integer, integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.recording_pitch_comment_auto(p_recording integer, p_limit integer DEFAULT 255) RETURNS text
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
  rec        record;
  who_name   text;
  who_id     integer;
  email      text;
  phone      text;
  has_stems  boolean;
  has_alts   boolean;
  head       text;
  seg_text   text[];
  seg_line   integer[];
  n          integer;
  line2      text;
  line3      text;
  result     text;
BEGIN
  SELECT r.*, vt.name AS vocal_name,
         (SELECT l.name FROM music.recording_song rs
            JOIN music.song s ON s.id = rs.song_id
            JOIN music.language l ON l.code = s.language_code
           WHERE rs.recording_id = r.id ORDER BY rs.song_id LIMIT 1) AS language_name
    INTO rec
    FROM music.recording r
    LEFT JOIN music.vocal_type vt ON vt.id = r.vocal_type_id
   WHERE r.id = p_recording;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT pc.name, pc.contact_id INTO who_name, who_id
    FROM music.recording_pitch_contact(p_recording) pc;

  IF who_id IS NOT NULL THEN
    SELECT e.email INTO email FROM music.contact_email e
     WHERE e.contact_id = who_id AND e.retired_at IS NULL
     ORDER BY e.is_primary DESC, e.id LIMIT 1;
    SELECT '+' || p.country_code || ' ' || p.number INTO phone FROM music.contact_phone p
     WHERE p.contact_id = who_id
     ORDER BY p.is_primary DESC, p.id LIMIT 1;
  END IF;

  SELECT bool_or(t.name = 'Stem'), bool_or(t.name NOT IN ('Stem', 'Full Mix'))
    INTO has_stems, has_alts
    FROM music.audio_file f JOIN music.audio_file_type t ON t.id = f.file_type_id
   WHERE f.recording_id = p_recording;

  head := concat_ws(' ',
    CASE WHEN music.recording_one_stop_reason(p_recording) IS NULL THEN 'ONE-STOP' END,
    who_name,
    CASE WHEN email IS NOT NULL OR phone IS NOT NULL THEN '- ' || concat_ws(' ', email, phone) END,
    CASE WHEN has_stems AND has_alts THEN 'Stems & Alts Available'
         WHEN has_stems THEN 'Stems Available'
         WHEN has_alts THEN 'Alts Available' END);

  seg_text := ARRAY[
    CASE WHEN rec.is_instrumental THEN 'Instrumental'
         WHEN rec.vocal_name IS NOT NULL OR rec.language_name IS NOT NULL
         THEN concat_ws(' ', rec.vocal_name, rec.language_name, 'Vocal') END,
    (SELECT string_agg(m.name, ', ' ORDER BY m.name)
       FROM music.recording_mood rm JOIN music.mood m ON m.id = rm.mood_id
      WHERE rm.recording_id = p_recording),
    CASE WHEN nullif(btrim(rec.tempo), '') IS NULL THEN NULL
         WHEN rec.tempo ILIKE '%tempo%' THEN btrim(rec.tempo)
         ELSE btrim(rec.tempo) || ' tempo' END,
    (SELECT string_agg(g.name, ', ' ORDER BY g.name)
       FROM music.recording_genre rg JOIN music.genre g ON g.id = rg.genre_id
      WHERE rg.recording_id = p_recording),
    CASE WHEN nullif(btrim(rec.sounds_like), '') IS NOT NULL THEN 'RIYL ' || btrim(rec.sounds_like) END
  ];
  seg_line := ARRAY[2, 2, 2, 3, 3];

  FOR n IN REVERSE 5..0 LOOP
    SELECT string_agg(seg_text[i], '. ' ORDER BY i) INTO line2
      FROM generate_series(1, n) i WHERE seg_line[i] = 2 AND seg_text[i] IS NOT NULL;
    SELECT string_agg(seg_text[i], ' ' ORDER BY i) INTO line3
      FROM generate_series(1, n) i WHERE seg_line[i] = 3 AND seg_text[i] IS NOT NULL;
    result := concat_ws(E'\n', nullif(head, ''), line2 || '.', line3);
    IF length(result) <= p_limit THEN
      RETURN nullif(result, '');
    END IF;
  END LOOP;

  RETURN regexp_replace(regexp_replace(left(head, p_limit), '\s+\S*$', ''), '[\s&,;:-]+$', '');
END;
$_$;

--
-- Name: FUNCTION recording_pitch_comment_auto(p_recording integer, p_limit integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.recording_pitch_comment_auto(p_recording integer, p_limit integer) IS 'The comment written into a pitched file, built from the catalog: one stop,
the contact (see music.recording_pitch_contact) and whether stems and alternates exist, then vocals and
language, moods, tempo, genres, and sounds like. Segments are dropped from
the end until it fits the limit; the contact line never is.';

--
-- Name: recording_pitch_contact(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.recording_pitch_contact(p_recording integer) RETURNS TABLE(name text, contact_id integer)
    LANGUAGE sql STABLE
    AS $$
  SELECT x.name, x.contact_id FROM (
    SELECT c.display_name AS name, c.id AS contact_id, 1 AS rank
      FROM music.recording r JOIN music.contact c ON c.id = r.pitch_contact_id
     WHERE r.id = p_recording
    UNION ALL
    SELECT coalesce(o.name, c.display_name), d.contact_id, 2
      FROM music.recording_representation d
      LEFT JOIN music.organization o ON o.id = d.organization_id
      LEFT JOIN music.contact c ON c.id = d.contact_id
     WHERE d.recording_id = p_recording AND d.is_exclusive
       AND current_date BETWEEN coalesce(d.signed_on, '-infinity') AND coalesce(d.ends_on, 'infinity')
    UNION ALL
    SELECT c.display_name, c.id, 3
      FROM music.recording r
      JOIN music.pitch_setting ps ON ps.account_id = r.account_id
      JOIN music.contact c ON c.id = ps.default_contact_id
     WHERE r.id = p_recording
  ) x
  WHERE x.name IS NOT NULL
  ORDER BY x.rank LIMIT 1
$$;

--
-- Name: FUNCTION recording_pitch_contact(p_recording integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.recording_pitch_contact(p_recording integer) IS 'Who a recording''s pitch comment names: its own pitch contact, else an active
exclusive agent, else the account''s default contact. No row means nobody,
which the recording list flags.';

--
-- Name: release_status(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.release_status(p_release integer) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM music.release_distribution d WHERE d.release_id = p_release)
      THEN 'Draft'
    WHEN EXISTS (SELECT 1 FROM music.release_distribution d
                  WHERE d.release_id = p_release AND d.live_on <= current_date
                    AND (d.taken_down_on IS NULL OR d.taken_down_on > current_date))
      THEN 'Live'
    WHEN EXISTS (SELECT 1 FROM music.release_distribution d
                  WHERE d.release_id = p_release AND d.taken_down_on IS NULL
                    AND (d.live_on IS NULL OR d.live_on > current_date))
      THEN 'Submitted'
    ELSE 'Taken down'
  END
$$;

--
-- Name: FUNCTION release_status(p_release integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.release_status(p_release integer) IS 'Draft with no distributions; Live while any distribution is live; Submitted
when one is awaiting its live date; otherwise Taken down.';

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

--
-- Name: song_controlled_share(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.song_controlled_share(p_song integer) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
  SELECT CASE
    WHEN s.public_domain_p THEN 100
    WHEN EXISTS (SELECT 1 FROM music.song_publisher p WHERE p.song_id = s.id)
      THEN coalesce((SELECT sum(p.share) FROM music.song_publisher p
                      WHERE p.song_id = s.id AND p.controlled), 0)
    ELSE coalesce((SELECT sum(w.share) FROM music.song_writer w
                    WHERE w.song_id = s.id AND w.controlled), 0)
  END
  FROM music.song s WHERE s.id = p_song
$$;

--
-- Name: FUNCTION song_controlled_share(p_song integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.song_controlled_share(p_song integer) IS 'Percent of a composition''s publishing you can license: controlled publisher
shares, or controlled writer shares when the song has no publisher. A public
domain work counts as 100.';

--
-- Name: song_one_stop_reason(integer); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.song_one_stop_reason(p_song integer) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT CASE
    WHEN s.public_domain_p THEN NULL
    WHEN NOT EXISTS (SELECT 1 FROM music.song_publisher p WHERE p.song_id = s.id)
     AND NOT EXISTS (SELECT 1 FROM music.song_writer w WHERE w.song_id = s.id)
      THEN 'No writers or publishers entered'
    WHEN music.song_controlled_share(s.id) <> 100
      THEN format('Publishing controlled %s%%, not 100', trim_scale(music.song_controlled_share(s.id)))
  END
  FROM music.song s WHERE s.id = p_song
$$;

--
-- Name: FUNCTION song_one_stop_reason(p_song integer); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.song_one_stop_reason(p_song integer) IS 'Why a composition is not one stop, or NULL when it is: the publishing you
control totals 100, counting controlled publisher shares, or controlled
writer shares when there is no publisher. A public domain work is one stop.';

--
-- Name: song_writer_default_pro(); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.song_writer_default_pro() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.pro_code IS NULL THEN
    SELECT c.pro_code INTO NEW.pro_code
      FROM music.contact c WHERE c.id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$;

--
-- Name: sync_documents(text, text, integer, jsonb); Type: FUNCTION; Schema: music; Owner: -
--

CREATE FUNCTION music.sync_documents(p_table text, p_col text, p_parent integer, p_docs jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $_$
DECLARE
  d     jsonb;
  _doc  integer;
  _uri  text;
  _kind text;
  _keep integer[] := '{}';
BEGIN
  FOR d IN SELECT * FROM jsonb_array_elements(coalesce(p_docs, '[]'::jsonb))
  LOOP
    IF nullif(btrim(coalesce(d->>'title','')), '') IS NULL THEN
      CONTINUE;
    END IF;

    _uri := btrim(coalesce(d->>'storage_uri', ''));

    _kind := CASE
      WHEN _uri ~* '^https?://' THEN 'url'
      ELSE coalesce(nullif(d->>'storage_kind',''), 'url')
    END;

    IF d->>'id' IS NOT NULL THEN
      _doc := (d->>'id')::integer;
      UPDATE music.document
         SET title            = btrim(d->>'title'),
             document_type_id = nullif(d->>'document_type_id','')::integer,
             storage_kind     = _kind,
             storage_uri      = coalesce(nullif(_uri,''), storage_uri),
             mime_type        = nullif(d->>'mime_type',''),
             byte_size        = nullif(d->>'byte_size','')::bigint,
             document_date    = nullif(d->>'document_date','')::date,
             signed_on        = nullif(d->>'signed_on','')::date,
             expires_on       = nullif(d->>'expires_on','')::date,
             notes            = nullif(d->>'notes','')
       WHERE id = _doc;
    ELSE
      _doc := NULL;
      IF _kind IN ('local', 's3') THEN
        SELECT id INTO _doc FROM music.document
         WHERE account_id = music.current_account()
           AND storage_uri = _uri
           AND storage_kind IN ('local', 's3');
      END IF;
      IF _doc IS NULL THEN
        INSERT INTO music.document
          (title, document_type_id, storage_kind, storage_uri,
           mime_type, byte_size, document_date, signed_on, expires_on, notes)
        VALUES (btrim(d->>'title'),
                nullif(d->>'document_type_id','')::integer,
                _kind,
                _uri,
                nullif(d->>'mime_type',''),
                nullif(d->>'byte_size','')::bigint,
                nullif(d->>'document_date','')::date,
                nullif(d->>'signed_on','')::date,
                nullif(d->>'expires_on','')::date,
                nullif(d->>'notes',''))
        RETURNING id INTO _doc;
      ELSE
        UPDATE music.document
           SET document_type_id = coalesce(document_type_id, nullif(d->>'document_type_id','')::integer),
               mime_type        = coalesce(mime_type, nullif(d->>'mime_type','')),
               byte_size        = coalesce(byte_size, nullif(d->>'byte_size','')::bigint),
               document_date    = coalesce(document_date, nullif(d->>'document_date','')::date),
               signed_on        = coalesce(signed_on, nullif(d->>'signed_on','')::date),
               expires_on       = coalesce(expires_on, nullif(d->>'expires_on','')::date),
               notes            = coalesce(notes, nullif(d->>'notes',''))
         WHERE id = _doc;
      END IF;
    END IF;

    _keep := _keep || _doc;

    EXECUTE format(
      'INSERT INTO music.%I (%I, document_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING', p_table, p_col)
      USING p_parent, _doc;
  END LOOP;

  EXECUTE format(
    'DELETE FROM music.%I WHERE %I = $1 AND document_id <> ALL ($2)',
    p_table, p_col)
    USING p_parent, _keep;
END;
$_$;

--
-- Name: FUNCTION sync_documents(p_table text, p_col text, p_parent integer, p_docs jsonb); Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON FUNCTION music.sync_documents(p_table text, p_col text, p_parent integer, p_docs jsonb) IS 'Saves the documents listed on a song, recording, person, company, or release and links them to it. A new row whose file is already a document links that document instead of creating a second one; its blank fields are filled from the row. Rows no longer listed are detached; the document itself survives.';

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_storage; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.account_storage (
    account_id uuid NOT NULL,
    kind text DEFAULT 'local'::text NOT NULL,
    endpoint text,
    region text,
    bucket text,
    base_path text,
    public_base_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    access_key_enc bytea,
    secret_key_enc bytea,
    access_key_id text,
    secret_key text,
    CONSTRAINT account_storage_bucket_trimmed CHECK (((bucket IS NULL) OR (bucket = btrim(bucket)))),
    CONSTRAINT account_storage_kind CHECK ((kind = ANY (ARRAY['local'::text, 's3'::text, 'webdav'::text, 'sftp'::text]))),
    CONSTRAINT account_storage_s3 CHECK (((kind <> 's3'::text) OR (bucket IS NOT NULL)))
);

ALTER TABLE ONLY music.account_storage FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN account_storage.secret_key; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.account_storage.secret_key IS 'Plain text, deliberately. Not exposed through the api schema. Backups
are the realistic exposure, so keep the backup repository encrypted and
scope the S3 key to one bucket.';

--
-- Name: account_storage; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.account_storage WITH (security_invoker='true') AS
 SELECT account_id,
    kind,
    endpoint,
    region,
    bucket,
    base_path,
    public_base_url,
    access_key_id,
    ((secret_key IS NOT NULL) AND (secret_key <> ''::text)) AS key_set,
    notes
   FROM music.account_storage;

--
-- Name: artist; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.artist (
    id integer NOT NULL,
    account_id uuid DEFAULT music.current_account() NOT NULL,
    name text NOT NULL,
    sort_name text,
    kind text DEFAULT 'person'::text NOT NULL,
    isni music.isni_number,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT artist_kind CHECK ((kind = ANY (ARRAY['person'::text, 'group'::text]))),
    CONSTRAINT artist_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

ALTER TABLE ONLY music.artist FORCE ROW LEVEL SECURITY;

--
-- Name: artist_member; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.artist_member (
    artist_id integer NOT NULL,
    contact_id integer NOT NULL,
    begin_date date,
    end_date date,
    notes text,
    CONSTRAINT artist_member_dates CHECK (((end_date IS NULL) OR (begin_date IS NULL) OR (end_date >= begin_date)))
);

ALTER TABLE ONLY music.artist_member FORCE ROW LEVEL SECURITY;

--
-- Name: contact; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.contact (
    id integer NOT NULL,
    account_id uuid DEFAULT music.current_account() NOT NULL,
    first_name text,
    last_name text,
    display_name text GENERATED ALWAYS AS (btrim(((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text)))) STORED,
    sort_name text GENERATED ALWAYS AS (btrim(((COALESCE(last_name, ''::text) || ', '::text) || COALESCE(first_name, ''::text)), ', '::text)) STORED,
    pro_code text,
    member_ipi music.ipi_name_number,
    isni music.isni_number,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    credit_name text,
    CONSTRAINT contact_has_name CHECK ((COALESCE(first_name, last_name) IS NOT NULL))
);

ALTER TABLE ONLY music.contact FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN contact.credit_name; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.contact.credit_name IS 'Name this person performs and is credited under, when it differs from
their legal name. Blank means credit them by their own name. A single
credit can still override it through recording_credit.credited_as.';

--
-- Name: artist; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.artist WITH (security_invoker='true') AS
 SELECT id,
    name,
    sort_name,
    kind,
    isni AS isni_own,
    COALESCE((isni)::text,
        CASE
            WHEN (kind = 'person'::text) THEN (( SELECT c.isni
               FROM (music.artist_member m
                 JOIN music.contact c ON ((c.id = m.contact_id)))
              WHERE ((m.artist_id = a.id) AND (c.isni IS NOT NULL))
             LIMIT 1))::text
            ELSE NULL::text
        END) AS isni,
    ((isni IS NULL) AND (kind = 'person'::text) AND (EXISTS ( SELECT 1
           FROM (music.artist_member m
             JOIN music.contact c ON ((c.id = m.contact_id)))
          WHERE ((m.artist_id = a.id) AND (c.isni IS NOT NULL))))) AS isni_inherited,
    notes,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('contact_id', m.contact_id, 'begin_date', m.begin_date, 'end_date', m.end_date, 'notes', m.notes) ORDER BY m.begin_date NULLS FIRST, m.contact_id) AS jsonb_agg
           FROM music.artist_member m
          WHERE (m.artist_id = a.id)), '[]'::jsonb) AS members,
    ( SELECT count(*) AS count
           FROM music.artist_member m
          WHERE (m.artist_id = a.id)) AS member_count,
    created_at,
    updated_at
   FROM music.artist a;

--
-- Name: artist_member; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.artist_member WITH (security_invoker='true') AS
 SELECT artist_id,
    contact_id,
    begin_date,
    end_date,
    notes
   FROM music.artist_member;

--
-- Name: asset_status; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.asset_status (
    id integer NOT NULL,
    name text NOT NULL,
    CONSTRAINT asset_status_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: asset_status; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.asset_status WITH (security_invoker='true') AS
 SELECT id,
    name
   FROM music.asset_status;

--
-- Name: audio_file_type; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.audio_file_type (
    id integer NOT NULL,
    name text NOT NULL,
    CONSTRAINT audio_file_type_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: audio_file_type; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.audio_file_type WITH (security_invoker='true') AS
 SELECT id,
    name
   FROM music.audio_file_type;

--
-- Name: contact_email; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.contact_email (
    id integer NOT NULL,
    contact_id integer,
    email music.email_address NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    note text,
    retired_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id integer,
    CONSTRAINT contact_email_owner_chk CHECK ((num_nonnulls(contact_id, organization_id) = 1)),
    CONSTRAINT email_trimmed CHECK (((email)::text = btrim((email)::text)))
);

ALTER TABLE ONLY music.contact_email FORCE ROW LEVEL SECURITY;

--
-- Name: contact_organization; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.contact_organization (
    contact_id integer NOT NULL,
    organization_id integer NOT NULL,
    title text,
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY music.contact_organization FORCE ROW LEVEL SECURITY;

--
-- Name: contact_phone; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.contact_phone (
    id integer NOT NULL,
    contact_id integer,
    country_code smallint DEFAULT 1 NOT NULL,
    number text NOT NULL,
    extension text,
    is_primary boolean DEFAULT false NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id integer,
    CONSTRAINT contact_phone_owner_chk CHECK ((num_nonnulls(contact_id, organization_id) = 1)),
    CONSTRAINT phone_cc_range CHECK (((country_code >= 1) AND (country_code <= 999))),
    CONSTRAINT phone_trimmed CHECK (((number = btrim(number)) AND (number <> ''::text)))
);

ALTER TABLE ONLY music.contact_phone FORCE ROW LEVEL SECURITY;

--
-- Name: TABLE contact_phone; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON TABLE music.contact_phone IS 'Deliberately denormalized: one row per contact per number, so a shared line
(company switchboard) is stored once per contact rather than once globally.
Tradeoff accepted for data-entry speed. Consequences: updating a shared number
touches N rows; reverse lookup requires matching free-text formats. The
normalized form would be a phone table plus a contact_phone junction.';

--
-- Name: COLUMN contact_phone.country_code; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.contact_phone.country_code IS 'ITU calling code, not an FK to country. Codes are not 1:1 with countries
(1 covers US/CA/Caribbean, 7 covers RU/KZ). Defaults to 1.';

--
-- Name: COLUMN contact_phone.number; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.contact_phone.number IS 'Free text, deliberately unvalidated beyond non-empty. No E.164 canonicalization.';

--
-- Name: contact; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.contact WITH (security_invoker='true') AS
 SELECT id,
    first_name,
    last_name,
    display_name,
    sort_name,
    credit_name,
    pro_code,
    member_ipi,
    isni,
    notes,
    ( SELECT e.email
           FROM music.contact_email e
          WHERE ((e.contact_id = c.id) AND e.is_primary AND (e.retired_at IS NULL))
         LIMIT 1) AS primary_email,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', e.id, 'email', e.email, 'is_primary', e.is_primary, 'note', e.note) ORDER BY e.is_primary DESC, e.id) AS jsonb_agg
           FROM music.contact_email e
          WHERE (e.contact_id = c.id)), '[]'::jsonb) AS emails,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', p.id, 'country_code', p.country_code, 'number', p.number, 'extension', p.extension, 'is_primary', p.is_primary, 'note', p.note) ORDER BY p.is_primary DESC, p.id) AS jsonb_agg
           FROM music.contact_phone p
          WHERE (p.contact_id = c.id)), '[]'::jsonb) AS phones,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('organization_id', o.organization_id, 'title', o.title, 'is_primary', o.is_primary) ORDER BY o.is_primary DESC, o.organization_id) AS jsonb_agg
           FROM music.contact_organization o
          WHERE (o.contact_id = c.id)), '[]'::jsonb) AS organizations,
    music.documents_of('contact_document'::text, 'contact_id'::text, id) AS documents,
    created_at,
    updated_at
   FROM music.contact c;

--
-- Name: contact_email; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.contact_email WITH (security_invoker='true') AS
 SELECT id,
    contact_id,
    email,
    is_primary,
    note,
    retired_at,
    created_at,
    updated_at
   FROM music.contact_email;

--
-- Name: contact_organization; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.contact_organization WITH (security_invoker='true') AS
 SELECT contact_id,
    organization_id,
    title,
    is_primary,
    notes,
    created_at
   FROM music.contact_organization;

--
-- Name: contact_phone; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.contact_phone WITH (security_invoker='true') AS
 SELECT id,
    contact_id,
    country_code,
    number,
    extension,
    is_primary,
    note,
    created_at,
    updated_at
   FROM music.contact_phone;

--
-- Name: country; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.country (
    code music.iso_3166_alpha2 NOT NULL,
    name text NOT NULL,
    CONSTRAINT country_name_len CHECK ((length(name) <= 128)),
    CONSTRAINT country_name_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: country; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.country WITH (security_invoker='true') AS
 SELECT code,
    name
   FROM music.country;

--
-- Name: contact_document; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.contact_document (
    contact_id integer NOT NULL,
    document_id integer NOT NULL,
    notes text
);

ALTER TABLE ONLY music.contact_document FORCE ROW LEVEL SECURITY;

--
-- Name: document; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.document (
    id integer NOT NULL,
    account_id uuid DEFAULT music.current_account() NOT NULL,
    title text NOT NULL,
    document_type_id integer,
    storage_kind text DEFAULT 'local'::text NOT NULL,
    storage_uri text NOT NULL,
    external_ref text,
    mime_type text,
    byte_size bigint,
    sha256 text,
    document_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    signed_on date,
    expires_on date,
    CONSTRAINT document_dates CHECK (((expires_on IS NULL) OR (signed_on IS NULL) OR (expires_on >= signed_on))),
    CONSTRAINT document_kind CHECK ((storage_kind = ANY (ARRAY['local'::text, 's3'::text, 'paperless'::text, 'url'::text]))),
    CONSTRAINT document_trimmed CHECK (((title = btrim(title)) AND (title <> ''::text)))
);

ALTER TABLE ONLY music.document FORCE ROW LEVEL SECURITY;

--
-- Name: organization_document; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.organization_document (
    organization_id integer NOT NULL,
    document_id integer NOT NULL,
    notes text
);

ALTER TABLE ONLY music.organization_document FORCE ROW LEVEL SECURITY;

--
-- Name: recording_document; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_document (
    recording_id integer NOT NULL,
    document_id integer NOT NULL,
    notes text
);

ALTER TABLE ONLY music.recording_document FORCE ROW LEVEL SECURITY;

--
-- Name: song_document; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.song_document (
    song_id integer NOT NULL,
    document_id integer NOT NULL,
    notes text
);

ALTER TABLE ONLY music.song_document FORCE ROW LEVEL SECURITY;

--
-- Name: document; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.document WITH (security_invoker='true') AS
 SELECT id,
    title,
    document_type_id,
    storage_kind,
    storage_uri,
    external_ref,
    mime_type,
    byte_size,
    sha256,
    document_date,
    signed_on,
    expires_on,
    notes,
    COALESCE(( SELECT array_agg(sd.song_id ORDER BY sd.song_id) AS array_agg
           FROM music.song_document sd
          WHERE (sd.document_id = d.id)), '{}'::integer[]) AS song_ids,
    COALESCE(( SELECT array_agg(rd.recording_id ORDER BY rd.recording_id) AS array_agg
           FROM music.recording_document rd
          WHERE (rd.document_id = d.id)), '{}'::integer[]) AS recording_ids,
    COALESCE(( SELECT array_agg(cd.contact_id ORDER BY cd.contact_id) AS array_agg
           FROM music.contact_document cd
          WHERE (cd.document_id = d.id)), '{}'::integer[]) AS contact_ids,
    COALESCE(( SELECT array_agg(od.organization_id ORDER BY od.organization_id) AS array_agg
           FROM music.organization_document od
          WHERE (od.document_id = d.id)), '{}'::integer[]) AS organization_ids,
    created_at,
    updated_at
   FROM music.document d;

--
-- Name: document_type; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.document_type (
    id integer NOT NULL,
    name text NOT NULL,
    CONSTRAINT document_type_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: document_expiring; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.document_expiring WITH (security_invoker='true') AS
 SELECT d.id,
    d.title,
    d.expires_on,
    t.name AS document_type,
    (d.expires_on - CURRENT_DATE) AS days_left
   FROM (music.document d
     LEFT JOIN music.document_type t ON ((t.id = d.document_type_id)))
  WHERE ((d.expires_on IS NOT NULL) AND (d.expires_on <= (CURRENT_DATE + 90)));

--
-- Name: release_document; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.release_document (
    release_id integer NOT NULL,
    document_id integer NOT NULL
);

ALTER TABLE ONLY music.release_document FORCE ROW LEVEL SECURITY;

--
-- Name: document_orphan; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.document_orphan WITH (security_invoker='true') AS
 SELECT d.id,
    d.title,
    t.name AS document_type,
    d.storage_kind,
    d.storage_uri,
    d.document_date,
    d.created_at
   FROM (music.document d
     LEFT JOIN music.document_type t ON ((t.id = d.document_type_id)))
  WHERE ((NOT (EXISTS ( SELECT 1
           FROM music.song_document x
          WHERE (x.document_id = d.id)))) AND (NOT (EXISTS ( SELECT 1
           FROM music.recording_document x
          WHERE (x.document_id = d.id)))) AND (NOT (EXISTS ( SELECT 1
           FROM music.contact_document x
          WHERE (x.document_id = d.id)))) AND (NOT (EXISTS ( SELECT 1
           FROM music.organization_document x
          WHERE (x.document_id = d.id)))) AND (NOT (EXISTS ( SELECT 1
           FROM music.release_document x
          WHERE (x.document_id = d.id)))));

--
-- Name: document_type; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.document_type WITH (security_invoker='true') AS
 SELECT id,
    name
   FROM music.document_type;

--
-- Name: document_usage; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.document_usage WITH (security_invoker='true') AS
 SELECT id AS document_id,
    ( SELECT count(*) AS count
           FROM music.song_document x
          WHERE (x.document_id = d.id)) AS song_count,
    ( SELECT count(*) AS count
           FROM music.recording_document x
          WHERE (x.document_id = d.id)) AS recording_count,
    ( SELECT count(*) AS count
           FROM music.contact_document x
          WHERE (x.document_id = d.id)) AS contact_count,
    ( SELECT count(*) AS count
           FROM music.organization_document x
          WHERE (x.document_id = d.id)) AS organization_count
   FROM music.document d;

--
-- Name: email_duplicate; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.email_duplicate WITH (security_invoker='true') AS
 SELECT lower((email)::text) AS email,
    count(*) AS contact_count,
    array_agg(contact_id ORDER BY contact_id) AS contact_ids
   FROM music.contact_email e
  WHERE (retired_at IS NULL)
  GROUP BY (lower((email)::text))
 HAVING (count(*) > 1);

--
-- Name: genre; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.genre (
    id integer NOT NULL,
    name text NOT NULL,
    parent_id integer,
    schema_class_id integer,
    mo_term text,
    CONSTRAINT genre_no_self CHECK (((parent_id IS NULL) OR (parent_id <> id))),
    CONSTRAINT genre_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: genre; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.genre WITH (security_invoker='true') AS
 SELECT id,
    name,
    parent_id,
    schema_class_id,
    mo_term
   FROM music.genre;

--
-- Name: instrument; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.instrument (
    id integer NOT NULL,
    name text NOT NULL,
    ddex_code text,
    CONSTRAINT instrument_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: COLUMN instrument.ddex_code; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.instrument.ddex_code IS 'DDEX InstrumentType value (allowed value sets version 011). UserDefined when
DDEX has no value, in which case exports carry the instrument''s own name.';

--
-- Name: instrument; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.instrument WITH (security_invoker='true') AS
 SELECT id,
    name
   FROM music.instrument;

--
-- Name: key_signature; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.key_signature (
    name text NOT NULL,
    tonic text NOT NULL,
    mode text NOT NULL,
    accidentals smallint NOT NULL,
    CONSTRAINT key_sig_mode CHECK ((mode = ANY (ARRAY['major'::text, 'minor'::text]))),
    CONSTRAINT key_sig_range CHECK (((accidentals >= '-7'::integer) AND (accidentals <= 7))),
    CONSTRAINT key_sig_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: key_signature; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.key_signature WITH (security_invoker='true') AS
 SELECT name,
    tonic,
    mode,
    accidentals
   FROM music.key_signature;

--
-- Name: language; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.language (
    code music.iso_639_code NOT NULL,
    name text NOT NULL,
    iso_name text,
    CONSTRAINT language_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: language; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.language WITH (security_invoker='true') AS
 SELECT code,
    name,
    iso_name
   FROM music.language;

--
-- Name: mood; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.mood (
    id integer NOT NULL,
    name text NOT NULL,
    CONSTRAINT mood_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: mood; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.mood WITH (security_invoker='true') AS
 SELECT id,
    name
   FROM music.mood;

--
-- Name: organization; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.organization (
    id integer NOT NULL,
    account_id uuid DEFAULT music.current_account() NOT NULL,
    name text NOT NULL,
    pro_code text,
    member_ipi music.ipi_name_number,
    isni music.isni_number,
    country music.iso_3166_alpha2,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

ALTER TABLE ONLY music.organization FORCE ROW LEVEL SECURITY;

--
-- Name: organization; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.organization WITH (security_invoker='true') AS
 SELECT id,
    name,
    pro_code,
    member_ipi,
    isni,
    country,
    notes,
    music.documents_of('organization_document'::text, 'organization_id'::text, id) AS documents,
    created_at,
    updated_at
   FROM music.organization o;

--
-- Name: pitch_setting; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.pitch_setting (
    account_id uuid DEFAULT music.current_account() NOT NULL,
    default_contact_id integer
);

ALTER TABLE ONLY music.pitch_setting FORCE ROW LEVEL SECURITY;

--
-- Name: TABLE pitch_setting; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON TABLE music.pitch_setting IS 'Per-account pitching defaults. default_contact_id is the person named in a
pitch comment when a recording has no pitch contact of its own.';

--
-- Name: pitch_setting; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.pitch_setting WITH (security_invoker='true') AS
 SELECT account_id AS id,
    default_contact_id
   FROM music.pitch_setting
  WHERE (account_id = music.current_account());

--
-- Name: pro; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.pro (
    code text NOT NULL,
    name text NOT NULL,
    cisac_code music.cisac_society_code,
    home_country music.iso_3166_alpha2 NOT NULL,
    CONSTRAINT pro_name_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: pro; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.pro WITH (security_invoker='true') AS
 SELECT p.code,
    p.name,
    p.cisac_code,
    p.home_country,
    c.name AS home_country_name
   FROM (music.pro p
     JOIN music.country c ON (((c.code)::text = (p.home_country)::text)));

--
-- Name: pro_territory; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.pro_territory (
    pro_code text NOT NULL,
    country_code music.iso_3166_alpha2 NOT NULL
);

--
-- Name: pro_territory; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.pro_territory WITH (security_invoker='true') AS
 SELECT pro_code,
    country_code
   FROM music.pro_territory;

--
-- Name: audio_file; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.audio_file (
    id integer NOT NULL,
    recording_id integer NOT NULL,
    title text,
    storage_kind text DEFAULT 'local'::text NOT NULL,
    storage_uri text NOT NULL,
    format text,
    is_lossless boolean,
    sample_rate integer,
    bit_depth smallint,
    bit_rate_kbps integer,
    channels smallint,
    duration_ms integer,
    byte_size bigint,
    sha256 text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    file_type_id integer NOT NULL,
    CONSTRAINT audio_channels CHECK (((channels IS NULL) OR ((channels >= 1) AND (channels <= 32)))),
    CONSTRAINT audio_kind CHECK ((storage_kind = ANY (ARRAY['local'::text, 's3'::text, 'url'::text])))
);

ALTER TABLE ONLY music.audio_file FORCE ROW LEVEL SECURITY;

--
-- Name: recording; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording (
    id integer NOT NULL,
    account_id uuid DEFAULT music.current_account() NOT NULL,
    title text NOT NULL,
    version_label text,
    isrc music.isrc,
    duration_ms integer,
    bpm numeric(6,2),
    tempo text,
    key_signature text,
    is_instrumental boolean DEFAULT false NOT NULL,
    recorded_country music.iso_3166_alpha2,
    p_line_year smallint,
    description text,
    keywords text,
    sounds_like text,
    notes text,
    status_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_cover boolean DEFAULT false NOT NULL,
    copyright_number text,
    copyright_date date,
    reversion_date date,
    reversion_lead integer,
    commissioned_country music.iso_3166_alpha2,
    easy_clear boolean DEFAULT false NOT NULL,
    vocal_type_id integer,
    pitch_comment text,
    pitch_contact_id integer,
    parental_warning text,
    CONSTRAINT recording_bpm CHECK (((bpm IS NULL) OR ((bpm >= (20)::numeric) AND (bpm <= (400)::numeric)))),
    CONSTRAINT recording_duration CHECK (((duration_ms IS NULL) OR (duration_ms > 0))),
    CONSTRAINT recording_parental_warning CHECK ((parental_warning = ANY (ARRAY['Explicit'::text, 'NotExplicit'::text, 'ExplicitContentEdited'::text]))),
    CONSTRAINT recording_pyear CHECK (((p_line_year IS NULL) OR ((p_line_year >= 1900) AND (p_line_year <= 2200)))),
    CONSTRAINT recording_reversion_lead CHECK (((reversion_lead IS NULL) OR (reversion_lead >= 0))),
    CONSTRAINT recording_trimmed CHECK (((title = btrim(title)) AND (title <> ''::text)))
);

ALTER TABLE ONLY music.recording FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN recording.recorded_country; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.recorded_country IS 'Where the recording was principally made. Collecting societies such as PPL
ask for it, alongside the country of commissioning, to decide whether a
recording qualifies for performance income in their territory.';

--
-- Name: COLUMN recording.copyright_number; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.copyright_number IS 'Registration number for the sound recording, such as a US Copyright Office
SR number. Separate from the composition''s registration.';

--
-- Name: COLUMN recording.reversion_lead; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.reversion_lead IS 'Years of notice before the reversion date, for a reminder.';

--
-- Name: COLUMN recording.commissioned_country; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.commissioned_country IS 'Where the original owner of the recording was principally based when it was
made: usually the label''s country, or the artist''s own when self-released,
wherever the tracks were cut. Required by PPL and used by other societies to
decide which recordings qualify for performance income.';

--
-- Name: COLUMN recording.easy_clear; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.easy_clear IS 'Set by hand: this recording can be cleared quickly for sync. Separate from
one stop, which is computed from the controlled shares and signed deals.';

--
-- Name: COLUMN recording.vocal_type_id; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.vocal_type_id IS 'Who sings lead: female, male, mixed, or a group. Blank for an instrumental,
which is recorded by is_instrumental.';

--
-- Name: COLUMN recording.pitch_comment; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.pitch_comment IS 'Hand-written pitch comment, used instead of the generated one when set.';

--
-- Name: COLUMN recording.pitch_contact_id; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.pitch_contact_id IS 'The person named, with email and phone, in this recording''s pitch comment.';

--
-- Name: COLUMN recording.parental_warning; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording.parental_warning IS 'DDEX ParentalWarningType: Explicit, NotExplicit, or ExplicitContentEdited.';

--
-- Name: recording_artist; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_artist (
    recording_id integer NOT NULL,
    artist_id integer NOT NULL,
    role text DEFAULT 'main'::text NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    CONSTRAINT recording_artist_role CHECK ((role = ANY (ARRAY['main'::text, 'featured'::text])))
);

ALTER TABLE ONLY music.recording_artist FORCE ROW LEVEL SECURITY;

--
-- Name: recording_credit; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_credit (
    id integer NOT NULL,
    recording_id integer NOT NULL,
    contact_id integer,
    organization_id integer,
    share numeric(7,4),
    notes text,
    credited_as text,
    featured_share numeric(7,4),
    CONSTRAINT recording_credit_featured_share CHECK (((featured_share IS NULL) OR ((featured_share >= (0)::numeric) AND (featured_share <= (100)::numeric)))),
    CONSTRAINT recording_credit_party CHECK ((num_nonnulls(contact_id, organization_id) = 1)),
    CONSTRAINT recording_credit_share CHECK (((share IS NULL) OR ((share >= (0)::numeric) AND (share <= (100)::numeric))))
);

ALTER TABLE ONLY music.recording_credit FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN recording_credit.share; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording_credit.share IS 'Points in lieu of pay: a percent of the master''s income agreed with this
contributor. Unrelated to featured_share.';

--
-- Name: COLUMN recording_credit.credited_as; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording_credit.credited_as IS 'Name shown in credits when it differs from the contact, e.g. a session
player crediting under a pseudonym for contractual reasons. Blank means
credit the contact by their own name.';

--
-- Name: COLUMN recording_credit.featured_share; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording_credit.featured_share IS 'This performer''s percent of the featured-artist royalty on this recording,
as registered with SoundExchange (its "Effective %"). Blank for hired
players, which is what makes them non-featured. Set per recording because
lineups and splits change from one project to the next.';

--
-- Name: recording_credit_instrument; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_credit_instrument (
    credit_id integer NOT NULL,
    instrument_id integer NOT NULL
);

ALTER TABLE ONLY music.recording_credit_instrument FORCE ROW LEVEL SECURITY;

--
-- Name: recording_credit_role; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_credit_role (
    credit_id integer NOT NULL,
    role_id integer NOT NULL
);

ALTER TABLE ONLY music.recording_credit_role FORCE ROW LEVEL SECURITY;

--
-- Name: recording_genre; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_genre (
    recording_id integer NOT NULL,
    genre_id integer NOT NULL
);

ALTER TABLE ONLY music.recording_genre FORCE ROW LEVEL SECURITY;

--
-- Name: recording_mood; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_mood (
    recording_id integer NOT NULL,
    mood_id integer NOT NULL
);

ALTER TABLE ONLY music.recording_mood FORCE ROW LEVEL SECURITY;

--
-- Name: recording_owner; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_owner (
    id integer NOT NULL,
    recording_id integer NOT NULL,
    contact_id integer,
    organization_id integer,
    share numeric(7,4),
    controlled boolean DEFAULT false NOT NULL,
    CONSTRAINT recording_owner_party CHECK ((num_nonnulls(contact_id, organization_id) = 1)),
    CONSTRAINT recording_owner_share CHECK (((share IS NULL) OR ((share >= (0)::numeric) AND (share <= (100)::numeric))))
);

ALTER TABLE ONLY music.recording_owner FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN recording_owner.controlled; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording_owner.controlled IS 'True when you can license this share of the master, whether by owning it or
by agreement, such as a collaboration agreement that lets any owner grant
non-exclusive licenses on behalf of all.';

--
-- Name: recording_representation; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_representation (
    id integer NOT NULL,
    recording_id integer NOT NULL,
    contact_id integer,
    organization_id integer,
    is_exclusive boolean DEFAULT false NOT NULL,
    signed_on date,
    ends_on date,
    agent_share numeric(7,4),
    document_id integer,
    notes text,
    CONSTRAINT recording_representation_party CHECK ((num_nonnulls(contact_id, organization_id) = 1)),
    CONSTRAINT recording_representation_share CHECK (((agent_share IS NULL) OR ((agent_share >= (0)::numeric) AND (agent_share <= (100)::numeric)))),
    CONSTRAINT recording_representation_term CHECK (((ends_on IS NULL) OR (signed_on IS NULL) OR (ends_on >= signed_on)))
);

ALTER TABLE ONLY music.recording_representation FORCE ROW LEVEL SECURITY;

--
-- Name: TABLE recording_representation; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON TABLE music.recording_representation IS 'A publisher or sync agent holding rights to license the master. Any number
of non-exclusive deals may run at once; an exclusive deal excludes every
other deal on the same recording for overlapping dates.';

--
-- Name: COLUMN recording_representation.ends_on; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording_representation.ends_on IS 'Blank for a term with no end.';

--
-- Name: COLUMN recording_representation.agent_share; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.recording_representation.agent_share IS 'Percent of the master-side sync fee the agent keeps.';

--
-- Name: recording_song; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.recording_song (
    recording_id integer NOT NULL,
    song_id integer NOT NULL
);

ALTER TABLE ONLY music.recording_song FORCE ROW LEVEL SECURITY;

--
-- Name: recording; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.recording WITH (security_invoker='true') AS
 SELECT id,
    title,
    version_label,
    isrc,
    duration_ms,
    bpm,
    tempo,
    key_signature,
    is_instrumental,
    is_cover,
    easy_clear,
    vocal_type_id,
    parental_warning,
    pitch_contact_id,
    pitch_comment,
    music.recording_pitch_comment_auto(id) AS pitch_comment_auto,
    ( SELECT pc.name
           FROM music.recording_pitch_contact(r.id) pc(name, contact_id)) AS pitch_contact_used,
    (EXISTS ( SELECT 1
           FROM music.recording_pitch_contact(r.id) recording_pitch_contact(name, contact_id))) AS has_pitch_contact,
    recorded_country,
    commissioned_country,
    p_line_year,
    copyright_number,
    copyright_date,
    reversion_date,
    reversion_lead,
    description,
    keywords,
    sounds_like,
    notes,
    status_id,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('artist_id', ra.artist_id, 'role', ra.role, 'sequence', ra.sequence) ORDER BY ra.role, ra.sequence, ra.artist_id) AS jsonb_agg
           FROM music.recording_artist ra
          WHERE (ra.recording_id = r.id)), '[]'::jsonb) AS artists,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', o.id, 'contact_id', o.contact_id, 'organization_id', o.organization_id, 'share', o.share, 'controlled', o.controlled) ORDER BY o.id) AS jsonb_agg
           FROM music.recording_owner o
          WHERE (o.recording_id = r.id)), '[]'::jsonb) AS owners,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', d.id, 'contact_id', d.contact_id, 'organization_id', d.organization_id, 'is_exclusive', d.is_exclusive, 'signed_on', d.signed_on, 'ends_on', d.ends_on, 'agent_share', d.agent_share, 'document_id', d.document_id, 'notes', d.notes) ORDER BY d.signed_on, d.id) AS jsonb_agg
           FROM music.recording_representation d
          WHERE (d.recording_id = r.id)), '[]'::jsonb) AS representations,
    COALESCE(( SELECT sum(o.share) AS sum
           FROM music.recording_owner o
          WHERE (o.recording_id = r.id)), (0)::numeric) AS owner_total,
    ( SELECT NULLIF(btrim((('℗ '::text || COALESCE(((r.p_line_year)::text || ' '::text), ''::text)) || string_agg(COALESCE(ct.display_name, org.name), ', '::text ORDER BY o.share DESC NULLS LAST, o.id))), '℗'::text) AS "nullif"
           FROM ((music.recording_owner o
             LEFT JOIN music.contact ct ON ((ct.id = o.contact_id)))
             LEFT JOIN music.organization org ON ((org.id = o.organization_id)))
          WHERE (o.recording_id = r.id)) AS p_line,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('song_id', rs.song_id) ORDER BY rs.song_id) AS jsonb_agg
           FROM music.recording_song rs
          WHERE (rs.recording_id = r.id)), '[]'::jsonb) AS songs,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', c.id, 'contact_id', c.contact_id, 'organization_id', c.organization_id, 'credited_as', c.credited_as, 'role_ids', COALESCE(( SELECT array_agg(cr.role_id ORDER BY cr.role_id) AS array_agg
                   FROM music.recording_credit_role cr
                  WHERE (cr.credit_id = c.id)), '{}'::integer[]), 'instrument_ids', COALESCE(( SELECT array_agg(ci.instrument_id ORDER BY ci.instrument_id) AS array_agg
                   FROM music.recording_credit_instrument ci
                  WHERE (ci.credit_id = c.id)), '{}'::integer[]), 'share', c.share, 'featured_share', c.featured_share, 'notes', c.notes) ORDER BY c.id) AS jsonb_agg
           FROM music.recording_credit c
          WHERE (c.recording_id = r.id)), '[]'::jsonb) AS credits,
    ( SELECT sum(c.featured_share) AS sum
           FROM music.recording_credit c
          WHERE (c.recording_id = r.id)) AS featured_total,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', f.id, 'title', f.title, 'file_type_id', f.file_type_id, 'storage_kind', f.storage_kind, 'storage_uri', f.storage_uri, 'format', f.format, 'is_lossless', f.is_lossless, 'sample_rate', f.sample_rate, 'bit_depth', f.bit_depth, 'bit_rate_kbps', f.bit_rate_kbps, 'channels', f.channels, 'duration_ms', f.duration_ms, 'notes', f.notes) ORDER BY f.id) AS jsonb_agg
           FROM music.audio_file f
          WHERE (f.recording_id = r.id)), '[]'::jsonb) AS audio_files,
    COALESCE(( SELECT array_agg(g.genre_id ORDER BY g.genre_id) AS array_agg
           FROM music.recording_genre g
          WHERE (g.recording_id = r.id)), '{}'::integer[]) AS genre_ids,
    COALESCE(( SELECT array_agg(m.mood_id ORDER BY m.mood_id) AS array_agg
           FROM music.recording_mood m
          WHERE (m.recording_id = r.id)), '{}'::integer[]) AS mood_ids,
    music.documents_of('recording_document'::text, 'recording_id'::text, id) AS documents,
        CASE
            WHEN (duration_ms IS NULL) THEN NULL::text
            ELSE to_char((((duration_ms / 1000))::double precision * '00:00:01'::interval), 'MI:SS'::text)
        END AS duration_display,
    (music.recording_one_stop_reason(id) IS NULL) AS one_stop,
    music.recording_one_stop_reason(id) AS one_stop_reason,
    created_at,
    updated_at
   FROM music.recording r;

--
-- Name: song; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.song (
    id integer NOT NULL,
    account_id uuid DEFAULT music.current_account() NOT NULL,
    title text NOT NULL,
    iswc music.iswc,
    lyrics text,
    notes text,
    public_domain_p boolean DEFAULT false NOT NULL,
    derived_from_id integer,
    derivation_type text,
    copyright_date date,
    copyright_number text,
    reversion_date date,
    reversion_lead smallint,
    language_code music.iso_639_code,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    based_on text,
    easy_clear boolean DEFAULT false NOT NULL,
    CONSTRAINT song_derivation CHECK (((derivation_type IS NULL) OR (derivation_type = ANY (ARRAY['arrangement'::text, 'translation'::text, 'adaptation'::text, 'sample'::text])))),
    CONSTRAINT song_derivation_pair CHECK ((((derived_from_id IS NULL) = (derivation_type IS NULL)) OR (derived_from_id IS NULL))),
    CONSTRAINT song_no_self CHECK (((derived_from_id IS NULL) OR (derived_from_id <> id))),
    CONSTRAINT song_reversion_lead CHECK (((reversion_lead IS NULL) OR ((reversion_lead >= 0) AND (reversion_lead <= 20)))),
    CONSTRAINT song_title_trimmed CHECK (((title = btrim(title)) AND (title <> ''::text)))
);

ALTER TABLE ONLY music.song FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN song.based_on; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.song.based_on IS 'Source work not in this catalog: a public domain tune, or something whose
composition row does not exist here. Free text. Use derived_from_id instead
when the source is a real row.';

--
-- Name: COLUMN song.easy_clear; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.song.easy_clear IS 'Set by hand: this work can be cleared quickly for sync. Separate from one
stop, which is computed from the controlled shares.';

--
-- Name: song_writer; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.song_writer (
    id integer NOT NULL,
    song_id integer NOT NULL,
    contact_id integer NOT NULL,
    role_id integer NOT NULL,
    share numeric(7,4) DEFAULT 0 NOT NULL,
    controlled boolean DEFAULT false NOT NULL,
    notes text,
    pro_code text,
    CONSTRAINT song_writer_share CHECK (((share >= (0)::numeric) AND (share <= (100)::numeric)))
);

ALTER TABLE ONLY music.song_writer FORCE ROW LEVEL SECURITY;

--
-- Name: recording_cover; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.recording_cover WITH (security_invoker='true') AS
 SELECT r.id,
    r.title,
    r.version_label,
    r.isrc,
    s.title AS composition,
    ( SELECT string_agg(c.display_name, ', '::text ORDER BY c.display_name) AS string_agg
           FROM (music.song_writer w
             JOIN music.contact c ON ((c.id = w.contact_id)))
          WHERE (w.song_id = s.id)) AS writers
   FROM ((music.recording r
     JOIN music.recording_song rs ON ((rs.recording_id = r.id)))
     JOIN music.song s ON ((s.id = rs.song_id)))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM music.song_writer w
          WHERE ((w.song_id = s.id) AND w.controlled))));

--
-- Name: role; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.role (
    id integer NOT NULL,
    name text NOT NULL,
    role_group_id integer NOT NULL,
    description text,
    ddex_code text,
    credit_role boolean DEFAULT false NOT NULL,
    CONSTRAINT role_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: COLUMN role.ddex_code; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.role.ddex_code IS 'DDEX value for the role (allowed value sets version 011). Blank for business
roles, such as attorney or sync agent, that never appear in a DDEX message.';

--
-- Name: COLUMN role.credit_role; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.role.credit_role IS 'Offered in the Roles picker on a recording''s credits: performer and studio
roles, not publishing, ownership, or business relationships.';

--
-- Name: recording_credit_display; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.recording_credit_display WITH (security_invoker='true') AS
 SELECT c.id,
    c.recording_id,
    r.title AS recording_title,
    c.contact_id,
    c.organization_id,
    COALESCE(c.credited_as, ct.credit_name, ct.display_name, o.name) AS credited_name,
    ct.display_name AS legal_name,
    ( SELECT string_agg(ro.name, ', '::text ORDER BY ro.name) AS string_agg
           FROM (music.recording_credit_role cr
             JOIN music.role ro ON ((ro.id = cr.role_id)))
          WHERE (cr.credit_id = c.id)) AS roles,
    ( SELECT string_agg(i.name, ', '::text ORDER BY i.name) AS string_agg
           FROM (music.recording_credit_instrument ci
             JOIN music.instrument i ON ((i.id = ci.instrument_id)))
          WHERE (ci.credit_id = c.id)) AS instruments
   FROM (((music.recording_credit c
     JOIN music.recording r ON ((r.id = c.recording_id)))
     LEFT JOIN music.contact ct ON ((ct.id = c.contact_id)))
     LEFT JOIN music.organization o ON ((o.id = c.organization_id)));

--
-- Name: recording_role; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.recording_role WITH (security_invoker='true') AS
 SELECT id,
    name
   FROM music.role
  WHERE credit_role;

--
-- Name: release; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.release (
    id integer NOT NULL,
    account_id uuid DEFAULT music.current_account() NOT NULL,
    title text NOT NULL,
    release_type text DEFAULT 'Single'::text NOT NULL,
    upc text,
    catalog_number text,
    label_id integer,
    release_date date,
    c_line_year integer,
    primary_genre_id integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    c_line_contact_id integer,
    c_line_organization_id integer,
    CONSTRAINT release_c_line_one_owner CHECK ((num_nonnulls(c_line_contact_id, c_line_organization_id) <= 1)),
    CONSTRAINT release_c_line_year CHECK (((c_line_year IS NULL) OR ((c_line_year >= 1900) AND (c_line_year <= 2200)))),
    CONSTRAINT release_title_trimmed CHECK (((title = btrim(title)) AND (title <> ''::text))),
    CONSTRAINT release_type_ddex CHECK ((release_type = ANY (ARRAY['Single'::text, 'EP'::text, 'Album'::text]))),
    CONSTRAINT release_upc_valid CHECK (((upc IS NULL) OR music.gtin_valid(upc)))
);

ALTER TABLE ONLY music.release FORCE ROW LEVEL SECURITY;

--
-- Name: TABLE release; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON TABLE music.release IS 'A product delivered to stores: a single, EP, or album, identified by its UPC.';

--
-- Name: COLUMN release.release_type; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.release.release_type IS 'DDEX ReleaseType: Single, EP, or Album.';

--
-- Name: COLUMN release.upc; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.release.upc IS 'The release''s own UPC or EAN, kept when it moves between distributors.';

--
-- Name: COLUMN release.c_line_contact_id; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.release.c_line_contact_id IS 'Person named in the C line, the copyright in the artwork and packaging.';

--
-- Name: COLUMN release.c_line_organization_id; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.release.c_line_organization_id IS 'Company named in the C line, when a company rather than a person owns it.';

--
-- Name: release_artist; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.release_artist (
    release_id integer NOT NULL,
    artist_id integer NOT NULL,
    role text DEFAULT 'main'::text NOT NULL,
    sequence smallint DEFAULT 1 NOT NULL,
    CONSTRAINT release_artist_role CHECK ((role = ANY (ARRAY['main'::text, 'featured'::text])))
);

ALTER TABLE ONLY music.release_artist FORCE ROW LEVEL SECURITY;

--
-- Name: release_distribution; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.release_distribution (
    id integer NOT NULL,
    release_id integer NOT NULL,
    distributor_id integer NOT NULL,
    distributor_release_id text,
    upc text,
    submitted_on date,
    live_on date,
    taken_down_on date,
    notes text,
    CONSTRAINT release_distribution_term CHECK (((taken_down_on IS NULL) OR (live_on IS NULL) OR (taken_down_on >= live_on))),
    CONSTRAINT release_distribution_upc_valid CHECK (((upc IS NULL) OR music.gtin_valid(upc)))
);

ALTER TABLE ONLY music.release_distribution FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN release_distribution.upc; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.release_distribution.upc IS 'A UPC this distributor issued itself, when it differs from the release''s own.';

--
-- Name: release_track; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.release_track (
    id integer NOT NULL,
    release_id integer NOT NULL,
    recording_id integer NOT NULL,
    disc_number smallint DEFAULT 1 NOT NULL,
    track_number smallint NOT NULL,
    CONSTRAINT release_track_numbers CHECK (((disc_number >= 1) AND (track_number >= 1)))
);

ALTER TABLE ONLY music.release_track FORCE ROW LEVEL SECURITY;

--
-- Name: COLUMN release_track.track_number; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON COLUMN music.release_track.track_number IS 'Position within its disc, assigned from the order of the track list on save.';

--
-- Name: release; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.release WITH (security_invoker='true') AS
 SELECT id,
    title,
    release_type,
    upc,
    catalog_number,
    label_id,
    release_date,
    c_line_year,
    c_line_contact_id,
    c_line_organization_id,
    primary_genre_id,
    notes,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('artist_id', a.artist_id, 'role', a.role, 'sequence', a.sequence) ORDER BY a.role, a.sequence, a.artist_id) AS jsonb_agg
           FROM music.release_artist a
          WHERE (a.release_id = r.id)), '[]'::jsonb) AS artists,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('recording_id', t.recording_id, 'disc_number', t.disc_number, 'track_number', t.track_number) ORDER BY t.disc_number, t.track_number) AS jsonb_agg
           FROM music.release_track t
          WHERE (t.release_id = r.id)), '[]'::jsonb) AS tracks,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', d.id, 'distributor_id', d.distributor_id, 'distributor_release_id', d.distributor_release_id, 'upc', d.upc, 'submitted_on', d.submitted_on, 'live_on', d.live_on, 'taken_down_on', d.taken_down_on, 'notes', d.notes) ORDER BY d.live_on, d.id) AS jsonb_agg
           FROM music.release_distribution d
          WHERE (d.release_id = r.id)), '[]'::jsonb) AS distributions,
    music.documents_of('release_document'::text, 'release_id'::text, id) AS documents,
    music.release_status(id) AS status,
    ( SELECT count(*) AS count
           FROM music.release_track t
          WHERE (t.release_id = r.id)) AS track_count,
    ( SELECT
                CASE
                    WHEN (sum(rec.duration_ms) IS NULL) THEN NULL::text
                    ELSE to_char((((sum(rec.duration_ms) / 1000))::double precision * '00:00:01'::interval),
                    CASE
                        WHEN (sum(rec.duration_ms) >= 3600000) THEN 'HH24:MI:SS'::text
                        ELSE 'MI:SS'::text
                    END)
                END AS to_char
           FROM (music.release_track t
             JOIN music.recording rec ON ((rec.id = t.recording_id)))
          WHERE (t.release_id = r.id)) AS duration_display,
    ( SELECT
                CASE
                    WHEN ((r.c_line_year IS NOT NULL) OR (COALESCE(o.name, c.display_name) IS NOT NULL)) THEN btrim((('© '::text || COALESCE(((r.c_line_year)::text || ' '::text), ''::text)) || COALESCE(o.name, c.display_name, ''::text)))
                    ELSE NULL::text
                END AS "case"
           FROM ((( SELECT 1 AS "?column?") x
             LEFT JOIN music.organization o ON ((o.id = r.c_line_organization_id)))
             LEFT JOIN music.contact c ON ((c.id = r.c_line_contact_id)))) AS c_line,
    created_at,
    updated_at
   FROM music.release r;

--
-- Name: role_group; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.role_group (
    id integer NOT NULL,
    name text NOT NULL,
    purpose text,
    sort_order smallint DEFAULT 0 NOT NULL,
    CONSTRAINT role_group_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: role; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.role WITH (security_invoker='true') AS
 SELECT r.id,
    r.name,
    r.role_group_id,
    r.description,
    g.name AS role_group_name
   FROM (music.role r
     JOIN music.role_group g ON ((g.id = r.role_group_id)));

--
-- Name: role_group; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.role_group WITH (security_invoker='true') AS
 SELECT id,
    name,
    purpose,
    sort_order
   FROM music.role_group;

--
-- Name: schema_type; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.schema_type (
    id integer NOT NULL,
    class_name text NOT NULL,
    vocabulary text NOT NULL,
    CONSTRAINT schema_type_class_form CHECK ((class_name ~ '^[A-Za-z][A-Za-z0-9_]*$'::text))
);

--
-- Name: vocabulary; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.vocabulary (
    prefix text NOT NULL,
    name text NOT NULL,
    base_uri text NOT NULL,
    CONSTRAINT vocabulary_base_form CHECK ((base_uri ~ '^https?://.*[/#]$'::text)),
    CONSTRAINT vocabulary_prefix_form CHECK ((prefix ~ '^[a-z][a-z0-9]*$'::text))
);

--
-- Name: schema_type; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.schema_type WITH (security_invoker='true') AS
 SELECT s.id,
    s.class_name,
    s.vocabulary,
    (v.base_uri || s.class_name) AS uri,
    ((s.vocabulary || ':'::text) || s.class_name) AS curie
   FROM (music.schema_type s
     JOIN music.vocabulary v ON ((v.prefix = s.vocabulary)));

--
-- Name: song_publisher; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.song_publisher (
    id integer NOT NULL,
    song_id integer NOT NULL,
    organization_id integer NOT NULL,
    role_id integer NOT NULL,
    share numeric(7,4) DEFAULT 0 NOT NULL,
    controlled boolean DEFAULT false NOT NULL,
    for_writer_id integer,
    notes text,
    CONSTRAINT song_publisher_share CHECK (((share >= (0)::numeric) AND (share <= (100)::numeric)))
);

ALTER TABLE ONLY music.song_publisher FORCE ROW LEVEL SECURITY;

--
-- Name: song_registration; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.song_registration (
    id integer NOT NULL,
    song_id integer NOT NULL,
    pro_code text NOT NULL,
    work_number text,
    registered_on date,
    notes text
);

ALTER TABLE ONLY music.song_registration FORCE ROW LEVEL SECURITY;

--
-- Name: song_title; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.song_title (
    id integer NOT NULL,
    song_id integer NOT NULL,
    title text NOT NULL,
    title_type text DEFAULT 'alternate'::text NOT NULL,
    language_code music.iso_639_code,
    CONSTRAINT song_title_alt_trimmed CHECK (((title = btrim(title)) AND (title <> ''::text))),
    CONSTRAINT song_title_type CHECK ((title_type = ANY (ARRAY['alternate'::text, 'translated'::text, 'working'::text, 'formal'::text, 'part'::text])))
);

ALTER TABLE ONLY music.song_title FORCE ROW LEVEL SECURITY;

--
-- Name: song; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.song WITH (security_invoker='true') AS
 SELECT id,
    title,
    iswc,
    lyrics,
    notes,
    public_domain_p,
    easy_clear,
    derived_from_id,
    derivation_type,
    based_on,
    copyright_date,
    copyright_number,
    reversion_date,
    reversion_lead,
    language_code,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'title_type', t.title_type, 'language_code', t.language_code) ORDER BY t.id) AS jsonb_agg
           FROM music.song_title t
          WHERE (t.song_id = s.id)), '[]'::jsonb) AS titles,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', r.id, 'pro_code', r.pro_code, 'work_number', r.work_number, 'registered_on', r.registered_on, 'notes', r.notes) ORDER BY r.id) AS jsonb_agg
           FROM music.song_registration r
          WHERE (r.song_id = s.id)), '[]'::jsonb) AS registrations,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', w.id, 'contact_id', w.contact_id, 'role_id', w.role_id, 'pro_code', w.pro_code, 'share', w.share, 'controlled', w.controlled, 'notes', w.notes) ORDER BY w.id) AS jsonb_agg
           FROM music.song_writer w
          WHERE (w.song_id = s.id)), '[]'::jsonb) AS writers,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', p.id, 'organization_id', p.organization_id, 'role_id', p.role_id, 'share', p.share, 'controlled', p.controlled, 'for_writer_id', p.for_writer_id, 'notes', p.notes) ORDER BY p.id) AS jsonb_agg
           FROM music.song_publisher p
          WHERE (p.song_id = s.id)), '[]'::jsonb) AS publishers,
    music.documents_of('song_document'::text, 'song_id'::text, id) AS documents,
    COALESCE(( SELECT sum(w.share) AS sum
           FROM music.song_writer w
          WHERE (w.song_id = s.id)), (0)::numeric) AS writer_total,
    COALESCE(( SELECT sum(p.share) AS sum
           FROM music.song_publisher p
          WHERE (p.song_id = s.id)), (0)::numeric) AS publisher_total,
    (music.song_one_stop_reason(id) IS NULL) AS one_stop,
    music.song_one_stop_reason(id) AS one_stop_reason,
    created_at,
    updated_at
   FROM music.song s;

--
-- Name: song_split_check; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.song_split_check WITH (security_invoker='true') AS
 SELECT id,
    title,
    COALESCE(( SELECT sum(w.share) AS sum
           FROM music.song_writer w
          WHERE (w.song_id = s.id)), (0)::numeric) AS writer_total,
    COALESCE(( SELECT sum(p.share) AS sum
           FROM music.song_publisher p
          WHERE (p.song_id = s.id)), (0)::numeric) AS publisher_total
   FROM music.song s
  WHERE (public_domain_p = false);

--
-- Name: song_unregistered; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.song_unregistered WITH (security_invoker='true') AS
 SELECT id,
    title,
    (EXISTS ( SELECT 1
           FROM music.song_registration r
          WHERE ((r.song_id = s.id) AND (r.pro_code = 'MLC'::text)))) AS on_mlc,
    (EXISTS ( SELECT 1
           FROM music.song_registration r
          WHERE ((r.song_id = s.id) AND (r.pro_code <> ALL (ARRAY['MLC'::text, 'HFA'::text]))))) AS on_pro,
    (copyright_number IS NOT NULL) AS copyright_filed
   FROM music.song s
  WHERE (public_domain_p = false);

--
-- Name: vocabulary; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.vocabulary WITH (security_invoker='true') AS
 SELECT prefix,
    name,
    base_uri
   FROM music.vocabulary;

--
-- Name: vocal_type; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.vocal_type (
    id integer NOT NULL,
    name text NOT NULL,
    CONSTRAINT vocal_type_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

--
-- Name: vocal_type; Type: VIEW; Schema: api; Owner: -
--

CREATE VIEW api.vocal_type WITH (security_invoker='true') AS
 SELECT id,
    name
   FROM music.vocal_type;

--
-- Name: account; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.account (
    id uuid DEFAULT uuidv7() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT account_name_trimmed CHECK (((name = btrim(name)) AND (name <> ''::text)))
);

ALTER TABLE ONLY music.account FORCE ROW LEVEL SECURITY;

--
-- Name: artist_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.artist ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.artist_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: asset_status_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.asset_status ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.asset_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: audio_file_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.audio_file ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.audio_file_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: audio_file_type_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.audio_file_type ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.audio_file_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: contact_email_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.contact_email ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.contact_email_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: contact_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.contact ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: contact_phone_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.contact_phone ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.contact_phone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: document_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.document ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: document_type_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.document_type ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.document_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: genre_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.genre ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.genre_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: instrument_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.instrument ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.instrument_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: mood_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.mood ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.mood_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: organization_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.organization ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.organization_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: recording_credit_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.recording_credit ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.recording_credit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: recording_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.recording ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.recording_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: recording_owner_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.recording_owner ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.recording_owner_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: recording_representation_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.recording_representation ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.recording_representation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: release_distribution_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.release_distribution ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.release_distribution_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: release_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.release ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.release_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: release_track_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.release_track ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.release_track_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: role_group_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.role_group ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.role_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: role_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.role ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: schema_type_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.schema_type ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.schema_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: song_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.song ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.song_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: song_publisher_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.song_publisher ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.song_publisher_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: song_registration_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.song_registration ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.song_registration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: song_title_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.song_title ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.song_title_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: song_writer_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.song_writer ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.song_writer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: user_account; Type: TABLE; Schema: music; Owner: -
--

CREATE TABLE music.user_account (
    id uuid DEFAULT uuidv7() CONSTRAINT app_user_id_not_null NOT NULL,
    account_id uuid CONSTRAINT app_user_account_id_not_null NOT NULL,
    email music.email_address CONSTRAINT app_user_email_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT app_user_created_at_not_null NOT NULL,
    password_hash text NOT NULL
);

ALTER TABLE ONLY music.user_account FORCE ROW LEVEL SECURITY;

--
-- Name: vocal_type_id_seq; Type: SEQUENCE; Schema: music; Owner: -
--

ALTER TABLE music.vocal_type ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME music.vocal_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);

--
-- Name: account_storage account_storage_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.account_storage
    ADD CONSTRAINT account_storage_pkey PRIMARY KEY (account_id);

--
-- Name: user_account app_user_email_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.user_account
    ADD CONSTRAINT app_user_email_key UNIQUE (email);

--
-- Name: user_account app_user_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.user_account
    ADD CONSTRAINT app_user_pkey PRIMARY KEY (id);

--
-- Name: artist artist_isni_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.artist
    ADD CONSTRAINT artist_isni_key UNIQUE (isni);

--
-- Name: artist_member artist_member_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.artist_member
    ADD CONSTRAINT artist_member_pkey PRIMARY KEY (artist_id, contact_id);

--
-- Name: artist artist_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.artist
    ADD CONSTRAINT artist_pkey PRIMARY KEY (id);

--
-- Name: asset_status asset_status_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.asset_status
    ADD CONSTRAINT asset_status_name_key UNIQUE (name);

--
-- Name: asset_status asset_status_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.asset_status
    ADD CONSTRAINT asset_status_pkey PRIMARY KEY (id);

--
-- Name: audio_file audio_file_once_per_recording; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.audio_file
    ADD CONSTRAINT audio_file_once_per_recording UNIQUE (recording_id, storage_uri);

--
-- Name: audio_file audio_file_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.audio_file
    ADD CONSTRAINT audio_file_pkey PRIMARY KEY (id);

--
-- Name: audio_file_type audio_file_type_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.audio_file_type
    ADD CONSTRAINT audio_file_type_name_key UNIQUE (name);

--
-- Name: audio_file_type audio_file_type_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.audio_file_type
    ADD CONSTRAINT audio_file_type_pkey PRIMARY KEY (id);

--
-- Name: contact_document contact_document_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_document
    ADD CONSTRAINT contact_document_pkey PRIMARY KEY (contact_id, document_id);

--
-- Name: contact_email contact_email_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_email
    ADD CONSTRAINT contact_email_pkey PRIMARY KEY (id);

--
-- Name: contact contact_ipi_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact
    ADD CONSTRAINT contact_ipi_key UNIQUE (member_ipi);

--
-- Name: contact contact_isni_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact
    ADD CONSTRAINT contact_isni_key UNIQUE (isni);

--
-- Name: contact_organization contact_organization_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_organization
    ADD CONSTRAINT contact_organization_pkey PRIMARY KEY (contact_id, organization_id);

--
-- Name: contact_phone contact_phone_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_phone
    ADD CONSTRAINT contact_phone_pkey PRIMARY KEY (id);

--
-- Name: contact contact_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact
    ADD CONSTRAINT contact_pkey PRIMARY KEY (id);

--
-- Name: country country_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.country
    ADD CONSTRAINT country_name_key UNIQUE (name);

--
-- Name: country country_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.country
    ADD CONSTRAINT country_pkey PRIMARY KEY (code);

--
-- Name: document document_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.document
    ADD CONSTRAINT document_pkey PRIMARY KEY (id);

--
-- Name: document_type document_type_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.document_type
    ADD CONSTRAINT document_type_name_key UNIQUE (name);

--
-- Name: document_type document_type_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.document_type
    ADD CONSTRAINT document_type_pkey PRIMARY KEY (id);

--
-- Name: genre genre_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.genre
    ADD CONSTRAINT genre_name_key UNIQUE (name);

--
-- Name: genre genre_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.genre
    ADD CONSTRAINT genre_pkey PRIMARY KEY (id);

--
-- Name: instrument instrument_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.instrument
    ADD CONSTRAINT instrument_name_key UNIQUE (name);

--
-- Name: instrument instrument_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.instrument
    ADD CONSTRAINT instrument_pkey PRIMARY KEY (id);

--
-- Name: key_signature key_sig_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.key_signature
    ADD CONSTRAINT key_sig_unique UNIQUE (tonic, mode);

--
-- Name: key_signature key_signature_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.key_signature
    ADD CONSTRAINT key_signature_pkey PRIMARY KEY (name);

--
-- Name: language language_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.language
    ADD CONSTRAINT language_name_key UNIQUE (name);

--
-- Name: language language_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.language
    ADD CONSTRAINT language_pkey PRIMARY KEY (code);

--
-- Name: mood mood_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.mood
    ADD CONSTRAINT mood_name_key UNIQUE (name);

--
-- Name: mood mood_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.mood
    ADD CONSTRAINT mood_pkey PRIMARY KEY (id);

--
-- Name: organization_document organization_document_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization_document
    ADD CONSTRAINT organization_document_pkey PRIMARY KEY (organization_id, document_id);

--
-- Name: organization organization_ipi_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization
    ADD CONSTRAINT organization_ipi_key UNIQUE (member_ipi);

--
-- Name: organization organization_isni_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization
    ADD CONSTRAINT organization_isni_key UNIQUE (isni);

--
-- Name: organization organization_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization
    ADD CONSTRAINT organization_pkey PRIMARY KEY (id);

--
-- Name: pitch_setting pitch_setting_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pitch_setting
    ADD CONSTRAINT pitch_setting_pkey PRIMARY KEY (account_id);

--
-- Name: pro pro_cisac_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pro
    ADD CONSTRAINT pro_cisac_key UNIQUE (cisac_code);

--
-- Name: pro pro_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pro
    ADD CONSTRAINT pro_name_key UNIQUE (name);

--
-- Name: pro pro_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pro
    ADD CONSTRAINT pro_pkey PRIMARY KEY (code);

--
-- Name: pro_territory pro_territory_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pro_territory
    ADD CONSTRAINT pro_territory_pkey PRIMARY KEY (pro_code, country_code);

--
-- Name: recording_artist recording_artist_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_artist
    ADD CONSTRAINT recording_artist_pkey PRIMARY KEY (recording_id, artist_id);

--
-- Name: recording_credit_instrument recording_credit_instrument_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit_instrument
    ADD CONSTRAINT recording_credit_instrument_pkey PRIMARY KEY (credit_id, instrument_id);

--
-- Name: recording_credit recording_credit_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit
    ADD CONSTRAINT recording_credit_pkey PRIMARY KEY (id);

--
-- Name: recording_credit_role recording_credit_role_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit_role
    ADD CONSTRAINT recording_credit_role_pkey PRIMARY KEY (credit_id, role_id);

--
-- Name: recording_credit recording_credit_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit
    ADD CONSTRAINT recording_credit_unique UNIQUE NULLS NOT DISTINCT (recording_id, contact_id, organization_id);

--
-- Name: recording_document recording_document_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_document
    ADD CONSTRAINT recording_document_pkey PRIMARY KEY (recording_id, document_id);

--
-- Name: recording_genre recording_genre_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_genre
    ADD CONSTRAINT recording_genre_pkey PRIMARY KEY (recording_id, genre_id);

--
-- Name: recording recording_isrc_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_isrc_key UNIQUE (isrc);

--
-- Name: recording_mood recording_mood_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_mood
    ADD CONSTRAINT recording_mood_pkey PRIMARY KEY (recording_id, mood_id);

--
-- Name: recording_owner recording_owner_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_owner
    ADD CONSTRAINT recording_owner_pkey PRIMARY KEY (id);

--
-- Name: recording_owner recording_owner_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_owner
    ADD CONSTRAINT recording_owner_unique UNIQUE NULLS NOT DISTINCT (recording_id, contact_id, organization_id);

--
-- Name: recording recording_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_pkey PRIMARY KEY (id);

--
-- Name: recording_representation recording_representation_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_representation
    ADD CONSTRAINT recording_representation_pkey PRIMARY KEY (id);

--
-- Name: recording_song recording_song_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_song
    ADD CONSTRAINT recording_song_pkey PRIMARY KEY (recording_id, song_id);

--
-- Name: release_artist release_artist_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_artist
    ADD CONSTRAINT release_artist_pkey PRIMARY KEY (release_id, artist_id);

--
-- Name: release_distribution release_distribution_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_distribution
    ADD CONSTRAINT release_distribution_pkey PRIMARY KEY (id);

--
-- Name: release_document release_document_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_document
    ADD CONSTRAINT release_document_pkey PRIMARY KEY (release_id, document_id);

--
-- Name: release release_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release
    ADD CONSTRAINT release_pkey PRIMARY KEY (id);

--
-- Name: release_track release_track_once; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_track
    ADD CONSTRAINT release_track_once UNIQUE (release_id, recording_id);

--
-- Name: release_track release_track_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_track
    ADD CONSTRAINT release_track_pkey PRIMARY KEY (id);

--
-- Name: release_track release_track_position; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_track
    ADD CONSTRAINT release_track_position UNIQUE (release_id, disc_number, track_number) DEFERRABLE INITIALLY DEFERRED;

--
-- Name: release release_upc_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release
    ADD CONSTRAINT release_upc_unique UNIQUE (account_id, upc);

--
-- Name: role_group role_group_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.role_group
    ADD CONSTRAINT role_group_name_key UNIQUE (name);

--
-- Name: role_group role_group_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.role_group
    ADD CONSTRAINT role_group_pkey PRIMARY KEY (id);

--
-- Name: role role_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.role
    ADD CONSTRAINT role_name_key UNIQUE (name);

--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);

--
-- Name: schema_type schema_type_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.schema_type
    ADD CONSTRAINT schema_type_pkey PRIMARY KEY (id);

--
-- Name: schema_type schema_type_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.schema_type
    ADD CONSTRAINT schema_type_unique UNIQUE (vocabulary, class_name);

--
-- Name: song_document song_document_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_document
    ADD CONSTRAINT song_document_pkey PRIMARY KEY (song_id, document_id);

--
-- Name: song song_iswc_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song
    ADD CONSTRAINT song_iswc_key UNIQUE (iswc);

--
-- Name: song song_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song
    ADD CONSTRAINT song_pkey PRIMARY KEY (id);

--
-- Name: song_publisher song_publisher_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_publisher
    ADD CONSTRAINT song_publisher_pkey PRIMARY KEY (id);

--
-- Name: song_publisher song_publisher_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_publisher
    ADD CONSTRAINT song_publisher_unique UNIQUE NULLS NOT DISTINCT (song_id, organization_id, role_id, for_writer_id);

--
-- Name: song_registration song_reg_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_registration
    ADD CONSTRAINT song_reg_unique UNIQUE (song_id, pro_code);

--
-- Name: song_registration song_registration_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_registration
    ADD CONSTRAINT song_registration_pkey PRIMARY KEY (id);

--
-- Name: song_title song_title_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_title
    ADD CONSTRAINT song_title_pkey PRIMARY KEY (id);

--
-- Name: song_title song_title_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_title
    ADD CONSTRAINT song_title_unique UNIQUE (song_id, title);

--
-- Name: song_writer song_writer_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_writer
    ADD CONSTRAINT song_writer_pkey PRIMARY KEY (id);

--
-- Name: song_writer song_writer_unique; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_writer
    ADD CONSTRAINT song_writer_unique UNIQUE (song_id, contact_id, role_id);

--
-- Name: vocabulary vocabulary_base_uri_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.vocabulary
    ADD CONSTRAINT vocabulary_base_uri_key UNIQUE (base_uri);

--
-- Name: vocabulary vocabulary_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.vocabulary
    ADD CONSTRAINT vocabulary_pkey PRIMARY KEY (prefix);

--
-- Name: vocal_type vocal_type_name_key; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.vocal_type
    ADD CONSTRAINT vocal_type_name_key UNIQUE (name);

--
-- Name: vocal_type vocal_type_pkey; Type: CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.vocal_type
    ADD CONSTRAINT vocal_type_pkey PRIMARY KEY (id);

--
-- Name: app_user_account_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX app_user_account_id_idx ON music.user_account USING btree (account_id);

--
-- Name: artist_member_contact_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX artist_member_contact_id_idx ON music.artist_member USING btree (contact_id);

--
-- Name: audio_file_recording_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX audio_file_recording_id_idx ON music.audio_file USING btree (recording_id);

--
-- Name: audio_file_type_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX audio_file_type_idx ON music.audio_file USING btree (file_type_id);

--
-- Name: contact_account_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX contact_account_id_idx ON music.contact USING btree (account_id);

--
-- Name: contact_document_doc_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX contact_document_doc_idx ON music.contact_document USING btree (document_id);

--
-- Name: contact_email_contact_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX contact_email_contact_id_idx ON music.contact_email USING btree (contact_id);

--
-- Name: contact_email_lower_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX contact_email_lower_idx ON music.contact_email USING btree (lower((email)::text));

--
-- Name: contact_email_no_dupe; Type: INDEX; Schema: music; Owner: -
--

CREATE UNIQUE INDEX contact_email_no_dupe ON music.contact_email USING btree (contact_id, lower((email)::text));

--
-- Name: contact_email_one_primary; Type: INDEX; Schema: music; Owner: -
--

CREATE UNIQUE INDEX contact_email_one_primary ON music.contact_email USING btree (contact_id) WHERE (is_primary AND (retired_at IS NULL));

--
-- Name: contact_lower_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX contact_lower_idx ON music.contact USING btree (lower(sort_name));

--
-- Name: contact_org_one_primary; Type: INDEX; Schema: music; Owner: -
--

CREATE UNIQUE INDEX contact_org_one_primary ON music.contact_organization USING btree (contact_id) WHERE is_primary;

--
-- Name: contact_organization_organization_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX contact_organization_organization_id_idx ON music.contact_organization USING btree (organization_id);

--
-- Name: contact_phone_contact_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX contact_phone_contact_id_idx ON music.contact_phone USING btree (contact_id);

--
-- Name: contact_phone_one_primary; Type: INDEX; Schema: music; Owner: -
--

CREATE UNIQUE INDEX contact_phone_one_primary ON music.contact_phone USING btree (contact_id) WHERE is_primary;

--
-- Name: contact_pro_code_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX contact_pro_code_idx ON music.contact USING btree (pro_code);

--
-- Name: document_expires_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX document_expires_idx ON music.document USING btree (expires_on) WHERE (expires_on IS NOT NULL);

--
-- Name: document_one_per_file; Type: INDEX; Schema: music; Owner: -
--

CREATE UNIQUE INDEX document_one_per_file ON music.document USING btree (account_id, storage_uri) WHERE (storage_kind = ANY (ARRAY['local'::text, 's3'::text]));

--
-- Name: INDEX document_one_per_file; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON INDEX music.document_one_per_file IS 'A stored file is one document, attached wherever it applies. Files are named by their contents, so the same file uploaded twice has the same storage_uri.';

--
-- Name: genre_parent_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX genre_parent_id_idx ON music.genre USING btree (parent_id);

--
-- Name: genre_schema_class_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX genre_schema_class_id_idx ON music.genre USING btree (schema_class_id);

--
-- Name: organization_account_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX organization_account_id_idx ON music.organization USING btree (account_id);

--
-- Name: organization_document_doc_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX organization_document_doc_idx ON music.organization_document USING btree (document_id);

--
-- Name: organization_lower_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX organization_lower_idx ON music.organization USING btree (lower(name));

--
-- Name: organization_pro_code_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX organization_pro_code_idx ON music.organization USING btree (pro_code);

--
-- Name: pro_home_country_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX pro_home_country_idx ON music.pro USING btree (home_country);

--
-- Name: pro_territory_country_code_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX pro_territory_country_code_idx ON music.pro_territory USING btree (country_code);

--
-- Name: recording_account_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_account_id_idx ON music.recording USING btree (account_id);

--
-- Name: recording_artist_artist_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_artist_artist_idx ON music.recording_artist USING btree (artist_id);

--
-- Name: recording_credit_contact_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_credit_contact_id_idx ON music.recording_credit USING btree (contact_id);

--
-- Name: recording_credit_instrument_inst_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_credit_instrument_inst_idx ON music.recording_credit_instrument USING btree (instrument_id);

--
-- Name: recording_credit_organization_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_credit_organization_id_idx ON music.recording_credit USING btree (organization_id);

--
-- Name: recording_credit_recording_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_credit_recording_id_idx ON music.recording_credit USING btree (recording_id);

--
-- Name: recording_credit_role_role_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_credit_role_role_idx ON music.recording_credit_role USING btree (role_id);

--
-- Name: recording_document_doc_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_document_doc_idx ON music.recording_document USING btree (document_id);

--
-- Name: recording_genre_genre_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_genre_genre_id_idx ON music.recording_genre USING btree (genre_id);

--
-- Name: recording_is_cover_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_is_cover_idx ON music.recording USING btree (is_cover) WHERE is_cover;

--
-- Name: recording_lower_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_lower_idx ON music.recording USING btree (lower(title));

--
-- Name: recording_mood_mood_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_mood_mood_id_idx ON music.recording_mood USING btree (mood_id);

--
-- Name: recording_owner_contact_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_owner_contact_idx ON music.recording_owner USING btree (contact_id);

--
-- Name: recording_owner_organization_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_owner_organization_idx ON music.recording_owner USING btree (organization_id);

--
-- Name: recording_owner_recording_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_owner_recording_idx ON music.recording_owner USING btree (recording_id);

--
-- Name: recording_representation_contact_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_representation_contact_idx ON music.recording_representation USING btree (contact_id);

--
-- Name: recording_representation_organization_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_representation_organization_idx ON music.recording_representation USING btree (organization_id);

--
-- Name: recording_representation_recording_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_representation_recording_idx ON music.recording_representation USING btree (recording_id);

--
-- Name: recording_song_song_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_song_song_id_idx ON music.recording_song USING btree (song_id);

--
-- Name: recording_status_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX recording_status_id_idx ON music.recording USING btree (status_id);

--
-- Name: release_distribution_release_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX release_distribution_release_idx ON music.release_distribution USING btree (release_id);

--
-- Name: release_track_recording_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX release_track_recording_idx ON music.release_track USING btree (recording_id);

--
-- Name: role_role_group_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX role_role_group_id_idx ON music.role USING btree (role_group_id);

--
-- Name: schema_type_vocabulary_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX schema_type_vocabulary_idx ON music.schema_type USING btree (vocabulary);

--
-- Name: song_account_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_account_id_idx ON music.song USING btree (account_id);

--
-- Name: song_derived_from_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_derived_from_id_idx ON music.song USING btree (derived_from_id);

--
-- Name: song_document_document_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_document_document_id_idx ON music.song_document USING btree (document_id);

--
-- Name: song_language_code_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_language_code_idx ON music.song USING btree (language_code);

--
-- Name: song_lower_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_lower_idx ON music.song USING btree (lower(title));

--
-- Name: song_publisher_for_writer_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_publisher_for_writer_id_idx ON music.song_publisher USING btree (for_writer_id);

--
-- Name: song_publisher_organization_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_publisher_organization_id_idx ON music.song_publisher USING btree (organization_id);

--
-- Name: song_publisher_song_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_publisher_song_id_idx ON music.song_publisher USING btree (song_id);

--
-- Name: song_registration_song_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_registration_song_id_idx ON music.song_registration USING btree (song_id);

--
-- Name: song_registration_work_number_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_registration_work_number_idx ON music.song_registration USING btree (work_number);

--
-- Name: song_title_lower_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_title_lower_idx ON music.song_title USING btree (lower(title));

--
-- Name: song_title_song_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_title_song_id_idx ON music.song_title USING btree (song_id);

--
-- Name: song_writer_contact_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_writer_contact_id_idx ON music.song_writer USING btree (contact_id);

--
-- Name: song_writer_pro_code_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_writer_pro_code_idx ON music.song_writer USING btree (pro_code);

--
-- Name: song_writer_song_id_idx; Type: INDEX; Schema: music; Owner: -
--

CREATE INDEX song_writer_song_id_idx ON music.song_writer USING btree (song_id);

--
-- Name: account_storage account_storage_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER account_storage_del INSTEAD OF DELETE ON api.account_storage FOR EACH ROW EXECUTE FUNCTION api.account_storage_write();

--
-- Name: account_storage account_storage_ins; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER account_storage_ins INSTEAD OF INSERT ON api.account_storage FOR EACH ROW EXECUTE FUNCTION api.account_storage_write();

--
-- Name: account_storage account_storage_upd; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER account_storage_upd INSTEAD OF UPDATE ON api.account_storage FOR EACH ROW EXECUTE FUNCTION api.account_storage_write();

--
-- Name: artist artist_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER artist_del INSTEAD OF DELETE ON api.artist FOR EACH ROW EXECUTE FUNCTION api.artist_write();

--
-- Name: artist artist_ins; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER artist_ins INSTEAD OF INSERT ON api.artist FOR EACH ROW EXECUTE FUNCTION api.artist_write();

--
-- Name: artist artist_upd; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER artist_upd INSTEAD OF UPDATE ON api.artist FOR EACH ROW EXECUTE FUNCTION api.artist_write();

--
-- Name: contact contact_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER contact_del INSTEAD OF DELETE ON api.contact FOR EACH ROW EXECUTE FUNCTION api.contact_write();

--
-- Name: contact contact_ins; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER contact_ins INSTEAD OF INSERT ON api.contact FOR EACH ROW EXECUTE FUNCTION api.contact_write();

--
-- Name: contact contact_upd; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER contact_upd INSTEAD OF UPDATE ON api.contact FOR EACH ROW EXECUTE FUNCTION api.contact_write();

--
-- Name: document document_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER document_del INSTEAD OF DELETE ON api.document FOR EACH ROW EXECUTE FUNCTION api.document_write();

--
-- Name: document document_ins; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER document_ins INSTEAD OF INSERT ON api.document FOR EACH ROW EXECUTE FUNCTION api.document_write();

--
-- Name: document_orphan document_orphan_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER document_orphan_del INSTEAD OF DELETE ON api.document_orphan FOR EACH ROW EXECUTE FUNCTION api.document_orphan_delete();

--
-- Name: document document_upd; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER document_upd INSTEAD OF UPDATE ON api.document FOR EACH ROW EXECUTE FUNCTION api.document_write();

--
-- Name: organization organization_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER organization_del INSTEAD OF DELETE ON api.organization FOR EACH ROW EXECUTE FUNCTION api.organization_write();

--
-- Name: organization organization_ins; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER organization_ins INSTEAD OF INSERT ON api.organization FOR EACH ROW EXECUTE FUNCTION api.organization_write();

--
-- Name: organization organization_upd; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER organization_upd INSTEAD OF UPDATE ON api.organization FOR EACH ROW EXECUTE FUNCTION api.organization_write();

--
-- Name: recording recording_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER recording_del INSTEAD OF DELETE ON api.recording FOR EACH ROW EXECUTE FUNCTION api.recording_write();

--
-- Name: recording recording_ins; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER recording_ins INSTEAD OF INSERT ON api.recording FOR EACH ROW EXECUTE FUNCTION api.recording_write();

--
-- Name: recording recording_upd; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER recording_upd INSTEAD OF UPDATE ON api.recording FOR EACH ROW EXECUTE FUNCTION api.recording_write();

--
-- Name: release release_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER release_del INSTEAD OF DELETE ON api.release FOR EACH ROW EXECUTE FUNCTION api.release_write();

--
-- Name: release release_ins; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER release_ins INSTEAD OF INSERT ON api.release FOR EACH ROW EXECUTE FUNCTION api.release_write();

--
-- Name: release release_upd; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER release_upd INSTEAD OF UPDATE ON api.release FOR EACH ROW EXECUTE FUNCTION api.release_write();

--
-- Name: song song_del; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER song_del INSTEAD OF DELETE ON api.song FOR EACH ROW EXECUTE FUNCTION api.song_write();

--
-- Name: song song_ins; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER song_ins INSTEAD OF INSERT ON api.song FOR EACH ROW EXECUTE FUNCTION api.song_write();

--
-- Name: song song_upd; Type: TRIGGER; Schema: api; Owner: -
--

CREATE TRIGGER song_upd INSTEAD OF UPDATE ON api.song FOR EACH ROW EXECUTE FUNCTION api.song_write();

--
-- Name: account_storage account_storage_touch; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER account_storage_touch BEFORE UPDATE ON music.account_storage FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();

--
-- Name: audio_file audio_file_touch; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER audio_file_touch BEFORE UPDATE ON music.audio_file FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();

--
-- Name: contact_email contact_email_touch; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER contact_email_touch BEFORE UPDATE ON music.contact_email FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();

--
-- Name: contact_phone contact_phone_touch; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER contact_phone_touch BEFORE UPDATE ON music.contact_phone FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();

--
-- Name: contact contact_touch; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER contact_touch BEFORE UPDATE ON music.contact FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();

--
-- Name: document document_storage_kind; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER document_storage_kind BEFORE INSERT OR UPDATE ON music.document FOR EACH ROW EXECUTE FUNCTION music.document_storage_kind();

--
-- Name: organization organization_touch; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER organization_touch BEFORE UPDATE ON music.organization FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();

--
-- Name: recording_representation recording_representation_exclusive; Type: TRIGGER; Schema: music; Owner: -
--

CREATE CONSTRAINT TRIGGER recording_representation_exclusive AFTER INSERT OR UPDATE ON music.recording_representation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION music.check_representation_exclusive();

--
-- Name: recording recording_touch; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER recording_touch BEFORE UPDATE ON music.recording FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();

--
-- Name: song song_touch; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER song_touch BEFORE UPDATE ON music.song FOR EACH ROW EXECUTE FUNCTION music.set_updated_at();

--
-- Name: song_writer song_writer_pro; Type: TRIGGER; Schema: music; Owner: -
--

CREATE TRIGGER song_writer_pro BEFORE INSERT ON music.song_writer FOR EACH ROW EXECUTE FUNCTION music.song_writer_default_pro();

--
-- Name: account_storage account_storage_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.account_storage
    ADD CONSTRAINT account_storage_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: user_account app_user_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.user_account
    ADD CONSTRAINT app_user_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: artist artist_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.artist
    ADD CONSTRAINT artist_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: artist_member artist_member_artist_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.artist_member
    ADD CONSTRAINT artist_member_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES music.artist(id) ON DELETE CASCADE;

--
-- Name: artist_member artist_member_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.artist_member
    ADD CONSTRAINT artist_member_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES music.contact(id) ON DELETE CASCADE;

--
-- Name: audio_file audio_file_file_type_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.audio_file
    ADD CONSTRAINT audio_file_file_type_id_fkey FOREIGN KEY (file_type_id) REFERENCES music.audio_file_type(id);

--
-- Name: audio_file audio_file_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.audio_file
    ADD CONSTRAINT audio_file_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: contact contact_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact
    ADD CONSTRAINT contact_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: contact_document contact_document_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_document
    ADD CONSTRAINT contact_document_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES music.contact(id) ON DELETE CASCADE;

--
-- Name: contact_document contact_document_document_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_document
    ADD CONSTRAINT contact_document_document_id_fkey FOREIGN KEY (document_id) REFERENCES music.document(id) ON DELETE CASCADE;

--
-- Name: contact_email contact_email_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_email
    ADD CONSTRAINT contact_email_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES music.organization(id);

--
-- Name: contact_organization contact_organization_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_organization
    ADD CONSTRAINT contact_organization_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES music.contact(id) ON DELETE CASCADE;

--
-- Name: contact_organization contact_organization_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_organization
    ADD CONSTRAINT contact_organization_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES music.organization(id) ON DELETE CASCADE;

--
-- Name: contact_phone contact_phone_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact_phone
    ADD CONSTRAINT contact_phone_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES music.organization(id);

--
-- Name: contact contact_pro_code_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.contact
    ADD CONSTRAINT contact_pro_code_fkey FOREIGN KEY (pro_code) REFERENCES music.pro(code) ON UPDATE CASCADE;

--
-- Name: document document_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.document
    ADD CONSTRAINT document_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: document document_document_type_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.document
    ADD CONSTRAINT document_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES music.document_type(id);

--
-- Name: genre genre_parent_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.genre
    ADD CONSTRAINT genre_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES music.genre(id) ON DELETE SET NULL;

--
-- Name: genre genre_schema_class_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.genre
    ADD CONSTRAINT genre_schema_class_id_fkey FOREIGN KEY (schema_class_id) REFERENCES music.schema_type(id);

--
-- Name: organization organization_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization
    ADD CONSTRAINT organization_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: organization organization_country_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization
    ADD CONSTRAINT organization_country_fkey FOREIGN KEY (country) REFERENCES music.country(code) ON UPDATE CASCADE;

--
-- Name: organization_document organization_document_document_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization_document
    ADD CONSTRAINT organization_document_document_id_fkey FOREIGN KEY (document_id) REFERENCES music.document(id) ON DELETE CASCADE;

--
-- Name: organization_document organization_document_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization_document
    ADD CONSTRAINT organization_document_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES music.organization(id) ON DELETE CASCADE;

--
-- Name: organization organization_pro_code_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.organization
    ADD CONSTRAINT organization_pro_code_fkey FOREIGN KEY (pro_code) REFERENCES music.pro(code) ON UPDATE CASCADE;

--
-- Name: pitch_setting pitch_setting_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pitch_setting
    ADD CONSTRAINT pitch_setting_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: pitch_setting pitch_setting_default_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pitch_setting
    ADD CONSTRAINT pitch_setting_default_contact_id_fkey FOREIGN KEY (default_contact_id) REFERENCES music.contact(id) ON DELETE SET NULL;

--
-- Name: pro pro_home_country_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pro
    ADD CONSTRAINT pro_home_country_fkey FOREIGN KEY (home_country) REFERENCES music.country(code) ON UPDATE CASCADE;

--
-- Name: pro_territory pro_territory_country_code_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pro_territory
    ADD CONSTRAINT pro_territory_country_code_fkey FOREIGN KEY (country_code) REFERENCES music.country(code) ON UPDATE CASCADE;

--
-- Name: pro_territory pro_territory_pro_code_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.pro_territory
    ADD CONSTRAINT pro_territory_pro_code_fkey FOREIGN KEY (pro_code) REFERENCES music.pro(code) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: recording recording_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: recording_artist recording_artist_artist_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_artist
    ADD CONSTRAINT recording_artist_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES music.artist(id);

--
-- Name: recording_artist recording_artist_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_artist
    ADD CONSTRAINT recording_artist_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: recording recording_commissioned_country_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_commissioned_country_fkey FOREIGN KEY (commissioned_country) REFERENCES music.country(code) ON UPDATE CASCADE;

--
-- Name: recording_credit recording_credit_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit
    ADD CONSTRAINT recording_credit_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES music.contact(id);

--
-- Name: recording_credit_instrument recording_credit_instrument_credit_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit_instrument
    ADD CONSTRAINT recording_credit_instrument_credit_id_fkey FOREIGN KEY (credit_id) REFERENCES music.recording_credit(id) ON DELETE CASCADE;

--
-- Name: recording_credit_instrument recording_credit_instrument_instrument_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit_instrument
    ADD CONSTRAINT recording_credit_instrument_instrument_id_fkey FOREIGN KEY (instrument_id) REFERENCES music.instrument(id);

--
-- Name: recording_credit recording_credit_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit
    ADD CONSTRAINT recording_credit_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES music.organization(id);

--
-- Name: recording_credit recording_credit_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit
    ADD CONSTRAINT recording_credit_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: recording_credit_role recording_credit_role_credit_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit_role
    ADD CONSTRAINT recording_credit_role_credit_id_fkey FOREIGN KEY (credit_id) REFERENCES music.recording_credit(id) ON DELETE CASCADE;

--
-- Name: recording_credit_role recording_credit_role_role_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_credit_role
    ADD CONSTRAINT recording_credit_role_role_id_fkey FOREIGN KEY (role_id) REFERENCES music.role(id);

--
-- Name: recording_document recording_document_document_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_document
    ADD CONSTRAINT recording_document_document_id_fkey FOREIGN KEY (document_id) REFERENCES music.document(id) ON DELETE CASCADE;

--
-- Name: recording_document recording_document_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_document
    ADD CONSTRAINT recording_document_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: recording_genre recording_genre_genre_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_genre
    ADD CONSTRAINT recording_genre_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES music.genre(id) ON DELETE CASCADE;

--
-- Name: recording_genre recording_genre_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_genre
    ADD CONSTRAINT recording_genre_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: recording recording_key_signature_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_key_signature_fkey FOREIGN KEY (key_signature) REFERENCES music.key_signature(name) ON UPDATE CASCADE;

--
-- Name: recording_mood recording_mood_mood_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_mood
    ADD CONSTRAINT recording_mood_mood_id_fkey FOREIGN KEY (mood_id) REFERENCES music.mood(id) ON DELETE CASCADE;

--
-- Name: recording_mood recording_mood_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_mood
    ADD CONSTRAINT recording_mood_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: recording_owner recording_owner_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_owner
    ADD CONSTRAINT recording_owner_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES music.contact(id);

--
-- Name: recording_owner recording_owner_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_owner
    ADD CONSTRAINT recording_owner_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES music.organization(id);

--
-- Name: recording_owner recording_owner_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_owner
    ADD CONSTRAINT recording_owner_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: recording recording_pitch_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_pitch_contact_id_fkey FOREIGN KEY (pitch_contact_id) REFERENCES music.contact(id) ON DELETE SET NULL;

--
-- Name: recording recording_recorded_country_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_recorded_country_fkey FOREIGN KEY (recorded_country) REFERENCES music.country(code) ON UPDATE CASCADE;

--
-- Name: recording_representation recording_representation_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_representation
    ADD CONSTRAINT recording_representation_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES music.contact(id);

--
-- Name: recording_representation recording_representation_document_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_representation
    ADD CONSTRAINT recording_representation_document_id_fkey FOREIGN KEY (document_id) REFERENCES music.document(id) ON DELETE SET NULL;

--
-- Name: recording_representation recording_representation_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_representation
    ADD CONSTRAINT recording_representation_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES music.organization(id);

--
-- Name: recording_representation recording_representation_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_representation
    ADD CONSTRAINT recording_representation_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: recording_song recording_song_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_song
    ADD CONSTRAINT recording_song_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id) ON DELETE CASCADE;

--
-- Name: recording_song recording_song_song_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording_song
    ADD CONSTRAINT recording_song_song_id_fkey FOREIGN KEY (song_id) REFERENCES music.song(id) ON DELETE CASCADE;

--
-- Name: recording recording_status_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_status_id_fkey FOREIGN KEY (status_id) REFERENCES music.asset_status(id) ON DELETE SET NULL;

--
-- Name: recording recording_vocal_type_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.recording
    ADD CONSTRAINT recording_vocal_type_id_fkey FOREIGN KEY (vocal_type_id) REFERENCES music.vocal_type(id);

--
-- Name: release release_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release
    ADD CONSTRAINT release_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: release_artist release_artist_artist_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_artist
    ADD CONSTRAINT release_artist_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES music.artist(id);

--
-- Name: release_artist release_artist_release_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_artist
    ADD CONSTRAINT release_artist_release_id_fkey FOREIGN KEY (release_id) REFERENCES music.release(id) ON DELETE CASCADE;

--
-- Name: release release_c_line_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release
    ADD CONSTRAINT release_c_line_contact_id_fkey FOREIGN KEY (c_line_contact_id) REFERENCES music.contact(id) ON DELETE SET NULL;

--
-- Name: release release_c_line_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release
    ADD CONSTRAINT release_c_line_organization_id_fkey FOREIGN KEY (c_line_organization_id) REFERENCES music.organization(id) ON DELETE SET NULL;

--
-- Name: release_distribution release_distribution_distributor_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_distribution
    ADD CONSTRAINT release_distribution_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES music.organization(id);

--
-- Name: release_distribution release_distribution_release_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_distribution
    ADD CONSTRAINT release_distribution_release_id_fkey FOREIGN KEY (release_id) REFERENCES music.release(id) ON DELETE CASCADE;

--
-- Name: release_document release_document_document_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_document
    ADD CONSTRAINT release_document_document_id_fkey FOREIGN KEY (document_id) REFERENCES music.document(id) ON DELETE CASCADE;

--
-- Name: release_document release_document_release_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_document
    ADD CONSTRAINT release_document_release_id_fkey FOREIGN KEY (release_id) REFERENCES music.release(id) ON DELETE CASCADE;

--
-- Name: release release_label_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release
    ADD CONSTRAINT release_label_id_fkey FOREIGN KEY (label_id) REFERENCES music.organization(id);

--
-- Name: release release_primary_genre_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release
    ADD CONSTRAINT release_primary_genre_id_fkey FOREIGN KEY (primary_genre_id) REFERENCES music.genre(id);

--
-- Name: release_track release_track_recording_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_track
    ADD CONSTRAINT release_track_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES music.recording(id);

--
-- Name: release_track release_track_release_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.release_track
    ADD CONSTRAINT release_track_release_id_fkey FOREIGN KEY (release_id) REFERENCES music.release(id) ON DELETE CASCADE;

--
-- Name: role role_role_group_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.role
    ADD CONSTRAINT role_role_group_id_fkey FOREIGN KEY (role_group_id) REFERENCES music.role_group(id);

--
-- Name: schema_type schema_type_vocabulary_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.schema_type
    ADD CONSTRAINT schema_type_vocabulary_fkey FOREIGN KEY (vocabulary) REFERENCES music.vocabulary(prefix) ON UPDATE CASCADE;

--
-- Name: song song_account_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song
    ADD CONSTRAINT song_account_id_fkey FOREIGN KEY (account_id) REFERENCES music.account(id) ON DELETE CASCADE;

--
-- Name: song song_derived_from_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song
    ADD CONSTRAINT song_derived_from_id_fkey FOREIGN KEY (derived_from_id) REFERENCES music.song(id) ON DELETE SET NULL;

--
-- Name: song_document song_document_document_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_document
    ADD CONSTRAINT song_document_document_id_fkey FOREIGN KEY (document_id) REFERENCES music.document(id) ON DELETE CASCADE;

--
-- Name: song_document song_document_song_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_document
    ADD CONSTRAINT song_document_song_id_fkey FOREIGN KEY (song_id) REFERENCES music.song(id) ON DELETE CASCADE;

--
-- Name: song song_language_code_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song
    ADD CONSTRAINT song_language_code_fkey FOREIGN KEY (language_code) REFERENCES music.language(code) ON UPDATE CASCADE;

--
-- Name: song_publisher song_publisher_for_writer_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_publisher
    ADD CONSTRAINT song_publisher_for_writer_id_fkey FOREIGN KEY (for_writer_id) REFERENCES music.song_writer(id) ON DELETE CASCADE;

--
-- Name: song_publisher song_publisher_organization_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_publisher
    ADD CONSTRAINT song_publisher_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES music.organization(id);

--
-- Name: song_publisher song_publisher_role_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_publisher
    ADD CONSTRAINT song_publisher_role_id_fkey FOREIGN KEY (role_id) REFERENCES music.role(id);

--
-- Name: song_publisher song_publisher_song_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_publisher
    ADD CONSTRAINT song_publisher_song_id_fkey FOREIGN KEY (song_id) REFERENCES music.song(id) ON DELETE CASCADE;

--
-- Name: song_registration song_registration_pro_code_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_registration
    ADD CONSTRAINT song_registration_pro_code_fkey FOREIGN KEY (pro_code) REFERENCES music.pro(code) ON UPDATE CASCADE;

--
-- Name: song_registration song_registration_song_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_registration
    ADD CONSTRAINT song_registration_song_id_fkey FOREIGN KEY (song_id) REFERENCES music.song(id) ON DELETE CASCADE;

--
-- Name: song_title song_title_language_code_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_title
    ADD CONSTRAINT song_title_language_code_fkey FOREIGN KEY (language_code) REFERENCES music.language(code) ON UPDATE CASCADE;

--
-- Name: song_title song_title_song_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_title
    ADD CONSTRAINT song_title_song_id_fkey FOREIGN KEY (song_id) REFERENCES music.song(id) ON DELETE CASCADE;

--
-- Name: song_writer song_writer_contact_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_writer
    ADD CONSTRAINT song_writer_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES music.contact(id);

--
-- Name: song_writer song_writer_pro_code_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_writer
    ADD CONSTRAINT song_writer_pro_code_fkey FOREIGN KEY (pro_code) REFERENCES music.pro(code) ON UPDATE CASCADE;

--
-- Name: song_writer song_writer_role_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_writer
    ADD CONSTRAINT song_writer_role_id_fkey FOREIGN KEY (role_id) REFERENCES music.role(id);

--
-- Name: song_writer song_writer_song_id_fkey; Type: FK CONSTRAINT; Schema: music; Owner: -
--

ALTER TABLE ONLY music.song_writer
    ADD CONSTRAINT song_writer_song_id_fkey FOREIGN KEY (song_id) REFERENCES music.song(id) ON DELETE CASCADE;

--
-- Name: account; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.account ENABLE ROW LEVEL SECURITY;

--
-- Name: account account_own; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY account_own ON music.account USING ((id = ( SELECT music.current_account() AS current_account)));

--
-- Name: POLICY account_own ON account; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY account_own ON music.account IS 'A signed-in user sees only their own account.';

--
-- Name: account_storage; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.account_storage ENABLE ROW LEVEL SECURITY;

--
-- Name: account_storage account_storage_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY account_storage_account ON music.account_storage USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK ((account_id = ( SELECT music.current_account() AS current_account)));

--
-- Name: POLICY account_storage_account ON account_storage; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY account_storage_account ON music.account_storage IS 'Limits every role without its own policy to rows of the account in the request token.';

--
-- Name: account_storage account_storage_upload; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY account_storage_upload ON music.account_storage FOR SELECT TO mamupload USING (true);

--
-- Name: POLICY account_storage_upload ON account_storage; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY account_storage_upload ON music.account_storage IS 'mam-upload has no request token in the database; it filters by account itself, and sweep reads every account.';

--
-- Name: artist; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.artist ENABLE ROW LEVEL SECURITY;

--
-- Name: artist artist_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY artist_account ON music.artist USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK ((account_id = ( SELECT music.current_account() AS current_account)));

--
-- Name: POLICY artist_account ON artist; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY artist_account ON music.artist IS 'Limits every role without its own policy to rows of the account in the request token.';

--
-- Name: artist_member; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.artist_member ENABLE ROW LEVEL SECURITY;

--
-- Name: artist_member artist_member_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY artist_member_account ON music.artist_member USING (music.own_artist(artist_id)) WITH CHECK ((music.own_artist(artist_id) AND ((contact_id IS NULL) OR music.own_contact(contact_id))));

--
-- Name: POLICY artist_member_account ON artist_member; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY artist_member_account ON music.artist_member IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: audio_file; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.audio_file ENABLE ROW LEVEL SECURITY;

--
-- Name: audio_file audio_file_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY audio_file_account ON music.audio_file USING (music.own_recording(recording_id)) WITH CHECK (music.own_recording(recording_id));

--
-- Name: POLICY audio_file_account ON audio_file; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY audio_file_account ON music.audio_file IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: contact; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.contact ENABLE ROW LEVEL SECURITY;

--
-- Name: contact contact_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY contact_account ON music.contact USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK ((account_id = ( SELECT music.current_account() AS current_account)));

--
-- Name: POLICY contact_account ON contact; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY contact_account ON music.contact IS 'Limits every role without its own policy to rows of the account in the request token.';

--
-- Name: contact_document; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.contact_document ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_document contact_document_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY contact_document_account ON music.contact_document USING (music.own_contact(contact_id)) WITH CHECK ((music.own_contact(contact_id) AND ((document_id IS NULL) OR music.own_document(document_id))));

--
-- Name: POLICY contact_document_account ON contact_document; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY contact_document_account ON music.contact_document IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: contact_email; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.contact_email ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_email contact_email_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY contact_email_account ON music.contact_email USING ((((contact_id IS NULL) OR music.own_contact(contact_id)) AND ((organization_id IS NULL) OR music.own_organization(organization_id)))) WITH CHECK ((((contact_id IS NULL) OR music.own_contact(contact_id)) AND ((organization_id IS NULL) OR music.own_organization(organization_id))));

--
-- Name: POLICY contact_email_account ON contact_email; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY contact_email_account ON music.contact_email IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: contact_organization; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.contact_organization ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_organization contact_organization_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY contact_organization_account ON music.contact_organization USING (music.own_contact(contact_id)) WITH CHECK ((music.own_contact(contact_id) AND ((organization_id IS NULL) OR music.own_organization(organization_id))));

--
-- Name: POLICY contact_organization_account ON contact_organization; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY contact_organization_account ON music.contact_organization IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: contact_phone; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.contact_phone ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_phone contact_phone_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY contact_phone_account ON music.contact_phone USING ((((contact_id IS NULL) OR music.own_contact(contact_id)) AND ((organization_id IS NULL) OR music.own_organization(organization_id)))) WITH CHECK ((((contact_id IS NULL) OR music.own_contact(contact_id)) AND ((organization_id IS NULL) OR music.own_organization(organization_id))));

--
-- Name: POLICY contact_phone_account ON contact_phone; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY contact_phone_account ON music.contact_phone IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: document; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.document ENABLE ROW LEVEL SECURITY;

--
-- Name: document document_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY document_account ON music.document USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK ((account_id = ( SELECT music.current_account() AS current_account)));

--
-- Name: POLICY document_account ON document; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY document_account ON music.document IS 'Limits every role without its own policy to rows of the account in the request token.';

--
-- Name: document document_upload; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY document_upload ON music.document FOR SELECT TO mamupload USING (true);

--
-- Name: POLICY document_upload ON document; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY document_upload ON music.document IS 'mam-upload has no request token in the database; it filters by account itself, and sweep reads every account.';

--
-- Name: organization; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.organization ENABLE ROW LEVEL SECURITY;

--
-- Name: organization organization_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY organization_account ON music.organization USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK ((account_id = ( SELECT music.current_account() AS current_account)));

--
-- Name: POLICY organization_account ON organization; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY organization_account ON music.organization IS 'Limits every role without its own policy to rows of the account in the request token.';

--
-- Name: organization_document; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.organization_document ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_document organization_document_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY organization_document_account ON music.organization_document USING (music.own_organization(organization_id)) WITH CHECK ((music.own_organization(organization_id) AND ((document_id IS NULL) OR music.own_document(document_id))));

--
-- Name: POLICY organization_document_account ON organization_document; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY organization_document_account ON music.organization_document IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: pitch_setting; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.pitch_setting ENABLE ROW LEVEL SECURITY;

--
-- Name: pitch_setting pitch_setting_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY pitch_setting_account ON music.pitch_setting USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK (((account_id = ( SELECT music.current_account() AS current_account)) AND ((default_contact_id IS NULL) OR music.own_contact(default_contact_id))));

--
-- Name: POLICY pitch_setting_account ON pitch_setting; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY pitch_setting_account ON music.pitch_setting IS 'Limits every role without its own policy to rows of the account in the request token; on write, every linked record must be in the same account.';

--
-- Name: recording; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording ENABLE ROW LEVEL SECURITY;

--
-- Name: recording recording_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_account ON music.recording USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK (((account_id = ( SELECT music.current_account() AS current_account)) AND ((pitch_contact_id IS NULL) OR music.own_contact(pitch_contact_id))));

--
-- Name: POLICY recording_account ON recording; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_account ON music.recording IS 'Limits every role without its own policy to rows of the account in the request token; on write, every linked record must be in the same account.';

--
-- Name: recording_artist; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_artist ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_artist recording_artist_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_artist_account ON music.recording_artist USING (music.own_recording(recording_id)) WITH CHECK ((music.own_recording(recording_id) AND ((artist_id IS NULL) OR music.own_artist(artist_id))));

--
-- Name: POLICY recording_artist_account ON recording_artist; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_artist_account ON music.recording_artist IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_credit; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_credit ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_credit recording_credit_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_credit_account ON music.recording_credit USING (music.own_recording(recording_id)) WITH CHECK ((music.own_recording(recording_id) AND ((contact_id IS NULL) OR music.own_contact(contact_id)) AND ((organization_id IS NULL) OR music.own_organization(organization_id))));

--
-- Name: POLICY recording_credit_account ON recording_credit; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_credit_account ON music.recording_credit IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_credit_instrument; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_credit_instrument ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_credit_instrument recording_credit_instrument_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_credit_instrument_account ON music.recording_credit_instrument USING (music.own_credit(credit_id)) WITH CHECK (music.own_credit(credit_id));

--
-- Name: POLICY recording_credit_instrument_account ON recording_credit_instrument; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_credit_instrument_account ON music.recording_credit_instrument IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_credit_role; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_credit_role ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_credit_role recording_credit_role_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_credit_role_account ON music.recording_credit_role USING (music.own_credit(credit_id)) WITH CHECK (music.own_credit(credit_id));

--
-- Name: POLICY recording_credit_role_account ON recording_credit_role; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_credit_role_account ON music.recording_credit_role IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_document; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_document ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_document recording_document_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_document_account ON music.recording_document USING (music.own_recording(recording_id)) WITH CHECK ((music.own_recording(recording_id) AND ((document_id IS NULL) OR music.own_document(document_id))));

--
-- Name: POLICY recording_document_account ON recording_document; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_document_account ON music.recording_document IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_genre; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_genre ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_genre recording_genre_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_genre_account ON music.recording_genre USING (music.own_recording(recording_id)) WITH CHECK (music.own_recording(recording_id));

--
-- Name: POLICY recording_genre_account ON recording_genre; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_genre_account ON music.recording_genre IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_mood; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_mood ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_mood recording_mood_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_mood_account ON music.recording_mood USING (music.own_recording(recording_id)) WITH CHECK (music.own_recording(recording_id));

--
-- Name: POLICY recording_mood_account ON recording_mood; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_mood_account ON music.recording_mood IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_owner; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_owner ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_owner recording_owner_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_owner_account ON music.recording_owner USING (music.own_recording(recording_id)) WITH CHECK ((music.own_recording(recording_id) AND ((contact_id IS NULL) OR music.own_contact(contact_id)) AND ((organization_id IS NULL) OR music.own_organization(organization_id))));

--
-- Name: POLICY recording_owner_account ON recording_owner; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_owner_account ON music.recording_owner IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_representation; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_representation ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_representation recording_representation_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_representation_account ON music.recording_representation USING (music.own_recording(recording_id)) WITH CHECK ((music.own_recording(recording_id) AND ((contact_id IS NULL) OR music.own_contact(contact_id)) AND ((organization_id IS NULL) OR music.own_organization(organization_id)) AND ((document_id IS NULL) OR music.own_document(document_id))));

--
-- Name: POLICY recording_representation_account ON recording_representation; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_representation_account ON music.recording_representation IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording_song; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.recording_song ENABLE ROW LEVEL SECURITY;

--
-- Name: recording_song recording_song_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_song_account ON music.recording_song USING (music.own_recording(recording_id)) WITH CHECK ((music.own_recording(recording_id) AND ((song_id IS NULL) OR music.own_song(song_id))));

--
-- Name: POLICY recording_song_account ON recording_song; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_song_account ON music.recording_song IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: recording recording_upload; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY recording_upload ON music.recording FOR SELECT TO mamupload USING (true);

--
-- Name: POLICY recording_upload ON recording; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY recording_upload ON music.recording IS 'mam-upload has no request token in the database; it filters by account itself, and sweep reads every account.';

--
-- Name: release; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.release ENABLE ROW LEVEL SECURITY;

--
-- Name: release release_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY release_account ON music.release USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK (((account_id = ( SELECT music.current_account() AS current_account)) AND ((c_line_contact_id IS NULL) OR music.own_contact(c_line_contact_id)) AND ((c_line_organization_id IS NULL) OR music.own_organization(c_line_organization_id)) AND ((label_id IS NULL) OR music.own_organization(label_id))));

--
-- Name: POLICY release_account ON release; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY release_account ON music.release IS 'Limits every role without its own policy to rows of the account in the request token; on write, every linked record must be in the same account.';

--
-- Name: release_artist; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.release_artist ENABLE ROW LEVEL SECURITY;

--
-- Name: release_artist release_artist_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY release_artist_account ON music.release_artist USING (music.own_release(release_id)) WITH CHECK ((music.own_release(release_id) AND ((artist_id IS NULL) OR music.own_artist(artist_id))));

--
-- Name: POLICY release_artist_account ON release_artist; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY release_artist_account ON music.release_artist IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: release_distribution; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.release_distribution ENABLE ROW LEVEL SECURITY;

--
-- Name: release_distribution release_distribution_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY release_distribution_account ON music.release_distribution USING (music.own_release(release_id)) WITH CHECK ((music.own_release(release_id) AND ((distributor_id IS NULL) OR music.own_organization(distributor_id))));

--
-- Name: POLICY release_distribution_account ON release_distribution; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY release_distribution_account ON music.release_distribution IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: release_document; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.release_document ENABLE ROW LEVEL SECURITY;

--
-- Name: release_document release_document_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY release_document_account ON music.release_document USING (music.own_release(release_id)) WITH CHECK ((music.own_release(release_id) AND ((document_id IS NULL) OR music.own_document(document_id))));

--
-- Name: POLICY release_document_account ON release_document; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY release_document_account ON music.release_document IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: release_track; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.release_track ENABLE ROW LEVEL SECURITY;

--
-- Name: release_track release_track_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY release_track_account ON music.release_track USING (music.own_release(release_id)) WITH CHECK ((music.own_release(release_id) AND ((recording_id IS NULL) OR music.own_recording(recording_id))));

--
-- Name: POLICY release_track_account ON release_track; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY release_track_account ON music.release_track IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: song; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.song ENABLE ROW LEVEL SECURITY;

--
-- Name: song song_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY song_account ON music.song USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK (((account_id = ( SELECT music.current_account() AS current_account)) AND ((derived_from_id IS NULL) OR music.own_song(derived_from_id))));

--
-- Name: POLICY song_account ON song; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY song_account ON music.song IS 'Limits every role without its own policy to rows of the account in the request token; on write, every linked record must be in the same account.';

--
-- Name: song_document; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.song_document ENABLE ROW LEVEL SECURITY;

--
-- Name: song_document song_document_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY song_document_account ON music.song_document USING (music.own_song(song_id)) WITH CHECK ((music.own_song(song_id) AND ((document_id IS NULL) OR music.own_document(document_id))));

--
-- Name: POLICY song_document_account ON song_document; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY song_document_account ON music.song_document IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: song_publisher; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.song_publisher ENABLE ROW LEVEL SECURITY;

--
-- Name: song_publisher song_publisher_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY song_publisher_account ON music.song_publisher USING (music.own_song(song_id)) WITH CHECK ((music.own_song(song_id) AND ((organization_id IS NULL) OR music.own_organization(organization_id)) AND ((for_writer_id IS NULL) OR music.own_song_writer(for_writer_id))));

--
-- Name: POLICY song_publisher_account ON song_publisher; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY song_publisher_account ON music.song_publisher IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: song_registration; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.song_registration ENABLE ROW LEVEL SECURITY;

--
-- Name: song_registration song_registration_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY song_registration_account ON music.song_registration USING (music.own_song(song_id)) WITH CHECK (music.own_song(song_id));

--
-- Name: POLICY song_registration_account ON song_registration; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY song_registration_account ON music.song_registration IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: song_title; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.song_title ENABLE ROW LEVEL SECURITY;

--
-- Name: song_title song_title_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY song_title_account ON music.song_title USING (music.own_song(song_id)) WITH CHECK (music.own_song(song_id));

--
-- Name: POLICY song_title_account ON song_title; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY song_title_account ON music.song_title IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: song_writer; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.song_writer ENABLE ROW LEVEL SECURITY;

--
-- Name: song_writer song_writer_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY song_writer_account ON music.song_writer USING (music.own_song(song_id)) WITH CHECK ((music.own_song(song_id) AND ((contact_id IS NULL) OR music.own_contact(contact_id))));

--
-- Name: POLICY song_writer_account ON song_writer; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY song_writer_account ON music.song_writer IS 'Visible through its parent row''s account; on write, every linked record must be in the same account.';

--
-- Name: user_account; Type: ROW SECURITY; Schema: music; Owner: -
--

ALTER TABLE music.user_account ENABLE ROW LEVEL SECURITY;

--
-- Name: user_account user_account_account; Type: POLICY; Schema: music; Owner: -
--

CREATE POLICY user_account_account ON music.user_account USING ((account_id = ( SELECT music.current_account() AS current_account))) WITH CHECK ((account_id = ( SELECT music.current_account() AS current_account)));

--
-- Name: POLICY user_account_account ON user_account; Type: COMMENT; Schema: music; Owner: -
--

COMMENT ON POLICY user_account_account ON music.user_account IS 'Limits every role without its own policy to rows of the account in the request token.';

--
-- Name: SCHEMA api; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA api TO app_user;
GRANT USAGE ON SCHEMA api TO web_anon;

--
-- Name: SCHEMA music; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA music TO app_user;
GRANT USAGE ON SCHEMA music TO mamupload;

--
-- Name: FUNCTION account_storage_write(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.account_storage_write() TO app_user;

--
-- Name: FUNCTION artist_write(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.artist_write() TO app_user;

--
-- Name: FUNCTION contact_write(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.contact_write() TO app_user;

--
-- Name: FUNCTION document_orphan_delete(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.document_orphan_delete() TO app_user;

--
-- Name: FUNCTION document_write(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.document_write() TO app_user;

--
-- Name: FUNCTION login(email text, pass text); Type: ACL; Schema: api; Owner: -
--

REVOKE ALL ON FUNCTION api.login(email text, pass text) FROM PUBLIC;
GRANT ALL ON FUNCTION api.login(email text, pass text) TO web_anon;

--
-- Name: FUNCTION organization_write(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.organization_write() TO app_user;

--
-- Name: FUNCTION recording_write(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.recording_write() TO app_user;

--
-- Name: FUNCTION release_write(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.release_write() TO app_user;

--
-- Name: FUNCTION set_storage_secret(secret text); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.set_storage_secret(secret text) TO app_user;

--
-- Name: FUNCTION song_write(); Type: ACL; Schema: api; Owner: -
--

GRANT ALL ON FUNCTION api.song_write() TO app_user;

--
-- Name: FUNCTION current_account(); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.current_account() TO app_user;

--
-- Name: FUNCTION default_audio_file_type(p_format text); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.default_audio_file_type(p_format text) TO app_user;

--
-- Name: FUNCTION documents_of(p_table text, p_col text, p_parent integer); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.documents_of(p_table text, p_col text, p_parent integer) TO app_user;

--
-- Name: FUNCTION gtin_valid(p text); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.gtin_valid(p text) TO app_user;

--
-- Name: FUNCTION recording_one_stop_reason(p_recording integer); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.recording_one_stop_reason(p_recording integer) TO app_user;

--
-- Name: FUNCTION recording_pitch_comment_auto(p_recording integer, p_limit integer); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.recording_pitch_comment_auto(p_recording integer, p_limit integer) TO app_user;

--
-- Name: FUNCTION recording_pitch_contact(p_recording integer); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.recording_pitch_contact(p_recording integer) TO app_user;

--
-- Name: FUNCTION release_status(p_release integer); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.release_status(p_release integer) TO app_user;

--
-- Name: FUNCTION song_controlled_share(p_song integer); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.song_controlled_share(p_song integer) TO app_user;

--
-- Name: FUNCTION song_one_stop_reason(p_song integer); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.song_one_stop_reason(p_song integer) TO app_user;

--
-- Name: FUNCTION sync_documents(p_table text, p_col text, p_parent integer, p_docs jsonb); Type: ACL; Schema: music; Owner: -
--

GRANT ALL ON FUNCTION music.sync_documents(p_table text, p_col text, p_parent integer, p_docs jsonb) TO app_user;

--
-- Name: TABLE account_storage; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.account_storage TO app_user;
GRANT SELECT ON TABLE music.account_storage TO mamupload;

--
-- Name: COLUMN account_storage.account_id; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.kind; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.endpoint; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.region; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.bucket; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.base_path; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.public_base_url; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.notes; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.created_at; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN account_storage.updated_at; Type: ACL; Schema: music; Owner: -
--

--
-- Name: TABLE account_storage; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.account_storage TO app_user;

--
-- Name: TABLE artist; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.artist TO app_user;

--
-- Name: TABLE artist_member; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.artist_member TO app_user;

--
-- Name: TABLE contact; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.contact TO app_user;

--
-- Name: TABLE artist; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.artist TO app_user;

--
-- Name: TABLE artist_member; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.artist_member TO app_user;

--
-- Name: TABLE asset_status; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.asset_status TO app_user;

--
-- Name: TABLE asset_status; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.asset_status TO app_user;

--
-- Name: TABLE audio_file_type; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.audio_file_type TO app_user;

--
-- Name: TABLE audio_file_type; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.audio_file_type TO app_user;

--
-- Name: TABLE contact_email; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.contact_email TO app_user;

--
-- Name: TABLE contact_organization; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.contact_organization TO app_user;

--
-- Name: TABLE contact_phone; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.contact_phone TO app_user;

--
-- Name: TABLE contact; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.contact TO app_user;

--
-- Name: TABLE contact_email; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.contact_email TO app_user;

--
-- Name: TABLE contact_organization; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.contact_organization TO app_user;

--
-- Name: TABLE contact_phone; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.contact_phone TO app_user;

--
-- Name: TABLE country; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT ON TABLE music.country TO app_user;

--
-- Name: TABLE country; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.country TO app_user;

--
-- Name: TABLE contact_document; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.contact_document TO app_user;

--
-- Name: TABLE document; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.document TO app_user;
GRANT SELECT ON TABLE music.document TO mamupload;

--
-- Name: TABLE organization_document; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.organization_document TO app_user;

--
-- Name: TABLE recording_document; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_document TO app_user;

--
-- Name: TABLE song_document; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.song_document TO app_user;

--
-- Name: TABLE document; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.document TO app_user;

--
-- Name: TABLE document_type; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.document_type TO app_user;

--
-- Name: TABLE document_expiring; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.document_expiring TO app_user;

--
-- Name: TABLE release_document; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.release_document TO app_user;

--
-- Name: TABLE document_orphan; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,DELETE ON TABLE api.document_orphan TO app_user;

--
-- Name: TABLE document_type; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.document_type TO app_user;

--
-- Name: TABLE document_usage; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.document_usage TO app_user;

--
-- Name: TABLE email_duplicate; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.email_duplicate TO app_user;

--
-- Name: TABLE genre; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.genre TO app_user;

--
-- Name: TABLE genre; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.genre TO app_user;

--
-- Name: TABLE instrument; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.instrument TO app_user;

--
-- Name: TABLE instrument; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.instrument TO app_user;

--
-- Name: TABLE key_signature; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT ON TABLE music.key_signature TO app_user;

--
-- Name: TABLE key_signature; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.key_signature TO app_user;

--
-- Name: TABLE language; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.language TO app_user;

--
-- Name: TABLE language; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.language TO app_user;

--
-- Name: TABLE mood; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE music.mood TO app_user;

--
-- Name: TABLE mood; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE api.mood TO app_user;

--
-- Name: TABLE organization; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.organization TO app_user;

--
-- Name: TABLE organization; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.organization TO app_user;

--
-- Name: TABLE pitch_setting; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE music.pitch_setting TO app_user;

--
-- Name: TABLE pitch_setting; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE api.pitch_setting TO app_user;

--
-- Name: TABLE pro; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT ON TABLE music.pro TO app_user;

--
-- Name: TABLE pro; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.pro TO app_user;

--
-- Name: TABLE pro_territory; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT ON TABLE music.pro_territory TO app_user;

--
-- Name: TABLE pro_territory; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.pro_territory TO app_user;

--
-- Name: TABLE audio_file; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.audio_file TO app_user;
GRANT SELECT ON TABLE music.audio_file TO mamupload;

--
-- Name: TABLE recording; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording TO app_user;
GRANT SELECT ON TABLE music.recording TO mamupload;

--
-- Name: TABLE recording_artist; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_artist TO app_user;

--
-- Name: TABLE recording_credit; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_credit TO app_user;

--
-- Name: TABLE recording_credit_instrument; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_credit_instrument TO app_user;

--
-- Name: TABLE recording_credit_role; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_credit_role TO app_user;

--
-- Name: TABLE recording_genre; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_genre TO app_user;

--
-- Name: TABLE recording_mood; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_mood TO app_user;

--
-- Name: TABLE recording_owner; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_owner TO app_user;

--
-- Name: TABLE recording_representation; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_representation TO app_user;

--
-- Name: TABLE recording_song; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.recording_song TO app_user;

--
-- Name: TABLE recording; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.recording TO app_user;

--
-- Name: TABLE song; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.song TO app_user;

--
-- Name: TABLE song_writer; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.song_writer TO app_user;

--
-- Name: TABLE recording_cover; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.recording_cover TO app_user;

--
-- Name: TABLE role; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT ON TABLE music.role TO app_user;

--
-- Name: TABLE recording_credit_display; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.recording_credit_display TO app_user;

--
-- Name: TABLE recording_role; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.recording_role TO app_user;

--
-- Name: TABLE release; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.release TO app_user;

--
-- Name: TABLE release_artist; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.release_artist TO app_user;

--
-- Name: TABLE release_distribution; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.release_distribution TO app_user;

--
-- Name: TABLE release_track; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.release_track TO app_user;

--
-- Name: TABLE release; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.release TO app_user;

--
-- Name: TABLE role_group; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT ON TABLE music.role_group TO app_user;

--
-- Name: TABLE role; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.role TO app_user;

--
-- Name: TABLE role_group; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.role_group TO app_user;

--
-- Name: TABLE schema_type; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT ON TABLE music.schema_type TO app_user;

--
-- Name: TABLE vocabulary; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT ON TABLE music.vocabulary TO app_user;

--
-- Name: TABLE schema_type; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.schema_type TO app_user;

--
-- Name: TABLE song_publisher; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.song_publisher TO app_user;

--
-- Name: TABLE song_registration; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.song_registration TO app_user;

--
-- Name: TABLE song_title; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.song_title TO app_user;

--
-- Name: TABLE song; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.song TO app_user;

--
-- Name: TABLE song_split_check; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.song_split_check TO app_user;

--
-- Name: TABLE song_unregistered; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.song_unregistered TO app_user;

--
-- Name: TABLE vocabulary; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT ON TABLE api.vocabulary TO app_user;

--
-- Name: TABLE vocal_type; Type: ACL; Schema: music; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE music.vocal_type TO app_user;

--
-- Name: TABLE vocal_type; Type: ACL; Schema: api; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE api.vocal_type TO app_user;

--
-- Name: TABLE account; Type: ACL; Schema: music; Owner: -
--

--
-- Name: SEQUENCE artist_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.artist_id_seq TO app_user;

--
-- Name: SEQUENCE asset_status_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.asset_status_id_seq TO app_user;

--
-- Name: SEQUENCE audio_file_type_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.audio_file_type_id_seq TO app_user;

--
-- Name: SEQUENCE contact_email_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.contact_email_id_seq TO app_user;

--
-- Name: SEQUENCE contact_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.contact_id_seq TO app_user;

--
-- Name: SEQUENCE contact_phone_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.contact_phone_id_seq TO app_user;

--
-- Name: SEQUENCE document_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.document_id_seq TO app_user;

--
-- Name: SEQUENCE document_type_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.document_type_id_seq TO app_user;

--
-- Name: SEQUENCE genre_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.genre_id_seq TO app_user;

--
-- Name: SEQUENCE instrument_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.instrument_id_seq TO app_user;

--
-- Name: SEQUENCE mood_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.mood_id_seq TO app_user;

--
-- Name: SEQUENCE organization_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.organization_id_seq TO app_user;

--
-- Name: COLUMN user_account.id; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN user_account.account_id; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN user_account.email; Type: ACL; Schema: music; Owner: -
--

--
-- Name: COLUMN user_account.created_at; Type: ACL; Schema: music; Owner: -
--

--
-- Name: SEQUENCE vocal_type_id_seq; Type: ACL; Schema: music; Owner: -
--

GRANT USAGE ON SEQUENCE music.vocal_type_id_seq TO app_user;

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: api; Owner: -
--

--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: music; Owner: -
--

--
-- PostgreSQL database dump complete
--

