# Postgres restore

Production uses Postgres. SQLite is only for local development.

1. Take a dump: `pg_dump --format=custom --file=selfx.dump "$DATABASE_URL"`.
2. Create an empty database named `selfx_restore`.
3. Restore into it: `pg_restore --dbname=selfx_restore --clean --if-exists selfx.dump`.
4. Point a scratch `.env` at `selfx_restore` and run `php artisan migrate --force`.
5. Sign in as the platform admin and open one tenant. The tenant's bills must be the bills from the dump.

Do not restore over the database that is serving traffic.
