"use client";

import {
  ArrowLeft,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  Key,
  Layers,
  Lock,
  Package,
  Play,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Store,
  Terminal,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ParamDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

export interface PropertyDef {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  children?: PropertyDef[];
}

export interface ApiEndpoint {
  id: string;
  group: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  auth: "Bearer Token" | "Session Cookie" | "Public" | "Platform Admin";
  parameters?: ParamDef[];
  queryParams?: ParamDef[];
  requestBody?: {
    description?: string;
    schema: PropertyDef[];
    example: Record<string, unknown>;
  };
  responses: {
    status: number;
    description: string;
    example: Record<string, unknown>;
  }[];
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // 1. Authentication
  {
    id: "auth-platform-login",
    group: "Authentication",
    method: "POST",
    path: "/api/v1/auth/platform/login",
    title: "Platform Admin Login",
    description: "Authenticates a platform super-admin using email and password, issuing a secure session cookie.",
    auth: "Public",
    requestBody: {
      schema: [
        { name: "email", type: "string", required: true, description: "Super admin registered email address" },
        { name: "password", type: "string", required: true, description: "Account password" },
      ],
      example: { email: "admin@selfx.com", password: "••••••••" },
    },
    responses: [
      {
        status: 200,
        description: "Authenticated successfully",
        example: { data: { id: "01a154f0-4069", name: "Super Admin", kind: "platform", must_change_password: false } },
      },
      {
        status: 422,
        description: "Validation error of invalid credentials",
        example: {
          error: "Validation failed",
          message: "The provided credentials are invalid.",
        },
      },
    ],
  },
  {
    id: "auth-staff-login",
    group: "Authentication",
    method: "POST",
    path: "/api/v1/auth/staff/login",
    title: "Tenant Staff Login",
    description: "Authenticates a tenant manager, cashier, or store admin with store slug namespace.",
    auth: "Public",
    requestBody: {
      schema: [
        { name: "slug", type: "string", required: true, description: "Tenant organization slug identifier" },
        { name: "email", type: "string", required: true, description: "Staff account email" },
        { name: "password", type: "string", required: true, description: "Staff password" },
      ],
      example: { slug: "bangalore", email: "store@selfx.in", password: "••••••••" },
    },
    responses: [
      {
        status: 200,
        description: "Staff authenticated",
        example: { data: { id: "01a154f0-user", name: "Store Manager", kind: "staff", role: "Manager", tenant: { slug: "bangalore" } } },
      },
    ],
  },
  {
    id: "auth-staff-me",
    group: "Authentication",
    method: "GET",
    path: "/api/v1/auth/staff/me",
    title: "Get Current Staff Profile",
    description: "Returns the authenticated staff member's profile, tenant info, assigned store, and role permissions.",
    auth: "Session Cookie",
    responses: [
      {
        status: 200,
        description: "Current profile details",
        example: {
          data: {
            id: "01a154f0-user",
            name: "Kiran Cashier",
            email: "kiran@store.in",
            kind: "staff",
            role: "Cashier",
            store: { id: "01a154f0-store", name: "MG Road Flagship", slug: "bangalore" },
          },
        },
      },
    ],
  },

  // 2. Tenants & Provisioning
  {
    id: "platform-tenants-list",
    group: "Tenants & Organizations",
    method: "GET",
    path: "/api/v1/platform/tenants",
    title: "List All Tenants",
    description: "Retrieves a paginated list of all retail tenants on the platform with subscription status and domain information.",
    auth: "Platform Admin",
    queryParams: [
      { name: "page", type: "integer", required: false, description: "Page number for pagination", example: "1" },
      { name: "status", type: "string", required: false, description: "Filter by status: active, pending, suspended", example: "active" },
    ],
    responses: [
      {
        status: 200,
        description: "List of platform tenants",
        example: {
          data: [
            {
              id: "01a154f0-tenant",
              name: "Bangalore Supermarket Ltd",
              slug: "bangalore",
              status: "active",
              plan: "Pro Enterprise",
              created_at: "2026-03-15T09:30:00Z",
            },
          ],
        },
      },
    ],
  },
  {
    id: "platform-tenants-create",
    group: "Tenants & Organizations",
    method: "POST",
    path: "/api/v1/platform/tenants",
    title: "Provision New Tenant",
    description: "Provisions an isolated multi-tenant organization, initializes database schema, sets default warehouse, and creates primary store.",
    auth: "Platform Admin",
    requestBody: {
      schema: [
        { name: "name", type: "string", required: true, description: "Legal business name" },
        { name: "slug", type: "string", required: true, description: "Unique URL slug identifier" },
        { name: "admin_email", type: "string", required: true, description: "Primary administrator email" },
        { name: "admin_name", type: "string", required: true, description: "Administrator full name" },
        { name: "plan_id", type: "string", required: true, description: "Subscription plan ID" },
      ],
      example: {
        name: "Metro Retail Mart",
        slug: "metro-mart",
        admin_email: "owner@metromart.in",
        admin_name: "Rahul Sharma",
        plan_id: "plan-pro",
      },
    },
    responses: [
      {
        status: 201,
        description: "Tenant provisioned successfully",
        example: { data: { id: "01a154f0-new", slug: "metro-mart", status: "provisioned", store_id: "01a154f0-store" } },
      },
    ],
  },

  // 3. Catalog & Products
  {
    id: "catalog-products",
    group: "Catalog & Inventory",
    method: "GET",
    path: "/api/v1/catalog/products",
    title: "Search Platform Catalog",
    description: "Returns master product records across the central master catalog with barcodes and standard HSN codes.",
    auth: "Bearer Token",
    queryParams: [
      { name: "q", type: "string", required: false, description: "Search query by name or barcode", example: "Basmati" },
      { name: "category", type: "string", required: false, description: "Category filter" },
    ],
    responses: [
      {
        status: 200,
        description: "Array of catalog products",
        example: {
          data: [
            {
              id: "prod-101",
              name: "Fortune Rozana Basmati Rice 5kg",
              barcode: "8906007281923",
              hsn: "10063020",
              gst_pct: 5,
              mrp_paise: 49900,
            },
          ],
        },
      },
    ],
  },
  {
    id: "catalog-own-products-create",
    group: "Catalog & Inventory",
    method: "POST",
    path: "/api/v1/catalog/own/products",
    title: "Create Store Product",
    description: "Creates a new item in the tenant's own store catalog with inventory pricing, tax classification, and barcode.",
    auth: "Session Cookie",
    requestBody: {
      schema: [
        { name: "name", type: "string", required: true, description: "Product display name" },
        { name: "sku", type: "string", required: true, description: "Stock keeping unit" },
        { name: "barcode", type: "string", required: false, description: "EAN-13, UPC, or custom barcode" },
        { name: "selling_price_paise", type: "integer", required: true, description: "Selling price in paise (₹100 = 10000)" },
        { name: "mrp_paise", type: "integer", required: true, description: "Maximum retail price in paise" },
        { name: "cost_price_paise", type: "integer", required: false, description: "Purchase cost price in paise" },
        { name: "category_id", type: "string", required: false, description: "Tenant category UUID" },
        { name: "hsn", type: "string", required: false, description: "Harmonized System of Nomenclature code" },
        { name: "tax_rate", type: "number", required: false, description: "GST percentage rate (e.g. 5, 12, 18)" },
      ],
      example: {
        name: "Tata Tea Gold 500g",
        sku: "TTG-500",
        barcode: "8901052003892",
        selling_price_paise: 32000,
        mrp_paise: 35000,
        cost_price_paise: 27500,
        tax_rate: 5,
        hsn: "09024020",
      },
    },
    responses: [
      {
        status: 201,
        description: "Product created",
        example: { data: { id: "item-tea-01", name: "Tata Tea Gold 500g", sku: "TTG-500", selling_price_paise: 32000 } },
      },
    ],
  },

  // 4. POS & Sales Operations
  {
    id: "pos-sell",
    group: "POS & Sales Operations",
    method: "POST",
    path: "/api/v1/stores/{store}/sales",
    title: "Process Sale / Checkout",
    description: "Executes an in-store POS transaction or creates a tax invoice, deducts inventory batches, and records payment breakdown.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "customer_id", type: "string", required: false, description: "Customer UUID for loyalty and ledger" },
        { name: "lines", type: "array", required: true, description: "Array of invoice line items" },
        { name: "payments", type: "array", required: true, description: "Payment mode tenders (cash, upi, card, split)" },
        { name: "discount_paise", type: "integer", required: false, description: "Total bill discount in paise" },
      ],
      example: {
        customer_id: "01a154f0-cust",
        lines: [
          { store_item_id: "item-tea-01", qty: 2, unit_price_paise: 32000, discount_paise: 0 },
        ],
        payments: [
          { method: "upi", amount_paise: 64000, reference: "UPI/20261020/9981" },
        ],
        discount_paise: 0,
      },
    },
    responses: [
      {
        status: 200,
        description: "Sale processed and invoice generated",
        example: {
          data: {
            sale_id: "sale-99881",
            invoice_number: "INV-2026-0042",
            net_total_paise: 64000,
            tax_paise: 3048,
            lines_count: 1,
            created_at: "2026-10-20T14:15:00+05:30",
          },
        },
      },
    ],
  },
  {
    id: "pos-shift-close",
    group: "POS & Sales Operations",
    method: "POST",
    path: "/api/v1/stores/{store}/shifts/close",
    title: "Close Register Shift (Z-Report)",
    description: "Closes the active cash drawer shift, tallies tender collections (cash, UPI, cards), and computes cash discrepancy variance.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "actual_cash_paise", type: "integer", required: true, description: "Physically counted drawer cash in paise" },
        { name: "notes", type: "string", required: false, description: "Shift handover notes" },
      ],
      example: { actual_cash_paise: 1540000, notes: "All reconciliations verified against UPI settlement." },
    },
    responses: [
      {
        status: 200,
        description: "Shift closed with Z-reading summary",
        example: {
          data: {
            shift_id: "shift-441",
            closed_at: "2026-10-20T21:00:00+05:30",
            expected_cash_paise: 1540000,
            actual_cash_paise: 1540000,
            variance_paise: 0,
            total_sales_paise: 8450000,
          },
        },
      },
    ],
  },

  // 5. Online Storefront & Orders
  {
    id: "storefront-public-items",
    group: "Online Storefront",
    method: "GET",
    path: "/api/v1/public/stores/{slug}/items",
    title: "Get Public Store Catalog",
    description: "Public catalog endpoint used by the online storefront to display real-time inventory, prices, and stock availability.",
    auth: "Public",
    parameters: [{ name: "slug", type: "string", required: true, description: "Store public slug", example: "bangalore" }],
    queryParams: [
      { name: "q", type: "string", required: false, description: "Keyword search filter" },
    ],
    responses: [
      {
        status: 200,
        description: "Array of publicly visible products",
        example: {
          data: [
            {
              id: "01a15763-item",
              name: "Arabica Roast Coffee 250g",
              sku: "33990",
              selling_price_paise: 100000,
              mrp_paise: 100000,
              on_hand: 24,
              category: "Beverages",
              brand: "BlueTokai",
            },
          ],
        },
      },
    ],
  },
  {
    id: "storefront-checkout",
    group: "Online Storefront",
    method: "POST",
    path: "/api/v1/public/stores/{slug}/checkout",
    title: "Place Online Order",
    description: "Places a customer order via delivery or store pickup, supports online gateway payment tokens (Razorpay, Stripe, PhonePe, Paytm).",
    auth: "Public",
    parameters: [{ name: "slug", type: "string", required: true, description: "Store public slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "customer_name", type: "string", required: true, description: "Customer full name" },
        { name: "customer_phone", type: "string", required: true, description: "10-digit mobile number" },
        { name: "fulfillment", type: "string", required: true, description: "'delivery' or 'pickup'" },
        { name: "payment_method", type: "string", required: true, description: "'cod', 'pay_at_store', 'razorpay', 'stripe', 'phonepe', 'paytm'" },
        { name: "lines", type: "array", required: true, description: "Order items with quantities" },
      ],
      example: {
        customer_name: "Anita Rao",
        customer_phone: "9876543210",
        fulfillment: "delivery",
        address_line: "Flat 402, Green Glen Layout, Bellandur",
        pincode: "560103",
        payment_method: "razorpay",
        lines: [{ store_item_id: "01a15763-item", qty: 1 }],
      },
    },
    responses: [
      {
        status: 201,
        description: "Order created with tracking code",
        example: {
          data: {
            order_id: "ord-8891",
            order_number: "SO-8891",
            status: "placed",
            total_paise: 100000,
            tracking_url: "/track?number=SO-8891",
          },
        },
      },
    ],
  },

  // 6. Reports & GST Analytics
  {
    id: "reports-hsn",
    group: "Reports & GST Analytics",
    method: "GET",
    path: "/api/v1/reports/hsn",
    title: "HSN-Wise GST Summary (GSTR-1 Table 12)",
    description: "Returns aggregated HSN code summary with total taxable value, CGST, SGST, IGST, and cess amounts for GST compliance.",
    auth: "Session Cookie",
    queryParams: [
      { name: "from", type: "string", required: false, description: "Start date (YYYY-MM-DD)", example: "2026-10-01" },
      { name: "to", type: "string", required: false, description: "End date (YYYY-MM-DD)", example: "2026-10-31" },
      { name: "warehouse", type: "string", required: false, description: "Filter by warehouse location" },
    ],
    responses: [
      {
        status: 200,
        description: "HSN compliance data",
        example: {
          data: [
            {
              hsn: "09024020",
              description: "Tea and Mate",
              total_qty: 48,
              taxable_value_paise: 1536000,
              cgst_paise: 38400,
              sgst_paise: 38400,
              igst_paise: 0,
              total_tax_paise: 76800,
            },
          ],
        },
      },
    ],
  },
  {
    id: "reports-daybook",
    group: "Reports & GST Analytics",
    method: "GET",
    path: "/api/v1/reports/daybook",
    title: "Day Book & Cash Book",
    description: "Returns daily financial debit and credit transactions including cash inflows, sales revenue, supplier payables, and petty cash.",
    auth: "Session Cookie",
    queryParams: [
      { name: "date", type: "string", required: false, description: "Date (YYYY-MM-DD)", example: "2026-10-20" },
    ],
    responses: [
      {
        status: 200,
        description: "Day book ledger entries",
        example: {
          data: {
            date: "2026-10-20",
            opening_cash_paise: 500000,
            total_inflows_paise: 6850000,
            total_outflows_paise: 1200000,
            closing_cash_paise: 6150000,
            transactions: [
              { time: "10:14:00", type: "sale", ref: "INV-001", mode: "cash", in_paise: 64000, out_paise: 0 },
            ],
          },
        },
      },
    ],
  },
  {
    id: "reports-schedules-list",
    group: "Reports & GST Analytics",
    method: "GET",
    path: "/api/v1/reports/schedules",
    title: "List Scheduled Email Reports",
    description: "Lists all automated recurring email reports configured for the store (daily sales, weekly GST, stock alerts).",
    auth: "Session Cookie",
    responses: [
      {
        status: 200,
        description: "Active report schedules",
        example: {
          data: [
            {
              id: "sched-1",
              report_type: "daily_sales",
              frequency: "daily",
              time: "21:30",
              recipients: ["finance@store.in", "owner@store.in"],
              last_sent_at: "2026-10-19T21:30:00Z",
            },
          ],
        },
      },
    ],
  },

  // 7. Payment Webhooks
  {
    id: "webhooks-gateway",
    group: "Payment Gateways & Webhooks",
    method: "POST",
    path: "/api/v1/public/webhooks/{provider}",
    title: "Payment Gateway Inbound Webhook",
    description: "Receives server-to-server payment notifications from Stripe, Razorpay, PhonePe, or Paytm with HMAC-SHA256 signature verification.",
    auth: "Public",
    parameters: [
      { name: "provider", type: "string", required: true, description: "Gateway: 'stripe', 'razorpay', 'phonepe', or 'paytm'", example: "razorpay" },
    ],
    requestBody: {
      schema: [
        { name: "event_id", type: "string", required: true, description: "Unique payment event identifier" },
        { name: "order_id", type: "string", required: true, description: "Store order UUID" },
        { name: "type", type: "string", required: true, description: "Event type: 'payment.captured' or 'payment.failed'" },
        { name: "amount_paise", type: "integer", required: true, description: "Amount captured in paise" },
      ],
      example: {
        event_id: "evt_razorpay_992182",
        order_id: "01a154f0-order",
        type: "payment.captured",
        amount_paise: 100000,
      },
    },
    responses: [
      { status: 200, description: "Webhook verified and captured", example: { data: { received: true } } },
      { status: 400, description: "Invalid signature or amount mismatch", example: { error: "validation.failed" } },
    ],
  },

  // 8. Authentication Additional
  {
    id: "auth-staff-pin",
    group: "Authentication",
    method: "POST",
    path: "/api/v1/staff/pin",
    title: "Quick PIN Verification for POS",
    description: "Authenticates cashier or store associate via 4-digit security PIN on shared billing counter tablets without full email re-login.",
    auth: "Session Cookie",
    requestBody: {
      schema: [
        { name: "pin", type: "string", required: true, description: "4-to-6 digit security PIN" },
      ],
      example: { pin: "1234" },
    },
    responses: [
      {
        status: 200,
        description: "PIN verified and staff unlocked",
        example: { data: { authenticated: true, staff: { id: "01a154f0-user", name: "Kiran Cashier", role: "Cashier" } } },
      },
      {
        status: 401,
        description: "Invalid PIN code",
        example: { error: "Invalid staff PIN." },
      },
    ],
  },
  {
    id: "auth-switch-store",
    group: "Authentication",
    method: "POST",
    path: "/api/v1/auth/switch-store",
    title: "Switch Active Branch Context",
    description: "Switches the active branch/store session for multi-outlet managers.",
    auth: "Session Cookie",
    requestBody: {
      schema: [
        { name: "store_id", type: "string", required: true, description: "Target store UUID" },
      ],
      example: { store_id: "01a154f0-store" },
    },
    responses: [
      {
        status: 200,
        description: "Active store switched",
        example: { data: { active_store_id: "01a154f0-store", name: "Indiranagar Express" } },
      },
    ],
  },

  // 9. Branches & POS Terminals
  {
    id: "stores-list",
    group: "Branches & POS Terminals",
    method: "GET",
    path: "/api/v1/stores",
    title: "List Branches & Store Outlets",
    description: "Retrieves all physical outlets, dark stores, and warehouse locations configured under the current tenant.",
    auth: "Session Cookie",
    responses: [
      {
        status: 200,
        description: "Array of store branches",
        example: {
          data: {
            stores: [
              {
                id: "01a154f0-store",
                name: "MG Road Flagship",
                code: "MGR-01",
                public_slug: "mg-road",
                is_default: true,
                terminals_count: 3,
                staff_count: 5,
                storefront_url: "https://retail.sirixo.com/store?store=mg-road",
              },
            ],
            stats: { total: 1, active: 1 },
          },
        },
      },
    ],
  },
  {
    id: "stores-create",
    group: "Branches & POS Terminals",
    method: "POST",
    path: "/api/v1/stores",
    title: "Create Branch / Outlet",
    description: "Provisions a new store branch with unique code, public slug, address, contact details, and optional GSTIN override.",
    auth: "Session Cookie",
    requestBody: {
      schema: [
        { name: "name", type: "string", required: true, description: "Store branch name" },
        { name: "code", type: "string", required: true, description: "Unique outlet code (e.g. BLR-01)" },
        { name: "public_slug", type: "string", required: false, description: "Custom URL slug for online ordering" },
        { name: "contact_phone", type: "string", required: false, description: "Branch phone number" },
        { name: "contact_email", type: "string", required: false, description: "Branch email address" },
        { name: "gstin", type: "string", required: false, description: "Branch specific GSTIN if separate state" },
      ],
      example: {
        name: "Indiranagar Express",
        code: "IND-02",
        public_slug: "indiranagar",
        contact_phone: "+91 98450 11223",
        contact_email: "indiranagar@store.in",
        gstin: "29AAAAA0000A1Z5",
      },
    },
    responses: [
      {
        status: 201,
        description: "Store created successfully",
        example: { data: { id: "01a154f0-store-2", name: "Indiranagar Express", code: "IND-02" } },
      },
    ],
  },
  {
    id: "terminals-list",
    group: "Branches & POS Terminals",
    method: "GET",
    path: "/api/v1/stores/{store}/terminals",
    title: "List Branch Terminals & Counters",
    description: "Returns all billing registers, Android/iOS POS tablets, and secondary customer-facing displays paired with this branch.",
    auth: "Session Cookie",
    parameters: [
      { name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" },
    ],
    responses: [
      {
        status: 200,
        description: "List of terminals",
        example: {
          data: {
            terminals: [
              {
                id: "term-01",
                name: "Counter 1 - Express Checkout",
                code: "POS-01",
                is_paired: true,
                device_name: "Samsung Galaxy Tab A8",
                customer_display_url: "https://retail.sirixo.com/customer-display?terminal=POS-01&store=bangalore",
              },
            ],
            stats: { total: 1, paired: 1 },
          },
        },
      },
    ],
  },
  {
    id: "terminals-create",
    group: "Branches & POS Terminals",
    method: "POST",
    path: "/api/v1/stores/{store}/terminals",
    title: "Register POS Counter",
    description: "Creates a billing register counter and generates a pairing code for tablet or customer display sync.",
    auth: "Session Cookie",
    parameters: [
      { name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" },
    ],
    requestBody: {
      schema: [
        { name: "name", type: "string", required: true, description: "Counter label (e.g. Register 1, Counter A)" },
        { name: "code", type: "string", required: true, description: "Unique counter identifier" },
      ],
      example: { name: "Counter 2 - Express", code: "POS-02" },
    },
    responses: [
      {
        status: 201,
        description: "Terminal registered with pairing code",
        example: { data: { id: "term-02", name: "Counter 2 - Express", code: "POS-02", pairing_code: "849201" } },
      },
    ],
  },
  {
    id: "terminals-pair",
    group: "Branches & POS Terminals",
    method: "POST",
    path: "/api/v1/stores/{store}/terminals/{terminal}/pair",
    title: "Pair Hardware Terminal Device",
    description: "Completes device pairing handshake between the cloud backend and a physical Android/iOS tablet or Windows POS.",
    auth: "Session Cookie",
    parameters: [
      { name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" },
      { name: "terminal", type: "string", required: true, description: "Terminal UUID", example: "term-01" },
    ],
    requestBody: {
      schema: [
        { name: "code", type: "string", required: true, description: "6-digit pairing code displayed on screen" },
        { name: "device_name", type: "string", required: true, description: "Hardware device label or model" },
      ],
      example: { code: "849201", device_name: "POS Counter 2 Tablet" },
    },
    responses: [
      {
        status: 200,
        description: "Device paired successfully",
        example: { data: { paired: true, terminal_id: "term-02", paired_at: "2026-10-22T10:00:00Z" } },
      },
    ],
  },
  {
    id: "terminals-public-pair-status",
    group: "Branches & POS Terminals",
    method: "GET",
    path: "/api/v1/public/terminals/check-pair-status",
    title: "Poll Pairing Handshake Status",
    description: "Used by customer display and secondary tablet apps to poll whether the pair code was verified by the cashier.",
    auth: "Public",
    queryParams: [
      { name: "code", type: "string", required: true, description: "6-digit pairing code", example: "849201" },
    ],
    responses: [
      {
        status: 200,
        description: "Pairing status",
        example: { data: { paired: true, terminal: { code: "POS-02", name: "Counter 2 - Express", store_slug: "bangalore" } } },
      },
    ],
  },

  // 10. POS & Sales Operations Additional
  {
    id: "pos-barcode-lookup",
    group: "POS & Sales Operations",
    method: "GET",
    path: "/api/v1/catalog/barcode/{code}",
    title: "High-Speed Barcode Lookup",
    description: "Sub-millisecond barcode lookup for laser and camera scanners on POS counters. Matches EAN-13, UPC, Code128, and internal SKUs.",
    auth: "Session Cookie",
    parameters: [
      { name: "code", type: "string", required: true, description: "Scanned barcode string", example: "8901052003892" },
    ],
    responses: [
      {
        status: 200,
        description: "Product record matching barcode",
        example: {
          data: {
            id: "item-tea-01",
            name: "Tata Tea Gold 500g",
            sku: "TTG-500",
            barcode: "8901052003892",
            selling_price_paise: 32000,
            mrp_paise: 35000,
            hsn: "09024020",
            gst_pct: 5,
            current_stock: 48,
          },
        },
      },
      {
        status: 404,
        description: "Barcode not found in catalog",
        example: { error: "Item not found for barcode." },
      },
    ],
  },
  {
    id: "pos-shifts-open",
    group: "POS & Sales Operations",
    method: "POST",
    path: "/api/v1/stores/{store}/shifts/open",
    title: "Open Cash Register Shift",
    description: "Opens a cashier shift with beginning cash float before transactions can be accepted at the counter.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "opening_cash_paise", type: "integer", required: true, description: "Opening drawer float cash in paise (e.g. ₹2000 = 200000)" },
        { name: "notes", type: "string", required: false, description: "Shift opening memo" },
      ],
      example: { opening_cash_paise: 200000, notes: "Morning Shift A" },
    },
    responses: [
      {
        status: 201,
        description: "Shift opened successfully",
        example: { data: { shift_id: "shift-5501", opened_at: "2026-10-22T08:00:00Z", opening_cash_paise: 200000 } },
      },
    ],
  },
  {
    id: "pos-shifts-current",
    group: "POS & Sales Operations",
    method: "GET",
    path: "/api/v1/stores/{store}/shifts/current",
    title: "Get Active Shift Reading (X-Report)",
    description: "Real-time mid-shift reading showing running cash, UPI totals, card tenders, and bill counts without closing the register.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    responses: [
      {
        status: 200,
        description: "Current shift metrics",
        example: {
          data: {
            shift_id: "shift-5501",
            opened_at: "2026-10-22T08:00:00Z",
            staff_name: "Kiran Cashier",
            opening_cash_paise: 200000,
            cash_sales_paise: 1450000,
            upi_sales_paise: 3200000,
            card_sales_paise: 850000,
            total_sales_paise: 5500000,
            bills_count: 42,
            expected_cash_paise: 1650000,
          },
        },
      },
    ],
  },
  {
    id: "pos-quick-keys",
    group: "POS & Sales Operations",
    method: "GET",
    path: "/api/v1/stores/{store}/quick-keys",
    title: "Get Touch POS Quick-Key Tiles",
    description: "Returns configured quick-access product tiles and category speed-keys for touch POS registers and kiosks.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    responses: [
      {
        status: 200,
        description: "Array of quick key tiles",
        example: {
          data: [
            { id: "qk-1", title: "Cutting Chai", store_item_id: "item-tea-01", color: "#f59e0b", position: 1 },
            { id: "qk-2", title: "Filter Coffee", store_item_id: "item-cof-02", color: "#8b5cf6", position: 2 },
          ],
        },
      },
    ],
  },
  {
    id: "pos-sales-sync",
    group: "POS & Sales Operations",
    method: "POST",
    path: "/api/v1/stores/{store}/sales/sync",
    title: "Batch Sync Offline POS Sales",
    description: "Enables offline-first POS apps to queue invoices locally during network outages and sync them reliably in batch mode with deduplication.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "sales", type: "array", required: true, description: "Array of offline completed sales with client-side UUIDs" },
      ],
      example: {
        sales: [
          {
            offline_id: "offline-uuid-9921",
            invoice_number: "OFFLINE-001",
            created_at: "2026-10-22T09:12:00Z",
            lines: [{ store_item_id: "item-tea-01", qty: 1, unit_price_paise: 32000, discount_paise: 0 }],
            payments: [{ method: "cash", amount_paise: 32000 }],
          },
        ],
      },
    },
    responses: [
      {
        status: 200,
        description: "Batch synchronized",
        example: {
          data: {
            synced_count: 1,
            failed_count: 0,
            results: [{ offline_id: "offline-uuid-9921", server_sale_id: "sale-99890", status: "ok" }],
          },
        },
      },
    ],
  },
  {
    id: "pos-sale-receipt",
    group: "POS & Sales Operations",
    method: "GET",
    path: "/api/v1/sales/{sale}/receipt",
    title: "Get Formatted Receipt Payload",
    description: "Returns pre-computed thermal receipt printable lines, GST breakups (CGST, SGST, IGST), store header, QR code data, and footer.",
    auth: "Session Cookie",
    parameters: [{ name: "sale", type: "string", required: true, description: "Sale UUID or invoice number", example: "sale-99881" }],
    responses: [
      {
        status: 200,
        description: "Full receipt payload",
        example: {
          data: {
            invoice_number: "INV-2026-0042",
            date: "2026-10-20 14:15:00",
            store_name: "MG Road Flagship",
            gstin: "29AAAAA0000A1Z5",
            address: "100 Feet Road, Indiranagar, Bengaluru",
            lines: [
              { name: "Tata Tea Gold 500g", qty: 2, rate: "320.00", total: "640.00", hsn: "09024020", gst_pct: 5 },
            ],
            subtotal: "609.52",
            cgst: "15.24",
            sgst: "15.24",
            grand_total: "640.00",
            payment_mode: "UPI (Ref: UPI/20261020/9981)",
          },
        },
      },
    ],
  },
  {
    id: "pos-sale-returns",
    group: "POS & Sales Operations",
    method: "POST",
    path: "/api/v1/sales/{sale}/returns",
    title: "Process Sale Return & Refund",
    description: "Handles item return, returns stock into store inventory, and issues cash, UPI reversal, or credit note.",
    auth: "Session Cookie",
    parameters: [{ name: "sale", type: "string", required: true, description: "Sale UUID", example: "sale-99881" }],
    requestBody: {
      schema: [
        { name: "lines", type: "array", required: true, description: "Items to return with quantities" },
        { name: "refund_mode", type: "string", required: true, description: "cash | store_credit | upi_reversal" },
        { name: "reason", type: "string", required: false, description: "Customer return reason" },
      ],
      example: {
        lines: [{ store_item_id: "item-tea-01", qty: 1 }],
        refund_mode: "cash",
        reason: "Customer changed mind",
      },
    },
    responses: [
      {
        status: 200,
        description: "Return processed",
        example: { data: { return_id: "ret-1002", refund_amount_paise: 32000, credit_note: "CN-2026-0012" } },
      },
    ],
  },
  {
    id: "pos-holds-list",
    group: "POS & Sales Operations",
    method: "GET",
    path: "/api/v1/stores/{store}/holds",
    title: "List Parked / Held Carts",
    description: "Lists active parked carts at the checkout counter allowing cashiers to retrieve a customer's suspended order.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    responses: [
      {
        status: 200,
        description: "Parked carts",
        example: {
          data: [
            {
              id: "hold-01",
              customer_name: "Walk-in Guest",
              total_paise: 96000,
              items_count: 3,
              held_at: "2026-10-22T10:14:00Z",
            },
          ],
        },
      },
    ],
  },
  {
    id: "pos-holds-park",
    group: "POS & Sales Operations",
    method: "POST",
    path: "/api/v1/stores/{store}/holds",
    title: "Park / Hold Current Cart",
    description: "Parks the current active cart to serve the next customer in queue without losing scanned items.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "lines", type: "array", required: true, description: "Scanned cart line items" },
        { name: "note", type: "string", required: false, description: "Hold identifier note or customer name" },
      ],
      example: {
        lines: [{ store_item_id: "item-tea-01", qty: 3, unit_price_paise: 32000 }],
        note: "Customer fetching ghee bottle",
      },
    },
    responses: [
      {
        status: 201,
        description: "Cart parked successfully",
        example: { data: { hold_id: "hold-02", held_at: "2026-10-22T10:30:00Z" } },
      },
    ],
  },

  // 11. Customers & Khata Ledger
  {
    id: "customers-list",
    group: "Customers & Khata Ledger",
    method: "GET",
    path: "/api/v1/customers",
    title: "Search Customers & Ledger",
    description: "Searches customer profiles by mobile number or name with balance and loyalty points.",
    auth: "Session Cookie",
    queryParams: [
      { name: "q", type: "string", required: false, description: "Search by phone number or name", example: "98450" },
    ],
    responses: [
      {
        status: 200,
        description: "Matching customer records",
        example: {
          data: [
            {
              id: "cust-101",
              name: "Venkatesh Rao",
              phone: "+91 98450 99887",
              khata_balance_paise: -150000,
              loyalty_points: 340,
              total_purchases_count: 28,
            },
          ],
        },
      },
    ],
  },
  {
    id: "customers-create",
    group: "Customers & Khata Ledger",
    method: "POST",
    path: "/api/v1/customers",
    title: "Register New Customer",
    description: "Quickly registers a customer at the checkout counter with phone, name, and credit limit.",
    auth: "Session Cookie",
    requestBody: {
      schema: [
        { name: "name", type: "string", required: true, description: "Customer full name" },
        { name: "phone", type: "string", required: true, description: "Customer mobile number" },
        { name: "email", type: "string", required: false, description: "Customer email address" },
        { name: "credit_limit_paise", type: "integer", required: false, description: "Allowed Khata / Udhar limit" },
      ],
      example: { name: "Ananya Deshmukh", phone: "+91 98888 12345", credit_limit_paise: 500000 },
    },
    responses: [
      {
        status: 201,
        description: "Customer created",
        example: { data: { id: "cust-102", name: "Ananya Deshmukh", phone: "+91 98888 12345" } },
      },
    ],
  },
  {
    id: "customers-khata-entry",
    group: "Customers & Khata Ledger",
    method: "POST",
    path: "/api/v1/customers/{customer}/khata",
    title: "Post Khata (Credit / Debit) Entry",
    description: "Records an Udhar/Credit balance debit or a repayment credit in the customer's ledger.",
    auth: "Session Cookie",
    parameters: [{ name: "customer", type: "string", required: true, description: "Customer UUID", example: "cust-101" }],
    requestBody: {
      schema: [
        { name: "type", type: "string", required: true, description: "'debit' (gave credit) or 'credit' (received repayment)" },
        { name: "amount_paise", type: "integer", required: true, description: "Transaction amount in paise" },
        { name: "payment_mode", type: "string", required: false, description: "cash | upi | bank_transfer" },
        { name: "note", type: "string", required: false, description: "Ledger transaction reference" },
      ],
      example: { type: "credit", amount_paise: 150000, payment_mode: "upi", note: "Settled monthly groceries via GPay" },
    },
    responses: [
      {
        status: 200,
        description: "Khata entry recorded",
        example: { data: { entry_id: "khata-881", new_balance_paise: 0, updated_at: "2026-10-22T11:00:00Z" } },
      },
    ],
  },

  // 12. Delivery & Rider Dispatch
  {
    id: "delivery-orders-list",
    group: "Delivery & Rider Dispatch",
    method: "GET",
    path: "/api/v1/delivery/orders",
    title: "List Delivery Orders",
    description: "Fetches live delivery queue for dispatch coordinators and delivery boy mobile apps.",
    auth: "Session Cookie",
    queryParams: [
      { name: "status", type: "string", required: false, description: "Filter: 'packed', 'dispatched', 'out_for_delivery', 'delivered'" },
    ],
    responses: [
      {
        status: 200,
        description: "Active delivery orders",
        example: {
          data: [
            {
              order_id: "ord-8891",
              status: "packed",
              customer_name: "Pooja Hegde",
              customer_phone: "+91 97410 44321",
              delivery_address: "Flat 402, Green Palms, Indiranagar",
              net_total_paise: 79900,
              assigned_rider: null,
            },
          ],
        },
      },
    ],
  },
  {
    id: "delivery-orders-assign",
    group: "Delivery & Rider Dispatch",
    method: "POST",
    path: "/api/v1/delivery/orders/{order}/assign",
    title: "Assign Rider to Delivery",
    description: "Assigns a delivery partner or in-house delivery boy to an order ready for dispatch.",
    auth: "Session Cookie",
    parameters: [{ name: "order", type: "string", required: true, description: "Order UUID", example: "ord-8891" }],
    requestBody: {
      schema: [
        { name: "staff_id", type: "string", required: true, description: "Delivery rider staff UUID" },
      ],
      example: { staff_id: "staff-rider-05" },
    },
    responses: [
      {
        status: 200,
        description: "Order assigned to rider",
        example: { data: { order_id: "ord-8891", assigned_to: "Ramesh Rider", status: "assigned" } },
      },
    ],
  },
  {
    id: "delivery-orders-status",
    group: "Delivery & Rider Dispatch",
    method: "POST",
    path: "/api/v1/delivery/orders/{order}/status",
    title: "Update Rider Delivery Status",
    description: "Rider mobile app updates delivery progress: out_for_delivery, arrived_at_doorstep, or delivered.",
    auth: "Session Cookie",
    parameters: [{ name: "order", type: "string", required: true, description: "Order UUID", example: "ord-8891" }],
    requestBody: {
      schema: [
        { name: "status", type: "string", required: true, description: "Status: 'out_for_delivery' | 'arrived' | 'delivered' | 'failed'" },
        { name: "latitude", type: "number", required: false, description: "GPS latitude" },
        { name: "longitude", type: "number", required: false, description: "GPS longitude" },
      ],
      example: { status: "delivered", latitude: 12.9716, longitude: 77.5946 },
    },
    responses: [
      {
        status: 200,
        description: "Delivery status updated",
        example: { data: { order_id: "ord-8891", status: "delivered", completed_at: "2026-10-22T11:45:00Z" } },
      },
    ],
  },
  {
    id: "delivery-scan-pickup",
    group: "Delivery & Rider Dispatch",
    method: "POST",
    path: "/api/v1/public/orders/scan-pickup",
    title: "Scan Package QR for Pickup",
    description: "Rider or customer scans the bag QR code at the store dispatch counter to authenticate order pickup.",
    auth: "Public",
    requestBody: {
      schema: [
        { name: "qr_code", type: "string", required: true, description: "Scanned QR code data string from package" },
      ],
      example: { qr_code: "SELFX-PICKUP-ord-8891-9921" },
    },
    responses: [
      {
        status: 200,
        description: "Pickup confirmed",
        example: { data: { verified: true, order_id: "ord-8891", status: "out_for_delivery" } },
      },
    ],
  },

  // 13. Hardware & ESC/POS Printing
  {
    id: "print-jobs-list",
    group: "Hardware & ESC/POS Printing",
    method: "GET",
    path: "/api/v1/print-jobs",
    title: "Poll Pending Print Jobs",
    description: "Used by the SelfX Desktop Print Agent (USB / Network ESC-POS / Bluetooth) to poll for waiting thermal receipts and KOTs.",
    auth: "Session Cookie",
    responses: [
      {
        status: 200,
        description: "List of queued print jobs",
        example: {
          data: [
            {
              id: "pjob-01",
              job_type: "receipt_80mm",
              target_printer: "USB_POS80",
              payload_base64: "G0BHSVMtSU5WLUhFQURFUg...",
              created_at: "2026-10-22T10:14:02Z",
            },
          ],
        },
      },
    ],
  },
  {
    id: "print-jobs-create",
    group: "Hardware & ESC/POS Printing",
    method: "POST",
    path: "/api/v1/print-jobs",
    title: "Enqueue Thermal Print Job",
    description: "Manually triggers or routes a receipt, kitchen order ticket (KOT), or barcode sticker to the hardware printing service.",
    auth: "Session Cookie",
    requestBody: {
      schema: [
        { name: "sale_id", type: "string", required: false, description: "Sale UUID for invoice receipt" },
        { name: "printer_name", type: "string", required: false, description: "Target printer identifier" },
        { name: "copies", type: "integer", required: false, description: "Number of copies (default 1)" },
      ],
      example: { sale_id: "sale-99881", printer_name: "Kitchen_KOT_Printer", copies: 1 },
    },
    responses: [
      {
        status: 201,
        description: "Print job queued",
        example: { data: { job_id: "pjob-02", status: "queued" } },
      },
    ],
  },
  {
    id: "print-jobs-ack",
    group: "Hardware & ESC/POS Printing",
    method: "POST",
    path: "/api/v1/print-jobs/{job}/ack",
    title: "Acknowledge Print Completion",
    description: "Desktop Print Agent reports back that the ESC/POS ticket was successfully printed or reports a paper jam/error.",
    auth: "Session Cookie",
    parameters: [{ name: "job", type: "string", required: true, description: "Print job UUID", example: "pjob-01" }],
    requestBody: {
      schema: [
        { name: "status", type: "string", required: true, description: "'printed' or 'failed'" },
        { name: "error_message", type: "string", required: false, description: "Printer error details if failed" },
      ],
      example: { status: "printed" },
    },
    responses: [
      {
        status: 200,
        description: "Acknowledgement saved",
        example: { data: { acknowledged: true } },
      },
    ],
  },

  // 14. Inventory & Warehousing
  {
    id: "inventory-suppliers",
    group: "Inventory & Warehousing",
    method: "GET",
    path: "/api/v1/suppliers",
    title: "List Suppliers & Vendors",
    description: "Lists registered FMCG distributors, wholesale suppliers, and vendor ledger balances.",
    auth: "Session Cookie",
    responses: [
      {
        status: 200,
        description: "Suppliers list",
        example: {
          data: [
            {
              id: "supp-01",
              name: "Hindustan Unilever Distributor",
              contact_person: "Sunil Jain",
              phone: "+91 98440 22110",
              gstin: "29AABCH1234D1ZP",
              outstanding_balance_paise: 4500000,
            },
          ],
        },
      },
    ],
  },
  {
    id: "inventory-purchases-receive",
    group: "Inventory & Warehousing",
    method: "POST",
    path: "/api/v1/stores/{store}/purchases",
    title: "Record Goods Received Note (GRN)",
    description: "Receives inventory shipment from supplier, logs invoice number, updates stock on hand, and adjusts weighted average cost price.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "supplier_id", type: "string", required: true, description: "Supplier UUID" },
        { name: "invoice_number", type: "string", required: true, description: "Vendor tax invoice number" },
        { name: "invoice_date", type: "string", required: true, description: "Invoice date (YYYY-MM-DD)" },
        { name: "items", type: "array", required: true, description: "Received line items with quantities, cost, and tax" },
      ],
      example: {
        supplier_id: "supp-01",
        invoice_number: "HUL-INV-8890",
        invoice_date: "2026-10-22",
        items: [
          { store_item_id: "item-tea-01", qty: 24, cost_price_paise: 27500, tax_rate: 5 },
        ],
      },
    },
    responses: [
      {
        status: 201,
        description: "Stock received into inventory",
        example: { data: { grn_id: "grn-501", total_cost_paise: 660000, items_received: 1 } },
      },
    ],
  },
  {
    id: "inventory-adjustments",
    group: "Inventory & Warehousing",
    method: "POST",
    path: "/api/v1/stores/{store}/adjustments",
    title: "Stock Adjustment / Correction",
    description: "Adjusts current stock quantities for damage, expired items, shrinkage, or physical count variance.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "store_item_id", type: "string", required: true, description: "Store item UUID" },
        { name: "delta_qty", type: "number", required: true, description: "Positive or negative change in stock" },
        { name: "reason", type: "string", required: true, description: "Reason: 'damaged' | 'expired' | 'shrinkage' | 'count_correction'" },
      ],
      example: { store_item_id: "item-tea-01", delta_qty: -2, reason: "damaged" },
    },
    responses: [
      {
        status: 200,
        description: "Stock adjusted",
        example: { data: { store_item_id: "item-tea-01", new_stock: 46 } },
      },
    ],
  },
  {
    id: "inventory-transfers",
    group: "Inventory & Warehousing",
    method: "POST",
    path: "/api/v1/stores/{store}/transfers",
    title: "Create Inter-Branch Stock Transfer",
    description: "Dispatches stock from one store/warehouse to another with delivery note and transit tracking.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Source store ID or slug", example: "bangalore" }],
    requestBody: {
      schema: [
        { name: "destination_store_id", type: "string", required: true, description: "Target store UUID" },
        { name: "items", type: "array", required: true, description: "Items and quantities to transfer" },
      ],
      example: {
        destination_store_id: "01a154f0-store-2",
        items: [{ store_item_id: "item-tea-01", qty: 10 }],
      },
    },
    responses: [
      {
        status: 201,
        description: "Stock transfer dispatched",
        example: { data: { transfer_id: "tr-901", status: "in_transit", items_count: 1 } },
      },
    ],
  },
  {
    id: "inventory-stock-alerts",
    group: "Inventory & Warehousing",
    method: "GET",
    path: "/api/v1/stores/{store}/stock/alerts",
    title: "Get Low Stock & Reorder Alerts",
    description: "Returns items whose stock on hand is at or below their configured minimum reorder threshold.",
    auth: "Session Cookie",
    parameters: [{ name: "store", type: "string", required: true, description: "Store ID or slug", example: "bangalore" }],
    responses: [
      {
        status: 200,
        description: "List of items needing replenishment",
        example: {
          data: [
            {
              store_item_id: "item-tea-01",
              name: "Tata Tea Gold 500g",
              current_stock: 4,
              reorder_threshold: 12,
              suggested_reorder_qty: 24,
            },
          ],
        },
      },
    ],
  },

  // 15. Online Storefront Additional
  {
    id: "storefront-public-store",
    group: "Online Storefront",
    method: "GET",
    path: "/api/v1/public/stores/{slug}",
    title: "Get Public Store Details & Timings",
    description: "Returns the public-facing storefront settings, logo, brand banner, operational hours, minimum order amount, and delivery zones.",
    auth: "Public",
    parameters: [{ name: "slug", type: "string", required: true, description: "Store public slug", example: "s-mart" }],
    responses: [
      {
        status: 200,
        description: "Store profile details",
        example: {
          data: {
            id: "01a154f0-store",
            name: "Coffee Cafe & Groceries",
            slug: "s-mart",
            phone: "+91 99882 23919",
            address: "Koramangala 5th Block, Bengaluru",
            is_open: true,
            min_order_paise: 15000,
            delivery_enabled: true,
            dine_in_enabled: true,
          },
        },
      },
    ],
  },
  {
    id: "storefront-public-gateways",
    group: "Online Storefront",
    method: "GET",
    path: "/api/v1/public/stores/{slug}/gateways",
    title: "Get Active Online Payment Gateways",
    description: "Returns configured customer checkout payment methods (Razorpay key ID, Stripe publishable key, UPI QR, Cash on Delivery).",
    auth: "Public",
    parameters: [{ name: "slug", type: "string", required: true, description: "Store public slug", example: "s-mart" }],
    responses: [
      {
        status: 200,
        description: "Available gateways",
        example: {
          data: {
            gateways: [
              { provider: "razorpay", name: "UPI / Cards / NetBanking", key_id: "rzp_live_••••••••" },
              { provider: "cod", name: "Cash on Delivery", key_id: null },
            ],
          },
        },
      },
    ],
  },
  {
    id: "storefront-track",
    group: "Online Storefront",
    method: "POST",
    path: "/api/v1/public/orders/track",
    title: "Track Online Order Status",
    description: "Allows end customers to track real-time order status, rider dispatch progress, and estimated delivery time using order ID and phone.",
    auth: "Public",
    requestBody: {
      schema: [
        { name: "order_id", type: "string", required: true, description: "Order UUID or order number" },
        { name: "phone", type: "string", required: true, description: "Customer mobile number" },
      ],
      example: { order_id: "ord-8891", phone: "+91 98450 11223" },
    },
    responses: [
      {
        status: 200,
        description: "Live order tracking details",
        example: {
          data: {
            order_id: "ord-8891",
            status: "out_for_delivery",
            placed_at: "2026-10-22T10:15:00Z",
            rider: { name: "Ramesh R", phone: "+91 99000 11222" },
            estimated_minutes: 15,
          },
        },
      },
    ],
  },
  {
    id: "storefront-ai-chat",
    group: "Online Storefront",
    method: "POST",
    path: "/api/v1/public/stores/{slug}/ai",
    title: "AI Conversational Shopping Assistant",
    description: "Storefront AI copilot that assists shoppers in finding recipes, dietary-compliant ingredients, and auto-filling carts.",
    auth: "Public",
    parameters: [{ name: "slug", type: "string", required: true, description: "Store public slug", example: "s-mart" }],
    requestBody: {
      schema: [
        { name: "message", type: "string", required: true, description: "Shopper query in natural language" },
      ],
      example: { message: "I want to make Masala Chai. Add milk, tea powder and ginger to my cart." },
    },
    responses: [
      {
        status: 200,
        description: "AI response with matched products",
        example: {
          data: {
            reply: "I found 3 items for Masala Chai! Here is Tata Tea Gold 500g, Nandini GoodLife Milk 500ml, and Fresh Ginger 250g.",
            suggested_items: [
              { store_item_id: "item-tea-01", name: "Tata Tea Gold 500g", price_paise: 32000 },
            ],
          },
        },
      },
    ],
  },

  // 16. Platform & Operations
  {
    id: "platform-health",
    group: "Platform & System Operations",
    method: "GET",
    path: "/api/v1/platform/health",
    title: "System Health & Database Readiness",
    description: "Deep health check verifying SQLite / MySQL database connectivity, Redis cache latency, disk storage, and queue workers.",
    auth: "Platform Admin",
    responses: [
      {
        status: 200,
        description: "All services operational",
        example: {
          status: "healthy",
          timestamp: "2026-10-22T16:45:00Z",
          database: "connected",
          storage: "writable",
          version: "2.4.0",
        },
      },
    ],
  },
  {
    id: "platform-queue-status",
    group: "Platform & System Operations",
    method: "GET",
    path: "/api/v1/platform/queue-status",
    title: "Background Queue & Worker Architecture",
    description: "Real-time queue metrics: jobs waiting, jobs running, failed jobs, and worker heartbeat for receipt generation and email webhooks.",
    auth: "Platform Admin",
    responses: [
      {
        status: 200,
        description: "Queue status",
        example: {
          data: {
            status: "active",
            pending_jobs: 0,
            failed_jobs: 0,
            processed_last_hour: 142,
            workers_alive: 2,
          },
        },
      },
    ],
  },
];

