"use client";

import {
  ChevronRight,
  FileSpreadsheet,
  MessageCircle,
  Send,
  ShoppingCart,
  Sparkles,
  Store,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface IntegrationCatalogItem {
  id: string;
  title: string;
  category: "ecommerce" | "automation" | "data";
  copy: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

const CATALOG: IntegrationCatalogItem[] = [
  {
    id: "woocommerce",
    title: "WooCommerce",
    category: "ecommerce",
    copy: "Sync products, stock levels and orders with your WooCommerce store.",
    icon: ShoppingCart,
    iconBg: "bg-[#f5eefc]",
    iconColor: "text-[#7e3af2]",
  },
  {
    id: "shopify",
    title: "Shopify",
    category: "ecommerce",
    copy: "Multi-store sync of products, inventory, orders and customers with Shopify.",
    icon: Store,
    iconBg: "bg-[#eef7e8]",
    iconColor: "text-[#4d7c0f]",
  },
  {
    id: "telegram",
    title: "Telegram",
    category: "automation",
    copy: "Send business events to a Telegram chat or group via your bot.",
    icon: Send,
    iconBg: "bg-[#eaf5ff]",
    iconColor: "text-[#0284c7]",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business",
    category: "automation",
    copy: "Send invoices, receipts and automated notifications over WhatsApp.",
    icon: MessageCircle,
    iconBg: "bg-[#eafaf1]",
    iconColor: "text-[#16a34a]",
  },
  {
    id: "webhooks",
    title: "Webhooks",
    category: "automation",
    copy: "Push sales, purchases, payments and stock events to any endpoint.",
    icon: Webhook,
    iconBg: "bg-[#f3effe]",
    iconColor: "text-[#7c3aed]",
  },
  {
    id: "google_sheets",
    title: "Google Sheets",
    category: "data",
    copy: "Export sales, products and customers into a live spreadsheet.",
    icon: FileSpreadsheet,
    iconBg: "bg-[#eaf8f2]",
    iconColor: "text-[#0d9488]",
  },
  {
    id: "tryon",
    title: "Virtual AI Try-On Suite",
    category: "automation",
    copy: "Bridge fashion catalogs & enable AI Virtual Fitting Room on your storefront.",
    icon: Sparkles,
    iconBg: "bg-[#fef3c7]",
    iconColor: "text-[#d97706]",
  },
];

const SECTIONS: {
  id: "ecommerce" | "automation" | "data";
  title: string;
}[] = [
  { id: "ecommerce", title: "Ecommerce Platforms" },
  { id: "automation", title: "Automation & Messaging" },
  { id: "data", title: "Accounting & Data" },
];

interface IntegrationSummaryRow {
  provider: string;
  status: string;
  fields?: Record<string, string>;
  last_tested_at?: string | null;
  last_synced_at?: string | null;
}

export default function IntegrationsPage() {
  const [rows, setRows] = useState<IntegrationSummaryRow[]>([]);
  const [filter, setFilter] = useState<"all" | "connected" | "disconnected">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/v1/integrations", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setRows(body?.data?.integrations ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    void fetch("/api/v1/platform/plans", { credentials: "include" }).catch(() => {});
  }, []);

  const statusMap = useMemo(() => {
    const map: Record<string, IntegrationSummaryRow> = {};
    for (const r of rows) {
      map[r.provider] = r;
    }
    return map;
  }, [rows]);

  const filteredCatalog = useMemo(() => {
    return CATALOG.filter((item) => {
      const connected = statusMap[item.id]?.status === "connected";
      if (filter === "connected") return connected;
      if (filter === "disconnected") return !connected;
      return true;
    });
  }, [filter, statusMap]);

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header & Filter Tabs (Matches Image 1) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integrations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Connect your store with the platforms and services your business runs on.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-2xs">
          {(
            [
              { id: "all", label: "All" },
              { id: "connected", label: "Connected" },
              { id: "disconnected", label: "Not connected" },
            ] as const
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Categorized Sections (Matches Image 1) */}
      {SECTIONS.map((section) => {
        const items = filteredCatalog.filter((item) => item.category === section.id);
        if (items.length === 0) return null;

        return (
          <section key={section.id} className="space-y-3.5">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-sm font-bold text-slate-900">{section.title}</h2>
              <span className="text-xs font-medium text-slate-400">
                {items.length} {items.length === 1 ? "integration" : "integrations"}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((provider) => {
                const row = statusMap[provider.id];
                const connected = row?.status === "connected";
                const Icon = provider.icon;

                return (
                  <article
                    key={provider.id}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:border-violet-200 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${provider.iconBg} ${provider.iconColor}`}
                        >
                          <Icon size={20} strokeWidth={1.9} />
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-semibold ${
                            connected
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {connected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                          {loading ? "Checking..." : connected ? "Connected" : "Not connected"}
                        </span>
                      </div>

                      <h3 className="mt-4 text-base font-bold text-slate-900">{provider.title}</h3>
                      <p className="mt-1.5 min-h-[38px] text-xs leading-relaxed text-slate-500">
                        {provider.copy}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                      <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                        {connected
                          ? row?.fields?.store_url ||
                            row?.fields?.shop_domain ||
                            row?.fields?.url ||
                            "Active connection"
                          : "Ready to configure"}
                      </span>

                      <Link
                        href={`/integrations/${provider.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3.5 text-xs font-semibold text-violet-600 transition hover:border-violet-500 hover:bg-violet-50"
                      >
                        <span>Configure</span>
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}

      {filteredCatalog.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No integrations match the selected filter.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Switch to &ldquo;All&rdquo; to configure WooCommerce, Shopify, Telegram, WhatsApp, Webhooks, or Google Sheets.
          </p>
        </div>
      )}
    </div>
  );
}
