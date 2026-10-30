# Full platform analysis

Date: 29 October 2026  
Scope: static code-path audit of `/Users/surya/Desktop/retail`, plus `php artisan test` in `backend`.  
This is not a live click-through of every screen. No application code was changed for this report.  
The Flutter POS app under `pos_app/` is listed in `.gitignore` and was not present for review.

Verdict: the counter, catalog, stock, and messaging integrations are real. Plan controls, live card and UPI collection, and printer setup can look successful while the server does something else, or nothing. Do not ship this as a paid multi-tenant product until the blockers below are fixed.

Code-path readiness is a judgment from this audit, scored 0–100. It is not a load test.

| Area | Readiness (0–100) |
|---|---:|
| POS cash, shifts, returns | 78 |
| Catalog and inventory | 72 |
| WooCommerce, Shopify, WhatsApp, Sheets | 68 |
| Staff identity and stores | 70 |
| Single-store storefront | 62 |
| Super Admin settings truth | 34 |
| Printer setup end to end | 32 |
| SaaS billing collection | 30 |
| Plan enforcement | 28 |
| Prepaid checkout | 18 |

Ship bar used in the review: 80.

Counts from the same pass:

- 9 blockers
- 31 plan feature keys seeded
- 8 of those keys checked on an API request
- 1 of those keys hides a console menu (Customers)
- 0 live payment-provider drivers
- PHPUnit: 91 passed, 1 failed, about 17 seconds, 1,360 assertions, 92 tests

---

## 1. What already holds

These paths are implemented and backed by controllers, persistence, and in most cases tests.

- Staff login, platform login, two-factor challenge, phone OTP, forced password change, store switch, terminal select.
- Tenant create, suspend, reactivate, provision steps, impersonation start and stop. Suspended tenants are excluded from staff login (`LoginUser.php`).
- Cash sales, recorded counter UPI, recorded counter card, khata (when `module.khata` is on), shifts, cash movements, holds, returns, exchanges, voids, offline sale sync when `module.offline_pos` is on.
- Stock ledger, adjustments, purchases, purchase returns, supplier payments, stock counts, transfers, batches, stock alerts.
- Coupons. Loyalty earn and redeem when `module.loyalty` is on.
- Catalog browse, tenant-owned products, categories, brands, units, prices, opening stock, labels, import.
- Customers, import and export, segments, attendance, staff and roles.
- Single-store storefront: public store payload, items, OTP, cart checkout API, track order, contact, subscribe, try-on and storefront AI when configured.
- Shopify and WooCommerce test and sync (real HTTP). Telegram, WhatsApp, Google Sheets, and signed outbound webhooks (real HTTP). Order notify goes through `IntegrationNotifier`.
- Gateway and integration secrets encrypted at rest. Impersonation blocks gateway credential writes.
- Custom prepaid webhook HMAC plus idempotency in `CapturePrepaidPayment`, covered by `PrepaidGatewayTest` up to the assertion that currently fails (see section 12).
- `EscposDriver` emits real ESC/POS bytes, including QR and barcode, when a `print_profiles` row and a `document_templates` row already exist. `POST /printers/{id}/test-print` compiles real bytes. Backend pairing (`pair-code` then `pair`) works when called correctly.
- Super Admin settings that do propagate: auth methods, maps API key, maintenance mode, SMS providers. Platform mail test and SMS test use the saved cache.
- Console billing page, plan list, change-plan, invoices, and manual UTR recording exist as APIs.
- Reports: sales, payments, customers, stock, products, profit, shifts, dashboard, HSN, day book, GST audit pack, GSTR-1 download and preview, staff sales, discounts, category sales, item ledger, purchase register, export, audit, schedules.
- Financial report services exist for profit and loss, cash flow, and balance sheet. Inventory report services exist for dead stock, ageing, shrinkage, fast-moving, and slow-moving. Several of these have no console screen (section 8).
- Apps and updates, legal entity, platform admins, platform health, logs, backups, and queue status endpoints exist on the platform API.
- Tenant isolation middleware `tenant.enforce` (`EnforceTenantContext`) is registered. There is a dangerous fallback described in section 9.

---

## 2. How the system is laid out

| Piece | Path |
|---|---|
| API | `backend/routes/api.php` (all routes under `/api/v1`) |
| Plans and entitlements | `backend/app/Modules/Plans` |
| Billing and platform settings | `backend/app/Modules/Billing` |
| Payments | `backend/app/Modules/Payments` |
| Integrations | `backend/app/Modules/Integrations` |
| Printing | `backend/app/Modules/Printing` |
| POS and checkout | `backend/app/Modules/Pos` |
| Local print helper | `print-agent/main.go` on `127.0.0.1:27182` |
| Super Admin UI | `frontend/apps/admin` with `basePath: /superadmin` |
| Tenant console | `frontend/apps/console` |
| Storefront | `frontend/apps/storefront` |
| Shared rewrite | each Next app proxies `/api/:path*` to `http://127.0.0.1:8000/api/:path*` |

Documented design in `docs/plan/` describes Redis entitlement cache, `EnsureEntitled` middleware, override expiry and reason, and `GET /api/v1/entitlements`. None of those exist in code. `bootstrap/app.php` does not register `EnsureEntitled`.

---

## 3. Plans, entitlements, and Super Admin to tenant reflection

### 3.1 Resolution order

`backend/app/Modules/Plans/Support/Entitlement.php` method `value()`:

1. Read `subscriptions.plan_id` for the tenant. No subscription means every feature is 0.
2. If `tenant_feature_overrides` has a row for that feature, return that integer. Expiry is not checked. The override table has no `expires_at` and no `reason` (`2026_10_19_330000_add_pin_overrides_keys_and_expiry.php`).
3. Otherwise read `plan_features.value`. Missing row means 0.
4. `allows()` is `value > 0`. Integer `-1` is treated as unlimited only inside `assertOrders`.

There is no Redis cache and no cache flush on plan or override writes. A plan edit is visible on the next request because the resolver reads the database directly.

`assertOrders()` counts rows in `orders` created this month plus walk-in `sales` with `order_id` null. `BillingController` usage counts the orders table only. The billing page and the enforcement cap disagree.

### 3.2 Seeded feature keys

From `backend/database/seeders/DatabaseSeeder.php`.

Boolean modules and apps:

