# 00 — Product overview

SelfX Retail is a multi-tenant retail operating system for Indian retailers. Phase 1 is web only. The Laravel API is the product. The Next.js apps are clients, so later Android, iOS, and desktop apps can use the same APIs.

This file is the shared glossary and the Phase 1 boundary. Later docs use these names without redefining them. See [01-architecture.md](./01-architecture.md) for structure and [09-roadmap.md](./09-roadmap.md) for sequence.

## 1. Product summary

A retailer (single store or a multi-store organization) gets:

- A super-admin-provisioned tenant with its own subdomain.
- Point of sale, inventory, and GST-aware billing.
- An online store PWA on its own shop subdomain.
- Delivery by the tenant's own staff, with a status timeline the customer can see.
- A global product catalog the tenant links to, and does not edit.

SelfX (the platform operator) gets a separate super-admin console for tenants, plans, billing, catalog governance, communications, and system health.

Design is original SelfX: Inter, monochrome surfaces, one accent, dense operational screens, calm marketing. Reference screenshots inform density and hierarchy only. Do not copy Stocky, TechNova, LittleJoy, or any other product's name, color, asset, or copy.

## 2. Goals

| Goal | Phase 1 measure |
| --- | --- |
| A new tenant can sell the same day | Create tenant, add catalog items, complete a cash POS bill, place an online order, move it to delivered |
| Tenant data never leaks | RLS + global scopes + automated cross-tenant tests |
| Catalog is the system of record for products | `store_items` link to `catalog.products`; tenants suggest, they do not edit masters |
| Plans are enforced on the server | Entitlement middleware and policies; UI hiding is convenience |
| Indian billing is correct enough to go live | Paise, CGST/SGST/IGST, HSN, invoice series, GST PDF. E-invoice IRN is Phase 2 (schema reserved) |
| APIs stay client-agnostic | `/api/v1` documented by Scramble; web uses cookies; future native apps use Sanctum tokens |

Non-goals for Phase 1: native apps, custom domains, third-party delivery fleets, full offline conflict resolution, payroll, recruitment, quotations, e-invoice NIC integration. English, Telugu, and Hindi, and light and dark theme, are in Phase 1 (OQ-10).

## 3. Personas and roles

### Platform (host `admin.{APP_DOMAIN}`)

| Role | Needs |
| --- | --- |
| Super admin | Full platform access, impersonation, catalog publish, plan edits, gateway credentials |
| Platform support | Read tenants, impersonate with reason, no plan or credential edits |
| Platform billing | Subscriptions, invoices, manual payments, reconciliation, no catalog publish |
| Catalog editor | Ingest, review, merge, publish catalog. No tenant billing |

### Tenant staff (host `{tenant}.{APP_DOMAIN}`)

| Role | Store scope | Needs |
| --- | --- | --- |
| Owner | All stores | Billing, staff, settings, every operational permission |
| Manager | One or more stores | Operations, refunds, voids, price override, reports |
| Cashier | One store | POS bill, hold, cash, assigned discounts. No void without permission |
| Inventory clerk | One store | Stock, purchase orders, goods receipt, counts |
| Delivery staff | One store | Assigned orders, OTP confirmation, proof photo |
| Custom | Chosen stores | Any permission subset the owner grants |

A person can hold different roles in different stores. `model_has_roles.store_id` null means all stores in the tenant. The table is Spatie's, with that extra column.

### Customer (host `{store}.{SHOP_DOMAIN}`)

No staff role. Phone OTP session scoped to that shop host. The same phone is a distinct `customers` row per tenant.

## 4. Glossary

| Term | Meaning |
| --- | --- |
| Tenant | Billing and isolation root. `tenants.kind` is `single_store` or `organization` |
| Organization | A tenant with `kind = organization`. Not a second billing product |
| Store | A location: GSTIN, inventory, counters, online storefront. A single-store tenant has exactly one |
| Counter | A POS terminal inside a store. Own shift and invoice series |
| Master product | Row in PostgreSQL schema `catalog`. Global, not tenant-owned |
| Store item | What a store actually sells. FK to a master product, or store-private if no master exists |
| Sale | Fiscal bill (POS, and the tax invoice raised for an online order). Table `sales` |
| Order | Online checkout. Table `orders`. Not a POS bill |
| Entitlement | What the tenant's plan allows. Feature key, e.g. `module.pos`, `limit.products` |
| Permission | What this staff user may do, e.g. `pos.sale.void` |
| Feature key | Stable string in `features.key`. Registry is code + database |
| Paise | Integer minor unit. ₹1 = 100 paise. All money columns are `bigint` `*_paise` |
| Basis point | Rate unit. 18% GST = `1800` bps |
| Provisioning | Idempotent job chain that builds store, counter, roles, storefront, settings |
| Outbox | `domain_outbox` row written in the same DB transaction as the state change |
| Shop host | Storefront host `{public_slug}.shop.{APP_DOMAIN}` |
| Console | Tenant staff app, including POS |

Names used everywhere else:

- Apps: `marketing`, `admin`, `console`, `storefront` under `frontend/apps/`.
- Packages: `@selfx/ui`, `@selfx/api-client`, `@selfx/config`, `@selfx/types`.
- Backend modules: Identity, Tenancy, Plans, Billing, Payments, Catalog, Inventory, Customers, Pos, Orders, Storefront, Delivery, Notifications, Printing, Ai, Cms, Apps, Reporting, Audit.
- Customers is its own module (OQ-01, decided). POS and Orders both need it.
- Printing is its own module. POS, billing invoices, and report PDFs render through it.
- Queues: `critical`, `default`, `mail`, `notifications`, `imports`, `reports`, `ai`, `media`, `webhooks`, `outbox`.
- Milestones: `M0`–`M17`. Spikes: `S1`–`S5`.

