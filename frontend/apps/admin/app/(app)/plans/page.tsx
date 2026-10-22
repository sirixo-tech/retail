"use client";

import { Check, Pencil, Plus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, warmCsrf } from "../../lib/api";

type PlanPrice = { cycle: string; amount_paise: number };
type PlanLimit = { key: string; name: string; value: number };
type PlanFeature = { key: string; name: string; category: string; enabled: boolean };

type Plan = {
  id: string;
  code: string;
  name: string;
  status: string;
  subscribers_count: number;
  prices: PlanPrice[];
  limits: PlanLimit[];
  features: PlanFeature[];
};

const LIMIT_LABELS: Record<string, string> = {
  "limit.stores": "Stores",
  "limit.staff": "Staff Accounts",
  "limit.products": "Products",
  "limit.orders_per_month": "Orders / Month",
  "limit.counters": "POS Counters",
  "limit.storage_mb": "Storage (MB)",
  "limit.sms_per_month": "SMS / Month",
  "limit.ai_credits_per_month": "AI Credits / Month",
};

const FEATURE_LABELS: Record<string, { label: string; group: string }> = {
  "module.pos": { label: "POS Billing & Hold Bills", group: "Core Retail" },
  "module.offline_pos": { label: "Offline POS Mode", group: "Core Retail" },
  "module.inventory": { label: "Inventory & Batch Stock", group: "Core Retail" },
  "module.price_lists": { label: "Multi-Tier Price Lists", group: "Core Retail" },
  "module.multi_store": { label: "Multi-Store Management", group: "Core Retail" },
  "module.storefront": { label: "Online Storefront", group: "Online Commerce" },
  "module.delivery": { label: "Local Delivery & Zones", group: "Online Commerce" },
  "module.custom_domain": { label: "Custom Storefront Domain", group: "Online Commerce" },
  "module.customers": { label: "Customer CRM & Segments", group: "CRM & Finance" },
  "module.loyalty": { label: "Loyalty Points & Tiers", group: "CRM & Finance" },
  "module.khata": { label: "Customer Khata (Credit Ledger)", group: "CRM & Finance" },
  "module.reports_advanced": { label: "Advanced GST & Profit Reports", group: "CRM & Finance" },
  "module.accounting_export": { label: "Tally / Accounting Export", group: "CRM & Finance" },
  "module.whatsapp": { label: "WhatsApp Receipts & Alerts", group: "Integrations & AI" },
  "module.webhooks": { label: "Real-Time Webhooks", group: "Integrations & AI" },
  "module.api_keys": { label: "Developer REST API Keys", group: "Integrations & AI" },
  "module.ai_reports": { label: "AI Report Insights", group: "Integrations & AI" },
  "module.ai_product_create": { label: "AI Catalog Autofill", group: "Integrations & AI" },
  "module.ai_assistant": { label: "AI Store Assistant", group: "Integrations & AI" },
  "apps.desktop": { label: "Desktop POS App", group: "Platform Apps" },
  "apps.windows": { label: "Windows Thermal Bridge", group: "Platform Apps" },
  "apps.android": { label: "Android POS App", group: "Platform Apps" },
  "apps.ios": { label: "iOS Manager App", group: "Platform Apps" },
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editMonthlyRupees, setEditMonthlyRupees] = useState(0);
  const [editAnnualRupees, setEditAnnualRupees] = useState(0);
  const [editLimits, setEditLimits] = useState<Record<string, number>>({});
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({});

  // Create state
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newMonthlyRupees, setNewMonthlyRupees] = useState(1499);
  const [newAnnualRupees, setNewAnnualRupees] = useState(14990);

  async function loadPlans() {
    setLoading(true);
    try {
      await warmCsrf();
      const response = await fetch("/api/v1/platform/plans", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        const body = (await response.json()) as { data: Plan[] };
        setPlans(body.data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  function openEditModal(plan: Plan) {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditStatus(plan.status || "active");
    const monthly = plan.prices.find((p) => p.cycle === "monthly")?.amount_paise ?? 0;
    const annual = plan.prices.find((p) => p.cycle === "annual")?.amount_paise ?? 0;
    setEditMonthlyRupees(Math.round(monthly / 100));
    setEditAnnualRupees(Math.round(annual / 100));

    const limMap: Record<string, number> = {};
    plan.limits.forEach((l) => {
      limMap[l.key] = l.value;
    });
    setEditLimits(limMap);

    const featMap: Record<string, boolean> = {};
    plan.features.forEach((f) => {
      featMap[f.key] = f.enabled;
    });
    setEditFeatures(featMap);
  }

  async function handleSavePlan(e: FormEvent) {
    e.preventDefault();
    if (!editingPlan) return;
    setSaving(true);
    try {
      await api(`/api/v1/platform/plans/${editingPlan.code}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          status: editStatus,
          monthly_paise: Math.round(Number(editMonthlyRupees) * 100),
          annual_paise: Math.round(Number(editAnnualRupees) * 100),
          limits: editLimits,
          features: editFeatures,
        }),
      });
      setToast(`Updated "${editName}" plan limits, pricing, and platform features.`);
      setEditingPlan(null);
      await loadPlans();
    } catch {
      setToast("Could not update plan. Please verify all values.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePlan(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const template = plans[0];
      const defaultLimits: Record<string, number> = {};
      template?.limits.forEach((l) => {
        defaultLimits[l.key] = l.value;
      });
      const defaultFeatures: Record<string, boolean> = {};
      template?.features.forEach((f) => {
        defaultFeatures[f.key] = f.enabled;
      });

      await api("/api/v1/platform/plans", {
        method: "POST",
        body: JSON.stringify({
          code: newCode.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
          name: newName,
          monthly_paise: Math.round(Number(newMonthlyRupees) * 100),
          annual_paise: Math.round(Number(newAnnualRupees) * 100),
          limits: defaultLimits,
          features: defaultFeatures,
        }),
      });
      setToast(`Created new plan "${newName}".`);
      setCreatingPlan(false);
      setNewCode("");
      setNewName("");
      await loadPlans();
    } catch {
      setToast("Could not create plan. Ensure the plan code is unique.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Plans</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Define pricing tiers, limits, and feature sets for our retail platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreatingPlan(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          New plan
        </button>
      </div>

      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Plans Grid */}
      {loading ? (
        <div className="grid gap-5 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[460px] animate-pulse rounded-xl border border-slate-200 bg-white p-6" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          {plans.map((plan) => {
            const isPopular = plan.code === "growth" || plan.name.toLowerCase() === "professional";
            const monthlyPaise = plan.prices.find((p) => p.cycle === "monthly")?.amount_paise ?? 0;
            const annualPaise = plan.prices.find((p) => p.cycle === "annual")?.amount_paise ?? 0;
            const enabledFeatures = (plan.features ?? []).filter((f) => f.enabled);

            return (
              <article
                key={plan.code}
                className={`flex flex-col justify-between rounded-xl border bg-white p-6 transition ${
                  isPopular
                    ? "border-blue-500 ring-1 ring-blue-500/20 shadow-xs"
                    : "border-slate-200"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-slate-900">{plan.name}</h2>
                        {isPopular ? (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                            Popular
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {plan.code === "starter"
                          ? "For single stores getting started"
                          : plan.code === "growth"
                            ? "For growing stores with online ordering"
                            : plan.code === "scale"
                              ? "For multi-branch retail chains"
                              : `Plan code: ${plan.code}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        plan.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          plan.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {plan.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Pricing */}
                  <div className="mt-5">
                    <div className="flex items-baseline gap-1">
                      <span className="num text-3xl font-semibold tracking-tight text-slate-900">
                        ₹{(monthlyPaise / 100).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs font-medium text-slate-400">/month</span>
                    </div>
                    <p className="num mt-0.5 text-xs text-slate-400">
                      ₹{(annualPaise / 100).toLocaleString("en-IN")} / year
                    </p>
                  </div>

                  {/* Limits */}
                  <div className="mt-6">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Limits
                    </div>
                    <ul className="mt-2 divide-y divide-slate-100 border-t border-slate-100">
                      {plan.limits.map((limit) => (
                        <li
                          key={limit.key}
                          className="flex items-center justify-between py-2 text-xs"
                        >
                          <span className="text-slate-600">
                            {LIMIT_LABELS[limit.key] ?? limit.name}
                          </span>
                          <span className="num font-semibold text-slate-900">
                            {limit.value < 0 ? "Unlimited" : limit.value.toLocaleString("en-IN")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Features */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Platform Features ({enabledFeatures.length})
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {enabledFeatures.map((feat) => (
                        <span
                          key={feat.key}
                          className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50/70 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {FEATURE_LABELS[feat.key]?.label ?? feat.name}
                        </span>
                      ))}
                      {enabledFeatures.length === 0 ? (
                        <span className="text-xs text-slate-400">No features enabled</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-400">
                    {plan.subscribers_count ?? 0}{" "}
                    {plan.subscribers_count === 1 ? "subscriber" : "subscribers"}
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3 w-3 text-slate-500" />
                    Edit
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Edit Plan — {editingPlan.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure pricing, resource limits, and toggle platform features for{" "}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">
                    {editingPlan.code}
                  </code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Basic & Pricing */}
              <div className="grid gap-4 sm:grid-cols-4">
                <label className="block text-xs font-semibold text-slate-700">
                  Plan Name
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Status
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Monthly Price (₹)
                  <input
                    type="number"
                    min={0}
                    value={editMonthlyRupees}
                    onChange={(e) => setEditMonthlyRupees(Number(e.target.value))}
                    required
                    className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Annual Price (₹)
                  <input
                    type="number"
                    min={0}
                    value={editAnnualRupees}
                    onChange={(e) => setEditAnnualRupees(Number(e.target.value))}
                    required
                    className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
                  />
                </label>
              </div>

              {/* Quotas / Limits */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Platform Limits (Use -1 for Unlimited)
                  </h3>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  {editingPlan.limits.map((lim) => (
                    <label
                      key={lim.key}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-700"
                    >
                      <span className="block truncate text-[11px] text-slate-500">
                        {LIMIT_LABELS[lim.key] ?? lim.name}
                      </span>
                      <input
                        type="number"
                        min={-1}
                        value={editLimits[lim.key] ?? lim.value}
                        onChange={(e) =>
                          setEditLimits((prev) => ({
                            ...prev,
                            [lim.key]: Number(e.target.value),
                          }))
                        }
                        className="num mt-1.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Platform Features Checkboxes */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Platform Modules &amp; Features
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Select which platform capabilities are included in the {editName} plan.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        editingPlan.features.forEach((f) => {
                          next[f.key] = true;
                        });
                        setEditFeatures(next);
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Enable all
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        editingPlan.features.forEach((f) => {
                          next[f.key] = false;
                        });
                        setEditFeatures(next);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {editingPlan.features.map((feat) => {
                    const checked = Boolean(editFeatures[feat.key]);
                    const info = FEATURE_LABELS[feat.key] ?? {
                      label: feat.name,
                      group: feat.category,
                    };
                    return (
                      <button
                        key={feat.key}
                        type="button"
                        onClick={() =>
                          setEditFeatures((prev) => ({
                            ...prev,
                            [feat.key]: !prev[feat.key],
                          }))
                        }
                        className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                          checked
                            ? "border-blue-600 bg-blue-50/40 text-slate-900"
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                            checked
                              ? "bg-blue-600 text-white"
                              : "border border-slate-300 bg-white"
                          }`}
                        >
                          {checked ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-900">
                            {info.label}
                          </div>
                          <div className="text-[10px] text-slate-400">{feat.key}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving changes..." : "Save Plan Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* New Plan Modal */}
      {creatingPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Create New Plan</h2>
              <button
                type="button"
                onClick={() => setCreatingPlan(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Plan Display Name
                <input
                  required
                  placeholder="e.g. Franchise Plus"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Plan Code (slug)
                <input
                  required
                  placeholder="e.g. franchise"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Monthly Price (₹)
                  <input
                    type="number"
                    required
                    min={0}
                    value={newMonthlyRupees}
                    onChange={(e) => setNewMonthlyRupees(Number(e.target.value))}
                    className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Annual Price (₹)
                  <input
                    type="number"
                    required
                    min={0}
                    value={newAnnualRupees}
                    onChange={(e) => setNewAnnualRupees(Number(e.target.value))}
                    className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreatingPlan(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
