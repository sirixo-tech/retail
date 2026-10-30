"use client";

import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Boxes,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Info,
  LayoutGrid,
  Link2,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Store,
  Trash2,
  Truck,
  Upload,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { WooIntegrationData } from "./woocommerce-view";

type ShopifySection = "dashboard" | "stores" | "sync" | "mappings" | "logs" | "guide";
type ModalTab = "connection" | "where" | "what" | "auto";

interface ShopifyStoreEntry {
  id: string;
  name: string;
  shop_domain: string;
  auth_mode?: "client_credentials" | "access_token";
  api_version?: string;
  status?: string;
  warehouse?: string;
  where_data_lands?: {
    warehouse?: string;
    default_category?: string;
    price_mapping?: string;
    tax_mode?: string;
  };
  what_to_sync?: {
    products?: boolean;
    inventory?: boolean;
    customers?: boolean;
    orders?: boolean;
    collections?: boolean;
    fulfillments?: boolean;
    create_missing_products?: boolean;
  };
  automatic_sync?: {
    enabled?: boolean;
    interval?: string;
    push_stock_on_sale?: boolean;
    pull_orders_auto?: boolean;
  };
  updated_at?: string | null;
}

export function ShopifyIntegrationView({
  data,
  activity14d,
  onConnectShop,
  onRemoveShop,
  onTestConnection,
  onRunSync,
  onResetMappings,
  onClearLogs,
  busy,
  notice,
}: {
  data: WooIntegrationData & {
    integration: WooIntegrationData["integration"] & {
      stores?: ShopifyStoreEntry[];
    };
    stats: WooIntegrationData["stats"] & {
      stores_connected?: number;
      stores_total?: number;
    };
  };
  activity14d: { date: string; runs: number; records_synced: number }[];
  onConnectShop: (payload: Record<string, any>) => Promise<boolean>;
  onRemoveShop: (shopId: string) => Promise<void>;
  onTestConnection: () => Promise<void>;
  onRunSync: (options: {
    scope: string;
    direction?: "pull" | "push";
    create_missing?: boolean;
    only_unsynced?: boolean;
    dry_run?: boolean;
    item_id?: string;
  }) => Promise<void>;
  onResetMappings: () => Promise<void>;
  onClearLogs: () => Promise<void>;
  busy: boolean;
  notice: { type: "ok" | "error"; text: string } | null;
}) {
  const [section, setSection] = useState<ShopifySection>("dashboard");

  // Connect a Shopify store Modal State (Matches Image 5)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("connection");
  const [editingShopId, setEditingShopId] = useState<string | null>(null);

  const [shopName, setShopName] = useState(data.integration.fields?.name ?? "");
  const [shopDomain, setShopDomain] = useState(data.integration.fields?.shop_domain ?? "");
  const [authMode, setAuthMode] = useState<"client_credentials" | "access_token">(
    (data.integration.fields?.auth_mode as "client_credentials" | "access_token") ??
      "client_credentials",
  );
  const [clientId, setClientId] = useState(
    data.integration.secret_keys?.includes("client_id") ? "••••••••••••••••" : "",
  );
  const [clientSecret, setClientSecret] = useState(
    data.integration.secret_keys?.includes("client_secret") ? "••••••••••••••••" : "",
  );
  const [accessToken, setAccessToken] = useState(
    data.integration.secret_keys?.includes("access_token") ? "••••••••••••••••" : "",
  );
  const [apiVersion, setApiVersion] = useState(data.integration.fields?.api_version ?? "2024-10");
  const [webhookSecret, setWebhookSecret] = useState("");

  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Modal Tab 2: Where data lands
  const [targetWarehouse, setTargetWarehouse] = useState(data.store?.name ?? "Main Store Warehouse");
  const [defaultCategory, setDefaultCategory] = useState("Shopify Imported");
  const [priceMapping, setPriceMapping] = useState("selling_and_mrp");
  const [taxMode, setTaxMode] = useState("inclusive");

  // Modal Tab 3: What to sync
  const [syncProducts, setSyncProducts] = useState(true);
  const [createMissingProducts, setCreateMissingProducts] = useState(true);
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncCustomers, setSyncCustomers] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);
  const [syncCollections, setSyncCollections] = useState(true);
  const [syncFulfillments, setSyncFulfillments] = useState(true);

  // Modal Tab 4: Automatic sync
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [autoSyncInterval, setAutoSyncInterval] = useState("every_15_minutes");
  const [pushStockOnSale, setPushStockOnSale] = useState(true);
  const [pullOrdersAuto, setPullOrdersAuto] = useState(true);

  // Stores filter & Mappings filter
  const [storeSearch, setStoreSearch] = useState("");
  const [storeStatusFilter, setStoreStatusFilter] = useState("all");
  const [mappingQuery, setMappingQuery] = useState("");

  const storesList: ShopifyStoreEntry[] = data.integration.stores ?? [];
  const hasConnectedStore =
    data.integration.status === "connected" ||
    storesList.some((s) => s.status === "connected");

  const openConnectModal = (shop?: ShopifyStoreEntry) => {
    if (shop) {
      setEditingShopId(shop.id);
      setShopName(shop.name || "");
      setShopDomain(shop.shop_domain || "");
      setAuthMode(shop.auth_mode || "client_credentials");
      setApiVersion(shop.api_version || "2024-10");
      if (shop.where_data_lands) {
        setTargetWarehouse(shop.where_data_lands.warehouse || data.store?.name || "Main Store");
        setDefaultCategory(shop.where_data_lands.default_category || "Shopify Imported");
        setPriceMapping(shop.where_data_lands.price_mapping || "selling_and_mrp");
        setTaxMode(shop.where_data_lands.tax_mode || "inclusive");
      }
      if (shop.what_to_sync) {
        setSyncProducts(shop.what_to_sync.products !== false);
        setCreateMissingProducts(shop.what_to_sync.create_missing_products !== false);
        setSyncInventory(shop.what_to_sync.inventory !== false);
        setSyncCustomers(shop.what_to_sync.customers !== false);
        setSyncOrders(shop.what_to_sync.orders !== false);
        setSyncCollections(shop.what_to_sync.collections !== false);
        setSyncFulfillments(shop.what_to_sync.fulfillments !== false);
      }
      if (shop.automatic_sync) {
        setAutoSyncEnabled(shop.automatic_sync.enabled !== false);
        setAutoSyncInterval(shop.automatic_sync.interval || "every_15_minutes");
        setPushStockOnSale(shop.automatic_sync.push_stock_on_sale !== false);
        setPullOrdersAuto(shop.automatic_sync.pull_orders_auto !== false);
      }
    } else {
      setEditingShopId(null);
      setShopName(data.integration.fields?.name ?? "");
      setShopDomain(data.integration.fields?.shop_domain ?? "");
    }
    setModalTab("connection");
    setModalOpen(true);
  };

  const handleSubmitConnectModal = async () => {
    if (!shopName.trim() || !shopDomain.trim()) return;
    const ok = await onConnectShop({
      id: editingShopId,
      name: shopName.trim(),
      shop_domain: shopDomain.trim(),
      auth_mode: authMode,
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      access_token: accessToken.trim(),
      api_version: apiVersion.trim() || "2024-10",
      webhook_secret: webhookSecret.trim(),
      where_data_lands: {
        warehouse: targetWarehouse,
        default_category: defaultCategory,
        price_mapping: priceMapping,
        tax_mode: taxMode,
      },
      what_to_sync: {
        products: syncProducts,
        create_missing_products: createMissingProducts,
        inventory: syncInventory,
        customers: syncCustomers,
        orders: syncOrders,
        collections: syncCollections,
        fulfillments: syncFulfillments,
      },
      automatic_sync: {
        enabled: autoSyncEnabled,
        interval: autoSyncInterval,
        push_stock_on_sale: pushStockOnSale,
        pull_orders_auto: pullOrdersAuto,
      },
    });
    if (ok) {
      setModalOpen(false);
    }
  };

  const filteredStores = useMemo(() => {
    return storesList.filter((s) => {
      if (storeStatusFilter !== "all" && s.status !== storeStatusFilter) return false;
      if (storeSearch.trim()) {
        const q = storeSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) || s.shop_domain.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [storesList, storeSearch, storeStatusFilter]);

  const filteredMappings = useMemo(() => {
    return (data.entities.products ?? []).filter((p) => {
      if (!mappingQuery.trim()) return true;
      const q = mappingQuery.toLowerCase();
      return (
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.remote_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [data.entities.products, mappingQuery]);

  // Chart calculations for Sync activity — last 14 days
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  const chartPoints = useMemo(() => {
    const raw =
      activity14d.length > 0
        ? activity14d
        : Array.from({ length: 14 }, (_, idx) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - idx));
            return {
              date: d.toISOString().slice(0, 10),
              runs: 0,
              records_synced: 0,
            };
          });

    const series = raw.map((item) => {
      const parsed = new Date(`${item.date}T00:00:00`);
      const shortDate = Number.isNaN(parsed.getTime())
        ? item.date.slice(5)
        : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        ...item,
        shortDate,
      };
    });

    const rawMax = Math.max(0, ...series.map((s) => Math.max(s.runs, s.records_synced)));
    const maxVal = Math.max(4, Math.ceil(rawMax / 4) * 4);
    const totalRecords = series.reduce((acc, s) => acc + s.records_synced, 0);
    const totalRuns = series.reduce((acc, s) => acc + s.runs, 0);

    return { series, maxVal, totalRecords, totalRuns };
  }, [activity14d]);

  const sectionLabels: Record<ShopifySection, string> = {
    dashboard: "Dashboard",
    stores: "Stores",
    sync: "Sync Centre",
    mappings: "Mappings",
    logs: "Logs",
    guide: "Guide",
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Breadcrumb & Header Row (Matches Image 2 & Image 5) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/integrations" className="hover:text-slate-600">
              Shopify
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">{sectionLabels[section]}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {section === "stores" ? "Shopify Stores" : "Shopify"}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            {section === "stores"
              ? "Connect as many Shopify stores as you operate and manage their credentials and sync behaviour."
              : "Every connected shop, what is linked and what has been moving."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {section === "stores" ? (
            <button
              type="button"
              onClick={() => openConnectModal()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-4 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Connect store</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSection("sync")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Sync centre</span>
              </button>
              <button
                type="button"
                onClick={() => setSection("stores")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-4 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
              >
                <Store size={13} />
                <span>Manage stores</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-navigation Pill Strip (Dashboard | Stores | Sync Centre | Mappings | Logs | Guide) */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-2xs scrollbar-none">
        {(
          [
            { id: "dashboard", label: "Dashboard" },
            { id: "stores", label: "Stores" },
            { id: "sync", label: "Sync Centre" },
            { id: "mappings", label: "Mappings" },
            { id: "logs", label: "Logs" },
            { id: "guide", label: "Guide" },
          ] as const
        ).map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                active
                  ? "bg-[#f3effe] text-[#7c3aed]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Feedback Banner */}
      {notice && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium ${
            notice.type === "ok"
              ? "border-emerald-200 bg-emerald-50/90 text-emerald-800"
              : "border-rose-200 bg-rose-50/90 text-rose-700"
          }`}
        >
          {notice.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* =====================================================================
          VIEW 1: DASHBOARD (Matches Image 2)
          ===================================================================== */}
      {section === "dashboard" && (
        <div className="space-y-5">
          {/* Top Connection Callout Banner (Matches Image 2) */}
          {!hasConnectedStore ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#b9e0fe] bg-[#eef7ff] px-5 py-4">
              <div className="flex items-start gap-3">
                <Info size={18} className="mt-0.5 shrink-0 text-[#0284c7]" />
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                    No Shopify store is connected yet.
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Connect a shop with its Admin API access token or Dev Dashboard credentials to start syncing products, stock, customers and orders.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openConnectModal()}
                className="rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-4 py-2 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
              >
                Connect a store
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                    Connected to {data.integration.remote?.shop_name || data.integration.fields?.shop_domain || "Shopify"}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Domain: {data.integration.fields?.shop_domain} · API {data.integration.fields?.api_version || "2024-10"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onTestConnection()}
                  className="rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition cursor-pointer"
                >
                  Test Connection
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void onRunSync({ scope: "products", direction: "pull", create_missing: true })
                  }
                  className="rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-3.5 py-1.5 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Sync Products Now
                </button>
              </div>
            </div>
          )}

          {/* 5 KPI Summary Cards Row (Matches Image 2) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef7e8] text-[#4d7c0f]">
                <Store size={18} />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {data.stats.stores_connected ?? 0}
                  <span className="text-xs font-normal text-slate-400">
                    /{data.stats.stores_total ?? 0}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">Stores connected</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f6fe] text-[#0284c7]">
                <Link2 size={18} />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {data.stats.linked_records ?? 0}
                </div>
                <div className="text-[11px] text-slate-500">Linked records</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9fbf0] text-[#16a34a]">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {data.stats.imported_orders ?? 0}
                </div>
                <div className="text-[11px] text-slate-500">Orders imported</div>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3effe] text-[#7c3aed]">
                <RefreshCw size={18} />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {data.stats.syncs_30d ?? 0}
                </div>
                <div className="text-[11px] text-slate-500">Syncs (30 days)</div>
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 flex items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0f1] text-[#e11d48]">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="text-lg font-extrabold text-slate-900">
                  {data.stats.errors_7d ?? 0}
                </div>
                <div className="text-[11px] text-slate-500">Errors (7 days)</div>
              </div>
            </div>
          </div>

          {/* Middle Row: Sync activity — last 14 days (Left) + By entity (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Sync activity — last 14 days (Redesigned Area/Line Telemetry Chart) */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Sync activity — last 14 days
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Daily volume of synced catalog records and sync runs
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/70 px-2.5 py-1 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-[#7c3aed]" />
                    <span className="text-slate-600">Records synced:</span>
                    <span className="font-bold text-slate-900">{chartPoints.totalRecords}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-sky-100 bg-sky-50/70 px-2.5 py-1 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-[#0ea5e9]" />
                    <span className="text-slate-600">Runs:</span>
                    <span className="font-bold text-slate-900">{chartPoints.totalRuns}</span>
                  </div>
                </div>
              </div>

              {/* SVG Smooth Area & Line Chart */}
              <div className="mt-4">
                {(() => {
                  const svgW = 680;
                  const svgH = 185;
                  const padL = 34;
                  const padR = 16;
                  const padT = 14;
                  const padB = 32;
                  const plotW = svgW - padL - padR;
                  const plotH = svgH - padT - padB;
                  const count = chartPoints.series.length;
                  const stepX = count > 1 ? plotW / (count - 1) : plotW;

                  const getX = (i: number) => padL + i * stepX;
                  const getY = (val: number) =>
                    padT + plotH - Math.min(1, val / chartPoints.maxVal) * plotH;

                  const recCoords = chartPoints.series.map((pt, i) => ({
                    x: getX(i),
                    y: getY(pt.records_synced),
                  }));
                  const runCoords = chartPoints.series.map((pt, i) => ({
                    x: getX(i),
                    y: getY(pt.runs),
                  }));

                  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
                    if (pts.length === 0) return "";
                    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
                    let d = `M ${pts[0].x} ${pts[0].y}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const cpx = (pts[i].x + pts[i + 1].x) / 2;
                      d += ` C ${cpx} ${pts[i].y}, ${cpx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
                    }
                    return d;
                  };

                  const recLine = buildSmoothPath(recCoords);
                  const runLine = buildSmoothPath(runCoords);
                  const baselineY = padT + plotH;

                  const recArea =
                    recCoords.length > 1
                      ? `${recLine} L ${recCoords[recCoords.length - 1].x} ${baselineY} L ${recCoords[0].x} ${baselineY} Z`
                      : "";
                  const runArea =
                    runCoords.length > 1
                      ? `${runLine} L ${runCoords[runCoords.length - 1].x} ${baselineY} L ${runCoords[0].x} ${baselineY} Z`
                      : "";

                  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
                    val: Math.round(chartPoints.maxVal * ratio),
                    y: padT + (1 - ratio) * plotH,
                  }));

                  const activePoint =
                    hoveredDayIdx !== null ? chartPoints.series[hoveredDayIdx] : null;

                  return (
                    <div className="relative">
                      {activePoint && (
                        <div className="pointer-events-none absolute top-0 right-2 z-10 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-900/95 px-3 py-1.5 text-[11px] text-white shadow-md">
                          <span className="font-semibold text-slate-300">
                            {activePoint.shortDate} ({activePoint.date})
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-[#a78bfa]" />
                            {activePoint.records_synced} records
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-[#38bdf8]" />
                            {activePoint.runs} runs
                          </span>
                        </div>
                      )}

                      <svg
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        className="h-52 w-full overflow-visible select-none"
                        onMouseLeave={() => setHoveredDayIdx(null)}
                      >
                        <defs>
                          <linearGradient id="shopifyRecGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.24" />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="shopifyRunGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Horizontal Grid Lines + Integer Y-Axis Labels */}
                        {yTicks.map((t, idx) => (
                          <g key={idx}>
                            <text
                              x={padL - 8}
                              y={t.y + 3}
                              textAnchor="end"
                              className="fill-slate-400 text-[10px] font-medium"
                            >
                              {t.val}
                            </text>
                            <line
                              x1={padL}
                              y1={t.y}
                              x2={svgW - padR}
                              y2={t.y}
                              stroke={idx === yTicks.length - 1 ? "#e2e8f0" : "#f1f5f9"}
                              strokeDasharray={idx === yTicks.length - 1 ? undefined : "4 4"}
                              strokeWidth="1"
                            />
                          </g>
                        ))}

                        {/* Area Fills */}
                        {recArea && <path d={recArea} fill="url(#shopifyRecGrad)" />}
                        {runArea && <path d={runArea} fill="url(#shopifyRunGrad)" />}

                        {/* Smooth Lines */}
                        {recLine && (
                          <path
                            d={recLine}
                            fill="none"
                            stroke="#7c3aed"
                            strokeWidth="2.25"
                            strokeLinecap="round"
                          />
                        )}
                        {runLine && (
                          <path
                            d={runLine}
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        )}

                        {/* Hover Guide Line */}
                        {hoveredDayIdx !== null && recCoords[hoveredDayIdx] && (
                          <line
                            x1={recCoords[hoveredDayIdx].x}
                            y1={padT}
                            x2={recCoords[hoveredDayIdx].x}
                            y2={baselineY}
                            stroke="#cbd5e1"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                        )}

                        {/* Interactive Nodes & X-Axis Short Dates */}
                        {chartPoints.series.map((pt, i) => {
                          const rx = recCoords[i].x;
                          const ry = recCoords[i].y;
                          const ux = runCoords[i].x;
                          const uy = runCoords[i].y;
                          const isHovered = hoveredDayIdx === i;
                          // Show every 2nd label on narrow screens or all compact labels cleanly
                          const showLabel = i % 2 === 0 || i === count - 1;

                          return (
                            <g
                              key={pt.date}
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredDayIdx(i)}
                            >
                              {/* Invisible hit column */}
                              <rect
                                x={rx - stepX / 2}
                                y={padT}
                                width={stepX}
                                height={plotH + padB}
                                fill="transparent"
                              />

                              {/* Records synced node */}
                              <circle
                                cx={rx}
                                cy={ry}
                                r={isHovered ? 4.5 : 3}
                                className="fill-white stroke-[#7c3aed] transition-all"
                                strokeWidth={isHovered ? 2.5 : 2}
                              />

                              {/* Runs node */}
                              <circle
                                cx={ux}
                                cy={uy}
                                r={isHovered ? 4 : 2.5}
                                className="fill-white stroke-[#0ea5e9] transition-all"
                                strokeWidth={isHovered ? 2.5 : 1.75}
                              />

                              {/* Horizontal Date Label (Never overflows) */}
                              {showLabel && (
                                <text
                                  x={rx}
                                  y={baselineY + 18}
                                  textAnchor="middle"
                                  className={`text-[10px] transition-colors ${
                                    isHovered
                                      ? "fill-slate-900 font-bold"
                                      : "fill-slate-400 font-medium"
                                  }`}
                                >
                                  {pt.shortDate}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* By entity Card (Matches Image 2) */}
            <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">By entity</h3>

              <div className="space-y-3">
                {[
                  {
                    icon: Package,
                    label: "Products",
                    count: data.stats.synced_products ?? 0,
                  },
                  {
                    icon: Boxes,
                    label: "Inventory",
                    count: data.stats.synced_products ?? 0,
                  },
                  {
                    icon: Users,
                    label: "Customers",
                    count: data.stats.synced_customers ?? 0,
                  },
                  {
                    icon: FileText,
                    label: "Orders",
                    count: data.stats.imported_orders ?? 0,
                  },
                  {
                    icon: LayoutGrid,
                    label: "Collections",
                    count: data.stats.synced_categories ?? 0,
                  },
                  {
                    icon: Truck,
                    label: "Fulfillments",
                    count: data.stats.imported_orders ?? 0,
                  },
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.label}
                      className="flex items-center justify-between py-1 text-xs"
                    >
                      <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                        <Icon size={15} className="text-slate-500" />
                        <span>{row.label}</span>
                      </div>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                        {row.count} linked
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Row: Stores (Left) + Recent syncs (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Stores Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Stores</h3>
                <button
                  type="button"
                  onClick={() => setSection("stores")}
                  className="text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
                >
                  Manage
                </button>
              </div>

              {storesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                  <p className="text-xs font-semibold text-slate-700">Nothing connected</p>
                  <p className="mt-1 max-w-xs text-[11px] text-slate-500">
                    Link your Shopify storefront domain and Admin API credentials to begin syncing.
                  </p>
                  <button
                    type="button"
                    onClick={() => openConnectModal()}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#7c3aed] shadow-2xs transition hover:bg-violet-50 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Connect store</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {storesList.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-500">{s.shop_domain}</div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          s.status === "connected"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {s.status === "connected" ? "Connected" : "Saved"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent syncs Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">Recent syncs</h3>
                <button
                  type="button"
                  onClick={() => setSection("sync")}
                  className="text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
                >
                  Sync centre
                </button>
              </div>

              {data.logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                  <p className="text-xs font-semibold text-slate-700">Nothing has run yet</p>
                  <p className="mt-1 max-w-xs text-[11px] text-slate-500">
                    Pull products, collections, or orders from Sync Centre to see execution logs here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSection("sync")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Open Sync Centre</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.logs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {log.message}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.action} · {log.created_at}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          log.status === "ok"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 2: STORES (Matches Image 5)
          ===================================================================== */}
      {section === "stores" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  placeholder="Search name or domain..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3.5 pr-9 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                />
              </div>

              <select
                value={storeStatusFilter}
                onChange={(e) => setStoreStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-[#7c3aed]"
              >
                <option value="all">All statuses</option>
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
              </select>

              <button
                type="button"
                onClick={() => openConnectModal(storesList[0])}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Configure Store"
              >
                <Settings size={15} />
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void onTestConnection()}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Test & Refresh"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Stores Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Store</th>
                    <th className="px-4 py-3">Shop domain</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Linked records</th>
                    <th className="px-4 py-3">Syncs (7d)</th>
                    <th className="px-4 py-3">Last sync</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStores.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                        No Shopify store connected yet. Click{" "}
                        <button
                          type="button"
                          onClick={() => openConnectModal()}
                          className="font-semibold text-[#7c3aed] underline cursor-pointer"
                        >
                          + Connect store
                        </button>{" "}
                        to link your first shop.
                      </td>
                    </tr>
                  ) : (
                    filteredStores.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-bold text-slate-900">{s.name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{s.shop_domain}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              s.status === "connected"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-600"
                            }`}
                          >
                            {s.status === "connected" ? "Connected" : "Disconnected"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {s.where_data_lands?.warehouse || data.store?.name || "Main Store"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {data.stats.linked_records}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{data.stats.syncs_7d}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {data.integration.last_synced_at || s.updated_at || "Never"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onTestConnection()}
                              className="rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                            >
                              Test
                            </button>
                            <button
                              type="button"
                              onClick={() => openConnectModal(s)}
                              className="rounded-md border border-violet-200 bg-violet-50/60 hover:bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-[#7c3aed] cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void onRemoveShop(s.id)}
                              className="rounded-md border border-rose-200 bg-white hover:bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 3: SYNC CENTRE
          ===================================================================== */}
      {section === "sync" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Pull & Import Products (Shopify → Store)",
                desc: "Fetch products & variants from Shopify, update matched SKUs, and automatically create new products in your store catalog.",
                scope: "products",
                direction: "pull" as const,
                create_missing: true,
                btnLabel: "Pull & Import Products",
                primary: true,
              },
              {
                title: "Push Store Catalog (Store → Shopify)",
                desc: "Export your local store products, prices, and stock quantities to your connected Shopify store.",
                scope: "products",
                direction: "push" as const,
                create_missing: false,
                btnLabel: "Push Products to Shopify",
                primary: false,
              },
              {
                title: "Sync Inventory & Stock Levels",
                desc: "Push real-time local on-hand stock quantities to Shopify inventory levels.",
                scope: "stock",
                direction: "push" as const,
                create_missing: false,
                btnLabel: "Push Stock Levels",
                primary: false,
              },
              {
                title: "Pull Collections as Categories",
                desc: "Import Shopify custom collections into your store categories.",
                scope: "categories",
                direction: "pull" as const,
                create_missing: true,
                btnLabel: "Pull Collections",
                primary: false,
              },
              {
                title: "Pull Shopify Customers",
                desc: "Import customer profiles, phone numbers, and emails from Shopify.",
                scope: "customers",
                direction: "pull" as const,
                create_missing: true,
                btnLabel: "Pull Customers",
                primary: false,
              },
              {
                title: "Import Shopify Orders",
                desc: "Pull recent Shopify orders directly into your store order queue.",
                scope: "orders",
                direction: "pull" as const,
                create_missing: true,
                btnLabel: "Pull Orders",
                primary: false,
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{card.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{card.desc}</p>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void onRunSync({
                        scope: card.scope,
                        direction: card.direction,
                        create_missing: card.create_missing,
                      })
                    }
                    className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                      card.primary
                        ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-2xs"
                        : "border border-violet-300 bg-white hover:bg-violet-50 text-[#7c3aed]"
                    }`}
                  >
                    {card.direction === "pull" ? <Download size={13} /> : <Upload size={13} />}
                    <span>{card.btnLabel}</span>
                  </button>

                  {card.scope === "products" && card.direction === "pull" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void onRunSync({
                          scope: "products",
                          direction: "pull",
                          dry_run: true,
                        })
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-semibold text-slate-600 cursor-pointer"
                    >
                      Dry run
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 4: MAPPINGS
          ===================================================================== */}
      {section === "mappings" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Entity Mappings (Store ↔ Shopify)</h2>
              <p className="text-xs text-slate-500">
                Linked Products: <strong>{data.stats.synced_products}</strong> of{" "}
                <strong>{data.stats.local_products}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={mappingQuery}
                  onChange={(e) => setMappingQuery(e.target.value)}
                  placeholder="Filter by SKU or product..."
                  className="h-9 rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-[#7c3aed]"
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onResetMappings()}
                className="h-9 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 px-3 text-xs font-semibold text-rose-600 cursor-pointer"
              >
                Reset Mappings
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Local SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Shopify Variant / Product ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMappings.slice(0, 80).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">
                      {item.sku}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{item.category_name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">
                      {item.remote_id || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {item.synced ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Linked
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                          Not linked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{item.synced_at || "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 5: LOGS
          ===================================================================== */}
      {section === "logs" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Shopify Activity Logs</h2>
            {data.logs.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onClearLogs()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear Logs</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      Nothing has run yet
                    </td>
                  </tr>
                ) : (
                  data.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {log.created_at}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{log.action}</td>
                      <td className="px-4 py-3 capitalize text-slate-600">{log.direction}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            log.status === "ok"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-600"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW 6: GUIDE
          ===================================================================== */}
      {section === "guide" && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5 max-w-4xl">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            <BookOpen size={16} className="text-[#7c3aed]" />
            <span>Shopify Integration &amp; Dev Dashboard Setup Guide</span>
          </div>

          <div className="space-y-4 text-xs leading-relaxed text-slate-600">
            <div className="rounded-xl border border-[#b9e0fe] bg-[#eef7ff] p-4 text-slate-700">
              <strong>Important (Shopify Dev Dashboard Apps):</strong> Since January 2026 Shopify no longer creates custom apps directly in the store admin. Create your app in the{" "}
              <strong>Shopify Dev Dashboard</strong>, grant its Admin API scopes, install it on your shop, then copy the <strong>Client ID</strong> and <strong>Client secret</strong> from its Settings page.
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">1. Required Admin API Scopes</h3>
              <p>Grant the following scopes in your Shopify app configuration:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "read_products",
                  "write_products",
                  "read_inventory",
                  "write_inventory",
                  "read_orders",
                  "write_orders",
                  "read_customers",
                  "read_fulfillments",
                ].map((scope) => (
                  <code
                    key={scope}
                    className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-800"
                  >
                    {scope}
                  </code>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">2. Connecting Your Store</h3>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>
                  Click <strong>Manage stores → + Connect store</strong> on the top right.
                </li>
                <li>
                  Enter your store label and your <code className="bg-slate-100 px-1 py-0.5 font-mono">acme.myshopify.com</code> domain.
                </li>
                <li>
                  Choose either <strong>Client ID + client secret (Dev Dashboard app)</strong> or <strong>Admin API access token (legacy custom app)</strong>.
                </li>
                <li>
                  Configure <strong>Where data lands</strong> (target warehouse &amp; category) and <strong>What to sync</strong>, then click <strong>Connect</strong>.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONNECT A SHOPIFY STORE (Exact Match to Image 5)
          ===================================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Connect a Shopify store</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 4 Modal Tabs (Connection | Where data lands | What to sync | Automatic sync) */}
            <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-semibold">
              {(
                [
                  { id: "connection", label: "Connection" },
                  { id: "where", label: "Where data lands" },
                  { id: "what", label: "What to sync" },
                  { id: "auto", label: "Automatic sync" },
                ] as const
              ).map((t) => {
                const active = modalTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalTab(t.id)}
                    className={`border-b-2 pb-2.5 transition cursor-pointer ${
                      active
                        ? "border-[#7c3aed] text-[#7c3aed]"
                        : "border-transparent text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Tab 1: Connection (Matches Image 5) */}
            {modalTab === "connection" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <span className="text-rose-500">*</span> Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Main storefront"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">
                      How this shop is labelled in the ERP
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <span className="text-rose-500">*</span> Shop domain <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                      placeholder="acme.myshopify.com"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">
                      acme.myshopify.com — the admin URL works too
                    </span>
                  </div>
                </div>

                {/* App credentials radio */}
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-slate-700">App credentials</div>
                  <div className="flex flex-wrap items-center gap-5 text-xs text-slate-800">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="shopify_auth_mode"
                        checked={authMode === "client_credentials"}
                        onChange={() => setAuthMode("client_credentials")}
                        className="text-[#7c3aed] focus:ring-[#7c3aed]"
                      />
                      <span>Client ID + client secret (Dev Dashboard app)</span>
                    </label>

                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="shopify_auth_mode"
                        checked={authMode === "access_token"}
                        onChange={() => setAuthMode("access_token")}
                        className="text-[#7c3aed] focus:ring-[#7c3aed]"
                      />
                      <span>Admin API access token (legacy custom app)</span>
                    </label>
                  </div>
                </div>

                {/* Blue Info Callout (Exact text from Image 5) */}
                {authMode === "client_credentials" && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#b9e0fe] bg-[#eef7ff] p-3.5 text-xs leading-relaxed text-slate-700">
                    <Info size={16} className="mt-0.5 shrink-0 text-[#0284c7]" />
                    <p>
                      Since January 2026 Shopify no longer creates custom apps in the admin. Create the app in the{" "}
                      <strong className="font-bold text-slate-900">Dev Dashboard</strong>, grant its Admin API scopes, install it on this shop, then copy the{" "}
                      <strong className="font-bold text-slate-900">Client ID</strong> and{" "}
                      <strong className="font-bold text-slate-900">Client secret</strong> from its{" "}
                      <em>Settings</em> page. The ERP fetches a fresh access token itself every 24 hours. The app and the shop must belong to the same Shopify organisation.
                    </p>
                  </div>
                )}

                {authMode === "client_credentials" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <span className="text-rose-500">*</span> Client ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="From the app's Settings page"
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        <span className="text-rose-500">*</span> Client secret <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showClientSecret ? "text" : "password"}
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          placeholder="shpss_..."
                          className="h-10 w-full rounded-lg border border-slate-200 pl-3 pr-9 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowClientSecret((v) => !v)}
                          className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showClientSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Also signs webhooks, so no separate signing secret is needed.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      <span className="text-rose-500">*</span> Admin API access token <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showAccessToken ? "text" : "password"}
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        placeholder="shpat_..."
                        className="h-10 w-full rounded-lg border border-slate-200 pl-3 pr-9 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessToken((v) => !v)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showAccessToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      API version
                    </label>
                    <input
                      type="text"
                      value={apiVersion}
                      onChange={(e) => setApiVersion(e.target.value)}
                      placeholder="2024-10"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Webhook signing secret
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showWebhookSecret ? "text" : "password"}
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="Optional"
                        className="h-10 w-full rounded-lg border border-slate-200 pl-3 pr-9 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWebhookSecret((v) => !v)}
                        className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showWebhookSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Optional here — the client secret above signs webhooks for a Dev Dashboard app.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Tab 2: Where data lands */}
            {modalTab === "where" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Store / Warehouse
                    </label>
                    <input
                      type="text"
                      value={targetWarehouse}
                      onChange={(e) => setTargetWarehouse(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Category for Imported Items
                    </label>
                    <input
                      type="text"
                      value={defaultCategory}
                      onChange={(e) => setDefaultCategory(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Price Mapping Mode
                    </label>
                    <select
                      value={priceMapping}
                      onChange={(e) => setPriceMapping(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    >
                      <option value="selling_and_mrp">Price as Selling Price &amp; Compare-at as MRP</option>
                      <option value="mrp_only">Map Price to both MRP &amp; Selling Price</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      GST / Tax Handling
                    </label>
                    <select
                      value={taxMode}
                      onChange={(e) => setTaxMode(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    >
                      <option value="inclusive">Tax Inclusive in Price</option>
                      <option value="exclusive">Tax Exclusive</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Tab 3: What to sync */}
            {modalTab === "what" && (
              <div className="space-y-3 text-xs text-slate-700">
                {[
                  {
                    checked: syncProducts,
                    set: setSyncProducts,
                    title: "Products & Variants",
                    sub: "Synchronize titles, SKUs, variant prices, and product images.",
                  },
                  {
                    checked: createMissingProducts,
                    set: setCreateMissingProducts,
                    title: "Auto-create missing products in store catalog",
                    sub: "When pulling from Shopify, automatically create new items in this branch if the SKU does not exist yet.",
                  },
                  {
                    checked: syncInventory,
                    set: setSyncInventory,
                    title: "Inventory & Stock Quantities",
                    sub: "Keep on-hand inventory levels synchronized between POS and Shopify.",
                  },
                  {
                    checked: syncCustomers,
                    set: setSyncCustomers,
                    title: "Customers",
                    sub: "Import Shopify customer profiles, phone numbers, and email addresses.",
                  },
                  {
                    checked: syncOrders,
                    set: setSyncOrders,
                    title: "Orders",
                    sub: "Import paid and unfulfilled Shopify orders into the store order queue.",
                  },
                  {
                    checked: syncCollections,
                    set: setSyncCollections,
                    title: "Collections",
                    sub: "Map Shopify collections to local product categories.",
                  },
                  {
                    checked: syncFulfillments,
                    set: setSyncFulfillments,
                    title: "Fulfillments",
                    sub: "Update fulfillment status when orders are dispatched.",
                  },
                ].map((opt) => (
                  <label
                    key={opt.title}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.set(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#7c3aed]"
                    />
                    <div>
                      <div className="font-bold text-slate-900">{opt.title}</div>
                      <div className="text-[11px] text-slate-500">{opt.sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Modal Tab 4: Automatic sync */}
            {modalTab === "auto" && (
              <div className="space-y-4 text-xs text-slate-700">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-900">Enable scheduled background sync</div>
                    <div className="text-[11px] text-slate-500">
                      Automatically run product, stock, and order synchronization in the background.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-[#7c3aed]"
                  />
                </label>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sync Frequency
                  </label>
                  <select
                    value={autoSyncInterval}
                    onChange={(e) => setAutoSyncInterval(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                  >
                    <option value="every_15_minutes">Every 15 minutes (Recommended)</option>
                    <option value="hourly">Every hour</option>
                    <option value="daily">Once daily at 02:00 AM</option>
                  </select>
                </div>

                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-900">Push stock immediately on POS sale</div>
                    <div className="text-[11px] text-slate-500">
                      Decrement Shopify inventory as soon as a counter bill or online order is completed.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushStockOnSale}
                    onChange={(e) => setPushStockOnSale(e.target.checked)}
                    className="rounded border-slate-300 text-[#7c3aed]"
                  />
                </label>

                <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-900">Auto-import incoming Shopify orders</div>
                    <div className="text-[11px] text-slate-500">
                      Automatically pull new orders into the store delivery &amp; pickup queue.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={pullOrdersAuto}
                    onChange={(e) => setPullOrdersAuto(e.target.checked)}
                    className="rounded border-slate-300 text-[#7c3aed]"
                  />
                </label>
              </div>
            )}

            {/* Modal Footer Buttons (Cancel | Connect — Matches Image 5) */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !shopName.trim() || !shopDomain.trim()}
                onClick={() => void handleSubmitConnectModal()}
                className="h-9 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-5 text-xs font-semibold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                {busy ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