- `module.pos`
- `module.inventory`
- `module.storefront`
- `module.delivery`
- `module.customers`
- `module.loyalty`
- `module.khata`
- `module.reports_advanced`
- `module.price_lists`
- `module.ai_reports`
- `module.ai_product_create`
- `module.ai_assistant`
- `module.accounting_export`
- `module.webhooks`
- `module.api_keys`
- `module.custom_domain`
- `module.multi_store`
- `module.offline_pos`
- `module.whatsapp`
- `apps.android`
- `apps.ios`
- `apps.windows`
- `apps.desktop`

Integer limits (`-1` means unlimited in seed data):

- `limit.stores`
- `limit.staff`
- `limit.products`
- `limit.orders_per_month`
- `limit.storage_mb`
- `limit.sms_per_month`
- `limit.ai_credits_per_month`
- `limit.counters`

The admin plans screen (`frontend/apps/admin/app/(app)/plans/page.tsx`) labels these keys. `PlanController::update` can also create arbitrary keys through `new_features`. That insert is broken (section 3.5).

### 3.3 Where each key is actually enforced

| Key | Enforced? | Where |
|---|---|---|
| `limit.orders_per_month` | Yes, via `Entitlement` | `PlaceOrder`, `CompleteCashSale`, caught in `SaleController` |
| `module.offline_pos` | Yes | `SaleController` number-block and offline sync |
| `module.khata` | Yes | `CompleteCashSale`, `CustomerController` khata |
| `module.loyalty` | Yes | `PostLoyalty` |
| `module.ai_reports` and `limit.ai_credits_per_month` | Partial | `ReportAnswerController`. Credit accounting is a “limit is 0” check, not a monthly debit |
| `module.webhooks` | Yes | `WebhookEndpointController` |
| `module.api_keys` | Yes | `ApiKeyController` |
| `limit.staff` | Partial, ignores overrides | `StaffController::staffLimit` reads `plan_features` only |
| `limit.products` | Partial, ignores overrides | `AddStoreItems::limit` reads `plan_features` only |
| `module.multi_store` | Provision only | `CreateTenant` when kind is organization |
| `module.pos` | No | POS sale routes stay open |
| `module.storefront` | No | Public catalog and checkout stay open |
| `module.inventory` | No | Inventory routes stay open |
| `module.delivery` | No | Delivery routes stay open. Flag is returned to the client and unused |
| `module.customers` | No on the API | Console shell hides `/customers` when the flag is false. `CustomerController::store` still accepts creates |
| `module.reports_advanced` | No | Returned by `billing/features`. Report controllers do not check it |
| `module.price_lists` | No | |
| `module.ai_product_create` | No | |
| `module.ai_assistant` | No | `AiAssistantController` tenant and storefront chat do not check the plan |
| `module.accounting_export` | No | |
| `module.custom_domain` | No | Tenant update can set a domain without the flag |
| `module.whatsapp` | No | WhatsApp is an integration secret, not this plan flag |
| `apps.android`, `apps.ios`, `apps.windows`, `apps.desktop` | No | Console apps page lists companion apps with no plan filter |
| `limit.stores` | No | `StoreController::store` blocks a second store unless `tenant.kind` is organization. It does not read `limit.stores`. Index `plan_limit` is hardcoded: organization 20, otherwise 1 |
| `limit.counters` | No | `TerminalController` does not check it |
| `limit.sms_per_month` | No | `SmsGateway` sends without a meter |
| `limit.storage_mb` | No | |
| `limit.ai_credits_per_month` | Only the zero-check above | No credit ledger |

`BillingController::features` returns only these seven booleans:

- `module.customers`
- `module.khata`
- `module.loyalty`
- `module.delivery`
- `module.offline_pos`
- `module.ai_reports`
- `module.reports_advanced`

Login payload `plan_features` in `LoginUser.php` merges plan plus overrides. No frontend app reads that map. It is mentioned in the admin API docs page only.

`GET /api/v1/entitlements` does not exist. The design doc `docs/plan/03-api-design.md` describes it.

### 3.4 Tenant override API

`PUT /api/v1/platform/tenants/{tenant}/features` in `TenantController::override` accepts `key` and `value` only. `Entitlement::value` honors the row. `PlatformSliceTest` covers the orders limit override.

There is no admin UI that calls this route. Marketing copy in the admin section page mentions per-tenant overrides. The tenant detail page links to `/plans` and shows the fabricated chips below.

Staff cap and product cap ignore overrides because they query `plan_features` directly. Billing usage meters do the same in `BillingController::meter`.

### 3.5 Plans API column bug

`features.value_type` is the real column. `PlanController::index` selects `id, key, name, kind`. `PlanController::update` inserts `kind` when creating `new_features`. On a strict database, listing plans or adding a feature fails. Fix: use `value_type` in both places.

### 3.6 Fabricated tenant detail

`TenantController` resource (about lines 448–478) returns:

- `usage_limits.products.limit = 10000` (live count, fake cap)
- `usage_limits.users.limit = 20`
- `usage_limits.stores.limit = 5`
- `usage_limits.customers.limit = 50000`
- `usage_limits.pos_counters.limit = 10`
- `usage_limits.whatsapp_messages.limit = 5000`
- `feature_access` as a fixed list of marketing strings: Point of Sale, Online Storefront, Inventory Management, Master GS1 Catalog, GST Invoicing and E-Way, AI Assistant Gateway, Thermal Printing Engine, Customer Facing Display, Barcode and QR Builder, Multi-Branch Switching, Discounts and Coupons, Staff Attendance Clock, Day Book and Cash Shifts, Reports and P&L Analytics. These strings are not `features.key` values and do not change when the plan changes.
- `db_config` claiming PostgreSQL 16, host `127.0.0.1`, port 5432, database name derived from the tenant id, user `selfx_tenant_user`, status “Auto-Provisioned (RDS)”. The app uses one database connection. There is no per-tenant RDS database.

`frontend/apps/admin/app/(app)/tenants/[id]/page.tsx` renders those progress bars and chips.

Replace this block with `Entitlement::value` plus live counts. Remove the database panel.

### 3.7 Platform settings: saved versus read

Write path: `BillingController::updatePlatformSettings` stores `Cache::forever('selfx_platform_config_v1', …)` and writes maintenance columns on `platform_settings`. Read path: `PlatformConfig::all()`.

