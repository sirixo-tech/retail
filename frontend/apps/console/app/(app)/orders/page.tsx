"use client";

import { Button, KpiCard, PageHeader } from "@selfx/ui";
import { formatCount, formatInr } from "@selfx/types";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  MapPin,
  Monitor,
  Navigation,
  Package,
  Phone,
  Printer,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReceiptData, ReceiptModal } from "../../../components/receipt-modal";
import { ToastContainer, useToast } from "../../../components/pos-toast";

type OrderRow = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  store_name?: string;
  total_paise: number;
  subtotal_paise?: number;
  discount_paise?: number;
  delivery_fee_paise?: number;
  cgst_paise?: number;
  sgst_paise?: number;
  paid_paise?: number;
  due_paise?: number;
  payment_method?: string;
  payment_status?: string;
  items_count?: number;
  lines_summary?: string;
  sale_id?: string | null;
  channel?: "counter" | "online" | string;
  created_at?: string;
  pickup_qr?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  live_location_url?: string | null;
  address?: string | null;
  city?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  order_notes?: string | null;
  lines?: {
    name: string;
    qty: number;
    unit_price_paise: number;
    total_paise: number;
  }[];
};

type Pick = { id: string; number: string; customer_name: string; lines: { name: string; qty: number }[] };

const nextStatus: Record<string, string[]> = {
  placed: ["accepted", "rejected"],
  accepted: ["packing", "cancelled"],
  packing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "ready_for_pickup", "cancelled"],
  out_for_delivery: ["delivered"],
  ready_for_pickup: ["picked_up"],
};

