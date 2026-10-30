"use client";

import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Info,
  KeyRound,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
  Users,
  Webhook,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { WooIntegrationData } from "./woocommerce-view";

export type ChannelProviderId = "telegram" | "whatsapp" | "webhooks" | "google_sheets";

type ChannelTab = "status" | "settings" | "actions" | "guide" | "logs";

interface ProviderMeta {
  id: ChannelProviderId;
  title: string;
  subtitle: string;
  category: string;
  badgeColor: string;
  actionTabLabel: string;
  description: string;
}

const PROVIDER_META: Record<ChannelProviderId, ProviderMeta> = {
  telegram: {
    id: "telegram",
    title: "Telegram Bot Integration",
    subtitle: "Send instant order notifications, low-stock alerts, and daily store summaries to Telegram",
    category: "Automation & Messaging",
    badgeColor: "bg-[#e0f2fe] text-[#0284c7]",
    actionTabLabel: "Alerts & Snapshots",
    description:
      "Connect your @BotFather Telegram Bot to broadcast real-time POS & online order alerts, payment confirmations, and inventory snapshots to your private chat, staff group, or channel.",
  },
  whatsapp: {
    id: "whatsapp",
    title: "WhatsApp Business Cloud API",
    subtitle: "Deliver automated order notifications and staff alerts via Meta WhatsApp Cloud API",
    category: "Automation & Messaging",
    badgeColor: "bg-[#dcfce7] text-[#16a34a]",
    actionTabLabel: "Dispatch & Templates",
    description:
      "Connect your Meta WhatsApp Business Account (WABA) and Phone Number ID to send instant customer receipts, fulfillment updates, and staff order notifications directly over WhatsApp.",
  },
  webhooks: {
    id: "webhooks",
    title: "Outgoing Webhooks (HMAC-SHA256)",
    subtitle: "Stream signed JSON event payloads to n8n, Zapier, Make, or your own backend server",
    category: "Automation & Messaging",
    badgeColor: "bg-[#f3e8ff] text-[#7c3aed]",
    actionTabLabel: "Event Dispatcher",
    description:
      "Deliver real-time HTTP POST requests signed with an HMAC-SHA256 header (X-SelfX-Signature) whenever orders are placed, inventory changes, or catalog updates occur.",
  },
  google_sheets: {
    id: "google_sheets",
    title: "Google Sheets Live Sync",
    subtitle: "Append live orders and export store products & customers to Google Spreadsheets",
    category: "Accounting & Data",
    badgeColor: "bg-[#dcfce7] text-[#15803d]",
    actionTabLabel: "Live Sheet Export",
    description:
      "Authenticate with a Google Cloud Service Account to automatically append every store order to a live Google Sheet and export products, stock balances, and customers on demand.",
  },
};