function SyntaxHighlightedJson({ json }: { json: unknown }) {
  const formatted = typeof json === "string" ? json : JSON.stringify(json, null, 2);
  const lines = formatted.split("\n");

  return (
    <div className="flex font-mono text-xs leading-relaxed select-text">
      <div className="select-none pr-3 text-right text-slate-500 font-mono text-xs border-r border-slate-700/60 mr-3.5">
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div className="flex-1 overflow-x-auto">
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre">
            <HighlightedJsonLine line={line} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightedJsonLine({ line }: { line: string }) {
  const matchKey = line.match(/^(\s*)("([^"]+)")(\s*:\s*)(.*)$/);
  if (matchKey) {
    const [, indent, , keyName, colon, valuePart] = matchKey;
    return (
      <>
        <span>{indent}</span>
        <span className="text-[#38bdf8]">"{keyName}"</span>
        <span className="text-slate-400">{colon}</span>
        <HighlightedJsonValue val={valuePart} />
      </>
    );
  }
  return <HighlightedJsonValue val={line} />;
}

function HighlightedJsonValue({ val }: { val: string }) {
  const trimmed = val.trim();
  if (trimmed.startsWith('"') && (trimmed.endsWith('"') || trimmed.endsWith('",'))) {
    return <span className="text-[#34d399]">{val}</span>;
  }
  if (trimmed === "true" || trimmed === "false" || trimmed === "true," || trimmed === "false,") {
    return <span className="text-[#c084fc]">{val}</span>;
  }
  if (!isNaN(Number(trimmed.replace(/,$/, "")))) {
    return <span className="text-[#fcd34d]">{val}</span>;
  }
  return <span className="text-slate-200">{val}</span>;
}

function getGroupIcon(group: string) {
  switch (group) {
    case "Authentication":
      return <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Tenants & Organizations":
      return <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Branches & POS Terminals":
      return <Store className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Catalog & Inventory":
      return <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "POS & Sales Operations":
      return <Receipt className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Customers & Khata Ledger":
      return <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Delivery & Rider Dispatch":
      return <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Hardware & ESC/POS Printing":
      return <Printer className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Inventory & Warehousing":
      return <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Online Storefront":
      return <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Reports & GST Analytics":
      return <BarChart3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Payment Gateways & Webhooks":
      return <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    case "Platform & System Operations":
      return <Terminal className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
    default:
      return <Terminal className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
  }
}

export default function ApiDocumentationPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint>(API_ENDPOINTS[0]!);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLang, setActiveLang] = useState<"curl" | "javascript" | "python">("curl");
  const [apiHost, setApiHost] = useState(
    typeof window !== "undefined" && window.location.origin ? window.location.origin : "https://retail.sirixo.com"
  );
  const [apiKey, setApiKey] = useState("");
  const [liveReqBody, setLiveReqBody] = useState<string>(
    JSON.stringify(API_ENDPOINTS[0]?.requestBody?.example ?? {}, null, 2),
  );
  const [liveParamValues, setLiveParamValues] = useState<Record<string, string>>({});
  const [liveResponse, setLiveResponse] = useState<{
    status: number;
    statusText: string;
    timeMs: number;
    data: unknown;
  } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copyToClipboard(text: string, fieldId: string) {
    void navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField((curr) => (curr === fieldId ? null : curr));
    }, 2000);
  }

  async function checkServerStatus() {
    try {
      const res = await fetch(`${apiHost}/api/v1/platform/health`);
      if (res.ok) {
        alert(`API Server is Healthy! (Status: ${res.status})`);
      } else {
        alert(`API Server responded with HTTP status ${res.status}`);
      }
    } catch {
      alert(`Could not connect to ${apiHost}. Please make sure backend is running.`);
    }
  }

  // Filtered endpoints
  const filteredEndpoints = useMemo(() => {
    if (!searchQuery.trim()) return API_ENDPOINTS;
    const q = searchQuery.toLowerCase();
    return API_ENDPOINTS.filter(
      (ep) =>
        ep.title.toLowerCase().includes(q) ||
        ep.path.toLowerCase().includes(q) ||
        ep.group.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  // Group endpoints by category
  const groups = useMemo(() => {
    const map = new Map<string, ApiEndpoint[]>();
    for (const ep of filteredEndpoints) {
      const arr = map.get(ep.group) ?? [];
      arr.push(ep);
      map.set(ep.group, arr);
    }
    return Array.from(map.entries());
  }, [filteredEndpoints]);

  function selectEndpoint(ep: ApiEndpoint) {
    setSelectedEndpoint(ep);
    setLiveReqBody(JSON.stringify(ep.requestBody?.example ?? {}, null, 2));
    const initParams: Record<string, string> = {};
    if (ep.parameters) {
      for (const p of ep.parameters) {
        initParams[p.name] = p.example ?? "";
      }
    }
    setLiveParamValues(initParams);
    setLiveResponse(null);
  }

  // Construct target URL
  const resolvedPath = useMemo(() => {
    let p = selectedEndpoint.path;
    if (selectedEndpoint.parameters) {
      for (const param of selectedEndpoint.parameters) {
        const val = liveParamValues[param.name] || param.example || `{${param.name}}`;
        p = p.replace(`{${param.name}}`, encodeURIComponent(val));
      }
    }
    return p;
  }, [selectedEndpoint, liveParamValues]);

  // Code generator
  const generatedCode = useMemo(() => {
    const fullUrl = `${apiHost}${resolvedPath}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(selectedEndpoint.method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };

    if (activeLang === "curl") {
      let cmd = `curl -X ${selectedEndpoint.method} "${fullUrl}" \\\n`;
      for (const [k, v] of Object.entries(headers)) {
        cmd += `  -H "${k}: ${v}" \\\n`;
      }
      if (selectedEndpoint.method !== "GET" && selectedEndpoint.requestBody) {
        cmd += `  -d '${liveReqBody.replace(/\n/g, "")}'`;
      } else {
        cmd = cmd.trimEnd().replace(/\\$/, "");
      }
      return cmd;
    }

    if (activeLang === "javascript") {
      const hasBody = selectedEndpoint.method !== "GET" && selectedEndpoint.requestBody;
      return `const response = await fetch("${fullUrl}", {
  method: "${selectedEndpoint.method}",
  headers: ${JSON.stringify(headers, null, 4)},${hasBody ? `\n  body: JSON.stringify(${liveReqBody.split("\n").join("\n  ")})` : ""}
});

const data = await response.json();
console.log(data);`;
    }

    if (activeLang === "python") {
      const hasBody = selectedEndpoint.method !== "GET" && selectedEndpoint.requestBody;
      return `import requests

url = "${fullUrl}"
headers = ${JSON.stringify(headers, null, 4)}
${hasBody ? `payload = ${liveReqBody}\nresponse = requests.${selectedEndpoint.method.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers)`}

print(response.status_code)
print(response.json())`;
    }

    return "";
  }, [activeLang, apiHost, resolvedPath, selectedEndpoint, liveReqBody, apiKey]);

  // Execute live API call
  async function runLiveRequest() {
    setExecuting(true);
    const start = performance.now();
    try {
      const fullUrl = `${apiHost}${resolvedPath}`;
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(selectedEndpoint.method !== "GET" ? { "Content-Type": "application/json" } : {}),
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      };

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };

      if (selectedEndpoint.method !== "GET" && selectedEndpoint.requestBody) {
        try {
          JSON.parse(liveReqBody);
          options.body = liveReqBody;
        } catch {
          setLiveResponse({
            status: 400,
            statusText: "Invalid JSON Body",
            timeMs: 0,
            data: { error: "SyntaxError: Malformed JSON in Request Body editor." },
          });
          setExecuting(false);
          return;
        }
      }

      const res = await fetch(fullUrl, options);
      const end = performance.now();
      let resJson: unknown = null;
      try {
        resJson = await res.json();
      } catch {
        resJson = { status: res.status, body: "Non-JSON response" };
      }

      setLiveResponse({
        status: res.status,
        statusText: res.statusText || (res.ok ? "OK" : "Error"),
        timeMs: Math.round(end - start),
        data: resJson,
      });
    } catch (err: unknown) {
      const end = performance.now();
      setLiveResponse({
        status: 500,
        statusText: "Network / CORS Error",
        timeMs: Math.round(end - start),
        data: { error: String(err), message: "Failed to connect to API server. Ensure backend is running." },
      });
    } finally {
      setExecuting(false);
    }
  }

  function methodSidebarBadge(method: HttpMethod) {
    switch (method) {
      case "GET":
        return "bg-[#3b82f6] text-white";
      case "POST":
        return "bg-[#10b981] text-white";
      case "PUT":
        return "bg-[#f59e0b] text-white";
      case "PATCH":
        return "bg-[#8b5cf6] text-white";
      case "DELETE":
        return "bg-[#ef4444] text-white";
    }
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#f8fafc] text-slate-800">
      {/* Top Header Bar matching Image 1 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-4 sm:px-6 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-600" />
            Back
          </Link>

          <div className="flex items-center gap-2.5 pl-2">
           
            <span className="text-sm font-semibold tracking-tight text-slate-900">
             Developer API
            </span>
            <span className="rounded-full border border-slate-200/80 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Global Controls & Base URL Config matching Image 1 */}
        <div className="flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-2xs md:flex">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500">Base URL</span>
            <input
              type="text"
              value={apiHost}
              onChange={(e) => setApiHost(e.target.value)}
              className="w-44 bg-transparent font-mono text-xs text-slate-800 outline-none"
              placeholder="https://retail.sirixo.com"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(apiHost, "base-url")}
              className="text-slate-400 transition hover:text-slate-700"
              title="Copy base URL"
            >
              {copiedField === "base-url" ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 shadow-2xs lg:flex">
            <Key className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] font-medium text-slate-500">Bearer Token</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-28 bg-transparent font-mono text-xs text-slate-800 outline-none placeholder:text-slate-400"
              placeholder="••••••••••••••••"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(apiKey || "eyJhbGciOi...", "bearer-token")}
              className="text-slate-400 transition hover:text-slate-700"
              title="Copy bearer token"
            >
              {copiedField === "bearer-token" ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => void checkServerStatus()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Status API</span>
          </button>
        </div>
      </header>

      {/* 3-Column Stoplight Layout matching Image 1 */}
      <div className="flex flex-1 overflow-hidden">
        {/* COLUMN 1: Left Navigation Sidebar */}
        <aside className="w-72 shrink-0 border-r border-slate-200/90 bg-white flex flex-col overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search endpoints..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Endpoints navigation list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {groups.map(([groupName, endpoints]) => (
              <div key={groupName} className="space-y-1">
                <div className="flex items-center gap-1.5 px-2 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {getGroupIcon(groupName)}
                  <span className="truncate">{groupName}</span>
                </div>
                <div className="space-y-0.5">
                  {endpoints.map((ep) => {
                    const isSelected = selectedEndpoint.id === ep.id;
                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => selectEndpoint(ep)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                          isSelected
                            ? "bg-[#ede9fe] text-[#4f46e5] font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        }`}
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold font-mono leading-none ${methodSidebarBadge(
                            ep.method,
                          )}`}
                        >
                          {ep.method}
                        </span>
                        <span className="truncate">{ep.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* COLUMN 2: Center Endpoint Specification & Schema matching Image 1 */}
        <main className="flex-1 overflow-y-auto bg-white px-6 py-6 lg:px-8 border-r border-slate-200/90">
          <div className="max-w-2xl space-y-6">
            {/* Breadcrumb matching Image 1 */}
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span>{selectedEndpoint.group}</span>
                <span>/</span>
                <span className="text-[#4f46e5]">{selectedEndpoint.title}</span>
              </div>

              {/* Method, Monospace Path Box & Auth Scope matching Image 1 */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="rounded-md bg-[#d1fae5] px-2.5 py-1 text-xs font-semibold text-[#065f46]">
                  {selectedEndpoint.method}
                </span>
                <div className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs font-medium text-slate-800">
                  <span>{selectedEndpoint.path}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedEndpoint.path, "path")}
                    className="text-slate-400 transition hover:text-slate-700"
                    title="Copy path"
                  >
                    {copiedField === "path" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  Auth-{selectedEndpoint.auth}
                </span>
              </div>

              {/* Bold Title & Subtitle matching Image 1 */}
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                {selectedEndpoint.title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {selectedEndpoint.description}
              </p>
            </div>

            {/* Path Parameters Section */}
            {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
              <div className="space-y-3 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Path Parameters
                </h3>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs divide-y divide-slate-100">
                  {selectedEndpoint.parameters.map((p, idx) => (
                    <div key={p.name} className={`${idx !== 0 ? "pt-3" : ""} space-y-1`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">{p.name}</span>
                        {p.required ? (
                          <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                            required
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">optional</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-blue-600 underline cursor-pointer">{p.type}</span>
                        <span className="text-xs text-slate-500">{p.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Query Parameters Section */}
            {selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0 && (
              <div className="space-y-3 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Query Parameters
                </h3>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs divide-y divide-slate-100">
                  {selectedEndpoint.queryParams.map((p, idx) => (
                    <div key={p.name} className={`${idx !== 0 ? "pt-3" : ""} space-y-1`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">{p.name}</span>
                        {p.required ? (
                          <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                            required
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">optional</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-blue-600 underline cursor-pointer">{p.type}</span>
                        <span className="text-xs text-slate-500">{p.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Request Body Schema Section matching Image 1 */}
            {selectedEndpoint.requestBody && (
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    REQUEST BODY (APPLICATION/JSON)
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(selectedEndpoint.requestBody?.schema ?? [], null, 2),
                        "json-schema",
                      )
                    }
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    {copiedField === "json-schema" ? "Copied Schema!" : "JSON Schema"}
                  </button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs divide-y divide-slate-100">
                  {selectedEndpoint.requestBody.schema.map((prop, idx) => (
                    <div key={prop.name} className={`${idx !== 0 ? "pt-3.5" : ""} space-y-1`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">{prop.name}</span>
                        {prop.required ? (
                          <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
                            required
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">optional</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-blue-600 underline cursor-pointer">
                          {prop.type}
                        </span>
                        <span className="text-xs text-slate-500">{prop.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responses Section matching Image 1 */}
            <div className="space-y-4 pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">RESPONSES</h3>
              <div className="space-y-4">
                {selectedEndpoint.responses.map((res) => (
                  <div key={res.status} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2.5 py-0.5 font-mono text-xs font-semibold ${
                          res.status < 300
                            ? "bg-[#d1fae5] text-[#065f46]"
                            : res.status < 500
                            ? "bg-[#fef3c7] text-[#92400e]"
                            : "bg-[#ffe4e6] text-[#9f1239]"
                        }`}
                      >
                        {res.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{res.description}</span>
                    </div>

                    {/* Dark Navy Code Box matching Image 1 */}
                    <div className="relative rounded-xl bg-[#1e293b] p-4 text-xs font-mono text-slate-200 shadow-md">
                      <SyntaxHighlightedJson json={res.example} />
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(JSON.stringify(res.example, null, 2), `resp-${res.status}`)
                        }
                        className="absolute right-3.5 top-3.5 text-slate-400 transition hover:text-white"
                        title="Copy response"
                      >
                        {copiedField === `resp-${res.status}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* COLUMN 3: Right Code Examples & Live API Console matching Image 1 */}
        <aside className="w-[450px] shrink-0 bg-[#f8fafc] p-6 space-y-6 overflow-y-auto">
          {/* Card 1: </> Code Example */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <Code2 className="h-4 w-4 text-indigo-600" />
                <span>Code Example</span>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                {(["curl", "javascript", "python"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setActiveLang(lang)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      activeLang === lang
                        ? "bg-[#4f46e5] text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {lang === "curl" ? "cURL" : lang === "javascript" ? "JS Fetch" : "Python"}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative rounded-lg border border-slate-200 bg-[#f8fafc] p-3.5">
              <pre className="max-h-52 overflow-x-auto font-mono text-xs text-slate-800 leading-relaxed">
                {generatedCode}
              </pre>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedCode, "code-example")}
                className="absolute right-2.5 top-2.5 rounded-md border border-slate-200 bg-white p-1 text-slate-500 shadow-2xs hover:text-slate-800 hover:bg-slate-50 transition"
                title="Copy code"
              >
                {copiedField === "code-example" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Card 2: ▷ Try It Out (Live API Console) matching Image 1 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Play className="h-3.5 w-3.5 text-emerald-600 fill-current" />
                <span>Try It Out (Live API Console)</span>
              </div>
              <button
                type="button"
                onClick={() => void runLiveRequest()}
                disabled={executing}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#4f46e5] px-4 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#4338ca] disabled:opacity-50"
              >
                {executing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{executing ? "Sending..." : "Execute"}</span>
              </button>
            </div>

            {/* Path Params Inputs */}
            {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Path Variables
                </span>
                <div className="space-y-1.5">
                  {selectedEndpoint.parameters.map((p) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className="w-24 font-mono text-xs font-semibold text-slate-700 truncate">
                        {p.name}:
                      </span>
                      <input
                        type="text"
                        value={liveParamValues[p.name] ?? p.example ?? ""}
                        onChange={(e) =>
                          setLiveParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))
                        }
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500"
                        placeholder={p.example || p.name}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Editable Request Body with line numbers matching Image 1 */}
            {selectedEndpoint.requestBody && selectedEndpoint.method !== "GET" && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Request Body (JSON)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setLiveReqBody(
                        JSON.stringify(selectedEndpoint.requestBody?.example ?? {}, null, 2),
                      )
                    }
                    className="text-xs font-medium text-[#4f46e5] hover:underline"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden font-mono text-xs">
                  <div className="bg-slate-100/70 py-2.5 px-2 text-right select-none text-slate-400 border-r border-slate-200 leading-relaxed">
                    {liveReqBody.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    rows={Math.max(6, Math.min(14, liveReqBody.split("\n").length))}
                    value={liveReqBody}
                    onChange={(e) => setLiveReqBody(e.target.value)}
                    className="flex-1 bg-transparent p-2.5 font-mono text-xs text-slate-800 outline-none leading-relaxed resize-none"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 3: SERVER RESPONSE matching Image 1 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Server Response
            </div>
            {liveResponse ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-[#1e293b] p-3 text-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${
                      liveResponse.status < 300
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {liveResponse.status} {liveResponse.statusText}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">{liveResponse.timeMs}ms</span>
                </div>
                <div className="relative pt-1">
                  <SyntaxHighlightedJson json={liveResponse.data} />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(JSON.stringify(liveResponse.data, null, 2), "server-resp")
                    }
                    className="absolute right-1 top-1 text-slate-400 hover:text-white"
                    title="Copy response"
                  >
                    {copiedField === "server-resp" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-12 text-center bg-slate-50/50">
                <div className="font-mono text-xl text-slate-400 mb-1">&gt;_</div>
                <p className="text-xs text-slate-500">
                  Click <strong className="font-semibold text-slate-700">Execute</strong> to send a live request to the server.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
