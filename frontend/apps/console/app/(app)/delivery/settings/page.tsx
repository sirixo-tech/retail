"use client";

import { PageHeader } from "@selfx/ui";
import { useEffect, useState } from "react";

type Settings = {
  share_phone: boolean;
  notify_new_order: boolean;
  notify_chat: boolean;
  vehicle: string;
  note: string;
};

const empty: Settings = {
  share_phone: true,
  notify_new_order: true,
  notify_chat: true,
  vehicle: "",
  note: "",
};

export default function DeliverySettingsPage() {
  const [settings, setSettings] = useState<Settings>(empty);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/delivery/settings", { credentials: "include", headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) setSettings({ ...empty, ...body.data });
      });
  }, []);

  const save = async () => {
    const res = await fetch("/api/v1/delivery/settings", {
      method: "PUT",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify(settings),
    });
    if (res.ok) setSaved("Saved");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Partner settings" description="What customers and the store see while you are on a delivery." />
      <form
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Vehicle</span>
          <input value={settings.vehicle} onChange={(event) => setSettings({ ...settings, vehicle: event.target.value })} placeholder="Bike, scooter, or van" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-800">Note for the store</span>
          <textarea value={settings.note} onChange={(event) => setSettings({ ...settings, note: event.target.value })} placeholder="Thermal bag, cash float, area you cover" className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-400" />
        </label>
        <Toggle label="Share my phone on the tracking page" checked={settings.share_phone} onChange={(share_phone) => setSettings({ ...settings, share_phone })} />
        <Toggle label="Alert me when a delivery is assigned" checked={settings.notify_new_order} onChange={(notify_new_order) => setSettings({ ...settings, notify_new_order })} />
        <Toggle label="Alert me when a customer sends a message" checked={settings.notify_chat} onChange={(notify_chat) => setSettings({ ...settings, notify_chat })} />
        <div className="flex items-center gap-3">
          <button type="submit" className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white">Save settings</button>
          {saved ? <span className="text-sm text-emerald-700">{saved}</span> : null}
        </div>
      </form>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-800">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
    </label>
  );
}

function csrf(): string {
  return decodeURIComponent(document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "");
}
