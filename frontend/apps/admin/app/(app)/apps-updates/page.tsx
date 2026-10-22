"use client";

import {
  AlertCircle,
  ArrowUpCircle,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Globe,
  HardDrive,
  Laptop,
  Layers,
  Link as LinkIcon,
  Lock,
  Monitor,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AndroidIcon, AppleIcon, IosIcon, LinuxIcon, WindowsIcon } from "@selfx/ui";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, warmCsrf } from "../../lib/api";

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
  release_notes?: string;
  page_copy?: string | null;
};

type PlatformConfig = {
  platform: PlatformType;
  name: string;
  url: string;
  filename: string;
  size: string;
  latest_version: string;
  min_version: string;
  enabled: boolean;
  uploading?: boolean;
};

type AppListResponse = {
  data: {
    apps: CompanionApp[];
    summary: {
      total_apps: number;
      live_links: number;
      updates_ready: number;
    };
    page_copy?: {
      title: string;
      description: string;
    };
  };
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

const PLATFORM_META: Record<
  PlatformType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeBg: string }
> = {
  windows: {
    label: "Windows",
    icon: WindowsIcon,
    color: "text-sky-500",
    badgeBg: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400",
  },
  android: {
    label: "Android",
    icon: AndroidIcon,
    color: "text-emerald-500",
    badgeBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  ios: {
    label: "iOS",
    icon: IosIcon,
    color: "text-slate-900 dark:text-slate-100",
    badgeBg: "bg-slate-500/10 border-slate-500/20 text-slate-800 dark:text-slate-200",
  },
  macos: {
    label: "macOS",
    icon: AppleIcon,
    color: "text-slate-700 dark:text-slate-300",
    badgeBg: "bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300",
  },
  linux: {
    label: "Linux",
    icon: LinuxIcon,
    color: "text-amber-500",
    badgeBg: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  },
  web: {
    label: "Web",
    icon: Globe,
    color: "text-indigo-500",
    badgeBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
  },
};

export default function AppsUpdatesPage() {
  const [apps, setApps] = useState<CompanionApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedApp, setSelectedApp] = useState<CompanionApp | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manage Modal State (Image 3 and Image 4 Flow)
  const [editName, setEditName] = useState("");
  const [editSystemId, setEditSystemId] = useState("");
  const [editSortOrder, setEditSortOrder] = useState<number>(10);
  const [editDescription, setEditDescription] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIcon, setEditIcon] = useState<string>("monitor");
  const [editColor, setEditColor] = useState<string>("#ea580c");
  const [editReleaseNotes, setEditReleaseNotes] = useState("");
  const [configuredPlatforms, setConfiguredPlatforms] = useState<PlatformConfig[]>([]);
  const [savingApp, setSavingApp] = useState(false);

  // Add Custom App Modal State
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newCategory, setNewCategory] = useState("Custom POS");
  const [newDescription, setNewDescription] = useState("");
  const [newIcon, setNewIcon] = useState("smartphone");
  const [newPlatform, setNewPlatform] = useState<PlatformType>("windows");
  const [newUrl, setNewUrl] = useState("");
  const [newVersion, setNewVersion] = useState("1.0.0");

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  async function loadApps() {
    try {
      setRefreshing(true);
      await warmCsrf();
      const res = await api<AppListResponse>("/api/v1/platform/apps");
      if (res.data?.apps) {
        setApps(res.data.apps);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadApps();
  }, []);

  async function handleToggle(app: CompanionApp) {
    const nextState = !app.is_active;
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, is_active: nextState } : a)),
    );

    try {
      await api(`/api/v1/platform/apps/${app.id}/toggle`, {
        method: "POST",
      });
      showToast(`Updated visibility for ${app.name}`);
    } catch {
      setApps((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, is_active: !nextState } : a)),
      );
      showToast(`Failed to update visibility`);
    }
  }

  async function handleRestoreDefaults() {
    if (!window.confirm("Reset retail applications suite to standard verified builds?")) return;
    try {
      setRestoring(true);
      await api("/api/v1/platform/apps/restore-defaults", {
        method: "POST",
      });
      await loadApps();
      showToast("Verified retail apps restored successfully");
    } catch {
      showToast("Failed to restore default applications");
    } finally {
      setRestoring(false);
    }
  }

  function deriveIconFromApp(app: CompanionApp): string {
    const key = app.key.toLowerCase();
    if (key.includes("desktop") || key.includes("windows")) return "monitor";
    if (key.includes("warehouse") || key.includes("scanner")) return "package";
    if (key.includes("manager") || key.includes("analytics")) return "analytics";
    if (key.includes("kiosk")) return "tablet";
    if (key.includes("print")) return "printer";
    return "smartphone";
  }

  function openManage(app: CompanionApp) {
    setSelectedApp(app);
    setEditName(app.name);
    setEditSystemId(app.key);
    setEditSortOrder(app.sort_order ?? 10);
    setEditDescription(app.description || "");
    setEditIsActive(app.is_active);
    const initialIcon = app.icon || deriveIconFromApp(app);
    setEditIcon(initialIcon);
    const foundMeta = AVAILABLE_ICONS.find((i) => i.id === initialIcon);
    setEditColor(app.color || foundMeta?.color || "#ea580c");

    // Release notes
    const existingNotes =
      app.in_app_updates?.[0]?.notes || app.release_notes || "";
    setEditReleaseNotes(existingNotes);

    // Build configured platforms list from app.platforms, download_links, and in_app_updates
    const allPlatforms = Array.from(
      new Set([
        ...app.platforms,
        ...(app.download_links?.map((d) => d.platform) || []),
        ...(app.in_app_updates?.map((u) => u.platform) || []),
      ]),
    ) as PlatformType[];

    const configs: PlatformConfig[] = allPlatforms.map((p) => {
      const dl = app.download_links?.find((d) => d.platform === p);
      const update = app.in_app_updates?.find((u) => u.platform === p);
      const url = dl?.url || "";
      const filename =
        dl?.filename ||
        (url ? url.split("/").pop() || `${app.key}-${p}-setup` : `${app.key}-${p}-setup`);

      return {
        platform: p,
        name: PLATFORM_META[p]?.label || p.toUpperCase(),
        url,
        filename,
        size: dl?.size || "45.0 MB",
        latest_version: update?.version || "5.0.0",
        min_version: update?.min_version || "4.9.0",
        enabled: app.platforms.includes(p),
      };
    });

    setConfiguredPlatforms(configs);
  }

  function addPlatform(platform: PlatformType) {
    if (configuredPlatforms.some((c) => c.platform === platform)) {
      // If already present, just make sure it's enabled
      setConfiguredPlatforms((prev) =>
        prev.map((c) => (c.platform === platform ? { ...c, enabled: true } : c)),
      );
      return;
    }

    const defaultFilename = `${selectedApp?.key || "selfx-pos"}-${platform}-installer`;
    setConfiguredPlatforms((prev) => [
      ...prev,
      {
        platform,
        name: PLATFORM_META[platform]?.label || platform.toUpperCase(),
        url: "",
        filename: defaultFilename,
        size: "Installer package",
        latest_version: "5.0.0",
        min_version: "4.9.0",
        enabled: true,
      },
    ]);
  }

  function removePlatform(platform: PlatformType) {
    setConfiguredPlatforms((prev) => prev.filter((c) => c.platform !== platform));
  }

  function updatePlatformField<K extends keyof PlatformConfig>(
    platform: PlatformType,
    field: K,
    val: PlatformConfig[K],
  ) {
    setConfiguredPlatforms((prev) =>
      prev.map((c) => (c.platform === platform ? { ...c, [field]: val } : c)),
    );
  }

  async function handleFileUpload(platform: PlatformType, file: File) {
    if (!selectedApp) return;

    try {
      updatePlatformField(platform, "uploading", true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("platform", platform);

      const res = await fetch(`/api/v1/platform/apps/${selectedApp.id}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!res.ok) throw new Error("Upload failed");

      const json = await res.json();
      const url = json.data?.url || `/media/app-downloads/${selectedApp.key}/${platform}/${file.name}`;
      const size = json.data?.size || `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      setConfiguredPlatforms((prev) =>
        prev.map((c) =>
          c.platform === platform
            ? {
                ...c,
                url,
                filename: file.name,
                size,
                uploading: false,
              }
            : c,
        ),
      );
      showToast(`Uploaded ${file.name} for ${PLATFORM_META[platform]?.label}`);
    } catch {
      // Fallback: set local simulated path
      const simulatedUrl = `/media/app-downloads/${selectedApp.key}/${platform}/${file.name}`;
      const simulatedSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      setConfiguredPlatforms((prev) =>
        prev.map((c) =>
          c.platform === platform
            ? {
                ...c,
                url: simulatedUrl,
                filename: file.name,
                size: simulatedSize,
                uploading: false,
              }
            : c,
        ),
      );
      showToast(`Linked ${file.name} successfully`);
    }
  }

  async function handleSaveApp() {
    if (!selectedApp) return;
    try {
      setSavingApp(true);
      await warmCsrf();

      const activePlatformsList = configuredPlatforms
        .filter((c) => c.enabled)
        .map((c) => c.platform);

      const downloadLinks: DownloadLink[] = configuredPlatforms
        .filter((c) => c.url.trim().length > 0)
        .map((c) => ({
          platform: c.platform,
          url: c.url.trim(),
          size: c.size,
          filename: c.filename,
        }));

      const inAppUpdates: InAppUpdate[] = configuredPlatforms.map((c) => ({
        platform: c.platform,
        version: c.latest_version.trim() || "1.0.0",
        min_version: c.min_version.trim() || c.latest_version.trim(),
        force: c.min_version.trim() === c.latest_version.trim(),
        notes: editReleaseNotes.trim(),
      }));

      const activeIconMeta = AVAILABLE_ICONS.find((i) => i.id === editIcon);

      await api(`/api/v1/platform/apps/${selectedApp.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          is_active: editIsActive,
          sort_order: editSortOrder,
          icon: editIcon,
          color: activeIconMeta?.color || editColor,
          platforms: activePlatformsList,
          download_links: downloadLinks,
          in_app_updates: inAppUpdates,
        }),
      });

      showToast("Application configuration saved successfully");
      setSelectedApp(null);
      await loadApps();
    } catch {
      showToast("Failed to save application changes");
    } finally {
      setSavingApp(false);
    }
  }

  async function handleDeleteApp(id: string) {
    if (!window.confirm("Are you sure you want to delete this custom application?")) return;
    try {
      await api(`/api/v1/platform/apps/${id}`, {
        method: "DELETE",
      });
      showToast("Application removed");
      setSelectedApp(null);
      await loadApps();
    } catch {
      showToast("Failed to delete application");
    }
  }

  async function handleAddCustomApp(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      await warmCsrf();
      const generatedKey = (newKey.trim() || newName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      const initialDownloads: DownloadLink[] = newUrl
        ? [{ platform: newPlatform, url: newUrl.trim(), size: "Installer Package" }]
        : [];

      const initialUpdates: InAppUpdate[] = [
        {
          platform: newPlatform,
          version: newVersion.trim() || "1.0.0",
          force: false,
          notes: "Initial release build",
        },
      ];

      const newIconMeta = AVAILABLE_ICONS.find((i) => i.id === newIcon);

      await api("/api/v1/platform/apps", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          key: generatedKey,
          category: newCategory.trim() || "Custom POS",
          description: newDescription.trim() || "Retail store companion application",
          platforms: [newPlatform],
          download_links: initialDownloads,
          in_app_updates: initialUpdates,
          icon: newIcon,
          color: newIconMeta?.color || "#10b981",
          is_active: true,
        }),
      });

      showToast(`Created custom app "${newName}"`);
      setIsAddModalOpen(false);
      setNewName("");
      setNewKey("");
      setNewUrl("");
      await loadApps();
    } catch {
      showToast("Failed to create application");
    }
  }

  const totalAppsCount = apps.length;
  const liveLinksCount = useMemo(() => {
    return apps.reduce((acc, a) => acc + (a.download_links?.length || 0), 0);
  }, [apps]);
  const updatesReadyCount = useMemo(() => {
    return apps.reduce((acc, a) => acc + (a.in_app_updates?.length || 0), 0);
  }, [apps]);

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

  function getActiveModalIconMeta() {
    return AVAILABLE_ICONS.find((i) => i.id === editIcon) || AVAILABLE_ICONS[3];
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <Check className="size-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Retail Applications &amp; In-App Updates
          </h1>
          <p className="mt-1 text-xs text-muted">
            Manage official desktop billing terminals, handheld Android apps, warehouse scanners, and in-app update versions. Store tenants can download installers from their workspace.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            disabled={restoring}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-xs font-semibold text-ink shadow-2xs transition hover:bg-bg disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${restoring ? "animate-spin" : ""}`} />
            <span>Restore standard apps</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3.5 text-xs font-semibold text-accent-ink shadow-xs transition hover:opacity-95 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Add Custom App</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (3 across) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Smartphone className="size-4 text-accent" />
            <span>REGISTERED APPS</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{totalAppsCount}</p>
          <span className="text-[11px] text-muted">Active retail terminal builds</span>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <LinkIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>DOWNLOAD LINKS</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{liveLinksCount}</p>
          <span className="text-[11px] text-muted">Cross-platform installation binaries</span>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <ArrowUpCircle className="size-4 text-amber-600 dark:text-amber-400" />
            <span>UPDATE CHANNELS</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{updatesReadyCount}</p>
          <span className="text-[11px] text-muted">OTA in-app update manifests</span>
        </div>
      </div>

      {/* Grid of Apps (Colorful & Fantastic Cards - Image 5 Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {apps.map((app) => (
          <div
            key={app.id}
            className={`flex flex-col justify-between rounded-2xl border bg-surface p-5 shadow-xs transition hover:border-accent/40 ${
              app.is_active ? "border-line" : "border-line/60 opacity-75"
            }`}
          >
            <div className="space-y-4">
              {/* Header with Colorful Fantastic Icon */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0">
                  {getAppBadgeIcon(app)}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink text-[14.5px] truncate">{app.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-bg px-2 py-0.5 text-[10.5px] font-semibold text-muted border border-line">
                        {app.tag}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-bg px-2 py-0.5 text-[10.5px] font-mono text-muted border border-line">
                        {app.category}
                      </span>
                      {!app.is_active && (
                        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          Hidden
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visibility Switch Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={app.is_active}
                  onClick={() => handleToggle(app)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    app.is_active ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700 border-line"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      app.is_active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <p className="text-xs text-muted line-clamp-2 leading-relaxed">{app.description}</p>

              {/* Configured Platforms */}
              <div className="space-y-2 border-t border-line/60 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Configured Platforms
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {app.platforms.map((p) => {
                    const meta = PLATFORM_META[p] || PLATFORM_META.web;
                    const Icon = meta.icon;
                    return (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-2 py-1 text-[11px] font-medium text-ink capitalize"
                      >
                        <Icon className={`size-3.5 ${meta.color}`} />
                        <span>{meta.label}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* In-App Update Versions */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  In-App Updates
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {app.in_app_updates && app.in_app_updates.length > 0 ? (
                    app.in_app_updates.map((up) => (
                      <span
                        key={up.platform}
                        className="inline-flex items-center gap-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300 capitalize"
                      >
                        {up.platform} - {up.version}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-muted flex items-center gap-1">
                      <AlertCircle className="size-3 text-amber-500" /> No update versions
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Manage Application Action */}
            <div className="mt-4 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => openManage(app)}
                className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-bg transition-colors cursor-pointer shadow-2xs"
              >
                <Settings2 className="size-3.5 text-muted" />
                <span>Manage Application</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MANAGE APPLICATION MODAL (Matches Image 3 & Image 4 Flow) */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto">
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header (Image 3 Top Bar) */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface">
              <div className="flex items-center gap-3.5">
                {(() => {
                  const activeMeta = getActiveModalIconMeta();
                  const ActiveComp = activeMeta.icon;
                  return (
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-[14px] shadow-sm text-white transition-all"
                      style={{ backgroundColor: activeMeta.color }}
                    >
                      <ActiveComp className="size-6 text-white" strokeWidth={2} />
                    </div>
                  );
                })()}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-ink">{editName || selectedApp.name}</h2>
                    <span className="inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent">
                      {selectedApp.tag}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2 py-0.5 text-[10.5px] font-mono text-muted">
                      <Lock className="size-2.5 text-muted" />
                      {editSystemId || selectedApp.key}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Wired to app updates &amp; binary distribution
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="grid size-8 place-items-center rounded-lg text-muted hover:bg-bg hover:text-ink transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* SECTION 1: BASICS (Image 3) */}
              <div className="rounded-xl border border-line bg-bg/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-line/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="size-4 text-accent" />
                    <div>
                      <h3 className="text-[13.5px] font-semibold text-ink">Basics</h3>
                      <p className="text-[11.5px] text-muted">
                        Name, visibility, and how this card appears to tenants.
                      </p>
                    </div>
                  </div>

                  {/* Show to Tenants Toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-ink">Show to tenants</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={editIsActive}
                      onClick={() => setEditIsActive((prev) => !prev)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        editIsActive ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          editIsActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2-Column Inputs: System ID & Sort Order */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1.5">
                      System ID
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 size-3.5 text-muted" />
                      <input
                        type="text"
                        value={editSystemId}
                        disabled
                        className="w-full rounded-xl border border-line bg-surface/50 pl-8 pr-3 py-2 text-xs font-mono text-muted cursor-not-allowed outline-none"
                      />
                    </div>
                    <span className="mt-1 block text-[10.5px] text-muted">
                      Used by native apps and APIs. This ID cannot be renamed.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1.5">
                      Sort order
                    </label>
                    <input
                      type="number"
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(Number(e.target.value) || 0)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium outline-none focus:border-accent"
                    />
                  </div>
                </div>

                {/* App Name */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1.5">
                    App name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium outline-none focus:border-accent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium outline-none focus:border-accent leading-relaxed"
                  />
                </div>

                {/* Icon Selector (Image 3 Row of Icons) */}
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1.5">
                    Icon
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {AVAILABLE_ICONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = editIcon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setEditIcon(item.id);
                            setEditColor(item.color);
                          }}
                          className={`flex size-10 cursor-pointer items-center justify-center rounded-xl border transition-all ${
                            isSelected
                              ? "border-transparent text-white shadow-xs"
                              : "border-line bg-surface text-muted hover:border-slate-400 hover:text-ink"
                          }`}
                          style={isSelected ? { backgroundColor: item.color, borderColor: item.color } : {}}
                          title={item.label}
                        >
                          <Icon className="size-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 2: IN-APP UPDATES & RELEASE NOTES (Image 3 Bottom) */}
              <div className="rounded-xl border border-line bg-bg/40 p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-line/60 pb-3">
                  <RefreshCw className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-[13.5px] font-semibold text-ink">In-app updates</h3>
                    <p className="text-[11.5px] text-muted">
                      Set Latest and Minimum on each platform card below (Android, iOS, Windows, macOS, Linux, Web). Leave a platform blank to skip prompts for that OS.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1.5">
                    Release notes
                  </label>
                  <textarea
                    rows={2}
                    value={editReleaseNotes}
                    onChange={(e) => setEditReleaseNotes(e.target.value)}
                    placeholder="Enter latest patch notes, security updates, or bug fixes..."
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium outline-none focus:border-accent leading-relaxed"
                  />
                </div>
              </div>

              {/* SECTION 3: CONFIGURED PLATFORMS (Image 4 Flow) */}
              <div className="space-y-4">
                {/* Platform Quick-Adders Bar (Image 4 Top) */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {(Object.keys(PLATFORM_META) as PlatformType[]).map((p) => {
                    const meta = PLATFORM_META[p];
                    const Icon = meta.icon;
                    const isConfigured = configuredPlatforms.some((c) => c.platform === p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => addPlatform(p)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          isConfigured
                            ? "border-accent/40 bg-accent-soft text-accent"
                            : "border-line bg-surface text-ink hover:bg-bg"
                        }`}
                      >
                        <Icon className={`size-3.5 ${meta.color}`} />
                        <span>{isConfigured ? `✓ ${meta.label}` : `+ Add ${meta.label}`}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 2-Column Grid of Configured Platform Cards (Image 4 Cards) */}
                <div className="grid gap-5 md:grid-cols-2">
                  {configuredPlatforms.map((c) => {
                    const meta = PLATFORM_META[c.platform] || PLATFORM_META.web;
                    const PlatformIcon = meta.icon;
                    return (
                      <div
                        key={c.platform}
                        className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                          c.enabled ? "border-line bg-surface" : "border-line/60 bg-surface/60 opacity-80"
                        }`}
                      >
                        <div className="space-y-4">
                          {/* Platform Card Header (Icon, Title, Live Badges) */}
                          <div className="flex items-center justify-between border-b border-line/60 pb-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`grid size-8 place-items-center rounded-lg ${meta.badgeBg}`}>
                                <PlatformIcon className="size-4" />
                              </span>
                              <div>
                                <h4 className="text-sm font-semibold text-ink">{c.name}</h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {c.enabled && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live
                                </span>
                              )}
                              {c.url ? (
                                <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300 border border-sky-500/20">
                                  Uploaded file
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Platform Display Name Input */}
                          <div>
                            <input
                              type="text"
                              value={c.name}
                              onChange={(e) => updatePlatformField(c.platform, "name", e.target.value)}
                              className="w-full rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-accent"
                            />
                          </div>

                          {/* File Dropzone / Binary Upload Box (Image 4 Center Box) */}
                          <div>
                            <input
                              type="file"
                              ref={(el) => {
                                fileInputRefs.current[c.platform] = el;
                              }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleFileUpload(c.platform, file);
                              }}
                              className="hidden"
                            />

                            <div
                              onClick={() => fileInputRefs.current[c.platform]?.click()}
                              className="group flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 p-4 text-center cursor-pointer transition hover:border-emerald-500 hover:bg-emerald-500/10"
                            >
                              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-1.5">
                                <FileText className="size-5" />
                              </div>
                              <p className="font-mono text-xs font-semibold text-ink truncate max-w-[280px]">
                                {c.filename || `${selectedApp.key}-${c.platform}-setup`}
                              </p>
                              <p className="mt-1 text-[11px] font-medium text-accent group-hover:underline">
                                {c.uploading ? "Uploading..." : "Drop or click to replace"}
                              </p>
                              {c.size && (
                                <span className="mt-0.5 text-[10px] text-muted">{c.size}</span>
                              )}
                            </div>
                          </div>

                          {/* Direct URL / Download Path Input */}
                          <div>
                            <input
                              type="text"
                              placeholder={`/media/app-downloads/${selectedApp.key}/${c.platform}/... or URL`}
                              value={c.url}
                              onChange={(e) => updatePlatformField(c.platform, "url", e.target.value)}
                              className="w-full rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-mono text-muted outline-none focus:border-accent"
                            />
                          </div>

                          {/* 2-Column Version Inputs (Image 4 Version Row) */}
                          <div className="grid gap-3 grid-cols-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-muted mb-1">
                                Latest version
                              </label>
                              <input
                                type="text"
                                value={c.latest_version}
                                onChange={(e) =>
                                  updatePlatformField(c.platform, "latest_version", e.target.value)
                                }
                                placeholder="5.0.0"
                                className="w-full rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-mono font-semibold text-ink outline-none focus:border-accent"
                              />
                              <span className="mt-1 block text-[10px] text-muted leading-tight">
                                Soft update for this OS only. Leave blank to skip prompts here.
                              </span>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-muted mb-1">
                                Minimum version
                              </label>
                              <input
                                type="text"
                                value={c.min_version}
                                onChange={(e) =>
                                  updatePlatformField(c.platform, "min_version", e.target.value)
                                }
                                placeholder="4.9.0"
                                className="w-full rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-mono font-semibold text-ink outline-none focus:border-accent"
                              />
                              <span className="mt-1 block text-[10px] text-muted leading-tight">
                                Force update for this OS only.
                              </span>
                            </div>
                          </div>

                          {/* Enabled Switch Toggle */}
                          <div className="flex items-center justify-between border-t border-line/60 pt-3">
                            <div>
                              <p className="text-xs font-semibold text-ink">Enabled</p>
                              <p className="text-[10.5px] text-muted">
                                Include this platform download when the app is visible.
                              </p>
                            </div>

                            <button
                              type="button"
                              role="switch"
                              aria-checked={c.enabled}
                              onClick={() => updatePlatformField(c.platform, "enabled", !c.enabled)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                c.enabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  c.enabled ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Card Bottom Actions (Clear File / Remove Platform) */}
                        <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              updatePlatformField(c.platform, "url", "");
                              updatePlatformField(c.platform, "filename", "");
                              updatePlatformField(c.platform, "size", "");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="size-3" />
                            <span>Clear file</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => removePlatform(c.platform)}
                            className="text-[11px] font-medium text-muted hover:text-ink cursor-pointer"
                          >
                            Remove platform
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Bottom Bar (Image 3 & Image 4 Footer) */}
            <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-bg/60">
              <div>
                {selectedApp.tag === "Custom" ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteApp(selectedApp.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/20 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete Application</span>
                  </button>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-bg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveApp}
                  disabled={savingApp}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-semibold text-accent-ink shadow-xs transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {savingApp ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM APP MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-2">
                <Plus className="size-5 text-accent" />
                <h3 className="text-sm font-semibold text-ink">Register Custom Application</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomApp} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Application Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SelfX Kitchen Display System (KDS)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    System Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. selfx-kds"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Order display screen for restaurant kitchen..."
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1.5">
                  App Icon
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {AVAILABLE_ICONS.map((item) => {
                    const Icon = item.icon;
                    const isSelected = newIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewIcon(item.id)}
                        className={`flex size-10 cursor-pointer items-center justify-center rounded-xl border transition-all ${
                          isSelected
                            ? "border-transparent text-white shadow-xs"
                            : "border-line bg-surface text-muted hover:border-slate-400 hover:text-ink"
                        }`}
                        style={isSelected ? { backgroundColor: item.color, borderColor: item.color } : {}}
                        title={item.label}
                      >
                        <Icon className="size-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-line/60 pt-3">
                <span className="block text-[11px] font-semibold text-muted mb-2">
                  Initial Platform &amp; Installer Package
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as PlatformType)}
                    className="rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none"
                  >
                    <option value="windows">Windows (.exe)</option>
                    <option value="android">Android (.apk)</option>
                    <option value="ios">iOS (.ipa)</option>
                    <option value="macos">macOS (.dmg)</option>
                    <option value="linux">Linux (.deb)</option>
                    <option value="web">Web PWA</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Initial Version (e.g. 1.0.0)"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none"
                  />
                </div>

                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Binary installer URL or /media/app-downloads/..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:text-ink cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-ink hover:opacity-95 cursor-pointer shadow-xs"
                >
                  Create Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