| Setting | Saved | Read at runtime |
|---|---|---|
| `auth_methods` | Yes | Yes. `LoginUser`, `AuthController` phone and email, `GET public/auth/methods` |
| `maps.api_key` | Yes | Yes. `PlatformConfig::mapsKey`, injected into store online settings |
| `mail.*` | Yes | Partial. `testMail` configures SMTP from cache. Provision welcome mail in `ProvisionTenant` is a hardcoded `Mail::raw` string, not the template |
| `sms` and `sms_providers` | Yes | Yes. `SmsGateway` and `testSms`. No `limit.sms_per_month` |
| `email_templates` and `sms_templates` | Yes, cache only | No sender loads them |
| `general.trial_days` | Yes | No. Trial days come from `plan_prices.trial_days` in `CreateTenant` |
| `general.grace_period_days` | Yes, default 7 | No middleware reads it. `grace_ends_at` exists on the subscription and is not enforced. No dunning job is wired from this setting |
| `general.allow_self_registration` | Yes | No. `POST auth/register-tenant` stays available |
| `branding` and `general.platform_name` | Yes | Admin UI can mirror theme into `localStorage`. Tenant console and storefront use the tenant online-store branding, not this cache |
| `gateways.*` (12 platform providers) | Yes, cache | No code charges a customer or a subscription from this block |
| `whatsapp.*` on the platform config | Yes | Scrubbed in `PlatformConfig::scrubDemo`. Tenant WhatsApp uses the integrations module |
| Maintenance flag | Yes, cache and DB | Yes. `CheckPlatformMaintenance` |

`keepStoredSecrets()` does not cover `gateways.*`. Re-saving platform settings can wipe gateway secrets stored in that cache.

### 3.8 Billing behavior that is real, and what is missing

- Status values exist in the design (`trialing`, `active`, `past_due`, `grace`, `suspended`, `cancelled`). Change-plan updates the subscription row immediately (`BillingController::changePlan`).
- Tenant can list invoices, issue an invoice, submit a UTR, and download a PDF.
- Platform subscription list and payments overview exist.
- Manual UTR does not call a gateway. That matches the design for manual payment, and it is the only collection path.
- Proration, dunning retries, grace blocking, and MRR aggregate jobs described in `docs/plan/04-module-breakdown.md` are not what the request path does today.
- Downgrade-versus-usage checks described in the plan doc are not the change-plan implementation.

---

## 4. Payments and gateways

### 4.1 What a customer can actually pay with

| Method | Real? |
|---|---|
| Cash at POS | Yes. `POST stores/{store}/sales` |
| UPI recorded at the till | Yes as a tender flag. No Soundbox or VPA verify |
| Card recorded at the till | Yes as a tender flag. No card network |
| Khata | Yes when `module.khata` allows it |
| COD and pay at store on the storefront | Yes. Order state machine accepts them |
| UPI QR / static VPA | Partial. Checkout can require a VPA. The prepaid-credential check uses the wrong column (below) |
| Razorpay, PhonePe, Paytm, Cashfree, Stripe | No provider API. Local payment row plus optional test capture |

Tenant prepaid constant in `GatewayController::PREPAID`: `razorpay`, `cashfree`, `phonepe`, `paytm`, `stripe`.

There is no `Payments/Drivers` directory. The only driver classes in the backend are print drivers.

### 4.2 Checkout path

1. `GET public/stores/{slug}` returns `active_payment_gateways`, `payment_gateways_status`, `gateway_configs`, and `online_store_settings` (`SaleController::publicStore`, around lines 2011–2046).
2. Storefront `live-shop.tsx` shows a method if the gateway row is on, or if legacy `online_store_settings.payments.*.enabled` plus `keyId` or `merchantId` is set.
3. Pay calls `POST public/stores/{slug}/checkout`. No Razorpay.js, no PhonePe redirect, no capture poll. `live-shop.tsx` confirms the order in the UI.
4. If the method is prepaid, `SaleController::checkout` (about lines 668–689) inserts `payments` with `mode: test`, `status: created`, and returns `capture_token` in the JSON.
5. The storefront never calls `POST public/payments/{id}/capture`. That route exists and is public (`api.php`). Anyone with the token can mark the payment captured (`WebhookController::testCapture`).
6. `key_secret` is decrypted only to verify the custom webhook HMAC (`CapturePrepaidPayment::secret`). `key_id` is never sent to a provider to create an order.

`InvoiceOrder::PREPAID` omits Stripe while `GatewayController::PREPAID` includes Stripe. Stripe capture and invoice state can diverge.

### 4.3 Webhooks

`POST /api/v1/public/webhooks/{provider}` expects JSON fields `event_id`, `order_id`, `type`, optional `amount_paise`, and header `X-Gateway-Signature` equal to HMAC-SHA256 of the raw body using the tenant test `key_secret`. Idempotency uses `webhook_receipts`. Amount mismatch can fail the payment.

Razorpay, Stripe, PhonePe, Paytm, and Cashfree native signatures and payload shapes are not implemented. Admin API docs that describe production gateway HMAC overstate what the code does. The URL shown in Super Admin (`/api/v1/webhooks/{id}`) is wrong. The real path is `/api/v1/public/webhooks/{provider}`. The console settings page uses the `/public/` path.

### 4.4 Credential handling

Good:

- Tenant prepaid secrets go to `payment_gateways.credentials_ciphertext` via Laravel `Crypt`.
- List API returns `has_credentials`, not the secret.
- Impersonation cannot write credentials (`GatewayController`).
- `PrepaidGatewayTest` asserts ciphertext does not contain the raw secret. That assertion is currently unreachable because an earlier assertion fails (section 12).

Problems:

- `gateway_configs` is included on the public store payload. Non-secret fields and anything the form stored there (including a Stripe webhook secret field from the settings form) are world-readable.
- Legacy `online_store.payments.*.keySecret` can be saved through `PUT stores/{id}/receipt` and merged into public `online_store_settings`.
- Checkout returns `capture_token` to the browser.
- Platform gateway secrets sit in the forever cache and are not in `keepStoredSecrets()`.
- Live mode is rejected for tenant prepaid (`GatewayController` update and credentials). Rows are forced to test. That is intentional in code and means production charges cannot be turned on.

### 4.5 UPI column bug

`SaleController::checkout` around line 620:

```php
->whereNotNull('credentials_encrypted')
```

The column is `credentials_ciphertext`. A store with only prepaid credentials and no VPA fails the “any active prepaid gateway” check.

### 4.6 Settings that save and do not change payment behavior

Tenant Payment Gateways UI (`frontend/apps/console/app/(app)/settings/page.tsx`, `GATEWAY_CATALOG`) stores flags the backend never reads. Confirmed by search: no backend references to `auto_verify`, `upi_intent`, `accept_upi`, and the same pattern for:

- PhonePe `auto_verify`, `upi_intent`
- Razorpay `auto_capture`, `accept_upi`, `magic_checkout`
- Stripe `apple_google_pay`, `stripe_link`
- Paytm soundbox flags
- Cashfree webhook URL field (display only)

Two config paths:

