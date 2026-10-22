"use client";

import { formatInr } from "@selfx/types";
import {
  ArrowLeft,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Info,
  Lock,
  MapPin,
  Minus,
  Moon,
  Navigation,
  PackageCheck,
  Phone,
  Plus,
  Printer,
  QrCode,
  Search,
  Share2,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Sun,
  Truck,
  User,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StorefrontAiWidget } from "./storefront-ai-widget";
import { LiveOrderMap } from "./components/live-order-map";

export interface StorefrontProduct {
  id: string;
  sku?: string;
  name: string;
  selling_price_paise: number | null;
  mrp_paise?: number | null;
  category?: string | null;
  sub_category?: string | null;
  brand?: string | null;
  unit_short?: string | null;
  image?: string | null;
  on_hand?: number;
  details?: Record<string, unknown> | string | null;
}

interface PublicStoreSummary {
  id: string;
  name: string;
  public_slug: string;
  address_line?: string | null;
  city?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
}

interface OnlineStoreSettingsPayload {
  basics?: {
    storeName?: string;
    storeTagline?: string;
    storeUrlPath?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    minOrderAmount?: number;
    maxOrderAmount?: number;
  };
  contact?: {
    supportEmail?: string;
    supportPhone?: string;
    whatsappNumber?: string;
    storeAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
    openingTime?: string;
    closingTime?: string;
    enableFloatingWhatsapp?: boolean;
    whatsappPrefillText?: string;
    openingHoursText?: string;
    googleMapsApiKey?: string;
    storeLatitude?: number;
    storeLongitude?: number;
  };
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    brandTagline?: string;
    borderRadiusStyle?: "sharp" | "rounded" | "pill" | string;
    cardShadowStyle?: "none" | "soft" | "elevated" | string;
  };
  hero?: {
    enabled?: boolean;
    showHero?: boolean;
    headline?: string;
    subheadline?: string;
    eyebrowBadge?: string;
    ctaText?: string;
    bannerImageUrl?: string;
    deliveryTimeText?: string;
    promoHighlightText?: string;
  };
  topbarFooter?: {
    showTopbar?: boolean;
    topbarText?: string;
    topbarBgColor?: string;
    topbarTextColor?: string;
    topbarLinkLabel?: string;
    topbarLinkHref?: string;
    footerAboutText?: string;
    footerCopyrightText?: string;
    showStoreTimingsInFooter?: boolean;
    refundPolicyText?: string;
  };
  themeConfig?: {
    showMrpStrike?: boolean;
    showDiscountPercentageBadge?: boolean;
    showBrandOnCard?: boolean;
    productGridColumnsDesktop?: number;
  };
  social?: {
    instagram?: string;
    facebook?: string;
    twitterX?: string;
    whatsapp?: string;
  };
  checkout?: {
    enableDelivery?: boolean;
    enablePickup?: boolean;
    freeDeliveryAbove?: number;
    deliveryFee?: number;
    packagingFee?: number;
    cancellationPolicyText?: string;
  };
  shipping?: {
    standardDeliveryFee?: number;
    freeDeliveryAbove?: number;
    packagingFee?: number;
    enablePackagingFee?: boolean;
    minOrderAmount?: number;
  };
  shippingMethods?: {
    id: string;
    name: string;
    zone: string;
    pinCodes: string;
    etaText: string;
    feeAmount: number;
    freeAboveAmount: number;
    codAvailable: boolean;
    enabled: boolean;
  }[];
  taxSettings?: {
    defaultCgstPct?: number;
    defaultSgstPct?: number;
    defaultIgstPct?: number;
    inclusiveInMrp?: boolean;
  };
  taxRates?: {
    id: string;
    name: string;
    hsnPrefix?: string;
    cgstPct?: number;
    sgstPct?: number;
    igstPct?: number;
    inclusiveInMrp?: boolean;
    enabled?: boolean;
  }[];
  payments?: {
    cod?: { enabled?: boolean; displayName?: string; description?: string };
    payAtStore?: { enabled?: boolean; displayName?: string; description?: string };
    upiQr?: { enabled?: boolean; displayName?: string; vpa?: string; merchantName?: string; instructions?: string };
    razorpay?: { enabled?: boolean; mode?: "test" | "live"; keyId?: string; keySecret?: string };
    phonepe?: { enabled?: boolean; mode?: "test" | "live"; merchantId?: string; saltKey?: string; saltIndex?: string };
  };
}

interface TenantSettingsPayload {
  businessName?: string;
  tradeName?: string;
  gstin?: string;
  fssai?: string;
  supportEmail?: string;
  supportPhone?: string;
  registeredAddress?: string;
}

const CART_STORAGE_KEY = "selfx_storefront_cart_v2";
const CUSTOMER_STORAGE_KEY = "selfx_storefront_customer_v2";
const STORE_STORAGE_KEY = "selfx_active_store_slug_v1";

function productImageFor(item: StorefrontProduct): string | null {
  if (item.image && typeof item.image === "string" && item.image.trim() !== "") {
    return item.image;
  }
  if (item.details && typeof item.details === "object") {
    const detailsObj = item.details as Record<string, unknown>;
    if (typeof detailsObj.image === "string" && detailsObj.image.trim() !== "") {
      return detailsObj.image;
    }
    if (Array.isArray(detailsObj.images) && typeof detailsObj.images[0] === "string" && detailsObj.images[0].trim() !== "") {
      return detailsObj.images[0];
    }
  }
  return null;
}

// Helper to determine if an item is vegetarian based on name or category
function isVegetarianItem(item: StorefrontProduct): boolean {
  const text = `${item.name} ${item.category || ""} ${item.sub_category || ""}`.toLowerCase();
  if (text.includes("chicken") || text.includes("mutton") || text.includes("fish") || text.includes("egg") || text.includes("prawn") || text.includes("meat")) {
    return false;
  }
  return true;
}

