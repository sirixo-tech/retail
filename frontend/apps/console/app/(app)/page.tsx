"use client";

import { Chart, KpiCard, PageHeader } from "@selfx/ui";
import { formatCount, formatInr } from "@selfx/types";
import type { EChartsCoreOption } from "echarts";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Boxes,
  Calendar,
  CreditCard,
  FileCheck2,
  Landmark,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrganizationDashboard } from "./organization-dashboard";

type Day = { date?: string; label: string; sales_paise: number; purchases_paise: number };
type Dash = {
  sales_paise: number;
  purchases_paise: number;
  returns_paise: number;
  return_bills: number;
  sales_due_paise: number;
  purchase_due_paise: number;
  bills: number;
  profit_paise: number;
  days: Day[];
  top: { name: string; qty: number; total_paise?: number }[];
  payments?: { method: string; amount_paise: number; bills?: number }[];
  customers?: { name: string; total_paise: number; bills?: number }[];
  stock_cost_paise?: number;
  stock_retail_paise?: number;
  stock_wholesale_paise?: number;
  alerts?: { sku: string; name: string; store_name?: string; on_hand: number; reorder_point: number }[];
  recent?: {
    id?: string;
    number: string;
    status: string;
    payment_status?: string;
    total_paise: number;
    paid_paise?: number;
    due_paise?: number;
    customer_name: string;
    warehouse?: string;
    channel?: string;
  }[];
};

const axis = {
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: "#8B939E", fontSize: 11, fontFamily: "Inter, sans-serif" },
  splitLine: { lineStyle: { color: "#EEF0F4", type: "dashed" as const } },
};

function getPaymentMeta(method: string) {
  const m = method.toLowerCase();
  if (m.includes("card") || m.includes("credit") || m.includes("debit")) {
    return {
      label: "Credit Card",
      icon: CreditCard,
      iconBg: "#f97316",
      barColor: "#f97316",
    };
  }
  if (m.includes("cash")) {
    return {
      label: "Cash",
      icon: Banknote,
      iconBg: "#3b82f6",
      barColor: "#3b82f6",
    };
  }
  if (m.includes("upi") || m.includes("qr")) {
    return {
      label: "UPI",
      icon: QrCode,
      iconBg: "#10b981",
      barColor: "#10b981",
    };
  }
  if (m.includes("khata") || m.includes("due") || m.includes("credit_account")) {
    return {
      label: "Khata / Credit",
      icon: Wallet,
      iconBg: "#8b5cf6",
      barColor: "#8b5cf6",
    };
  }
  if (m.includes("cheque") || m.includes("check")) {
    return {
      label: "Cheque",
      icon: FileCheck2,
      iconBg: "#ec4899",
      barColor: "#ec4899",
    };
  }
  return {
    label: method.replace(/_/g, " "),
    icon: Landmark,
    iconBg: "#6366f1",
    barColor: "#6366f1",
  };
}