| Setting | Saved to | Affects checkout |
|---|---|---|
| Settings, gateways toggle and credentials | `payment_gateways` and `gateway_configs` | Yes for allow or block, and for webhook secret. No charge |
| Online store `payments.razorpay.*` and similar | `online_store` via the receipt API | Storefront visibility only. Backend still requires an active `payment_gateways` row |
| Super Admin gateway enabled and keys | Platform cache | No |
| Super Admin Test Gateway Connection | React state after `setTimeout` 800ms | Fake “Credentials verified. API returned 200 OK.” File: `frontend/apps/admin/app/(app)/[section]/page.tsx` around lines 4591–4600. Copy above the form says platform gateways affect tenant store checkouts. They do not |

Embedded gateway panel bug: `PaymentGatewaysPanel` `onToggle` sends `status: "inactive"`. `GatewayController::update` allows only `active` or `disabled`, so that toggle returns 422. The main settings page sends `disabled` and works.

POS (`frontend/apps/console/app/pos/page.tsx`) tenders are cash, UPI, card, and khata. Tenant gateway settings do not add or remove those tenders. Kiosk orders take a `payment_method` and `payment_captured` flag and do not call a gateway.

### 4.7 Super Admin gateway list

UI providers stored only in platform cache: stripe, razorpay, phonepe, paytm, cashfree, payu, paypal, paystack, flutterwave, mollie, dodopayments, bank_transfer. PayU, PayPal, Paystack, Flutterwave, Mollie, and Dodo are not in the tenant backend at all.

---

## 5. Integrations

Providers in `IntegrationController::PROVIDERS`: `woocommerce`, `shopify`, `telegram`, `whatsapp`, `webhooks`, `google_sheets`, `tryon`. The console integrations catalog matches.

| Provider | Test | Sync and notify | Notes |
|---|---|---|---|
| WooCommerce | Real `GET {store}/wp-json/wc/v3/products` | Real HTTP | Secrets encrypted. API returns secret key names, not values |
| Shopify | Real Admin `shop.json` | Real HTTP | OAuth token exchange exists |
| Telegram | Real `getMe` and `sendMessage` | Real | |
| WhatsApp | Real Graph API | Real | |
| Webhooks | Real signed POST | Real | `IntegrationNotifier::orderPlaced` |
| Google Sheets | Real OAuth JWT and spreadsheet GET | Append exists | |
| Try-on | If `api_url` is empty, test returns `ok: true` | Public generate forwards to `{api_url}/api/v1/tryon/generate` when set. Otherwise it returns the garment cutout as the result with a stand-in model name | `TryOnPublicController`. Catalog sync can insert hardcoded fallback items when the remote catalog is empty |

Plan flag `module.whatsapp` does not gate the integration.

---

## 6. Printing, POS, kiosk, and customer display

### 6.1 Intended pipeline

1. `CompleteCashSale` fires `SaleCompleted`.
2. `PrintSaleReceiptListener` loads a `print_profiles` row for kind `receipt`. If none, it returns and creates no job.
3. `PrintJobCreator` compiles `document_templates` through `EscposDriver` or `SystemDriver` into `print_jobs.command_plan`.
4. Web POS polls `GET /print-jobs?status=queued`.
5. `frontend` print transport tries the local agent, then WebUSB, then a browser print dialog.
6. Client `POST /print-jobs/{id}/ack`.

Offline sales do not enqueue a job until `POST /sales/sync`. Sync then runs `CompleteCashSale`, so the event fires after sync.

Kiosk orders do not insert `print_jobs`. The API returns receipt JSON and the client is expected to print it. Channel toggles in Printer Setup (`channels.pos` and similar) are stored in `printer_settings` and are not read by `PrintJobCreator` or the poller.

### 6.2 Drivers

| Driver | File | Behavior |
|---|---|---|
| `escpos` | `EscposDriver.php` | Real ESC/POS (Mike42). QR and barcode are real. `image` blocks are a no-op |
| `system` | `SystemDriver.php` | HTML. QR is a dashed box `[QR: …]`. Barcode is a fake string, not a barcode image |
| `epson_epos`, `star_webprnt`, `sdk` | Accepted as names on printers and profiles | `PrintDriverRegistry` registers only `escpos` and `system`. Unknown names fall back to escpos |

### 6.3 Why Printer Setup does not print

`frontend/apps/console/app/(app)/printer-setup/page.tsx`:

- Save (`saveAllSettings`) persists `printer_settings` with `PUT /stores/{id}/receipt` and `POST /printers`. It never calls `PUT /print-profiles` or `PUT /templates/receipt`. The block editor does not change live jobs. Receipt footer in settings is used by the HTML receipt endpoint, not by the thermal compiler.
- Test Print calls `POST /print-jobs` without `sale_id`. `PrintJobController::store` (about lines 133–150) inserts a queued job with no `command_plan`. `PrintingSystemTest` allows a null plan on that path.
- The API that does compile a test is `POST /printers/{printer}/test-print` (`PrinterController` to `createTestJob`). The button does not call it.
- Pairing fetches a code from `http://127.0.0.1:27182/pair` and submits it to `POST /printers/pair`. Laravel only accepts codes created by `POST /printers/pair-code` (`PairingService`). The codes do not match, so pairing fails in normal use. The UI sends a hardcoded `agent_fingerprint: "agent-local"` and does not call the agent `/authorize` with the device token.
- Discover: the UI does not call `GET /printers/discover` or the agent `/discover`. Backend discover always returns `completed` and `discovered: []` (`PrinterController` around lines 202–216). The agent’s own `/discover` uses `lpstat` and is unused by the UI.
- Every save `POST`s printers again, so duplicate printer rows accumulate. `localStorage` key `selfx-printer-setup-v1` is merged before the API and can mask server state. Default state includes demo printers until the API response replaces them.
- Server preview via `POST /templates/preview` works. It does not mean the saved blocks are what sales print.

`print-transport.ts`: if format is `escpos` and both the agent and WebUSB fail, the browser fallback can still return success and ack the job as `printed`. Failed jobs are not retried because the poller asks only for `status=queued`. `PrintJobFailureHandler` sets `updated_at` as a delay, and `index()` does not filter on that delay. `validateDeviceToken` in `PairingService` is unused.

`print_jobs` has no `printer_id` and no terminal id. `usePrintJobPoller` in `pos/page.tsx` runs for every open POS with that `storeId`, so two registers print the same job. The sale screen also shows “Printing…” and opens an HTML receipt modal in parallel with the poller. `kickCashDrawer` fires on a `BroadcastChannel` for every sale and is not tied to `print_profiles.open_drawer_on`. The `autoPrint` setting is not read in `pay()` or the poller.

