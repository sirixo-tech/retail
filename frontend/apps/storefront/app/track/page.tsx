"use client";

import {
  ArrowLeft,
  Bike,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LiveOrderMap } from "../components/live-order-map";

type OrderLine = {
  store_item_id: string;
  name: string;
  qty: number;
  unit_price_paise: number;
  total_paise: number;
};

type TimelineEvent = {
  from_status?: string;
  to_status: string;
  created_at: string;
};

type OrderData = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  customer_name: string;
  customer_phone: string;
  latitude?: number | null;
  longitude?: number | null;
  live_location_url?: string | null;
  delivery_staff_name?: string | null;
  delivery_staff_phone?: string | null;
  delivery_status?: string | null;
  address_snapshot?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
  } | string | null;
  subtotal_paise: number;
  delivery_fee_paise: number;
  discount_paise: number;
  total_paise: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  store: {
    name: string;
    slug: string;
    phone?: string | null;
    address?: string | null;
    lat?: number | null;
    lng?: number | null;
    google_maps_api_key?: string | null;
  };
  lines: OrderLine[];
  timeline: TimelineEvent[];
};

const STEPS = [
  { key: "placed", label: "Order Placed", desc: "Received by store", icon: ShoppingBag },
  { key: "confirmed", label: "Store Accepted", desc: "Preparing fresh items", icon: Store },
  { key: "packed", label: "Packed", desc: "Bagged & quality checked", icon: Package },
  { key: "out_for_delivery", label: "Out for Delivery", desc: "Rider is on the way", icon: Bike },
  { key: "delivered", label: "Delivered", desc: "Handed over to customer", icon: CheckCircle2 },
];

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TrackPage() {
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-fill from URL parameters on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ordParam = params.get("order") || params.get("number") || "";
    const phoneParam = params.get("phone") || "";

    if (ordParam) {
      setNumber(ordParam);
      if (phoneParam) setPhone(phoneParam);
      void fetchTrack(ordParam, phoneParam, false);
    } else {
      // Check localStorage for recent order
      const lastOrder = window.localStorage.getItem("selfx_last_placed_order");
      if (lastOrder) {
        try {
          const parsed = JSON.parse(lastOrder) as { number?: string; phone?: string };
          if (parsed.number) {
            setNumber(parsed.number);
            if (parsed.phone) setPhone(parsed.phone);
            void fetchTrack(parsed.number, parsed.phone || "", false);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  async function fetchTrack(num: string, ph: string, silent = false) {
    if (!num.trim()) {
      if (!silent) setError("Please enter your Order Number.");
      return;
    }
    if (!silent) setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/public/orders/track", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ number: num.trim(), phone: ph.trim() || undefined }),
      });

      if (!res.ok) {
        if (!silent) {
          setError("No order found matching this Order Number. Please double-check.");
          setOrder(null);
        }
        return;
      }

      const json = (await res.json()) as { data: OrderData };
      setOrder(json.data);
    } catch {
      if (!silent) setError("Failed to connect to the store server. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Live polling every 8 seconds
  useEffect(() => {
    if (!order) return;
    const interval = window.setInterval(() => {
      void fetchTrack(order.number, phone || order.customer_phone || "", true);
    }, 8000);
    return () => window.clearInterval(interval);
  }, [order, phone]);

  // Current step index
  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    const s = order.status.toLowerCase();
    if (s === "cancelled") return -1;
    if (s === "delivered" || s === "completed") return 4;
    if (s === "out_for_delivery" || s === "dispatched") return 3;
    if (s === "packed" || s === "ready") return 2;
    if (s === "confirmed" || s === "processing" || s === "accepted") return 1;
    return 0; // placed
  }, [order]);

  function copyOrderNumber() {
    if (!order) return;
    void navigator.clipboard.writeText(order.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-800">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-2xs transition hover:bg-neutral-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Store
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-neutral-900 tracking-tight">Order Tracking</span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                LIVE
              </span>
            </div>
          </div>

          <Link
            href="/account"
            className="text-xs font-semibold text-[#0c831f] hover:underline"
          >
            My Orders
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {/* Search / Lookup Bar */}
        <div className="rounded-2xl border border-neutral-200/90 bg-white p-4 sm:p-5 shadow-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void fetchTrack(number, phone);
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Order Number (e.g. ORD-20261020-001)"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50/60 pl-9 pr-3 text-base sm:text-xs font-medium text-neutral-800 placeholder:text-neutral-400 outline-none transition focus:border-[#0c831f] focus:bg-white focus:ring-1 focus:ring-[#0c831f]"
              />
            </div>
            <div className="relative w-full sm:w-44">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile (optional)"
                className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50/60 pl-9 pr-3 text-base sm:text-xs font-medium text-neutral-800 placeholder:text-neutral-400 outline-none transition focus:border-[#0c831f] focus:bg-white focus:ring-1 focus:ring-[#0c831f]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0c831f] px-5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0a6f1a] disabled:opacity-60"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              Track Order
            </button>
          </form>

          {error && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Live Order Details View */}
        {order ? (
          <div className="mt-6 space-y-6">
            {/* Status Hero Card */}
            <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-xs">
              {/* Delivery ETA Header Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-[#f0fdf4] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c831f] text-white shadow-xs">
                    {currentStepIndex === 4 ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : currentStepIndex === 3 ? (
                      <Bike className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-[#065f46]">
                      {currentStepIndex === 4
                        ? "Order Delivered Successfully!"
                        : currentStepIndex === 3
                        ? "Rider is Out for Delivery"
                        : currentStepIndex === 2
                        ? "Order Packed & Ready"
                        : currentStepIndex === 1
                        ? "Store is Preparing Your Order"
                        : "Order Received by Store"}
                    </h2>
                    <p className="text-xs text-[#047857]">
                      {currentStepIndex === 4
                        ? "Thank you for shopping with us!"
                        : "Estimated delivery in 15–25 mins"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-neutral-700 bg-white px-2.5 py-1 rounded-lg border border-neutral-200">
                    {order.number}
                  </span>
                  <button
                    onClick={copyOrderNumber}
                    className="p-1 text-neutral-400 hover:text-neutral-700"
                    title="Copy Order Number"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="p-5 sm:p-6">
                <div className="relative flex items-center justify-between">
                  {/* Background Track Line */}
                  <div className="absolute left-6 right-6 top-5 -z-0 h-1 bg-neutral-100" />
                  <div
                    className="absolute left-6 top-5 -z-0 h-1 bg-[#0c831f] transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, (currentStepIndex / (STEPS.length - 1)) * 100))}%`,
                    }}
                  />

                  {STEPS.map((step, idx) => {
                    const isDone = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const Icon = step.icon;

                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center text-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                            isDone
                              ? "border-[#0c831f] bg-[#0c831f] text-white shadow-xs"
                              : "border-neutral-200 bg-white text-neutral-400"
                          } ${isCurrent ? "ring-4 ring-[#0c831f]/20 scale-110" : ""}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span
                          className={`mt-2 text-[11px] font-semibold sm:text-xs ${
                            isDone ? "text-neutral-900" : "text-neutral-400"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="hidden sm:block text-[10px] text-neutral-400 max-w-[90px]">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Interactive Map (Google Maps / High-Tech Radar) */}
            {order.fulfillment === "delivery" && (
              <LiveOrderMap
                storeLat={order.store?.lat ?? 12.9716}
                storeLng={order.store?.lng ?? 77.5946}
                storeName={order.store?.name ?? "Store"}
                storeAddress={order.store?.address}
                customerLat={order.latitude}
                customerLng={order.longitude}
                customerAddress={
                  typeof order.address_snapshot === "string"
                    ? order.address_snapshot
                    : order.address_snapshot?.address || order.address_snapshot?.line1 || "Customer Address"
                }
                orderNumber={order.number}
                orderStatus={order.status}
                deliveryStaffName={order.delivery_staff_name}
                deliveryStaffPhone={order.delivery_staff_phone}
                googleMapsApiKey={order.store?.google_maps_api_key}
                liveLocationUrl={order.live_location_url}
                heightClass="h-72 sm:h-80"
                showDetails={true}
              />
            )}

            {/* Two Column Details: Items & Delivery Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Order Items Card (2 cols) */}
              <div className="md:col-span-2 rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Items Ordered ({order.lines?.length || 0})
                  </h3>
                  <span className="text-xs font-semibold text-neutral-500">
                    {order.fulfillment === "delivery" ? "Doorstep Delivery" : "Store Pickup"}
                  </span>
                </div>

                <div className="divide-y divide-neutral-100">
                  {order.lines?.map((line, idx) => (
                    <div key={`${line.store_item_id}-${idx}`} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 font-semibold text-neutral-600 text-[11px]">
                          {line.qty}×
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-800">{line.name}</p>
                          <p className="text-[11px] text-neutral-400">{formatInr(line.unit_price_paise)} / unit</p>
                        </div>
                      </div>
                      <span className="font-semibold text-neutral-900">{formatInr(line.total_paise)}</span>
                    </div>
                  ))}
                </div>

                {/* Bill Breakdown */}
                <div className="border-t border-neutral-200 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Items Subtotal</span>
                    <span>{formatInr(order.subtotal_paise)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Delivery Partner Fee</span>
                    <span className={order.delivery_fee_paise === 0 ? "font-semibold text-emerald-600" : ""}>
                      {order.delivery_fee_paise === 0 ? "FREE" : formatInr(order.delivery_fee_paise)}
                    </span>
                  </div>
                  {order.discount_paise > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount Applied</span>
                      <span>-{formatInr(order.discount_paise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold text-neutral-900 border-t border-neutral-100 pt-2">
                    <span>Total Paid</span>
                    <span className="text-[#0c831f]">{formatInr(order.total_paise)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Address & Store Details Card (1 col) */}
              <div className="space-y-4">
                {/* Delivery Location */}
                <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
                    <MapPin className="h-4 w-4 text-[#0c831f]" />
                    <span>Delivery Address</span>
                  </div>
                  <div className="text-xs text-neutral-600 leading-relaxed">
                    <p className="font-semibold text-neutral-800">{order.customer_name}</p>
                    <p>{order.customer_phone}</p>
                    {order.address_snapshot ? (
                      typeof order.address_snapshot === "string" ? (
                        <p className="mt-1 text-neutral-500">{order.address_snapshot}</p>
                      ) : (
                        <p className="mt-1 text-neutral-500">
                          {[
                            order.address_snapshot.line1,
                            order.address_snapshot.line2,
                            order.address_snapshot.city,
                            order.address_snapshot.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )
                    ) : (
                      <p className="mt-1 text-neutral-400">Store Pickup Counter</p>
                    )}
                  </div>
                </div>

                {/* Payment Badge */}
                <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-900">
                    <span>Payment Mode</span>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold border border-emerald-200">
                      {order.payment_status?.toUpperCase() || "CONFIRMED"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pt-1">
                    {order.payment_method === "phonepe" ? (
                      <img src="/logos/phonepe.svg" alt="PhonePe" className="h-6 w-auto object-contain" />
                    ) : order.payment_method === "paytm" ? (
                      <img src="/logos/paytm.svg" alt="Paytm" className="h-4 w-auto object-contain" />
                    ) : order.payment_method === "razorpay" ? (
                      <img src="/logos/razorpay.png" alt="Razorpay" className="h-4 w-auto object-contain" />
                    ) : order.payment_method === "stripe" ? (
                      <img src="/logos/stripe.png" alt="Stripe" className="h-4 w-auto object-contain" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs">
                        ₹
                      </div>
                    )}
                    <span className="text-xs font-semibold capitalize text-neutral-700">
                      {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Store Support Card */}
                <div className="rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
                    <Store className="h-4 w-4 text-neutral-500" />
                    <span>Fulfilling Store</span>
                  </div>
                  <div className="text-xs text-neutral-600">
                    <p className="font-semibold text-neutral-800">{order.store?.name || "Retail Store"}</p>
                    {order.store?.phone && (
                      <a
                        href={`tel:${order.store.phone}`}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                      >
                        <Phone className="h-3.5 w-3.5 text-[#0c831f]" />
                        Call Store
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
