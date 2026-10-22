"use client";

import { formatInr } from "@selfx/types";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Layers,
  Receipt,
  X,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Billing, Plans &amp; Quotas
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage your store subscription tier, monitor resource usage limits, and download GST invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void issueInvoice()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Receipt className="h-3.5 w-3.5 text-slate-500" />
          Generate Current Period Invoice
        </button>
      </div>

      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Current Subscription Overview + Usage Meters */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Current Active Plan
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {subscription?.status ?? "Active"}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {subscription?.plan ?? "Starter"}
            </h2>
            <p className="num mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {formatInr(subscription?.amount_paise ?? 0)}
              <span className="text-xs font-medium text-slate-400">
                {" "}
                / {subscription?.cycle ?? "monthly"}
              </span>
            </p>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500 flex items-center justify-between">
            <span>Current period ends</span>
            <span className="num font-semibold text-slate-800">
              {subscription?.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString("en-IN")
                : "Auto-renewing"}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
          {usage.map((meter) => {
            const unlimited = meter.limit < 0;
            const pct = unlimited
              ? 18
              : Math.min(100, Math.round((meter.used / Math.max(1, meter.limit)) * 100));
            return (
              <div
                key={meter.key}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {meter.label}
                  </div>
                  <div className="num mt-2 text-2xl font-semibold text-slate-900">
                    {meter.used.toLocaleString("en-IN")}
                    <span className="text-xs font-medium text-slate-400">
                      {" "}
                      / {unlimited ? "Unlimited" : meter.limit.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        pct > 85 ? "bg-amber-500" : "bg-slate-900"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    {unlimited ? "No quota cap on current plan" : `${pct}% of plan quota used`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Comparison & Switcher */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Available Platform Plans</h2>
            <p className="text-xs text-slate-500">
              Upgrade or switch your subscription tier at any time. Limits and features update immediately.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setSelectedCycle("monthly")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
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
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                selectedCycle === "annual"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Annual Billing (Save 16%)
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent =
              subscription?.plan_code === plan.code && subscription?.cycle === selectedCycle;
            const pricePaise =
              plan.prices.find((p) => p.cycle === selectedCycle)?.amount_paise ??
              plan.prices[0]?.amount_paise ??
              0;
            const enabledFeatures = (plan.features ?? []).filter((f) => f.enabled);

            return (
              <div
                key={plan.code}
                className={`flex flex-col justify-between rounded-xl border p-5 ${
                  isCurrent ? "border-slate-900 bg-slate-50/40" : "border-slate-200 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
                    {isCurrent ? (
                      <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Current Plan
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="num text-2xl font-semibold text-slate-900">
                      {formatInr(pricePaise)}
                    </span>
                    <span className="text-xs text-slate-400">/ {selectedCycle}</span>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Plan Quotas
                    </div>
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {plan.limits.slice(0, 5).map((lim) => (
                        <li key={lim.key} className="flex items-center justify-between">
                          <span className="text-slate-500">{lim.name}</span>
                          <span className="num font-semibold text-slate-900">
                            {lim.value < 0 ? "Unlimited" : lim.value.toLocaleString("en-IN")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Included Modules ({enabledFeatures.length})
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {enabledFeatures.slice(0, 8).map((f) => (
                        <span
                          key={f.key}
                          className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {f.name}
                        </span>
                      ))}
                      {enabledFeatures.length > 8 ? (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          +{enabledFeatures.length - 8} more
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCurrent || switchingCode === plan.code}
                  onClick={() => void handleChangePlan(plan.code)}
                  className={`mt-5 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition ${
                    isCurrent
                      ? "border border-slate-200 bg-slate-100 text-slate-400 cursor-default"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  {isCurrent
                    ? "Active Plan"
                    : switchingCode === plan.code
                      ? "Switching..."
                      : `Switch to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">GST Subscription Invoices</h2>
            <p className="text-xs text-slate-500">
              Download tax invoices or submit UTR payment reference for open bills.
            </p>
          </div>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Invoice Number</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Total (Incl. GST)</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-50/60">
                <td className="num px-5 py-3 font-semibold text-slate-900">{invoice.number}</td>
                <td className="px-5 py-3 text-slate-500">
                  {invoice.specimen ? "Specimen Invoice" : "Tax Invoice"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                      invoice.status === "paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="num px-5 py-3 font-semibold text-slate-900">
                  {formatInr(invoice.total_paise)}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    {invoice.status !== "paid" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUtrModalInvoice(invoice);
                          setUtrValue("");
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <CreditCard className="h-3 w-3" />
                        Record UTR
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void downloadPdf(invoice.id, invoice.number)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-400">
                  No subscription invoices generated yet. Click &ldquo;Generate Current Period Invoice&rdquo; above.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Record UTR Modal */}
      {utrModalInvoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Record Bank Transfer UTR — {utrModalInvoice.number}
              </h2>
              <button
                type="button"
                onClick={() => setUtrModalInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitUtr} className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                NEFT / IMPS / UPI 12-Digit UTR Number
                <input
                  required
                  minLength={6}
                  value={utrValue}
                  onChange={(e) => setUtrValue(e.target.value)}
                  placeholder="e.g. 412389012345"
                  className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUtrModalInvoice(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
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
