"use client";

import {
  Check,
  ChevronDown,
  Lightbulb,
  LogOut,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "./cn";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  target?: string;
  external?: boolean;
  children?: { href: string; label: string; target?: string }[];
};
export type NavGroup = { label: string; items: NavItem[] };

export type AccentPalette =
  | "green"
  | "emerald"
  | "violet"
  | "blue"
  | "indigo"
  | "teal"
  | "rose"
  | "amber"
  | "slate";

const ACCENT_OPTIONS: { id: AccentPalette; label: string; hex: string }[] = [
  { id: "violet", label: "Royal Violet", hex: "#6c47ff" },
  { id: "blue", label: "Enterprise Blue", hex: "#2563eb" },
  { id: "emerald", label: "Emerald Green", hex: "#059669" },
  { id: "indigo", label: "Deep Indigo", hex: "#4f46e5" },
  { id: "teal", label: "Ocean Teal", hex: "#0d9488" },
  { id: "rose", label: "Crimson Rose", hex: "#e11d48" },
  { id: "amber", label: "Warm Amber", hex: "#d97706" },
  { id: "slate", label: "Graphite Slate", hex: "#334155" },
];

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const stored = window.localStorage.getItem("selfx-theme");
  const target: "light" | "dark" =
    stored === "dark" || stored === "light"
      ? stored
      : document.documentElement.dataset.theme === "dark"
        ? "dark"
        : "light";
  document.documentElement.dataset.theme = target;
  document.documentElement.classList.toggle("dark", target === "dark");
  return target;
}

function readAccent(fallback: AccentPalette): AccentPalette {
  if (typeof document === "undefined") return fallback;
  const stored = window.localStorage.getItem("selfx-accent") as AccentPalette | null;
  if (stored && ACCENT_OPTIONS.some((o) => o.id === stored)) {
    document.documentElement.dataset.accent = stored;
    return stored;
  }
  const normalized = fallback === "green" ? "emerald" : fallback;
  document.documentElement.dataset.accent = normalized;
  return normalized;
}

