"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ChannelIntegrationView, type ChannelProviderId } from "./channel-view";
import { ShopifyIntegrationView } from "./shopify-view";
import { WooCommerceIntegrationView, type WooIntegrationData } from "./woocommerce-view";
import { TryOnIntegrationView } from "./tryon-view";

const SUPPORTED_PROVIDERS = [
  "woocommerce",
  "shopify",
  "telegram",
  "whatsapp",
  "webhooks",
  "google_sheets",
  "tryon",
] as const;

function xsrfToken(): string {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

const EMPTY_DATA: WooIntegrationData & {
  integration: WooIntegrationData["integration"] & { stores?: any[] };
  activity_14d?: { date: string; runs: number; records_synced: number }[];
} = {
  store: { id: "", name: "Primary Store", code: "MAIN" },
  integration: {
    provider: "",
    status: "disconnected",
    fields: {},
    secret_keys: [],
    tuning: {},
    stores: [],
    last_tested_at: null,
    last_synced_at: null,
    last_error: null,
    remote: {},
  },
  stats: {
    local_products: 0,
    synced_products: 0,
    unsynced_products: 0,
    local_categories: 0,
    synced_categories: 0,
    local_brands: 0,
    synced_brands: 0,
    local_customers: 0,
    synced_customers: 0,
    local_orders: 0,
    imported_orders: 0,
    linked_records: 0,
    syncs_30d: 0,
    syncs_7d: 0,
    errors_7d: 0,
  },
  entities: {
    products: [],
    categories: [],
    brands: [],
    customers: [],
    orders: [],
  },
  logs: [],
  activity_14d: [],
};

export default function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = use(params);
  const [data, setData] = useState<typeof EMPTY_DATA>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      await fetch("/api/v1/platform/plans", { credentials: "include" });
      const res = await fetch(`/api/v1/integrations/${provider}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const body = await res.json();
      const payload = body?.data ?? {};
      setData({
        store: payload.store ?? EMPTY_DATA.store,
        integration: {
          ...EMPTY_DATA.integration,
          ...(payload.integration ?? {}),
          provider,
        },
        stats: {
          ...EMPTY_DATA.stats,
          ...(payload.stats ?? {}),
        },
        entities: {
          ...EMPTY_DATA.entities,
          ...(payload.entities ?? {}),
        },
        logs: payload.logs ?? [],
        activity_14d: payload.activity_14d ?? [],
      });
    } catch {
      // keep existing state on transient error
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    setLoading(true);
    setNotice(null);
    void loadData();
  }, [loadData]);

  async function handleSaveSettings(payload: {
    fields: Record<string, string>;
    secrets: Record<string, string>;
    tuning?: Record<string, any>;
  }) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/integrations/${provider}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice({ type: "ok", text: "Integration settings saved." });
        await loadData();
      } else {
        setNotice({
          type: "error",
          text: body?.message ?? "Could not save integration settings.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleTestConnection(payload?: {
    fields: Record<string, string>;
    secrets: Record<string, string>;
    tuning?: Record<string, any>;
  }) {
    setBusy(true);
    setNotice(null);
    try {
      if (payload) {
        await fetch(`/api/v1/integrations/${provider}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": xsrfToken(),
          },
          body: JSON.stringify(payload),
        });
      }

      const res = await fetch(`/api/v1/integrations/${provider}/test`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
      });
      const body = await res.json().catch(() => ({}));
      const result = body?.data ?? {};
      if (result.ok) {
        setNotice({
          type: "ok",
          text: result.message ?? "Connection verified with remote endpoint.",
        });
      } else {
        setNotice({
          type: "error",
          text: result.message ?? body?.message ?? "Connection test failed.",
        });
      }
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  async function handleRunSync(options: {
    scope: string;
    direction?: "pull" | "push";
    create_missing?: boolean;
    only_unsynced?: boolean;
    dry_run?: boolean;
    item_id?: string;
  }) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/integrations/${provider}/sync`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify(options),
      });
      const body = await res.json().catch(() => ({}));
      const result = body?.data ?? {};
      if (res.ok && result.ok !== false) {
        setNotice({
          type: "ok",
          text: result.message ?? "Synchronization completed.",
        });
      } else {
        setNotice({
          type: "error",
          text: result.message ?? body?.message ?? "Synchronization reported an error.",
        });
      }
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  async function handleConnectShop(payload: Record<string, any>): Promise<boolean> {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/integrations/${provider}/stores`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      const result = body?.data ?? {};
      await loadData();
      if (res.ok && result.ok !== false) {
        setNotice({
          type: "ok",
          text: result.message ?? "Shopify store connected and verified.",
        });
        return true;
      } else {
        setNotice({
          type: "error",
          text:
            result.message ??
            body?.message ??
            "Store saved, but the live connection check reported an issue.",
        });
        return true;
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveShop(shopId: string) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/integrations/${provider}/stores/${shopId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
      });
      if (res.ok) {
        setNotice({ type: "ok", text: "Store connection removed." });
      }
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  async function handleResetMappings() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/integrations/${provider}/reset-mappings`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice({
          type: "ok",
          text: body?.data?.message ?? "All synced record mappings have been reset.",
        });
      }
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  async function handleClearLogs() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/integrations/${provider}/logs`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
      });
      if (res.ok) {
        setNotice({ type: "ok", text: "Integration logs cleared." });
      }
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  if (!SUPPORTED_PROVIDERS.includes(provider as any)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h2 className="text-base font-semibold text-slate-900">Unsupported Integration</h2>
        <p className="mt-1 text-xs text-slate-500">
          The requested integration provider ({provider}) is not available.
        </p>
        <Link
          href="/integrations"
          className="mt-4 inline-flex items-center rounded-lg bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white"
        >
          ← Back to Integrations
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200/70" />
        <div className="h-96 animate-pulse rounded-xl border border-slate-200 bg-white p-6" />
      </div>
    );
  }

  if (provider === "woocommerce") {
    return (
      <WooCommerceIntegrationView
        data={data}
        onSaveSettings={handleSaveSettings}
        onTestConnection={handleTestConnection}
        onRunSync={handleRunSync}
        onResetMappings={handleResetMappings}
        onClearLogs={handleClearLogs}
        busy={busy}
        notice={notice}
      />
    );
  }

  if (provider === "tryon") {
    return (
      <TryOnIntegrationView
        data={data}
        onSaveSettings={handleSaveSettings}
        onTestConnection={handleTestConnection}
        onRunSync={handleRunSync}
        busy={busy}
        notice={notice}
      />
    );
  }

  if (provider === "shopify") {
    return (
      <ShopifyIntegrationView
        data={data}
        activity14d={data.activity_14d ?? []}
        onConnectShop={handleConnectShop}
        onRemoveShop={handleRemoveShop}
        onTestConnection={() => handleTestConnection()}
        onRunSync={handleRunSync}
        onResetMappings={handleResetMappings}
        onClearLogs={handleClearLogs}
        busy={busy}
        notice={notice}
      />
    );
  }

  return (
    <ChannelIntegrationView
      provider={provider as ChannelProviderId}
      data={data}
      activity14d={data.activity_14d ?? []}
      onSaveSettings={handleSaveSettings}
      onTestConnection={handleTestConnection}
      onRunSync={handleRunSync}
      onClearLogs={handleClearLogs}
      busy={busy}
      notice={notice}
    />
  );
}
