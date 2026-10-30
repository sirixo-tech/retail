"use client";

import {
  ArrowLeft,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Heart,
  HelpCircle,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  MoreVertical,
  Navigation,
  Package,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
  Truck,
  User,
  X,
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
    delivery_slot?: string;
    customer_auth_mode?: string;
  } | string | null;
  subtotal_paise: number;
  delivery_fee_paise: number;
  discount_paise: number;
  total_paise: number;
  payment_status: string;
  payment_method: string;
  pickup_qr?: string | null;
  qr_validated_at?: string | null;
  created_at: string;
  store: {
    name: string;
    slug: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    lat?: number | null;
    lng?: number | null;
    google_maps_api_key?: string | null;
  };
  lines: OrderLine[];
  timeline: TimelineEvent[];
};

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function computeVerificationCode(orderNumber?: string, id?: string): string {
  const source = `${orderNumber ?? ""} ${id ?? ""}`;
  const digits = source.replace(/\D+/g, "");
  if (!digits) return "2045";
  const lastFour = digits.slice(-4);
  return lastFour.length === 4 ? lastFour : lastFour.padStart(4, "0");
}

function formatArrivalTime(createdAtString?: string, slot?: string): string {
  if (slot && slot.trim()) {
    return slot.trim();
  }
  if (!createdAtString) return "at 12:45";
  try {
    const d = new Date(createdAtString);
    if (isNaN(d.getTime())) return "at 12:45";
    // Add 35 minutes for estimated delivery
    d.setMinutes(d.getMinutes() + 35);
    return `at ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  } catch {
    return "at 12:45";
  }
}

export default function TrackPage() {
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [tipToast, setTipToast] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDetailsAccordion, setShowDetailsAccordion] = useState(true);

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
      setShowSearchModal(false);
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

  function copyOrderNumber() {
    if (!order) return;
    void navigator.clipboard.writeText(order.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSelectTip(amount: number) {
    if (selectedTip === amount) {
      setSelectedTip(null);
      setTipToast(null);
      return;
    }
    setSelectedTip(amount);
    setTipToast(`Added ₹${amount} tip for ${order?.delivery_staff_name || "your shopper"}`);
    setTimeout(() => setTipToast(null), 3500);
  }

  // Stepper logic matching 4 steps from reference:
  // Step 0: Accepted | Step 1: Processing | Step 2: Pickup | Step 3: Delivered
  const stepStatus = useMemo(() => {
    if (!order) return { stepIndex: 0, isProcessing: false };
    const s = (order.status || "").toLowerCase();

    if (s === "delivered" || s === "completed") {
      return { stepIndex: 3, isProcessing: false };
    }
    if (s === "out_for_delivery" || s === "dispatched") {
      return { stepIndex: 2, isProcessing: true };
    }
    if (s === "packed" || s === "ready") {
      return { stepIndex: 2, isProcessing: false };
    }
    if (s === "confirmed" || s === "accepted" || s === "processing") {
      return { stepIndex: 1, isProcessing: true };
    }
    // placed
    return { stepIndex: 0, isProcessing: true };
  }, [order]);

  const deliverySlot = useMemo(() => {
    if (!order?.address_snapshot) return null;
    if (typeof order.address_snapshot === "object" && order.address_snapshot.delivery_slot) {
      return order.address_snapshot.delivery_slot;
    }
    return null;
  }, [order]);

  const arrivingText = useMemo(() => {
    if (order?.status === "delivered" || order?.status === "completed") {
      return "Delivered safely";
    }
    return `Arriving ${formatArrivalTime(order?.created_at, deliverySlot || undefined)}`;
  }, [order, deliverySlot]);

  const verificationCode = useMemo(() => {
    return computeVerificationCode(order?.number, order?.id);
  }, [order]);

  // Delivery rider assignment resolution (reflecting real assigned delivery staff from delivery orders)
  const hasAssignedDriver = Boolean(
    order?.delivery_staff_name && order.delivery_staff_name.trim().length > 0 && order.delivery_staff_name.trim().toLowerCase() !== "unassigned"
  );
  const driverName = hasAssignedDriver
    ? order!.delivery_staff_name!.trim()
    : order?.fulfillment === "pickup"
    ? "Store Pickup Counter"
    : "Assigning Delivery Partner...";
  const driverSubtitle = hasAssignedDriver
    ? "Assigned delivery partner · Coming to you ★ 4.8"
    : order?.fulfillment === "pickup"
    ? "Staff preparing your items at counter"
    : "Store is preparing items for dispatch";
  const driverPhone = order?.delivery_staff_phone?.trim() || order?.store?.phone || "";
  const cleanPhone = driverPhone.replace(/\D/g, "");

  const handleGoBack = () => {
    if (typeof window !== "undefined") {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        const storeSlug = order?.store?.slug || "bangalore";
        window.location.href = `/store?store=${encodeURIComponent(storeSlug)}`;
      }
    }
  };

  // Main UI
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 flex justify-center selection:bg-emerald-500 selection:text-white">
      {/* Mobile-Framed / Responsive Page Container */}
      <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white min-h-screen flex flex-col shadow-2xl relative overflow-x-hidden">
        {/* ==================================================================== */}
        {/* 1. TOP HEADER FLOATING OVER MAP (IMAGE REFERENCE)                   */}
        {/* ==================================================================== */}
        <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 pt-4 pb-2">
          {/* Back Button */}
          <button
            type="button"
            onClick={handleGoBack}
            aria-label="Back to store"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-md border border-slate-100 hover:bg-slate-50 transition active:scale-95 cursor-pointer z-40"
          >
            <ArrowLeft size={19} className="stroke-[2.5]" />
          </button>

          {/* Centered Title */}
          <div className="flex items-center gap-1.5">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
              Tracking Order
            </h1>
          </div>

          {/* Options Menu Button (Three Dots) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              aria-label="Order options"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-md border border-slate-100 hover:bg-slate-50 transition active:scale-95 cursor-pointer"
            >
              <MoreVertical size={19} className="stroke-[2.5]" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    copyOrderNumber();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                >
                  <Copy size={15} className="text-slate-500" />
                  <span>{copied ? "Copied!" : "Copy Order ID"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                >
                  <Search size={15} className="text-slate-500" />
                  <span>Lookup Another Order</span>
                </button>
                {order?.store?.phone && (
                  <a
                    href={`tel:${order.store.phone}`}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                  >
                    <Phone size={15} className="text-slate-500" />
                    <span>Call Store Support</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (navigator.share && order) {
                      void navigator.share({
                        title: `Track Order ${order.number}`,
                        url: window.location.href,
                      });
                    } else {
                      copyOrderNumber();
                    }
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left cursor-pointer"
                >
                  <Share2 size={15} className="text-slate-500" />
                  <span>Share Tracking</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ==================================================================== */}
        {/* 2. REALISTIC STYLIZED STREET MAP OR GOOGLE MAPS (IF CONFIGURED)     */}
        {/* ==================================================================== */}
        {order?.store?.google_maps_api_key ? (
          <div className="relative w-full h-[360px] sm:h-[400px] overflow-hidden shrink-0">
            <LiveOrderMap
              storeLat={order.store.lat ?? 12.9716}
              storeLng={order.store.lng ?? 77.5946}
              storeName={order.store.name}
              storeAddress={order.store.address}
              customerLat={order.latitude}
              customerLng={order.longitude}
              customerAddress={
                typeof order.address_snapshot === "string"
                  ? order.address_snapshot
                  : order.address_snapshot?.address || order.address_snapshot?.line1 || "Customer Delivery Address"
              }
              orderNumber={order.number}
              orderStatus={order.status}
              fulfillment={order.fulfillment}
              deliveryStaffName={order.delivery_staff_name}
              deliveryStaffPhone={order.delivery_staff_phone}
              googleMapsApiKey={order.store.google_maps_api_key}
              liveLocationUrl={order.live_location_url}
              heightClass="h-[360px] sm:h-[400px]"
              showDetails={false}
            />
          </div>
        ) : (
          <div className="relative w-full h-[360px] sm:h-[400px] bg-[#f0f3f6] overflow-hidden shrink-0 select-none">
            {/* Stylized SVG Map Layer: Roads, Blocks, Street Labels, and Route */}
            <svg
              className="w-full h-full object-cover"
              viewBox="0 0 400 360"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background base */}
              <rect width="400" height="360" fill="#f0f3f6" />

              {/* City blocks / building footprints (Faint light grey geometry) */}
              <g fill="#e7ebef" opacity="0.85">
                <polygon points="20,80 90,60 120,130 50,150" />
                <polygon points="140,50 200,30 220,90 160,110" />
                <polygon points="240,40 310,20 330,80 260,100" />
                <polygon points="30,170 100,150 120,220 50,240" />
                <polygon points="35,260 110,240 130,310 60,330" />
                <polygon points="220,130 290,110 320,190 250,210" />
                <polygon points="325,120 380,100 395,160 340,180" />
                <polygon points="210,230 280,210 300,280 230,300" />
                <polygon points="310,210 370,190 390,260 330,280" />
              </g>

              {/* Minor Street Grid Lines (White roads with faint borders) */}
              <g stroke="#ffffff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M -20,120 L 420,50" />
                <path d="M -20,200 L 420,130" />
                <path d="M -20,290 L 420,220" />
                <path d="M 80,-20 L 150,380" />
                <path d="M 190,-20 L 260,380" />
                <path d="M 310,-20 L 370,380" />
                <path d="M 110,140 L 280,90" />
                <path d="M 70,240 L 240,190" />
              </g>

              {/* Faint Street Names (Matching Image) */}
              <g fill="#94a3b8" fontSize="8" fontWeight="600" opacity="0.75" letterSpacing="0.05em">
                <text x="85" y="70" transform="rotate(-10 85 70)">street name</text>
                <text x="210" y="85" transform="rotate(-10 210 85)">street name</text>
                <text x="155" y="275">STREET</text>
                <text x="75" y="225" transform="rotate(-10 75 225)">street name</text>
                <text x="320" y="165">LOWERVAILSB...</text>
              </g>

              {/* The Curving Green Route Line (Image Reference) */}
              <path
                d="M 120,275 C 105,210 115,165 200,155 C 205,100 195,85 270,75"
                fill="none"
                stroke="#22c55e"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Start Point Marker (Bottom-Left on Route) */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
              style={{ left: "30%", top: "76%" }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/25 animate-pulse">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#16a34a] text-white shadow-md">
                  <Navigation size={12} className="fill-white stroke-none rotate-45" />
                </div>
              </div>
            </div>

            {/* Courier Scooter Marker (Middle of Route — Pulsing/Floating) */}
            <div
              className="absolute z-15 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
              style={{ left: "51%", top: "43%" }}
            >
              <div className="relative group">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow-xl border border-slate-100/90 transition-transform hover:scale-110">
                  <div className="flex items-center justify-center text-lg leading-none select-none">
                    🛵
                  </div>
                </div>
                <span className="absolute -inset-1 rounded-full border-2 border-emerald-400/50 animate-ping pointer-events-none" />
              </div>
            </div>

            {/* Destination Marker (Top-Right on Route) */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: "68%", top: "21%" }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#10b981] bg-white/90 shadow-md">
                <div className="h-3 w-3 rounded-full bg-[#10b981]" />
              </div>
              <div className="mt-0.5 h-1.5 w-6 rounded-full bg-[#0284c7]/30 blur-[1px]" />
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* 3. BOTTOM OVERLAPPING SHEET / CARD (EXACT IMAGE REPLICATION)        */}
        {/* ==================================================================== */}
        <div className="relative -mt-8 z-20 flex-1 rounded-t-[34px] bg-white px-5 sm:px-6 pt-6 pb-12 shadow-[0_-12px_32px_rgba(0,0,0,0.08)] space-y-6">
          {/* Grab Handle */}
          <div className="mx-auto h-1 w-12 rounded-full bg-slate-200" />

          {/* ROW 1: "Out For delivery" & Code "2045" */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                {stepStatus.stepIndex === 3
                  ? "Delivered"
                  : stepStatus.stepIndex === 2
                  ? "Out For delivery"
                  : stepStatus.stepIndex === 1
                  ? "Order Processing"
                  : "Order Accepted"}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
                {arrivingText}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 block leading-tight font-mono">
                {verificationCode}
              </span>
              <span className="text-xs font-semibold text-slate-400 block">
                Your code
              </span>
            </div>
          </div>

          {/* ROW 2: 4-STEP TIMELINE STEPPER (ACCEPTED -> PROCESSING -> PICKUP -> DELIVERED) */}
          <div className="py-1">
            <div className="relative flex items-center justify-between">
              {/* Horizontal Connecting Track Line */}
              <div className="absolute left-6 right-6 top-4 -z-0 h-1 bg-slate-100 rounded-full" />
              <div
                className="absolute left-6 top-4 -z-0 h-1 bg-[#22c55e] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, (stepStatus.stepIndex / 3) * 100)
                  )}%`,
                }}
              />

              {/* STEP 1: Accepted */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-white shadow-xs transition ${
                    stepStatus.stepIndex >= 0 ? "bg-[#22c55e]" : "bg-slate-200 text-slate-400"
                  }`}
                >
                  <Check size={18} className="stroke-[3]" />
                </div>
                <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-800">
                  Accepted
                </span>
              </div>

              {/* STEP 2: Processing */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-white shadow-xs transition ${
                    stepStatus.stepIndex > 1
                      ? "bg-[#22c55e]"
                      : stepStatus.stepIndex === 1
                      ? "bg-[#22c55e] ring-4 ring-emerald-100"
                      : "bg-[#f1f5f9] text-[#94a3b8]"
                  }`}
                >
                  {stepStatus.stepIndex > 1 ? (
                    <Check size={18} className="stroke-[3]" />
                  ) : stepStatus.stepIndex === 1 ? (
                    <Loader2 size={18} className="animate-spin stroke-[2.5]" />
                  ) : (
                    <Clock size={16} />
                  )}
                </div>
                <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-800">
                  Processing
                </span>
              </div>

              {/* STEP 3: Pickup / Out for Delivery */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full shadow-xs transition ${
                    stepStatus.stepIndex > 2
                      ? "bg-[#22c55e] text-white"
                      : stepStatus.stepIndex === 2
                      ? "bg-[#22c55e] text-white ring-4 ring-emerald-100"
                      : "bg-[#f1f5f9] text-[#94a3b8]"
                  }`}
                >
                  {stepStatus.stepIndex > 2 ? (
                    <Check size={18} className="stroke-[3]" />
                  ) : (
                    <Truck size={17} className="stroke-[2.2]" />
                  )}
                </div>
                <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-800">
                  Pickup
                </span>
              </div>

              {/* STEP 4: Delivered */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full shadow-xs transition ${
                    stepStatus.stepIndex >= 3
                      ? "bg-[#22c55e] text-white"
                      : "bg-[#f1f5f9] text-[#94a3b8]"
                  }`}
                >
                  {stepStatus.stepIndex >= 3 ? (
                    <Check size={18} className="stroke-[3]" />
                  ) : (
                    <Package size={17} className="stroke-[2.2]" />
                  )}
                </div>
                <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-800">
                  Delivered
                </span>
              </div>
            </div>
          </div>

          {/* ROW 3: DELIVERY SHOPPER CARD (REAL ASSIGNED RIDER FROM DELIVERY ORDERS) */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-3.5 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {/* Circular Avatar of Assigned Rider or Dispatch Status */}
              <div className="relative h-12 w-12 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-xs bg-slate-100 flex items-center justify-center">
                {hasAssignedDriver ? (
                  <div className="flex h-full w-full items-center justify-center bg-[#16a34a] text-white font-black text-sm uppercase">
                    {driverName.slice(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-600">
                    <Bike size={20} className="text-slate-500 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Shopper Details */}
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900 truncate leading-snug">
                  {driverName}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="truncate">{driverSubtitle}</span>
                  {hasAssignedDriver && (
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-500">
                      <Star size={12} className="fill-amber-500" />
                      <span>4.8</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Action Icons (Green Circular WhatsApp & Call Buttons) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* WhatsApp / Chat */}
              <a
                href={`https://wa.me/${cleanPhone || "919999999999"}?text=${encodeURIComponent(
                  hasAssignedDriver
                    ? `Hello ${driverName}, regarding my delivery order ${order?.number || ""}:`
                    : `Hello, inquiry regarding order ${order?.number || ""}:`
                )}`}
                target="_blank"
                rel="noreferrer"
                aria-label={hasAssignedDriver ? "Chat with assigned rider" : "Chat with store support"}
                title={hasAssignedDriver ? `Chat with ${driverName}` : "Chat with store support"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ecfdf5] hover:bg-[#d1fae5] border border-emerald-200/80 text-[#16a34a] shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <MessageSquare size={17} className="stroke-[2.2]" />
              </a>

              {/* Phone Call */}
              <a
                href={`tel:${cleanPhone || order?.store?.phone || ""}`}
                aria-label={hasAssignedDriver ? "Call assigned rider" : "Call store support"}
                title={hasAssignedDriver ? `Call ${driverName}` : "Call store support"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ecfdf5] hover:bg-[#d1fae5] border border-emerald-200/80 text-[#16a34a] shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Phone size={17} className="stroke-[2.2]" />
              </a>
            </div>
          </div>

          {/* ROW 4: TIP YOUR SHOPPER SECTION (IMAGE REFERENCE: $2.00, $5.00, $10.00, $15.00) */}
          <div className="space-y-3 pt-1">
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                Tip your shopper
              </h4>
              <p className="text-xs text-slate-500">
                Everyone deserve a little kindness
              </p>
            </div>

            {/* Preset Tip Pill Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[20, 50, 100, 150].map((amt) => {
                const isSelected = selectedTip === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectTip(amt)}
                    className={`h-11 rounded-full border text-xs sm:text-sm font-bold transition flex items-center justify-center active:scale-95 cursor-pointer ${
                      isSelected
                        ? "border-[#16a34a] bg-emerald-50 text-[#16a34a] shadow-2xs ring-2 ring-emerald-200"
                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    ₹{amt}
                  </button>
                );
              })}
            </div>

            {/* Tip Confirmation Toast */}
            {tipToast && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-150">
                <span className="inline-flex items-center gap-1.5">
                  <Heart size={14} className="fill-emerald-600 text-emerald-600" />
                  {tipToast}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold">
                  THANK YOU!
                </span>
              </div>
            )}
          </div>

          {/* ==================================================================== */}
          {/* 4. FULL ORDER DETAILS (ITEMS, BILL, ADDRESS, QR HANDOVER CODE)       */}
          {/* ==================================================================== */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            {/* Accordion Toggle */}
            <button
              type="button"
              onClick={() => setShowDetailsAccordion((prev) => !prev)}
              className="w-full flex items-center justify-between py-1 text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#16a34a]" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#16a34a] transition">
                  Order Details &amp; Summary ({order?.lines?.length ?? 0} items)
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <span>{showDetailsAccordion ? "Hide" : "View"}</span>
                {showDetailsAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showDetailsAccordion && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Itemized Lines */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 divide-y divide-slate-100">
                  {(order?.lines ?? []).map((line, idx) => (
                    <div
                      key={`${line.store_item_id}-${idx}`}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white border border-slate-200 font-bold text-slate-700 text-[11px] shrink-0">
                          {line.qty}×
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{line.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {formatInr(line.unit_price_paise)} / unit
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0">
                        {formatInr(line.total_paise)}
                      </span>
                    </div>
                  ))}

                  {(!order?.lines || order.lines.length === 0) && (
                    <div className="py-2 text-center text-xs text-slate-400">
                      Standard grocery order
                    </div>
                  )}
                </div>

                {/* Bill Breakdown */}
                <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-slate-700">
                      {formatInr(order?.subtotal_paise ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Partner Fee</span>
                    <span
                      className={
                        order?.delivery_fee_paise === 0
                          ? "font-bold text-emerald-600"
                          : "font-semibold text-slate-700"
                      }
                    >
                      {order?.delivery_fee_paise === 0 ? "FREE" : formatInr(order?.delivery_fee_paise ?? 0)}
                    </span>
                  </div>
                  {selectedTip && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Shopper Tip</span>
                      <span>₹{selectedTip}</span>
                    </div>
                  )}
                  {(order?.discount_paise ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount Applied</span>
                      <span>-{formatInr(order?.discount_paise ?? 0)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-black text-slate-900">
                    <span>Total Paid</span>
                    <span className="text-[#16a34a]">
                      {formatInr((order?.total_paise ?? 0) + (selectedTip ? selectedTip * 100 : 0))}
                    </span>
                  </div>
                </div>

                {/* Verification Card: QR code ONLY for In-Store Pickup; OTP Card (NO QR) for Delivery Orders (COD / Prepaid) */}
                {order?.fulfillment === "pickup" || order?.payment_method === "pay_at_store" ? (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 text-center space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1.5 text-orange-800">
                        <QrCode size={15} /> Store Pickup Receipt QR
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-200">
                        Show at Counter
                      </span>
                    </div>
                    <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-xl border-2 border-slate-900 bg-white p-2 shadow-xs">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                          order?.pickup_qr || `SELFX-ORD-${order?.number || verificationCode}`
                        )}`}
                        alt="Store Pickup QR"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="font-mono text-xs font-bold text-slate-800">
                      {order?.pickup_qr || `SELFX-ORD-${order?.number || verificationCode}`}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Present this QR at the store counter to scan and claim your order receipt.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-emerald-50/30 p-5 text-center space-y-3 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="inline-flex items-center gap-1.5 text-emerald-800">
                        <ShieldCheck size={16} /> Delivery Verification OTP
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 shadow-2xs">
                        {order?.payment_method === "cod" ? "Cash on Delivery" : "Prepaid Order"}
                      </span>
                    </div>
                    
                    <div className="py-2">
                      <div className="inline-flex items-center justify-center tracking-widest text-3xl sm:text-4xl font-black font-mono text-emerald-950 bg-white px-6 py-2.5 rounded-2xl border-2 border-emerald-500 shadow-sm">
                        {verificationCode}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                      Share this <strong>4-digit OTP</strong> with your delivery partner upon arrival to verify and complete delivery.
                    </p>
                  </div>
                )}

                {/* Delivery Address & Time Slot */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <MapPin size={14} className="text-[#16a34a]" />
                    <span>Delivery Location</span>
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <p className="font-bold text-slate-900">{order?.customer_name || "Customer"}</p>
                    <p>{order?.customer_phone}</p>
                    <p className="mt-1 text-slate-500">
                      {typeof order?.address_snapshot === "string"
                        ? order.address_snapshot
                        : [
                            order?.address_snapshot?.line1,
                            order?.address_snapshot?.line2,
                            order?.address_snapshot?.city,
                            order?.address_snapshot?.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ") || "Registered Delivery Address"}
                    </p>
                    {deliverySlot && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                        <Clock size={11} /> Slot: {deliverySlot}
                      </span>
                    )}
                  </div>
                </div>

                {/* Store Support Strip */}
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
                      <Store size={16} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate block">
                        {order?.store?.name || "Retail Store"}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {order?.store?.address || "Fulfilling from primary store warehouse"}
                      </span>
                    </div>
                  </div>
                  {order?.store?.phone && (
                    <a
                      href={`tel:${order.store.phone}`}
                      className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Call Store
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Status Refresh Strip */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live tracking · auto-updating every 8s</span>
            </span>

            <button
              type="button"
              onClick={() => void fetchTrack(order?.number || number, phone)}
              className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 5. SEARCH / LOOKUP ANOTHER ORDER MODAL                              */}
        {/* ==================================================================== */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-900">
                  Track Another Order
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSearchModal(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void fetchTrack(number, phone);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Order Number
                  </label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="e.g. ORD-20261028-001"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#16a34a] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-xs font-semibold outline-none focus:border-[#16a34a] focus:bg-white"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-full bg-[#16a34a] hover:bg-green-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  <span>Locate Order</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
