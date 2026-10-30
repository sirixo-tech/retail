"use client";

import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  Globe,
  Image as ImageIcon,
  KeyRound,
  Languages,
  Layers,
  Lock,
  Monitor,
  Palette,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  ScanLine,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Unlock,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type KioskTerminal = {
  id: string;
  terminal_id: string;
  store_id: string;
  branch_id: string;
  name: string;
  code: string;
  kind: "kiosk" | "pos";
  status: string;
  has_pin: boolean;
  is_paired: boolean;
  paired_at?: string | null;
  device_name?: string | null;
  pairing_code?: string | null;
  pairing_expires_at?: string | null;
  kiosk_url: string;
  customer_display_url: string;
};

type KioskPrintingSettings = {
  auto_print_kiosk_slip: boolean;
  print_validation_qr: boolean;
  qr_size: "S" | "M" | "L";
  print_queue_token_banner: boolean;
  print_itemized_lines: boolean;
  kiosk_slip_copies: number;
  kiosk_slip_instruction: string;
  auto_print_counter_handover_receipt: boolean;
  counter_receipt_copies: number;
  print_serving_checklist: boolean;
  single_use_qr_redemption: boolean;
  require_paid_status_on_scan: boolean;
  open_drawer_on_unpaid_scan: boolean;
  counter_stamp_text: string;
};

type KioskSettings = {
  enabled: boolean;
  welcome_title: string;
  welcome_subtitle: string;
  banner_url: string;
  screensaver_urls: string[];
  accent_color: string;
  layout_columns: "2" | "3" | "4";
  show_product_images: boolean;
  show_stock_badges: boolean;
  show_sku_barcode: boolean;
  enable_barcode_scanner: boolean;
  enable_upsell_recommendations: boolean;
  order_types: {
    in_store: boolean;
    takeaway: boolean;
    express_pickup: boolean;
    delivery: boolean;
  };
  default_order_type: "in_store" | "takeaway" | "express_pickup" | "delivery";
  require_customer_phone: boolean;
  require_customer_name: boolean;
  allow_guest_checkout: boolean;
  payment_modes: {
    upi_qr: boolean;
    card_tap: boolean;
    pay_at_counter: boolean;
  };
  default_language: string;
  supported_languages: string[];
  allow_language_switcher: boolean;
  tax_display_mode: "inclusive" | "exclusive";
  carry_bag_fee_paise: number;
  idle_timeout_seconds: number;
  sound_effects: boolean;
  require_pin_for_settings: boolean;
  printing: KioskPrintingSettings;
};

type TerminalStats = {
  total: number;
  paired: number;
  unpaired: number;
  with_pin: number;
  store_id: string;
  branch_id: string;
  branch_name: string;
  branch_code: string;
};

const DEFAULT_KIOSK_SETTINGS: KioskSettings = {
  enabled: true,
  welcome_title: "Self-Ordering Kiosk",
  welcome_subtitle: "Tap anywhere to browse items, pay instantly, and collect at the counter.",
  banner_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80",
  screensaver_urls: [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=900&q=80",
  ],
  accent_color: "#ea580c",
  layout_columns: "3",
  show_product_images: true,
  show_stock_badges: true,
  show_sku_barcode: true,
  enable_barcode_scanner: true,
  enable_upsell_recommendations: true,
  order_types: {
    in_store: true,
    takeaway: true,
    express_pickup: true,
    delivery: false,
  },
  default_order_type: "express_pickup",
  require_customer_phone: false,
  require_customer_name: false,
  allow_guest_checkout: true,
  payment_modes: {
    upi_qr: true,
    card_tap: true,
    pay_at_counter: false,
  },
  default_language: "en",
  supported_languages: ["en", "hi", "te"],
  allow_language_switcher: true,
  tax_display_mode: "inclusive",
  carry_bag_fee_paise: 0,
  idle_timeout_seconds: 90,
  sound_effects: true,
  require_pin_for_settings: true,
  printing: {
    auto_print_kiosk_slip: true,
    print_validation_qr: true,
    qr_size: "L",
    print_queue_token_banner: true,
    print_itemized_lines: true,
    kiosk_slip_copies: 1,
    kiosk_slip_instruction: "Scan this QR slip at the counter to validate & collect your items.",
    auto_print_counter_handover_receipt: true,
    counter_receipt_copies: 1,
    print_serving_checklist: true,
    single_use_qr_redemption: true,
    require_paid_status_on_scan: true,
    open_drawer_on_unpaid_scan: true,
    counter_stamp_text: "QR VERIFIED AT COUNTER — READY TO SERVE",
  },
};

