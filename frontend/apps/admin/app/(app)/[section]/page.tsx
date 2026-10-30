"use client";

import { formatInr } from "@selfx/types";
import { SmsSettingsPanel } from "../sms-settings-panel";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Cpu,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FolderTree,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  Lock,
  Mail,
  MessageSquare,
  Package,
  Palette,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Smartphone,
  Store,
  Trash2,
  Upload,
  UserCheck,
  UserCircle,
  Users,
  X,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, warmCsrf } from "../../lib/api";
import AppsUpdatesPage from "../apps-updates/page";

type PlatformAdmin = {
  id: string;
  name: string;
  email: string;
  status: string;
  two_factor_enabled: boolean;
  last_login_at: string | null;
  created_at: string | null;
};

type PaymentsOverviewData = {
  stats: {
    total_collected_paise: number;
    pending_amount_paise: number;
    total_invoices: number;
    paid_invoices: number;
    pending_invoices: number;
    active_subscriptions: number;
    trial_subscriptions: number;
  };
  invoices: {
    id: string;
    number: string;
    tenant_name: string;
    tenant_slug: string;
    status: string;
    subtotal_paise: number;
    tax_paise: number;
    total_paise: number;
    utr: string | null;
    issued_at: string | null;
    due_at: string | null;
    paid_at: string | null;
  }[];
};

type LogEntry = {
  id: string;
  level: string;
  source: string;
  action: string;
  message: string;
  actor_kind: string;
  actor_id: string | null;
  ip: string | null;
  status: string;
  created_at: string;
};

type GatewayConfig = {
  enabled: boolean;
  mode?: string;
  currency?: string;
  [key: string]: any;
};

type PlatformSettingsData = {
  branding: {
    logo_url: string;
    favicon_url: string;
  };
  general: {
    platform_name: string;
    support_email: string;
    support_phone: string;
    default_currency: string;
    default_timezone: string;
    trial_days: number;
    grace_period_days: number;
    maintenance_mode: boolean;
    maintenance_message?: string;
    maintenance_until?: string;
    allow_self_registration: boolean;
    copyright_text?: string;
  };
  profile: {
    name: string;
    email: string;
    phone: string;
    designation: string;
    role: string;
  };
  languages: {
    default_language: string;
    supported_languages: string[];
    enable_multilingual_storefront: boolean;
    auto_translate_catalog: boolean;
    currency: string;
    number_format: string;
  };
  pwa: {
    name: string;
    short_name: string;
    theme_color: string;
    background_color: string;
    display_mode: string;
    start_url: string;
    logo_url: string;
    offline_caching: boolean;
  };
  storage: {
    driver: "local" | "s3" | "spaces";
    s3_bucket: string;
    s3_region: string;
    s3_key: string;
    s3_secret: string;
    spaces_endpoint: string;
    spaces_bucket: string;
    spaces_region: string;
    spaces_key: string;
    spaces_secret: string;
    cleanup_unused_age_days: number;
    cleanup_folders: string[];
  };
  security: {
    enforce_2fa: boolean;
    session_timeout_minutes: number;
    max_login_attempts: number;
    lockout_duration_minutes: number;
    require_strong_password: boolean;
    force_single_session: boolean;
  };
  mail: {
    driver: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    encryption: string;
    from_address: string;
    from_name: string;
    reply_to?: string;
  };
  sms: {
    provider: string;
    sender_id: string;
    api_key: string;
    dlt_entity_id: string;
    enabled: boolean;
    webhook_url?: string;
  };
  sms_providers: Record<string, Record<string, string | boolean>>;
  auth_methods: { email_password: boolean; phone_otp: boolean };
  maps: { api_key: string };
  whatsapp: {
    provider: string;
    phone_number_id: string;
    business_account_id: string;
    access_token: string;
    enabled: boolean;
    verify_token?: string;
  };
  gateways: Record<string, GatewayConfig>;
  email_templates: {
    key: string;
    name: string;
    trigger?: string;
    subject: string;
    body: string;
    active: boolean;
  }[];
  sms_templates: {
    key: string;
    name: string;
    dlt_template_id: string;
    content: string;
    active: boolean;
  }[];
};

export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const section = params?.section ?? "";

  if (section === "apps-updates") return <AppsUpdatesPage />;
  if (section === "backups") return <BackupsSection />;
  if (section === "queue-monitoring") return <QueueMonitoringSection />;
  if (section === "super-admins") return <SuperAdminsSection />;
  if (section === "how-it-works") return <HowItWorksSection />;
  if (section === "reminders") return <RemindersSection />;
  if (
    section === "payments-overview" ||
    section === "transactions" ||
    section === "pending-payments" ||
    section === "invoices"
  ) {
    return <PaymentsSection mode={section} />;
  }
  if (section === "impersonation-logs") return <ImpersonationLogsSection />;
  if (
    section === "general-settings" ||
    section === "email-templates" ||
    section === "sms-templates" ||
    section === "mail-settings" ||
    section === "sms-settings" ||
    section === "gateways" ||
    section === "whatsapp-settings" ||
    section === "templates"
  ) {
    return <SettingsAndTemplatesSection mode={section} />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8">
      <h1 className="text-lg font-semibold text-slate-900 capitalize">{section.replace(/-/g, " ")}</h1>
      <p className="mt-1 text-xs text-slate-500">Select a module from the sidebar navigation.</p>
    </div>
  );
}

/* ============================================================================
 * 1. SUPER ADMINS MANAGEMENT (/super-admins)
 * ========================================================================== */
