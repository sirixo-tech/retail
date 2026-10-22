# 08 — Testing and quality

The release blocker is the vertical slice plus tenancy isolation, not a coverage percentage on its own.

## 1. Strategy

| Layer | Tool | What it proves |
| --- | --- | --- |
| Unit | Pest | Money, GST split, GTIN check digit, state machine, proration, margin rules |
| Feature | Pest + RefreshDatabase | HTTP envelope, policies, entitlements, idempotency, webhooks |
| Tenancy | Pest | Cross-tenant 404 and RLS |
| Contract | Scramble spec + Pest response assertions | Client and server agree |
| Frontend unit | Vitest + React Testing Library | Formatters, POS cart reducer, entitlement-aware nav |
| E2E | Playwright | Create tenant, add products, bill a sale, place an order, move status |
| Static | Pint, Larastan, Deptrac, ESLint, `tsc --noEmit` | Style and boundaries |
| Audit | `composer audit`, `pnpm audit` | Known vulnerabilities |

No Jest beside Vitest. No PHPUnit style mixed in; Pest is the runner (it may use PHPUnit under the hood).

## 2. Backend layout

```text
backend/tests/Unit/...
backend/tests/Feature/{Module}/...
backend/tests/Tenancy/...
```

`tests/TestCase.php` boots a tenant helper:

- `actingAsTenant($tenant, $user)` sets the host header and the DB context the way middleware does.
- `isolate()` asserts a second tenant's ids are invisible.

Feature tests hit real Postgres (compose service in CI), not SQLite. RLS does not exist on SQLite, so a green SQLite run would be a false sense of safety.

Factories live next to modules: `app/Modules/Pos/Database/Factories`. They insert through models so UUIDv7 and tenant id are always set.

## 3. Cases that must exist before the related milestone is "done"

| Milestone | Tests |
| --- | --- |
| M0 | Health ready, Deptrac config loads, GST calculator table test, GTIN valid and invalid |
| M1 | Create tenant idempotent, reserved slug 409, provision retry does not duplicate store, forced password change, login lock |
| M2 | Dry-run writes no products, duplicate GTIN row error, publish indexes, tenant cannot PATCH a master |
| M3 | Ledger replay equals balance, bulk add idempotent, margin skip list |
| M4 | Cash sale drops stock, double submit one sale, shift Z totals, invoice number unique under concurrency (two parallel requests), receipt plan ends with the configured cut and rejects raw ESC bytes |
| M5 | Checkout COD creates `placed`, pin-code outside zone 422, OTP attempt limit, org host returns the store list |
| M6 | Illegal transition 409, OTP delivers once, stream `after` returns the missed event |
| M7 | Entitlement 403 with permission present, override flush |
| M8 | Webhook replay, amount mismatch, proration line, manual payment, specimen watermark when GSTIN is empty |
| M9 | Draft CMS invisible, analytics reads aggregate, template preview writes no invoice |
| M10 | Print profile tenant override cannot delete the GSTIN block. Agent origin that is not the app host is refused |
| M15 | Prompt fixture does not issue SQL, assistant cannot see another store |

Every tenant-owned controller gets one IDOR test. Add it in the same PR as the route. A module checklist item, not a later hardening project.

## 4. GST and money fixtures

A table-driven Pest dataset:

| Mode | Rate | Price | Expected |
| --- | --- | --- | --- |
| Inclusive | 1800 bps | 11800 paise | taxable 10000, CGST 900, SGST 900 when same state |
| Exclusive | 1800 bps | 10000 paise | total 11800 |
| IGST | 1800 bps | interstate | IGST 1800, CGST 0, SGST 0 |
| Cess | cess 100 bps | — | cess on top of GST |
| Round to rupee | odd paise | — | `round_off_paise` brings total to a multiple of 100 |

Money tests use integers only. A test fails if a float type appears in a `*_paise` cast.

## 5. Frontend

Vitest:

