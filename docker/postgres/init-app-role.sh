#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=app_password="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE docuchat_app LOGIN PASSWORD %L', :'app_password') \gexec
GRANT CONNECT ON DATABASE docuextractochat TO docuchat_app;
GRANT USAGE ON SCHEMA public TO docuchat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE docuchat_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO docuchat_app;
ALTER DEFAULT PRIVILEGES FOR ROLE docuchat_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO docuchat_app;
SQL
