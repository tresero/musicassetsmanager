-- Each user's own mail settings, for email sent from the app (#70).
BEGIN;
\ir setup.psql
SELECT plan(13);

-- A second user in account a, an Editor.
INSERT INTO music.user_account (id, account_id, email, password_hash, role_id)
VALUES ('00000000-0000-7000-8000-0000000000a3', (SELECT account_id FROM tests.account WHERE key = 'a'),
        'a-editor@example.com', 'not a hash', (SELECT id FROM music.account_role WHERE name = 'Editor'));
INSERT INTO tests.account VALUES ('a2', (SELECT account_id FROM tests.account WHERE key = 'a'), '00000000-0000-7000-8000-0000000000a3');

SELECT tests.sign_in('a');
SELECT lives_ok($$INSERT INTO api.user_mail (from_name, from_address, smtp_host, smtp_port, smtp_security, smtp_username)
                  VALUES ('Ada Example', 'ada@example.com', 'smtp.example.com', 587, 'starttls', 'ada@example.com')$$,
                'a user saves their mail settings');
SELECT lives_ok($$SELECT api.set_mail_password('app-password-1')$$, 'and their password');
SELECT results_eq($$SELECT from_address::text, smtp_host, password_set FROM api.user_mail$$,
                  $$VALUES ('ada@example.com', 'smtp.example.com', true)$$,
                  'the settings show the password is set, not the password');
SELECT throws_ok($$SELECT smtp_password FROM music.user_mail$$, '42501', NULL,
                 'the password cannot be read back, even from the table');
SELECT throws_ok($$INSERT INTO api.user_mail (from_address, smtp_host, smtp_port, smtp_security, smtp_username)
                   VALUES ('x@example.com', 'smtp.example.com', 25, 'none', 'x')$$,
                 '23514', NULL, 'mail is only sent over an encrypted connection');
SELECT lives_ok($$SELECT api.set_mail_password('')$$, 'clearing the password');
SELECT is((SELECT password_set FROM api.user_mail), false, 'leaves it unset');

SELECT tests.sign_in('a2');
SELECT is_empty('SELECT 1 FROM api.user_mail', 'another user in the same account sees none of it');
SELECT lives_ok($$INSERT INTO api.user_mail (from_address, smtp_host, smtp_port, smtp_security, smtp_username)
                  VALUES ('editor@example.com', 'smtp.example.com', 465, 'tls', 'editor@example.com')$$,
                'an Editor saves their own, since settings are not a catalog edit');
SELECT is((SELECT count(*)::int FROM api.user_mail), 1, 'and sees only their own');

SELECT tests.sign_in('b');
SELECT is_empty('SELECT 1 FROM api.mail_sent', 'b sees no mail sent by a');

SELECT tests.sign_out();
SELECT ok(NOT has_column_privilege('claude_ro', 'music.user_mail', 'smtp_password', 'SELECT'),
          'the read-only agent role cannot read passwords');
SELECT ok(has_column_privilege('mamupload', 'music.user_mail', 'smtp_password', 'SELECT')
          AND has_table_privilege('mamupload', 'music.mail_sent', 'INSERT'),
          'the upload service reads the password to send, and logs what it sent');

SELECT * FROM finish();
ROLLBACK;
