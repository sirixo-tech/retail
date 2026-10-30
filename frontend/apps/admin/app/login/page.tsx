"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, warmCsrf } from "../lib/api";
import { humanizeFirebaseError } from "../lib/firebase-phone";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [platformRequired, setPlatformRequired] = useState(false);
  const [methods, setMethods] = useState({ email_password: true, phone_otp: true });
  const [signMethod, setSignMethod] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const confirmation = useRef<null | { confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }> }>(null);

  async function loadFirebase(config: { api_key: string; auth_domain: string; project_id: string; app_id: string; messaging_sender_id?: string }) {
    const urls = [
      "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
    ];
    for (const url of urls) {
      if (document.querySelector(`script[src="${url}"]`)) continue;
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Firebase did not load."));
        document.head.appendChild(script);
      });
    }
    const firebase = (window as unknown as { firebase: { apps: unknown[]; initializeApp: (c: object) => void; auth: () => { signInWithPhoneNumber: (p: string, v: unknown) => Promise<{ confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }> }>; RecaptchaVerifier: new (id: string, o: object) => unknown } } }).firebase;
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: config.api_key,
        authDomain: config.auth_domain,
        projectId: config.project_id,
        appId: config.app_id,
        messagingSenderId: config.messaging_sender_id ?? "",
      });
    }
    return firebase;
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "platform_required" || window.location.search.includes("platform_required")) {
        setPlatformRequired(true);
      }
    }

    const host = window.location.hostname;
    const local = host === "localhost" || host === "127.0.0.1";
    const dedicatedAdminHost = host.startsWith("admin.");
    if (!dedicatedAdminHost) {
      window.location.replace(local ? `${window.location.protocol}//${host}:3002/login` : "/login");
      return;
    }

    let active = true;
    fetch("/api/v1/public/auth/methods", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: { email_password?: boolean; phone_otp?: boolean } } | null) => {
        if (!active || !body?.data) return;
        const emailOn = body.data.email_password !== false;
        const phoneOn = body.data.phone_otp !== false;
        setMethods({ email_password: emailOn, phone_otp: phoneOn });
        if (!emailOn && phoneOn) setSignMethod("phone");
      })
      .catch(() => {});
    api<{ data?: { kind?: string } }>("/api/v1/auth/platform/me")
      .then((res) => {
        if (active && res.data?.kind === "platform") {
          const target = window.location.pathname.startsWith("/superadmin") ? "/superadmin/" : "/";
          window.location.replace(target);
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
          : window.location.origin.includes("admin.")
            ? window.location.origin.replace("admin.", "app.") + "/"
            : "/login";
        window.location.href = consoleUrl;
        return;
      }

      const target = window.location.pathname.startsWith("/superadmin") ? "/superadmin/" : "/";
      window.location.replace(target);
    } catch (err) {
      const message = (err as { error?: { message?: string } })?.error?.message;
      setError(message && !message.trim().startsWith("<") ? message : "Those details do not match a platform administrator account.");
    } finally {
      setPending(false);
    }
  }

  async function sendPhoneCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    setDevCode(null);
    try {
      const res = await api<{ data?: { status?: string; code?: string; firebase?: { active?: boolean } } }>("/api/v1/auth/phone/request", {
        method: "POST",
        body: JSON.stringify({ phone, purpose: "platform" }),
      });
      if (res.data?.status === "firebase" && res.data.firebase?.active) {
        const firebase = await loadFirebase(res.data.firebase as { api_key: string; auth_domain: string; project_id: string; app_id: string; messaging_sender_id?: string });
        const digits = phone.replace(/\D/g, "").slice(-10);
        const auth = firebase.auth() as { signInWithPhoneNumber: (p: string, v: unknown) => Promise<{ confirm: (code: string) => Promise<{ user: { getIdToken: () => Promise<string> } }> }> };
        const verifier = new (firebase.auth as unknown as { RecaptchaVerifier: new (id: string, o: object) => unknown }).RecaptchaVerifier("admin-recaptcha", { size: "normal" });
        confirmation.current = await auth.signInWithPhoneNumber("+91" + digits, verifier);
        setOtpSent(true);
        return;
      }
      setOtpSent(true);
      setDevCode(res.data?.code ?? null);
    } catch (err: any) {
      setError(humanizeFirebaseError(err) || (err as { error?: { message?: string } })?.error?.message || "The code could not be sent.");
    } finally {
      setPending(false);
    }
  }

  async function verifyPhoneCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (confirmation.current) {
        const cred = await confirmation.current.confirm(otp);
        const idToken = await cred.user.getIdToken();
        const res = await api<{ data?: { kind?: string } }>("/api/v1/auth/phone/firebase", {
          method: "POST",
          body: JSON.stringify({ id_token: idToken, purpose: "platform" }),
        });
        if (res.data?.kind === "platform") {
          window.location.replace(window.location.pathname.startsWith("/superadmin") ? "/superadmin/" : "/");
        }
        return;
      }
      const res = await api<{ data?: { kind?: string } }>("/api/v1/auth/phone/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code: otp, purpose: "platform" }),
      });
      if (res.data?.kind === "platform") {
        window.location.replace(window.location.pathname.startsWith("/superadmin") ? "/superadmin/" : "/");
      }
    } catch (err) {
      setError((err as { error?: { message?: string } })?.error?.message ?? "That code is not valid.");
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
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
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
            {methods.email_password && methods.phone_otp ? (
              <div className="mt-4 flex rounded-lg bg-slate-100 p-1">
                <button type="button" onClick={() => setSignMethod("email")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${signMethod === "email" ? "bg-white text-slate-900" : "text-slate-500"}`}>Email</button>
                <button type="button" onClick={() => setSignMethod("phone")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${signMethod === "phone" ? "bg-white text-slate-900" : "text-slate-500"}`}>Mobile</button>
              </div>
            ) : null}

            {signMethod === "phone" && methods.phone_otp ? (
              <form onSubmit={otpSent ? verifyPhoneCode : sendPhoneCode} className="mt-6 space-y-4">
                <label className="block text-xs font-semibold text-slate-700">
                  Mobile number
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" inputMode="tel" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="9876543210" />
                </label>
                {otpSent ? (
                  <label className="block text-xs font-semibold text-slate-700">
                    Code
                    <input value={otp} onChange={(e) => setOtp(e.target.value)} autoComplete="one-time-code" inputMode="numeric" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" placeholder="6 digit code" />
                  </label>
                ) : null}
                <div id="admin-recaptcha" />
                {devCode ? <p className="text-xs text-slate-500">SMS is not connected on this machine. The code is {devCode}.</p> : null}
                {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
                <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-60">
                  {pending ? "Please wait" : otpSent ? "Sign in" : "Send code"}
                </button>
              </form>
            ) : (
            <form onSubmit={onSubmit}>

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
                    defaultValue=""
                    autoComplete="off"
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
                    defaultValue=""
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
            )}
          </div>
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
