# 04 — Module breakdown

Each module lists what a senior engineer builds. Endpoint paths match [03-api-design.md](./03-api-design.md). Table names match [02-domain-and-database.md](./02-domain-and-database.md). Milestone ids match [09-roadmap.md](./09-roadmap.md).

Shared permission pattern: `{module}.{noun}.{verb}`. Store-scoped unless noted. Entitlement keys use the registry in 02.

Out of scope for every module: quotations, payroll, recruitment, e-invoice NIC, custom domains, third-party delivery, full offline conflict resolution.

---

## Identity

**Features.** Platform, staff, and customer auth. TOTP and recovery codes. Session list and revoke. Staff PIN. Forced password change. Brute-force lock.

**Screens.** Admin `/login`, account security. Console `/login`, `/account/security`, POS PIN pad. Storefront phone OTP sheet.

**Endpoints.** All `/api/v1/auth/*` routes in 03 §3.

**Tables.** `users`, `staff_profiles`, `staff_pins`, `sessions`, `personal_access_tokens`, `login_attempts`, `two_factor_recovery_codes`, `password_reset_tokens`.

**Jobs.** None on the request path. Password reset email uses Notifications.

**Events.** `customer.otp.requested`.

**Permissions.** `identity.session.revoke` (own sessions always allowed), `identity.staff.pin.set`.

**Entitlements.** None.

**Edge cases.** Same email cannot be platform and staff. Customer phone is unique per tenant on `customers`, not globally on `users` — a global `users.phone_e164` unique constraint fights multi-tenant customers. Implement customer login as: find-or-create `users` by phone with `kind=customer`, then find-or-create `customers` for the **resolved tenant**. Drop the global unique phone if a staff user and a customer share a phone; staff match on email, customers match on `(tenant_id, phone)`. Documented choice: `users.phone_e164` is unique only where `kind=customer` is false. Customers are keyed on `customers`.

**Acceptance.** Owner must change password before any other console route. Wrong TOTP does not create a session. Sixth OTP attempt returns `rate_limit.otp` and burns the challenge.

**Milestone.** M1.

---

## Tenancy

**Features.** Create tenant (single store or organization) with owner email and password, business details, unique slug, plan and cycle. Reserved slugs. Suspend, reactivate, soft-delete, restore. Usage, activity. Impersonation with banner, reason, expiry, audit, and a deny-list of sensitive actions. Provision chain: owner, default store, counter, invoice series, roles, owner role, storefront shell, settings, welcome email, mark active. Each step idempotent, visible, retryable.

**Screens.** Admin: tenant list (search, status filter, columns: name, slug, status, plan, created), create, detail tabs Overview / Usage / Subscription / Invoices / Activity / Provision. Organization list is the same table filtered to `kind=organization`. Console banner when impersonating. Console store switcher.

**Endpoints.** 03 §4.

**Tables.** `tenants`, `reserved_slugs`, `stores`, `store_domains`, `counters`, `tenant_provision_steps`, `invoice_series`, `invoice_number_blocks`, `impersonation_sessions`.

**Jobs.** `ProvisionTenantJob` chain on `default`. `SendWelcomeEmailJob` on `mail` as one step.

**Events.** `tenant.created`, `tenant.provisioned`, `tenant.suspended`, `tenant.reactivated`.

**Permissions.** Platform: `platform.tenants.manage`, `platform.tenants.impersonate`, `platform.tenants.delete`. Tenant: `stores.manage` (owner).

**Entitlements.** `limit.stores`, `module.multi_store` when adding a second store. `kind=organization` requires `module.multi_store` on the selected plan.

**Edge cases.** Slug checked against `reserved_slugs` and existing tenants, case-insensitive. Provision failure leaves `provision_status=failed` and does not send a second welcome email if that step already completed. Soft-delete revokes sessions and sets storefronts offline. Restore does not reuse a slug that was taken. Impersonation cannot read gateway ciphertext or set passwords.

**Acceptance.** Creating a tenant twice with the same idempotency key returns one tenant. Killing the worker after `default_store` and retrying does not create a second store. Suspended tenant storefront returns a closed page. Impersonation banner is visible on every console route and audit shows both ids.

**Milestone.** M1, impersonation polish in M9.

---

## Plans

**Features.** Starter, Professional, Enterprise. Prices per monthly, quarterly, yearly cycle. Trial days, currency INR, tax handled on the billing invoice not on the plan. Feature matrix of booleans and integer limits. Overrides per tenant with reason and expiry. Redis cache. Backend middleware `EnsureEntitled` and policy checks. `GET /entitlements` for the UI.

**Screens.** Admin plan cards and editor (limits, module toggles, prices). Tenant override drawer. Console billing page shows current usage vs limits. Marketing pricing reads `GET /public/plans`.

**Endpoints.** 03 §5 and `GET /api/v1/entitlements`.

**Tables.** `features`, `plans`, `plan_prices`, `plan_features`, `tenant_feature_overrides`.

**Jobs.** Cache flush is synchronous on write. `ExpireTrialsJob` lives in Billing.

**Events.** `subscription.changed` (Billing emits it; Plans listens to flush cache).

**Permissions.** `platform.plans.manage`.

**Entitlements.** This module is the gate. It does not gate itself.

**Edge cases.** Override expiry: a scheduled check every hour, and a lazy check on read. Integer `-1` is unlimited. Lowering a limit below current usage does not delete data; it blocks creates with `entitlement.limit_exceeded` and surfaces a warning. Boolean off hides the module in navigation and returns 403 on the API.

**Acceptance.** A test calls a POS route with `module.pos=0` and gets 403 even if the user is owner. Cache poison test: DB override is visible within one request after write. UI-hidden route still 403s when called directly.

**Milestone.** Gate interface in M0/M1. Full admin in M7.

---

## Billing

**Features.** Statuses `trialing`, `active`, `past_due`, `grace`, `suspended`, `cancelled`. Upgrade now with proration. Downgrade at period end, or now only if usage fits. GST invoice PDF, credit notes, coupons. Dunning retries. Manual payment with UTR. MRR and churn on the platform aggregate, not as a live query.

**Screens.** Admin: subscription list, invoice list, record payment, coupon admin, MRR chart (part of analytics home). Console: current plan, usage, cycle, invoices, pay now, limit warnings.

**Endpoints.** 03 §6.

**Tables.** `subscriptions`, `billing_coupons`, `billing_coupon_redemptions`, `billing_invoices`, `billing_invoice_lines`, `billing_credit_notes`, `billing_payments`, `dunning_attempts`, `platform_daily_metrics`.

**Jobs.** `GenerateInvoicePdfJob` (`reports`), `DunningRetryJob`, `ExpireTrialsJob`, `AggregateDashboardMetricsJob`.

**Events.** `billing_invoice.issued`, `billing_invoice.paid`, `subscription.changed`.

**Permissions.** `platform.billing.manage`. Tenant owner: `billing.manage`.

**Entitlements.** None beyond being the commercial source of the plan id.

**Edge cases.** Grace is 7 days after `past_due` (OQ-03). During grace, operations work and a banner shows. Suspended blocks operations, not the billing pages. Manual payment does not call a gateway. Coupon percent and amount are mutually exclusive. Invoice supplier fields are snapshotted from `platform_settings` at issue time. If `gstin` is empty, the PDF still renders and carries a specimen watermark. It does not fail, and it does not invent a GSTIN.

**Acceptance.** Upgrade mid-cycle produces a proration line and a payable invoice. Downgrade while over `limit.products` returns 422. Second webhook does not double-pay an invoice. MRR on the admin home equals the aggregate row, and a test builds that row from known subscriptions.

