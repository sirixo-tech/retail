"use client";

import {
  AlertCircle,
  ArrowUpCircle,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  HardDrive,
  Laptop,
  Monitor,
  Package,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import { AndroidIcon, AppleIcon, IosIcon, LinuxIcon, WindowsIcon } from "@selfx/ui";
import { useEffect, useMemo, useState } from "react";

type PlatformType = "windows" | "android" | "ios" | "macos" | "linux" | "web";

type DownloadLink = {
  platform: PlatformType;
  url: string;
  size?: string;
  filename?: string;
};

type InAppUpdate = {
  platform: PlatformType;
  version: string;
  min_version?: string;
  force?: boolean;
  notes?: string;
};

type CompanionApp = {
  id: string;
  key: string;
  name: string;
  tag: "System" | "Custom";
  category: string;
  description: string;
  is_active: boolean;
  platforms: PlatformType[];
  download_links: DownloadLink[];
  in_app_updates: InAppUpdate[];
  sort_order: number;
  icon?: string;
  color?: string | null;
};

const AVAILABLE_ICONS = [
  { id: "smartphone", label: "Phone", icon: Smartphone, color: "#10b981" },
  { id: "tablet", label: "Tablet", icon: Tablet, color: "#6366f1" },
  { id: "printer", label: "Printer", icon: Printer, color: "#06b6d4" },
  { id: "monitor", label: "Desktop", icon: Monitor, color: "#ea580c" },
  { id: "laptop", label: "Laptop", icon: Laptop, color: "#2563eb" },
  { id: "globe", label: "Web", icon: Globe, color: "#8b5cf6" },
  { id: "package", label: "Warehouse", icon: Boxes, color: "#f59e0b" },
  { id: "analytics", label: "Analytics", icon: BarChart3, color: "#ec4899" },
];

function deriveIconFromApp(app: CompanionApp): string {
  const key = app.key.toLowerCase();
  if (key.includes("desktop") || key.includes("windows")) return "monitor";
  if (key.includes("warehouse") || key.includes("scanner")) return "package";
  if (key.includes("manager") || key.includes("analytics")) return "analytics";
  if (key.includes("kiosk")) return "tablet";
  if (key.includes("print")) return "printer";
  return "smartphone";
}

const PLATFORM_META: Record<
  PlatformType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  windows: { label: "Windows", icon: WindowsIcon, color: "text-sky-500" },
  android: { label: "Android", icon: AndroidIcon, color: "text-emerald-500" },
  ios: { label: "iOS", icon: IosIcon, color: "text-slate-900 dark:text-slate-100" },
  macos: { label: "macOS", icon: AppleIcon, color: "text-slate-700 dark:text-slate-300" },
  linux: { label: "Linux", icon: LinuxIcon, color: "text-amber-500" },
  web: { label: "Web", icon: Globe, color: "text-indigo-500" },
};

