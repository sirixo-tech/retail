"use client";

import { Badge, Button, PageHeader } from "@selfx/ui";
import {
  Building2,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Layers,
  Lock,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, warmCsrf, type ApiError } from "../../lib/api";

type Tenant = {
  id: string;
  name: string;
  legal_name?: string;
  email: string;
  slug: string;
  domain: string;
  status: string;
  kind?: string;
  plan: string | null;
  gstin?: string;
  created_at: string;
};

export default function TenantsPage() {
  const [rows, setRows] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "organization" | "single_store">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [impersonateTarget, setImpersonateTarget] = useState<Tenant | null>(null);
  const [impersonateReason, setImpersonateReason] = useState("");

  // Form State
  const [formStep, setFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState<"single_store" | "organization">("single_store");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [planCode, setPlanCode] = useState("starter");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [city, setCity] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [pincode, setPincode] = useState("");

  async function load() {
    setLoading(true);
    try {
      const body = await api<{ data: Tenant[] }>("/api/v1/platform/tenants");
      setRows(body.data ?? []);
    } catch (err) {
      console.error("Failed to load tenants:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleBusinessNameChange(name: string) {
    setBusinessName(name);
    if (!legalName) setLegalName(name);
    // Auto generate clean slug
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);
    setSlug(generatedSlug);
  }

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  }

  async function viewStore(id: string) {
    setViewError(null);
    try {
      await warmCsrf();
      const body = await api<{ data: { ticket: string } }>(`/api/v1/platform/tenants/${id}/impersonate`, {
        method: "POST",
        body: "{}",
      });
      window.location.href = `http://127.0.0.1:3002/impersonate?ticket=${encodeURIComponent(body.data.ticket)}`;
    } catch (err) {
      const body = err as ApiError;
      setViewError(body.error?.message ?? "Could not open that store.");
    }
  }

  async function handleCreateTenant(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await warmCsrf();
      await api("/api/v1/platform/tenants", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          business_name: businessName,
          legal_name: legalName || businessName,
          slug: slug.toLowerCase().trim(),
          owner_name: ownerName,
          email: ownerEmail,
          password: password,
          phone: phone || null,
          gstin: gstin ? gstin.toUpperCase().trim() : null,
          kind: kind,
          plan_code: planCode,
          cycle: cycle,
        }),
      });

      setOpenModal(false);
      resetForm();
      await load();
    } catch (caught) {
      const details = (caught as ApiError).error?.details;
      const first = details ? Object.values(details)[0]?.[0] : null;
      setError(first ?? (caught as ApiError).error?.message ?? "Could not create the tenant.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFormStep(1);
    setBusinessName("");
    setLegalName("");
    setSlug("");
    setKind("single_store");
    setGstin("");
    setPhone("");
    setOwnerName("");
    setOwnerEmail("");
    setPassword("");
    setPlanCode("starter");
    setCity("Bangalore");
    setAddressLine("");
    setPincode("");
    setError(null);
  }

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (activeTab === "organization" && r.kind !== "organization") return false;
      if (activeTab === "single_store" && r.kind === "organization") return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.domain.toLowerCase().includes(q) ||
        (r.legal_name && r.legal_name.toLowerCase().includes(q))
      );
    });
  }, [rows, activeTab, searchQuery]);

  const stats = useMemo(() => {
    const total = rows.length;
    const orgs = rows.filter((r) => r.kind === "organization").length;
    const single = total - orgs;
    const active = rows.filter((r) => r.status === "active").length;
    return { total, orgs, single, active };
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants & Organizations"
        description="Provision, manage, and monitor retail merchants, multi-branch enterprise organizations, and subscription lifecycles."
        aside={
          <div className="flex items-center gap-2">
            <Link
              href="/impersonation-logs"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition-colors shadow-2xs"
            >
              <UserCheck size={14} className="text-primary" />
              Impersonation Logs
            </Link>
            <Button onClick={() => setOpenModal(true)} className="gap-2">
              <Building2 size={15} />
              Create tenant
            </Button>
          </div>
        }
      />

      {viewError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {viewError}
        </div>
      ) : null}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Store size={14} className="text-accent" />
            Total Retailers
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{stats.total}</div>
          <p className="mt-0.5 text-[11px] text-faint">Registered merchant accounts</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Building2 size={14} className="text-violet-600" />
            Multi-Tenant Orgs
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{stats.orgs}</div>
          <p className="mt-0.5 text-[11px] text-faint">Multi-branch enterprise groups</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Layers size={14} className="text-blue-600" />
            Single Store Retailers
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{stats.single}</div>
          <p className="mt-0.5 text-[11px] text-faint">Standalone retail outlets</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <ShieldCheck size={14} className="text-emerald-600" />
            Active &amp; Provisioned
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{stats.active}</div>
          <p className="mt-0.5 text-[11px] text-faint">Ready for billing &amp; storefront</p>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all" ? "bg-accent text-accent-ink shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            All Tenants ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("organization")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "organization" ? "bg-accent text-accent-ink shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            Organizations ({stats.orgs})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("single_store")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "single_store" ? "bg-accent text-accent-ink shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            Single Store ({stats.single})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenant, slug, email..."
            className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-hidden"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <table className="w-full text-left text-xs text-ink">
          <thead className="border-b border-line bg-surface-muted text-[11px] font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Tenant &amp; Legal Entity</th>
              <th className="px-4 py-3">Structure</th>
              <th className="px-4 py-3">Storefront Domain</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  <RefreshCw size={18} className="mx-auto animate-spin text-accent" />
                  <p className="mt-2 text-xs">Loading tenant registry...</p>
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No tenants match your search filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-surface-muted/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{row.name}</div>
                    <div className="text-[11px] text-muted">{row.email}</div>
                    {row.legal_name && row.legal_name !== row.name ? (
                      <div className="text-[10.5px] text-faint">Legal: {row.legal_name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.kind === "organization" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10.5px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        <Building2 size={11} />
                        Organization
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10.5px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        <Store size={11} />
                        Single Store
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`http://127.0.0.1:3003?store=${row.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono font-medium text-accent hover:underline"
                    >
                      {row.domain}
                      <ExternalLink size={10} />
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === "active" ? "ok" : row.status === "provisioning" ? "info" : "warn"}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium capitalize">
                    {row.plan ? (
                      <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[11px]">
                        {row.plan}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(row.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/tenants/${row.id}`}
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs"
                      >
                        <Eye size={13} className="text-slate-500" />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => setImpersonateTarget(row)}
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/70 px-3 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-all hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-2xs group"
                      >
                        <ShieldCheck size={13.5} className="text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                        Impersonate
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Secure Impersonation Confirmation Modal */}
      {impersonateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Impersonate Tenant Workspace</h3>
                  <p className="text-xs text-muted">Super Admin Secure Support Session</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImpersonateTarget(null)}
                className="text-muted hover:text-ink p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-ink">
              <div className="rounded-xl border border-line/60 bg-surface-muted/60 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted">Target Store:</span>
                  <span className="font-semibold">{impersonateTarget.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Workspace Subdomain:</span>
                  <span className="font-mono text-[11px] font-semibold text-primary">
                    {impersonateTarget.slug}.retail.selfx.in
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Tenant Owner:</span>
                  <span>{impersonateTarget.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Subscription Plan:</span>
                  <span className="uppercase font-semibold">{impersonateTarget.plan || "Starter"}</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-amber-800 dark:text-amber-200 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-600" />
                  Security &amp; Compliance Protocol
                </div>
                <p className="text-[11px] leading-relaxed text-muted">
                  All administrative actions taken during this session are cryptographically signed and logged with your Super Admin ID in the{" "}
                  <Link href="/impersonation-logs" className="underline font-semibold text-primary">
                    Impersonation Logs
                  </Link>. Payment secrets and password changes are automatically blocked during impersonation.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted mb-1">
                  Support Reason / Ticket Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. GST Tax Slab Verification or Ticket #402"
                  value={impersonateReason}
                  onChange={(e) => setImpersonateReason(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4 bg-surface-muted/30">
              <Button variant="secondary" onClick={() => setImpersonateTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const id = impersonateTarget.id;
                  setImpersonateTarget(null);
                  await viewStore(id);
                }}
                className="gap-1.5"
              >
                <ShieldCheck size={14} />
                Start Impersonation Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Create Tenant Modal */}
      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-ink shadow-xs">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">Create Retail Tenant &amp; Store</h3>
                  <p className="text-xs text-muted">
                    Provision merchant instance, primary branch, registers, and storefront in a single atomic flow.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Tabs */}
            <div className="grid grid-cols-4 border-b border-line bg-surface-muted/40 text-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFormStep(1)}
                className={`py-2.5 transition-colors ${
                  formStep === 1
                    ? "border-b-2 border-accent text-accent bg-surface"
                    : "text-muted hover:text-ink"
                }`}
              >
                1. Business Identity
              </button>
              <button
                type="button"
                onClick={() => setFormStep(2)}
                className={`py-2.5 transition-colors ${
                  formStep === 2
                    ? "border-b-2 border-accent text-accent bg-surface"
                    : "text-muted hover:text-ink"
                }`}
              >
                2. Subdomain &amp; Branch
              </button>
              <button
                type="button"
                onClick={() => setFormStep(3)}
                className={`py-2.5 transition-colors ${
                  formStep === 3
                    ? "border-b-2 border-accent text-accent bg-surface"
                    : "text-muted hover:text-ink"
                }`}
              >
                3. Owner Credentials
              </button>
              <button
                type="button"
                onClick={() => setFormStep(4)}
                className={`py-2.5 transition-colors ${
                  formStep === 4
                    ? "border-b-2 border-accent text-accent bg-surface"
                    : "text-muted hover:text-ink"
                }`}
              >
                4. Plan &amp; Billing
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateTenant} className="flex-1 overflow-y-auto p-6">
              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              {/* Step 1: Business Identity & Multi-Tenant Structure */}
              {formStep === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted">ORGANIZATION STRUCTURE</label>
                    <div className="mt-1.5 grid grid-cols-2 gap-3">
                      <div
                        onClick={() => {
                          setKind("single_store");
                          if (planCode === "enterprise") setPlanCode("starter");
                        }}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                          kind === "single_store"
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-line bg-surface hover:border-accent/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Store size={16} className={kind === "single_store" ? "text-accent" : "text-muted"} />
                          <span className="text-xs font-semibold text-ink">Single Store</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          Standalone retail boutique, supermarket, or single outlet.
                        </p>
                      </div>

                      <div
                        onClick={() => {
                          setKind("organization");
                          setPlanCode("enterprise");
                        }}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                          kind === "organization"
                            ? "border-accent bg-accent/5 ring-1 ring-accent"
                            : "border-line bg-surface hover:border-accent/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className={kind === "organization" ? "text-accent" : "text-muted"} />
                          <span className="text-xs font-semibold text-ink">Enterprise Organization</span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          Multi-branch chain with centralized inventory &amp; branch switching.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink">Business Name *</label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => handleBusinessNameChange(e.target.value)}
                        placeholder="e.g. Annapurna Retail Supermarket"
                        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink">Legal Entity Name</label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Annapurna Retail Ventures Pvt Ltd"
                        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink">GSTIN (Tax ID)</label>
                      <input
                        type="text"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 29AAAAA0000A1Z5"
                        className="mt-1.5 h-10 w-full font-mono uppercase rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink">Contact Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Step 2: Subdomain & Primary Branch Location */}
              {formStep === 2 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink">Store Address / Slug *</label>
                    <div className="mt-1.5 flex h-10 items-center overflow-hidden rounded-lg border border-line bg-surface focus-within:border-accent">
                      <span className="flex h-full items-center border-r border-line bg-surface-muted px-3 font-mono text-[11px] text-muted">
                        store /
                      </span>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        placeholder="annapurna"
                        className="h-full flex-1 bg-transparent px-3 font-mono text-xs text-ink focus:outline-hidden"
                      />
                      <span className="flex h-full items-center border-l border-line bg-surface-muted px-3 text-[11px] text-muted">
                        .retail.selfx.in
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      Your store and customer online storefront will resolve at{" "}
                      <span className="font-mono text-accent">
                        https://{slug || "yourstore"}.retail.selfx.in
                      </span>
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-ink">Primary Outlet Address</label>
                      <input
                        type="text"
                        value={addressLine}
                        onChange={(e) => setAddressLine(e.target.value)}
                        placeholder="Plot No. 42, 100ft Road, Indiranagar"
                        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink">City</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Bangalore"
                        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink">Pincode</label>
                      <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="560038"
                        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink">Timezone</label>
                      <select
                        defaultValue="Asia/Kolkata"
                        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                      >
                        <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                        <option value="UTC">UTC (Universal)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Step 3: Owner / Administrator Account */}
              {formStep === 3 ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink">Owner Full Name *</label>
                      <div className="relative mt-1.5">
                        <User size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                        <input
                          type="text"
                          required
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar"
                          className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-xs text-ink focus:border-accent focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink">Owner Email *</label>
                      <div className="relative mt-1.5">
                        <Mail size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                        <input
                          type="email"
                          required
                          value={ownerEmail}
                          onChange={(e) => setOwnerEmail(e.target.value)}
                          placeholder="owner@annapurna.store"
                          className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-xs text-ink focus:border-accent focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-ink">Temporary Password *</label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline cursor-pointer"
                      >
                        <KeyRound size={11} />
                        Auto Generate Secure
                      </button>
                    </div>
                    <div className="relative mt-1.5">
                      <Lock size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="h-10 w-full rounded-lg border border-line bg-surface pr-10 pl-9 font-mono text-xs text-ink focus:border-accent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      Owner will be prompted to change their password on first sign-in.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Step 4: Plan & Subscription Selection */}
              {formStep === 4 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted">SELECT SUBSCRIPTION PLAN</label>
                    <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setCycle("monthly")}
                        className={`rounded-md px-2.5 py-1 ${cycle === "monthly" ? "bg-accent text-accent-ink shadow-xs" : "text-muted"}`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setCycle("yearly")}
                        className={`rounded-md px-2.5 py-1 ${cycle === "yearly" ? "bg-accent text-accent-ink shadow-xs" : "text-muted"}`}
                      >
                        Yearly (15% Off)
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Starter */}
                    <div
                      onClick={() => setPlanCode("starter")}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        planCode === "starter"
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-line bg-surface hover:border-accent/40"
                      }`}
                    >
                      <span className="text-xs font-semibold text-ink">Starter</span>
                      <div className="mt-1 text-base font-semibold text-ink">
                        ₹1,499<span className="text-[10px] font-normal text-muted">/mo</span>
                      </div>
                      <ul className="mt-3 space-y-1.5 text-[10.5px] text-muted">
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> 1 Store Location
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> Fast POS Billing
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> Customer Loyalty
                        </li>
                      </ul>
                    </div>

                    {/* Professional */}
                    <div
                      onClick={() => setPlanCode("professional")}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        planCode === "professional"
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-line bg-surface hover:border-accent/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink">Professional</span>
                        <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">Popular</span>
                      </div>
                      <div className="mt-1 text-base font-semibold text-ink">
                        ₹3,999<span className="text-[10px] font-normal text-muted">/mo</span>
                      </div>
                      <ul className="mt-3 space-y-1.5 text-[10.5px] text-muted">
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> Up to 5 Branches
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> Customer Khata Ledger
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> GSTR-1 HSN &amp; Day Book
                        </li>
                      </ul>
                    </div>

                    {/* Enterprise */}
                    <div
                      onClick={() => setPlanCode("enterprise")}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        planCode === "enterprise"
                          ? "border-accent bg-accent/5 ring-1 ring-accent"
                          : "border-line bg-surface hover:border-accent/40"
                      }`}
                    >
                      <span className="text-xs font-semibold text-ink">Enterprise</span>
                      <div className="mt-1 text-base font-semibold text-ink">
                        ₹9,999<span className="text-[10px] font-normal text-muted">/mo</span>
                      </div>
                      <ul className="mt-3 space-y-1.5 text-[10.5px] text-muted">
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> Up to 20 Branches
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> Multi-Branch Switching
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check size={11} className="text-accent" /> API &amp; Webhook Gateway
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-surface-muted/50 p-3.5 text-xs text-muted">
                    <p className="font-semibold text-ink">Atomic Provisioning Details:</p>
                    <p className="mt-1 text-[11px]">
                      When you submit, SelfX automatically seeds the Owner user, initial store registers, default
                      invoice numbering sequence, GST tax categories, inventory journal, and online storefront shell.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                {formStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                    className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-muted cursor-pointer"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setOpenModal(false)}
                  >
                    Cancel
                  </Button>

                  {formStep < 4 ? (
                    <Button
                      type="button"
                      onClick={() => setFormStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                      className="gap-1.5"
                    >
                      Continue
                      <ChevronRight size={14} />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={submitting} className="gap-2">
                      {submitting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Provisioning...
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          Confirm &amp; Provision Tenant
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
