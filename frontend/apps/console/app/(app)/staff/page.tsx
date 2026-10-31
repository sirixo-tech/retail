"use client";

import {
  Check,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string | null;
  status: string;
  has_pin?: boolean;
  last_login_at?: string | null;
};

type RoleItem = {
  id: string;
  code: string;
  name: string;
  system: boolean;
  staff_count: number;
  permissions: string[];
};

const PERMISSION_GROUPS: {
  group: string;
  items: { key: string; label: string; desc: string }[];
}[] = [
  {
    group: "Counter POS & Shift Operations",
    items: [
      { key: "pos.sell", label: "Create POS Bills & Checkout", desc: "Ring up items, scan barcodes, and collect tenders" },
      { key: "pos.discount", label: "Apply Line & Bill Discounts", desc: "Override item prices or apply promotional discounts" },
      { key: "pos.returns", label: "Process Returns & Exchanges", desc: "Issue credit notes, refunds, and item exchanges" },
      { key: "pos.void", label: "Void / Cancel Completed Bills", desc: "Void posted bills with reason audit log" },
      { key: "pos.shift", label: "Open / Close Shifts & Cash Drawer", desc: "Perform X/Z shift readings and cash drops" },
    ],
  },
  {
    group: "Products & Inventory Control",
    items: [
      { key: "catalog.view", label: "View Products & Barcodes", desc: "Browse store catalog, MRPs, and barcode labels" },
      { key: "catalog.manage", label: "Create & Edit Products / Categories", desc: "Add items, edit prices, categories, brands, and units" },
      { key: "inventory.view", label: "View Stock Ledger & Expiry Alerts", desc: "Inspect batch stock on hand, low stock, and expiry" },
      { key: "inventory.adjust", label: "Stock Adjustments, Counts & Transfers", desc: "Post cycle counts, write-offs, and inter-store transfers" },
    ],
  },
  {
    group: "Purchases & Online Orders",
    items: [
      { key: "purchases.manage", label: "Manage Purchases (GRN) & Suppliers", desc: "Receive supplier bills, purchase returns, and payouts" },
      { key: "orders.manage", label: "Fulfil Online & POS Orders", desc: "Pack pick-lists and transition order delivery status" },
      { key: "orders.delivery", label: "Delivery orders", desc: "See assigned deliveries, navigate, and collect payment" },
      { key: "delivery.dashboard", label: "Delivery partner dashboard", desc: "See today's assigned, on-road, and completed deliveries" },
      { key: "delivery.chat", label: "Customer delivery chat", desc: "Message the customer on an active delivery" },
      { key: "delivery.settings", label: "Delivery partner settings", desc: "Vehicle, phone sharing, and delivery alerts" },
      { key: "storefront.manage", label: "Configure Online Storefront", desc: "Manage store banners, collections, delivery zones, and gateways" },
    ],
  },
  {
    group: "Customers, Reports & Store Admin",
    items: [
      { key: "customers.view", label: "Manage Customers & Segments", desc: "Create customer profiles, addresses, and loyalty tiers" },
      { key: "customers.khata", label: "Manage Customer Khata (Credit)", desc: "Post credit sales and record customer repayments" },
      { key: "reports.view", label: "Access Retail, Profit & GST Reports", desc: "View and export sales, tax, margin, and shift reports" },
      { key: "staff.manage", label: "Manage Staff, Roles & Attendance", desc: "Add staff members, edit role permissions, and view attendance" },
      { key: "settings.manage", label: "Store Settings, Printer & Billing", desc: "Configure thermal receipts, taxes, API keys, and SaaS plan" },
    ],
  },
];

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "roles">("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("manager");
  const [roleDraftPerms, setRoleDraftPerms] = useState<string[]>([]);
  const [roleDraftName, setRoleDraftName] = useState<string>("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modals
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [addRoleOpen, setAddRoleOpen] = useState(false);

  // Edit Staff Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("cashier");
  const [editStatus, setEditStatus] = useState("active");
  const [editPassword, setEditPassword] = useState("");
  const [editPin, setEditPin] = useState("");

  // New Role Form State
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleCode, setNewRoleCode] = useState("");

  async function loadAll() {
    const [staffRes, rolesRes] = await Promise.all([
      fetch("/api/v1/staff", { credentials: "include", headers: { Accept: "application/json" } }),
      fetch("/api/v1/roles", { credentials: "include", headers: { Accept: "application/json" } }),
    ]);

    if (staffRes.status === 401 || staffRes.status === 403) {
      window.location.href = "/login";
      return;
    }

    if (staffRes.ok) {
      const body = (await staffRes.json()) as { data: StaffMember[] };
      setStaff(body.data ?? []);
    }

    if (rolesRes.ok) {
      const body = (await rolesRes.json()) as {
        data: RoleItem[];
        available_permissions?: string[];
      };
      const loadedRoles = body.data ?? [];
      setRoles(loadedRoles);
      if (body.available_permissions) setAllPermissions(body.available_permissions);

      const current =
        loadedRoles.find((r) => r.code === selectedRoleCode) ?? loadedRoles[0];
      if (current) {
        setSelectedRoleCode(current.code);
        setRoleDraftName(current.name);
        setRoleDraftPerms(current.permissions ?? []);
      }
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function selectRole(role: RoleItem) {
    setSelectedRoleCode(role.code);
    setRoleDraftName(role.name);
    setRoleDraftPerms(role.permissions ?? []);
  }

  const selectedRole = useMemo(
    () => roles.find((r) => r.code === selectedRoleCode) ?? null,
    [roles, selectedRoleCode],
  );

  const filteredStaff = useMemo(() => {
    return staff.filter((m) => {
      if (roleFilter !== "all" && (m.role ?? "cashier") !== roleFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.role ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staff, roleFilter, search]);

  async function handleCreateStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/staff", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role: form.get("role"),
        }),
      });
      const body = (await response.json()) as { error?: { message: string } };
      if (!response.ok) {
        setError(body.error?.message ?? "Could not add staff member.");
        return;
      }
      setToast("Staff member created and assigned role.");
      setAddStaffOpen(false);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  function openEditStaff(member: StaffMember) {
    setEditingStaff(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role ?? "cashier");
    setEditStatus(member.status || "active");
    setEditPassword("");
    setEditPin("");
    setError(null);
  }

  async function handleUpdateStaff(e: FormEvent) {
    e.preventDefault();
    if (!editingStaff) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: editName,
        email: editEmail,
        role: editRole,
        status: editStatus,
      };
      if (editPassword.trim()) payload.password = editPassword;
      if (editPin.trim()) payload.pin = editPin;

      const response = await fetch(`/api/v1/staff/${editingStaff.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError("Could not update staff member. Check email uniqueness and password/PIN length.");
        return;
      }
      setToast(`Updated ${editName} (${editRole}).`);
      setEditingStaff(null);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickRoleAssign(member: StaffMember, newRole: string) {
    setError(null);
    const response = await fetch(`/api/v1/staff/${member.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ role: newRole }),
    });
    if (response.ok) {
      setToast(`Assigned role "${newRole}" to ${member.name}.`);
      await loadAll();
    } else {
      setError("Could not change role for this staff member.");
    }
  }

  async function handleDeleteStaff(member: StaffMember) {
    setError(null);
    const response = await fetch(`/api/v1/staff/${member.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
    });
    if (response.ok) {
      setToast(`Removed ${member.name}.`);
      await loadAll();
    } else {
      setError("Cannot delete your own active staff account.");
    }
  }

  async function handleSaveRolePermissions() {
    if (!selectedRole) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/roles/${selectedRole.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          name: roleDraftName,
          permissions: roleDraftPerms,
        }),
      });
      if (!response.ok) {
        setError("Could not save permissions for this role.");
        return;
      }
      setToast(`Saved granular permissions for role "${roleDraftName}".`);
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRole(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const code = (newRoleCode || newRoleName)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_");
      const response = await fetch("/api/v1/roles", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          code,
          name: newRoleName,
          permissions: ["pos.sell", "catalog.view", "orders.manage"],
        }),
      });
      if (!response.ok) {
        setError("Could not create role. Ensure the role code is unique.");
        return;
      }
      setToast(`Created new role "${newRoleName}". Configure its permissions below.`);
      setAddRoleOpen(false);
      setNewRoleName("");
      setNewRoleCode("");
      setSelectedRoleCode(code);
      setActiveTab("roles");
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole(role: RoleItem) {
    setError(null);
    const response = await fetch(`/api/v1/roles/${role.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
    });
    if (response.ok) {
      setToast(`Deleted role "${role.name}".`);
      setSelectedRoleCode("manager");
      await loadAll();
    } else {
      setError("System roles or roles currently assigned to staff cannot be deleted.");
    }
  }

  function togglePerm(key: string) {
    setRoleDraftPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Staff, Roles &amp; Permissions
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage store employees, assign roles, and configure granular module permissions per role.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddRoleOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            New Role
          </button>
          <button
            type="button"
            onClick={() => setAddStaffOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Staff Member
          </button>
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

      {error ? (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Staff
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{staff.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active Accounts
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-emerald-600">
            {staff.filter((s) => s.status === "active").length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Configured Roles
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{roles.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Permission Modules
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">
            {allPermissions.length || 17}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition ${
            activeTab === "staff"
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Staff Directory ({staff.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition ${
            activeTab === "roles"
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Roles &amp; Granular Permissions ({roles.length})
        </button>
      </div>

      {/* TAB 1: STAFF DIRECTORY */}
      {activeTab === "staff" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff by name, email, or role..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pr-3 pl-9 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
            >
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Assigned Role</th>
                  <th className="px-4 py-3">POS PIN</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-800">
                          {member.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900">{member.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {member.last_login_at
                              ? `Last seen ${new Date(member.last_login_at).toLocaleDateString("en-IN")}`
                              : "Ready for login"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{member.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role ?? "cashier"}
                        onChange={(e) => void handleQuickRoleAssign(member, e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900 focus:bg-white"
                      >
                        {roles.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          member.has_pin
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {member.has_pin ? "PIN Set" : "No PIN"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                          member.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            member.status === "active" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditStaff(member)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3 w-3 text-slate-500" />
                          Edit
                        </button>
                        {staff.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => void handleDeleteStaff(member)}
                            className="inline-flex h-8 items-center rounded-lg border border-rose-200 bg-rose-50/50 px-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                            title="Delete staff"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">
                      No staff members match your search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* TAB 2: ROLES & GRANULAR PERMISSIONS */}
      {activeTab === "roles" ? (
        <div className="grid gap-5 lg:grid-cols-12">
          {/* Left Roles List */}
          <div className="space-y-3 lg:col-span-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Store Roles
                </h2>
                <button
                  type="button"
                  onClick={() => setAddRoleOpen(true)}
                  className="text-xs font-semibold text-slate-900 hover:underline"
                >
                  + Add Role
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {roles.map((role) => {
                  const active = role.code === selectedRoleCode;
                  return (
                    <button
                      key={role.code}
                      type="button"
                      onClick={() => selectRole(role)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{role.name}</span>
                          {role.system ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                active
                                  ? "bg-white/15 text-slate-200"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              System
                            </span>
                          ) : null}
                        </div>
                        <div
                          className={`mt-0.5 text-[11px] ${
                            active ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {role.permissions.length} permissions · {role.staff_count} staff
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Permission Matrix */}
          <div className="lg:col-span-8">
            {selectedRole ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        value={roleDraftName}
                        onChange={(e) => setRoleDraftName(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900"
                      />
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">
                        {selectedRole.code}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Check or uncheck permissions below to control what staff assigned to{" "}
                      <span className="font-semibold text-slate-800">{roleDraftName}</span> can access.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedRole.system ? (
                      <button
                        type="button"
                        onClick={() => void handleDeleteRole(selectedRole)}
                        className="inline-flex h-9 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Role
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveRolePermissions()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {saving ? "Saving..." : "Save Role Permissions"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    {roleDraftPerms.length} of{" "}
                    {PERMISSION_GROUPS.reduce((acc, g) => acc + g.items.length, 0)} permissions enabled
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setRoleDraftPerms(
                          PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
                        )
                      }
                      className="text-xs font-semibold text-slate-900 hover:underline"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoleDraftPerms([])}
                      className="text-xs font-semibold text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Grouped Checkboxes */}
                <div className="space-y-6">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.group}>
                      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {group.group}
                      </h3>
                      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        {group.items.map((perm) => {
                          const enabled = roleDraftPerms.includes(perm.key);
                          return (
                            <button
                              key={perm.key}
                              type="button"
                              onClick={() => togglePerm(perm.key)}
                              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                                enabled
                                  ? "border-slate-900 bg-slate-50 text-slate-900"
                                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50/50"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded ${
                                  enabled
                                    ? "bg-slate-900 text-white"
                                    : "border border-slate-300 bg-white"
                                }`}
                              >
                                {enabled ? <Check className="h-3 w-3" /> : null}
                              </span>
                              <div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {perm.label}
                                </div>
                                <div className="mt-0.5 text-[11px] leading-snug text-slate-400">
                                  {perm.desc}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Add Staff Modal */}
      {addStaffOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Add Staff Member</h2>
                <p className="text-xs text-slate-500">
                  Create employee credentials and assign their store role.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddStaffOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateStaff} className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Full Name
                <input
                  name="name"
                  required
                  placeholder="e.g. Kiran Kumar"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="kiran@store.in"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Initial Password (min 8 chars)
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Assign Role
                <select
                  name="role"
                  defaultValue="cashier"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none focus:border-slate-900"
                >
                  {roles.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddStaffOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Adding..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Staff Modal */}
      {editingStaff ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Edit Staff — {editingStaff.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Update role assignment, status, password, or 4-digit POS PIN.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateStaff} className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Full Name
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
                <input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Assigned Role
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900"
                  >
                    {roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  Status
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Reset Password (optional)
                  <input
                    type="password"
                    minLength={8}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="New password..."
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  POS 4-Digit PIN (optional)
                  <input
                    type="password"
                    maxLength={8}
                    value={editPin}
                    onChange={(e) => setEditPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Staff Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Create Role Modal */}
      {addRoleOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Create Custom Role</h2>
                <p className="text-xs text-slate-500">
                  Create a new role and customize its module permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddRoleOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Role Name
                <input
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Senior Supervisor"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Role Code (slug)
                <input
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="e.g. supervisor"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddRoleOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