function statusBadgeStyle(status: string) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "delivered" || s === "picked_up") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s === "placed" || s === "accepted" || s === "packing" || s === "ready" || s === "out_for_delivery" || s === "ready_for_pickup") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
  if (s === "cancelled" || s === "rejected" || s === "voided") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState(false);
  const [timeline, setTimeline] = useState<{ orderNumber: string; events: string[] } | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("Main Store");
  const [pincode, setPincode] = useState("");
  const [charge, setCharge] = useState("25");
  const [showZoneConfig, setShowZoneConfig] = useState(false);

  // Filters
  const [channelTab, setChannelTab] = useState<"all" | "counter" | "online">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Receipt modal
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [selectedOrderMeta, setSelectedOrderMeta] = useState<OrderRow | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<OrderRow | null>(null);
  const { toasts, showToast, dismissToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/orders", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (response.status === 403) {
        const body = (await response.json()) as { error?: { code?: string } };
        if (body.error?.code === "auth.password_change_required") {
          window.location.reload();
          return;
        }
        window.location.href = "/login";
        return;
      }
      if (response.ok) {
        setOrders(((await response.json()) as { data: OrderRow[] }).data);
      }
      const [picksResponse, me] = await Promise.all([
        fetch("/api/v1/pick-list", { credentials: "include", headers: { Accept: "application/json" } }),
        fetch("/api/v1/auth/staff/me", { credentials: "include", headers: { Accept: "application/json" } }),
      ]);
      if (picksResponse.ok) {
        setPicks(((await picksResponse.json()) as { data: Pick[] }).data);
      }
      if (me.ok) {
        const body = (await me.json()) as { data?: { store?: { id: string; name?: string } } };
        setStoreId(body.data?.store?.id ?? null);
        if (body.data?.store?.name) setStoreName(body.data.store.name);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveZone() {
    if (!storeId || !pincode.trim()) return;
    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );
    const res = await fetch(`/api/v1/stores/${storeId}/delivery-zones`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token },
      body: JSON.stringify({ pincode: pincode.trim(), charge_paise: Math.round(Number(charge) * 100) }),
    });
    if (res.ok) {
      setNoticeError(false);
      setNotice(`Delivery zone ${pincode.trim()} saved (₹${charge} delivery fee).`);
      setPincode("");
    }
  }

  async function move(id: string, to: string) {
    const otp = to === "delivered" ? window.prompt("Enter customer delivery OTP code") ?? "" : undefined;
    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );
    const response = await fetch(`/api/v1/orders/${id}/transitions`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token },
      body: JSON.stringify({ to, otp }),
    });
    const body = (await response.json()) as {
      data?: { delivery_otp?: string; number?: string; sale_id?: string | null };
      error?: { message?: string };
    };
    if (!response.ok) {
      setNoticeError(true);
      setNotice(body.error?.message ?? "That status change was not saved.");
      return;
    }
    setNoticeError(false);
    if (body.data?.sale_id) {
      setNotice(`Invoice generated for ${body.data.number ?? "this order"}.`);
    } else if (body.data?.delivery_otp) {
      setNotice(`Delivery OTP for ${body.data.number ?? "the order"}: ${body.data.delivery_otp}`);
    } else {
      setNotice(`Order updated to "${to.replaceAll("_", " ")}".`);
    }
    await load();
  }

  async function openTimeline(order: OrderRow) {
    const response = await fetch(`/api/v1/orders/${order.id}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const body = (await response.json()) as { data: { timeline: { to_status: string }[] } };
    setTimeline({
      orderNumber: order.number,
      events: body.data.timeline.map((event) => event.to_status),
    });
  }

  async function openReceipt(order: OrderRow) {
    const saleId = order.channel === "counter" ? order.id : order.sale_id;
    if (!saleId) return;
    setSelectedOrderMeta(order);
    setReceiptModalOpen(true);
    setLoadingReceipt(true);
    try {
      const response = await fetch(`/api/v1/sales/${saleId}/receipt`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        const body = (await response.json()) as { data: ReceiptData };
        setSelectedReceipt({
          ...body.data,
          order_type: order.channel === "counter" ? "Dine in" : `Online · ${order.fulfillment || "Delivery"}`,
        });
      }
    } finally {
      setLoadingReceipt(false);
    }
  }

  const stats = useMemo(() => {
    const posOrders = orders.filter((o) => o.channel === "counter");
    const onlineOrders = orders.filter((o) => o.channel !== "counter");
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_paise || 0), 0);
    return {
      totalCount: orders.length,
      posCount: posOrders.length,
      onlineCount: onlineOrders.length,
      totalRevenue,
    };
  }, [orders]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (channelTab !== "all") count++;
    if (statusFilter !== "all") count++;
    if (datePreset !== "all") count++;
    if (paymentMethodFilter !== "all") count++;
    if (paymentStatusFilter !== "all") count++;
    if (searchQuery.trim()) count++;
    if (sortBy !== "newest") count++;
    return count;
  }, [channelTab, statusFilter, datePreset, paymentMethodFilter, paymentStatusFilter, searchQuery, sortBy]);

  function resetAllFilters() {
    setChannelTab("all");
    setStatusFilter("all");
    setDatePreset("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setPaymentMethodFilter("all");
    setPaymentStatusFilter("all");
    setSearchQuery("");
    setSortBy("newest");
  }

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const list = orders.filter((o) => {
      const isPos = o.channel === "counter";
      if (channelTab === "counter" && !isPos) return false;
      if (channelTab === "online" && isPos) return false;
      if (statusFilter !== "all" && o.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      // Date filtering
      if (datePreset !== "all") {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        if (datePreset === "today" && d < startOfToday) return false;
        if (datePreset === "yesterday" && (d < startOfYesterday || d > endOfYesterday)) return false;
        if (datePreset === "last7" && d < sevenDaysAgo) return false;
        if (datePreset === "last30" && d < thirtyDaysAgo) return false;
        if (datePreset === "thisMonth" && d < startOfMonth) return false;
        if (datePreset === "custom") {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            if (d < start) return false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
        }
      }

      // Payment method filtering
      if (paymentMethodFilter !== "all") {
        const method = (o.payment_method ?? "").toLowerCase();
        if (paymentMethodFilter === "cash" && !method.includes("cash")) return false;
        if (paymentMethodFilter === "upi" && !method.includes("upi")) return false;
        if (paymentMethodFilter === "card" && !method.includes("card")) return false;
        if (paymentMethodFilter === "khata" && !method.includes("khata")) return false;
      }

      // Payment status filtering
      if (paymentStatusFilter !== "all") {
        const paid = o.paid_paise ?? o.total_paise;
        const due = o.due_paise ?? Math.max(0, o.total_paise - paid);
        const isPaid = due === 0;
        if (paymentStatusFilter === "paid" && !isPaid) return false;
        if (paymentStatusFilter === "due" && isPaid) return false;
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = o.number.toLowerCase().includes(q);
        const matchCustomer = o.customer_name.toLowerCase().includes(q);
        const matchPhone = (o.customer_phone ?? "").toLowerCase().includes(q);
        const matchLines = (o.lines_summary ?? "").toLowerCase().includes(q);
        const matchMethod = (o.payment_method ?? "").toLowerCase().includes(q);
        if (!matchNumber && !matchCustomer && !matchPhone && !matchLines && !matchMethod) return false;
      }

      return true;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === "oldest") {
        return (new Date(a.created_at ?? 0).getTime()) - (new Date(b.created_at ?? 0).getTime());
      }
      if (sortBy === "amount_desc") {
        return (b.total_paise || 0) - (a.total_paise || 0);
      }
      if (sortBy === "amount_asc") {
        return (a.total_paise || 0) - (b.total_paise || 0);
      }
      // default: newest
      return (new Date(b.created_at ?? 0).getTime()) - (new Date(a.created_at ?? 0).getTime());
    });
  }, [orders, channelTab, statusFilter, datePreset, customStartDate, customEndDate, paymentMethodFilter, paymentStatusFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Orders & POS Bills"
        description="Unified command center for both POS counter sales and online customer orders."
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowZoneConfig((prev) => !prev)}
            >
              <Truck size={15} className="mr-1.5" />
              Delivery Zones
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
              <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link
              href="/pos"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <Monitor size={15} />
              New POS Sale
            </Link>
          </div>
        }
      />

      {/* Summary KPIs - Same UI as Tenant Dashboard */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={ShoppingBag}
          value={formatCount(stats.totalCount)}
          label="All Orders"
          action="POS + Online combined"
          badgeBg="#ede9fe"
          iconColor="#7c3aed"
        />
        <KpiCard
          icon={Monitor}
          value={formatCount(stats.posCount)}
          label="POS Counter Orders"
          action="Instant counter bills"
          badgeBg="#e0e7ff"
          iconColor="#4338ca"
        />
        <KpiCard
          icon={Globe}
          value={formatCount(stats.onlineCount)}
          label="Online Store Orders"
          action="Delivery & pickup"
          badgeBg="#dcfce7"
          iconColor="#16a34a"
        />
        <KpiCard
          icon={CreditCard}
          value={formatInr(stats.totalRevenue)}
          label="Total Order Value"
          action="Gross billed amount"
          badgeBg="#fef3c7"
          iconColor="#d97706"
        />
      </section>

      {/* Delivery Zone Config Drawer */}
      {showZoneConfig ? (
        <section className="rounded-[14px] border border-line bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Online Store Delivery Zone Setup</h3>
              <p className="text-[12px] text-muted">Configure serviceable PIN codes and delivery fees for online orders.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowZoneConfig(false)}
              className="rounded-lg p-1 text-muted hover:bg-bg hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void saveZone();
            }}
          >
            <label className="text-[12px] font-semibold text-ink">
              Delivery PIN Code
              <input
                value={pincode}
                onChange={(event) => setPincode(event.target.value)}
                placeholder="e.g. 560001"
                className="mt-1 block h-10 w-40 rounded-[8px] border border-line bg-bg px-3 text-sm"
              />
            </label>
            <label className="text-[12px] font-semibold text-ink">
              Delivery Charge (₹)
              <input
                value={charge}
                onChange={(event) => setCharge(event.target.value)}
                className="num mt-1 block h-10 w-32 rounded-[8px] border border-line bg-bg px-3 text-sm"
              />
            </label>
            <Button type="submit" variant="primary">
              Save Delivery Zone
            </Button>
          </form>
        </section>
      ) : null}

      {/* Active Online Pick List */}
      {picks.length > 0 ? (
        <section className="rounded-[14px] border border-indigo-200 bg-indigo-50/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-indigo-900">
            <Package size={16} className="text-indigo-600" />
            Active Packing & Pick List ({picks.length})
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((pick) => (
              <div key={pick.id} className="rounded-[10px] border border-indigo-100 bg-white p-3 text-sm shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="num font-semibold text-indigo-700">{pick.number}</span>
                  <span className="text-[12px] font-medium text-muted">{pick.customer_name}</span>
                </div>
                <p className="mt-1 text-[12px] text-slate-600">
                  {pick.lines.map((line) => `${line.qty}× ${line.name}`).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {notice ? (
        <div
          className={`flex items-center justify-between rounded-[10px] border px-4 py-3 text-sm ${
            noticeError
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      {timeline ? (
        <div className="flex items-center justify-between rounded-[10px] border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-950">
          <div>
            <span className="font-semibold">Timeline for {timeline.orderNumber}: </span>
            <span>{timeline.events.join(" → ")}</span>
          </div>
          <button type="button" onClick={() => setTimeline(null)} className="text-xs font-semibold text-indigo-700">
            Close
          </button>
        </div>
      ) : null}

      {/* Channel Tabs & Filters Bar */}
      <section className="rounded-[16px] border border-line bg-surface p-4 sm:p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
        <div className="mb-4 space-y-3 border-b border-line pb-4">
          {/* Unified Single-Row Toolbar */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5">
            {/* Channel Filter Pills */}
            <div className="inline-flex shrink-0 items-center rounded-[10px] border border-line bg-bg p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setChannelTab("all")}
                className={`inline-flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  channelTab === "all" ? "bg-surface text-ink shadow-xs" : "text-muted hover:text-ink"
                }`}
              >
                All Orders
                <span className="num rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {stats.totalCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChannelTab("counter")}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  channelTab === "counter" ? "bg-indigo-600 text-white shadow-xs" : "text-muted hover:text-ink"
                }`}
              >
                <Monitor size={14} />
                POS Orders
                <span
                  className={`num rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    channelTab === "counter" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"
                  }`}
                >
                  {stats.posCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setChannelTab("online")}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  channelTab === "online" ? "bg-emerald-600 text-white shadow-xs" : "text-muted hover:text-ink"
                }`}
              >
                <Globe size={14} />
                Online Orders
                <span
                  className={`num rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    channelTab === "online" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {stats.onlineCount}
                </span>
              </button>
            </div>

            {/* Search Input - expands to fill space stably */}
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice, customer, items..."
                className="h-9 w-full rounded-[8px] border border-line bg-bg pl-9 pr-3 text-[12.5px] font-medium text-ink placeholder:text-muted focus:border-accent focus:bg-surface focus:outline-none transition-colors"
              />
            </div>

            {/* Date Preset */}
            <div className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-line bg-bg px-2.5 h-9 transition-colors hover:border-slate-300">
              <Calendar size={13} className="text-muted shrink-0" />
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as typeof datePreset)}
                className="bg-transparent text-[12.5px] font-semibold text-ink focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range...</option>
              </select>
            </div>

            {/* Status Select */}
            <div className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-line bg-bg px-2.5 h-9 transition-colors hover:border-slate-300">
              <Filter size={13} className="text-muted shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[12.5px] font-semibold text-ink focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed (POS)</option>
                <option value="placed">Placed (Online)</option>
                <option value="accepted">Accepted</option>
                <option value="packing">Packing</option>
                <option value="ready">Ready</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="picked_up">Picked Up</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* More Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border px-3 h-9 text-[12.5px] font-semibold transition cursor-pointer ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-bg text-muted hover:text-ink hover:border-line-strong"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
              {activeFiltersCount > 0 ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-accent text-[10px] text-white font-semibold">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
          </div>

          {/* Advanced Filters Expandable Drawer */}
          {(showAdvancedFilters || datePreset === "custom") ? (
            <div className="rounded-xl border border-line/70 bg-bg/60 p-3.5 space-y-3 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Custom Date Pickers */}
                {datePreset === "custom" ? (
                  <div className="col-span-1 sm:col-span-2 flex items-center gap-2">
                    <label className="flex-1 space-y-1">
                      <span className="text-[11px] font-semibold text-muted">From Date</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex-1 space-y-1">
                      <span className="text-[11px] font-semibold text-muted">To Date</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none focus:border-accent"
                      />
                    </label>
                  </div>
                ) : null}

                {/* Payment Method */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted">Payment Method</span>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="h-8 w-full rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none focus:border-accent"
                  >
                    <option value="all">All Payment Methods</option>
                    <option value="cash">Cash Only</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="card">Card (POS Terminal)</option>
                    <option value="khata">Customer Khata (Credit)</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted">Payment Status</span>
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="h-8 w-full rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink outline-none focus:border-accent"
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="paid">Paid Full</option>
                    <option value="due">Payment Due / Partial</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-muted">Sort By</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 h-8">
                    <ArrowUpDown size={12} className="text-muted" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="w-full bg-transparent text-xs font-semibold text-ink outline-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="amount_desc">Amount: High to Low</option>
                      <option value="amount_asc">Amount: Low to High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reset All Action */}
              <div className="flex items-center justify-between border-t border-line/60 pt-2.5">
                <span className="text-[11px] text-muted">
                  Showing <span className="font-semibold text-ink">{filteredOrders.length}</span> of {orders.length} orders
                </span>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                >
                  <RotateCcw size={12} />
                  Reset all filters
                </button>
              </div>
            </div>
          ) : null}

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && !showAdvancedFilters ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-muted font-medium mr-1">Active filters:</span>
              {channelTab !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-semibold text-accent border border-accent/20">
                  Channel: {channelTab === "counter" ? "POS Counter" : "Online Store"}
                  <button onClick={() => setChannelTab("all")}><X size={11} /></button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-semibold text-accent border border-accent/20">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("all")}><X size={11} /></button>
                </span>
              )}
              {datePreset !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-semibold text-accent border border-accent/20">
                  Date: {datePreset}
                  <button onClick={() => setDatePreset("all")}><X size={11} /></button>
                </span>
              )}
              {paymentMethodFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-semibold text-accent border border-accent/20">
                  Payment: {paymentMethodFilter}
                  <button onClick={() => setPaymentMethodFilter("all")}><X size={11} /></button>
                </span>
              )}
              {paymentStatusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-semibold text-accent border border-accent/20">
                  Status: {paymentStatusFilter}
                  <button onClick={() => setPaymentStatusFilter("all")}><X size={11} /></button>
                </span>
              )}
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-semibold text-accent border border-accent/20">
                  Query: &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery("")}><X size={11} /></button>
                </span>
              )}
              {sortBy !== "newest" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-semibold text-accent border border-accent/20">
                  Sort: {sortBy}
                  <button onClick={() => setSortBy("newest")}><X size={11} /></button>
                </span>
              )}
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-[11px] font-semibold text-muted hover:text-ink underline ml-1"
              >
                Clear all
              </button>
              <span className="text-muted ml-auto text-[11px]">
                Showing {filteredOrders.length} of {orders.length}
              </span>
            </div>
          ) : null}
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">Order / Invoice #</th>
                <th className="py-3 pr-4">Channel</th>
                <th className="py-3 pr-4">Customer & Store</th>
                <th className="py-3 pr-4">Items Summary</th>
                <th className="py-3 pr-4">Payment</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Total</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredOrders.map((order) => {
                const isPos = order.channel === "counter";
                const paid = order.paid_paise ?? order.total_paise;
                const due = order.due_paise ?? Math.max(0, order.total_paise - paid);
                const payStatus = order.payment_status ?? (due > 0 ? "due" : "paid");
                const hasReceipt = isPos || Boolean(order.sale_id);

                return (
                  <tr key={`${order.channel ?? "ord"}-${order.id}`} className="transition hover:bg-slate-50/80">
                    {/* Reference */}
                    <td className="py-3.5 pr-4 align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailOrder(order)}
                        className="num font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {order.number}
                      </button>
                      {order.created_at ? (
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                          <Clock size={11} />
                          {new Date(order.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : null}
                    </td>

                    {/* Channel Badge */}
                    <td className="py-3.5 pr-4 align-top">
                      {isPos ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                          <Monitor size={12} />
                          POS Counter
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-emerald-700">
                          <Globe size={12} />
                          Online · {order.fulfillment}
                        </span>
                      )}
                    </td>

                    {/* Customer & Store */}
                    <td className="py-3.5 pr-4 align-top">
                      <p className="font-semibold text-ink">{order.customer_name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                        <Store size={11} />
                        <span>{order.store_name ?? storeName}</span>
                        {order.customer_phone ? <span>· {order.customer_phone}</span> : null}
                      </p>
                    </td>

                    {/* Items Summary */}
                    <td className="max-w-[240px] py-3.5 pr-4 align-top">
                      {order.lines_summary ? (
                        <p className="truncate font-medium text-ink" title={order.lines_summary}>
                          {order.lines_summary}
                        </p>
                      ) : (
                        <p className="text-muted">{isPos ? "POS Counter Sale" : "Online Order Items"}</p>
                      )}
                      {order.items_count !== undefined ? (
                        <span className="text-[11px] text-muted">
                          {order.items_count} {order.items_count === 1 ? "line item" : "line items"}
                        </span>
                      ) : null}
                    </td>

                    {/* Payment */}
                    <td className="py-3.5 pr-4 align-top">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            payStatus === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {payStatus}
                        </span>
                        <span className="text-[12px] font-medium capitalize text-ink">
                          {(order.payment_method ?? (isPos ? "cash" : "online")).replaceAll("_", " ")}
                        </span>
                      </div>
                      {due > 0 ? (
                        <span className="num mt-0.5 block text-[11px] font-medium text-rose-600">
                          Due: {formatInr(due)}
                        </span>
                      ) : null}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 pr-4 align-top">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeStyle(
                          order.status,
                        )}`}
                      >
                        <CheckCircle2 size={11} />
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="num py-3.5 pr-4 text-right align-top text-[14px] font-semibold text-ink">
                      {formatInr(order.total_paise)}
                    </td>

                    {/* Actions - Coloured Icons Only (No text, No accept/reject for online orders) */}
                    <td className="py-3.5 text-right align-top">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Coloured View Order Detail Icon */}
                        <button
                          type="button"
                          onClick={() => setSelectedDetailOrder(order)}
                          title="View Order Detail"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition shadow-2xs cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Coloured Receipt / Print Icon */}
                        {hasReceipt ? (
                          <button
                            type="button"
                            onClick={() => void openReceipt(order)}
                            title="Print Receipt"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white transition shadow-2xs cursor-pointer"
                          >
                            <Printer size={15} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-muted">
                    No matching orders found. Complete a sale on the POS screen or adjust your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top-Right Notification Toasts matching Image 3 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* POS / Order Receipt Modal matching Image 3 */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => {
          setReceiptModalOpen(false);
          setSelectedReceipt(null);
          setSelectedOrderMeta(null);
        }}
        data={selectedReceipt}
        loading={loadingReceipt}
        orderType={
          selectedOrderMeta?.channel === "counter"
            ? "Dine in"
            : `Online · ${selectedOrderMeta?.fulfillment || "Delivery"}`
        }
      />

      {/* Comprehensive Order / Sale Detail Modal matching Image 1 */}
      {selectedDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Top Bar: Breadcrumb + Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <nav className="flex items-center gap-1.5 text-xs text-muted mb-1">
                  <span>{selectedDetailOrder.channel === "counter" ? "Sales" : "Orders"}</span>
                  <span>/</span>
                  <span className="font-semibold text-ink">
                    {selectedDetailOrder.channel === "counter" ? "Sale Detail" : "Order Detail"}
                  </span>
                </nav>
                <h2 className="text-xl font-semibold text-ink">
                  {selectedDetailOrder.channel === "counter" ? "Sale Detail" : "Order Detail"}
                </h2>
              </div>

              {/* Action buttons matching Image 1: < Back, Print, Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetailOrder(null)}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const orderToPrint = selectedDetailOrder;
                    void openReceipt(orderToPrint);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDetailOrder(null)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-line bg-surface text-muted hover:text-ink hover:bg-slate-50 cursor-pointer"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Main Content Box matching Image 1 */}
            <div className="rounded-2xl border border-line/80 bg-white p-6 space-y-6 shadow-2xs">
              {/* Emblem & Top Metadata Row */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left Emblem Icon matching Image 1 */}
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-semibold text-lg shadow-sm">
                  <Package size={22} />
                </div>

                {/* Right Meta Badges matching Image 1 */}
                <div className="text-right space-y-1.5">
                  <div className="flex justify-end">
                    <span className="inline-block rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-2xs">
                      {selectedDetailOrder.number}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs text-muted">
                    <span className="font-medium text-slate-500">Date</span>
                    <span className="font-semibold text-ink">
                      {selectedDetailOrder.created_at
                        ? new Date(selectedDetailOrder.created_at).toLocaleString("en-IN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="font-medium text-slate-500">Status</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeStyle(
                        selectedDetailOrder.status,
                      )}`}
                    >
                      {selectedDetailOrder.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="font-medium text-slate-500">Payment Status</span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                        (selectedDetailOrder.payment_status ?? "paid") === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {(selectedDetailOrder.payment_status ?? "paid").replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Side-by-side 2 Boxes: CUSTOMER and COMPANY (matching Image 1) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CUSTOMER Box */}
                <div className="rounded-xl border border-line bg-slate-50/50 p-4 space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    CUSTOMER
                  </span>
                  <h4 className="text-sm font-semibold text-ink">
                    {selectedDetailOrder.customer_name}
                  </h4>
                  {selectedDetailOrder.customer_phone ? (
                    <p className="text-xs text-muted flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" />
                      <span>Phone: {selectedDetailOrder.customer_phone}</span>
                    </p>
                  ) : null}
                  {selectedDetailOrder.channel !== "counter" && selectedDetailOrder.address ? (
                    <div className="pt-1 text-xs text-muted space-y-1">
                      <p className="flex items-start gap-1 text-slate-700">
                        <MapPin size={12} className="text-indigo-600 shrink-0 mt-0.5" />
                        <span>
                          {selectedDetailOrder.address}
                          {selectedDetailOrder.landmark ? ` (Near ${selectedDetailOrder.landmark})` : ""}
                          {selectedDetailOrder.pincode ? ` - ${selectedDetailOrder.pincode}` : ""}
                        </span>
                      </p>
                      {selectedDetailOrder.live_location_url || (selectedDetailOrder.latitude && selectedDetailOrder.longitude) ? (
                        <a
                          href={
                            selectedDetailOrder.live_location_url ||
                            `https://www.google.com/maps?q=${selectedDetailOrder.latitude},${selectedDetailOrder.longitude}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline pt-0.5"
                        >
                          <Navigation size={11} />
                          <span>Live GPS Navigation Map</span>
                          <ExternalLink size={10} />
                        </a>
                      ) : null}
                    </div>
                  ) : selectedDetailOrder.channel === "counter" ? (
                    <p className="text-xs text-muted">Walk-in Customer · POS Counter Sale</p>
                  ) : null}
                </div>

                {/* COMPANY / STORE Box */}
                <div className="rounded-xl border border-line bg-slate-50/50 p-4 space-y-1 text-xs text-muted">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1">
                    COMPANY
                  </span>
                  <h4 className="text-sm font-semibold text-ink">
                    {selectedDetailOrder.store_name || storeName}
                  </h4>
                  <p>Channel: {selectedDetailOrder.channel === "counter" ? "POS Counter Terminal" : `Online Store (${selectedDetailOrder.fulfillment})`}</p>
                  <p>Payment: {(selectedDetailOrder.payment_method ?? "cash").replaceAll("_", " ").toUpperCase()}</p>
                </div>
              </div>

              {/* Product Items Table (matching Image 1) */}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 text-center">Quantity</th>
                      <th className="py-3 px-4 text-right">Discount</th>
                      <th className="py-3 px-4 text-right">Tax %</th>
                      <th className="py-3 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {selectedDetailOrder.lines && selectedDetailOrder.lines.length > 0 ? (
                      selectedDetailOrder.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-ink">
                            {line.name}
                          </td>
                          <td className="num py-3 px-4 text-right font-medium text-slate-700">
                            {formatInr(line.unit_price_paise)}
                          </td>
                          <td className="num py-3 px-4 text-center font-medium text-slate-700">
                            {line.qty} {line.qty === 1 ? "pc" : "pcs"}
                          </td>
                          <td className="num py-3 px-4 text-right text-muted">
                            {formatInr(0)}
                          </td>
                          <td className="num py-3 px-4 text-right text-muted">
                            5.00%
                          </td>
                          <td className="num py-3 px-4 text-right font-semibold text-ink">
                            {formatInr(line.total_paise)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 px-4 font-semibold text-ink">
                          {selectedDetailOrder.lines_summary || "Order Items"}
                        </td>
                        <td className="num py-3 px-4 text-right font-medium text-slate-700">
                          {formatInr(selectedDetailOrder.subtotal_paise ?? selectedDetailOrder.total_paise)}
                        </td>
                        <td className="num py-3 px-4 text-center font-medium text-slate-700">
                          {selectedDetailOrder.items_count ?? 1}
                        </td>
                        <td className="num py-3 px-4 text-right text-muted">
                          {formatInr(selectedDetailOrder.discount_paise ?? 0)}
                        </td>
                        <td className="num py-3 px-4 text-right text-muted">
                          {formatInr((selectedDetailOrder.cgst_paise ?? 0) + (selectedDetailOrder.sgst_paise ?? 0))}
                        </td>
                        <td className="num py-3 px-4 text-right font-semibold text-ink">
                          {formatInr(selectedDetailOrder.total_paise)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom Financial Summary matching Image 1 */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pt-2">
                {/* Left side: Notes / Pickup QR */}
                <div className="flex-1 space-y-2">
                  {selectedDetailOrder.order_notes ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                      <span className="font-semibold block mb-0.5">Special Instructions / Notes:</span>
                      <p>{selectedDetailOrder.order_notes}</p>
                    </div>
                  ) : null}
                  {selectedDetailOrder.pickup_qr ? (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 text-xs text-indigo-900">
                      <span className="font-semibold block mb-0.5">Pickup Verification Code:</span>
                      <span className="font-mono font-semibold tracking-wider">{selectedDetailOrder.pickup_qr}</span>
                    </div>
                  ) : null}
                </div>

                {/* Right side: Financial breakdown matching Image 1 */}
                <div className="w-full sm:w-72 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="num font-semibold text-ink">
                      {formatInr(selectedDetailOrder.subtotal_paise ?? selectedDetailOrder.total_paise)}
                    </span>
                  </div>
                  {((selectedDetailOrder.cgst_paise ?? 0) + (selectedDetailOrder.sgst_paise ?? 0)) > 0 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Order Tax:</span>
                      <span className="num font-semibold text-ink">
                        {formatInr((selectedDetailOrder.cgst_paise ?? 0) + (selectedDetailOrder.sgst_paise ?? 0))}
                      </span>
                    </div>
                  ) : null}
                  {(selectedDetailOrder.delivery_fee_paise ?? 0) > 0 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery / Shipping:</span>
                      <span className="num font-semibold text-ink">
                        {formatInr(selectedDetailOrder.delivery_fee_paise ?? 0)}
                      </span>
                    </div>
                  ) : null}
                  {(selectedDetailOrder.discount_paise ?? 0) > 0 ? (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="num font-semibold">
                        -{formatInr(selectedDetailOrder.discount_paise ?? 0)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between border-t border-line pt-2 text-sm font-semibold text-ink">
                    <span>Total:</span>
                    <span className="num text-base font-semibold text-ink">
                      {formatInr(selectedDetailOrder.total_paise)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-700 pt-1 font-semibold">
                    <span>Paid:</span>
                    <span className="num font-semibold">
                      {formatInr(selectedDetailOrder.paid_paise ?? selectedDetailOrder.total_paise)}
                    </span>
                  </div>
                  {(selectedDetailOrder.due_paise ?? 0) > 0 ? (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Due:</span>
                      <span className="num font-semibold">
                        {formatInr(selectedDetailOrder.due_paise ?? 0)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-slate-500">
                      <span>Due:</span>
                      <span className="num font-medium">₹0.00</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
