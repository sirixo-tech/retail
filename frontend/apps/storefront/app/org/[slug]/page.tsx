"use client";

import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Tag,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StorefrontAiWidget } from "../../storefront-ai-widget";

type MemberStore = {
  id: string;
  name: string;
  slug: string;
  public_slug: string;
  outlets_count: number;
  category: string;
  location: string;
};

type OrgInfo = {
  id: string;
  name: string;
  legal_name?: string;
  slug: string;
  description: string;
  campus_name: string;
  banner_text: string;
};

type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  price_paise: number;
  mrp_paise: number;
  store_id: string;
  store_name: string;
  store_slug: string;
  image_url?: string | null;
  in_stock: boolean;
};

type CartItem = {
  item: CatalogItem;
  qty: number;
};

export default function OrganizationStorefrontPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [memberStores, setMemberStores] = useState<MemberStore[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreSlug, setSelectedStoreSlug] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [orgRes, itemsRes] = await Promise.all([
          fetch(`/api/v1/public/organizations/${encodeURIComponent(slug)}`).then((r) =>
            r.ok ? r.json() : null
          ),
          fetch(`/api/v1/public/organizations/${encodeURIComponent(slug)}/items`).then((r) =>
            r.ok ? r.json() : null
          ),
        ]);

        if (!active) return;

        if (orgRes?.data) {
          setOrg(orgRes.data.organization);
          setMemberStores(orgRes.data.member_stores || []);
        } else {
          setOrg(null);
          setMemberStores([]);
        }

        if (itemsRes?.data && itemsRes.data.length > 0) {
          setItems(itemsRes.data);
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error("Failed to load organization storefront:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const existing = prev[item.id];
      const newQty = (existing?.qty || 0) + 1;
      return {
        ...prev,
        [item.id]: { item, qty: newQty },
      };
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      if (existing.qty <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return {
        ...prev,
        [itemId]: { ...existing, qty: existing.qty - 1 },
      };
    });
  }

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, c) => sum + c.qty, 0);
  }, [cart]);

  const totalCartAmount = useMemo(() => {
    return (
      Object.values(cart).reduce((sum, c) => sum + c.qty * c.item.price_paise, 0) / 100
    );
  }, [cart]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStore =
        selectedStoreSlug === "all" || item.store_slug === selectedStoreSlug;
      const matchesQuery =
        searchQuery === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.store_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStore && matchesQuery;
    });
  }, [items, selectedStoreSlug, searchQuery]);

  if (!loading && !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-xs space-y-4">
          <Building2 className="mx-auto h-12 w-12 text-slate-300" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-900">Organization Not Found</h1>
            <p className="text-xs text-slate-500">
              No organization storefront exists with the directory slug &quot;{slug}&quot;.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition"
          >
            Back to Directory
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between selection:bg-violet-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-sm font-semibold text-white shadow-xs">
              {org?.name.slice(0, 2).toUpperCase() || "OR"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm sm:text-base text-slate-900 tracking-tight">
                  {org?.name || "Organization Hub"}
                </span>
                <span className="rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-[9.5px] font-semibold text-purple-700 uppercase">
                  Combined Storefront
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {org?.campus_name || "Campus & Enterprise Outlets Directory"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex h-10 items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 text-xs font-semibold shadow-xs transition"
            >
              <ShoppingBag size={15} />
              <span className="hidden sm:inline">Combined Cart</span>
              {totalCartCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-semibold text-white shadow-2xs">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6 flex-1">
        {/* Organization Hero Banner */}
        <div className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-violet-200 border border-white/15 backdrop-blur-xs">
                <Building2 size={13} />
                {org?.campus_name || "Campus Network"} • {memberStores.length} Member Stores
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                {org?.name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {org?.banner_text ||
                  "Order food, beverages, daily essentials, and books across member stores with unified delivery or counter pickup."}
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="grid grid-cols-2 gap-3 shrink-0 rounded-2xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-xs text-center text-xs">
              <div className="px-2">
                <div className="text-xl font-semibold text-white">{memberStores.length}</div>
                <div className="text-[10px] font-medium text-violet-200 uppercase tracking-wider">
                  Outlets
                </div>
              </div>
              <div className="border-l border-white/15 px-2">
                <div className="text-xl font-semibold text-white">{items.length}</div>
                <div className="text-[10px] font-medium text-violet-200 uppercase tracking-wider">
                  Products
                </div>
              </div>
            </div>
          </div>

          {/* Search bar within banner */}
          <div className="pt-2">
            <div className="relative max-w-xl">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search across all member stores (e.g. coffee, milk, sandwich, dosa)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-2xl border border-white/20 bg-white/90 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-500 shadow-md outline-none focus:bg-white focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>
        </div>

        {/* Member Store Filter Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500 text-[10.5px]">
              Filter by Member Store
            </span>
            <span className="text-slate-500">
              Showing {filteredItems.length} available item{filteredItems.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStoreSlug("all")}
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition shadow-2xs ${
                selectedStoreSlug === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              All Outlets ({items.length})
            </button>
            {memberStores.map((st) => (
              <button
                key={st.slug}
                type="button"
                onClick={() => setSelectedStoreSlug(st.slug)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition shadow-2xs flex items-center gap-1.5 ${
                  selectedStoreSlug === st.slug
                    ? "bg-violet-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Store size={13} className={selectedStoreSlug === st.slug ? "text-white" : "text-violet-600"} />
                <span>{st.name}</span>
                <span className="text-[10px] opacity-75 font-normal">({st.location})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2">
            <div className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
            <span className="text-xs text-slate-500 font-medium">Aggregating member store items...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
            <ShoppingBag size={32} className="mx-auto text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">
              {items.length === 0 ? "No products listed yet" : "No items match your query"}
            </h3>
            <p className="text-xs text-slate-500">
              {items.length === 0
                ? "Member stores under this organization have not published any products online yet."
                : "Try searching for other products or clear the store filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredItems.map((item) => {
              const inCart = cart[item.id]?.qty || 0;
              const price = item.price_paise / 100;
              const mrp = item.mrp_paise / 100;

              return (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-slate-300 hover:shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    {/* Store Origin Badge */}
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200/60 px-2 py-0.5 text-[10px] font-semibold text-violet-700 truncate max-w-[160px]">
                        <Store size={10} className="shrink-0" />
                        <span className="truncate">{item.store_name}</span>
                      </span>
                      <span className="text-[10.5px] font-mono text-slate-400">{item.sku}</span>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-xs sm:text-sm font-semibold text-slate-900 group-hover:text-violet-700 transition line-clamp-2">
                      {item.name}
                    </h3>
                  </div>

                  {/* Price and Add button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm sm:text-base font-semibold text-slate-900">
                        ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </div>
                      {mrp > price && (
                        <div className="text-[10.5px] text-slate-400 line-through">
                          ₹{mrp.toLocaleString("en-IN")}
                        </div>
                      )}
                    </div>

                    {inCart > 0 ? (
                      <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="flex size-6 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="px-1 text-xs font-semibold text-slate-900">{inCart}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="flex size-6 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="inline-flex h-8 items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 text-xs font-semibold shadow-2xs transition"
                      >
                        <Plus size={12} />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setCartOpen(false)} />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-violet-600" />
                <h3 className="text-sm font-semibold text-slate-900">Combined Organization Cart</h3>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {Object.keys(cart).length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <ShoppingBag size={28} className="mx-auto text-slate-400" />
                  <p>Your combined cart is empty.</p>
                </div>
              ) : (
                Object.values(cart).map(({ item, qty }) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[10.5px] text-violet-700 font-semibold flex items-center gap-1">
                        <Store size={10} />
                        <span>{item.store_name}</span>
                      </div>
                      <div className="text-xs text-slate-700 mt-0.5">
                        ₹{(item.price_paise / 100).toLocaleString("en-IN")} × {qty}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="flex size-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-semibold px-1 text-slate-900">{qty}</span>
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="flex size-7 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {Object.keys(cart).length > 0 && (
              <div className="border-t border-slate-100 p-5 space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Items:</span>
                  <span className="font-semibold text-slate-900">{totalCartCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">Total Payable:</span>
                  <span className="font-semibold text-slate-900 text-base">
                    ₹{totalCartAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOrderSuccess(true);
                    setCart({});
                  }}
                  className="w-full h-10 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition shadow-sm"
                >
                  Proceed to Checkout across Outlets &rarr;
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Checkout Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Order Placed Successfully!</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your combined orders have been dispatched to each respective campus outlet for counter preparation.
            </p>
            <button
              type="button"
              onClick={() => {
                setOrderSuccess(false);
                setCartOpen(false);
              }}
              className="w-full h-9 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* Floating Grok-style AI Agent */}
      <StorefrontAiWidget storeName={org?.name || "Campus AI"} slug={slug} />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          {org?.name} • Powered by SelfX Enterprise Multi-Tenant Platform &amp; Retail Core
        </p>
      </footer>
    </div>
  );
}
