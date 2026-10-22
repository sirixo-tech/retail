# SelfX Retail

Phase 1 foundation. The API is Laravel. The web apps are Next.js clients.

## Run

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

From `backend/`. Health: `http://127.0.0.1:8000/health/ready`

```bash
pnpm install
pnpm dev
```

From the repo root.

| App | URL |
| --- | --- |
| Marketing | http://127.0.0.1:3000 |
| Admin | http://127.0.0.1:3001 |
| Store console | http://127.0.0.1:3002 |
| Point of sale | http://127.0.0.1:3002/pos |
| Shop | http://127.0.0.1:3003 |

Postgres, Redis, Typesense, and Mailpit:

```bash
docker compose up -d
```

Local ready checks only require the database until `HEALTH_REQUIRED` is set to `database,redis,typesense,storage,queue`.
