"use client";

import { Button, KpiCard, PageHeader } from "@selfx/ui";
import { formatCount, formatInr } from "@selfx/types";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  MapPin,
  Navigation,
  Package,
  Phone,
  Printer,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Truck,
  UserCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReceiptData, ReceiptModal } from "../../../components/receipt-modal";
import { ToastContainer, useToast } from "../../../components/pos-toast";
import { DeliveryOrderMapModal } from "./delivery-order-map-modal";

type DeliveryOrder = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  customer_name: string;
  customer_phone?: string | null;
  total_paise: number;
  subtotal_paise: number;
  delivery_fee_paise: number;
  discount_paise: number;
  payment_status: string;
  payment_method: string;
  delivery_status: string;
  delivery_staff_id?: string | null;
  delivery_staff_name?: string | null;
  delivery_staff_phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  live_location_url?: string | null;
  address: string;
  city: string;
  pincode: string;
  landmark?: string | null;
  order_notes?: string | null;
  store_name?: string;
  created_at: string;
  updated_at: string;
  items_count: number;
  isNew?: boolean;
  lines: {
    name: string;
    qty: number;
    unit_price_paise: number;
    total_paise: number;
  }[];
};

type AvailableRider = {
  id: string;
  display_name: string;
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

// Pleasant Web Audio synthesizer chime for live incoming customer order alerts
function playLiveOrderChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.25); // D6

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch {
    // Audio context may be restricted before user gesture
  }
}