### 6.4 Print agent

`print-agent/main.go`:

- Local HTTP: `/status`, `/pair`, `/authorize`, `/discover`, `/print`, `/heartbeat`.
- `/print` base64-decodes `command_plan`, writes `spool/*.bin`, and optionally opens TCP port 9100 when `metadata.printer_ip` is set. No CUPS `lp`. No USB write.
- Pairing codes are local. They are not Laravel pairing sessions.
- After `/authorize`, requests need a token, with a `selfx_dev_` prefix bypass that must not exist in production.
- The agent never calls Laravel `POST /printers/{id}/heartbeat`. That Laravel route sits behind staff auth. Agent-transport printers are created offline. `markStalePrintersOffline` marks them offline after 45 seconds without a staff-session heartbeat.

### 6.5 Customer display

POS publishes `BroadcastChannel("selfx_pos_cfd")` and `localStorage` key `selfx_pos_cfd_state`. `frontend/apps/console/app/customer-display/page.tsx` listens to those. This works as a second tab on the same machine and browser profile. `TerminalController` can return a `customer_display_url` with query params. The CFD page does not read `terminal` or `store` from the URL, so a second device opened from the terminal screen does not bind to that terminal.

### 6.6 POS and kiosk that do work

Console POS calls shifts open and close, current shift, reading, cash movement, sales, find sale, receipt, returns, exchange, void, number blocks, sync, holds, park, release, lookup, and quick keys. Those routes exist and are covered by feature tests (`CashSaleTest`, `ShiftCashTest`, `VoidSaleTest`, `CounterDeskTest`, and others).

Terminals: list, create, update, delete, pair, unpair, PIN, verify PIN. Kiosk settings get and put. Kiosk flags are stored and returned on the kiosk order payload. They do not create print jobs.

Receipt settings and store hours are `GET` and `PUT` on `/stores/{store}/receipt` and `/stores/{store}/hours`. Hours affect storefront display. A closed badge does not block checkout (section 7).

### 6.7 Flutter POS

`pos_app/` is gitignored. Pairing, offline print, and settings sync in that app were not reviewed. Audit it against the same APIs: `print-jobs`, `printers/pair-code`, `print-profiles`, and terminal pairing.

---

## 7. Storefront

| Screen | Status | Detail |
|---|---|---|
| Live shop and `/store` | Working | `public/stores/{slug}`, items, sections, checkout, OTP, loyalty, contact, subscribe |
| Cart checkout | Working as an order create | `cart/page.tsx` posts checkout. Prepaid still does not collect money (section 4) |
| Payment page | UI working | Methods from the store payload. Icons for GPay, PhonePe, and Paytm are UPI app art, not separate gateway integrations |
| Track | Working | `public/orders/track` |
| Account | Partial | Orders, loyalty, and OTP hit the API. Star ratings are `localStorage` only |
| Try-on and AI widget | Wired | `tryon/generate` and `public/stores/{slug}/ai`. Try-on without `api_url` is a local composite (section 5). AI assistant is not plan-gated |
| Branding and hours | Partial | From `online_store_settings` and open or close. `open_now` is a badge in `live-shop.tsx`. Checkout is not blocked when the shop is closed |
| Org hub `org/[slug]` | Read works, checkout does not | Loads `public/organizations/{slug}` and items. “Proceed to Checkout across Outlets” sets local success, clears the cart, and creates no order (`org/[slug]/page.tsx` around lines 494–503) |
| Product `/p/[slug]` | Working | Public items |
| Cart and addresses | Mixed | `localStorage` for cart and saved addresses. Checkout still posts to the API |
| Favourites API | No UI found | `GET` and `POST public/stores/{slug}/favourites` exist |
| `public/pages/{slug}` and `public/i18n/{locale}` | No storefront usage found | |

Public routes have no auth: store catalog, checkout, OTP, webhooks, test capture, pair-code generation (`public/terminals/generate-pair-code` and `check-pair-status`), kiosk orders, and scan-pickup. Review each before production. Test capture and unauthenticated pair-code generation are the ones to close or lock down first.

---

## 8. Admin and console module map

API base is `/api/v1`. Admin lives under `/superadmin`.

### 8.1 Super Admin

| Module | Status | Notes |
|---|---|---|
| Dashboard | Working | Tenants, subscriptions, plans, health, logs |
| Tenants | Working actions, false metrics | CRUD, suspend, impersonate, test-db, admin-action. Limits and features are fake (section 3.6) |
| Organizations | Working | Link, unlink, suspend, impersonate |
| Plans | Partial | GET, POST, PUT `platform/plans` work for existing keys. New feature insert uses `kind` (section 3.5). Enforcement is section 3.3 |
| Subscriptions | Read-only list | `platform/subscriptions` |
| Catalog | Partial | Products, publish, rollback, sources, pull, import are wired. “Test connection” is a 650ms delay and a success message (`catalog/page.tsx`). Inbound webhook URLs shown in the UI (`/api/v1/platform/catalog/webhooks/...`) have no route. Barcode simulate calls `GET /api/v1/catalog/barcode/{code}`, which is a staff route, so a platform session gets 403 |
| Payments overview, transactions, pending, invoices | Working as read models | `platform/payments-overview`. This is not live gateway money |
| Health | Working | `platform/health`, `platform/logs` |
| Legal entity | Working | GET and PUT |
| AI settings | Working | `platform/ai/settings` and test. Separate kill switch `PUT platform/ai` has no dedicated screen found |
| Apps and updates | Working | `platform/apps` including upload, toggle, restore defaults. Public `public/apps` and `check-update` exist. Plan `apps.*` flags do not filter the console apps page |
| General, mail, SMS, branding, templates, WhatsApp, gateways, backups, queue | Partial | Most fields persist with `PUT platform/settings`. Gateway test is fake. Templates, trial days, grace days, and self-registration are not applied (section 3.7). Backups and queue endpoints exist |
| Reminders | UI only | Toggles and “Send Reminder” toast locally. No reminder API (`[section]/page.tsx` Reminders section) |
| Storage cleanup | UI only, and it claims deletion | Scan always returns 1,482 files, 47 unused, 184.6 MB. Delete shows a purge toast and deletes nothing (about lines 1848–1875) |
| How it works | Static help | |
| Super admins | Working | `platform/admins` |
| Impersonation logs | Working | From `platform/logs` |
| Login | Working | `auth/platform/*` and `public/auth/methods` |
| Floating admin AI | UI only | `admin-ai-widget.tsx` answers from keywords after a timeout. It does not call `platform/ai` |
| API docs | Page exists | Live “Test API” hits `platform/health`. Some gateway paragraphs overstate provider HMAC |
| Branding theme and accent clicks | Low | `localStorage` until a separate settings save |

