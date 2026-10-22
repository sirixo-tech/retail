"use client";

import { formatInr } from "@selfx/types";
import { ArrowLeft, CheckCircle2, Clock, Minus, Plus, ShieldCheck, ShoppingBag, ShoppingCart, Store, Truck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  selling_price_paise: number | null;
  mrp_paise?: number | null;
  category_name?: string | null;
  brand_name?: string | null;
  unit_short?: string | null;
  image_url?: string | null;
  description?: string | null;
};

const STORE_STORAGE_KEY = "selfx_active_store_slug_v1";

function getCartKey(storeSlug: string) {
  return `selfx_storefront_cart_${storeSlug}_v2`;
}

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slugParam = params?.slug || "";
  const [storeSlug, setStoreSlug] = useState("bangalore");
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState<Record<string, number>>({});

  useEffect(() => {
    const activeSlug =
      (typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("store") ||
          window.localStorage.getItem(STORE_STORAGE_KEY))) ||
      "bangalore";
    setStoreSlug(activeSlug);

    try {
      const saved = window.localStorage.getItem(getCartKey(activeSlug));
      if (saved) setQty(JSON.parse(saved) as Record<string, number>);
    } catch {
      // ignore
    }

    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/public/stores/${encodeURIComponent(activeSlug)}/items`, { cache: "no-store" });
        if (res.ok) {
          const body = (await res.json()) as { data?: StoreProduct[] };
          const list = Array.isArray(body.data) ? body.data : [];
          const found = list.find((item) => item.slug === slugParam || item.id === slugParam) || null;
          setProduct(found);
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }

    void loadProduct();
  }, [slugParam]);

  function updateQty(id: string, next: number) {
    setQty((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      try {
        window.localStorage.setItem(getCartKey(storeSlug), JSON.stringify(copy));
      } catch {
        // ignore
      }
      return copy;
    });
  }

  const count = product ? qty[product.id] || 0 : 0;
  const price = product?.selling_price_paise ?? 0;
  const mrp = product?.mrp_paise && product.mrp_paise > price ? product.mrp_paise : price;
  const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <div className="min-h-screen bg-white text-[#1f1f1f]">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link
            href={`/?store=${encodeURIComponent(storeSlug)}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-800 hover:text-[#0c831f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Store
          </Link>
          <Link
            href={`/cart?store=${encodeURIComponent(storeSlug)}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0c831f] px-4 text-xs font-semibold text-white hover:bg-[#096b19]"
          >
            <ShoppingCart className="h-4 w-4" />
            My Cart
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        {loading ? (
          <div className="rounded-2xl border border-neutral-200 p-12 text-center text-xs font-semibold text-neutral-500">
            Loading product details...
          </div>
        ) : !product ? (
          <div className="rounded-2xl border border-neutral-200 p-12 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-neutral-300" />
            <h2 className="mt-3 text-base font-semibold text-neutral-900">Product not found in this store</h2>
            <Link
              href={`/?store=${encodeURIComponent(storeSlug)}`}
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#0c831f] px-5 text-xs font-semibold text-white"
            >
              Browse Store Items
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 rounded-2xl border border-neutral-200 bg-white p-6 md:grid-cols-2 md:p-10">
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-white p-8">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <ShoppingBag className="h-20 w-20 text-neutral-200" />
              )}
              {discountPct > 0 ? (
                <span className="absolute left-4 top-4 rounded bg-[#256fef] px-2.5 py-1 text-xs font-semibold text-white">
                  {discountPct}% OFF
                </span>
              ) : null}
            </div>

            <div className="flex flex-col justify-between space-y-6">
              <div>
                <div className="inline-flex items-center gap-1 rounded bg-[#f4f6fb] px-2 py-0.5 text-[11px] font-semibold text-neutral-700">
                  <Clock className="h-3 w-3 text-[#0c831f]" />
                  12 MINS
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">{product.name}</h1>
                {product.brand_name || product.category_name ? (
                  <p className="mt-1 text-xs font-semibold text-neutral-500">
                    {[product.brand_name, product.category_name].filter(Boolean).join(" · ")}
                  </p>
                ) : null}

                <div className="mt-4 inline-block rounded border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-700">
                  {product.unit_short || "1 Unit"}
                </div>

                <div className="mt-5 flex items-baseline gap-3">
                  <p className="text-2xl font-semibold text-neutral-900">{formatInr(price)}</p>
                  {mrp > price ? (
                    <span className="text-sm text-neutral-400 line-through">MRP {formatInr(mrp)}</span>
                  ) : null}
                  <span className="text-[11px] text-neutral-500">(Inclusive of all taxes)</span>
                </div>

                {product.description ? (
                  <p className="mt-4 text-xs leading-relaxed text-neutral-600">{product.description}</p>
                ) : null}

                <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-[#f4f6fb]/60 p-4 text-xs sm:grid-cols-2">
                  <div className="flex items-center gap-2.5 text-neutral-700">
                    <Truck className="h-4 w-4 text-[#0c831f] shrink-0" />
                    <span>Superfast store delivery</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-neutral-700">
                    <Store className="h-4 w-4 text-[#0c831f] shrink-0" />
                    <span>Direct from local store inventory</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-neutral-700">
                    <CheckCircle2 className="h-4 w-4 text-[#0c831f] shrink-0" />
                    <span>Best prices & offers</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-neutral-700">
                    <ShieldCheck className="h-4 w-4 text-[#0c831f] shrink-0" />
                    <span>100% genuine products</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                {count === 0 ? (
                  <button
                    type="button"
                    onClick={() => updateQty(product.id, 1)}
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-[#0c831f] bg-[#f7fff9] px-8 text-sm font-semibold text-[#0c831f] hover:bg-[#0c831f] hover:text-white"
                  >
                    ADD TO CART
                  </button>
                ) : (
                  <div className="inline-flex h-11 w-36 items-center justify-between rounded-lg bg-[#0c831f] px-3 text-white">
                    <button
                      type="button"
                      onClick={() => updateQty(product.id, count - 1)}
                      className="flex h-7 w-7 items-center justify-center"
                    >
                      <Minus className="h-4 w-4 stroke-[2.5]" />
                    </button>
                    <span className="text-sm font-semibold">{count}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(product.id, count + 1)}
                      className="flex h-7 w-7 items-center justify-center"
                    >
                      <Plus className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </div>
                )}
                <Link
                  href={`/cart?store=${encodeURIComponent(storeSlug)}`}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0c831f] px-6 text-xs font-semibold text-white hover:bg-[#096b19]"
                >
                  View Cart
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
