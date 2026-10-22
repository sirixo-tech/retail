# 06 — Security and compliance

Controls are written so an implementer can test them. This is an OWASP ASVS-oriented baseline for a multi-tenant retail API, not a certification claim. Threats come first.

Related: tenancy in [01-architecture.md](./01-architecture.md), tables in [02-domain-and-database.md](./02-domain-and-database.md).

## 1. Assets

| Asset | Why it matters |
| --- | --- |
| Tenant business data, customer PII, khata | Cross-tenant leak is the worst bug |
| Invoice and payment records | Tax and fraud |
| Gateway and AI ciphertext | Direct money and provider spend |
| Catalog master | Poisoned barcodes hit every tenant |
| Staff sessions, impersonation | Full store takeover |
| OTP channel | Account takeover and SMS pumping cost |

## 2. Threat model

| ID | Threat | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| T1 | Cross-tenant read or write via missing scope, IDOR, or search filter | High if untreated | Severe | RLS + global scope + host-derived tenant + leak tests |
| T2 | Forged or replayed payment webhook | High | Severe | Signature, timestamp, unique `provider_event_id`, amount check |
| T3 | Stolen gateway or AI key from DB, logs, or API responses | Medium | Severe | KMS envelope, redaction, resources never return ciphertext |
| T4 | Cashier price override or void fraud | High | High | Permission, reason, audit, shift report |
| T5 | OTP brute force and SMS pumping | High | High | Hash, attempts, cooldowns, IP and phone caps, no OTP in logs |
| T6 | Impersonation abuse by platform staff | Medium | High | Reason, short TTL, deny-list, dual id in audit |
| T7 | AI prompt injection pulling another tenant's data | Medium | Severe | Tools not SQL, server-set tenant filter, allow-list |
| T8 | Catalog poisoning via submission or bad import | Medium | High | Tenants cannot publish; review queue; check digit |
| T9 | Session cookie on a parent domain | Medium | Severe | Host-only cookies, same-origin proxy (ADR-004) |
| T10 | IDOR on receipts, invoices, order tracking | High | High | RLS and ownership checks; unguessable ids are not enough |
| T11 | Custom role privilege escalation | Medium | High | Permission allow-list; a role cannot grant a permission the actor lacks |
| T12 | Malware in app binaries or image uploads | Medium | High | Scanner hook, mime allow-list, no SVG |
| T13 | App connected as a superuser, RLS skipped | Medium | Severe | `app_user` lacks BYPASSRLS; reviewed grants |
| T14 | Webhook SSRF from tenant endpoint URL | Medium | High | Block link-local and private IP ranges; HTTPS only |
| T15 | Public API key leaked | Medium | High | Hashed secret, prefix only stored in UI, revoke, rate limit |

## 3. ASVS-mapped controls

Implementation targets ASVS 4.0 chapters that match this product. Level target: L2, plus the tenancy items which ASVS does not name directly.

| Area | Control |
| --- | --- |
| Architecture | Modular monolith, Deptrac, one public API, no debug routes in production |
| Authentication | Argon2id, TOTP for platform and owners, lockout, session revoke, PIN separate from password |
| Session | Host-only cookie, `Secure`, `HttpOnly`, `SameSite=Lax`, idle timeouts in 01 |
| Access control | Policies on every mutation, entitlement middleware, deny by default |
| Validation | Form requests, GTIN check, money as integers, state machine allow-list |
| Stored crypto | KMS data keys for gateway, AI, webhook secrets, TOTP seeds. TLS in transit |
| Error handling | Envelope with `request_id`. No SQL or stack traces to clients. Sentry server-side |
| Data protection | RLS, field deny-list in audit, log redaction |
| Communications | Signature on inbound and outbound webhooks, 5 minute tolerance |
| Malicious code | CI dependency review, file scanner, no dynamic PHP eval |
| Configuration | Secrets not in git, debug off, `APP_DEBUG=false` in staging and production |
| Logging | Structured logs, audit for security events listed below |

Security events that must hit `audit_logs`: login failure lock, password change, 2FA enable/disable, impersonation start/stop, role change, gateway credential change, API key create/revoke, price override, void, refund, plan override, catalog publish, kill switch.

## 4. Secrets

| Secret | Where |
| --- | --- |
| `APP_KEY`, DB password, Redis password, Typesense API key | Secrets manager. Injected as env. Not in images |
| Gateway, AI, SMS, WhatsApp credentials | Ciphertext in Postgres, data key from KMS (AWS KMS in the recommended host) |
| OTP pepper | Secrets manager, separate from `APP_KEY` |
| Webhook signing secrets | Ciphertext, shown once |
| API key raw value | Shown once, only SHA-256 stored |
| Customer OTP | HMAC stored, raw exists only in the SMS body |

Rotation: KMS key rotation is annual and does not rewrite rows (envelope encryption). `APP_KEY` rotation is a planned maintenance window because Laravel's encrypter is not the credential store. Compromised gateway key: write a new ciphertext, revoke at the provider, audit the event.

Local dev uses a documented fake key and `mode=test`. A test blocks booting production if `APP_KEY` is the example value or if a gateway row is `live` while `APP_ENV` is not `production`.

## 5. Encryption

- TLS everywhere, including local via mkcert.
- Postgres and Redis encrypted at rest by the platform (RDS, ElastiCache).
- S3 SSE-KMS on the private bucket (app binaries, invoice PDFs, exports). Public product images can be SSE-S3 on a separate bucket with a CloudFront origin.
- Backups encrypted.
- No application-level encryption of ordinary columns (names, prices). It breaks search and RLS for little gain.

