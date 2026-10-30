"use client";

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  FolderTree,
  Info,
  KeyRound,
  Layers,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  ShoppingBag,
  Sliders,
  Tag,
  Terminal,
  Trash2,
  Upload,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface WooIntegrationData {
  store?: { id: string; name: string; code: string };
  integration: {
    provider: string;
    status: string;
    fields: Record<string, string>;
    secret_keys: string[];
    tuning: Record<string, any>;
    last_tested_at?: string | null;
    last_synced_at?: string | null;
    last_error?: string | null;
    remote?: Record<string, any>;
  };
  stats: {
    local_products: number;
    synced_products: number;
    unsynced_products: number;
    local_categories: number;
    synced_categories: number;
    local_brands: number;
    synced_brands: number;
    local_customers: number;
    synced_customers: number;
    local_orders: number;
    imported_orders: number;
    linked_records: number;
    syncs_30d: number;
    syncs_7d: number;
    errors_7d: number;
  };
  entities: {
    products: {
      id: string;
      sku: string;
      name: string;
      category_name: string;
      brand_name: string;
      selling_price_paise: number;
      mrp_paise: number;
      on_hand: number;
      synced: boolean;
      remote_id: string | null;
      synced_at: string | null;
    }[];
    categories: {
      id: string;
      code: string;
      name: string;
      products_count: number;
      synced: boolean;
      remote_id: string | null;
      synced_at: string | null;
    }[];
    brands: {
      id: string;
      code: string;
      name: string;
      products_count: number;
      synced: boolean;
      remote_id: string | null;
      synced_at: string | null;
    }[];
    customers: {
      id: string;
      name: string;
      phone: string;
      email: string;
      created_at: string;
      synced: boolean;
      remote_id: string | null;
      synced_at: string | null;
    }[];
    orders: {
      id: string;
      number: string;
      customer_name: string;
      customer_phone: string;
      total_paise: number;
      status: string;
      payment_status: string;
      fulfillment: string;
      created_at: string;
      synced: boolean;
      remote_id: string | null;
    }[];
  };
  logs: {
    id: string;
    action: string;
    direction: string;
    status: string;
    message: string;
    created_at: string;
  }[];
}

type WooTab =
  | "status"
  | "settings"
  | "products"
  | "stock"
  | "category"
  | "brand"
  | "customers"
  | "orders"
  | "logs";

const WOO_TABS: { id: WooTab; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "settings", label: "Settings" },
  { id: "products", label: "Products" },
  { id: "stock", label: "Stock" },
  { id: "category", label: "Category" },
  { id: "brand", label: "Brand" },
  { id: "customers", label: "Customers" },
  { id: "orders", label: "Orders" },
  { id: "logs", label: "Logs" },
];

