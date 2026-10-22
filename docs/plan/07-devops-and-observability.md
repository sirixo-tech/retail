# 07 — Devops and observability

Phase 1 hosting recommendation: **AWS ap-south-1**, managed Postgres and Redis, S3, CloudFront, and a small compute footprint. Boring on purpose. A cheaper VPS outside India fights the residency decision in [06-security-and-compliance.md](./06-security-and-compliance.md). The domain is not fixed; placeholder `APP_DOMAIN` is `retail.selfx.in` (OQ-04).

Laravel Forge is acceptable as the deploy click-path onto EC2 **if** the network, RDS, Redis, S3, and IAM are still Terraform. Click-ops for the database is not acceptable.

## 1. Environments

| | local | dev | staging | production |
| --- | --- | --- | --- | --- |
| Data | compose, seed | synthetic, reset weekly | masked or synthetic | real |
| Gateways | fake driver | test mode | test mode | live |
| Domain | `retail.selfx.test` | `dev.retail.selfx.in` placeholder | `staging.retail.selfx.in` | `APP_DOMAIN` (`retail.selfx.in` until replaced) |
| Debug | on | off | off | off |
| RLS role | `app_user` | `app_user` | `app_user` | `app_user` |
| Mail | Mailpit | Mailpit or a sink | sink | real provider |
| Scale | one process | one | one, prod-like | two app instances minimum |

`APP_ENV` values: `local`, `dev`, `staging`, `production`.

Feature flags: Laravel Pennant, stored in `features` is the wrong table — Pennant uses its own `features` table by default and will collide with the plan `features` table. Configure Pennant to use table `pennant_features`. Flags are for incomplete UI, not for plan entitlements. Entitlements stay in Plans.

## 2. Local

`compose.yaml` at the repo root:

- `postgres:16` with schemas created by migrations
- `redis:7`
- `typesense/typesense` current stable
- `mailpit`
- `axllent/mailpit` is the image name to verify at kickoff

PHP via the host or a `backend` container. Next.js via `pnpm dev` through Turborepo. Caddyfile for `*.retail.selfx.test` and `*.shop.retail.selfx.test` proxying `/api` and `/broadcasting`. The print agent runs on the developer machine and is not part of compose.

dnsmasq and mkcert are documented in the future README, not here as a tutorial. `/etc/hosts` is not sufficient.

## 3. CI/CD

GitHub Actions. One workflow file conceptually, jobs in parallel:

| Job | Steps |
| --- | --- |
| `backend` | `composer install`, Pint, Larastan, Deptrac, `composer audit`, Pest |
| `openapi` | `php artisan scramble:export`, generate TS client, fail if git dirty |
| `frontend` | pnpm install, typecheck, ESLint, Vitest |
| `e2e` | Playwright against staging or a compose stack, on main and release branches |

Pull requests run backend, openapi, and frontend. Playwright runs on main and nightly so PRs stay fast. The four vertical-slice tests are in that nightly set and are release blockers.

Deploy:

1. Build one backend image and four frontend images. Tag with git SHA.
2. Run migrations as `migrator` (expand-only on this deploy).
3. Roll app instances. Horizon workers drain and restart.
4. Reverb restarts after workers.
5. Smoke: `/health/ready`, platform login page, one storefront ISR page.

Rollback: redeploy the previous image. If a migration was expand-only, the old code still runs. Contract migrations ship in a later release after the old code is gone. Never roll back by editing applied migration rows.

No production deploy from a laptop.

## 4. Infrastructure

Terraform modules, remote state in an S3 bucket with a lock table:

| Resource | Notes |
| --- | --- |
| VPC | Two AZ. Public ALB, private app, private data |
| ALB | Host rules to the four Next apps and the `/api` proxy target. Idle timeout above webhook latency |
| Compute | ECS on Fargate or two EC2 instances. Phase 1 either is fine; pick ECS if the team already knows it, otherwise Forge + EC2 to move faster. Do not run Kubernetes |
| RDS Postgres 16 | Multi-AZ in production, single-AZ in staging. `app_user` and friends created by a bootstrap SQL, not by the app |
| ElastiCache Redis | One primary, one replica in production. Horizon, cache, Reverb scaling |
| S3 | `selfx-private-{env}`, `selfx-public-{env}` |
| CloudFront | Public images and marketing static |
| Secrets Manager | Env secrets. KMS key for credential envelopes |
| Typesense | Single node on a private instance. Snapshot the data dir nightly. Rebuild from Postgres is the real recovery |
| Reverb | Same image as the API, separate service, Redis pub/sub so a second node works |
| SES | Email, `ap-south-1`. Credentials empty until the account exists |
| MSG91 | SMS and WhatsApp. Same rule |
| ECR | Images |

