"use client";

import { formatInr } from "@selfx/types";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Globe,
  HelpCircle,
  Infinity as InfinityIcon,
  Layers,
  Monitor,
  Package,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type Subscription = {
  plan: string;
  plan_code: string;
  status: string;
  cycle: string;
  amount_paise: number;
  current_period_end: string | null;
};

type Meter = { key: string; label: string; used: number; limit: number };

type Invoice = {
  id: string;
  number: string;
  total_paise: number;
  status: string;
  specimen: boolean;
  issued_at?: string | null;
};

type PlatformPlan = {
  code: string;
  name: string;
  status: string;
  prices: { cycle: string; amount_paise: number }[];
  limits: { key: string; name: string; value: number }[];
  features: { key: string; name: string; enabled: boolean }[];
};

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

function getMeterMeta(key: string) {
  const k = key.toLowerCase();
  if (k.includes("product")) {
    return {
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      bar: "bg-blue-600",
    };
  }
  if (k.includes("staff") || k.includes("user")) {
    return {
      icon: Users,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
      bar: "bg-violet-600",
    };
  }
  if (k.includes("store") || k.includes("branch")) {
    return {
      icon: Store,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      bar: "bg-emerald-600",
    };
  }
  if (k.includes("counter") || k.includes("terminal") || k.includes("pos")) {
    return {
      icon: Monitor,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      bar: "bg-amber-600",
    };
  }
  if (k.includes("order")) {
    return {
      icon: ShoppingBag,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
      bar: "bg-indigo-600",
    };
  }
  if (k.includes("ai")) {
    return {
      icon: Sparkles,
      color: "text-fuchsia-600",
      bg: "bg-fuchsia-50",
      border: "border-fuchsia-100",
      bar: "bg-fuchsia-600",
    };
  }
  return {
    icon: Layers,
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    bar: "bg-slate-700",
  };
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Meter[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "annual">("monthly");
  const [switchingCode, setSwitchingCode] = useState<string | null>(null);
  const [utrModalInvoice, setUtrModalInvoice] = useState<Invoice | null>(null);
  const [utrValue, setUtrValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIssuingInvoice, setIsIssuingInvoice] = useState(false);

  async function load() {
    const headers = { Accept: "application/json" };
    const sub = await fetch("/api/v1/billing/subscription", { credentials: "include", headers });
    if (sub.status === 401 || sub.status === 403) {
      window.location.href = "/login";
      return;
    }
    if (sub.ok) {
      const subData = ((await sub.json()) as { data: Subscription }).data;
      setSubscription(subData);
      if (subData?.cycle === "annual") setSelectedCycle("annual");
    }

    const [metersRes, billsRes, plansRes] = await Promise.all([
      fetch("/api/v1/billing/usage", { credentials: "include", headers }),
      fetch("/api/v1/billing/invoices", { credentials: "include", headers }),
      fetch("/api/v1/platform/plans", { credentials: "include", headers }),
    ]);

    if (metersRes.ok) setUsage(((await metersRes.json()) as { data: Meter[] }).data);
    if (billsRes.ok) setInvoices(((await billsRes.json()) as { data: Invoice[] }).data);
    if (plansRes.ok) setPlans(((await plansRes.json()) as { data: PlatformPlan[] }).data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleChangePlan(planCode: string) {
    setSwitchingCode(planCode);
    setError(null);
    try {
      const response = await fetch("/api/v1/billing/change-plan", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          plan_code: planCode,
          cycle: selectedCycle,
        }),
      });
      const body = (await response.json()) as {
        data?: { plan: string; cycle: string };
        error?: { message: string };
      };
      if (!response.ok) {
        setError(body.error?.message ?? "Could not switch plan.");
        return;
      }
      setToast(`Switched subscription to ${body.data?.plan} (${body.data?.cycle}).`);
      await load();
    } finally {
      setSwitchingCode(null);
    }
  }

  async function issueInvoice() {
    setError(null);
    setIsIssuingInvoice(true);
    try {
      const response = await fetch("/api/v1/billing/invoices", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
      });
      const body = (await response.json()) as {
        data?: { number: string };
        error?: { message: string };
      };
      if (response.ok) {
        setToast(`Issued GST Invoice ${body.data?.number}.`);
        await load();
      } else {
        setError(body.error?.message ?? "Could not issue invoice.");
      }
    } finally {
      setIsIssuingInvoice(false);
    }
  }

  async function submitUtr(e: FormEvent) {
    e.preventDefault();
    if (!utrModalInvoice) return;
    setError(null);
    const response = await fetch("/api/v1/billing/utr", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        invoice_id: utrModalInvoice.id,
        utr: utrValue,
      }),
    });
    if (response.ok) {
      setToast(`Recorded UTR ${utrValue} for invoice ${utrModalInvoice.number}.`);
      setUtrModalInvoice(null);
      setUtrValue("");
      await load();
    } else {
      setError("Could not record UTR reference.");
    }
  }

  async function downloadPdf(id: string, number: string) {
    const response = await fetch(`/api/v1/billing/invoices/${id}/pdf`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${number}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* =====================================================================
          PAGE HEADER
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Billing, Plans &amp; Quotas
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
              <ShieldCheck size={12} />
              Enterprise Billing
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Manage your store subscription tier, monitor resource usage limits, and download GST invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void issueInvoice()}
          disabled={isIssuingInvoice}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
        >
          <Receipt size={14} className={isIssuingInvoice ? "animate-spin" : ""} />
          <span>{isIssuingInvoice ? "Generating..." : "Generate Current Period Invoice"}</span>
        </button>
      </div>

      {/* Notifications */}
      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="cursor-pointer">
            <X size={15} />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600" />
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="cursor-pointer">
            <X size={15} />
          </button>
        </div>
      ) : null}

      {/* =====================================================================
          CURRENT ACTIVE PLAN CARD & RESOURCE USAGE METERS
         ===================================================================== */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Active Plan Shield Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-6 lg:col-span-5 flex flex-col justify-between shadow-2xs">
          {/* Subtle decorative background gradient */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-gradient-to-br from-indigo-100/60 to-purple-100/40 blur-2xl" />

          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            
                Current Active Plan
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold capitalize text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {subscription?.status ?? "Active"}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {subscription?.plan ?? "Starter"}
                </h2>
                <span className="inline-block mt-0.5 text-xs font-medium text-slate-500">
                  Tier Code: <span className="font-mono font-semibold text-slate-700">{subscription?.plan_code ?? "starter"}</span>
                </span>
              </div>
              <div className="text-right">
                <div className="num text-3xl font-extrabold text-slate-900">
                  {formatInr(subscription?.amount_paise ?? 0)}
                </div>
                <span className="text-[11px] font-medium text-slate-400 capitalize">
                  / {subscription?.cycle ?? "monthly"} billing
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200/80 p-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar size={14} className="text-slate-400" />
                <span>Current period ends:</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                {subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Auto-renewing"}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>Automatic prorated renewals</span>
              <span className="font-medium text-slate-700">18% GST invoice included</span>
            </div>
          </div>
        </div>

        {/* Resource Usage Grid */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 lg:col-span-7">
          {usage.map((meter) => {
            const meta = getMeterMeta(meter.key);
            const Icon = meta.icon;
            const unlimited = meter.limit < 0;
            const pct = unlimited
              ? 0
              : Math.min(100, Math.round((meter.used / Math.max(1, meter.limit)) * 100));

            return (
              <div
                key={meter.key}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-300"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {meter.label}
                    </span>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.bg} ${meta.color} border ${meta.border}`}>
                      <Icon size={14} />
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="num text-2xl font-bold text-slate-900">
                      {meter.used.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      / {unlimited ? "∞" : meter.limit.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    {unlimited ? (
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 w-full opacity-60" />
                    ) : (
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct > 85 ? "bg-rose-500" : pct > 65 ? "bg-amber-500" : meta.bar
                        }`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
                    <span>
                      {unlimited ? "Unlimited quota on plan" : `${pct}% of quota used`}
                    </span>
                    {!unlimited ? (
                      <span className="text-slate-400 font-mono text-[10px]">
                        {Math.max(0, meter.limit - meter.used)} left
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold text-[10px]">Uncapped</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          AVAILABLE PLATFORM PLANS SUITE & SWITCHER
         ===================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Available Platform Plans</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {plans.length} Tiers
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Upgrade or switch your subscription tier at any time. Limits and features update immediately.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setSelectedCycle("monthly")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycle("annual")}
              className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                selectedCycle === "annual"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-800">
                Save 16%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent =
              subscription?.plan_code === plan.code && subscription?.cycle === selectedCycle;
            const pricePaise =
              plan.prices.find((p) => p.cycle === selectedCycle)?.amount_paise ??
              plan.prices[0]?.amount_paise ??
              0;
            const enabledFeatures = (plan.features ?? []).filter((f) => f.enabled);
            const isEnterprise = plan.code.toLowerCase().includes("enterprise");
            const isProfessional = plan.code.toLowerCase().includes("pro");

            return (
              <div
                key={plan.code}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 ${
                  isCurrent
                    ? "border-slate-900 bg-slate-50/40 ring-2 ring-slate-900 shadow-sm"
                    : isEnterprise
                      ? "border-indigo-200 bg-white hover:border-indigo-300 hover:shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                }`}
              >
                {/* Current Plan Badge */}
                {isCurrent ? (
                  <div className="absolute -top-3 left-6">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      <Check size={11} strokeWidth={3} />
                      Current Active Plan
                    </span>
                  </div>
                ) : isEnterprise ? (
                  <div className="absolute -top-3 left-6">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      <Sparkles size={10} />
                      Most Popular Tier
                    </span>
                  </div>
                ) : null}

                <div>
                  {/* Plan Name & Tagline */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isEnterprise
                          ? "For multi-outlet retail chains & hypermarkets"
                          : isProfessional
                            ? "For expanding retail businesses"
                            : "For single-counter boutique stores"}
                      </p>
                    </div>
                  </div>

                  {/* Price Header */}
                  <div className="mt-4 flex items-baseline gap-1.5 border-b border-slate-100 pb-4">
                    <span className="num text-3xl font-extrabold text-slate-900">
                      {formatInr(pricePaise)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 capitalize">
                      / {selectedCycle}
                    </span>
                  </div>

                  {/* Plan Quotas Section */}
                  <div className="mt-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Plan Quotas &amp; Capacities
                    </span>
                    <ul className="mt-2.5 space-y-2 text-xs">
                      {plan.limits.slice(0, 5).map((lim) => (
                        <li key={lim.key} className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">{lim.name}</span>
                          <span className="num font-bold text-slate-900">
                            {lim.value < 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                <InfinityIcon size={13} />
                                Unlimited
                              </span>
                            ) : (
                              lim.value.toLocaleString("en-IN")
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Included Modules Section */}
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Included Platform Modules
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {enabledFeatures.length} Active
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {enabledFeatures.slice(0, 8).map((f) => (
                        <span
                          key={f.key}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-2xs"
                        >
                          <Check size={10} className="text-emerald-600" />
                          <span>{f.name}</span>
                        </span>
                      ))}
                      {enabledFeatures.length > 8 ? (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          +{enabledFeatures.length - 8} more features
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Switch Plan Button */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={isCurrent || switchingCode === plan.code}
                    onClick={() => void handleChangePlan(plan.code)}
                    className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition shadow-2xs ${
                      isCurrent
                        ? "border border-slate-200 bg-slate-100 text-slate-400 cursor-default"
                        : isEnterprise
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-95 cursor-pointer shadow-indigo-100"
                          : "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <Check size={14} strokeWidth={2.5} />
                        <span>Active Plan</span>
                      </>
                    ) : switchingCode === plan.code ? (
                      <>
                        <RotateCcw size={14} className="animate-spin" />
                        <span>Switching Plan...</span>
                      </>
                    ) : (
                      <>
                        <span>Switch to {plan.name}</span>
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          GST SUBSCRIPTION INVOICES TABLE
         ===================================================================== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">GST Subscription Invoices</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-bold text-slate-700">
                {invoices.length} Invoices
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Download tax invoices or submit UTR payment reference for open bills.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void issueInvoice()}
            disabled={isIssuingInvoice}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Receipt size={13} className="text-slate-500" />
            <span>Generate Invoice</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3.5">Invoice Number</th>
                <th className="px-6 py-3.5">Invoice Type</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Total (Incl. 18% GST)</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <FileText size={13} />
                      </div>
                      <span className="font-mono font-bold text-slate-900">{invoice.number}</span>
                    </div>
                  </td>

                  <td className="px-6 py-3.5">
                    {invoice.specimen ? (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Specimen Bill
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-100">
                        GST Tax Invoice
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize border ${
                        invoice.status === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          invoice.status === "paid" ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {invoice.status}
                    </span>
                  </td>

                  <td className="px-6 py-3.5 num font-bold text-slate-900 text-sm">
                    {formatInr(invoice.total_paise)}
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      {invoice.status !== "paid" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUtrModalInvoice(invoice);
                            setUtrValue("");
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer shadow-2xs"
                        >
                          <CreditCard size={12} />
                          <span>Record UTR</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void downloadPdf(invoice.id, invoice.number)}
                        title="Download GST PDF Invoice"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Download size={13} className="text-slate-500" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Receipt size={24} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">No GST Invoices Generated</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      No subscription tax invoices have been issued yet. Click &ldquo;Generate Current Period Invoice&rdquo; above to create your store&apos;s invoice.
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          RECORD BANK TRANSFER UTR MODAL
         ===================================================================== */}
      {utrModalInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Record Bank Transfer UTR
                  </h2>
                  <p className="text-xs text-slate-500">Invoice: {utrModalInvoice.number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUtrModalInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submitUtr} className="mt-4 space-y-4">
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Payment Verification Note:</span>
                <p className="mt-0.5 text-slate-500">
                  Enter the 12-digit transaction reference (UTR) provided by your bank app (UPI, NEFT, IMPS, RTGS) after transferring{" "}
                  <strong className="text-slate-900 font-bold">{formatInr(utrModalInvoice.total_paise)}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  12-Digit Bank UTR / Reference Number
                </label>
                <input
                  required
                  minLength={6}
                  value={utrValue}
                  onChange={(e) => setUtrValue(e.target.value)}
                  placeholder="e.g. 412389012345"
                  className="num mt-1.5 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setUtrModalInvoice(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Submit UTR &amp; Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
