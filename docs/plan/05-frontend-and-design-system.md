# 05 — Frontend and design system

Four Next.js apps live under `frontend/apps/` because `frontend/` already exists and stays the JS tree. Shared UI lives in `frontend/packages/ui`. Do not create a second `apps/` at the repo root.

Reference screenshots are density and hierarchy only: a fixed left nav, a quiet top bar, KPI rows, one primary chart plus a side chart, a filterable table, plan cards, a split POS, and an image-led storefront. SelfX does not reuse those brands, greens, illustrations, or sentences.

## 1. App architecture

| App | Package | Host | Rendering |
| --- | --- | --- | --- |
| Marketing | `frontend/apps/marketing` | apex, `www` | Static / ISR |
| Super admin | `frontend/apps/admin` | `admin.{APP_DOMAIN}` | Authenticated client data, server session gate |
| Console + POS | `frontend/apps/console` | `{tenant}.{APP_DOMAIN}` | Same. POS is a client island |
| Storefront | `frontend/apps/storefront` | `{publicSlug}.shop.{APP_DOMAIN}` | ISR for catalog pages, SSR for cart and account |

| Package | Role |
| --- | --- |
| `@selfx/ui` | Tokens, Tailwind preset, shadcn components, chart theme, page templates |
| `@selfx/api-client` | Generated from Scramble |
| `@selfx/config` | ESLint, tsconfig, Tailwind preset |
| `@selfx/types` | Hand-written types only when the generator cannot express them |

TypeScript `strict` is on. No `any` in app code without a one-line justification.

### Routing

Next.js App Router. Route groups:

```text
admin/app/(public)/login
admin/app/(app)/layout.tsx          # shell
admin/app/(app)/page.tsx            # analytics home
admin/app/(app)/tenants/...
admin/app/(app)/plans/...
admin/app/(app)/catalog/...

console/app/(public)/login
console/app/(app)/layout.tsx
console/app/(app)/pos/page.tsx      # no shell padding
console/app/(app)/orders/...

storefront/app/page.tsx
storefront/app/c/[slug]/page.tsx
storefront/app/p/[item]/page.tsx
storefront/app/cart/page.tsx
storefront/app/checkout/page.tsx
storefront/app/account/...

marketing/app/page.tsx
marketing/app/pricing/page.tsx
marketing/app/contact/page.tsx
marketing/app/legal/[slug]/page.tsx
```

Middleware in each app checks the host and redirects a mismatch to the correct origin. The storefront service worker scope is only the shop host, which is why POS is not inside the storefront app.

### Data fetching

| Need | Tool |
| --- | --- |
| Server state | TanStack Query |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| POS cart | Zustand store, persisted to IndexedDB only for the offline outbox |
| URL state | search params for filters, date range, pagination cursors |

Mutations send `Idempotency-Key` from the client. The API client attaches `X-XSRF-TOKEN`. Queries retry once on 401 after a silent session check, then route to login.

Do not cache entitlements only in the client. Read `GET /entitlements` into Query with a 60s stale time, and still expect 403s.

### Rendering by page

| Page | Mode | Why |
| --- | --- | --- |
| Marketing pages | ISR 60s, on-demand revalidate from CMS publish | SEO, few publishes |
| Legal | ISR | Same |
| Admin and console lists | Client fetch after a server layout confirms the session | No SEO, filters change often |
| POS | Client only | Keyboard latency, IndexedDB |
| Storefront home, category, product | ISR tagged `storefront:{storeId}` | Fast repeat views |
| Search results | Client | Query string, Typesense via API |
| Cart, checkout, account | SSR with the customer session | Prices and addresses must be fresh |
| Order tracking | SSR first paint + socket/poll | Status changes |

Images: `next/image` against the CloudFront host. Remote patterns limited to that host.

### PWA and offline

`@serwist/next` on **storefront** and **console** only.

