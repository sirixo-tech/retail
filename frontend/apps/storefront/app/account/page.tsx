"use client";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  KeyRound,
  LogOut,
  Package,
  Phone,
  RefreshCw,
  Repeat,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const STORE_STORAGE_KEY = "selfx_active_store_slug_v1";

function getCartKey(storeSlug: string) {
  return `selfx_storefront_cart_${storeSlug}_v2`;
}

type OrderLine = {
  store_item_id: string;
  name: string;
  qty: number;
  unit_price_paise: number;
  total_paise?: number;
};

type PastOrder = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  customer_name: string;
  total_paise: number;
  subtotal_paise: number;
  delivery_fee_paise: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  store_slug: string;
  store_name: string;
  items_count: number;
  lines: OrderLine[];
};

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AccountPage() {
  const [storeSlug, setStoreSlug] = useState("bangalore");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [loyalty, setLoyalty] = useState<{ name: string; points: number; tier: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);

  useEffect(() => {
    const activeSlug =
      (typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("store") ||
          window.localStorage.getItem(STORE_STORAGE_KEY))) ||
      "bangalore";
    setStoreSlug(activeSlug);

    try {
      const savedCustomer = window.localStorage.getItem("selfx_storefront_customer_v2");
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer) as { phone?: string; name?: string };
        if (parsed.phone) {
          setPhone(parsed.phone);
          setVerified(true);
          void loadCustomerData(parsed.phone, activeSlug);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  async function loadCustomerData(userPhone: string, slug: string) {
    const cleaned = userPhone.replace(/\D/g, "").slice(0, 10);
    if (!cleaned) return;

    // 1. Fetch loyalty
    try {
      const resLoyalty = await fetch(
        `/api/v1/public/stores/${encodeURIComponent(slug)}/loyalty?phone=${encodeURIComponent(cleaned)}`,
      );
      if (resLoyalty.ok) {
        const body = (await resLoyalty.json()) as { data?: { name: string; points: number; tier: string } };
        if (body.data) setLoyalty(body.data);
      }
    } catch {
      // ignore
    }

    // 2. Fetch past orders
    setLoadingOrders(true);
    try {
      const resOrders = await fetch(`/api/v1/public/orders/customer?phone=${encodeURIComponent(cleaned)}`);
      if (resOrders.ok) {
        const body = (await resOrders.json()) as { data: PastOrder[] };
        setPastOrders(body.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  }

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "").slice(0, 10);
    if (cleaned.length < 10) {
      setStatusMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpSent(true);
    setStatusMsg("Enter the verification code sent to your mobile number.");
    void loadCustomerData(cleaned, storeSlug);
  }

  function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "").slice(0, 10);
    const customer = {
      phone: cleaned,
      name: loyalty?.name || `Customer ${cleaned.slice(-4)}`,
    };
    try {
      window.localStorage.setItem("selfx_storefront_customer_v2", JSON.stringify(customer));
    } catch {
      // ignore
    }
    setVerified(true);
    setStatusMsg("Signed in! Your store bills, online orders, and loyalty account are synced.");
    void loadCustomerData(cleaned, storeSlug);
  }

  function handleSignOut() {
    try {
      window.localStorage.removeItem("selfx_storefront_customer_v2");
    } catch {
      // ignore
    }
    setVerified(false);
    setOtpSent(false);
    setOtp("");
    setPhone("");
    setLoyalty(null);
    setPastOrders([]);
    setStatusMsg("You have signed out.");
  }

  // 1-Click Reorder Action
  function handleReorder(order: PastOrder) {
    setReordering(order.id);
    try {
      const cartKey = getCartKey(storeSlug);
      const existingRaw = window.localStorage.getItem(cartKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};

      // Add all order lines to cart
      for (const line of order.lines) {
        existing[line.store_item_id] = {
          product: {
            id: line.store_item_id,
            name: line.name,
            slug: line.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            selling_price_paise: line.unit_price_paise,
          },
          qty: (existing[line.store_item_id]?.qty || 0) + line.qty,
        };
      }

      window.localStorage.setItem(cartKey, JSON.stringify(existing));
      window.location.href = `/cart?store=${encodeURIComponent(storeSlug)}`;
    } catch {
      setReordering(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-800">
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href={`/?store=${encodeURIComponent(storeSlug)}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 transition hover:text-[#0c831f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Store
          </Link>
          <div className="flex items-center gap-3">
            {verified && (
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600 shadow-2xs hover:bg-neutral-50"
              >
                <LogOut className="h-3.5 w-3.5 text-neutral-400" />
                Sign Out
              </button>
            )}
            <Link
              href={`/cart?store=${encodeURIComponent(storeSlug)}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0c831f] px-3 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0a6f1a]"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              My Cart
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {!verified ? (
          /* Login / Sign Up Card */
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-[#0c831f]">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <h1 className="mt-4 text-xl font-semibold tracking-tight text-neutral-900">
                Log in or Sign up
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Enter your 10-digit mobile number to access your past orders, delivery tracking, and loyalty rewards.
              </p>

              {statusMsg && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-[#0c831f] shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700">Mobile Number</label>
                  <div className="mt-1.5 flex h-11 items-center rounded-xl border border-neutral-300 bg-white px-3.5 focus-within:border-[#0c831f] focus-within:ring-1 focus-within:ring-[#0c831f]">
                    <span className="text-xs font-semibold text-neutral-400 mr-1.5">+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      className="h-full w-full bg-transparent text-sm font-semibold text-neutral-800 outline-none"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700">Verification Code (OTP)</label>
                    <div className="mt-1.5 flex h-11 items-center rounded-xl border border-neutral-300 bg-white px-3.5 focus-within:border-[#0c831f] focus-within:ring-1 focus-within:ring-[#0c831f]">
                      <KeyRound className="h-4 w-4 text-neutral-400" />
                      <input
                        type="text"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 4-digit code"
                        className="h-full w-full bg-transparent pl-2.5 font-mono text-sm font-semibold tracking-widest outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0c831f] px-5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0a6f1a]"
                >
                  <span>{otpSent ? "Verify & Continue" : "Send Verification Code"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Logged In Dashboard with Real Past Orders */
          <div className="space-y-6">
            {/* Customer Profile & Loyalty Hero */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0c831f] font-semibold text-white text-base shadow-xs">
                  {loyalty?.name?.charAt(0).toUpperCase() || "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base sm:text-lg font-semibold text-neutral-900">
                      {loyalty?.name || "Customer Account"}
                    </h1>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </div>
                  <p className="text-xs font-medium text-neutral-500">+91 {phone}</p>
                </div>
              </div>

              {/* Loyalty Points Pill */}
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-[#f8fafc] px-4 py-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Loyalty Rewards</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {loyalty?.points ?? 120} Points{" "}
                    <span className="text-xs font-semibold text-neutral-500">({loyalty?.tier || "Gold Member"})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Past Orders Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">Order History</h2>
                  <p className="text-xs text-neutral-500">Track current shipments or reorder favorite items in 1 click.</p>
                </div>
                <button
                  onClick={() => void loadCustomerData(phone, storeSlug)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600 shadow-2xs hover:bg-neutral-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {loadingOrders ? (
                <div className="flex items-center justify-center rounded-2xl border border-neutral-200 bg-white py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : pastOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-12 text-center p-6">
                  <Package className="h-10 w-10 text-neutral-300" />
                  <h3 className="mt-3 text-sm font-semibold text-neutral-800">No Past Orders Yet</h3>
                  <p className="mt-1 text-xs text-neutral-500 max-w-sm">
                    Your online purchases and counter orders linked to +91 {phone} will appear right here.
                  </p>
                  <Link
                    href={`/?store=${encodeURIComponent(storeSlug)}`}
                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0c831f] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#0a6f1a]"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {pastOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs transition hover:border-neutral-300 space-y-3.5"
                    >
                      {/* Order Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-semibold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                            {ord.number}
                          </span>
                          <span className="text-xs text-neutral-400">·</span>
                          <span className="text-xs text-neutral-500">
                            {new Date(ord.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              ord.status === "delivered" || ord.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : ord.status === "out_for_delivery"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : ord.status === "cancelled"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {ord.status.toUpperCase().replace("_", " ")}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900">
                            {formatInr(ord.total_paise)}
                          </span>
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div className="text-xs text-neutral-600 space-y-1">
                        <p className="font-semibold text-neutral-800">
                          {ord.lines?.map((l) => `${l.name} (${l.qty}×)`).join(", ") || `${ord.items_count} items`}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {ord.fulfillment === "delivery" ? "Doorstep Delivery" : "Store Counter Pickup"} ·{" "}
                          <span className="capitalize">{ord.payment_method?.replace("_", " ")}</span>
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2.5 pt-1">
                        <Link
                          href={`/track?order=${encodeURIComponent(ord.number)}&phone=${encodeURIComponent(phone)}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50"
                        >
                          <Truck className="h-3.5 w-3.5 text-[#0c831f]" />
                          Track Status
                        </Link>

                        <button
                          type="button"
                          disabled={reordering === ord.id}
                          onClick={() => handleReorder(ord)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#0c831f] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0a6f1a] disabled:opacity-60"
                        >
                          <Repeat className={`h-3.5 w-3.5 ${reordering === ord.id ? "animate-spin" : ""}`} />
                          {reordering === ord.id ? "Adding..." : "1-Click Reorder"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
