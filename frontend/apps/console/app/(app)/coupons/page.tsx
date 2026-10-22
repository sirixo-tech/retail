"use client";

import { PageHeader } from "@selfx/ui";
import { useEffect, useState, type FormEvent } from "react";

type Coupon = { id: string; code: string; kind: string; value: number; status: string; redeemed_count: number; max_redemptions: number | null };

export default function CouponsPage() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/v1/coupons", { credentials: "include", headers: { Accept: "application/json" } });
    if (response.status === 401 || response.status === 403) {
      window.location.href = "/login";
      return;
    }
    if (response.ok) setRows(((await response.json()) as { data: Coupon[] }).data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const token = decodeURIComponent(document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "");
    const response = await fetch("/api/v1/coupons", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token },
      body: JSON.stringify({
        code: data.get("code"),
        kind: data.get("kind"),
        value: Number(data.get("value")),
        max_redemptions: data.get("max_redemptions") ? Number(data.get("max_redemptions")) : null,
      }),
    });
    const body = (await response.json()) as { error?: { message: string } };
    setMessage(response.ok ? "Coupon saved." : (body.error?.message ?? "The coupon was not saved."));
    if (response.ok) {
      form.reset();
      await load();
    }
  }

  return (
    <>
      <PageHeader title="Coupons" description="A percent comes off the goods. Delivery is unchanged. A used-up or expired code is refused at checkout." />
      {message ? <p className="mb-4 text-sm">{message}</p> : null}
      <form onSubmit={create} className="mb-4 grid max-w-3xl gap-3 rounded-[10px] border border-line bg-surface p-5 sm:grid-cols-2">
        <label className="text-[13px] font-medium">Code<input name="code" required className="mt-1 h-10 w-full rounded-[6px] border border-line px-3 text-sm uppercase" /></label>
        <label className="text-[13px] font-medium">
          Kind
          <select name="kind" defaultValue="percent" className="mt-1 h-10 w-full rounded-[6px] border border-line px-3 text-sm">
            <option value="percent">Percent</option>
            <option value="fixed">Fixed paise</option>
          </select>
        </label>
        <label className="text-[13px] font-medium">Value<input name="value" required type="number" min={1} className="mt-1 h-10 w-full rounded-[6px] border border-line px-3 text-sm" /></label>
        <label className="text-[13px] font-medium">Uses<input name="max_redemptions" type="number" min={1} placeholder="Unlimited" className="mt-1 h-10 w-full rounded-[6px] border border-line px-3 text-sm" /></label>
        <button type="submit" className="h-10 rounded-[6px] border border-line px-3 text-sm">Save coupon</button>
      </form>
      <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium">{row.code}</span>
            <span className="text-muted">{row.kind === "percent" ? `${row.value}%` : `${row.value} paise`} · {row.redeemed_count}{row.max_redemptions ? ` / ${row.max_redemptions}` : ""}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
