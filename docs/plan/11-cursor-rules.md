# 11 — Proposed Cursor rules

This file is a proposal. It does **not** create `.cursor/rules`. Copy these into rule files only after the user asks.

Suggested split:

| Proposed file | Always apply |
| --- | --- |
| `.cursor/rules/selfx-product.mdc` | yes |
| `.cursor/rules/selfx-backend.mdc` | when editing `backend/**` |
| `.cursor/rules/selfx-frontend.mdc` | when editing `frontend/**` |
| `.cursor/rules/selfx-security.mdc` | yes |

Globs use the folders that exist today: `backend/` and `frontend/`. Do not invent a root `apps/` directory.

---

## Proposed `.cursor/rules/selfx-product.mdc`

```markdown
---
description: SelfX Retail product language and phase boundary
alwaysApply: true
---

# SelfX Retail

- The Laravel API in `backend/` is the product. Next.js apps in `frontend/apps/` are clients.
- Phase 1 is web only. Do not add native shopper apps, PostGIS, custom-domain routing, or e-invoice NIC calls. The print agent is a local companion, not a shopper app.
- Locales are `en`, `te`, and `hi`. Do not hardcode user-facing English in components.
- Light and dark both ship. New colours go in the token file for both themes.
- Read `docs/plan/` before inventing a module, table, event, queue, or feature key. Names in those docs win.
- Organization is `tenants.kind = organization`. SelfX bills the tenant once. Stores are not a second subscription.
- `sales` are fiscal bills. `orders` are online checkout. Do not merge the tables.
- Money is bigint paise. Rates are basis points. Time is UTC.
- Primary keys are UUIDv7 generated in PHP.
- Entitlements (plan) and permissions (role) are both required. Hiding a button is not enforcement.
- Phase 1 offline POS is a catalog cache plus an outbox of completed cash bills. Do not build full conflict resolution.
- Do not copy Stocky, TechNova, LittleJoy, or other reference brands: not names, colours, assets, or copy.
- If a change contradicts `docs/plan/01-architecture.md` ADRs, update the ADR in the same change.
```

---

## Proposed `.cursor/rules/selfx-backend.mdc`

```markdown
---
description: Laravel modular monolith conventions
globs: backend/**/*.php
alwaysApply: false
---

# Backend

- PHP 8.3+, Laravel current stable, API-only. No Blade UI.
- Code lives in `backend/app/Modules/{Module}` where Module is one of:
  Identity, Tenancy, Plans, Billing, Payments, Catalog, Inventory, Customers,
  Pos, Orders, Storefront, Delivery, Printing, Notifications, Ai, Cms, Apps, Reporting, Audit.
- Controllers: authorize, form request, one Action, one API resource. No Eloquent in controllers.
- DTOs via `spatie/laravel-data`. Filters via `spatie/laravel-query-builder`.
- Cross-module calls follow `docs/plan/01-architecture.md` dependency table. Catalog must not import Pos, Orders, or Inventory.
- Shared contracts live in `backend/app/Support`.
- Migrations live in `backend/database/migrations`, one concern each, expand/contract. Filename prefix is the module.
- Tenant tables: `tenant_id`, global scope, and RLS. Never trust `tenant_id` from the body. Resolve the tenant from the host.
- Platform queries that need every tenant use the `platform_admin` connection explicitly. The default connection is `app_user`.
- Catalog tables are schema `catalog`. Import workers use `catalog_writer`.
- Write domain events to `domain_outbox` in the same transaction. Names are dotted past tense (`order.status.changed`).
- Queues: `critical`, `outbox`, `default`, `mail`, `notifications`, `webhooks`, `imports`, `reports`, `ai`, `media`.
- Jobs are idempotent. Payment and SMS webhooks dedupe on `webhook_receipts`.
- API envelope, cursor pagination, and error codes match `docs/plan/03-api-design.md`.
- Idempotency-Key on sale, checkout, payment, refund, tenant create, and order transition.
- Do not log passwords, PINs, OTPs, cookies, gateway secrets, or PAN.
- Pest feature test and, for tenant routes, an IDOR test in the same change.
- OpenAPI comes from Scramble. Do not hand-write a second spec.
```

---

## Proposed `.cursor/rules/selfx-frontend.mdc`

```markdown
---
description: Next.js apps and SelfX UI rules
globs: frontend/**/*.{ts,tsx,css}
alwaysApply: false
---

# Frontend

- Apps: `frontend/apps/marketing`, `admin`, `console`, `storefront`.
- Packages: `@selfx/ui`, `@selfx/api-client`, `@selfx/config`, `@selfx/types`.
- TypeScript strict. Server state with TanStack Query. Forms with React Hook Form and Zod. Tables with TanStack Table.
- Import UI from `@selfx/ui`. Do not copy shadcn primitives into app folders.
- Inter only. Tabular numerals on money and quantities. Format INR with `en-IN` from paise integers.
- Tokens in `frontend/packages/ui`. Accent is the rust token or a storefront allow-list id (`rust`, `ink`, `forest`). No arbitrary hex from tenants.
- Do not add gradients, glass blur, neon, emoji icons, decorative blobs, or a second chart library. Charts use the shared ECharts theme.
- Theme is a token switch (`data-theme`), default light. Do not add a second palette or a gradient dark theme.
- Strings go through `next-intl` message files. Locales are `en`, `te`, and `hi`.
- Print layouts are block documents compiled by Printing. Do not send raw ESC/POS or HTML from the editor. Do not open printer sockets from Laravel or from a Next.js server.
- The print agent lives in `frontend/apps/print-agent`. It is not a Next.js app.
- POS stays in the console app. Storefront service worker must not cover the console host.
- POS offline: IndexedDB outbox for completed cash sales only. Disable other tenders when offline.
- Marketing pages are ISR. Storefront product pages are ISR with store tags. Cart, checkout, and account are SSR. Admin and console data is client-fetched after a session check.
- Empty, error, and loading states are required on lists. Show the request id on errors.
- Accessibility: labelled inputs, visible focus, 44px targets on storefront and POS.
```

---

## Proposed `.cursor/rules/selfx-security.mdc`

```markdown
---
description: Security rules that apply to every change
alwaysApply: true
---

# Security

- Deny by default. New routes need a policy and, when plan-gated, an entitlement key from `docs/plan/02-domain-and-database.md`.
- Do not return ciphertext, secrets, OTP hashes, or password hashes from API resources.
- Do not add an AI tool that accepts SQL or a raw tenant id from the model. Tenant and store filters are set on the server.
- Webhook URLs from tenants must be HTTPS and must not target private or link-local addresses.
- Do not connect to a printer IP, USB device, or LAN scanner from Laravel. The print agent does that on the shop machine.
- File uploads: allow-listed mime, no SVG, size cap, scanner hook for app binaries.
- Do not store card numbers. Payment drivers redirect to the gateway.
- Impersonation cannot change billing, read gateway secrets, reset passwords, or create API keys.
- A role cannot grant a permission the acting user does not have.
- Tests must use the `app_user` database role when asserting isolation. Do not point tests at a superuser and call them RLS tests.
- Secrets stay in the secrets manager or encrypted columns. Never commit `.env` with live keys.
```

---

## Notes for whoever installs these

- Keep the rules short. The plan docs are the spec; the rules point at them.
- If a rule and `docs/plan/` disagree, fix both in one change. Do not let the rule become a second source of truth with different table names.
- Do not add a rule that tells the agent to skip tests, weaken RLS, or "move fast" on tenancy.