### 8.2 Tenant console

| Module | Status | Primary API |
|---|---|---|
| Dashboard | Working | `reports/dashboard`, `organization/overview` |
| Orders and delivery | Working | `orders`, transitions, proof, `delivery/orders`, assign, status, scan-pickup |
| Products, categories, brands, units, prices, opening, labels, import | Working | `catalog/own/*`, `stores/{id}/items` |
| Inventory and purchases | Working | Adjustments, transfers, purchases, suppliers, counts, alerts, expiry, batches |
| Customers, coupons, staff, attendance | Working | Matching routes. Customers nav is the only entitlement hide |
| POS | Working for counter sale | See section 6. Gateways do not change tenders |
| POS terminals and kiosks | Working | `stores/{store}/terminals`, `kiosk-settings` |
| Printer setup | Partial and not end to end | Section 6 |
| Integrations | Working | `integrations/{provider}` test, sync, shops, mappings, logs |
| Online store | Partial | Branding, shipping, taxes, collections, banners, loyalty, orders, coupons persist through `online_store_settings` on the receipt PUT. Also writes `localStorage` `selfx_online_store_config_v2` as a cache. Subscribers and contact messages land in store settings and show after refresh |
| Billing | Partial | Subscription, change plan, invoices, UTR, PDF. Usage ignores overrides and uses a different order count (section 3.1) |
| Reports | Working for the screens that exist | Many `reports/*` routes. Screens were not found for profit and loss, cash flow, balance sheet, dead stock, ageing, shrinkage, fast-moving, slow-moving |
| Notifications | Working | `notifications` |
| Apps and downloads | Working | `public/apps`. No plan filter |
| QR builder | Partial | Store list from API. QR image is built in the browser |
| Barcode generator | Partial | Items from API. Code128 SVG is a deterministic stand-in, not a server barcode (`barcode-generator/page.tsx`) |
| Settings sections | Partial | Profile, POS, taxes, receipt, loyalty, gateways, security, and messaging flags save through `PUT /stores/{id}/receipt` plus hours. POS sound and paper also copy to `localStorage` `selfx-pos-settings-v2`. Theme and accent are `localStorage` only (`selfx-theme`, `selfx-accent`). The nav item “API & Webhooks” edits messaging channels. It does not call `api-keys` or `POST webhooks` |
| Tenant AI widget | Wired | `POST /api/v1/ai/assistant`. Not gated by `module.ai_assistant` |
| Catch-all `[section]/page.tsx` | Stub | Only some aliases. Real pages live on their own routes |
| Customer display and `/cfd` | Local tab sync | Section 6.5 |
| Impersonate accept page | Wired | `auth/impersonation/accept` |

Pending, guest, and registered customer filters on the online store are heuristics on `GET customers` (for example pending means no email and zero loyalty), not a dedicated status column.

### 8.3 Backend routes with little or no UI

- `PUT platform/tenants/{tenant}/features`
- `GET` and `POST api-keys`, `POST api-keys/{key}/rotate`
- `POST webhooks` (tenant outbound endpoints)
- `GET reports/profit-loss`, `reports/cash-flow`, `reports/balance-sheet`
- `GET reports/inventory/dead-stock`, `aging`, `shrinkage`, `fast-moving`, `slow-moving`
- `PUT platform/ai` kill switch
- `GET` and `POST public/stores/{slug}/favourites`
- E-invoice `stores/{store}/sales/{sale}/e-invoice`, regenerate, cancel
- `POST public/payments/{payment}/capture`
- `GET public/pages/{slug}`, `GET public/i18n/{locale}`
- `GET open/items` (API key catalog)

### 8.4 E-invoice

`EInvoiceService::generateEInvoice` calls the GST portal only when environment is `production`, `client_id` is set, and `client_id` is not `test_client_id`. Otherwise it writes a SHA-256 hex string as the IRN, a random acknowledgement number, and a base64 JSON blob as the signed QR, then returns `status: success`. A sandbox IRN must not be shown to a merchant as a real invoice reference. The design doc also lists NIC e-invoice as out of scope for the original plan. The code now has this hybrid. Treat it as sandbox until production credentials and a contract test exist.

`requiresEInvoice` is true only when total is at least 50000 paise (₹500), a customer is attached, and that customer has a GSTIN.

---

## 9. Security and tenancy notes

- Public test capture with a token that checkout just returned to the browser.
- Public store payload includes `gateway_configs`.
- Custom webhook is not a provider webhook. Replaying a real Razorpay or Stripe webhook will not verify.
- `SaleController` methods `orders`, `deliveryOrders`, and the same pattern nearby: if the session has no `tenant_id` and the user has no staff profile row, the code does `DB::table('staff_profiles')->value('tenant_id')` and then `DB::table('tenants')->value('id')`. That picks an arbitrary tenant. Routes are behind `auth` and `tenant.enforce`, so the fallback should be rare. It is still unsafe. Return 401 when the tenant cannot be resolved. Same pattern appears more than once in `SaleController`.
- Pairing device token helper exists and is not enforced on an agent API.
- Print agent accepts a `selfx_dev_` token prefix.
- Platform session encryption is off in `.env.example` (`SESSION_ENCRYPT=false`). `APP_DEBUG=true`. `APP_ENV=local`.
- Impersonation is designed to block gateway ciphertext and password set. Credential write block in `GatewayController` is present. Re-check the deny list before production (passwords, secrets, API keys).
- Catalog external sources are intended to stay disabled until a licence note is saved. Confirm the admin enable switch still requires that note. This audit did not re-prove the licence gate line by line.

---

## 10. Production host

`backend/.env.example` and `backend/config/database.php`:

- `DB_CONNECTION=sqlite` by default. A `database.sqlite` file is in the backend database folder. `compose.yaml` already defines Postgres 16, Redis 7, Typesense, and Mailpit, with dev passwords (`selfx` / `selfx`, Typesense key `selfx-dev-key`).
- `QUEUE_CONNECTION=database` in the example. Workers must be running for backups, imports, webhooks, and mail. Tests force `sync`.
- `CACHE_STORE=database` in the example. Platform settings use `Cache::forever`, so the cache store must be shared across every app server or settings will diverge.
- `MAIL_MAILER=log`.
- `FILESYSTEM_DISK=local`. Branding uploads and backups will not survive a single-disk deploy.
- `BROADCAST_CONNECTION=log`. CFD does not use broadcasts. It uses a browser channel.
- `SESSION_DRIVER=database` is fine if sessions are in Postgres. Encrypt them.
- Health check requires the database (`HEALTH_REQUIRED=database`).