**Milestone.** M8. Manual plan assignment without collection exists from M1 so earlier milestones can set `plan_id`.

---

## Payments

**Features.** Adapter for PhonePe, Paytm, Razorpay, Cashfree, plus COD, pay at store, and manual. All of them are first-class. The tenant enables the drivers they have credentials for. Platform credentials and per-store credentials. Test vs live. Encrypted secrets. Signature-checked idempotent webhooks. Ledger and reconciliation import. A new gateway is a driver class and a form schema.

**Screens.** Admin: driver registry, gateway form (never re-display the secret), transactions, refund, reconciliation unmatched list. Console settings: store gateways, the same shape, only drivers the platform has made available.

**Endpoints.** 03 §7.

**Tables.** `payment_gateways`, `payment_transactions`, `payment_ledger_entries`, `refunds`, `webhook_receipts`, `reconciliation_lines`.

**Jobs.** `ProcessPaymentWebhookJob` on `critical`. `ReconciliationPullJob` nightly where the provider has a settlement API; CSV import for the others.

**Events.** `payment.captured`, `payment.failed`, `payment.refunded`.

**Permissions.** `platform.payments.manage`, `payments.gateways.manage`, `payments.refund`.

**Entitlements.** None for cash. Payment links need a verified live gateway.

**Edge cases.** Webhook arrives before the browser returns: the order/invoice handler keys off `provider_ref`, so either path wins and the other no-ops. Amount mismatch between webhook and expected total marks the transaction `failed` and does not fulfil. Refund greater than captured returns 422. COD and pay-at-store never sit in `gateway_clearing`.

**Acceptance.** Contract tests per adapter with a recorded signature fixture. Replay of `provider_event_id` does not double-credit the ledger. Ciphertext columns are absent from API resources.

**Milestone.** Adapter, fake driver, and all named drivers with contract tests in M5 for checkout and M8 for platform billing. A tenant with no prepaid keys can still sell on cash, COD, and pay-at-store.

---

## Catalog

**Features.** Master products: GTIN and other barcodes, name, brand, manufacturer, category tree, attributes, variants, units, pack size, HSN/GST class, images, description, tags, translations, status, source, licence, quality score, versions. Ingestion: CSV, XLSX, JSON, image bulk (match barcode or filename), external providers behind `CatalogSource`. Drivers, all disabled until a licence note is saved: `open_food_facts`, `open_beauty_facts`, `open_products_facts`, `open_pet_food_facts`, `wikidata`, `upcitemdb`, `gs1`, `paid_barcode`. Response cache and scheduled pull. Pipeline: staging rows, validate, normalise, duplicate detection (exact normalised GTIN, fuzzy name), merge, split, review queue, publish, rollback, per-row errors. Governance: categories, brands, attributes, bulk edit, soft delete/restore, audit, quality dashboard, tenant submissions. Search and export. Tenants browse and submit only. Store-private items are allowed when no master matches.

**Screens.** Admin: product list and filters, product editor, import wizard (upload, map columns, dry-run, commit, error download), review queue, duplicates, submissions, categories, brands, attributes, tax classes, quality, sources (every open connector, enable switch, licence note, last sync). Console: catalog browser with multi-select (the add action is Inventory).

**Endpoints.** 03 §13.

**Tables.** All `catalog.*` tables in 02.

**Jobs.** `ImportCatalogChunkJob`, `PublishCatalogProductJob`, `SyncExternalCatalogJob`, `BuildSearchIndexJob` on `imports`. Image derivatives on `media`.

**Events.** `catalog.import.finished`, `catalog.product.published`, `catalog.product.rolled_back`.

**Permissions.** `platform.catalog.edit`, `platform.catalog.publish`, `platform.catalog.merge`. Tenant: `catalog.browse`, `catalog.submit`.

**Entitlements.** Browse requires `module.pos` or `module.inventory` or `module.storefront`. Submissions require any of those.

**Edge cases.** Check-digit failure rejects the row, it does not "fix" the digit. Fuzzy match never auto-merges; it opens `duplicate_candidates`. Merge moves identifiers and repoints `store_items.master_product_id`, and writes versions on both products. Rollback restores the previous snapshot and reindexes. External payload cache is keyed by provider + external id + payload hash, TTL 7 days. A tenant correction cannot set `status=published`.

**Acceptance.** Dry-run writes `import_rows` and zero `products`. Commit of 10k rows is chunked and resumable after a killed worker. Duplicate GTIN in one batch is a row error, not an uncaught unique violation. Store item created from a published product changes display name when the master name changes and `name_override` is null. Spike S1 covers this before the full UI.

**Milestone.** S1 then M2.

---

## Inventory

**Features.** Store items linked to masters or store-private. One-click and bulk add with margin rules. Manual create, CSV/XLSX, scan, AI draft hands off a payload the clerk confirms (AI module). Categories and brands displayed from the master; store does not edit them. Variants, units, tax class via the master. Store price lists and scheduled prices. Online visibility. Extra barcodes. Append-only stock ledger, balance cache, batches and expiry, serials, adjustments (including wastage and damage), transfers, counts, reorder rules, suppliers, purchase orders, goods receipts, purchase returns, supplier payable ledger, low-stock and expiry alerts.

**Screens.** Console: product list, product editor, catalog picker, import wizard, stock list, ledger, adjustment, transfer, count, wastage (adjustment preset), suppliers, PO, goods receipt, purchase return, alerts.

**Endpoints.** 03 §14.

**Tables.** `store_items`, `price_lists`, `store_item_prices`, `store_item_barcodes`, `stock_balances`, `stock_ledger_entries`, `batches`, `serials`, `stock_adjustments`, `stock_adjustment_lines`, `stock_transfers`, `stock_transfer_lines`, `stock_counts`, `stock_count_lines`, `suppliers`, `purchase_orders`, `purchase_order_lines`, `goods_receipts`, `goods_receipt_lines`, `purchase_returns`, `supplier_ledger_entries`, `reorder_rules`.

**Jobs.** `LowStockScanJob`, `ExpiryScanJob`, `RebuildStockBalanceJob` nightly.

**Events.** `store_item.created`, `stock.low`, `stock.negative`.

**Permissions.** `items.manage`, `items.price.manage`, `stock.adjust`, `stock.transfer`, `stock.count`, `purchasing.manage`.

**Entitlements.** `module.inventory`, `limit.products` on create. The default price list is on every plan. Further lists and scheduled prices require `module.price_lists` (OQ-09).

**Edge cases.** Bulk add skips ids that lack the data the margin rule needs and reports them. Scheduled price: the active row is the one with `starts_at <= now` and (`ends_at` null or `>= now`), highest `starts_at` wins. Transfers only between stores in the same tenant. Posting a count writes ledger deltas, not a new absolute balance without a delta. Negative stock is allowed only for the offline sync path and is audited.

**Acceptance.** Ledger replay equals `stock_balances` in a test. Goods receipt increases on-hand and the supplier payable. Bulk add of an already linked master is a no-op success. Deleting a store item soft-deletes and leaves the ledger.

**Milestone.** M3 for items, prices, ledger, barcode. M11 for PO, transfer, count, serials UI.

---

## Customers

**Features.** Profile, addresses, sale and order history, segments, loyalty ledger and tiers, khata ledger, feedback, import/export. Quick create from POS.

**Screens.** Console customer list and detail. POS customer search and quick create. Storefront account, addresses, favourites, loyalty.

**Endpoints.** 03 §15.

