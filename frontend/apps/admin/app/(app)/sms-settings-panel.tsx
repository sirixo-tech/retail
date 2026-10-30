"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Radio,
  Save,
  Send,
  Server,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Star,
  Terminal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import {
  sendFirebaseOtp,
  humanizeFirebaseError,
  type FirebaseConfirmationResult,
} from "../lib/firebase-phone";

type Provider = Record<string, string | boolean>;

type Settings = {
  sms: {
    provider: string;
    sender_id: string;
    api_key: string;
    dlt_entity_id: string;
    enabled: boolean;
    webhook_url?: string;
  };
  sms_providers: Record<string, Provider>;
  auth_methods: { email_password: boolean; phone_otp: boolean };
};

type ProviderCardDef = {
  key: string;
  name: string;
  logo: string;
  category: string;
  badge: string;
  blurb: string;
  fields: {
    key: string;
    label: string;
    secret?: boolean;
    placeholder: string;
    helper?: string;
  }[];
};

const CARDS: ProviderCardDef[] = [
  {
    key: "twilio",
    name: "Twilio SMS",
    logo: "/superadmin/brands/twilio.svg",
    category: "Global Telephony",
    badge: "Tier-1 Carrier",
    blurb: "Enterprise-grade international SMS routing with global carrier deliverability and real-time delivery status across 180+ countries.",
    fields: [
      { key: "account_sid", label: "Account SID", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", helper: "Found on your Twilio console dashboard" },
      { key: "auth_token", label: "Auth Token", secret: true, placeholder: "••••••••••••••••••••••••••••••••", helper: "Kept encrypted; leave blank to preserve saved secret" },
      { key: "from", label: "Sender Phone Number or Header", placeholder: "+14155550100 or SELFXR", helper: "E.164 phone number or registered alphanumeric sender ID" },
    ],
  },
  {
    key: "msg91",
    name: "MSG91",
    logo: "/superadmin/brands/msg91.svg",
    category: "India DLT Enterprise",
    badge: "TRAI Compliant",
    blurb: "High-throughput Indian telecommunication gateway with full TRAI DLT distributed ledger compliance for transactional and OTP routes.",
    fields: [
      { key: "auth_key", label: "Auth Key", secret: true, placeholder: "••••••••••••••••••••••••", helper: "API auth key from MSG91 developer console" },
      { key: "sender_id", label: "Sender ID (Approved Header)", placeholder: "SELFXR", helper: "6-character registered header approved on DLT portal" },
      { key: "template_id", label: "DLT Template ID", placeholder: "1207161829402948291", helper: "Template must contain {#var#} or VAR1 placeholder" },
      { key: "dlt_entity_id", label: "Principal Entity ID (PE ID)", placeholder: "1701159283746192837", helper: "19-digit entity registration number from telecom operator" },
    ],
  },
  {
    key: "fast2sms",
    name: "Fast2SMS",
    logo: "/superadmin/brands/fast2sms.svg",
    category: "Indian Fast Gateway",
    badge: "Quick & DLT",
    blurb: "Dual-mode Indian SMS gateway supporting direct OTP dispatch via Quick Route and operator-cleared DLT template routing.",
    fields: [
      { key: "api_key", label: "API Authorization Key", secret: true, placeholder: "••••••••••••••••••••••••", helper: "Authorization token from Fast2SMS panel" },
      { key: "sender_id", label: "Sender ID (DLT Header)", placeholder: "FSTSMS", helper: "Optional for Quick Route; required for DLT template route" },
      { key: "template_id", label: "DLT Content Template ID", placeholder: "Required when route is dlt", helper: "Numeric template ID registered on telecom DLT" },
      { key: "route", label: "Route Selection", placeholder: "q (Quick OTP) or dlt (DLT Template)", helper: "Use 'q' for rapid OTP or 'dlt' for registered templates" },
    ],
  },
  {
    key: "sns",
    name: "Amazon SNS",
    logo: "/superadmin/brands/amazon.svg",
    category: "AWS Cloud Infrastructure",
    badge: "High Throughput",
    blurb: "Scalable cloud messaging via Amazon Simple Notification Service utilizing AWS Signature Version 4 signing and IAM role credentials.",
    fields: [
      { key: "access_key", label: "AWS Access Key ID", secret: true, placeholder: "AKIAIOSFODNN7EXAMPLE", helper: "IAM access key with sns:Publish permissions" },
      { key: "secret", label: "AWS Secret Access Key", secret: true, placeholder: "••••••••••••••••••••••••••••••••••••••••", helper: "AWS IAM secret key" },
      { key: "region", label: "AWS Region", placeholder: "ap-south-1", helper: "Target AWS region where your SMS quota is allocated" },
      { key: "sender_id", label: "Sender ID (Alphanumeric)", placeholder: "SELFXR", helper: "Supported in select AWS regions for transactional messages" },
    ],
  },
  {
    key: "firebase",
    name: "Firebase Phone Auth",
    logo: "/superadmin/brands/firebase.svg",
    category: "Google Identity",
    badge: "Client-Side SDK",
    blurb: "Customer phone verification handled directly by Google Firebase with built-in invisible reCAPTCHA and global quota management.",
    fields: [
      { key: "api_key", label: "Web API Key", placeholder: "AIzaSy...", helper: "Web API key from Firebase Project Settings" },
      { key: "auth_domain", label: "Auth Domain", placeholder: "your-project.firebaseapp.com", helper: "Authorized domain configured in Firebase Authentication" },
      { key: "project_id", label: "Firebase Project ID", placeholder: "your-project-id", helper: "Google Cloud Project Identifier" },
      { key: "app_id", label: "App ID", placeholder: "1:1234567890:web:abcdef123456", helper: "Unique web application identifier" },
      { key: "messaging_sender_id", label: "Cloud Messaging Sender ID", placeholder: "1234567890", helper: "Sender number used for FCM background push" },
    ],
  },
  {
    key: "log",
    name: "Local Sandbox",
    logo: "/superadmin/brands/log.svg",
    category: "Development & Testing",
    badge: "Zero Cost",
    blurb: "Mock SMS dispatcher that writes outgoing verification codes directly to the Laravel application log. Ideal for staging and local development.",
    fields: [],
  },
];

export function SmsSettingsPanel({
  settings,
  setSettings,
  saveSettings,
  saving,
}: {
  settings: Settings;
  setSettings: (next: Settings) => void;
  saveSettings: (next: Settings, label: string) => Promise<void>;
  saving: boolean;
}) {
  const providers = settings.sms_providers || {};
  const [configModalKey, setConfigModalKey] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [firebaseTestOtp, setFirebaseTestOtp] = useState("");
  const [firebaseTestSent, setFirebaseTestSent] = useState(false);
  const [firebaseConfirming, setFirebaseConfirming] = useState(false);
  const testFirebaseConfirmation = useRef<FirebaseConfirmationResult | null>(null);

  const enabledCount = CARDS.filter((card) => providers[card.key]?.enabled).length;
  const activeCard = CARDS.find((card) => providers[card.key]?.active && providers[card.key]?.enabled);
  const activeModalConfig = CARDS.find((card) => card.key === configModalKey);

  // Close modal on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setConfigModalKey(null);
      }
    }
    if (configModalKey) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [configModalKey]);

  function patch(key: string, values: Provider) {
    setSettings({
      ...settings,
      sms_providers: { ...providers, [key]: { ...(providers[key] || {}), ...values } },
    });
  }

  function toggleSecret(fieldKey: string) {
    setShowSecrets((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  }

  function setActive(key: string) {
    const next: Record<string, Provider> = {};
    for (const card of CARDS) {
      next[card.key] = {
        ...(providers[card.key] || {}),
        active: card.key === key,
        enabled: card.key === key ? true : Boolean(providers[card.key]?.enabled),
      };
    }
    const chosen = CARDS.find((card) => card.key === key)!;
    const row = next[key];
    setSettings({
      ...settings,
      sms_providers: next,
      sms: {
        ...settings.sms,
        provider: chosen.name,
        enabled: true,
        sender_id: String(row.sender_id ?? settings.sms.sender_id ?? ""),
        dlt_entity_id: String(row.dlt_entity_id ?? settings.sms.dlt_entity_id ?? ""),
        api_key: String(row.auth_key ?? row.api_key ?? row.auth_token ?? ""),
      },
    });
  }

  function toggleMethod(key: "email_password" | "phone_otp") {
    const other = key === "email_password" ? "phone_otp" : "email_password";
    if (settings.auth_methods[key] && !settings.auth_methods[other]) return;
    setSettings({
      ...settings,
      auth_methods: { ...settings.auth_methods, [key]: !settings.auth_methods[key] },
    });
  }

  async function sendTest() {
    if (!phone.trim()) return;
    setTesting(true);
    setNotice(null);
    try {
      const res = await api<{ data?: { status?: string; detail?: string } }>("/api/v1/platform/sms/test", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setNotice({
        type: "success",
        text: res.data?.detail ?? `Test message accepted by ${activeCard?.name ?? "gateway"}.`,
      });
    } catch (err) {
      const message = (err as { error?: { message?: string } })?.error?.message ?? "Failed to transmit test SMS via active gateway.";
      setNotice({ type: "error", text: message });
    } finally {
      setTesting(false);
    }
  }

  async function dispatchLiveFirebaseTest() {
    const raw = phone.replace(/\D/g, "");
    if (raw.length < 10) {
      setNotice({ type: "error", text: "Please enter a valid 10-digit mobile number." });
      return;
    }
    setTesting(true);
    setNotice(null);
    setFirebaseTestSent(false);
    try {
      const fbConfig = (providers.firebase || {}) as any;
      if (!fbConfig.api_key || !fbConfig.auth_domain || !fbConfig.project_id || !fbConfig.app_id) {
        setNotice({
          type: "error",
          text: "Firebase credentials are incomplete. Please configure Web API Key, Auth Domain, Project ID, and App ID first.",
        });
        return;
      }
      testFirebaseConfirmation.current = await sendFirebaseOtp(
        fbConfig,
        phone,
        "superadmin-recaptcha"
      );
      setFirebaseTestSent(true);
      setNotice({
        type: "success",
        text: `Live Firebase SMS OTP dispatched to ${phone}! Enter the 6-digit code received on your phone to complete verification.`,
      });
    } catch (err: any) {
      setNotice({ type: "error", text: humanizeFirebaseError(err) });
    } finally {
      setTesting(false);
    }
  }

  async function verifyLiveFirebaseTest() {
    if (!firebaseTestOtp.trim() || !testFirebaseConfirmation.current) return;
    setFirebaseConfirming(true);
    try {
      await testFirebaseConfirmation.current.confirm(firebaseTestOtp.trim());
      setNotice({
        type: "success",
        text: "✅ Phone Auth Verified! The SMS code sent by Google Firebase was successfully verified on this browser.",
      });
      setFirebaseTestSent(false);
      setFirebaseTestOtp("");
    } catch (err: any) {
      setNotice({ type: "error", text: humanizeFirebaseError(err) });
    } finally {
      setFirebaseConfirming(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Context Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Smartphone className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SMS Gateway & Mobile Authentication</h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Configure carrier integrations, DLT compliance credentials, and customer sign-in verification across Web Console, Super Admin, and POS terminals.
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveSettings(settings, "SMS & Auth settings")}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 focus:ring-2 focus:ring-slate-400 focus:outline-hidden disabled:opacity-50 cursor-pointer"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving Changes..." : "Save Settings"}
        </button>
      </div>

      {/* Top Telemetry & Compliance Stat Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Gateway */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Gateway</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 text-base font-bold text-slate-900 truncate">
            {activeCard?.name ?? "None Configured"}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            {activeCard ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Live Dispatch Ready
              </span>
            ) : (
              <span className="text-amber-600">Select an active provider below</span>
            )}
          </div>
        </div>

        {/* Enabled Providers */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Enabled Providers</span>
            <Server className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-2 text-base font-bold text-slate-900">
            {enabledCount} <span className="text-xs font-normal text-slate-400">of {CARDS.length} ready</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {enabledCount > 1 ? "Hot failover capable" : "Single carrier active"}
          </div>
        </div>

        {/* Auth Methods */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Sign-in Security</span>
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-2 text-base font-bold text-slate-900 truncate">
            {settings.auth_methods.phone_otp && settings.auth_methods.email_password
              ? "Dual Sign-in"
              : settings.auth_methods.phone_otp
              ? "Phone OTP Only"
              : "Email / Password"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {settings.auth_methods.phone_otp ? "OTP verification enabled" : "Password authentication"}
          </div>
        </div>

        {/* DLT Compliance */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Telecom Compliance</span>
            <Globe className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-2 text-base font-bold text-slate-900 truncate">
            {settings.sms.dlt_entity_id ? "DLT Registered" : "Standard Route"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            {settings.sms.dlt_entity_id ? `PE ID: ${settings.sms.dlt_entity_id}` : "International / Local route"}
          </div>
        </div>
      </div>

      {/* Authentication & Sign-In Verification Methods */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">User Sign-in & Authentication Methods</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Control the allowed credential types displayed on login pages across Console, Super Admin, and POS terminals. At least one method must remain active.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <Shield className="h-3 w-3" /> Security Policy
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Email / Password Card */}
          <div
            className={`flex items-center justify-between gap-3 rounded-lg border p-4 transition ${
              settings.auth_methods.email_password
                ? "border-slate-300 bg-slate-50/50"
                : "border-slate-200 bg-white opacity-70"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">Email & Password</span>
                  <span className="rounded bg-slate-200/80 px-1.5 py-0.2 text-[10px] font-medium text-slate-700">Standard</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Secure credential login with bcrypt hashing across Super Admin, Web Console, and Staff accounts.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.auth_methods.email_password}
              onClick={() => toggleMethod("email_password")}
              disabled={settings.auth_methods.email_password && !settings.auth_methods.phone_otp}
              aria-label="Toggle Email Password Sign-in"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.auth_methods.email_password ? "bg-slate-900" : "bg-slate-200"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.auth_methods.email_password ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Mobile OTP Card */}
          <div
            className={`flex items-center justify-between gap-3 rounded-lg border p-4 transition ${
              settings.auth_methods.phone_otp
                ? "border-slate-300 bg-slate-50/50"
                : "border-slate-200 bg-white opacity-70"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs">
                <Smartphone className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">Mobile Number & One-Time Passcode (OTP)</span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-medium text-emerald-800">Passwordless</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Transmits a 6-digit OTP code through the active gateway or triggers Firebase Phone Auth on supported storefronts.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.auth_methods.phone_otp}
              onClick={() => toggleMethod("phone_otp")}
              disabled={settings.auth_methods.phone_otp && !settings.auth_methods.email_password}
              aria-label="Toggle Phone OTP Sign-in"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.auth_methods.phone_otp ? "bg-slate-900" : "bg-slate-200"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                  settings.auth_methods.phone_otp ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Gateway Providers Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Telephony & SMS Providers</h2>
            <p className="text-xs text-slate-500">
              Select your default outbound delivery carrier and supply API keys or DLT parameters. Only one provider serves as the active gateway at any given time.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Active Carrier: <strong className="text-slate-800">{activeCard?.name ?? "None"}</strong>
          </span>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {CARDS.map((card) => {
          const row = providers[card.key] ?? {};
          const isEnabled = Boolean(row.enabled);
          const isActive = Boolean(row.active && isEnabled);

          return (
            <div
              key={card.key}
              className={`flex flex-col rounded-xl border bg-white transition-all ${
                isActive
                  ? "border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30"
                  : isEnabled
                  ? "border-slate-300 shadow-2xs"
                  : "border-slate-200 opacity-90"
              }`}
            >
              {/* Card Header & Brand Logo */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50/60 p-1.5 shadow-2xs">
                      <img
                        src={card.logo}
                        alt={card.name}
                        className="max-h-7 max-w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{card.name}</h3>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{card.category}</span>
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  {isActive ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active Default
                    </span>
                  ) : isEnabled ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      Standby
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      Disabled
                    </span>
                  )}
                </div>

                {/* Blurb */}
                <p className="mt-3 text-xs leading-relaxed text-slate-500 min-h-[44px]">
                  {card.blurb}
                </p>
              </div>

              {/* Status & Enable Switch */}
              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-700">Enable Carrier</span>
                    <span className="text-[10px] text-slate-400">({isEnabled ? "Online" : "Offline"})</span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() =>
                      patch(card.key, {
                        enabled: !isEnabled,
                        active: isEnabled ? false : Boolean(row.active),
                      })
                    }
                    aria-label={`Enable ${card.name}`}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      isEnabled ? "bg-slate-900" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card Action Buttons (Horizontal Sleek Row) */}
              <div className="p-4 pt-3 mt-auto border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {/* Configure Button (Opens Popup) */}
                  <button
                    type="button"
                    onClick={() => setConfigModalKey(card.key)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-8.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                    <span>{card.fields.length > 0 ? "Configure" : "Details"}</span>
                  </button>

                  {/* Set as Active Default Button */}
                  <button
                    type="button"
                    onClick={() => setActive(card.key)}
                    disabled={isActive}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 h-8.5 rounded-lg text-xs font-semibold transition shadow-2xs ${
                      isActive
                        ? "border border-emerald-300 bg-emerald-50 text-emerald-800 cursor-default"
                        : isEnabled
                        ? "bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                        : "border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                    }`}
                  >
                    {isActive ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Active Default</span>
                      </>
                    ) : (
                      <>
                        <Star className="h-3.5 w-3.5 text-slate-400" />
                        <span>Set Default</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive SMS Dispatch Simulator & Test Console */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Live Gateway Test & Diagnostics</h3>
            <p className="text-xs text-slate-500">
              Transmit a live test SMS to verify routing, API credentials, sender IDs, and carrier delivery via {activeCard?.name ?? "the active provider"}.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            <Radio className="h-3 w-3 text-emerald-500" /> Carrier Route: {activeCard?.name ?? "None"}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
              <Smartphone className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9392353177 or +91 98765 43210"
              className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          {activeCard?.key === "firebase" ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={testing}
                onClick={() => void sendTest()}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Server className="h-3.5 w-3.5 text-slate-500" />
                {testing ? "Validating..." : "Verify API Key"}
              </button>
              <button
                type="button"
                disabled={testing || phone.trim() === ""}
                onClick={() => void dispatchLiveFirebaseTest()}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 text-xs font-semibold text-white transition disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Send className="h-3.5 w-3.5" />
                {testing ? "Dispatching SMS..." : "Dispatch Live Firebase SMS"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={testing || phone.trim() === ""}
              onClick={() => void sendTest()}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              {testing ? "Transmitting SMS..." : "Dispatch Test SMS"}
            </button>
          )}
        </div>

        {/* SuperAdmin reCAPTCHA Container for Firebase Test */}
        <div id="superadmin-recaptcha" className="my-1.5" />

        {firebaseTestSent && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
            <span className="text-xs font-medium text-emerald-900">Enter SMS Code:</span>
            <input
              type="text"
              value={firebaseTestOtp}
              onChange={(e) => setFirebaseTestOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              placeholder="6-digit code"
              className="h-8.5 w-36 rounded-md border border-emerald-300 bg-white px-2.5 font-mono text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              disabled={firebaseConfirming || firebaseTestOtp.length < 6}
              onClick={() => void verifyLiveFirebaseTest()}
              className="inline-flex h-8.5 items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
            >
              {firebaseConfirming ? "Checking..." : "Confirm Test Code"}
            </button>
          </div>
        )}

        {/* Live Notice / Result Banner */}
        {notice && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50/80 text-emerald-800"
                : "border-rose-200 bg-rose-50/80 text-rose-800"
            }`}
          >
            {notice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            )}
            <div className="flex-1">
              <span className="font-semibold">
                {notice.type === "success" ? "Transmission Verified:" : "Dispatch Error:"}
              </span>{" "}
              {notice.text}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          <Terminal className="h-3 w-3" />
          <span>Test payload uses verified template: &quot;Your SelfX OTP is: 123456. Valid for 10 minutes.&quot;</span>
        </div>
      </div>

      {/* Sticky Bottom Save Action Bar */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>Active default carrier: <strong className="text-slate-800">{activeCard?.name ?? "None"}</strong></span>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveSettings(settings, "SMS & Auth settings")}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 focus:ring-2 focus:ring-slate-400 focus:outline-hidden disabled:opacity-50 cursor-pointer"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving Changes..." : "Save Configuration"}
        </button>
      </div>

      {/* ====================================================================
       * CONFIGURATION MODAL POPUP (Replaces inline dropdown/accordion)
       * ==================================================================== */}
      {configModalKey && activeModalConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          onClick={() => setConfigModalKey(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 p-5 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-2xs">
                  <img
                    src={activeModalConfig.logo}
                    alt={activeModalConfig.name}
                    className="max-h-7 max-w-full object-contain"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{activeModalConfig.name} Configuration</h3>
                    <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wider">
                      {activeModalConfig.badge}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {activeModalConfig.category} &bull; Manage credentials & headers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfigModalKey(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                aria-label="Close configuration modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto p-5 space-y-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-600">
                {activeModalConfig.blurb}
              </div>

              {activeModalConfig.fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                  <Terminal className="mx-auto h-8 w-8 text-slate-400" />
                  <h4 className="mt-2 text-xs font-semibold text-slate-800">Zero Configuration Required</h4>
                  <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                    The local sandbox writes all outgoing verification codes directly to <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px] text-slate-800">storage/logs/laravel.log</code>. No external API keys needed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {activeModalConfig.fields.map((field) => {
                    const inputKey = `${activeModalConfig.key}_${field.key}`;
                    const isSecret = Boolean(field.secret);
                    const isVisible = Boolean(showSecrets[inputKey]);
                    const row = providers[activeModalConfig.key] ?? {};

                    return (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700">
                            {field.label}
                          </label>
                          {field.secret && (
                            <button
                              type="button"
                              onClick={() => toggleSecret(inputKey)}
                              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              <span>{isVisible ? "Mask" : "Reveal"}</span>
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type={isSecret && !isVisible ? "password" : "text"}
                            value={String(row[field.key] ?? "")}
                            placeholder={field.placeholder}
                            onChange={(e) => patch(activeModalConfig.key, { [field.key]: e.target.value })}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 focus:outline-hidden transition"
                          />
                        </div>
                        {field.helper && (
                          <p className="text-[10px] text-slate-400 leading-tight">{field.helper}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3.5">
              <span className="text-[11px] text-slate-500">
                Credentials update automatically. Remember to save settings.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfigModalKey(null)}
                  className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