There is no per-tenant database. The admin “RDS” panel must be removed so operators do not debug a database that does not exist.

Observability, restore, and CI expectations in `docs/plan/07-devops-and-observability.md`, `docs/plan/08-testing-and-quality.md`, and `docs/ops/postgres-restore.md` are ahead of the example env. Follow those docs when promoting off SQLite. Do not treat this analysis as a substitute for that runbook.

---

## 11. Tests

Command: `cd backend && php artisan test` on 29 October 2026.

Result: 92 tests, 91 passed, 1 failed, 1,360 assertions, about 16.5 seconds.

Failure: `Tests\Feature\PrepaidGatewayTest::test_prepaid_keys_stay_encrypted_and_a_webhook_bills_once` at `PrepaidGatewayTest.php` line 77.

```php
$this->assertTrue($saved->json('data.2.has_credentials'));
```

The credentials request returned HTTP 200. The JSON no longer has Razorpay at index 2 with `has_credentials` true. Encryption and webhook assertions later in that test did not run.

Feature tests that do exist include identity, tenants, catalog, cash sale, shifts, voids, coupons, loyalty, purchases, stock, attendance, billing, gateways, prepaid gateway, printing system, print driver unit tests, impersonation, tenant isolation, phone sign-in, AI and catalog, and platform slice. One Playwright file exists at `tests/e2e/printing.spec.ts`.

The suite does not cover:

- Console Printer Setup against `print-profiles`
- Fake admin buttons (gateway test, storage cleanup, reminders, admin AI)
- Org hub checkout
- A live Razorpay, PhonePe, Paytm, Cashfree, or Stripe call
- Plan flags for POS, storefront, and inventory returning 403
- The `features.kind` versus `value_type` bug

---

## 12. Change these files, in this order

Do them in sequence. Later items assume the resolver and the payment driver exist.

### 12.1 Stop false success

| Change | Where |
|---|---|
| Remove or disable Test Gateway Connection until it calls a provider | `frontend/apps/admin/app/(app)/[section]/page.tsx` around 4591–4600. Fix the webhook URL to `/api/v1/public/webhooks/{provider}` |
| Remove storage cleanup, or implement a real confirmed job | Same file, `handleScanUnusedFiles` and `handleDeleteUnusedFiles` around 1848–1875 |
| Remove reminder send, or add an API | Reminders section in the same file |
| Org hub checkout must call the store checkout API per outlet, or the button must go | `frontend/apps/storefront/app/org/[slug]/page.tsx` around 494–503 |
| Do not ack `printed` when only the HTML stub ran | Console print transport |
| Catalog test connection must call the source pull or say it is not a live test | `frontend/apps/admin/app/(app)/catalog/page.tsx` |
| Admin copilot must call the AI API or be labeled as offline help | `frontend/apps/admin/app/(app)/admin-ai-widget.tsx` |
| Barcode generator must use a real encoder or say the bars are a preview | `frontend/apps/console/app/(app)/barcode-generator/page.tsx` |

### 12.2 Fix the plans API and the tenant screen

| Change | Where |
|---|---|
| Select and insert `value_type`, not `kind` | `backend/app/Modules/Plans/Http/Controllers/PlanController.php` lines 23 and 184–203 |
| Replace hardcoded `usage_limits`, `feature_access`, and `db_config` | `backend/app/Modules/Tenancy/Http/Controllers/TenantController.php` around 448–478, and the admin tenant detail page |
| Add the override drawer. The route already exists | `PUT platform/tenants/{tenant}/features`. UI: `frontend/apps/admin/app/(app)/tenants/[id]/page.tsx` |
| If expiry and reason are required, add columns and check them in `Entitlement::value` | Migration `2026_10_19_330000_add_pin_overrides_keys_and_expiry.php` has the table without those columns |

### 12.3 One entitlement resolver, then enforce it

| Change | Where |
|---|---|
| Staff cap | `StaffController::staffLimit` must call `Entitlement::value(..., 'limit.staff')` |
| Product cap | `AddStoreItems::limit` must call `Entitlement::value(..., 'limit.products')` |
| Store cap | `StoreController::store` and the hardcoded `plan_limit` in `index` must use `limit.stores` and `module.multi_store` |
| Counters, SMS, storage, AI credits | `TerminalController`, `SmsGateway`, storage uploads, `ReportAnswerController` |
| Usage meters | `BillingController::usage` and `meter` must use `Entitlement` and the same order count as `assertOrders` |
| Full flag payload | Expand `BillingController::features` or add `GET /entitlements`. Console shell must hide every disabled module, not only Customers |
| Server gates | `backend/routes/api.php` groups for POS sales, public storefront, inventory, delivery, advanced reports, and `AiAssistantController`. A hidden menu is not a gate. Direct API calls must 403 |
| Apps page | Filter `public/apps` or the console apps page with `apps.*` |
| Custom domain | Check `module.custom_domain` in tenant update |
| WhatsApp plan flag | Either gate `IntegrationController` for WhatsApp or stop selling `module.whatsapp` as a separate switch |

### 12.4 Payments

| Change | Where |
|---|---|
| One driver per provider you intend to charge: create order, client SDK or redirect, native webhook verify, then capture | New classes under `backend/app/Modules/Payments`. `CapturePrepaidPayment` stays the ledger step after the provider says paid |
| Stop returning `capture_token` on checkout | `SaleController::checkout` |
| Remove or strictly guard `POST public/payments/{payment}/capture` outside tests | `backend/routes/api.php` line 82, `WebhookController::testCapture` |
| Stop putting `gateway_configs` and legacy key secrets on the public store payload | `SaleController::publicStore` |
| Fix `credentials_encrypted` to `credentials_ciphertext` | `SaleController::checkout` around line 620 |
| Align Stripe with `InvoiceOrder::PREPAID` | `InvoiceOrder.php` |
| Embedded toggle must send `disabled`, not `inactive` | `frontend/apps/console/app/(app)/settings/page.tsx` `PaymentGatewaysPanel` |
| Delete or implement unused gateway flags (auto capture, UPI intent, Apple Pay, soundbox) | `GATEWAY_CATALOG` in the same file |
| Decide whether platform gateways bill the tenant subscription or are removed from the admin UI | `BillingController` platform settings and the admin gateways section. Today only UTR records a platform payment |
| Allow live mode only after a driver exists and secrets are verified with the provider | `GatewayController` currently rejects live on purpose |
| Storefront must open the provider checkout and must not confirm the order before capture | `frontend/apps/storefront/app/live-shop.tsx` and `payment-page-view.tsx` |
| POS stays cash, UPI, card, and khata until a counter device is integrated. Do not imply the gateway form changes the till | `frontend/apps/console/app/pos/page.tsx` |

