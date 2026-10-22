"use client";

import { Button } from "@selfx/ui";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

export function PasswordGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "change" | "ready">("loading");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/v1/auth/staff/me", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (response.status === 403) {
        const body = (await response.json()) as { error?: { code?: string } };
        if (body.error?.code === "auth.password_change_required") {
          setState("change");
          return;
        }
      }
      if (response.ok) {
        const body = (await response.json()) as { data?: { must_change_password?: boolean; impersonation?: { tenant_name?: string } | null } };
        if (body.data?.impersonation) {
          setState("ready");
          return;
        }
        if (body.data?.must_change_password) {
          setState("change");
          return;
        }
      }
      setState("ready");
    })();
  }, []);

  if (state === "loading") {
    return <main className="grid min-h-screen place-items-center bg-bg text-sm text-muted">Checking your account</main>;
  }
  if (state === "change") {
    return <ChangePassword onDone={() => setState("ready")} />;
  }

  return children;
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    await fetch("/api/v1/platform/plans", { credentials: "include" });
    const token = decodeURIComponent(
      document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "",
    );
    const response = await fetch("/api/v1/auth/password", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token,
      },
      body: JSON.stringify({
        current_password: form.get("current_password"),
        password: form.get("password"),
      }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: { message?: string; details?: Record<string, string[]> } };
      const detail = body.error?.details?.current_password?.[0] ?? body.error?.details?.password?.[0];
      setError(detail ?? body.error?.message ?? "The password was not changed.");
      return;
    }
    onDone();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4" data-accent="violet">
      <form onSubmit={onSubmit} className="w-full max-w-[400px] rounded-[10px] border border-line bg-surface p-8">
        <h1 className="text-[24px] font-semibold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted">The temporary password only unlocks this screen. Choose a password of at least 8 characters.</p>
        <label className="mt-6 block text-[13px] font-medium" htmlFor="current_password">Current password</label>
        <input id="current_password" name="current_password" type="password" required className="mt-1.5 h-10 w-full rounded-[6px] border border-line px-3 text-sm" />
        <label className="mt-4 block text-[13px] font-medium" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" required minLength={8} className="mt-1.5 h-10 w-full rounded-[6px] border border-line px-3 text-sm" />
        {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
        <Button type="submit" className="mt-6 w-full">Save password</Button>
      </form>
    </main>
  );
}
