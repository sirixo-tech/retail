"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Settings, Truck } from "lucide-react";

interface DeliveryNavProps {
  chatBadgeCount?: number;
}

export function DeliveryNav({ chatBadgeCount }: DeliveryNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/delivery",
      label: "Dispatch Board",
      icon: Truck,
      exact: true,
    },
    {
      href: "/delivery/dashboard",
      label: "Partner Dashboard",
      icon: LayoutDashboard,
      exact: false,
    },
    {
      href: "/delivery/chat",
      label: "Customer Chat",
      icon: MessageSquare,
      badge: chatBadgeCount,
      exact: false,
    },
    {
      href: "/delivery/settings",
      label: "Partner Settings",
      icon: Settings,
      exact: false,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-2xs backdrop-blur-sm sm:gap-2">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || (item.href !== "/delivery" && pathname.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all sm:text-sm ${
              isActive
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon size={16} className={isActive ? "text-indigo-300" : "text-slate-400"} />
            <span>{item.label}</span>
            {typeof item.badge === "number" && item.badge > 0 && (
              <span
                className={`ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  isActive
                    ? "bg-indigo-500 text-white"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
