"use client";

import { PageHeader } from "@selfx/ui";
import { formatInr } from "@selfx/types";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DeliveryNav } from "../delivery-nav";

type OrderItem = {
  id: string;
  number: string;
  customer_name?: string;
  customer_phone?: string;
  status?: string;
  fulfillment?: string;
  delivery_status?: string;
  total_paise?: number;
  payment_method?: string;
  payment_status?: string;
};

type Summary = {
  mine_only: boolean;
  assigned: number;
  on_road: number;
  delivered_today: number;
  collect_paise: number;
  orders: OrderItem[];
};

export default function DeliveryDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "on_road" | "assigned" | "cod">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadDashboard = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/v1/delivery/dashboard", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const body = (await res.json()) as { data?: Summary };
      if (body.data) setSummary(body.data);
    } catch {
      // Keep existing data on polling error
    } finally {
      setLoading(false);
      if (manual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(), 12000);
    return () => window.clearInterval(timer);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredOrders = useMemo(() => {
    const list = summary?.orders ?? [];
    return list.filter((order) => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.number.toLowerCase().includes(q) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
        (order.customer_phone && order.customer_phone.includes(q));

      if (!matchesSearch) return false;

      // Tab filter
      if (statusFilter === "on_road") {
        return order.delivery_status === "out_for_delivery" || order.status === "out_for_delivery";
      }
      if (statusFilter === "assigned") {
        return (
          order.delivery_status !== "out_for_delivery" &&
          order.status !== "out_for_delivery" &&
          !["delivered", "picked_up", "cancelled"].includes(order.status || "")
        );
      }
      if (statusFilter === "cod") {
        return (
          ["cod", "pay_at_store"].includes(order.payment_method || "") &&
          order.payment_status !== "captured"
        );
      }
      return true;
    });
  }, [summary?.orders, searchQuery, statusFilter]);

  const cards = [
    {
      label: "Assigned Active",
      value: String(summary?.assigned ?? 0),
      helper: "Ready for trip dispatch",
      icon: Package,
      tone: "indigo",
      bgGradient: "from-indigo-50/80 to-white",
      borderColor: "border-indigo-100",
      iconBg: "bg-indigo-600 text-white",
    },
    {
      label: "Out On Road",
      value: String(summary?.on_road ?? 0),
      helper: "In transit to customer",
      icon: Navigation,
      tone: "amber",
      bgGradient: "from-amber-50/80 to-white",
      borderColor: "border-amber-100",
      iconBg: "bg-amber-600 text-white",
      pulse: (summary?.on_road ?? 0) > 0,
    },
    {
      label: "Delivered Today",
      value: String(summary?.delivered_today ?? 0),
      helper: "Completed shifts today",
      icon: CheckCircle2,
      tone: "emerald",
      bgGradient: "from-emerald-50/80 to-white",
      borderColor: "border-emerald-100",
      iconBg: "bg-emerald-600 text-white",
    },
    {
      label: "COD To Collect",
      value: formatInr(summary?.collect_paise ?? 0),
      helper: "Cash to return at counter",
      icon: Wallet,
      tone: "violet",
      bgGradient: "from-violet-50/80 to-white",
      borderColor: "border-violet-100",
      iconBg: "bg-violet-600 text-white",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Top Section Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {summary?.mine_only ? "Partner Dashboard" : "Delivery Operations"}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {summary?.mine_only
              ? "Live overview of orders assigned to your shift and cash collections."
              : "Live monitoring of all out-for-delivery orders and rider dispatches across store branches."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-indigo-600" : "text-slate-400"} />
            <span>Refresh</span>
          </button>

          <Link
            href="/delivery/chat"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700"
          >
            <MessageSquare size={13} />
            <span>Customer Chat</span>
          </Link>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <DeliveryNav />

      {/* Hero KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-2xl border ${card.borderColor} bg-gradient-to-br ${card.bgGradient} p-4 sm:p-5 shadow-xs transition hover:shadow-sm`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.label}
                </span>
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} shadow-2xs ${
                    card.pulse ? "ring-4 ring-amber-200/60" : ""
                  }`}
                >
                  <Icon size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {loading ? <span className="text-slate-300">--</span> : card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
            </div>
          );
        })}
      </div>

      {/* Open Deliveries Command Hub */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        {/* Hub Header & Controls */}
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Deliveries</h2>
              <p className="text-xs text-slate-500">
                {filteredOrders.length} order{filteredOrders.length === 1 ? "" : "s"} match your current view
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, customer, phone..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-3 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Active", count: summary?.orders?.length ?? 0 },
              { id: "on_road", label: "On The Road", count: summary?.on_road ?? 0 },
              { id: "assigned", label: "Assigned & Ready", count: summary?.assigned ?? 0 },
              {
                id: "cod",
                label: "COD To Collect",
                count: (summary?.orders ?? []).filter(
                  (o) => ["cod", "pay_at_store"].includes(o.payment_method || "") && o.payment_status !== "captured"
                ).length,
              },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      active ? "bg-slate-800 text-indigo-300" : "bg-white text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Deliveries List */}
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-2xs">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              {searchQuery ? "No matching deliveries found" : "All deliveries completed!"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery
                ? "Try searching with a different order number, customer name or contact number."
                : "There are currently no pending orders assigned in this queue. Great job keeping deliveries on time!"}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Clear search filter
              </button>
            ) : (
              <Link
                href="/delivery"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
              >
                <Truck size={13} className="text-slate-400" />
                <span>Open Dispatch Board</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((order) => {
              const isOnRoad =
                order.delivery_status === "out_for_delivery" || order.status === "out_for_delivery";
              const isCod =
                ["cod", "pay_at_store"].includes(order.payment_method || "") &&
                order.payment_status !== "captured";

              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-4 p-4 transition sm:flex-row sm:items-center sm:justify-between sm:p-5 hover:bg-slate-50/70"
                >
                  {/* Left Column: Number, Customer, Badges */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-2xs ${
                        isOnRoad
                          ? "bg-amber-100 text-amber-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {order.fulfillment === "pickup" ? (
                        <Package size={20} />
                      ) : (
                        <Bike size={20} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          #{order.number}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(order.number, order.id)}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copy order number"
                        >
                          {copiedId === order.id ? (
                            <span className="text-[10px] font-bold text-emerald-600">Copied!</span>
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>

                        {/* Status Pill */}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                            isOnRoad
                              ? "bg-amber-100 text-amber-800"
                              : order.status === "delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isOnRoad
                            ? "Out on Road"
                            : (order.status || "Assigned").replace(/_/g, " ")}
                        </span>

                        {/* Payment Pill */}
                        {isCod ? (
                          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            💵 Collect Cash: {formatInr(order.total_paise ?? 0)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ✓ Paid Online
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-900">
                          {order.customer_name || "Customer"}
                        </span>
                        {order.customer_phone && (
                          <>
                            <span className="text-slate-300">·</span>
                            <a
                              href={`tel:${order.customer_phone}`}
                              className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-indigo-600 hover:underline"
                            >
                              <Phone size={11} className="text-slate-400" />
                              <span>{order.customer_phone}</span>
                            </a>
                          </>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="capitalize text-slate-500">
                          {order.fulfillment === "pickup" ? "Store Pickup" : "Doorstep Delivery"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Amount & Quick Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-base font-bold text-slate-900">
                        {formatInr(order.total_paise ?? 0)}
                      </p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        {order.payment_method?.replace(/_/g, " ") || "Prepaid"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Jump to Chat */}
                      <Link
                        href={`/delivery/chat?orderId=${order.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100/80 hover:text-indigo-800"
                        title="Chat with Customer"
                      >
                        <MessageSquare size={13} />
                        <span>Chat</span>
                      </Link>

                      {/* Direct Phone Call */}
                      {order.customer_phone && (
                        <a
                          href={`tel:${order.customer_phone}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50"
                          title="Call Customer"
                        >
                          <Phone size={13} />
                        </a>
                      )}

                      {/* Open Full Details in Dispatch Board */}
                      <Link
                        href={`/delivery?orderId=${order.id}`}
                        className="inline-flex h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
                      >
                        <span>Manage</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety & Shift Guidelines Card */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 sm:p-5 sm:grid-cols-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <ShieldCheck size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">OTP Delivery Verification</h4>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
              Always verify the 4-digit code shown on the customer&apos;s live tracking screen before handing over the parcel.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Banknote size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">COD Cash Remittance</h4>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
              Ensure collected cash matches the slip total. Remit cash collections at the cashier desk at the end of each shift.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <MessageSquare size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Live Customer Chat</h4>
            <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
              Customers can send messages directly from the storefront tracking page. Use fast reply chips to communicate on the road.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
