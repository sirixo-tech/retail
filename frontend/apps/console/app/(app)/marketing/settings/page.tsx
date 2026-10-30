"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Smartphone,
  MessageSquare,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  Key,
  Server,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  Check,
} from "lucide-react";
import { MarketingNav } from "../marketing-nav";

interface MarketingSettings {
  whatsapp?: {
    enabled?: boolean;
    phone_number_id?: string;
    waba_id?: string;
    access_token?: string;
    webhook_verify_token?: string;
  };
  sms?: {
    enabled?: boolean;
    provider?: string;
    api_key?: string;
    sender_id?: string;
    entity_id?: string;
  };
  email?: {
    enabled?: boolean;
    provider?: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_user?: string;
    smtp_password?: string;
    from_address?: string;
    from_name?: string;
    encryption?: string;
  };
}

export default function MarketingSettingsPage() {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [settings, setSettings] = useState<MarketingSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/v1/marketing/settings", { credentials: "include" });
        const json = await res.json();
        if (json.data) setSettings(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/v1/marketing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.data) {
        setToast("Marketing gateway credentials saved and active!");
        setSettings(json.data);
      }
    } catch (err) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection(channel: "whatsapp" | "sms" | "email") {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/v1/marketing/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channel }),
      });
      const json = await res.json();
      if (json.data?.connected) {
        setTestResult({ status: "success", message: json.data.message });
      } else {
        setTestResult({ status: "error", message: json.data?.message || "Connection verification failed" });
      }
    } catch (err: any) {
      setTestResult({ status: "error", message: "Network error testing connection." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <MarketingNav
        title="Marketing Integrations & Gateways"
        subtitle="Configure official WhatsApp Meta Cloud API, DLT-compliant SMS routes, and transactional SMTP for store campaigns."
      />

      {toast && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Gateway Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("whatsapp");
            setTestResult(null);
          }}
          className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
            activeTab === "whatsapp"
              ? "border-emerald-500 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">WhatsApp Cloud API</span>
              {settings.whatsapp?.enabled ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Active
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">Official Meta Cloud API gateway</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("sms");
            setTestResult(null);
          }}
          className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
            activeTab === "sms"
              ? "border-amber-500 bg-amber-50/40 shadow-sm ring-1 ring-amber-500"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">SMS Gateway</span>
              {settings.sms?.enabled ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  Active
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">Fast2SMS, MSG91, Twilio, DLT</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("email");
            setTestResult(null);
          }}
          className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
            activeTab === "email"
              ? "border-violet-500 bg-violet-50/40 shadow-sm ring-1 ring-violet-500"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">Email Gateway (SMTP)</span>
              {settings.email?.enabled ? (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                  Active
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">Custom SMTP, SendGrid, SES</p>
          </div>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
        {/* WhatsApp Panel */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">WhatsApp Meta Cloud API Setup</h3>
                <p className="text-xs text-slate-500">
                  Send high-conversion broadcast messages directly from your official WhatsApp business number.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700">Enable WhatsApp:</span>
                <input
                  type="checkbox"
                  checked={settings.whatsapp?.enabled ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, enabled: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 109283746501928"
                  value={settings.whatsapp?.phone_number_id ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, phone_number_id: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  WhatsApp Business Account (WABA) ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 293847561029384"
                  value={settings.whatsapp?.waba_id ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, waba_id: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Permanent Meta System User Access Token
                </label>
                <input
                  type="password"
                  placeholder="EAAG..."
                  value={settings.whatsapp?.access_token ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, access_token: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Webhook Verify Token
                </label>
                <input
                  type="text"
                  placeholder="selfx_webhook_secret_key"
                  value={settings.whatsapp?.webhook_verify_token ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      whatsapp: { ...settings.whatsapp, webhook_verify_token: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SMS Panel */}
        {activeTab === "sms" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">SMS Gateway Configuration</h3>
                <p className="text-xs text-slate-500">
                  Send bulk SMS alerts and promotions with 100% Indian DLT compliance.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700">Enable SMS:</span>
                <input
                  type="checkbox"
                  checked={settings.sms?.enabled ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, enabled: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  SMS Provider
                </label>
                <select
                  value={settings.sms?.provider ?? "fast2sms"}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, provider: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value="fast2sms">Fast2SMS (Quick / OTP / DLT)</option>
                  <option value="msg91">MSG91 Enterprise</option>
                  <option value="twilio">Twilio Global SMS</option>
                  <option value="custom_http">Custom HTTP Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  API Key / Auth Secret
                </label>
                <input
                  type="password"
                  placeholder="Enter API Key"
                  value={settings.sms?.api_key ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, api_key: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Sender ID (6 Chars DLT)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. SELFXS"
                  value={settings.sms?.sender_id ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, sender_id: e.target.value.toUpperCase() },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Entity ID (PE ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 140155223344"
                  value={settings.sms?.entity_id ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sms: { ...settings.sms, entity_id: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Email Panel */}
        {activeTab === "email" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Email Gateway (SMTP) Setup</h3>
                <p className="text-xs text-slate-500">
                  Configure outbound email server credentials for promotional broadcasts and order confirmations.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700">Enable Email:</span>
                <input
                  type="checkbox"
                  checked={settings.email?.enabled ?? true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, enabled: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  SMTP Host
                </label>
                <input
                  type="text"
                  placeholder="e.g. smtp.gmail.com or email-smtp.us-east-1.amazonaws.com"
                  value={settings.email?.smtp_host ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, smtp_host: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  SMTP Port & Encryption
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="587"
                    value={settings.email?.smtp_port ?? 587}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, smtp_port: parseInt(e.target.value) || 587 },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <select
                    value={settings.email?.encryption ?? "tls"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, encryption: e.target.value },
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  SMTP Username
                </label>
                <input
                  type="text"
                  placeholder="username@yourdomain.com"
                  value={settings.email?.smtp_user ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, smtp_user: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  SMTP Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={settings.email?.smtp_password ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, smtp_password: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  From Address
                </label>
                <input
                  type="email"
                  placeholder="promotions@yourstore.com"
                  value={settings.email?.from_address ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, from_address: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  From Sender Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Store"
                  value={settings.email?.from_name ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      email: { ...settings.email, from_name: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Test Result Pill */}
        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3.5 text-xs font-medium ${
              testResult.status === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {testResult.status === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">
          <button
            type="button"
            disabled={testing}
            onClick={() => handleTestConnection(activeTab)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {testing ? <RefreshCw className="h-4 w-4 animate-spin text-slate-500" /> : <ShieldCheck className="h-4 w-4 text-slate-500" />}
            <span>Test {activeTab.toUpperCase()} Gateway Connection</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Marketing Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