Storefront precaches the shell and last-viewed product images. Catalog data is not an offline catalog. The goal is a fast reopen on a poor network, not shopping offline. Checkout requires the network. A failed checkout shows the cart still intact.

Console POS precaches the POS shell. The offline dataset is whatever `pos/bootstrap` last stored. Behaviour matches ADR-007 in [01-architecture.md](./01-architecture.md): cash bills in an outbox, everything else disabled with a visible "offline — cash only" state. Do not pretend card payments work offline.

Installable manifest on the storefront: name from the storefront, icon from the uploaded logo or the SelfX mark. Console manifest is staff-facing and not promoted on the marketing site.

Web push: a client helper in `@selfx/ui` registers the subscription and posts it to `/api/v1/push-subscriptions`.

## 2. Information architecture

### Marketing

Header: wordmark, product anchors, pricing, FAQ, **Admin login**, **Tenant login**. Tenant login asks for the store slug, then sends the browser to `https://{slug}.{APP_DOMAIN}/login`.

Footer: legal links from CMS, contact.

Pages: home (hero, one section per capability, pricing strip, FAQ), pricing, contact, legal slug. Large type, real screenshots taken from SelfX staging, generous whitespace. No stock illustrations.

### Admin

Left nav, 240px, groups:

| Group | Items |
| --- | --- |
| Main | Dashboard |
| Customers | Tenants, Organizations, Plans, Subscriptions |
| Catalog | Products, Imports, Review, Categories |
| Money | Invoices, Gateways, Transactions |
| Platform | Templates, Communications, CMS, Apps, AI, Audit, Health |

Top bar: environment chip when not production, language (`en`, `te`, `hi`), theme toggle, search (command palette), notifications of failed jobs, profile menu. Preference is saved on the user.

### Console

Left nav:

| Group | Items |
| --- | --- |
| Main | Dashboard |
| Sell | Orders, Products |
| Stock | Inventory, Purchases |
| People | Customers, Staff |
| Online | Storefront |
| Setup | Reports, Billing, Settings |

**POS is a primary button in the top bar**, not a nav afterthought. Store switcher sits in the nav header when the tenant has more than one store. Organization tenants add Stores and Transfers under Stock.

### Storefront

Top: menu, wordmark, search, account, cart with count and total, language, theme. Category row under it. Thumb-sized targets. Price and stock on every card. The organization host's first screen is the list of stores in that organization. The customer picks one. The app navigates to that store's shop host. One cart, one store (OQ-07).

### POS

No left nav. Top strip: store, counter, cashier, shift, printer status, online/offline chip, language. Left column cart (~40%). Right column search and product grid. Pay is a full-width button on the cart. Dialogs for tenders, not a new page. Reprint and test print sit in the shift menu, not on the selling surface.

## 3. Design tokens

Source of truth: `frontend/packages/ui/src/styles.css`. Tailwind reads those variables. Apps do not invent a second palette.

### Colour

One accent per surface, used for primary buttons, the current nav item, and focus rings. Admin and marketing use a deep green. The tenant console and POS use a violet, matching the two reference shells. Status and charts stay muted. Surfaces are a cool off-white with white cards and 1px borders.

| Token | Admin / marketing | Console / POS |
| --- | --- | --- |
| `--bg` | `#F5F6F8` | same |
| `--surface` | `#FFFFFF` | same |
| `--ink` | `#1A1D23` | same |
| `--muted` | `#5C6570` | same |
| `--line` | `#E6E8EC` | same |
| `--accent` | `#1F7A4D` | `#5346E0` |
| `--accent-soft` | `#E7F5EE` | `#EFEDFD` |

Storefront accent is not a free hex. Allow-list ids: `green` (`#1F7A4D`), `violet` (`#5346E0`), `ink` (`#1A1D23`). Default on a new store is `green`.

Dark theme is on the `data-theme` attribute. Light is the default.

### Type, space, radius

