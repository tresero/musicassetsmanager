-- Change history (#78): music.log_change, api.change_log, api.deleted_record.
BEGIN;
\ir setup.psql
SELECT plan(15);

SELECT tests.sign_in('a');

-- A form save that changes nothing leaves nothing.
SELECT lives_ok(format('UPDATE api.song SET title = title WHERE id = %s', tests.id('a_song')),
                'a saves its song unchanged');
SELECT is_empty($$SELECT 1 FROM api.change_log WHERE changed_by = 'a@example.com'$$,
                'an unchanged save is not logged');

-- A changed share is one entry holding only the share.
SELECT lives_ok(format($$UPDATE api.song s
                            SET writers = (SELECT jsonb_agg(x || '{"share": 60}')
                                             FROM jsonb_array_elements(s.writers) x)
                          WHERE id = %s$$, tests.id('a_song')),
                'a changes a writer share');
SELECT results_eq($$SELECT table_name, row_label, op, old_values, new_values
                      FROM api.change_log WHERE changed_by = 'a@example.com'$$,
                  $$VALUES ('song_writer', 'Ada Example', 'update',
                            '{"share": 100.0000}'::jsonb, '{"share": 60.0000}'::jsonb)$$,
                  'the change is logged with the writer''s name, before and after');

-- Nobody writes the log through the app.
SELECT throws_ok($$INSERT INTO api.change_log (record_type) VALUES ('song')$$, '42501', NULL,
                 'a cannot add to its history through the API');
SELECT throws_ok($$DELETE FROM music.change_log$$, '42501', NULL,
                 'a cannot delete its history');

-- A deleted song is listed with the writer its delete took with it.
SELECT lives_ok(format($$INSERT INTO api.song (title, writers)
                          VALUES ('Gone Song', '[{"contact_id": %s, "role_id": %s, "share": 100}]')$$,
                       tests.id('a_contact'), (SELECT id FROM music.role WHERE ddex_code = 'Composer')),
                'a adds a song with a writer');
SELECT lives_ok($$DELETE FROM api.song WHERE title = 'Gone Song'$$, 'a deletes it');
SELECT results_eq($$SELECT record_label, deleted_by, child_rows->0->>'row_label'
                      FROM api.deleted_record$$,
                  $$VALUES ('Gone Song', 'a@example.com', 'Ada Example')$$,
                  'Deleted records lists the song, who deleted it, and its writer');

-- A fix made outside the app is logged with no user.
SELECT tests.sign_out();
UPDATE music.song SET notes = 'Fixed by hand' WHERE id = tests.id('a_song');
SELECT results_eq($$SELECT changed_by, record_label FROM api.change_log
                     WHERE table_name = 'song' AND op = 'update'$$,
                  $$VALUES ('Outside the app', 'A Song')$$,
                  'a change in SQL is logged as made outside the app');

-- Every table holding a record's rows is logged. Money tables are not.
SELECT is_empty($$
  SELECT c.relname FROM pg_class c
   WHERE c.relnamespace = 'music'::regnamespace AND c.relkind = 'r'
     AND (c.relname IN ('song', 'recording', 'release', 'contact', 'organization', 'artist')
          OR EXISTS (SELECT 1 FROM pg_attribute a
                      WHERE a.attrelid = c.oid AND NOT a.attisdropped
                        AND a.attname IN ('song_id', 'recording_id', 'release_id', 'artist_id',
                                          'credit_id', 'contact_id', 'organization_id')))
     AND c.relname NOT IN ('statement', 'statement_line', 'transaction', 'transaction_split',
                           'transaction_document', 'change_log')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger t
                      WHERE t.tgrelid = c.oid AND t.tgname = 'change_log_delete')$$,
  'every table holding a song''s, recording''s, release''s, person''s, company''s or artist''s rows is logged');

-- Deleting an account works and takes its history with it. Account a's song
-- is on a recording, which blocks the delete until #80 is fixed.
SELECT todo('#80: deleting an account fails when its songs are on recordings', 2);
SELECT lives_ok($$DELETE FROM music.account WHERE id = (SELECT account_id FROM tests.account WHERE key = 'a')$$,
                'account a can be deleted');
SELECT is_empty($$SELECT 1 FROM music.change_log
                   WHERE account_id = (SELECT account_id FROM tests.account WHERE key = 'a')$$,
                'its history went with it');

SELECT lives_ok($$DELETE FROM music.account WHERE id = (SELECT account_id FROM tests.account WHERE key = 'b')$$,
                'account b, with no song on a recording, can be deleted');
SELECT is_empty($$SELECT 1 FROM music.change_log
                   WHERE account_id = (SELECT account_id FROM tests.account WHERE key = 'b')$$,
                'b''s history went with it');

SELECT * FROM finish();
ROLLBACK;