**Tables.** `customers`, `customer_addresses`, `customer_segments`, `customer_segment_members`, `loyalty_accounts`, `loyalty_ledger_entries`, `credit_ledger_entries`, `customer_feedback`, `favourites`.

**Jobs.** Segment recompute on `reports` when a segment rule changes.

**Events.** None required beyond audit.

**Permissions.** `customers.manage`, `customers.loyalty.adjust`, `customers.credit.adjust`, `customers.export`.

**Entitlements.** `module.customers`, `module.loyalty`, `module.khata`.

**Edge cases.** Loyalty redeem and khata sale fail closed if the module is off, even if a balance exists. Adjustments require a reason and write the ledger, not a silent balance edit. Import matches `(tenant_id, phone_e164)`.

**Acceptance.** Two tenants can both have a customer with the same phone and neither API returns the other. Khata sale increases the balance; a payment entry decreases it. Export is tenant-scoped.

**Milestone.** Quick create in M4. Full CRM in M12.

---

## Pos

**Features.** Fast billing. Keyboard wedge and camera. Lookup endpoint. Shortcuts. Held bills. Weight and loose qty, manual scale weight, unit conversion, variants, batch/expiry pick, serial capture. Line and bill discounts, promo codes, loyalty redeem, price override with permission and reason. GST inclusive/exclusive, per-line HSN and rate, cess, rounding, invoice series per counter. Payments: cash, UPI, card, wallet, store credit, khata, split, change, payment link/QR via whichever store gateway is enabled. Returns, exchanges (return + new sale), credit notes, void with permission. Customer attach, history. Shift open/close, cash in/out, denominations, X and Z. Receipts go through Printing (58 mm, 80 mm, A4). Multiple counters, pairing, cashier PIN. Low-stock warning, price check, quick keys, favourites. Online orders panel: accept, pack, print pick list, bill (creates the linked sale).

**Offline, Phase 1 only.** `GET pos/bootstrap` caches items, prices, tax, barcodes in IndexedDB. `POST pos/number-blocks` reserves a block of invoice numbers. Completed **cash** bills sit in an IndexedDB outbox and `POST sales/sync` replays them. Client price wins. Stock may go negative. No offline UPI, card, loyalty redeem, return, or order accept.

**Screens.** `/pos` full viewport: left cart (qty, discount, customer, totals, pay), right product grid and search. Top: counter, shift state, customer. Dialogs: pay (split tenders), hold list, return, price override reason, shift close. Not a marketing page. Large targets, keyboard path for every action in the table below.

| Key | Action |
| --- | --- |
| Focus search, wedge + Enter | Add by barcode. Inter-key gap under 50 ms treats input as a wedge, not a human search |
| F2 | Focus search |
| F4 | Customer |
| F8 | Hold |
| F9 | Held bills |
| F12 | Pay |
| Esc | Clear search or close dialog |

**Endpoints.** 03 §16. Order actions used from POS are Orders endpoints.

**Tables.** `shifts`, `cash_movements`, `denomination_counts`, `sales`, `sale_lines`, `sale_line_overrides`, `sale_payments`, `held_sales`, `sale_credit_notes`, `sale_credit_note_lines`, `receipts`, `pos_quick_keys`, `pos_devices`.

**Jobs.** `SyncSaleSideEffectsJob` only if a side effect must be async (receipt send). Stock ledger is synchronous inside the sale transaction so the bill and the stock move commit together.

**Events.** `sale.completed`, `sale.voided`, `sale.returned`, `stock.negative`.

**Permissions.** `pos.sale.create`, `pos.sale.hold`, `pos.sale.void`, `pos.sale.return`, `pos.price.override`, `pos.discount`, `pos.shift.manage`, `pos.cash.movement`.

**Entitlements.** `module.pos`, `module.offline_pos` for number blocks and sync, `module.khata`, `module.loyalty`, `limit.counters`.

**Edge cases.** No open shift → 409 `conflict.shift_open`. Void of a sale that has a return is rejected. Price override without a reason is 422. Split payments must sum to `total_paise` within zero tolerance. Change is only for cash and cannot exceed the cash tender. Offline number block expiry returns unused numbers. Sync of a `client_uuid` that exists returns the original sale.

**Acceptance.** Playwright bills a cash sale, sees stock drop, sees an invoice number. Second submit with the same idempotency key does not double stock. Offline test (later in M4) queues a cash sale with the API stopped, then syncs one row. Z report cash equals opening + cash sales + movements − change.

**Milestone.** Cash sale, wedge lookup, shift, default receipt template, and one successful test print in M4. Remaining tenders, returns, GST edge cases, offline outbox, orders-in-POS, full printer setup in M10. Camera scan in M10.

---

## Storefront

**Features.** Auto-created shell at provision. Branding inside tokens: logo, favicon, one accent from an allow-list (not a free color picker). Homepage section order, banners, collections, announcement, promo codes, hours, SEO fields, policy pages via CMS-like store pages (reuse `cms_pages` with `tenant_id` — add nullable `tenant_id` on `cms_pages`; platform pages have null). Delivery and pickup: pin-code zones and charges, slots, minimum order. Per-item online price and `online_visible`. Tenant gateways on the checkout. Notification template keys for order events.

**Screens.** Console storefront editor. Storefront app: home, category, product, search, cart, checkout, policies. Org host: store list first.

**Endpoints.** 03 §17 storefront and management routes.

**Tables.** `storefronts`, `storefront_sections`, `banners`, `collections`, `collection_items`, `promo_codes`, `delivery_zones`, `delivery_slots`, `store_hours`, `carts`, `cart_lines`. Plus `cms_pages.tenant_id` nullable.

**Jobs.** Purge expired carts daily. Revalidate Next.js tags on publish (`storefront:{id}:home`).

**Events.** Consumes `store_item.created` to refresh search. No own domain event required for section edits beyond audit.

**Permissions.** `storefront.manage`.

**Entitlements.** `module.storefront`. Promo and slots are included. `module.custom_domain` is unused in Phase 1; the domains screen shows platform host only.

**Edge cases.** Accent must be one of the token ids in `@selfx/ui` (`rust`, `ink`, `forest`). Arbitrary hex is 422. A storefront cannot be published if the store has zero online-visible items; it can be saved. Org storefront has no cart of its own.

**Acceptance.** Provision creates a storefront row and a platform shop host. Changing section order changes the public home after revalidation. Pin-code outside every zone cannot check out for delivery. Pickup ignores zones.

**Milestone.** Shell in M1. Public browse and checkout in M5. Editor completeness in M5.

---

## Orders

**Features.** Place order from checkout. Strict state machine in 02. Every transition checks permission, writes `order_status_events`, writes the outbox, broadcasts. Timeline. Partial qty, substitutions, cancel, refund. Link to a sale when invoiced. Realtime to console and PWA. Fallback poll.

**Screens.** Console order list and detail with timeline and action buttons that match the legal edges only. POS orders panel. Storefront tracking page.

**Endpoints.** 03 §17 staff order routes, checkout, streams.

**Tables.** `orders`, `order_lines`, `order_status_events`, `order_refunds`.

**Jobs.** `ReleaseStaleReservationsJob` hourly. Broadcast is the outbox worker, not a special case.

**Events.** `order.placed`, `order.status.changed`.

**Permissions.**

| To status | Permission |
| --- | --- |
| `accepted`, `rejected` | `orders.accept` |
| `packing`, `ready` | `orders.pack` |
| `out_for_delivery`, `ready_for_pickup` | `orders.dispatch` |
| `delivered` | via Delivery OTP, or `delivery.otp.override` |
| `picked_up` | `orders.pickup` |
| `cancelled` | `orders.cancel` |
| `refunded` | `orders.refund` |
| substitution | `orders.substitute` |

