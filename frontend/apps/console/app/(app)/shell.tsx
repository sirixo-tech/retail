"use client";

import { AppShell, type NavGroup } from "@selfx/ui";
import {
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Globe,
  LayoutDashboard,
  MapPin,
  Monitor,
  Printer,
  Plug,
  QrCode,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tablet,
  Tag,
  Truck,
  Users,
  Wallet,
  Download,
  Megaphone,
  Cpu,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { TenantAiAssistantWidget } from "./ai-assistant-widget";

const groups: NavGroup[] = [
  { label: "Main", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Sell",
    items: [
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/delivery", label: "Delivery Orders", icon: Truck },
      { href: "/customers", label: "Customers", icon: Users },
      {
        href: "/products",
        label: "Products",
        icon: Boxes,
        children: [
          { href: "/products/create", label: "Create product" },
          { href: "/products", label: "All products" },
          { href: "/products/catalog", label: "Shared catalog" },
          { href: "/products/import", label: "Import products" },
          { href: "/products/prices", label: "Import prices" },
          { href: "/products/opening", label: "Opening stock" },
          { href: "/products/labels", label: "Print labels" },
          { href: "/products/categories", label: "Category" },
          { href: "/products/subcategories", label: "Sub category" },
          { href: "/products/brands", label: "Brand" },
          { href: "/products/units", label: "Unit" },
        ],
      },
      {
        href: "/online-store",
        label: "Online Store",
        icon: Globe,
        children: [
          { href: "/store", label: "Visit Online Store" },
          { href: "/online-store/settings", label: "Settings" },
          { href: "/online-store/loyalty", label: "Loyalty Points" },
          { href: "/online-store/orders", label: "Online Orders" },
          { href: "/online-store/coupons", label: "Coupons & Discounts" },
          { href: "/online-store/collections", label: "Collections" },
          { href: "/online-store/banners", label: "Banners" },
          { href: "/online-store/subscribers", label: "Subscribers" },
          { href: "/online-store/messages", label: "Messages" },
          { href: "/online-store/invite-codes", label: "Invite Codes" },
          { href: "/online-store/pending-customers", label: "Pending Customers" },
          { href: "/online-store/guest-customers", label: "Customers without Login" },
          { href: "/online-store/registered-customers", label: "Customers with Login" },
          { href: "/online-store/shipping", label: "Shipping Methods" },
          { href: "/online-store/taxes", label: "Tax Rates" },
        ],
      },
      {
        href: "/marketing",
        label: "Marketing",
        icon: Megaphone,
        children: [
          { href: "/marketing", label: "Dashboard" },
          { href: "/marketing/campaigns", label: "Campaigns" },
          { href: "/marketing/segments", label: "Customer Segments" },
          { href: "/marketing/sms-templates", label: "SMS Templates" },
          { href: "/marketing/whatsapp-templates", label: "WhatsApp Templates" },
          { href: "/marketing/email-templates", label: "Email Templates" },
          { href: "/marketing/reports", label: "Reports" },
          { href: "/marketing/settings", label: "Marketing Settings" },
        ],
      },
    ],
  },
  {
    label: "Stock",
    items: [
      { href: "/inventory", label: "Inventory", icon: Store },
      { href: "/purchases", label: "Purchases", icon: ShoppingBag },
    ],
  },
  {
    label: "Devices & channels",
    items: [
      { href: "/hardware-store", label: "SelfX Hardware Store", icon: Cpu },
      { href: "/pos-terminals", label: "POS terminals", icon: Monitor },
      { href: "/kiosks", label: "Self-Ordering Kiosks", icon: Tablet },
      { href: "/apps", label: "Apps & Downloads", icon: Download },
      { href: "/qr-builder", label: "QR Builder", icon: QrCode },
      { href: "/printer-setup", label: "Printer Setup", icon: Printer },
      { href: "/barcode-generator", label: "Barcode Generator", icon: QrCode },
      {
        href: "/integrations",
        label: "Integrations",
        icon: Plug,
        children: [
          { href: "/integrations", label: "All Integrations" },
          { href: "/integrations/woocommerce", label: "WooCommerce" },
          { href: "/integrations/shopify", label: "Shopify" },
          { href: "/integrations/telegram", label: "Telegram" },
          { href: "/integrations/whatsapp", label: "WhatsApp Business" },
          { href: "/integrations/webhooks", label: "Webhooks" },
          { href: "/integrations/google_sheets", label: "Google Sheets" },
        ],
      },
    ],
  },
  {
    label: "Team & locations",
    items: [
      { href: "/branches", label: "Branches", icon: MapPin },
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/attendance", label: "Attendance", icon: Clock },
    ],
  },
  {
    label: "Setup",
    items: [
      { href: "/printer-setup", label: "Printer Setup", icon: Printer },
      { href: "/barcode-generator", label: "Barcode Generator", icon: QrCode },
      {
        href: "/reports",
        label: "Reports",
        icon: BarChart3,
        children: [
          { href: "/reports?tab=users", label: "Users Report" },
          { href: "/reports?tab=sales", label: "Sales Summary" },
          { href: "/reports?tab=products", label: "Product-Wise Sales" },
          { href: "/reports?tab=profit", label: "Profit & Margin" },
          { href: "/reports?tab=gst", label: "GST & Tax Report" },
          { href: "/reports?tab=hsn", label: "HSN-Wise GST (GSTR-1)" },
          { href: "/reports?tab=daybook", label: "Day Book & Cash Book" },
          { href: "/reports?tab=staff-sales", label: "Staff & Counter Sales" },
          { href: "/reports?tab=discounts", label: "Discounts & Voids" },
          { href: "/reports?tab=category-sales", label: "Category & Brand Sales" },
          { href: "/reports?tab=item-ledger", label: "Item Ledger (Stock Journal)" },
          { href: "/reports?tab=purchase-register", label: "Purchase Register & ITC" },
          { href: "/reports?tab=payments", label: "Payment Modes" },
          { href: "/reports?tab=shifts", label: "Shift & Z-Reports" },
          { href: "/reports?tab=stock", label: "Stock Valuation" },
          { href: "/reports?tab=alerts", label: "Low Stock & Expiry" },
          { href: "/reports?tab=customers", label: "Customer & Khata" },
          { href: "/reports?tab=purchases", label: "Purchase & Suppliers" },
          { href: "/reports?tab=audit", label: "Audit Trail" },
        ],
      },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/coupons", label: "Coupons", icon: Tag },
      { href: "/billing", label: "Billing & Plans", icon: Wallet },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        children: [
          { href: "/settings/profile", label: "Store Profile" },
          { href: "/settings/pos", label: "POS & Terminal" },
          { href: "/settings/taxes", label: "GST & Tax Slabs" },
          { href: "/settings/receipt", label: "Receipt & Invoice" },
          { href: "/settings/loyalty", label: "Loyalty Points" },
          { href: "/settings/hours", label: "Business Hours" },
          { href: "/settings/gateways", label: "Payment Gateways" },
          { href: "/settings/theme", label: "Theme & Appearance" },
          { href: "/settings/api", label: "API & Webhooks" },
          { href: "/settings/security", label: "Security & Password" },
        ],
      },
    ],
  },
];