function xsrfToken() {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

export default function KiosksPage() {
  const [kiosks, setKiosks] = useState<KioskTerminal[]>([]);
  const [settings, setSettings] = useState<KioskSettings>(DEFAULT_KIOSK_SETTINGS);
  const [stats, setStats] = useState<TerminalStats>({
    total: 0,
    paired: 0,
    unpaired: 0,
    with_pin: 0,
    store_id: "",
    branch_id: "",
    branch_name: "Active Branch",
    branch_code: "MAIN",
  });
  const [activeStoreId, setActiveStoreId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<"terminals" | "settings" | "printing" | "media">("terminals");

  // Modals
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openPairModal, setOpenPairModal] = useState(false);
  const [openPinModal, setOpenPinModal] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState<KioskTerminal | null>(null);

  // Modal Form States
  const [kioskName, setKioskName] = useState("");
  const [kioskCode, setKioskCode] = useState("");
  const [kioskPin, setKioskPin] = useState("");
  const [kioskStatus, setKioskStatus] = useState<"active" | "inactive">("active");
  const [pairMode, setPairMode] = useState<"enter_code" | "generate_code">("enter_code");
  const [pairingInputCode, setPairingInputCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [screensaverUrl, setNewScreensaverUrl] = useState("");

  async function loadKiosks() {
    setLoading(true);
    try {
      const storesRes = await fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } });
      if (!storesRes.ok) return;
      const storesBody = await storesRes.json();
      const branchId = storesBody.data?.stats?.active_location_id || storesBody.data?.stores?.[0]?.id;
      if (!branchId) return;
      setActiveStoreId(branchId);

      const res = await fetch(`/api/v1/stores/${branchId}/terminals?kind=kiosk`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json();
        const rows: KioskTerminal[] = body.data?.kiosks ?? body.data?.terminals ?? [];
        setKiosks(rows);
        if (body.data?.kiosk_settings) {
          setSettings({
            ...DEFAULT_KIOSK_SETTINGS,
            ...body.data.kiosk_settings,
            order_types: { ...DEFAULT_KIOSK_SETTINGS.order_types, ...(body.data.kiosk_settings.order_types ?? {}) },
            payment_modes: { ...DEFAULT_KIOSK_SETTINGS.payment_modes, ...(body.data.kiosk_settings.payment_modes ?? {}) },
            printing: { ...DEFAULT_KIOSK_SETTINGS.printing, ...(body.data.kiosk_settings.printing ?? {}) },
          });
        }
        if (body.data?.stats) {
          setStats(body.data.stats);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKiosks();
  }, []);

  function notify(text: string, error = false) {
    setToast({ text, error });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSaveSettings(nextSettings: KioskSettings = settings) {
    if (!activeStoreId) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/v1/stores/${activeStoreId}/kiosk-settings`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify({ kiosk_settings: nextSettings }),
      });
      if (res.ok) {
        notify("Kiosk configuration and QR printing rules saved for this branch.");
      } else {
        notify("Could not save kiosk settings.", true);
      }
    } catch {
      notify("Network error saving kiosk settings.", true);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleCreateKiosk(e: FormEvent) {
    e.preventDefault();
    if (!activeStoreId) return;
    setModalSaving(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify({
          name: kioskName,
          code: kioskCode ? kioskCode.toUpperCase().trim() : undefined,
          kind: "kiosk",
          pin: kioskPin.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setModalError(body?.error?.message ?? "Could not create kiosk terminal.");
        return;
      }
      setOpenAddModal(false);
      setKioskName("");
      setKioskCode("");
      setKioskPin("");
      notify("Kiosk station added.");
      await loadKiosks();
    } catch {
      setModalError("Failed to create kiosk terminal.");
    } finally {
      setModalSaving(false);
    }
  }

  async function handleUpdateKiosk(e: FormEvent) {
    e.preventDefault();
    if (!activeStoreId || !selectedKiosk) return;
    setModalSaving(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals/${selectedKiosk.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify({
          name: kioskName,
          code: kioskCode ? kioskCode.toUpperCase().trim() : undefined,
          status: kioskStatus,
          kind: "kiosk",
          pin: kioskPin.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setModalError(body?.error?.message ?? "Could not update kiosk terminal.");
        return;
      }
      setOpenEditModal(false);
      notify("Kiosk station updated.");
      await loadKiosks();
    } catch {
      setModalError("Failed to update kiosk terminal.");
    } finally {
      setModalSaving(false);
    }
  }

  async function handleSetTerminalPin(e: FormEvent) {
    e.preventDefault();
    if (!activeStoreId || !selectedKiosk) return;
    setModalSaving(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals/${selectedKiosk.id}/pin`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify({ pin: kioskPin.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setModalError(body?.error?.message ?? "Enter a 4 to 6 digit PIN.");
        return;
      }
      setOpenPinModal(false);
      setKioskPin("");
      notify(`PIN saved for ${selectedKiosk.name}.`);
      await loadKiosks();
    } catch {
      setModalError("Failed to save PIN.");
    } finally {
      setModalSaving(false);
    }
  }

  async function handleClearTerminalPin() {
    if (!activeStoreId || !selectedKiosk) return;
    setModalSaving(true);
    try {
      await fetch(`/api/v1/stores/${activeStoreId}/terminals/${selectedKiosk.id}/pin`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify({ clear: true }),
      });
      setOpenPinModal(false);
      setKioskPin("");
      notify(`PIN removed from ${selectedKiosk.name}.`);
      await loadKiosks();
    } finally {
      setModalSaving(false);
    }
  }

  async function handlePairSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeStoreId || !selectedKiosk) return;
    setModalSaving(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals/${selectedKiosk.id}/pair`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken(),
        },
        body: JSON.stringify({
          code: pairMode === "enter_code" ? pairingInputCode : undefined,
          device_name: deviceName,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setModalError(body?.error?.message ?? "Pairing failed.");
        return;
      }
      if (pairMode === "generate_code" && body.data?.pairing_code) {
        setGeneratedPin(body.data.pairing_code);
      } else {
        setOpenPairModal(false);
        notify(`${selectedKiosk.name} paired with hardware display.`);
        await loadKiosks();
      }
    } catch {
      setModalError("Failed to pair kiosk.");
    } finally {
      setModalSaving(false);
    }
  }

  async function handleUnpair(k: KioskTerminal) {
    if (!activeStoreId) return;
    await fetch(`/api/v1/stores/${activeStoreId}/terminals/${k.id}/unpair`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "X-XSRF-TOKEN": xsrfToken() },
    });
    notify(`${k.name} unpaired.`);
    await loadKiosks();
  }

  async function handleDelete(k: KioskTerminal) {
    if (!activeStoreId) return;
    await fetch(`/api/v1/stores/${activeStoreId}/terminals/${k.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json", "X-XSRF-TOKEN": xsrfToken() },
    });
    notify(`${k.name} removed.`);
    await loadKiosks();
  }

  function copyText(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function scrollToSection(id: "terminals" | "settings" | "printing" | "media") {
    setActiveNav(id);
    const el = document.getElementById(`kiosk-section-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const pairedCount = kiosks.filter((k) => k.is_paired).length;
  const unpairedCount = kiosks.length - pairedCount;

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Devices &amp; Channels</span>
            <span>/</span>
            <span className="text-[#ea580c]">Self-Ordering Kiosks</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            In-Store Self-Ordering Kiosks
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage kiosk touchscreens, 6-digit pairing codes or credential login, terminal PINs, prepaid QR slips, and counter validation rules for{" "}
            <span className="font-semibold text-slate-700">{stats.branch_name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {stats.store_id && (
            <div className="hidden xl:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-400">STORE ID:</span>
              <span className="font-mono text-slate-800">{stats.store_id.slice(0, 13)}…</span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-slate-400">BRANCH ID:</span>
              <span className="font-mono text-slate-800">{stats.branch_id.slice(0, 13)}…</span>
            </div>
          )}
          <Link
            href="/printer-setup"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Printer &amp; QR Slip Setup
          </Link>
          <button
            type="button"
            disabled={savingSettings}
            onClick={() => void handleSaveSettings()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#ea580c] px-4 text-xs font-semibold text-white hover:bg-[#c2410c] disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingSettings ? "Saving..." : "Save All Kiosk Settings"}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${
            toast.error
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toast.text}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Kiosk Overview Card (Matching Reference Image Top Banner) */}
      <div className="rounded-xl border border-emerald-200/80 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-slate-900">Kiosk Overview</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {stats.branch_name} ({stats.branch_code})
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Supports Email/Password Login, Mobile OTP Login, or 6-Digit Pairing Code
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                Total Kiosks
              </div>
              <Tablet className="h-4 w-4 text-[#ea580c]" />
            </div>
            <div className="num mt-2 text-2xl font-bold text-slate-900">{kiosks.length}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">Configured in {stats.branch_name}</div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Paired &amp; Online
              </div>
              <Wifi className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="num mt-2 text-2xl font-bold text-slate-900">{pairedCount}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">Linked to physical touchscreen</div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Unpaired / Ready
              </div>
              <KeyRound className="h-4 w-4 text-amber-600" />
            </div>
            <div className="num mt-2 text-2xl font-bold text-slate-900">{unpairedCount}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">Awaiting code or staff login</div>
          </div>
        </div>
      </div>

      {/* Main Layout: Left Sub-Nav + Right Scrollable Sections (Matching Reference Image) */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Sticky Sub-Navigation */}
        <div className="lg:col-span-3 lg:sticky lg:top-6">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1">
            {[
              { id: "terminals", label: "Kiosks", icon: Tablet, count: kiosks.length },
              { id: "settings", label: "Kiosk Settings", icon: Settings2 },
              { id: "printing", label: "QR & Counter Print", icon: QrCode },
              { id: "media", label: "Media & Banners", icon: ImageIcon },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id as any)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                    active
                      ? "bg-[#ea580c] text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`num rounded-full px-2 py-0.5 text-[10px] ${
                        active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Column */}
        <div className="lg:col-span-9 space-y-8">
          {/* =================================================================
           * SECTION 1: KIOSK TERMINALS
           * ================================================================= */}
          <section id="kiosk-section-terminals" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ea580c] text-white">
                  <Tablet className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Kiosk Terminals</h2>
                  <p className="text-[11px] text-slate-500">
                    Each kiosk station has its own terminal code, optional security PIN, and invoice series.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setKioskName("");
                  setKioskCode("");
                  setKioskPin("");
                  setModalError(null);
                  setOpenAddModal(true);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#ea580c] px-4 text-xs font-semibold text-white hover:bg-[#c2410c]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Add Kiosk</span>
              </button>
            </div>

            {/* 3-Step Setup Guide Banner */}
            <div className="rounded-xl border border-orange-200/80 bg-orange-50/40 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <Sparkles className="h-4 w-4 text-[#ea580c]" />
                <span>How Kiosk Sign-In, Pairing &amp; Counter Validation Works</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-orange-200/60 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ea580c] text-[10px] font-bold text-white">
                      1
                    </span>
                    Add Kiosk &amp; Set PIN
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Create a kiosk station (e.g. K1, K2) for this branch and set a 4–6 digit terminal PIN so customers cannot exit kiosk mode.
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200/60 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ea580c] text-[10px] font-bold text-white">
                      2
                    </span>
                    Login or 6-Digit Pair
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    On the kiosk app, sign in with Email/Password or Mobile OTP (then pick Branch &rarr; Kiosk Terminal), or pair with a 6-digit code.
                  </p>
                </div>
                <div className="rounded-lg border border-orange-200/60 bg-white p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ea580c] text-[10px] font-bold text-white">
                      3
                    </span>
                    Prepay &rarr; QR Slip &rarr; Counter Scan
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Customer prepays on the kiosk and gets a QR receipt. Scanning that QR at the POS counter validates and prints the handover receipt.
                  </p>
                </div>
              </div>
            </div>

            {/* Kiosk Cards Grid (2 Columns like Reference Image) */}
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                Loading kiosk stations...
              </div>
            ) : kiosks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <Tablet className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">No Kiosk Terminals Added Yet</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Add your first self-ordering kiosk station for {stats.branch_name} to enable in-store self-checkout.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setKioskName("Front Entrance Kiosk #1");
                    setKioskCode("K1");
                    setKioskPin("");
                    setModalError(null);
                    setOpenAddModal(true);
                  }}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#ea580c] px-4 text-xs font-semibold text-white hover:bg-[#c2410c]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add First Kiosk (K1)</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {kiosks.map((k) => (
                  <div
                    key={k.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Tablet className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{k.name}</h3>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                                {k.code}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {k.device_name || (k.is_paired ? "Paired Kiosk Touchscreen" : "Unpaired Kiosk Station")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              k.is_paired
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                k.is_paired ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            {k.is_paired ? "Paired" : "Unpaired"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              k.has_pin
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}
                          >
                            {k.has_pin ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                            {k.has_pin ? "PIN Set" : "No PIN"}
                          </span>
                        </div>
                      </div>

                      {/* Kiosk URL / Identifier Bar */}
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                        <span className="truncate font-mono text-[11px] text-slate-600">{k.kiosk_url}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyText(k.id, k.kiosk_url)}
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-white"
                          >
                            {copiedId === k.id ? "Copied" : "Copy"}
                          </button>
                          <a
                            href={k.kiosk_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-1 text-slate-500 hover:bg-white hover:text-slate-900"
                            title="Open Kiosk Preview"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        {k.is_paired ? (
                          <button
                            type="button"
                            onClick={() => void handleUnpair(k)}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Unpair
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKiosk(k);
                              setPairingInputCode("");
                              setDeviceName(k.device_name || `Kiosk ${k.code} Display`);
                              setGeneratedPin(null);
                              setModalError(null);
                              setPairMode("enter_code");
                              setOpenPairModal(true);
                            }}
                            className="inline-flex h-7 items-center gap-1 rounded-md bg-[#ea580c] px-2.5 text-[11px] font-semibold text-white hover:bg-[#c2410c]"
                          >
                            <QrCode className="h-3 w-3" />
                            Pair Kiosk
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKiosk(k);
                            setKioskPin("");
                            setModalError(null);
                            setOpenPinModal(true);
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <KeyRound className="h-3 w-3 text-slate-500" />
                          {k.has_pin ? "Change PIN" : "Set PIN"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKiosk(k);
                            setKioskName(k.name);
                            setKioskCode(k.code);
                            setKioskStatus((k.status as "active" | "inactive") || "active");
                            setKioskPin("");
                            setModalError(null);
                            setOpenEditModal(true);
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3 text-slate-500" />
                          Edit
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDelete(k)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-200 bg-rose-50/60 px-2.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* =================================================================
           * SECTION 2: KIOSK SETTINGS (Matching Reference Image Toggles & Cards)
           * ================================================================= */}
          <section id="kiosk-section-settings" className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ea580c] text-white">
                <Settings2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Kiosk Settings</h2>
                <p className="text-[11px] text-slate-500">
                  Configure self-ordering behavior, customer checkout fields, fulfillment modes, and payment methods.
                </p>
              </div>
            </div>

            {/* Master Enable Card */}
            <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Enable Self-Service Kiosk Ordering</h3>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Allow customers in {stats.branch_name} to browse the live store catalog, place orders, and print QR pickup tokens.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  settings.enabled ? "bg-[#ea580c]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    settings.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Customer & Catalog Behavior Toggles */}
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              <div className="p-4 bg-orange-50/30">
                <h3 className="text-xs font-semibold text-slate-900">Customer Experience &amp; Checkout Flow</h3>
                <p className="text-[11px] text-slate-500">
                  Control what customer details are requested and how products appear on the kiosk touchscreen.
                </p>
              </div>

              {(
                [
                  [
                    "require_customer_phone",
                    "Require Customer Mobile Number at Checkout",
                    "Ask for a 10-digit mobile number to link loyalty points and send digital bill updates.",
                  ],
                  [
                    "require_customer_name",
                    "Ask for Customer Name on Order Token",
                    "Print the customer's name alongside the queue token number on the kiosk slip.",
                  ],
                  [
                    "allow_guest_checkout",
                    "Allow Fast Guest / Anonymous Checkout",
                    "Let walk-in shoppers skip phone entry and pay immediately via UPI QR or Card.",
                  ],
                  [
                    "show_product_images",
                    "Show High-Resolution Product Photos",
                    "Display product thumbnails on category grids and cart review drawers.",
                  ],
                  [
                    "show_stock_badges",
                    "Show Live Available Stock & Hide Out-of-Stock Items",
                    "Prevent customers from ordering items with zero available branch stock.",
                  ],
                  [
                    "enable_barcode_scanner",
                    "Enable Physical Barcode Scanner on Kiosk",
                    "Allow shoppers to scan item barcodes directly at the kiosk to add products to their bag.",
                  ],
                  [
                    "enable_upsell_recommendations",
                    "Show Smart Cart Upsell & Add-On Suggestions",
                    "Recommend complementary items from the same category before payment.",
                  ],
                  [
                    "sound_effects",
                    "Touch & Barcode Scan Audio Beep Feedback",
                    "Play subtle confirmation tones when items are scanned or payment succeeds.",
                  ],
                  [
                    "require_pin_for_settings",
                    "Lock Kiosk Exit & Admin Menu Behind Terminal PIN",
                    "Require the 4–6 digit terminal PIN before staff can switch branches or exit kiosk fullscreen.",
                  ],
                ] as const
              ).map(([key, title, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{title}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, [key]: !s[key] }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                      settings[key] ? "bg-[#ea580c]" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        settings[key] ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Types & Payment Methods Grid (2 Columns like Reference Image) */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Order Fulfillment Modes */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Allowed Kiosk Order Modes</h3>
                  <p className="text-[11px] text-slate-500">Choose how customers can collect their kiosk order.</p>
                </div>

                {(
                  [
                    ["express_pickup", "Counter Express Pickup (QR Scan)", "Prepay at kiosk, scan QR at counter to collect items"],
                    ["takeaway", "Takeaway / Parcel Pack", "Packed in carry bags for takeaway"],
                    ["in_store", "In-Store / Dine-In Consumption", "Consume inside the store premises"],
                    ["delivery", "Schedule Home Delivery", "Customer enters address at kiosk for delivery"],
                  ] as const
                ).map(([k, label, sub]) => (
                  <label
                    key={k}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 text-xs hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={settings.order_types[k]}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          order_types: { ...s.order_types, [k]: e.target.checked },
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded accent-[#ea580c]"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{label}</div>
                      <div className="text-[11px] text-slate-500">{sub}</div>
                    </div>
                  </label>
                ))}
              </div>

              {/* Payment Modes & Idle Timeout */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Payment Modes &amp; Session Timeout</h3>
                  <p className="text-[11px] text-slate-500">Prepaid modes issue a verified QR slip immediately.</p>
                </div>

                {(
                  [
                    ["upi_qr", "UPI Dynamic QR (Instant Prepaid)", "Displays dynamic UPI QR on kiosk screen; prints paid QR slip"],
                    ["card_tap", "Card / NFC Tap & Pay Reader", "Integrated Pine Labs / Razorpay POS card reader"],
                    ["pay_at_counter", "Pay at Counter (Unpaid QR Slip)", "Prints unpaid QR token; cashier collects cash/card on scan"],
                  ] as const
                ).map(([k, label, sub]) => (
                  <label
                    key={k}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-2.5 text-xs hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={settings.payment_modes[k]}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          payment_modes: { ...s.payment_modes, [k]: e.target.checked },
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded accent-[#ea580c]"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{label}</div>
                      <div className="text-[11px] text-slate-500">{sub}</div>
                    </div>
                  </label>
                ))}

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Idle Reset Timeout (Sec)
                    <input
                      type="number"
                      min={30}
                      max={600}
                      value={settings.idle_timeout_seconds}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, idle_timeout_seconds: Number(e.target.value) || 90 }))
                      }
                      className="num mt-1 h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
                    />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Carry Bag Fee (₹)
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={Math.round((settings.carry_bag_fee_paise || 0) / 100)}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          carry_bag_fee_paise: Math.max(0, Math.round(Number(e.target.value) * 100)),
                        }))
                      }
                      className="num mt-1 h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
           * SECTION 3: KIOSK QR RECEIPT & COUNTER VALIDATION PRINTING
           * ================================================================= */}
          <section id="kiosk-section-printing" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ea580c] text-white">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Kiosk QR Slip &rarr; Counter Scan Dual-Receipt Rules
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Receipt #1 prints at the Kiosk with a validation QR code. Receipt #2 prints at the Counter when staff scan that QR.
                  </p>
                </div>
              </div>
              <Link
                href="/printer-setup"
                className="text-xs font-semibold text-[#ea580c] hover:underline flex items-center gap-1"
              >
                <span>Open Full Printer Hardware &amp; Template Setup</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Receipt #1: Kiosk Slip */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-semibold text-slate-900">1. Kiosk Prepaid Order Slip</span>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#ea580c]">
                    Prints at Kiosk
                  </span>
                </div>

                {(
                  [
                    ["auto_print_kiosk_slip", "Auto-print slip immediately when payment is captured"],
                    ["print_validation_qr", "Print scannable validation QR code on kiosk receipt"],
                    ["print_queue_token_banner", "Print giant queue token banner (e.g. TOKEN #K-001)"],
                    ["print_itemized_lines", "Include itemized product list on kiosk slip"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={settings.printing[k]}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          printing: { ...s.printing, [k]: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded accent-[#ea580c]"
                    />
                  </label>
                ))}

                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Kiosk Slip Instruction Line
                    <input
                      value={settings.printing.kiosk_slip_instruction}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          printing: { ...s.printing, kiosk_slip_instruction: e.target.value },
                        }))
                      }
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
                    />
                  </label>
                </div>
              </div>

              {/* Receipt #2: Counter Handover Receipt */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-semibold text-slate-900">2. Counter QR Validation Receipt</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Prints at Counter on Scan
                  </span>
                </div>

                {(
                  [
                    ["auto_print_counter_handover_receipt", "Auto-print 2nd handover receipt when QR is scanned"],
                    ["single_use_qr_redemption", "Block duplicate QR scans (Single-use redemption lock)"],
                    ["require_paid_status_on_scan", "Verify PAID status before releasing handover receipt"],
                    ["print_serving_checklist", "Print item serving checkboxes for counter staff"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center justify-between gap-2 text-xs text-slate-700">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={settings.printing[k]}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          printing: { ...s.printing, [k]: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded accent-[#ea580c]"
                    />
                  </label>
                ))}

                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Counter Verification Stamp Header
                    <input
                      value={settings.printing.counter_stamp_text}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          printing: { ...s.printing, counter_stamp_text: e.target.value },
                        }))
                      }
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
           * SECTION 4: MEDIA, BANNERS & APPEARANCE (Matching Reference Bottom)
           * ================================================================= */}
          <section id="kiosk-section-media" className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ea580c] text-white">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Kiosk Media, Banner &amp; Idle Screensaver</h2>
                <p className="text-[11px] text-slate-500">
                  Customize the promotional banner image, welcome headline, and attract-screen gallery shown on kiosks.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Welcome Headline
                  <input
                    value={settings.welcome_title}
                    onChange={(e) => setSettings((s) => ({ ...s, welcome_title: e.target.value }))}
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Welcome Subtitle
                  <input
                    value={settings.welcome_subtitle}
                    onChange={(e) => setSettings((s) => ({ ...s, welcome_subtitle: e.target.value }))}
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Promo Hero Banner URL
                </label>
                <input
                  value={settings.banner_url}
                  onChange={(e) => setSettings((s) => ({ ...s, banner_url: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900"
                />
                {settings.banner_url && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <img
                      src={settings.banner_url}
                      alt="Kiosk Promo Banner"
                      className="h-52 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">Idle Screensaver / Attract Loop Slides</h4>
                    <p className="text-[11px] text-slate-500">
                      Displayed when the kiosk is idle for {settings.idle_timeout_seconds} seconds.
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {settings.screensaver_urls.map((url, idx) => (
                    <div key={idx} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <img src={url} alt={`Slide ${idx + 1}`} className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            screensaver_urls: s.screensaver_urls.filter((_, i) => i !== idx),
                          }))
                        }
                        className="absolute top-1.5 right-1.5 rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-rose-700 shadow-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={screensaverUrl}
                    onChange={(e) => setNewScreensaverUrl(e.target.value)}
                    placeholder="Add screensaver image URL (https://...)"
                    className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!screensaverUrl.trim()) return;
                      setSettings((s) => ({
                        ...s,
                        screensaver_urls: [...s.screensaver_urls, screensaverUrl.trim()],
                      }));
                      setNewScreensaverUrl("");
                    }}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    + Add Slide
                  </button>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={() => void handleSaveSettings()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#ea580c] px-5 text-xs font-semibold text-white hover:bg-[#c2410c] disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{savingSettings ? "Saving..." : "Save Kiosk Settings"}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* =================================================================
       * MODAL 1: ADD KIOSK TERMINAL
       * ================================================================= */}
      {openAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Add Self-Ordering Kiosk</h3>
              <button type="button" onClick={() => setOpenAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKiosk} className="mt-4 space-y-3.5">
              {modalError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Kiosk Station Name *</label>
                <input
                  required
                  value={kioskName}
                  onChange={(e) => setKioskName(e.target.value)}
                  placeholder="e.g. Entrance Self-Order Kiosk #1"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Kiosk Code</label>
                  <input
                    value={kioskCode}
                    onChange={(e) => setKioskCode(e.target.value.toUpperCase())}
                    placeholder="Auto (e.g. K1)"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Terminal Security PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={kioskPin}
                    onChange={(e) => setKioskPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="4–6 digits (Optional)"
                    className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="h-9 rounded-lg bg-[#ea580c] px-4 text-xs font-semibold text-white hover:bg-[#c2410c] disabled:opacity-60"
                >
                  {modalSaving ? "Creating..." : "Create Kiosk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================
       * MODAL 2: EDIT KIOSK TERMINAL
       * ================================================================= */}
      {openEditModal && selectedKiosk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">Edit Kiosk ({selectedKiosk.code})</h3>
              <button type="button" onClick={() => setOpenEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateKiosk} className="mt-4 space-y-3.5">
              {modalError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">Kiosk Name *</label>
                <input
                  required
                  value={kioskName}
                  onChange={(e) => setKioskName(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Kiosk Code</label>
                  <input
                    value={kioskCode}
                    onChange={(e) => setKioskCode(e.target.value.toUpperCase())}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={kioskStatus}
                    onChange={(e) => setKioskStatus(e.target.value as "active" | "inactive")}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Standby / Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenEditModal(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="h-9 rounded-lg bg-[#ea580c] px-4 text-xs font-semibold text-white hover:bg-[#c2410c] disabled:opacity-60"
                >
                  {modalSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================
       * MODAL 3: SET / MANAGE TERMINAL PIN
       * ================================================================= */}
      {openPinModal && selectedKiosk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#ea580c]" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Kiosk Terminal PIN — {selectedKiosk.name}
                </h3>
              </div>
              <button type="button" onClick={() => setOpenPinModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSetTerminalPin} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                This 4–6 digit PIN is required when selecting this terminal after login or when unlocking the kiosk admin menu on the physical screen.
              </p>

              {modalError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700">New 4 to 6 Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  required
                  minLength={4}
                  maxLength={6}
                  value={kioskPin}
                  onChange={(e) => setKioskPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••"
                  className="num mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-center font-mono text-base tracking-widest text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {selectedKiosk.has_pin ? (
                  <button
                    type="button"
                    onClick={() => void handleClearTerminalPin()}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Remove PIN
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenPinModal(false)}
                    className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving || kioskPin.length < 4}
                    className="h-9 rounded-lg bg-[#ea580c] px-4 text-xs font-semibold text-white hover:bg-[#c2410c] disabled:opacity-60"
                  >
                    {modalSaving ? "Saving..." : "Save PIN"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================
       * MODAL 4: PAIR KIOSK (6-DIGIT CODE OR CREDENTIAL LOGIN)
       * ================================================================= */}
      {openPairModal && selectedKiosk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Pair Kiosk Display — {selectedKiosk.name} ({selectedKiosk.code})
              </h3>
              <button type="button" onClick={() => setOpenPairModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setPairMode("enter_code");
                  setGeneratedPin(null);
                }}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${
                  pairMode === "enter_code" ? "bg-white text-slate-900" : "text-slate-500"
                }`}
              >
                Enter Code from Kiosk
              </button>
              <button
                type="button"
                onClick={() => setPairMode("generate_code")}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${
                  pairMode === "generate_code" ? "bg-white text-slate-900" : "text-slate-500"
                }`}
              >
                Generate 6-Digit Code
              </button>
            </div>

            <form onSubmit={handlePairSubmit} className="mt-4 space-y-4">
              {modalError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700">
                  {modalError}
                </div>
              )}

              {pairMode === "enter_code" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      6-Digit Code Shown on Kiosk Screen
                    </label>
                    <input
                      required
                      value={pairingInputCode}
                      onChange={(e) => setPairingInputCode(e.target.value)}
                      placeholder="123-456"
                      className="num mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-center font-mono text-base tracking-widest text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Hardware Device Label</label>
                    <input
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g. Entrance 24-inch Touch Kiosk"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                    />
                  </div>
                </>
              ) : generatedPin ? (
                <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Enter this code on the Kiosk App
                  </div>
                  <div className="num mt-2 font-mono text-3xl font-bold tracking-widest text-[#ea580c]">
                    {generatedPin}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Valid for 10 minutes.</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Generate a 6-digit pairing code to type into the Kiosk app. You can also sign in on the Kiosk using Email &amp; Password or Mobile OTP and select Branch{" "}
                  <span className="font-semibold text-slate-700">{stats.branch_name}</span> &rarr;{" "}
                  <span className="font-semibold text-slate-700">{selectedKiosk.code}</span>.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOpenPairModal(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600"
                >
                  Close
                </button>
                {!generatedPin && (
                  <button
                    type="submit"
                    disabled={modalSaving}
                    className="h-9 rounded-lg bg-[#ea580c] px-4 text-xs font-semibold text-white hover:bg-[#c2410c] disabled:opacity-60"
                  >
                    {modalSaving ? "Working..." : pairMode === "enter_code" ? "Pair Kiosk Now" : "Generate Code"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
