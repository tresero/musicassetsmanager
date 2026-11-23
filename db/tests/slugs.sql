-- Record names in the web address (#60): /song/agarra-lo-tuyo.
BEGIN;
\ir setup.psql
SELECT plan(17);

SELECT is((SELECT slug FROM music.song WHERE id = tests.id('a_song')), 'a-song',
          'a song''s address is made from its title');
SELECT is((SELECT slug FROM music.contact WHERE id = tests.id('a_contact')), 'ada-example',
          'a person''s from their name');
SELECT is((SELECT slug FROM music.organization WHERE id = tests.id('a_organization')), 'example-publishing',
          'a company''s from its name');

SELECT tests.sign_in('a');

SELECT lives_ok($$INSERT INTO api.song (title) VALUES ('Lágrimas de amor (Live!)')$$, 'a adds a song');
SELECT is((SELECT slug FROM api.song WHERE title = 'Lágrimas de amor (Live!)'), 'lagrimas-de-amor-live',
          'accents are dropped and punctuation becomes dashes');
SELECT lives_ok($$INSERT INTO api.song (title) VALUES ('Lagrimas de Amor - live')$$, 'a adds a song with the same name');
SELECT is((SELECT slug FROM api.song WHERE title = 'Lagrimas de Amor - live'), 'lagrimas-de-amor-live-2',
          'the second gets -2');
SELECT lives_ok($$INSERT INTO api.song (title) VALUES ('1999')$$, 'a adds a song named with digits only');
SELECT is((SELECT slug FROM api.song WHERE title = '1999'), '1999-song',
          'an address of digits only is not mistaken for a number');

SELECT lives_ok(format($$UPDATE api.recording SET version_label = 'Remix' WHERE id = %s$$, tests.id('a_recording')),
                'a recording is marked as the remix');
SELECT is((SELECT slug FROM api.recording WHERE id = tests.id('a_recording')), 'a-recording-remix',
          'a recording''s address includes its version, unless it is the release');

SELECT lives_ok(format($$UPDATE api.song SET title = 'New Name' WHERE id = %s$$, tests.id('a_song')),
                'a renames its song');
SELECT is(api.find_by_slug('song', 'new-name'), tests.id('a_song'), 'the new address finds it');
SELECT is(api.find_by_slug('song', 'a-song'), tests.id('a_song'), 'the old address still finds it');
SELECT results_eq($$SELECT new_values FROM api.change_log WHERE table_name = 'song' AND op = 'update'$$,
                  $$VALUES ('{"title": "New Name"}'::jsonb)$$,
                  'the change log shows the rename, not the address');

SELECT tests.sign_in('b');
SELECT lives_ok($$INSERT INTO api.song (title) VALUES ('New Name')$$, 'b adds a song with a''s new name');
SELECT is(api.find_by_slug('song', 'new-name'), (SELECT id FROM api.song WHERE title = 'New Name'),
          'b''s address finds b''s own song, never a''s');

SELECT * FROM finish();
ROLLBACK;