export default function TenantAppsPage() {
  const [apps, setApps] = useState<CompanionApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<"all" | PlatformType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadApps() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/public/apps", {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json();
        const activeApps = (body.data?.apps || []).filter((a: CompanionApp) => a.is_active);
        setApps(activeApps);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApps();
  }, []);

  const filteredApps = useMemo(() => {
    return apps.filter((app) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        app.platforms.some((p) => p.toLowerCase().includes(q));

      const matchesPlatform =
        selectedPlatform === "all" || app.platforms.includes(selectedPlatform);

      return matchesSearch && matchesPlatform;
    });
  }, [apps, searchQuery, selectedPlatform]);

  // Coloured Background Card Icons (Image 1 & Image 2)
  function getAppBadgeIcon(app: CompanionApp) {
    const iconId = app.icon || deriveIconFromApp(app);
    const meta = AVAILABLE_ICONS.find((i) => i.id === iconId) || AVAILABLE_ICONS[3];
    const Icon = meta.icon;
    const bgColor = app.color || meta.color;

    return (
      <div
        className="flex size-12 shrink-0 items-center justify-center rounded-[14px] shadow-sm text-white transition-all"
        style={{ backgroundColor: bgColor }}
      >
        <Icon className="size-6 text-white" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Apps &amp; Downloads
          </h1>
          <p className="mt-1 text-xs text-muted">
            Download certified desktop checkout terminals, mobile POS companions, and warehouse scanners provisioned for your store workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadApps()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-xs font-semibold text-ink shadow-2xs transition hover:bg-bg disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-accent" : "text-muted"}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter and Search Bar (Single Unified Row) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Segmented Platform Pills */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setSelectedPlatform("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              selectedPlatform === "all"
                ? "bg-accent text-accent-ink shadow-xs"
                : "text-muted hover:text-ink hover:bg-bg"
            }`}
          >
            All Platforms
          </button>
          {(["windows", "macos", "android", "web"] as PlatformType[]).map((p) => {
            const meta = PLATFORM_META[p];
            const Icon = meta.icon;
            const count = apps.filter((a) => a.platforms.includes(p)).length;
            const isSelected = selectedPlatform === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPlatform(p)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-accent text-accent-ink shadow-xs"
                    : "text-muted hover:text-ink hover:bg-bg"
                }`}
              >
                <Icon className={`size-3.5 ${isSelected ? "text-accent-ink" : meta.color}`} />
                <span>{meta.label}</span>
                {count > 0 && (
                  <span
                    className={`num rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      isSelected ? "bg-white/20 text-white" : "bg-bg text-muted border border-line"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 size-3.5 text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps by name, purpose..."
            className="h-9 w-full rounded-xl border border-line bg-surface pr-8 pl-9 text-xs font-medium text-ink placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Applications Grid */}
      {loading ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center text-muted text-xs">
          <RefreshCw className="mx-auto mb-2 size-5 animate-spin text-accent" />
          Loading store applications...
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted text-xs">
          <Package className="mx-auto mb-2 size-6 text-muted opacity-60" />
          No applications match the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map((app) => {
            const hasDownloadLinks =
              app.download_links && app.download_links.some((l) => l.url && l.url.trim().length > 0);
            const activeDownloadLinks = (app.download_links || []).filter(
              (l) => l.url && l.url.trim().length > 0,
            );
            const latestUpdate = app.in_app_updates && app.in_app_updates.length > 0 ? app.in_app_updates[0] : null;

            return (
              <div
                key={app.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 shadow-xs transition hover:border-accent/40 hover:shadow-md"
              >
                <div className="space-y-4">
                  {/* Header: Colorful Icon + Name + Category + Verified Badge */}
                  <div className="flex items-start gap-3.5">
                    {getAppBadgeIcon(app)}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-ink text-[14.5px] truncate">{app.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-md bg-bg px-2 py-0.5 text-[10.5px] font-semibold text-muted border border-line">
                          {app.category}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="size-3" />
                          <span>Verified Build</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted leading-relaxed line-clamp-3">
                    {app.description}
                  </p>

                  {/* Supported Systems */}
                  <div className="space-y-2 border-t border-line/60 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Supported Systems
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {app.platforms.map((p) => {
                        const meta = PLATFORM_META[p] || PLATFORM_META.web;
                        const PlatformIcon = meta.icon;
                        return (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-2 py-1 text-[11px] font-medium text-ink capitalize"
                          >
                            <PlatformIcon className={`size-3.5 ${meta.color}`} />
                            <span>{meta.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Latest Release Notes Banner (only when real update notes exist) */}
                  {latestUpdate && latestUpdate.version && (
                    <div className="rounded-xl border border-line/70 bg-bg/60 p-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">
                          Version {latestUpdate.version}
                        </span>
                        <span className="font-mono text-[10.5px] text-muted capitalize">
                          {latestUpdate.platform}
                        </span>
                      </div>
                      {latestUpdate.notes && (
                        <p className="text-[11.5px] text-muted line-clamp-2 leading-relaxed">
                          {latestUpdate.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Download Buttons Strip (Real Direct Downloads) */}
                <div className="mt-5 pt-3.5 border-t border-line space-y-2">
                  {hasDownloadLinks ? (
                    activeDownloadLinks.map((link, idx) => {
                      const meta = PLATFORM_META[link.platform] || PLATFORM_META.web;
                      const PlatformIcon = meta.icon;
                      return (
                        <a
                          key={idx}
                          href={link.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex h-9 items-center justify-between rounded-xl border border-accent/30 bg-accent-soft px-3.5 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-ink transition-all shadow-2xs group cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Download className="size-3.5 group-hover:translate-y-0.5 transition-transform" />
                            <span>Download for {meta.label}</span>
                          </div>
                          {link.size && (
                            <span className="font-mono text-[11px] opacity-80">{link.size}</span>
                          )}
                        </a>
                      );
                    })
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-bg/50 p-3 text-[11.5px] text-muted">
                      <Clock className="size-4 shrink-0 text-amber-500" />
                      <span>Binary installer awaiting publication by platform administrator.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
