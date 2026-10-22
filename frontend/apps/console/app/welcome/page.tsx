"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Globe,
  Layers,
  Lock,
  Package,
  Printer,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const CAPABILITY_TABS = [
  {
    id: "pos",
    label: "Point of Sale (POS)",
    icon: ShoppingBag,
    title: "High-Speed Counter Billing with Offline Resilience",
    description:
      "Designed for high-throughput supermarket and retail counters. Scan barcodes at sub-50ms latency, hold and recall multiple customer carts, split payments across Cash, UPI, Card, and Khata, and print 58mm/80mm ESC/POS thermal receipts automatically.",
    bullets: [
      "Instant barcode (GTIN/EAN) & keyboard shortcut billing (F2 Pay, F4 Hold, F8 Customer)",
      "Multi-tender split payments: Cash, Dynamic UPI QR, Card Terminal, and Customer Khata",
      "IndexedDB offline-first queue that syncs bills automatically when connectivity returns",
      "Cashier Shift Opening Float, Cash In/Out drops, and blind Z-Report drawer reconciliation",
      "Direct WebUSB / Network TCP / Browser thermal receipt printing with GST & UPI QR",
    ],
    metrics: [
      { label: "Scan-to-Cart Latency", value: "< 35ms" },
      { label: "Supported Printers", value: "58mm / 80mm / A4" },
      { label: "Offline Queue Capacity", value: "10,000+ Bills" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & Batches",
    icon: Package,
    title: "Multi-Warehouse Stock, FIFO Batches & Barcode Labels",
    description:
      "Maintain 100% stock accuracy across store floors and godowns. Track batch numbers, manufacturing dates, expiry dates, purchase cost, wholesale price, and retail MRP with automated low-stock alerts.",
    bullets: [
      "Hierarchical product catalog: Categories, Sub-Categories, Brands, Units, and Variants",
      "FIFO batch deduction ensuring oldest or nearest-expiry stock is billed first",
      "Inter-warehouse stock transfers, damage/shrinkage write-offs, and physical stock audits",
      "Built-in Thermal & A4 Barcode Label Generator with store name, MRP, and Code-128 bars",
      "One-click import from the verified Global Master FMCG & Retail Catalog",
    ],
    metrics: [
      { label: "Stock Allocation", value: "Automated FIFO" },
      { label: "Price Tiers", value: "Cost / Wholesale / MRP" },
      { label: "Reorder Alerts", value: "Real-Time Per Store" },
    ],
  },
  {
    id: "gst",
    label: "GST, Reports & Tally",
    icon: BarChart3,
    title: "Real-Time Financial Ledgers, GSTR Summaries & Tally Prime Export",
    description:
      "Eliminate manual accounting reconciliation. Every POS sale, credit note, and supplier purchase automatically updates your CGST, SGST, and IGST tax ledgers and Day Ledger summary.",
    bullets: [
      "11 Interactive Retail Reports with visual Bar Charts, Donut Charts, and share progress bars",
      "Live Top-Header 'Today's Summary' Day Ledger drawer showing Net Sales, In/Out cash, and Profit",
      "Automated HSN-wise and tax-slab-wise (0%, 5%, 12%, 18%, 28%) GSTR-1 & GSTR-3B summaries",
      "Direct 1-click export to PDF, Excel, CSV, and Tally Prime voucher import format",
      "Scheduled daily automated email reports delivered to store owners every night",
    ],
    metrics: [
      { label: "Built-In Reports", value: "11 Live Modules" },
      { label: "Accounting Export", value: "Tally / Excel / PDF" },
      { label: "Tax Engine", value: "CGST + SGST + IGST" },
    ],
  },
  {
    id: "storefront",
    label: "Online Storefront",
    icon: Globe,
    title: "Instant Hyperlocal Online Store Synced with Counter Inventory",
    description:
      "Launch a production-ready online store for your retail outlet without maintaining separate inventory. Customers browse live in-stock items, apply promo codes, and choose home delivery or store pickup.",
    bullets: [
      "100% live catalog and stock synchronization with your physical retail store",
      "Configurable delivery radius, minimum order value, free delivery thresholds, and time slots",
      "Integrated payment gateways: Razorpay, Stripe, PhonePe PG, Paytm PG, UPI, and Cash on Delivery",
      "Unified Order Management screen showing both Online Store orders and Counter POS bills",
      "Custom domain, SEO meta tags, WhatsApp chat integration, and promotional banners",
    ],
    metrics: [
      { label: "Catalog Sync", value: "Real-Time Shared Stock" },
      { label: "Payment Gateways", value: "Razorpay / PhonePe / Stripe" },
      { label: "Fulfilment Modes", value: "Delivery + Store Pickup" },
    ],
  },
  {
    id: "crm",
    label: "Customers, Khata & Staff",
    icon: Users,
    title: "Customer Khata Credit Ledger, Loyalty & Granular Staff RBAC",
    description:
      "Build lasting customer relationships with digital Khata credit accounts and loyalty tracking while securing store operations with role-based permissions and staff attendance logs.",
    bullets: [
      "Customer Khata ledger with credit limits, partial payment collection, and outstanding reminders",
      "Purchase history and lifetime spend analytics for every registered customer",
      "Custom Staff Roles (Store Manager, Head Cashier, Inventory Clerk, Billing Executive)",
      "Granular permission matrix controlling access to POS discounts, refunds, reports, and settings",
      "Daily Staff Attendance check-in/check-out register and shift on-duty tracking",
    ],
    metrics: [
      { label: "Access Control", value: "Granular RBAC Matrix" },
      { label: "Credit Tracking", value: "Digital Khata Ledger" },
      { label: "Audit Trail", value: "100% Immutable Logs" },
    ],
  },
] as const;

const END_TO_END_STACK = [
  {
    icon: ShoppingBag,
    title: "Counter POS & Billing",
    desc: "Fast barcode checkout, hold carts, split tenders, thermal receipts, and offline billing resilience.",
  },
  {
    icon: Package,
    title: "Inventory & Batch Ledger",
    desc: "Multi-warehouse stock, FIFO batch expiry control, stock transfers, and barcode label printing.",
  },
  {
    icon: Truck,
    title: "Purchases & Supplier GRN",
    desc: "Purchase orders, Goods Receipt Notes (GRN), supplier GSTIN directory, and vendor payable ledgers.",
  },
  {
    icon: Receipt,
    title: "GST & Tally Accounting",
    desc: "Automated CGST/SGST/IGST computation, GSTR-1/3B return tables, and Tally Prime CSV/XML export.",
  },
  {
    icon: Globe,
    title: "Hyperlocal Online Store",
    desc: "Live digital storefront synced with store inventory, delivery slots, coupons, and online gateways.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-Store & SaaS HQ",
    desc: "Centralized Super Admin governance, subscription plans, master catalog, and system health logs.",
  },
];

const VERTICALS = [
  {
    title: "Supermarkets & Departmental Stores",
    desc: "High-speed barcode billing, weigh-scale integration, multi-counter shift Z-reports, and FMCG master catalog import.",
  },
  {
    title: "Kirana & Hyperlocal Grocery",
    desc: "Quick touch POS, Customer Khata credit tracking, WhatsApp digital bills, and instant hyperlocal online ordering.",
  },
  {
    title: "Pharmacy & Medical Retail",
    desc: "Batch-wise expiry alerts, rack/bin location tracking, HSN tax compliance, and supplier purchase return workflows.",
  },
  {
    title: "Electronics & Mobile Showrooms",
    desc: "High-value GST invoicing, warranty & serial reference notes, split card/UPI/finance tenders, and margin reports.",
  },
  {
    title: "Apparel, Footwear & Lifestyle",
    desc: "Brand, size, and colour variant matrices, custom barcode sticker printing, and seasonal promotional coupon campaigns.",
  },
  {
    title: "Multi-Outlet Retail Chains",
    desc: "Centralized tenant administration, inter-warehouse stock transfers, consolidated P&L, and role-based staff permissions.",
  },
];

const FAQS = [
  {
    q: "How does SelfX connect Counter POS billing and the Online Storefront?",
    a: "Both Counter POS and the Online Storefront operate on the exact same real-time Store Item and Stock Batch database. When a cashier bills an item at the counter or a customer places an order online, inventory is deducted immediately using FIFO batch rules.",
  },
  {
    q: "What happens if the store internet connection drops during peak billing hours?",
    a: "The POS terminal caches the product catalog locally and queues completed bills in encrypted browser storage (IndexedDB). Cashiers can continue scanning barcodes and printing thermal receipts uninterrupted, and queued bills synchronize automatically once connectivity is restored.",
  },
  {
    q: "Can we customize thermal receipt layouts and connect 58mm or 80mm printers?",
    a: "Yes. The dedicated Printer Setup module supports 58mm (2-inch), 80mm (3-inch), and A4 GST tax invoices via Browser Print, USB/WebUSB ESC/POS, and LAN Network IP printers, complete with custom store logos, GSTIN headers, item HSN columns, and dynamic UPI QR codes.",
  },
  {
    q: "How do Super Admin and Store Tenant logins differ?",
    a: "Super Admin (Port 3001) governs the entire SaaS platform—managing merchant tenants, subscription plans, feature flags, global master catalog items, payment gateways, and platform health logs. Store Tenant Console (Port 3002) is where merchants run their daily POS billing, inventory, purchases, staff, reports, and online store settings.",
  },
  {
    q: "Are all reports and dashboards powered by real database transactions?",
    a: "Yes. Every KPI card, Today's Summary Day Ledger drawer, 7-day cashflow chart, payment method breakdown, and GST tax table is computed directly from live PostgreSQL/SQLite ledger transactions via REST APIs.",
  },
];

export default function EnterpriseLandingPage() {
  const [activeCapId, setActiveCapId] = useState<string>("pos");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeCap =
    CAPABILITY_TABS.find((c) => c.id === activeCapId) ?? CAPABILITY_TABS[0];

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* =====================================================================
       * STICKY ENTERPRISE TOP HEADER WITH LOGIN BUTTONS
       * =================================================================== */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/welcome" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                SX
              </div>
              <div>
                <span className="text-base font-semibold tracking-tight text-slate-900">
                  SelfX Retail
                </span>
                <span className="ml-2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  ERP &amp; POS
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 text-xs font-semibold text-slate-600 lg:flex">
              <a href="#stack" className="transition hover:text-slate-900">
                Platform Stack
              </a>
              <a href="#capabilities" className="transition hover:text-slate-900">
                Capabilities
              </a>
              <a href="#workflow" className="transition hover:text-slate-900">
                How It Works
              </a>
              <a href="#verticals" className="transition hover:text-slate-900">
                Industries
              </a>
              <a href="#pricing" className="transition hover:text-slate-900">
                Plans
              </a>
              <a href="#faq" className="transition hover:text-slate-900">
                FAQ
              </a>
            </nav>
          </div>

          {/* Top Header Login & Portal Action Buttons */}
          <div className="flex items-center gap-2.5">
            <a
              href="/store"
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              Live Storefront
            </a>
            <a
              href="/superadmin/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
              Super Admin Login
            </a>
            <a
              href="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Store className="h-3.5 w-3.5" />
              Store Console Login
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* =====================================================================
       * HERO SECTION (Modeled after iVendNext Enterprise Retail ERP)
       * =================================================================== */}
      <section className="border-b border-slate-200 bg-slate-50/60 py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left Copy */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Unified Cloud &amp; Offline-First Retail ERP Platform
              </div>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.15]">
                Run Your Entire Retail Business on One Unified Platform.
              </h1>

              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                SelfX unifies high-speed Counter POS billing, multi-warehouse FIFO inventory, supplier GRN purchases, GST &amp; Tally accounting, Customer Khata, and a live hyperlocal Online Storefront into a single production-grade system.
              </p>

              {/* Login & Portal CTA Row */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="/login"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
                >
                  <Store className="h-4 w-4" />
                  Login to Store Console
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="/superadmin/login"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4 text-slate-700" />
                  Super Admin Portal
                </a>
                <a
                  href="/store"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <Globe className="h-4 w-4" />
                  View Live Storefront
                </a>
              </div>

              {/* Operational Benchmarks */}
              <div className="mt-9 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 sm:grid-cols-4">
                <div>
                  <div className="num text-lg font-semibold text-slate-900">&lt; 35ms</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Barcode Scan Speed
                  </div>
                </div>
                <div>
                  <div className="num text-lg font-semibold text-slate-900">100%</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    GST &amp; Tally Ready
                  </div>
                </div>
                <div>
                  <div className="num text-lg font-semibold text-slate-900">FIFO</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Batch &amp; Expiry Ledger
                  </div>
                </div>
                <div>
                  <div className="num text-lg font-semibold text-slate-900">24×7</div>
                  <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    Offline POS Queue
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive Product Preview Frame */}
            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                {/* Browser / Terminal Window Bar */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                    <span className="ml-2 text-xs font-semibold tracking-tight text-slate-200">
                      SelfX Retail ERP — Live Operations Overview
                    </span>
                  </div>
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    POS + Inventory + GST Synced
                  </span>
                </div>

                {/* Simulated Live ERP Workspace */}
                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Today&apos;s Net Sales
                      </div>
                      <div className="num mt-1 text-lg font-semibold text-slate-900">
                        ₹1,48,920.00
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                        142 GST Invoices
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Stock Valuation
                      </div>
                      <div className="num mt-1 text-lg font-semibold text-slate-900">
                        ₹18,64,500.00
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                        FIFO Cost Basis
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Online + POS Orders
                      </div>
                      <div className="num mt-1 text-lg font-semibold text-slate-900">
                        100% Synced
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold text-blue-700">
                        Zero Stock Drift
                      </div>
                    </div>
                  </div>

                  {/* Sample Counter POS & Inventory Ledger Table */}
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-[11px] font-semibold text-slate-700">
                      <span>Real-Time Multi-Channel Ledger</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        CGST + SGST Auto-Computed
                      </span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-white text-[10px] font-semibold uppercase text-slate-400">
                          <th className="px-3.5 py-2">Channel</th>
                          <th className="px-3.5 py-2">Reference</th>
                          <th className="px-3.5 py-2">Tender</th>
                          <th className="px-3.5 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        <tr>
                          <td className="px-3.5 py-2 font-semibold text-slate-900">
                            Counter POS #01
                          </td>
                          <td className="font-mono px-3.5 py-2 text-[11px] text-slate-600">
                            INV-2026-0841
                          </td>
                          <td className="px-3.5 py-2">
                            <span className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              UPI QR
                            </span>
                          </td>
                          <td className="num px-3.5 py-2 text-right font-semibold text-slate-900">
                            ₹2,480.00
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2 font-semibold text-slate-900">
                            Online Storefront
                          </td>
                          <td className="font-mono px-3.5 py-2 text-[11px] text-slate-600">
                            ORD-89320
                          </td>
                          <td className="px-3.5 py-2">
                            <span className="rounded-sm bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                              RAZORPAY
                            </span>
                          </td>
                          <td className="num px-3.5 py-2 text-right font-semibold text-slate-900">
                            ₹1,190.00
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3.5 py-2 font-semibold text-slate-900">
                            Counter POS #02
                          </td>
                          <td className="font-mono px-3.5 py-2 text-[11px] text-slate-600">
                            INV-2026-0842
                          </td>
                          <td className="px-3.5 py-2">
                            <span className="rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                              KHATA CREDIT
                            </span>
                          </td>
                          <td className="num px-3.5 py-2 text-right font-semibold text-slate-900">
                            ₹5,640.00
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Quick Portal Switcher Footer inside Preview */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
                    <span className="font-semibold text-slate-700">
                      Ready to access your workspace?
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href="/login"
                        className="font-semibold text-slate-900 underline hover:text-slate-700"
                      >
                        Tenant Login →
                      </a>
                      <span className="text-slate-300">|</span>
                      <a
                        href="/superadmin/login"
                        className="font-semibold text-slate-900 underline hover:text-slate-700"
                      >
                        Super Admin →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
       * SECTION 2: ONE COMPLETE RETAIL STACK (6 CORE MODULES)
       * =================================================================== */}
      <section id="stack" className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              End-to-End Architecture
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              One Complete Retail Stack. Zero Disconnected Tools.
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Every module in SelfX shares a single source of truth—from barcode scanning at the billing counter to warehouse batch tracking, GST tax ledgers, and your online store.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {END_TO_END_STACK.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-xs"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-900">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
       * SECTION 3: INTERACTIVE CAPABILITIES EXPLORER
       * =================================================================== */}
      <section
        id="capabilities"
        className="border-y border-slate-200 bg-slate-50/70 py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Deep-Dive Capabilities
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Engineered for Real-World Retail Operations
              </h2>
            </div>
          </div>

          {/* Interactive Module Selector Tabs */}
          <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
            {CAPABILITY_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeCap.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCapId(tab.id)}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Capability Detail Panel */}
          <div className="mt-8 grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs lg:grid-cols-12 lg:p-8">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                <activeCap.icon className="h-3.5 w-3.5" />
                {activeCap.label}
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900 sm:text-2xl">
                {activeCap.title}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {activeCap.description}
              </p>

              <ul className="mt-5 space-y-2.5">
                {activeCap.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className="font-medium">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-6 lg:col-span-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Module Specifications
                </div>
                <div className="mt-4 space-y-3">
                  {activeCap.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
                    >
                      <span className="text-xs font-semibold text-slate-600">
                        {m.label}
                      </span>
                      <span className="num text-xs font-semibold text-slate-900">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Test this module live:
                  </span>
                  <a
                    href="/login"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Open in Store Console
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
       * SECTION 4: HOW THE SYSTEM WORKS (END-TO-END FLOW)
       * =================================================================== */}
      <section id="workflow" className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              System Architecture &amp; Flow
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              How SelfX Connects Every Step of Your Store Workflow
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {[
              {
                step: "01",
                title: "Tenant & Store Setup",
                desc: "Provision store profile, GSTIN, warehouses, tax slabs, thermal printer settings, and staff RBAC roles.",
              },
              {
                step: "02",
                title: "Catalog & GRN Inward",
                desc: "Add products or import from Master Catalog. Receive supplier stock via GRN with batch cost & expiry.",
              },
              {
                step: "03",
                title: "POS & Online Selling",
                desc: "Bill customers at the counter or accept online storefront orders—both deducting from live FIFO stock.",
              },
              {
                step: "04",
                title: "Shift Z-Report & Ledger",
                desc: "Reconcile cashier drawer cash at shift close and inspect real-time Net Sales & Profit in Today's Summary.",
              },
              {
                step: "05",
                title: "GST & Tally Export",
                desc: "Generate GSTR-1/3B tax summaries, customer Khata statements, and export vouchers directly to Tally Prime.",
              },
            ].map((w) => (
              <div
                key={w.step}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-slate-400">
                    STEP {w.step}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">
                    {w.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {w.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
       * SECTION 5: RETAIL VERTICALS WE POWER
       * =================================================================== */}
      <section
        id="verticals"
        className="border-y border-slate-200 bg-slate-50/70 py-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Industry Verticals
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Purpose-Built for Indian &amp; Global Retail Formats
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VERTICALS.map((v) => (
              <div
                key={v.title}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <h3 className="text-sm font-semibold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
       * SECTION 6: SAAS SUBSCRIPTION PLANS
       * =================================================================== */}
      <section id="pricing" className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Transparent SaaS Plans
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Flexible Plans Managed via Super Admin Governance
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                name: "Starter Retail",
                price: "₹999",
                period: "/ month",
                desc: "Ideal for single-outlet kirana, medical, and specialty retail stores.",
                features: [
                  "1 Retail Store & 2 POS Registers",
                  "Up to 5,000 Products & Barcode Labels",
                  "Full GST Invoicing & Thermal Printing",
                  "Customer Khata Credit Ledger",
                  "Standard Sales & Stock Reports",
                ],
                featured: false,
              },
              {
                name: "Growth Multi-Channel",
                price: "₹2,499",
                period: "/ month",
                desc: "For growing supermarkets & stores launching their Online Storefront.",
                features: [
                  "Up to 3 Stores & 10 POS Registers",
                  "25,000 Products + FIFO Batch & Expiry",
                  "Live Online Storefront & Delivery Slots",
                  "Razorpay, PhonePe, Paytm & Stripe Gateways",
                  "All 11 Visual Reports + Tally Prime Export",
                ],
                featured: true,
              },
              {
                name: "Enterprise Chain",
                price: "₹6,999",
                period: "/ month",
                desc: "For multi-store retail chains requiring custom RBAC, webhooks, and HQ control.",
                features: [
                  "Unlimited Stores, Warehouses & Registers",
                  "Unlimited SKUs & Inter-Store Transfers",
                  "Granular Staff Role Permission Matrix",
                  "API Keys, Webhooks & Automated Email Reports",
                  "Dedicated Super Admin Priority SLA",
                ],
                featured: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col justify-between rounded-2xl border p-6 ${
                  plan.featured
                    ? "border-slate-900 bg-slate-900 text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-900"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{plan.name}</h3>
                    {plan.featured ? (
                      <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Most Popular
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="num text-3xl font-semibold">{plan.price}</span>
                    <span
                      className={`text-xs font-medium ${
                        plan.featured ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {plan.period}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-xs ${
                      plan.featured ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {plan.desc}
                  </p>
                  <ul className="mt-6 space-y-2.5 border-t border-slate-200/20 pt-5 text-xs">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <Check
                          className={`h-3.5 w-3.5 shrink-0 ${
                            plan.featured ? "text-emerald-400" : "text-emerald-600"
                          }`}
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href="/login"
                  className={`mt-8 inline-flex h-10 w-full items-center justify-center rounded-lg text-xs font-semibold transition ${
                    plan.featured
                      ? "bg-white text-slate-900 hover:bg-slate-100"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Start With {plan.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
       * SECTION 7: FREQUENTLY ASKED QUESTIONS
       * =================================================================== */}
      <section
        id="faq"
        className="border-t border-slate-200 bg-slate-50/60 py-16 lg:py-20"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Architectural and operational answers about SelfX Retail ERP &amp; POS.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left text-xs font-semibold text-slate-900 sm:text-sm"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen ? (
                    <div className="border-t border-slate-100 px-5 py-4 text-xs leading-relaxed text-slate-600">
                      {item.a}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
       * ENTERPRISE FOOTER WITH DIRECT LOGIN LINKS
       * =================================================================== */}
      <footer className="border-t border-slate-200 bg-slate-900 py-12 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-800 pb-8">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-semibold text-slate-900">
                  SX
                </div>
                <span className="text-base font-semibold text-white">
                  SelfX Retail ERP &amp; POS
                </span>
              </div>
              <p className="mt-2 max-w-md text-xs text-slate-400">
                Production-grade multi-tenant retail POS, FIFO inventory ledger, GST accounting, and online storefront platform.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/login"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-semibold text-slate-900 hover:bg-slate-100"
              >
                <Store className="h-3.5 w-3.5" />
                Store Console Login
              </a>
              <a
                href="/superadmin/login"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 text-xs font-semibold text-white hover:bg-slate-700"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Super Admin Login
              </a>
              <a
                href="/store"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-4 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <Globe className="h-3.5 w-3.5" />
                Live Online Store
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} SelfX Retail Platform. All rights reserved.</span>
            <span>Built for High-Volume Retail &amp; Multi-Store Operations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