### 12.5 Printing

| Change | Where |
|---|---|
| On Printer Setup save, upsert `PUT /print-profiles` and `PUT /templates/receipt` | `printer-setup/page.tsx` `saveAllSettings` |
| Test Print calls `POST /printers/{id}/test-print` | Same file `triggerTestPrint`. Reject empty plans in `PrintJobController::store` |
| One pairing flow: agent asks Laravel for a code, staff submits `POST /printers/pair`, browser calls agent `/authorize` with `device_token` | `printer-setup/page.tsx`, `print-agent/main.go`, `PairingService.php` |
| Add `printer_id` or terminal id on `print_jobs`. Poller filters to this register | Migration, `PrintJobController::index`, `pos/page.tsx` `usePrintJobPoller` |
| Agent heartbeats Laravel with a device token. Remove the `selfx_dev_` bypass outside local dev | `print-agent/main.go`, new route that is not staff-session-only |
| Agent sends bytes to the device from `connection_params` (USB, CUPS, or LAN). Spool-only is not a print | `print-agent/main.go` |
| Ack `printed` only after the device accepts bytes | `print-transport.ts` |
| Honor retry delay in the poll query | `PrintJobFailureHandler.php`, `PrintJobController::index` |
| Implement image blocks or reject them. Implement or remove `epson_epos`, `star_webprnt`, and `sdk` | `EscposDriver.php`, `PrintDriverRegistry.php` |
| System driver QR and barcode must be real images if browser print is a supported path | `SystemDriver.php` |
| Kiosk: enqueue a print job or document that the kiosk device prints the JSON locally | `SaleController` kiosk order |
| CFD: read terminal and store from the URL, or use a server push, if a second device is required | `customer-display/page.tsx` |
| Cash drawer follows the profile flag | `pos/page.tsx` `kickCashDrawer` |
| Wire `autoPrint` or remove the label | `pos/page.tsx` |
| Stop creating a new printer row on every save | `printer-setup/page.tsx` |
| Audit Flutter `pos_app` against this list | Repo is gitignored |

### 12.6 Settings that should do what the label says

| Change | Where |
|---|---|
| Welcome and notification mail load `email_templates` from `PlatformConfig` | `ProvisionTenant.php` and the notification classes |
| SMS sends load `sms_templates` and enforce `limit.sms_per_month` | `SmsGateway.php` |
| `allow_self_registration` gates `AuthController::registerTenant` | `AuthController.php` |
| `grace_period_days` drives subscription grace and a banner. Suspended tenants already cannot log in as staff. Operations during grace versus suspended need an explicit policy | Billing module and `CheckPlatformMaintenance` or a subscription middleware |
| Closed store blocks `checkout` when hours say closed | `SaleController::checkout` and the storefront |
| Console “API & Webhooks” either manages `api-keys` and `POST webhooks` or the label changes to messaging | `frontend/apps/console/app/(app)/settings/page.tsx` |
| Try-on test returns failure when `api_url` is empty | `IntegrationController` probe and `TryOnPublicController` |
| E-invoice sandbox must not return `status: success` with a hash IRN in any environment a merchant can see | `backend/app/Services/EInvoiceService.php` |

### 12.7 Host

| Change | Where |
|---|---|
| Postgres, not SQLite | `.env`, `config/database.php`. Compose service already exists |
| Redis for cache and queues, workers running | `.env`. Platform settings cache must be shared |
| `APP_DEBUG=false`, `APP_ENV=production`, `SESSION_ENCRYPT=true` | `.env` |
| Object storage for branding, imports, and backups | `config/filesystems.php` |
| Remove arbitrary-tenant fallback | `SaleController` `orders`, `deliveryOrders`, and the copies of that block |
| Lock public pair-code and test capture | `backend/routes/api.php` lines 81–84 |
| Run the restore drill in `docs/ops/postgres-restore.md` | Ops |

### 12.8 Screens still missing for APIs that exist

Build these or drop the routes from the product promise:

- Per-tenant feature overrides (admin)
- API keys and outbound webhooks (console settings)
- Profit and loss, cash flow, balance sheet
- Dead stock, ageing, shrinkage, fast-moving, slow-moving
- E-invoice view, regenerate, cancel
- Favourites on the storefront
- Platform AI kill switch
- Public CMS pages and i18n if those routes are meant to ship

---

## 13. Positive propagation, so it is not rebuilt by mistake

- Plan matrix edits through `PlanController` persist to `plan_features` and affect `Entitlement` on the next request.
- `PUT platform/tenants/{id}/features` updates overrides. `Entitlement::value` honors them for the keys it is asked about. Test: `PlatformSliceTest` for `limit.orders_per_month`.
- Login `plan_features` already includes overrides. The UI can consume it once section 12.3 exists.
- Auth methods, maps key, SMS providers, and maintenance already propagate.
- Offline POS, khata, loyalty, webhooks, API keys, and AI reports are enforced on their specific endpoints.
- Tenant gateway encryption, impersonation block on credential writes, and webhook idempotency are worth keeping when real drivers are added.
- WooCommerce, Shopify, Telegram, WhatsApp, Sheets, and outbound webhooks already call external APIs.
- ESC/POS compilation is worth keeping. The console must be wired to `print_profiles` and `document_templates` instead of a second JSON blob.

---

## 14. Related design docs

These describe the intended product. Where they disagree with this file, the code wins until it is changed.

- `docs/plan/00-overview.md`
- `docs/plan/01-architecture.md`
- `docs/plan/02-domain-and-database.md`
- `docs/plan/03-api-design.md`
- `docs/plan/04-module-breakdown.md`
- `docs/plan/05-frontend-and-design-system.md`
- `docs/plan/06-security-and-compliance.md`
- `docs/plan/07-devops-and-observability.md`
- `docs/plan/08-testing-and-quality.md`
- `docs/plan/09-roadmap.md`
- `docs/plan/10-open-questions.md`
- `docs/ops/postgres-restore.md`
- `backend/docs/disaster-recovery.md`

Known doc-versus-code gaps called out above: `EnsureEntitled`, Redis entitlement cache, override expiry, `GET /entitlements`, native payment adapters, dunning, and per-tenant databases.
