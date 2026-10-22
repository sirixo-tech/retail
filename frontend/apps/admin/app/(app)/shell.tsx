"use client";

import { AppShell, type NavGroup } from "@selfx/ui";
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Building2,
  Cpu,
  CreditCard,
  Database,
  FileText,
  HeartPulse,
  Landmark,
  Layers,
  LayoutDashboard,
  Mail,
  MessageSquare,
  MessageSquareCode,
  Package,
  PieChart,
  Receipt,
  Server,
  Settings,
  Shield,
  Store,
  Terminal,
  Code2,
  Download,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { AdminAiWidget } from "./admin-ai-widget";

const groups: NavGroup[] = [
  { label: "Main", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Management",
    items: [
      { href: "/tenants", label: "Tenants", icon: Store },
      { href: "/organizations", label: "Organizations", icon: Building2 },
      { href: "/plans", label: "Plans", icon: Layers },
      { href: "/subscriptions", label: "Subscriptions", icon: Receipt },
      { href: "/reminders", label: "Reminders", icon: Bell },
      { href: "/super-admins", label: "Super Admins", icon: Shield },
    ],
  },
  {
    label: "Catalog",
    items: [{ href: "/catalog", label: "Products", icon: Package }],
  },
  {
    label: "Payments",
    items: [
      { href: "/payments-overview", label: "Overview", icon: PieChart },
      { href: "/transactions", label: "Transactions", icon: Activity },
      { href: "/pending-payments", label: "Pending Payments", icon: AlertCircle },
      { href: "/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    label: "Help",
    items: [{ href: "/how-it-works", label: "How It Works", icon: BookOpen }],
  },
  {
    label: "Monitoring",
    items: [
      { href: "/health", label: "Logs & System Health", icon: HeartPulse },
      { href: "/impersonation-logs", label: "Impersonation Logs", icon: UserCheck },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/ai-settings", label: "AI & LLM Gateway", icon: Cpu },
      { href: "/general-settings", label: "General Settings", icon: Settings },
      { href: "/legal", label: "Legal Entity", icon: Landmark },
      { href: "/email-templates", label: "Email Templates", icon: Mail },
      { href: "/sms-templates", label: "SMS Templates", icon: MessageSquareCode },
      { href: "/mail-settings", label: "Mail Settings", icon: Server },
      { href: "/sms-settings", label: "SMS Settings", icon: MessageSquare },
      { href: "/gateways", label: "Payment Gateways", icon: CreditCard },
      { href: "/whatsapp-settings", label: "WhatsApp Settings", icon: MessageSquare },
    ],
  },
  {
    label: "Operations & DR",
    items: [
      { href: "/backups", label: "Database Backups & DR", icon: Database },
      { href: "/queue-monitoring", label: "Queue & Workers", icon: Cpu },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/apps-updates", label: "Apps & Updates", icon: Download },
      { href: "/docs/api", label: "API Documentation", icon: Code2, target: "_blank" },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [userName, setUserName] = useState("Super Admin");
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [platformLogo, setPlatformLogo] = useState<string>("/logo.png");

  useEffect(() => {
    const stored = window.localStorage.getItem("selfx.logo");
    if (stored) setPlatformLogo(stored);

    function onLogoChange(e: Event) {
      const custom = e as CustomEvent<string>;
      if (custom.detail) setPlatformLogo(custom.detail);
      else {
        const next = window.localStorage.getItem("selfx.logo");
        if (next) setPlatformLogo(next);
      }
    }
    window.addEventListener("selfx-logo-changed", onLogoChange);
    return () => window.removeEventListener("selfx-logo-changed", onLogoChange);
  }, []);

  useEffect(() => {
    let active = true;
    api<{ data?: { name?: string; kind?: string } }>("/api/v1/auth/platform/me")
      .then((res) => {
        if (!active) return;
        if (res.data?.kind && res.data.kind !== "platform") {
          setAuthState("unauthenticated");
          const loginTarget = window.location.pathname.startsWith("/superadmin")
            ? "/superadmin/login?error=platform_required"
            : "/login?error=platform_required";
          window.location.replace(loginTarget);
          return;
        }
        if (res.data?.name) setUserName(res.data.name);
        setAuthState("authenticated");
      })
      .catch(() => {
        if (!active) return;
        setAuthState("unauthenticated");
        const loginTarget = window.location.pathname.startsWith("/superadmin")
          ? "/superadmin/login"
          : "/login";
        window.location.replace(loginTarget);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await api("/api/v1/auth/platform/logout", { method: "POST" });
    } catch {
      // Continue even if network error
    }
    const loginTarget = window.location.pathname.startsWith("/superadmin")
      ? "/superadmin/login"
      : "/login";
    window.location.replace(loginTarget);
  }

  if (authState === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 animate-spin rounded-full border-2 border-line border-t-accent" />
          <span className="text-xs font-medium text-muted">Checking platform session...</span>
        </div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium text-muted">Redirecting to sign in...</span>
        </div>
      </div>
    );
  }

  const resolvedGroups = groups.map((g) => ({
    ...g,
    items: g.items.map((item) => ({
      ...item,
      href: item.href.startsWith("http") || item.href.startsWith("/superadmin")
        ? item.href
        : `/superadmin${item.href === "/" ? "" : item.href}`,
    })),
  }));

  const activePathname = pathname?.startsWith("/superadmin")
    ? pathname
    : `/superadmin${pathname === "/" ? "" : pathname}`;

  return (
    <AppShell
      product="SelfX"
      logoUrl={platformLogo}
      groups={resolvedGroups}
      pathname={activePathname}
      user={{ name: userName, role: "Platform" }}
      onLogout={handleLogout}
    >
      {children}
      <AdminAiWidget />
    </AppShell>
  );
}
