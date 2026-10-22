"use client";

import { Clock, LogIn, LogOut, UserCheck, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

type Punch = {
  id: string;
  name: string;
  punched_in_at: string;
  punched_out_at: string | null;
};

function formatDuration(startIso: string, endIso: string | null): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
}

export default function AttendancePage() {
  const [rows, setRows] = useState<Punch[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/v1/attendance", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) {
      window.location.href = "/login";
      return;
    }
    if (response.ok) setRows(((await response.json()) as { data: Punch[] }).data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function punch(direction: "in" | "out") {
    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );
    const response = await fetch(`/api/v1/attendance/${direction}`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token,
      },
    });
    const body = (await response.json()) as { error?: { message: string } };
    setMessage(
      response.ok
        ? direction === "in"
          ? "Punched in."
          : "Punched out."
        : (body.error?.message ?? "The punch was not saved."),
    );
    if (response.ok) await load();
  }

  const currentlyIn = rows.filter((r) => !r.punched_out_at).length;
  const completedShifts = rows.filter((r) => Boolean(r.punched_out_at)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Staff Attendance &amp; Shift Timesheet
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Punch in when starting duty and punch out when leaving. Active shift hours are tracked automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void punch("in")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <LogIn className="h-3.5 w-3.5" />
            Punch in
          </button>
          <button
            type="button"
            onClick={() => void punch("out")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Punch out
          </button>
        </div>
      </div>

      {message ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Today&apos;s Total Punches
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Currently On Duty
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-emerald-600">{currentlyIn}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Completed Shifts
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">
            {completedShifts}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Staff Member</th>
              <th className="px-5 py-3">Punch In</th>
              <th className="px-5 py-3">Punch Out</th>
              <th className="px-5 py-3">Duration</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-semibold text-slate-900">{row.name}</td>
                <td className="num px-5 py-3 text-slate-600">
                  {new Date(row.punched_in_at).toLocaleTimeString()}
                </td>
                <td className="num px-5 py-3 text-slate-600">
                  {row.punched_out_at
                    ? new Date(row.punched_out_at).toLocaleTimeString()
                    : "Active"}
                </td>
                <td className="num px-5 py-3 font-medium text-slate-700">
                  {formatDuration(row.punched_in_at, row.punched_out_at)}
                </td>
                <td className="px-5 py-3 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      row.punched_out_at
                        ? "bg-slate-100 text-slate-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        row.punched_out_at ? "bg-slate-400" : "bg-emerald-500"
                      }`}
                    />
                    {row.punched_out_at ? "Punched Out" : "On Duty · in"}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                  No punches today.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
