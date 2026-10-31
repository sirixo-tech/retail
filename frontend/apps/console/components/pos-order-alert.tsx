"use client";

import { useEffect, useState } from "react";

type AlertOrder = {
  id: string;
  number?: string;
  customer_name?: string;
  total_paise?: number;
  channel?: string;
  fulfillment?: string;
  status?: string;
  payment_status?: string;
};

export function PosOrderAlert() {
  const [orderAlert, setOrderAlert] = useState<AlertOrder | null>(null);

  useEffect(() => {
    const seen = new Set<string>();
    let ready = false;
    const tick = async () => {
      const response = await fetch("/api/v1/orders", { credentials: "include", headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const rows = ((await response.json()) as { data?: AlertOrder[] }).data ?? [];
      const fresh = rows.filter((row) => row.channel === "counter" || row.status === "placed" || row.payment_status === "captured");
      const arrived = fresh.filter((row) => !seen.has(row.id));
      if (ready && arrived.length > 0) {
        setOrderAlert(arrived[0]);
        window.dispatchEvent(new CustomEvent("selfx-new-order"));
      }
      seen.clear();
      fresh.forEach((row) => seen.add(row.id));
      ready = true;
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 5000);
    return () => window.clearInterval(timer);
  }, []);

  if (!orderAlert) return null;

  return (
    <div className="fixed right-4 top-4 z-[80] w-[min(100%-2rem,360px)] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Order received</p>
          <p className="mt-1 text-sm font-semibold">
            {orderAlert.number || "New order"} · {orderAlert.customer_name || "Customer"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {orderAlert.channel === "counter" ? "POS counter" : "Online order"}
            {typeof orderAlert.total_paise === "number" ? ` · ₹${(orderAlert.total_paise / 100).toFixed(2)}` : ""}
          </p>
        </div>
        <button type="button" className="text-xs font-semibold text-slate-500" onClick={() => setOrderAlert(null)}>
          Close
        </button>
      </div>
    </div>
  );
}
