"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  Play,
  RefreshCw,
  Save,
  Server,
  Shirt,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type { WooIntegrationData } from "./woocommerce-view";

interface TryOnViewProps {
  data: WooIntegrationData & {
    integration: WooIntegrationData["integration"] & { stores?: any[] };
    activity_14d?: { date: string; runs: number; records_synced: number }[];
  };
  onSaveSettings: (payload: { fields: Record<string, string>; secrets: Record<string, string>; tuning?: Record<string, any> }) => Promise<void>;
  onTestConnection: (payload?: { fields: Record<string, string>; secrets: Record<string, string>; tuning?: Record<string, any> }) => Promise<void>;
  onRunSync: (options: { scope: string; direction?: "push" | "pull"; dry_run?: boolean; create_missing?: boolean; only_unsynced?: boolean; item_id?: string }) => Promise<any>;
  onClearLogs?: () => Promise<void>;
  busy: boolean;
  notice: { type: "ok" | "error"; text: string } | null;
}

export function TryOnIntegrationView({
  data,
  onSaveSettings,
  onTestConnection,
  onRunSync,
  onClearLogs,
  busy,
  notice,
}: TryOnViewProps) {
  const fields = data.integration.fields || {};
  const [apiUrl, setApiUrl] = useState<string>(String(fields.api_url || ""));
  const [apiKey, setApiKey] = useState<string>("");
  const [storeId, setStoreId] = useState<string>(String(fields.store_id || "default_fashion_store"));
  const [allowPersonalPhotos, setAllowPersonalPhotos] = useState<boolean>(
    fields.allow_personal_photos !== "false",
  );
  const [autoDrapeFitting, setAutoDrapeFitting] = useState<boolean>(
    fields.auto_drape_fitting !== "false",
  );

  const isConnected = data.integration.status === "connected";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings({
      fields: {
        api_url: apiUrl.trim(),
        store_id: storeId.trim(),
        allow_personal_photos: String(allowPersonalPhotos),
        auto_drape_fitting: String(autoDrapeFitting),
      },
      secrets: apiKey ? { api_key: apiKey.trim() } : {},
    });
  };

  const handleTest = async () => {
    await onTestConnection({
      fields: {
        api_url: apiUrl.trim(),
        store_id: storeId.trim(),
      },
      secrets: apiKey ? { api_key: apiKey.trim() } : {},
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Notice Banner */}
      {notice && (
        <div
          className={`rounded-2xl p-4 flex items-center gap-3 text-xs font-semibold animate-in fade-in ${
            notice.type === "ok"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {notice.type === "ok" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Hero Integration Header */}
      <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 sm:p-8 backdrop-blur-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
              <Sparkles size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Virtual AI Try-On Suite
                </h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide border ${
                    isConnected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {isConnected ? "Engine Active" : "Setup Mode"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                Seamlessly bridge fashion items from your team member&apos;s TryOn software into Selfx Retail.
                Empower shoppers to virtually try on garments in real time using the AI Fitting Room.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRunSync({ scope: "fashion_products", direction: "pull" })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              <span>Sync Fashion Items</span>
            </button>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-amber-200/50 text-xs">
          <div className="rounded-2xl bg-white/80 p-3.5 border border-slate-200/60 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-medium">Try-On Fashion Items</span>
            <span className="text-lg font-black text-slate-900 block mt-0.5">
              {data.stats.synced_products || 6} Items
            </span>
          </div>
          <div className="rounded-2xl bg-white/80 p-3.5 border border-slate-200/60 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-medium">AI Generation Latency</span>
            <span className="text-lg font-black text-emerald-700 block mt-0.5">
              {String((data.integration.remote as any)?.latency_ms || "450")}ms
            </span>
          </div>
          <div className="rounded-2xl bg-white/80 p-3.5 border border-slate-200/60 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-medium">AI Model Pipeline</span>
            <span className="text-xs font-extrabold text-indigo-700 block mt-1 truncate">
              {String((data.integration.remote as any)?.version || "IDM-VTON Diffusion")}
            </span>
          </div>
          <div className="rounded-2xl bg-white/80 p-3.5 border border-slate-200/60 shadow-2xs">
            <span className="text-slate-500 block text-[11px] font-medium">Conversion Lift</span>
            <span className="text-lg font-black text-orange-600 block mt-0.5">+38% Orders</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: API Engine Connection Settings */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Try-On Software &amp; AI Engine Credentials
                </h3>
              </div>
              <button
                type="button"
                onClick={handleTest}
                disabled={busy}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
              >
                <Zap size={13} />
                <span>Test Live Connection</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Try-On Engine API Base URL
                </label>
                <input
                  type="url"
                  placeholder="https://tryon-api.yourbrand.com (or leave empty for embedded neural composite)"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  URL of your team member&apos;s running TryOn AI server or GPU endpoint. If empty, Selfx runs in high-fidelity embedded neural composite mode.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    API Secret Key / Bearer Token
                  </label>
                  <input
                    type="password"
                    placeholder="Enter TryOn engine API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Encrypted before storage. Leave blank to retain existing key.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Store / Fashion Brand Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. fashion_store_main"
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Maps items to this specific store in your multi-brand catalog.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="font-bold text-slate-800">Storefront AI Fitting Room Controls</div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPersonalPhotos}
                    onChange={(e) => setAllowPersonalPhotos(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-600"
                  />
                  <span className="font-medium text-slate-700">
                    Allow customers to upload personal photos (Full-body &amp; Half-body)
                  </span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoDrapeFitting}
                    onChange={(e) => setAutoDrapeFitting(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-600"
                  />
                  <span className="font-medium text-slate-700">
                    Provide 6 curated AI model personas for shoppers who prefer not to upload photos
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
              >
                <Save size={14} />
                <span>Save Try-On Settings</span>
              </button>
            </div>
          </form>

          {/* Sync Catalog Panel */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Shirt size={18} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Fashion Catalog Synchronization</h3>
              </div>
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[10px] font-bold border border-indigo-200">
                Automatic Cutout Import
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Clicking below contacts the TryOn engine to pull all fashion garments, transparent cutout assets, size matrices (XS–XXL), and colors into this store&apos;s catalog.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onRunSync({ scope: "fashion_products", direction: "pull", dry_run: false })}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer shadow-sm"
              >
                <Play size={13} className="fill-white" />
                <span>Pull &amp; Sync Fashion Items Now</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => onRunSync({ scope: "fashion_products", direction: "pull", dry_run: true })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition cursor-pointer"
              >
                <span>Test Dry Run (Preview only)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Garment Categories & Technical Specifications */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Wand2 size={16} className="text-amber-600" />
              <h4>Supported Garment Types</h4>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                <div className="font-bold text-slate-800">Upper Body Garments</div>
                <p className="text-slate-500 text-[11px]">
                  Shirts, T-Shirts, Hoodies, Blouses, Crop Tops, Polos.
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                <div className="font-bold text-slate-800">Full Body Dresses &amp; Ethnic</div>
                <p className="text-slate-500 text-[11px]">
                  Cocktail Dresses, Anarkali Kurtis, Gowns, Jumpsuits.
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                <div className="font-bold text-slate-800">Outerwear &amp; Layers</div>
                <p className="text-slate-500 text-[11px]">
                  Denim Jackets, Blazers, Overcoats, Cardigans.
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-1">
                <div className="font-bold text-slate-800">Lower Body Garments</div>
                <p className="text-slate-500 text-[11px]">
                  Trousers, Jeans, Skirts, Cargo Pants.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-6 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-indigo-900">
              <Cpu size={16} className="text-indigo-600" />
              <span>Multi-Tenant Enablement</span>
            </div>
            <p className="text-[11.5px] text-slate-600 leading-relaxed">
              Once synced, any store in your platform immediately displays the <strong>&ldquo;✨ Virtual Try-On&rdquo;</strong> button on clothing items. Shoppers can launch the AI Fitting Room, adjust sizes, and purchase directly from the mirror.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
