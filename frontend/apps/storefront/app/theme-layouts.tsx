"use client";

import {
  Award,
  Baby,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Eye,
  Flame,
  Gamepad2,
  Gift,
  Globe,
  Headphones,
  Heart,
  Laptop,
  Layers,
  Leaf,
  Mail,
  MapPin,
  MessageSquare,
  Minus,
  Moon,
  Navigation,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Star,
  Store,
  Sun,
  Tag,
  TrendingUp,
  Truck,
  Tv,
  User,
  Watch,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { StorefrontProduct } from "./live-shop";

function stripEmojis(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

export interface ThemeLayoutProps {
  themeVariant: "technova" | "littlejoy" | "freshmart";
  displayStoreName: string;
  logoUrl: string;
  brandPrimaryColor: string;
  brandSecondaryColor: string;
  onlineSettings: any;
  storeAddress: string;
  hours: string | null;
  openNow: boolean;
  items: StorefrontProduct[];
  visibleItems: StorefrontProduct[];
  categoriesWithCounts: { name: string; count: number }[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  query: string;
  setQuery: (q: string) => void;
  sortBy: "relevance" | "price_asc" | "price_desc" | "name";
  setSortBy: (s: "relevance" | "price_asc" | "price_desc" | "name") => void;
  qty: Record<string, number>;
  updateItemQty: (id: string, nextQty: number) => void;
  totalItemsCount: number;
  grandTotalPaise: number;
  formatPrice: (paise: number) => string;
  productImageFor: (item: StorefrontProduct) => string | null;
  onOpenCart: () => void;
  onOpenLogin: () => void;
  onOpenOrders: () => void;
  onOpenQuickView: (item: StorefrontProduct) => void;
  onOpenTryOn?: (item: StorefrontProduct) => void;
  onOpenContactModal: () => void;
  wishlistIds: string[];
  onToggleWishlist: (id: string) => void;
  customerPhone: string;
  customerOrdersCount: number;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  darkMode: boolean;
  setDarkMode: (d: boolean) => void;
  newsletterEmail: string;
  setNewsletterEmail: (e: string) => void;
  onSubscribeNewsletter: () => void;
  newsletterSubscribed: boolean;
  pincode: string;
  setPincode: (p: string) => void;
  pincodeStatus: string | null;
  onCheckPincode: () => void;
}

export function StorefrontThemedCatalog(props: ThemeLayoutProps) {
  const {
    themeVariant,
    displayStoreName,
    logoUrl,
    onlineSettings,
    storeAddress,
    items,
    visibleItems,
    categoriesWithCounts,
    activeCategory,
    setActiveCategory,
    query,
    setQuery,
    qty,
    updateItemQty,
    totalItemsCount,
    grandTotalPaise,
    formatPrice,
    productImageFor,
    onOpenCart,
    onOpenLogin,
    onOpenOrders,
    onOpenQuickView,
    onOpenTryOn,
    onOpenContactModal,
    wishlistIds,
    onToggleWishlist,
    customerPhone,
    customerOrdersCount,
    selectedLanguage,
    setSelectedLanguage,
    newsletterEmail,
    setNewsletterEmail,
    onSubscribeNewsletter,
    newsletterSubscribed,
    pincode,
    setPincode,
    pincodeStatus,
    onCheckPincode,
  } = props;

  const [featuredTab, setFeaturedTab] = useState<"top" | "bestsellers" | "sale">("top");
  const [deliveryCheckOpen, setDeliveryCheckOpen] = useState(false);
  const showDeliveryAvailability =
    onlineSettings?.enableDeliveryAvailability !== false &&
    onlineSettings?.themeConfig?.enablePinCodeChecker !== false;
  const showConfiguredBanners = onlineSettings?.themeConfig?.showBanners === true;
  const registeredLocations = useMemo(
    () =>
      Array.isArray(onlineSettings?.serviceableLocations)
        ? onlineSettings.serviceableLocations.filter((loc: any) => loc && loc.enabled !== false)
        : [],
    [onlineSettings],
  );

  const realCategories = useMemo(
    () => categoriesWithCounts.filter((c) => c.name !== "All"),
    [categoriesWithCounts],
  );

  const discountedItems = useMemo(() => {
    const withDiscount = items.filter(
      (i) => (i.mrp_paise ?? 0) > (i.selling_price_paise ?? 0),
    );
    return withDiscount;
  }, [items]);

  const tabProducts = useMemo(() => {
    const source = activeCategory === "All" && !query.trim() ? items : visibleItems;
    if (featuredTab === "sale") {
      return discountedItems.slice(0, 8);
    }
    if (featuredTab === "bestsellers") {
      return [...source].reverse().slice(0, 8);
    }
    return source.slice(0, 8);
  }, [items, visibleItems, activeCategory, query, featuredTab, discountedItems]);

  const customBanners = useMemo(
    () => (onlineSettings?.banners ?? []).filter((b: any) => b.enabled !== false),
    [onlineSettings],
  );

  const activePromoCode = useMemo(() => {
    const codes = (onlineSettings?.inviteCodes ?? []).filter((c: any) => c.enabled !== false && c.code);
    return codes[0]?.code || "";
  }, [onlineSettings]);

  const showConfiguredHero = useMemo(() => {
    const banners = (onlineSettings?.banners ?? []).filter((b: { enabled?: boolean }) => b.enabled !== false);
    if (banners.length > 0 || onlineSettings?.hero?.bannerImageUrl) return true;
    const headline = String(onlineSettings?.hero?.headline ?? "").trim();
    const stock = new Set([
      "Stock up on daily essentials",
      "Upgrade Your Tech Lifestyle",
      "Little Ones' Big Smiles!",
    ]);
    return onlineSettings?.hero?.enabled === true && headline.length > 0 && !stock.has(headline);
  }, [onlineSettings]);

  const scrollToCatalog = (cat?: string) => {
    if (cat) setActiveCategory(cat);
    const el = document.getElementById("theme-catalog-anchor");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // ============================================================================
  // THEME 1: TECHNOVA — ELECTRONICS, GADGETS & APPLIANCES (IMAGE 1)
  // ============================================================================
  if (themeVariant === "technova") {
    const techIcons = [Laptop, Smartphone, Headphones, Gamepad2, Tv, Watch, Cpu, Zap];
    const heroHeadline =
      onlineSettings?.hero?.headline?.trim() &&
      onlineSettings.hero.headline !== "Stock up on daily essentials"
        ? onlineSettings.hero.headline
        : "Upgrade Your Tech Lifestyle";
    const heroSub =
      onlineSettings?.hero?.subheadline?.trim() &&
      !onlineSettings.hero.subheadline.includes("farm-fresh")
        ? onlineSettings.hero.subheadline
        : "Discover the latest gadgets, high-performance electronics & smart appliances at unbeatable store prices.";

    return (
      <div className="min-h-screen bg-[#f4f6fb] text-slate-900">
        {/* 1. Top Dark Navy Promo Bar */}
        {onlineSettings?.topbarFooter?.showTopbar !== false && onlineSettings?.topbarFooter?.topbarText && (
          <div className="bg-[#0f172a] text-white text-[11px] py-2 px-4">
            <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium">
                <span className="inline-flex items-center gap-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                  <Zap size={11} />
                  <span>Flash Deal</span>
                </span>
                <span>
                  {stripEmojis(onlineSettings?.topbarFooter?.topbarText) ||
                    `Free express shipping on orders over ${formatPrice((onlineSettings?.shipping?.freeDeliveryAbove ?? 499) * 100)} · Use Code: ${activePromoCode}`}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-slate-300">
                <button type="button" onClick={onOpenOrders} className="hover:text-white transition">
                  Track Order
                </button>
                <button type="button" onClick={onOpenContactModal} className="hover:text-white transition">
                  24/7 Support
                </button>
                {onlineSettings?.topbarFooter?.showLanguageSwitcher !== false && (
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    aria-label="Select store language"
                    className="bg-transparent text-slate-200 text-[11px] outline-none cursor-pointer"
                  >
                    <option value="English" className="text-slate-900">English</option>
                    <option value="Hindi" className="text-slate-900">हिन्दी</option>
                    <option value="Telugu" className="text-slate-900">తెలుగు</option>
                    <option value="Tamil" className="text-slate-900">தமிழ்</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. TechNova Main Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
          <div className="mx-auto max-w-7xl px-3.5 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3 sm:gap-6">
              {/* Brand */}
              <button
                type="button"
                onClick={() => setActiveCategory("All")}
                className="flex items-center gap-2.5 text-left shrink-0 cursor-pointer"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={displayStoreName} className="h-9 w-auto max-w-[130px] object-contain" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                    <Cpu size={20} />
                  </div>
                )}
                <div>
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 block leading-none">
                    {displayStoreName}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-600">
                    {onlineSettings?.branding?.brandTagline || "Tech & Electronics"}
                  </span>
                </div>
              </button>

              {/* Center Search Bar with Category Dropdown (Desktop) */}
              <div className="hidden md:flex flex-1 max-w-2xl items-center rounded-xl border-2 border-blue-600/80 bg-slate-50/70 overflow-hidden focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                <select
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  aria-label="Filter by category"
                  className="h-10 bg-slate-100/90 border-r border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  {categoriesWithCounts.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search laptops, smartphones, audio, accessories..."
                  className="h-10 flex-1 px-3.5 text-xs text-slate-900 bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => scrollToCatalog()}
                  aria-label="Search products"
                  className="h-10 bg-blue-600 hover:bg-blue-700 text-white px-4 flex items-center justify-center transition"
                >
                  <Search size={16} />
                </button>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <User size={15} className="text-blue-600" />
                  <span className="hidden sm:inline">{customerPhone ? `+91 ${customerPhone.slice(-4)}` : "Sign In"}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Package size={15} className="text-slate-600" />
                  <span className="hidden lg:inline">Orders</span>
                  {customerOrdersCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                      {customerOrdersCount}
                    </span>
                  )}
                </button>

                {showDeliveryAvailability && (
                  <button
                    type="button"
                    onClick={() => setDeliveryCheckOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                      pincodeStatus === "available"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : pincodeStatus && pincodeStatus !== "available"
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <MapPin size={14} className="text-blue-600 shrink-0" />
                    <span className="truncate max-w-[110px]">
                      {pincodeStatus === "available" && pincode ? `PIN ${pincode}` : "Delivery Availability"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {showDeliveryAvailability && deliveryCheckOpen && (
              <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <MapPin size={14} className="text-blue-600 shrink-0" />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit PIN or area..."
                    className="h-8 flex-1 max-w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={onCheckPincode}
                    className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    Check
                  </button>
                </div>
                {registeredLocations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {registeredLocations.slice(0, 5).map((loc: any, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setPincode(loc.pincode || loc.areaName || "");
                          setTimeout(() => onCheckPincode(), 20);
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-blue-400"
                      >
                        {loc.areaName} ({loc.pincode})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Search Bar */}
            <div className="mt-2.5 flex md:hidden items-center rounded-xl border border-slate-300 bg-slate-50 overflow-hidden">
              <Search size={15} className="ml-3 text-slate-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search electronics, gadgets, SKU..."
                className="h-9 flex-1 px-2.5 text-xs bg-transparent outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="px-2 text-xs text-slate-400">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3. Secondary Horizontal Category Navigation Bar */}
          <div className="border-t border-slate-100 bg-slate-50/80">
            <div className="mx-auto max-w-7xl px-3.5 sm:px-6 flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none">
              <button
                type="button"
                onClick={() => scrollToCatalog("All")}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeCategory === "All"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-700 border border-slate-200/80 hover:border-blue-300"
                }`}
              >
                <Cpu size={13} /> All Categories
              </button>
              {realCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => scrollToCatalog(cat.name)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    activeCategory === cat.name
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-white hover:text-blue-600"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-70">({cat.count})</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFeaturedTab("sale");
                  scrollToCatalog("All");
                }}
                className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 cursor-pointer"
              >
                <Flame size={13} /> Hot Deals
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-3.5 sm:px-6 py-6 space-y-10">
          {/* 4. Split Hero Banner (Image 1) */}
          {showConfiguredHero && (
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#dbeafe] via-[#e0e7ff] to-[#eff6ff] border border-blue-200/80 p-6 sm:p-10 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-2xs">
                    <Zap size={12} /> {stripEmojis(onlineSettings?.hero?.eyebrowBadge) || "NEXT-GEN TECH STORE"}
                  </span>
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                    {heroHeadline}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                    {heroSub}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => scrollToCatalog("All")}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
                    >
                      <span>{onlineSettings?.hero?.primaryCtaLabel || "Shop Now"}</span>
                      <ChevronRight size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFeaturedTab("sale");
                        scrollToCatalog("All");
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-5 py-3 text-xs sm:text-sm font-bold transition cursor-pointer"
                    >
                      <span>{onlineSettings?.hero?.secondaryCtaLabel || "Explore Deals"}</span>
                    </button>
                  </div>
                </div>

                {/* Right Hero Product / Tech Showcase */}
                <div className="lg:col-span-5">
                  <div className="relative mx-auto max-w-sm rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-5 text-white shadow-xl border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="rounded-md bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-300">
                        {onlineSettings?.hero?.promoHighlightText || "Featured Pro Series"}
                      </span>
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Star size={12} className="fill-amber-400" /> 4.9 Rated
                      </span>
                    </div>
                    {onlineSettings?.hero?.bannerImageUrl ? (
                      <img
                        src={onlineSettings.hero.bannerImageUrl}
                        alt={heroHeadline}
                        className="h-44 w-full object-cover rounded-xl mb-3"
                      />
                    ) : items[0] && productImageFor(items[0]) ? (
                      <img
                        src={productImageFor(items[0])!}
                        alt={items[0].name}
                        className="h-44 w-full object-contain rounded-xl bg-white/5 p-2 mb-3"
                      />
                    ) : (
                      <div className="h-44 w-full rounded-xl bg-gradient-to-tr from-blue-600/30 to-indigo-500/20 flex items-center justify-center mb-3">
                        <Laptop size={64} className="text-blue-300" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold truncate max-w-[180px]">
                          {items[0]?.name || "Flagship Ultra Edition"}
                        </div>
                        <div className="text-xs text-blue-300 font-semibold">
                          {items[0] ? formatPrice(items[0].selling_price_paise ?? 0) : "Official Store Warranty"}
                        </div>
                      </div>
                      {items[0] && (
                        <button
                          type="button"
                          onClick={() => updateItemQty(items[0]!.id, (qty[items[0]!.id] || 0) + 1)}
                          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition cursor-pointer"
                        >
                          + Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 5. Five-Column Trust Guarantee Strip (Image 1) */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: Truck, title: "Free Shipping", sub: `Above ${formatPrice((onlineSettings?.shipping?.freeDeliveryAbove ?? 499) * 100)}` },
              { icon: ShieldCheck, title: "Secure Payments", sub: "100% Protected UPI & Cards" },
              { icon: Award, title: "Official Warranty", sub: "100% Genuine Store Stock" },
              { icon: Clock, title: "Express Dispatch", sub: "Same-Day Local Delivery" },
              { icon: Headphones, title: "24/7 Tech Support", sub: "Direct Store Assistance" },
            ].map((pill, i) => {
              const Icon = pill.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{pill.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{pill.sub}</div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* 6. Shop by Category Visual Square Cards (Image 1) */}
          {realCategories.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Shop by Category</h2>
                  <p className="text-xs text-slate-500">Browse our live store departments</p>
                </div>
                <button
                  type="button"
                  onClick={() => scrollToCatalog("All")}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  View All ({items.length}) <ChevronRight size={13} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {realCategories.slice(0, 6).map((cat, idx) => {
                  const Icon = techIcons[idx % techIcons.length]!;
                  const isSelected = activeCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => scrollToCatalog(cat.name)}
                      className={`group flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 shadow-xs"
                          : "border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm"
                      }`}
                    >
                      <div
                        className={`mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                        }`}
                      >
                        <Icon size={22} />
                      </div>
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">{cat.name}</span>
                      <span className="mt-0.5 text-[11px] font-medium text-slate-400">{cat.count} Products</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 7. Featured Products with Filter Tabs (Top Picks | Best Sellers | On Sale) */}
          <section id="theme-catalog-anchor" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {activeCategory === "All" ? "Featured Products" : activeCategory}
                </h2>
                {activeCategory !== "All" && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("All")}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    <span>Reset Filter</span>
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 p-1">
                {(
                  [
                    { id: "top", label: "Top Picks" },
                    { id: "bestsellers", label: "Best Sellers" },
                    { id: "sale", label: "On Sale" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFeaturedTab(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      featuredTab === t.id
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {(activeCategory === "All" && !query.trim() ? tabProducts : visibleItems).map((item) => {
                const count = qty[item.id] || 0;
                const img = productImageFor(item);
                const price = item.selling_price_paise ?? 0;
                const mrp = item.mrp_paise ?? 0;
                const hasDisc = mrp > price;
                const discPct = hasDisc ? Math.round(((mrp - price) / mrp) * 100) : 0;
                const wished = wishlistIds.includes(item.id);
                const outOfStock = typeof item.on_hand === "number" && item.on_hand <= 0;

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all"
                  >
                    <div>
                      {/* Image Box */}
                      <div className="relative h-36 sm:h-44 w-full rounded-xl bg-slate-50 overflow-hidden mb-3 flex items-center justify-center">
                        {img ? (
                          <img
                            src={img}
                            alt={item.name}
                            onClick={() => onOpenQuickView(item)}
                            className="h-full w-full object-contain p-2 group-hover:scale-105 transition duration-300 cursor-pointer"
                          />
                        ) : (
                          <div
                            onClick={() => onOpenQuickView(item)}
                            className="flex h-full w-full items-center justify-center text-slate-300 cursor-pointer"
                          >
                            <Cpu size={36} />
                          </div>
                        )}
                        {hasDisc && (
                          <span className="absolute left-2 top-2 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                            -{discPct}%
                          </span>
                        )}
                        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
                          {onlineSettings?.themeConfig?.showAddToWishlist !== false && (
                            <button
                              type="button"
                              onClick={() => onToggleWishlist(item.id)}
                              aria-label="Toggle wishlist"
                              className={`flex h-7 w-7 items-center justify-center rounded-full border bg-white/90 shadow-2xs transition ${
                                wished ? "text-rose-600 border-rose-200" : "text-slate-400 border-slate-200 hover:text-rose-600"
                              }`}
                            >
                              <Heart size={13} className={wished ? "fill-rose-600" : ""} />
                            </button>
                          )}
                          {onlineSettings?.themeConfig?.showQuickViewModal !== false && (
                            <button
                              type="button"
                              onClick={() => onOpenQuickView(item)}
                              aria-label="Quick view product"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-500 hover:text-blue-600 shadow-2xs transition"
                            >
                              <Eye size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category & Rating */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold uppercase tracking-wider text-blue-600 truncate">
                          {item.brand || item.category || "Store"}
                        </span>
                      </div>

                      <h3
                        onClick={() => onOpenQuickView(item)}
                        className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 cursor-pointer hover:text-blue-600"
                      >
                        {item.name}
                      </h3>
                      {onlineSettings?.themeConfig?.showSkuOnCard && item.sku && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">SKU: {item.sku}</div>
                      )}
                    </div>

                    {/* Price & Add to Cart */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm sm:text-base font-extrabold text-slate-900">
                          {formatPrice(price)}
                        </div>
                        {hasDisc && (
                          <div className="text-[10px] text-slate-400 line-through">{formatPrice(mrp)}</div>
                        )}
                      </div>

                      {outOfStock && !onlineSettings?.basics?.allowBackorders ? (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-bold text-slate-400">
                          Out of Stock
                        </span>
                      ) : count === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.id, 1)}
                          className="inline-flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-bold shadow-2xs transition cursor-pointer"
                        >
                          <Plus size={13} /> Add
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-2 py-1 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.id, count - 1)}
                            className="h-5 w-5 flex items-center justify-center rounded hover:bg-white/20"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-4 text-center">{count}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.id, count + 1)}
                            className="h-5 w-5 flex items-center justify-center rounded hover:bg-white/20"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 8. Three Dark/Gradient Promo Banners (Gaming Gear | Smart Home | Audio Deals — Image 1) */}
          {showConfiguredBanners && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(customBanners.length >= 3
              ? customBanners.slice(0, 3)
              : [
                  {
                    badgeText: "PRO GAMING",
                    title: realCategories[0]?.name || "Gaming Gear & Accessories",
                    subtitle: "High-refresh monitors, mechanical keyboards & pro headsets",
                    bg: "from-slate-900 via-indigo-950 to-slate-900",
                    cat: realCategories[0]?.name || "All",
                  },
                  {
                    badgeText: "SMART LIVING",
                    title: realCategories[1]?.name || "Smart Home & Automation",
                    subtitle: "Connected speakers, security cameras & smart lighting",
                    bg: "from-blue-900 via-blue-800 to-indigo-900",
                    cat: realCategories[1]?.name || "All",
                  },
                  {
                    badgeText: "STUDIO SOUND",
                    title: realCategories[2]?.name || "Audio & ANC Deals",
                    subtitle: "Lossless wireless earbuds & spatial soundbars",
                    bg: "from-indigo-950 via-purple-900 to-slate-900",
                    cat: realCategories[2]?.name || "All",
                  },
                ]
            ).map((card: any, idx: number) => (
              <div
                key={idx}
                onClick={() => scrollToCatalog(card.cat || "All")}
                className={`group cursor-pointer rounded-2xl bg-gradient-to-br ${
                  card.bg || "from-slate-900 to-blue-900"
                } p-6 text-white shadow-sm hover:shadow-lg transition flex flex-col justify-between min-h-[165px]`}
              >
                <div>
                  <span className="inline-block rounded-md bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                    {card.badgeText || "LIMITED OFFER"}
                  </span>
                  <h3 className="mt-2 text-lg font-extrabold tracking-tight">{card.title}</h3>
                  <p className="mt-1 text-xs text-slate-300 line-clamp-2">{card.subtitle}</p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-300 group-hover:translate-x-1 transition">
                  <span>Shop Collection</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </section>
          )}

          {/* 9. Split Section: Best Sellers (Numbered 1-4 Ranked List) + New Arrivals Grid (Image 1) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Ranked 1-4 Best Sellers */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Best Sellers</h3>
                  <p className="text-[11px] text-slate-500">Top-ranked customer favourites this week</p>
                </div>
                <Flame size={18} className="text-amber-500" />
              </div>
              <div className="space-y-3">
                {items.slice(0, 4).map((item, idx) => {
                  const img = productImageFor(item);
                  const count = qty[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 hover:border-blue-200 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-white ${
                            idx === 0
                              ? "bg-amber-500"
                              : idx === 1
                              ? "bg-slate-500"
                              : idx === 2
                              ? "bg-amber-700"
                              : "bg-blue-600"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="h-12 w-12 shrink-0 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                          {img ? (
                            <img src={img} alt={item.name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <Cpu size={18} className="text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                          <div className="text-xs font-extrabold text-blue-600">
                            {formatPrice(item.selling_price_paise ?? 0)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, count + 1)}
                        className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 text-[11px] font-bold cursor-pointer"
                      >
                        {count > 0 ? `Added (${count})` : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: New Arrivals */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">New Arrivals</h3>
                  <p className="text-[11px] text-slate-500">Freshly stocked in our store inventory</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600">
                  Just In
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {items.slice(0, 6).map((item) => {
                  const img = productImageFor(item);
                  const count = qty[item.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200/80 p-3 flex flex-col justify-between hover:border-blue-300 transition"
                    >
                      <div>
                        <div className="h-24 w-full rounded-lg bg-slate-50 mb-2 flex items-center justify-center overflow-hidden">
                          {img ? (
                            <img src={img} alt={item.name} className="h-full w-full object-contain p-1.5" />
                          ) : (
                            <Smartphone size={24} className="text-slate-300" />
                          )}
                        </div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{item.name}</div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-blue-600">
                          {formatPrice(item.selling_price_paise ?? 0)}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.id, count + 1)}
                          className="rounded-md bg-slate-900 hover:bg-blue-600 text-white px-2 py-1 text-[10px] font-bold transition cursor-pointer"
                        >
                          {count > 0 ? `+${count}` : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 10. Blue Stats Counter Bar (Image 1) */}
          <section className="rounded-3xl bg-slate-900 px-6 py-6 text-white">
            <div className="text-2xl font-extrabold">{items.length}</div>
            <div className="mt-1 text-xs text-slate-300">Products in this store</div>
          </section>

          {/* Reviews appear only after the store collects them. */}

          {/* 12. Stay Ahead with Tech Newsletter Box (Image 1) */}
          {onlineSettings?.topbarFooter?.showNewsletterInFooter !== false && (
            <section className="rounded-3xl bg-slate-900 text-white p-6 sm:p-10 text-center space-y-4">
              <span className="inline-block rounded-full bg-blue-500/20 border border-blue-400/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                INSIDER DEALS
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold">Stay Ahead with {displayStoreName}</h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Subscribe to receive flash sale alerts, new product launches, and exclusive store coupons.
              </p>
              {newsletterSubscribed ? (
                <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-4 py-2.5 text-xs font-bold text-emerald-300">
                  <Check size={15} /> Subscribed! Thank you for joining our list.
                </div>
              ) : (
                <div className="mx-auto flex max-w-md flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="h-11 flex-1 rounded-xl bg-white/10 border border-white/20 px-4 text-xs text-white placeholder:text-slate-400 outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={onSubscribeNewsletter}
                    className="h-11 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 text-xs font-bold text-white transition cursor-pointer"
                  >
                    Subscribe
                  </button>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    );
  }

  // ============================================================================
  // THEME 2: LITTLEJOY — KIDS, TOYS, BABY CARE & BOUTIQUE (IMAGE 2)
  // ============================================================================
  if (themeVariant === "littlejoy") {
    const heroHeadline =
      onlineSettings?.hero?.headline?.trim() &&
      onlineSettings.hero.headline !== "Stock up on daily essentials"
        ? onlineSettings.hero.headline
        : "Little Ones' Big Smiles!";
    const heroSub =
      onlineSettings?.hero?.subheadline?.trim() &&
      !onlineSettings.hero.subheadline.includes("farm-fresh")
        ? onlineSettings.hero.subheadline
        : "Soft, safe & joyful essentials, toys, and fashion curated with love for your little explorers.";
    const pastelColors = [
      "bg-pink-100/90 text-pink-700 border-pink-200",
      "bg-purple-100/90 text-purple-700 border-purple-200",
      "bg-amber-100/90 text-amber-800 border-amber-200",
      "bg-sky-100/90 text-sky-700 border-sky-200",
      "bg-emerald-100/90 text-emerald-700 border-emerald-200",
      "bg-rose-100/90 text-rose-700 border-rose-200",
    ];

    return (
      <div className="min-h-screen bg-[#fffafd] text-slate-900">
        {/* 1. Soft Purple Top Promo Bar with Yellow Coupon Pill (Image 2) */}
        {onlineSettings?.topbarFooter?.showTopbar !== false && onlineSettings?.topbarFooter?.topbarText && (
          <div className="bg-[#6d5acd] text-white text-xs py-2 px-4">
            <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <Tag size={12} className="text-[#fde047] shrink-0" />
                <span>{stripEmojis(onlineSettings?.topbarFooter?.topbarText?.trim()) || "Free Delivery on Cute Essentials & Gifts!"}</span>
                <span className="rounded-full bg-[#fde047] text-slate-900 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                  Use Code: {activePromoCode}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-purple-100 text-[11px]">
                <button type="button" onClick={onOpenOrders} className="hover:text-white">
                  Track Order
                </button>
                <button type="button" onClick={onOpenContactModal} className="hover:text-white">
                  Parent Help Desk
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Playful Rounded Header (Image 2) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-2xs">
          <div className="mx-auto max-w-7xl px-3.5 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Brand */}
              <button
                type="button"
                onClick={() => setActiveCategory("All")}
                className="flex items-center gap-2.5 text-left cursor-pointer"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={displayStoreName} className="h-9 w-auto max-w-[130px] object-contain" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#6d5acd] to-pink-500 text-white shadow-xs">
                    <Baby size={22} />
                  </div>
                )}
                <div>
                  <span className="text-base sm:text-xl font-extrabold tracking-tight text-[#4c3b99] block leading-none">
                    {displayStoreName}
                  </span>
                  <span className="text-[10px] font-bold text-pink-500">
                    {onlineSettings?.branding?.brandTagline || "Kids, Toys & Lifestyle"}
                  </span>
                </div>
              </button>

              {/* Pill Search Bar */}
              <div className="hidden md:flex flex-1 max-w-xl items-center rounded-full border-2 border-purple-200 bg-purple-50/40 px-4 py-1.5 focus-within:border-[#6d5acd] focus-within:bg-white">
                <Search size={16} className="text-[#6d5acd] mr-2.5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search toys, baby care, apparel, gifts..."
                  className="flex-1 bg-transparent text-xs font-medium text-slate-800 outline-none"
                />
              </div>

              {/* Right Icons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-bold text-[#4c3b99] hover:bg-purple-50"
                >
                  <User size={14} />
                  <span className="hidden sm:inline">{customerPhone ? `+91 ${customerPhone.slice(-4)}` : "Account"}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenOrders}
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3 py-2 text-xs font-bold text-[#4c3b99] hover:bg-purple-50"
                >
                  <Gift size={14} className="text-pink-500" />
                  <span className="hidden sm:inline">Orders</span>
                </button>
                {showDeliveryAvailability && (
                  <button
                    type="button"
                    onClick={() => setDeliveryCheckOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                      pincodeStatus === "available"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : pincodeStatus && pincodeStatus !== "available"
                          ? "border-rose-300 bg-rose-50 text-rose-700"
                          : "border-purple-200 bg-white text-[#4c3b99] hover:bg-purple-50"
                    }`}
                  >
                    <MapPin size={14} className="text-pink-500 shrink-0" />
                    <span className="truncate max-w-[110px]">
                      {pincodeStatus === "available" && pincode ? `PIN ${pincode}` : "Delivery Availability"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {showDeliveryAvailability && deliveryCheckOpen && (
              <div className="mt-2.5 rounded-2xl border border-purple-200 bg-purple-50/50 p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <MapPin size={14} className="text-[#6d5acd] shrink-0" />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit PIN or area..."
                    className="h-8 flex-1 max-w-[200px] rounded-full border border-purple-200 bg-white px-3 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={onCheckPincode}
                    className="h-8 rounded-full bg-[#6d5acd] px-3.5 text-xs font-bold text-white hover:opacity-95 cursor-pointer"
                  >
                    Check
                  </button>
                </div>
                {registeredLocations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {registeredLocations.slice(0, 5).map((loc: any, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setPincode(loc.pincode || loc.areaName || "");
                          setTimeout(() => onCheckPincode(), 20);
                        }}
                        className="rounded-full border border-purple-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#4c3b99]"
                      >
                        {loc.areaName} ({loc.pincode})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Search */}
            <div className="mt-2.5 flex md:hidden items-center rounded-full border border-purple-200 bg-purple-50/40 px-3.5 py-1.5">
              <Search size={14} className="text-[#6d5acd] mr-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cute finds..."
                className="flex-1 bg-transparent text-xs outline-none"
              />
            </div>
          </div>

          {/* 3. Rounded Category Pill Bar with Yellow Deals Pill */}
          <div className="border-t border-pink-100/80 bg-[#fdf4f9]">
            <div className="mx-auto max-w-7xl px-3.5 sm:px-6 flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
              <button
                type="button"
                onClick={() => scrollToCatalog("All")}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                  activeCategory === "All"
                    ? "bg-[#6d5acd] text-white shadow-xs"
                    : "bg-white text-[#4c3b99] border border-purple-200"
                }`}
              >
                <Layers size={13} /> All Categories
              </button>
              {realCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => scrollToCatalog(cat.name)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                    activeCategory === cat.name
                      ? "bg-[#6d5acd] text-white shadow-xs"
                      : "bg-white text-slate-700 border border-pink-200/80 hover:border-[#6d5acd]"
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => scrollToCatalog("All")}
                className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fde047] px-3.5 py-1.5 text-xs font-extrabold text-slate-900 shadow-2xs"
              >
                <Tag size={12} /> Super Deals
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-3.5 sm:px-6 py-6 space-y-10">
          {/* 4. Soft Pastel Pink Hero Banner with Circular Discount Badge (Image 2) */}
          {showConfiguredHero && (
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#fce7f3] via-[#f3e8ff] to-[#fae8ff] border-2 border-pink-200/80 p-6 sm:p-10 shadow-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-pink-200 px-3.5 py-1 text-xs font-extrabold text-[#e11d48] shadow-2xs">
                    <Award size={12} /> {stripEmojis(onlineSettings?.hero?.eyebrowBadge) || "NEW SEASON COLLECTION"}
                  </span>
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#3b277a] leading-[1.12]">
                    {heroHeadline}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
                    {heroSub}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => scrollToCatalog("All")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#e11d48] hover:bg-rose-700 text-white px-7 py-3 text-xs sm:text-sm font-extrabold shadow-md transition cursor-pointer"
                    >
                      <span>{onlineSettings?.hero?.primaryCtaLabel || "Explore Collection"}</span>
                      <ChevronRight size={15} />
                    </button>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#6d5acd] text-white px-4 py-2.5 text-xs font-extrabold shadow-xs">
                      <Tag size={14} className="text-[#fde047]" />
                      <span>{stripEmojis(onlineSettings?.hero?.promoHighlightText) || ""}</span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 flex justify-center">
                  <div className="relative w-full max-w-sm rounded-[24px] bg-white p-4 shadow-lg border-2 border-pink-200">
                    <span className="absolute -top-3 -right-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#6d5acd] text-white text-[11px] font-black text-center leading-tight shadow-md rotate-12">
                      UP TO
                      <br />
                      40% OFF
                    </span>
                    {onlineSettings?.hero?.bannerImageUrl ? (
                      <img
                        src={onlineSettings.hero.bannerImageUrl}
                        alt={heroHeadline}
                        className="h-48 w-full object-cover rounded-2xl"
                      />
                    ) : items[0] && productImageFor(items[0]) ? (
                      <img
                        src={productImageFor(items[0])!}
                        alt={items[0].name}
                        className="h-48 w-full object-contain rounded-2xl bg-pink-50/50 p-3"
                      />
                    ) : (
                      <div className="h-48 w-full rounded-2xl bg-gradient-to-tr from-pink-100 to-purple-100 flex items-center justify-center">
                        <Baby size={68} className="text-[#6d5acd]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 5. Circular Pastel Icon Category Rail (Image 2) */}
          {realCategories.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg sm:text-xl font-black text-center text-[#3b277a]">
                Shop by Category
              </h2>
              <div className="flex items-center justify-start sm:justify-center gap-4 sm:gap-6 overflow-x-auto py-2 scrollbar-none">
                {realCategories.map((cat, idx) => {
                  const colorCls = pastelColors[idx % pastelColors.length];
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => scrollToCatalog(cat.name)}
                      className="group flex flex-col items-center gap-2 shrink-0 cursor-pointer"
                    >
                      <div
                        className={`flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full border-2 shadow-2xs group-hover:scale-105 transition ${colorCls}`}
                      >
                        <span className="text-lg sm:text-xl font-black uppercase">
                          {cat.name.slice(0, 2)}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-slate-800 max-w-[96px] truncate">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* 6. Four Pastel Promo Highlight Cards (New Arrivals | Summer Fun | Nursery | Feeding — Image 2) */}
          {showConfiguredBanners && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {[
              { title: realCategories[0]?.name || "New Arrivals", sub: "Fresh & Joyful Picks", bg: "bg-pink-100/80 border-pink-200 text-pink-900", icon: Package },
              { title: realCategories[1]?.name || "Playtime & Toys", sub: "Learning & Fun", bg: "bg-amber-100/80 border-amber-200 text-amber-900", icon: Gamepad2 },
              { title: realCategories[2]?.name || "Nursery & Care", sub: "Gentle & Safe", bg: "bg-purple-100/80 border-purple-200 text-purple-900", icon: ShieldCheck },
              { title: realCategories[3]?.name || "Gift Hampers", sub: "Ready to Celebrate", bg: "bg-sky-100/80 border-sky-200 text-sky-900", icon: Gift },
            ].map((card, i) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={i}
                  onClick={() => scrollToCatalog(realCategories[i]?.name || "All")}
                  className={`cursor-pointer rounded-3xl border-2 p-4 sm:p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${card.bg}`}
                >
                  <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 shadow-2xs">
                    <CardIcon size={18} />
                  </div>
                  <div className="text-sm sm:text-base font-black">{card.title}</div>
                  <div className="text-[11px] opacity-80 font-semibold mt-0.5">{card.sub}</div>
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold">
                    <span>Shop Now</span>
                    <ChevronRight size={11} />
                  </div>
                </div>
              );
            })}
          </section>
          )}

          {/* 7. Popular Picks Rounded Product Cards (Image 2) */}
          <section id="theme-catalog-anchor" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg sm:text-xl font-black text-[#3b277a]">
                <Star size={18} className="text-[#6d5acd]" />
                <span>{activeCategory === "All" ? "Popular Picks" : activeCategory}</span>
              </h2>
              {activeCategory !== "All" && (
                <button
                  type="button"
                  onClick={() => setActiveCategory("All")}
                  className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-[#6d5acd]"
                >
                  Show All Items
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {visibleItems.map((item) => {
                const count = qty[item.id] || 0;
                const img = productImageFor(item);
                const price = item.selling_price_paise ?? 0;
                const mrp = item.mrp_paise ?? 0;
                const hasDisc = mrp > price;
                const discPct = hasDisc ? Math.round(((mrp - price) / mrp) * 100) : 0;
                const wished = wishlistIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    className="group flex flex-col justify-between rounded-[24px] border-2 border-pink-100 bg-white p-3.5 shadow-2xs hover:border-[#6d5acd]/40 hover:shadow-md transition"
                  >
                    <div>
                      <div className="relative h-36 sm:h-44 w-full rounded-2xl bg-[#fdf4f9] overflow-hidden mb-3 flex items-center justify-center">
                        {img ? (
                          <img
                            src={img}
                            alt={item.name}
                            onClick={() => onOpenQuickView(item)}
                            className="h-full w-full object-contain p-2 group-hover:scale-105 transition cursor-pointer"
                          />
                        ) : (
                          <div
                            onClick={() => onOpenQuickView(item)}
                            className="flex h-full w-full items-center justify-center text-pink-300 cursor-pointer"
                          >
                            <Baby size={36} />
                          </div>
                        )}
                        {hasDisc && (
                          <span className="absolute left-2 top-2 rounded-full bg-[#e11d48] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                            {discPct}% OFF
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleWishlist(item.id)}
                          aria-label="Save to wishlist"
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-pink-500 shadow-2xs"
                        >
                          <Heart size={13} className={wished ? "fill-pink-500" : ""} />
                        </button>
                      </div>

                      <div className="text-[10px] font-bold uppercase text-[#6d5acd] truncate">
                        {item.category || "LittleJoy"}
                      </div>
                      <h3
                        onClick={() => onOpenQuickView(item)}
                        className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-2 mt-0.5 cursor-pointer"
                      >
                        {item.name}
                      </h3>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-pink-100/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm sm:text-base font-black text-[#4c3b99]">
                          {formatPrice(price)}
                        </span>
                        {hasDisc && (
                          <span className="block text-[10px] text-slate-400 line-through">
                            {formatPrice(mrp)}
                          </span>
                        )}
                      </div>

                      {count === 0 ? (
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.id, 1)}
                          className="rounded-full bg-[#6d5acd] hover:bg-[#5845b8] text-white px-3.5 py-1.5 text-xs font-extrabold shadow-2xs transition cursor-pointer"
                        >
                          + Add
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e11d48] text-white px-2.5 py-1 text-xs font-extrabold">
                          <button type="button" onClick={() => updateItemQty(item.id, count - 1)}>
                            <Minus size={11} />
                          </button>
                          <span className="w-4 text-center">{count}</span>
                          <button type="button" onClick={() => updateItemQty(item.id, count + 1)}>
                            <Plus size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 8. Purple Rounded 4-Item Trust Bar (Image 2) */}
          <section className="rounded-[28px] bg-[#6d5acd] text-white p-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { icon: ShieldCheck, title: "100% Child Safe", sub: "Dermatologically & Quality Tested" },
                { icon: Truck, title: "Fast Doorstep Delivery", sub: "Express Local Dispatch" },
                { icon: Gift, title: "Gift-Ready Packaging", sub: "Packed with Care & Love" },
                { icon: RefreshCw, title: "Easy Store Exchange", sub: "Hassle-Free Support" },
              ].map((b, i) => {
                const TrustIcon = b.icon;
                return (
                  <div key={i} className="space-y-1">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                      <TrustIcon size={18} />
                    </div>
                    <div className="text-xs sm:text-sm font-extrabold">{b.title}</div>
                    <div className="text-[11px] text-purple-200">{b.sub}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {onlineSettings?.topbarFooter?.showNewsletterInFooter !== false && (
          <section className="grid grid-cols-1">
              <div className="inline-flex items-center gap-2 text-base font-black text-slate-900">
                <Mail size={16} className="text-[#6d5acd]" />
                <span>Join the {displayStoreName} Family</span>
              </div>
              <p className="text-xs text-slate-600">
                Get special birthday coupons, new toy arrivals, and parent-exclusive offers.
              </p>
              {newsletterSubscribed ? (
                <div className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-800">
                  <Check size={14} />
                  <span>Welcome to the family!</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Parent email address..."
                    className="h-10 flex-1 rounded-full bg-white border border-amber-300 px-4 text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={onSubscribeNewsletter}
                    className="h-10 rounded-full bg-[#6d5acd] text-white px-5 text-xs font-extrabold cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              )}
          </section>
          )}
        </main>
      </div>
    );
  }

  // ============================================================================
  // THEME 3: FRESHMART — SUPERMARKET, ORGANIC & DAILY GROCERY (IMAGE 3)
  // ============================================================================
  const heroHeadline =
    onlineSettings?.hero?.headline?.trim() ||
    "Farm-fresh groceries delivered to your door";
  const heroSub =
    onlineSettings?.hero?.subheadline?.trim() ||
    "Handpicked fruits, organic vegetables, dairy & daily supermarket essentials at transparent counter prices.";

  return (
    <div className="min-h-screen bg-[#f7faf7] text-slate-900">
      {/* 1. Fresh Emerald Top Announcement Bar (Image 3) */}
      {onlineSettings?.topbarFooter?.showTopbar !== false && onlineSettings?.topbarFooter?.topbarText && (
        <div className="bg-[#15803d] text-white text-xs py-2 px-4">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
              <Leaf size={13} className="text-lime-300" />
              <span>
                {stripEmojis(onlineSettings?.topbarFooter?.topbarText?.trim()) ||
                  `100% Farm-Fresh Guarantee · Free Delivery above ${formatPrice((onlineSettings?.shipping?.freeDeliveryAbove ?? 499) * 100)}`}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-emerald-100 text-[11px]">
              <span>Store Hours: {props.hours || onlineSettings?.contact?.openingHoursText || "08:00 AM – 10:00 PM"}</span>
              <button type="button" onClick={onOpenOrders} className="hover:text-white underline">
                Track Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. FreshMart Header with Deliver-To Location Pill + Search + Green Nav Bar (Image 3) */}
      <header className="sticky top-0 z-30 bg-white border-b border-emerald-100 shadow-2xs">
        <div className="mx-auto max-w-7xl px-3.5 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3 sm:gap-5">
            {/* Brand + Deliver To Pill */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveCategory("All")}
                className="flex items-center gap-2 text-left shrink-0 cursor-pointer"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={displayStoreName} className="h-9 w-auto max-w-[130px] object-contain" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16a34a] text-white shadow-xs">
                    <Leaf size={20} />
                  </div>
                )}
                <div>
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 block leading-none">
                    {displayStoreName}
                  </span>
                  <span className="text-[10px] font-bold text-[#16a34a]">
                    {onlineSettings?.branding?.brandTagline || "Fresh Supermarket"}
                  </span>
                </div>
              </button>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl items-center rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-1.5 focus-within:border-[#16a34a] focus-within:bg-white">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fresh fruits, vegetables, milk, atta, snacks..."
                className="flex-1 bg-transparent text-xs text-slate-900 outline-none"
              />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <User size={14} className="text-[#16a34a]" />
                <span className="hidden sm:inline">{customerPhone ? `+91 ${customerPhone.slice(-4)}` : "Sign In"}</span>
              </button>

              <button
                type="button"
                onClick={onOpenOrders}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Clock size={14} className="text-orange-500" />
                <span className="hidden sm:inline">Orders</span>
              </button>

              {showDeliveryAvailability && (
                <button
                  type="button"
                  onClick={() => setDeliveryCheckOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    pincodeStatus === "available"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : pincodeStatus && pincodeStatus !== "available"
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <MapPin size={14} className="text-[#16a34a] shrink-0" />
                  <span className="truncate max-w-[110px]">
                    {pincodeStatus === "available" && pincode ? `PIN ${pincode}` : "Delivery Availability"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {showDeliveryAvailability && deliveryCheckOpen && (
            <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <MapPin size={14} className="text-[#16a34a] shrink-0" />
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit PIN or area..."
                  className="h-8 flex-1 max-w-[200px] rounded-lg border border-emerald-200 bg-white px-2.5 text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={onCheckPincode}
                  className="h-8 rounded-lg bg-[#16a34a] px-3 text-xs font-bold text-white hover:bg-green-700 cursor-pointer"
                >
                  Check
                </button>
              </div>
              {registeredLocations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {registeredLocations.slice(0, 5).map((loc: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setPincode(loc.pincode || loc.areaName || "");
                        setTimeout(() => onCheckPincode(), 20);
                      }}
                      className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-900"
                    >
                      {loc.areaName} ({loc.pincode})
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mobile Search */}
          <div className="mt-2.5 flex md:hidden items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
            <Search size={14} className="text-slate-400 mr-2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search daily groceries & produce..."
              className="flex-1 bg-transparent text-xs outline-none"
            />
          </div>
        </div>

        {/* 3. Green All-Categories Pill Nav Bar */}
        <div className="border-t border-emerald-100/80 bg-[#f0fdf4]">
          <div className="mx-auto max-w-7xl px-3.5 sm:px-6 flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
            <button
              type="button"
              onClick={() => scrollToCatalog("All")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeCategory === "All"
                  ? "bg-[#16a34a] text-white shadow-2xs"
                  : "bg-white text-slate-700 border border-emerald-200"
              }`}
            >
              All Categories ({items.length})
            </button>
            {realCategories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => scrollToCatalog(cat.name)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  activeCategory === cat.name
                    ? "bg-[#16a34a] text-white shadow-2xs"
                    : "bg-white text-slate-700 border border-slate-200/80 hover:border-[#16a34a]"
                }`}
              >
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3.5 sm:px-6 py-6 space-y-10">
        {/* 4. Split Hero with Left Farm-Fresh Showcase + 2 Stacked Right Promo Cards (Image 3) */}
        {showConfiguredHero && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Main Grocery Hero */}
            <div className="lg:col-span-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#15803d] to-[#16a34a] text-white p-6 sm:p-10 flex flex-col justify-between min-h-[280px] shadow-sm">
              <div className="relative z-10 max-w-lg space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/20 border border-lime-300/40 px-3 py-1 text-[11px] font-bold text-lime-200">
                  <Leaf size={12} /> {stripEmojis(onlineSettings?.hero?.eyebrowBadge) || "100% FARM FRESH & ORGANIC"}
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-[1.12]">
                  {heroHeadline}
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                  {heroSub}
                </p>
              </div>
              <div className="relative z-10 pt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollToCatalog("All")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#f97316] hover:bg-orange-600 text-white px-6 py-3 text-xs sm:text-sm font-extrabold shadow-md transition cursor-pointer"
                >
                  <span>{onlineSettings?.hero?.primaryCtaLabel || "Start Shopping"}</span>
                  <ChevronRight size={15} />
                </button>
                {onlineSettings?.hero?.showTrustPills !== false && (
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-100">
                    <span className="inline-flex items-center gap-1">
                      <Check size={13} /> {stripEmojis(onlineSettings?.hero?.trustPill1) || "Express Local Delivery"}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Check size={13} /> {stripEmojis(onlineSettings?.hero?.trustPill2) || "Counter MRP"}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Right 2 Stacked Promo Cards (Fresh Fruits + Bakery) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div
                onClick={() => scrollToCatalog(realCategories[0]?.name || "All")}
                className="flex-1 cursor-pointer rounded-3xl bg-gradient-to-r from-amber-100 to-orange-100 border border-orange-200 p-5 flex flex-col justify-between hover:shadow-sm transition"
              >
                <div>
                  <span className="rounded-md bg-orange-500 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase">
                    SEASONAL PICK
                  </span>
                  <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                    {realCategories[0]?.name || "Fresh Fruits & Veggies"}
                  </h3>
                  <p className="text-xs text-slate-600">Direct from local farms every morning</p>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-orange-600">
                  <span>Shop Aisle</span>
                  <ChevronRight size={13} />
                </span>
              </div>

              <div
                onClick={() => scrollToCatalog(realCategories[1]?.name || "All")}
                className="flex-1 cursor-pointer rounded-3xl bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-200 p-5 flex flex-col justify-between hover:shadow-sm transition"
              >
                <div>
                  <span className="rounded-md bg-[#16a34a] text-white px-2 py-0.5 text-[10px] font-extrabold uppercase">
                    DAILY ESSENTIALS
                  </span>
                  <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                    {realCategories[1]?.name || "Bakery, Dairy & Pantry"}
                  </h3>
                  <p className="text-xs text-slate-600">Freshly stocked staples & household goods</p>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#16a34a]">
                  <span>Explore Now</span>
                  <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </section>
        )}

        {/* 5. Circular Photo Shop by Category Rail (Image 3) */}
        {realCategories.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Shop by Category</h2>
              <span className="text-xs font-semibold text-[#16a34a]">{realCategories.length} Aisles</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {realCategories.slice(0, 8).map((cat) => {
                const sampleItem = items.find((i) => (i.category || "General") === cat.name);
                const sampleImg = sampleItem ? productImageFor(sampleItem) : null;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => scrollToCatalog(cat.name)}
                    className="group flex flex-col items-center text-center cursor-pointer"
                  >
                    <div className="h-20 w-20 rounded-full border-2 border-emerald-200 bg-white p-1.5 shadow-2xs group-hover:border-[#16a34a] group-hover:scale-105 transition overflow-hidden flex items-center justify-center">
                      {sampleImg ? (
                        <img src={sampleImg} alt={cat.name} className="h-full w-full object-contain rounded-full" />
                      ) : (
                        <Leaf size={26} className="text-[#16a34a]" />
                      )}
                    </div>
                    <span className="mt-2 text-xs font-bold text-slate-800 line-clamp-1">{cat.name}</span>
                    <span className="text-[10px] text-slate-400">{cat.count} items</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Soft Orange-Tinted Weekly Deals Container (Image 3) */}
        {discountedItems.length > 0 && (
          <section className="rounded-3xl border-2 border-orange-200/80 bg-[#fff7ed] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f97316] text-white">
                  <Flame size={18} />
                </span>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Weekly Supermarket Deals</h2>
                  <p className="text-xs text-slate-500">Special counter savings on everyday essentials</p>
                </div>
              </div>
              <span className="rounded-full bg-orange-100 border border-orange-200 px-3 py-1 text-xs font-bold text-orange-800">
                Limited Time Savings
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {discountedItems.slice(0, 4).map((item) => {
                const count = qty[item.id] || 0;
                const img = productImageFor(item);
                const price = item.selling_price_paise ?? 0;
                const mrp = item.mrp_paise ?? 0;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-orange-200/70 bg-white p-3 flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="h-28 w-full rounded-xl bg-slate-50 mb-2 flex items-center justify-center overflow-hidden">
                        {img ? (
                          <img src={img} alt={item.name} className="h-full w-full object-contain p-2" />
                        ) : (
                          <Leaf size={28} className="text-emerald-300" />
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 line-clamp-2">{item.name}</div>
                      <div className="text-[10px] text-slate-400">{item.unit_short || "1 Pack"}</div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-extrabold text-[#16a34a]">{formatPrice(price)}</span>
                        {mrp > price && (
                          <span className="block text-[10px] text-slate-400 line-through">{formatPrice(mrp)}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, count + 1)}
                        className="rounded-full bg-[#16a34a] hover:bg-green-700 text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        {count > 0 ? `+ Add (${count})` : "+ Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 7. Popular Right Now Full Catalog Grid (Image 3) */}
        <section id="theme-catalog-anchor" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-lg sm:text-xl font-extrabold text-slate-900">
              <TrendingUp size={18} className="text-[#16a34a]" />
              <span>{activeCategory === "All" ? "Popular Right Now" : activeCategory}</span>
            </h2>
            {activeCategory !== "All" && (
              <button
                type="button"
                onClick={() => setActiveCategory("All")}
                className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-[#16a34a]"
              >
                View All Aisles
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {visibleItems.map((item) => {
              const count = qty[item.id] || 0;
              const img = productImageFor(item);
              const price = item.selling_price_paise ?? 0;
              const mrp = item.mrp_paise ?? 0;
              const hasDisc = mrp > price;
              const discPct = hasDisc ? Math.round(((mrp - price) / mrp) * 100) : 0;

              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-[#16a34a] hover:shadow-md transition"
                >
                  <div>
                    <div className="relative h-32 sm:h-36 w-full rounded-xl bg-slate-50 mb-2.5 flex items-center justify-center overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={item.name}
                          onClick={() => onOpenQuickView(item)}
                          className="h-full w-full object-contain p-2 group-hover:scale-105 transition cursor-pointer"
                        />
                      ) : (
                        <div
                          onClick={() => onOpenQuickView(item)}
                          className="flex h-full w-full items-center justify-center text-emerald-200 cursor-pointer"
                        >
                          <Leaf size={32} />
                        </div>
                      )}
                      {hasDisc && (
                        <span className="absolute left-2 top-2 rounded-md bg-[#f97316] px-2 py-0.5 text-[10px] font-extrabold text-white">
                          {discPct}% OFF
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-[#16a34a] uppercase truncate">
                      {item.category || "Grocery"}
                    </div>
                    <h3
                      onClick={() => onOpenQuickView(item)}
                      className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 mt-0.5 cursor-pointer"
                    >
                      {item.name}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.unit_short || "1 Unit"}</div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900">{formatPrice(price)}</span>
                      {hasDisc && (
                        <span className="block text-[10px] text-slate-400 line-through">{formatPrice(mrp)}</span>
                      )}
                    </div>

                    {count === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateItemQty(item.id, 1)}
                        className="rounded-full bg-[#16a34a] hover:bg-green-700 text-white px-3.5 py-1.5 text-xs font-extrabold shadow-2xs transition cursor-pointer"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[#16a34a] text-white px-2.5 py-1 text-xs font-extrabold">
                        <button type="button" onClick={() => updateItemQty(item.id, count - 1)}>
                          <Minus size={11} />
                        </button>
                        <span className="w-4 text-center">{count}</span>
                        <button type="button" onClick={() => updateItemQty(item.id, count + 1)}>
                          <Plus size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 8. Green Weekly Flyer Newsletter Box (Image 3) */}
        {onlineSettings?.topbarFooter?.showNewsletterInFooter !== false && (
          <section className="rounded-3xl bg-gradient-to-r from-[#15803d] to-[#16a34a] text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-lime-300">
                WEEKLY SUPERMARKET FLYER
              </span>
              <h3 className="text-xl font-extrabold">Get the weekly deals flyer in your inbox</h3>
              <p className="text-xs text-emerald-100">
                Never miss fresh harvest arrivals and weekend basket discounts at {displayStoreName}.
              </p>
            </div>
            {newsletterSubscribed ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2.5 text-xs font-bold">
                <Check size={14} />
                <span>Subscribed to Weekly Flyer!</span>
              </div>
            ) : (
              <div className="flex w-full md:w-auto max-w-md gap-2">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email..."
                  className="h-11 flex-1 md:w-64 rounded-xl bg-white px-4 text-xs text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={onSubscribeNewsletter}
                  className="h-11 rounded-xl bg-[#f97316] hover:bg-orange-600 px-5 text-xs font-extrabold text-white cursor-pointer"
                >
                  Subscribe
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