**Entitlements.** `module.storefront`. `limit.orders_per_month` on checkout.

**Edge cases.** Customer cancel is allowed only in `placed` and uses the same edge. Prepaid cancel triggers a refund job. COD cancel does not. Double transition with the same idempotency key returns the current order. Reject requires a note. Stock is reserved at `accepted`, released on reject, cancel, or after `reservation_hours` (default 24), and converted to a ledger deduction when the sale is written (OQ-15). The sale row is created when prepaid delivery is captured and `accepted`, when prepaid pickup is `accepted`, and when COD is `delivered` (OQ-14).

**Acceptance.** Playwright moves `placed → accepted → packing → ready → out_for_delivery → delivered` and the storefront timeline matches. An illegal jump returns 409. A socket disconnect then poll returns the missed status.

**Milestone.** Place order M5. Full machine and realtime M6.

---

## Delivery

**Features.** Own staff. Assign on transition to `out_for_delivery`. OTP hash, attempt limit, proof photo optional per store setting. Override permission audited. Interface `DeliveryProvider` with one driver `own_staff`. Partner and 3P drivers are empty classes documented, not registered in the container in Phase 1.

**Screens.** Console delivery list for the signed-in rider. OTP entry. Proof upload. Manager override.

**Endpoints.** 03 §17 delivery routes.

**Tables.** `deliveries`.

**Jobs.** None besides notification of the OTP to the customer through Notifications.

**Events.** `delivery.completed`.

**Permissions.** `delivery.run`, `delivery.otp.override`.

**Entitlements.** `module.delivery`. If the module is off, checkout offers pickup only.

**Edge cases.** OTP compare is constant-time on the hash. Sixth attempt locks and requires override. Proof upload goes through the file scanner hook. Rider sees only assignments for their stores.

**Acceptance.** Wrong OTP does not move the order. Right OTP moves it to `delivered` exactly once. A second provider is addable by implementing the interface without editing the state machine.

**Milestone.** M6.

---

## Printing

**Features.** Command-plan renderer for every printable document and for SaaS invoice PDFs and report PDFs. Block templates (text, spacer, rule, columns, image, barcode, QR, feed, cut) with align, weight, size, uppercase, line gap 0–8, and cut `none|partial|full`. Locales `en`, `te`, `hi`. Platform defaults edited in Super Admin. Tenant owner or manager may override layout, cut, spacing, and text style. Locked blocks on tax documents: invoice number, GSTIN, tax table. Preview uses fixture data and writes nothing.

Printers: SelfX Print Agent on `127.0.0.1:27182` (OS spooler, USB, serial, Bluetooth, LAN 9100 scan), browser raw (WebUSB, WebSerial, WebBluetooth), and the browser print dialog. Drivers: `escpos`, `system`, `epson_epos`, `star_webprnt`, `sdk`. Test print, heartbeat, reprint when the printer was offline. Cash-drawer kick only through the compiler, and only when the profile says `open_drawer_on=cash`. Non-Latin lines rasterize in the agent.

The API does not connect to a printer address.

**Screens.** Admin: Templates (documents, email, SMS, WhatsApp, reports) with edit and preview; Legal entity settings. Console: Settings → Printers (discover, pair, assign to counter, profile, test print, layout editor). POS: printer chip, reprint last bill. Report view: preview PDF.

**Endpoints.** 03 §16a and the notification template routes in §8 for the message half of the same screen.

**Tables.** `document_templates`, `print_profiles`, `printers`, `print_jobs`, `platform_settings`. Message templates stay on `notification_templates`.

**Jobs.** `RenderPdfJob` on `reports` for emailed invoices, receipts, and report exports. Thermal jobs are not queued on the server.

**Events.** `print_job.failed` for the activity feed. Audit on template publish and on legal-entity changes.

**Permissions.** `platform.templates.manage`, `platform.settings.manage`, `printing.printers.manage`, `printing.templates.edit`, `printing.test`. Cashiers get `printing.reprint` only.

**Entitlements.** Receipt print is part of `module.pos`. No separate print module flag. Label sheets follow inventory, which already requires `module.inventory`.

**Edge cases.** Offline printer: sale commits, job stays `queued` on the terminal, POS shows reprint. Two test clicks with the same idempotency key return one job. A template containing raw ESC bytes or a `<script>` is 422. Tenant override cannot delete a locked tax block or clear the specimen watermark on a platform invoice. Agent pairing code expires in 5 minutes. WebUSB requires a user gesture; the POS explains that in one sentence, not a modal tour. Drawer kick never fires on UPI-only bills. Telugu and Hindi lines that the printer cannot glyph become images; if the agent is absent and the browser driver has no raster path, the preview warns and the Latin fallback is the store name in English rather than tofu boxes.

**Acceptance.** A fixture 80 mm template compiles to a plan whose last command is a partial cut and which contains no byte the compiler did not emit. Preview creates zero `print_jobs`. Test print creates one. Replaying `result=printed` does not duplicate. A second tenant's printer id returns 404. Enabling a catalog source is unrelated and stays in Catalog.

**Milestone.** Default 80 mm receipt, browser dialog, and agent test print in M4. Legal entity and SaaS invoice template in M8. Full template studio (email, SMS, WhatsApp, reports, all document kinds) in M9. Discovery, layout editor, drawer, labels, and the optional SDK drivers in M10.

---

## Notifications

**Features.** SMS via MSG91, email via SES, WhatsApp via MSG91, FCM web push. Platform and tenant sender IDs. DLT entity id and template id fields. Templates with variables and locales `en`, `te`, `hi`, edited and previewed from the Super Admin Templates screen. Logs, retries, fallback channel, quotas. Customer OTP as specified in 02. WhatsApp sends only when the template `status` is `approved`.

**Screens.** Admin: providers, the message tab of Templates (edit, preview, test send, approve), message log. Console: template overrides and log (no OTP body).

**Endpoints.** 03 §8.

**Tables.** `notification_providers`, `notification_templates`, `notification_messages`, `push_subscriptions`, `otp_challenges`.

**Jobs.** `DispatchNotificationJob` on `notifications`.

**Events.** Consumes order, billing, OTP, and stock events. Emits `notification.failed`.

**Permissions.** `platform.notifications.manage`, `notifications.templates.manage`.

**Entitlements.** `limit.sms_per_month`, `module.whatsapp`. Email is not quota'd in Phase 1. Push is included with storefront.

**Edge cases.** Fallback: template declares `fallback_channel`. Used only after final failure. OTP SMS does not fall back to email if no email exists. WhatsApp without an approved template is skipped and logged; the order still proceeds. Quota check happens before send and is reserved in Redis then reconciled to usage counts on `notification_messages`. OTP copy is platform-owned and not overridable.

**Acceptance.** OTP hash is not the code. Resend inside 30s returns 429. A forced provider failure retries then marks the message failed. Order `placed` produces one push to store staff subscriptions. A WhatsApp template in `draft` does not send.

**Milestone.** Email in M1 (welcome, English). OTP in M5. Template editor for messages in M9. Push, SMS, and WhatsApp send path in M14. Live credentials can be empty until the Super Admin saves them; the UI shows not configured.

---

## Ai

