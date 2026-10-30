"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Smartphone,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";

interface Notice {
  id: string;
  channel: string;
  template: string;
  status: string;
  reference_id?: string | null;
  detail: string;
  created_at: string;
}

interface NotificationSummary {
  total: number;
  sent: number;
  not_configured: number;
  failed: number;
  channels: {
    sms: number;
    whatsapp: number;
    email: number;
    system: number;
  };
}

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("with_summary", "1");
      if (activeChannel !== "all") params.set("channel", activeChannel);
      if (activeStatus !== "all") params.set("status", activeStatus);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/v1/notifications?${params.toString()}`, {
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
          setRows(data.items || []);
          setSummary(data.summary || null);
        } else if (Array.isArray(data)) {
          setRows(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeChannel, activeStatus, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchNotifications();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchNotifications]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/v1/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        if (summary) {
          setSummary({ ...summary, total: Math.max(0, summary.total - 1) });
        }
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notification logs?")) return;
    setClearing(true);
    try {
      const res = await fetch("/api/v1/notifications/clear", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setRows([]);
        if (summary) {
          setSummary({
            total: 0,
            sent: 0,
            not_configured: 0,
            failed: 0,
            channels: { sms: 0, whatsapp: 0, email: 0, system: 0 },
          });
        }
      }
    } finally {
      setClearing(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHrs = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffSec < 60) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel.toLowerCase()) {
      case "sms":
        return {
          icon: Smartphone,
          label: "SMS",
          badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
          iconColor: "text-blue-600",
        };
      case "whatsapp":
        return {
          icon: Send,
          label: "WhatsApp",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          iconColor: "text-emerald-600",
        };
      case "email":
        return {
          icon: Mail,
          label: "Email",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
          iconColor: "text-amber-600",
        };
      default:
        return {
          icon: Bell,
          label: channel ? channel.toUpperCase() : "SYSTEM",
          badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
          iconColor: "text-purple-600",
        };
    }
  };

  const getTemplateLabel = (template: string) => {
    switch (template) {
      case "order.placed":
        return { title: "Online Order Placed", category: "Order", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "customer.otp":
        return { title: "Customer Phone OTP", category: "Auth & Security", color: "bg-violet-50 text-violet-700 border-violet-200" };
      case "order.dispatched":
        return { title: "Order Out for Delivery", category: "Delivery", color: "bg-sky-50 text-sky-700 border-sky-200" };
      case "order.delivered":
        return { title: "Order Delivered", category: "Delivery", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "report.scheduled":
        return { title: "Daily Scheduled Report", category: "Reports", color: "bg-amber-50 text-amber-700 border-amber-200" };
      default:
        return { title: template || "System Notification", category: "Alert", color: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const extractOrderNumber = (detail: string): string | null => {
    const match = detail.match(/ON-\d{5,6}/);
    return match ? match[0] : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Notifications &amp; Alerts</h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time delivery log of customer notifications (SMS, WhatsApp, Email) and system alerts across POS and digital storefront orders.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/marketing/settings"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            Gateway Settings
          </Link>
          <button
            type="button"
            onClick={() => void fetchNotifications()}
            title="Refresh Logs"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => void handleClearAll()}
              disabled={clearing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearing ? "Clearing..." : "Clear Log"}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Notifications</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{summary?.total ?? rows.length}</p>
          <p className="mt-1 text-[11px] text-slate-400">Total system &amp; dispatch events</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Delivered / Sent</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-900">{summary?.sent ?? 0}</p>
          <p className="mt-1 text-[11px] text-emerald-700">Transmitted successfully via gateways</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Gateways Not Configured</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-900">{summary?.not_configured ?? 0}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[11px] text-amber-700">Store completed, message queued</span>
            <Link href="/marketing/settings" className="text-[11px] font-semibold text-amber-800 underline hover:text-amber-900">
              Setup →
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Failed Transmissions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-900">{summary?.failed ?? 0}</p>
          <p className="mt-1 text-[11px] text-rose-700">Network or gateway provider rejections</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Channel Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveChannel("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeChannel === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Channels
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel("sms")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeChannel === "sms" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <Smartphone className="h-3 w-3" />
            SMS {summary?.channels?.sms !== undefined && `(${summary.channels.sms})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel("whatsapp")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeChannel === "whatsapp" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <Send className="h-3 w-3" />
            WhatsApp {summary?.channels?.whatsapp !== undefined && `(${summary.channels.whatsapp})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveChannel("email")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeChannel === "email" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            <Mail className="h-3 w-3" />
            Email {summary?.channels?.email !== undefined && `(${summary.channels.email})`}
          </button>
        </div>

        {/* Search and Status Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
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

          <select
            value={activeStatus}
            onChange={(e) => setActiveStatus(e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Delivered (Sent)</option>
            <option value="not_configured">Not Configured</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Bell className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">No notifications found</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {searchQuery || activeChannel !== "all" || activeStatus !== "all"
                ? "Try clearing filters to see all notification events."
                : "Customer order confirmations, delivery updates, and OTP events will appear here in real-time."}
            </p>
            {(searchQuery || activeChannel !== "all" || activeStatus !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setActiveChannel("all");
                  setActiveStatus("all");
                  setSearchQuery("");
                }}
                className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const channelInfo = getChannelBadge(row.channel);
              const templateInfo = getTemplateLabel(row.template);
              const orderNumber = extractOrderNumber(row.detail);
              const ChannelIcon = channelInfo.icon;
              const isUnconfigured = row.status === "not_configured";
              const isSent = row.status === "sent";

              return (
                <div
                  key={row.id}
                  className="group flex flex-col gap-3 p-4 transition hover:bg-slate-50/70 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Channel Icon Badge */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${channelInfo.badgeClass}`}
                    >
                      <ChannelIcon className={`h-5 w-5 ${channelInfo.iconColor}`} />
                    </div>

                    <div className="space-y-1">
                      {/* Title & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{templateInfo.title}</span>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${templateInfo.color}`}>
                          {templateInfo.category}
                        </span>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${channelInfo.badgeClass}`}>
                          {channelInfo.label}
                        </span>

                        {isSent ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Delivered
                          </span>
                        ) : isUnconfigured ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                            <AlertTriangle className="h-3 w-3" />
                            Gateway Not Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                            <ShieldAlert className="h-3 w-3" />
                            Failed
                          </span>
                        )}
                      </div>

                      {/* Detail text */}
                      <p className="text-xs text-slate-700 leading-relaxed">{row.detail}</p>

                      {/* Contextual Action Links */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(row.created_at)}</span>
                        </div>

                        {isUnconfigured && (
                          <Link
                            href="/marketing/settings"
                            className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100"
                          >
                            Configure {channelInfo.label} Gateway
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}

                        {orderNumber && (
                          <Link
                            href="/online-store/orders"
                            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            View Order ({orderNumber})
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Delete single) */}
                  <div className="flex shrink-0 items-center justify-end">
                    <button
                      type="button"
                      onClick={() => void handleDelete(row.id)}
                      disabled={deletingId === row.id}
                      title="Dismiss notification"
                      className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
