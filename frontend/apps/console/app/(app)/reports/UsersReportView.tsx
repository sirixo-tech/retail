"use client";

import { useMemo } from "react";
import {
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  X,
} from "lucide-react";

export interface UserActivityRow {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  total_sales: number;
  total_purchases: number;
  total_quotations: number;
  total_return_sales: number;
  total_return_purchases: number;
  total_transfers: number;
  total_adjustments: number;
  total_documents: number;
}

export interface ActivityMixItem {
  name: string;
  count: number;
  color: string;
  percentage: number;
}

export interface TopContributorItem {
  rank: number;
  id: string;
  username: string;
  role: string;
  documents: number;
  percent: number;
}

export interface UsersReportData {
  kpis: {
    team_members_active: number;
    team_members_total: number;
    documents_created: number;
    top_contributor_name: string;
    top_contributor_docs: number;
  };
  activity_mix: ActivityMixItem[];
  top_contributors: TopContributorItem[];
  users: UserActivityRow[];
  totals: {
    total_sales: number;
    total_purchases: number;
    total_quotations: number;
    total_return_sales: number;
    total_return_purchases: number;
    total_transfers: number;
    total_adjustments: number;
    total_documents: number;
  };
}

export interface UsersReportViewProps {
  data: UsersReportData | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSelectUser: (user: UserActivityRow) => void;
  onRefresh: () => void;
}