**Features.** Provider-agnostic gateway: Anthropic, OpenAI, Google. Encrypted keys, model, temperature, max tokens. Per-plan credit quota, usage and cost. Prompt templates versioned. NL reports through tools only: `SalesTotal`, `SalesByDay`, `TopProducts`, `SlowProducts`, `LowStock`, `PaymentsBreakdown`, `GstSummary`. Saved reports, export, citations. Product draft from image, text, or list: returns a proposed store-item payload mapped to a master id when search matches, never publishes a master. PWA assistant tools: `CatalogSearch`, `ProductDetail`, `StorePolicies`, `OrderStatus` (own orders only). Prompt-injection policy: system prompt forbids tool use outside the list; tool arguments are schema-validated; store filter is set by the server, not the model. Logging of prompts with PII stripped (phone, email, GSTIN regex). Kill switch platform-wide and per tenant.

**Screens.** Admin providers, models, prompts, usage, kill switch. Console AI report chat, saved reports, product draft review. Storefront assistant drawer.

**Endpoints.** 03 §12.

**Tables.** `ai_providers`, `ai_models`, `ai_prompt_templates`, `ai_usage`, `ai_reports`, `ai_kill_switch`.

**Jobs.** `AiCompleteJob` on `ai` for any call over a short timeout budget; interactive report queries may run inline up to 20s then fall back to the job.

**Events.** `ai.usage.recorded`.

**Permissions.** `platform.ai.manage`, `ai.reports.use`, `ai.products.draft`. Assistant is customer-auth plus entitlement.

**Entitlements.** `module.ai_reports`, `module.ai_product_create`, `module.ai_assistant`, `limit.ai_credits_per_month`.

**Edge cases.** Kill switch returns `ai.killed` before the provider call. Credits exhausted returns `ai.credits_exhausted`. The model asking for a tool not in the allow-list is dropped and logged. Customer assistant cannot take a `tenant_id` argument. Product draft does not write `store_items` until the clerk confirms through the Inventory endpoint.

**Acceptance.** A fixture prompt "run this SQL" returns an answer that used zero SQL and says it cannot. Usage row stores token counts and cost paise. Cross-tenant product titles never appear in assistant tool output (test seeds two stores).

**Milestone.** M15. Gateway interface stub can wait until then; do not block POS on it.

---

## Cms

**Features.** Landing and legal pages. Sections, blocks, media library, SEO, draft and preview. Pricing block reads live plans; an editor can hide a plan from the page without unpublishing the plan (`plan_prices` stays; block config lists visible plan codes).

**Screens.** Admin CMS page tree, section editor, media library, preview. Marketing site renders published pages.

**Endpoints.** 03 §9.

**Tables.** `cms_pages`, `cms_sections`, `cms_blocks`, `cms_media`, `cms_seo`, `leads`.

**Jobs.** None. Publish triggers an HMAC call to the marketing app's revalidate route.

**Events.** Audit only.

**Permissions.** `platform.cms.manage`.

**Entitlements.** None.

**Edge cases.** Preview token cannot be reused after expiry. Public route 404s drafts. Media mime allow-list: jpeg, png, webp, avif. No SVG (XSS).

**Acceptance.** Editing a draft does not change the production page. Publish updates the page within the ISR window (test hits revalidate). Contact form creates a `leads` row and an email to the platform inbox.

**Milestone.** M9.

---

## Apps

**Features.** Release records for Android, iOS, Windows, desktop. Version, notes, channel stable/beta, min OS, checksum, rollout percent, deprecation. Tenant download gated by entitlement. Signed URL, virus-scan hook, download log.

**Screens.** Admin release list and upload. Console downloads page showing only entitled platforms.

**Endpoints.** 03 §11.

**Tables.** `app_releases`, `app_downloads`.

**Jobs.** `ScanUploadedFileJob` on `media` before `status` can become `published`.

**Events.** Audit only.

**Permissions.** `platform.apps.manage`. Tenant: `apps.download`.

**Entitlements.** `apps.android`, `apps.ios`, `apps.windows`, `apps.desktop`.

**Edge cases.** Rollout percent: stable random by `tenant_id` hash so a tenant does not flap between versions. Checksum mismatch on upload rejects the file. Scan failure blocks publish. Phase 1 may have zero binaries; the module still ships so the pipeline exists.

**Acceptance.** Tenant without the feature gets 403 on download. Signed URL expires. Download log row written. Unpublished release is invisible on the tenant list.

**Milestone.** M16.

---

## Reporting

**Features.** Tenant: sales, P&L (sales minus COGS from ledger cost), GST summary, stock valuation, best and slow movers, staff/shift, customer/loyalty, payments. Filters, CSV/XLSX/PDF export, scheduled email. Each PDF report binds a `document_templates` row of kind `report`, editable and previewable in Super Admin. Platform analytics: tenants, active, churned, MRR, ARR, signups, revenue by plan, GMV, orders, top tenants, catalog growth, system health. Charts fed by aggregate tables. Date range and comparison period. Drill-down goes to the underlying list endpoint with the same filters. Export.

**Screens.** Admin home. Console dashboard and `/reports/*`.

**Endpoints.** `GET /platform/analytics/*`, `GET /dashboard/*`, `GET /reports/*` in 03.

**Tables.** `daily_store_metrics`, `platform_daily_metrics`, `report_definitions`, `report_schedules`, `report_runs`. `report_definitions.document_template_id` points at the PDF layout.

**Jobs.** `AggregateDashboardMetricsJob`, `ReportScheduleJob`, export jobs on `reports`.

**Events.** Consumes `sale.completed` to increment today's partial aggregate, or simply relies on the one-minute job. Prefer the job so POS transactions stay short. Accept up to one minute of dashboard lag.

**Permissions.** `reports.view`, `reports.export`, `reports.schedule`. Platform: `platform.analytics.view`.

**Entitlements.** Basic dashboard is on for every plan. `module.reports_advanced` gates GST pack, schedules, and P&L.

**Edge cases.** Comparison range is the previous window of equal length. Profit uses `unit_cost_paise` on the ledger at sale time, snapshotted onto the sale line (add `sale_lines.unit_cost_paise`). If cost is null, P&L excludes that line and reports the gap. Heavy endpoints read aggregates only.

**Acceptance.** A sale completed in a test appears in `daily_store_metrics` after the job. Export CSV opens with the filtered totals. A tenant token cannot read `platform_daily_metrics`.

**Milestone.** Minimal tenant dashboard counts in M4 (direct queries acceptable only for the demo, then switched to aggregates). Platform home M9. Full report pack M13.

Add column `sale_lines.unit_cost_paise bigint nullable`. This is the COGS snapshot.

---

## Audit

**Features.** Searchable audit: actor, impersonator, action, subject, before/after, IP, user agent, tenant. Tenant-facing activity is the same table filtered. Failed jobs, queue metrics, scheduler heartbeat, health of DB, Redis, storage, Typesense. Error tracking is Sentry, linked from the health screen, not reimplemented. Uptime is the external monitor in 07. API latency is Sentry or the load balancer, surfaced as a link.

**Screens.** Admin audit search, failed jobs, health. Console activity on tenant settings for owners.

**Endpoints.** 03 §2 and §10.

**Tables.** `audit_logs`, `domain_outbox`, `idempotency_keys`.

**Jobs.** `CreateNextPartitionsJob`, `PruneIdempotencyKeysJob`. Outbox publisher on `outbox`.

**Events.** Listens for `AuditableAction` from every module.

**Permissions.** `platform.audit.view`, `platform.jobs.retry`, `audit.view` (tenant owner).

**Entitlements.** None.

