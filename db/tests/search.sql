-- What the song and recording search boxes match, so a faster search
-- (music.song_search_doc, music.recording_search_doc) finds the same records.
BEGIN;
\ir setup.psql
SELECT plan(13);

-- More for a's song and recording to be found by.
INSERT INTO music.song_title (song_id, title, title_type) VALUES (tests.id('a_song'), 'Otro Nombre', 'alternate');
INSERT INTO music.song_registration (song_id, pro_code, work_number)
  VALUES (tests.id('a_song'), (SELECT code FROM music.pro ORDER BY code LIMIT 1), '987654');
INSERT INTO music.song_publisher (song_id, organization_id, role_id, share, controlled)
  VALUES (tests.id('a_song'), tests.id('a_organization'),
          (SELECT id FROM music.role WHERE ddex_code = 'MusicPublisher'), 100, true);
UPDATE music.contact SET credit_name = 'Adita' WHERE id = tests.id('a_contact');
UPDATE music.song SET iswc = 'T0345246801' WHERE id = tests.id('a_song');
UPDATE music.recording SET version_label = 'Remix', keywords = 'tropical', sounds_like = 'Orquesta Ejemplo',
       isrc = 'USABC2400001' WHERE id = tests.id('a_recording');
INSERT INTO music.recording_artist (recording_id, artist_id, role, sequence)
  VALUES (tests.id('a_recording'), tests.id('a_artist'), 'main', 1);
INSERT INTO music.recording_owner (recording_id, organization_id, share, controlled)
  VALUES (tests.id('a_recording'), tests.id('a_organization'), 100, true);

SELECT tests.sign_in('a');

SELECT results_eq(format($$SELECT title FROM api.song t WHERE api.search(t) @@ to_tsquery('api.fold', %L)$$, q),
                  $$VALUES ('A Song')$$, format('a song is found by its %s', what))
  FROM (VALUES ('title', 'song:*'), ('ISWC', 'T0345246801:*'), ('writer', 'ada:* & example:*'),
               ('writer''s credit name', 'adita:*'), ('publisher', 'publishing:*'),
               ('alt title', 'otro:* & nombre:*'), ('work number', '987654:*')) v(what, q);

SELECT results_eq(format($$SELECT title FROM api.recording t WHERE api.search(t) @@ to_tsquery('api.fold', %L)$$, q),
                  $$VALUES ('A Recording')$$, format('a recording is found by its %s', what))
  FROM (VALUES ('version', 'remix:*'), ('ISRC', 'USABC2400001:*'), ('keywords and sounds like', 'tropical:* & orquesta:*'),
               ('artist', 'ada:*'), ('song', 'song:*'), ('master owner', 'publishing:*')) v(what, q);

SELECT * FROM finish();
ROLLBACK;
