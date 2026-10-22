# 10 — Decisions

These were open questions. They are now decisions. The matching notes in the other plan files follow this list. Do not reopen one in code without changing this file and the ADR it names.

Nothing below is still waiting on a reply before a milestone can be designed. Two values are **data the Super Admin types in**, not engineering blockers: SelfX's GSTIN, and the live plan prices.

## Decided

### OQ-01 — Customers is its own module

**Decision.** Module `Customers`, namespace `App\Modules\Customers`.

Safest option. POS and Orders both need customers. Folding the module into either one creates a dependency cycle. Folding it into Identity mixes shopper CRM with login. ADR-013.

### OQ-02 — Templates and legal entity live in Super Admin

**Decision.** Super Admin has one Templates area. Every template the product sends or prints can be edited, versioned, and previewed there:

| Kind | Stored in | Preview |
| --- | --- | --- |
| SaaS invoice, credit note | `document_templates` | PDF with fixture data |
| POS receipt 58 mm, 80 mm, A4 tax invoice, credit note, pick list, delivery note, barcode label | `document_templates` | On-screen page, then test print |
| Report PDF layouts | `document_templates` linked from `report_definitions` | PDF with fixture data |
| Email, SMS, WhatsApp | `notification_templates` | Rendered message; email can send a test to a platform address |

Legal entity (legal name, GSTIN, address, state code, SAC) is a Super Admin settings form on `platform_settings`, not a constant. Invoice templates reference `{{supplier.gstin}}`. If GSTIN is empty, the PDF renders with a specimen watermark that a tenant override cannot remove. Do not invent a GSTIN in seed data.

E-invoice NIC stays Phase 2. Columns `irn`, `ack_number`, `ack_at`, `signed_qr` stay nullable. GST slabs stay in `catalog.tax_classes` (seed 0/5/12/18/28) and are editable. Counsel still confirms slabs before production invoices are unmarked, but that does not block the template editor.

Tenant owners may override a published template for their tenant except OTP copy and the locked tax blocks (invoice number, GSTIN, tax table). Cashiers cannot edit templates.

### OQ-03 — The tenant is billed

**Decision.** SelfX bills the **tenant**. A single-store tenant has one subscription. An organization is one tenant (`kind = organization`) and has one subscription. Stores are locations under that tenant. They are not billed separately. `limit.stores` caps how many locations the plan includes.

Prices are plan data, edited in Super Admin, not code. Seed until someone changes them: Starter ₹0, Professional ₹1,499/month, Enterprise ₹4,999/month, 15% yearly compare-at, 14-day Professional trial without a card, 7-day grace, then suspend. Currency INR only. ADR-010.

### OQ-04 — Placeholder domain

**Decision.** The real domain is not fixed. `APP_DOMAIN` is configuration.

| Use | Value |
| --- | --- |
| Placeholder production domain | `retail.selfx.in` |
| Local wildcard | `retail.selfx.test` |

Hosting recommendation stands: AWS `ap-south-1` (RDS, ElastiCache, S3, CloudFront). A host outside India means revisiting [06-security-and-compliance.md](./06-security-and-compliance.md) before go-live. Do not create cloud accounts on a different region without that review.

### OQ-05 — Any payment gateway

**Decision.** Phase 1 does not pick a gateway for the tenant. The tenant enables whichever gateways they have credentials for.

Built-in drivers, all first-class: `razorpay`, `cashfree`, `phonepe`, `paytm`, `cod`, `pay_at_store`, `manual`. Platform billing uses the same interface; Super Admin enables one or more of those drivers for SelfX's own invoices.

A new gateway is a `PaymentDriver` class plus a credential form schema. Checkout, the ledger, and webhooks do not change. Drivers register in `PaymentsServiceProvider`. Unregistered drivers do not appear in the UI.

COD and pay-at-store need no credentials. Prepaid drivers stay in test mode until that tenant (or the platform) saves live keys and passes verify.

