"use client";

import { Badge, Button, PageHeader } from "@selfx/ui";
import {
  Building2,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  User,
  Users,
  X,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, warmCsrf, type ApiError } from "../../lib/api";

type Organization = {
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
  stores?: {
    id: string;
    name: string;
    code: string;
    city?: string;
    is_active?: boolean;
  }[];
};

export default function OrganizationsPage() {
  const [rows, setRows] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "provisioning" | "suspended">("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manage Branches Drawer
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Impersonate Confirmation Modal
  const [impersonateTarget, setImpersonateTarget] = useState<Organization | null>(null);

  // Create Organization Form State
  const [orgName, setOrgName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [cinNumber, setCinNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [address, setAddress] = useState("");
  const [planCode, setPlanCode] = useState("enterprise");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [initialBranches, setInitialBranches] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const body = await api<{ data: Organization[] }>("/api/v1/platform/tenants?kind=organization");
      setRows(body.data || []);
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleOrgNameChange(val: string) {
    setOrgName(val);
    if (!legalName) setLegalName(val + " Private Limited");
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30);
    setSlug(generatedSlug);
  }

  async function handleCreateOrg(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await warmCsrf();
      await api("/api/v1/platform/tenants", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          business_name: orgName,
          legal_name: legalName || orgName,
          slug: slug.toLowerCase().trim(),
          owner_name: ownerName,
          email: ownerEmail,
          password: password,
          phone: phone || null,
          gstin: gstin || null,
          kind: "organization",
          plan_code: planCode,
          cycle: cycle,
        }),
      });

      setSuccess(`Organization "${orgName}" created and initialized successfully.`);
      setOpenModal(false);
      resetForm();
      await load();
    } catch (err: any) {
      setError(err?.error?.message ?? "Failed to create organization");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setOrgName("");
    setLegalName("");
    setCinNumber("");
    setGstin("");
    setSlug("");
    setOwnerName("");
    setOwnerEmail("");
    setPhone("");
    setPassword("");
    setAddress("");
  }

  async function handleImpersonate(org: Organization) {
    try {
      await warmCsrf();
      const body = await api<{ data: { ticket: string } }>(`/api/v1/platform/tenants/${org.id}/impersonate`, {
        method: "POST",
        body: "{}",
      });
      window.location.href = `/impersonate?ticket=${encodeURIComponent(body.data.ticket)}`;
    } catch (err: any) {
      setError(err?.error?.message ?? "Could not initiate impersonation session for organization");
    }
  }

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        searchQuery === "" ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.gstin && r.gstin.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.status === "active").length;
    const totalOutlets = rows.reduce((acc, r) => acc + (r.stores?.length || 1), 0);
    return { total, active, totalOutlets };
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Organizations & Multi-Store Holdings"
        description="Enterprise corporate groups, parent holdings, multi-branch brand networks, and centralized franchise billing."
        aside={
          <Button onClick={() => setOpenModal(true)} className="gap-2">
            <Plus size={15} />
            Create Organization
          </Button>
        }
      />

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs font-semibold text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Building2 size={15} className="text-primary" />
            Total Organizations
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{stats.total}</div>
          <p className="mt-0.5 text-[11px] text-faint">Enterprise parent business entities</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <ShieldCheck size={15} className="text-emerald-600" />
            Active &amp; Provisioned
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{stats.active}</div>
          <p className="mt-0.5 text-[11px] text-faint">Live enterprise retail groups</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Store size={15} className="text-violet-600" />
            Managed Branch Outlets
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{stats.totalOutlets}</div>
          <p className="mt-0.5 text-[11px] text-faint">Consolidated stores and warehouse hubs</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface p-1">
          {(["all", "active", "provisioning", "suspended"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                statusFilter === tab ? "bg-accent text-accent-ink shadow-xs" : "text-muted hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by org, CIN, GSTIN, email..."
              className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-hidden"
            />
          </div>
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <table className="w-full text-left text-xs text-ink">
          <thead className="border-b border-line bg-surface-muted text-[11px] font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Organization &amp; Brand</th>
              <th className="px-4 py-3">Corporate Legal Info</th>
              <th className="px-4 py-3">Primary Contact</th>
              <th className="px-4 py-3">Branch Network</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin text-primary" />
                  Loading organizations...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  No organizations found matching your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-ink text-xs">{row.name}</div>
                        <div className="font-mono text-[11px] text-muted">{row.slug}.retail.selfx.in</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{row.legal_name || row.name}</div>
                    <div className="text-[11px] font-mono text-muted">GSTIN: {row.gstin || "Unregistered"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{row.email}</div>
                    <div className="text-[11px] text-muted">Corporate Admin</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOrg(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-primary/40 hover:bg-surface-muted transition-colors"
                    >
                      <Store size={12} className="text-primary" />
                      {row.stores && row.stores.length > 0 ? `${row.stores.length} Outlets` : "1 Branch"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="uppercase font-mono text-[11px] font-semibold text-ink bg-surface-muted px-2 py-0.5 rounded border border-line">
                      {row.plan || "Enterprise"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === "active" ? "ok" : row.status === "suspended" ? "danger" : "neutral"}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/organizations/${row.id}`}
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs"
                      >
                        <Eye size={13} className="text-slate-500" />
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelectedOrg(row)}
                        className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors"
                      >
                        Outlets
                      </button>
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

      {/* Outlets Drawer */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setSelectedOrg(null)} />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2.5">
                <Building2 size={18} className="text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">{selectedOrg.name} Outlets</h3>
                  <p className="text-xs text-muted">Retail branches, POS counters, and warehouse hubs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                className="text-muted hover:text-ink p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl border border-line bg-surface-muted p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Corporate Name:</span>
                  <span className="font-semibold text-ink">{selectedOrg.legal_name || selectedOrg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">GSTIN Registration:</span>
                  <span className="font-mono">{selectedOrg.gstin || "Unregistered"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Subdomain Hub:</span>
                  <span className="font-mono font-semibold text-primary">{selectedOrg.slug}.retail.selfx.in</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
                  Linked Outlets &amp; Stores
                </h4>
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink text-xs">Flagship Main Store</span>
                      <Badge tone="ok">Primary Branch</Badge>
                    </div>
                    <p className="text-[11px] text-muted">Code: MAIN • Location: Central Bangalore</p>
                  </div>

                  <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink text-xs">Central Warehouse &amp; Hub</span>
                      <Badge tone="neutral">Distribution Hub</Badge>
                    </div>
                    <p className="text-[11px] text-muted">Code: WH-01 • Location: Logistics Park</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-line p-4 bg-surface-muted/40">
              <Button
                className="w-full justify-center gap-1.5"
                onClick={() => {
                  setSelectedOrg(null);
                  setImpersonateTarget(selectedOrg);
                }}
              >
                <ShieldCheck size={14} />
                Impersonate to Configure Branches
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Impersonate Confirmation Modal */}
      {impersonateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Impersonate Organization</h3>
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
                  <span className="text-muted">Target Organization:</span>
                  <span className="font-semibold">{impersonateTarget.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Workspace Hub:</span>
                  <span className="font-mono text-[11px] font-semibold text-primary">
                    {impersonateTarget.slug}.retail.selfx.in
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Corporate Owner:</span>
                  <span>{impersonateTarget.email}</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-amber-800 dark:text-amber-200 space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-600" />
                  Security Protocol
                </div>
                <p className="text-[11px] leading-relaxed text-muted">
                  All enterprise holding and multi-branch actions taken during this session will be logged under{" "}
                  <Link href="/impersonation-logs" className="underline font-semibold text-primary">
                    Impersonation Logs
                  </Link>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4 bg-surface-muted/30">
              <Button variant="secondary" onClick={() => setImpersonateTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const target = impersonateTarget;
                  setImpersonateTarget(null);
                  await handleImpersonate(target);
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

      {/* Create Organization Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Create Enterprise Organization</h3>
                  <p className="text-xs text-muted">Provision parent legal holding entity with multi-branch capabilities</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="text-muted hover:text-ink p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Organization Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spencer's Retail Network"
                    value={orgName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Registered Legal Corporate Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spencer's Retail Limited"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Corporate CIN / Registration No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. L74999WB2017PLC219355"
                    value={cinNumber}
                    onChange={(e) => setCinNumber(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="29AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">
                    Subdomain / Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="spencers-retail"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-mono outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="border-t border-line/60 pt-3">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
                  Primary Corporate Administrator
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Admin Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya Shah"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Corporate Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@spencers.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Initial Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-line bg-surface px-3 pr-8 py-2 text-xs outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-muted hover:text-ink"
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-line/60 pt-3">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">
                  Subscription &amp; Initial Outlets
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Initial Outlets
                    </label>
                    <input
                      type="text"
                      value={initialBranches}
                      onChange={(e) => setInitialBranches(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                    />
                    <span className="text-[10px] text-muted mt-1 block">
                      Default branch and warehouse automatically seeded into instance.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-muted mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={cycle}
                      onChange={(e) => setCycle(e.target.value as any)}
                      className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-primary"
                    >
                      <option value="yearly">Enterprise Annual (Recommended)</option>
                      <option value="monthly">Monthly Recurring</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <Button variant="secondary" onClick={() => setOpenModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Provisioning Organization..." : "Create Organization"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