export default function DeliveryManagementPage() {
  const [allOrders, setAllOrders] = useState<DeliveryOrder[]>([]);
  const [availableRiders, setAvailableRiders] = useState<AvailableRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendCounts, setBackendCounts] = useState<{ total: number; pending: number; active: number; delivered: number }>({
    total: 0,
    pending: 0,
    active: 0,
    delivered: 0,
  });
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "active" | "delivered" | "failed">("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<"all" | "delivery" | "pickup">("all");
  const [search, setSearch] = useState("");
  const [selectedRiderFilter, setSelectedRiderFilter] = useState<string>("all");
  const [assigningOrder, setAssigningOrder] = useState<DeliveryOrder | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [newOrderAlert, setNewOrderAlert] = useState<DeliveryOrder | null>(null);

  // In-Store Pickup QR Scan Modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [pickupQrCode, setPickupQrCode] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<ReceiptData | null>(null);

  // Order Detail / Receipt Modal preview
  const [selectedDetailReceipt, setSelectedDetailReceipt] = useState<ReceiptData | null>(null);

  // Live Navigation & Map Modal for Delivery Person
  const [navModalOrder, setNavModalOrder] = useState<DeliveryOrder | null>(null);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);

  const { toasts, showToast, dismissToast } = useToast();
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Load tenant's configured Google Maps API Key from online store settings
  useEffect(() => {
    async function loadMapsConfig() {
      try {
        const uRes = await fetch("/api/v1/user", { credentials: "include" });
        if (uRes.ok) {
          const uBody = await uRes.json();
          const storeId = uBody.data?.store?.id || uBody.data?.current_store_id;
          if (storeId) {
            const rRes = await fetch(`/api/v1/stores/${storeId}/receipt`, { credentials: "include" });
            if (rRes.ok) {
              const rBody = await rRes.json();
              const onlineConfig = rBody.data?.online_store_settings || rBody.data?.online_store;
              const key = onlineConfig?.contact?.googleMapsApiKey || onlineConfig?.basics?.googleMapsApiKey;
              if (key) setGoogleMapsApiKey(key);
            }
          }
        }
      } catch {
        // ignore
      }
    }
    void loadMapsConfig();
  }, []);

  // Auto-unlock Web Audio API context on first user interaction
  useEffect(() => {
    const unlock = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          if (ctx.state === "suspended") {
            void ctx.resume();
          }
        }
      } catch {}
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Fetch all orders with credentials and live customer update detection
  const fetchOrders = useCallback(async (isBackgroundPoll = false) => {
    try {
      if (!isBackgroundPoll) setLoading(true);

      const res = await fetch("/api/v1/delivery/orders?fulfillment=all", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        if (!isBackgroundPoll) showToast("Failed to load delivery orders.", "error");
        return;
      }

      const data = await res.json();
      const incomingOrders: DeliveryOrder[] = (data.data?.orders || data.orders) || [];

      if (data.data?.counts || data.counts) {
        setBackendCounts(data.data?.counts || data.counts);
      }

      // Check for newly arrived customer orders during live background polling
      if (!isInitialLoadRef.current && knownOrderIdsRef.current.size > 0) {
        const freshOrders = incomingOrders.filter((o) => !knownOrderIdsRef.current.has(o.id));
        if (freshOrders.length > 0) {
          const newest = freshOrders[0];
          setNewOrderAlert(newest);
          if (audioEnabled) {
            playLiveOrderChime();
          }
          showToast(
            `🔔 Live Order Alert: #${newest.number} from ${newest.customer_name} (${formatInr(newest.total_paise)}) just arrived!`,
            "ok",
            8000,
          );
        }
      } else if (isInitialLoadRef.current && incomingOrders.length > 0) {
        // If there is an order placed recently (last 30 mins) that is unassigned, surface it as live alert
        const recentPending = incomingOrders.find((o) => {
          if (!o.created_at) return false;
          const ageMinutes = (Date.now() - new Date(o.created_at).getTime()) / 60000;
          return ageMinutes <= 30 && o.delivery_status === "unassigned" && !["delivered", "picked_up", "cancelled"].includes(o.status);
        });
        if (recentPending) {
          setNewOrderAlert(recentPending);
        }
      }

      // Track known order IDs
      incomingOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
      isInitialLoadRef.current = false;

      setAllOrders(incomingOrders);
      const riders = data.data?.available_riders || data.available_riders;
      if (Array.isArray(riders)) {
        setAvailableRiders(riders);
      }
      setLastSyncedAt(new Date());
    } catch {
      if (!isBackgroundPoll) {
        showToast("Error connecting to delivery service.", "error");
      }
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  }, [audioEnabled, showToast]);

  // Initial fetch
  useEffect(() => {
    void fetchOrders(false);
  }, [fetchOrders]);

  // Real-time live polling every 3.5 seconds so incoming customer orders pop up immediately
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchOrders(true);
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Filtered orders for tab, channel, rider, and search query
  const orders = useMemo(() => {
    return allOrders.filter((order) => {
      // Tab status filter
      if (activeTab === "pending") {
        const isPending =
          (["unassigned", "assigned"].includes(order.delivery_status) ||
            (order.fulfillment === "pickup" && ["placed", "accepted", "packing", "ready"].includes(order.status))) &&
          !["delivered", "picked_up", "rejected", "cancelled"].includes(order.status);
        if (!isPending) return false;
      } else if (activeTab === "active") {
        const isActive =
          order.delivery_status === "out_for_delivery" || (order.fulfillment === "pickup" && order.status === "ready");
        if (!isActive) return false;
      } else if (activeTab === "delivered") {
        const isDelivered = order.delivery_status === "delivered" || order.status === "picked_up";
        if (!isDelivered) return false;
      } else if (activeTab === "failed") {
        if (order.delivery_status !== "failed") return false;
      }

      // Fulfillment filter
      if (fulfillmentFilter !== "all" && order.fulfillment !== fulfillmentFilter) {
        return false;
      }

      // Rider filter
      if (selectedRiderFilter !== "all" && order.delivery_staff_id !== selectedRiderFilter) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchNum = order.number.toLowerCase().includes(q);
        const matchName = order.customer_name.toLowerCase().includes(q);
        const matchPhone = order.customer_phone?.toLowerCase().includes(q);
        const matchAddress = order.address?.toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchPhone && !matchAddress) return false;
      }

      return true;
    });
  }, [allOrders, activeTab, fulfillmentFilter, selectedRiderFilter, search]);

  // Accurate real-time stats
  const stats = useMemo(() => {
    const total = allOrders.length;
    const pending = allOrders.filter(
      (o) =>
        (["unassigned", "assigned"].includes(o.delivery_status) ||
          (o.fulfillment === "pickup" && ["placed", "accepted", "packing", "ready"].includes(o.status))) &&
        !["delivered", "picked_up", "cancelled", "rejected"].includes(o.status),
    ).length;
    const active = allOrders.filter(
      (o) => o.delivery_status === "out_for_delivery" || (o.fulfillment === "pickup" && o.status === "ready"),
    ).length;
    const delivered = allOrders.filter(
      (o) => o.delivery_status === "delivered" || o.status === "picked_up",
    ).length;
    const codTotal = allOrders
      .filter((o) => o.payment_method === "cod" && o.delivery_status !== "delivered")
      .reduce((acc, o) => acc + (o.total_paise || 0), 0);

    return { total, pending, active, delivered, codTotal };
  }, [allOrders]);

  // Assign rider handler
  const handleAssignRider = async () => {
    if (!assigningOrder || !selectedStaffId) return;
    try {
      setSubmitting(true);
      const token = getCsrfToken();
      const res = await fetch(`/api/v1/delivery/orders/${assigningOrder.id}/assign`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({ staff_id: selectedStaffId }),
      });
      if (!res.ok) {
        showToast("Failed to assign delivery rider.", "error");
        return;
      }
      showToast(`Rider assigned to order ${assigningOrder.number}!`, "ok");
      setAssigningOrder(null);
      setSelectedStaffId("");
      await fetchOrders(false);
    } catch {
      showToast("Error assigning delivery rider.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Status update handler
  const handleUpdateStatus = async (orderId: string, orderNumber: string, newStatus: string, markPaid = false) => {
    try {
      const token = getCsrfToken();
      const res = await fetch(`/api/v1/delivery/orders/${orderId}/status`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({ status: newStatus, mark_paid: markPaid }),
      });
      if (!res.ok) {
        showToast(`Could not update status to ${newStatus}`, "error");
        return;
      }
      showToast(`Order ${orderNumber} updated to ${newStatus.replace(/_/g, " ")}.`, "ok");
      await fetchOrders(false);
    } catch {
      showToast("Network error updating order status.", "error");
    }
  };

  // QR Pickup Scan handler
  const handleScanPickupQr = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pickupQrCode.trim()) return;

    try {
      setQrLoading(true);
      const token = getCsrfToken();
      const res = await fetch("/api/v1/orders/scan-pickup", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({ pickup_qr: pickupQrCode.trim(), auto_print: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Invalid or unverified pickup QR code.", "error");
        return;
      }
      showToast("Order verified and marked as picked up! Auto-printing receipt.", "ok");
      setQrModalOpen(false);
      setPickupQrCode("");
      if (data.receipt) {
        setScannedReceipt(data.receipt);
      }
      await fetchOrders(false);
    } catch {
      showToast("Error verifying pickup QR code.", "error");
    } finally {
      setQrLoading(false);
    }
  };

  const handleViewReceipt = (order: DeliveryOrder) => {
    setSelectedDetailReceipt({
      number: order.number,
      store: order.store_name || "Main Store",
      city: order.city || "Bangalore",
      created_at: order.created_at || new Date().toISOString(),
      order_type: `Online · ${order.fulfillment === "pickup" ? "In-Store Pickup" : "Doorstep Delivery"}`,
      lines: order.lines.map((l) => ({
        name: l.name,
        qty: l.qty,
        unit_price_paise: l.unit_price_paise,
        total_paise: l.total_paise,
        line_total_paise: l.total_paise,
      })),
      subtotal_paise: order.subtotal_paise,
      discount_paise: order.discount_paise,
      total_paise: order.total_paise,
      payment_method: order.payment_method.toUpperCase(),
    });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Live Order Alert Banner with Action Options (Pops up when a customer places an order) */}
      {newOrderAlert && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-4 text-indigo-950 shadow-md">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white animate-pulse shadow-sm">
              <Bell size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  ⚡ Live Customer Order Alert
                </span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5">
                  Incoming Live
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 mt-0.5">
                Order #{newOrderAlert.number} from {newOrderAlert.customer_name} · {formatInr(newOrderAlert.total_paise)}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Channel: <span className="capitalize font-semibold">{newOrderAlert.fulfillment === "pickup" ? "In-Store Pickup" : "Doorstep Delivery"}</span>
                {newOrderAlert.customer_phone ? ` · Phone: ${newOrderAlert.customer_phone}` : ""}
                {newOrderAlert.address ? ` · Address: ${newOrderAlert.address}` : ""}
                {newOrderAlert.order_notes ? ` · Note: "${newOrderAlert.order_notes}"` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {newOrderAlert.fulfillment === "delivery" && !newOrderAlert.delivery_staff_id && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => {
                  setAssigningOrder(newOrderAlert);
                  setSelectedStaffId(availableRiders[0]?.id || "");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
              >
                Assign Rider
              </Button>
            )}
            {newOrderAlert.live_location_url && (
              <a
                href={newOrderAlert.live_location_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold shadow-xs hover:bg-emerald-700 transition"
              >
                <Navigation size={13} />
                <span>Live Map</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => handleViewReceipt(newOrderAlert)}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
            >
              <Eye size={13} />
              <span>View Details</span>
            </button>
            <button
              type="button"
              onClick={() => setNewOrderAlert(null)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Delivery Dispatch & Live Customer Orders"
        description="Live delivery fleet operations, incoming customer notifications, GPS route navigation, and in-store pickup QR verification."
        aside={
          <div className="flex items-center gap-2.5">
            {/* Live Sync Indicator */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Sync Active</span>
            </div>

            {/* Audio chime toggle */}
            <button
              type="button"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink transition"
              title={audioEnabled ? "Order chime enabled" : "Order chime muted"}
            >
              {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setQrModalOpen(true)}
              className="inline-flex items-center gap-2 border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100"
            >
              <QrCode size={16} />
              <span>Verify Pickup QR</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void fetchOrders(false)}
              disabled={loading}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Truck}
          value={formatCount(stats.total)}
          label="Total Orders"
          action="All online store orders"
          badgeBg="#eff6ff"
          iconColor="#2563eb"
        />
        <KpiCard
          icon={Clock}
          value={formatCount(stats.pending)}
          label="Pending Dispatch"
          action="Awaiting rider assignment"
          badgeBg="#fef3c7"
          iconColor="#d97706"
        />
        <KpiCard
          icon={Navigation}
          value={formatCount(stats.active)}
          label="Out for Delivery"
          action="Active on-road riders"
          badgeBg="#e0e7ff"
          iconColor="#4f46e5"
        />
        <KpiCard
          icon={CheckCircle2}
          value={formatInr(stats.codTotal)}
          label="Pending COD Cash"
          action="Cash to collect on delivery"
          badgeBg="#dcfce7"
          iconColor="#16a34a"
        />
      </section>

      {/* Toolbar & Filter Tabs */}
      <section className="rounded-[16px] border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex shrink-0 items-center rounded-[10px] border border-line bg-bg p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                activeTab === "all" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                activeTab === "pending" ? "bg-amber-500 text-white shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              Pending ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                activeTab === "active" ? "bg-indigo-600 text-white shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              Out for Delivery ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("delivered")}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                activeTab === "delivered" ? "bg-emerald-600 text-white shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              Delivered ({stats.delivered})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("failed")}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                activeTab === "failed" ? "bg-rose-600 text-white shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              Failed
            </button>
          </div>

          {/* Fulfillment Toggle: All, Delivery, Pickup */}
          <div className="inline-flex shrink-0 items-center rounded-[10px] border border-line bg-bg p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setFulfillmentFilter("all")}
              className={`rounded-[8px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                fulfillmentFilter === "all" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              All Channels
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentFilter("delivery")}
              className={`rounded-[8px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                fulfillmentFilter === "delivery" ? "bg-indigo-600 text-white shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              Delivery Orders
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentFilter("pickup")}
              className={`rounded-[8px] px-2.5 py-1 text-[11.5px] font-semibold transition ${
                fulfillmentFilter === "pickup" ? "bg-orange-600 text-white shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              In-Store Pickup
            </button>
          </div>

          {/* Search & Rider Filter */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order #, customer, phone..."
                className="w-full rounded-[10px] border border-line bg-bg pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-indigo-500 focus:outline-none"
              />
            </div>
            {availableRiders.length > 0 && (
              <select
                value={selectedRiderFilter}
                onChange={(e) => setSelectedRiderFilter(e.target.value)}
                aria-label="Filter deliveries by assigned rider"
                className="rounded-[10px] border border-line bg-bg px-2.5 py-1.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Riders</option>
                {availableRiders.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-[16px] border border-line bg-surface text-sm text-muted">
          <RefreshCw size={18} className="animate-spin mr-2" />
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-line bg-surface p-12 text-center">
          <div className="rounded-full bg-slate-100 p-3 text-slate-400 mb-3">
            <Truck size={28} />
          </div>
          <h3 className="text-sm font-semibold text-ink">No orders found</h3>
          <p className="mt-1 text-xs text-muted max-w-sm">
            {search ? "No orders match your search criteria." : "There are currently no active orders in this view. As customers place orders online, they will appear here in real-time."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const isCod = order.payment_method === "cod";
            const isDelivered = order.delivery_status === "delivered";
            const isOut = order.delivery_status === "out_for_delivery";
            const isAssigned = !!order.delivery_staff_id;
            const isPickup = order.fulfillment === "pickup";

            return (
              <div
                key={order.id}
                className="flex flex-col justify-between rounded-[16px] border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] hover:shadow-md transition"
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink">{order.number}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${
                            isDelivered
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isOut
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse"
                              : isAssigned
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : isPickup
                              ? "bg-orange-50 text-orange-700 border border-orange-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isPickup ? "In-Store Pickup" : order.delivery_status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted">
                        {order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently placed"}
                        {order.store_name ? ` · ${order.store_name}` : ""}
                      </span>
                    </div>

                    {/* Amount, View button & Payment mode */}
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-sm font-semibold text-ink">{formatInr(order.total_paise)}</span>
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(order)}
                          title="View Order Details"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition shadow-2xs cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          isCod ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isCod ? "Cash on Delivery" : isPickup ? "Pay at store" : "Prepaid"}
                      </span>
                    </div>
                  </div>

                  {/* Customer details */}
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">{order.customer_name}</span>
                      {order.customer_phone && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            <Phone size={11} /> Call
                          </a>
                          <a
                            href={`https://wa.me/91${order.customer_phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Address & GPS */}
                    {!isPickup ? (
                      <div className="rounded-[10px] bg-bg p-2.5 text-xs text-muted space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <MapPin size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                          <span className="text-slate-700 font-medium leading-relaxed">
                            {order.address}
                            {order.landmark ? ` (Near ${order.landmark})` : ""}
                            {order.pincode ? ` - ${order.pincode}` : ""}
                          </span>
                        </div>

                        {/* 1-Click Live Location button & Live Map Modal */}
                        {order.live_location_url || (order.latitude && order.longitude) ? (
                          <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/60">
                            <span className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                              <Navigation size={12} />
                              GPS: {order.latitude?.toFixed(4)}, {order.longitude?.toFixed(4)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setNavModalOrder(order)}
                                className="inline-flex items-center gap-1 rounded bg-indigo-50 border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                              >
                                <Navigation size={11} />
                                <span>Live Map</span>
                              </button>
                              <a
                                href={order.live_location_url || `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}&travelmode=driving`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 shadow-xs transition"
                              >
                                <span>Google Maps</span>
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-600">No live GPS pinned. Using text address.</div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-[10px] bg-orange-50/60 border border-orange-200/80 p-2.5 text-xs text-orange-950 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <QrCode size={15} className="text-orange-600" />
                          <span className="font-medium">In-Store Pickup Order</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQrModalOpen(true)}
                          className="text-[11px] font-semibold text-orange-700 underline"
                        >
                          Verify QR
                        </button>
                      </div>
                    )}

                    {/* Order items snapshot */}
                    <div className="border-t border-line/70 pt-2 text-[11.5px] text-muted">
                      <div className="font-semibold text-ink mb-1">Items ({order.lines.length}):</div>
                      <div className="space-y-0.5">
                        {order.lines.map((l, i) => (
                          <div key={i} className="flex justify-between text-slate-600">
                            <span>
                              {l.qty}x {l.name}
                            </span>
                            <span className="font-medium">{formatInr(l.total_paise)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.order_notes && (
                      <div className="rounded bg-amber-50/80 p-1.5 text-[11px] text-amber-800">
                        <span className="font-semibold">Note:</span> {order.order_notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rider info & Actions footer */}
                <div className="mt-4 border-t border-line pt-3 space-y-2.5">
                  {!isPickup ? (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Assigned Rider:</span>
                        {order.delivery_staff_name ? (
                          <span className="font-semibold text-ink flex items-center gap-1">
                            <UserCheck size={13} className="text-emerald-600" />
                            {order.delivery_staff_name}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningOrder(order);
                              setSelectedStaffId(availableRiders[0]?.id || "");
                            }}
                            className="text-xs font-semibold text-indigo-600 hover:underline"
                          >
                            + Assign Rider
                          </button>
                        )}
                      </div>

                      {/* Cash to collect reminder */}
                      {isCod && !isDelivered && (
                        <div className="rounded-[8px] bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs flex items-center justify-between text-amber-900">
                          <span className="font-medium">Collect Cash on Delivery:</span>
                          <span className="font-semibold text-sm">{formatInr(order.total_paise)}</span>
                        </div>
                      )}

                      {/* Status transition buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {!isAssigned && !isDelivered && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setAssigningOrder(order);
                              setSelectedStaffId(availableRiders[0]?.id || "");
                            }}
                            className="w-full text-xs font-semibold"
                          >
                            Assign Rider
                          </Button>
                        )}

                        {isAssigned && !isOut && !isDelivered && (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            onClick={() => handleUpdateStatus(order.id, order.number, "out_for_delivery")}
                            className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
                          >
                            Start Delivery
                          </Button>
                        )}

                        {isOut && (
                          <div className="flex gap-2 w-full">
                            <Button
                              type="button"
                              size="sm"
                              variant="primary"
                              onClick={() => handleUpdateStatus(order.id, order.number, "delivered", isCod)}
                              className="flex-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Check size={14} className="mr-1" />
                              Mark Delivered {isCod ? "(Paid)" : ""}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => handleUpdateStatus(order.id, order.number, "failed")}
                              className="text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50"
                            >
                              Failed
                            </Button>
                          </div>
                        )}

                        {isDelivered && (
                          <div className="w-full text-center py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 size={13} />
                            Successfully Delivered
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* In-Store Pickup quick action */
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPickupQrCode(order.number);
                          setQrModalOpen(true);
                        }}
                        className="w-full text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100"
                      >
                        <QrCode size={13} className="mr-1.5" />
                        Verify &amp; Print Receipt
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rider Assignment Modal */}
      {assigningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-line bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">Assign Delivery Rider</h3>
                <p className="text-xs text-muted">Order: {assigningOrder.number}</p>
              </div>
              <button
                type="button"
                onClick={() => setAssigningOrder(null)}
                className="rounded-lg p-1 text-muted hover:bg-bg hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Select Delivery Staff</label>
                {availableRiders.length > 0 ? (
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full rounded-[10px] border border-line bg-bg px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                  >
                    {availableRiders.map((rider) => (
                      <option key={rider.id} value={rider.id}>
                        {rider.display_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-[8px] bg-amber-50 p-3 text-xs text-amber-800">
                    No active staff members found. Add staff with Delivery permissions in Team &gt; Staff.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setAssigningOrder(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!selectedStaffId || submitting}
                  onClick={handleAssignRider}
                >
                  {submitting ? "Assigning..." : "Confirm Rider"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-Store Pickup QR Scan Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-line bg-surface p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                  <QrCode size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">In-Store Pickup QR Verification</h3>
                  <p className="text-xs text-muted">Scan or enter customer order pickup code</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-bg hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleScanPickupQr} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Pickup QR Code</label>
                <input
                  type="text"
                  autoFocus
                  value={pickupQrCode}
                  onChange={(e) => setPickupQrCode(e.target.value)}
                  placeholder="e.g. SELFX-ORD-ABC123XY"
                  className="w-full rounded-[10px] border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-indigo-500 focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-muted">
                  When a customer shows their in-store pickup QR on their mobile screen, scan with 2D barcode scanner or type code above. Receipt prints automatically upon verification.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setQrModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!pickupQrCode.trim() || qrLoading}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {qrLoading ? "Verifying..." : "Verify & Auto-Print"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-printed Receipt Modal preview if verified */}
      <ReceiptModal
        isOpen={Boolean(scannedReceipt)}
        onClose={() => setScannedReceipt(null)}
        data={scannedReceipt}
        orderType="Online · In-Store Pickup"
      />

      {/* Customer Order Detail Slip Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedDetailReceipt)}
        onClose={() => setSelectedDetailReceipt(null)}
        data={selectedDetailReceipt}
        orderType={selectedDetailReceipt?.order_type || "Online Order"}
      />

      {/* Live Navigation & Map Modal for Delivery Person */}
      <DeliveryOrderMapModal
        isOpen={Boolean(navModalOrder)}
        onClose={() => setNavModalOrder(null)}
        order={navModalOrder}
        googleMapsApiKey={googleMapsApiKey}
        onStatusTransition={async (orderId, toStatus) => {
          await handleUpdateStatus(orderId, navModalOrder?.number || orderId, toStatus);
          setNavModalOrder((prev) =>
            prev && prev.id === orderId
              ? { ...prev, delivery_status: toStatus, status: toStatus }
              : prev,
          );
        }}
      />
    </div>
  );
}
