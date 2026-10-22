"use client";

import { Badge, Button } from "@selfx/ui";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  CreditCard,
  Database,
  ExternalLink,
  Globe,
  Layers,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Store,
  Trash2,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, warmCsrf, type ApiError } from "../../../lib/api";

type TenantDetail = {
  id: string;
  name: string;
  legal_name?: string;
  slug: string;
  email: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  status: string;
  kind?: string;
  timezone?: string;
  currency?: string;
  domain: string;
  custom_domain?: string | null;
  created_at: string;
  updated_at?: string;
  subscription: {
    status: string;
    plan_name: string;
    plan_code: string;
    amount: number;
    cycle: string;
    renews_at: string;
  };
  usage_limits: {
    products: { current: number; limit: number };
    users: { current: number; limit: number };
    stores: { current: number; limit: number };
    customers: { current: number; limit: number };
    pos_counters: { current: number; limit: number };
    whatsapp_messages: { current: number; limit: number };
  };
  feature_access: string[];
  db_config: {
    engine: string;
    host: string;
    port: number;
    name: string;
    username: string;
    status: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  stores: {
    id: string;
    name: string;
    code: string;
    city: string;
    status: string;
  }[];
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    created_at?: string;
  }[];
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Modals state
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGstin, setEditGstin] = useState("");
  const [editCustomDomain, setEditCustomDomain] = useState("");

  // DB test status
  const [dbTesting, setDbTesting] = useState(false);
  const [dbResult, setDbResult] = useState<string | null>(null);

  async function loadTenant() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: TenantDetail }>(`/api/v1/platform/tenants/${id}`);
      setTenant(res.data);
      setEditName(res.data.name);
      setEditLegalName(res.data.legal_name || res.data.name);
      setEditEmail(res.data.email);
      setEditPhone(res.data.phone || "");
      setEditGstin(res.data.gstin || "");
      setEditCustomDomain(res.data.custom_domain || "");
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to load tenant details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      void loadTenant();
    }
  }, [id]);

  async function handleToggleStatus() {
    if (!tenant) return;
    setIsSubmitting(true);
    try {
      await warmCsrf();
      const endpoint =
        tenant.status === "active"
          ? `/api/v1/platform/tenants/${tenant.id}/suspend`
          : `/api/v1/platform/tenants/${tenant.id}/reactivate`;

      const res = await api<{ data: TenantDetail }>(endpoint, { method: "POST" });
      setTenant(res.data);
      setActionMessage(
        tenant.status === "active" ? "Tenant account suspended." : "Tenant reactivated successfully."
      );
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to toggle tenant status");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!tenant) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await warmCsrf();
      const res = await api<{ data: TenantDetail }>(`/api/v1/platform/tenants/${tenant.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          legal_name: editLegalName,
          email: editEmail,
          phone_e164: editPhone || null,
          gstin: editGstin || null,
          custom_domain: editCustomDomain.trim() || null,
        }),
      });
      setTenant(res.data);
      setEditModal(false);
      setActionMessage("Tenant details updated successfully.");
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to update tenant");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!tenant) return;
    if (deleteConfirmationInput.trim() !== tenant.slug) {
      setError(`Confirmation failed. Please type "${tenant.slug}" exactly to delete.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await warmCsrf();
      await api(`/api/v1/platform/tenants/${tenant.id}`, { method: "DELETE" });
      router.push("/tenants");
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to delete tenant");
      setIsSubmitting(false);
    }
  }

  async function handleImpersonate() {
    if (!tenant) return;
    try {
      await warmCsrf();
      const body = await api<{ data: { ticket: string } }>(`/api/v1/platform/tenants/${tenant.id}/impersonate`, {
        method: "POST",
        body: "{}",
      });
      window.location.href = `/impersonate?ticket=${encodeURIComponent(body.data.ticket)}`;
    } catch (err: any) {
      setError(err?.error?.message ?? "Could not initiate impersonation session.");
    }
  }

  async function handleTestDb() {
    if (!tenant) return;
    setDbTesting(true);
    setDbResult(null);
    try {
      await warmCsrf();
      const res = await api<{ data: { status: string; latency_ms: number; engine: string } }>(
        `/api/v1/platform/tenants/${tenant.id}/test-db`,
        { method: "POST" }
      );
      setDbResult(`Connected (${res.data.latency_ms}ms) • ${res.data.engine}`);
    } catch {
      setDbResult("Connection timeout or unreachable");
    } finally {
      setDbTesting(false);
    }
  }

  async function handleAdminAction(action: "migrate" | "seed" | "clear_cache" | "sync_catalog") {
    if (!tenant) return;
    try {
      await warmCsrf();
      const res = await api<{ data: { message: string } }>(`/api/v1/platform/tenants/${tenant.id}/admin-action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setActionMessage(res.data.message);
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to execute administrative action");
    }
  }

  function copyToClipboard(text: string, type: "id" | "domain") {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "id") {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedDomain(true);
        setTimeout(() => setCopiedDomain(false), 2000);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <RefreshCw size={24} className="animate-spin text-slate-500" />
        <span className="text-xs font-semibold text-slate-500">Loading tenant details...</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center space-y-3">
        <ShieldAlert size={32} className="mx-auto text-amber-500" />
        <h2 className="text-base font-semibold text-slate-900">Tenant Not Found</h2>
        <p className="text-xs text-slate-500">The requested tenant workspace could not be located.</p>
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={13} />
          Back to Tenants
        </Link>
      </div>
    );
  }

  const initialLetter = tenant.name.charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/tenants"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft size={13} />
          Back to tenants
        </Link>
        <span className="font-mono text-[11px] text-slate-400">UUID: {tenant.id}</span>
      </div>

      {/* Notifications */}
      {actionMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 animate-in fade-in">
          <ShieldAlert size={15} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Profile Header matching Image 1 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-semibold text-white shadow-md">
              {initialLetter}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">{tenant.name}</h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${
                    tenant.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      tenant.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {tenant.status.toUpperCase()}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700 border border-blue-200">
                  <Store size={11} />
                  {tenant.kind === "organization" ? "Enterprise Organization" : "Retail Merchant"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Registered on{" "}
                {new Date(tenant.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                • Slug: <span className="font-mono text-slate-700 font-medium">{tenant.slug}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons Row matching Image 1 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition"
            >
              <Pencil size={13} className="text-slate-500" />
              Edit
            </button>

            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isSubmitting}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition shadow-2xs ${
                tenant.status === "active"
                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <Power size={13} />
              {tenant.status === "active" ? "Suspend" : "Reactivate"}
            </button>

            <button
              type="button"
              onClick={handleImpersonate}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/90 px-3.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition"
            >
              <ShieldCheck size={14} className="text-indigo-600" />
              Impersonate
            </button>

            <button
              type="button"
              onClick={() => setDeleteModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 shadow-2xs hover:bg-red-600 hover:text-white hover:border-red-600 transition"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Plan on Left (8 cols), Domains & Database on Right (4 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols) */}
        <div className="space-y-6 lg:col-span-8">
          {/* Section 1: Tenant details Card */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store size={16} className="text-slate-600" />
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">Tenant details</h2>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  Tenant ID
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(tenant.id, "id")}
                  className="group inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                >
                  <span>{tenant.id}</span>
                  {copiedId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-400 group-hover:text-slate-700" />}
                </button>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  Status
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {tenant.status === "active" ? "Active" : "Suspended"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  Subscription Plan
                </span>
                <div className="text-right">
                  <span className="font-semibold text-slate-900">{tenant.subscription.plan_name}</span>
                  <span className="text-slate-500 text-[11px] ml-1">
                    — ₹{tenant.subscription.amount.toLocaleString("en-IN")}/{tenant.subscription.cycle}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  Billing Status
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200/60">
                  Active • Renews {tenant.subscription.renews_at}
                </span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  Admin Owner Email
                </span>
                <span className="font-medium text-slate-800">{tenant.email}</span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  Owner Contact Phone
                </span>
                <span className="font-medium text-slate-800">{tenant.phone || "—"}</span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  Legal Entity Name
                </span>
                <span className="font-medium text-slate-800">{tenant.legal_name || tenant.name}</span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  GSTIN (Tax ID)
                </span>
                <span className="font-mono text-slate-800">{tenant.gstin || "Unregistered"}</span>
              </div>

              <div className="flex items-center justify-between py-2.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10.5px]">
                  Registered At
                </span>
                <span className="text-slate-600">
                  {new Date(tenant.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Plan limits & features Card matching Image 1 */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                  Plan limits &amp; features
                </h2>
              </div>
              <Link
                href="/plans"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <Pencil size={12} />
                Edit plan
              </Link>
            </div>

            {/* Usage Limits Grid */}
            <div className="space-y-2">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                Usage Limits
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Products Catalog",
                    cur: tenant.usage_limits.products.current,
                    max: tenant.usage_limits.products.limit,
                  },
                  {
                    label: "Users & Staff",
                    cur: tenant.usage_limits.users.current,
                    max: tenant.usage_limits.users.limit,
                  },
                  {
                    label: "Stores & Warehouses",
                    cur: tenant.usage_limits.stores.current,
                    max: tenant.usage_limits.stores.limit,
                  },
                  {
                    label: "Customer Directory",
                    cur: tenant.usage_limits.customers.current,
                    max: tenant.usage_limits.customers.limit,
                  },
                  {
                    label: "POS Counters / Terminals",
                    cur: tenant.usage_limits.pos_counters.current,
                    max: tenant.usage_limits.pos_counters.limit,
                  },
                  {
                    label: "WhatsApp Notifications / Mo",
                    cur: tenant.usage_limits.whatsapp_messages.current,
                    max: tenant.usage_limits.whatsapp_messages.limit,
                  },
                ].map((item) => {
                  const pct = Math.min(Math.round((item.cur / item.max) * 100), 100);
                  return (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <span className="font-mono text-emerald-600 font-semibold">
                          {item.cur} <span className="text-slate-400 font-normal">/ {item.max.toLocaleString()}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feature Access Chips */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                Feature Access
              </span>
              <div className="flex flex-wrap gap-2">
                {tenant.feature_access.map((feat) => (
                  <span
                    key={feat}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                  >
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Admin Maintenance Actions */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap size={16} className="text-amber-600" />
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                Admin Maintenance Actions
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Trigger administrative provisioning or cache maintenance for this tenant instance.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-4 pt-1">
              <button
                type="button"
                onClick={() => handleAdminAction("migrate")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/70 py-2 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-2xs"
              >
                <Database size={13} />
                Re-run Migrations
              </button>
              <button
                type="button"
                onClick={() => handleAdminAction("seed")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 py-2 px-3 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition shadow-2xs"
              >
                <RefreshCw size={13} />
                Re-seed Defaults
              </button>
              <button
                type="button"
                onClick={() => handleAdminAction("clear_cache")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 py-2 px-3 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 transition shadow-2xs"
              >
                <Cpu size={13} />
                Clear Cache
              </button>
              <button
                type="button"
                onClick={() => handleAdminAction("sync_catalog")}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 py-2 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
              >
                <Server size={13} />
                Sync GS1 Catalog
              </button>
            </div>
          </div>

          {/* Section 4: Users / Staff Table matching Image 1 */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                  Users &amp; Staff Accounts
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {tenant.users.length} active login account{tenant.users.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-3.5 py-2.5">User</th>
                    <th className="px-3.5 py-2.5">Email</th>
                    <th className="px-3.5 py-2.5">Role</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenant.users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800 flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600">{u.email}</td>
                      <td className="px-3.5 py-2.5">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          {u.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={handleImpersonate}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          Login as user &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="space-y-6 lg:col-span-4">
          {/* Section: Domains Card matching Image 1 */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">Domains</h2>
              </div>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 border border-emerald-200/60">
                1 Domain
              </span>
            </div>

            {/* Primary Subdomain */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <ExternalLink size={13} className="text-slate-400" />
                  <span className="font-mono">{tenant.domain}</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>System Subdomain (SSL Managed)</span>
                <a
                  href={`/store?store=${tenant.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Visit store &rarr;
                </a>
              </div>
            </div>

            {/* Custom Domain Section */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Custom Domain Mapping
              </label>
              {tenant.custom_domain ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold font-mono text-indigo-900">{tenant.custom_domain}</div>
                    <div className="text-[10.5px] text-slate-500">CNAME configured &amp; routed</div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Live
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. store.annapurna.com"
                      value={editCustomDomain}
                      onChange={(e) => setEditCustomDomain(e.target.value)}
                      className="h-8 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 transition"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    Add CNAME record pointing to <code className="font-mono text-slate-600">cname.selfx.in</code>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section: Database Configuration Card matching Image 1 */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-slate-600" />
                <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                  Database Configuration
                </h2>
              </div>
              <button
                type="button"
                onClick={handleTestDb}
                disabled={dbTesting}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <RefreshCw size={11} className={dbTesting ? "animate-spin" : ""} />
                Test Connection
              </button>
            </div>

            {dbResult && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
                {dbResult}
              </div>
            )}

            <div className="rounded-lg bg-emerald-50/70 border border-emerald-200/60 p-2 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>{tenant.db_config.status}</span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex items-center justify-between py-1.5">
                <span className="font-semibold text-slate-400 text-[10.5px]">DB HOST</span>
                <span className="font-mono font-medium text-slate-800">{tenant.db_config.host}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-semibold text-slate-400 text-[10.5px]">DB NAME</span>
                <span className="font-mono font-medium text-slate-800">{tenant.db_config.name}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-semibold text-slate-400 text-[10.5px]">DB USERNAME</span>
                <span className="font-mono text-slate-800">{tenant.db_config.username}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="font-semibold text-slate-400 text-[10.5px]">DB PORT</span>
                <span className="font-mono text-slate-800">{tenant.db_config.port}</span>
              </div>
            </div>
          </div>

          {/* Section: Linked Organization (if any) */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 size={16} className="text-purple-600" />
              <h2 className="text-sm font-semibold tracking-tight text-slate-900">
                Parent Organization
              </h2>
            </div>
            {tenant.organization ? (
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-xs text-purple-900">{tenant.organization.name}</div>
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                    Linked Holding
                  </span>
                </div>
                <div className="text-[11px] text-purple-700">
                  Slug: <span className="font-mono font-semibold">{tenant.organization.slug}</span>
                </div>
                <Link
                  href={`/organizations/${tenant.organization.id}`}
                  className="text-xs font-semibold text-purple-700 hover:underline block pt-1"
                >
                  View organization hub &rarr;
                </Link>
              </div>
            ) : (
              <div className="text-xs text-slate-500 space-y-2">
                <p>This tenant operates as an independent standalone merchant business.</p>
                <Link
                  href="/organizations"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <Plus size={12} /> Link to an Enterprise Organization
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Tenant Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Edit Tenant Details</h3>
              <button
                type="button"
                onClick={() => setEditModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  value={editLegalName}
                  onChange={(e) => setEditLegalName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  GSTIN / Tax ID
                </label>
                <input
                  type="text"
                  value={editGstin}
                  onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                  className="w-full font-mono uppercase rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Custom Domain Mapping (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. store.annapurna.com"
                  value={editCustomDomain}
                  onChange={(e) => setEditCustomDomain(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Delete Tenant Workspace</h3>
                <p className="text-xs text-slate-500">Irreversible Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong>{tenant.name}</strong>? All store items, sales logs, and terminal pairings will be archived and inaccessible.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-600">
                Please type <span className="font-mono font-semibold text-red-700">{tenant.slug}</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder={tenant.slug}
                className="w-full font-mono rounded-lg border border-red-300 bg-red-50/40 px-3 py-2 text-xs outline-none focus:border-red-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setDeleteModal(false)}>
                Cancel
              </Button>
              <button
                type="button"
                disabled={deleteConfirmationInput.trim() !== tenant.slug || isSubmitting}
                onClick={handleDelete}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Confirm & Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
