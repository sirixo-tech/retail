"use client";

import { PageHeader } from "@selfx/ui";
import { useEffect, useState } from "react";

type Notice = { id: string; channel: string; template: string; status: string; detail: string };

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notice[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/v1/notifications", { credentials: "include", headers: { Accept: "application/json" } });
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (response.ok) setRows(((await response.json()) as { data: Notice[] }).data);
    })();
  }, []);

  return (
    <>
      <PageHeader title="Notifications" description="A message stays here when SMS or email is not configured. The sale or order still completes." />
      <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-3 text-sm">
            <span className="font-medium">{row.template}</span>
            <span className="mt-0.5 block text-muted">{row.channel} · {row.status}. {row.detail}</span>
          </li>
        ))}
        {rows.length === 0 ? <li className="px-4 py-8 text-sm text-muted">No messages yet.</li> : null}
      </ul>
    </>
  );
}