export default function DashboardPage() {
  const [dash, setDash] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [who, setWho] = useState<{ name: string; store: string }>({ name: "there", store: "this store" });
  const [isOrg, setIsOrg] = useState(false);
  const [orgData, setOrgData] = useState<any | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [me, response] = await Promise.all([
        fetch("/api/v1/auth/staff/me", { credentials: "include", headers: { Accept: "application/json" } }),
        fetch("/api/v1/reports/dashboard", { credentials: "include", headers: { Accept: "application/json" } }),
      ]);
      if (me.ok) {
        const body = (await me.json()) as {
          data?: {
            name?: string;
            store?: { name?: string };
            tenant?: { name?: string; slug?: string; kind?: string };
          };
        };
        setWho({ name: body.data?.name ?? "there", store: body.data?.store?.name ?? "this store" });
        if (body.data?.tenant?.kind === "organization") {
          setIsOrg(true);
          try {
            const orgRes = await fetch("/api/v1/organization/overview", {
              credentials: "include",
              headers: { Accept: "application/json" },
            });
            if (orgRes.ok) {
              const orgJson = await orgRes.json();
              setOrgData(orgJson.data);
            }
          } catch {}
        }
      }
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (response.ok) {
        setDash(((await response.json()) as { data: Dash }).data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const barsOption = useMemo<EChartsCoreOption>(() => {
    const days = dash?.days ?? [];
    return {
      color: ["#6366f1", "#38bdf8"],
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderWidth: 0,
        textStyle: { color: "#f8fafc", fontSize: 12 },
      },
      grid: { left: 52, right: 16, top: 24, bottom: 36 },
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: "#475569", fontSize: 12, fontWeight: 500 },
      },
      xAxis: {
        type: "category",
        data: days.map((day) => day.date ?? day.label),
        ...axis,
      },
      yAxis: { type: "value", ...axis },
      series: [
        {
          name: "Sales",
          type: "bar",
          barMaxWidth: 18,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          data: days.map((day) => Number((day.sales_paise / 100).toFixed(2))),
        },
        {
          name: "Purchases",
          type: "bar",
          barMaxWidth: 18,
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          data: days.map((day) => Number((day.purchases_paise / 100).toFixed(2))),
        },
      ],
      animationDuration: 350,
    };
  }, [dash]);

  const paymentSentReceivedOption = useMemo<EChartsCoreOption>(() => {
    const days = dash?.days ?? [];
    return {
      color: ["#f43f5e", "#10b981"],
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1e293b",
        borderWidth: 0,
        textStyle: { color: "#f8fafc", fontSize: 12 },
      },
      grid: { left: 52, right: 20, top: 24, bottom: 42 },
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 20,
        textStyle: { color: "#475569", fontSize: 12, fontWeight: 500 },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: days.map((day) => day.date ?? day.label),
        ...axis,
        axisLabel: {
          color: "#94a3b8",
          fontSize: 11,
          rotate: 22,
          margin: 12,
        },
      },
      yAxis: {
        type: "value",
        ...axis,
      },
      series: [
        {
          name: "Sent",
          type: "line",
          smooth: 0.42,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, color: "#f43f5e" },
          itemStyle: { color: "#f43f5e", borderColor: "#ffffff", borderWidth: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(244, 63, 94, 0.28)" },
                { offset: 1, color: "rgba(244, 63, 94, 0.02)" },
              ],
            },
          },
          data: days.map((day) => Number((day.purchases_paise / 100).toFixed(2))),
        },
        {
          name: "Received",
          type: "line",
          smooth: 0.42,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3, color: "#10b981" },
          itemStyle: { color: "#10b981", borderColor: "#ffffff", borderWidth: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(16, 185, 129, 0.30)" },
                { offset: 1, color: "rgba(16, 185, 129, 0.02)" },
              ],
            },
          },
          data: days.map((day) => Number((day.sales_paise / 100).toFixed(2))),
        },
      ],
      animationDuration: 420,
    };
  }, [dash]);

  const topCustomersPieOption = useMemo<EChartsCoreOption>(() => {
    const customers = dash?.customers ?? [];
    const hasData = customers.length > 0 && customers.some((c) => c.total_paise > 0);
    return {
      color: ["#5b5ce2", "#14b8e4", "#f59e0b", "#ec4899", "#10b981"],
      tooltip: {
        trigger: "item",
        backgroundColor: "#1e293b",
        borderWidth: 0,
        textStyle: { color: "#f8fafc", fontSize: 12 },
        formatter: "{b}: ₹{c} ({d}%)",
      },
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { color: "#475569", fontSize: 12, fontWeight: 500 },
      },
      series: [
        {
          name: "Top Customers",
          type: "pie",
          radius: ["0%", "72%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#ffffff",
            borderWidth: 2.5,
          },
          label: {
            show: true,
            position: "inside",
            formatter: "{d}%",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: 11,
          },
          labelLine: { show: false },
          data: hasData
            ? customers.map((row) => ({
                name: row.name,
                value: Number((row.total_paise / 100).toFixed(2)),
              }))
            : [{ name: "walk-in-customer", value: 100 }],
        },
      ],
      animationDuration: 420,
    };
  }, [dash]);

  const paymentRows = useMemo(() => {
    const raw = dash?.payments ?? [];
    const total = raw.reduce((sum, item) => sum + item.amount_paise, 0);
    return raw.map((row) => {
      const pct = total > 0 ? Math.round((row.amount_paise / total) * 100) : 0;
      const meta = getPaymentMeta(row.method);
      return {
        ...row,
        pct,
        meta,
      };
    });
  }, [dash]);

  const topProducts = useMemo(() => {
    const rows = dash?.top ?? [];
    const maxTotal = Math.max(...rows.map((r) => r.total_paise ?? r.qty * 100), 1);
    return rows.map((row) => ({
      ...row,
      pct: Math.max(12, Math.round(((row.total_paise ?? row.qty * 100) / maxTotal) * 100)),
    }));
  }, [dash]);

  if (isOrg) {
    return <OrganizationDashboard data={orgData} />;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={`${greeting}, ${who.name}`}
        description={`Live store analytics & financial telemetry from ${who.store}.`}
        aside={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-line bg-surface px-3 text-[13px] font-medium text-ink transition hover:bg-bg"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-accent" : "text-muted"} />
              Refresh
            </button>
            <span className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-line bg-surface px-3 text-[13px] text-muted">
              <Calendar size={15} />
              Last 7 Days & Today
            </span>
          </div>
        }
      />

      {/* Quick Actions Banner (Image 2 Top Row) */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/products/create"
          className="group flex items-center gap-3.5 rounded-[14px] border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#ede9fe] text-[#6d28d9] transition group-hover:bg-[#6d28d9] group-hover:text-white">
            <Plus size={20} strokeWidth={2.3} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-ink">Add product</p>
            <p className="text-[12px] text-muted">Create new item or barcode</p>
          </div>
        </Link>

        <Link
          href="/customers"
          className="group flex items-center gap-3.5 rounded-[14px] border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#d1fae5] text-[#059669] transition group-hover:bg-[#059669] group-hover:text-white">
            <UserPlus size={20} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-ink">Add customer</p>
            <p className="text-[12px] text-muted">Register customer or Khata</p>
          </div>
        </Link>

        <Link
          href="/reports"
          className="group flex items-center gap-3.5 rounded-[14px] border border-line bg-surface p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[#fef3c7] text-[#d97706] transition group-hover:bg-[#d97706] group-hover:text-white">
            <BarChart3 size={20} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-ink">Reports</p>
            <p className="text-[12px] text-muted">GST, P&L & stock valuation</p>
          </div>
        </Link>
      </section>

      {/* Primary KPI Row (Image 2 style) */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={ShoppingCart}
          value={formatInr(dash?.sales_paise ?? 0)}
          label="Sales"
          action="Counter and online"
          badgeBg="#ede9fe"
          iconColor="#7c3aed"
        />
        <KpiCard
          icon={ShoppingBag}
          value={formatInr(dash?.purchases_paise ?? 0)}
          label="Purchases"
          action="Goods received"
          badgeBg="#e0e7ff"
          iconColor="#4338ca"
        />
        <KpiCard
          icon={RotateCcw}
          value={formatInr(dash?.returns_paise ?? 0)}
          label="Sales return"
          action={`${dash?.return_bills ?? 0} bills`}
          badgeBg="#ffedd5"
          iconColor="#ea580c"
        />
        <KpiCard
          icon={Wallet}
          value={formatInr(dash?.sales_due_paise ?? 0)}
          label="Sales due"
          action="Khata & pending"
          badgeBg="#fee2e2"
          iconColor="#e11d48"
        />
        <KpiCard
          icon={Receipt}
          value={formatInr(dash?.purchase_due_paise ?? 0)}
          label="Purchase due"
          action="Suppliers"
          badgeBg="#fef3c7"
          iconColor="#d97706"
        />
        <KpiCard
          icon={Receipt}
          value={formatCount(dash?.bills ?? 0)}
          label="Invoices"
          action="Today"
          badgeBg="#ede9fe"
          iconColor="#6366f1"
        />
        <KpiCard
          icon={TrendingUp}
          value={formatInr(dash?.profit_paise ?? 0)}
          label="After returns"
          action="Net sales revenue"
          badgeBg="#dcfce7"
          iconColor="#16a34a"
        />
        <KpiCard
          icon={Boxes}
          value={formatInr(dash?.stock_retail_paise ?? 0)}
          label="Inventory retail"
          action="Current stock value"
          badgeBg="#e0f2fe"
          iconColor="#0284c7"
        />
      </section>

      {/* Image 2 Section: 2x2 Analytics Grid */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Card 1: Payment Sent & Received */}
        <article className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Payment Sent & Received</h2>
              <p className="text-[12px] text-muted">7-day cashflow movement across sales & purchases</p>
            </div>
          </div>
          <Chart option={paymentSentReceivedOption} height={290} />
        </article>

        {/* Card 2: Top Customers Pie Chart */}
        <article className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Top Customers</h2>
              <p className="text-[12px] text-muted">Revenue share by top purchasing customers</p>
            </div>
          </div>
          <Chart option={topCustomersPieOption} height={290} />
        </article>

        {/* Card 3: Sales by Payment */}
        <article className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Sales by Payment</h2>
              <p className="text-[12px] text-muted">Breakdown by tender method</p>
            </div>
          </div>
          <div className="space-y-4">
            {paymentRows.map((row) => {
              const Icon = row.meta.icon;
              return (
                <div key={row.method} className="flex items-center gap-3.5">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] text-white shadow-sm"
                    style={{ backgroundColor: row.meta.iconBg }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold capitalize text-ink">{row.meta.label}</span>
                      <span className="num text-[14px] font-semibold text-ink">{formatInr(row.amount_paise)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(row.pct, 4)}%`,
                          backgroundColor: row.meta.barColor,
                        }}
                      />
                    </div>
                  </div>
                  <span className="num w-11 text-right text-[13px] font-semibold text-muted">{row.pct}%</span>
                </div>
              );
            })}
            {paymentRows.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-line py-10 text-center text-[13px] text-muted">
                No payment transactions recorded yet. Complete a POS or online sale to see live breakdown.
              </div>
            ) : null}
          </div>
        </article>

        {/* Card 4: Stock Value (By cost, By retail, By wholesale) */}
        <article className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-ink">Stock Value</h2>
              <p className="text-[12px] text-muted">Live warehouse valuation by pricing tier</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* By cost */}
            <div className="relative overflow-hidden rounded-[14px] border border-[#e9d5ff] bg-[#faf5ff] p-4">
              <div className="flex items-center gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-white text-[#7c3aed] shadow-sm">
                  <Boxes size={20} />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-slate-600">By cost</p>
                  <p className="num mt-0.5 text-[22px] font-semibold tracking-tight text-[#6d28d9]">
                    {formatInr(dash?.stock_cost_paise ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1 w-full rounded-full bg-[#7c3aed]" />
            </div>

            {/* By retail */}
            <div className="relative overflow-hidden rounded-[14px] border border-[#bfdbfe] bg-[#eff6ff] p-4">
              <div className="flex items-center gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-white text-[#2563eb] shadow-sm">
                  <ShoppingBag size={20} />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-slate-600">By retail</p>
                  <p className="num mt-0.5 text-[22px] font-semibold tracking-tight text-[#1d4ed8]">
                    {formatInr(dash?.stock_retail_paise ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1 w-full rounded-full bg-[#2563eb]" />
            </div>

            {/* By wholesale */}
            <div className="relative overflow-hidden rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] p-4">
              <div className="flex items-center gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-white text-[#16a34a] shadow-sm">
                  <Store size={20} />
                </span>
                <div>
                  <p className="text-[12px] font-medium text-slate-600">By wholesale</p>
                  <p className="num mt-0.5 text-[22px] font-semibold tracking-tight text-[#15803d]">
                    {formatInr(dash?.stock_wholesale_paise ?? dash?.stock_retail_paise ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1 w-full rounded-full bg-[#16a34a]" />
            </div>
          </div>
        </article>
      </section>

      {/* Image 3 Section: Stock Alert + Top Selling Products */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Stock Alert Card */}
        <article className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink">Stock Alert</h2>
            <Link
              href="/inventory"
              className="rounded-[8px] px-2.5 py-1 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {(dash?.alerts ?? []).map((row) => {
              const ratio =
                row.reorder_point > 0
                  ? Math.min(100, Math.max(0, Math.round((row.on_hand / row.reorder_point) * 100)))
                  : 0;
              return (
                <div
                  key={`${row.sku}-${row.store_name ?? ""}`}
                  className="rounded-[12px] border border-slate-100 bg-slate-50/70 p-3.5 transition hover:border-rose-200 hover:bg-rose-50/20"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-rose-50 text-rose-500">
                        <AlertTriangle size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-ink">{row.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                          <span className="font-mono">{row.sku}</span>
                          <span>•</span>
                          <Store size={12} className="inline text-slate-400" />
                          <span className="truncate">{row.store_name ?? who.store}</span>
                        </p>
                      </div>
                    </div>
                    <span className="num shrink-0 rounded-full bg-rose-100 px-3 py-1 text-[12px] font-semibold text-rose-600">
                      {row.on_hand} / {row.reorder_point}
                    </span>
                  </div>
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-rose-500 transition-all"
                      style={{ width: `${Math.max(ratio, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(dash?.alerts ?? []).length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-line py-12 text-center text-[13px] text-muted">
                All products are well stocked above their reorder points.
              </div>
            ) : null}
          </div>
        </article>

        {/* Top Selling Products Card */}
        <article className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-ink">Top Selling Products</h2>
            <Link
              href="/products"
              className="rounded-[8px] px-2.5 py-1 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              Catalog
            </Link>
          </div>
          <div className="space-y-4">
            {topProducts.map((row, index) => {
              const rankColors = [
                "bg-amber-400 text-white shadow-sm",
                "bg-slate-300 text-slate-800",
                "bg-amber-600 text-white",
                "bg-slate-100 text-slate-700",
                "bg-slate-100 text-slate-700",
              ];
              return (
                <div key={row.name} className="flex items-center gap-3.5">
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
                      rankColors[index] ?? rankColors[3]
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold text-ink">{row.name}</span>
                      <span className="num text-[14px] font-semibold text-emerald-600">
                        {formatInr(row.total_paise ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#6366f1] transition-all duration-500"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                      <span className="num shrink-0 text-[12px] font-medium text-muted">
                        {Number(row.qty).toFixed(row.qty % 1 === 0 ? 0 : 2)} Sold
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {topProducts.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-line py-12 text-center text-[13px] text-muted">
                No product sales recorded yet.
              </div>
            ) : null}
          </div>
        </article>
      </section>

      {/* Sales vs Purchases Bar Chart */}
      <article className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Sales & Purchases Comparison</h2>
            <p className="text-[12px] text-muted">Daily revenue vs inventory procurement (last 7 days)</p>
          </div>
        </div>
        <Chart option={barsOption} height={270} />
      </article>

      {/* Image 3 Bottom Section: Recent Sales Table */}
      <article className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink">Recent Sales</h2>
          <Link
            href="/orders"
            className="rounded-[8px] px-2.5 py-1 text-[13px] font-semibold text-indigo-600 transition hover:bg-indigo-50"
          >
            View all
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Reference</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Warehouse</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Paid</th>
                <th className="py-3 pr-4">Due</th>
                <th className="py-3 text-right">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(dash?.recent ?? []).map((row) => {
                const paid = row.paid_paise ?? row.total_paise;
                const due = row.due_paise ?? Math.max(0, row.total_paise - paid);
                const payStatus = row.payment_status ?? (due > 0 ? "due" : "paid");
                return (
                  <tr key={row.number} className="transition hover:bg-slate-50/80">
                    <td className="num py-3.5 pr-4 font-semibold text-indigo-600">
                      <Link href="/orders" className="hover:underline">
                        {row.number}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4 font-medium text-ink">{row.customer_name}</td>
                    <td className="py-3.5 pr-4 text-muted">{row.warehouse ?? who.store}</td>
                    <td className="py-3.5 pr-4">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold lowercase text-emerald-700">
                        {row.status}
                      </span>
                    </td>
                    <td className="num py-3.5 pr-4 font-semibold text-ink">{formatInr(row.total_paise)}</td>
                    <td className="num py-3.5 pr-4 font-medium text-emerald-600">{formatInr(paid)}</td>
                    <td className="num py-3.5 pr-4 font-medium text-slate-600">{formatInr(due)}</td>
                    <td className="py-3.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold lowercase ${
                          payStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {payStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(dash?.recent ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-muted">
                    No recent sales recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
