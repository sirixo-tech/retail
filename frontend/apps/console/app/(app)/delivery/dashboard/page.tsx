"use client";

import { PageHeader } from "@selfx/ui";
import { formatInr } from "@selfx/types";
import { useEffect, useState } from "react";

type Summary = {
  mine_only: boolean;
  assigned: number;
  on_road: number;
  delivered_today: number;
  collect_paise: number;
  orders: {
    id: string;
    number: string;
    customer_name?: string;
    status?: string;
    fulfillment?: string;
    total_paise?: number;
    payment_method?: string;
  }[];
};

export default function DeliveryDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/v1/delivery/dashboard", { credentials: "include", headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const body = (await res.json()) as { data?: Summary };
      if (body.data) setSummary(body.data);
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const cards = [
    { label: "Assigned", value: String(summary?.assigned ?? 0) },
    { label: "On the road", value: String(summary?.on_road ?? 0) },
    { label: "Delivered today", value: String(summary?.delivered_today ?? 0) },
    { label: "To collect", value: formatInr(summary?.collect_paise ?? 0) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Partner dashboard"
        description={summary?.mine_only ? "Deliveries assigned to you." : "Live delivery work across the store."}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Open deliveries</div>
        {(summary?.orders ?? []).length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">No open deliveries.</p>
        ) : (
          <ul>
            {(summary?.orders ?? []).map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{order.number}</p>
                  <p className="text-xs text-slate-500">{order.customer_name || "Customer"} · {order.fulfillment}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatInr(order.total_paise ?? 0)}</p>
                  <p className="text-[11px] uppercase text-slate-500">{order.status?.replaceAll("_", " ")}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
