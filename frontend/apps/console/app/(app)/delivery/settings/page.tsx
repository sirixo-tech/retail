"use client";

import { PageHeader } from "@selfx/ui";
import {
  AlertCircle,
  Bell,
  Bike,
  Car,
  Check,
  CheckCircle2,
  FileText,
  Info,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  Truck,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DeliveryNav } from "../delivery-nav";

type Settings = {
  share_phone: boolean;
  notify_new_order: boolean;
  notify_chat: boolean;
  vehicle: string;
  note: string;
};

const DEFAULT_SETTINGS: Settings = {
  share_phone: true,
  notify_new_order: true,
  notify_chat: true,
  vehicle: "",
  note: "",
};

const VEHICLE_PRESETS = [
  { id: "Motorcycle / Bike", label: "Motorcycle", icon: Bike, desc: "Fast city delivery" },
  { id: "Scooter / Moped", label: "Scooter", icon: Bike, desc: "Agile urban runs" },
  { id: "Electric EV Scooter", label: "EV Scooter", icon: Zap, desc: "Eco-friendly" },
  { id: "Delivery Van", label: "Van / Cargo", icon: Truck, desc: "Bulk & heavy parcels" },
  { id: "Car / Sedan", label: "Car", icon: Car, desc: "All-weather express" },
];

export default function DeliverySettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/delivery/settings", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          const loaded = { ...DEFAULT_SETTINGS, ...body.data };
          setSettings(loaded);
          setInitialSettings(loaded);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/v1/delivery/settings", {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrf(),
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to update delivery settings.");
      }

      setInitialSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(initialSettings);
    setErrorMessage(null);
    setSaveSuccess(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      {/* Page Title & Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Partner Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure vehicle details, customer tracking privacy, and real-time alert preferences.
          </p>
        </div>

        <Link
          href="/delivery"
          className="inline-flex h-9 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 sm:self-auto"
        >
          <Truck size={13} className="text-slate-400" />
          <span>Dispatch Board</span>
        </Link>
      </div>

      {/* Sub-Navigation Bar */}
      <DeliveryNav />

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-900 shadow-xs animate-in fade-in duration-200">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold">Settings saved successfully</h4>
            <p className="text-xs text-emerald-700">
              Your vehicle profile, notification triggers, and customer contact preferences are up to date.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900 shadow-xs">
          <AlertCircle size={20} className="shrink-0 text-rose-600" />
          <p className="text-xs font-medium">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Card 1: Vehicle & Transport Profile */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Bike size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Vehicle & Transport Mode</h2>
                <p className="text-xs text-slate-500">
                  Select your primary transport mode so dispatchers know parcel capacity and speed.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {/* Quick Presets Grid */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Vehicle Type
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {VEHICLE_PRESETS.map((v) => {
                  const Icon = v.icon;
                  const selected =
                    settings.vehicle.toLowerCase().includes(v.label.toLowerCase()) ||
                    settings.vehicle === v.id;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSettings({ ...settings, vehicle: v.label })}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition cursor-pointer ${
                        selected
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-2xs ring-1 ring-indigo-500"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          selected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <span className="mt-2 text-xs font-bold">{v.label}</span>
                      <span className="text-[10px] text-slate-400">{v.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Vehicle Details Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Vehicle Model or Registration Number (Optional)
              </label>
              <input
                type="text"
                value={settings.vehicle}
                onChange={(e) => setSettings({ ...settings, vehicle: e.target.value })}
                placeholder="e.g. Honda Activa 6G (KA-01-EQ-1234) or Electric Scooter"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Visible to store dispatch managers to assign appropriate orders.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Customer Contact & Privacy */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Phone size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Customer Contact & Privacy</h2>
                <p className="text-xs text-slate-500">
                  Control what contact details appear on the customer&apos;s live tracking screen.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <ToggleCard
              title="Share phone number on live tracking"
              description="When enabled, a click-to-call button with your phone number will be available on the customer's order tracking page once the order is Out for Delivery."
              icon={Phone}
              checked={settings.share_phone}
              badge={settings.share_phone ? "Visible to Customer" : "Hidden (Chat Only)"}
              badgeTone={settings.share_phone ? "emerald" : "slate"}
              onChange={(checked) => setSettings({ ...settings, share_phone: checked })}
            />
          </div>
        </div>

        {/* Card 3: Alert & Notification Preferences */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Bell size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Live Alert Preferences</h2>
                <p className="text-xs text-slate-500">
                  Stay updated with instant visual and audio chimes while on your shift.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 p-4 sm:p-6 space-y-4 divide-y-0">
            <ToggleCard
              title="Alert when a new delivery is assigned"
              description="Play sound chime and flash visual alert when a dispatcher assigns an order to your route."
              icon={Truck}
              checked={settings.notify_new_order}
              onChange={(checked) => setSettings({ ...settings, notify_new_order: checked })}
            />

            <ToggleCard
              title="Alert when a customer sends a message"
              description="Receive instant audio chime and popup alert when a customer sends a tracking chat message."
              icon={MessageSquare}
              checked={settings.notify_chat}
              onChange={(checked) => setSettings({ ...settings, notify_chat: checked })}
            />
          </div>
        </div>

        {/* Card 4: Store Dispatch Notes & Service Area */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Dispatch Notes & Coverage</h2>
                <p className="text-xs text-slate-500">
                  Notes for the store manager regarding your equipment, route, or shift limitations.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Notes for Store Manager / Dispatcher
            </label>
            <textarea
              value={settings.note}
              onChange={(e) => setSettings({ ...settings, note: e.target.value })}
              maxLength={240}
              placeholder="e.g. Equipped with insulated thermal delivery bag. Carrying cash change float ₹3,000. Covering Sector 4 and HSR layout."
              className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Helps cashiers assign optimal routes and orders with special handling.</span>
              <span>{settings.note.length}/240</span>
            </div>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-md backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-2">
            {hasChanges ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Check size={14} className="text-emerald-600" />
                Settings up to date
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-9 items-center rounded-xl px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                Discard
              </button>
            )}

            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface ToggleCardProps {
  title: string;
  description: string;
  icon: any;
  checked: boolean;
  badge?: string;
  badgeTone?: "emerald" | "slate";
  onChange: (value: boolean) => void;
}

function ToggleCard({
  title,
  description,
  icon: Icon,
  checked,
  badge,
  badgeTone = "emerald",
  onChange,
}: ToggleCardProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition hover:bg-slate-50 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
          <Icon size={16} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-900">{title}</span>
            {badge && (
              <span
                className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                  badgeTone === "emerald"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xl">{description}</p>
        </div>
      </div>

      {/* Modern iOS / SaaS Style Toggle Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`relative mt-1 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function csrf(): string {
  if (typeof document === "undefined") return "";
  return (
    decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? ""
    ) || ""
  );
}
