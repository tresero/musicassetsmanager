-- Stems and multitracks on their own tabs (#43): a recording's files come
-- back in three lists by type, and are saved from all three.
BEGIN;
\ir setup.psql
SELECT plan(11);

SELECT tests.sign_in('a');

SELECT lives_ok(format($$
  UPDATE api.recording SET
    audio_files = '[{"title": "Main", "file_type_id": %s, "storage_kind": "s3", "storage_uri": "audio/aaa.wav", "byte_size": 52000000}]',
    stem_files = '[{"title": "Drums", "file_type_id": %s, "storage_kind": "s3", "storage_uri": "audio/bbb.wav"},
                   {"title": "Bass", "file_type_id": %s, "storage_kind": "s3", "storage_uri": "audio/ccc.wav"}]',
    multitrack_files = '[{"title": "Kick In", "file_type_id": %s, "storage_kind": "s3", "storage_uri": "audio/ddd.wav"}]'
  WHERE id = %s$$,
  (SELECT id FROM music.audio_file_type WHERE name = 'Full Mix'),
  (SELECT id FROM music.audio_file_type WHERE name = 'Stem'),
  (SELECT id FROM music.audio_file_type WHERE name = 'Stem'),
  (SELECT id FROM music.audio_file_type WHERE name = 'Multitrack'),
  tests.id('a_recording')),
  'a saves a mix, two stems and a multitrack');

SELECT is((SELECT jsonb_path_query_array(audio_files, '$[*].title') FROM api.recording WHERE id = tests.id('a_recording')),
          '["Main"]'::jsonb, 'the Audio list has the mix only');
SELECT is((SELECT jsonb_path_query_array(stem_files, '$[*].title') FROM api.recording WHERE id = tests.id('a_recording')),
          '["Bass", "Drums"]'::jsonb, 'the stems are listed by name');
SELECT is((SELECT jsonb_path_query_array(multitrack_files, '$[*].title') FROM api.recording WHERE id = tests.id('a_recording')),
          '["Kick In"]'::jsonb, 'the multitracks have their own list');
SELECT is((SELECT (audio_files->0->>'byte_size')::bigint FROM api.recording WHERE id = tests.id('a_recording')),
          52000000::bigint, 'a file''s size is kept');

SELECT ok((SELECT pitch_comment_auto ~ 'Stems' AND pitch_comment_auto ~ 'Multitracks' AND pitch_comment_auto !~ 'Alts'
             FROM api.recording WHERE id = tests.id('a_recording')),
          'the pitch comment offers stems and multitracks, and a multitrack is not an alternate');

SELECT lives_ok(format($$UPDATE api.recording SET title = 'A Recording' WHERE id = %s$$, tests.id('a_recording')),
                'a saves the recording without sending the stems');
SELECT is((SELECT count(*)::int FROM music.audio_file WHERE recording_id = tests.id('a_recording')), 4,
          'saving another tab keeps every file');

SELECT lives_ok(format($$UPDATE api.recording r SET stem_files = (SELECT jsonb_agg(x) FROM jsonb_array_elements(r.stem_files) x WHERE x->>'title' = 'Bass')
                          WHERE id = %s$$, tests.id('a_recording')),
                'a removes the drums stem');
SELECT is((SELECT string_agg(title, ', ' ORDER BY title) FROM music.audio_file WHERE recording_id = tests.id('a_recording')),
          'Bass, Kick In, Main', 'only that file is gone');

SELECT tests.sign_out();
SELECT ok(has_table_privilege('mamupload', 'music.audio_file_type', 'SELECT'),
          'the upload service can read the file types, to build a zip of the stems');

SELECT * FROM finish();
ROLLBACK;