## 5. Phase 1 surfaces

| Surface | App | Who |
| --- | --- | --- |
| Marketing site | `marketing` | Public |
| Super admin | `admin` | Platform roles |
| Tenant console + POS | `console` | Staff |
| Customer PWA | `storefront` | Customers, per store and per organization |

Detail lives in [04-module-breakdown.md](./04-module-breakdown.md). The traceability table there maps every Phase 1 surface requirement to a module, endpoints, tables, and a milestone.

## 6. What ships in Phase 1 vs later

| Capability | Phase 1 | Later |
| --- | --- | --- |
| POS billing | Cash, UPI, card, wallet, store credit, khata, split, change. Online payment links only when the tenant gateway is live | Customer-facing pole display |
| Offline POS | Read-only catalog cache + outbox of **completed cash bills**, sync when online. Server keeps the snapshotted price. Stock may go negative and raises an alert | Card/UPI offline, returns offline, multi-terminal CRDT, full conflict resolution |
| Barcode | Keyboard wedge + camera scan, GTIN check digit, GS1 Digital Link parse | — |
| Scales | Manual weight entry and unit conversion | HID/serial scale drivers |
| Delivery | Pin-code zones, own staff, OTP, optional proof photo | Radius (PostGIS), partner app, third-party fleets |
| Custom domain | `store_domains` table only | Verification, TLS, routing |
| Native apps | Apps manager metadata, entitlement checks, signed URLs | Real APK/AAB/iOS/Windows builds |
| WhatsApp | MSG91 driver, templates, logs. Sends only after the template is approved in Super Admin | A second BSP, if MSG91 is replaced |
| Accounting | CSV shaped for Tally import, GST report export | Zoho / QuickBooks APIs |
| E-invoice | Nullable `irn`, `ack_number`, `ack_at`, `signed_qr` on `sales` | NIC IRP integration |
| AI | Gateway, quotas, NL reports via tools, product draft, PWA assistant | Extra providers as needed |
| Languages | English, Telugu, and Hindi UI. Catalog translations | Further locales |
| Theme | Light and dark, toggle on every app, default light | — |
| Printers | OS spooler via the print agent, ESC/POS (agent, WebUSB, WebSerial, WebBluetooth), browser print. Layout, cut, spacing, and text style edited in Super Admin and overridable by the tenant | Extra vendor SDKs only when a connected printer cannot use ESC/POS or the spooler |
| Payments | Razorpay, Cashfree, PhonePe, Paytm, COD, pay at store, manual. Tenant enables the ones they have | Further drivers behind the same interface |
| Org storefront | Store list, customer picks one store, then that store's shop | Split shipment across stores |
| Quotations, payroll, recruit | Out of scope | Only if a later brief adds them |

Offline recommendation, stated plainly: full offline POS is a distributed-systems project. Phase 1 covers the kirana outage case (cash sale while the link is down) and stops there. Spike `S2` proves the outbox before `M4` builds it.

## 7. Decisions

Locked in [10-open-questions.md](./10-open-questions.md). Short form:

1. `APP_DOMAIN` is configuration. Placeholder production domain is `retail.selfx.in`. Local zone is `retail.selfx.test` (OQ-04).
2. Data residency is India. Recommended host is AWS `ap-south-1` until a different Indian host is chosen (OQ-04).
3. SelfX bills the tenant. An organization is one tenant and one subscription. Stores are not billed separately (OQ-03).
4. Seed prices are Starter ₹0, Professional ₹1,499/month, Enterprise ₹4,999/month. Super Admin edits them. They are not the USD figures in the reference screenshots (OQ-03).
5. Invoice, email, SMS, WhatsApp, receipt, label, and report templates are edited and previewed in Super Admin. GSTIN and SAC are fields on that screen. Empty GSTIN watermarks the platform PDF. It does not block tenant receipts (OQ-02, OQ-16).
6. Open catalog connectors ship disabled. A licence note is required before a source is turned on. Store-private items are allowed (OQ-06).
7. The organization storefront lists its stores. The customer picks one. The cart belongs to that store (OQ-07).
8. Every built-in payment driver is available. The tenant turns on the gateways they have credentials for (OQ-05).
9. Roadmap team shape: 1 senior backend, 1 senior frontend, 1 full-stack (OQ-12).
10. GST slabs are rows in `catalog.tax_classes`, seeded 0/5/12/18/28, editable (OQ-02).
11. Locales `en`, `te`, `hi`. Light and dark theme (OQ-10).
12. Email is SES. SMS and WhatsApp are MSG91. WhatsApp sends only after template approval (OQ-08).

## 8. Reading order

1. This file.
2. [01-architecture.md](./01-architecture.md)
3. [02-domain-and-database.md](./02-domain-and-database.md)
4. [03-api-design.md](./03-api-design.md)
5. [04-module-breakdown.md](./04-module-breakdown.md)
6. [09-roadmap.md](./09-roadmap.md) before starting a milestone.
7. [10-open-questions.md](./10-open-questions.md) for the locked decisions. Do not treat that file as a list of unanswered questions.