- Family: Inter only, loaded from a self-hosted file in `@selfx/ui`. No second font for "brand".
- Figures: `font-variant-numeric: tabular-nums` on any money, qty, or KPI.
- Scale: 12, 14, 16, 18, 24, 32, 40, 56. Marketing may use 56. Dashboards default to 14 body and 24 page title.
- Space: 4px grid only (4, 8, 12, 16, 24, 32, 48, 64).
- Radius: 6px inputs, 8px cards and dialogs, 10px max. POS keys may be 8px.
- Border: 1px `--line`. Shadows: none on cards. Dialogs may use a single `0 8px 24px rgb(28 25 23 / 0.08)`.
- Motion: 150–200ms ease-out on open/close. No bouncing, no page transitions.

### What not to ship

Gradients and gradient text, glass blur, neon, emoji as icons, decorative blobs, stock illustrations, left-border accent stripes on KPI cards, oversized radii, lorem ipsum, fake "welcome to your dashboard" illustrations. Icons are a single set (Lucide) at 16 or 20px, stroke 1.5.

### Formatting

`Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })` for display. The API still speaks paise. Dates in the UI use the store timezone; the wire format stays UTC.

## 4. Component inventory

Built in `@selfx/ui` and reviewed in Storybook (`storybook` current stable, one story per primitive).

| Component | Notes |
| --- | --- |
| Button, IconButton | primary, secondary, ghost, danger. One size scale: sm, md, lg (POS uses lg) |
| Input, Select, Combobox | Combobox for customer and product search |
| Checkbox, Switch | Switch only for settings, not for table row actions |
| Dialog, Drawer | Drawer for filters and mobile cart |
| Toast | Success and failure. No toast for every field error |
| Dropdown menu | Row actions |
| Tabs | Tenant detail, product editor |
| Table | TanStack, sticky header, empty and error states |
| Pagination | Cursor next/previous, not page numbers |
| Command palette | Cmd-K in admin and console |
| Date range picker | Presets: today, 7d, 30d, MTD, YTD, custom. Comparison toggle |
| KPI stat | Value, label, delta. No chart-in-card |
| Page header | Title, description, actions |
| Empty state | One sentence and one action |
| Error state | Request id, retry |
| Skeleton | Lists and KPI rows |
| Badge | Status only, muted colours |
| Banner | Impersonation, offline, billing grace |
| Chart frame | Title, slot for ECharts, empty |
| Receipt | 58mm, 80mm, A4 print CSS |
| Data list | Definition lists on detail pages |

Storybook is the visual contract. Apps do not restyle primitives with one-off Tailwind that fights the token.

## 5. Charts

**ECharts**, modular import, one theme object `selfxChartTheme` in `@selfx/ui`.

| Need | Series |
| --- | --- |
| Tenants created, payments sent/received | Line or area, no gradient stack |
| Sales vs purchases | Bar, two series |
| Subscription status, top sellers | Donut with a center total |
| Top customers | Pie or donut, max 6 slices then "Other" |
| Revenue by plan | Stacked bar |
| KPI sparkline | Tiny line, no axis |
| Orders by hour vs weekday | Heatmap |

Rules: no 3D, no animation longer than 200ms, legend below or to the right, axis labels in Inter, tabular numbers, colour only from the series list. The same theme is used in admin, console, and Storybook. Recharts is not added beside it.

Dashboard widgets read aggregate endpoints. They do not receive raw sale rows.

## 6. Page templates

| Template | Used by |
| --- | --- |
| `MarketingFrame` | Header, footer, wide measure for text (65ch), full-bleed hero |
| `AppShell` | Nav + top bar + content max width none (dashboards use the full width) |
| `ListPage` | Header, filter row, table, empty |
| `DetailPage` | Header, tabs, two-column on wide screens |
| `SettingsPage` | Stacked sections, 720px measure |
| `PosFrame` | The split layout, no `AppShell` inset |
| `StorefrontFrame` | Shop header and footer |
| `AuthFrame` | Centered card, 400px |