- Paise to `en-IN` currency.
- POS cart: add, qty, discount, split tender validation.
- Order timeline renders only the events it is given (no client-side status invention).
- Nav hides a module when the entitlement payload says off, and a comment in the test says the API still enforces it.

Playwright projects: `admin`, `console`, `storefront`. They share a seeded staging tenant or boot against compose.

The release script:

1. Platform user creates a tenant.
2. Owner sets password, opens catalog, bulk-adds two products.
3. Opens a shift, scans a barcode (type the code with a short delay to simulate a wedge), takes cash, sees the invoice number.
4. Storefront adds the item, checks out COD, sees `placed`.
5. Console accepts through to delivered with the OTP from the test mailbox/SMS sink.
6. Storefront timeline shows `delivered`.

Nightly, not on every PR. A failure blocks release.

## 6. Coverage targets

| Area | Line coverage target |
| --- | --- |
| `app/Support` money, tax, GTIN | 100% of branches |
| Pos sale action, order transition action, entitlement gate | 90% |
| Other module actions | 70% |
| Controllers | exercised via feature tests, no separate target |
| Frontend cart and formatters | 80% |
| UI primitives | Storybook visual review, not a coverage gate |

Coverage is measured with Pest `--coverage` and Vitest coverage on CI for the main branch. A drop of more than 2 points on the gated packages fails CI. Do not chase 90% on generated resources.

## 7. Definition of done

A story is done when all of these are true:

- [ ] Behaviour matches the module acceptance in [04-module-breakdown.md](./04-module-breakdown.md)
- [ ] Endpoints match [03-api-design.md](./03-api-design.md) and Scramble exports them
- [ ] Tables match [02-domain-and-database.md](./02-domain-and-database.md), migrations expand-only
- [ ] Policies and entitlements checked on the server
- [ ] Audit event written for the security list in 06
- [ ] Pest feature test and, if tenant-owned, an IDOR test
- [ ] UI uses `@selfx/ui` tokens, empty and error states, tabular numbers for money
- [ ] No secrets in logs or API resources
- [ ] Docs in this folder updated if a name changed (event, feature key, queue, table)
- [ ] Larastan and Deptrac clean for the touched module

## 8. Pull request checklist

- [ ] Linked milestone id (`M4`, etc.)
- [ ] Migrations reversible in the expand/contract sense
- [ ] Feature flag via Pennant only if the UI is incomplete; not used instead of entitlements
- [ ] Screenshots for visual changes, both a list page and an empty state
- [ ] Playwright updated if the slice path changed
- [ ] Open question referenced if the PR interprets an OQ rather than waiting

## 9. Code style

- PHP: Pint preset laravel. Larastan level 6 to start, level 8 before M17.
- TS: ESLint with the shared config, `no-explicit-any` error.
- Names: PHP modules singular `Pos`, tables plural, events dotted past tense, feature keys as in 02.
- No commented-out code, no `dd`, no `ray` left in.

## 10. ADRs

New architectural decisions get a short section appended to [01-architecture.md](./01-architecture.md) (next ADR number) in the same PR. Do not open a second docs tree until the user asks. If a decision contradicts an ADR, change the ADR in that PR so the plan stays the source of truth during implementation.

## 11. Quality of imports and webhooks

Catalog import has a fixture file of 50 rows: 45 valid, 2 bad GTIN, 2 duplicate, 1 fuzzy duplicate. The test asserts counts.

Each payment driver has a fixture of a signed webhook and a tampered one. The tampered one returns 400 and writes nothing.

## 12. Performance checks (lightweight)

Not a full load-test lab. Before M17:

- Seed 100k `store_items` for one tenant and confirm item search p95 under the budget in 01 on staging hardware.
- Seed 1M `stock_ledger_entries` in a throwaway database and confirm the balance read uses `stock_balances`, not a sum of the ledger, via the query log.

If either fails, fix the index or the read model before launch. Do not add a cache that hides a sequential scan without an EXPLAIN in the PR.