export function AppShell({
  product,
  logoUrl,
  groups,
  user,
  pathname,
  accent = "green",
  children,
  actions,
  onLogout,
}: {
  product: string;
  logoUrl?: string;
  groups: NavGroup[];
  user: { name: string; role: string };
  pathname: string;
  accent?: AccentPalette;
  children: ReactNode;
  actions?: ReactNode;
  onLogout?: () => void | Promise<void>;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeAccent, setActiveAccent] = useState<AccentPalette>(
    accent === "green" ? "emerald" : accent,
  );
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("selfx-sidebar-open");
      if (stored !== null) {
        setSidebarOpen(stored === "true");
      }
    } catch {}
  }, []);

  function handleToggleSidebar(next?: boolean) {
    setSidebarOpen((prev) => {
      const val = next !== undefined ? next : !prev;
      try {
        window.localStorage.setItem("selfx-sidebar-open", String(val));
      } catch {}
      return val;
    });
  }

  useEffect(() => {
    setTheme(readTheme());
    setActiveAccent(readAccent(accent));
  }, [accent]);

  useEffect(() => {
    const activeParents: Record<string, boolean> = {};
    for (const group of groups) {
      for (const item of group.items) {
        if (
          item.children &&
          (pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            item.children.some((c) => pathname === c.href || c.href.startsWith(pathname + "?")))
        ) {
          activeParents[item.href] = true;
        }
      }
    }
    setOpenMenus((prev) => ({ ...prev, ...activeParents }));
  }, [pathname, groups]);

  function applyTheme(next: "light" | "dark") {
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("selfx-theme", next);
    setTheme(next);
  }

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  function applyAccent(next: AccentPalette) {
    document.documentElement.dataset.accent = next;
    localStorage.setItem("selfx-accent", next);
    setActiveAccent(next);
  }

  function toggleMenu(href: string) {
    setOpenMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <div
      className="min-h-screen bg-bg text-ink transition-colors duration-150"
      data-accent={activeAccent}
    >
      <div
        className={cn(
          "grid min-h-screen transition-[grid-template-columns] duration-200 ease-in-out",
          sidebarOpen ? "grid-cols-[256px_1fr]" : "grid-cols-1 md:grid-cols-[0px_1fr]",
        )}
      >
        <aside
          className={cn(
            "sticky top-0 flex h-screen flex-col border-r border-line bg-surface transition-all duration-200 overflow-hidden",
            sidebarOpen ? "w-64 opacity-100" : "w-0 opacity-0 border-r-0 pointer-events-none",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line/60 px-4">
            <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
              {logoUrl ? (
                <a href="/" className="flex items-center gap-2 overflow-hidden py-1">
                  <img
                    src={logoUrl}
                    alt={product}
                    className="h-9 w-auto max-w-[170px] object-contain transition-transform hover:scale-[1.02]"
                  />
                </a>
              ) : (
                <>
                  <span className="grid size-8 place-items-center rounded-[9px] bg-accent text-[13px] font-semibold text-accent-ink shadow-xs">
                    {product.slice(0, 1).toUpperCase() || "S"}
                  </span>
                  <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
                    {product}
                  </span>
                </>
              )}
            </div>

            {/* Close Sidebar Option */}
            <button
              type="button"
              onClick={() => handleToggleSidebar(false)}
              title="Close navigation sidebar"
              aria-label="Close navigation sidebar"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-muted transition-colors hover:bg-bg hover:text-ink"
            >
              <PanelLeftClose size={18} strokeWidth={1.85} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const hasChildren = Boolean(item.children && item.children.length > 0);
                    const childActive =
                      item.children?.some((child) => pathname === child.href) ?? false;
                    const active =
                      !hasChildren &&
                      (pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href)));
                    const isExpanded = Boolean(openMenus[item.href]);
                    const Icon = item.icon;

                    if (hasChildren) {
                      return (
                        <li key={item.href}>
                          <button
                            type="button"
                            onClick={() => toggleMenu(item.href)}
                            aria-expanded={isExpanded}
                            className={cn(
                              "flex h-9.5 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-3 text-left text-[13.5px] transition-colors",
                              childActive || isExpanded
                                ? "bg-accent-soft font-semibold text-accent"
                                : "text-muted hover:bg-bg hover:text-ink",
                            )}
                          >
                            <Icon size={16} strokeWidth={1.85} />
                            <span className="flex-1">{item.label}</span>
                            <ChevronDown
                              size={15}
                              className={cn(
                                "transition-transform duration-200",
                                isExpanded ? "rotate-180" : "rotate-0",
                              )}
                            />
                          </button>
                          {isExpanded ? (
                            <ul className="mt-1 mb-1.5 ml-4 space-y-0.5 border-l border-line pl-2.5">
                              {item.children!.map((child) => {
                                const isChildCurrent = pathname === child.href;
                                const isExternal = child.href.startsWith("http");
                                return (
                                  <li key={child.href + child.label}>
                                    <a
                                      href={child.href}
                                      target={isExternal ? "_blank" : undefined}
                                      rel={isExternal ? "noreferrer" : undefined}
                                      className={cn(
                                        "flex h-8 cursor-pointer items-center gap-2 rounded-[6px] px-2.5 text-[13px] transition-colors",
                                        isChildCurrent
                                          ? "bg-accent-soft/70 font-semibold text-accent"
                                          : "text-muted hover:bg-bg hover:text-ink",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "size-1.5 rounded-full transition-colors",
                                          isChildCurrent ? "bg-accent" : "bg-faint/50",
                                        )}
                                      />
                                      <span className="truncate">{child.label}</span>
                                    </a>
                                  </li>
                                );
                              })}
                            </ul>
                          ) : null}
                        </li>
                      );
                    }

                    return (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          target={item.target || (item.external ? "_blank" : undefined)}
                          rel={item.target === "_blank" || item.external ? "noopener noreferrer" : undefined}
                          className={cn(
                            "flex h-9.5 cursor-pointer items-center gap-2.5 rounded-[8px] px-3 text-[13.5px] transition-colors",
                            active
                              ? "bg-accent-soft font-semibold text-accent"
                              : "text-muted hover:bg-bg hover:text-ink",
                          )}
                        >
                          <Icon size={16} strokeWidth={1.85} />
                          <span className="flex-1">{item.label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="border-t border-line p-3">
            {onLogout ? (
              <button
                type="button"
                onClick={() => void onLogout()}
                className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-[8px] px-3 text-left text-[13.5px] text-muted transition-colors hover:bg-bg hover:text-ink"
              >
                <LogOut size={16} strokeWidth={1.75} />
                Log out
              </button>
            ) : (
              <a
                href="/login"
                className="flex h-9 cursor-pointer items-center gap-2 rounded-[8px] px-3 text-[13.5px] text-muted transition-colors hover:bg-bg hover:text-ink"
              >
                <LogOut size={16} strokeWidth={1.75} />
                Log out
              </a>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line/60 bg-surface/95 px-4 sm:px-6 backdrop-blur-xs">
            <div className="flex items-center gap-2.5">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={() => handleToggleSidebar(true)}
                  title="Open navigation sidebar"
                  aria-label="Open navigation sidebar"
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-[8px] border border-line bg-surface px-2.5 text-[13px] font-medium text-ink shadow-2xs hover:bg-bg transition-colors"
                >
                  <PanelLeftOpen size={16} strokeWidth={1.85} className="text-accent" />
                  <span className="hidden sm:inline">Open Sidebar</span>
                </button>
              )}
              {!sidebarOpen && logoUrl && (
                <a href="/" className="flex items-center">
                  <img
                    src={logoUrl}
                    alt={product}
                    className="h-7 w-auto max-w-[140px] object-contain"
                  />
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {actions}

            {/* Theme & Accent Color Customizer Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeMenuOpen((prev) => !prev)}
                title="Customize Theme & Brand Color"
                aria-label="Customize Theme & Brand Color"
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[8px] border border-line bg-surface text-muted transition-colors hover:bg-bg hover:text-ink"
              >
                <Palette size={16} strokeWidth={1.9} />
              </button>

              {themeMenuOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setThemeMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-40 w-64 rounded-xl border border-line bg-surface p-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-line pb-2.5">
                      <span className="text-xs font-semibold text-ink">Appearance &amp; Theme</span>
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold capitalize text-accent">
                        {activeAccent}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                        Color Mode
                      </div>
                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyTheme("light")}
                          className={cn(
                            "flex h-8 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition",
                            theme === "light"
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-line bg-bg text-muted hover:text-ink",
                          )}
                        >
                          <Sun size={13.5} />
                          Light
                        </button>
                        <button
                          type="button"
                          onClick={() => applyTheme("dark")}
                          className={cn(
                            "flex h-8 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition",
                            theme === "dark"
                              ? "border-accent bg-accent-soft text-accent"
                              : "border-line bg-bg text-muted hover:text-ink",
                          )}
                        >
                          <Moon size={13.5} />
                          Dark
                        </button>
                      </div>
                    </div>

                    <div className="mt-3.5">
                      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                        Brand Accent Colour
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {ACCENT_OPTIONS.map((opt) => {
                          const selected = activeAccent === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              title={opt.label}
                              onClick={() => applyAccent(opt.id)}
                              className={cn(
                                "group relative flex h-8 w-full items-center justify-center rounded-lg border transition",
                                selected
                                  ? "border-ink ring-2 ring-accent/30"
                                  : "border-line hover:border-muted",
                              )}
                              style={{ backgroundColor: opt.hex }}
                            >
                              {selected ? (
                                <Check size={14} className="text-white drop-shadow-xs" strokeWidth={2.5} />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Direct Dark / Light Icon Switcher (Matches Image 1 Lightbulb/Theme Icon with Tooltip) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              aria-label={theme === "dark" ? "Light Mode" : "Dark Mode"}
              className="group relative inline-flex size-9 cursor-pointer items-center justify-center rounded-[8px] border border-line bg-surface text-muted transition-colors hover:bg-bg hover:text-ink"
            >
              {theme === "dark" ? (
                <Lightbulb size={17} strokeWidth={1.9} className="text-amber-400" />
              ) : (
                <Moon size={16} strokeWidth={1.9} />
              )}
              <span className="pointer-events-none absolute -bottom-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10.5px] font-semibold text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            </button>

            <div className="ml-1 flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1.5 pr-3.5">
              <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-[13px] font-semibold text-ink">{user.name}</span>
            </div>
          </div>
        </header>
          <main className="flex-1 px-6 pt-5 pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