interface TodaySummaryData {
  sales_paise: number;
  purchases_paise: number;
  returns_paise: number;
  sales_due_paise: number;
  purchase_due_paise: number;
  bills: number;
  profit_paise: number;
  stock_cost_paise: number;
  stock_retail_paise: number;
  payments?: { method: string; amount_paise: number; bills: number }[];
  alerts?: { sku: string; name: string }[];
  today_summary?: {
    date_label: string;
    net_sales_paise: number;
    gross_sales_paise: number;
    discount_paise: number;
    tax_paise: number;
    returns_paise: number;
    bills_count: number;
    items_sold_qty: number;
    in_paise: number;
    out_paise: number;
    purchases_gross_paise: number;
    purchases_bills_count: number;
    purchases_sent_paise: number;
    cogs_paise: number;
    gross_profit_paise: number;
    net_profit_paise: number;
    stock_units_count: number;
    out_of_stock_count: number;
    low_stock_count: number;
    new_customers_today: number;
    on_duty_count: number;
  };
}

function formatInrPaise(paise: number): string {
  const rupees = (paise || 0) / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/": ["*"],
  "/orders": ["orders.manage", "orders.view"],
  "/delivery": ["orders.delivery", "orders.manage"],
  "/customers": ["customers.view", "customers.khata", "customers.edit"],
  "/products": ["catalog.view", "catalog.manage", "products.view", "products.create"],
  "/online-store": ["storefront.manage", "settings.manage"],
  "/marketing": ["settings.manage", "storefront.manage", "*"],
  "/hardware-store": ["settings.manage", "*"],
  "/inventory": ["inventory.view", "inventory.adjust", "inventory.manage"],
  "/purchases": ["purchases.manage", "purchases.view"],
  "/pos-terminals": ["settings.manage", "pos.shift", "pos.access"],
  "/kiosks": ["settings.manage", "kiosk.manage"],
  "/apps": ["*"],
  "/qr-builder": ["catalog.view", "settings.manage"],
  "/printer-setup": ["settings.manage", "pos.access"],
  "/barcode-generator": ["catalog.view", "catalog.manage"],
  "/integrations": ["settings.manage"],
  "/branches": ["settings.manage"],
  "/staff": ["staff.manage"],
  "/attendance": ["*"],
  "/reports": ["reports.view", "reports.sales"],
  "/notifications": ["*"],
  "/coupons": ["catalog.manage", "settings.manage"],
  "/online-store/coupons": ["catalog.manage", "settings.manage", "storefront.manage"],
  "/billing": ["settings.manage"],
  "/settings": ["settings.manage"],
};

