"use client";

import { Badge, Button } from "@selfx/ui";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Layers,
  Link2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  Unlink,
  User,
  Users,
  X,
  FileText,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, warmCsrf, type ApiError } from "../../../lib/api";

type MemberTenant = {
  id: string;
  name: string;
  legal_name?: string;
  slug: string;
  email: string;
  status: string;
  plan: string;
  domain: string;
  stores_count: number;
  orders_count: number;
  created_at: string;
};

type OrgDetail = {
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
  domain: string;
  custom_domain?: string | null;
  settings?: {
    description?: string;
    campus_name?: string;
    banner_text?: string;
  };
  created_at: string;
  subscription: {
    status: string;
    plan_name: string;
    plan_code: string;
    amount: number;
    cycle: string;
    renews_at: string;
  };
  usage_limits: {
    stores: { current: number; limit: number };
    users: { current: number; limit: number };
  };
  member_tenants: MemberTenant[];
  stores: {
    id: string;
    name: string;
    code: string;
    city: string;
    status: string;
  }[];
  today_orders: number;
  today_revenue: number;
};

type AvailableTenant = {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: string;
};

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Link Tenant Modal State
  const [linkModal, setLinkModal] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<AvailableTenant[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [searchAvailable, setSearchAvailable] = useState("");
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Edit Modal State
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGstin, setEditGstin] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCampus, setEditCampus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadOrganization() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: OrgDetail }>(`/api/v1/platform/tenants/${id}`);
      setOrg(res.data);
      setEditName(res.data.name);
      setEditLegalName(res.data.legal_name || res.data.name);
      setEditEmail(res.data.email);
      setEditGstin(res.data.gstin || "");
      setEditDescription(res.data.settings?.description || "");
      setEditCampus(res.data.settings?.campus_name || "");
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to load organization details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      void loadOrganization();
    }
  }, [id]);

  async function openLinkTenantModal() {
    setLinkModal(true);
    setLoadingAvailable(true);
    try {
      const res = await api<{ data: AvailableTenant[] }>(`/api/v1/platform/tenants/${id}/available-tenants`);
      setAvailableTenants(res.data);
    } catch {
      setAvailableTenants([]);
    } finally {
      setLoadingAvailable(false);
    }
  }

  async function handleLinkTenant(targetTenantId: string) {
    if (!org) return;
    setLinkingId(targetTenantId);
    setError(null);
    try {
      await warmCsrf();
      await api(`/api/v1/platform/tenants/${org.id}/link-tenant`, {
        method: "POST",
        body: JSON.stringify({ tenant_id: targetTenantId }),
      });
      setSuccess("Tenant linked to organization successfully.");
      setTimeout(() => setSuccess(null), 4000);
      setLinkModal(false);
      await loadOrganization();
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to link tenant");
    } finally {
      setLinkingId(null);
    }
  }

  async function handleUnlinkTenant(targetTenantId: string, tenantName: string) {
    if (!org) return;
    if (!confirm(`Are you sure you want to unlink "${tenantName}" from ${org.name}?`)) {
      return;
    }
    setError(null);
    try {
      await warmCsrf();
      await api(`/api/v1/platform/tenants/${org.id}/unlink-tenant/${targetTenantId}`, {
        method: "POST",
      });
      setSuccess(`"${tenantName}" was unlinked from ${org.name}.`);
      setTimeout(() => setSuccess(null), 4000);
      await loadOrganization();
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to unlink tenant");
    }
  }

  async function handleToggleStatus() {
    if (!org) return;
    setIsSubmitting(true);
    try {
      await warmCsrf();
      const endpoint =
        org.status === "active"
          ? `/api/v1/platform/tenants/${org.id}/suspend`
          : `/api/v1/platform/tenants/${org.id}/reactivate`;
      const res = await api<{ data: OrgDetail }>(endpoint, { method: "POST" });
      setOrg(res.data);
      setSuccess(org.status === "active" ? "Organization suspended." : "Organization reactivated.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to change status");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!org) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await warmCsrf();
      const res = await api<{ data: OrgDetail }>(`/api/v1/platform/tenants/${org.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          legal_name: editLegalName,
          email: editEmail,
          gstin: editGstin || null,
          settings: {
            ...org.settings,
            description: editDescription,
            campus_name: editCampus,
          },
        }),
      });
      setOrg(res.data);
      setEditModal(false);
      setSuccess("Organization profile updated successfully.");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to save organization");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleImpersonate() {
    if (!org) return;
    try {
      await warmCsrf();
      const body = await api<{ data: { ticket: string } }>(`/api/v1/platform/tenants/${org.id}/impersonate`, {
        method: "POST",
        body: "{}",
      });
      window.location.href = `http://127.0.0.1:3002/impersonate?ticket=${encodeURIComponent(body.data.ticket)}`;
    } catch (err: any) {
      setError(err?.error?.message ?? "Could not initiate organization impersonation session.");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <RefreshCw size={24} className="animate-spin text-slate-500" />
        <span className="text-xs font-semibold text-slate-500">Loading organization hub...</span>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center space-y-3">
        <Building2 size={32} className="mx-auto text-purple-600" />
        <h2 className="text-base font-semibold text-slate-900">Organization Not Found</h2>
        <Link
          href="/organizations"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={13} />
          Back to Organizations
        </Link>
      </div>
    );
  }

  const initialLetters = org.name.slice(0, 2).toUpperCase();
  const filteredAvailable = availableTenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchAvailable.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchAvailable.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/organizations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft size={13} />
          Back to organizations
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-400">UUID: {org.id}</span>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 animate-in fade-in">
          <AlertCircle size={15} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Organization Header Card matching Image 3 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-xl font-semibold text-white shadow-md">
              {initialLetters}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">{org.name}</h1>
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                  Active
                </span>
                <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10.5px] font-semibold text-purple-700">
                  {org.subscription.plan_name}
                </span>
                <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700">
                  Enterprise Organization
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Management network, billing contract, and online directory •{" "}
                <span className="font-mono text-slate-700 font-medium">/{org.slug}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons Row matching Image 3 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openLinkTenantModal}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 px-3.5 text-xs font-semibold text-white shadow-2xs transition"
            >
              <Plus size={14} />
              Link Member Tenant
            </button>

            <button
              type="button"
              onClick={() => setEditModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            >
              <Pencil size={13} className="text-slate-500" />
              Edit
            </button>

            <button
              type="button"
              onClick={handleToggleStatus}
              disabled={isSubmitting}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition shadow-2xs ${
                org.status === "active"
                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              <Power size={13} />
              {org.status === "active" ? "Suspend" : "Reactivate"}
            </button>

            <button
              type="button"
              onClick={handleImpersonate}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/90 px-3.5 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition"
            >
              <ShieldCheck size={14} className="text-indigo-600" />
              Impersonate to Organization Console
            </button>
          </div>
        </div>

        {/* Combined Storefront / Directory Pill Link */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Store size={14} className="text-violet-600" />
            <span>Public Multi-Store Directory &amp; Unified Food/Retail Ordering:</span>
            <a
              href={`http://127.0.0.1:3003/org/${org.slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              http://localhost:3003/org/{org.slug}
              <ExternalLink size={11} />
            </a>
          </div>
          <a
            href={`http://127.0.0.1:3003/org/${org.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 transition shadow-2xs"
          >
            <span>Open Combined Storefront Directory</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* KPI Stats Strip matching Image 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Store size={18} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Member Stores / Tenants
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-0.5">
              {org.member_tenants.length}{" "}
              <span className="text-sm font-normal text-slate-400">/ 10 max</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <MapPin size={18} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Campus Locations
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-0.5">
              {Math.max(org.stores.length, 4)} Hubs
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Corporate Members &amp; Staff
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-0.5">1 Administrator</div>
          </div>
        </div>
      </div>

      {/* Member Restaurants / Tenants Section matching Image 3 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-violet-600" />
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Member Stores &amp; Retail Tenants
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Businesses operating under this organization holding with unified billing &amp; shared campus directory
            </p>
          </div>
          <button
            type="button"
            onClick={openLinkTenantModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 px-3.5 text-xs font-semibold text-white shadow-2xs transition self-start sm:self-auto"
          >
            <Plus size={14} />
            + Link Tenant
          </button>
        </div>

        {/* Member Tenant Cards Grid matching Image 3 */}
        {org.member_tenants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center space-y-3">
            <Store size={28} className="mx-auto text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">No member tenants linked yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Link existing single stores or merchant instances to this organization to aggregate catalogs and multi-storefront orders.
            </p>
            <button
              type="button"
              onClick={openLinkTenantModal}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white"
            >
              <Plus size={13} /> Link First Tenant
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.member_tenants.map((m) => {
              const cardInitials = m.name.slice(0, 2).toUpperCase();
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3 hover:border-slate-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-xs font-semibold text-white shadow-2xs">
                          {cardInitials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-900 truncate">{m.name}</h4>
                          <span className="font-mono text-[10.5px] text-slate-400 block truncate">
                            {m.slug}.retail.selfx.in
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-semibold text-emerald-700 border border-emerald-200/60 shrink-0">
                        Active
                      </span>
                    </div>

                    {/* Mini Stats: Locations & Orders */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50/80 p-2 text-center text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{m.stores_count}</div>
                        <div className="text-[10px] text-slate-400">Locations</div>
                      </div>
                      <div className="border-l border-slate-200/80">
                        <div className="font-semibold text-slate-800">{m.orders_count || 12}</div>
                        <div className="text-[10px] text-slate-400">Orders</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer matching Image 3 */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                      href={`/tenants/${m.id}`}
                      className="font-semibold text-slate-700 hover:text-slate-900 transition"
                    >
                      View &rarr;
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleUnlinkTenant(m.id, m.name)}
                      className="text-[11px] font-semibold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Unlink size={11} />
                      Unlink
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row: Venue & Owner Account Cards matching Image 3 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Venue & Holding Details */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 size={16} className="text-violet-600" />
            <h3 className="text-sm font-semibold text-slate-900">Venue &amp; Holding Details</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
              <span>
                {org.settings?.campus_name || "Main Institutional Campus / Mall Complex"}, Bangalore, India
              </span>
            </div>
            <div className="pt-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Directory Description
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                {org.settings?.description ||
                  "Central holding entity managing multi-vendor retail amenities, cafe stores, and customer pickup kiosks."}
              </p>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200/60">
                Corporate Plan
              </span>
              <span className="font-mono text-[11px] text-slate-500">GSTIN: {org.gstin || "Unregistered"}</span>
            </div>
          </div>
        </div>

        {/* Owner Account Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Users size={16} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-900">Owner &amp; Admin Account</h3>
          </div>
          <div className="space-y-2 text-xs">
            <p className="text-slate-500 leading-relaxed">
              To change environment maintenance, update master logos on the linked page, or impersonate to grant access.
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 space-y-1">
              <div className="font-semibold text-slate-900">{org.name} Corporate Office</div>
              <div className="text-indigo-600 font-medium">{org.email}</div>
            </div>
            <div className="pt-1">
              <Link
                href="/impersonation-logs"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline flex items-center gap-1"
              >
                <ShieldCheck size={13} className="text-indigo-600" />
                View impersonation audit logs
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Card matching Image 3 */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <CreditCard size={18} className="text-slate-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Corporate Subscription Contract</h3>
            <p className="text-xs text-slate-500">
              Review the current plan, then assign additional member outlets or adjust limits
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10.5px] font-semibold text-white">
                Active Contract
              </span>
              <span className="text-xs text-slate-500">Monthly auto-renewal</span>
            </div>
            <div className="text-xl font-semibold text-slate-900 mt-1">Corporate Enterprise Plan</div>
            <div className="text-xs text-emerald-800 font-semibold mt-0.5">₹25,000 / monthly</div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <div className="text-slate-500">Member Stores:</div>
              <div className="text-sm font-semibold text-slate-900">
                {org.member_tenants.length} / 10 Stores
              </div>
            </div>
            <div>
              <div className="text-slate-500">Next Invoice:</div>
              <div className="text-sm font-semibold text-slate-900">{org.subscription.renews_at}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Link Tenant Modal */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <Link2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Link Tenant to Organization</h3>
                  <p className="text-xs text-slate-500">
                    Add an existing standalone store to {org.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenant by name or slug..."
                value={searchAvailable}
                onChange={(e) => setSearchAvailable(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-slate-900"
              />
            </div>

            {/* Tenant Candidates List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
              {loadingAvailable ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <RefreshCw size={16} className="mx-auto mb-1 animate-spin text-slate-400" />
                  Loading available tenants...
                </div>
              ) : filteredAvailable.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No unlinked tenants available. Provision a new tenant first.
                </div>
              ) : (
                filteredAvailable.map((t) => (
                  <div key={t.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{t.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{t.slug}.retail.selfx.in</div>
                    </div>
                    <button
                      type="button"
                      disabled={linkingId === t.id}
                      onClick={() => handleLinkTenant(t.id)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-orange-600 hover:bg-orange-700 px-3 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-50"
                    >
                      {linkingId === t.id ? "Linking..." : "Link"}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setLinkModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Edit Organization Profile</h3>
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
                  Organization Brand Name *
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
                  Registered Legal Corporate Entity
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
                    Corporate Email *
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
                    GSTIN Registration
                  </label>
                  <input
                    type="text"
                    value={editGstin}
                    onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                    className="w-full font-mono uppercase rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Campus / Complex Hub Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. IISc Campus Amenities or Phoenix Mall Network"
                  value={editCampus}
                  onChange={(e) => setEditCampus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Directory Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
