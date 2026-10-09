CREATE ROLE authenticator LOGIN NOINHERIT;
CREATE ROLE app_user NOLOGIN;
CREATE ROLE web_anon NOLOGIN;
CREATE ROLE mamupload LOGIN;

GRANT app_user TO authenticator;
GRANT web_anon TO authenticator;