WAF on the ALB: managed common rules plus a rate-based rule in front of login and OTP. Application rate limits still exist; the WAF is the outer layer.

DNS: Route 53 wildcard `*.{APP_DOMAIN}` and `*.shop.{APP_DOMAIN}` to the ALB. Two ACM certificates.

## 5. Observability

| Signal | Tool |
| --- | --- |
| Exceptions and tracing | Sentry (`sentry/sentry-laravel`, `@sentry/nextjs`) |
| App internals, slow queries, jobs | Laravel Pulse, platform admins only, behind the admin host |
| Logs | JSON to CloudWatch. Fields: `request_id`, `tenant_id`, `user_id`, `route` |
| Metrics | CloudWatch: ALB 5xx, target response time, RDS CPU and connections, Redis memory, Horizon queue depth via a scheduled metric push if CloudWatch agent is awkward — alternatively Pulse alerts |
| Uptime | Better Stack or CloudWatch Synthetics on `/health/ready`, marketing home, and one storefront |
| Product analytics | Not in Phase 1. Do not add a third-party tracker |

Log redaction: `password`, `pin`, `otp`, `authorization`, `cookie`, `credentials`, `pan`.

`X-Request-Id` accepted from the proxy if it is a uuid, otherwise generated. Returned in the envelope.

Health:

- `/health/live` — process up.
- `/health/ready` — Postgres `select 1`, Redis `PING`, Typesense health, S3 head on a known key, Horizon connectivity, oldest unpublished outbox age.

Pulse and Horizon are not public. They are reverse-proxied on `admin.{APP_DOMAIN}/pulse` and `/horizon` with the platform auth middleware.

## 6. Alerting

Page a human (start with email + one chat webhook; a formal on-call tool can wait):

| Alert | Threshold |
| --- | --- |
| Ready check fail | 2 minutes |
| ALB 5xx | > 1% for 5 minutes |
| Queue `critical` wait | > 30 seconds for 5 minutes |
| Outbox lag | > 2 minutes |
| Failed jobs | > 20 in 10 minutes |
| RDS free storage | < 20% |
| Redis memory | > 80% |
| Certificate expiry | 21 days |
| Payment webhook failures | > 10 in 10 minutes |
| Disk on Typesense | > 70% |

Do not page on a single 4xx.

## 7. Runbooks (outline only)

Each runbook, when written at launch, is one page: symptom, how to confirm, what to do, what not to do, who to call.

| Runbook | First checks |
| --- | --- |
| API 5xx | Sentry release, recent deploy, RDS connections, rollback image |
| Queue stalled | Horizon down, Redis full, one poison job, worker count |
| Outbox lag | `outbox` workers, Reverb, a single failing listener |
| Webhook duplicates or misses | `webhook_receipts`, signature failures, provider status page |
| Tenant claims a data leak | Freeze deploys, identify route, run the isolation test, preserve logs, follow the breach note in 06 |
| Bad catalog publish | `catalog.product.rolled_back` via the rollback endpoint, reindex |
| Restore drill | PITR to a throwaway instance, run a read-only sale lookup, record time |
| OTP provider down | Switch `notification_providers` driver, watch `rate_limit` so a retry storm does not pump SMS |
| AI spend spike | `ai_kill_switch`, then usage by tenant |
| Impersonation complaint | `impersonation_sessions` and audit for that window |

## 8. Zero-downtime releases

Follow the expand/contract rule in [02-domain-and-database.md](./02-domain-and-database.md). App instances are stateless. Reverb is stateful only in memory; Redis carries the fan-out so a restart drops sockets, and clients recover with the stream endpoint. Say that in the POS and storefront clients: reconnect is normal.

Scheduler runs on one instance (`onOneServer` with a Redis lock). Do not also add a system cron.

## 9. Cost and scale knobs

Start small: two app tasks, one Horizon task with the queue counts in 01, db.t class or equivalent sized after a staging load test, one Typesense node. Revisit when alerts in §6 fire for a week, not before.

The scale-out table in 01 (replica, catalog database, more Reverb nodes) is the only approved split. No extra microservice in the first launch.