export function LiveShop() {
  const [slug, setSlug] = useState("");
  const [availableStores, setAvailableStores] = useState<PublicStoreSummary[]>([]);
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState<string>("");
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [hours, setHours] = useState<string | null>(null);
  const [openNow, setOpenNow] = useState(true);
  const [onlineSettings, setOnlineSettings] = useState<OnlineStoreSettingsPayload | null>(null);
  const [tenantSettings, setTenantSettings] = useState<TenantSettingsPayload | null>(null);
  const [items, setItems] = useState<StorefrontProduct[]>([]);
  const [storeCategories, setStoreCategories] = useState<string[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"relevance" | "price_asc" | "price_desc" | "name">("relevance");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // View mode: "catalog" (Image 1) or "checkout" (Image 3)
  const [viewMode, setViewMode] = useState<"catalog" | "checkout">("catalog");

  // Slide-over Cart Drawer (Image 2)
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Checkout form state
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<string>("cod");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [coupon, setCoupon] = useState("");

  // Live Location State (1-Click GPS detection)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [liveLocationUrl, setLiveLocationUrl] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Confirmed Order with Pickup QR
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

  // Hydrate saved cart & customer session
  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setQty(JSON.parse(savedCart) as Record<string, number>);
      const savedCust = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (savedCust) {
        const parsed = JSON.parse(savedCust) as {
          name?: string;
          phone?: string;
          email?: string;
          address?: string;
          landmark?: string;
          pincode?: string;
          latitude?: number;
          longitude?: number;
        };
        if (parsed.name) setName(parsed.name);
        if (parsed.phone) setPhone(parsed.phone);
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
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(qty));
    } catch {
      // ignore
    }
  }, [qty]);

  // Customer Recent Orders, Live Tracking, & Blinkit Bottom Status Bar
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<any | null>(null);
  const [ordersDrawerOpen, setOrdersDrawerOpen] = useState(false);
  const [liveMapModalOrder, setLiveMapModalOrder] = useState<any | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Load customer orders from server if phone exists or localStorage
  const refreshCustomerOrders = useCallback(async (custPhone?: string) => {
    const rawPhone = custPhone || phone;
    const cleanPhone = rawPhone.replace(/\D/g, "");

    // First load from localStorage for instant offline visibility
    try {
      const rawRecent = window.localStorage.getItem("selfx_recent_orders");
      if (rawRecent) {
        const parsed = JSON.parse(rawRecent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomerOrders(parsed);
          const active =
            parsed.find((o: any) => o.status !== "cancelled" && o.status !== "delivered") || parsed[0];
          if (active) setActiveTrackingOrder(active);
        }
      }
    } catch {
      // ignore
    }

    if (cleanPhone.length >= 10) {
      setLoadingOrders(true);
      try {
        const res = await fetch(`/api/v1/public/orders/customer?phone=${encodeURIComponent(cleanPhone)}`);
        if (res.ok) {
          const body = await res.json();
          if (Array.isArray(body.data)) {
            setCustomerOrders(body.data);
            try {
              window.localStorage.setItem("selfx_recent_orders", JSON.stringify(body.data));
            } catch {
              // ignore
            }

            const active =
              body.data.find((o: any) => o.status !== "cancelled" && o.status !== "delivered") || body.data[0];
            if (active) {
              setActiveTrackingOrder(active);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingOrders(false);
      }
    }
  }, [phone]);

  // Load customer orders whenever phone changes or order is placed
  useEffect(() => {
    if (phone) {
      void refreshCustomerOrders(phone);
    }
  }, [phone, refreshCustomerOrders]);

  // Real-time live polling every 6 seconds for active order updates & rider position
  useEffect(() => {
    if (!activeTrackingOrder?.number) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/v1/public/orders/track", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ number: activeTrackingOrder.number }),
        });
        if (res.ok) {
          const body = await res.json();
          if (body.data) {
            setActiveTrackingOrder(body.data);
            setCustomerOrders((prev) =>
              prev.map((o) => (o.number === body.data.number ? { ...o, ...body.data } : o)),
            );
            if (liveMapModalOrder?.number === body.data.number) {
              setLiveMapModalOrder(body.data);
            }
          }
        }
      } catch {
        // ignore
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [activeTrackingOrder?.number, liveMapModalOrder?.number]);

  // Load store data
  const loadStoreBySlug = useCallback(async (targetSlug: string, searchQuery = "") => {
    const cleanSlug = targetSlug.trim();
    if (!cleanSlug) return;
    setLoading(true);

    try {
      const queryParam = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : "";
      const [itemsRes, storeRes] = await Promise.all([
        fetch(`/api/v1/public/stores/${encodeURIComponent(cleanSlug)}/items${queryParam}`, { cache: "no-store" }),
        fetch(`/api/v1/public/stores/${encodeURIComponent(cleanSlug)}`, { cache: "no-store" }),
      ]);

      if (itemsRes.ok) {
        const iData = (await itemsRes.json()) as { data: StorefrontProduct[] };
        setItems(Array.isArray(iData.data) ? iData.data : []);
      }

      if (storeRes.ok) {
        const sData = (await storeRes.json()) as {
          data: {
            name: string;
            slug?: string;
            address_line?: string | null;
            city?: string | null;
            pincode?: string | null;
            lat?: number | null;
            lng?: number | null;
            open: string | null;
            close: string | null;
            open_now: boolean;
            categories?: string[];
            online_store_settings?: OnlineStoreSettingsPayload | null;
            tenant_settings?: TenantSettingsPayload | null;
          };
        };

        const resolvedSlug = sData.data.slug || cleanSlug;
        setSlug(resolvedSlug);
        setStoreName(sData.data.name);
        setStoreAddress(sData.data.address_line || sData.data.city || "");
        if (sData.data.lat) setStoreLat(sData.data.lat);
        if (sData.data.lng) setStoreLng(sData.data.lng);
        if (sData.data.pincode && !pincode) setPincode(sData.data.pincode);
        setOpenNow(sData.data.open_now ?? true);
        if (sData.data.open && sData.data.close) {
          setHours(`${sData.data.open} - ${sData.data.close}`);
        }
        if (Array.isArray(sData.data.categories)) {
          setStoreCategories(sData.data.categories);
        }
        setOnlineSettings(sData.data.online_store_settings ?? null);
        setTenantSettings(sData.data.tenant_settings ?? null);
      }
    } catch {
      setMessage("Store catalog could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [pincode]);

  // Initial load
  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const urlStore = params.get("store")?.trim() ?? "";
      let savedStore = "";
      try {
        savedStore = window.localStorage.getItem(STORE_STORAGE_KEY)?.trim() ?? "";
      } catch {
        // ignore
      }

      const activeSlug = urlStore || savedStore || "bangalore";
      setSlug(activeSlug);
      void loadStoreBySlug(activeSlug, "");

      try {
        const listRes = await fetch("/api/v1/public/stores", { cache: "no-store" }).catch(() => null);
        if (listRes && listRes.ok) {
          const listBody = (await listRes.json()) as { data?: PublicStoreSummary[] };
          setAvailableStores(listBody.data ?? []);
        }
      } catch {
        // ignore
      }
    })();
  }, [loadStoreBySlug]);

  function updateItemQty(itemId: string, nextQty: number) {
    setQty((current) => {
      const copyQty = { ...current };
      if (nextQty <= 0) {
        delete copyQty[itemId];
      } else {
        copyQty[itemId] = nextQty;
      }
      return copyQty;
    });
  }

  // Categories with counts derived directly from store items (Image 1)
  const categoriesWithCounts = useMemo(() => {
    const countsMap: Record<string, number> = {};
    items.forEach((item) => {
      const cat = item.category || "General";
      countsMap[cat] = (countsMap[cat] || 0) + 1;
    });

    const list = [
      { name: "All", count: items.length },
      ...Object.keys(countsMap).map((cat) => ({
        name: cat,
        count: countsMap[cat],
      })),
    ];
    return list;
  }, [items]);

  // Filtered & sorted items
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchCat = activeCategory === "All" || (item.category || "General") === activeCategory;
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.brand ?? "").toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q) ||
        (item.sku ?? "").toLowerCase().includes(q);
      return matchCat && matchQuery;
    });

    const sorted = [...filtered];
    if (sortBy === "price_asc") {
      sorted.sort((a, b) => (a.selling_price_paise ?? 0) - (b.selling_price_paise ?? 0));
    } else if (sortBy === "price_desc") {
      sorted.sort((a, b) => (b.selling_price_paise ?? 0) - (a.selling_price_paise ?? 0));
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [items, activeCategory, query, sortBy]);

  // Cart calculations driven by tenant's Online Store Settings
  const cartLines = useMemo(() => {
    return Object.entries(qty)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const item = items.find((i) => i.id === id);
        const pricePaise = item?.selling_price_paise ?? 0;
        const mrpPaise = item?.mrp_paise && item.mrp_paise > pricePaise ? item.mrp_paise : pricePaise;
        return {
          id,
          item,
          name: item?.name ?? "Store Item",
          unit: item?.unit_short ?? "1 plate",
          image: item ? productImageFor(item) : null,
          isVeg: item ? isVegetarianItem(item) : true,
          pricePaise,
          mrpPaise,
          count,
          lineTotalPaise: pricePaise * count,
        };
      });
  }, [qty, items]);

  const totalItemsCount = useMemo(() => cartLines.reduce((sum, l) => sum + l.count, 0), [cartLines]);
  const grossSubtotalPaise = useMemo(() => cartLines.reduce((sum, l) => sum + l.lineTotalPaise, 0), [cartLines]);

  // Taxes dynamically driven by tenant online store tax settings
  const taxSettings = onlineSettings?.taxSettings ?? {
    defaultCgstPct: 2.5,
    defaultSgstPct: 2.5,
    inclusiveInMrp: true,
  };
  const cgstPct = Number(taxSettings.defaultCgstPct ?? 2.5);
  const sgstPct = Number(taxSettings.defaultSgstPct ?? 2.5);
  const totalTaxPct = cgstPct + sgstPct;
  const isTaxInclusive = taxSettings.inclusiveInMrp !== false;

  let netSubtotalPaise = grossSubtotalPaise;
  let cgstPaise = 0;
  let sgstPaise = 0;
  let taxAdditionPaise = 0;

  if (totalTaxPct > 0 && grossSubtotalPaise > 0) {
    if (isTaxInclusive) {
      netSubtotalPaise = Math.round(grossSubtotalPaise / (1 + totalTaxPct / 100));
      const totalTaxPaise = grossSubtotalPaise - netSubtotalPaise;
      cgstPaise = Math.round((totalTaxPaise * cgstPct) / totalTaxPct);
      sgstPaise = totalTaxPaise - cgstPaise;
    } else {
      cgstPaise = Math.round((grossSubtotalPaise * cgstPct) / 100);
      sgstPaise = Math.round((grossSubtotalPaise * sgstPct) / 100);
      taxAdditionPaise = cgstPaise + sgstPaise;
    }
  }

  // Shipping / Delivery charges dynamically driven by tenant shipping settings
  const shippingSettings = onlineSettings?.shipping ?? {
    standardDeliveryFee: Number(onlineSettings?.checkout?.deliveryFee ?? 35),
    freeDeliveryAbove: Number(onlineSettings?.checkout?.freeDeliveryAbove ?? 499),
    packagingFee: Number(onlineSettings?.checkout?.packagingFee ?? 10),
    minOrderAmount: Number(onlineSettings?.basics?.minOrderAmount ?? 0),
  };
  const standardFeePaise = Math.round(Number(shippingSettings.standardDeliveryFee ?? 35) * 100);
  const freeThresholdPaise = Math.round(Number(shippingSettings.freeDeliveryAbove ?? 499) * 100);
  const packagingFeePaise = Math.round(Number(shippingSettings.packagingFee ?? 0) * 100);

  const deliveryChargePaise =
    fulfillment === "delivery" && grossSubtotalPaise > 0 && (freeThresholdPaise <= 0 || grossSubtotalPaise < freeThresholdPaise)
      ? standardFeePaise
      : 0;
  const packagingChargePaise = grossSubtotalPaise > 0 ? packagingFeePaise : 0;
  const grandTotalPaise = grossSubtotalPaise + taxAdditionPaise + deliveryChargePaise + packagingChargePaise;

  // Payment methods dynamically driven by tenant online store settings
  const paymentsConfig: NonNullable<OnlineStoreSettingsPayload["payments"]> = useMemo(() => {
    return (
      onlineSettings?.payments ?? {
        cod: { enabled: true, displayName: "Cash on Delivery (COD)", description: "Pay cash directly to the delivery rider" },
        payAtStore: { enabled: true, displayName: "Pay at Store Counter", description: "Receive pickup QR and pay at store counter" },
        upiQr: { enabled: true, displayName: "UPI / QR Payment", instructions: "Scan UPI QR code or pay via phone app" },
        razorpay: { enabled: false },
        phonepe: { enabled: false },
      }
    );
  }, [onlineSettings]);

  const isCodEnabled = paymentsConfig.cod?.enabled !== false;
  const isPayAtStoreEnabled = paymentsConfig.payAtStore?.enabled !== false;
  const isUpiQrEnabled = paymentsConfig.upiQr?.enabled !== false;
  const isRazorpayEnabled = paymentsConfig.razorpay?.enabled === true;
  const isPhonePeEnabled = paymentsConfig.phonepe?.enabled === true;

  // Auto-align selected payment method with fulfillment type and enabled methods
  useEffect(() => {
    if (fulfillment === "pickup") {
      setPayment("pay_at_store");
    } else {
      if (payment === "pay_at_store") {
        if (isCodEnabled) setPayment("cod");
        else if (isUpiQrEnabled) setPayment("upi_qr");
        else if (isRazorpayEnabled) setPayment("razorpay");
        else if (isPhonePeEnabled) setPayment("phonepe");
      }
    }
  }, [fulfillment, isCodEnabled, isUpiQrEnabled, isRazorpayEnabled, isPhonePeEnabled, payment]);

  // 1-Click Detect Live Location Function (navigator.geolocation)
  const handleDetectLiveLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setMessage("Geolocation is not supported by your browser.");
      return;
    }

    setDetectingLocation(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        setLiveLocationUrl(mapUrl);
        setLocationSuccess(true);
        setDetectingLocation(false);

        // Auto-populate address prompt if empty
        if (!address) {
          setAddress(`Live GPS Pinned (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        }
      },
      (error) => {
        setDetectingLocation(false);
        setMessage(`Location detection failed: ${error.message}. Please enter address manually.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  // Place Order Action
  const handlePlaceOrder = async () => {
    const lines = Object.entries(qty)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => ({ store_item_id: id, qty: count }));

    if (lines.length === 0) {
      setMessage("Your cart is empty. Please add items first.");
      return;
    }

    // Login/phone verification is mandatory for delivery as requested by user
    if (fulfillment === "delivery") {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        setMessage("Mobile number is required for Pay on Delivery so our rider can contact you.");
        setLoginModalOpen(true);
        return;
      }
      if (!address.trim() && !liveLocationUrl) {
        setMessage("Please detect your live location or enter your delivery address.");
        return;
      }
    } else {
      // In-store pickup
      if (!name.trim()) {
        setName("Store Guest");
      }
    }

    try {
      setSubmittingOrder(true);
      setMessage(null);

      const payload = {
        customer_name: name.trim() || (phone ? `Customer ${phone.slice(-4)}` : "Store Guest"),
        customer_phone: phone.trim() || "9999999999",
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
        coupon_code: coupon.trim() || undefined,
        lines,
      };

      const res = await fetch(`/api/v1/public/stores/${encodeURIComponent(slug)}/checkout`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();
      if (!res.ok) {
        setMessage(body.message || body.error?.message || "Order placement failed. Please try again.");
        return;
      }

      const orderData = body.data;
      const pickupQrCode = orderData.pickup_qr || `SELFX-ORD-${orderData.number}`;

      // Generate visual QR code Data URL for In-Store Pickup
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
        live_location_url: liveLocationUrl,
      };
      setActiveTrackingOrder(orderRecord);
      setCustomerOrders((prev) => [orderRecord, ...prev.filter((o) => o.number !== orderData.number)]);
      try {
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

      // Clear cart
      setQty({});
      window.localStorage.removeItem(CART_STORAGE_KEY);
      setCartDrawerOpen(false);
      setViewMode("catalog");
    } catch {
      setMessage("Network error occurred while placing order.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const displayStoreName =
    onlineSettings?.basics?.storeName?.trim() ||
    tenantSettings?.tradeName?.trim() ||
    tenantSettings?.businessName?.trim() ||
    storeName ||
    "Coffee Cafe";

  const logoUrl = onlineSettings?.branding?.logoUrl?.trim() || "";
  const brandPrimaryColor =
    onlineSettings?.basics?.primaryColor?.trim() ||
    onlineSettings?.branding?.primaryColor?.trim() ||
    "#ea580c";

  const brandSecondaryColor =
    onlineSettings?.basics?.secondaryColor?.trim() ||
    "#0f172a";

  const topbarBg =
    onlineSettings?.topbarFooter?.topbarBgColor?.trim() ||
    brandPrimaryColor;

  const topbarTextColor =
    onlineSettings?.topbarFooter?.topbarTextColor?.trim() ||
    "#ffffff";

  const fontFamily =
    onlineSettings?.basics?.fontFamily?.trim() ||
    "inherit";

  const radiusStyle = onlineSettings?.branding?.borderRadiusStyle || "rounded";
  const cardRadiusClass =
    radiusStyle === "sharp"
      ? "rounded-lg"
      : radiusStyle === "pill"
      ? "rounded-3xl"
      : "rounded-2xl";

  const buttonRadiusClass =
    radiusStyle === "sharp"
      ? "rounded-md"
      : radiusStyle === "pill"
      ? "rounded-full"
      : "rounded-xl";

  const cardShadowClass =
    onlineSettings?.branding?.cardShadowStyle === "flat"
      ? "shadow-none border border-slate-200"
      : onlineSettings?.branding?.cardShadowStyle === "elevated"
      ? "shadow-lg border border-slate-100 hover:shadow-xl"
      : "shadow-2xs border border-slate-200/90 hover:shadow-md";

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-slate-900 text-slate-100" : "bg-[#f8fafc] text-slate-900"} transition-colors`}
      style={{
        fontFamily: fontFamily !== "inherit" ? fontFamily : undefined,
        ["--brand-primary" as any]: brandPrimaryColor,
        ["--brand-secondary" as any]: brandSecondaryColor,
      }}
    >
      {/* Top Announcement Bar if enabled in Online Store Settings */}
      {onlineSettings?.topbarFooter?.showTopbar && onlineSettings?.topbarFooter?.topbarText ? (
        <div
          className="px-4 py-2 text-center text-xs font-semibold transition"
          style={{ backgroundColor: topbarBg, color: topbarTextColor }}
        >
          <span>{onlineSettings.topbarFooter.topbarText}</span>
          {onlineSettings.topbarFooter.topbarLinkLabel && onlineSettings.topbarFooter.topbarLinkHref && (
            <a
              href={onlineSettings.topbarFooter.topbarLinkHref}
              className="ml-2 underline font-bold hover:opacity-90"
            >
              {onlineSettings.topbarFooter.topbarLinkLabel}
            </a>
          )}
        </div>
      ) : null}

      {/* 1. STORE HEADER (Matches Image 1 & Image 3) */}
      <header className={`sticky top-0 z-30 border-b ${darkMode ? "border-slate-800 bg-slate-900/95" : "border-slate-200/80 bg-white/95"} backdrop-blur-md`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3.5 sm:px-6">
          {/* Left: Brand Logo & Store Name */}
          <div className="flex items-center gap-3 min-w-0">
            {viewMode === "checkout" && (
              <button
                type="button"
                onClick={() => setViewMode("catalog")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition shrink-0"
                aria-label="Back to catalog"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode("catalog")}
              className="flex items-center gap-2.5 text-left group min-w-0"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={displayStoreName} className="h-9 w-auto max-w-[110px] sm:max-w-[150px] object-contain shrink-0" />
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-2xs shrink-0"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  <Utensils size={18} />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 group-hover:opacity-85 transition truncate max-w-[150px] sm:max-w-none">
                  {displayStoreName}
                </h1>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate">
                  {onlineSettings?.branding?.brandTagline?.trim() ||
                    (storeAddress ? `Ordering from ${storeAddress.split(",")[0]}` : "Online Ordering")}
                </p>
              </div>
            </button>
          </div>

          {/* Right Action Icons: Language, Dark mode, Sign in, Orders, and Checkout Button */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700">
              <Globe size={13} className="text-slate-500" />
              <span>English</span>
              <ChevronDown size={12} className="text-slate-400" />
            </div>

            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* Sign in Button */}
            <button
              type="button"
              onClick={() => setLoginModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              <User size={14} className="text-slate-500" />
              <span>{phone ? `+91 ${phone.slice(-4)}` : "Sign in"}</span>
            </button>

            {/* Orders Tracker Link */}
            <button
              type="button"
              onClick={() => {
                setOrdersDrawerOpen(true);
                if (phone) void refreshCustomerOrders(phone);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition relative"
            >
              <FileText size={14} className="text-slate-500" />
              <span className="hidden sm:inline">Orders</span>
              {customerOrders.length > 0 && (
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white ml-0.5"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  {customerOrders.length}
                </span>
              )}
            </button>

            {/* Checkout / Cart Button */}
            <button
              type="button"
              onClick={() => {
                if (totalItemsCount > 0) {
                  setCartDrawerOpen(true);
                } else {
                  setMessage("Your cart is empty. Add items from the menu first!");
                }
              }}
              style={{ backgroundColor: brandPrimaryColor }}
              className={`inline-flex items-center gap-2 text-white px-3 sm:px-4 py-2 text-xs font-semibold shadow-sm hover:opacity-95 active:scale-95 transition ${buttonRadiusClass}`}
            >
              <ShoppingCart size={15} />
              <span className="hidden sm:inline">Checkout</span>
              <span className="sm:hidden">Cart</span>
              {totalItemsCount > 0 && (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-semibold"
                  style={{ color: brandPrimaryColor }}
                >
                  {totalItemsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Status Notice Toast / Alert */}
      {message && (
        <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 shadow-2xs">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)} className="font-semibold text-amber-700 hover:underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Order Confirmation Screen with In-Store Pickup QR / Delivery GPS status */}
      {orderConfirmed && (
        <div className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 sm:p-8 shadow-sm text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <PackageCheck size={28} />
            </div>

            <span className="inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              Order Confirmed &amp; Placed
            </span>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Order #{orderConfirmed.number}
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Total Amount: {formatInr(orderConfirmed.totalPaise)} · Mode:{" "}
              <span className="capitalize font-semibold text-slate-700">{orderConfirmed.fulfillment.replace(/_/g, " ")}</span>
            </p>

            {/* In-Store Pickup QR Code Display (Crucial requirement from prompt) */}
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
                    <ChevronRight size={13} />
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
                        <Check size={12} />
                        Live GPS Pinned
                      </span>
                      <a
                        href={orderConfirmed.liveLocationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <span>View on Maps</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  The restaurant and assigned delivery rider have received your live location and order details. Cash on Delivery will be collected upon arrival.
                </p>

                <div className="pt-2 text-center">
                  <Link
                    href={`/track?number=${encodeURIComponent(orderConfirmed.number)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs"
                  >
                    <span>Track Live Delivery</span>
                    <ChevronRight size={13} />
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setOrderConfirmed(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
              >
                Close &amp; Continue Browsing Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CATALOG VIEW (Matches Image 1) */}
      {viewMode === "catalog" && !orderConfirmed && (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
          {/* Tenant Hero Section if configured */}
          {onlineSettings?.hero?.showHero !== false && onlineSettings?.hero?.enabled !== false && (onlineSettings?.hero?.headline || onlineSettings?.hero?.bannerImageUrl) && (
            <div
              className={`relative overflow-hidden ${cardRadiusClass} text-white p-5 sm:p-8 shadow-sm`}
              style={{
                background: `linear-gradient(135deg, ${brandPrimaryColor} 0%, ${brandSecondaryColor} 100%)`,
              }}
            >
              <div className="relative z-10 max-w-xl space-y-2 sm:space-y-3">
                {onlineSettings.hero.eyebrowBadge && (
                  <span className="inline-block rounded-full bg-white/20 backdrop-blur-xs px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
                    {onlineSettings.hero.eyebrowBadge}
                  </span>
                )}
                {onlineSettings.hero.deliveryTimeText && !onlineSettings.hero.eyebrowBadge && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-xs px-3 py-1 text-[11px] font-semibold text-white">
                    <span>{onlineSettings.hero.deliveryTimeText}</span>
                  </div>
                )}
                <h2 className="text-lg sm:text-2xl font-semibold tracking-tight text-white">
                  {onlineSettings.hero.headline}
                </h2>
                {onlineSettings.hero.subheadline && (
                  <p className="text-xs sm:text-sm text-white/90 font-normal leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {onlineSettings.hero.subheadline}
                  </p>
                )}
                {onlineSettings.hero.promoHighlightText && (
                  <div className="pt-1 text-[11px] sm:text-xs font-medium text-amber-200 flex items-center gap-1.5">
                    <span>✨ {onlineSettings.hero.promoHighlightText}</span>
                  </div>
                )}
              </div>
              {onlineSettings.hero.bannerImageUrl && (
                <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 sm:opacity-35 pointer-events-none">
                  <img
                    src={onlineSettings.hero.bannerImageUrl}
                    alt="Store Banner"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Search Bar & Filter Controls (Matching Image 1) */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find items, food categories..."
                className="w-full h-11 rounded-full border border-slate-200 bg-white pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none"
                style={{ outlineColor: brandPrimaryColor }}
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Filter"
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>

            {/* Quick Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort products"
                className="h-10 w-full sm:w-auto rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-2xs focus:outline-none"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Horizontal Category Filter Pills with Item Counts (Matches Image 1) */}
          <div className="-mx-4 px-4 sm:mx-0 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categoriesWithCounts.map((cat) => {
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  style={isActive ? { backgroundColor: brandPrimaryColor, color: "#ffffff" } : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "shadow-xs text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="uppercase">{cat.name}</span>
                  <span
                    className="rounded-full px-1.5 py-0.2 text-[10px] font-semibold"
                    style={
                      isActive
                        ? { backgroundColor: "rgba(255,255,255,0.25)", color: "#ffffff" }
                        : { backgroundColor: "#f1f5f9", color: "#475569" }
                    }
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Catalog Products Section Header (Matches Image 1: "| BREAK FAST") */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-1 rounded-full" style={{ backgroundColor: brandPrimaryColor }} />
              <h2 className="text-base font-semibold uppercase tracking-wide text-slate-900">
                {activeCategory === "All" ? "Menu Items" : activeCategory}
              </h2>
              <span className="text-xs text-slate-500 font-medium">({visibleItems.length} items)</span>
            </div>

            {/* Product Cards Grid (Matches Image 1) */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className={`h-28 ${cardRadiusClass} border border-slate-200 bg-white p-3 animate-pulse`} />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className={`border border-dashed border-slate-200 bg-white p-12 text-center ${cardRadiusClass}`}>
                <Utensils size={32} className="mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No food items found</h3>
                <p className="text-xs text-slate-500 mt-1">Try selecting another category or clear your search term.</p>
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${
                  onlineSettings?.themeConfig?.productGridColumnsDesktop === 4
                    ? "md:grid-cols-2 lg:grid-cols-4"
                    : onlineSettings?.themeConfig?.productGridColumnsDesktop === 3
                    ? "md:grid-cols-2 lg:grid-cols-3"
                    : "md:grid-cols-2 lg:grid-cols-2"
                } gap-3 sm:gap-4`}
              >
                {visibleItems.map((item) => {
                  const currentQty = qty[item.id] || 0;
                  const itemImg = productImageFor(item);
                  const isVeg = isVegetarianItem(item);
                  const pricePaise = item.selling_price_paise ?? 0;
                  const mrpPaise = item.mrp_paise ?? 0;
                  const hasDiscount = mrpPaise > pricePaise;
                  const discountPct = hasDiscount ? Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100) : 0;

                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center justify-between ${cardRadiusClass} bg-white p-3 sm:p-3.5 ${cardShadowClass} transition`}
                    >
                      {/* Left: Product Thumbnail with Veg/Non-Veg badge */}
                      <div className="relative h-22 w-22 sm:h-24 sm:w-24 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                        {itemImg ? (
                          <img
                            src={itemImg}
                            alt={item.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400 bg-slate-50">
                            <Utensils size={24} />
                          </div>
                        )}

                        {/* Veg / Non-Veg Indicator Badge on top-left of image (Matching Image 1) */}
                        <div className="absolute left-1.5 top-1.5 rounded bg-white/95 px-1 py-0.5 shadow-2xs backdrop-blur-xs flex items-center gap-1 border border-slate-200/80">
                          {isVeg ? (
                            <div className="flex items-center gap-1">
                              <div className="flex h-3 w-3 items-center justify-center rounded-[2px] border border-emerald-600 p-[1px]">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              </div>
                              <span className="text-[9px] font-semibold text-emerald-800 uppercase">Veg</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <div className="flex h-3 w-3 items-center justify-center rounded-[2px] border border-rose-600 p-[1px]">
                                <div className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                              </div>
                              <span className="text-[9px] font-semibold text-rose-800 uppercase">Non-Veg</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Middle: Title, Brand, & Price info */}
                      <div className="flex-1 px-3 sm:px-3.5 min-w-0">
                        {onlineSettings?.themeConfig?.showBrandOnCard && item.brand && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5 truncate">
                            {item.brand}
                          </span>
                        )}
                        <h3 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                        <p className="mt-0.5 text-[10px] sm:text-[11px] font-medium text-slate-500">
                          {item.unit_short || "Freshly Prepared"}
                        </p>
                        <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold" style={{ color: brandPrimaryColor }}>
                            {formatInr(pricePaise)}
                          </span>
                          {onlineSettings?.themeConfig?.showMrpStrike !== false && hasDiscount && (
                            <span className="text-[11px] text-slate-400 line-through font-normal">
                              {formatInr(mrpPaise)}
                            </span>
                          )}
                          {onlineSettings?.themeConfig?.showDiscountPercentageBadge !== false && hasDiscount && (
                            <span className="rounded px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                              {discountPct}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: + Add Button / [-] qty [+] Stepper (Matches Image 1) */}
                      <div className="shrink-0">
                        {currentQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.id, 1)}
                            style={{
                              color: brandPrimaryColor,
                              borderColor: `${brandPrimaryColor}35`,
                              backgroundColor: `${brandPrimaryColor}0d`,
                            }}
                            className={`inline-flex items-center gap-1 border px-3 sm:px-4 py-1.5 text-xs font-semibold shadow-2xs hover:opacity-90 active:scale-95 transition ${buttonRadiusClass}`}
                          >
                            <Plus size={13} />
                            <span>Add</span>
                          </button>
                        ) : (
                          <div
                            style={{ backgroundColor: brandPrimaryColor, color: "#ffffff" }}
                            className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 text-xs font-semibold shadow-xs ${buttonRadiusClass}`}
                          >
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.id, currentQty - 1)}
                              className="flex h-6 w-6 sm:h-5 sm:w-5 items-center justify-center rounded-full hover:bg-black/10 active:scale-90 transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-4 text-center font-bold">{currentQty}</span>
                            <button
                              type="button"
                              onClick={() => updateItemQty(item.id, currentQty + 1)}
                              className="flex h-6 w-6 sm:h-5 sm:w-5 items-center justify-center rounded-full hover:bg-black/10 active:scale-90 transition"
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      )}

      {/* 3. SLIDE-OVER "YOUR CART" DRAWER (Matches Image 2 layout) */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition">
          <div className="flex h-full w-full max-w-[420px] flex-col justify-between bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-2xs"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 leading-tight">Your cart</h3>
                  <p className="text-xs font-medium text-slate-500">
                    {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCartDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartLines.length === 0 ? (
                <div className={`border border-dashed border-slate-200 p-8 text-center text-slate-500 ${cardRadiusClass}`}>
                  <ShoppingCart size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-800">Your cart is empty</p>
                  <p className="text-xs mt-1">Add your favourite dishes to proceed to checkout.</p>
                </div>
              ) : (
                cartLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        {line.image ? (
                          <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Utensils size={16} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-900 truncate">{line.name}</h4>
                        <p className="text-[11px] text-slate-500">{formatInr(line.pricePaise)} each</p>
                        {/* Stepper with brand color matching Image 2 */}
                        <div className="mt-1.5 inline-flex items-center gap-2 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                          <button
                            type="button"
                            onClick={() => updateItemQty(line.id, line.count - 1)}
                            className="text-slate-500 hover:text-slate-800"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-semibold text-xs">{line.count}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQty(line.id, line.count + 1)}
                            style={{ backgroundColor: brandPrimaryColor }}
                            className="flex h-4 w-4 items-center justify-center rounded-full text-white"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold" style={{ color: brandPrimaryColor }}>
                        {formatInr(line.lineTotalPaise)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Breakdown & Continue CTA Box (Matches Image 2) */}
            {cartLines.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50/70 p-4 space-y-3">
                {/* Cost Breakdown */}
                <div className="rounded-xl bg-[#fffcf7] border border-orange-100 p-3.5 text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatInr(netSubtotalPaise)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>CGST ({cgstPct}%)</span>
                    <span>{formatInr(cgstPaise)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>SGST ({sgstPct}%)</span>
                    <span>{formatInr(sgstPaise)}</span>
                  </div>
                  {!isTaxInclusive && taxAdditionPaise > 0 && (
                    <div className="flex justify-between text-amber-700 text-[11px] font-medium">
                      <span>GST Added ({totalTaxPct}%)</span>
                      <span>+{formatInr(taxAdditionPaise)}</span>
                    </div>
                  )}
                  {deliveryChargePaise > 0 && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Delivery Fee</span>
                      <span>{formatInr(deliveryChargePaise)}</span>
                    </div>
                  )}
                  {packagingChargePaise > 0 && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Packaging Fee</span>
                      <span>{formatInr(packagingChargePaise)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-orange-200/60 flex justify-between items-baseline">
                    <span className="font-medium text-slate-800">Total {isTaxInclusive ? "(incl. tax)" : ""}</span>
                    <span className="text-base font-semibold" style={{ color: brandPrimaryColor }}>
                      {formatInr(grandTotalPaise)}
                    </span>
                  </div>
                </div>

                {/* Big Continue to Checkout Button (Matches Image 2) */}
                <button
                  type="button"
                  onClick={() => {
                    setCartDrawerOpen(false);
                    setViewMode("checkout");
                  }}
                  style={{ backgroundColor: brandPrimaryColor }}
                  className={`w-full flex items-center justify-center gap-2 text-white py-3.5 text-xs font-semibold uppercase tracking-wider shadow-sm hover:opacity-95 transition ${buttonRadiusClass}`}
                >
                  <span>Continue to Checkout</span>
                  <ChevronRight size={15} />
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCartDrawerOpen(false)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Keep browsing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TWO-COLUMN CHECKOUT SCREEN (Matches Image 3) */}
      {viewMode === "checkout" && !orderConfirmed && (
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Fulfillment Choice, Details, Live GPS Location, and Payment Options */}
            <div className="space-y-6 lg:col-span-8">
              {/* Card 1: How would you like to order? (Matches Image 3) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Utensils size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">How would you like to order?</h3>
                    <p className="text-xs text-slate-500">Choose pay on delivery or pay in store.</p>
                  </div>
                </div>

                {/* Two Selectable Option Cards (Pay on Delivery vs Pay in Store) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option A: Pay on delivery (Home Delivery) */}
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillment("delivery");
                      setPayment("cod");
                    }}
                    style={
                      fulfillment === "delivery"
                        ? { borderColor: brandPrimaryColor, backgroundColor: `${brandPrimaryColor}0a` }
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

                  {/* Option B: Pay in store (Take away / In-Store Pickup) */}
                  <button
                    type="button"
                    onClick={() => {
                      setFulfillment("pickup");
                      setPayment("pay_at_store");
                    }}
                    style={
                      fulfillment === "pickup"
                        ? { borderColor: brandPrimaryColor, backgroundColor: `${brandPrimaryColor}0a` }
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

              {/* Card 2: Your Details & 1-Click Live Location (Matches Image 3) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: brandPrimaryColor }}
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
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Cooper"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none"
                      style={{ outlineColor: brandPrimaryColor }}
                    />
                  </div>

                  {/* Phone & Email Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone {fulfillment === "delivery" ? "(Required for rider dispatch)" : "(Optional)"}
                      </label>
                      <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-slate-400">
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
                        className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none"
                        style={{ outlineColor: brandPrimaryColor }}
                      />
                    </div>
                  </div>

                  {/* Pay on Delivery: 1-Click Live Location Detector & Address Fields */}
                  {fulfillment === "delivery" && (
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-800">
                          Live Delivery Location (GPS)
                        </label>
                        {locationSuccess && (
                          <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                            <Check size={13} />
                            GPS Location Locked
                          </span>
                        )}
                      </div>

                      {/* 1-Click Detect Live Location Button */}
                      <button
                        type="button"
                        onClick={handleDetectLiveLocation}
                        disabled={detectingLocation}
                        style={{
                          borderColor: `${brandPrimaryColor}50`,
                          color: brandPrimaryColor,
                          backgroundColor: `${brandPrimaryColor}0a`,
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 px-4 text-xs font-semibold shadow-2xs hover:opacity-90 transition"
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

                      {/* GPS Badge Preview */}
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
                            className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                            style={{ color: brandPrimaryColor }}
                          >
                            <span>Open Map</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}

                      {/* Street Address */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Delivery Address (Flat / House No, Street)
                        </label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. 104, Green Heights, 1st Cross, Koramangala"
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none"
                          style={{ outlineColor: brandPrimaryColor }}
                        />
                      </div>

                      {/* Landmark & Pincode */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Landmark (Optional)</label>
                          <input
                            type="text"
                            value={landmark}
                            onChange={(e) => setLandmark(e.target.value)}
                            placeholder="e.g. Near Metro Station / Opp Cafe"
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none"
                            style={{ outlineColor: brandPrimaryColor }}
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
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-base sm:text-xs font-medium text-slate-900 focus:outline-none"
                            style={{ outlineColor: brandPrimaryColor }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Special instructions */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Special instructions (Optional)</label>
                    <textarea
                      rows={2}
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Less spicy, pack extra chutney, ring the door bell"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-base sm:text-xs font-medium text-slate-900 focus:outline-none"
                      style={{ outlineColor: brandPrimaryColor }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Payment Method (Matches Image 3) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: brandPrimaryColor }}
                  >
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Payment</h3>
                    <p className="text-xs text-slate-500">Choose your payment method</p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {fulfillment === "delivery" ? (
                    <>
                      {/* Cash on Delivery option */}
                      {isCodEnabled && (
                        <button
                          type="button"
                          onClick={() => setPayment("cod")}
                          style={
                            payment === "cod"
                              ? { borderColor: brandPrimaryColor, backgroundColor: `${brandPrimaryColor}08` }
                              : undefined
                          }
                          className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                            payment === "cod" ? "shadow-2xs" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              {paymentsConfig.cod?.displayName || "Cash on Delivery (COD)"}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {paymentsConfig.cod?.description || "Pay cash directly to the delivery rider"}
                            </p>
                          </div>
                          {payment === "cod" && (
                            <div
                              className="h-5 w-5 rounded-full text-white flex items-center justify-center shrink-0"
                              style={{ backgroundColor: brandPrimaryColor }}
                            >
                              <Check size={12} />
                            </div>
                          )}
                        </button>
                      )}

                      {/* Online UPI option */}
                      {isUpiQrEnabled && (
                        <button
                          type="button"
                          onClick={() => setPayment("upi_qr")}
                          style={
                            payment === "upi_qr"
                              ? { borderColor: brandPrimaryColor, backgroundColor: `${brandPrimaryColor}08` }
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
                              {paymentsConfig.upiQr?.vpa
                                ? `Pay to VPA: ${paymentsConfig.upiQr.vpa}`
                                : "Scan UPI QR code or pay via phone app"}
                            </p>
                            {payment === "upi_qr" && paymentsConfig.upiQr?.vpa && (
                              <div
                                className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-mono font-medium"
                                style={{ backgroundColor: `${brandPrimaryColor}15`, color: brandPrimaryColor }}
                              >
                                <span>UPI ID: {paymentsConfig.upiQr.vpa}</span>
                                {paymentsConfig.upiQr.merchantName && (
                                  <span>({paymentsConfig.upiQr.merchantName})</span>
                                )}
                              </div>
                            )}
                          </div>
                          {payment === "upi_qr" && (
                            <div
                              className="h-5 w-5 rounded-full text-white flex items-center justify-center shrink-0"
                              style={{ backgroundColor: brandPrimaryColor }}
                            >
                              <Check size={12} />
                            </div>
                          )}
                        </button>
                      )}

                      {/* Razorpay Gateway */}
                      {isRazorpayEnabled && (
                        <button
                          type="button"
                          onClick={() => setPayment("razorpay")}
                          style={
                            payment === "razorpay"
                              ? { borderColor: brandPrimaryColor, backgroundColor: `${brandPrimaryColor}08` }
                              : undefined
                          }
                          className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                            payment === "razorpay" ? "shadow-2xs" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900">Cards, NetBanking, UPI (Razorpay)</div>
                            <p className="text-[11px] text-slate-500">
                              Pay securely online via cards, wallets or NetBanking{" "}
                              {paymentsConfig.razorpay?.mode === "test" ? "(Sandbox Mode)" : ""}
                            </p>
                          </div>
                          {payment === "razorpay" && (
                            <div
                              className="h-5 w-5 rounded-full text-white flex items-center justify-center shrink-0"
                              style={{ backgroundColor: brandPrimaryColor }}
                            >
                              <Check size={12} />
                            </div>
                          )}
                        </button>
                      )}

                      {/* PhonePe Gateway */}
                      {isPhonePeEnabled && (
                        <button
                          type="button"
                          onClick={() => setPayment("phonepe")}
                          style={
                            payment === "phonepe"
                              ? { borderColor: brandPrimaryColor, backgroundColor: `${brandPrimaryColor}08` }
                              : undefined
                          }
                          className={`w-full flex items-center justify-between rounded-xl p-3.5 text-left border-2 transition ${
                            payment === "phonepe" ? "shadow-2xs" : "border-slate-200 bg-white"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900">PhonePe Payment Gateway</div>
                            <p className="text-[11px] text-slate-500">
                              Instant payment via PhonePe UPI or cards
                            </p>
                          </div>
                          {payment === "phonepe" && (
                            <div
                              className="h-5 w-5 rounded-full text-white flex items-center justify-center shrink-0"
                              style={{ backgroundColor: brandPrimaryColor }}
                            >
                              <Check size={12} />
                            </div>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    /* In-Store Pickup Payment Method */
                    <div className="space-y-2">
                      <div
                        className="rounded-xl border-2 p-3.5 flex items-center justify-between"
                        style={{ borderColor: brandPrimaryColor, backgroundColor: `${brandPrimaryColor}08` }}
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-900">
                            {paymentsConfig.payAtStore?.displayName || "Pay at Store Counter"}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {paymentsConfig.payAtStore?.description ||
                              "Receive your Order Pickup QR code and pay at the counter when collecting your order"}
                          </p>
                        </div>
                        <div
                          className="h-5 w-5 rounded-full text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: brandPrimaryColor }}
                        >
                          <Check size={12} />
                        </div>
                      </div>

                      {isUpiQrEnabled && paymentsConfig.upiQr?.vpa && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 flex items-center justify-between">
                          <span>Store UPI ID: <span className="font-mono font-semibold text-slate-800">{paymentsConfig.upiQr.vpa}</span></span>
                          <span className="text-[10px] font-medium" style={{ color: brandPrimaryColor }}>Counter UPI available</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                  <Lock size={12} className="text-emerald-600" />
                  <span>Your data is safe with us. We never share your information with third parties.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Order Summary (Matches Image 3) */}
            <div className="lg:col-span-4 sticky top-20 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                {/* Header with brand bag and count badge */}
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

                {/* Items List */}
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto pr-1">
                  {cartLines.map((line) => (
                    <div key={line.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="font-semibold px-1.5 py-0.5 rounded text-[10px]"
                          style={{ backgroundColor: `${brandPrimaryColor}15`, color: brandPrimaryColor }}
                        >
                          x{line.count}
                        </span>
                        <span className="font-medium text-slate-800 truncate max-w-[140px]">{line.name}</span>
                      </div>
                      <span className="font-semibold text-slate-900">{formatInr(line.lineTotalPaise)}</span>
                    </div>
                  ))}
                </div>

                {/* Taxes & Fees Breakdown */}
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-900">{formatInr(netSubtotalPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>CGST ({cgstPct}%)</span>
                    <span>{formatInr(cgstPaise)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>SGST ({sgstPct}%)</span>
                    <span>{formatInr(sgstPaise)}</span>
                  </div>
                  {!isTaxInclusive && taxAdditionPaise > 0 && (
                    <div className="flex justify-between text-[11px] text-amber-700 font-medium">
                      <span>GST Added ({totalTaxPct}%)</span>
                      <span>+{formatInr(taxAdditionPaise)}</span>
                    </div>
                  )}

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

                {/* Grand Total Box (Matching Image 3) */}
                <div className="rounded-xl bg-[#fffcf7] border border-orange-100 p-3.5 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-800">Total</span>
                  <span className="text-xl font-semibold text-slate-900">{formatInr(grandTotalPaise)}</span>
                </div>

                {/* Big CTA Button (Matching Image 3: "Pay And Place Order ->") */}
                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={submittingOrder}
                  style={{ backgroundColor: brandPrimaryColor }}
                  className={`w-full flex items-center justify-center gap-2 text-white py-3.5 text-xs font-semibold uppercase tracking-wider shadow-sm hover:opacity-95 transition disabled:opacity-50 ${buttonRadiusClass}`}
                >
                  <span>
                    {submittingOrder
                      ? "Placing Order..."
                      : fulfillment === "pickup"
                      ? "Pay And Place Order (Get QR)"
                      : "Pay And Place Order"}
                  </span>
                  <ChevronRight size={15} />
                </button>

                <p className="text-[10px] text-center text-slate-400 leading-tight">
                  By placing your order you agree to the restaurant&apos;s terms and cancellation policy for this order.
                </p>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Mobile Sticky Bottom Floating Cart Bar */}
      {totalItemsCount > 0 && viewMode === "catalog" && (
        <div className="fixed bottom-4 left-3 right-3 sm:hidden z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            style={{ backgroundColor: brandPrimaryColor }}
            className={`w-full flex items-center justify-between p-3.5 text-white shadow-xl ${buttonRadiusClass} transition transform active:scale-[0.98]`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <ShoppingBag size={16} />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold leading-tight">
                  {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} · {formatInr(grandTotalPaise)}
                </div>
                <div className="text-[10px] text-white/80 font-medium">Taxes &amp; charges included</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider bg-white/20 rounded-lg px-2.5 py-1.5">
              <span>View Cart</span>
              <ChevronRight size={14} />
            </div>
          </button>
        </div>
      )}

      {/* Floating WhatsApp chat button if enabled in Online Store settings */}
      {onlineSettings?.contact?.enableFloatingWhatsapp && (
        <a
          href={`https://wa.me/${(onlineSettings.contact.whatsappNumber || "").replace(/\D/g, "")}?text=${encodeURIComponent(
            onlineSettings.contact.whatsappPrefillText || "Hi, I would like to place an order from your online store.",
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className={`fixed ${
            totalItemsCount > 0 && viewMode === "catalog"
              ? "bottom-[148px] sm:bottom-24"
              : "bottom-24 sm:bottom-24"
          } right-6 z-40 flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_25px_rgba(37,211,102,0.45)] hover:shadow-[0_12px_32px_rgba(37,211,102,0.65)] hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/40`}
        >
          <svg className="h-6 w-6 sm:h-7 sm:w-7 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
          </svg>
          <span className="pointer-events-none absolute right-full mr-2.5 hidden sm:group-hover:flex items-center whitespace-nowrap rounded-lg bg-slate-900/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-md backdrop-blur-xs">
            Chat on WhatsApp
          </span>
        </a>
      )}

      {/* Storefront Footer */}
      <footer className="mt-16 border-t border-slate-200 bg-white text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                {logoUrl ? (
                  <img src={logoUrl} alt={displayStoreName} className="h-8 w-auto max-w-[120px] object-contain" />
                ) : (
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-2xs"
                    style={{ backgroundColor: brandPrimaryColor }}
                  >
                    <Utensils size={16} />
                  </div>
                )}
                <span className="font-semibold text-slate-900 text-sm">{displayStoreName}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                {onlineSettings?.topbarFooter?.footerAboutText ||
                  onlineSettings?.branding?.brandTagline ||
                  "Freshly prepared meals and daily essentials delivered directly to your doorstep or ready for instant in-store pickup."}
              </p>
              {onlineSettings?.contact?.openingHoursText && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Opening Hours:</span> {onlineSettings.contact.openingHoursText}
                </p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Customer Support</h4>
              <ul className="space-y-2 text-xs text-slate-500">
                {onlineSettings?.contact?.supportPhone && (
                  <li>
                    Phone:{" "}
                    <a href={`tel:${onlineSettings.contact.supportPhone}`} className="hover:underline text-slate-700 font-medium">
                      {onlineSettings.contact.supportPhone}
                    </a>
                  </li>
                )}
                {onlineSettings?.contact?.supportEmail && (
                  <li>
                    Email:{" "}
                    <a href={`mailto:${onlineSettings.contact.supportEmail}`} className="hover:underline text-slate-700 font-medium">
                      {onlineSettings.contact.supportEmail}
                    </a>
                  </li>
                )}
                {onlineSettings?.contact?.storeAddress && (
                  <li>
                    Address: <span className="text-slate-700">{onlineSettings.contact.storeAddress}</span>
                  </li>
                )}
                <li>
                  <Link href="/track" className="hover:underline font-semibold" style={{ color: brandPrimaryColor }}>
                    Track Your Order →
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-3">Policies &amp; Legal</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                {onlineSettings?.topbarFooter?.refundPolicyText ||
                  "Orders once placed can be tracked in real-time. For refunds or order alterations, please contact customer support immediately."}
              </p>
              {onlineSettings?.social && (
                <div className="flex items-center gap-3 text-slate-400">
                  {onlineSettings.social.instagram && (
                    <a href={onlineSettings.social.instagram} target="_blank" rel="noreferrer" className="hover:text-pink-600 transition text-xs font-medium">
                      Instagram
                    </a>
                  )}
                  {onlineSettings.social.facebook && (
                    <a href={onlineSettings.social.facebook} target="_blank" rel="noreferrer" className="hover:text-blue-600 transition text-xs font-medium">
                      Facebook
                    </a>
                  )}
                  {onlineSettings.social.twitterX && (
                    <a href={onlineSettings.social.twitterX} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition text-xs font-medium">
                      Twitter / X
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <p>
              {onlineSettings?.topbarFooter?.footerCopyrightText ||
                `© ${new Date().getFullYear()} ${displayStoreName}. All rights reserved.`}
            </p>
            <p className="text-[11px]">Powered by Selfx Retail Enterprise Engine</p>
          </div>
        </div>
      </footer>

      {/* Floating AI Assistant Widget */}
      <StorefrontAiWidget
        storeName={displayStoreName}
        slug={slug}
        onAddToCart={(itemId) => updateItemQty(itemId, (qty[itemId] || 0) + 1)}
      />

      {/* Sign in Modal */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setLoginModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>

            <div className="text-center mb-4">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-white mb-2 shadow-2xs"
                style={{ backgroundColor: brandPrimaryColor }}
              >
                <Utensils size={22} />
              </div>
              <h3 className="text-base font-semibold text-slate-900">{displayStoreName}</h3>
              <p className="text-xs text-slate-500">Sign in with mobile to save favourites and track orders</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-slate-400">
                  <span className="text-xs font-semibold text-slate-700 pr-2 border-r border-slate-200">🇮🇳 +91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    className="w-full bg-transparent pl-2 text-base sm:text-xs font-medium text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Cooper"
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-base sm:text-xs font-medium text-slate-900 focus:outline-none"
                  style={{ outlineColor: brandPrimaryColor }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (phone.replace(/\D/g, "").length >= 10) {
                    try {
                      window.localStorage.setItem(
                        CUSTOMER_STORAGE_KEY,
                        JSON.stringify({ name, phone, email, address, landmark, pincode, latitude, longitude }),
                      );
                    } catch {
                      // ignore
                    }
                    void refreshCustomerOrders(phone);
                    setLoginModalOpen(false);
                  }
                }}
                disabled={phone.replace(/\D/g, "").length < 10}
                style={{ backgroundColor: brandPrimaryColor }}
                className={`w-full text-white py-2.5 text-xs font-semibold transition hover:opacity-95 disabled:opacity-50 ${buttonRadiusClass}`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blinkit & Instamart Style Floating Active Order Status Bar */}
      {/* iOS App Glass Style Floating Active Order Status Bar (Centered) */}
      {activeTrackingOrder && viewMode === "catalog" && (
        <div
          className={`fixed z-40 transition-all duration-300 left-1/2 -translate-x-1/2 ${
            totalItemsCount > 0 ? "bottom-20 sm:bottom-6" : "bottom-5 sm:bottom-6"
          } w-[calc(100%-24px)] sm:w-auto min-w-[320px] sm:min-w-[430px] max-w-lg`}
        >
          <div
            onClick={() => setLiveMapModalOrder(activeTrackingOrder)}
            className="group flex items-center justify-between gap-3 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl backdrop-saturate-180 border border-white/70 dark:border-white/15 p-2 pl-2.5 sm:p-2.5 sm:pl-3.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.08)] cursor-pointer hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-xs transition group-hover:scale-105"
                style={{ backgroundColor: brandPrimaryColor }}
              >
                {activeTrackingOrder.status === "out_for_delivery" ? (
                  <Bike size={18} className="animate-bounce" />
                ) : activeTrackingOrder.status === "delivered" ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Clock size={18} />
                )}
                {/* Live pulsing radar dot */}
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900" />
                </span>
              </div>
              <div className="min-w-0 pr-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-[13px] font-semibold truncate text-slate-900 dark:text-white leading-tight">
                    {activeTrackingOrder.status === "out_for_delivery"
                      ? "Arriving Soon · Out for Delivery"
                      : activeTrackingOrder.status === "packed"
                      ? "Order Packed & Ready"
                      : activeTrackingOrder.status === "confirmed" || activeTrackingOrder.status === "accepted"
                      ? "Order Confirmed & Preparing"
                      : activeTrackingOrder.status === "delivered"
                      ? "Order Delivered"
                      : "Order Placed & Processing"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
                  Order #{activeTrackingOrder.number} · {formatInr(activeTrackingOrder.total_paise || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                style={{ backgroundColor: brandPrimaryColor }}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 active:scale-95"
              >
                <Navigation size={13} className="shrink-0" />
                <span className="hidden xs:inline">Track Live</span>
                <span className="xs:hidden">Track</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Orders Slide-over Drawer */}
      {ordersDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Your Orders</h3>
                  <p className="text-[11px] text-slate-500">
                    {phone ? `Logged in as +91 ${phone.slice(-4)}` : "Recent orders from this device"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrdersDrawerOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {!phone && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2">
                  <div className="text-xs font-semibold text-amber-900">Want to see all your past orders?</div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Sign in with your mobile number to retrieve and track all orders placed across any device.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersDrawerOpen(false);
                      setLoginModalOpen(true);
                    }}
                    style={{ backgroundColor: brandPrimaryColor }}
                    className={`inline-flex items-center gap-1.5 text-white px-3 py-1.5 text-xs font-semibold ${buttonRadiusClass}`}
                  >
                    <span>Sign In with Mobile</span>
                  </button>
                </div>
              )}

              {loadingOrders ? (
                <div className="py-12 text-center text-xs font-semibold text-slate-400">
                  Loading recent orders...
                </div>
              ) : customerOrders.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <ShoppingBag size={36} className="mx-auto text-slate-300" />
                  <div className="text-sm font-semibold text-slate-900">No orders found</div>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    You haven&apos;t placed any orders yet. Explore our fresh menu to order!
                  </p>
                </div>
              ) : (
                customerOrders.map((ord: any) => {
                  const isDeliv = ord.fulfillment === "delivery";
                  const statusLabel =
                    ord.status === "out_for_delivery"
                      ? "Out for Delivery"
                      : ord.status === "packed"
                      ? "Packed & Ready"
                      : ord.status === "confirmed" || ord.status === "accepted"
                      ? "Store Preparing"
                      : ord.status === "delivered"
                      ? "Delivered"
                      : ord.status === "cancelled"
                      ? "Cancelled"
                      : "Order Placed";

                  const statusColor =
                    ord.status === "delivered"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : ord.status === "out_for_delivery"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : ord.status === "cancelled"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <div
                      key={ord.number}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2.5 transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-900">
                            #{ord.number}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {formatInr(ord.total_paise || 0)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        {isDeliv ? "Doorstep Delivery" : "In-Store Pickup"} ·{" "}
                        {ord.created_at ? new Date(ord.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent"}
                      </div>

                      {ord.lines && Array.isArray(ord.lines) && ord.lines.length > 0 && (
                        <div className="text-[11px] text-slate-600 line-clamp-1">
                          {ord.lines.map((l: any) => `${l.qty}x ${l.name}`).join(", ")}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setOrdersDrawerOpen(false);
                            setLiveMapModalOrder(ord);
                          }}
                          style={{
                            borderColor: `${brandPrimaryColor}40`,
                            backgroundColor: `${brandPrimaryColor}08`,
                            color: brandPrimaryColor,
                          }}
                          className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold ${buttonRadiusClass} transition hover:opacity-90`}
                        >
                          <Navigation size={12} />
                          <span>Track Live Map</span>
                        </button>

                        <Link
                          href={`/track?order=${encodeURIComponent(ord.number)}`}
                          onClick={() => setOrdersDrawerOpen(false)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
                        >
                          Full Details →
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Order Tracking & Map Modal */}
      {liveMapModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#fbfcfb] px-4 sm:px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  <Navigation size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Live Delivery Tracking · #{liveMapModalOrder.number}
                  </h3>
                  <p className="text-[11px] text-slate-500">Real-time driver location and order status</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLiveMapModalOrder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Map & Details */}
            <div className="p-4 sm:p-5 overflow-y-auto">
              <LiveOrderMap
                storeLat={storeLat ?? 12.9716}
                storeLng={storeLng ?? 77.5946}
                storeName={displayStoreName}
                storeAddress={storeAddress || onlineSettings?.contact?.storeAddress}
                customerLat={liveMapModalOrder.latitude}
                customerLng={liveMapModalOrder.longitude}
                customerAddress={liveMapModalOrder.address || "Your Address"}
                orderNumber={liveMapModalOrder.number}
                orderStatus={liveMapModalOrder.status}
                fulfillment={liveMapModalOrder.fulfillment}
                deliveryStaffName={liveMapModalOrder.delivery_staff_name}
                deliveryStaffPhone={liveMapModalOrder.delivery_staff_phone}
                googleMapsApiKey={onlineSettings?.contact?.googleMapsApiKey}
                liveLocationUrl={liveMapModalOrder.live_location_url}
                brandPrimaryColor={brandPrimaryColor}
                heightClass="h-72 sm:h-80"
                showDetails={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
