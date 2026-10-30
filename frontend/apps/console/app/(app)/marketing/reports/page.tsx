"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  CheckCircle2,
  Users,
  Smartphone,
  MessageSquare,
  Mail,
  DollarSign,
  ArrowUpRight,
  Eye,
  Percent,
} from "lucide-react";
import { MarketingNav } from "../marketing-nav";

interface CampaignReport {
  id: string;
  name: string;
  channel: string;
  target_segment: string;
  sent_count: number;
  status: string;
  metrics: {
    delivered?: number;
    clicks?: number;
    conversions?: number;
    estimated_revenue_paise?: number;
  };
  sent_at: string | null;
}

export default function MarketingReportsPage() {
  const [campaigns, setCampaigns] = useState<CampaignReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch("/api/v1/marketing/campaigns?status=sent", { credentials: "include" });
        const json = await res.json();
        if (json.data) setCampaigns(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.metrics?.delivered || c.sent_count || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.metrics?.clicks || 0), 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + (c.metrics?.conversions || 0), 0);
  const totalRevenuePaise = campaigns.reduce((acc, c) => acc + (c.metrics?.estimated_revenue_paise || 0), 0);

  const avgCtr = totalDelivered > 0 ? ((totalClicks / totalDelivered) * 100).toFixed(1) : "0.0";
  const convRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0";

  function exportCsv() {
    const headers = "Campaign Name,Channel,Segment,Sent,Delivered,Clicks,Conversions,Revenue (INR)\n";
    const rows = campaigns
      .map(
        (c) =>
          `"${c.name}","${c.channel}","${c.target_segment}",${c.sent_count},${c.metrics?.delivered ?? c.sent_count},${
            c.metrics?.clicks ?? 0
          },${c.metrics?.conversions ?? 0},${((c.metrics?.estimated_revenue_paise ?? 0) / 100).toFixed(2)}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marketing_roi_report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6 pb-12">
      <MarketingNav
        title="Marketing Reports & ROI"
        subtitle="Track delivery, click-through rates, and attributed sales from your store broadcasts."
        actionButton={
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV Report</span>
          </button>
        }
      />

      {/* Top ROI KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Revenue Generated
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            ₹{(totalRevenuePaise / 100).toLocaleString("en-IN")}
          </p>
          <span className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            Attributed online & in-store sales
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Delivered Reach
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {totalDelivered.toLocaleString("en-IN")}
          </p>
          <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            Across all active broadcast channels
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avg. Click-Through Rate
            </span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{avgCtr}%</p>
          <span className="mt-1 flex items-center gap-1 text-xs text-indigo-600 font-medium">
            Store link interactions
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Orders Converted
            </span>
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {totalConversions} orders
          </p>
          <span className="mt-1 flex items-center gap-1 text-xs text-violet-600 font-medium">
            {convRate}% conversion rate
          </span>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Campaign ROI & Attribution Breakdown</h2>
          <p className="text-xs text-slate-500">Detailed performance audit per dispatched broadcast</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Campaign Name</th>
                <th className="px-6 py-3.5">Channel</th>
                <th className="px-6 py-3.5">Delivered</th>
                <th className="px-6 py-3.5">Clicks</th>
                <th className="px-6 py-3.5">Conversions</th>
                <th className="px-6 py-3.5">Est. Revenue</th>
                <th className="px-6 py-3.5">Dispatched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.length > 0 ? (
                campaigns.map((c) => {
                  const del = c.metrics?.delivered ?? c.sent_count;
                  const clk = c.metrics?.clicks ?? 0;
                  const conv = c.metrics?.conversions ?? 0;
                  const rev = c.metrics?.estimated_revenue_paise ?? 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                      <td className="px-6 py-4 capitalize font-medium text-slate-700">{c.channel}</td>
                      <td className="px-6 py-4 font-medium text-slate-900">{del}</td>
                      <td className="px-6 py-4 font-medium text-indigo-600">{clk}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{conv}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{((rev || 0) / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {c.sent_at
                          ? new Date(c.sent_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Recently"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No dispatched campaign data available yet.
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
