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
  Monitor,
  Tablet,
  KeyRound,
} from "lucide-react";
import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  sendFirebaseOtp,
  humanizeFirebaseError,
  type FirebaseConfirmationResult,
} from "../lib/firebase-phone";

type TerminalOption = {
  id: string;
  terminal_id?: string;
  branch_id?: string;
  store_id?: string;
  name: string;
  code: string;
  kind?: "pos" | "kiosk" | string;
  status?: string;
  is_paired?: boolean;
  has_pin?: boolean;
};

type BranchOption = {
  id: string;
  branch_id?: string;
  store_id?: string;
  name: string;
  code: string;
  public_slug?: string;
  city?: string;
  address?: string;
  is_default?: boolean;
  terminals?: TerminalOption[];
};

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [showDirectSlug, setShowDirectSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [branchIdValue, setBranchIdValue] = useState("");

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

  // Step 2 & Step 3 State for Branch (branch_id) & Terminal (terminal_id + PIN) Selection
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [activeBranchForTerminals, setActiveBranchForTerminals] = useState<BranchOption | null>(null);
  const [terminals, setTerminals] = useState<TerminalOption[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalOption | null>(null);
  const [terminalPinInput, setTerminalPinInput] = useState("");
  const [switchingBranch, setSwitchingBranch] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [activeStoreIdDisplay, setActiveStoreIdDisplay] = useState<string | null>(null);

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
  const [methods, setMethods] = useState({ email_password: true, phone_otp: true });
  const [signMethod, setSignMethod] = useState<"email" | "phone">("email");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [regOtp, setRegOtp] = useState("");

  // Firebase Phone Auth refs & states
  const staffFirebaseConfirmation = useRef<FirebaseConfirmationResult | null>(null);
  const regFirebaseConfirmation = useRef<FirebaseConfirmationResult | null>(null);
  const [regFirebaseToken, setRegFirebaseToken] = useState<string | null>(null);
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpSending, setRegOtpSending] = useState(false);
  const [regOtpVerified, setRegOtpVerified] = useState(false);

  useEffect(() => {
    fetch("/api/v1/public/auth/methods", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { data?: { email_password?: boolean; phone_otp?: boolean } } | null) => {
        if (!body?.data) return;
        const emailOn = body.data.email_password !== false;
        const phoneOn = body.data.phone_otp !== false;
        setMethods({ email_password: emailOn, phone_otp: phoneOn });
        if (!emailOn && phoneOn) setSignMethod("phone");
      })
      .catch(() => {});
  }, []);

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

  async function sendRegCode() {
    const rawDigits = phone.replace(/\D/g, "");
    if (rawDigits.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError(null);
    setRegOtpSending(true);
    setDevCode(null);
    try {
      const response = await fetch("/api/v1/auth/phone/request", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "register" }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "The code could not be sent.");
        return;
      }
      if (body?.data?.status === "firebase" && body.data.firebase?.active) {
        try {
          regFirebaseConfirmation.current = await sendFirebaseOtp(
            body.data.firebase,
            phone,
            "reg-recaptcha"
          );
          setRegOtpSent(true);
          setRegSuccess("OTP code dispatched to your phone via Google Firebase. Please enter it below.");
          return;
        } catch (fbErr: any) {
          setError(humanizeFirebaseError(fbErr));
          return;
        }
      }
      setRegOtpSent(true);
      setDevCode(body?.data?.code ?? null);
      setRegSuccess("Enter the verification code sent to your mobile.");
    } catch {
      setError("Unable to send verification code. Please check your connection.");
    } finally {
      setRegOtpSending(false);
    }
  }

  async function verifyRegCode() {
    const clean = regOtp.trim();
    if (!clean) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setError(null);
    setRegSubmitting(true);
    try {
      if (regFirebaseConfirmation.current) {
        try {
          const res = await regFirebaseConfirmation.current.confirm(clean);
          setRegFirebaseToken(res.idToken);
          // Pre-verify with backend to store in DB
          await fetch("/api/v1/auth/phone/firebase", {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: res.idToken, purpose: "register" }),
          });
          setRegOtpVerified(true);
          setRegSuccess("Mobile number verified successfully with Firebase!");
        } catch (fbErr: any) {
          setError(humanizeFirebaseError(fbErr));
          return;
        }
      } else {
        const response = await fetch("/api/v1/auth/phone/verify", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code: clean, purpose: "register" }),
        });
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "That code is not valid.");
          return;
        }
        setRegOtpVerified(true);
        setRegSuccess("Mobile number verified successfully!");
      }
    } catch {
      setError("Unable to verify code.");
    } finally {
      setRegSubmitting(false);
    }
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
          otp: regOtp || undefined,
          firebase_id_token: regFirebaseToken || undefined,
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
          store_id: slugValue ? slugValue.trim() : undefined,
          branch_id: branchIdValue ? branchIdValue.trim() : undefined,
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
          name?: string;
          store_id?: string;
          branch_id?: string;
          require_branch_selection?: boolean;
          branches?: BranchOption[];
          stores?: BranchOption[];
          terminals?: TerminalOption[];
          profile?: { name?: string; kind?: string; branches?: BranchOption[]; stores?: BranchOption[] };
        };
      };

      const userKind = body.data?.kind || body.data?.profile?.kind;
      if (userKind === "platform") {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        const adminUrl = isLocal
          ? `${window.location.protocol}//${window.location.hostname}:3001/superadmin/`
          : window.location.origin.includes("app.")
            ? window.location.origin.replace("app.", "admin.") + "/"
            : "/superadmin/";
        window.location.href = adminUrl;
        return;
      }

      const returnedBranches =
        body.data?.branches ??
        body.data?.stores ??
        body.data?.profile?.branches ??
        body.data?.profile?.stores ??
        [];

      if (returnedBranches.length > 0) {
        setBranches(returnedBranches);
        setUserName(body.data?.name ?? body.data?.profile?.name ?? "Retailer");
        setActiveStoreIdDisplay(body.data?.store_id ?? returnedBranches[0]?.store_id ?? null);
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
    setError(null);

    try {
      const token = decodeURIComponent(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("XSRF-TOKEN="))
          ?.slice("XSRF-TOKEN=".length) ?? "",
      );

      const res = await fetch("/api/v1/auth/select-branch", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          store_id: branch.store_id ?? branch.id,
          branch_id: branch.branch_id ?? branch.id,
        }),
      });

      const body = (await res.json()) as { data?: { terminals?: TerminalOption[] } };
      const branchTerminals = body.data?.terminals ?? branch.terminals ?? [];
      setActiveBranchForTerminals(branch);
      setTerminals(branchTerminals);
      setSelectedTerminal(null);
      setTerminalPinInput("");
    } catch {
      setActiveBranchForTerminals(branch);
      setTerminals(branch.terminals ?? []);
    } finally {
      setSwitchingBranch(false);
    }
  }

  async function handleSelectTerminal(terminal: TerminalOption, pin?: string) {
    if (terminal.has_pin && !pin) {
      setSelectedTerminal(terminal);
      setTerminalPinInput("");
      setError(null);
      return;
    }

    setSwitchingBranch(true);
    setError(null);
    try {
      const token = decodeURIComponent(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("XSRF-TOKEN="))
          ?.slice("XSRF-TOKEN=".length) ?? "",
      );

      const res = await fetch("/api/v1/auth/select-terminal", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          terminal_id: terminal.id,
          pin: pin || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Invalid terminal PIN.");
        return;
      }

      if (terminal.kind === "kiosk") {
        window.location.href = "/kiosks";
      } else {
        window.location.href = "/pos";
      }
    } catch {
      setError("Could not verify terminal.");
    } finally {
      setSwitchingBranch(false);
    }
  }

  async function sendLoginCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setDevCode(null);
    try {
      const response = await fetch("/api/v1/auth/phone/request", {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loginPhone, purpose: "staff", slug: slugValue || undefined }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "The code could not be sent.");
        return;
      }
      if (body?.data?.status === "firebase" && body.data.firebase?.active) {
        try {
          staffFirebaseConfirmation.current = await sendFirebaseOtp(
            body.data.firebase,
            loginPhone,
            "staff-recaptcha"
          );
          setLoginOtpSent(true);
          return;
        } catch (fbErr: any) {
          setError(humanizeFirebaseError(fbErr));
          return;
        }
      }
      setLoginOtpSent(true);
      setDevCode(body?.data?.code ?? null);
    } catch {
      setError("Unable to connect to the login server.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyLoginCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let body: any = null;
      if (staffFirebaseConfirmation.current) {
        let idToken = "";
        try {
          const res = await staffFirebaseConfirmation.current.confirm(loginOtp);
          idToken = res.idToken;
        } catch (fbErr: any) {
          setError(humanizeFirebaseError(fbErr));
          return;
        }
        const response = await fetch("/api/v1/auth/phone/firebase", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            id_token: idToken,
            purpose: "staff",
            store_id: slugValue ? slugValue.trim() : undefined,
            branch_id: branchIdValue ? branchIdValue.trim() : undefined,
            slug: slugValue ? slugValue.trim() : undefined,
          }),
        });
        body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "Firebase authentication failed on the server.");
          return;
        }
      } else {
        const response = await fetch("/api/v1/auth/phone/verify", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: loginPhone,
            code: loginOtp,
            purpose: "staff",
            store_id: slugValue ? slugValue.trim() : undefined,
            branch_id: branchIdValue ? branchIdValue.trim() : undefined,
            slug: slugValue ? slugValue.trim() : undefined,
          }),
        });
        body = await response.json();
        if (!response.ok) {
          setError(body?.error?.message ?? "That code is not valid.");
          return;
        }
      }

      const returnedBranches = body.data?.branches ?? body.data?.stores ?? body.data?.profile?.branches ?? [];
      if (returnedBranches.length > 0) {
        setBranches(returnedBranches);
        setUserName(body.data?.name ?? body.data?.profile?.name ?? "Retailer");
        setActiveStoreIdDisplay(body.data?.store_id ?? returnedBranches[0]?.store_id ?? null);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Unable to connect to the login server.");
    } finally {
      setLoading(false);
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
            {/* Step 3: Terminal Selection (POS Counter / Kiosk / Console) + PIN Verification */}
            {activeBranchForTerminals ? (
              <div className="space-y-4">
                <div>
                  <div className="inline-flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 mb-3">
                    <Monitor size={18} />
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900">Select Terminal</h1>
                  <p className="mt-1 text-xs text-slate-500">
                    Branch <span className="font-semibold text-slate-800">{activeBranchForTerminals.name}</span>{" "}
                    <span className="font-mono text-[10px] text-slate-400">
                      (Branch ID: {(activeBranchForTerminals.branch_id ?? activeBranchForTerminals.id).slice(0, 12)}…)
                    </span>
                  </p>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                    {error}
                  </div>
                ) : null}

                {selectedTerminal ? (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound size={15} className="text-purple-700" />
                        <span className="text-xs font-semibold text-slate-900">
                          Enter PIN for {selectedTerminal.name} ({selectedTerminal.code})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTerminal(null);
                          setError(null);
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Change terminal
                      </button>
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={terminalPinInput}
                      onChange={(e) => setTerminalPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="4 to 6 digit Terminal PIN"
                      className="num h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-center font-mono text-base tracking-widest text-slate-900"
                    />
                    <button
                      type="button"
                      disabled={switchingBranch || terminalPinInput.length < 4}
                      onClick={() => void handleSelectTerminal(selectedTerminal, terminalPinInput)}
                      className="flex h-10 w-full items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {switchingBranch ? "Verifying PIN..." : "Unlock & Launch Terminal"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = "/";
                      }}
                      className="w-full text-left rounded-xl border border-slate-200 bg-white p-3.5 hover:border-purple-500 hover:bg-purple-50/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                          <Store size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">Store Management Console</div>
                          <div className="text-[11px] text-slate-500">Inventory, purchases, reports &amp; settings</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>

                    {terminals.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={switchingBranch}
                        onClick={() => void handleSelectTerminal(t)}
                        className="w-full text-left rounded-xl border border-slate-200 bg-white p-3.5 hover:border-purple-500 hover:bg-purple-50/30 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                              t.kind === "kiosk"
                                ? "bg-orange-50 text-[#ea580c]"
                                : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {t.kind === "kiosk" ? <Tablet size={15} /> : <Monitor size={15} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-900 truncate">{t.name}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                                {t.code}
                              </span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-slate-600">
                                {t.kind === "kiosk" ? "Kiosk" : "POS"}
                              </span>
                              {t.has_pin ? (
                                <span className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[9.5px] font-semibold text-indigo-700">
                                  <Lock size={9} /> PIN
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 font-mono text-[10px] text-slate-400 truncate">
                              Terminal ID: {(t.terminal_id ?? t.id).slice(0, 14)}…
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBranchForTerminals(null);
                      setSelectedTerminal(null);
                      setError(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    ← Back to branches
                  </button>
                  <a href="/" className="text-xs font-semibold text-purple-600 hover:underline">
                    Open Dashboard →
                  </a>
                </div>
              </div>
            ) : branches.length > 0 ? (
              <div className="space-y-5">
                <div>
                  <div className="inline-flex size-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 mb-3">
                    <Building2 size={18} />
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900">Select Branch</h1>
                  <p className="mt-1 text-xs text-slate-500">
                    {userName ? `Welcome, ${userName}. ` : ""}Select a registered branch to pick your POS or Kiosk terminal:
                  </p>
                  {activeStoreIdDisplay ? (
                    <div className="mt-1.5 font-mono text-[10px] text-slate-400">
                      Store ID: {activeStoreIdDisplay}
                    </div>
                  ) : null}
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
                        <div className="mt-1 font-mono text-[10px] text-slate-400 truncate">
                          Branch ID: {(b.branch_id ?? b.id).slice(0, 18)}…
                        </div>
                        {b.address || b.city ? (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 truncate">
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
                    Continue to Console →
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
                    {methods.email_password && methods.phone_otp ? (
                      <div className="mt-4 flex rounded-lg bg-slate-100 p-1">
                        <button type="button" onClick={() => setSignMethod("email")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${signMethod === "email" ? "bg-white text-slate-900" : "text-slate-500"}`}>Email</button>
                        <button type="button" onClick={() => setSignMethod("phone")} className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${signMethod === "phone" ? "bg-white text-slate-900" : "text-slate-500"}`}>Mobile</button>
                      </div>
                    ) : null}

                    {signMethod === "phone" && methods.phone_otp ? (
                      <form onSubmit={loginOtpSent ? verifyLoginCode : sendLoginCode} className="mt-6 space-y-4">
                        <label className="block text-xs font-semibold text-slate-700">
                          Mobile number
                          <input
                            value={loginPhone}
                            onChange={(e) => setLoginPhone(e.target.value)}
                            autoComplete="off"
                            inputMode="tel"
                            className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                            placeholder="e.g. 9876543210"
                          />
                        </label>

                        {/* reCAPTCHA Container for Firebase Phone Auth */}
                        <div id="staff-recaptcha" className="my-1" />

                        {loginOtpSent ? (
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              Verification Code
                              <input
                                value={loginOtp}
                                onChange={(e) => setLoginOtp(e.target.value)}
                                autoComplete="one-time-code"
                                inputMode="numeric"
                                maxLength={6}
                                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-slate-900"
                                placeholder="Enter 6-digit code"
                              />
                            </label>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>Code sent to {loginPhone}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setLoginOtpSent(false);
                                  setLoginOtp("");
                                }}
                                className="font-semibold text-purple-700 hover:underline cursor-pointer"
                              >
                                Change number / Resend
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {devCode ? <p className="text-xs text-slate-500">SMS is not connected on this machine. The code is {devCode}.</p> : null}
                        <button type="submit" disabled={loading || (loginOtpSent ? loginOtp.trim().length < 6 : loginPhone.replace(/\D/g, "").length < 10)} className="flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer">
                          {loading ? "Please wait..." : loginOtpSent ? "Verify & Sign In" : "Send 6-Digit Code"}
                        </button>
                      </form>
                    ) : (
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

                      {/* Optional Store ID & Branch ID Override */}
                      <div className="pt-1">
                        {!showDirectSlug ? (
                          <button
                            type="button"
                            onClick={() => setShowDirectSlug(true)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-purple-600 cursor-pointer"
                          >
                            + Specify Store ID or Branch ID (Optional)
                          </button>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-slate-600" htmlFor="slug">
                                Store ID &amp; Branch ID (Optional)
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDirectSlug(false);
                                  setSlugValue("");
                                  setBranchIdValue("");
                                }}
                                className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                id="slug"
                                name="store_id"
                                value={slugValue}
                                onChange={(e) => setSlugValue(e.target.value)}
                                placeholder="Store ID (UUID)"
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none"
                              />
                              <input
                                id="branch_id"
                                name="branch_id"
                                value={branchIdValue}
                                onChange={(e) => setBranchIdValue(e.target.value)}
                                placeholder="Branch ID / Code"
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none"
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
                    )}
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
                          {methods.phone_otp ? (
                            <div className="mt-2 space-y-2">
                              {/* reCAPTCHA Container for Registration Firebase Phone Auth */}
                              <div id="reg-recaptcha" className="my-1" />

                              {regOtpVerified ? (
                                <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Phone verified (+91 {phone.replace(/\D/g, "").slice(-10)})</span>
                                </div>
                              ) : !regOtpSent ? (
                                <button
                                  type="button"
                                  disabled={regOtpSending || phone.replace(/\D/g, "").length < 10}
                                  onClick={() => void sendRegCode()}
                                  className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 disabled:opacity-50 cursor-pointer"
                                >
                                  {regOtpSending ? "Sending verification code..." : "Send code to this number"}
                                </button>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex gap-2">
                                    <input
                                      value={regOtp}
                                      onChange={(e) => setRegOtp(e.target.value)}
                                      inputMode="numeric"
                                      maxLength={6}
                                      placeholder="6-digit code"
                                      className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-slate-900"
                                    />
                                    <button
                                      type="button"
                                      disabled={regSubmitting || regOtp.trim().length < 6}
                                      onClick={() => void verifyRegCode()}
                                      className="h-9 rounded-lg bg-purple-700 px-3 text-xs font-semibold text-white transition hover:bg-purple-800 disabled:opacity-50 cursor-pointer"
                                    >
                                      {regSubmitting ? "Verifying..." : "Verify Code"}
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400">Code expires in 10 minutes</span>
                                    <button
                                      type="button"
                                      disabled={regOtpSending}
                                      onClick={() => void sendRegCode()}
                                      className="text-slate-500 hover:text-purple-700 underline cursor-pointer"
                                    >
                                      Resend code
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
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
