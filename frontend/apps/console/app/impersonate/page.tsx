"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const started = new Set<string>();

function AcceptTicket() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Opening the store");

  useEffect(() => {
    const ticket = params.get("ticket");
    if (!ticket) {
      setMessage("This viewing link is missing.");
      return;
    }
    if (started.has(ticket)) return;
    started.add(ticket);
    void (async () => {
      await fetch("/api/v1/platform/plans", { credentials: "include" });
      const token = decodeURIComponent(document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "");
      const response = await fetch("/api/v1/auth/impersonation/accept", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token },
        body: JSON.stringify({ ticket }),
      });
      if (!response.ok) {
        started.delete(ticket);
        setMessage("That viewing link has expired. Go back and choose View again.");
        return;
      }
      window.location.replace("/");
    })();
  }, [params]);

  return <main className="grid min-h-screen place-items-center bg-bg text-sm text-muted">{message}</main>;
}

export default function ImpersonatePage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-bg text-sm text-muted">Opening the store</main>}>
      <AcceptTicket />
    </Suspense>
  );
}
