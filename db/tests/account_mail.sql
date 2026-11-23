-- The account's email sending service (#70): set up by those who edit
-- settings, used by everyone in the account, its password never readable.
BEGIN;
\ir setup.psql
SELECT plan(18);

-- A second user in account a, an Editor, who cannot edit settings.
INSERT INTO music.user_account (id, account_id, email, password_hash, role_id)
VALUES ('00000000-0000-7000-8000-0000000000a3', (SELECT account_id FROM tests.account WHERE key = 'a'),
        'a-editor@example.com', 'not a hash', (SELECT id FROM music.account_role WHERE name = 'Editor'));
INSERT INTO tests.account VALUES ('a2', (SELECT account_id FROM tests.account WHERE key = 'a'), '00000000-0000-7000-8000-0000000000a3');

SELECT tests.sign_in('a2');
SELECT throws_ok($$INSERT INTO api.account_mail (from_address, smtp_host, smtp_username)
                   VALUES ('label@example.com', 'email-smtp.us-east-1.amazonaws.com', 'AKIAEXAMPLE')$$,
                 '42501', NULL, 'an Editor cannot set up the sending service');

SELECT tests.sign_in('a');
SELECT lives_ok($$INSERT INTO api.account_mail (from_name, from_address, smtp_host, smtp_port, smtp_security, smtp_username)
                  VALUES ('Example Label', 'label@example.com', 'email-smtp.us-east-1.amazonaws.com', 587, 'starttls', 'AKIAEXAMPLE')$$,
                'the Owner sets up the sending service');
SELECT lives_ok($$SELECT api.set_account_mail_password('smtp-secret-1')$$, 'and its password');
SELECT results_eq($$SELECT from_address::text, smtp_host, password_set FROM api.account_mail$$,
                  $$VALUES ('label@example.com', 'email-smtp.us-east-1.amazonaws.com', true)$$,
                  'the settings show the password is set, not the password');
SELECT throws_ok($$SELECT smtp_password FROM music.account_mail$$, '42501', NULL,
                 'the password cannot be read back, even from the table');
SELECT throws_ok($$UPDATE api.account_mail SET smtp_security = 'none'$$,
                 '23514', NULL, 'mail is only sent over an encrypted connection');
SELECT throws_ok($$UPDATE api.account_mail SET smtp_host = 'smtp.gmail.com'$$,
                 '23514', NULL, 'a Gmail or Workspace mailbox, which cannot send in bulk, is refused');
SELECT throws_ok($$UPDATE api.account_mail SET smtp_host = 'SMTP.Office365.com'$$,
                 '23514', NULL, 'and so is Microsoft 365');
SELECT throws_ok($$UPDATE api.account_mail SET from_address = 'label@gmail.com'$$,
                 '23514', NULL, 'a personal Gmail address is refused');
SELECT throws_ok($$UPDATE api.account_mail SET from_address = 'label@hotmail.com.mx'$$,
                 '23514', NULL, 'and a country version of one');
SELECT ok(NOT music.personal_mail_domain('ada@mail.example.com') AND NOT music.personal_mail_domain('ada@example.me'),
          'a business domain that only looks like a personal one is not');
SELECT ok(music.personal_mail_domain('Ada@ICloud.com') AND music.personal_mail_domain('ada@proton.me'),
          'whatever its case');

SELECT tests.sign_in('a2');
SELECT results_eq($$SELECT from_address::text, password_set FROM api.account_mail$$,
                  $$VALUES ('label@example.com', true)$$,
                  'an Editor sees the service is set up, to send through it');
SELECT throws_ok($$SELECT api.set_account_mail_password('x')$$, '42501', NULL,
                 'but cannot change its password');

SELECT tests.sign_in('b');
SELECT is_empty('SELECT 1 FROM api.account_mail', 'b sees none of it');
SELECT is_empty('SELECT 1 FROM api.mail_sent', 'nor mail sent by a');

SELECT tests.sign_out();
SELECT ok(NOT has_column_privilege('claude_ro', 'music.account_mail', 'smtp_password', 'SELECT'),
          'the read-only agent role cannot read passwords');
SELECT ok(has_column_privilege('mamupload', 'music.account_mail', 'smtp_password', 'SELECT')
          AND has_table_privilege('mamupload', 'music.mail_sent', 'INSERT'),
          'the upload service reads the password to send, and logs what it sent');

SELECT * FROM finish();
ROLLBACK;
