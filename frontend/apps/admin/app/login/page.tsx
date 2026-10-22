"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, warmCsrf } from "../lib/api";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [platformRequired, setPlatformRequired] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "platform_required" || window.location.search.includes("platform_required")) {
        setPlatformRequired(true);
      }
    }

    let active = true;
    api<{ data?: { kind?: string } }>("/api/v1/auth/platform/me")
      .then((res) => {
        if (active && res.data?.kind === "platform") {
          window.location.replace("/");
        }
      })
      .catch(() => {
        // Not authenticated, stay on login
      });

    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await warmCsrf();
      const res = await api<{ data?: { kind?: string } }>("/api/v1/auth/platform/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });

      if (res.data?.kind === "staff") {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const consoleUrl = isLocal
          ? `${window.location.protocol}//${window.location.hostname}:3002/`
          : window.location.origin.replace("admin.", "app.") + "/";
        window.location.href = consoleUrl;
        return;
      }

      window.location.replace("/");
    } catch {
      setError("Those details do not match a platform administrator account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f8fafc] lg:grid-cols-12">
      {/* Left Plain Solid Color Panel with Heading */}
      <section className="hidden flex-col justify-between bg-[#0f172a] p-14 text-white lg:col-span-6 lg:flex xl:col-span-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="SelfX Admin"
            className="h-10 w-auto max-w-[210px] rounded-lg bg-white/95 p-1.5 object-contain shadow-xs"
          />
        </div>

        <div className="my-auto max-w-md">
          <h2 className="text-3xl font-semibold leading-snug tracking-tight text-white">
            Platform Super Admin Control Center
          </h2>
        </div>

        <div className="text-xs font-medium text-slate-400">
          © 2026 SelfX Retail Platform
        </div>
      </section>

      {/* Right Admin Login Card */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-6 xl:col-span-6">
        <div className="mx-auto w-full max-w-[400px]">
          <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
            <div className="mb-6 flex items-center gap-2.5 lg:hidden">
              <img
                src="/logo.png"
                alt="SelfX Admin"
                className="h-9 w-auto max-w-[190px] object-contain"
              />
            </div>

            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Super Admin sign in</h1>
            <p className="mt-1 text-xs text-slate-500">
              Sign in with your platform administrator credentials.
            </p>

            {platformRequired && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                <span className="font-semibold">Super Admin Authentication Required:</span> You were signed in with a Tenant Staff profile. Please sign in below with your Platform Super Admin account to access master platform controls.
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700" htmlFor="email">
                  Email
                </label>
                <div className="mt-1.5 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 focus-within:border-slate-900 focus-within:bg-white">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue="admin@selfx.test"
                    autoComplete="username"
                    className="h-full w-full bg-transparent pl-2.5 text-sm text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
                  Password
                </label>
                <div className="mt-1.5 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 focus-within:border-slate-900 focus-within:bg-white">
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    defaultValue="password"
                    autoComplete="current-password"
                    className="h-full w-full bg-transparent px-2.5 text-sm text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <span>{pending ? "Signing in..." : "Sign in"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">
            <a href="/welcome" className="font-semibold text-slate-900 underline-offset-2 hover:underline">
              View product overview
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
