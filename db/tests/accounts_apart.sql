-- Accounts kept apart (#33): a second account can neither see nor change
-- the first account's rows, through lists, single records, writes by id,
-- child rows and links, and cannot link to the first account's records.
BEGIN;
\ir setup.psql
SELECT plan(39);

SELECT tests.sign_in('b');

-- Single records
SELECT is_empty(format('SELECT 1 FROM api.%I WHERE id = %s', t, tests.id('a_' || t)),
                format('b cannot open a''s %s by id', t))
  FROM unnest(array['song', 'recording', 'release', 'contact', 'organization',
                    'artist', 'document']) t;

-- Lists
SELECT results_eq('SELECT title FROM api.song', $$VALUES ('B Song')$$,
                  'b lists only its own songs');
SELECT results_eq('SELECT title FROM api.recording', $$VALUES ('B Recording')$$,
                  'b lists only its own recordings');
SELECT results_eq('SELECT title FROM api.release', $$VALUES ('B Release')$$,
                  'b lists only its own releases');
SELECT results_eq('SELECT display_name FROM api.contact', $$VALUES ('Bea Example')$$,
                  'b lists only its own people');
SELECT is_empty('SELECT 1 FROM api.organization', 'b lists none of a''s companies');
SELECT is_empty('SELECT 1 FROM api.artist', 'b lists none of a''s artists');
SELECT is_empty('SELECT 1 FROM api.document', 'b lists none of a''s documents');
SELECT is_empty('SELECT 1 FROM api.change_log WHERE record_label LIKE ''A %''',
                'b reads none of a''s change history');

-- Child rows, read straight from the tables
SELECT is_empty(format('SELECT 1 FROM music.%I', t), format('b sees none of a''s %s rows', t))
  FROM unnest(array['song_writer', 'song_document', 'recording_song', 'recording_credit',
                    'release_track']) t;

-- Writes by id
SELECT is_empty(format('UPDATE api.song SET title = ''Taken'' WHERE id = %s RETURNING id',
                       tests.id('a_song')),
                'b cannot rename a''s song');
SELECT is_empty(format('DELETE FROM api.recording WHERE id = %s RETURNING id',
                       tests.id('a_recording')),
                'b cannot delete a''s recording');
SELECT is_empty(format('UPDATE api.contact SET first_name = ''Taken'' WHERE id = %s RETURNING id',
                       tests.id('a_contact')),
                'b cannot change a''s person');
SELECT is_empty(format('UPDATE music.song_writer SET share = 1 WHERE id = %s RETURNING id',
                       tests.id('a_writer')),
                'b cannot change a''s writer row');
SELECT is_empty(format('DELETE FROM music.release_track WHERE id = %s RETURNING id',
                       tests.id('a_track')),
                'b cannot delete a''s track row');
SELECT lives_ok(format($$UPDATE api.song
                            SET writers = '[{"id": %s, "contact_id": %s, "role_id": %s, "share": 1}]'
                          WHERE id = %s$$,
                       tests.id('a_writer'), tests.id('b_contact'),
                       (SELECT id FROM music.role WHERE ddex_code = 'Composer'),
                       tests.id('b_song')),
                'b saving its own song with a''s writer id goes through');

-- Links to a's records
SELECT throws_ok(format($$INSERT INTO api.song (title, writers)
                          VALUES ('Linked', '[{"contact_id": %s, "role_id": %s, "share": 100}]')$$,
                        tests.id('a_contact'),
                        (SELECT id FROM music.role WHERE ddex_code = 'Composer')),
                 '42501', NULL, 'b cannot make a''s person a writer');
SELECT throws_ok(format($$UPDATE api.recording SET songs = '[{"song_id": %s}]' WHERE id = %s$$,
                        tests.id('a_song'), tests.id('b_recording')),
                 '42501', NULL, 'b cannot link a''s song to its recording');
SELECT throws_ok(format($$UPDATE api.recording SET credits = '[{"contact_id": %s}]' WHERE id = %s$$,
                        tests.id('a_contact'), tests.id('b_recording')),
                 '42501', NULL, 'b cannot credit a''s person');
SELECT throws_ok(format($$UPDATE api.recording SET owners = '[{"organization_id": %s, "share": 100}]' WHERE id = %s$$,
                        tests.id('a_organization'), tests.id('b_recording')),
                 '42501', NULL, 'b cannot make a''s company a master owner');
SELECT throws_ok(format($$UPDATE api.release
                            SET tracks = '[{"recording_id": %s, "disc_number": 1, "track_number": 1}]'
                          WHERE id = %s$$,
                        tests.id('a_recording'), tests.id('b_release')),
                 '42501', NULL, 'b cannot put a''s recording on its release');
SELECT throws_ok(format($$UPDATE api.release SET artists = '[{"artist_id": %s, "role": "main", "sequence": 1}]' WHERE id = %s$$,
                        tests.id('a_artist'), tests.id('b_release')),
                 '42501', NULL, 'b cannot bill a''s artist');
SELECT throws_ok(format($$UPDATE api.song SET documents = '[{"id": %s, "title": "Taken"}]' WHERE id = %s$$,
                        tests.id('a_document'), tests.id('b_song')),
                 '42501', NULL, 'b cannot attach a''s document');

-- What really happened, seen past row security
SELECT tests.sign_out();
SELECT is((SELECT title FROM music.song WHERE id = tests.id('a_song')), 'A Song',
          'a''s song keeps its title');
SELECT isnt_empty(format('SELECT 1 FROM music.recording WHERE id = %s', tests.id('a_recording')),
                  'a''s recording is still there');
SELECT is((SELECT first_name FROM music.contact WHERE id = tests.id('a_contact')), 'Ada',
          'a''s person keeps their name');
SELECT is((SELECT (song_id, share)::text FROM music.song_writer WHERE id = tests.id('a_writer')),
          (tests.id('a_song'), 100.0000)::text,
          'a''s writer row is unchanged and still on a''s song');
SELECT isnt_empty(format('SELECT 1 FROM music.release_track WHERE id = %s', tests.id('a_track')),
                  'a''s track row is still there');
SELECT is((SELECT title FROM music.document WHERE id = tests.id('a_document')), 'A Split Sheet',
          'a''s document keeps its title');

SELECT * FROM finish();
ROLLBACK;
