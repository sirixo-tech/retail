"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  Copy,
  DollarSign,
  Gift,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  status: string;
  max_redemptions: number | null;
  redeemed_count: number;
  expires_at: string | null;
  created_at?: string;
}

interface CouponSummary {
  total_coupons: number;
  active_coupons: number;
  total_redemptions: number;
  total_discount_granted_paise: number;
}

function formatInr(paise: number): string {
  const rupees = Math.round(paise / 100);
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export default function OnlineStoreCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [summary, setSummary] = useState<CouponSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal / Creator State
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/coupons?with_summary=1", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const json = await res.json();
        const data = json.data;
        if (data && typeof data === "object" && "items" in data) {
          setCoupons(data.items || []);
          setSummary(data.summary || null);
        } else if (Array.isArray(data)) {
          setCoupons(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCoupons();
  }, [fetchCoupons]);

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateRandomCode = () => {
    const prefixes = ["SAVE", "FESTIVE", "SPECIAL", "WELCOME", "DEAL", "SUPER"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = kind === "percent" ? [10, 15, 20, 25, 30, 50][Math.floor(Math.random() * 6)] : [50, 100, 150, 200, 500][Math.floor(Math.random() * 5)];
    setCode(`${prefix}${number}`);
    if (!value) {
      setValue(String(number));
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const valNum = parseInt(value, 10);
    if (isNaN(valNum) || valNum <= 0) {
      setFormError("Discount value must be a positive number.");
      return;
    }
    if (kind === "percent" && valNum > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }
    if (!code.trim()) {
      setFormError("Coupon code is required.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        code: code.trim().toUpperCase(),
        kind,
        value: valNum,
      };
      if (maxRedemptions.trim()) {
        const maxNum = parseInt(maxRedemptions, 10);
        if (maxNum > 0) body.max_redemptions = maxNum;
      }
      if (expiresAt.trim()) {
        body.expires_at = expiresAt;
      }

      const res = await fetch("/api/v1/coupons", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });

      const resData = await res.json();
      if (!res.ok) {
        setFormError(resData?.error?.message || "Failed to create coupon code.");
        return;
      }

      // Reset and refresh
      setCode("");
      setValue("");
      setMaxRedemptions("");
      setExpiresAt("");
      setModalOpen(false);
      await fetchCoupons();
    } catch {
      setFormError("Network error occurred while creating coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/coupons/${id}/toggle`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        const nextStatus = json.data?.status;
        setCoupons((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: nextStatus || (c.status === "active" ? "paused" : "active") } : c)),
        );
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string, couponCode: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon code "${couponCode}"?`)) return;
    try {
      const res = await fetch(`/api/v1/coupons/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setCoupons((prev) => prev.filter((c) => c.id !== id));
        if (summary) {
          setSummary({ ...summary, total_coupons: Math.max(0, summary.total_coupons - 1) });
        }
      }
    } catch {
      // ignore
    }
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      return c.code.toLowerCase().includes(searchQuery.toLowerCase().trim());
    });
  }, [coupons, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Coupons &amp; Discounts</h1>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-200">
              Online Storefront
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Create promotional coupon codes for online checkout. Configure percentage or flat discounts, usage caps, and validity periods.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void fetchCoupons()}
            title="Refresh Coupons"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setModalOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Coupon
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Coupons</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{summary?.total_coupons ?? coupons.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">Configured promotional codes</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Active Coupons</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Gift className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-900">
            {summary?.active_coupons ?? coupons.filter((c) => c.status === "active").length}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700">Currently claimable at checkout</p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Total Redemptions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-blue-900">
            {summary?.total_redemptions ?? coupons.reduce((sum, c) => sum + (c.redeemed_count || 0), 0)}
          </p>
          <p className="mt-1 text-[11px] text-blue-700">Orders placed with coupon applied</p>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800">Customer Discount Savings</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-purple-900">
            {formatInr(summary?.total_discount_granted_paise ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-purple-700">Cumulative order discounts granted</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search coupon code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
          </select>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {filteredCoupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Tag className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">No coupons found</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery || statusFilter !== "all"
                ? "No promo codes match your current filters."
                : "Create your first discount coupon code to boost customer conversions on your online store."}
            </p>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Coupon
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3">Coupon Code</th>
                  <th className="px-4 py-3">Discount Type</th>
                  <th className="px-4 py-3">Redemption Usage</th>
                  <th className="px-4 py-3">Validity &amp; Expiry</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {filteredCoupons.map((coupon) => {
                  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                  const isMaxedOut = coupon.max_redemptions !== null && coupon.redeemed_count >= coupon.max_redemptions;
                  const percentUsed =
                    coupon.max_redemptions !== null
                      ? Math.min(100, Math.round((coupon.redeemed_count / coupon.max_redemptions) * 100))
                      : null;

                  return (
                    <tr key={coupon.id} className="transition hover:bg-slate-50/70">
                      {/* Code with Copy Chip */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-wider text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            title="Copy Code"
                            className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Discount Kind & Value */}
                      <td className="px-4 py-3">
                        {coupon.kind === "percent" ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                            <Percent className="h-3 w-3" />
                            {coupon.value}% OFF
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            ₹{coupon.value} FLAT OFF
                          </span>
                        )}
                      </td>

                      {/* Usage / Redemptions */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-800">
                              {coupon.redeemed_count}{" "}
                              <span className="text-slate-400">
                                / {coupon.max_redemptions !== null ? coupon.max_redemptions : "∞"} uses
                              </span>
                            </span>
                            {percentUsed !== null && (
                              <span className="text-slate-400 font-medium">{percentUsed}%</span>
                            )}
                          </div>
                          {percentUsed !== null && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  percentUsed >= 100 ? "bg-rose-500" : percentUsed > 75 ? "bg-amber-500" : "bg-indigo-600"
                                }`}
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3">
                        {coupon.expires_at ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-600">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Expires {coupon.expires_at}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Never expires</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            Expired
                          </span>
                        ) : isMaxedOut ? (
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
                            Cap Reached
                          </span>
                        ) : coupon.status === "active" ? (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                            Paused
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleToggleStatus(coupon.id)}
                            title={coupon.status === "active" ? "Pause coupon" : "Activate coupon"}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition"
                          >
                            {coupon.status === "active" ? (
                              <>
                                <ToggleRight className="h-4 w-4 text-emerald-600" />
                                Pause
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 text-slate-400" />
                                Resume
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(coupon.id, coupon.code)}
                            title="Delete coupon"
                            className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5">
              <h2 className="text-base font-semibold text-slate-900">Create Promotional Coupon</h2>
              <p className="mt-1 text-xs text-slate-500">
                Configure discount parameters for customer checkout on your online store.
              </p>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              {/* Code with Generator */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Coupon Code</label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <Sparkles className="h-3 w-3" />
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. FESTIVE20, SAVE100"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-mono font-bold uppercase tracking-wider text-slate-800 outline-none focus:border-slate-900"
                />
              </div>

              {/* Discount Kind (Tabs) */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Discount Kind</label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setKind("percent")}
                    className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
                      kind === "percent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Percent className="h-3.5 w-3.5 text-indigo-600" />
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind("fixed")}
                    className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${
                      kind === "fixed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    Fixed Amount (₹)
                  </button>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  {kind === "percent" ? "Percentage Off (%)" : "Flat Discount Amount (₹)"}
                </label>
                <input
                  type="number"
                  min="1"
                  max={kind === "percent" ? "100" : undefined}
                  required
                  placeholder={kind === "percent" ? "e.g. 20" : "e.g. 150"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900"
                />
              </div>

              {/* Max Redemptions Limit */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Max Redemptions <span className="font-normal text-slate-400">(Leave blank for unlimited)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100 uses total"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-slate-900"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Expiry Date <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-slate-900"
                />
              </div>

              {/* Form Buttons */}
              <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
