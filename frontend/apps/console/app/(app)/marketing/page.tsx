"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Mail,
  Smartphone,
  MessageSquare,
  AlertCircle,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Store,
  RefreshCw,
  Eye,
  Play,
  Share2,
} from "lucide-react";
import { MarketingNav } from "./marketing-nav";

interface DashboardData {
  stats: {
    total_campaigns: number;
    total_messages_sent: number;
    total_emails_sent: number;
    total_whatsapp_sent: number;
    total_sms_sent: number;
    failed_messages: number;
    total_audience_reach: number;
    online_customers_count: number;
  };
  chart_data: Array<{
    month: string;
    sms: number;
    email: number;
    whatsapp: number;
  }>;
  campaigns_by_status: {
    sent: number;
    scheduled: number;
    draft: number;
    failed: number;
  };
  recent_campaigns: Array<{
    id: string;
    name: string;
    channel: "whatsapp" | "sms" | "email";
    target_segment: string;
    target_count: number;
    sent_count: number;
    status: string;
    created_at: string;
    sent_at: string | null;
  }>;
}

export default function MarketingDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function fetchOverview() {
    try {
      const res = await fetch("/api/v1/marketing/overview", { credentials: "include" });
      const json = await res.json();
      if (json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load marketing dashboard", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, []);

  async function dispatchNow(campaignId: string) {
    try {
      const res = await fetch(`/api/v1/marketing/campaigns/${campaignId}/dispatch`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (json.data) {
        setActionMessage(`Campaign dispatched successfully! Sent to ${json.data.sent_count} recipients.`);
        setTimeout(() => setActionMessage(null), 5000);
        fetchOverview();
      }
    } catch (err) {
      console.error(err);
    }
  }

  const stats = data?.stats || {
    total_campaigns: 0,
    total_messages_sent: 0,
    total_emails_sent: 0,
    total_whatsapp_sent: 0,
    total_sms_sent: 0,
    failed_messages: 0,
    total_audience_reach: 0,
    online_customers_count: 0,
  };

  const chartMonths = data?.chart_data || [];
  const maxMonthSent = Math.max(
    ...chartMonths.map((m) => m.sms + m.email + m.whatsapp),
    100
  );

  return (
    <div className="space-y-6 pb-12">
      <MarketingNav
        title="Marketing Dashboard"
        subtitle="Real-time multi-channel broadcast metrics, store customer reach, and conversion analytics."
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchOverview();
              }}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/marketing/campaigns?new=true"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>New Campaign</span>
            </Link>
          </div>
        }
      />

      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Campaigns */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Campaigns
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Megaphone className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{stats.total_campaigns}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span>Created to date</span>
          </div>
        </div>

        {/* Total Messages */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Messages
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {stats.total_messages_sent.toLocaleString("en-IN")}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>
              {stats.total_messages_sent > 0
                ? `${(((stats.total_messages_sent - stats.failed_messages) / stats.total_messages_sent) * 100).toFixed(1)}% Delivery`
                : "Ready to dispatch"}
            </span>
          </div>
        </div>

        {/* Total Emails */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Emails
            </span>
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {stats.total_emails_sent.toLocaleString("en-IN")}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span>Delivered via SMTP</span>
          </div>
        </div>

        {/* Total WhatsApp */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              WhatsApp Sent
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {stats.total_whatsapp_sent.toLocaleString("en-IN")}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span>Official Cloud API</span>
          </div>
        </div>

        {/* Total SMS */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total SMS
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {stats.total_sms_sent.toLocaleString("en-IN")}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <span>DLT Verified</span>
          </div>
        </div>

        {/* Failed Messages */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Failed
            </span>
            <div className="rounded-lg bg-rose-50 p-2 text-rose-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{stats.failed_messages}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="h-3 w-3" />
            <span>Optimal Health</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts & Channel Distribution Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Trend Visualizer */}
        <div className="col-span-2 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Monthly Message Delivery Volume</h2>
              <p className="text-xs text-slate-500">Dispatch trajectory across SMS, WhatsApp & Email over the last 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">WhatsApp</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                <span className="text-slate-600">Email</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-600">SMS</span>
              </div>
            </div>
          </div>

          {/* Bar Trend representation */}
          <div className="mt-8 flex h-60 items-end justify-between gap-3 border-b border-slate-100 pb-3">
            {chartMonths.map((item, idx) => {
              const total = item.sms + item.email + item.whatsapp;
              const heightPct = Math.max(Math.round((total / maxMonthSent) * 100), 8);
              const waPct = total > 0 ? (item.whatsapp / total) * 100 : 33;
              const emPct = total > 0 ? (item.email / total) * 100 : 33;
              const smsPct = total > 0 ? (item.sms / total) * 100 : 34;

              return (
                <div key={idx} className="group relative flex flex-1 flex-col items-center gap-2 h-full justify-end">
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute -top-12 z-20 hidden rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:flex flex-col gap-0.5 whitespace-nowrap">
                    <span className="font-semibold text-slate-200">{item.month}</span>
                    <span className="text-emerald-300">WhatsApp: {item.whatsapp}</span>
                    <span className="text-violet-300">Email: {item.email}</span>
                    <span className="text-amber-300">SMS: {item.sms}</span>
                  </div>

                  {/* Stacked bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[48px] overflow-hidden rounded-t-lg bg-slate-100 transition-all duration-300 group-hover:brightness-110 flex flex-col justify-end"
                  >
                    <div style={{ height: `${waPct}%` }} className="bg-emerald-500" />
                    <div style={{ height: `${emPct}%` }} className="bg-violet-500" />
                    <div style={{ height: `${smsPct}%` }} className="bg-amber-500" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">{item.month.split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Broadcasts automated via SelfX Engine</span>
            <span>Monthly aggregation</span>
          </div>
        </div>

        {/* Audience Reach & Customer Segments Spotlight */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Audience Reach</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Live Sync
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Customers registered and synced automatically from your Online Store & POS counters.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Total Customer Profiles</span>
                  <span className="font-bold text-slate-900">{stats.total_audience_reach}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-indigo-600" style={{ width: "100%" }} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Online Store Buyers</span>
                  <span className="font-bold text-slate-900">{stats.online_customers_count}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{
                      width: `${stats.total_audience_reach > 0 ? (stats.online_customers_count / stats.total_audience_reach) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Active Campaign Status</span>
                  <span className="font-bold text-slate-900">
                    {data?.campaigns_by_status.sent ?? 0} Sent / {data?.campaigns_by_status.scheduled ?? 0} Scheduled
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              href="/marketing/segments"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <Users className="h-4 w-4" />
              <span>Explore Target Segments</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Campaigns Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-2 p-6 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Recent Marketing Campaigns</h2>
            <p className="text-xs text-slate-500">Live campaign logs, recipient counts, and instant dispatch controls</p>
          </div>
          <Link
            href="/marketing/campaigns"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            <span>View All Campaigns</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Campaign Name</th>
                <th className="px-6 py-3.5">Channel</th>
                <th className="px-6 py-3.5">Target Segment</th>
                <th className="px-6 py-3.5">Recipients</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Sent Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.recent_campaigns && data.recent_campaigns.length > 0 ? (
                data.recent_campaigns.map((camp) => {
                  const channelBadge =
                    camp.channel === "whatsapp" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        <Smartphone className="h-3 w-3" /> WhatsApp
                      </span>
                    ) : camp.channel === "sms" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                        <MessageSquare className="h-3 w-3" /> SMS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                        <Mail className="h-3 w-3" /> Email
                      </span>
                    );

                  const statusBadge =
                    camp.status === "sent" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Sent
                      </span>
                    ) : camp.status === "scheduled" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        <Clock className="h-3 w-3" /> Scheduled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        Draft
                      </span>
                    );

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">{camp.name}</td>
                      <td className="px-6 py-4">{channelBadge}</td>
                      <td className="px-6 py-4 font-medium text-slate-700">{camp.target_segment}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {camp.sent_count > 0 ? camp.sent_count : camp.target_count} contacts
                      </td>
                      <td className="px-6 py-4">{statusBadge}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {camp.sent_at ? new Date(camp.sent_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {camp.status !== "sent" ? (
                          <button
                            onClick={() => dispatchNow(camp.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition"
                          >
                            <Play className="h-3 w-3" />
                            <span>Dispatch Now</span>
                          </button>
                        ) : (
                          <Link
                            href="/marketing/reports"
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Analytics</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm font-medium">No campaigns created yet.</p>
                    <Link
                      href="/marketing/campaigns?new=true"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      <span>Create your first marketing campaign</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