KPI home template: page header (greeting uses the person's name and a time-of-day word, nothing else cute), then a 4 or 8 card grid, then a 2/3 + 1/3 chart row. Admin uses 4 cards on the first row because the reference density works; the tenant home uses 8 because operations has more daily numbers. Cards are equal height, hairline border, no coloured left rail.

## 7. Screen list

### Marketing

Home, pricing, contact, legal (privacy, terms, refund).

### Admin

Login, 2FA, analytics home, tenant list, tenant create, tenant detail (overview, usage, subscription, invoices, activity, provision), organization list, plan list, plan editor, subscription list, invoice list, coupon list, legal entity, template studio (documents, email, SMS, WhatsApp, reports) with preview, gateway list, transaction list, reconciliation, notification providers, message log, CMS pages, CMS editor, media, app releases, AI providers, AI usage, AI prompts, catalog products, product editor, imports, review, duplicates, submissions, categories, brands, attributes, tax classes, quality, catalog sources, audit log, failed jobs, health.

### Console

Login, 2FA, forced password, dashboard, POS, order list, order detail, product list, product editor, catalog picker, product import, stock list, ledger, adjustment, transfer list, transfer detail, count, suppliers, purchase orders, goods receipt, customers, customer detail, segments, storefront editor, banners, delivery zones, slots, hours, staff list, role editor, attendance, reports list, report view, billing, settings (store, tax, printers, print layouts, gateways, notifications, API keys, webhooks, exports, apps), AI reports, AI product draft, organization stores.

### Storefront

Home, category, product, search, cart, checkout, order confirmation, account, addresses, orders, order tracking, policies, org store list, assistant drawer.

## 8. Accessibility and i18n

WCAG 2.2 AA. Visible focus, contrast of ink on surface and accent-ink on accent checked in Storybook. Hit targets 44px on storefront and POS, 32px minimum on dense admin rows with 44px on the actual control. Tables have captions. Charts have a text summary for screen readers. Forms use labels, not placeholders alone.

`next-intl`. Phase 1 locales are `en`, `te`, and `hi`. Strings live in `messages/{locale}.json` per app. No concatenated sentences. Layout must tolerate about 30% expansion. Currency and dates go through `Intl` with the active locale. Catalog names come from `catalog.product_translations`, not from the UI message files.

Theme: `data-theme="light"|"dark"` on the document element. Both token sets ship. Default is light. The toggle is in the top bar of every app. Storefront remembers the choice in `localStorage` before login; staff apps save it on the user. Charts use the same theme object with a dark variant. Do not invent a second palette.

## 9. Template studio and printer setup

One admin screen, tabs: Documents, Messages, Reports. Each row has edit, preview, versions, and publish. Preview is fixture data (a sample kirana bill, a sample SaaS invoice, a sample GST report). The editor is a block list plus an inspector. It is not a free HTML box and not a code editor.

Tenant settings → Printers:

1. Pair the print agent, or connect WebUSB / WebSerial / WebBluetooth, or choose browser print.
2. Scan. The list is OS printers plus ESC/POS devices the agent found.
3. Assign a printer to a counter, pick paper width, copies, cut, feed lines, and whether cash opens the drawer.
4. Open the layout for that document kind. Changing a block updates the preview at 58 mm, 80 mm, or A4.
5. Test print. Failure shows the agent error (offline, paper, permission) in the page, not a toast that disappears.

POS uses the paired printer without asking for a dialog when the agent or a raw device is connected. Browser print is the only path that shows the OS dialog.

## 10. Keyboard and density

Admin and console: command palette, `/` focuses the page search where a list is showing, `g` then a letter is not required (easy to conflict). POS keys are in [04-module-breakdown.md](./04-module-breakdown.md).

Dense means 14px type, 8px row padding, sticky headers, filters on one line that wrap. It does not mean removing labels from the POS pay button.