function formatInr(paise: number): string {
  return `₹${((paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function WooCommerceIntegrationView({
  data,
  onSaveSettings,
  onTestConnection,
  onRunSync,
  onResetMappings,
  onClearLogs,
  busy,
  notice,
}: {
  data: WooIntegrationData;
  onSaveSettings: (payload: {
    fields: Record<string, string>;
    secrets: Record<string, string>;
    tuning?: Record<string, any>;
  }) => Promise<void>;
  onTestConnection: (payload: {
    fields: Record<string, string>;
    secrets: Record<string, string>;
    tuning?: Record<string, any>;
  }) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<WooTab>("status");

  // Credentials state
  const [storeUrl, setStoreUrl] = useState(data.integration.fields?.store_url ?? "");
  const [consumerKey, setConsumerKey] = useState(
    data.integration.fields?.consumer_key_hint ??
      (data.integration.secret_keys?.includes("consumer_key") ? "••••••••••••••••" : ""),
  );
  const [consumerSecret, setConsumerSecret] = useState(
    data.integration.secret_keys?.includes("consumer_secret") ? "••••••••••••••••" : "",
  );
  const [wpUsername, setWpUsername] = useState(data.integration.fields?.wp_username ?? "");
  const [wpAppPassword, setWpAppPassword] = useState(
    data.integration.secret_keys?.includes("wp_app_password") ? "••••••••••••••••" : "",
  );

  const [showConsumerSecret, setShowConsumerSecret] = useState(false);
  const [showWpPassword, setShowWpPassword] = useState(false);

  // Sync tuning state
  const [batchSize, setBatchSize] = useState<number>(Number(data.integration.tuning?.batch_size ?? 50));
  const [timeoutSec, setTimeoutSec] = useState<number>(Number(data.integration.tuning?.timeout_seconds ?? 20));
  const [syncDirection, setSyncDirection] = useState<string>(
    data.integration.tuning?.sync_direction ?? "bidirectional",
  );
  const [priceTier, setPriceTier] = useState<string>(data.integration.tuning?.price_tier ?? "selling_price");
  const [autoCreateProducts, setAutoCreateProducts] = useState<boolean>(
    data.integration.tuning?.auto_create_products !== false,
  );
  const [attachWpMedia, setAttachWpMedia] = useState<boolean>(
    data.integration.tuning?.attach_wp_media !== false,
  );

  // Filters for entity tables
  const [productQuery, setProductQuery] = useState("");
  const [productSyncFilter, setProductSyncFilter] = useState<"all" | "synced" | "unsynced">("all");
  const [logFilter, setLogFilter] = useState<"all" | "ok" | "error">("all");

  const connected = data.integration.status === "connected";

  const filteredProducts = useMemo(() => {
    return (data.entities.products ?? []).filter((p) => {
      if (productSyncFilter === "synced" && !p.synced) return false;
      if (productSyncFilter === "unsynced" && p.synced) return false;
      if (productQuery.trim()) {
        const q = productQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data.entities.products, productQuery, productSyncFilter]);

  const filteredLogs = useMemo(() => {
    return (data.logs ?? []).filter((l) => {
      if (logFilter === "ok") return l.status === "ok";
      if (logFilter === "error") return l.status !== "ok";
      return true;
    });
  }, [data.logs, logFilter]);

  const buildPayload = () => ({
    fields: {
      store_url: storeUrl.trim(),
      wp_username: wpUsername.trim(),
    },
    secrets: {
      consumer_key: consumerKey.trim(),
      consumer_secret: consumerSecret.trim(),
      wp_app_password: wpAppPassword.trim(),
    },
    tuning: {
      batch_size: Math.max(10, Math.min(100, Number(batchSize) || 50)),
      timeout_seconds: Math.max(5, Math.min(60, Number(timeoutSec) || 20)),
      sync_direction: syncDirection,
      price_tier: priceTier,
      auto_create_products: autoCreateProducts,
      attach_wp_media: attachWpMedia,
    },
  });

  const handleResetTuning = () => {
    setBatchSize(50);
    setTimeoutSec(20);
    setSyncDirection("bidirectional");
    setPriceTier("selling_price");
    setAutoCreateProducts(true);
    setAttachWpMedia(true);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Breadcrumb & Page Title Row (Matches Image 3 & Image 4) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link href="/integrations" className="hover:text-slate-600">
              Settings
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">WooCommerce Settings</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            WooCommerce Settings
          </h1>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold ${
            connected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50/70 text-rose-600"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Main Container Card with 9 Tabs (Matches Image 3 & Image 4) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-6">
        {/* Horizontal Tab Bar */}
        <div className="flex items-center gap-5 overflow-x-auto border-b border-slate-200 text-xs sm:text-sm scrollbar-none">
          {WOO_TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`shrink-0 border-b-2 pb-3 font-semibold transition cursor-pointer ${
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

        {/* Feedback Banner */}
        {notice && (
          <div
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium ${
              notice.type === "ok"
                ? "border-emerald-200 bg-emerald-50/90 text-emerald-800"
                : "border-rose-200 bg-rose-50/90 text-rose-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{notice.text}</span>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 1: STATUS (Matches Image 3)
            ================================================================= */}
        {activeTab === "status" && (
          <div className="space-y-6">
            {/* 4 KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <div className="text-xs font-medium text-slate-400">Connection</div>
                <div
                  className={`mt-2 text-lg font-bold ${
                    connected ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {connected ? "Connected" : "Disconnected"}
                </div>
                {data.integration.fields?.store_url && (
                  <div className="mt-1 text-[11px] text-slate-400 truncate">
                    {data.integration.fields.store_url}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <div className="text-xs font-medium text-slate-400">Products</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {data.stats.local_products}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <div className="text-xs font-medium text-slate-400">Synced</div>
                <div className="mt-2 text-2xl font-bold text-emerald-600">
                  {data.stats.synced_products}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                <div className="text-xs font-medium text-slate-400">Not synced</div>
                <div className="mt-2 text-2xl font-bold text-amber-500">
                  {data.stats.unsynced_products}
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recent activity</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("logs")}
                  className="text-xs font-semibold text-[#7c3aed] hover:underline cursor-pointer"
                >
                  View all logs
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/70 font-bold text-slate-700">
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
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No data Available
                        </td>
                      </tr>
                    ) : (
                      data.logs.slice(0, 10).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60">
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
          </div>
        )}

        {/* =================================================================
            TAB 2: SETTINGS (Matches Image 4)
            ================================================================= */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Connection Status Banner */}
            <div
              className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold ${
                connected
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
                  : "border-rose-200 bg-rose-50/70 text-rose-700"
              }`}
            >
              {connected ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    Connected to {data.integration.fields?.store_url || "WooCommerce"}
                    {typeof data.integration.remote?.products === "number"
                      ? ` (${data.integration.remote.products} remote products detected)`
                      : ""}
                  </span>
                </>
              ) : (
                <>
                  <XCircle size={16} className="text-rose-500 shrink-0" />
                  <span>Disconnected</span>
                </>
              )}
            </div>

            {/* Credentials Form */}
            <form
              className="space-y-4 max-w-4xl"
              onSubmit={(e) => {
                e.preventDefault();
                void onSaveSettings(buildPayload());
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  <span className="text-rose-500">*</span> Store URL
                </label>
                <input
                  type="url"
                  required
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  placeholder="https://shop.example.com"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="text-rose-500">*</span> Consumer key
                  </label>
                  <input
                    type="text"
                    value={consumerKey}
                    onChange={(e) => setConsumerKey(e.target.value)}
                    placeholder="ck_..."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="text-rose-500">*</span> Consumer secret
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConsumerSecret ? "text" : "password"}
                      value={consumerSecret}
                      onChange={(e) => setConsumerSecret(e.target.value)}
                      placeholder="cs_..."
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3.5 pr-9 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConsumerSecret((v) => !v)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConsumerSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    WordPress username
                  </label>
                  <input
                    type="text"
                    value={wpUsername}
                    onChange={(e) => setWpUsername(e.target.value)}
                    placeholder="Administrator username (optional for media)"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    WordPress application password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showWpPassword ? "text" : "password"}
                      value={wpAppPassword}
                      onChange={(e) => setWpAppPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-3.5 pr-9 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWpPassword((v) => !v)}
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showWpPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="h-9 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-5 text-xs font-semibold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onTestConnection(buildPayload())}
                  className="h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  Connection
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onResetMappings()}
                  className="h-9 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 px-3.5 text-xs font-semibold text-slate-500 transition cursor-pointer disabled:opacity-50"
                >
                  Reset Mappings
                </button>
              </div>
            </form>

            {/* Sync Tuning Card (Matches Image 4) */}
            <div className="max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Sliders size={15} className="text-[#7c3aed]" />
                  <span>Sync tuning</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetTuning}
                  className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <p className="text-xs leading-relaxed text-slate-500">
                The defaults suit most stores. Change these only if sync is slow or times out on your hosting. Every value is capped to a safe range, and clearing a field restores its default.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Products batch size (10–100)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    HTTP timeout (5–60s)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={timeoutSec}
                    onChange={(e) => setTimeoutSec(Number(e.target.value))}
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Sync direction
                  </label>
                  <select
                    value={syncDirection}
                    onChange={(e) => setSyncDirection(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                  >
                    <option value="bidirectional">Two-Way (Store ↔ WooCommerce)</option>
                    <option value="woo_to_erp">Pull Only (WooCommerce → Store)</option>
                    <option value="erp_to_woo">Push Only (Store → WooCommerce)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Price mapping
                  </label>
                  <select
                    value={priceTier}
                    onChange={(e) => setPriceTier(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-[#7c3aed]"
                  >
                    <option value="selling_price">Selling Price + Regular as MRP</option>
                    <option value="mrp_only">MRP Only</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1 text-xs text-slate-700">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCreateProducts}
                    onChange={(e) => setAutoCreateProducts(e.target.checked)}
                    className="rounded border-slate-300 text-[#7c3aed]"
                  />
                  <span>Auto-create missing products in store catalog when pulling from WooCommerce</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachWpMedia}
                    onChange={(e) => setAttachWpMedia(e.target.checked)}
                    className="rounded border-slate-300 text-[#7c3aed]"
                  />
                  <span>Attach product images via WordPress Media Library API</span>
                </label>
              </div>

              <div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSaveSettings(buildPayload())}
                  className="h-9 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-5 text-xs font-semibold text-white shadow-2xs transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {/* WooCommerce Sync Guide Card (Exact structure & content from Image 4) */}
            <div className="max-w-4xl rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-6">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                <BookOpen size={16} className="text-blue-600" />
                <span>WooCommerce Sync Guide</span>
              </div>

              {/* Section 1: Getting API keys */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <KeyRound size={14} className="text-blue-600" />
                  <span>Getting API keys</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc">
                  <li>
                    In WooCommerce: <strong className="text-slate-800">WooCommerce → Settings → Advanced → REST API</strong>.
                  </li>
                  <li>
                    Add key, choose <strong className="text-slate-800">Read/Write</strong>, then copy Consumer key and Consumer secret.
                  </li>
                  <li>
                    Store URL is your site URL with no trailing slash (e.g.{" "}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-800">
                      https://yoursite.com
                    </code>
                    ).
                  </li>
                </ul>
              </div>

              {/* Section 2: WP Username and Application Password */}
              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <UserCheck size={14} className="text-blue-600" />
                  <span>WP Username and Application Password (optional)</span>
                </div>
                <p className="leading-relaxed text-slate-500">
                  These fields are used only for product images. The WooCommerce API (Store URL + Consumer key/secret) handles sync for products, stock, categories, brands, customers, and orders; the WordPress REST API handles the Media Library (search and upload images).
                </p>
                <ul className="space-y-1.5 pl-5 list-disc">
                  <li>
                    When syncing products or stock, the system can attach product images: it first searches the WordPress Media Library for an existing image by filename; if not found, it uploads the image via the WordPress API.
                  </li>
                  <li>
                    Use a WordPress user that can manage media (e.g. Administrator). Create an Application Password in WordPress:{" "}
                    <strong className="text-slate-800">Users → Profile (or your user) → Application Passwords</strong> — add a new one and paste it here.
                  </li>
                  <li>
                    If you leave these blank, sync still works for all data (products, stock, categories, brands, customers, orders); only product image attachment (search/upload) is skipped.
                  </li>
                </ul>
              </div>

              {/* Section 3: How to enable */}
              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Settings2 size={14} className="text-emerald-600" />
                  <span>How to enable</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc">
                  <li>Enter Store URL, Consumer key, and Consumer secret above, then click Save.</li>
                  <li>Use Connection (Test Connection) to verify credentials.</li>
                  <li>Use manual sync from any tab when you need to sync.</li>
                </ul>
              </div>

              {/* Section 4: Manual sync (on demand) */}
              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <RefreshCw size={14} className="text-[#7c3aed]" />
                  <span>Manual sync (on demand)</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc">
                  <li>
                    Sync works in both directions: <strong className="text-slate-800">Store → WooCommerce</strong> and{" "}
                    <strong className="text-slate-800">WooCommerce → Store</strong>.
                  </li>
                  <li>
                    Manual sync is available in all WooCommerce tabs (Products, Stock, Category, Brand, Customers, Orders); use the sync actions in each tab to run sync on demand.
                  </li>
                </ul>
              </div>

              {/* Section 5: Scheduled sync (cron) */}
              <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Clock size={14} className="text-blue-600" />
                  <span>Scheduled sync (cron)</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc">
                  <li>
                    <strong className="text-slate-800">Store → WooCommerce</strong> runs on its own: new (not-yet-linked) products every night at 02:00 (
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
                      --scope=products --only-unsynced
                    </code>
                    ) and stock every hour (
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">--scope=stock</code>).
                  </li>
                  <li>
                    <strong className="text-slate-800">WooCommerce → Store</strong> runs too: orders every 15 minutes (
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">--scope=orders</code>, only orders changed since the last run), products at 03:00 (
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">--scope=pull-products</code>) and customers at 03:30 (
                    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">--scope=customers</code>).
                  </li>
                  <li>
                    For this to work, your server needs one cron entry that runs the Laravel scheduler every minute (in cPanel / Cron Jobs or crontab; the same cron also processes queued sync batches):
                  </li>
                </ul>
                <div className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 font-mono text-[11px] text-slate-800 overflow-x-auto">
                  * * * * * cd /path/to/your/app &amp;&amp; php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1
                </div>
                <p className="text-[11px] text-slate-500">
                  You can also run it on demand from the terminal:{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">
                    php artisan woocommerce:sync --scope=products|stock|pull-products|orders|customers
                  </code>{" "}
                  — add <code className="rounded bg-slate-100 px-1 py-0.5 font-mono">--only-unsynced</code> to push only products not yet linked to WooCommerce.
                </p>
              </div>

              {/* Section 6: Notes */}
              <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Info size={14} className="text-amber-500" />
                  <span>Notes</span>
                </div>
                <ul className="space-y-1.5 pl-5 list-disc">
                  <li>
                    Changing Store URL or API keys resets mappings (products, categories, brands, customers). Items will sync again to the (new) store.
                  </li>
                  <li>
                    Keep SKUs consistent between your store and WooCommerce to avoid duplicate products and to link existing items.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 3: PRODUCTS
            ================================================================= */}
        {activeTab === "products" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Product Catalog Sync</h2>
                <p className="text-xs text-slate-500">
                  Import your existing WooCommerce products into this store or push your local catalog to WooCommerce.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void onRunSync({
                      scope: "products",
                      direction: "pull",
                      create_missing: true,
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-3.5 text-xs font-semibold text-white shadow-2xs transition cursor-pointer disabled:opacity-50"
                >
                  <Download size={13} />
                  <span>Pull &amp; Import Products (Woo → Store)</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void onRunSync({
                      scope: "products",
                      direction: "push",
                      only_unsynced: false,
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-300 bg-white hover:bg-violet-50 px-3.5 text-xs font-semibold text-[#7c3aed] transition cursor-pointer disabled:opacity-50"
                >
                  <Upload size={13} />
                  <span>Push All (Store → Woo)</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void onRunSync({
                      scope: "products",
                      direction: "push",
                      only_unsynced: true,
                    })
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  <span>Push Unsynced ({data.stats.unsynced_products})</span>
                </button>

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
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition cursor-pointer disabled:opacity-50"
                >
                  <span>Dry Run</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search SKU, product name, or category..."
                  className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#7c3aed]"
                />
              </div>

              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {(
                  [
                    { id: "all", label: `All (${data.stats.local_products})` },
                    { id: "synced", label: `Synced (${data.stats.synced_products})` },
                    { id: "unsynced", label: `Not Synced (${data.stats.unsynced_products})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setProductSyncFilter(f.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                      productSyncFilter === f.id
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Selling Price</th>
                    <th className="px-4 py-3">On-Hand Stock</th>
                    <th className="px-4 py-3">WooCommerce Link</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No products match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">
                          {item.sku}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-4 py-2.5 text-slate-500">{item.category_name}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">
                          {formatInr(item.selling_price_paise)}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{item.on_hand}</td>
                        <td className="px-4 py-2.5">
                          {item.synced ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 size={11} /> Synced (#{item.remote_id})
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              Not synced
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void onRunSync({
                                scope: "products",
                                direction: "push",
                                item_id: item.id,
                              })
                            }
                            className="rounded-md border border-slate-200 bg-white hover:border-[#7c3aed] hover:text-[#7c3aed] px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition cursor-pointer"
                          >
                            Sync Item
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 4: STOCK
            ================================================================= */}
        {activeTab === "stock" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Inventory &amp; Stock Level Sync</h2>
                <p className="text-xs text-slate-500">
                  Keep stock quantities synchronized between your store warehouse and WooCommerce.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRunSync({ scope: "stock", direction: "push" })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-3.5 text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50"
                >
                  <Upload size={13} />
                  <span>Push Stock to WooCommerce</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRunSync({ scope: "stock", direction: "pull" })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  <Download size={13} />
                  <span>Pull Stock from WooCommerce</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Store On-Hand Qty</th>
                    <th className="px-4 py-3">Link Status</th>
                    <th className="px-4 py-3">Last Synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.entities.products ?? []).slice(0, 60).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">{item.sku}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{item.on_hand}</td>
                      <td className="px-4 py-2.5">
                        {item.synced ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Linked
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                            Unlinked
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

        {/* =================================================================
            TAB 5: CATEGORY
            ================================================================= */}
        {activeTab === "category" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Categories Mapping &amp; Sync</h2>
                <p className="text-xs text-slate-500">
                  Total Categories: <strong>{data.stats.local_categories}</strong> · Synced:{" "}
                  <strong className="text-emerald-600">{data.stats.synced_categories}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRunSync({ scope: "categories", direction: "pull" })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-3.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                >
                  <Download size={13} />
                  <span>Pull Categories (Woo → Store)</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRunSync({ scope: "categories", direction: "push" })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <Upload size={13} />
                  <span>Push Categories (Store → Woo)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Category Name</th>
                    <th className="px-4 py-3">Products Count</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remote ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entities.categories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No categories found.
                      </td>
                    </tr>
                  ) : (
                    data.entities.categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-mono text-slate-600">{cat.code}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{cat.name}</td>
                        <td className="px-4 py-2.5 text-slate-700">{cat.products_count}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              cat.synced
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {cat.synced ? "Synced" : "Not synced"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {cat.remote_id || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 6: BRAND
            ================================================================= */}
        {activeTab === "brand" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Brands Mapping &amp; Sync</h2>
                <p className="text-xs text-slate-500">
                  Total Brands: <strong>{data.stats.local_brands}</strong> · Synced:{" "}
                  <strong className="text-emerald-600">{data.stats.synced_brands}</strong>
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onRunSync({ scope: "brands", direction: "push" })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-4 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} />
                <span>Sync Brands with WooCommerce</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Brand Name</th>
                    <th className="px-4 py-3">Products Count</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remote ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entities.brands.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No brands found in store.
                      </td>
                    </tr>
                  ) : (
                    data.entities.brands.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{b.name}</td>
                        <td className="px-4 py-2.5 text-slate-700">{b.products_count}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              b.synced
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {b.synced ? "Synced" : "Not synced"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">
                          {b.remote_id || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 7: CUSTOMERS
            ================================================================= */}
        {activeTab === "customers" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Customers Synchronization</h2>
                <p className="text-xs text-slate-500">
                  Store Customers: <strong>{data.stats.local_customers}</strong> · Synced:{" "}
                  <strong className="text-emerald-600">{data.stats.synced_customers}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRunSync({ scope: "customers", direction: "pull" })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-3.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                >
                  <Download size={13} />
                  <span>Pull Customers (Woo → Store)</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRunSync({ scope: "customers", direction: "push" })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
                >
                  <Upload size={13} />
                  <span>Push Customers (Store → Woo)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Customer Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entities.customers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No customers in store yet.
                      </td>
                    </tr>
                  ) : (
                    data.entities.customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{c.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{c.phone}</td>
                        <td className="px-4 py-2.5 text-slate-500">{c.email}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              c.synced
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {c.synced ? "Synced" : "Not synced"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 8: ORDERS
            ================================================================= */}
        {activeTab === "orders" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">WooCommerce Order Import</h2>
                <p className="text-xs text-slate-500">
                  Pull orders placed on your WooCommerce storefront directly into your store order queue.
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onRunSync({ scope: "orders", direction: "pull" })}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] px-4 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                <Download size={13} />
                <span>Pull Orders (Woo → Store)</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Order Status</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.entities.orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No orders available.
                      </td>
                    </tr>
                  ) : (
                    data.entities.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                          {o.number}
                        </td>
                        <td className="px-4 py-2.5 text-slate-800">{o.customer_name}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">
                          {formatInr(o.total_paise)}
                        </td>
                        <td className="px-4 py-2.5 capitalize text-slate-600">{o.status}</td>
                        <td className="px-4 py-2.5 capitalize text-slate-600">
                          {o.payment_status}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{o.created_at}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 9: LOGS
            ================================================================= */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {(
                  [
                    { id: "all", label: "All Events" },
                    { id: "ok", label: "Successful" },
                    { id: "error", label: "Errors" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setLogFilter(f.id)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition cursor-pointer ${
                      logFilter === f.id
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {data.logs.length > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onClearLogs()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 px-3 py-1.5 text-xs font-semibold text-slate-600 transition cursor-pointer"
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
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No data Available
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
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
      </div>
    </div>
  );
}
