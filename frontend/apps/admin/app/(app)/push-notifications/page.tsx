"use client";

import { Badge, Button } from "@selfx/ui";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Copy,
  Info,
  KeyRound,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

interface PushSettings {
  id?: string;
  web_api_key?: string | null;
  auth_domain?: string | null;
  project_id?: string | null;
  app_id?: string | null;
  messaging_sender_id?: string | null;
  pos_android_app_id?: string | null;
  pos_ios_app_id?: string | null;
  kiosk_android_app_id?: string | null;
  kiosk_ios_app_id?: string | null;
  customer_android_app_id?: string | null;
  customer_ios_app_id?: string | null;
  vapid_key?: string | null;
  service_account_json?: string | null;
  status?: string;
  updated_at?: string;
}

interface TestResult {
  success: boolean;
  provider?: string;
  project_id?: string;
  client_email?: string;
  message?: string;
  tested_at?: string;
}

export default function PushNotificationsPage() {
  const [settings, setSettings] = useState<PushSettings>({
    web_api_key: "",
    auth_domain: "",
    project_id: "",
    app_id: "",
    messaging_sender_id: "",
    pos_android_app_id: "com.selfx.pos.terminal",
    pos_ios_app_id: "com.selfx.pos.terminal",
    kiosk_android_app_id: "com.selfx.kiosk",
    kiosk_ios_app_id: "com.selfx.kiosk",
    customer_android_app_id: "com.selfx.customer",
    customer_ios_app_id: "com.selfx.customer",
    vapid_key: "",
    service_account_json: "",
    status: "not_configured",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api<{ data: PushSettings }>("/api/v1/platform/push-notifications");
        if (res.data) {
          setSettings((prev) => ({
            ...prev,
            ...res.data,
            pos_android_app_id: res.data.pos_android_app_id ?? "com.selfx.pos.terminal",
            pos_ios_app_id: res.data.pos_ios_app_id ?? "com.selfx.pos.terminal",
            kiosk_android_app_id: res.data.kiosk_android_app_id ?? "com.selfx.kiosk",
            kiosk_ios_app_id: res.data.kiosk_ios_app_id ?? "com.selfx.kiosk",
            customer_android_app_id: res.data.customer_android_app_id ?? "com.selfx.customer",
            customer_ios_app_id: res.data.customer_ios_app_id ?? "com.selfx.customer",
          }));
        }
      } catch (err: any) {
        setMessage({
          type: "error",
          text: err?.error?.message ?? "Failed to load push notification configuration.",
        });
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await api<{ data: PushSettings }>("/api/v1/platform/push-notifications", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (res.data) {
        setSettings(res.data);
      }
      setMessage({ type: "success", text: "Push notification configuration saved successfully!" });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.error?.message ?? "Failed to save push settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api<{ data: TestResult }>("/api/v1/platform/push-notifications/test", {
        method: "POST",
        body: JSON.stringify({
          service_account_json: settings.service_account_json,
          vapid_key: settings.vapid_key,
          project_id: settings.project_id,
        }),
      });
      setTestResult(res.data);
      setMessage({ type: "success", text: res.data.message ?? "Test connection succeeded!" });
    } catch (err: any) {
      const errMsg = err?.error?.message ?? "Push notification connection test failed.";
      setTestResult({ success: false, message: errMsg });
      setMessage({ type: "error", text: errMsg });
    } finally {
      setTesting(false);
    }
  }

  const isClientsReady = Boolean(settings.web_api_key && settings.project_id);
  const isServerReady = Boolean(settings.service_account_json || settings.vapid_key);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Push notifications</h1>
              <p className="text-xs text-slate-500">
                Configure Firebase Cloud Messaging (FCM) credentials for Web Push, Android POS, Kiosk, and Customer apps.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </div>

      {/* Notifications banner */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Card 1 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              WEB &amp; APP CLIENTS
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isClientsReady
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isClientsReady ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Ready
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Pending Setup
                </>
              )}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Configuration keys used by apps and storefront to initialize FCM.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-mono text-[11px] text-slate-400">
              Project: {settings.project_id || "Not assigned"}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              App ID: {settings.app_id ? `${settings.app_id.slice(0, 14)}...` : "None"}
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              PUSH SENDING
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isServerReady
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {isServerReady ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Ready
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Missing Key
                </>
              )}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Server credentials used to dispatch notifications from cloud.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="font-mono text-[11px] text-slate-400">
              VAPID: {settings.vapid_key ? "Configured" : "Not set"}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              Service Account: {settings.service_account_json ? "Configured" : "None"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Firebase Web App */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Firebase web app</h2>
          </div>
          <p className="mb-5 text-xs text-slate-500">
            Used by POS, Storefront, and PWA clients to register device push tokens.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Web API key</label>
              <input
                type="text"
                value={settings.web_api_key ?? ""}
                onChange={(e) => setSettings({ ...settings, web_api_key: e.target.value })}
                placeholder="AIzaSyA..."
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Auth domain</label>
              <input
                type="text"
                value={settings.auth_domain ?? ""}
                onChange={(e) => setSettings({ ...settings, auth_domain: e.target.value })}
                placeholder="project-id.firebaseapp.com"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Project ID</label>
              <input
                type="text"
                value={settings.project_id ?? ""}
                onChange={(e) => setSettings({ ...settings, project_id: e.target.value })}
                placeholder="selfx-pos-platform"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">App ID</label>
              <input
                type="text"
                value={settings.app_id ?? ""}
                onChange={(e) => setSettings({ ...settings, app_id: e.target.value })}
                placeholder="1:1234567890:web:abcdef"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Messaging sender ID</label>
              <input
                type="text"
                value={settings.messaging_sender_id ?? ""}
                onChange={(e) => setSettings({ ...settings, messaging_sender_id: e.target.value })}
                placeholder="123456789012"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Android & iOS apps */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Android &amp; iOS apps</h2>
          </div>
          <p className="mb-5 text-xs text-slate-500">
            Application package names and bundle identifiers registered in Firebase Console.
          </p>

          <div className="space-y-4">
            {/* POS Apps */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="mb-2 text-xs font-semibold text-slate-700">SelfX POS Terminal App</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">Android package name</label>
                  <input
                    type="text"
                    value={settings.pos_android_app_id ?? ""}
                    onChange={(e) => setSettings({ ...settings, pos_android_app_id: e.target.value })}
                    placeholder="com.selfx.pos.terminal"
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">iOS bundle ID</label>
                  <input
                    type="text"
                    value={settings.pos_ios_app_id ?? ""}
                    onChange={(e) => setSettings({ ...settings, pos_ios_app_id: e.target.value })}
                    placeholder="com.selfx.pos.terminal"
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Kiosk Apps */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="mb-2 text-xs font-semibold text-slate-700">SelfX Self-Checkout Kiosk</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">Android package name</label>
                  <input
                    type="text"
                    value={settings.kiosk_android_app_id ?? ""}
                    onChange={(e) => setSettings({ ...settings, kiosk_android_app_id: e.target.value })}
                    placeholder="com.selfx.kiosk"
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">iOS bundle ID</label>
                  <input
                    type="text"
                    value={settings.kiosk_ios_app_id ?? ""}
                    onChange={(e) => setSettings({ ...settings, kiosk_ios_app_id: e.target.value })}
                    placeholder="com.selfx.kiosk"
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Customer Storefront Apps */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="mb-2 text-xs font-semibold text-slate-700">Customer Mobile App</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">Android package name</label>
                  <input
                    type="text"
                    value={settings.customer_android_app_id ?? ""}
                    onChange={(e) => setSettings({ ...settings, customer_android_app_id: e.target.value })}
                    placeholder="com.selfx.customer"
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-500">iOS bundle ID</label>
                  <input
                    type="text"
                    value={settings.customer_ios_app_id ?? ""}
                    onChange={(e) => setSettings({ ...settings, customer_ios_app_id: e.target.value })}
                    placeholder="com.selfx.customer"
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Cloud Messaging (FCM Server & Web Push) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-900">Cloud Messaging (FCM Server &amp; Web Push)</h2>
            </div>
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Test connection
            </button>
          </div>
          <p className="mb-5 text-xs text-slate-500">
            Server credentials and VAPID key used to sign web push tokens and dispatch FCM messages from backend workers.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">Web Push VAPID key</label>
              <input
                type="text"
                value={settings.vapid_key ?? ""}
                onChange={(e) => setSettings({ ...settings, vapid_key: e.target.value })}
                placeholder="BMx9_W4A..."
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Found in Firebase Console &gt; Project Settings &gt; Cloud Messaging &gt; Web configuration.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Firebase Service Account JSON (Private key)
              </label>
              <textarea
                rows={6}
                value={settings.service_account_json ?? ""}
                onChange={(e) => setSettings({ ...settings, service_account_json: e.target.value })}
                placeholder='{"type": "service_account", "project_id": "selfx-pos", "private_key_id": "...", "private_key": "...", "client_email": "..."}'
                className="mt-1 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Generate in Firebase Console &gt; Project Settings &gt; Service accounts &gt; Generate new private key.
              </span>
            </div>

            {testResult && (
              <div
                className={`rounded-xl border p-4 text-xs ${
                  testResult.success
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                  )}
                  {testResult.success ? "Connection Test Successful" : "Connection Test Failed"}
                </div>
                <div className="mt-1.5 text-xs">{testResult.message}</div>
                {testResult.client_email && (
                  <div className="mt-1 text-[11px] font-mono text-slate-500">
                    Client: {testResult.client_email} | Project: {testResult.project_id}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