export function UsersReportView({
  data,
  searchQuery,
  setSearchQuery,
  onSelectUser,
  onRefresh,
}: UsersReportViewProps) {
  const handleExportExcel = () => {
    if (!data) return;
    const header =
      "Username,Total Sales,Total Purchases,Total Quotations,Total return sales,Total return purchases,Total transfers,Total adjustments,Total Documents\n";
    const rows = data.users
      .map(
        (u) =>
          `"${u.username}",${u.total_sales},${u.total_purchases},${u.total_quotations},${u.total_return_sales},${u.total_return_purchases},${u.total_transfers},${u.total_adjustments},${u.total_documents}`,
      )
      .join("\n");
    const totals = `"Total",${data.totals.total_sales},${data.totals.total_purchases},${data.totals.total_quotations},${data.totals.total_return_sales},${data.totals.total_return_purchases},${data.totals.total_transfers},${data.totals.total_adjustments},${data.totals.total_documents}\n`;
    const blob = new Blob([header + rows + "\n" + totals], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.users;
    const q = searchQuery.toLowerCase().trim();
    return data.users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const totalDocs = data?.kpis.documents_created ?? 0;
  const activityMix = data?.activity_mix ?? [];
  const radius = 66;
  const circumference = 2 * Math.PI * radius; // ~414.69

  let cumulativeOffset = 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Export Bar Matching Image 3 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Users Report</h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span className="text-slate-600 font-medium">Reports</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Users Report</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FileText className="h-3.5 w-3.5 text-rose-600" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            Print
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Matches Image 3) */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Team Members */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Team members</span>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {data?.kpis.team_members_active ?? 0} / {data?.kpis.team_members_total ?? 0}
          </p>
        </div>

        {/* Documents Created */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Documents created</span>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {data?.kpis.documents_created ?? 0}
          </p>
        </div>

        {/* Top Contributor */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Top contributor</span>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {data?.kpis.top_contributor_name || "None"}{" "}
            <span className="text-slate-400 font-semibold">({data?.kpis.top_contributor_docs ?? 0})</span>
          </p>
        </div>
      </div>

      {/* Two Middle Visuals (Activity Mix Donut & Top Contributors List) */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left: Activity Mix Donut */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-6 flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">Activity mix</h2>

          <div className="relative my-4 flex items-center justify-center">
            <svg viewBox="0 0 160 160" className="h-52 w-52 -rotate-90 transform">
              {totalDocs === 0 ? (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="24"
                />
              ) : (
                activityMix.map((slice) => {
                  if (slice.count <= 0) return null;
                  const slicePct = (slice.count / totalDocs) * 100;
                  const strokeLength = (slicePct / 100) * circumference;
                  const offset = cumulativeOffset;
                  cumulativeOffset += strokeLength;

                  return (
                    <circle
                      key={slice.name}
                      cx="80"
                      cy="80"
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="24"
                      strokeDasharray={`${strokeLength} ${circumference}`}
                      strokeDashoffset={-offset}
                      className="transition-all duration-500"
                    />
                  );
                })
              )}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Documents
              </span>
              <span className="text-2xl font-bold text-slate-900">{totalDocs}</span>
            </div>
          </div>

          {/* Legend Matching Image 3 */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 text-xs">
            {activityMix.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700 font-medium">{item.name}</span>
                <span className="text-slate-400 text-[11px]">({item.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Top Contributors Progress List */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-6 flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Top contributors</h2>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {data?.top_contributors.map((c) => (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        c.rank === 1
                          ? "bg-amber-500 text-white"
                          : c.rank === 2
                          ? "bg-slate-300 text-slate-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {c.rank}
                    </span>
                    <span className="font-semibold text-slate-900">{c.username}</span>
                  </div>
                  <span className="font-bold text-slate-900">{c.documents}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${Math.max(4, c.percent)}%` }}
                  />
                </div>
              </div>
            ))}
            {(!data?.top_contributors || data.top_contributors.length === 0) && (
              <div className="py-12 text-center text-xs text-slate-400">
                No active staff contributor data recorded yet.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Ranked by cumulative document production</span>
            <span>{data?.top_contributors.length ?? 0} active team members</span>
          </div>
        </div>
      </div>

      {/* Table Section Matching Image 3 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Search & Tool icons */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search this table"
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

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="Table Preferences"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Data"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3 text-right">Total Sales</th>
                <th className="px-4 py-3 text-right">Total Purchases</th>
                <th className="px-4 py-3 text-right">Total Quotations</th>
                <th className="px-4 py-3 text-right">Total return sales</th>
                <th className="px-4 py-3 text-right">Total return purchases</th>
                <th className="px-4 py-3 text-right">Total transfers</th>
                <th className="px-4 py-3 text-right">Total adjustments</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                    No matching user records found in this store.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{user.username}</td>
                    <td className="px-4 py-3 text-right font-medium">{user.total_sales}</td>
                    <td className="px-4 py-3 text-right font-medium">{user.total_purchases}</td>
                    <td className="px-4 py-3 text-right font-medium">{user.total_quotations}</td>
                    <td className="px-4 py-3 text-right font-medium">{user.total_return_sales}</td>
                    <td className="px-4 py-3 text-right font-medium">{user.total_return_purchases}</td>
                    <td className="px-4 py-3 text-right font-medium">{user.total_transfers}</td>
                    <td className="px-4 py-3 text-right font-medium">{user.total_adjustments}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectUser(user)}
                        title="View User Details"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Total Summary Row (Matches Image 3) */}
            {data && data.users.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900 text-xs">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{data.totals.total_sales}</td>
                  <td className="px-4 py-3 text-right">{data.totals.total_purchases}</td>
                  <td className="px-4 py-3 text-right">{data.totals.total_quotations}</td>
                  <td className="px-4 py-3 text-right">{data.totals.total_return_sales}</td>
                  <td className="px-4 py-3 text-right">{data.totals.total_return_purchases}</td>
                  <td className="px-4 py-3 text-right">{data.totals.total_transfers}</td>
                  <td className="px-4 py-3 text-right">{data.totals.total_adjustments}</td>
                  <td className="px-4 py-3 text-center">-</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-3.5 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {filteredUsers.length} of {data?.users.length ?? 0} team members
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">1</span>
            <span className="text-slate-400">/ 1 page</span>
          </div>
        </div>
      </div>
    </div>
  );
}