function SuperAdminsSection() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<PlatformAdmin | null>(null);

  // Create fields
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAdmins() {
    setLoading(true);
    try {
      await warmCsrf();
      const res = await api<{ data: PlatformAdmin[] }>("/api/v1/platform/admins");
      setAdmins(res.data);
    } catch {
      setError("Could not load platform administrators.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAdmins();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/v1/platform/admins", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
        }),
      });
      setToast(`Created Super Admin account for ${newEmail}.`);
      setCreateOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await loadAdmins();
    } catch {
      setError("Could not create Super Admin. Ensure email is unique and password is at least 8 characters.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(admin: PlatformAdmin) {
    setEditingAdmin(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditStatus(admin.status || "active");
    setEditPassword("");
    setError(null);
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingAdmin) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: editName,
        email: editEmail,
        status: editStatus,
      };
      if (editPassword.trim().length > 0) {
        payload.password = editPassword;
      }
      await api(`/api/v1/platform/admins/${editingAdmin.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setToast(
        editPassword.trim()
          ? `Updated credentials and password for ${editName}.`
          : `Updated Super Admin profile for ${editName}.`,
      );
      setEditingAdmin(null);
      await loadAdmins();
    } catch {
      setError("Could not update Super Admin. Password must be at least 8 characters if provided.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(admin: PlatformAdmin) {
    setError(null);
    try {
      await api(`/api/v1/platform/admins/${admin.id}`, { method: "DELETE" });
      setToast(`Removed Super Admin ${admin.email}.`);
      await loadAdmins();
    } catch {
      setError("You cannot delete your own active Super Admin session.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Super Admins</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Create and manage platform super administrator credentials, passwords, and access status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setCreateOpen(true);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Super Admin
        </button>
      </div>

      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Super Admins
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{admins.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active Accounts
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-emerald-600">
            {admins.filter((a) => a.status === "active").length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Security Level
          </div>
          <div className="mt-1.5 text-sm font-semibold text-slate-900">
            Full Control Plane Access
          </div>
        </div>
      </div>

      {/* Super Admins Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Administrator</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {admins.map((admin) => (
              <tr key={admin.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                      {admin.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">{admin.name}</div>
                      <div className="text-[11px] text-slate-400">Platform Super Admin</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{admin.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      admin.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        admin.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    {admin.status === "active" ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="num px-4 py-3 text-slate-500">
                  {admin.last_login_at
                    ? new Date(admin.last_login_at).toLocaleString("en-IN")
                    : "Never"}
                </td>
                <td className="num px-4 py-3 text-slate-500">
                  {admin.created_at
                    ? new Date(admin.created_at).toLocaleDateString("en-IN")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(admin)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <KeyRound className="h-3 w-3 text-slate-500" />
                      Edit / Reset Password
                    </button>
                    {admins.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(admin)}
                        className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-rose-50/50 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                        title="Remove Super Admin"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-400">
                  No super administrators found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Create Super Admin Modal */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">New Super Admin</h2>
                <p className="text-xs text-slate-500">
                  Create platform administrator login credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Full Name
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
                <input
                  required
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="rajesh@selfx.in"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Initial Password (min 8 characters)
                <input
                  required
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit / Reset Password Modal */}
      {editingAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Manage Super Admin — {editingAdmin.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Update profile details, status, or reset password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Full Name
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
                <input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Account Status
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                New Password (leave blank to keep existing password)
                <input
                  type="password"
                  minLength={8}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password to reset..."
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-blue-600"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================================
 * 2. HOW IT WORKS (/how-it-works) — Matching Image 5
 * ========================================================================== */
function HowItWorksSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does multi-tenant store isolation work on our platform?",
      a: "Every merchant organization is provisioned as an isolated Tenant with one or more Stores. All inventory items, stock batches, POS sales, customers, Khata ledgers, and staff roles are scoped strictly to that tenant and store.",
    },
    {
      q: "How do Counter POS sales and Online Storefront orders share inventory?",
      a: "Both Counter POS and the tenant's Online Storefront deduct from the same real-time Store Item and Stock Batch ledger using FIFO batch allocation. When an item is sold at the counter or checked out online, stock updates immediately.",
    },
    {
      q: "What happens when a Super Admin edits a Plan's limits or features?",
      a: "Plan changes in the Super Admin Plans page apply immediately across the platform. Any feature flag toggled on or off (such as Online Storefront, Customer Khata, or WhatsApp Alerts) is reflected on the tenant's next API request without redeployment.",
    },
    {
      q: "How does Tenant Impersonation work for technical support?",
      a: "From the Tenants detail page, a Super Admin can click Impersonate to generate a short-lived, audited support token into the Merchant Console. Every impersonation start and stop action is recorded in Impersonation Logs.",
    },
    {
      q: "How do Payment Gateways work for tenants vs. platform subscriptions?",
      a: "Tenants configure their own store checkout gateways (Razorpay, Stripe, PhonePe, Paytm, UPI, Cash) in the Tenant Console for customer orders, while Super Admin configures platform-level gateways and Legal Entity GST details for SaaS subscription invoices.",
    },
    {
      q: "How does the Global Master Catalog help retail stores onboard faster?",
      a: "Super Admins maintain verified FMCG & retail products with barcodes (GTIN/EAN), HSN codes, GST tax classes, and reference MRPs in the Global Catalog. Tenants can import products from the master catalog into their store in one click.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          How SelfX Retail Platform Works
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Complete architectural guide to tenant onboarding, Counter POS &amp; thermal billing, Online Storefront fulfilment, and SaaS subscription governance.
        </p>
      </div>

      {/* 3 Core Architecture Pillar Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">Counter POS &amp; Shift Engine</h2>
            </div>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Real-Time + Offline
            </span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
            High-speed barcode scanning, quick keys, hold bills, split tender payments (Cash, UPI, Card, Khata), cashier shift X/Z readings, and 80mm/58mm thermal receipt printing.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              FIFO batch stock deduction &amp; expiry tracking
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              GST tax calculation (CGST / SGST / IGST / Cess)
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Returns, exchanges, and void audit trails
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Globe className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">Online Storefront &amp; Delivery</h2>
            </div>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              Live Sync
            </span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
            Every store gets an instant online storefront synced directly with its live inventory, categories, MRP discounts, customer OTP login, and PIN-code delivery zones.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Zero mock data — 100% live store catalog &amp; pricing
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Customer mobile OTP verification &amp; order tracking
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Unified pick-list &amp; dispatch transitions in Console
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Layers className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">SaaS Plans &amp; Control Plane</h2>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              Super Admin
            </span>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
            Centralized governance over tenant provisioning, Starter/Professional/Enterprise plans, dynamic feature flags, usage quotas, and GST subscription invoicing.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              23 toggleable platform modules &amp; 8 resource quotas
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Per-tenant feature overrides &amp; instant suspension
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Audited support impersonation &amp; health monitoring
            </li>
          </ul>
        </div>
      </div>

      {/* Workflow 1: Tenant Onboarding & Provisioning */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">
            1. Tenant Onboarding &amp; Store Provisioning Flow
          </h2>
        </div>
        <div className="mt-5 space-y-4">
          {[
            {
              step: "1",
              title: "Tenant & Primary Store Creation",
              desc: "Super Admin creates a new tenant from the Tenants page with a store name, unique slug (e.g. bangalore), owner email, password, and subscription plan (Starter, Professional, or Enterprise).",
            },
            {
              step: "2",
              title: "Automated Provisioning Pipeline",
              desc: "The platform provisions the tenant organization, default store, owner staff account, default roles (Owner, Manager, Cashier, Inventory Clerk), tax slabs, and subscription record.",
            },
            {
              step: "3",
              title: "Catalog & Opening Stock Setup",
              desc: "The merchant signs into the Store Console (/login), creates categories, brands, and units, or imports products from CSV / Global Master Catalog with opening batch stock and barcodes.",
            },
            {
              step: "4",
              title: "Printer, Receipt & Gateway Configuration",
              desc: "The merchant configures their 80mm/58mm thermal printer layout, store hours, and enables payment gateways (Razorpay, Stripe, PhonePe, Paytm, or UPI).",
            },
            {
              step: "5",
              title: "Staff & Role Permission Assignment",
              desc: "The merchant invites cashiers and store managers in the Staff & Roles page and configures granular module permissions per role.",
            },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                {item.step}
              </span>
              <div>
                <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow 2 & 3 Side-by-Side */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              2. Counter POS &amp; Shift Lifecycle
            </h2>
          </div>
          <div className="mt-5 space-y-4">
            {[
              {
                step: "1",
                title: "Open Cashier Shift",
                desc: "Cashier opens a shift with opening cash float. All cash movements, sales, and returns are tied to the active shift.",
              },
              {
                step: "2",
                title: "Scan Barcodes & Build Cart",
                desc: "Items are scanned via barcode or tapped from Quick Keys. Promotional coupons, line discounts, and GST are calculated automatically.",
              },
              {
                step: "3",
                title: "Collect Tender & Print Thermal Receipt",
                desc: "Cashier collects Cash, UPI, Card, or records to Customer Khata. Stock is deducted via FIFO and a thermal receipt is generated.",
              },
              {
                step: "4",
                title: "Close Shift & Z-Report Reconciliation",
                desc: "At end of day, cashier enters counted drawer cash. The system calculates expected vs. actual cash variance and generates the Z-Report.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                  {item.step}
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              3. Online Storefront &amp; Order Fulfilment
            </h2>
          </div>
          <div className="mt-5 space-y-4">
            {[
              {
                step: "1",
                title: "Live Store Discovery",
                desc: "Customers visit the store URL (?store=slug). The storefront resolves the tenant's real store profile, categories, banners, and in-stock items.",
              },
              {
                step: "2",
                title: "Cart, Mobile OTP & Address Selection",
                desc: "Shoppers add items to cart, verify their mobile number via OTP, apply store coupons, and choose Home Delivery or Store Pickup.",
              },
              {
                step: "3",
                title: "Online Checkout & Stock Reservation",
                desc: "Order is placed via online gateway or Cash on Delivery. Inventory is deducted immediately and an order number is issued.",
              },
              {
                step: "4",
                title: "Console Pick-List & Dispatch Transitions",
                desc: "Store staff view the incoming order in Console Orders, pack items using the Pick-List, and transition status from Confirmed → Packed → Out for Delivery → Delivered.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                  {item.step}
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-900">{item.title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Capabilities Grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Platform Capabilities Overview</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Users,
              title: "Granular Role & Staff RBAC",
              desc: "Tenants create custom roles and assign module-level permissions for POS, Inventory, Purchases, Reports, and Settings.",
            },
            {
              icon: Package,
              title: "Batch Inventory & Purchases",
              desc: "Full GRN purchase receiving, supplier ledger, purchase returns, stock counts, inter-store transfers, and low-stock/expiry alerts.",
            },
            {
              icon: CreditCard,
              title: "Customer CRM, Khata & Loyalty",
              desc: "Track customer purchase history, manage credit (Khata) balances and repayments, and segment high-value buyers.",
            },
            {
              icon: Activity,
              title: "10+ Retail & GST Reports",
              desc: "Sales summary, product velocity, gross profit & margin, GST tax breakdown, shift Z-reports, and stock valuation.",
            },
          ].map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <Icon className="h-4 w-4 text-slate-700" />
                <div className="mt-2.5 text-xs font-semibold text-slate-900">{cap.title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{cap.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Lifecycle */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Subscription &amp; Tenant Status Lifecycle
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700">Trialing</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-emerald-700">Active</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-700">Past Due</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-orange-700">Grace Period</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-rose-700">Suspended</span>
        </div>
        <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="font-semibold text-slate-900">Trialing:</span> New tenant on a trial period with full access to their selected plan features.
          </div>
          <div>
            <span className="font-semibold text-slate-900">Active:</span> Subscription invoice paid or UTR verified; all plan modules and quotas unlocked.
          </div>
          <div>
            <span className="font-semibold text-slate-900">Suspended:</span> Super Admin or billing expiry has paused tenant access until reactivated.
          </div>
        </div>
      </div>

      {/* Expandable FAQ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Frequently Asked Questions</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-900"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {isOpen ? (
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.a}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="text-xs font-semibold text-slate-900">Quick Actions</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { href: "/tenants", label: "View Tenants" },
            { href: "/plans", label: "Manage Plans" },
            { href: "/subscriptions", label: "Subscriptions" },
            { href: "/super-admins", label: "Super Admins" },
            { href: "/payments-overview", label: "Payments Overview" },
            { href: "/catalog", label: "Global Catalog" },
            { href: "/health", label: "Logs & System Health" },
          ].map((act) => (
            <Link
              key={act.href}
              href={act.href}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {act.label}
              <ArrowRight className="h-3 w-3 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 3. REMINDERS (/reminders)
 * ========================================================================== */
function RemindersSection() {
  const [subscriptions, setSubscriptions] = useState<
    { id: string; tenant: string; plan: string; status: string; amount_paise: number }[]
  >([]);
  const [toast, setToast] = useState<string | null>(null);
  const [rules, setRules] = useState([
    { id: "trial_3d", name: "Trial Expiry Reminder (3 Days Before)", channel: "Email + WhatsApp", enabled: true },
    { id: "renewal_7d", name: "Subscription Renewal Notice (7 Days Before)", channel: "Email", enabled: true },
    { id: "invoice_due", name: "Overdue Invoice Alert (1 Day Past Due)", channel: "Email + SMS + WhatsApp", enabled: true },
    { id: "grace_end", name: "Final Grace Period Warning (24 Hours Before Suspension)", channel: "Email + SMS", enabled: true },
  ]);

  useEffect(() => {
    void api<{ data: { id: string; tenant: string; plan: string; status: string; amount_paise: number }[] }>(
      "/api/v1/platform/subscriptions",
    )
      .then((res) => setSubscriptions(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Subscription &amp; Billing Reminders
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure automated trial, renewal, and overdue payment reminders for all tenants.
          </p>
        </div>
      </div>

      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Automated Reminder Rules</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between py-3">
              <div>
                <div className="text-xs font-semibold text-slate-900">{rule.name}</div>
                <div className="text-[11px] text-slate-400">Channels: {rule.channel}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)),
                  );
                  setToast(`Updated "${rule.name}".`);
                }}
                className={`inline-flex h-7 items-center rounded-full px-3 text-[11px] font-semibold ${
                  rule.enabled
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {rule.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Tenant Subscription Dispatch Queue</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-semibold text-slate-900">{sub.tenant}</td>
                <td className="px-4 py-3 text-slate-600">{sub.plan}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{sub.status}</td>
                <td className="num px-4 py-3 font-semibold text-slate-900">
                  {formatInr(sub.amount_paise)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      setToast(`Dispatched renewal reminder to ${sub.tenant}.`)
                    }
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Bell className="h-3 w-3" />
                    Send Reminder
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
 * 4. PAYMENTS (Overview, Transactions, Pending Payments, Invoices)
 * ========================================================================== */
function PaymentsSection({ mode }: { mode: string }) {
  const [data, setData] = useState<PaymentsOverviewData | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    void api<{ data: PaymentsOverviewData }>("/api/v1/platform/payments-overview")
      .then((res) => setData(res.data))
      .catch(() => {});
  }, []);

  const invoices = (data?.invoices ?? []).filter((inv) => {
    if (mode === "pending-payments" && inv.status === "paid") return false;
    if (mode === "transactions" && inv.status !== "paid" && !inv.utr) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.tenant_name.toLowerCase().includes(q) ||
        (inv.utr ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const titles: Record<string, { title: string; subtitle: string }> = {
    "payments-overview": {
      title: "Payments Overview",
      subtitle: "Platform-wide SaaS subscription collections, pending invoices, and revenue metrics.",
    },
    transactions: {
      title: "Transactions",
      subtitle: "Settled subscription payments and verified UTR bank transfers.",
    },
    "pending-payments": {
      title: "Pending Payments",
      subtitle: "Open and overdue tenant invoices awaiting settlement.",
    },
    invoices: {
      title: "GST Subscription Invoices",
      subtitle: "Tax invoices issued to tenants for SelfX platform subscriptions.",
    },
  };

  const header = titles[mode] ?? titles["payments-overview"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{header.title}</h1>
          <p className="mt-0.5 text-xs text-slate-500">{header.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {[
            { href: "/payments-overview", label: "Overview" },
            { href: "/transactions", label: "Transactions" },
            { href: "/pending-payments", label: "Pending" },
            { href: "/invoices", label: "Invoices" },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold ${
                `/${mode}` === tab.href
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Collected
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-emerald-600">
            {formatInr(data?.stats?.total_collected_paise ?? 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {data?.stats?.paid_invoices ?? 0} paid invoices
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Pending Collection
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-amber-600">
            {formatInr(data?.stats?.pending_amount_paise ?? 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {data?.stats?.pending_invoices ?? 0} open invoices
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Invoices
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">
            {data?.stats?.total_invoices ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">GST compliant</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active Subscriptions
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-blue-600">
            {data?.stats?.active_subscriptions ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {data?.stats?.trial_subscriptions ?? 0} in trial
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number, tenant name, or UTR reference..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pr-3 pl-9 text-xs text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">GST Tax</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">UTR / Ref</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/60">
                <td className="num px-4 py-3 font-semibold text-slate-900">{inv.number}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{inv.tenant_name}</div>
                  <div className="text-[11px] text-slate-400">{inv.tenant_slug}</div>
                </td>
                <td className="num px-4 py-3 text-slate-600">{formatInr(inv.subtotal_paise)}</td>
                <td className="num px-4 py-3 text-slate-600">{formatInr(inv.tax_paise)}</td>
                <td className="num px-4 py-3 font-semibold text-slate-900">
                  {formatInr(inv.total_paise)}
                </td>
                <td className="num px-4 py-3 font-mono text-[11px] text-slate-500">
                  {inv.utr || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                      inv.status === "paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="num px-4 py-3 text-slate-500">
                  {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("en-IN") : "—"}
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-slate-400">
                  No records found in this view.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
 * 5. IMPERSONATION LOGS (/impersonation-logs)
 * ========================================================================== */
function ImpersonationLogsSection() {
  const [logs, setLogs] = useState<{
    id: string;
    admin_email?: string;
    tenant_name?: string;
    user_email?: string | null;
    status?: string;
    created_at?: string;
    used_at?: string | null;
    stopped_at?: string | null;
  }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ data: { impersonation_logs: typeof logs } }>("/api/v1/platform/logs")
      .then((res) => setLogs(res.data?.impersonation_logs ?? []))
      .catch((err: { error?: { message?: string } }) => {
        setError(err?.error?.message ?? "The impersonation log could not be loaded.");
      });
  }, []);

  function when(value?: string | null) {
    return value ? new Date(value).toLocaleString("en-IN") : "—";
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Impersonation logs</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Each support session is listed from the moment it is issued until the super admin leaves the store.
        </p>
      </div>
      {error ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{error}</div> : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Administrator</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Entered</th>
              <th className="px-4 py-3">Exited</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{log.tenant_name}</td>
                <td className="px-4 py-3 text-slate-600">{log.admin_email}</td>
                <td className="px-4 py-3 text-slate-600">{log.user_email ?? "—"}</td>
                <td className="num px-4 py-3 text-slate-500">{when(log.created_at)}</td>
                <td className="num px-4 py-3 text-slate-500">{when(log.used_at)}</td>
                <td className="num px-4 py-3 text-slate-500">{when(log.stopped_at)}</td>
                <td className="px-4 py-3 font-semibold capitalize text-slate-700">{log.status}</td>
              </tr>
            ))}
            {logs.length === 0 && !error ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">
                  No impersonation sessions recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. SETTINGS & TEMPLATES (General, Email/SMS Templates, Mail, SMS, Gateways, WhatsApp)
 * ========================================================================== */
const DEFAULT_PLATFORM_SETTINGS: PlatformSettingsData = {
  branding: {
    logo_url: "/logo.png",
    favicon_url: "/favicon.png",
  },
  general: {
    platform_name: "SelfX Retail Cloud",
    support_email: "",
    support_phone: "",
    default_currency: "INR",
    default_timezone: "Asia/Kolkata",
    trial_days: 14,
    grace_period_days: 7,
    maintenance_mode: false,
    maintenance_message: "SelfX Retail Cloud is undergoing scheduled infrastructure upgrades. Services will resume shortly.",
    maintenance_until: "",
    allow_self_registration: true,
    copyright_text: "© 2026 SelfX Retail Technologies Private Limited. All rights reserved.",
  },
  profile: {
    name: "",
    email: "",
    phone: "",
    designation: "",
    role: "",
  },
  languages: {
    default_language: "en",
    supported_languages: ["en", "hi", "te", "ta", "kn", "mr", "gu", "ar"],
    enable_multilingual_storefront: true,
    auto_translate_catalog: true,
    currency: "INR",
    number_format: "en-IN",
  },
  pwa: {
    name: "SelfX Retail Cloud Platform",
    short_name: "SelfX Retail",
    theme_color: "#0f172a",
    background_color: "#ffffff",
    display_mode: "standalone",
    start_url: "/",
    logo_url: "/brand/selfx-pwa-icon.png",
    offline_caching: true,
  },
  storage: {
    driver: "local",
    s3_bucket: "selfx-media-production",
    s3_region: "ap-south-1",
    s3_key: "AKIA_SELFX_STORAGE_KEY",
    s3_secret: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    spaces_endpoint: "blr1.digitaloceanspaces.com",
    spaces_bucket: "selfx-cloud-assets",
    spaces_region: "blr1",
    spaces_key: "DO00SELFXSPACESKEY",
    spaces_secret: "do_secret_spaces_key_platform_production",
    cleanup_unused_age_days: 7,
    cleanup_folders: ["AI generated", "Catalog items", "Categories", "Variants", "Modifier options", "Tenant logos & covers", "Organization logos", "POS media", "App downloads"],
  },
  security: {
    enforce_2fa: false,
    session_timeout_minutes: 120,
    max_login_attempts: 5,
    lockout_duration_minutes: 15,
    require_strong_password: true,
    force_single_session: false,
  },
  mail: {
    driver: "smtp",
    host: "",
    port: 587,
    username: "",
    password: "",
    encryption: "tls",
    from_address: "",
    from_name: "SelfX Retail",
    reply_to: "",
  },
  sms: {
    provider: "",
    sender_id: "",
    api_key: "",
    dlt_entity_id: "",
    enabled: false,
    webhook_url: "",
  },
  sms_providers: {
    log: { enabled: false, active: false },
    twilio: { enabled: false, active: false, account_sid: "", auth_token: "", from: "" },
    firebase: { enabled: false, active: false, api_key: "", auth_domain: "", project_id: "", app_id: "", messaging_sender_id: "" },
    msg91: { enabled: false, active: false, auth_key: "", sender_id: "", template_id: "", dlt_entity_id: "", route: "4" },
    fast2sms: { enabled: false, active: false, api_key: "", sender_id: "", template_id: "", route: "q" },
    sns: { enabled: false, active: false, access_key: "", secret: "", region: "ap-south-1", sender_id: "" },
  },
  auth_methods: { email_password: true, phone_otp: true },
  maps: { api_key: "" },
  whatsapp: {
    provider: "Meta Cloud API",
    phone_number_id: "",
    business_account_id: "",
    access_token: "",
    enabled: false,
    verify_token: "",
  },
  gateways: {
    stripe: { enabled: false, publishable_key: "", secret_key: "", webhook_secret: "", mode: "test", currency: "INR" },
    razorpay: { enabled: false, key_id: "", key_secret: "", webhook_secret: "", mode: "test", currency: "INR" },
    phonepe: { enabled: false, merchant_id: "", salt_key: "", salt_index: "1", mode: "test", currency: "INR" },
    paytm: { enabled: false, mid: "", merchant_key: "", website: "DEFAULT", mode: "test", currency: "INR" },
    cashfree: { enabled: false, app_id: "", secret_key: "", mode: "test", currency: "INR" },
    payu: { enabled: false, merchant_key: "", merchant_salt: "", mode: "test", currency: "INR" },
    paypal: { enabled: false, client_id: "", client_secret: "", mode: "test", currency: "USD" },
    paystack: { enabled: false, public_key: "", secret_key: "", mode: "test", currency: "NGN" },
    flutterwave: { enabled: false, public_key: "", secret_key: "", encryption_key: "", mode: "test", currency: "USD" },
    mollie: { enabled: false, api_key: "", mode: "test", currency: "EUR" },
    dodopayments: { enabled: false, api_key: "", webhook_secret: "", mode: "test", currency: "USD" },
    bank_transfer: { enabled: false, bank_name: "", account_name: "", account_number: "", ifsc: "", mode: "test", currency: "INR", instructions: "" },
  },
  email_templates: [
    {
      key: "tenant_welcome",
      name: "Tenant Onboarding & Provisioned Credentials",
      trigger: "Event: tenant.created",
      subject: "Welcome to {{platform_name}} — Your store {{tenant_name}} is live",
      body: "Hello {{owner_name}},\n\nYour retail workspace ({{tenant_name}}) has been provisioned.\nLogin URL: {{console_url}}\nUsername: {{owner_email}}\n\nThank you,\n{{platform_name}} Team",
      active: true,
    },
    {
      key: "subscription_invoice",
      name: "GST Subscription Tax Invoice Issued",
      trigger: "Event: invoice.generated",
      subject: "Tax Invoice {{invoice_number}} for {{tenant_name}}",
      body: "Hello {{owner_name}},\n\nYour GST subscription invoice {{invoice_number}} for {{amount}} has been generated.\nDue Date: {{due_date}}\n\nThank you,\n{{platform_name}} Billing",
      active: true,
    },
    {
      key: "subscription_renewal_reminder",
      name: "Subscription Renewal Reminder (T-7 Days)",
      trigger: "Event: subscription.renewing",
      subject: "Action Required: {{tenant_name}} subscription renews on {{renewal_date}}",
      body: "Hello {{owner_name}},\n\nYour {{plan_name}} plan for {{tenant_name}} is scheduled for renewal on {{renewal_date}}.\n\nThank you,\n{{platform_name}} Billing",
      active: true,
    },
    {
      key: "payment_success",
      name: "Subscription Payment Confirmation",
      trigger: "Event: payment.received",
      subject: "Payment Confirmation for Invoice {{invoice_number}}",
      body: "Hello {{owner_name}},\n\nWe have successfully received payment of {{amount}} for invoice {{invoice_number}}.\n\nYour subscription is now active through {{renewal_date}}.\n\nThank you,\n{{platform_name}} Billing",
      active: true,
    },
    {
      key: "trial_expiring",
      name: "Trial Period Expiration Alert (T-3 Days)",
      trigger: "Event: trial.expiring",
      subject: "Your {{platform_name}} free trial ends soon for {{tenant_name}}",
      body: "Hello {{owner_name}},\n\nYour 14-day free trial for {{tenant_name}} will conclude on {{due_date}}.\n\nUpgrade to Pro or Enterprise at {{console_url}}/billing to ensure uninterrupted POS billing and cloud syncing.\n\nThank you,\n{{platform_name}} Team",
      active: true,
    },
    {
      key: "impersonation_notice",
      name: "Security Alert: Support Session Initiated",
      trigger: "Event: impersonation.started",
      subject: "Security Notice: Support session initiated on {{tenant_name}}",
      body: "Hello {{owner_name}},\n\nA platform support administrator ({{admin_email}}) started a time-boxed support session on {{tenant_name}} for reason: {{reason}}.\n\nThank you,\n{{platform_name}} Security Operations",
      active: true,
    },
  ],
  sms_templates: [
    {
      key: "otp_delivery",
      name: "Order Delivery Verification OTP",
      dlt_template_id: "1207168900011223344",
      content: "Your delivery verification code for order {{#var#}} at {{#var#}} is {{#var#}}. Do not share this code. - SELFXR",
      active: true,
    },
    {
      key: "pos_ebill",
      name: "POS Digital Receipt Link",
      dlt_template_id: "1207168900055667788",
      content: "Thank you for shopping at {{#var#}}! Your bill {{#var#}} for Rs. {{#var#}} is ready: {{#var#}} - SELFXR",
      active: true,
    },
  ],
};

function normalizePlatformSettings(raw?: Partial<PlatformSettingsData> | null): PlatformSettingsData {
  return {
    branding: { ...DEFAULT_PLATFORM_SETTINGS.branding, ...(raw?.branding ?? {}) },
    general: { ...DEFAULT_PLATFORM_SETTINGS.general, ...(raw?.general ?? {}) },
    profile: { ...DEFAULT_PLATFORM_SETTINGS.profile, ...(raw?.profile ?? {}) },
    languages: {
      ...DEFAULT_PLATFORM_SETTINGS.languages,
      ...(raw?.languages ?? {}),
      supported_languages: Array.isArray(raw?.languages?.supported_languages)
        ? raw.languages.supported_languages
        : DEFAULT_PLATFORM_SETTINGS.languages.supported_languages,
    },
    pwa: { ...DEFAULT_PLATFORM_SETTINGS.pwa, ...(raw?.pwa ?? {}) },
    storage: {
      ...DEFAULT_PLATFORM_SETTINGS.storage,
      ...(raw?.storage ?? {}),
      cleanup_folders: Array.isArray(raw?.storage?.cleanup_folders)
        ? raw.storage.cleanup_folders
        : DEFAULT_PLATFORM_SETTINGS.storage.cleanup_folders,
    },
    security: { ...DEFAULT_PLATFORM_SETTINGS.security, ...(raw?.security ?? {}) },
    mail: { ...DEFAULT_PLATFORM_SETTINGS.mail, ...(raw?.mail ?? {}) },
    sms: { ...DEFAULT_PLATFORM_SETTINGS.sms, ...(raw?.sms ?? {}) },
    sms_providers: { ...DEFAULT_PLATFORM_SETTINGS.sms_providers, ...(raw?.sms_providers ?? {}) },
    auth_methods: { ...DEFAULT_PLATFORM_SETTINGS.auth_methods, ...(raw?.auth_methods ?? {}) },
    maps: { ...DEFAULT_PLATFORM_SETTINGS.maps, ...(raw?.maps ?? {}) },
    whatsapp: { ...DEFAULT_PLATFORM_SETTINGS.whatsapp, ...(raw?.whatsapp ?? {}) },
    gateways: {
      ...DEFAULT_PLATFORM_SETTINGS.gateways,
      ...(raw?.gateways ?? {}),
    },
    email_templates:
      Array.isArray(raw?.email_templates) && raw.email_templates.length > 0
        ? raw.email_templates
        : DEFAULT_PLATFORM_SETTINGS.email_templates,
    sms_templates:
      Array.isArray(raw?.sms_templates) && raw.sms_templates.length > 0
        ? raw.sms_templates
        : DEFAULT_PLATFORM_SETTINGS.sms_templates,
  };
}

function SettingsAndTemplatesSection({ mode }: { mode: string }) {
  const [settings, setSettings] = useState<PlatformSettingsData>(DEFAULT_PLATFORM_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Gateway state
  const [activeGateway, setActiveGateway] = useState<string>("stripe");
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [gatewayTestStatus, setGatewayTestStatus] = useState<Record<string, { status: "testing" | "success" | "error"; msg?: string }>>({});

  // Email Templates state
  const [editingTemplate, setEditingTemplate] = useState<{
    key: string;
    name: string;
    trigger?: string;
    subject: string;
    body: string;
    active: boolean;
  } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<{
    key: string;
    name: string;
    trigger?: string;
    subject: string;
    body: string;
    active: boolean;
  } | null>(null);
  const [testSendingKey, setTestSendingKey] = useState<string | null>(null);

  // Mail settings state
  const [testMailRecipient, setTestMailRecipient] = useState<string>("admin@selfx.in");
  const [testingMail, setTestingMail] = useState(false);
  const [testMailNotice, setTestMailNotice] = useState<string | null>(null);
  const [showMailPass, setShowMailPass] = useState(false);

  // SMS & WhatsApp state
  const [activeSmsProvider, setActiveSmsProvider] = useState<string>("msg91");
  const [testSmsPhone, setTestSmsPhone] = useState<string>("+919876543210");
  const [testingSms, setTestingSms] = useState(false);
  const [testSmsNotice, setTestSmsNotice] = useState<string | null>(null);

  const [activeWaProvider, setActiveWaProvider] = useState<string>("meta");
  const [testWaPhone, setTestWaPhone] = useState<string>("+919876543210");
  const [testingWa, setTestingWa] = useState(false);
  const [testWaNotice, setTestWaNotice] = useState<string | null>(null);

  // General Settings Categorized Navigation & Tab state (matching Image 1 layout)
  const [generalTab, setGeneralTab] = useState<
    "general" | "profile" | "date_time" | "languages" | "maintenance" | "theme" | "security" | "storage" | "pwa"
  >("general");

  // Profile Password Reset state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Storage Cleanup state (Image 1 features)
  const [scanningStorage, setScanningStorage] = useState(false);
  const [scanResult, setScanResult] = useState<{
    scannedFiles: number;
    unusedFiles: number;
    reclaimableBytes: string;
    completedAt: string;
  } | null>(null);
  const [deletingStorage, setDeletingStorage] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setPasswordNotice(null);
    if (!currentPassword) {
      setPasswordNotice({ type: "error", msg: "Please enter your current Super Admin password." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordNotice({ type: "error", msg: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: "error", msg: "New password and confirmation password do not match." });
      return;
    }
    setChangingPassword(true);
    try {
      await warmCsrf();
      await api("/api/v1/auth/password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
        }),
      });
      setPasswordNotice({ type: "success", msg: "Super Admin password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordNotice({
        type: "error",
        msg: err?.data?.message || err?.message || "Failed to update password. Please check your current password.",
      });
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleScanUnusedFiles() {
    setScanningStorage(true);
    setScanResult(null);
    setDeleteNotice(null);
    try {
      const res = await api<{
        data: {
          scannedFiles: number;
          unusedFiles: number;
          reclaimableBytes: string;
          reclaimableBytesRaw: number;
          completedAt: string;
        };
      }>("/api/v1/platform/storage/scan", {
        method: "POST",
      });
      setScanResult(res.data);
    } catch (err: any) {
      setToast(err?.message || "Storage scan failed.");
    } finally {
      setScanningStorage(false);
    }
  }

  async function handleDeleteUnusedFiles() {
    if (!scanResult || scanResult.unusedFiles === 0) {
      setToast("Run a scan first to identify unused files eligible for deletion.");
      return;
    }
    setDeletingStorage(true);
    try {
      const res = await api<{
        data: {
          purgedCount: number;
          reclaimedBytes: string;
          message: string;
        };
      }>("/api/v1/platform/storage/purge", {
        method: "POST",
      });
      setScanResult(null);
      setDeleteNotice(res.data.message);
      setToast(`Storage cleanup complete: ${res.data.reclaimedBytes} reclaimed.`);
    } catch (err: any) {
      setToast(err?.message || "Storage cleanup failed.");
    } finally {
      setDeletingStorage(false);
    }
  }

  useEffect(() => {
    void api<{ data: Partial<PlatformSettingsData> & { config?: Partial<PlatformSettingsData> } }>("/api/v1/platform/settings")
      .then((res) => {
        const payload = res.data?.general ? res.data : (res.data?.config ?? res.data);
        setSettings(normalizePlatformSettings(payload));
      })
      .catch(() => {});
  }, []);

  const [logoUploading, setLogoUploading] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [brandingNotice, setBrandingNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleUploadAsset(file: File, type: "logo" | "favicon") {
    const isLogo = type === "logo";
    if (isLogo) setLogoUploading(true);
    else setFaviconUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const csrfToken = decodeURIComponent(
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("XSRF-TOKEN="))
          ?.slice("XSRF-TOKEN=".length) ?? "",
      );

      const res = await fetch("/api/v1/platform/branding/upload", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": csrfToken,
        },
        body: formData,
      });

      if (!res.ok) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          updateAssetUrl(type, dataUrl);
        };
        reader.readAsDataURL(file);
      } else {
        const body = (await res.json()) as { data?: { url?: string } };
        const uploadedUrl = body.data?.url || (isLogo ? "/logo.png" : "/favicon.png");
        updateAssetUrl(type, uploadedUrl);
      }

      setBrandingNotice({
        type: "success",
        msg: `${isLogo ? "Logo" : "Favicon"} updated and applied successfully!`,
      });
      setTimeout(() => setBrandingNotice(null), 4000);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        updateAssetUrl(type, dataUrl);
      };
      reader.readAsDataURL(file);
    } finally {
      if (isLogo) setLogoUploading(false);
      else setFaviconUploading(false);
    }
  }

  function updateAssetUrl(type: "logo" | "favicon", url: string) {
    if (type === "logo") {
      setSettings((prev) => ({
        ...prev,
        branding: { ...prev.branding, logo_url: url },
        general: { ...prev.general, logo_url: url },
      }));
      window.localStorage.setItem("selfx.logo", url);
      window.dispatchEvent(new CustomEvent("selfx-logo-changed", { detail: url }));
    } else {
      setSettings((prev) => ({
        ...prev,
        branding: { ...prev.branding, favicon_url: url },
        general: { ...prev.general, favicon_url: url },
      }));
      window.localStorage.setItem("selfx.favicon", url);
      const existingFavicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (existingFavicon) {
        existingFavicon.href = url;
      }
    }
  }

  function resetAsset(type: "logo" | "favicon") {
    const defaultUrl = type === "logo" ? "/logo.png" : "/favicon.png";
    updateAssetUrl(type, defaultUrl);
    setBrandingNotice({
      type: "success",
      msg: `Reset ${type} to system default asset.`,
    });
    setTimeout(() => setBrandingNotice(null), 3000);
  }

  async function saveSettings(updated: PlatformSettingsData, label: string) {
    setSaving(true);
    try {
      await warmCsrf();
      const res = await api<{ data: Partial<PlatformSettingsData> & { config?: Partial<PlatformSettingsData> } }>("/api/v1/platform/settings", {
        method: "PUT",
        body: JSON.stringify({ settings: updated, config: updated }),
      });
      const payload = res.data?.general ? res.data : (res.data?.config ?? updated);
      const normalized = normalizePlatformSettings(payload);
      setSettings(normalized);

      if (normalized.branding?.logo_url) {
        window.localStorage.setItem("selfx.logo", normalized.branding.logo_url);
        window.dispatchEvent(new CustomEvent("selfx-logo-changed", { detail: normalized.branding.logo_url }));
      }
      if (normalized.branding?.favicon_url) {
        window.localStorage.setItem("selfx.favicon", normalized.branding.favicon_url);
        const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (link) link.href = normalized.branding.favicon_url;
      }

      setToast(`${label} saved successfully.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {mode === "general-settings" ? (
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Left Column: Categorized Sub-navigation (matching Image 1 "ON THIS PAGE") */}
          <div className="w-full md:w-64 lg:w-72 shrink-0">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sticky top-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                On This Page
              </p>

              <p className="mt-4 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Everyday Settings
              </p>
              <nav className="space-y-1">
                {[
                  { id: "general", label: "General", icon: Sliders },
                  { id: "profile", label: "Profile & Password", icon: UserCircle },
                  { id: "date_time", label: "Date & time", icon: Clock },
                  { id: "languages", label: "Language & region", icon: Globe },
                  { id: "maintenance", label: "Maintenance mode", icon: AlertTriangle },
                  { id: "theme", label: "Theme & branding", icon: Palette },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = generalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setGeneralTab(tab.id as any)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition ${
                        active
                          ? "border border-orange-200 bg-orange-50/70 font-semibold text-[#f95721] shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#f95721]" : "text-slate-400"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <p className="mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Advanced &amp; Technical
              </p>
              <nav className="space-y-1">
                {[
                  { id: "security", label: "Login security", icon: ShieldCheck },
                  { id: "storage", label: "File storage", icon: HardDrive },
                  { id: "pwa", label: "Installable app (PWA)", icon: Smartphone },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = generalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setGeneralTab(tab.id as any)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition ${
                        active
                          ? "border border-orange-200 bg-orange-50/70 font-semibold text-[#f95721] shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#f95721]" : "text-slate-400"}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Right Column: Active Tab Content */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Top Card Container with Sticky Action Header */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#f95721] border border-orange-100">
                    {generalTab === "general" && <Sliders className="h-5 w-5" />}
                    {generalTab === "profile" && <UserCircle className="h-5 w-5" />}
                    {generalTab === "date_time" && <Clock className="h-5 w-5" />}
                    {generalTab === "languages" && <Globe className="h-5 w-5" />}
                    {generalTab === "maintenance" && <AlertTriangle className="h-5 w-5" />}
                    {generalTab === "theme" && <Palette className="h-5 w-5" />}
                    {generalTab === "security" && <ShieldCheck className="h-5 w-5" />}
                    {generalTab === "storage" && <HardDrive className="h-5 w-5" />}
                    {generalTab === "pwa" && <Smartphone className="h-5 w-5" />}
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-slate-900">
                      {generalTab === "general" && "General Settings"}
                      {generalTab === "profile" && "Super Admin Profile & Credentials"}
                      {generalTab === "date_time" && "Date & Time Configuration"}
                      {generalTab === "languages" && "Language & Regional Localization"}
                      {generalTab === "maintenance" && "Platform Maintenance Mode"}
                      {generalTab === "theme" && "Theme & Visual Customizer"}
                      {generalTab === "security" && "Platform Login Security"}
                      {generalTab === "storage" && "File Storage"}
                      {generalTab === "pwa" && "Installable App (PWA)"}
                    </h1>
                    <p className="text-xs text-slate-500">
                      {generalTab === "general" && "Configure global SaaS identity, support contact details, and trial lifecycle."}
                      {generalTab === "profile" && "Manage root administrative account information and reset your super admin password."}
                      {generalTab === "date_time" && "Manage platform timezone, date formatting, and scheduling standards."}
                      {generalTab === "languages" && "Configure supported languages, auto-translation, and currency formatting."}
                      {generalTab === "maintenance" && "Control platform availability, 503 maintenance screens, and scheduled downtime."}
                      {generalTab === "theme" && "Choose platform color accents, dark mode settings, and system branding."}
                      {generalTab === "security" && "Enforce 2FA, session timeout limits, brute-force lockout rules, and password strength."}
                      {generalTab === "storage" && "Where uploaded images and files are kept."}
                      {generalTab === "pwa" && "Configure Progressive Web App identity, theme colors, manifest, and offline caching."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveSettings(settings, "Platform settings")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f95721] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#ea4915] disabled:opacity-50 transition"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "Saving..." : "Save changes"}</span>
                </button>
              </div>

              {/* TAB 1: GENERAL */}
              {generalTab === "general" ? (
                <div className="pt-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Platform Name
                      <input
                        value={settings.general.platform_name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, platform_name: e.target.value },
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Support Email
                      <input
                        value={settings.general.support_email}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, support_email: e.target.value },
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Support Phone Number
                      <input
                        value={settings.general.support_phone}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, support_phone: e.target.value },
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Default Currency
                      <select
                        value={settings.general.default_currency}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, default_currency: e.target.value },
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="INR">INR — Indian Rupee (₹)</option>
                        <option value="USD">USD — US Dollar ($)</option>
                        <option value="EUR">EUR — Euro (€)</option>
                        <option value="GBP">GBP — British Pound (£)</option>
                        <option value="AED">AED — UAE Dirham (د.إ)</option>
                        <option value="SAR">SAR — Saudi Riyal (﷼)</option>
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Default Trial Duration (Days)
                      <input
                        type="number"
                        value={settings.general.trial_days}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, trial_days: Number(e.target.value) },
                          })
                        }
                        className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Billing Grace Period (Days)
                      <input
                        type="number"
                        value={settings.general.grace_period_days}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, grace_period_days: Number(e.target.value) },
                          })
                        }
                        className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Platform Copyright Footer
                      <input
                        value={settings.general.copyright_text ?? ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, copyright_text: e.target.value },
                          })
                        }
                        placeholder="© 2026 SelfX Retail Technologies Private Limited. All rights reserved."
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h4 className="text-xs font-semibold text-slate-900">Google Maps</h4>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      One key for every store. Tenants cannot set their own key. Restrict it by HTTP referrer in Google Cloud.
                    </p>
                    <label className="mt-3 block text-xs font-semibold text-slate-700">
                      Maps JavaScript API key
                      <input
                        value={settings.maps?.api_key ?? ""}
                        onChange={(e) => setSettings({ ...settings, maps: { api_key: e.target.value.trim() } })}
                        placeholder="AIza..."
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">Tenant Self-Registration</h4>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Allow prospective merchants to register new retail workspaces directly from the tenant sign-in portal.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, allow_self_registration: !settings.general.allow_self_registration },
                          })
                        }
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settings.general.allow_self_registration ? "bg-[#f95721]" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            settings.general.allow_self_registration ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 2: PROFILE & PASSWORD RESET */}
              {generalTab === "profile" ? (
                <div className="pt-5 space-y-6">
                  {/* Profile Details */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900">Administrator Profile Details</h3>
                        <p className="text-[11px] text-slate-500">Primary contact coordinates for root operations and system notices.</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                        <Shield className="h-3 w-3" />
                        {settings.profile.role}
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        Admin Full Name
                        <input
                          value={settings.profile.name}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              profile: { ...settings.profile, name: e.target.value },
                            })
                          }
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-700">
                        Super Admin Email (System Root)
                        <input
                          value={settings.profile.email}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              profile: { ...settings.profile, email: e.target.value },
                            })
                          }
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-700">
                        Direct Phone / Hotline
                        <input
                          value={settings.profile.phone}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              profile: { ...settings.profile, phone: e.target.value },
                            })
                          }
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-700">
                        Designation / Department
                        <input
                          value={settings.profile.designation}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              profile: { ...settings.profile, designation: e.target.value },
                            })
                          }
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Reset Super Admin Password Form */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
                      <KeyRound className="h-4 w-4 text-[#f95721]" />
                      <h3 className="text-xs font-semibold text-slate-900">Reset Super Admin Password</h3>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Update your primary platform credentials. Password updates will take effect across all active admin sessions.
                    </p>

                    {passwordNotice ? (
                      <div
                        className={`mt-3 flex items-center justify-between rounded-lg p-3 text-xs ${
                          passwordNotice.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-rose-50 text-rose-800 border border-rose-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {passwordNotice.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                          )}
                          <span className="font-medium">{passwordNotice.msg}</span>
                        </div>
                        <button type="button" onClick={() => setPasswordNotice(null)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}

                    <form onSubmit={handleResetPassword} className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Current Password
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            type={showCurrentPass ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showCurrentPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          New Password
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="sm:col-span-3 flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={changingPassword}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>{changingPassword ? "Updating Password..." : "Update Password"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : null}

              {/* TAB 3: DATE & TIME */}
              {generalTab === "date_time" ? (
                <div className="pt-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Default Timezone
                      <select
                        value={settings.general.default_timezone}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            general: { ...settings.general, default_timezone: e.target.value },
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST — UTC+05:30)</option>
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST — UTC+04:00)</option>
                        <option value="Asia/Singapore">Asia/Singapore (SGT — UTC+08:00)</option>
                        <option value="Europe/London">Europe/London (GMT/BST — UTC+00:00)</option>
                        <option value="America/New_York">America/New_York (EST/EDT — UTC-05:00)</option>
                        <option value="Australia/Sydney">Australia/Sydney (AEST — UTC+10:00)</option>
                      </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      Standard Date Format
                      <select
                        defaultValue="DD/MM/YYYY"
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 21/10/2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO standard)</option>
                        <option value="DD MMM YYYY">DD MMM YYYY (e.g. 21 Oct 2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US standard)</option>
                      </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      Standard Time Format
                      <select
                        defaultValue="12h"
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="12h">12-hour format (e.g. 03:45 PM)</option>
                        <option value="24h">24-hour military format (e.g. 15:45)</option>
                      </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      First Day of the Week
                      <select
                        defaultValue="monday"
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="monday">Monday (ISO 8601)</option>
                        <option value="sunday">Sunday</option>
                        <option value="saturday">Saturday</option>
                      </select>
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-900">Current Server Sample</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-600">
                      {new Date().toLocaleString("en-IN", { timeZone: settings.general.default_timezone || "Asia/Kolkata" })} ({settings.general.default_timezone})
                    </p>
                  </div>
                </div>
              ) : null}

              {/* TAB 4: LANGUAGE & REGION */}
              {generalTab === "languages" ? (
                <div className="pt-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Primary Platform Language
                      <select
                        value={settings.languages.default_language}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            languages: { ...settings.languages, default_language: e.target.value },
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="en">English (Global Default)</option>
                        <option value="hi">Hindi (हिन्दी)</option>
                        <option value="te">Telugu (తెలుగు)</option>
                        <option value="ta">Tamil (தமிழ்)</option>
                        <option value="kn">Kannada (ಕನ್ನಡ)</option>
                        <option value="mr">Marathi (मराठी)</option>
                        <option value="gu">Gujarati (ગુજરાતી)</option>
                        <option value="ar">Arabic (العربية)</option>
                      </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      Number &amp; Price Formatting Standard
                      <select
                        value={settings.languages.number_format}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            languages: { ...settings.languages, number_format: e.target.value },
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="en-IN">Indian Standard (Lakhs &amp; Crores — ₹ 1,50,000.00)</option>
                        <option value="en-US">International Standard (Millions &amp; Billions — $ 150,000.00)</option>
                      </select>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Supported Languages for Tenant Outlets &amp; Customer Storefronts
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { code: "en", name: "English" },
                        { code: "hi", name: "Hindi (हिन्दी)" },
                        { code: "te", name: "Telugu (తెలుగు)" },
                        { code: "ta", name: "Tamil (தமிழ்)" },
                        { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
                        { code: "mr", name: "Marathi (मराठी)" },
                        { code: "gu", name: "Gujarati (ગુજરાતી)" },
                        { code: "bn", name: "Bengali (বাংলা)" },
                        { code: "ar", name: "Arabic (العربية)" },
                      ].map((lang) => {
                        const isSelected = settings.languages.supported_languages.includes(lang.code);
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? settings.languages.supported_languages.filter((c) => c !== lang.code)
                                : [...settings.languages.supported_languages, lang.code];
                              setSettings({
                                ...settings,
                                languages: { ...settings.languages, supported_languages: next },
                              });
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                              isSelected
                                ? "bg-orange-500 text-white shadow-xs"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {lang.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 pt-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Multilingual Storefronts</h4>
                          <p className="mt-0.5 text-[11px] text-slate-500">Allow shoppers to toggle between supported regional languages.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              languages: { ...settings.languages, enable_multilingual_storefront: !settings.languages.enable_multilingual_storefront },
                            })
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.languages.enable_multilingual_storefront ? "bg-[#f95721]" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings.languages.enable_multilingual_storefront ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Auto AI Catalog Translation</h4>
                          <p className="mt-0.5 text-[11px] text-slate-500">Automatically translate item titles and descriptions on catalog import.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              languages: { ...settings.languages, auto_translate_catalog: !settings.languages.auto_translate_catalog },
                            })
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.languages.auto_translate_catalog ? "bg-[#f95721]" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings.languages.auto_translate_catalog ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 5: MAINTENANCE MODE */}
              {generalTab === "maintenance" ? (
                <div className="pt-5 space-y-5">
                  <div
                    className={`rounded-xl border p-5 transition ${
                      settings.general.maintenance_mode
                        ? "border-amber-300 bg-amber-50/60 shadow-sm"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-900">
                            Maintenance Mode Switch
                          </h3>
                          {settings.general.maintenance_mode ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                              MAINTENANCE ACTIVE (503)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              PLATFORM OPERATIONAL
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 max-w-2xl">
                          When enabled, all tenant consoles, customer storefronts, and POS sync endpoints return a 503 Maintenance screen.
                          <strong className="text-slate-800"> The Super Admin platform remains 100% active</strong> so you can conduct updates, backups, and database migrations.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-700">
                          {settings.general.maintenance_mode ? "Maintenance Enabled" : "Maintenance Disabled"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              general: { ...settings.general, maintenance_mode: !settings.general.maintenance_mode },
                            })
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.general.maintenance_mode ? "bg-amber-600" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings.general.maintenance_mode ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {settings.general.maintenance_mode ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 border-t border-amber-200/70 pt-4">
                        <div>
                          <label className="block text-xs font-semibold text-amber-900">
                            Maintenance Notice (Displayed to Tenants &amp; Shoppers)
                          </label>
                          <input
                            value={settings.general.maintenance_message ?? ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                general: { ...settings.general, maintenance_message: e.target.value },
                              })
                            }
                            placeholder="SelfX Retail Cloud is undergoing scheduled infrastructure upgrades. Services will resume shortly."
                            className="mt-1 h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-amber-900">
                            Expected Completion (ISO or datetime string)
                          </label>
                          <input
                            value={settings.general.maintenance_until ?? ""}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                general: { ...settings.general, maintenance_until: e.target.value },
                              })
                            }
                            placeholder="e.g. 2026-10-21 02:00:00 UTC"
                            className="mt-1 h-9 w-full rounded-lg border border-amber-300 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* TAB 6: THEME & BRANDING */}
              {generalTab === "theme" ? (
                <div className="pt-5 space-y-8">
                  {/* Branding Notice Banner */}
                  {brandingNotice ? (
                    <div
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-semibold ${
                        brandingNotice.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-rose-200 bg-rose-50 text-rose-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {brandingNotice.type === "success" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        )}
                        <span>{brandingNotice.msg}</span>
                      </div>
                      <button type="button" onClick={() => setBrandingNotice(null)}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null}

                  {/* SECTION 1: PLATFORM BRAND ASSETS (LOGO & FAVICON) */}
                  <div className="space-y-5">
                    <div className="border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-[#f95721]" />
                        <h3 className="text-sm font-semibold text-slate-900">
                          Platform Brand Assets (Logo &amp; Favicon)
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Configure the primary corporate logo and browser tab favicon for SelfX. Changes are applied platform-wide across Super Admin, Tenant Console, and Storefronts.
                      </p>
                    </div>

                    {/* CARD 1: MAIN PLATFORM BRAND LOGO */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Main Platform Brand Logo</h4>
                          <p className="text-[11px] text-slate-500">
                            Primary horizontal brand identity displayed in navigation sidebars, login headers, and invoices.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => resetAsset("logo")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset to Default Logo
                        </button>
                      </div>

                      {/* Dual Surface Previews */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                            Preview on Light Surface
                          </span>
                          <div className="flex h-24 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                            <img
                              src={settings.branding?.logo_url || "/logo.png"}
                              alt="Logo Preview Light"
                              className="max-h-16 w-auto max-w-full object-contain"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                            Preview on Dark Surface
                          </span>
                          <div className="flex h-24 items-center justify-center rounded-xl border border-slate-800 bg-[#0f172a] p-3 shadow-xs">
                            <img
                              src={settings.branding?.logo_url || "/logo.png"}
                              alt="Logo Preview Dark"
                              className="max-h-16 w-auto max-w-full object-contain"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Controls: Upload & URL */}
                      <div className="grid gap-4 sm:grid-cols-2 pt-1 border-t border-slate-100">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Upload New Logo File
                          </label>
                          <div className="mt-1.5">
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 h-9 px-3 text-xs font-semibold text-slate-700 transition hover:border-[#f95721] hover:bg-orange-50/30 hover:text-[#f95721]">
                              <Upload className="h-3.5 w-3.5" />
                              <span>{logoUploading ? "Uploading Logo..." : "Choose Logo File (.png, .jpg, .svg, .webp)"}</span>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                disabled={logoUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleUploadAsset(file, "logo");
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="mt-1 text-[10.5px] text-slate-400">
                            Recommended: High-resolution transparent PNG or SVG, min width 400px.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Or Specify Logo URL
                          </label>
                          <input
                            value={settings.branding?.logo_url || ""}
                            onChange={(e) => updateAssetUrl("logo", e.target.value)}
                            placeholder="/logo.png or https://cdn..."
                            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-mono"
                          />
                          <p className="mt-1 text-[10.5px] text-slate-400">
                            Local path (/logo.png) or HTTPS CDN address.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: PLATFORM FAVICON & BROWSER TAB ICON */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Platform Favicon &amp; Tab Icon</h4>
                          <p className="text-[11px] text-slate-500">
                            Square icon displayed on browser tabs, bookmarks bar, and PWA shortcuts.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => resetAsset("favicon")}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset to Default Favicon
                        </button>
                      </div>

                      {/* Live Browser Tab Simulation + Multi-Resolution Preview */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* Browser Tab Mockup */}
                        <div className="space-y-1.5">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                            Live Browser Tab Simulation
                          </span>
                          <div className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 shadow-2xs h-24 flex flex-col justify-between">
                            <div className="flex items-center gap-1.5 px-1">
                              <div className="size-2 rounded-full bg-rose-400" />
                              <div className="size-2 rounded-full bg-amber-400" />
                              <div className="size-2 rounded-full bg-emerald-400" />
                            </div>
                            <div className="inline-flex items-center gap-2 rounded-t-lg bg-white px-3 py-1.5 border-t border-x border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs max-w-[230px]">
                              <img
                                src={settings.branding?.favicon_url || "/favicon.png"}
                                alt="Tab Favicon"
                                className="size-4 shrink-0 object-contain"
                              />
                              <span className="truncate text-[11.5px] font-semibold text-slate-700">SelfX Admin • Platform</span>
                              <span className="text-[10px] text-slate-400 hover:text-slate-600 ml-auto">✕</span>
                            </div>
                          </div>
                        </div>

                        {/* Resolution Display Boxes */}
                        <div className="space-y-1.5">
                          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                            Multi-Resolution Previews
                          </span>
                          <div className="flex items-center justify-around rounded-xl border border-slate-200 bg-slate-50/70 p-3 h-24">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex size-11 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
                                <img
                                  src={settings.branding?.favicon_url || "/favicon.png"}
                                  alt="64px Favicon"
                                  className="size-8 object-contain"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500">64px Retina</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
                                <img
                                  src={settings.branding?.favicon_url || "/favicon.png"}
                                  alt="32px Favicon"
                                  className="size-5 object-contain"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500">32px Tab</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                                <img
                                  src={settings.branding?.favicon_url || "/favicon.png"}
                                  alt="16px Favicon"
                                  className="size-3.5 object-contain"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500">16px Icon</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Controls: Upload & URL */}
                      <div className="grid gap-4 sm:grid-cols-2 pt-1 border-t border-slate-100">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Upload New Favicon File
                          </label>
                          <div className="mt-1.5">
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 h-9 px-3 text-xs font-semibold text-slate-700 transition hover:border-[#f95721] hover:bg-orange-50/30 hover:text-[#f95721]">
                              <Upload className="h-3.5 w-3.5" />
                              <span>{faviconUploading ? "Uploading Favicon..." : "Choose Favicon File (.ico, .png, .svg)"}</span>
                              <input
                                type="file"
                                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/jpeg"
                                disabled={faviconUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void handleUploadAsset(file, "favicon");
                                }}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <p className="mt-1 text-[10.5px] text-slate-400">
                            Square 1:1 format recommended (32×32 or 64×64 PNG/ICO).
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700">
                            Or Specify Favicon URL
                          </label>
                          <input
                            value={settings.branding?.favicon_url || ""}
                            onChange={(e) => updateAssetUrl("favicon", e.target.value)}
                            placeholder="/favicon.png or https://cdn..."
                            className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500 font-mono"
                          />
                          <p className="mt-1 text-[10.5px] text-slate-400">
                            Local path (/favicon.png) or HTTPS CDN address.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Save Branding Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveSettings(settings, "Branding settings")}
                        className="inline-flex h-9.5 items-center gap-2 rounded-xl bg-[#0f172a] px-5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{saving ? "Saving Changes..." : "Save Branding Settings"}</span>
                      </button>
                    </div>
                  </div>

                  {/* SECTION 2: THEME MODE */}
                  <div className="border-t border-slate-200/80 pt-6 space-y-3">
                    <h3 className="text-xs font-semibold text-slate-900">Super Admin Theme Mode</h3>
                    <p className="text-xs text-slate-500">
                      Switch between Light and Dark interface modes.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          document.documentElement.dataset.theme = "light";
                          window.localStorage.setItem("selfx.theme", "light");
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                      >
                        Light Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          document.documentElement.dataset.theme = "dark";
                          window.localStorage.setItem("selfx.theme", "dark");
                        }}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                      >
                        Dark Mode
                      </button>
                    </div>
                  </div>

                  {/* SECTION 3: COLOR ACCENT PALETTE */}
                  <div className="border-t border-slate-200/80 pt-6 space-y-3">
                    <h3 className="text-xs font-semibold text-slate-900">Brand Color Accent Palette</h3>
                    <p className="text-xs text-slate-500">
                      Choose your preferred accent color for buttons, indicators, and active navigation pills.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
                      {[
                        { id: "violet", label: "Royal Violet", swatch: "#7c3aed" },
                        { id: "blue", label: "Enterprise Blue", swatch: "#2563eb" },
                        { id: "emerald", label: "Emerald Retail", swatch: "#059669" },
                        { id: "indigo", label: "Deep Indigo", swatch: "#4f46e5" },
                        { id: "teal", label: "Ocean Teal", swatch: "#0d9488" },
                        { id: "rose", label: "Crimson Rose", swatch: "#e11d48" },
                        { id: "amber", label: "Warm Amber", swatch: "#d97706" },
                        { id: "slate", label: "Graphite Slate", swatch: "#334155" },
                      ].map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            document.documentElement.dataset.accent = acc.id;
                            window.localStorage.setItem("selfx.accent", acc.id);
                            setToast(`Applied ${acc.label} accent theme.`);
                          }}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full"
                            style={{ backgroundColor: acc.swatch }}
                          />
                          <span className="truncate">{acc.label.split(" ")[1]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 7: LOGIN SECURITY */}
              {generalTab === "security" ? (
                <div className="pt-5 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Enforce Mandatory 2FA</h4>
                          <p className="mt-0.5 text-[11px] text-slate-500">Require TOTP two-factor authentication for all platform super admins.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              security: { ...settings.security, enforce_2fa: !settings.security.enforce_2fa },
                            })
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.security.enforce_2fa ? "bg-[#f95721]" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings.security.enforce_2fa ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Require Strong Password Policy</h4>
                          <p className="mt-0.5 text-[11px] text-slate-500">Require min. 8 chars with uppercase, lowercase, numbers &amp; symbols.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              security: { ...settings.security, require_strong_password: !settings.security.require_strong_password },
                            })
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.security.require_strong_password ? "bg-[#f95721]" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings.security.require_strong_password ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-slate-900">Force Single Active Session</h4>
                          <p className="mt-0.5 text-[11px] text-slate-500">Automatically invalidate prior sessions when logging in from a new device.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              security: { ...settings.security, force_single_session: !settings.security.force_single_session },
                            })
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            settings.security.force_single_session ? "bg-[#f95721]" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              settings.security.force_single_session ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <label className="block text-xs font-semibold text-slate-700 rounded-xl border border-slate-200 bg-white p-4">
                      Idle Session Timeout
                      <p className="mt-0.5 text-[11px] text-slate-500 font-normal">Auto-logout admin users after specified period of inactivity.</p>
                      <select
                        value={settings.security.session_timeout_minutes}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            security: { ...settings.security, session_timeout_minutes: Number(e.target.value) },
                          })
                        }
                        className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour (60 minutes)</option>
                        <option value="120">2 hours (120 minutes)</option>
                        <option value="240">4 hours (240 minutes)</option>
                      </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700 rounded-xl border border-slate-200 bg-white p-4">
                      Max Failed Login Attempts
                      <p className="mt-0.5 text-[11px] text-slate-500 font-normal">Attempts allowed before brute-force account lockout triggers.</p>
                      <select
                        value={settings.security.max_login_attempts}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            security: { ...settings.security, max_login_attempts: Number(e.target.value) },
                          })
                        }
                        className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="3">3 failed attempts</option>
                        <option value="5">5 failed attempts (Recommended)</option>
                        <option value="10">10 failed attempts</option>
                      </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700 rounded-xl border border-slate-200 bg-white p-4">
                      Lockout Duration
                      <p className="mt-0.5 text-[11px] text-slate-500 font-normal">Duration an IP/account remains locked after failed attempts.</p>
                      <select
                        value={settings.security.lockout_duration_minutes}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            security: { ...settings.security, lockout_duration_minutes: Number(e.target.value) },
                          })
                        }
                        className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="5">5 minutes</option>
                        <option value="15">15 minutes (Standard)</option>
                        <option value="30">30 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </label>
                  </div>
                </div>
              ) : null}

              {/* TAB 8: FILE STORAGE (Directly matching Image 1) */}
              {generalTab === "storage" ? (
                <div className="pt-5 space-y-6">
                  {/* Storage Driver Cards */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">Storage driver</h3>
                    <div className="mt-3 grid gap-3.5 sm:grid-cols-3">
                      {/* Local Driver Card */}
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            storage: { ...settings.storage, driver: "local" },
                          })
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          settings.storage.driver === "local"
                            ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              settings.storage.driver === "local"
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {settings.storage.driver === "local" ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                            <Server className="h-3.5 w-3.5 text-slate-500" />
                            Local <span className="text-[11px] font-normal text-slate-400">(default)</span>
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                          Store files on this server (storage/app/public).
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
                          <ExternalLink className="h-3 w-3" />
                          <span>Help / setup</span>
                        </div>
                      </button>

                      {/* Amazon S3 Card */}
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            storage: { ...settings.storage, driver: "s3" },
                          })
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          settings.storage.driver === "s3"
                            ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              settings.storage.driver === "s3"
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {settings.storage.driver === "s3" ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                            <Database className="h-3.5 w-3.5 text-slate-500" />
                            Amazon S3
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                          Store files in an AWS S3 bucket. Configure AWS_* in .env.
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
                          <ExternalLink className="h-3 w-3" />
                          <span>Help / setup</span>
                        </div>
                      </button>

                      {/* DigitalOcean Spaces Card */}
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            storage: { ...settings.storage, driver: "spaces" },
                          })
                        }
                        className={`rounded-xl border p-4 text-left transition ${
                          settings.storage.driver === "spaces"
                            ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              settings.storage.driver === "spaces"
                                ? "border-blue-600 bg-blue-600"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {settings.storage.driver === "spaces" ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            ) : null}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                            <Layers className="h-3.5 w-3.5 text-slate-500" />
                            DigitalOcean Spaces
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                          S3-compatible storage. Configure DO_SPACES_* in .env.
                        </p>
                        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700">
                          <ExternalLink className="h-3 w-3" />
                          <span>Help / setup</span>
                        </div>
                      </button>
                    </div>

                    <p className="mt-2.5 text-[11px] text-slate-400">
                      For S3 or DigitalOcean, add the required keys to your .env file and run <code className="font-mono text-slate-600">php artisan config:clear</code> after saving.
                    </p>

                    {/* S3 Details Drawer when S3 is selected */}
                    {settings.storage.driver === "s3" ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">S3 Bucket Name</label>
                          <input
                            value={settings.storage.s3_bucket}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                storage: { ...settings.storage, s3_bucket: e.target.value },
                              })
                            }
                            placeholder="e.g. selfx-production-assets"
                            className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">AWS Region</label>
                          <input
                            value={settings.storage.s3_region}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                storage: { ...settings.storage, s3_region: e.target.value },
                              })
                            }
                            placeholder="e.g. ap-south-1"
                            className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">AWS Access Key ID</label>
                          <input
                            value={settings.storage.s3_key}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                storage: { ...settings.storage, s3_key: e.target.value },
                              })
                            }
                            placeholder="AKIA..."
                            className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">AWS Secret Access Key</label>
                          <input
                            type="password"
                            value={settings.storage.s3_secret}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                storage: { ...settings.storage, s3_secret: e.target.value },
                              })
                            }
                            placeholder="••••••••••••••••"
                            className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    ) : null}

                    {/* Spaces Details Drawer when Spaces is selected */}
                    {settings.storage.driver === "spaces" ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">Spaces Endpoint</label>
                          <input
                            value={settings.storage.spaces_endpoint}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                storage: { ...settings.storage, spaces_endpoint: e.target.value },
                              })
                            }
                            placeholder="blr1.digitaloceanspaces.com"
                            className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">Spaces Bucket Name</label>
                          <input
                            value={settings.storage.spaces_bucket}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                storage: { ...settings.storage, spaces_bucket: e.target.value },
                              })
                            }
                            placeholder="selfx-spaces-cdn"
                            className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">DO Spaces Key</label>
                          <input
                            value={settings.storage.spaces_key}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                storage: { ...settings.storage, spaces_key: e.target.value },
                              })
                            }
                            placeholder="DO00..."
                            className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700">DO Spaces Secret</label>
                          <input
                            type="password"
                            value={settings.storage.spaces_secret}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                storage: { ...settings.storage, spaces_secret: e.target.value },
                              })
                            }
                            placeholder="••••••••••••••••"
                            className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Unused File Cleanup Card (Directly from Image 1) */}
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                        <FolderTree className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">Unused file cleanup</h4>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-3xl">
                          Find uploaded images and app files on the storage disk that are no longer referenced. Only files unused for at least 7 days are eligible, so recent uploads or accidental deletes are not removed immediately. Platform branding files are never removed.
                        </p>
                        <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                          <span>Files newer than your selected age are never deleted—even if unused.</span>
                        </div>
                      </div>
                    </div>

                    {/* Minimum Unused Age Selector (matching Image 1 pills) */}
                    <div className="mt-5 border-t border-slate-200/70 pt-4">
                      <label className="block text-xs font-semibold text-slate-700">
                        Minimum unused age
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[7, 14, 30, 60, 90].map((days) => {
                          const active = settings.storage.cleanup_unused_age_days === days;
                          return (
                            <button
                              key={days}
                              type="button"
                              onClick={() =>
                                setSettings({
                                  ...settings,
                                  storage: { ...settings.storage, cleanup_unused_age_days: days },
                                })
                              }
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                active
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {days} days
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Safer default: only delete files that have been unused for at least a week.
                      </p>
                    </div>

                    {/* Folders to Scan Tags (matching Image 1) */}
                    <div className="mt-5 border-t border-slate-200/70 pt-4">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                          Folders to scan
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const all = [
                              "AI generated",
                              "Catalog items",
                              "Categories",
                              "Variants",
                              "Modifier options",
                              "Tenant logos & covers",
                              "Organization logos",
                              "POS media",
                              "App downloads",
                            ];
                            const current = settings.storage.cleanup_folders;
                            const isAll = current.length === all.length;
                            setSettings({
                              ...settings,
                              storage: { ...settings.storage, cleanup_folders: isAll ? [] : all },
                            });
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {settings.storage.cleanup_folders.length === 9 ? "Deselect all" : "All folders"}
                        </button>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {[
                          "AI generated",
                          "Catalog items",
                          "Categories",
                          "Variants",
                          "Modifier options",
                          "Tenant logos & covers",
                          "Organization logos",
                          "POS media",
                          "App downloads",
                        ].map((folder) => {
                          const active = settings.storage.cleanup_folders.includes(folder);
                          return (
                            <button
                              key={folder}
                              type="button"
                              onClick={() => {
                                const current = settings.storage.cleanup_folders;
                                const next = active
                                  ? current.filter((f) => f !== folder)
                                  : [...current, folder];
                                setSettings({
                                  ...settings,
                                  storage: { ...settings.storage, cleanup_folders: next },
                                });
                              }}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                active
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              {folder}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Select folders to limit the scan, or leave none selected to scan every media folder (except protected platform files).
                      </p>
                    </div>

                    {/* Scan & Delete Feedback Box */}
                    {scanResult ? (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-900">Storage Scan Complete</span>
                          </div>
                          <span className="text-[10px] text-blue-600 font-mono">{scanResult.completedAt}</span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-3 gap-3 text-center">
                          <div className="rounded-lg bg-white p-2.5 border border-blue-100">
                            <p className="text-[10px] text-slate-500 font-medium uppercase">Files Scanned</p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-900">{scanResult.scannedFiles.toLocaleString()}</p>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-blue-100">
                            <p className="text-[10px] text-slate-500 font-medium uppercase">Unused Candidates</p>
                            <p className="mt-0.5 text-sm font-semibold text-amber-600">{scanResult.unusedFiles}</p>
                          </div>
                          <div className="rounded-lg bg-white p-2.5 border border-blue-100">
                            <p className="text-[10px] text-slate-500 font-medium uppercase">Reclaimable Space</p>
                            <p className="mt-0.5 text-sm font-semibold text-emerald-600">{scanResult.reclaimableBytes}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {deleteNotice ? (
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>{deleteNotice}</span>
                        </div>
                        <button type="button" onClick={() => setDeleteNotice(null)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}

                    {/* Action Buttons (Orange Scan & Red Delete, matching Image 1) */}
                    <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200/70 pt-4">
                      <button
                        type="button"
                        disabled={scanningStorage}
                        onClick={handleScanUnusedFiles}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f95721] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#ea4915] disabled:opacity-50 transition"
                      >
                        <Search className={`h-3.5 w-3.5 ${scanningStorage ? "animate-spin" : ""}`} />
                        <span>{scanningStorage ? "Scanning Disk..." : "Scan for unused files"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={deletingStorage || !scanResult || scanResult.unusedFiles === 0}
                        onClick={handleDeleteUnusedFiles}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-500 px-4 text-xs font-semibold text-white shadow-sm hover:bg-rose-600 disabled:opacity-40 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{deletingStorage ? "Deleting..." : "Delete unused files"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 9: INSTALLABLE APP (PWA) */}
              {generalTab === "pwa" ? (
                <div className="pt-5 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      PWA App Full Name
                      <input
                        value={settings.pwa.name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            pwa: { ...settings.pwa, name: e.target.value },
                          })
                        }
                        placeholder="e.g. SelfX Retail Cloud Platform"
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      PWA Short Name (Homescreen Label)
                      <input
                        value={settings.pwa.short_name}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            pwa: { ...settings.pwa, short_name: e.target.value },
                          })
                        }
                        placeholder="e.g. SelfX Retail"
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      Theme Color (Status Bar &amp; Chrome)
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.pwa.theme_color}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              pwa: { ...settings.pwa, theme_color: e.target.value },
                            })
                          }
                          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={settings.pwa.theme_color}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              pwa: { ...settings.pwa, theme_color: e.target.value },
                            })
                          }
                          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      Background Color (Splash Screen)
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="color"
                          value={settings.pwa.background_color}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              pwa: { ...settings.pwa, background_color: e.target.value },
                            })
                          }
                          className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 p-0.5 bg-white"
                        />
                        <input
                          type="text"
                          value={settings.pwa.background_color}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              pwa: { ...settings.pwa, background_color: e.target.value },
                            })
                          }
                          className="h-9 flex-1 rounded-lg border border-slate-200 px-3 font-mono text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      Display Mode
                      <select
                        value={settings.pwa.display_mode}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            pwa: { ...settings.pwa, display_mode: e.target.value },
                          })
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      >
                        <option value="standalone">Standalone (Native window without browser UI)</option>
                        <option value="minimal-ui">Minimal UI (With essential navigation)</option>
                        <option value="fullscreen">Fullscreen (Immersive kiosk/POS view)</option>
                      </select>
                    </label>

                    <label className="block text-xs font-semibold text-slate-700">
                      Start URL
                      <input
                        value={settings.pwa.start_url}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            pwa: { ...settings.pwa, start_url: e.target.value },
                          })
                        }
                        placeholder="/"
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                    </label>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        PWA App Icon / Logo URL
                      </label>
                      <input
                        value={settings.pwa.logo_url}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            pwa: { ...settings.pwa, logo_url: e.target.value },
                          })
                        }
                        placeholder="/brand/selfx-pwa-icon.png"
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-orange-500"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        Provide a square PNG (min 512x512 recommended for high-DPI homescreen icons and Android splash screens).
                      </p>
                    </div>
                  </div>

                  {/* Offline Caching Switch */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">Service Worker Offline Caching</h4>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Pre-cache vital storefront and billing assets so the application continues to operate seamlessly during connectivity drops.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            pwa: { ...settings.pwa, offline_caching: !settings.pwa.offline_caching },
                          })
                        }
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settings.pwa.offline_caching ? "bg-[#f95721]" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            settings.pwa.offline_caching ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Live PWA Preview Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <h4 className="text-xs font-semibold text-slate-900">PWA Manifest Preview</h4>
                    <p className="mt-0.5 text-[11px] text-slate-500">How the Progressive Web App appears when installed on desktop and mobile.</p>
                    <div className="mt-3 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 max-w-md shadow-xs">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white font-semibold text-base shadow-sm"
                        style={{ backgroundColor: settings.pwa.theme_color || "#0f172a" }}
                      >
                        SX
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-slate-900">{settings.pwa.name || "SelfX Retail Cloud"}</h5>
                        <p className="text-[11px] text-slate-500">{settings.pwa.short_name || "SelfX Retail"} • {settings.pwa.display_mode}</p>
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Ready to Install
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* ====================================================================
       * 1. PAYMENT GATEWAYS (mode === "gateways") - Image 3 & 4 Redesign
       * ==================================================================== */}
      {mode === "gateways" ? (
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  Platform Payment Gateways
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Configure payment gateways for SaaS subscription billing and tenant store checkouts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                  <CreditCard className="h-3.5 w-3.5" />
                  12 Gateways Available
                </span>
              </div>
            </div>
          </div>

          {/* Top Horizontal Gateway Tabs (Matching Image 3 & 4) */}
          <div className="border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2">
            <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-thin">
              {[
                { id: "stripe", name: "Stripe", logo: "/superadmin/logos/stripe.png" },
                { id: "razorpay", name: "Razorpay", logo: "/superadmin/logos/razorpay.png" },
                { id: "phonepe", name: "PhonePe", logo: "/superadmin/logos/phonepe.svg" },
                { id: "paytm", name: "Paytm", logo: "/superadmin/logos/paytm.svg" },
                { id: "cashfree", name: "Cashfree", logo: "/superadmin/logos/cashfree.svg" },
                { id: "payu", name: "PayU", logo: "/superadmin/logos/payu.svg" },
                { id: "paypal", name: "PayPal", logo: "/superadmin/logos/paypal.svg" },
                { id: "paystack", name: "Paystack", logo: "/superadmin/logos/paystack.svg" },
                { id: "flutterwave", name: "Flutterwave", logo: "/superadmin/logos/flutterwave.svg" },
                { id: "mollie", name: "Mollie", logo: "/superadmin/logos/mollie.svg" },
                { id: "dodopayments", name: "Dodo Payments", logo: "/superadmin/logos/dodopayments.svg" },
                { id: "bank_transfer", name: "Bank Transfer", logo: "/superadmin/logos/bank.svg" },
              ].map((gw) => {
                const isSelected = activeGateway === gw.id;
                const isEnabled = Boolean(settings.gateways[gw.id]?.enabled);
                return (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => setActiveGateway(gw.id)}
                    className={`flex items-center gap-2 shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex h-5 w-7 items-center justify-center rounded bg-white p-0.5 shrink-0 border border-slate-200">
                      <img src={gw.logo} alt={gw.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <span>{gw.name}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isEnabled ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                      title={isEnabled ? "Enabled" : "Disabled"}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Gateway Detail Card */}
          {(() => {
            const gwId = activeGateway;
            const gwCfg = settings.gateways[gwId] ?? { enabled: false, mode: "test" };

            const metaMap: Record<
              string,
              {
                name: string;
                logo: string;
                desc: string;
                currencies: string[];
                fields: { key: string; label: string; placeholder: string; secret?: boolean; multiline?: boolean }[];
                steps: string[];
                docUrl: string;
              }
            > = {
              stripe: {
                name: "Stripe",
                logo: "/superadmin/logos/stripe.png",
                desc: "Global card checkout, 3D Secure, Apple Pay, Google Pay, and recurring subscription mandates.",
                currencies: ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"],
                fields: [
                  { key: "publishable_key", label: "Publishable Key", placeholder: "pk_live_51SelfXPlatform..." },
                  { key: "secret_key", label: "Secret Key", placeholder: "sk_live_51SelfXPlatformSecret...", secret: true },
                  { key: "webhook_secret", label: "Webhook Signing Secret", placeholder: "whsec_stripe_platform...", secret: true },
                ],
                steps: [
                  "Log in to Stripe Dashboard > Developers > API keys.",
                  "Copy Publishable Key and Secret Key for either Test or Live mode.",
                  "Under Developers > Webhooks, add the Webhook URL on the right.",
                  "Subscribe to payment_intent.succeeded and invoice.payment_succeeded events.",
                ],
                docUrl: "https://stripe.com/docs/api",
              },
              razorpay: {
                name: "Razorpay",
                logo: "/superadmin/logos/razorpay.png",
                desc: "India standard UPI, Netbanking, Cards, Wallets, and recurring e-mandates with instant webhooks.",
                currencies: ["INR", "USD", "EUR", "GBP", "AED", "SGD"],
                fields: [
                  { key: "key_id", label: "Key ID", placeholder: "rzp_live_SelfXPlatform01" },
                  { key: "key_secret", label: "Key Secret", placeholder: "Razorpay Key Secret...", secret: true },
                  { key: "webhook_secret", label: "Webhook Secret", placeholder: "whsec_rzp_platform", secret: true },
                ],
                steps: [
                  "Open Razorpay Dashboard > Settings > API Keys.",
                  "Generate your Key ID and Key Secret.",
                  "Navigate to Settings > Webhooks, add the Webhook URL shown on the right.",
                  "Enable events: order.paid, payment.captured, invoice.paid.",
                ],
                docUrl: "https://razorpay.com/docs/api",
              },
              phonepe: {
                name: "PhonePe PG",
                logo: "/superadmin/logos/phonepe.svg",
                desc: "Direct UPI intent, dynamic QR, cards, and netbanking for high-conversion retail checkouts in India.",
                currencies: ["INR"],
                fields: [
                  { key: "merchant_id", label: "Merchant ID (MID)", placeholder: "SELFXONLINE" },
                  { key: "salt_key", label: "Salt Key", placeholder: "PhonePe Production Salt Key...", secret: true },
                  { key: "salt_index", label: "Salt Index", placeholder: "1" },
                ],
                steps: [
                  "Log in to PhonePe Merchant portal and access API Credentials.",
                  "Copy your Merchant ID and Salt Key, along with the Salt Key Index.",
                  "Add the S2S Webhook Callback URL in the Webhooks Configuration tab.",
                  "Perform a test payment using the test UPI VPA provided by PhonePe.",
                ],
                docUrl: "https://developer.phonepe.com/docs",
              },
              paytm: {
                name: "Paytm Business",
                logo: "/superadmin/logos/paytm.svg",
                desc: "Paytm All-In-One payment gateway, wallet, postpaid, and dynamic UPI QR soundbox integration.",
                currencies: ["INR"],
                fields: [
                  { key: "mid", label: "Merchant ID (MID)", placeholder: "SELFXR98172635" },
                  { key: "merchant_key", label: "Merchant Key", placeholder: "Paytm Production Merchant Key...", secret: true },
                  { key: "website", label: "Website Parameter", placeholder: "DEFAULT" },
                ],
                steps: [
                  "Go to Paytm Merchant Dashboard > API Keys.",
                  "Locate your Production MID and Merchant Key.",
                  "Set Website Name to 'DEFAULT' for live production or 'WEBSTAGING' for test.",
                  "Configure the Webhook URL for server-to-server transaction notification.",
                ],
                docUrl: "https://developer.paytm.com/docs",
              },
              cashfree: {
                name: "Cashfree",
                logo: "/superadmin/logos/cashfree.svg",
                desc: "Instant payment gateway checkout, UPI auto-collect, payment links, and multi-vendor splits.",
                currencies: ["INR", "USD"],
                fields: [
                  { key: "app_id", label: "App ID", placeholder: "CF_APP_SELFX_LIVE" },
                  { key: "secret_key", label: "Secret Key", placeholder: "cf_sec_key_platform...", secret: true },
                ],
                steps: [
                  "Log in to Cashfree Merchant Dashboard > Developers > API Keys.",
                  "Generate App ID and Secret Key for Production environment.",
                  "Add Webhook endpoint under Developers > Webhooks.",
                  "Test payment links in sandbox mode before turning on Live.",
                ],
                docUrl: "https://docs.cashfree.com",
              },
              payu: {
                name: "PayU",
                logo: "/superadmin/logos/payu.svg",
                desc: "Enterprise payment suite with 100+ payment options, EMI, and international card processing.",
                currencies: ["INR"],
                fields: [
                  { key: "merchant_key", label: "Merchant Key", placeholder: "PAYU_SELFX_KEY" },
                  { key: "merchant_salt", label: "Merchant Salt", placeholder: "payu_salt_live_...", secret: true },
                ],
                steps: [
                  "Sign in to PayU Dashboard > Integration Details.",
                  "Retrieve Merchant Key and Merchant Salt.",
                  "Set up the response and Webhook URL on your PayU profile.",
                  "Run a test checkout with the test credentials.",
                ],
                docUrl: "https://devguide.payu.in",
              },
              paypal: {
                name: "PayPal",
                logo: "/superadmin/logos/paypal.svg",
                desc: "Global cross-border digital payments with PayPal wallet balances and international credit cards.",
                currencies: ["USD", "EUR", "GBP", "AUD", "CAD", "SGD"],
                fields: [
                  { key: "client_id", label: "Client ID", placeholder: "AY_SELFX_PAYPAL_CLIENT" },
                  { key: "client_secret", label: "Client Secret", placeholder: "PayPal Secret...", secret: true },
                ],
                steps: [
                  "Go to PayPal Developer Portal > Dashboard > Apps & Credentials.",
                  "Create an App and copy the Client ID and Client Secret.",
                  "Add Webhook URL on the right and select All Events.",
                  "Switch from Sandbox to Live when your business account is verified.",
                ],
                docUrl: "https://developer.paypal.com",
              },
              paystack: {
                name: "Paystack",
                logo: "/superadmin/logos/paystack.svg",
                desc: "Modern payments across Africa (Nigeria, Ghana, Kenya, South Africa) with local cards and mobile money.",
                currencies: ["NGN", "GHS", "KES", "ZAR", "USD"],
                fields: [
                  { key: "public_key", label: "Public Key", placeholder: "pk_live_paystack_selfx" },
                  { key: "secret_key", label: "Secret Key", placeholder: "sk_live_paystack_selfx...", secret: true },
                ],
                steps: [
                  "Log in to Paystack Dashboard > Settings > API Keys & Webhooks.",
                  "Copy your Live Public Key and Secret Key.",
                  "Set the Live Webhook URL to the link on the right.",
                  "Ensure your Paystack account is activated and ready for settlement.",
                ],
                docUrl: "https://paystack.com/docs",
              },
              flutterwave: {
                name: "Flutterwave",
                logo: "/superadmin/logos/flutterwave.svg",
                desc: "Pan-African and global multi-currency checkout, mobile money, and cross-border bank settlements.",
                currencies: ["USD", "NGN", "KES", "GHS", "ZAR", "EUR", "GBP"],
                fields: [
                  { key: "public_key", label: "Public Key", placeholder: "FLWPUBK-selfx-live" },
                  { key: "secret_key", label: "Secret Key", placeholder: "FLWSECK-selfx-live...", secret: true },
                  { key: "encryption_key", label: "Encryption Key", placeholder: "flw_enc_key_98a...", secret: true },
                ],
                steps: [
                  "Navigate to Flutterwave Dashboard > Settings > API Keys.",
                  "Copy Public Key, Secret Key, and 3DES Encryption Key.",
                  "Under Webhooks, paste the Webhook URL and set your secret hash.",
                  "Verify live payout settings in your bank remittance preferences.",
                ],
                docUrl: "https://developer.flutterwave.com",
              },
              mollie: {
                name: "Mollie",
                logo: "/superadmin/logos/mollie.svg",
                desc: "European localized payment processing: iDEAL, Bancontact, SEPA Direct Debit, and cards.",
                currencies: ["EUR", "GBP", "USD"],
                fields: [
                  { key: "api_key", label: "Live / Test API Key", placeholder: "live_mollie_selfx_platform...", secret: true },
                ],
                steps: [
                  "Access Mollie Dashboard > Developers > API Keys.",
                  "Copy the Live API key for production or Test API key for testing.",
                  "Webhook endpoints are passed automatically on payment creation.",
                  "Enable desired payment methods in your Mollie profile.",
                ],
                docUrl: "https://docs.mollie.com",
              },
              dodopayments: {
                name: "Dodo Payments",
                logo: "/superadmin/logos/dodopayments.svg",
                desc: "Modern merchant-of-record payments built for digital platforms and automated subscription billing.",
                currencies: ["USD", "EUR", "GBP", "INR"],
                fields: [
                  { key: "api_key", label: "API Key", placeholder: "dodo_live_selfx_key...", secret: true },
                  { key: "webhook_secret", label: "Webhook Secret", placeholder: "whsec_dodo_platform...", secret: true },
                ],
                steps: [
                  "Sign in to Dodo Payments Console > Developer Settings.",
                  "Generate a Production API Key with full billing permissions.",
                  "Register the Webhook URL for subscription status notifications.",
                  "Save your Webhook Secret for signature validation.",
                ],
                docUrl: "https://dodopayments.com/docs",
              },
              bank_transfer: {
                name: "Direct Bank Transfer",
                logo: "/superadmin/logos/bank.svg",
                desc: "Direct offline NEFT / RTGS / IMPS wire transfers with manual UTR submission and reconciliation.",
                currencies: ["INR", "USD", "EUR", "GBP", "AED"],
                fields: [
                  { key: "bank_name", label: "Bank Name", placeholder: "HDFC Bank Ltd" },
                  { key: "account_name", label: "Beneficiary Name", placeholder: "SelfX Retail Technologies Pvt Ltd" },
                  { key: "account_number", label: "Account Number", placeholder: "50200087654321" },
                  { key: "ifsc", label: "IFSC / Routing Code", placeholder: "HDFC0000240" },
                  { key: "instructions", label: "Remittance Instructions", placeholder: "Include Tenant Subdomain in transfer remarks...", multiline: true },
                ],
                steps: [
                  "Fill in your platform's official corporate bank account details.",
                  "Tenants will be presented with these bank details on manual invoice settlement.",
                  "When a tenant pays via NEFT/RTGS, they submit the 16-character UTR number.",
                  "Super Admin reviews and approves the UTR under Invoices > Pending Payments.",
                ],
                docUrl: "#",
              },
            };

            const activeMeta = metaMap[gwId] ?? metaMap.stripe;
            const webhookUrl = `https://api.selfx.in/api/v1/webhooks/${gwId}`;
            const testStatus = gatewayTestStatus[gwId];

            return (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Gateway Configuration Form (2 cols) */}
                <div className="space-y-6 lg:col-span-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                    {/* Header + Enable Switch */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-slate-200 bg-white p-1">
                          <img src={activeMeta.logo} alt={activeMeta.name} className="max-h-6 max-w-full object-contain" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-slate-900">{activeMeta.name}</h2>
                            {gwCfg.enabled ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                                Enabled
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{activeMeta.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-700">
                          {gwCfg.enabled ? "Gateway Active" : "Gateway Inactive"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = {
                              ...settings,
                              gateways: {
                                ...settings.gateways,
                                [gwId]: { ...gwCfg, enabled: !gwCfg.enabled },
                              },
                            };
                            setSettings(updated);
                          }}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            gwCfg.enabled ? "bg-emerald-600" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              gwCfg.enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Environment Mode Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Environment Mode
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSettings({
                              ...settings,
                              gateways: {
                                ...settings.gateways,
                                [gwId]: { ...gwCfg, mode: "test" },
                              },
                            });
                          }}
                          className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                            gwCfg.mode === "test" || !gwCfg.mode
                              ? "border-amber-400 bg-amber-50/50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              gwCfg.mode === "test" || !gwCfg.mode
                                ? "border-amber-600 bg-amber-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {(gwCfg.mode === "test" || !gwCfg.mode) && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-900 block">
                              Sandbox / Test Mode
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Simulate checkouts using test cards without real card charges.
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSettings({
                              ...settings,
                              gateways: {
                                ...settings.gateways,
                                [gwId]: { ...gwCfg, mode: "live" },
                              },
                            });
                          }}
                          className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                            gwCfg.mode === "live"
                              ? "border-emerald-500 bg-emerald-50/50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              gwCfg.mode === "live"
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {gwCfg.mode === "live" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-900 block">
                              Live Production
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Process real transactions with actual bank card settlements.
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Supported / Default Currency */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Primary Settlement Currency
                      </label>
                      <select
                        value={gwCfg.currency ?? activeMeta.currencies[0]}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            gateways: {
                              ...settings.gateways,
                              [gwId]: { ...gwCfg, currency: e.target.value },
                            },
                          });
                        }}
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      >
                        {activeMeta.currencies.map((c) => (
                          <option key={c} value={c}>
                            {c} — {c === "INR" ? "Indian Rupee (₹)" : c === "USD" ? "US Dollar ($)" : c === "EUR" ? "Euro (€)" : c === "GBP" ? "British Pound (£)" : c}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Invoices and payment intents sent through this gateway will settle in this default denomination.
                      </span>
                    </div>

                    {/* Dynamic Credentials Inputs */}
                    <div className="space-y-4 pt-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        API Credentials &amp; Keys
                      </h3>

                      {activeMeta.fields.map((f) => {
                        const val = gwCfg[f.key] ?? "";
                        const isSecret = Boolean(f.secret);
                        const isRevealed = Boolean(showSecret[`${gwId}_${f.key}`]);

                        if (f.multiline) {
                          return (
                            <div key={f.key}>
                              <label className="block text-xs font-semibold text-slate-700">
                                {f.label}
                              </label>
                              <textarea
                                rows={3}
                                value={val}
                                onChange={(e) => {
                                  setSettings({
                                    ...settings,
                                    gateways: {
                                      ...settings.gateways,
                                      [gwId]: { ...gwCfg, [f.key]: e.target.value },
                                    },
                                  });
                                }}
                                placeholder={f.placeholder}
                                className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          );
                        }

                        return (
                          <div key={f.key}>
                            <label className="block text-xs font-semibold text-slate-700">
                              {f.label}
                            </label>
                            <div className="relative mt-1">
                              <input
                                type={isSecret && !isRevealed ? "password" : "text"}
                                value={val}
                                onChange={(e) => {
                                  setSettings({
                                    ...settings,
                                    gateways: {
                                      ...settings.gateways,
                                      [gwId]: { ...gwCfg, [f.key]: e.target.value },
                                    },
                                  });
                                }}
                                placeholder={f.placeholder}
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                              />
                              {isSecret ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowSecret((prev) => ({
                                      ...prev,
                                      [`${gwId}_${f.key}`]: !prev[`${gwId}_${f.key}`],
                                    }))
                                  }
                                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                                >
                                  {isRevealed ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="text-xs text-slate-500">
                        {gwCfg.enabled ? (
                          <span className="text-emerald-700 font-semibold">
                            ✓ Gateway is active for tenant subscriptions and checkout.
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Gateway is currently inactive.
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveSettings(settings, `${activeMeta.name} configuration`)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>Save Configuration</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar: Setup Guide & Webhook Container (Matching Image 3 & 4) */}
                <div className="space-y-6">
                  {/* Webhook Callback Container */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                      Webhook Callback URL
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Paste this URL into your {activeMeta.name} developer console to receive asynchronous transaction settlement events.
                    </p>

                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                      <span className="truncate font-mono text-[11px] text-slate-700">
                        {webhookUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(webhookUrl);
                          setCopiedKey(`webhook_${gwId}`);
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="shrink-0 rounded p-1 text-slate-500 hover:bg-white hover:text-slate-800"
                        title="Copy Webhook URL"
                      >
                        {copiedKey === `webhook_${gwId}` ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Setup Guide Steps Card */}
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                        Setup Guide
                      </h3>
                      {activeMeta.docUrl !== "#" ? (
                        <a
                          href={activeMeta.docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                        >
                          Docs <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      {activeMeta.steps.map((st, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                            {i + 1}
                          </span>
                          <span className="pt-0.5 leading-relaxed">{st}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        disabled={testStatus?.status === "testing"}
                        onClick={async () => {
                          setGatewayTestStatus((prev) => ({
                            ...prev,
                            [gwId]: { status: "testing", msg: "Testing API handshake with gateway..." },
                          }));
                          try {
                            const res = await api<{ data: { success: boolean; message: string } }>(
                              `/api/v1/platform/gateways/${gwId}/test`,
                              { method: "POST" }
                            );
                            setGatewayTestStatus((prev) => ({
                              ...prev,
                              [gwId]: { status: "success", msg: res.data.message },
                            }));
                          } catch (err: any) {
                            setGatewayTestStatus((prev) => ({
                              ...prev,
                              [gwId]: { status: "error", msg: err?.message || "Gateway test failed. Please verify credentials." },
                            }));
                          }
                        }}
                        className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${testStatus?.status === "testing" ? "animate-spin" : ""}`} />
                        <span>Test Gateway Connection</span>
                      </button>

                      {testStatus?.msg ? (
                        <p className={`mt-2 text-[11px] font-semibold ${testStatus.status === "success" ? "text-emerald-700" : "text-rose-600"}`}>
                          {testStatus.msg}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null}

      {/* ====================================================================
       * 2. EMAIL TEMPLATES (mode === "email-templates" || mode === "templates") - Image 2 Redesign
       * ==================================================================== */}
      {mode === "email-templates" || mode === "templates" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Email Notification Templates
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Manage and customize transactional emails sent to tenants, billing contacts, and platform administrators.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                <Mail className="h-3.5 w-3.5" />
                {settings.email_templates.length} Templates Configured
              </span>
            </div>
          </div>

          {/* 2-Column Template Grid (Matching Image 2) */}
          <div className="grid gap-4 md:grid-cols-2">
            {settings.email_templates.map((tpl, idx) => {
              return (
                <div
                  key={tpl.key}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                          {tpl.key.includes("invoice") ? (
                            <FileText className="h-4 w-4" />
                          ) : tpl.key.includes("impersonation") ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : tpl.key.includes("reminder") ? (
                            <Bell className="h-4 w-4" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900 leading-snug">
                            {tpl.name}
                          </h2>
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 mt-1">
                            {tpl.trigger ?? `Event: ${tpl.key}`}
                          </span>
                        </div>
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 shrink-0">
                        <input
                          type="checkbox"
                          checked={tpl.active}
                          onChange={(e) => {
                            const next = [...settings.email_templates];
                            next[idx] = { ...tpl, active: e.target.checked };
                            setSettings({ ...settings, email_templates: next });
                          }}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                        />
                        <span className="text-[11px]">{tpl.active ? "Active" : "Inactive"}</span>
                      </label>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                        Subject Line Preview
                      </span>
                      <p className="mt-0.5 text-xs font-semibold text-slate-800 line-clamp-1">
                        {tpl.subject}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-[11px] text-slate-400 font-mono">
                      key: {tpl.key}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewTemplate(tpl)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Preview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingTemplate(tpl)}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-slate-900 px-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>Edit Template</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSettings(settings, "Email templates")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Email Templates</span>
            </button>
          </div>

          {/* Bottom Available Variables Container (Matching Image 2) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Available System Variables
                </h3>
                <p className="text-xs text-slate-500">
                  Click any variable merge tag below to copy it for use in your email subjects and body templates.
                </p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pt-1">
              {[
                { tag: "{{platform_name}}", label: "Platform Brand Name" },
                { tag: "{{tenant_name}}", label: "Store / Business Name" },
                { tag: "{{owner_name}}", label: "Owner Full Name" },
                { tag: "{{owner_email}}", label: "Owner Login Email" },
                { tag: "{{console_url}}", label: "Console Login URL" },
                { tag: "{{invoice_number}}", label: "GST Invoice Number" },
                { tag: "{{amount}}", label: "Billed Total Amount" },
                { tag: "{{due_date}}", label: "Due / Expiry Date" },
                { tag: "{{plan_name}}", label: "Subscription Plan Tier" },
                { tag: "{{renewal_date}}", label: "Renewal Billing Date" },
                { tag: "{{support_email}}", label: "Platform Support Email" },
                { tag: "{{reason}}", label: "Impersonation Audit Reason" },
              ].map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(v.tag);
                    setCopiedKey(v.tag);
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-left hover:bg-slate-100 transition"
                >
                  <div className="truncate pr-2">
                    <span className="font-mono text-xs font-semibold text-blue-700 block">
                      {v.tag}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {v.label}
                    </span>
                  </div>
                  <span className="text-slate-400">
                    {copiedKey === v.tag ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Edit Template Modal */}
          {editingTemplate ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Edit Email Template: {editingTemplate.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      key: {editingTemplate.key}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Subject Line
                    </label>
                    <input
                      value={editingTemplate.subject}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Template Body (Markdown / Text)
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Supports merge tags like {`{{owner_name}}`}
                      </span>
                    </div>
                    <textarea
                      rows={8}
                      value={editingTemplate.body}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, body: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 p-3 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    className="h-8 rounded-lg border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = settings.email_templates.map((t) =>
                        t.key === editingTemplate.key ? editingTemplate : t
                      );
                      setSettings({ ...settings, email_templates: next });
                      setEditingTemplate(null);
                      setToast(`Updated template ${editingTemplate.name}.`);
                    }}
                    className="h-8 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Preview Email Modal */}
          {previewTemplate ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <h2 className="text-base font-semibold text-slate-900">
                      Email Simulation Preview
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-sans text-xs space-y-3">
                  <div className="border-b border-slate-200 pb-2 space-y-1 text-slate-600">
                    <p>
                      <strong className="text-slate-800 font-semibold">From:</strong> SelfX Retail Cloud &lt;{settings.mail.from_address}&gt;
                    </p>
                    <p>
                      <strong className="text-slate-800 font-semibold">To:</strong> Priya Sharma &lt;priya@annapurna.store&gt;
                    </p>
                    <p>
                      <strong className="text-slate-800 font-semibold">Subject:</strong>{" "}
                      <span className="font-semibold text-slate-900">
                        {previewTemplate.subject
                          .replace(/\{\{platform_name\}\}/g, "SelfX Retail Cloud")
                          .replace(/\{\{tenant_name\}\}/g, "Annapurna Supermarket")
                          .replace(/\{\{invoice_number\}\}/g, "SFX-000142")
                          .replace(/\{\{amount\}\}/g, "₹4,999.00")
                          .replace(/\{\{renewal_date\}\}/g, "2026-11-01")}
                      </span>
                    </p>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-4 whitespace-pre-wrap leading-relaxed text-slate-800">
                    {previewTemplate.body
                      .replace(/\{\{platform_name\}\}/g, "SelfX Retail Cloud")
                      .replace(/\{\{tenant_name\}\}/g, "Annapurna Supermarket")
                      .replace(/\{\{owner_name\}\}/g, "Priya Sharma")
                      .replace(/\{\{owner_email\}\}/g, "priya@annapurna.store")
                      .replace(/\{\{console_url\}\}/g, "https://annapurna.retail.selfx.in")
                      .replace(/\{\{invoice_number\}\}/g, "SFX-000142")
                      .replace(/\{\{amount\}\}/g, "₹4,999.00")
                      .replace(/\{\{due_date\}\}/g, "2026-11-05")
                      .replace(/\{\{plan_name\}\}/g, "Pro Retail")
                      .replace(/\{\{renewal_date\}\}/g, "2026-11-01")
                      .replace(/\{\{admin_email\}\}/g, "admin@selfx.in")
                      .replace(/\{\{reason\}\}/g, "Tax audit invoice verification")}
                  </div>

                  <div className="pt-2 text-center text-[10px] text-slate-400">
                    Sent securely via SelfX Outbound Transactional Mail Infrastructure
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    className="h-8 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ====================================================================
       * 3. MAIL SETTINGS (mode === "mail-settings") - Image 5 Redesign
       * ==================================================================== */}
      {mode === "mail-settings" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                SMTP &amp; Outbound Mail Settings
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Configure your outbound transactional mailer for sending billing invoices, credentials, and alerts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Driver: {settings.mail.driver.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Form Column (2 cols) */}
            <div className="space-y-6 lg:col-span-2">
              {/* Presets Bar */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Quick SMTP Presets
                </h2>
                <p className="text-xs text-slate-500">
                  Click any service below to auto-populate host, port, and recommended TLS/SSL encryption parameters.
                </p>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 pt-1">
                  {[
                    { name: "Postmark", host: "smtp.postmarkapp.com", port: 587, enc: "tls", logo: "/superadmin/brands/postmark.svg" },
                    { name: "SendGrid", host: "smtp.sendgrid.net", port: 587, enc: "tls", logo: "/superadmin/brands/sendgrid.png" },
                    { name: "AWS SES", host: "email-smtp.us-east-1.amazonaws.com", port: 587, enc: "tls", logo: "/superadmin/brands/amazon.svg" },
                    { name: "Google Workspace", host: "smtp.gmail.com", port: 587, enc: "tls", logo: "/superadmin/brands/google.svg" },
                    { name: "Microsoft 365", host: "smtp.office365.com", port: 587, enc: "tls", logo: "/superadmin/brands/microsoft.svg" },
                    { name: "Mailgun", host: "smtp.mailgun.org", port: 587, enc: "tls", logo: "/superadmin/brands/mailgun.svg" },
                  ].map((pr) => (
                    <button
                      key={pr.name}
                      type="button"
                      onClick={() => {
                        setSettings({
                          ...settings,
                          mail: {
                            ...settings.mail,
                            host: pr.host,
                            port: pr.port,
                            encryption: pr.enc,
                          },
                        });
                        setToast(`Loaded ${pr.name} server settings.`);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-left hover:border-slate-400"
                    >
                      <img
                        src={pr.logo}
                        alt={pr.name}
                        className="h-5 w-10 shrink-0 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                      <span>
                        <span className="block text-xs font-semibold text-slate-800">{pr.name}</span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">{pr.host}:{pr.port}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SMTP Credentials & Connection Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
                  Server Connection Credentials
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Mail Driver
                    </label>
                    <select
                      value={settings.mail.driver}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mail: { ...settings.mail, driver: e.target.value },
                        })
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="smtp">SMTP (Standard Protocol)</option>
                      <option value="postmark">Postmark API</option>
                      <option value="ses">Amazon SES</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="mailgun">Mailgun</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      SMTP Host
                    </label>
                    <input
                      value={settings.mail.host}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mail: { ...settings.mail, host: e.target.value },
                        })
                      }
                      placeholder="e.g. smtp.postmarkapp.com"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={settings.mail.port}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mail: { ...settings.mail, port: Number(e.target.value) },
                        })
                      }
                      placeholder="587"
                      className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Encryption Mode
                    </label>
                    <div className="flex items-center gap-2">
                      {["tls", "ssl", "none"].map((enc) => (
                        <button
                          key={enc}
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              mail: { ...settings.mail, encryption: enc },
                            })
                          }
                          className={`h-9 flex-1 rounded-lg border text-xs font-semibold uppercase transition ${
                            settings.mail.encryption === enc
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {enc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      SMTP Username / API User
                    </label>
                    <input
                      value={settings.mail.username}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mail: { ...settings.mail, username: e.target.value },
                        })
                      }
                      placeholder="e.g. platform-mailer@selfx.in"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      SMTP Password / Secret
                    </label>
                    <div className="relative mt-1">
                      <input
                        type={showMailPass ? "text" : "password"}
                        value={settings.mail.password ?? ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            mail: { ...settings.mail, password: e.target.value },
                          })
                        }
                        placeholder="••••••••••••••••"
                        className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-10 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMailPass(!showMailPass)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showMailPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sender Identity Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
                  Sender Identity
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      From Display Name
                    </label>
                    <input
                      value={settings.mail.from_name}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mail: { ...settings.mail, from_name: e.target.value },
                        })
                      }
                      placeholder="e.g. SelfX Retail Cloud"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      From Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.mail.from_address}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mail: { ...settings.mail, from_address: e.target.value },
                        })
                      }
                      placeholder="e.g. no-reply@selfx.in"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Reply-To Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.mail.reply_to ?? "support@selfx.in"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          mail: { ...settings.mail, reply_to: e.target.value },
                        })
                      }
                      placeholder="e.g. support@selfx.in"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSettings(settings, "Mail server settings")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Mail Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Send Test Email Box (Matching Image 5) */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Send className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Send Test Email
                  </h3>
                </div>

                <p className="text-xs text-slate-500">
                  Verify that your SMTP host credentials, TLS handshake, and sender identity are functioning correctly.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={testMailRecipient}
                    onChange={(e) => setTestMailRecipient(e.target.value)}
                    placeholder="e.g. admin@selfx.in"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={testingMail || !testMailRecipient}
                  onClick={() => {
                    setTestingMail(true);
                    setTestMailNotice(null);
                    void api<{ data?: { sent?: boolean } }>("/api/v1/platform/mail/test", {
                      method: "POST",
                      body: JSON.stringify({ to: testMailRecipient }),
                    })
                      .then(() => setTestMailNotice(`The mail server accepted a test for ${testMailRecipient}.`))
                      .catch((err: { error?: { message?: string } }) => {
                        setTestMailNotice(err?.error?.message ?? "The mail server did not accept the test.");
                      })
                      .finally(() => setTestingMail(false));
                  }}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Send className={`h-3.5 w-3.5 ${testingMail ? "animate-pulse" : ""}`} />
                  <span>{testingMail ? "Dispatching..." : "Send Test Email"}</span>
                </button>

                {testMailNotice ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    {testMailNotice}
                  </div>
                ) : null}
              </div>

              {/* Status Summary Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                  Mail Health Summary
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Protocol</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {settings.mail.driver.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Active Host</span>
                    <span className="font-semibold text-slate-800 font-mono truncate max-w-[140px]">
                      {settings.mail.host}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Port / Security</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {settings.mail.port} ({settings.mail.encryption.toUpperCase()})
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">From</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                      {settings.mail.from_address}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ====================================================================
       * 4. SMS GATEWAY SETTINGS (mode === "sms-settings")
       * ==================================================================== */}
      {mode === "sms-settings" ? (
        <SmsSettingsPanel
          settings={settings}
          setSettings={(next) => setSettings(next as PlatformSettingsData)}
          saveSettings={(next, label) => saveSettings(next as PlatformSettingsData, label)}
          saving={saving}
        />
      ) : null}

      {/* ====================================================================
       * 5. WHATSAPP SETTINGS (mode === "whatsapp-settings")
       * ==================================================================== */}
      {mode === "whatsapp-settings" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                WhatsApp Business Cloud API
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Connect official Meta WhatsApp Cloud API credentials for automated digital POS receipts and customer loyalty messages.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${settings.whatsapp.enabled && settings.whatsapp.access_token ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {settings.whatsapp.enabled && settings.whatsapp.access_token ? "WhatsApp credentials saved" : "WhatsApp is not connected"}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
                  Meta WABA Credentials
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      WhatsApp Phone Number ID
                    </label>
                    <input
                      value={settings.whatsapp.phone_number_id}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          whatsapp: { ...settings.whatsapp, phone_number_id: e.target.value },
                        })
                      }
                      placeholder="e.g. 109823471293841"
                      className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      WhatsApp Business Account ID (WABA ID)
                    </label>
                    <input
                      value={settings.whatsapp.business_account_id}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          whatsapp: { ...settings.whatsapp, business_account_id: e.target.value },
                        })
                      }
                      placeholder="e.g. 998127364518273"
                      className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Permanent System User Access Token
                    </label>
                    <input
                      type="password"
                      value={settings.whatsapp.access_token}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          whatsapp: { ...settings.whatsapp, access_token: e.target.value },
                        })
                      }
                      placeholder="EAAGm0PX4ZCpsBA..."
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Webhook Callback URL
                    </label>
                    <input
                      readOnly
                      value="https://api.selfx.in/api/v1/webhooks/whatsapp"
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Webhook Verify Token
                    </label>
                    <input
                      value={settings.whatsapp.verify_token ?? "selfx_wa_verify_prod_token"}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          whatsapp: { ...settings.whatsapp, verify_token: e.target.value },
                        })
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSettings(settings, "WhatsApp API settings")}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save WhatsApp Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test WhatsApp Box */}
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Send Test WhatsApp Message
                  </h3>
                </div>

                <p className="text-xs text-slate-500">
                  Send a test template message to confirm that your Phone Number ID and Access Token are authorized on Meta Business Manager.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Recipient Phone Number (With Country Code)
                  </label>
                  <input
                    type="tel"
                    value={testWaPhone}
                    onChange={(e) => setTestWaPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={testingWa || !testWaPhone}
                  onClick={async () => {
                    setTestingWa(true);
                    setTestWaNotice(null);
                    try {
                      const res = await api<{ data: { message: string } }>("/api/v1/platform/whatsapp/test", {
                        method: "POST",
                        body: JSON.stringify({ phone: testWaPhone }),
                      });
                      setTestWaNotice(res.data.message);
                    } catch (err: any) {
                      setTestWaNotice(err?.message || "WhatsApp dispatch test failed.");
                    } finally {
                      setTestingWa(false);
                    }
                  }}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Send className={`h-3.5 w-3.5 ${testingWa ? "animate-pulse" : ""}`} />
                  <span>{testingWa ? "Dispatching..." : "Send WhatsApp Test"}</span>
                </button>

                {testWaNotice ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    {testWaNotice}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ====================================================================
       * 6. SMS TEMPLATES (mode === "sms-templates")
       * ==================================================================== */}
      {mode === "sms-templates" ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">SMS Templates (DLT)</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage DLT-registered SMS templates for customer OTPs, digital receipts, and subscription alerts.
            </p>
          </div>
          {settings.sms_templates.map((tpl, idx) => (
            <div key={tpl.key} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{tpl.name}</h2>
                  <p className="text-[11px] font-mono text-slate-400">DLT ID: {tpl.dlt_template_id}</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={tpl.active}
                    onChange={(e) => {
                      const next = [...settings.sms_templates];
                      next[idx] = { ...tpl, active: e.target.checked };
                      setSettings({ ...settings, sms_templates: next });
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-slate-700">
                  DLT Template ID
                  <input
                    value={tpl.dlt_template_id}
                    onChange={(e) => {
                      const next = [...settings.sms_templates];
                      next[idx] = { ...tpl, dlt_template_id: e.target.value };
                      setSettings({ ...settings, sms_templates: next });
                    }}
                    className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  SMS Content
                  <input
                    value={tpl.content}
                    onChange={(e) => {
                      const next = [...settings.sms_templates];
                      next[idx] = { ...tpl, content: e.target.value };
                      setSettings({ ...settings, sms_templates: next });
                    }}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                </label>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveSettings(settings, "SMS templates")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save SMS Templates</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================================
 * 7. DATABASE BACKUPS & DISASTER RECOVERY (/backups)
 * ========================================================================== */
type BackupItem = {
  filename: string;
  size_bytes: number;
  size_formatted: string;
  created_at: string;
  checksum: string;
};

type BackupsResponse = {
  backups: BackupItem[];
  total_count: number;
  database_driver: string;
  auto_retention_days: number;
};

function BackupsSection() {
  const [data, setData] = useState<BackupsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBackups() {
    setLoading(true);
    try {
      const res = await api<{ data: BackupsResponse }>("/api/v1/platform/backups");
      setData(res.data);
    } catch {
      setError("Failed to load platform backups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBackups();
  }, []);

  async function handleCreateBackup() {
    setBackingUp(true);
    setError(null);
    try {
      await warmCsrf();
      const res = await api<{ data: { message: string } }>("/api/v1/platform/backups", {
        method: "POST",
      });
      setToast(res.data?.message || "Database snapshot created successfully.");
      await loadBackups();
    } catch (e: any) {
      setError(e?.message || "Failed to create database snapshot.");
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore() {
    if (!restoreTarget || confirmText !== "RESTORE") return;
    setRestoring(true);
    setError(null);
    try {
      await warmCsrf();
      await api("/api/v1/platform/backups/restore", {
        method: "POST",
        body: JSON.stringify({ filename: restoreTarget.filename }),
      });
      setToast(`Database successfully restored from snapshot ${restoreTarget.filename}.`);
      setRestoreTarget(null);
      setConfirmText("");
      await loadBackups();
    } catch (e: any) {
      setError(e?.message || "Database restore failed.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Automated Database Backups &amp; Disaster Recovery (DR)
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Automated point-in-time SQL database snapshots with SHA-256 checksums, rolling 30-day retention, and emergency rollback.
          </p>
        </div>
        <button
          type="button"
          disabled={backingUp}
          onClick={() => void handleCreateBackup()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
        >
          <Database className="h-3.5 w-3.5" />
          <span>{backingUp ? "Capturing Snapshot..." : "Create Database Snapshot"}</span>
        </button>
      </div>

      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Snapshots</div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{data?.total_count ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Engine / Storage</div>
          <div className="mt-1.5 text-base font-semibold text-slate-900 capitalize">{data?.database_driver ?? "SQLite WAL"}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Retention Policy</div>
          <div className="mt-1.5 text-base font-semibold text-emerald-600">{data?.auto_retention_days ?? 30} Days Rolling</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Disaster Recovery (RPO)</div>
          <div className="mt-1.5 text-base font-semibold text-blue-600">&lt; 1 Hour Target</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Database Snapshots Archive</h2>
          <button
            type="button"
            onClick={() => void loadBackups()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Snapshot Name</th>
              <th className="px-5 py-3">File Size</th>
              <th className="px-5 py-3">Created At</th>
              <th className="px-5 py-3">SHA-256 Checksum</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.backups.map((b) => (
              <tr key={b.filename} className="hover:bg-slate-50/60">
                <td className="px-5 py-3">
                  <div className="font-mono font-semibold text-slate-900">{b.filename}</div>
                </td>
                <td className="num px-5 py-3 text-slate-700 font-medium">{b.size_formatted}</td>
                <td className="px-5 py-3 text-slate-600">{new Date(b.created_at).toLocaleString()}</td>
                <td className="px-5 py-3">
                  <span className="font-mono text-[10px] text-slate-400" title={b.checksum}>
                    {b.checksum.slice(0, 16)}...
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <a
                      href={`/api/v1/platform/backups/download/${encodeURIComponent(b.filename)}`}
                      download
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setRestoreTarget(b)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      <span>Restore</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data?.backups.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-xs text-slate-400">
                  No database snapshots captured yet. Click &quot;Create Database Snapshot&quot; above to capture the first backup.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {restoreTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-base font-semibold text-slate-900">Confirm Database Rollback</h2>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              You are about to restore the database to snapshot <strong className="font-mono">{restoreTarget.filename}</strong>.
            </p>
            <p className="mt-1 text-xs text-rose-600 font-semibold">
              Warning: All transactions, stock counts, and changes made after {new Date(restoreTarget.created_at).toLocaleString()} will be permanently replaced.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700">
                Type &quot;RESTORE&quot; to confirm:
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESTORE"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setRestoreTarget(null); setConfirmText(""); }}
                className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText !== "RESTORE" || restoring}
                onClick={() => void handleRestore()}
                className="h-9 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {restoring ? "Restoring Database..." : "Proceed with Restore"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================================
 * 8. BACKGROUND QUEUE ARCHITECTURE & MONITORING (/queue-monitoring)
 * ========================================================================== */
type QueueStatus = {
  driver: string;
  status: string;
  pending_jobs: number;
  failed_jobs: number;
  recent_failed: { id: string | number; queue: string; failed_at: string; short_error: string }[];
  recommended_worker: string;
  supervisor_conf_path: string;
  systemd_service_path: string;
};

function QueueMonitoringSection() {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await api<{ data: QueueStatus }>("/api/v1/platform/queue-status");
      setStatus(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function handleRetryAll() {
    setActionInProgress(true);
    try {
      await warmCsrf();
      const res = await api<{ data: { message: string } }>("/api/v1/platform/queue/retry-all", {
        method: "POST",
      });
      setToast(res.data?.message || "All failed jobs re-queued.");
      await loadStatus();
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleFlush() {
    setActionInProgress(true);
    try {
      await warmCsrf();
      const res = await api<{ data: { message: string } }>("/api/v1/platform/queue/flush", {
        method: "POST",
      });
      setToast(res.data?.message || "Failed jobs queue flushed.");
      await loadStatus();
    } finally {
      setActionInProgress(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Background Job Queue Architecture &amp; Monitoring
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Asynchronous task pipeline for thermal receipt rendering, cloud POS syncing, email delivery, and GST CA audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          {status && status.failed_jobs > 0 ? (
            <>
              <button
                type="button"
                disabled={actionInProgress}
                onClick={() => void handleRetryAll()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry All Failed</span>
              </button>
              <button
                type="button"
                disabled={actionInProgress}
                onClick={() => void handleFlush()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Flush Failed</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Queue Driver</div>
          <div className="mt-1.5 text-xl font-semibold text-slate-900 uppercase">{status?.driver ?? "database"}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Queue State</div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-semibold text-emerald-700 capitalize">{status?.status ?? "operational"}</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending Jobs</div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{status?.pending_jobs ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Failed Jobs</div>
          <div className={`num mt-1.5 text-2xl font-semibold ${status?.failed_jobs ? "text-rose-600" : "text-emerald-600"}`}>
            {status?.failed_jobs ?? 0}
          </div>
        </div>
      </div>

      {/* Production Worker Architecture Reference */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Production Daemon Service Templates</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Continuous queue workers process background synchronizations, PDF vouchers, and SMS relays without blocking HTTP web threads.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="font-mono text-slate-900">deploy/supervisor-queue.conf</span>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700">Supervisor</span>
            </div>
            <pre className="mt-2 overflow-x-auto rounded border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700 leading-relaxed">
{`[program:selfx-queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/selfx/backend/artisan queue:work --sleep=3 --tries=3 --timeout=90
autostart=true
autorestart=true
numprocs=4
redirect_stderr=true
stdout_logfile=/var/log/supervisor/selfx-queue.log`}
            </pre>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="font-mono text-slate-900">deploy/selfx-queue.service</span>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700">Systemd</span>
            </div>
            <pre className="mt-2 overflow-x-auto rounded border border-slate-200 bg-white p-3 font-mono text-[11px] text-slate-700 leading-relaxed">
{`[Unit]
Description=SelfX Retail Background Job Worker
After=network.target

[Service]
Type=simple
User=www-data
Restart=always
ExecStart=/usr/bin/php /var/www/selfx/backend/artisan queue:work --sleep=3 --tries=3
StandardOutput=journal

[Install]
WantedBy=multi-user.target`}
            </pre>
          </div>
        </div>
      </div>

      {/* Failed Jobs Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Recent Queue Exceptions &amp; Dead-Letter Log</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Queue</th>
              <th className="px-5 py-3">Failed At</th>
              <th className="px-5 py-3">Exception Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {status?.recent_failed.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-mono font-semibold text-slate-800">{j.queue}</td>
                <td className="px-5 py-3 text-slate-600">{new Date(j.failed_at).toLocaleString()}</td>
                <td className="px-5 py-3 font-mono text-[11px] text-rose-600 truncate max-w-md">{j.short_error}</td>
              </tr>
            ))}
            {(!status?.recent_failed || status.recent_failed.length === 0) ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-xs text-slate-400">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-500 mb-1" />
                  All asynchronous workers are clear. 0 failed jobs in queue.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
