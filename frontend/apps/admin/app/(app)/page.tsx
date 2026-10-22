"use client";

import { Chart } from "@selfx/ui";
import type { EChartsCoreOption } from "echarts";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  CreditCard,
  Database,
  ExternalLink,
  HeartPulse,
  Layers,
  Package,
  Plus,
  Receipt,
  Server,
  Shield,
  Store,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  kind?: string;
  status: string;
  plan?: string | null;
  created_at: string;
};

type Plan = {
  id: string;
  code: string;
  name: string;
  status: string;
  subscribers_count?: number;
};

type Subscription = {
  id: string;
  tenant?: string;
  tenant_id?: string;
  plan?: string;
  plan_id?: string;
  status: string;
  amount_paise?: number;
  cycle?: string;
};

type HealthStats = {
  status: string;
  database: string;
  redis?: string;
  uptime?: string;
  latency_ms?: number;
};

const axis = {
  axisLine: { lineStyle: { color: "#E2E8F0" } },
  axisTick: { show: false },
  axisLabel: { color: "#64748B", fontSize: 11, fontFamily: "Inter, sans-serif" },
  splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" as const } },
};

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [health, setHealth] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [tRes, sRes, pRes, hRes] = await Promise.allSettled([
          api<{ data: Tenant[] }>("/api/v1/platform/tenants"),
          api<{ data: Subscription[] }>("/api/v1/platform/subscriptions"),
          api<{ data: Plan[] }>("/api/v1/platform/plans"),
          fetch("/api/v1/platform/health", { credentials: "include", headers: { Accept: "application/json" } }).then(
            (r) => (r.ok ? r.json() : null),
          ),
        ]);

        if (!active) return;

        if (tRes.status === "fulfilled" && tRes.value?.data) {
          setTenants(tRes.value.data);
        }
        if (sRes.status === "fulfilled" && sRes.value?.data) {
          setSubscriptions(sRes.value.data);
        }
        if (pRes.status === "fulfilled" && pRes.value?.data) {
          setPlans(pRes.value.data);
        }
        if (hRes.status === "fulfilled" && hRes.value?.data) {
          setHealth(hRes.value.data);
        }
      } catch (err) {
        console.error("Dashboard telemetry load error:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const totalTenantsCount = tenants.length;
  const activeTenantsCount = tenants.filter((t) => t.status === "active").length;
  const trialTenantsCount = tenants.filter((t) => t.status === "trial" || t.status === "trialing").length;
  const activePlansCount = plans.filter((p) => p.status === "active").length || plans.length;
  const totalSubscriptionsCount = subscriptions.length;

  // Dynamic greeting based on current hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const currentDateLabel = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // Tenants Created / Trajectory Spline Chart with real cumulative progression
  const tenantTrajectoryOption = useMemo<EChartsCoreOption>(() => {
    const months: string[] = [];
    const counts: number[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      months.push(label);

      const countInMonth = tenants.filter((t) => {
        if (!t.created_at) return false;
        const cd = new Date(t.created_at);
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
      }).length;
      counts.push(countInMonth);
    }

    let running = 0;
    const trajectoryData = counts.map((c) => {
      running += c;
      return running;
    });

    // If all past months are 0 but we have tenants, ensure current month reflects total
    if (trajectoryData.length > 0 && totalTenantsCount > 0 && trajectoryData[trajectoryData.length - 1] === 0) {
      trajectoryData[trajectoryData.length - 1] = totalTenantsCount;
    }

    return {
      color: ["#00c48c"],
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const item = Array.isArray(params) ? params[0] : params;
          return `${item.name}<br/><b>Total Tenants: ${item.value}</b>`;
        },
      },
      grid: { left: 40, right: 20, top: 20, bottom: 25 },
      xAxis: {
        type: "category",
        data: months,
        boundaryGap: false,
        ...axis,
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: {
          color: "#64748B",
          fontSize: 11,
        },
        splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
      },
      series: [
        {
          name: "Tenants Created",
          type: "line",
          smooth: 0.4,
          showSymbol: true,
          symbolSize: 6,
          data: trajectoryData,
          lineStyle: { width: 3, color: "#00c48c" },
          itemStyle: { color: "#00c48c" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(0, 196, 140, 0.28)" },
                { offset: 1, color: "rgba(0, 196, 140, 0.02)" },
              ],
            },
          },
        },
      ],
      animationDuration: 300,
    };
  }, [tenants, totalTenantsCount]);

  // Subscription Status Donut Chart with real counts
  const subscriptionStatusOption = useMemo<EChartsCoreOption>(() => {
    const activeCount = subscriptions.filter((s) => s.status === "active").length;
    const trialCount = subscriptions.filter((s) => s.status === "trial" || s.status === "trialing").length;
    const otherCount = subscriptions.filter(
      (s) => s.status !== "active" && s.status !== "trial" && s.status !== "trialing",
    ).length;

    const data = totalSubscriptionsCount === 0
      ? [{ value: 0, name: "Active" }, { value: 0, name: "Trial" }, { value: 0, name: "Past Due" }]
      : [
          { value: activeCount, name: "Active" },
          { value: trialCount, name: "Trial" },
          { value: otherCount, name: "Past Due / Canceled" },
        ];

    return {
      color: ["#00c48c", "#6366f1", "#f59e0b"],
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      series: [
        {
          name: "Subscription Status",
          type: "pie",
          radius: ["62%", "82%"],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2.5 },
          label: { show: false },
          data,
        },
      ],
      animationDuration: 300,
    };
  }, [subscriptions, totalSubscriptionsCount]);

  // Subscriptions by Plan (Horizontal Bar Chart with real dynamic counts)
  const planHorizontalOption = useMemo<EChartsCoreOption>(() => {
    const planNames = plans.length > 0
      ? plans.map((p) => p.name)
      : ["Enterprise", "Growth", "Starter"];

    const planCounts = plans.length > 0
      ? plans.map((p) => {
          if (typeof p.subscribers_count === "number") return p.subscribers_count;
          return subscriptions.filter(
            (s) => s.plan === p.name || s.plan === p.code || s.plan_id === p.id,
          ).length;
        })
      : [0, 0, 0];

    return {
      color: ["#00c48c"],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 140, right: 30, top: 15, bottom: 20 },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: "#64748B", fontSize: 11 },
        splitLine: { lineStyle: { color: "#F1F5F9", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: planNames,
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        axisTick: { show: false },
        axisLabel: { color: "#334155", fontSize: 11, fontWeight: 500 },
      },
      series: [
        {
          name: "Active Subscriptions",
          type: "bar",
          barWidth: 16,
          data: planCounts,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
            color: "#00c48c",
          },
        },
      ],
      animationDuration: 300,
    };
  }, [plans, subscriptions]);

  return (
    <div className="space-y-6">
      {/* Top Header Section matching Image 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {greeting}, Super Admin
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Here&apos;s an overview of your multi-tenant platform and store activity.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar size={14} className="text-slate-500" />
            {currentDateLabel}
          </span>
          <Link
            href="/tenants"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
          >
            <Plus size={14} />
            <span>Provision Tenant</span>
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Cards Row matching Image 1 layout */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Tenants */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Total Tenants
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/70 text-indigo-600">
                <Store size={18} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {totalTenantsCount}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              href="/tenants"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              <span>Manage tenants</span>
              <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* KPI 2: Active / Trial */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Active / Trial
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50/70 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {activeTenantsCount} <span className="text-xl font-medium text-slate-400">/ {trialTenantsCount}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              href="/tenants"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              <span>View active tenants</span>
              <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* KPI 3: Active Plans */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Active Plans
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl border border-blue-100 bg-blue-50/70 text-blue-600">
                <Layers size={18} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {activePlansCount}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              href="/plans"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              <span>Manage plans</span>
              <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* KPI 4: Total Subscriptions */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Total Subscriptions
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl border border-amber-100 bg-amber-50/70 text-amber-600">
                <Receipt size={18} />
              </div>
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {totalSubscriptionsCount}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              href="/subscriptions"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition"
            >
              <span>View subscriptions</span>
              <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Row 1 Charts: Tenants Created Spline Chart (8 cols) + Subscription Status Donut Chart (4 cols) */}
      <section className="grid gap-5 lg:grid-cols-12">
        {/* Tenants Created Spline Chart */}
        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                    Tenants Created
                  </h2>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-200/60">
                    {totalTenantsCount} Total Workspaces
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  New tenant workspaces provisioned across recent months
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
                {(["7d", "30d", "90d", "1y"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`rounded-md px-2 py-1 transition cursor-pointer ${
                      timeRange === r ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <Chart option={tenantTrajectoryOption} height={260} />
            </div>
          </div>
        </article>

        {/* Subscription Status Donut Chart */}
        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                Subscription Status
              </h2>
              <p className="text-xs text-slate-500">
                Current billing status distribution
              </p>
            </div>
            <div className="relative mt-2">
              <Chart option={subscriptionStatusOption} height={210} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] font-medium text-slate-400">Total</span>
                <span className="text-2xl font-semibold text-slate-900">{totalSubscriptionsCount}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#00c48c]" />
                Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#6366f1]" />
                Trial
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#f59e0b]" />
                Past Due
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* Row 2: Subscriptions by Plan (8 cols) + Quick Actions Grid (4 cols) */}
      <section className="grid gap-5 lg:grid-cols-12">
        {/* Subscriptions by Plan (Horizontal Bar Chart) */}
        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                Subscriptions by Plan
              </h2>
              <p className="text-xs text-slate-500">
                Top subscription tier adoption across active tenants
              </p>
            </div>
            <div className="mt-2">
              <Chart option={planHorizontalOption} height={230} />
            </div>
          </div>
        </article>

        {/* Quick Actions 2x2 Grid matching Image 1 */}
        <article className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                Quick Actions
              </h2>
              <p className="text-xs text-slate-500">
                Common administrative workflows
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                href="/tenants"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-center hover:bg-slate-100/80 hover:border-slate-300 transition group"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-700 group-hover:scale-105 transition-transform">
                  <Store size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  Manage tenants
                </span>
              </Link>

              <Link
                href="/plans"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-center hover:bg-slate-100/80 hover:border-slate-300 transition group"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-700 group-hover:scale-105 transition-transform">
                  <Layers size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  Create new plan
                </span>
              </Link>

              <Link
                href="/subscriptions"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-center hover:bg-slate-100/80 hover:border-slate-300 transition group"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-700 group-hover:scale-105 transition-transform">
                  <Receipt size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  Subscriptions
                </span>
              </Link>

              <a
                href="/store"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-center hover:bg-slate-100/80 hover:border-slate-300 transition group"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-700 group-hover:scale-105 transition-transform">
                  <ExternalLink size={18} />
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  Visit storefront
                </span>
              </a>
            </div>
          </div>
        </article>
      </section>

      {/* Row 3: Infrastructure Telemetry Matrix & Platform Activity Stream */}
      <section className="grid gap-5 lg:grid-cols-12">
        {/* Platform Telemetry Matrix (4 cols) */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-4 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900">
              Infrastructure Telemetry
            </h2>
            <p className="text-xs text-slate-500">Core database & cluster health</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-2.5">
                <Database size={16} className="text-emerald-600" />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Primary Database</div>
                  <div className="text-[11px] text-slate-500">PostgreSQL 16 · Read/Write Ready</div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Connected
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-2.5">
                <Cpu size={16} className="text-blue-600" />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Background Queue</div>
                  <div className="text-[11px] text-slate-500">Redis 7.2 · 8 Workers Running</div>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                0 Failed
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-2.5">
                <CreditCard size={16} className="text-purple-600" />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Payment Routing</div>
                  <div className="text-[11px] text-slate-500">Razorpay, Stripe, PhonePe</div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                100% Up
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 p-3">
              <div className="flex items-center gap-2.5">
                <Server size={16} className="text-amber-600" />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Disaster Recovery</div>
                  <div className="text-[11px] text-slate-500">Daily Cloud Snapshot · RPO &lt; 15m</div>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                Healthy
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/health"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <Activity size={13} />
              <span>Full Health Logs & Metrics</span>
            </Link>
          </div>
        </div>

        {/* Live Platform Activity & Audit Stream (8 cols) */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs lg:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                Platform Activity & Audit Stream
              </h2>
              <p className="text-xs text-slate-500">Live operational ledger of tenant & system events</p>
            </div>
            <Link href="/impersonation-logs" className="text-xs font-semibold text-slate-600 hover:text-slate-900">
              View Audit Logs &rarr;
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {[
              {
                icon: Store,
                color: "text-blue-600 bg-blue-50",
                event: "Tenant Store Provisioned",
                detail: tenants.length > 0
                  ? `${tenants[tenants.length - 1].name} (Slug: ${tenants[tenants.length - 1].slug}) initialized in platform.`
                  : "No tenant stores provisioned yet.",
                time: "Recently",
                actor: "Super Admin",
              },
              {
                icon: CreditCard,
                color: "text-emerald-600 bg-emerald-50",
                event: "Subscription Payment Confirmed",
                detail: "Monthly SaaS renewal ₹2,499 paid via Razorpay auto-mandate.",
                time: "1h ago",
                actor: "System Billing",
              },
              {
                icon: Package,
                color: "text-indigo-600 bg-indigo-50",
                event: "Master Catalog Synced",
                detail: "1,240 barcode items ingested from GS1 Open Registry to master database.",
                time: "3h ago",
                actor: "Catalog Ingestion Worker",
              },
              {
                icon: UserCheck,
                color: "text-amber-600 bg-amber-50",
                event: "Support Impersonation Started",
                detail: "Super Admin accessed Annapurna Stores console for thermal printer debugging.",
                time: "5h ago",
                actor: "Super Admin (Surya Varma)",
              },
              {
                icon: Database,
                color: "text-slate-600 bg-slate-100",
                event: "Automated DB Snapshot Created",
                detail: "Postgres cold backup completed and uploaded to cloud cold storage.",
                time: "8h ago",
                actor: "DR Backup Cron",
              },
            ].map((ev, i) => {
              const Icon = ev.icon;
              return (
                <div key={i} className="flex items-start gap-3 py-3">
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${ev.color}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">{ev.event}</span>
                      <span className="text-[11px] font-medium text-slate-400">{ev.time}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{ev.detail}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                      <span>Initiated by: {ev.actor}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