### OQ-06 — Open catalog sources, all off until selected

**Decision.** Ship the provider interface and a Super Admin source screen for every open catalog below. Each source is **disabled** until a person writes a licence note and switches it on. No source is called during development except a fake fixture driver in tests.

| Driver key | Source | Enable rule |
| --- | --- | --- |
| `open_food_facts` | Open Food Facts | Licence note required |
| `open_beauty_facts` | Open Beauty Facts | Licence note required |
| `open_products_facts` | Open Products Facts | Licence note required |
| `open_pet_food_facts` | Open Pet Food Facts | Licence note required |
| `wikidata` | Wikidata GTIN lookup | Licence note required, low rate |
| `upcitemdb` | UPCitemdb | Licence note required; treat as non-open until the terms are read |
| `gs1` | GS1 | Licence note required; expect a contract |
| `paid_barcode` | Generic paid HTTP barcode API | Licence note + credential |
| `file` | CSV, XLSX, JSON, image bulk | Always available. Not a remote source |

Store-private items stay allowed (`master_product_id` null). Tenants submit suggestions. They never edit master rows. No automatic merge.

### OQ-07 — Organization storefront

**Decision.** The organization shop host lists the stores under that organization. The customer picks one store. The browser then opens that store's shop host. One cart, one store, one stock pool. No split shipment in Phase 1.

### OQ-08 — Notification providers

**Decision**, taken so the drivers have a name:

| Channel | Driver | Notes |
| --- | --- | --- |
| Email | Amazon SES in `ap-south-1` | Transactional. Credentials in Super Admin. Empty until the account exists |
| SMS and OTP | MSG91 | DLT entity id and template id on the template. Fallback driver slot exists; none seeded |
| WhatsApp | MSG91 WhatsApp | Same vendor. Sends only when the template row is `approved`. A missing BSP does not fail an order |
| Push | FCM web push | No third-party BSP |

The interface still allows another SMS or WhatsApp driver later. Orders, OTP, and receipts call the interface, not MSG91 directly.

### OQ-09 — Price lists

**Decision.** Every plan includes one default price list. Extra price lists and scheduled price changes require `module.price_lists` (Professional and Enterprise). Starter gets the default list only. This is the smaller feature, so a free tenant cannot build a pricing matrix the plan does not include.

### OQ-10 — Theme and languages

**Decision.** Phase 1 ships both.

- Theme toggle on every app. Default light. Dark tokens are real, not reserved. Preference stored on the user and, for the storefront, in `localStorage` before login.
- Locales `en`, `te`, `hi` via `next-intl`. English copy is complete. Telugu and Hindi ship for storefront, POS, and the shared shell in the same phase. Admin strings follow in M9. Layout must tolerate about 30% expansion. Catalog names use `catalog.product_translations`.

### OQ-11 — DPDP

**Decision.**

| Role | Who |
| --- | --- |
| Fiduciary | SelfX, for its own staff, platform accounts, and billing contacts |
| Processor | SelfX, for shopper data a tenant collects |
| Fiduciary for shoppers | The tenant |