function formatInr(paise: number): string {
  return `₹${((paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function ChannelIntegrationView({
  provider,
  data,
  activity14d,
  onSaveSettings,
  onTestConnection,
  onRunSync,
  onClearLogs,
  busy,
  notice,
}: {
  provider: ChannelProviderId;
  data: WooIntegrationData;
  activity14d: { date: string; runs: number; records_synced: number }[];
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
  onClearLogs: () => Promise<void>;
  busy: boolean;
  notice: { type: "ok" | "error"; text: string } | null;
}) {
  const meta = PROVIDER_META[provider];
  const [activeTab, setActiveTab] = useState<ChannelTab>("status");

  // Shared Secret Masking Helper
  const hasSecret = (key: string) => Boolean(data.integration.secret_keys?.includes(key));

  // Telegram State
  const [tgBotToken, setTgBotToken] = useState(hasSecret("bot_token") ? "••••••••••••••••" : "");
  const [tgChatId, setTgChatId] = useState(
    data.integration.fields?.chat_id ?? (hasSecret("chat_id") ? "••••••••••••••••" : ""),
  );
  const [tgThreadId, setTgThreadId] = useState(data.integration.fields?.thread_id ?? "");
  const [tgParseMode, setTgParseMode] = useState(data.integration.fields?.parse_mode ?? "HTML");
  const [showTgToken, setShowTgToken] = useState(false);

  // WhatsApp State
  const [waPhoneId, setWaPhoneId] = useState(data.integration.fields?.phone_number_id ?? "");
  const [waWabaId, setWaWabaId] = useState(data.integration.fields?.waba_id ?? "");
  const [waAccessToken, setWaAccessToken] = useState(
    hasSecret("access_token") ? "••••••••••••••••" : "",
  );
  const [waNotifyPhone, setWaNotifyPhone] = useState(data.integration.fields?.notify_phone ?? "");
  const [waApiVersion, setWaApiVersion] = useState(
    data.integration.fields?.api_version ?? "v20.0",
  );
  const [showWaToken, setShowWaToken] = useState(false);

  // Webhooks State
  const [whUrl, setWhUrl] = useState(data.integration.fields?.url ?? "");
  const [whSecret, setWhSecret] = useState(
    hasSecret("signing_secret") ? "••••••••••••••••" : "",
  );
  const [whHeaderName, setWhHeaderName] = useState(
    data.integration.fields?.header_name ?? "X-SelfX-Signature",
  );
  const [whTimeoutSec, setWhTimeoutSec] = useState(
    data.integration.fields?.timeout_seconds ?? "10",
  );
  const [showWhSecret, setShowWhSecret] = useState(false);

  // Google Sheets State
  const [gsSpreadsheetId, setGsSpreadsheetId] = useState(
    data.integration.fields?.spreadsheet_id ?? "",
  );
  const [gsOrdersTab, setGsOrdersTab] = useState(data.integration.fields?.tab ?? "Orders");
  const [gsProductsTab, setGsProductsTab] = useState(
    data.integration.fields?.products_tab ?? "Products",
  );
  const [gsCustomersTab, setGsCustomersTab] = useState(
    data.integration.fields?.customers_tab ?? "Customers",
  );
  const [gsClientEmail, setGsClientEmail] = useState(
    data.integration.fields?.client_email ??
      (hasSecret("client_email") ? "••••••••••••••••" : ""),
  );
  const [gsPrivateKey, setGsPrivateKey] = useState(
    hasSecret("private_key") ? "••••••••••••••••" : "",
  );
  const [showGsKey, setShowGsKey] = useState(false);

  // Event Subscriptions & Trigger Tuning
  const [eventOrderPlaced, setEventOrderPlaced] = useState<boolean>(
    data.integration.tuning?.event_order_placed ?? true,
  );
  const [eventOrderStatus, setEventOrderStatus] = useState<boolean>(
    data.integration.tuning?.event_order_status ?? true,
  );
  const [eventLowStock, setEventLowStock] = useState<boolean>(
    data.integration.tuning?.event_low_stock ?? true,
  );
  const [eventDailyDigest, setEventDailyDigest] = useState<boolean>(
    data.integration.tuning?.event_daily_digest ?? false,
  );
  const [eventProductUpdated, setEventProductUpdated] = useState<boolean>(
    data.integration.tuning?.event_product_updated ?? true,
  );
  const [includeLineItems, setIncludeLineItems] = useState<boolean>(
    data.integration.tuning?.include_line_items ?? true,
  );
  const [includeCustomerPii, setIncludeCustomerPii] = useState<boolean>(
    data.integration.tuning?.include_customer_pii ?? true,
  );

  // Logs Filter
  const [logSearch, setLogSearch] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState<"all" | "ok" | "error">("all");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const isConnected = data.integration.status === "connected";
  const hasError = data.integration.status === "error" || Boolean(data.integration.last_error);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return (data.logs ?? []).filter((log) => {
      if (logStatusFilter !== "all" && log.status !== logStatusFilter) return false;
      if (!q) return true;
      return (
        log.action.toLowerCase().includes(q) ||
        log.message.toLowerCase().includes(q) ||
        log.direction.toLowerCase().includes(q)
      );
    });
  }, [data.logs, logSearch, logStatusFilter]);

  function buildPayload() {
    const fields: Record<string, string> = {};
    const secrets: Record<string, string> = {};

    if (provider === "telegram") {
      fields.chat_id = tgChatId.trim();
      fields.thread_id = tgThreadId.trim();
      fields.parse_mode = tgParseMode;
      if (tgBotToken && !tgBotToken.includes("••••")) {
        secrets.bot_token = tgBotToken.trim();
      }
      if (tgChatId && !tgChatId.includes("••••")) {
        secrets.chat_id = tgChatId.trim();
      }
    } else if (provider === "whatsapp") {
      fields.phone_number_id = waPhoneId.trim();
      fields.waba_id = waWabaId.trim();
      fields.notify_phone = waNotifyPhone.trim();
      fields.api_version = waApiVersion.trim() || "v20.0";
      if (waAccessToken && !waAccessToken.includes("••••")) {
        secrets.access_token = waAccessToken.trim();
      }
    } else if (provider === "webhooks") {
      fields.url = whUrl.trim();
      fields.header_name = whHeaderName.trim() || "X-SelfX-Signature";
      fields.timeout_seconds = whTimeoutSec.trim() || "10";
      if (whSecret && !whSecret.includes("••••")) {
        secrets.signing_secret = whSecret.trim();
      }
    } else if (provider === "google_sheets") {
      fields.spreadsheet_id = gsSpreadsheetId.trim();
      fields.tab = gsOrdersTab.trim() || "Orders";
      fields.products_tab = gsProductsTab.trim() || "Products";
      fields.customers_tab = gsCustomersTab.trim() || "Customers";
      if (gsClientEmail && !gsClientEmail.includes("••••")) {
        fields.client_email = gsClientEmail.trim();
        secrets.client_email = gsClientEmail.trim();
      }
      if (gsPrivateKey && !gsPrivateKey.includes("••••")) {
        secrets.private_key = gsPrivateKey.trim();
      }
    }

    const tuning = {
      event_order_placed: eventOrderPlaced,
      event_order_status: eventOrderStatus,
      event_low_stock: eventLowStock,
      event_daily_digest: eventDailyDigest,
      event_product_updated: eventProductUpdated,
      include_line_items: includeLineItems,
      include_customer_pii: includeCustomerPii,
    };

    return { fields, secrets, tuning };
  }

  function handleServiceAccountJsonUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? "{}"));
        if (parsed.client_email) setGsClientEmail(String(parsed.client_email));
        if (parsed.private_key) setGsPrivateKey(String(parsed.private_key));
      } catch {
        // ignore invalid JSON file
      }
    };
    reader.readAsText(file);
  }

  function generateWebhookSecret() {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setWhSecret(`whsec_${hex}`);
    setShowWhSecret(true);
  }

  function copyToClipboard(label: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  }

  const tabs: { id: ChannelTab; label: string }[] = [
    { id: "status", label: "Status" },
    { id: "settings", label: "Settings" },
    { id: "actions", label: meta.actionTabLabel },
    { id: "guide", label: "Guide" },
    { id: "logs", label: "Logs" },
  ];

  // Sample real webhook payload preview built from real store data
  const sampleWebhookPayload = useMemo(() => {
    const firstOrder = data.entities.orders?.[0];
    const firstProduct = data.entities.products?.[0];
    return JSON.stringify(
      {
        event: "order.placed",
        provider: "selfx_pos",
        timestamp: new Date().toISOString(),
        store: {
          id: data.store?.id ?? "store_live",
          name: data.store?.name ?? "Retail Store",
          code: data.store?.code ?? "MAIN",
        },
        data: firstOrder
          ? {
              order_id: firstOrder.id,
              order_number: firstOrder.number,
              status: firstOrder.status,
              payment_status: firstOrder.payment_status,
              total_inr: (firstOrder.total_paise / 100).toFixed(2),
              customer: {
                name: firstOrder.customer_name,
                phone: firstOrder.customer_phone,
              },
            }
          : {
              catalog_items_count: data.stats.local_products,
              sample_sku: firstProduct?.sku ?? "SKU-001",
              sample_product: firstProduct?.name ?? "Store Item",
            },
      },
      null,
      2,
    );
  }, [data]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{meta.title}</h1>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/integrations" className="font-medium text-[#7c3aed] hover:underline">
              Integrations
            </Link>
            <span>-</span>
            <span>{meta.category}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isConnected
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : hasError
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500" : hasError ? "bg-rose-500" : "bg-slate-400"
              }`}
            />
            {isConnected ? "Connected" : hasError ? "Attention needed" : "Not connected"}
          </span>

          <Link
            href="/integrations"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            ← Back to Integrations
          </Link>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-xs">
        {/* Horizontal Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-100 pb-5">
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-[#7c3aed] text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Notice Banner */}
        {notice && (
          <div
            className={`mt-5 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-xs font-medium ${
              notice.type === "ok"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                : "border-rose-200 bg-rose-50/80 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{notice.text}</span>
            </div>
          </div>
        )}

        {/* ==================== TAB 1: STATUS ==================== */}
        {activeTab === "status" && (
          <div className="mt-6 space-y-6">
            {/* Connection Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isConnected ? "bg-emerald-500" : hasError ? "bg-rose-500" : "bg-amber-500"
                    }`}
                  />
                  <h2 className="text-sm font-semibold text-slate-900">
                    {isConnected
                      ? `${meta.title} is active and verified`
                      : hasError
                        ? "Connection test reported an error"
                        : `${meta.title} is not configured yet`}
                  </h2>
                </div>
                <p className="text-xs text-slate-500">{meta.description}</p>
                {data.integration.last_error && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">
                    Last error: {data.integration.last_error}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onTestConnection(buildPayload())}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                  Test Connection
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("settings")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#7c3aed] bg-[#7c3aed] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#6d28d9]"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configure Settings
                </button>
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Store Products</span>
                  <Package className="h-4 w-4 text-[#7c3aed]" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {data.stats.local_products}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {data.stats.local_categories} categories · {data.stats.local_brands} brands
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Store Orders</span>
                  <ShoppingBag className="h-4 w-4 text-sky-600" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {data.stats.local_orders}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {data.stats.local_customers} registered customers
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Dispatches (30 days)</span>
                  <Send className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {data.stats.syncs_30d}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {data.stats.syncs_7d} in last 7 days · {data.stats.errors_7d} errors
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Last Activity</span>
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {data.integration.last_synced_at
                    ? new Date(data.integration.last_synced_at).toLocaleString()
                    : "Never dispatched"}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Tested:{" "}
                  {data.integration.last_tested_at
                    ? new Date(data.integration.last_tested_at).toLocaleString()
                    : "Never"}
                </div>
              </div>
            </div>

            {/* Remote Verification Info + 14-day Activity */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Connection & Endpoint Summary
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Live parameters verified against the remote provider API
                </p>

                <dl className="mt-4 divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500">Store Context</dt>
                    <dd className="font-medium text-slate-900">
                      {data.store?.name ?? "Primary Store"} ({data.store?.code ?? "MAIN"})
                    </dd>
                  </div>

                  {provider === "telegram" && (
                    <>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Verified Bot Username</dt>
                        <dd className="font-mono font-medium text-slate-900">
                          {data.integration.remote?.bot
                            ? `@${data.integration.remote.bot}`
                            : "Not verified yet"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Target Chat / Channel ID</dt>
                        <dd className="font-mono font-medium text-slate-900">
                          {tgChatId || "Not set"}
                        </dd>
                      </div>
                    </>
                  )}

                  {provider === "whatsapp" && (
                    <>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Phone Number ID</dt>
                        <dd className="font-mono font-medium text-slate-900">
                          {waPhoneId || "Not set"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Display Phone / Verified Name</dt>
                        <dd className="font-medium text-slate-900">
                          {data.integration.remote?.verified_name
                            ? `${data.integration.remote.verified_name} (${data.integration.remote.display_phone_number ?? ""})`
                            : "Run Test Connection to verify"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Staff Alert Recipient</dt>
                        <dd className="font-mono font-medium text-slate-900">
                          {waNotifyPhone || "Not set"}
                        </dd>
                      </div>
                    </>
                  )}

                  {provider === "webhooks" && (
                    <>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Destination Endpoint URL</dt>
                        <dd className="max-w-[260px] truncate font-mono font-medium text-slate-900">
                          {whUrl || "Not configured"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Signature Header</dt>
                        <dd className="font-mono font-medium text-slate-900">
                          {whHeaderName} (HMAC-SHA256)
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Last HTTP Response Code</dt>
                        <dd className="font-mono font-medium text-slate-900">
                          {data.integration.remote?.status ?? "—"}
                        </dd>
                      </div>
                    </>
                  )}

                  {provider === "google_sheets" && (
                    <>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Spreadsheet ID</dt>
                        <dd className="max-w-[260px] truncate font-mono font-medium text-slate-900">
                          {gsSpreadsheetId || "Not configured"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Spreadsheet Title</dt>
                        <dd className="font-medium text-slate-900">
                          {data.integration.remote?.title ?? "Run Test Connection to fetch title"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-slate-500">Target Tabs</dt>
                        <dd className="font-mono text-slate-800">
                          {gsOrdersTab}, {gsProductsTab}, {gsCustomersTab}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
              </div>

              {/* 14-day Activity Area & Line Chart */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Sync & Dispatch Activity (Last 14 Days)
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Real execution count from integration logs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("actions")}
                    className="text-xs font-semibold text-[#7c3aed] hover:underline"
                  >
                    Open {meta.actionTabLabel} →
                  </button>
                </div>

                {(() => {
                  const series =
                    (activity14d ?? []).length > 0
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
                  const maxVal = Math.max(
                    4,
                    Math.ceil(
                      Math.max(0, ...series.map((s) => Math.max(s.runs, s.records_synced))) / 4,
                    ) * 4,
                  );
                  const svgW = 520;
                  const svgH = 148;
                  const padL = 28;
                  const padR = 12;
                  const padT = 12;
                  const padB = 26;
                  const plotW = svgW - padL - padR;
                  const plotH = svgH - padT - padB;
                  const stepX = series.length > 1 ? plotW / (series.length - 1) : plotW;
                  const baselineY = padT + plotH;

                  const pts = series.map((d, i) => ({
                    x: padL + i * stepX,
                    y: padT + plotH - Math.min(1, (d.runs + d.records_synced) / maxVal) * plotH,
                    label: d.date.slice(5),
                    val: d.runs + d.records_synced,
                  }));

                  let linePath = pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
                  for (let i = 0; i < pts.length - 1; i++) {
                    const cpx = (pts[i].x + pts[i + 1].x) / 2;
                    linePath += ` C ${cpx} ${pts[i].y}, ${cpx} ${pts[i + 1].y}, ${pts[i + 1].x} ${pts[i + 1].y}`;
                  }
                  const areaPath =
                    pts.length > 1
                      ? `${linePath} L ${pts[pts.length - 1].x} ${baselineY} L ${pts[0].x} ${baselineY} Z`
                      : "";

                  return (
                    <div className="mt-4">
                      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-36 w-full select-none">
                        <defs>
                          <linearGradient id="channelActGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.24" />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {[1, 0.5, 0].map((r, idx) => {
                          const y = padT + (1 - r) * plotH;
                          return (
                            <g key={idx}>
                              <text
                                x={padL - 6}
                                y={y + 3}
                                textAnchor="end"
                                className="fill-slate-400 text-[9px]"
                              >
                                {Math.round(maxVal * r)}
                              </text>
                              <line
                                x1={padL}
                                y1={y}
                                x2={svgW - padR}
                                y2={y}
                                stroke={idx === 2 ? "#e2e8f0" : "#f1f5f9"}
                                strokeDasharray={idx === 2 ? undefined : "3 3"}
                              />
                            </g>
                          );
                        })}
                        {areaPath && <path d={areaPath} fill="url(#channelActGrad)" />}
                        {linePath && (
                          <path
                            d={linePath}
                            fill="none"
                            stroke="#7c3aed"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        )}
                        {pts.map((p, i) => (
                          <g key={i}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="2.75"
                              className="fill-white stroke-[#7c3aed]"
                              strokeWidth="1.75"
                            >
                              <title>{`${series[i].date}: ${p.val} events`}</title>
                            </circle>
                            {(i % 2 === 0 || i === pts.length - 1) && (
                              <text
                                x={p.x}
                                y={baselineY + 16}
                                textAnchor="middle"
                                className="fill-slate-400 text-[9px]"
                              >
                                {p.label}
                              </text>
                            )}
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: SETTINGS ==================== */}
        {activeTab === "settings" && (
          <div className="mt-6 space-y-6">
            {/* Provider-Specific Credentials Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {meta.title} Credentials
                  </h2>
                  <p className="text-xs text-slate-500">
                    Secrets are encrypted at rest and never exposed in plain text after saving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("guide")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7c3aed] hover:underline"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  How to get credentials?
                </button>
              </div>

              {/* TELEGRAM FIELDS */}
              {provider === "telegram" && (
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Telegram Bot Token <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type={showTgToken ? "text" : "password"}
                        value={tgBotToken}
                        onChange={(e) => setTgBotToken(e.target.value)}
                        placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTgToken((v) => !v)}
                        className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showTgToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Generated via <span className="font-mono">@BotFather</span> on Telegram using{" "}
                      <span className="font-mono">/newbot</span>.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Target Chat ID / Channel ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tgChatId}
                      onChange={(e) => setTgChatId(e.target.value)}
                      placeholder="-100192837465 or 987654321"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Group/channel IDs start with <span className="font-mono">-100</span>. Make
                      sure your bot is added as an Admin.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Forum Topic / Message Thread ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={tgThreadId}
                      onChange={(e) => setTgThreadId(e.target.value)}
                      placeholder="e.g. 42 (for supergroup topics)"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Message Formatting Mode
                    </label>
                    <select
                      value={tgParseMode}
                      onChange={(e) => setTgParseMode(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                    >
                      <option value="HTML">HTML (Recommended)</option>
                      <option value="Markdown">Markdown</option>
                      <option value="Plain">Plain Text</option>
                    </select>
                  </div>
                </div>
              )}

              {/* WHATSAPP FIELDS */}
              {provider === "whatsapp" && (
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Phone Number ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={waPhoneId}
                      onChange={(e) => setWaPhoneId(e.target.value)}
                      placeholder="e.g. 109283746512345"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Found in Meta Developer Portal → WhatsApp → API Setup.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      WhatsApp Business Account (WABA) ID
                    </label>
                    <input
                      type="text"
                      value={waWabaId}
                      onChange={(e) => setWaWabaId(e.target.value)}
                      placeholder="e.g. 102938475610293"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Permanent System User Access Token <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        type={showWaToken ? "text" : "password"}
                        value={waAccessToken}
                        onChange={(e) => setWaAccessToken(e.target.value)}
                        placeholder="EAAGm0PX4ZCpsBA..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaToken((v) => !v)}
                        className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      System user token with <span className="font-mono">whatsapp_business_messaging</span> permission.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Staff Alert Phone Number (with Country Code){" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={waNotifyPhone}
                      onChange={(e) => setWaNotifyPhone(e.target.value)}
                      placeholder="e.g. 919876543210"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Digits only including country code (no + or spaces).
                    </p>
                  </div>
                </div>
              )}

              {/* WEBHOOKS FIELDS */}
              {provider === "webhooks" && (
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Destination Endpoint URL (HTTPS) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={whUrl}
                      onChange={(e) => setWhUrl(e.target.value)}
                      placeholder="https://hooks.zapier.com/hooks/catch/... or https://api.yourdomain.com/webhooks/selfx"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        HMAC-SHA256 Signing Secret
                      </label>
                      <button
                        type="button"
                        onClick={generateWebhookSecret}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7c3aed] hover:underline"
                      >
                        <KeyRound className="h-3 w-3" />
                        Generate Secret
                      </button>
                    </div>
                    <div className="relative mt-1.5">
                      <input
                        type={showWhSecret ? "text" : "password"}
                        value={whSecret}
                        onChange={(e) => setWhSecret(e.target.value)}
                        placeholder="whsec_..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 font-mono text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWhSecret((v) => !v)}
                        className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showWhSecret ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Used to compute the hex HMAC-SHA256 digest of the raw request body.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Signature Header Name
                    </label>
                    <input
                      type="text"
                      value={whHeaderName}
                      onChange={(e) => setWhHeaderName(e.target.value)}
                      placeholder="X-SelfX-Signature"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* GOOGLE SHEETS FIELDS */}
              {provider === "google_sheets" && (
                <div className="mt-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3.5">
                    <div className="flex items-center gap-2.5 text-xs text-indigo-950">
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#7c3aed]" />
                      <span>
                        Have a Google Cloud Service Account JSON key file? Upload it to auto-fill{" "}
                        <span className="font-mono font-semibold">client_email</span> and{" "}
                        <span className="font-mono font-semibold">private_key</span>.
                      </span>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#7c3aed] bg-white px-3 py-1.5 text-xs font-semibold text-[#7c3aed] shadow-2xs transition hover:bg-indigo-50">
                      <Upload className="h-3.5 w-3.5" />
                      Upload JSON Key
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleServiceAccountJsonUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Google Spreadsheet ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={gsSpreadsheetId}
                        onChange={(e) => setGsSpreadsheetId(e.target.value)}
                        placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Copied from your sheet URL:{" "}
                        <span className="font-mono">
                          https://docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
                        </span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Orders Worksheet Tab Name
                      </label>
                      <input
                        type="text"
                        value={gsOrdersTab}
                        onChange={(e) => setGsOrdersTab(e.target.value)}
                        placeholder="Orders"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Products Tab Name
                        </label>
                        <input
                          type="text"
                          value={gsProductsTab}
                          onChange={(e) => setGsProductsTab(e.target.value)}
                          placeholder="Products"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Customers Tab Name
                        </label>
                        <input
                          type="text"
                          value={gsCustomersTab}
                          onChange={(e) => setGsCustomersTab(e.target.value)}
                          placeholder="Customers"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Service Account Email (<span className="font-mono">client_email</span>){" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <div className="mt-1.5 flex gap-2">
                        <input
                          type="text"
                          value={gsClientEmail}
                          onChange={(e) => setGsClientEmail(e.target.value)}
                          placeholder="selfx-sync@your-project.iam.gserviceaccount.com"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                        />
                        {gsClientEmail && !gsClientEmail.includes("••••") && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard("email", gsClientEmail)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedText === "email" ? "Copied" : "Copy"}
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Important: Click <strong>Share</strong> in your Google Sheet and grant{" "}
                        <strong>Editor</strong> access to this email address.
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                          Service Account Private Key PEM (<span className="font-mono">private_key</span>){" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowGsKey((v) => !v)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
                        >
                          {showGsKey ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" /> Hide PEM
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" /> Show PEM
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        rows={showGsKey ? 5 : 2}
                        value={gsPrivateKey}
                        onChange={(e) => setGsPrivateKey(e.target.value)}
                        placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Event Triggers & Automation Rules Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-base font-semibold text-slate-900">
                Automatic Event Triggers & Payload Rules
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Choose which real-time store events automatically trigger this integration
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50/60">
                  <input
                    type="checkbox"
                    checked={eventOrderPlaced}
                    onChange={(e) => setEventOrderPlaced(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#7c3aed]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">New Order Placed</div>
                    <div className="text-[11px] text-slate-500">
                      Trigger immediately when a POS or Online Store order is created
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50/60">
                  <input
                    type="checkbox"
                    checked={eventOrderStatus}
                    onChange={(e) => setEventOrderStatus(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#7c3aed]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Order Status / Fulfillment Change
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Trigger when an order moves to Confirmed, Out for Delivery, or Completed
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50/60">
                  <input
                    type="checkbox"
                    checked={eventLowStock}
                    onChange={(e) => setEventLowStock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#7c3aed]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">Low Stock Threshold</div>
                    <div className="text-[11px] text-slate-500">
                      Alert when a store product balance drops below reorder level
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50/60">
                  <input
                    type="checkbox"
                    checked={eventProductUpdated}
                    onChange={(e) => setEventProductUpdated(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#7c3aed]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Catalog & Price Updates
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Sync when new items are added or selling prices change
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50/60">
                  <input
                    type="checkbox"
                    checked={includeLineItems}
                    onChange={(e) => setIncludeLineItems(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#7c3aed]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Include Itemized Line Details
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Attach SKUs, quantities, and unit prices to order payloads
                    </div>
                  </div>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50/60">
                  <input
                    type="checkbox"
                    checked={includeCustomerPii}
                    onChange={(e) => setIncludeCustomerPii(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#7c3aed]"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Include Customer Contact Info
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Include customer name, phone number, and delivery address
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSaveSettings(buildPayload())}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#6d28d9] disabled:opacity-50"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onTestConnection(buildPayload())}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                  Save & Test Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: LIVE ACTIONS & EXPORT ==================== */}
        {activeTab === "actions" && (
          <div className="mt-6 space-y-6">
            {provider === "google_sheets" ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Export Products Card */}
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-[#7c3aed]">
                          <Package className="h-5 w-5" />
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {data.stats.local_products} items
                        </span>
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-900">
                        Export Store Products & Stock
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Append all {data.stats.local_products} store products (SKU, Name, Category,
                        Brand, Selling Price, MRP, On-Hand Stock) to your{" "}
                        <span className="font-mono font-semibold text-slate-700">
                          {gsProductsTab || "Products"}
                        </span>{" "}
                        sheet tab.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void onRunSync({ scope: "products", direction: "push", dry_run: false })
                      }
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#6d28d9] disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Export Products to Sheet
                    </button>
                  </div>

                  {/* Export Orders Card */}
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          <ShoppingBag className="h-5 w-5" />
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {data.stats.local_orders} orders
                        </span>
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-900">
                        Sync Store Orders to Sheet
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Push recent store orders (Order #, Timestamp, Customer, Phone, Payment
                        Status, Total INR) to your{" "}
                        <span className="font-mono font-semibold text-slate-700">
                          {gsOrdersTab || "Orders"}
                        </span>{" "}
                        worksheet tab.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void onRunSync({ scope: "orders", direction: "push", dry_run: false })
                      }
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Export Orders to Sheet
                    </button>
                  </div>

                  {/* Export Customers Card */}
                  <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                          <Users className="h-5 w-5" />
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {data.stats.local_customers} customers
                        </span>
                      </div>
                      <h3 className="mt-4 text-sm font-semibold text-slate-900">
                        Export Customer Directory
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Export your store customer list (Name, Phone, Email, Created Date) to your{" "}
                        <span className="font-mono font-semibold text-slate-700">
                          {gsCustomersTab || "Customers"}
                        </span>{" "}
                        sheet tab.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void onRunSync({ scope: "customers", direction: "push", dry_run: false })
                      }
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Export Customers to Sheet
                    </button>
                  </div>
                </div>

                {/* Live Preview of Rows to be Exported */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Live Store Catalog Preview ({data.entities.products.length} rows ready)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Exact columns appended during Google Sheets catalog export
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                          <th className="py-2.5 pr-4">SKU</th>
                          <th className="py-2.5 pr-4">Product Name</th>
                          <th className="py-2.5 pr-4">Category</th>
                          <th className="py-2.5 pr-4">Selling Price</th>
                          <th className="py-2.5 pr-4">On Hand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.entities.products.slice(0, 8).map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 pr-4 font-mono text-slate-700">{item.sku}</td>
                            <td className="py-2.5 pr-4 font-medium text-slate-900">{item.name}</td>
                            <td className="py-2.5 pr-4 text-slate-600">{item.category_name}</td>
                            <td className="py-2.5 pr-4 font-medium text-slate-900">
                              {formatInr(item.selling_price_paise)}
                            </td>
                            <td className="py-2.5 pr-4 font-semibold text-slate-800">
                              {item.on_hand}
                            </td>
                          </tr>
                        ))}
                        {data.entities.products.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">
                              No products in this store yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* TELEGRAM / WHATSAPP / WEBHOOKS LIVE DISPATCH */
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Manual Live Dispatch Actions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Trigger an immediate live payload using your store’s real database metrics to
                    verify end-to-end delivery.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          Send Live Store Summary Snapshot
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Dispatches current catalog count ({data.stats.local_products} items) &
                          order count ({data.stats.local_orders} orders)
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void onRunSync({ scope: "all", direction: "push", dry_run: false })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#7c3aed] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Dispatch Now
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          Send Latest Order Alert
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Dispatches the most recent store order details to the configured endpoint
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void onRunSync({ scope: "orders", direction: "push", dry_run: false })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Bell className="h-3.5 w-3.5 text-[#7c3aed]" />
                        Send Order Alert
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          Run Dry-Run Validation
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Validates payload formatting and logs the check without external delivery
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void onRunSync({ scope: "all", direction: "push", dry_run: true })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Dry Run
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Payload Inspector */}
                <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-semibold">Live Outgoing Payload Preview</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("payload", sampleWebhookPayload)}
                      className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedText === "payload" ? "Copied" : "Copy JSON"}
                    </button>
                  </div>
                  <pre className="mt-3 max-h-72 overflow-auto font-mono text-[11px] leading-relaxed text-emerald-300">
                    {sampleWebhookPayload}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 4: GUIDE ==================== */}
        {activeTab === "guide" && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <BookOpen className="h-5 w-5 text-[#7c3aed]" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {meta.title} — Complete Setup Guide
                  </h2>
                  <p className="text-xs text-slate-500">
                    Follow these steps carefully to connect and verify your integration
                  </p>
                </div>
              </div>

              {provider === "telegram" && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    {
                      step: "1",
                      title: "Create a Bot via @BotFather",
                      body: "Open Telegram and search for @BotFather (verified blue checkmark). Send /newbot, choose a display name (e.g. 'My Store Alerts') and a username ending in 'bot'. Copy the HTTP API Bot Token.",
                    },
                    {
                      step: "2",
                      title: "Add Bot to Your Group or Channel",
                      body: "Create a Telegram Group or Channel for your store staff and add your newly created bot to it. Promote the bot to Administrator with 'Post Messages' permission.",
                    },
                    {
                      step: "3",
                      title: "Find Your Chat ID",
                      body: "Send any test message in your group, or forward a message from your group to @userinfobot / @RawDataBot to get the numeric Chat ID (supergroups begin with -100...).",
                    },
                    {
                      step: "4",
                      title: "Save & Click Test Connection",
                      body: "Paste the Bot Token and Chat ID in the Settings tab and click 'Save & Test Connection'. Your Telegram chat will immediately receive a confirmation message.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-bold text-white">
                          {item.step}
                        </span>
                        <h3 className="text-xs font-semibold text-slate-900">{item.title}</h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {provider === "whatsapp" && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    {
                      step: "1",
                      title: "Create a Meta Business App",
                      body: "Sign in to developers.facebook.com, create a Business-type App, and add the 'WhatsApp' product to your app dashboard.",
                    },
                    {
                      step: "2",
                      title: "Copy Your Phone Number ID & WABA ID",
                      body: "In WhatsApp → API Setup, select your business phone number and copy the Phone Number ID and WhatsApp Business Account ID.",
                    },
                    {
                      step: "3",
                      title: "Generate a Permanent System User Token",
                      body: "Open Meta Business Settings → Users → System Users. Create an Admin System User, assign your WhatsApp app with 'whatsapp_business_messaging' and 'whatsapp_business_management', and generate a permanent token.",
                    },
                    {
                      step: "4",
                      title: "Configure Recipient & Test",
                      body: "Enter your Staff Alert Phone Number in international format without '+' (e.g., 919876543210), save settings, and click Test Connection.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-bold text-white">
                          {item.step}
                        </span>
                        <h3 className="text-xs font-semibold text-slate-900">{item.title}</h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {provider === "webhooks" && (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      {
                        step: "1",
                        title: "Provide an HTTPS Webhook Endpoint",
                        body: "Create an HTTP POST listener in n8n, Zapier, Make, or your own backend server and paste the HTTPS URL in Settings.",
                      },
                      {
                        step: "2",
                        title: "Generate an HMAC Signing Secret",
                        body: "Click 'Generate Secret' in the Settings tab. Every POST request includes an X-SelfX-Signature header containing the HMAC-SHA256 hex digest of the raw body.",
                      },
                      {
                        step: "3",
                        title: "Verify Signatures & Return 2xx",
                        body: "Compare the X-SelfX-Signature header using a constant-time comparison and respond with HTTP 200/201/204 within 10 seconds.",
                      },
                    ].map((item) => (
                      <div
                        key={item.step}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-bold text-white">
                            {item.step}
                          </span>
                          <h3 className="text-xs font-semibold text-slate-900">{item.title}</h3>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-slate-100">
                    <div className="text-xs font-semibold text-purple-300">
                      Node.js / Express Signature Verification Example
                    </div>
                    <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-200">
                      {`const crypto = require("crypto");

function verifySelfXWebhook(rawBody, signatureHeader, signingSecret) {
  const expected = crypto
    .createHmac("sha256", signingSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader || ""));
}`}
                    </pre>
                  </div>
                </div>
              )}

              {provider === "google_sheets" && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    {
                      step: "1",
                      title: "Enable Google Sheets API in Google Cloud",
                      body: "Open console.cloud.google.com, select or create a project, and enable the 'Google Sheets API' under APIs & Services → Library.",
                    },
                    {
                      step: "2",
                      title: "Create a Service Account & JSON Key",
                      body: "Go to IAM & Admin → Service Accounts → Create Service Account. Open the 'Keys' tab → Add Key → Create new key (JSON). Upload that JSON file directly in the Settings tab.",
                    },
                    {
                      step: "3",
                      title: "Share Your Spreadsheet with the Service Account",
                      body: "Open your target Google Spreadsheet, click the 'Share' button in the top-right corner, paste the Service Account client_email, and grant 'Editor' permission.",
                    },
                    {
                      step: "4",
                      title: "Copy the Spreadsheet ID & Test",
                      body: "Copy the Spreadsheet ID between '/d/' and '/edit' in your browser address bar, ensure the worksheet tab names match (e.g. Orders, Products, Customers), and click Save & Test Connection.",
                    },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-bold text-white">
                          {item.step}
                        </span>
                        <h3 className="text-xs font-semibold text-slate-900">{item.title}</h3>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== TAB 5: LOGS ==================== */}
        {activeTab === "logs" && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search logs by action or message..."
                    className="w-64 rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-8 text-xs text-slate-900 focus:border-[#7c3aed] focus:outline-hidden"
                  />
                </div>

                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value as "all" | "ok" | "error")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-[#7c3aed] focus:outline-hidden"
                >
                  <option value="all">All statuses</option>
                  <option value="ok">Success (ok)</option>
                  <option value="error">Failed (error)</option>
                </select>
              </div>

              <button
                type="button"
                disabled={busy || (data.logs?.length ?? 0) === 0}
                onClick={() => void onClearLogs()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Logs
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Direction</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{log.action}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] uppercase text-slate-700">
                          {log.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            log.status === "ok"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {log.status === "ok" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{log.message}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No integration logs recorded yet.
                      </td>
                    </tr>
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
