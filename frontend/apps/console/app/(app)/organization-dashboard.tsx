"use client";

import {
  Building2,
  ExternalLink,
  Globe,
  MapPin,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  ShieldCheck,
  BarChart3,
  Settings,
  ArrowRight,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface OrgData {
  organization: {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone?: string;
    plan_name: string;
    plan_code: string;
    max_outlets: number;
    active_outlets: number;
  };
  kpis: {
    stores: number;
    locations: number;
    today_orders: number;
    today_revenue_paise: number;
    registered_guests: number;
  };
  vendors_by_area: {
    area: string;
    count: number;
    stores: string[];
  }[];
  member_stores: {
    id: string;
    name: string;
    slug: string;
    status: string;
    email: string;
    locations_count: number;
  }[];
}

export function OrganizationDashboard({ data }: { data: OrgData | null }) {
  if (!data) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-32 rounded-2xl bg-surface-muted/60 border border-line" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-muted/60 border border-line" />
          ))}
        </div>
      </div>
    );
  }

  const org = data.organization;
  const kpis = data.kpis;
  const vendorsByArea = data.vendors_by_area || [];
  const memberStores = data.member_stores || [];

  const directoryUrl = `/org/${org.slug}`;
  const outletsPct = Math.min(100, Math.round((org.active_outlets / Math.max(1, org.max_outlets)) * 100));

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Welcome Card Banner with Open Directory Button */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-r from-surface via-surface to-surface-muted/40 p-6 shadow-2xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <Building2 className="h-3 w-3" />
              <span>Campus Organization Workspace</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-ink">
              Welcome back, {org.name}
            </h1>
            <p className="text-xs sm:text-[13px] text-muted">
              Overview of all restaurants, outlets, and corporate billing under your organization.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={directoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-4 text-xs font-semibold text-ink shadow-2xs hover:bg-bg transition-colors"
            >
              <span>Open directory</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Corporate Plan Quota Card */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Corporate Plan</span>
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-300">
                Active
              </span>
            </div>
            <h3 className="text-sm font-semibold text-ink">{org.plan_name}</h3>
            <p className="text-xs text-muted">
              Centralized tenant settlement, student card loyalty & aggregated campus reporting.
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted">Quota allocation</span>
              <span className="text-ink">{org.active_outlets} of {org.max_outlets} restaurants</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted border border-line/60">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${outletsPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Stores */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition hover:border-line-strong">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Stores</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Store className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">{kpis.stores}</div>
          <div className="mt-0.5 text-[11px] text-muted">Active member outlets</div>
        </div>

        {/* Locations */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition hover:border-line-strong">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Locations</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <MapPin className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">{kpis.locations}</div>
          <div className="mt-0.5 text-[11px] text-muted">Campus complexes</div>
        </div>

        {/* Orders Today */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition hover:border-line-strong">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Orders Today</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
              <ShoppingBag className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">{kpis.today_orders}</div>
          <div className="mt-0.5 text-[11px] text-muted">Consolidated bills</div>
        </div>

        {/* Revenue Today */}
        <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition hover:border-line-strong">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Revenue Today</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-xl font-semibold text-ink">
            ₹{(kpis.today_revenue_paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">Gross campus sales</div>
        </div>

        {/* Registered Guests */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-line bg-surface p-4 shadow-2xs transition hover:border-line-strong">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Registered Guests</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-500/10 text-pink-600">
              <Users className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">{kpis.registered_guests}</div>
          <div className="mt-0.5 text-[11px] text-muted">Patrons & members</div>
        </div>
      </div>

      {/* 4. Vendors by Area & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Vendors by Area */}
        <div className="lg:col-span-2 rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Vendors by Area / Building</h3>
              <p className="text-xs text-muted">Campus distribution of food courts, cafes, and kiosks</p>
            </div>
            <span className="text-xs font-semibold text-muted">
              {vendorsByArea.length} designated {vendorsByArea.length === 1 ? "area" : "areas"}
            </span>
          </div>

          {vendorsByArea.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-xs text-muted">
              No campus areas configured yet. Assign location addresses to member store branches to display vendor distribution.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vendorsByArea.map((areaItem) => (
                <div
                  key={areaItem.area}
                  className="rounded-xl border border-line bg-bg/50 p-3.5 space-y-2.5 transition hover:bg-bg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted shrink-0" />
                      <span className="text-xs font-semibold text-ink">{areaItem.area}</span>
                    </div>
                    <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-muted">
                      {areaItem.count} {areaItem.count === 1 ? "outlet" : "outlets"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {areaItem.stores.map((sName) => (
                      <span
                        key={sName}
                        className="inline-flex items-center rounded-lg border border-line/70 bg-surface px-2 py-1 text-[11px] font-medium text-ink"
                      >
                        {sName}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Organization Quick Actions */}
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-4">
          <div className="border-b border-line pb-3">
            <h3 className="text-sm font-semibold text-ink">Quick Actions</h3>
            <p className="text-xs text-muted">Manage campus directory & settings</p>
          </div>

          <div className="space-y-2">
            <Link
              href="/branches"
              className="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-semibold text-ink transition hover:bg-bg"
            >
              <div className="flex items-center gap-2.5">
                <Store className="h-4 w-4 text-emerald-600" />
                <span>Member Restaurants</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <Link
              href="/branches"
              className="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-semibold text-ink transition hover:bg-bg"
            >
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span>Campus Locations</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <Link
              href="/staff"
              className="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-semibold text-ink transition hover:bg-bg"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-pink-600" />
                <span>Team & Staff</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <Link
              href="/reports"
              className="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-semibold text-ink transition hover:bg-bg"
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4 text-violet-600" />
                <span>Combined Reports</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>

            <a
              href={directoryUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs font-semibold text-emerald-950 dark:text-emerald-200 transition hover:bg-emerald-500/10"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span>Combined Storefront</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
            </a>

            <Link
              href="/settings/profile"
              className="flex items-center justify-between rounded-xl border border-line p-3 text-xs font-semibold text-ink transition hover:bg-bg"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-muted" />
                <span>Owner Settings</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Link>
          </div>
        </div>
      </div>

      {/* 5. Consolidated Member Stores Table */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Member Stores & Outlets</h3>
            <p className="text-xs text-muted">Active merchants serving under this organization</p>
          </div>
          <span className="rounded-full border border-line bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-muted">
            {memberStores.length} Stores Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="pb-2.5 font-semibold">Store Name</th>
                <th className="pb-2.5 font-semibold">Slug</th>
                <th className="pb-2.5 font-semibold">Locations</th>
                <th className="pb-2.5 font-semibold">Status</th>
                <th className="pb-2.5 font-semibold">Contact Email</th>
                <th className="pb-2.5 text-right font-semibold">Storefront Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {memberStores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-muted">
                    No member stores linked to this organization yet. Link stores using Super Admin &rarr; Organizations.
                  </td>
                </tr>
              ) : (
                memberStores.map((store) => (
                  <tr key={store.id} className="hover:bg-bg/40 transition-colors">
                    <td className="py-3 font-semibold text-ink flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-muted text-muted font-semibold text-[10px]">
                        {store.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span>{store.name}</span>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-muted">
                      /{store.slug}
                    </td>
                    <td className="py-3 text-muted">
                      {store.locations_count} {store.locations_count === 1 ? "Location" : "Locations"}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                        {store.status || "Active"}
                      </span>
                    </td>
                    <td className="py-3 text-muted">{store.email}</td>
                    <td className="py-3 text-right">
                      <a
                        href={`/org/${org.slug}?store=${encodeURIComponent(store.slug)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600 hover:underline"
                      >
                        <span>View in Directory</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
