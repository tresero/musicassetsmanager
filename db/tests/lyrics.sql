-- Lyrics on recordings, and searching lyrics (#48).
BEGIN;
\ir setup.psql
SELECT plan(11);

SELECT tests.sign_in('a');

SELECT lives_ok(format($$UPDATE api.song SET lyrics = '<p>Corazón de <em>palma</em></p>' WHERE id = %s$$,
                       tests.id('a_song')),
                'a song''s lyrics are saved');
SELECT results_eq($$SELECT title FROM api.song s
                     WHERE api.lyrics_search(s) @@ to_tsquery('api.fold', 'corazon:*')$$,
                  $$VALUES ('A Song')$$,
                  'a song is found by a word of its lyrics, without the accent');
SELECT is_empty($$SELECT 1 FROM api.song s
                   WHERE api.lyrics_search(s) @@ to_tsquery('api.fold', 'em:*')$$,
                'the formatting saved with lyrics is not searched');
SELECT is_empty($$SELECT 1 FROM api.song s
                   WHERE api.search(s) @@ to_tsquery('api.fold', 'palma:*')$$,
                'the main song search still leaves lyrics out');

SELECT results_eq($$SELECT title FROM api.recording r
                     WHERE api.lyrics_search(r) @@ to_tsquery('api.fold', 'palma:*')$$,
                  $$VALUES ('A Recording')$$,
                  'a recording with no lyrics of its own is found by its song''s');
SELECT lives_ok(format($$UPDATE api.recording SET lyrics = '<p>Bajo la luna</p>' WHERE id = %s$$,
                       tests.id('a_recording')),
                'a recording''s own lyrics are saved');
SELECT is((SELECT lyrics FROM api.recording WHERE id = tests.id('a_recording')),
          '<p>Bajo la luna</p>', 'the recording returns its own lyrics');
SELECT results_eq($$SELECT title FROM api.recording r
                     WHERE api.lyrics_search(r) @@ to_tsquery('api.fold', 'luna:*')$$,
                  $$VALUES ('A Recording')$$,
                  'a recording is found by its own lyrics');
SELECT is_empty($$SELECT 1 FROM api.recording r
                   WHERE api.lyrics_search(r) @@ to_tsquery('api.fold', 'palma:*')$$,
                'its own lyrics replace the song''s in the search');
SELECT lives_ok(format($$UPDATE api.recording SET lyrics = '<p></p>' WHERE id = %s$$,
                       tests.id('a_recording')),
                'a recording saved with an empty editor');
SELECT is((SELECT lyrics FROM api.recording WHERE id = tests.id('a_recording')), NULL,
          'an empty editor saves no lyrics, so the song''s are used again');

SELECT * FROM finish();
ROLLBACK;
