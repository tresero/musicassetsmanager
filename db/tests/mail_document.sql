-- Emailing a document (#70): who is suggested as a recipient, and which
-- records a sent email shows on.
BEGIN;
\ir setup.psql
SELECT plan(11);

INSERT INTO music.contact_email (contact_id, email, is_primary)
VALUES (tests.id('a_contact'), 'ada@example.com', true);
INSERT INTO music.contact_email (contact_id, email, retired_at)
VALUES (tests.id('a_contact'), 'ada-old@example.com', now());
INSERT INTO music.contact_email (organization_id, email, is_primary)
VALUES (tests.id('a_organization'), 'office@example.com', true);
INSERT INTO music.contact_organization (contact_id, organization_id, title)
VALUES (tests.id('a_contact'), tests.id('a_organization'), 'Manager');
INSERT INTO music.song_publisher (song_id, organization_id, role_id, share, controlled)
VALUES (tests.id('a_song'), tests.id('a_organization'),
        (SELECT id FROM music.role WHERE ddex_code = 'MusicPublisher'), 100, true);
INSERT INTO music.recording_owner (recording_id, organization_id, share, controlled)
VALUES (tests.id('a_recording'), tests.id('a_organization'), 100, true);

SELECT tests.sign_in('a');
SELECT results_eq(
  format($$SELECT email::text, why FROM api.mail_recipients('song', %s) ORDER BY email$$, tests.id('a_song')),
  $$VALUES ('ada@example.com', 'Writer'), ('office@example.com', 'Publisher')$$,
  'a song suggests its writers and publishers, without retired addresses');
SELECT results_eq(
  format($$SELECT email::text, why FROM api.mail_recipients('recording', %s) ORDER BY email$$, tests.id('a_recording')),
  $$VALUES ('ada@example.com', 'Credit'), ('office@example.com', 'Master owner')$$,
  'a recording suggests its credits and master owners');
SELECT results_eq(
  format($$SELECT email::text, why FROM api.mail_recipients('release', %s) ORDER BY email$$, tests.id('a_release')),
  $$VALUES ('office@example.com', 'Master owner')$$,
  'a release suggests the master owners of its tracks');
SELECT results_eq(
  format($$SELECT email::text, why FROM api.mail_recipients('organization', %s) ORDER BY email$$, tests.id('a_organization')),
  $$VALUES ('ada@example.com', 'Manager'), ('office@example.com', 'Example Publishing')$$,
  'a company suggests its own address and its people');
SELECT results_eq(
  format($$SELECT email::text, why FROM api.mail_recipients('document', %s) ORDER BY email$$, tests.id('a_document')),
  $$VALUES ('ada@example.com', 'Writer'), ('office@example.com', 'Publisher')$$,
  'a document suggests the people on the records it is attached to');
SELECT results_eq(
  format($$SELECT name FROM api.mail_recipients('contact', %s)$$, tests.id('a_contact')),
  $$VALUES ('Ada Example')$$,
  'a person suggests their own address, under their name');

SELECT tests.sign_in('b');
SELECT is_empty(format($$SELECT 1 FROM api.mail_recipients('song', %s)$$, tests.id('a_song')),
                'another account is suggested no one from it');

SELECT tests.sign_out();
INSERT INTO music.mail_sent (account_id, user_id, from_address, to_addresses, recipients, subject,
                             record_type, record_id, attachments)
SELECT account_id, user_id, 'a@example.com', '{"Example Publishing <office@example.com>"}',
       '{office@example.com}', 'Split sheet', 'song', tests.id('a_song'),
       jsonb_build_array(jsonb_build_object('id', tests.id('a_document'), 'name', 'split.pdf', 'bytes', 10))
  FROM tests.account WHERE key = 'a';

SELECT tests.sign_in('a');
SELECT is((SELECT count(*)::int FROM api.mail_sent WHERE about @> ARRAY['song:' || tests.id('a_song')]), 1,
          'a sent email shows on the record it was sent from');
SELECT is((SELECT count(*)::int FROM api.mail_sent WHERE about @> ARRAY['organization:' || tests.id('a_organization')]), 1,
          'on the company it was sent to');
SELECT is((SELECT count(*)::int FROM api.mail_sent WHERE about @> ARRAY['document:' || tests.id('a_document')]), 1,
          'and on the document it attached');

SELECT tests.sign_out();
SELECT throws_ok(format($$INSERT INTO music.mail_sent (account_id, from_address, to_addresses, subject, record_type)
                          VALUES (%L, 'a@example.com', '{x@example.com}', 'x', 'bogus')$$,
                        (SELECT account_id FROM tests.account WHERE key = 'a')),
                 '23514', NULL, 'an email is about a known kind of record');

SELECT * FROM finish();
ROLLBACK;
