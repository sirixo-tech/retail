"use client";

import {
  ArrowRight,
  Building2,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  MapPin,
  RefreshCw,
  Store,
  User,
  Phone,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";

type BranchOption = {
  id: string;
  name: string;
  code: string;
  public_slug?: string;
  city?: string;
  address?: string;
  is_default?: boolean;
};

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [showDirectSlug, setShowDirectSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");

  useEffect(() => {
    // Invalidate any stale service worker caches on login mount
    if (typeof window !== "undefined" && "caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== "selfx-pos-v3") {
            caches.delete(key);
          } else {
            caches.open(key).then((cache) => cache.delete("/login"));
          }
        });
      });
    }

    let active = true;
    fetch("/api/v1/auth/staff/me", { credentials: "include", headers: { Accept: "application/json" } })
      .then((r) => {
        if (active && r.ok) {
          window.location.replace("/");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Step 2 State for Branch / Location Selection
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  // Tab Mode & Registration State
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [regSlug, setRegSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [storeType, setStoreType] = useState("Supermarket & Grocery");
  const [regSubmitting, setRegSubmitting] = useState(false);

  function handleBusinessNameChange(name: string) {
    setBusinessName(name);
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);
    setRegSlug(generatedSlug);
  }

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRegSuccess(null);
    setRegSubmitting(true);

    try {
      await fetch("/api/v1/platform/plans", { credentials: "include" });
      const token = decodeURIComponent(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("XSRF-TOKEN="))
          ?.slice("XSRF-TOKEN=".length) ?? "",
      );

      const response = await fetch("/api/v1/auth/register-tenant", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          business_name: businessName,
          slug: regSlug || undefined,
          owner_name: ownerName,
          email: regEmail,
          phone: phone || undefined,
          password: regPassword,
          store_type: storeType,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Registration failed. Please check your details.");
        return;
      }

      setRegSuccess("Store workspace created successfully! Launching your store...");
      setTimeout(() => {
        window.location.href = "/";
      }, 900);
    } catch {
      setError("Unable to connect to registration server. Please try again.");
    } finally {
      setRegSubmitting(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetch("/api/v1/platform/plans", { credentials: "include" });
      const token = decodeURIComponent(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("XSRF-TOKEN="))
          ?.slice("XSRF-TOKEN=".length) ?? "",
      );

      const response = await fetch("/api/v1/auth/staff/login", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          email: emailValue,
          password: passwordValue,
          slug: slugValue ? slugValue.trim() : undefined,
        }),
      });

      if (!response.ok) {
        setError("Those details do not match any active store account. Please check your email and password.");
        return;
      }

      const body = (await response.json()) as {
        data?: {
          kind?: string;
          require_branch_selection?: boolean;
          branches?: BranchOption[];
          profile?: { name?: string; kind?: string };
        };
      };

      const userKind = body.data?.kind || body.data?.profile?.kind;
      if (userKind === "platform") {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const adminUrl = isLocal
          ? `${window.location.protocol}//${window.location.hostname}:3001/`
          : window.location.origin.includes("app.")
            ? window.location.origin.replace("app.", "admin.") + "/"
            : "/superadmin/";
        window.location.href = adminUrl;
        return;
      }

      if (body.data?.require_branch_selection && body.data.branches && body.data.branches.length > 1) {
        setBranches(body.data.branches);
        setUserName(body.data.profile?.name ?? "Retailer");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Unable to connect to login server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectBranch(branch: BranchOption) {
    setSelectedBranchId(branch.id);
    setSwitchingBranch(true);

    try {
      const token = decodeURIComponent(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("XSRF-TOKEN="))
          ?.slice("XSRF-TOKEN=".length) ?? "",
      );

      await fetch("/api/v1/auth/switch-store", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({ store_id: branch.id }),
      });

      window.location.href = "/";
    } catch {
      window.location.href = "/";
    } finally {
      setSwitchingBranch(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f8fafc] lg:grid-cols-12" data-accent="violet">
      {/* Left Plain Solid Color Panel with Heading */}
      <section className="hidden flex-col justify-between bg-[#0f172a] p-14 text-white lg:col-span-6 lg:flex xl:col-span-6">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="SelfX Retail"
            className="h-10 w-auto max-w-[210px] rounded-lg bg-white/95 p-1.5 object-contain shadow-xs"
          />
        </div>

        <div className="my-auto max-w-md space-y-3">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Store &amp; POS Management Console
          </h2>
          <p className="text-sm font-normal text-slate-400">
            Enterprise cloud point of sale, real-time inventory journal, multi-branch operations, and customer
            storefront.
          </p>
        </div>

        <div className="text-xs font-medium text-slate-500">
          © 2026 SelfX Retail Platform. All rights reserved.
        </div>
      </section>

      {/* Right Sign-In / Branch Selector Form */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-6 xl:col-span-6">
        <div className="mx-auto w-full max-w-[420px]">
          {/* Mobile Top Brand */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <img
              src="/logo.png"
              alt="SelfX Store Console"
              className="h-9 w-auto max-w-[190px] object-contain"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
            {/* Step 2: Branch Selection */}
            {branches.length > 0 ? (
              <div className="space-y-5">
                <div>
                  <div className="inline-flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 mb-3">
                    <Building2 size={18} />
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900">Select Branch / Location</h1>
                  <p className="mt-1 text-xs text-slate-500">
                    {userName ? `Welcome back, ${userName}! ` : ""}Choose the store branch you want to operate today:
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={switchingBranch}
                      onClick={() => void handleSelectBranch(b)}
                      className={`w-full text-left rounded-xl border p-3.5 transition-all cursor-pointer flex items-center justify-between ${
                        selectedBranchId === b.id
                          ? "border-purple-600 bg-purple-50/60 ring-1 ring-purple-600"
                          : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/70"
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 truncate">{b.name}</span>
                          {b.is_default ? (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9.5px] font-semibold text-emerald-800">
                              Default
                            </span>
                          ) : null}
                          <span className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[9.5px] font-semibold text-slate-600">
                            {b.code}
                          </span>
                        </div>
                        {b.address || b.city ? (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 truncate">
                            <MapPin size={11} className="shrink-0 text-slate-400" />
                            <span>{[b.address, b.city].filter(Boolean).join(", ")}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0">
                        {switchingBranch && selectedBranchId === b.id ? (
                          <RefreshCw size={15} className="animate-spin text-purple-600" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setBranches([]);
                      setSelectedBranchId(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    ← Back to credentials
                  </button>

                  <a
                    href="/"
                    className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer"
                  >
                    Continue with default →
                  </a>
                </div>
              </div>
            ) : (
              <div>
                {/* Mode Selector Tabs */}
                <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                      setRegSuccess(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      mode === "signin"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setError(null);
                      setRegSuccess(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      mode === "register"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {/* Notifications */}
                {error ? (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {error}
                  </div>
                ) : null}
                {regSuccess ? (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{regSuccess}</span>
                  </div>
                ) : null}

                {mode === "signin" ? (
                  /* Step 1: Email & Password Sign In */
                  <div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Sign in to store</h1>
                      <p className="mt-1 text-xs text-slate-500">
                        Enter your staff credentials. Your registered store &amp; branch will load automatically.
                      </p>
                    </div>

                    <form onSubmit={onSubmit} className="mt-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700" htmlFor="email">
                          Email address
                        </label>
                        <div className="relative mt-1.5 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 focus-within:border-slate-900 focus-within:bg-white">
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={emailValue}
                            onChange={(e) => setEmailValue(e.target.value)}
                            placeholder="you@store.com"
                            className="h-full w-full bg-transparent pl-2.5 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <div className="relative mt-1.5 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 focus-within:border-slate-900 focus-within:bg-white">
                          <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={passwordValue}
                            onChange={(e) => setPasswordValue(e.target.value)}
                            placeholder="••••••••"
                            className="h-full w-full bg-transparent pl-2.5 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Optional Direct Store Slug Override */}
                      <div className="pt-1">
                        {!showDirectSlug ? (
                          <button
                            type="button"
                            onClick={() => setShowDirectSlug(true)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-purple-600 cursor-pointer"
                          >
                            + Have a specific store address?
                          </button>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-slate-600" htmlFor="slug">
                                Store workspace address (Optional)
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDirectSlug(false);
                                  setSlugValue("");
                                }}
                                className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="flex h-9 items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                              <span className="flex h-full items-center border-r border-slate-200 bg-slate-100/70 px-2.5 text-[11px] font-semibold text-slate-500">
                                store /
                              </span>
                              <input
                                id="slug"
                                name="slug"
                                value={slugValue}
                                onChange={(e) => setSlugValue(e.target.value)}
                                placeholder="annapurna"
                                className="h-full w-full bg-transparent px-2.5 text-xs font-medium text-slate-900 outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 focus:outline-hidden disabled:opacity-70 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Verifying credentials...
                          </>
                        ) : (
                          <>
                            Sign in to console
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setMode("register")}
                          className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer"
                        >
                          Don&apos;t have a workspace? Create your store account →
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  /* Step 2: Create Account / Registration Flow */
                  <div>
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Create store account</h1>
                      <p className="mt-1 text-xs text-slate-500">
                        Launch your retail merchant workspace, registers, and inventory in seconds.
                      </p>
                    </div>

                    <form onSubmit={onRegister} className="mt-5 space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Business / Store Name *
                        </label>
                        <div className="relative mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 focus-within:border-slate-900 focus-within:bg-white">
                          <Store className="h-4 w-4 shrink-0 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={businessName}
                            onChange={(e) => handleBusinessNameChange(e.target.value)}
                            placeholder="e.g. Apex Hypermarket"
                            className="h-full w-full bg-transparent pl-2.5 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Store Subdomain Address
                        </label>
                        <div className="mt-1 flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 focus-within:border-slate-900 focus-within:bg-white">
                          <input
                            type="text"
                            required
                            value={regSlug}
                            onChange={(e) => setRegSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            placeholder="apex-hypermarket"
                            className="h-full flex-1 bg-transparent px-3 text-xs font-mono font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          />
                          <span className="border-l border-slate-200 bg-slate-100 px-3 text-[11px] font-mono font-semibold text-slate-500 flex items-center h-full">
                            .retail.selfx.in
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Owner Full Name *
                          </label>
                          <div className="relative mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 focus-within:border-slate-900 focus-within:bg-white">
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <input
                              type="text"
                              required
                              value={ownerName}
                              onChange={(e) => setOwnerName(e.target.value)}
                              placeholder="e.g. Ananya Shah"
                              className="h-full w-full bg-transparent pl-2 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Phone Number
                          </label>
                          <div className="relative mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 focus-within:border-slate-900 focus-within:bg-white">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+91 98765 43210"
                              className="h-full w-full bg-transparent pl-2 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Work Email Address *
                        </label>
                        <div className="relative mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 focus-within:border-slate-900 focus-within:bg-white">
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="owner@store.com"
                            className="h-full w-full bg-transparent pl-2.5 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Account Password *
                          </label>
                          <div className="relative mt-1 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50/60 px-3 focus-within:border-slate-900 focus-within:bg-white">
                            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <input
                              type="password"
                              required
                              minLength={8}
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="••••••••"
                              className="h-full w-full bg-transparent pl-2 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Retail Sector
                          </label>
                          <select
                            value={storeType}
                            onChange={(e) => setStoreType(e.target.value)}
                            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                          >
                            <option value="Supermarket & Grocery">Supermarket &amp; Grocery</option>
                            <option value="Apparel & Fashion">Apparel &amp; Fashion</option>
                            <option value="Electronics & Mobile">Electronics &amp; Mobile</option>
                            <option value="Pharmacy & Health">Pharmacy &amp; Health</option>
                            <option value="General Retail">General Retail</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={regSubmitting}
                        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-slate-800 focus:outline-hidden disabled:opacity-70 cursor-pointer"
                      >
                        {regSubmitting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            Provisioning store workspace...
                          </>
                        ) : (
                          <>
                            Create Store Account
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setMode("signin")}
                          className="text-xs font-semibold text-purple-600 hover:underline cursor-pointer"
                        >
                          Already have an account? Sign in →
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
