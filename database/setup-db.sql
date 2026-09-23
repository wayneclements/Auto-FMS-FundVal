\set ON_ERROR_STOP on

\if :{?database_name}
\else
  \set database_name testops_portal_db
\endif

\if :{?app_user}
\else
  \set app_user testopsdb
\endif

\if :{?app_password}
\else
  \set app_password 'Test@psSQLdb#25'
\endif

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_catalog.pg_roles
  WHERE rolname = :'app_user'
)
\gexec

SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'app_user', :'app_password')
\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'database_name', :'app_user')
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_catalog.pg_database
  WHERE datname = :'database_name'
)
\gexec

\connect :database_name

SELECT format('SET ROLE %I', :'app_user')
\gexec

\ir schema.sql

RESET ROLE;

SELECT format('ALTER ROLE %I SET search_path TO testops_portal, public', :'app_user')
\gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'database_name', :'app_user')
\gexec

SELECT format('GRANT USAGE ON SCHEMA testops_portal TO %I', :'app_user')
\gexec

SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA testops_portal TO %I', :'app_user')
\gexec

SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA testops_portal TO %I', :'app_user')
\gexec
