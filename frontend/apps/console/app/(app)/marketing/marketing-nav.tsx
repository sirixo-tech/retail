"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  MessageSquare,
  Smartphone,
  Mail,
  BarChart3,
  Settings,
  Plus,
  Radio,
  Send,
} from "lucide-react";

export const MARKETING_TABS = [
  { href: "/marketing", label: "Dashboard", icon: LayoutDashboard },
  { href: "/marketing/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/marketing/segments", label: "Customer Segments", icon: Users },
  { href: "/marketing/sms-templates", label: "SMS Templates", icon: MessageSquare },
  { href: "/marketing/whatsapp-templates", label: "WhatsApp Templates", icon: Smartphone },
  { href: "/marketing/email-templates", label: "Email Templates", icon: Mail },
  { href: "/marketing/reports", label: "Reports", icon: BarChart3 },
  { href: "/marketing/settings", label: "Marketing Settings", icon: Settings },
];

export function MarketingNav({
  title = "Marketing Suite",
  subtitle = "Promote your online store, engage repeat customers, and broadcast promotions via WhatsApp, SMS & Email.",
  actionButton,
}: {
  title?: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            <span>Store Customer Marketing Engine</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white lg:text-3xl">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {actionButton || (
            <Link
              href="/marketing/campaigns?new=true"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create Campaign</span>
            </Link>
          )}
        </div>
      </div>

      {/* Modern Tabs Navigation Bar */}
      <div className="overflow-x-auto pb-1">
        <nav className="flex space-x-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {MARKETING_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