**Edge cases.** Deny-list of secret fields. RLS on tenant reads. Platform role required to see cross-tenant rows. Health ready fails if the outbox oldest unpublished row is older than 2 minutes (signal, not a user error).

**Acceptance.** Impersonated price override stores both ids. A tenant user hits `/platform/audit-logs` and gets 403. Failed job retry re-runs the job once.

**Milestone.** Audit writes from M1. Admin screens M9.

---

## Cross-cutting acceptance for the vertical slice

By the end of M6 a reviewer can, on a fresh staging tenant:

1. Super admin creates a tenant and sees provision steps go green.
2. Owner sets a password, searches the global catalog, bulk-adds items with a margin rule.
3. Owner opens a shift and completes a cash sale; stock and invoice number exist.
4. Customer PWA checks out (COD is enough); the console receives the order; staff walk the status machine; the PWA timeline updates.

---

## Traceability

Requirement ids are the Phase 1 surface list from the brief. "Endpoints" names the 03 group. "Tables" names the owning tables, not every child.

| ID | Requirement | Module | Endpoints | Tables | Milestone |
| --- | --- | --- | --- | --- | --- |
| WEB-01 | Marketing hero and product sections: POS, online store, inventory, delivery, analytics, AI | Cms | public cms pages | `cms_pages`, `cms_sections`, `cms_blocks` | M9 |
| WEB-02 | Pricing from live plans | Plans, Cms | `GET /public/plans` | `plans`, `plan_prices` | M9 |
| WEB-03 | FAQ, contact, demo request | Cms | `POST /public/leads` | `leads`, `cms_pages` | M9 |
| WEB-04 | Header Admin Login and Tenant Login | Identity | staff and platform login | `users` | M1 |
| WEB-05 | CMS sections, copy, images, pricing visibility, SEO, legal | Cms | platform cms routes | `cms_*` | M9 |
| WEB-06 | SEO metadata, sitemap, structured data, static generation with revalidation | Cms | `GET /public/sitemap` | `cms_seo` | M9 |
| SA-A1 | Analytics: tenants, active, churn, MRR/ARR, signups, revenue by plan, GMV, orders, top tenants, catalog growth, health | Reporting, Audit | platform analytics | `platform_daily_metrics` | M9 |
| SA-A2 | Charts: area, line, bar, donut, pie, stacked, heatmap, sparkline | Reporting | analytics series | `platform_daily_metrics` | M9 |
| SA-A3 | Date range, comparison, drill-down, export | Reporting | analytics + export | `report_runs` | M9 |
| SA-A4 | Heavy aggregates precomputed | Reporting | — | `platform_daily_metrics` | M9 |
| SA-B1 | Create tenant with email and password | Tenancy, Identity | `POST /platform/tenants` | `tenants`, `users` | M1 |
| SA-B2 | Business details, unique subdomain, reserved names | Tenancy | tenants, reserved-slugs | `tenants`, `reserved_slugs` | M1 |
| SA-B3 | Plan and billing cycle on create | Tenancy, Plans | `POST /platform/tenants` | `subscriptions`, `plan_prices` | M1 |
| SA-B4 | Welcome email, forced password change | Tenancy, Identity, Notifications | password change | `users`, `notification_messages` | M1 |
| SA-B5 | Impersonation banner and audit | Tenancy, Audit | impersonate, leave | `impersonation_sessions`, `audit_logs` | M9 |
| SA-B6 | List, search, filter, suspend, reactivate, soft-delete, restore | Tenancy | tenant routes | `tenants` | M1 |
| SA-B7 | Usage, subscription, invoices, activity | Tenancy, Billing, Audit | tenant sub-resources | `subscriptions`, `billing_invoices`, `audit_logs` | M8 |
| SA-B8 | Provision store, PWA, roles, settings; idempotent; queued; progress; retry | Tenancy, Storefront | provision, retry | `tenant_provision_steps`, `stores`, `storefronts` | M1 |
| SA-C1 | Plans Starter, Professional, Enterprise | Plans | plan CRUD | `plans` | M7 |
| SA-C2 | Price per cycle, trial days, currency, taxes | Plans, Billing | prices, invoices | `plan_prices`, `billing_invoices` | M7, M8 |
| SA-C3 | Feature matrix: toggles and numeric limits | Plans | features, plan features | `features`, `plan_features` | M7 |
| SA-C4 | Entitlement registry, overrides, Redis, audit | Plans, Audit | entitlements | `tenant_feature_overrides`, `audit_logs` | M7 |
| SA-C5 | Backend enforcement | Plans | middleware on all gated routes | — | M7 |
| SA-D1 | Organizations with several stores | Tenancy | organizations, stores | `tenants`, `stores` | M1 schema, M16 UI if not earlier |
| SA-D2 | Org plans and billing separate from a second per-store subscription | Plans, Billing | subscription | `subscriptions` | M8 |
| SA-D3 | Store limits and combined storefront | Plans, Storefront | organization storefront, `limit.stores` | `storefronts` | M5 org list, M7 limits |
| SA-E1 | Subscription trial, active, past due, grace, suspended, cancelled | Billing | subscription | `subscriptions` | M8 |
| SA-E2 | Upgrade and downgrade with proration | Billing | subscription change | `billing_invoice_lines` | M8 |
| SA-E3 | GST invoices PDF, credit notes, coupons | Billing | invoices, credit notes, coupons | `billing_invoices`, `billing_credit_notes`, `billing_coupons` | M8 |
| SA-E4 | Dunning, retries, manual and offline payments | Billing, Payments | record payment, dunning job | `dunning_attempts`, `billing_payments` | M8 |
| SA-E5 | MRR and churn | Reporting | analytics summary | `platform_daily_metrics` | M9 |
| SA-F1 | PhonePe, Paytm, Razorpay, Cashfree, plus any later driver | Payments | gateways | `payment_gateways` | M5 drivers, M8 platform billing |
| SA-F2 | Adapter interface | Payments | — | — | M5 |
| SA-F3 | Encrypted credentials, test vs live | Payments | gateways | `payment_gateways` | M5 |
| SA-F4 | Verified idempotent webhooks | Payments | `POST /webhooks/payments/{provider}` | `webhook_receipts` | M5 |
| SA-F5 | Transaction ledger and reconciliation | Payments | transactions, reconciliation | `payment_ledger_entries`, `reconciliation_lines` | M8 |
| SA-G1 | SMS/OTP, FCM web push, email | Notifications | providers, push subscriptions | `notification_providers`, `push_subscriptions` | M14 |
| SA-G2 | Sender IDs, India DLT fields | Notifications | providers, templates | `notification_providers`, `notification_templates` | M14 |
| SA-G3 | Templates, variables, languages, preview | Notifications, Printing | notification-templates, document-templates | `notification_templates`, `document_templates` | M9 |
| SA-G4 | Delivery logs, retries, fallback, quotas | Notifications | messages | `notification_messages` | M14 |
| SA-G5 | Customer OTP: hash, expiry, attempts, rate limit, resend, provider-agnostic | Identity, Notifications | customer otp | `otp_challenges` | M5 |
| SA-G6 | Invoice, email, SMS, WhatsApp, and report templates edited and previewed in Super Admin | Printing, Notifications, Reporting | document-templates, notification-templates, settings | `document_templates`, `notification_templates`, `platform_settings` | M8 invoice, M9 the rest |
| SA-H1 | CMS pages, sections, blocks, media, SEO, drafts, preview | Cms | cms routes | `cms_*` | M9 |
| SA-I1 | Searchable audit who/what/before/after/IP/tenant | Audit | audit-logs | `audit_logs` | M9 |
| SA-I2 | Activity, app logs, queues, failed jobs, scheduler | Audit | failed-jobs, jobs/metrics | Horizon tables, `audit_logs` | M9 |
| SA-I3 | DB, Redis, storage health | Audit | `/health/ready` | — | M0 |
| SA-I4 | Error tracking, uptime, API latency | Audit | health screen links | Sentry, external uptime | M9 |
| SA-J1 | Apps manager for future clients | Apps | app-releases | `app_releases` | M16 |
| SA-J2 | Versions, notes, channels, platform, min OS, checksum, rollout, deprecation | Apps | app-releases | `app_releases` | M16 |
| SA-J3 | Signed URLs, virus scan, download logs, entitlement | Apps | download | `app_downloads` | M16 |
| SA-K1 | AI gateway Anthropic, OpenAI, Google | Ai | ai providers | `ai_providers` | M15 |
| SA-K2 | Encrypted keys, temperature, limits, quotas, usage, cost | Ai | models, usage | `ai_models`, `ai_usage` | M15 |
| SA-K3 | Prompt templates | Ai | prompts | `ai_prompt_templates` | M15 |
| SA-K4 | NL reports via tools, never raw SQL | Ai, Reporting | `POST /ai/reports/query` | `ai_reports` | M15 |
| SA-K5 | Saved reports, exports, citations | Ai | ai reports | `ai_reports` | M15 |
| SA-K6 | AI product create from photos, lists, text, mapped to catalog | Ai, Catalog, Inventory | `POST /ai/products/draft` | `ai_usage`, `store_items` | M15 |
| SA-K7 | Customer shopping assistant, injection guardrails, catalog scope | Ai | storefront assistant | `ai_usage` | M15 |
| SA-K8 | AI logging, rate limits, PII minimisation, kill switch | Ai | kill-switch, usage | `ai_kill_switch`, `ai_usage` | M15 |
| SA-L1 | Master products and the fields listed in the brief | Catalog | catalog products | `catalog.products` and children | M2 |
| SA-L2 | Ingestion CSV, Excel, JSON, images, external APIs | Catalog | imports, sources | `import_batches`, `import_rows`, `external_sources` | M2 |
| SA-L3 | Pipeline: stage, validate, normalise, duplicates, merge/split, enrich, review, publish, rollback, history | Catalog | imports, review, merge, rollback | `product_versions`, `duplicate_candidates` | M2 |
| SA-L4 | Governance: categories, brands, attributes, bulk edit, soft delete, audit, quality, submissions | Catalog | categories, brands, submissions, quality | `categories`, `brands`, `product_submissions` | M2 |
| SA-L5 | Catalog search and export, API for apps | Catalog | catalog search, export, open items | Typesense `catalog_products` | M2 |
| SA-L6 | Separate catalog schema, link not copy, search read model | Catalog, Inventory | — | `catalog.*`, `store_items` | M2, M3 |
| SA-L7 | Browse, one-click and bulk add, margin rules, own price and stock and overrides | Inventory | from-catalog, items | `store_items`, `store_item_prices` | M3 |
| SA-L8 | Universal barcode and QR: GTIN, check digit, Digital Link, multiple barcodes, store-private | Catalog, Pos, Inventory | barcode lookup, pos lookup | `catalog.identifiers`, `store_item_barcodes` | M2, M4 |
| TN-A | Tenant dashboard KPIs, charts, filters | Reporting | dashboard | `daily_store_metrics` | M4 basic, M13 full |
| TN-B1 | POS fast billing, search, shortcuts, held bills | Pos | sales, hold, recall | `sales`, `held_sales` | M4, M10 |
| TN-B2 | Wedge and camera barcode | Pos | pos lookup | — | M4 wedge, M10 camera |
| TN-B3 | Weight, loose items, unit conversion, variants, batch, serial | Pos, Inventory | sales | `sale_lines`, `batches`, `serials` | M10 |
| TN-B4 | Discounts, coupons, loyalty, price override with reason | Pos, Customers | sales | `sale_line_overrides`, `promo_codes` | M10 |
| TN-B5 | GST, HSN, inclusive/exclusive, cess, rounding, invoice series | Pos | sales | `sales`, `sale_lines`, `invoice_series` | M4 basic, M10 complete |
| TN-B6 | Payments: cash, UPI, card, wallet, store credit, khata, split, change, payment link | Pos, Payments | sales | `sale_payments` | M4 cash, M10 rest |
| TN-B7 | Returns, exchanges, credit notes, void | Pos | returns, void | `sale_credit_notes` | M10 |
| TN-B8 | Customer attach, quick create, history, loyalty | Customers, Pos | customers | `customers` | M4 quick, M12 full |
| TN-B9 | Shift, cash in/out, denomination, X and Z, day end | Pos | shifts | `shifts`, `cash_movements` | M4 |
| TN-B10 | Receipts thermal, A4, PDF, WhatsApp, SMS, email | Printing, Pos, Notifications | print-jobs, receipt send | `document_templates`, `print_jobs`, `receipts` | M4 print, M14 send |
| TN-B11 | Counters, pairing, cashier PIN, permissions | Pos, Identity | pin, pair | `counters`, `staff_pins`, `pos_devices` | M4 |
| TN-B15 | Printer discovery, layout, cut, spacing, text style, any connected printer | Printing | printers, document-templates | `printers`, `print_profiles`, `document_templates` | M4 agent, M10 editor |
| TN-B12 | Offline: outbox, client UUID, idempotent sync, conflict rules | Pos | bootstrap, number-blocks, sync | `invoice_number_blocks`, `sales.client_uuid` | M10 |
| TN-B13 | Low stock, price check, quick keys, hold/recall | Pos, Inventory | quick-keys, lookup | `pos_quick_keys` | M10 |
| TN-B14 | Online orders inside POS: accept, pack, pick list, bill | Pos, Orders | orders, pick-list, sales | `orders`, `sales.order_id` | M6, M10 |
| TN-C1 | Products manual, CSV, scan | Inventory | items, import, lookup | `store_items` | M3 |
| TN-C2 | Global catalog search, filter, multi-select, one-click, bulk, margin | Inventory, Catalog | from-catalog | `store_items` | M3 |
| TN-C3 | AI from images and text | Ai, Inventory | ai products draft | `ai_usage` | M15 |
| TN-C4 | Categories, brands, variants, units, tax, images, store price, online visibility, price lists, scheduled prices, multiple barcodes | Inventory, Catalog | items | `store_item_prices`, `store_item_barcodes` | M3 |
| TN-D1 | Append-only stock ledger | Inventory | stock ledger | `stock_ledger_entries` | M3 |
| TN-D2 | Batches, expiry | Inventory | goods receipts, items | `batches` | M11 |
| TN-D3 | Adjustments with reasons, wastage | Inventory | adjustments | `stock_adjustments` | M11 |
| TN-D4 | Transfers | Inventory | transfers | `stock_transfers` | M11 |
| TN-D5 | Counts and audits | Inventory | counts | `stock_counts` | M11 |
| TN-D6 | Reorder, suppliers, PO, goods receipt, purchase returns, payables | Inventory | suppliers, PO, receipts | `purchase_orders`, `supplier_ledger_entries` | M11 |
| TN-D7 | Low-stock and expiry alerts | Inventory, Notifications | stock alerts | `reorder_rules` | M11 |
| TN-E1 | Customer profiles, addresses, history | Customers | customers | `customers`, `customer_addresses` | M12 |
| TN-E2 | Segments | Customers | customer-segments | `customer_segments` | M12 |
| TN-E3 | Loyalty points and tiers | Customers | loyalty | `loyalty_ledger_entries` | M12 |
| TN-E4 | Credit ledger | Customers | credit | `credit_ledger_entries` | M12 |
| TN-E5 | Feedback | Customers | feedback | `customer_feedback` | M12 |
| TN-E6 | Import and export | Customers | import, export | `customers` | M12 |
| TN-F1 | Online store auto-created, own subdomain | Tenancy, Storefront | storefront | `storefronts`, `store_domains` | M1, M5 |
| TN-F2 | Custom domain designed, not shipped | Storefront | — | `store_domains.type=custom` | schema M1 |
| TN-F3 | Branding inside the design system | Storefront | storefront patch | `storefronts.accent_token` | M5 |
| TN-F4 | Homepage sections, banners, collections, announcement, offers, coupons | Storefront | sections, banners, collections, promos | matching tables | M5 |
| TN-F5 | Delivery/pickup, pin-code zones, charges, slots, minimum, hours, SEO, policies | Storefront | zones, slots, hours | `delivery_zones`, `delivery_slots`, `store_hours` | M5 |
| TN-F6 | Per-product online price and availability | Inventory, Storefront | items | `store_items.online_visible` | M3, M5 |
| TN-F7 | Tenant payment gateways, encrypted, test/live, webhooks, transactions | Payments | store gateways | `payment_gateways` | M5 |
| TN-F8 | Notification templates for order events | Notifications | notification-templates | `notification_templates` | M14 |
| TN-G1 | Realtime new order: sound, push, optional WhatsApp | Orders, Notifications | streams, push | `domain_outbox`, `push_subscriptions` | M6, M14 |
| TN-G2 | Strict order state machine | Orders | transitions | `orders`, `order_status_events` | M6 |
| TN-G3 | Permission on every transition, timeline | Orders | timeline | `order_status_events` | M6 |
| TN-G4 | Realtime to console and customer PWA, fallback, retries | Orders | streams, Reverb | `domain_outbox` | M6 |
| TN-G5 | Own-staff delivery, OTP, proof; provider interface | Delivery | delivery assignments | `deliveries` | M6 |
| TN-G6 | Cancel, partial, substitutions, refunds, returns | Orders, Pos | transitions, substitutions, refunds | `order_lines`, `order_refunds` | M6 |
| TN-H1 | Roles owner, manager, cashier, inventory, delivery, custom | Identity, Tenancy | roles | `roles`, `model_has_roles` | M1 |
| TN-H2 | Granular permissions per module and store | Identity | role permissions | `model_has_roles.store_id` | M1 |
| TN-H3 | Attendance, shifts, activity | Identity, Pos, Audit | attendance, shifts | `shifts`, `audit_logs` | M10 attendance, M4 shifts |
| TN-I1 | Tenant plan, usage, upgrade, downgrade, cycle | Billing, Plans | billing subscription, usage | `subscriptions` | M8 |
| TN-I2 | Invoices and payment methods | Billing, Payments | billing invoices, checkout | `billing_invoices` | M8 |
| TN-I3 | Limit warnings | Plans | entitlements, usage | `features` | M7 |
| TN-J1 | Each store its own PWA | Storefront | storefront per store | `storefronts` | M5 |
| TN-J2 | Org combined PWA, store selection, per-store price and stock | Storefront, Inventory | `GET /storefront/stores` | `storefronts.scope` | M5 |
| TN-J3 | Org dashboards, reports, roles, catalogs, transfers | Reporting, Inventory, Identity | dashboard, transfers, roles | `stock_transfers`, `daily_store_metrics` | M11, M13 |
| TN-K1 | Integrations: gateways, SMS, WhatsApp, email | Payments, Notifications | gateways, providers | those tables | M8, M14 |
| TN-K2 | Accounting export Tally-shaped; Zoho-style later | Reporting | reports export | `report_runs` | M13 |
| TN-K3 | GST reports | Reporting | reports gst | `sales`, `sale_lines` | M13 |
| TN-K4 | Hardware: any connected printer, scanners, scales, drawers | Printing, Pos | printers, print-jobs | `printers`, `print_jobs` | M4, M10 |
| TN-K5 | Outbound webhooks and public REST API keys | Audit (tables), Tenancy | api-keys, webhook-endpoints, open | `api_keys`, `webhook_endpoints` | M16 |
| TN-K6 | Store, tax, receipt settings | Tenancy, Pos | store settings | `stores.settings` | M4 |
| TN-K7 | Backups and data export | Reporting | exports | `report_runs` | M16 |
| TN-K8 | App downloads | Apps | app-releases | `app_releases` | M16 |
| TN-L1 | Tenant AI chat with business data | Ai | ai reports query | `ai_reports` | M15 |
| TN-L2 | AI reports and product entry | Ai | reports, product draft | `ai_usage` | M15 |
| TN-L3 | Insights: reorder, pricing, slow movers | Ai, Reporting | tools SlowProducts, LowStock | `daily_store_metrics` | M15 |
| TN-M1 | Reports: sales, P&L, GST, stock valuation, movers, staff, loyalty, payments | Reporting | reports | `report_definitions`, aggregates | M13 |
| TN-M2 | Filters, scheduled email, CSV, Excel, PDF | Reporting | export, schedules | `report_schedules`, `report_runs` | M13 |
| CU-01 | Installable, fast, mobile-first, poor networks | Storefront | — | — | M5 |
| CU-02 | Open from link or QR; org PWA lists stores | Storefront | storefront stores | `storefronts` | M5 |
| CU-03 | Home banners, categories, collections, offers | Storefront | home | `banners`, `collections` | M5 |
| CU-04 | Search, suggestions, typo tolerance | Storefront, Catalog | search, suggest | Typesense `store_items` | M5 |
| CU-05 | Category and product pages, cart, checkout | Storefront, Orders | cart, checkout | `carts`, `orders` | M5 |
| CU-06 | Address, delivery or pickup, slots, coupons, tenant gateways | Storefront, Payments | checkout | `orders`, `payment_transactions` | M5 |
| CU-07 | Phone OTP login | Identity | customer otp | `otp_challenges` | M5 |
| CU-08 | Order history, addresses, reorder, favourites | Customers, Orders | storefront me | `favourites`, `customer_addresses` | M5 history, M12 favourites depth |
| CU-09 | Loyalty and wallet where enabled | Customers | loyalty | `loyalty_accounts` | M12 |
| CU-10 | Realtime tracking, same status flow | Orders | streams, order get | `order_status_events` | M6 |
| CU-11 | AI shopping assistant, plan-gated | Ai | assistant messages | `ai_usage` | M15 |
| CU-12 | Web push | Notifications | push-subscriptions | `push_subscriptions` | M14 |

Attendance storage: add `attendance_punches` (`tenant_id`, `user_id`, `store_id`, `direction`, `occurred_at`) in M10. It is not a payroll ledger.

Hardware note for TN-K4: Phase 1 printing is the Printing module. The agent covers any OS-installed printer and ESC/POS on USB, serial, Bluetooth, and port 9100. Chrome and Edge can also drive ESC/POS via WebUSB, WebSerial, and WebBluetooth. The browser print dialog remains the fallback. Cash drawer kick is an ESC/POS command from the compiler when the profile allows it. Scales stay manual weight entry. Barcode scanners are keyboard wedge and camera. Vendor SDKs plug in as drivers on the agent. Laravel does not open printer sockets. Quotations, payroll, and recruitment stay out of scope (OQ-13).