function canAccessRoute(href: string, perms: string[], isOwner: boolean): boolean {
  if (isOwner || perms.includes("*")) return true;
  const cleanPath = href.split("?")[0];
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(
    (k) => k !== "/" && (cleanPath === k || cleanPath.startsWith(k + "/")),
  );
  if (!matchedRoute) {
    if (cleanPath === "/") return true;
    return true;
  }
  const required = ROUTE_PERMISSIONS[matchedRoute];
  if (!required || required.includes("*")) return true;
  return required.some((req) => perms.includes(req));
}

export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [brand, setBrand] = useState("Store");
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [user, setUser] = useState<{
    name: string;
    role: string;
    permissions: string[];
    isOwner: boolean;
  }>({
    name: "Staff",
    role: "Staff",
    permissions: [],
    isOwner: true,
  });
  const [viewing, setViewing] = useState<string | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<TodaySummaryData | null>(null);

  // Active Branch Switcher State (Matching Image 2)
  const [allStores, setAllStores] = useState<{ id: string; name: string; code: string; is_default?: boolean }[]>([]);
  const [currentStore, setCurrentStore] = useState<{ id: string; name: string; code: string } | null>(null);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState<{ active: boolean; message?: string; until?: string } | null>(null);
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [isOrganization, setIsOrganization] = useState(false);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/v1/auth/staff/me", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!active) return;

        if (response.status === 503) {
          const err = (await response.json().catch(() => ({}))) as {
            error?: { message?: string; maintenance_until?: string };
          };
          setMaintenanceInfo({
            active: true,
            message: err.error?.message,
            until: err.error?.maintenance_until,
          });
          setAuthState("authenticated");
          return;
        }

        if (response.status === 401 || response.status === 403 || !response.ok) {
          if (typeof window !== "undefined" && "caches" in window) {
            caches.keys().then((keys) => {
              keys.forEach((k) => {
                if (k !== "selfx-pos-v3") caches.delete(k);
              });
            });
          }
          setAuthState("unauthenticated");
          window.location.replace("/login");
          return;
        }

        const body = (await response.json()) as {
          data?: {
            name?: string;
            role?: string | null;
            permissions?: string[];
            is_super_admin?: boolean;
            tenant?: { slug?: string; name?: string; kind?: string };
            store?: { id: string; name: string; code: string; slug?: string };
            stores?: { id: string; name: string; code: string; is_default?: boolean }[];
            impersonation?: { tenant_name?: string } | null;
          };
        };

        const isOrg = body.data?.tenant?.kind === "organization";
        const perms = body.data?.permissions ?? [];
        const rawRole = body.data?.role ?? (isOrg ? "Organization Owner" : "Staff");
        const isOwner =
          rawRole?.toLowerCase() === "owner" ||
          rawRole?.toLowerCase() === "platform" ||
          rawRole?.toLowerCase() === "organization owner" ||
          perms.includes("*") ||
          body.data?.is_super_admin === true;

        setIsOrganization(isOrg);
        setOrgSlug(body.data?.tenant?.slug ?? null);
        setBrand(body.data?.tenant?.name ?? body.data?.store?.name ?? "Store");
        setStoreSlug(body.data?.store?.slug ?? body.data?.tenant?.slug ?? null);
        setUser({
          name: body.data?.name ?? "Staff",
          role: rawRole,
          permissions: perms,
          isOwner,
        });
        setViewing(body.data?.impersonation?.tenant_name ?? null);
        if (body.data?.store) {
          setCurrentStore({ id: body.data.store.id, name: body.data.store.name, code: body.data.store.code });
        }
        if (body.data?.stores && body.data.stores.length > 0) {
          setAllStores(body.data.stores);
        } else {
          void fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } })
            .then((r) => r.json())
            .then((stBody) => {
              if (active && stBody.data?.stores) setAllStores(stBody.data.stores);
            })
            .catch(() => {});
        }
        void fetch("/api/v1/billing/features", { credentials: "include", headers: { Accept: "application/json" } })
          .then((r) => (r.ok ? r.json() : null))
          .then((flags) => {
            if (active && flags?.data) setFeatures(flags.data);
          })
          .catch(() => {});

        setAuthState("authenticated");
      } catch {
        if (!active) return;
        setAuthState("unauthenticated");
        window.location.replace("/login");
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys.map((k) => (k !== "selfx-pos-v3" ? caches.delete(k) : null))
        );
      }
      const token = decodeURIComponent(
        document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "",
      );
      await fetch("/api/v1/auth/staff/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
      });
    } catch {}
    window.location.replace("/login");
  }

  async function handleSwitchBranch(storeId: string) {
    const token = decodeURIComponent(
      document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "",
    );
    await fetch("/api/v1/auth/switch-store", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token,
      },
      body: JSON.stringify({ store_id: storeId }),
    });
    window.location.reload();
  }

  async function loadTodaySummary() {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/v1/reports/dashboard", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: TodaySummaryData };
        if (body.data) setSummaryData(body.data);
      }
    } finally {
      setSummaryLoading(false);
    }
  }

  function openSummaryDrawer() {
    setSummaryOpen(true);
    void loadTodaySummary();
  }

  useEffect(() => {
    const seen = new Set<string>();
    let ready = false;
    const tick = async () => {
      const response = await fetch("/api/v1/orders", { credentials: "include", headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const rows = ((await response.json()) as { data: { id: string; status: string }[] }).data ?? [];
      const placed = rows.filter((row) => row.status === "placed").map((row) => row.id);
      if (ready && placed.some((id) => !seen.has(id))) beep();
      seen.clear();
      placed.forEach((id) => seen.add(id));
      ready = true;
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  async function stopViewing() {
    const token = decodeURIComponent(document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "");
    await fetch("/api/v1/auth/impersonation/stop", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token },
    });
    if (isOrganization) {
      window.location.href = "/superadmin/organizations";
    } else {
      window.location.href = "/superadmin/impersonation-logs";
    }
  }

  const visitStoreHref = storeSlug ? `/store?store=${encodeURIComponent(storeSlug)}` : "/store";

  const ts = summaryData?.today_summary;
  const netSalesPaise = ts?.net_sales_paise ?? ((summaryData?.sales_paise ?? 0) - (summaryData?.returns_paise ?? 0));
  const grossSalesPaise = ts?.gross_sales_paise ?? (summaryData?.sales_paise ?? 0);
  const discountPaise = ts?.discount_paise ?? 0;
  const taxPaise = ts?.tax_paise ?? 0;
  const returnsPaise = ts?.returns_paise ?? (summaryData?.returns_paise ?? 0);
  const billsCount = ts?.bills_count ?? (summaryData?.bills ?? 0);
  const itemsSoldQty = ts?.items_sold_qty ?? 0;
  const inPaise = ts?.in_paise ?? netSalesPaise;
  const outPaise = ts?.out_paise ?? 0;
  const totalFlow = Math.max(1, inPaise + outPaise);
  const inPct = inPaise === 0 && outPaise === 0 ? 50 : Math.round((inPaise / totalFlow) * 100);

  const purchasesGross = ts?.purchases_gross_paise ?? (summaryData?.purchases_paise ?? 0);
  const purchasesBills = ts?.purchases_bills_count ?? 0;
  const purchasesSent = ts?.purchases_sent_paise ?? 0;
  const purchaseDue = summaryData?.purchase_due_paise ?? 0;
  const salesDue = summaryData?.sales_due_paise ?? 0;

  const cogsPaise = ts?.cogs_paise ?? 0;
  const grossProfitPaise = ts?.gross_profit_paise ?? netSalesPaise;
  const netProfitPaise = ts?.net_profit_paise ?? netSalesPaise;
  const profitMarginPct = netSalesPaise > 0 ? ((netProfitPaise / netSalesPaise) * 100).toFixed(1) : "0.0";

  const stockCostPaise = summaryData?.stock_cost_paise ?? 0;
  const stockRetailPaise = summaryData?.stock_retail_paise ?? 0;
  const potentialMarginPaise = Math.max(0, stockRetailPaise - stockCostPaise);
  const stockUnits = ts?.stock_units_count ?? 0;
  const lowStockCount = ts?.low_stock_count ?? (summaryData?.alerts?.length ?? 0);
  const outOfStockCount = ts?.out_of_stock_count ?? 0;
  const newCustomersToday = ts?.new_customers_today ?? 0;
  const onDutyCount = ts?.on_duty_count ?? 1;
  if (maintenanceInfo?.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-white">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Server className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              HTTP 503 — SCHEDULED MAINTENANCE
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Platform Maintenance in Progress
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {maintenanceInfo.message ||
                "SelfX Retail Cloud is currently undergoing scheduled infrastructure upgrades. All data, sales ledgers, and transactions are securely preserved."}
            </p>
          </div>

          {maintenanceInfo.until ? (
            <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3 text-xs text-slate-300">
              <span className="text-slate-500">Expected Resolution: </span>
              <strong className="text-white font-mono">{maintenanceInfo.until}</strong>
            </div>
          ) : null}

          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition shadow"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Check System Status</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 animate-spin rounded-full border-2 border-line border-t-accent" />
          <span className="text-xs font-medium text-muted">Checking store session...</span>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-muted">Redirecting to sign in...</span>
        </div>
      </div>
    );
  }

  const orgDirectoryHref = orgSlug ? `/org/${encodeURIComponent(orgSlug)}` : "/store";

  const organizationNavGroups: NavGroup[] = [
    {
      label: "Main",
      items: [
        { href: "/", label: "Dashboard", icon: LayoutDashboard },
        { href: "/branches", label: "Member Stores", icon: Store },
        { href: "/branches", label: "Locations", icon: MapPin },
        { href: "/staff", label: "Team", icon: Users },
      ],
    },
    {
      label: "Analytics & Sales",
      items: [
        {
          href: "/reports",
          label: "Combined Reports",
          icon: BarChart3,
          children: [
            { href: "/reports?tab=sales", label: "Sales Summary" },
            { href: "/reports?tab=products", label: "Product-Wise Sales" },
            { href: "/reports?tab=gst", label: "GST & Tax Report" },
            { href: "/reports?tab=payments", label: "Payment Modes" },
          ],
        },
        {
          href: orgDirectoryHref,
          label: "Combined Storefront",
          icon: Globe,
        },
      ],
    },
    {
      label: "Settings",
      items: [
        { href: "/settings/profile", label: "Owner Settings", icon: Settings },
      ],
    },
  ];

  return (
    <AppShell
      product={brand}
      accent={isOrganization ? "emerald" : "violet"}
      onLogout={handleLogout}
      groups={
        isOrganization
          ? organizationNavGroups
          : groups
              .map((group) => ({
                ...group,
                items: group.items
                  .filter((item) => {
                    if (item.href === "/customers" && features["module.customers"] === false) return false;
                    return canAccessRoute(item.href, user.permissions, user.isOwner);
                  })
                  .map((item) => {
                    const withDynamicHrefs =
                      item.href === "/online-store" && item.children
                        ? {
                            ...item,
                            children: item.children.map((child) =>
                              child.label === "Visit Online Store" ? { ...child, href: visitStoreHref } : child,
                            ),
                          }
                        : item;

                    if (withDynamicHrefs.children) {
                      const allowedChildren = withDynamicHrefs.children.filter((child) =>
                        canAccessRoute(child.href, user.permissions, user.isOwner),
                      );
                      return {
                        ...withDynamicHrefs,
                        children: allowedChildren.length > 0 ? allowedChildren : undefined,
                      };
                    }

                    return withDynamicHrefs;
                  }),
              }))
              .filter((group) => group.items.length > 0)
      }
      pathname={pathname}
      user={user}
      actions={
        isOrganization ? (
          <div className="flex items-center gap-2">
            <a
              href={orgDirectoryHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-ink shadow-2xs transition hover:bg-bg"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Combined Storefront</span>
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Branch Location Switcher (Matching Image 2) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink transition hover:bg-bg cursor-pointer"
                title="Switch branch location"
              >
                <MapPin size={13} className="text-orange-600 shrink-0" />
                <span className="text-[10.5px] uppercase font-semibold text-muted">Branch:</span>
                <span className="font-semibold text-ink uppercase tracking-wide max-w-[120px] truncate">
                  {currentStore?.name || brand}
                </span>
                <ChevronDown size={13} className="text-muted" />
              </button>

              {branchDropdownOpen ? (
                <div className="absolute top-full right-0 sm:left-0 sm:right-auto z-50 mt-1.5 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Active Branch Location
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {allStores.length > 0 ? (
                      allStores.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setBranchDropdownOpen(false);
                            void handleSwitchBranch(st.id);
                          }}
                          className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                            currentStore?.id === st.id
                              ? "bg-accent-soft text-accent"
                              : "text-ink hover:bg-bg"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{st.name}</span>
                            <span className="rounded bg-surface-muted px-1 font-mono text-[9.5px] text-muted">
                              {st.code}
                            </span>
                          </div>
                          {currentStore?.id === st.id ? <Check size={13} /> : null}
                        </button>
                      ))
                    ) : (
                      <div className="px-2.5 py-2 text-xs text-muted">No other branches registered</div>
                    )}
                  </div>
                  <div className="mt-1 border-t border-line/70 pt-1">
                    <a
                      href="/branches"
                      onClick={() => setBranchDropdownOpen(false)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:bg-bg hover:text-ink cursor-pointer"
                    >
                      <Building2 size={12} />
                      Manage locations &rarr;
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            {(user.isOwner ||
              user.permissions.includes("pos.sell") ||
              user.permissions.includes("pos.access") ||
              user.permissions.includes("*")) && (
              <a
                href="/pos"
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-3.5 text-[13px] font-semibold text-accent-ink shadow-2xs transition hover:opacity-95"
              >
                POS
              </a>
            )}

            {/* Today's Summary Trigger Button in Top Header (Matches Image 1 & 2) */}
            <button
              type="button"
              onClick={openSummaryDrawer}
              title="Today's Summary (Day Ledger)"
              aria-label="Today's Summary"
              className="group relative inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-muted transition-colors hover:bg-bg hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
              <span className="hidden sm:inline">Today&apos;s Summary</span>
            </button>
          </div>
        )
      }
    >
      {viewing ? (
        isOrganization ? (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-950 dark:text-emerald-100 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <span className="font-semibold text-foreground">Impersonating {viewing}</span>
                <span className="ml-2 text-muted hidden md:inline text-[11px] font-medium">
                  (Campus Organization Administrative View)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void stopViewing()}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/10 transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              Leave impersonation
            </button>
          </div>
        ) : (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-100 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <span className="font-semibold text-foreground">Security Audit Active:</span> Currently impersonating tenant workspace{" "}
                <strong className="font-semibold underline decoration-amber-500/50">{viewing}</strong> as Platform Super Admin.
                <span className="ml-1.5 hidden md:inline text-[11px] text-muted">
                  (Financial secrets and password modifications are restricted)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void stopViewing()}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-500/10 transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              Exit Impersonation
            </button>
          </div>
        )
      ) : null}
      {authState === "authenticated" && !canAccessRoute(pathname, user.permissions, user.isOwner) ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 mb-4 border border-amber-500/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-ink mb-1">Access Restricted</h2>
          <p className="max-w-md text-xs text-muted mb-6">
            Your assigned role (<span className="font-semibold text-ink capitalize">{user.role}</span>) does not have permission to view this module. Please contact your store administrator to adjust role privileges in <span className="font-mono text-[11px]">Team &gt; Staff</span>.
          </p>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-[8px] border border-line bg-surface px-4 text-xs font-semibold text-ink shadow-2xs hover:bg-bg"
            >
              Return to Dashboard
            </a>
            {(user.isOwner ||
              user.permissions.includes("pos.sell") ||
              user.permissions.includes("pos.access") ||
              user.permissions.includes("*")) && (
              <a
                href="/pos"
                className="inline-flex h-9 items-center justify-center rounded-[8px] bg-accent px-4 text-xs font-semibold text-accent-ink shadow-2xs hover:opacity-95"
              >
                Open POS Register
              </a>
            )}
          </div>
        </div>
      ) : (
        children
      )}

      {/* TODAY'S SUMMARY SLIDE-OVER DRAWER (Matches Image 2 Day Ledger UI) */}
      {summaryOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[1px]">
          <div className="fixed inset-0" onClick={() => setSummaryOpen(false)} />
          <aside className="relative z-10 flex h-full w-full max-w-[440px] flex-col border-l border-slate-200 bg-[#f8fafc] text-slate-900 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  DAY LEDGER
                </div>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
                  Today&apos;s summary
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  {ts?.date_label ||
                    new Date().toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void loadTodaySummary()}
                  title="Refresh ledger"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-3.5 w-3.5 ${summaryLoading ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryOpen(false)}
                  title="Close"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Ledger Body */}
            <div className="flex-1 space-y-3.5 overflow-y-auto p-4">
              {/* 1. NET SALES HERO CARD */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                      NET SALES
                    </div>
                    <div className="num mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                      {formatInrPaise(netSalesPaise)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="num rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {billsCount} bills
                    </span>
                    <span className="num rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {itemsSoldQty} items
                    </span>
                  </div>
                </div>

                {/* In / Out Progress Split Bar */}
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${inPct}%` }}
                    />
                    <div
                      className="bg-amber-500 transition-all duration-300"
                      style={{ width: `${100 - inPct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11.5px] font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      In <strong className="num text-slate-900">{formatInrPaise(inPaise)}</strong>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Out <strong className="num text-slate-900">{formatInrPaise(outPaise)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. SIDE-BY-SIDE SALES & PURCHASES BREAKDOWN */}
              <div className="grid grid-cols-2 gap-3">
                {/* SALES CARD */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                      SALES
                    </span>
                    <span className="num text-[11px] font-medium text-slate-400">
                      {billsCount} bills
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross</span>
                      <span className="num font-semibold text-slate-900">{formatInrPaise(grossSalesPaise)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Discount</span>
                      <span className="num font-medium text-slate-700">{formatInrPaise(discountPaise)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tax</span>
                      <span className="num font-medium text-slate-700">{formatInrPaise(taxPaise)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Returns</span>
                      <span className="num font-medium text-slate-700">{formatInrPaise(returnsPaise)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-slate-900">
                      <span>Net</span>
                      <span className="num text-emerald-600">{formatInrPaise(netSalesPaise)}</span>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10.5px] font-semibold">
                    <span className="num text-slate-500">Paid {formatInrPaise(inPaise)}</span>
                    <span className="num text-rose-600">Due {formatInrPaise(salesDue)}</span>
                  </div>
                </div>

                {/* PURCHASES CARD */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                      PURCHASES
                    </span>
                    <span className="num text-[11px] font-medium text-slate-400">
                      {purchasesBills} bills
                    </span>
                  </div>
                  <div className="mt-2.5 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross</span>
                      <span className="num font-semibold text-slate-900">{formatInrPaise(purchasesGross)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Discount</span>
                      <span className="num font-medium text-slate-700">₹0.00</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Tax</span>
                      <span className="num font-medium text-slate-700">₹0.00</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Returns</span>
                      <span className="num font-medium text-slate-700">₹0.00</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-slate-900">
                      <span>Net</span>
                      <span className="num text-slate-900">{formatInrPaise(purchasesGross)}</span>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10.5px] font-semibold">
                    <span className="num text-slate-500">Sent {formatInrPaise(purchasesSent)}</span>
                    <span className="num text-amber-600">Due {formatInrPaise(purchaseDue)}</span>
                  </div>
                </div>
              </div>

              {/* 3. PROFIT CARD */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                    PROFIT
                  </span>
                  <span className="num rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                    {profitMarginPct}% margin
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 divide-x divide-slate-100 text-xs">
                  <div className="pr-2">
                    <div className="text-[11px] text-slate-500">COGS</div>
                    <div className="num mt-0.5 font-semibold text-slate-900">{formatInrPaise(cogsPaise)}</div>
                  </div>
                  <div className="px-2.5">
                    <div className="text-[11px] text-slate-500">Gross profit</div>
                    <div className="num mt-0.5 font-semibold text-emerald-600">{formatInrPaise(grossProfitPaise)}</div>
                  </div>
                  <div className="pl-2.5">
                    <div className="text-[11px] text-slate-500">Net profit</div>
                    <div className="num mt-0.5 font-semibold text-slate-900">{formatInrPaise(netProfitPaise)}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                  <span>
                    Tax collected <strong className="num text-slate-800">{formatInrPaise(taxPaise)}</strong>
                  </span>
                  <span>
                    Expenses <strong className="num text-slate-800">₹0.00</strong>
                  </span>
                </div>
              </div>

              {/* 4. PAYMENTS BY METHOD CARD */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="border-b border-slate-100 pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                  PAYMENTS BY METHOD
                </div>
                <table className="mt-2 w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                      <th className="py-1.5 text-left">Method</th>
                      <th className="py-1.5 text-right">Received</th>
                      <th className="py-1.5 text-right">Sent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(summaryData?.payments ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-xs text-slate-400">
                          No payments recorded today
                        </td>
                      </tr>
                    ) : (
                      (summaryData?.payments ?? []).map((p) => (
                        <tr key={p.method}>
                          <td className="py-2 font-semibold uppercase text-slate-800">{p.method}</td>
                          <td className="num py-2 text-right font-semibold text-emerald-600">
                            {formatInrPaise(p.amount_paise)}
                          </td>
                          <td className="num py-2 text-right text-slate-500">₹0.00</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 5. STOCK VALUATION CARD */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                    STOCK
                  </span>
                  <span className="num text-[11px] font-semibold text-slate-500">
                    {stockUnits} units
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 divide-x divide-slate-100 text-xs">
                  <div className="pr-2">
                    <div className="text-[11px] text-slate-500">At cost</div>
                    <div className="num mt-0.5 font-semibold text-slate-900">{formatInrPaise(stockCostPaise)}</div>
                  </div>
                  <div className="px-2.5">
                    <div className="text-[11px] text-slate-500">At retail</div>
                    <div className="num mt-0.5 font-semibold text-slate-900">{formatInrPaise(stockRetailPaise)}</div>
                  </div>
                  <div className="pl-2.5">
                    <div className="text-[11px] text-slate-500">Potential margin</div>
                    <div className="num mt-0.5 font-semibold text-emerald-600">{formatInrPaise(potentialMarginPaise)}</div>
                  </div>
                </div>
              </div>

              {/* 6. BOTTOM 3 SUMMARY CARDS (New customers, Low stock, On duty) */}
              <div className="grid grid-cols-3 gap-2.5 pb-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="num text-base font-semibold text-slate-900">{newCustomersToday}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-slate-600">New customers</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <span className="num text-base font-semibold text-slate-900">{lowStockCount}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-slate-600">Low stock</div>
                  <div className="num text-[10px] font-semibold text-rose-600">
                    {outOfStockCount} out of stock
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    <span className="num text-base font-semibold text-slate-900">{onDutyCount}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] font-semibold text-slate-600">On duty</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
      <TenantAiAssistantWidget />
    </AppShell>
  );
}

function beep() {
  const context = new AudioContext();
  const tone = context.createOscillator();
  const level = context.createGain();
  tone.frequency.value = 880;
  level.gain.value = 0.04;
  tone.connect(level);
  level.connect(context.destination);
  tone.start();
  tone.stop(context.currentTime + 0.12);
  tone.onended = () => void context.close();
}
