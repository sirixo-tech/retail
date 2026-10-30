"use client";

import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api, warmCsrf } from "../../lib/api";

type HealthCheck = { ok: boolean };
type HealthResponse = { status: string; checks: Record<string, HealthCheck> };

type LogEntry = {
  id: string;
  level: string;
  source: string;
  action: string;
  message: string;
  actor_kind: string;
  actor_id: string | null;
  ip: string | null;
  status: string;
  created_at: string;
  response_excerpt?: string | null;
  status_code?: number;
  duration_ms?: number;
};

type LogStats = {
  total: number;
  unresolved: number;
  critical: number;
  last_24h: number;
  resolved: number;
};

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    unresolved: 0,
    critical: 0,
    last_24h: 0,
    resolved: 0,
  });
  const [lastChecked, setLastChecked] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadAll() {
    setLoading(true);
    try {
      await warmCsrf();
      const [healthRes, logsRes] = await Promise.all([
        fetch("/api/v1/platform/health", {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
        api<{ data: { stats: LogStats; logs: LogEntry[] } }>("/api/v1/platform/logs"),
      ]);

      if (healthRes.status === 401 || healthRes.status === 403) {
        return;
      }

      const healthBody = (await healthRes.json()) as { data?: HealthResponse };
      if (healthBody.data) setHealth(healthBody.data);

      if (logsRes.data) {
        setStats(logsRes.data.stats);
        setLogs(logsRes.data.logs);
      }

      setLastChecked(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) return false;
      if (sourceFilter !== "all" && log.source !== sourceFilter) return false;
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          log.message.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.source.toLowerCase().includes(q) ||
          (log.ip ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, levelFilter, sourceFilter, statusFilter, search]);

  const allHealthy = !health || health.status === "ok" || health.checks?.database?.ok !== false;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Logs &amp; System Health
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Monitor platform errors, system health, and activity across all tenants.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAll()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* System Health Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
          allHealthy
            ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
            : "border-amber-200 bg-amber-50/70 text-amber-900"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              allHealthy ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span className="text-xs font-semibold">
            {allHealthy ? "All systems healthy" : "Degraded subsystem detected"}
          </span>
          {health?.checks ? (
            <div className="ml-3 hidden flex-wrap items-center gap-2 sm:flex">
              {Object.entries(health.checks).map(([key, check]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-200/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-700"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      check.ok ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {key}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <span className="text-[11px] font-medium text-emerald-700">
          Last checked: {lastChecked || "Just now"}
        </span>
      </div>

      {/* 5 Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total Logs
            </div>
            <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{stats.total}</div>
            <div className="mt-1 text-[11px] text-slate-400">All time</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <FileText className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Unresolved
            </div>
            <div className="num mt-1.5 text-2xl font-semibold text-amber-600">
              {stats.unresolved}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Needs attention</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Critical
            </div>
            <div className="num mt-1.5 text-2xl font-semibold text-rose-600">{stats.critical}</div>
            <div className="mt-1 text-[11px] text-slate-400">High priority</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <AlertOctagon className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Last 24 Hours
            </div>
            <div className="num mt-1.5 text-2xl font-semibold text-blue-600">{stats.last_24h}</div>
            <div className="mt-1 text-[11px] text-slate-400">Recent activity</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Resolved
            </div>
            <div className="num mt-1.5 text-2xl font-semibold text-emerald-600">
              {stats.resolved}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">Fixed issues</div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs by message, action, source, or IP..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pr-3 pl-9 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600"
        >
          <option value="all">All Sources</option>
          <option value="auth">auth</option>
          <option value="platform">platform</option>
          <option value="billing">billing</option>
          <option value="pos">pos</option>
          <option value="catalog">catalog</option>
          <option value="api">api</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-600"
        >
          <option value="all">All Status</option>
          <option value="resolved">Resolved</option>
          <option value="unresolved">Unresolved</option>
        </select>

        <button
          type="button"
          onClick={() => void loadAll()}
          className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Apply
        </button>
      </div>

      {/* Logs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Actor / IP</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${
                        log.level === "critical"
                          ? "bg-rose-50 text-rose-700"
                          : log.level === "warning"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600">
                    {log.source}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{log.message}</div>
                    <div className="text-[11px] text-slate-400">{log.action}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="font-medium capitalize">{log.actor_kind}</span>
                    {log.ip ? <span className="block text-[11px] text-slate-400">{log.ip}</span> : null}
                  </td>
                  <td className="num px-4 py-3 text-slate-500">
                    {log.created_at ? new Date(log.created_at).toLocaleString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        log.status === "resolved"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {log.status === "resolved" ? "Resolved" : "Unresolved"}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="mt-2.5 text-sm font-semibold text-slate-800">No logs found</div>
                    <p className="mt-0.5 text-xs text-slate-400">No events match this filter.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">API responses</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">The latest responses from this platform, with secrets removed.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.filter((log) => log.source === "api").map((log) => (
                <tr key={log.id}>
                  <td className="num px-4 py-3 font-semibold text-slate-800">{log.status_code ?? log.message.split(" ")[0]}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-700">{log.action}</td>
                  <td className="num px-4 py-3 text-slate-500">{log.duration_ms != null ? `${log.duration_ms} ms` : "—"}</td>
                  <td className="max-w-[420px] px-4 py-3">
                    <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-slate-600">{log.response_excerpt || log.message}</pre>
                  </td>
                </tr>
              ))}
              {logs.filter((log) => log.source === "api").length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400">No API responses recorded yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
