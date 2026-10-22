"use client";

import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Pencil,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Store,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type StoreBranch = {
  id: string;
  name: string;
  code: string;
  public_slug?: string;
  gstin?: string;
  address_line?: string;
  city?: string;
  state_code?: string;
  pincode?: string;
  timezone?: string;
  gst_pricing_mode?: string;
  is_default: boolean;
  status: string;
  orders_count: number;
  terminals_count: number;
  staff_count: number;
  contact_phone?: string;
  contact_email?: string;
  storefront_url?: string;
};

type BranchStats = {
  total_locations: number;
  plan_limit: number;
  with_orders: number;
  default_location: string;
  active_location_id?: string;
};

export default function BranchesPage() {
  const [stores, setStores] = useState<StoreBranch[]>([]);
  const [stats, setStats] = useState<BranchStats>({
    total_locations: 1,
    plan_limit: 20,
    with_orders: 0,
    default_location: "Main Branch",
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreBranch | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [pincode, setPincode] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [isDefault, setIsDefault] = useState(false);

  async function loadBranches() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } });
      if (res.ok) {
        const body = (await res.json()) as { data?: { stores: StoreBranch[]; stats: BranchStats } };
        if (body.data) {
          setStores(body.data.stores ?? []);
          setStats(body.data.stats ?? stats);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  function handleOpenCreate() {
    setEditingStore(null);
    setName("");
    setCode("");
    setPublicSlug("");
    setContactPhone("");
    setContactEmail("");
    setGstin("");
    setAddressLine("");
    setCity("Bangalore");
    setStateCode("KA");
    setPincode("");
    setTimezone("Asia/Kolkata");
    setIsDefault(stores.length === 0);
    setError(null);
    setOpenModal(true);
  }

  function handleOpenEdit(store: StoreBranch) {
    setEditingStore(store);
    setName(store.name);
    setCode(store.code);
    setPublicSlug(store.public_slug || "");
    setContactPhone(store.contact_phone || "");
    setContactEmail(store.contact_email || "");
    setGstin(store.gstin || "");
    setAddressLine(store.address_line || "");
    setCity(store.city || "Bangalore");
    setStateCode(store.state_code || "KA");
    setPincode(store.pincode || "");
    setTimezone(store.timezone || "Asia/Kolkata");
    setIsDefault(store.is_default);
    setError(null);
    setOpenModal(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );

    const payload = {
      name,
      code: code ? code.toUpperCase().trim() : undefined,
      public_slug: publicSlug ? publicSlug.toLowerCase().trim() : undefined,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      gstin: gstin ? gstin.toUpperCase().trim() : null,
      address_line: addressLine || null,
      city: city || null,
      state_code: stateCode || null,
      pincode: pincode || null,
      timezone,
      is_default: isDefault,
    };

    try {
      const url = editingStore ? `/api/v1/stores/${editingStore.id}` : "/api/v1/stores";
      const method = editingStore ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Could not save branch.");
        return;
      }

      setOpenModal(false);
      await loadBranches();
    } catch {
      setError("An error occurred while communicating with the server.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(store: StoreBranch) {
    if (!confirm(`Are you sure you want to delete branch "${store.name}"?`)) return;

    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );

    try {
      const res = await fetch(`/api/v1/stores/${store.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": token,
        },
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body?.error?.message ?? "Could not delete this branch.");
        return;
      }

      await loadBranches();
    } catch {
      alert("Error deleting branch.");
    }
  }

  async function handleSwitchActive(store: StoreBranch) {
    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );

    await fetch(`/api/v1/stores/${store.id}/switch`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token,
      },
    });

    await loadBranches();
    window.location.reload();
  }

  function copyStorefrontLink(store: StoreBranch) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://retail.sirixo.com";
    const url = `${origin}/store?store=${store.public_slug || store.code}`;
    void navigator.clipboard.writeText(url);
    setCopiedId(store.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filteredStores = useMemo(() => {
    if (!search) return stores;
    const q = search.toLowerCase();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.contact_phone && s.contact_phone.includes(q)) ||
        (s.address_line && s.address_line.toLowerCase().includes(q)),
    );
  }, [stores, search]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Locations &amp; Branches</h1>
          <p className="mt-1 text-xs text-muted">
            Each location is a site you serve from — main retail branch, secondary outlet, or warehouse. POS, registers,
            inventory, and reports run per branch.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-orange-700 cursor-pointer"
        >
          <Plus size={15} />
          Add location
        </button>
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Locations */}
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60">
            <MapPin size={20} />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight text-ink">{stats.total_locations}</div>
            <div className="text-[11.5px] font-semibold text-muted">Locations</div>
          </div>
        </div>

        {/* Card 2: Plan usage */}
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight text-ink">
              {stats.total_locations} / {stats.plan_limit}
            </div>
            <div className="text-[11.5px] font-semibold text-muted">Plan usage</div>
          </div>
        </div>

        {/* Card 3: With orders */}
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
            <Store size={20} />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight text-ink">{stats.with_orders}</div>
            <div className="text-[11.5px] font-semibold text-muted">With orders</div>
          </div>
        </div>

        {/* Card 4: Default location */}
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#fffbeb] text-[#d97706] border border-[#fde68a] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-ink uppercase truncate max-w-[140px]">
              {stats.default_location}
            </div>
            <div className="text-[11.5px] font-semibold text-muted">Default location</div>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, address, phone..."
            className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/pos-terminals"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <Layers size={13} className="text-muted" />
            Counters / Registers
          </a>
          <a
            href="/qr-builder"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <QrCode size={13} className="text-muted" />
            QR codes
          </a>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-600 px-3 text-xs font-semibold text-white hover:bg-orange-700 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add location
          </button>
        </div>
      </div>

      {/* Blue Informative Callout (Matching Image 2) */}
      <div className="flex items-start gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 text-xs text-[#1e40af] dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 shadow-2xs">
        <Info size={17} className="mt-0.5 text-[#2563eb] dark:text-blue-400 shrink-0" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#1e3a8a] dark:text-blue-100">One retailer, many sites.</span> Staff can be assigned to specific branches.
          Orders, inventory, registers, and QR codes are scoped to the active location in POS and admin.
        </div>
      </div>

      {/* Branches Table (Matching Image 2) */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        <table className="w-full text-left text-xs text-ink">
          <thead className="border-b border-line bg-surface-muted text-[11px] font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Timezone</th>
              <th className="px-4 py-3">Order Board / Storefront</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  <RefreshCw size={18} className="mx-auto animate-spin text-accent" />
                  <p className="mt-2 text-xs">Loading branches...</p>
                </td>
              </tr>
            ) : filteredStores.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No branch locations found.
                </td>
              </tr>
            ) : (
              filteredStores.map((store) => (
                <tr key={store.id} className="transition-colors hover:bg-surface-muted/50">
                  {/* Location Column */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] shadow-2xs">
                        <MapPin size={15} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink uppercase tracking-wide">{store.name}</span>
                          {store.is_default ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-[#fde68a] bg-[#fffbeb] px-2 py-0.5 text-[10px] font-semibold text-[#92400e] dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                              ☆ Default
                            </span>
                          ) : null}
                        </div>
                        <div className="font-mono text-[10.5px] text-faint">Code: {store.code}</div>
                      </div>
                    </div>
                  </td>

                  {/* Contact Column */}
                  <td className="px-4 py-3.5">
                    {store.contact_email ? (
                      <div className="text-[11px] text-muted">{store.contact_email}</div>
                    ) : null}
                    {store.contact_phone ? (
                      <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
                        <Phone size={10} className="text-slate-400" />
                        <span>{store.contact_phone}</span>
                      </div>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>

                  {/* Address Column */}
                  <td className="px-4 py-3.5 max-w-[200px]">
                    {store.address_line || store.city ? (
                      <div className="text-[11px] text-muted truncate">
                        {[store.address_line, store.city, store.pincode].filter(Boolean).join(", ")}
                      </div>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>

                  {/* Timezone */}
                  <td className="px-4 py-3.5 text-muted font-mono text-[11px]">
                    {store.timezone || "Asia/Kolkata"}
                  </td>

                  {/* Order Board / Storefront Link */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-accent truncate max-w-[150px]">
                        /store?store={store.public_slug || store.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyStorefrontLink(store)}
                        className="rounded p-1 text-muted hover:bg-surface-muted hover:text-ink cursor-pointer"
                        title="Copy storefront URL"
                      >
                        {copiedId === store.id ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Activity Stats */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 text-[10.5px] text-muted">
                      <span className="rounded bg-surface-muted px-1.5 py-0.5 font-medium">
                        {store.orders_count} Orders
                      </span>
                      <span className="rounded bg-surface-muted px-1.5 py-0.5 font-medium">
                        {store.terminals_count} Counters
                      </span>
                      <span className="rounded bg-surface-muted px-1.5 py-0.5 font-medium">
                        {store.staff_count} Staff
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleSwitchActive(store)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface px-2.5 text-[11px] font-semibold text-ink hover:bg-bg transition-colors cursor-pointer"
                        title="Switch active branch context"
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(store)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-[11px] font-semibold text-ink hover:bg-bg transition-colors cursor-pointer"
                      >
                        <Pencil size={11} className="text-muted" />
                        Edit
                      </button>
                      {!store.is_default ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(store)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface text-muted hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors cursor-pointer"
                          title="Delete branch"
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Branch Modal */}
      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">
                    {editingStore ? "Edit Branch Location" : "Add Branch Location"}
                  </h3>
                  <p className="text-xs text-muted">Configure branch address, contact, and billing attributes.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink">Location Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingStore && !code) {
                        setCode(e.target.value.substring(0, 4).toUpperCase());
                      }
                    }}
                    placeholder="e.g. Bangalore Flagship / Goa Outlet"
                    className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Location Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BLR, GOA, LOC1"
                    className="mt-1.5 h-10 w-full font-mono uppercase rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-ink">Contact Phone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 99882 23919"
                    className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="branch@store.com"
                    className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">GSTIN (Branch Specific or Central)</label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="29AAAAA0000A1Z5"
                  className="mt-1.5 h-10 w-full font-mono uppercase rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Street Address</label>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Plot No 80, Flat no - P1, Main Road"
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
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
                <div>
                  <label className="block text-xs font-semibold text-ink">State Code</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value.toUpperCase())}
                    placeholder="KA"
                    className="mt-1.5 h-10 w-full font-mono uppercase rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                  />
                </div>
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
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-line text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="is_default" className="text-xs font-semibold text-ink cursor-pointer">
                  Set as default location for this merchant
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-700 cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      {editingStore ? "Update location" : "Create location"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
