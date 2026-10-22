"use client";

import { formatInr } from "@selfx/types";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Lock,
  MapPin,
  Minus,
  Navigation,
  PackageCheck,
  Phone,
  Plus,
  Printer,
  QrCode,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  User,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

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
};

type PublicStoreSummary = {
  id: string;
  name: string;
  public_slug: string;
  address_line?: string | null;
  city?: string | null;
  pincode?: string | null;
  online_store_settings?: any;
};

const CART_STORAGE_KEY = "selfx_storefront_cart_v2";
const CUSTOMER_STORAGE_KEY = "selfx_storefront_customer_v2";
const STORE_STORAGE_KEY = "selfx_active_store_slug_v1";

export default function CartPage() {
  const [storeSlug, setStoreSlug] = useState("bangalore");
  const [storeInfo, setStoreInfo] = useState<PublicStoreSummary | null>(null);
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState<Record<string, number>>({});

  // Checkout choices: pay on delivery vs pay in store
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState("cod");

  // Customer details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // 1-Click Live Location
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [liveLocationUrl, setLiveLocationUrl] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Confirmed Order
  const [orderConfirmed, setOrderConfirmed] = useState<{
    number: string;
    totalPaise: number;
    fulfillment: string;
    payment: string;
    pickupQr?: string | null;
    qrDataUrl?: string | null;
    address?: string | null;
    liveLocationUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    const slug =
      (typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("store") ||
          window.localStorage.getItem(STORE_STORAGE_KEY))) ||
      "bangalore";
    setStoreSlug(slug);

    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setQty(JSON.parse(savedCart) as Record<string, number>);

      const savedCustomer = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer) as {
          phone?: string;
          name?: string;
          email?: string;
          address?: string;
          landmark?: string;
          pincode?: string;
          latitude?: number;
          longitude?: number;
        };
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.landmark) setLandmark(parsed.landmark);
        if (parsed.pincode) setPincode(parsed.pincode);
        if (parsed.latitude && parsed.longitude) {
          setLatitude(parsed.latitude);
          setLongitude(parsed.longitude);
          setLiveLocationUrl(`https://www.google.com/maps?q=${parsed.latitude},${parsed.longitude}`);
          setLocationSuccess(true);
        }
      }
    } catch {
      // ignore
    }

    async function loadStoreData() {
      setLoading(true);
      try {
        const [storeRes, itemsRes] = await Promise.all([
          fetch(`/api/v1/public/stores/${encodeURIComponent(slug)}`, { cache: "no-store" }),
          fetch(`/api/v1/public/stores/${encodeURIComponent(slug)}/items`, { cache: "no-store" }),
        ]);
        if (storeRes.ok) {
          const sBody = (await storeRes.json()) as { data?: PublicStoreSummary };
          if (sBody.data) {
            setStoreInfo(sBody.data);
            if (sBody.data.pincode && !pincode) setPincode(sBody.data.pincode);
          }
        }
        if (itemsRes.ok) {
          const iBody = (await itemsRes.json()) as { data?: StoreProduct[] };
          setItems(Array.isArray(iBody.data) ? iBody.data : []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    void loadStoreData();
  }, [pincode]);

  function updateQty(id: string, next: number) {
    setQty((prev) => {
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      try {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(copy));
      } catch {
        // ignore
      }
      return copy;
    });
  }

  // Detect Live Location
  const handleDetectLiveLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLiveLocationUrl(`https://www.google.com/maps?q=${lat},${lng}`);
        setLocationSuccess(true);
        setDetectingLocation(false);
        if (!address) {
          setAddress(`Live GPS Pinned (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        }
      },
      (err) => {
        setDetectingLocation(false);
        setErrorMsg(`Location detection failed: ${err.message}. Please enter address manually.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const lines = useMemo(() => {
    return Object.entries(qty)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const product = items.find((p) => p.id === id || p.slug === id);
        if (!product) return null;
        const price = product.selling_price_paise ?? 0;
        return {
          product,
          count,
          lineTotalPaise: price * count,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [qty, items]);

  const totalItemsCount = useMemo(() => lines.reduce((sum, l) => sum + l.count, 0), [lines]);
  const grossSubtotalPaise = useMemo(() => lines.reduce((sum, l) => sum + l.lineTotalPaise, 0), [lines]);

  // Online Store Settings & Dynamic Theming
  const onlineSettings = storeInfo?.online_store_settings ?? {};
  const brandPrimaryColor =
    onlineSettings?.basics?.primaryColor ||
    onlineSettings?.branding?.primaryColor ||
    "#ea580c";
  const brandSecondaryColor =
    onlineSettings?.basics?.secondaryColor ||
    onlineSettings?.branding?.secondaryColor ||
    "#c2410c";
  const buttonRadiusClass =
    onlineSettings?.branding?.borderRadiusStyle === "sharp"
      ? "rounded-md"
      : onlineSettings?.branding?.borderRadiusStyle === "pill"
      ? "rounded-full"
      : "rounded-xl";
  const cardRadiusClass =
    onlineSettings?.branding?.borderRadiusStyle === "sharp"
      ? "rounded-lg"
      : onlineSettings?.branding?.borderRadiusStyle === "pill"
      ? "rounded-3xl"
      : "rounded-2xl";

  // Read tax settings from tenant's online_store_settings
  const taxSettings = storeInfo?.online_store_settings?.taxSettings ?? {};
  const taxRates = storeInfo?.online_store_settings?.taxRates ?? [];
  const firstTaxRate = Array.isArray(taxRates) && taxRates.length > 0 ? taxRates[0] : null;

  const cgstPct = Number(taxSettings.defaultCgstPct ?? firstTaxRate?.cgstPct ?? 2.5);
  const sgstPct = Number(taxSettings.defaultSgstPct ?? firstTaxRate?.sgstPct ?? 2.5);
  const totalGstPct = cgstPct + sgstPct;
  const isTaxInclusive = (taxSettings.inclusiveInMrp ?? firstTaxRate?.inclusiveInMrp ?? true) !== false;

  let netSubtotalPaise = grossSubtotalPaise;
  let cgstPaise = 0;
  let sgstPaise = 0;
  let totalGstPaise = 0;

  if (totalGstPct > 0) {
    if (isTaxInclusive) {
      netSubtotalPaise = Math.round(grossSubtotalPaise / (1 + totalGstPct / 100));
      totalGstPaise = grossSubtotalPaise - netSubtotalPaise;
      cgstPaise = Math.round(totalGstPaise * (cgstPct / totalGstPct));
      sgstPaise = totalGstPaise - cgstPaise;
    } else {
      cgstPaise = Math.round(grossSubtotalPaise * (cgstPct / 100));
      sgstPaise = Math.round(grossSubtotalPaise * (sgstPct / 100));
      totalGstPaise = cgstPaise + sgstPaise;
    }
  }

  // Delivery & Packaging Fees from tenant online store settings
  const shippingSettings = storeInfo?.online_store_settings?.shipping ?? {};
  const shippingMethods = storeInfo?.online_store_settings?.shippingMethods ?? [];
  const firstShippingMethod = Array.isArray(shippingMethods) && shippingMethods.length > 0 ? shippingMethods[0] : null;
  const checkoutSettings = storeInfo?.online_store_settings?.checkout ?? {};

  const configuredDeliveryFee = Number(
    shippingSettings.standardDeliveryFee ?? firstShippingMethod?.feeAmount ?? checkoutSettings.deliveryFee ?? 35,
  );
  const configuredFreeAbove = Number(
    shippingSettings.freeDeliveryAbove ?? firstShippingMethod?.freeAboveAmount ?? checkoutSettings.freeDeliveryAbove ?? 499,
  );
  const configuredPackagingFee = Number(
    (shippingSettings.enablePackagingFee !== false ? shippingSettings.packagingFee : 0) ?? checkoutSettings.packagingFee ?? 0,
  );
  const minOrderAmount = Number(
    storeInfo?.online_store_settings?.basics?.minOrderAmount ?? shippingSettings.minOrderAmount ?? 0,
  );

  const freeDeliveryThresholdPaise = configuredFreeAbove * 100;
  const deliveryChargePaise =
    fulfillment === "delivery" && grossSubtotalPaise > 0 && grossSubtotalPaise < freeDeliveryThresholdPaise
      ? configuredDeliveryFee * 100
      : 0;
  const packagingChargePaise = grossSubtotalPaise > 0 ? configuredPackagingFee * 100 : 0;
  const grandTotalPaise = isTaxInclusive
    ? grossSubtotalPaise + deliveryChargePaise + packagingChargePaise
    : grossSubtotalPaise + totalGstPaise + deliveryChargePaise + packagingChargePaise;

  async function handlePlaceOrder() {
    if (lines.length === 0) return;

    if (minOrderAmount > 0 && grossSubtotalPaise < minOrderAmount * 100) {
      setErrorMsg(`Minimum order amount is ${formatInr(minOrderAmount * 100)}. Please add more items to cart.`);
      return;
    }

    if (fulfillment === "delivery") {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        setErrorMsg("Valid mobile number is required for Pay on Delivery.");
        return;
      }
      if (!address.trim() && !liveLocationUrl) {
        setErrorMsg("Please detect your live location or enter your delivery address.");
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        customer_name: name.trim() || `Customer ${phone.slice(-4) || "Guest"}`,
        customer_phone: phone.replace(/\D/g, "") || "9999999999",
        customer_email: email.trim() || null,
        fulfillment,
        payment_method: fulfillment === "pickup" ? "pay_at_store" : payment,
        pincode: pincode.trim() || undefined,
        address: address.trim() || undefined,
        landmark: landmark.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        live_location_url: liveLocationUrl ?? undefined,
        special_instructions: specialInstructions.trim() || undefined,
        lines: lines.map((l) => ({
          store_item_id: l.product.id,
          qty: l.count,
        })),
      };

      const res = await fetch(`/api/v1/public/stores/${encodeURIComponent(storeSlug)}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        setErrorMsg(body.message || body.error?.message || "Unable to place order.");
        return;
      }

      const orderData = body.data;
      const pickupQrCode = orderData.pickup_qr || `SELFX-ORD-${orderData.number}`;

      let qrImgUrl: string | null = null;
      try {
        qrImgUrl = await QRCode.toDataURL(pickupQrCode, {
          width: 320,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
      } catch {
        // ignore
      }

      // Save customer session
      try {
        window.localStorage.setItem(
          CUSTOMER_STORAGE_KEY,
          JSON.stringify({ name, phone, email, address, landmark, pincode, latitude, longitude }),
        );
      } catch {
        // ignore
      }

      setOrderConfirmed({
        number: orderData.number,
        totalPaise: grandTotalPaise,
        fulfillment,
        payment: fulfillment === "pickup" ? "pay_at_store" : payment,
        pickupQr: pickupQrCode,
        qrDataUrl: qrImgUrl,
        address: address || "Store Counter",
        liveLocationUrl: liveLocationUrl,
      });

      // Cache recent order for home page floating tracking bar
      try {
        const orderRecord = {
          id: orderData.id,
          number: orderData.number,
          total_paise: grandTotalPaise,
          fulfillment,
          status: "placed",
          customer_name: name || "Customer",
          customer_phone: phone,
          created_at: new Date().toISOString(),
          items_count: totalItemsCount,
          address: address || "Store Counter",
          latitude,
          longitude,
          liveLocationUrl,
        };
        window.localStorage.setItem("selfx_last_placed_order", JSON.stringify(orderRecord));
        const rawRecent = window.localStorage.getItem("selfx_recent_orders");
        const list = rawRecent ? JSON.parse(rawRecent) : [];
        window.localStorage.setItem(
          "selfx_recent_orders",
          JSON.stringify([orderRecord, ...list.filter((o: any) => o.number !== orderData.number)].slice(0, 20)),
        );
      } catch {
        // ignore
      }

      setQty({});
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      setErrorMsg("Network error while placing order.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href={`/?store=${encodeURIComponent(storeSlug)}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            <ArrowLeft size={15} />
            <span>Back to Menu</span>
          </Link>

          <div className="text-center">
            <h1 className="text-sm font-semibold text-slate-900">{storeInfo?.name || "Online Store"}</h1>
            <p className="text-[11px] font-medium text-slate-500">Checkout &amp; Order Options</p>
          </div>

          <div
            className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full border"
            style={{
              color: brandPrimaryColor,
              backgroundColor: `${brandPrimaryColor}10`,
              borderColor: `${brandPrimaryColor}30`,
            }}
          >
            <Clock size={13} />
            <span>{fulfillment === "delivery" ? "Delivery in 15-30 mins" : "Pickup Ready"}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {errorMsg && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
            {errorMsg}
          </div>
        )}

        {/* Order Confirmed Screen */}
        {orderConfirmed ? (
          <div className={`mx-auto max-w-2xl ${cardRadiusClass} border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center`}>
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4"
              style={{ backgroundColor: `${brandPrimaryColor}15`, color: brandPrimaryColor }}
            >
              <PackageCheck size={28} />
            </div>

            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold border"
              style={{
                backgroundColor: `${brandPrimaryColor}10`,
                color: brandPrimaryColor,
                borderColor: `${brandPrimaryColor}30`,
              }}
            >
              Order Confirmed &amp; Placed
            </span>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Order #{orderConfirmed.number}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Total Amount: {formatInr(orderConfirmed.totalPaise)} · Mode:{" "}
              <span className="capitalize font-semibold text-slate-700">{orderConfirmed.fulfillment.replace(/_/g, " ")}</span>
            </p>

            {/* In-Store Pickup QR Code */}
            {orderConfirmed.fulfillment === "pickup" ? (
              <div className="mt-6 rounded-2xl border border-dashed border-orange-300 bg-orange-50/50 p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-700 mb-3">
                  <QrCode size={16} />
                  <span>Show this QR at the Store Counter</span>
                </div>

                {orderConfirmed.qrDataUrl && (
                  <div className="mx-auto flex justify-center bg-white p-4 rounded-xl shadow-xs border border-slate-200 max-w-[240px]">
                    <img src={orderConfirmed.qrDataUrl} alt="Store Pickup QR" className="w-full h-auto" />
                  </div>
                )}

                <div className="mt-3 font-mono text-sm font-semibold text-slate-800 tracking-wider">
                  {orderConfirmed.pickupQr}
                </div>

                <p className="mt-2 text-xs font-medium text-slate-600 leading-relaxed">
                  When you visit the store, show this QR code to the cashier or kiosk scanner.{" "}
                  <span className="text-orange-700 font-semibold">Your thermal order receipt will auto-print automatically!</span>
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                  >
                    <Printer size={13} />
                    <span>Print Slip</span>
                  </button>
                  <Link
                    href={`/track?number=${encodeURIComponent(orderConfirmed.number)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 shadow-2xs"
                  >
                    <span>Track Order</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Pay on Delivery Confirmation */
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 max-w-md mx-auto text-left space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Truck size={15} className="text-indigo-600" />
                  <span>Doorstep Delivery Dispatch</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <MapPin size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span>{orderConfirmed.address}</span>
                  </div>
                  {orderConfirmed.liveLocationUrl && (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <Check size={12} /> Live GPS Pinned
                      </span>
                      <a
                        href={orderConfirmed.liveLocationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <span>Open Maps</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The restaurant and assigned delivery rider have received your live location and order details. Cash on Delivery will be collected upon arrival.
                </p>
              </div>
            )}

            <div className="mt-6">
              <Link
                href={`/?store=${encodeURIComponent(storeSlug)}`}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
              >
                Back to Menu
              </Link>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-500">
            Loading order details...
          </div>
        ) : lines.length === 0 ? (
          <div className={`${cardRadiusClass} border border-slate-200 bg-white p-12 text-center max-w-lg mx-auto shadow-2xs`}>
            <ShoppingCart size={40} className="mx-auto text-slate-300 mb-3" />
            <h2 className="text-base font-semibold text-slate-900">Your cart is empty</h2>
            <p className="mt-1 text-xs text-slate-500">Add food items from the menu to proceed with your order.</p>
            <Link
              href={`/?store=${encodeURIComponent(storeSlug)}`}
              className={`mt-5 inline-flex items-center gap-2 ${buttonRadiusClass} px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90`}
              style={{ backgroundColor: brandPrimaryColor }}
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          /* Two-Column Checkout matching Image 3 */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Order details & fulfillment */}
            <div className="space-y-6 lg:col-span-8">
              {/* Card 1: Fulfillment selection */}
              <div className={`${cardRadiusClass} border border-slate-200 bg-white p-5 shadow-2xs space-y-4`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${brandPrimaryColor}15`, color: brandPrimaryColor }}
                  >
                    <Utensils size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">How would you like to order?</h3>
                    <p className="text-xs text-slate-500">Choose pay on delivery or pay in store.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillment("delivery");
                      setPayment("cod");
                    }}
                    style={
                      fulfillment === "delivery"
                        ? {
                            borderColor: brandPrimaryColor,
                            backgroundColor: `${brandPrimaryColor}08`,
                          }
                        : undefined
                    }
                    className={`flex items-start justify-between rounded-xl p-4 text-left transition border-2 ${
                      fulfillment === "delivery"
                        ? "shadow-2xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="rounded-lg text-white p-2 shrink-0"
                        style={{ backgroundColor: brandPrimaryColor }}
                      >
                        <Truck size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Pay on delivery</div>
                        <p className="text-xs text-slate-500 mt-0.5">Doorstep delivery with 1-click live GPS</p>
                      </div>
                    </div>
                    {fulfillment === "delivery" && (
                      <div
                        className="h-5 w-5 rounded-full text-white flex items-center justify-center shrink-0"
                        style={{ backgroundColor: brandPrimaryColor }}
                      >
                        <Check size={12} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFulfillment("pickup");
                      setPayment("pay_at_store");
                    }}
                    style={
                      fulfillment === "pickup"
                        ? {
                            borderColor: brandPrimaryColor,
                            backgroundColor: `${brandPrimaryColor}08`,
                          }
                        : undefined
                    }
                    className={`flex items-start justify-between rounded-xl p-4 text-left transition border-2 ${
                      fulfillment === "pickup"
                        ? "shadow-2xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-slate-800 text-white p-2 shrink-0">
                        <Store size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Pay in store</div>
                        <p className="text-xs text-slate-500 mt-0.5">Instant Pickup QR code with auto-print receipt</p>
                      </div>
                    </div>
                    {fulfillment === "pickup" && (
                      <div
                        className="h-5 w-5 rounded-full text-white flex items-center justify-center shrink-0"
                        style={{ backgroundColor: brandPrimaryColor }}
                      >
                        <Check size={12} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Card 2: Contact Details & 1-Click Live Location */}
              <div className={`${cardRadiusClass} border border-slate-200 bg-white p-5 shadow-2xs space-y-4`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${brandPrimaryColor}15`, color: brandPrimaryColor }}
                  >
                    <User size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Your details</h3>
                    <p className="text-xs text-slate-500">
                      {fulfillment === "delivery"
                        ? "Login and enter address with 1-click live GPS location."
                        : "Enter your contact info for order pickup notification."}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Cooper"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:ring-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone {fulfillment === "delivery" ? "(Required for rider dispatch)" : "(Optional)"}
                      </label>
                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:ring-1">
                        <span className="text-xs font-semibold text-slate-700 pr-2 border-r border-slate-200">🇮🇳 +91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          placeholder="Mobile number"
                          className="w-full bg-transparent pl-2 text-base sm:text-xs font-medium text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>

                  {/* Pay on Delivery: 1-Click Live Location & Address */}
                  {fulfillment === "delivery" && (
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-800">
                          Live Delivery Location (GPS)
                        </label>
                        {locationSuccess && (
                          <span
                            className="text-[11px] font-semibold flex items-center gap-1"
                            style={{ color: brandPrimaryColor }}
                          >
                            <Check size={13} />
                            GPS Location Locked
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleDetectLiveLocation}
                        disabled={detectingLocation}
                        style={{
                          borderColor: `${brandPrimaryColor}40`,
                          backgroundColor: `${brandPrimaryColor}0a`,
                          color: brandPrimaryColor,
                        }}
                        className={`w-full flex items-center justify-center gap-2 ${buttonRadiusClass} border py-2.5 px-4 text-xs font-semibold shadow-2xs transition hover:opacity-90`}
                      >
                        <Navigation size={15} className={detectingLocation ? "animate-spin" : ""} />
                        <span>
                          {detectingLocation
                            ? "Detecting high-accuracy GPS coordinates..."
                            : locationSuccess
                            ? "Re-detect Live GPS Location"
                            : "Detect Live Location (1-Click GPS)"}
                        </span>
                      </button>

                      {latitude && longitude && (
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs text-slate-700">
                          <span className="font-mono text-[11px] flex items-center gap-1.5">
                            <MapPin size={13} style={{ color: brandPrimaryColor }} />
                            GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                          </span>
                          <a
                            href={liveLocationUrl || `https://www.google.com/maps?q=${latitude},${longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            <span>Open Map</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Delivery Address (Flat / House No, Street)
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. 104, Green Heights, 1st Cross, Koramangala"
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:ring-1"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Landmark (Optional)</label>
                          <input
                            type="text"
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                            placeholder="e.g. Near Metro Station / Opp Cafe"
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:ring-1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                          <input
                            type="text"
                            maxLength={6}
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="e.g. 560034"
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:ring-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Special instructions (Optional)</label>
                    <textarea
                      rows={2}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Less spicy, pack extra chutney, ring the door bell"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:ring-1"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Payment */}
              <div className={`${cardRadiusClass} border border-slate-200 bg-white p-5 shadow-2xs space-y-4`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${brandPrimaryColor}15`, color: brandPrimaryColor }}
                  >
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Payment</h3>
                    <p className="text-xs text-slate-500">Choose your payment method</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {/* Dynamic Tenant-Managed Payment Methods */}
                  {(() => {
                    const paymentsConfig = storeInfo?.online_store_settings?.payments ?? {};
                    const isCodEnabled = paymentsConfig.cod?.enabled !== false;
                    const isUpiEnabled = paymentsConfig.upiQr?.enabled !== false;
                    const isPayAtStoreEnabled = paymentsConfig.payAtStore?.enabled !== false;
                    const isRazorpayEnabled = paymentsConfig.razorpay?.enabled === true;
                    const isPhonePeEnabled = paymentsConfig.phonepe?.enabled === true;

                    if (fulfillment === "pickup") {
                      return (
                        <div className="space-y-2.5">
                          {isPayAtStoreEnabled ? (
                            <button
                              type="button"
                              onClick={() => setPayment("pay_at_store")}
                              style={
                                payment === "pay_at_store"
                                  ? {
                                      borderColor: brandPrimaryColor,
                                      backgroundColor: `${brandPrimaryColor}08`,
                                    }
                                  : undefined
                              }
                              className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                                payment === "pay_at_store" ? "shadow-2xs" : "border-slate-200 bg-white"
                              }`}
                            >
                              <div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {paymentsConfig.payAtStore?.displayName || "Pay at Store Counter"}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {paymentsConfig.payAtStore?.description || "Receive pickup QR code & pay at counter when picking up"}
                                </p>
                              </div>
                              {payment === "pay_at_store" && (
                                <div
                                  className="h-5 w-5 rounded-full text-white flex items-center justify-center"
                                  style={{ backgroundColor: brandPrimaryColor }}
                                >
                                  <Check size={12} />
                                </div>
                              )}
                            </button>
                          ) : null}

                          {isUpiEnabled ? (
                            <button
                              type="button"
                              onClick={() => setPayment("upi_qr")}
                              style={
                                payment === "upi_qr"
                                  ? {
                                      borderColor: brandPrimaryColor,
                                      backgroundColor: `${brandPrimaryColor}08`,
                                    }
                                  : undefined
                              }
                              className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                                payment === "upi_qr" ? "shadow-2xs" : "border-slate-200 bg-white"
                              }`}
                            >
                              <div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {paymentsConfig.upiQr?.displayName || "Direct UPI QR Payment"}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {paymentsConfig.upiQr?.vpa ? `Pay to VPA: ${paymentsConfig.upiQr.vpa}` : "Scan UPI QR code or pay via phone app"}
                                </p>
                              </div>
                              {payment === "upi_qr" && (
                                <div
                                  className="h-5 w-5 rounded-full text-white flex items-center justify-center"
                                  style={{ backgroundColor: brandPrimaryColor }}
                                >
                                  <Check size={12} />
                                </div>
                              )}
                            </button>
                          ) : null}
                        </div>
                      );
                    }

                    // Delivery fulfillment
                    return (
                      <div className="space-y-2.5">
                        {isCodEnabled ? (
                          <button
                            type="button"
                            onClick={() => setPayment("cod")}
                            style={
                              payment === "cod"
                                ? {
                                    borderColor: brandPrimaryColor,
                                    backgroundColor: `${brandPrimaryColor}08`,
                                  }
                                : undefined
                            }
                            className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                              payment === "cod" ? "shadow-2xs" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-900">
                                {paymentsConfig.cod?.displayName || "Cash on Delivery (Pay on Delivery)"}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {paymentsConfig.cod?.description || "Pay cash or scan rider UPI QR upon doorstep delivery"}
                              </p>
                            </div>
                            {payment === "cod" && (
                              <div
                                className="h-5 w-5 rounded-full text-white flex items-center justify-center"
                                style={{ backgroundColor: brandPrimaryColor }}
                              >
                                <Check size={12} />
                              </div>
                            )}
                          </button>
                        ) : null}

                        {isUpiEnabled ? (
                          <button
                            type="button"
                            onClick={() => setPayment("upi_qr")}
                            style={
                              payment === "upi_qr"
                                ? {
                                    borderColor: brandPrimaryColor,
                                    backgroundColor: `${brandPrimaryColor}08`,
                                  }
                                : undefined
                            }
                            className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                              payment === "upi_qr" ? "shadow-2xs" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-900">
                                {paymentsConfig.upiQr?.displayName || "UPI / QR Payment"}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {paymentsConfig.upiQr?.vpa ? `Pay to VPA: ${paymentsConfig.upiQr.vpa}` : "Scan UPI QR code or pay via phone app"}
                              </p>
                            </div>
                            {payment === "upi_qr" && (
                              <div
                                className="h-5 w-5 rounded-full text-white flex items-center justify-center"
                                style={{ backgroundColor: brandPrimaryColor }}
                              >
                                <Check size={12} />
                              </div>
                            )}
                          </button>
                        ) : null}

                        {isRazorpayEnabled ? (
                          <button
                            type="button"
                            onClick={() => setPayment("razorpay")}
                            style={
                              payment === "razorpay"
                                ? {
                                    borderColor: brandPrimaryColor,
                                    backgroundColor: `${brandPrimaryColor}08`,
                                  }
                                : undefined
                            }
                            className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                              payment === "razorpay" ? "shadow-2xs" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-900">Razorpay Online Payment</div>
                              <p className="text-[11px] text-slate-500">Cards, Netbanking, UPI, Wallets</p>
                            </div>
                            {payment === "razorpay" && (
                              <div
                                className="h-5 w-5 rounded-full text-white flex items-center justify-center"
                                style={{ backgroundColor: brandPrimaryColor }}
                              >
                                <Check size={12} />
                              </div>
                            )}
                          </button>
                        ) : null}

                        {isPhonePeEnabled ? (
                          <button
                            type="button"
                            onClick={() => setPayment("phonepe")}
                            style={
                              payment === "phonepe"
                                ? {
                                    borderColor: brandPrimaryColor,
                                    backgroundColor: `${brandPrimaryColor}08`,
                                  }
                                : undefined
                            }
                            className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                              payment === "phonepe" ? "shadow-2xs" : "border-slate-200 bg-white"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-900">PhonePe Gateway</div>
                              <p className="text-[11px] text-slate-500">Instant PhonePe UPI & card checkout</p>
                            </div>
                            {payment === "phonepe" && (
                              <div
                                className="h-5 w-5 rounded-full text-white flex items-center justify-center"
                                style={{ backgroundColor: brandPrimaryColor }}
                              >
                                <Check size={12} />
                              </div>
                            )}
                          </button>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                  <Lock size={12} style={{ color: brandPrimaryColor }} />
                  <span>Your data is safe with us. We never share your information with third parties.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Summary */}
            <div className="lg:col-span-4 sticky top-20 space-y-4">
              <div className={`${cardRadiusClass} border border-slate-200 bg-white p-5 shadow-2xs space-y-4`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: brandPrimaryColor }}
                    >
                      <ShoppingBag size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Order summary</h3>
                      <p className="text-[11px] text-slate-500 capitalize">
                        {fulfillment === "pickup" ? "Take away · In-Store Pickup" : "Doorstep Delivery"}
                      </p>
                    </div>
                  </div>
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${brandPrimaryColor}15`, color: brandPrimaryColor }}
                  >
                    {totalItemsCount}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                  {lines.map((l) => (
                    <div key={l.product.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="font-semibold px-1.5 py-0.5 rounded text-[10px]"
                          style={{ backgroundColor: `${brandPrimaryColor}15`, color: brandPrimaryColor }}
                        >
                          x{l.count}
                        </span>
                        <span className="font-medium text-slate-800 truncate max-w-[140px]">{l.product.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatInr(l.lineTotalPaise)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">{formatInr(netSubtotalPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>CGST ({cgstPct}%) {isTaxInclusive ? "(Included)" : ""}</span>
                    <span>{formatInr(cgstPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>SGST ({sgstPct}%) {isTaxInclusive ? "(Included)" : ""}</span>
                    <span>{formatInr(sgstPaise)}</span>
                  </div>

                  {fulfillment === "delivery" && (
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Delivery Fee</span>
                      <span className="font-semibold" style={{ color: brandPrimaryColor }}>
                        {deliveryChargePaise === 0 ? "FREE" : formatInr(deliveryChargePaise)}
                      </span>
                    </div>
                  )}

                  {packagingChargePaise > 0 && (
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Packaging Fee</span>
                      <span>{formatInr(packagingChargePaise)}</span>
                    </div>
                  )}
                </div>

                <div
                  className="rounded-xl border p-3.5 flex items-baseline justify-between"
                  style={{
                    backgroundColor: `${brandPrimaryColor}06`,
                    borderColor: `${brandPrimaryColor}25`,
                  }}
                >
                  <span className="text-xs font-semibold text-slate-800">Total</span>
                  <span className="text-xl font-semibold text-slate-900">{formatInr(grandTotalPaise)}</span>
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  style={{ backgroundColor: brandPrimaryColor }}
                  className={`w-full flex items-center justify-center gap-2 ${buttonRadiusClass} text-white py-3.5 text-xs font-semibold uppercase tracking-wider shadow-sm transition hover:opacity-90 disabled:opacity-50`}
                >
                  <span>
                    {submitting
                      ? "Placing Order..."
                      : fulfillment === "pickup"
                      ? "Pay And Place Order (Get QR)"
                      : "Pay And Place Order"}
                  </span>
                </button>

                <p className="text-[10px] text-center text-slate-400 leading-tight">
                  By placing your order you agree to the restaurant&apos;s terms and cancellation policy for this order.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