## 6. Privacy — India DPDP

Assumption, now the product rule (OQ-11): SelfX is a data fiduciary for platform accounts and billing, and a data processor for tenant customer data. The tenant is the fiduciary for its shoppers. The DPA is a legal document, not a code task. The split below is what the code enforces. Privacy contact is `platform_settings.privacy_email`.

| Principle | Product behaviour |
| --- | --- |
| Purpose | OTP and receipts are transactional. Marketing SMS requires `customers.marketing_opt_in` default false. Add that boolean on `customers` |
| Storage | Production data in an Indian region |
| Minimisation | AI prompts strip phone, email, GSTIN. Logs do the same |
| Retention | Invoices and credit notes 8 years (GST record practice; confirm with counsel). Audit 8 years for financial actions, 2 years for logins. OTP challenges 24 hours. Idempotency keys 7 days. Soft-deleted tenants: operational data purge after 90 days except invoices |
| Access and correction | Customer account screen edits name and addresses. Staff export via `POST /exports` |
| Erasure | Customer can request account deletion. Job anonymises `customers` PII, keeps invoice snapshots (legal hold) and breaks the `user_id` link. Document this in the privacy page |
| Children | No date of birth. Do not market the service as an account for children. Storefront accounts are phone accounts held by the buyer |
| Breach | Runbook in 07: contain, identify tenants affected, notify per counsel's reading of DPDP timelines |

Add `customers.marketing_opt_in boolean not null default false` and `customers.erasure_requested_at`.

Cookie banner: first-party session cookies are strictly necessary. No third-party ad pixels in Phase 1. Do not add one in the marketing site without a new decision.

## 7. Application controls worth specifying

- CORS: not used for the browser apps (same origin). `api.{APP_DOMAIN}` allows no browser origin except later native schemes, which do not use CORS the same way. Default `allowed_origins` empty.
- CSRF: Sanctum for cookie sessions. API key and PAT routes are CSRF-exempt and cannot use cookies.
- Mass assignment: DTOs, not `$request->all()` into models.
- File upload: size cap 10 MB images, 200 MB app binaries, mime sniff, random key, no user-controlled path.
- SSRF: webhook URLs resolved and rejected if they are private, loopback, or link-local. Re-check on each delivery in case of DNS rebinding (resolve then connect to the pinned IP, or reject hosts that resolve to private ranges at send time). Catalog source URLs are an allow-list per driver, not a tenant-entered URL. Printer hosts are stored for the agent and are never dialed by Laravel.
- Print agent: binds `127.0.0.1` only, origin allow-list, pairing code, device token. The binary is signed and checksummed like any other app release. Template blocks are schema-validated. Email HTML from templates is sanitized. No raw ESC/POS bytes from the client.
- Rate limits: 03.
- Dependencies: `composer audit` and `pnpm audit` in CI, high severity fails.
- Headers: `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, frame deny on admin and console, frame same-origin not required on storefront. HSTS on production.
- Content Security Policy: no inline scripts. Next.js nonce-based CSP. Report-only for one staging week, then enforce.
- SQL: parameter binding only. AI has no SQL tool. Reporting uses query objects written by engineers.
- Public receipt links: if a sale needs a customer link, use a random 128-bit token with expiry, not the uuid alone. Add `receipts.public_token_hash` when that send path is built (M14).

## 8. Tenancy test requirements

These are release blockers, owned by [08-testing-and-quality.md](./08-testing-and-quality.md):

- For every tenant-owned API resource, a test authenticates as tenant A and requests tenant B's id, expecting 404.
- A test drops the global scope on purpose in a query and still gets zero rows under `app_user` (RLS).
- Typesense query for store items includes `tenant_id` and `store_id`. A code review rule and a test on the search action.
- Queue worker test: a job for tenant A cannot read tenant B even if the payload is edited.
- Platform `BYPASSRLS` connection is not the default in `phpunit.xml` or the web env.

## 9. PCI

Card data is entered on the gateway's page or SDK. SelfX stores provider references and amounts. Target SAQ-A. If someone later proposes storing PAN "just for retries", the answer is no and the design goes back to the adapter.

UPI references and last-four, if a gateway returns them, may be stored on `payment_transactions.provider_payload` after a deny-list strips anything that looks like a full PAN.

## 10. Backup and recovery

| Item | Target |
| --- | --- |
| RDS automated backups | 35 days production, PITR |
| Logical dump of `catalog` | Nightly to a second bucket prefix |
| S3 versioning | On both buckets |
| Restore drill | Quarterly, timed, written up |
| RPO | 15 minutes (PITR) |
| RTO | 4 hours for a regional incident on the Phase 1 footprint |

A tenant export (`POST /exports`) is the tenant's copy of their operational data (items, customers, sales, orders) as CSV in a signed URL. It is not a full database restore. Platform restore is an operator action, audited.

Deleting a tenant does not delete `billing_invoices`.

## 11. Roles of the database users

| Role | Used by |
| --- | --- |
| `app_user` | PHP web and workers handling tenant traffic |
| `catalog_writer` | Import workers |
| `platform_admin` | Migrations, platform guard, scheduled cross-tenant aggregates |
| `migrator` | CI migration task only, not the runtime |

Migrations run as `migrator` before traffic switches, not as `app_user`.
