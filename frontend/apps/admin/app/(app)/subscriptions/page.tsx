"use client";

import { formatInr } from "@selfx/types";
import { CheckCircle2, Clock, CreditCard, Search, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type SubscriptionRow = {
  id: string;
  tenant: string;
  tenant_slug?: string;
  plan: string;
  plan_code?: string;
  cycle?: string;
  status: string;
  amount_paise: number;
  current_period_end?: string | null;
  trial_ends_at?: string | null;
};

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    void api<{ data: SubscriptionRow[] }>("/api/v1/platform/subscriptions")
      .then((body) => setRows(body.data ?? []))
      .catch((err) => {
        console.error("Failed to load subscriptions:", err);
      });
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (r.tenant ?? "").toLowerCase().includes(q) ||
          (r.plan ?? "").toLowerCase().includes(q) ||
          (r.tenant_slug ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, statusFilter]);

  const activeCount = rows.filter((r) => r.status === "active").length;
  const trialCount = rows.filter((r) => r.status === "trialing" || r.status === "trial").length;
  const mrrPaise = rows
    .filter((r) => r.status === "active" || r.status === "trialing")
    .reduce((acc, r) => acc + (r.amount_paise || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Subscriptions</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Track active tenant plans, billing cycles, trials, and recurring revenue across the platform.
          </p>
        </div>
        <Link
          href="/plans"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Manage Plans
        </Link>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Subscriptions</span>
            <Store className="h-4 w-4 text-slate-400" />
          </div>
          <div className="num mt-2 text-2xl font-semibold text-slate-900">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Paid</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="num mt-2 text-2xl font-semibold text-emerald-600">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">In Trial</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <div className="num mt-2 text-2xl font-semibold text-blue-600">{trialCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Committed MRR</span>
            <CreditCard className="h-4 w-4 text-slate-700" />
          </div>
          <div className="num mt-2 text-2xl font-semibold text-slate-900">{formatInr(mrrPaise)}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tenant name or plan..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pr-3 pl-9 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Renewal / Trial End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{row.tenant}</div>
                  {row.tenant_slug ? (
                    <div className="text-[11px] text-slate-400">{row.tenant_slug}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">{row.plan}</td>
                <td className="px-4 py-3 capitalize text-slate-500">{row.cycle ?? "monthly"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                      row.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : row.status === "trialing"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="num px-4 py-3 font-semibold text-slate-900">
                  {formatInr(row.amount_paise)}
                </td>
                <td className="num px-4 py-3 text-slate-500">
                  {row.current_period_end
                    ? new Date(row.current_period_end).toLocaleDateString("en-IN")
                    : row.trial_ends_at
                      ? new Date(row.trial_ends_at).toLocaleDateString("en-IN")
                      : "Active"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">
                  No subscriptions match your filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
