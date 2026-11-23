-- Close matches for Lyrics contain (#48): when no lyrics match exactly, the
-- typed words are rewritten to the closest words in the account's lyrics.
BEGIN;
\ir setup.psql
SELECT plan(10);

UPDATE music.song SET lyrics = '<p>Agarra lo tuyo, muévelo corazón</p><p>bajo la luna</p>'
 WHERE id = tests.id('a_song');

SET LOCAL check_function_bodies = off;
-- Rewrite what was typed, then search with it the way the list does.
CREATE FUNCTION tests.found_by(p_typed text) RETURNS SETOF text
  LANGUAGE sql STABLE
AS $$
  SELECT s.title FROM api.song s
   WHERE api.lyrics_search(s) @@ to_tsquery('api.fold', api.lyrics_close_query(p_typed)->>'query')
$$;
GRANT EXECUTE ON FUNCTION tests.found_by(text) TO app_user;

SELECT tests.sign_in('a');


SELECT results_eq(format('SELECT tests.found_by(%L)', typed), $$VALUES ('A Song')$$,
                  format('%s finds the song (%s)', typed, why))
  FROM (VALUES ('agarralo', 'two words run together'),
               ('korazon', 'one letter wrong'),
               ('muebelo', 'one letter wrong, after an accent'),
               ('korazo', 'a typo in the start of a word'),
               ('agarralo tuyo', 'a close word and an exact one')) v(typed, why);

SELECT is(api.lyrics_close_query('korazon')->>'words', 'corazon',
          'it says which words it searched for instead');
SELECT ok(api.lyrics_close_query('xyzzy') IS NULL, 'nothing close gives no rewrite');
SELECT ok(api.lyrics_close_query('lux') IS NULL, 'three letters are not guessed at');
SELECT ok(api.lyrics_close_query('korazon xyzzy') IS NULL,
          'every word typed must have a close match');

SELECT tests.sign_in('b');
SELECT ok(api.lyrics_close_query('korazon') IS NULL,
          'another account''s lyrics are not used for close matches');

SELECT * FROM finish();
ROLLBACK;