Retention: invoices and credit notes 8 years (covers GST's 6 years and the longer company-record practice). Audit of financial actions 8 years, logins 2 years. OTP challenges 24 hours. Idempotency keys 7 days. After a tenant is soft-deleted, operational PII is purged at 90 days; invoices stay. Marketing SMS and WhatsApp stay off until `customers.marketing_opt_in` is true. Privacy contact email is `platform_settings.privacy_email`, shown on the privacy page. Counsel can revise the DPA later; the product split above is what the code enforces.

### OQ-12 — Team shape

**Decision.** The roadmap assumes one senior backend, one senior frontend, and one full-stack. Milestone order does not change if the team is smaller. Parallel arrows in the roadmap diagram are the first thing to drop.

### OQ-13 — Quotations, HRM, recruitment

**Decision.** Out of scope. The reference UI showed them. This product does not. Attendance punches and POS shifts stay. Payroll, recruitment, and quotations are not modules.

### OQ-14 — When an online order becomes a tax invoice

**Decision.**

| Case | Insert `sales` when |
| --- | --- |
| Prepaid delivery | Payment is captured and the order is `accepted` |
| Prepaid pickup | Order is `accepted` |
| COD | Order is `delivered` |

Rejected or cancelled orders that never reached that point do not get a tax invoice, so they do not need a credit note. The state machine does not change.

### OQ-15 — Stock reservation

**Decision.** Reserve quantity at `accepted`. Release on reject, cancel, or expiry. Convert the reservation into a stock-ledger deduction when the linked sale completes. Default `stores.settings.reservation_hours` is 24. Reserving at `placed` strands stock on orders the shop rejects. Not reserving oversells. Accept is the middle that matches the state machine.

### OQ-16 — Specimen invoices

**Decision.** Platform SaaS PDFs carry a specimen watermark in every non-production environment, and in production until `platform_settings.gstin` is non-empty. POS receipts and the tenant's own tax invoices use the **store** GSTIN and are not blocked by SelfX's GSTIN. They are different documents.

## Printers (added with these decisions)

**Decision.** Printing is a module, not a browser dialog bolted onto POS. See [01-architecture.md](./01-architecture.md) §16 and the Printing section in [04-module-breakdown.md](./04-module-breakdown.md).

Phase 1 supports a printer that is actually connected to the POS machine:

- Any printer the operating system can see (laser, inkjet, PDF, thermal) through the SelfX Print Agent and the OS spooler.
- ESC/POS thermal printers (58 mm and 80 mm) over the agent (USB, serial, Bluetooth, or raw TCP 9100 on the shop LAN), and directly from Chrome or Edge via WebUSB, WebSerial, or WebBluetooth when the agent is not installed.
- Browser print as the fallback for A4 and labels.

Super Admin edits the default layouts. Tenant owner or manager can override layout, cut, spacing, and text style for their store. The server renders a command plan. It never opens a socket to a printer (that would be an SSRF hole into the shop LAN). Vendor SDKs (Epson ePOS, Star webPRNT, others) are drivers behind the same interface, called from the agent, not from Laravel.

## Risks

| Risk | Why it hurts | What the plan does |
| --- | --- | --- |
| Cross-tenant leak | One missing scope exposes a shop's sales | RLS plus scopes plus IDOR tests as a merge rule |
| Catalog licence or bad merges | Every tenant inherits a wrong barcode | Sources stay off until a licence note is saved. No auto-merge |
| Offline POS scope creep | Blocks the slice for a distributed-systems project | Phase 1 is cash outbox only (ADR-007) |
| Gateway webhook bugs | Double fulfil or missed payment | One idempotent receipt path for every driver. Amount check. A new gateway cannot invent its own fulfil path |
| GST document errors | Rework of every sale row | Snapshots on the line, table tests, e-invoice deferred, specimen watermark until GSTIN is saved |
| SMS pumping | Cost and OTP abuse | Caps in Notifications, WAF in front |
| AI exfiltration | Model asked to ignore instructions | Tools, not SQL; server-side tenant filter; kill switch |
| Print agent as a local server | A malicious site could try to print | Bind `127.0.0.1` only, origin allow-list, pairing code, no LAN scan from Laravel |
| Template HTML injection | A template becomes stored XSS or a raw ESC/POS abuse | Block schema, not free HTML or raw bytes. Email HTML is sanitized |

## What is data entry, not a new design

Before production invoices lose the specimen watermark, type the legal entity into Super Admin. Before a tenant takes prepaid money, they save their own gateway keys. Before a catalog source runs, turn that source on with a licence note. Before SMS sends, save MSG91 and SES credentials. The screens for all four exist in the plan.
