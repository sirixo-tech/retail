"use client";

import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Palette,
  Percent,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  Truck,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PaymentGatewaysSection } from "../settings/page";

async function csrfToken() {
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

export type OnlineStoreSectionId =
  | "settings"
  | "payments"
  | "orders"
  | "collections"
  | "banners"
  | "subscribers"
  | "messages"
  | "invite-codes"
  | "pending-customers"
  | "guest-customers"
  | "registered-customers"
  | "shipping"
  | "taxes";

type SettingsSubTab =
  | "basics"
  | "contact"
  | "branding"
  | "hero"
  | "theme"
  | "seo"
  | "topbar-footer"
  | "social"
  | "blocks";

export interface OnlineStoreConfig {
  basics: {
    enabled: boolean;
    storeName: string;
    storeTheme: string;
    currency: string;
    defaultLanguage: string;
    displayCurrency: string;
    allWarehouses: boolean;
    defaultWarehouse: string;
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    useRootDomain: boolean;
    storeUrlPath: string;
    customDomain: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    guestCheckout: boolean;
    minOrderAmount: number;
    maxOrderAmount: number;
    orderAutoConfirm: boolean;
    inventorySyncMode: "realtime" | "scheduled" | "manual";
    hideOutOfStock: boolean;
    allowBackorders: boolean;
    showStockCount: boolean;
    lowStockBadgeThreshold: number;
  };
  contact: {
    supportEmail: string;
    supportPhone: string;
    whatsappNumber: string;
    enableFloatingWhatsapp: boolean;
    whatsappPrefillText: string;
    storeAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    googleMapsEmbedUrl: string;
    googleMapsApiKey: string;
    storeLatitude: number;
    storeLongitude: number;
    openingHoursText: string;
    supportHoursText: string;
  };
  branding: {
    logoUrl: string;
    darkLogoUrl: string;
    faviconUrl: string;
    appleTouchIconUrl: string;
    brandTagline: string;
    borderRadiusStyle: "sharp" | "rounded" | "pill";
    cardShadowStyle: "flat" | "subtle" | "elevated";
    buttonStyle: "solid" | "gradient" | "outline";
    badgeColor: string;
    headerBackground: string;
  };
  hero: {
    enabled: boolean;
    layout: "split" | "fullbleed" | "carousel" | "minimal";
    eyebrowBadge: string;
    headline: string;
    subheadline: string;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
    bannerImageUrl: string;
    overlayOpacity: number;
    showTrustPills: boolean;
    trustPill1: string;
    trustPill2: string;
    trustPill3: string;
    promoHighlightText: string;
  };
  themeConfig: {
    activeTheme: string;
    productGridColumnsDesktop: 3 | 4 | 5;
    productGridColumnsMobile: 1 | 2;
    productCardVariant: "modern-supermarket" | "electronics-spec" | "minimal-fashion" | "compact-list";
    showMrpStrike: boolean;
    showDiscountPercentageBadge: boolean;
    showUnitWeightSelector: boolean;
    showQuickViewModal: boolean;
    showAddToWishlist: boolean;
    showBrandOnCard: boolean;
    showSkuOnCard: boolean;
    stickyHeader: boolean;
    stickyCartBarMobile: boolean;
    enablePinCodeChecker: boolean;
    enableDeliverySlotPicker: boolean;
    enableStorePickupToggle: boolean;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImageUrl: string;
    canonicalUrl: string;
    robotsIndex: boolean;
    googleAnalyticsId: string;
    metaPixelId: string;
    googleTagManagerId: string;
    structuredDataJsonLd: boolean;
    autoGenerateSitemap: boolean;
  };
  topbarFooter: {
    showTopbar: boolean;
    topbarText: string;
    topbarLinkLabel: string;
    topbarLinkHref: string;
    topbarBgColor: string;
    topbarTextColor: string;
    showLanguageSwitcher: boolean;
    showStoreLocatorLink: boolean;
    showOrderTrackingLink: boolean;
    footerAboutText: string;
    footerCopyrightText: string;
    showPaymentIconsInFooter: boolean;
    showNewsletterInFooter: boolean;
    showDownloadAppBadges: boolean;
    playStoreUrl: string;
    appStoreUrl: string;
    refundPolicyText: string;
    privacyPolicyText: string;
    termsText: string;
  };
  social: {
    instagram: string;
    facebook: string;
    twitterX: string;
    youtube: string;
    linkedin: string;
    pinterest: string;
    telegram: string;
    whatsappChannel: string;
    enableSocialShareOnProducts: boolean;
  };
  blocks: {
    id: string;
    title: string;
    subtitle: string;
    type: "hero" | "categories" | "flash_deals" | "featured_grid" | "promo_banners" | "brand_marquee" | "testimonials" | "newsletter" | "trust_strip";
    enabled: boolean;
    itemLimit: number;
  }[];
  collections: {
    id: string;
    name: string;
    slug: string;
    description: string;
    productCount: number;
    featured: boolean;
    enabled: boolean;
    sortOrder: number;
  }[];
  banners: {
    id: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    placement: "home_top" | "home_mid" | "category_header" | "popup";
    badgeText: string;
    bgColor: string;
    enabled: boolean;
  }[];
  subscribers: {
    id: string;
    email: string;
    phone: string;
    source: string;
    subscribedAt: string;
    status: "active" | "unsubscribed";
  }[];
  messages: {
    id: string;
    customerName: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
    createdAt: string;
    status: "unread" | "replied" | "resolved";
  }[];
  inviteCodes: {
    id: string;
    code: string;
    discountType: "percentage" | "fixed" | "free_shipping";
    discountValue: number;
    minOrderAmount: number;
    usageCount: number;
    maxUsage: number;
    expiresAt: string;
    enabled: boolean;
  }[];
  shipping: {
    standardDeliveryFee: number;
    freeDeliveryAbove: number;
    packagingFee: number;
    enablePackagingFee: boolean;
    minOrderAmount: number;
  };
  shippingMethods: {
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
  taxSettings: {
    defaultCgstPct: number;
    defaultSgstPct: number;
    defaultIgstPct: number;
    inclusiveInMrp: boolean;
  };
  taxRates: {
    id: string;
    name: string;
    hsnPrefix: string;
    cgstPct: number;
    sgstPct: number;
    igstPct: number;
    cessPct: number;
    inclusiveInMrp: boolean;
    enabled: boolean;
  }[];
  payments: {
    cod: {
      enabled: boolean;
      displayName: string;
      description: string;
    };
    payAtStore: {
      enabled: boolean;
      displayName: string;
      description: string;
    };
    upiQr: {
      enabled: boolean;
      displayName: string;
      vpa: string;
      merchantName: string;
      instructions: string;
    };
    razorpay: {
      enabled: boolean;
      mode: "test" | "live";
      keyId: string;
      keySecret: string;
    };
    phonepe: {
      enabled: boolean;
      mode: "test" | "live";
      merchantId: string;
      saltKey: string;
      saltIndex: string;
    };
    paytm: {
      enabled: boolean;
      mode: "test" | "live";
      merchantId: string;
      merchantKey: string;
    };
    stripe: {
      enabled: boolean;
      mode: "test" | "live";
      publishableKey: string;
      secretKey: string;
    };
  };
}

const DEFAULT_ONLINE_STORE_CONFIG: OnlineStoreConfig = {
  basics: {
    enabled: true,
    storeName: "",
    storeTheme: "Modern Supermarket & Retail Theme",
    currency: "Indian Rupee (₹)",
    defaultLanguage: "English",
    displayCurrency: "Same as base currency",
    allWarehouses: true,
    defaultWarehouse: "Main Store Warehouse",
    fontFamily: "Inter, sans-serif",
    primaryColor: "#0c831f",
    secondaryColor: "#1d4ed8",
    useRootDomain: false,
    storeUrlPath: "",
    customDomain: "",
    maintenanceMode: false,
    maintenanceMessage: "",
    guestCheckout: true,
    minOrderAmount: 0,
    maxOrderAmount: 100000,
    orderAutoConfirm: false,
    inventorySyncMode: "realtime",
    hideOutOfStock: false,
    allowBackorders: false,
    showStockCount: true,
    lowStockBadgeThreshold: 5,
  },
  contact: {
    supportEmail: "",
    supportPhone: "",
    whatsappNumber: "",
    enableFloatingWhatsapp: true,
    whatsappPrefillText: "Hello, I would like to inquire about an order.",
    storeAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    googleMapsEmbedUrl: "",
    googleMapsApiKey: "",
    storeLatitude: 12.9716,
    storeLongitude: 77.5946,
    openingHoursText: "08:00 AM – 10:00 PM",
    supportHoursText: "08:00 AM – 10:00 PM",
  },
  branding: {
    logoUrl: "",
    darkLogoUrl: "",
    faviconUrl: "",
    appleTouchIconUrl: "",
    brandTagline: "Stock up on daily essentials",
    borderRadiusStyle: "rounded",
    cardShadowStyle: "subtle",
    buttonStyle: "solid",
    badgeColor: "#0c831f",
    headerBackground: "#ffffff",
  },
  hero: {
    enabled: true,
    layout: "split",
    eyebrowBadge: "LIVE STORE INVENTORY",
    headline: "Stock up on daily essentials",
    subheadline: "Get farm-fresh goodness & daily household essentials delivered straight from our store counter.",
    primaryCtaLabel: "Shop Now",
    primaryCtaHref: "#catalog-grid",
    secondaryCtaLabel: "Browse Categories",
    secondaryCtaHref: "#categories",
    bannerImageUrl: "",
    overlayOpacity: 20,
    showTrustPills: true,
    trustPill1: "100% Quality Checked",
    trustPill2: "Transparent Counter Pricing",
    trustPill3: "Express Delivery & Pickup",
    promoHighlightText: "",
  },
  themeConfig: {
    activeTheme: "Modern Supermarket & Retail Theme",
    productGridColumnsDesktop: 5,
    productGridColumnsMobile: 2,
    productCardVariant: "modern-supermarket",
    showMrpStrike: true,
    showDiscountPercentageBadge: true,
    showUnitWeightSelector: true,
    showQuickViewModal: true,
    showAddToWishlist: true,
    showBrandOnCard: true,
    showSkuOnCard: false,
    stickyHeader: true,
    stickyCartBarMobile: true,
    enablePinCodeChecker: true,
    enableDeliverySlotPicker: true,
    enableStorePickupToggle: true,
  },
  seo: {
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    ogImageUrl: "",
    canonicalUrl: "/store",
    robotsIndex: true,
    googleAnalyticsId: "",
    metaPixelId: "",
    googleTagManagerId: "",
    structuredDataJsonLd: true,
    autoGenerateSitemap: true,
  },
  topbarFooter: {
    showTopbar: true,
    topbarText: "",
    topbarLinkLabel: "",
    topbarLinkHref: "#catalog-grid",
    topbarBgColor: "#0f172a",
    topbarTextColor: "#ffffff",
    showLanguageSwitcher: true,
    showStoreLocatorLink: true,
    showOrderTrackingLink: true,
    footerAboutText: "",
    footerCopyrightText: "",
    showPaymentIconsInFooter: true,
    showNewsletterInFooter: true,
    showDownloadAppBadges: false,
    playStoreUrl: "",
    appStoreUrl: "",
    refundPolicyText: "Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.",
    privacyPolicyText: "Customer mobile and address data is used strictly for billing and order fulfillment.",
    termsText: "All prices are inclusive of applicable GST unless specified otherwise.",
  },
  social: {
    instagram: "",
    facebook: "",
    twitterX: "",
    youtube: "",
    linkedin: "",
    pinterest: "",
    telegram: "",
    whatsappChannel: "",
    enableSocialShareOnProducts: true,
  },
  blocks: [
    { id: "blk-1", title: "Hero Promotional Banner", subtitle: "Primary campaign banner at top of storefront", type: "hero", enabled: true, itemLimit: 1 },
    { id: "blk-2", title: "Promotional Category Tiles", subtitle: "Quick category cards below hero banner", type: "promo_banners", enabled: true, itemLimit: 3 },
    { id: "blk-3", title: "Shop by Category Rail", subtitle: "Visual aisle navigation with live store categories", type: "categories", enabled: true, itemLimit: 12 },
    { id: "blk-4", title: "Store Product Catalog Grid", subtitle: "Sidebar category browser + live store items grid", type: "featured_grid", enabled: true, itemLimit: 60 },
  ],
  collections: [],
  banners: [],
  subscribers: [],
  messages: [],
  inviteCodes: [],
  shipping: {
    standardDeliveryFee: 35,
    freeDeliveryAbove: 499,
    packagingFee: 10,
    enablePackagingFee: true,
    minOrderAmount: 0,
  },
  shippingMethods: [
    {
      id: "shp-standard",
      name: "Standard Local Delivery",
      zone: "All Local PIN Codes",
      pinCodes: "All",
      etaText: "45–60 mins",
      feeAmount: 35,
      freeAboveAmount: 499,
      codAvailable: true,
      enabled: true,
    },
    {
      id: "shp-express",
      name: "Express 15-Min Delivery",
      zone: "Nearby Radius (within 3km)",
      pinCodes: "Local",
      etaText: "15–25 mins",
      feeAmount: 50,
      freeAboveAmount: 999,
      codAvailable: true,
      enabled: true,
    },
  ],
  taxSettings: {
    defaultCgstPct: 2.5,
    defaultSgstPct: 2.5,
    defaultIgstPct: 5,
    inclusiveInMrp: true,
  },
  taxRates: [
    {
      id: "tax-food",
      name: "GST 5% — Food & Daily Essentials",
      hsnPrefix: "0401",
      cgstPct: 2.5,
      sgstPct: 2.5,
      igstPct: 5,
      cessPct: 0,
      inclusiveInMrp: true,
      enabled: true,
    },
    {
      id: "tax-groceries",
      name: "GST 12% — Packaged Groceries",
      hsnPrefix: "1905",
      cgstPct: 6,
      sgstPct: 6,
      igstPct: 12,
      cessPct: 0,
      inclusiveInMrp: true,
      enabled: true,
    },
    {
      id: "tax-fmcg",
      name: "GST 18% — Household & Personal Care",
      hsnPrefix: "3401",
      cgstPct: 9,
      sgstPct: 9,
      igstPct: 18,
      cessPct: 0,
      inclusiveInMrp: true,
      enabled: true,
    },
  ],
  payments: {
    cod: {
      enabled: true,
      displayName: "Cash on Delivery (Pay on Delivery)",
      description: "Pay cash or scan rider UPI QR code upon doorstep delivery",
    },
    payAtStore: {
      enabled: true,
      displayName: "Pay at Store Counter",
      description: "Pay via cash/card/UPI at counter when picking up your order",
    },
    upiQr: {
      enabled: true,
      displayName: "Instant UPI QR Payment",
      vpa: "store@okhdfcbank",
      merchantName: "Retail Store",
      instructions: "Scan the UPI QR code using Google Pay, PhonePe, Paytm, or BHIM UPI app",
    },
    razorpay: {
      enabled: false,
      mode: "test",
      keyId: "",
      keySecret: "",
    },
    phonepe: {
      enabled: false,
      mode: "test",
      merchantId: "",
      saltKey: "",
      saltIndex: "1",
    },
    paytm: {
      enabled: false,
      mode: "test",
      merchantId: "",
      merchantKey: "",
    },
    stripe: {
      enabled: false,
      mode: "test",
      publishableKey: "",
      secretKey: "",
    },
  },
};

const STORAGE_KEY = "selfx_online_store_config_v2";

interface OnlineOrderRow {
  id: string;
  number?: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  fulfillment?: string;
  fulfillment_mode?: string;
  payment_method?: string;
  status: string;
  total_paise: number;
  created_at?: string;
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  loyalty_points?: number;
  orders_count?: number;
  total_spent_paise?: number;
}

export function OnlineStoreWorkspace({ initialSection = "settings" }: { initialSection?: OnlineStoreSectionId }) {
  const [activeSection, setActiveSection] = useState<OnlineStoreSectionId>(initialSection);
  const [settingsTab, setSettingsTab] = useState<SettingsSubTab>("basics");
  const [config, setConfig] = useState<OnlineStoreConfig>(DEFAULT_ONLINE_STORE_CONFIG);
  const [storeId, setStoreId] = useState<string>("");
  const [storeSlug, setStoreSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Live API data for orders & customers
  const [orders, setOrders] = useState<OnlineOrderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [orderFilter, setOrderFilter] = useState("all");

  // Modal states for adding items
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerSubtitle, setNewBannerSubtitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newCodeValue, setNewCodeValue] = useState("10");
  const [newShippingName, setNewShippingName] = useState("");
  const [newShippingZone, setNewShippingZone] = useState("");
  const [newShippingFee, setNewShippingFee] = useState("35");
  const [newShippingFreeAbove, setNewShippingFreeAbove] = useState("499");
  const [newShippingEta, setNewShippingEta] = useState("45–60 mins");
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxHsn, setNewTaxHsn] = useState("");
  const [newTaxCgst, setNewTaxCgst] = useState("2.5");
  const [newTaxSgst, setNewTaxSgst] = useState("2.5");
  const [newTaxInclusive, setNewTaxInclusive] = useState(true);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    void (async () => {
      try {
        const [meRes, ordersRes, custRes, couponsRes, catsRes] = await Promise.all([
          fetch("/api/v1/auth/staff/me", { credentials: "include", headers: { Accept: "application/json" } }),
          fetch("/api/v1/orders", { credentials: "include", headers: { Accept: "application/json" } }),
          fetch("/api/v1/customers", { credentials: "include", headers: { Accept: "application/json" } }),
          fetch("/api/v1/coupons", { credentials: "include", headers: { Accept: "application/json" } }),
          fetch("/api/v1/catalog/own/categories", { credentials: "include", headers: { Accept: "application/json" } }),
        ]);

        let currentStoreId = "";
        let resolvedSlug = "";
        let resolvedName = "";
        let resolvedEmail = "";

        if (meRes.ok) {
          const meBody = (await meRes.json()) as {
            data?: {
              email?: string;
              tenant?: { name?: string; slug?: string };
              store?: { id?: string; name?: string; slug?: string };
            };
          };
          currentStoreId = meBody.data?.store?.id ?? "";
          resolvedSlug = meBody.data?.store?.slug ?? meBody.data?.tenant?.slug ?? "";
          resolvedName = meBody.data?.store?.name ?? meBody.data?.tenant?.name ?? "";
          resolvedEmail = meBody.data?.email ?? "";
          if (currentStoreId) setStoreId(currentStoreId);
          if (resolvedSlug) setStoreSlug(resolvedSlug);
        }

        let remoteSettings: Partial<OnlineStoreConfig> | null = null;
        if (currentStoreId) {
          const settingsRes = await fetch(`/api/v1/stores/${currentStoreId}/receipt`, {
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (settingsRes.ok) {
            const sBody = (await settingsRes.json()) as { data?: { online_store_settings?: Partial<OnlineStoreConfig> } };
            if (sBody.data?.online_store_settings && typeof sBody.data.online_store_settings === "object") {
              remoteSettings = sBody.data.online_store_settings;
            }
          }
        }

        const apiCoupons = couponsRes.ok
          ? (((await couponsRes.json()) as { data?: { id: string; code: string; discount_paise?: number; min_order_paise?: number }[] }).data ?? [])
          : [];
        const apiCats = catsRes.ok
          ? (((await catsRes.json()) as { data?: { id: string; name: string; slug?: string; description?: string | null; online_visible?: boolean }[] }).data ?? [])
          : [];

        setConfig((prev) => {
          const next = {
            ...prev,
            ...(remoteSettings ?? {}),
            basics: {
              ...prev.basics,
              ...(remoteSettings?.basics ?? {}),
              storeName: remoteSettings?.basics?.storeName || resolvedName || prev.basics.storeName,
              storeUrlPath: remoteSettings?.basics?.storeUrlPath || resolvedSlug || prev.basics.storeUrlPath,
            },
            contact: {
              ...prev.contact,
              ...(remoteSettings?.contact ?? {}),
              supportEmail: remoteSettings?.contact?.supportEmail || resolvedEmail || prev.contact.supportEmail,
            },
            branding: { ...prev.branding, ...(remoteSettings?.branding ?? {}) },
            hero: { ...prev.hero, ...(remoteSettings?.hero ?? {}) },
            themeConfig: { ...prev.themeConfig, ...(remoteSettings?.themeConfig ?? {}) },
            seo: {
              ...prev.seo,
              ...(remoteSettings?.seo ?? {}),
              metaTitle: remoteSettings?.seo?.metaTitle || (resolvedName ? `${resolvedName} — Online Store` : ""),
            },
            topbarFooter: {
              ...prev.topbarFooter,
              ...(remoteSettings?.topbarFooter ?? {}),
              footerCopyrightText:
                remoteSettings?.topbarFooter?.footerCopyrightText ||
                (resolvedName ? `© ${new Date().getFullYear()} ${resolvedName}. All rights reserved.` : ""),
            },
            social: { ...prev.social, ...(remoteSettings?.social ?? {}) },
            collections:
              remoteSettings?.collections && remoteSettings.collections.length > 0
                ? remoteSettings.collections
                : apiCats.map((cat, idx) => ({
                    id: cat.id,
                    name: cat.name,
                    slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    description: cat.description || "Store category collection",
                    productCount: 0,
                    featured: true,
                    enabled: cat.online_visible !== false,
                    sortOrder: idx + 1,
                  })),
            inviteCodes:
              remoteSettings?.inviteCodes && remoteSettings.inviteCodes.length > 0
                ? remoteSettings.inviteCodes
                : apiCoupons.map((c) => ({
                    id: c.id,
                    code: c.code,
                    discountType: "fixed" as const,
                    discountValue: Math.round((c.discount_paise ?? 0) / 100),
                    minOrderAmount: Math.round((c.min_order_paise ?? 0) / 100),
                    usageCount: 0,
                    maxUsage: 100,
                    expiresAt: "Active",
                    enabled: true,
                  })),
            shipping: { ...prev.shipping, ...(remoteSettings?.shipping ?? {}) },
            shippingMethods:
              remoteSettings?.shippingMethods && remoteSettings.shippingMethods.length > 0
                ? remoteSettings.shippingMethods
                : prev.shippingMethods,
            taxSettings: { ...prev.taxSettings, ...(remoteSettings?.taxSettings ?? {}) },
            taxRates:
              remoteSettings?.taxRates && remoteSettings.taxRates.length > 0
                ? remoteSettings.taxRates
                : prev.taxRates,
            payments: {
              ...prev.payments,
              ...(remoteSettings?.payments ?? {}),
              cod: { ...prev.payments.cod, ...(remoteSettings?.payments?.cod ?? {}) },
              payAtStore: { ...prev.payments.payAtStore, ...(remoteSettings?.payments?.payAtStore ?? {}) },
              upiQr: { ...prev.payments.upiQr, ...(remoteSettings?.payments?.upiQr ?? {}) },
              razorpay: { ...prev.payments.razorpay, ...(remoteSettings?.payments?.razorpay ?? {}) },
              phonepe: { ...prev.payments.phonepe, ...(remoteSettings?.payments?.phonepe ?? {}) },
              paytm: { ...prev.payments.paytm, ...(remoteSettings?.payments?.paytm ?? {}) },
              stripe: { ...prev.payments.stripe, ...(remoteSettings?.payments?.stripe ?? {}) },
            },
          };
          return next;
        });

        if (ordersRes.ok) {
          const oBody = (await ordersRes.json()) as { data?: OnlineOrderRow[] };
          setOrders((oBody.data ?? []).filter((o) => o.fulfillment !== "counter"));
        }

        if (custRes.ok) {
          const cBody = (await custRes.json()) as { data?: CustomerRow[] };
          setCustomers(cBody.data ?? []);
        }
      } catch {
        // ignore network issues
      }
    })();
  }, []);

  const storefrontUrl = useMemo(() => {
    const slug = config.basics.storeUrlPath.trim() || storeSlug;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://retail.sirixo.com";
    return slug ? `${origin}/store?store=${encodeURIComponent(slug)}` : `${origin}/store`;
  }, [config.basics.storeUrlPath, storeSlug]);

  async function saveAllSettings() {
    setSaving(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      if (storeId) {
        const token = await csrfToken();
        await fetch(`/api/v1/stores/${storeId}/receipt`, {
          method: "PUT",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": token,
          },
          body: JSON.stringify({
            online_store_settings: config,
          }),
        });
      }
      setSavedToast("Online Store configuration saved & synced to live storefront.");
      window.setTimeout(() => setSavedToast(null), 3500);
    } finally {
      setSaving(false);
    }
  }

  async function updateOrderStatus(orderId: string, nextStatus: string) {
    const token = await csrfToken();
    const res = await fetch(`/api/v1/orders/${orderId}/transitions`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": token },
      body: JSON.stringify({ to: nextStatus }),
    });
    if (res.ok) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
    }
  }

  const topNavPills: { id: OnlineStoreSectionId; label: string; icon: typeof Store }[] = [
    { id: "settings", label: "Settings", icon: Settings },
    { id: "payments", label: "Payment Gateway", icon: CreditCard },
    { id: "orders", label: "Online Orders", icon: ShoppingBag },
    { id: "collections", label: "Collections", icon: Layers },
    { id: "banners", label: "Banners", icon: ImageIcon },
    { id: "subscribers", label: "Subscribers", icon: Users },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "invite-codes", label: "Invite Codes", icon: Tag },
    { id: "pending-customers", label: "Pending Customers", icon: Clock },
    { id: "guest-customers", label: "Customers without Login", icon: UserMinus },
    { id: "registered-customers", label: "Customers with Login", icon: UserCheck },
    { id: "shipping", label: "Shipping Methods", icon: Truck },
    { id: "taxes", label: "Tax Rates", icon: Percent },
  ];

  const settingsMenu: { id: SettingsSubTab; label: string; icon: typeof Store }[] = [
    { id: "basics", label: "Store basics", icon: Store },
    { id: "contact", label: "Contact", icon: Phone },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "hero", label: "Hero header", icon: ImageIcon },
    { id: "theme", label: "Store Theme", icon: LayoutGrid },
    { id: "seo", label: "SEO", icon: Search },
    { id: "topbar-footer", label: "Topbar & footer", icon: FileText },
    { id: "social", label: "Social links", icon: Share2 },
    { id: "blocks", label: "Homepage blocks", icon: Layers },
  ];

  const sectionTitle = topNavPills.find((item) => item.id === activeSection)?.label ?? "Settings";

  return (
    <div className="space-y-5 pb-12">
      {/* Breadcrumb & Primary Action Header matching Image 2 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>Store</span>
            <span>/</span>
            <span className="text-slate-700">{sectionTitle}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{sectionTitle}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700"
          >
            <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
            Visit Online Store
          </a>
          <button
            type="button"
            onClick={() => void saveAllSettings()}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6c47ff] px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#5a36eb] disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Horizontal quick-jump bar for Online Store modules */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs">
        {topNavPills.map((pill) => {
          const Icon = pill.icon;
          const active = activeSection === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveSection(pill.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                active
                  ? "bg-[#f3efff] text-[#6c47ff] shadow-2xs ring-1 ring-[#6c47ff]/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {pill.label}
            </button>
          );
        })}
      </div>

      {savedToast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{savedToast}</span>
          </div>
          <a href={storefrontUrl} target="_blank" rel="noreferrer" className="underline">
            Preview Live Storefront →
          </a>
        </div>
      ) : null}

      {/* SECTION 1: SETTINGS (Exact Image 2 Vertical Sub-Navigation + Form Canvas) */}
      {activeSection === "settings" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
          {/* Left Sub-Navigation matching Image 2 */}
          <aside className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs h-fit">
            <nav className="space-y-0.5">
              {settingsMenu.map((item) => {
                const Icon = item.icon;
                const isActive = settingsTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettingsTab(item.id)}
                    className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition ${
                      isActive
                        ? "bg-[#f3efff] font-semibold text-[#6c47ff]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-[#6c47ff]" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                    {isActive ? (
                      <span className="absolute right-0 top-1.5 bottom-1.5 w-1 rounded-l-full bg-[#6c47ff]" />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Form Panel matching Image 2 */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
            {settingsTab === "basics" ? (
              <div className="space-y-7">
                {/* Row 1: Online Store Enable, Store Name, Store Theme */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Online Store :</label>
                    <div className="mt-2.5 flex items-center gap-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={config.basics.enabled}
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, enabled: !prev.basics.enabled },
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                          config.basics.enabled ? "bg-[#6c47ff]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition ${
                            config.basics.enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="text-xs font-medium text-slate-700">
                        {config.basics.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      When disabled, the online store pages will be inaccessible.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Store name :</label>
                    <input
                      type="text"
                      value={config.basics.storeName}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          basics: { ...prev.basics, storeName: e.target.value },
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 outline-none focus:border-[#6c47ff] focus:ring-2 focus:ring-[#6c47ff]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Store Theme :</label>
                    <select
                      value={config.basics.storeTheme}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          basics: { ...prev.basics, storeTheme: e.target.value },
                          themeConfig: { ...prev.themeConfig, activeTheme: e.target.value },
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#6c47ff]"
                    >
                      <option value="Modern Supermarket & Retail Theme">Modern Supermarket & Retail Theme</option>
                      <option value="Electronics Theme">Electronics Theme</option>
                      <option value="Hyperlocal Kirana & Express Delivery">Hyperlocal Kirana & Express Delivery</option>
                      <option value="Fashion & Lifestyle Boutique">Fashion & Lifestyle Boutique</option>
                      <option value="Pharmacy & Wellness Store">Pharmacy & Wellness Store</option>
                    </select>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      Choose the active storefront theme. Changes apply immediately to the online store.
                    </p>
                  </div>
                </div>

                {/* Row 2: Currency, Store Default Language, Store Display Currency */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Currency :</label>
                    <select
                      value={config.basics.currency}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          basics: { ...prev.basics, currency: e.target.value },
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#6c47ff]"
                    >
                      <option value="Indian Rupee (₹)">Indian Rupee (₹)</option>
                      <option value="US Dollar ($)">US Dollar ($)</option>
                      <option value="Euro (€)">Euro (€)</option>
                      <option value="British Pound (£)">British Pound (£)</option>
                      <option value="UAE Dirham (AED)">UAE Dirham (AED)</option>
                    </select>
                    <p className="mt-2 text-[11px] leading-relaxed text-amber-600">
                      ⚠ Changing currency will affect both system and online store
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Store Default Language :</label>
                    <select
                      value={config.basics.defaultLanguage}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          basics: { ...prev.basics, defaultLanguage: e.target.value },
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#6c47ff]"
                    >
                      <option value="English">English</option>
                      <option value="Telugu (తెలుగు)">Telugu (తెలుగు)</option>
                      <option value="Hindi (हिन्दी)">Hindi (हिन्दी)</option>
                      <option value="Tamil (தமிழ்)">Tamil (தமிழ்)</option>
                      <option value="Kannada (ಕನ್ನಡ)">Kannada (ಕನ್ನಡ)</option>
                    </select>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      The language the storefront opens in for visitors who have not chosen one.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Store Display Currency :</label>
                    <select
                      value={config.basics.displayCurrency}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          basics: { ...prev.basics, displayCurrency: e.target.value },
                        }))
                      }
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#6c47ff]"
                    >
                      <option value="Same as base currency">Same as base currency</option>
                      <option value="INR (₹)">INR (₹)</option>
                      <option value="USD ($)">USD ($)</option>
                      <option value="EUR (€)">EUR (€)</option>
                    </select>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      Prices are shown in this currency by default. Amounts are still stored in the base currency.
                    </p>
                  </div>
                </div>

                {/* Row 3: Warehouse, Font family, Primary color */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700">Warehouse :</span>
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={config.basics.allWarehouses}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              basics: { ...prev.basics, allWarehouses: e.target.checked },
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300 accent-[#6c47ff]"
                        />
                        All Warehouses
                      </label>
                    </div>
                    {!config.basics.allWarehouses ? (
                      <input
                        type="text"
                        value={config.basics.defaultWarehouse}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, defaultWarehouse: e.target.value },
                          }))
                        }
                        placeholder="Select warehouse name"
                        className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs"
                      />
                    ) : null}
                  </div>

                  <div className=" flex items-center gap-3">
                    <label className="shrink-0 text-xs font-semibold text-slate-700">Font family :</label>
                    <select
                      value={config.basics.fontFamily}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          basics: { ...prev.basics, fontFamily: e.target.value },
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-[#6c47ff]"
                    >
                      <option value="Inter, sans-serif">Inter, sans-serif</option>
                      <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans, sans-serif</option>
                      <option value="Arial, sans-serif">Arial, sans-serif</option>
                      <option value="DM Sans, sans-serif">DM Sans, sans-serif</option>
                      <option value="Poppins, sans-serif">Poppins, sans-serif</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="shrink-0 text-xs font-semibold text-slate-700">Primary color :</label>
                    <div className="flex h-10 flex-1 items-center rounded-lg border border-slate-200 p-1">
                      <input
                        type="color"
                        value={config.basics.primaryColor}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, primaryColor: e.target.value },
                          }))
                        }
                        className="h-full w-full cursor-pointer rounded border-0 bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 4: Secondary color */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <label className="shrink-0 text-xs font-semibold text-slate-700">Secondary color :</label>
                    <div className="flex h-10 flex-1 items-center rounded-lg border border-slate-200 p-1">
                      <input
                        type="color"
                        value={config.basics.secondaryColor}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, secondaryColor: e.target.value },
                          }))
                        }
                        className="h-full w-full cursor-pointer rounded border-0 bg-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Store URL Section matching Image 2 */}
                <div className="border-t border-slate-200/80 pt-6">
                  <h3 className="text-xs font-semibold text-slate-800">Store URL</h3>

                  <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Use root domain :</label>
                      <div className="mt-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={config.basics.useRootDomain}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              basics: { ...prev.basics, useRootDomain: !prev.basics.useRootDomain },
                            }))
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            config.basics.useRootDomain ? "bg-[#6c47ff]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition ${
                              config.basics.useRootDomain ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                        Serve the online store directly from the root of your store domain instead of a sub-path. The admin panel stays available under /app.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Store URL path :</label>
                      <div className="mt-2 flex h-10 overflow-hidden rounded-lg border border-slate-200 focus-within:border-[#6c47ff]">
                        <span className="inline-flex items-center bg-slate-50 px-3 text-xs text-slate-500 border-r border-slate-200">
                          /store?store=
                        </span>
                        <input
                          type="text"
                          value={config.basics.storeUrlPath}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              basics: { ...prev.basics, storeUrlPath: e.target.value },
                            }))
                          }
                          placeholder="online_store"
                          className="w-full px-3 text-xs text-slate-800 outline-none"
                        />
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                        Base path / slug of the online store, e.g. &quot;shop&quot; or &quot;retail-store&quot;. Leave empty for default.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Current store URL :</label>
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={storefrontUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-xs font-medium text-blue-600 hover:underline"
                        >
                          {storefrontUrl}
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(storefrontUrl);
                            setCopiedUrl(true);
                            window.setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded border border-slate-200 px-2 text-[11px] text-slate-600 hover:bg-slate-50"
                        >
                          {copiedUrl ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                          {copiedUrl ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                        Old links keep working: they are redirected to the configured address automatically. Save to apply.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Enterprise Storefront Checkout & Inventory Rules */}
                <div className="border-t border-slate-200/80 pt-6">
                  <h3 className="text-xs font-semibold text-slate-800">Checkout & Live Stock Rules</h3>
                  <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Min Order Amount (₹)</label>
                      <input
                        type="number"
                        value={config.basics.minOrderAmount}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, minOrderAmount: Number(e.target.value) || 0 },
                          }))
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Low Stock Badge Threshold</label>
                      <input
                        type="number"
                        value={config.basics.lowStockBadgeThreshold}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, lowStockBadgeThreshold: Number(e.target.value) || 0 },
                          }))
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-2.5 pt-5 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.basics.guestCheckout}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, guestCheckout: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      Allow Guest Checkout (No OTP required)
                    </label>
                    <label className="flex items-center gap-2.5 pt-5 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.basics.hideOutOfStock}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, hideOutOfStock: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      Auto-hide Out of Stock items
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 2: CONTACT */}
            {settingsTab === "contact" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Store Contact & Customer Support Details</h3>
                  <p className="text-xs text-slate-500">Shown in the storefront header, help drawer, order receipts, and footer.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Customer Support Email</label>
                    <input
                      type="email"
                      value={config.contact.supportEmail}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, supportEmail: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Store Helpline Phone</label>
                    <input
                      type="text"
                      value={config.contact.supportPhone}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, supportPhone: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">WhatsApp Order & Support Number</label>
                    <input
                      type="text"
                      value={config.contact.whatsappNumber}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, whatsappNumber: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Store Opening Hours</label>
                    <input
                      type="text"
                      value={config.contact.openingHoursText}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, openingHoursText: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Physical Store Pickup Address</label>
                    <input
                      type="text"
                      value={config.contact.storeAddress}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, storeAddress: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">City & State</label>
                    <input
                      type="text"
                      value={`${config.contact.city}, ${config.contact.state}`}
                      onChange={(e) => {
                        const [city = "", state = ""] = e.target.value.split(",").map((s) => s.trim());
                        setConfig((p) => ({ ...p, contact: { ...p.contact, city, state } }));
                      }}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">PIN / Postal Code</label>
                    <input
                      type="text"
                      value={config.contact.postalCode}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, postalCode: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.contact.enableFloatingWhatsapp}
                    onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, enableFloatingWhatsapp: e.target.checked } }))}
                    className="h-4 w-4 rounded accent-[#6c47ff]"
                  />
                  Show floating WhatsApp chat button on storefront
                </label>

                {/* Google Maps API Key & Live Location Tracking */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">
                          Google Maps API &amp; Live Tracking Settings
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Enables live interactive driver maps on customer checkout &amp; tracking, and turn-by-turn routing for riders.
                        </p>
                      </div>
                    </div>
                    {config.contact.googleMapsApiKey ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={11} />
                        Active API Key
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                        Radar Mode (Fallback)
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Google Maps JavaScript &amp; Places API Key
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="AIzaSy..."
                        value={config.contact.googleMapsApiKey}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            contact: { ...p.contact, googleMapsApiKey: e.target.value.trim() },
                          }))
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-[#6c47ff] focus:ring-1 focus:ring-[#6c47ff]"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Required Google Cloud APIs: Maps JavaScript API, Directions API, and Geocoding API.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Store Origin Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={config.contact.storeLatitude ?? 12.9716}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            contact: { ...p.contact, storeLatitude: parseFloat(e.target.value) || 0 },
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono text-slate-800 focus:border-[#6c47ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Store Origin Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={config.contact.storeLongitude ?? 77.5946}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            contact: { ...p.contact, storeLongitude: parseFloat(e.target.value) || 0 },
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono text-slate-800 focus:border-[#6c47ff]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            setConfig((p) => ({
                              ...p,
                              contact: {
                                ...p.contact,
                                storeLatitude: pos.coords.latitude,
                                storeLongitude: pos.coords.longitude,
                              },
                            }));
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 shadow-2xs transition"
                    >
                      <Navigation size={13} />
                      <span>Detect &amp; Pin Current Store GPS</span>
                    </button>

                    <a
                      href="https://console.cloud.google.com/google/maps-apis/overview"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                    >
                      <span>Google Cloud Console</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 3: BRANDING */}
            {settingsTab === "branding" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Brand Identity, Logos & Visual Tokens</h3>
                  <p className="text-xs text-slate-500">Customize logos, favicons, button shapes, and card elevation across the online store.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Store Logo URL (Light Header)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={config.branding.logoUrl}
                      onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, logoUrl: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Favicon URL (32x32 PNG/ICO)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={config.branding.faviconUrl}
                      onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, faviconUrl: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Store Brand Tagline</label>
                    <input
                      type="text"
                      value={config.branding.brandTagline}
                      onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, brandTagline: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Corner Radius Style</label>
                    <select
                      value={config.branding.borderRadiusStyle}
                      onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, borderRadiusStyle: e.target.value as "sharp" | "rounded" | "pill" } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    >
                      <option value="sharp">Sharp & Structured (4px)</option>
                      <option value="rounded">Modern Rounded (12px)</option>
                      <option value="pill">Soft Pill & Friendly (20px)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Product Card Elevation</label>
                    <select
                      value={config.branding.cardShadowStyle}
                      onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, cardShadowStyle: e.target.value as "flat" | "subtle" | "elevated" } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    >
                      <option value="flat">Flat Bordered</option>
                      <option value="subtle">Subtle Hover Lift</option>
                      <option value="elevated">Elevated Studio Shadow</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 4: HERO HEADER */}
            {settingsTab === "hero" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Hero Header Banner</h3>
                    <p className="text-xs text-slate-500">Configure the main above-the-fold campaign banner on your online storefront.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.hero.enabled}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, enabled: e.target.checked } }))}
                      className="h-4 w-4 rounded accent-[#6c47ff]"
                    />
                    Show Hero Header
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Eyebrow Badge Text</label>
                    <input
                      type="text"
                      value={config.hero.eyebrowBadge}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, eyebrowBadge: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Hero Layout Variant</label>
                    <select
                      value={config.hero.layout}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, layout: e.target.value as "split" | "fullbleed" | "carousel" | "minimal" } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    >
                      <option value="split">Split Showcase + Promo Cards</option>
                      <option value="fullbleed">Full-Width Cinema Banner</option>
                      <option value="carousel">Multi-Slide Campaign Carousel</option>
                      <option value="minimal">Compact Express Search Header</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Main Headline</label>
                    <input
                      type="text"
                      value={config.hero.headline}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, headline: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Sub-headline Description</label>
                    <textarea
                      rows={2}
                      value={config.hero.subheadline}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, subheadline: e.target.value } }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Primary CTA Button Text</label>
                    <input
                      type="text"
                      value={config.hero.primaryCtaLabel}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, primaryCtaLabel: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Promo Offer Strip Text</label>
                    <input
                      type="text"
                      value={config.hero.promoHighlightText}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, promoHighlightText: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 5: STORE THEME & PRODUCT CARDS */}
            {settingsTab === "theme" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Store Theme & Product Card Controls</h3>
                  <p className="text-xs text-slate-500">Fine-tune product grid density, MRP savings badges, PIN code serviceability, and pickup options.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Desktop Grid Columns</label>
                    <select
                      value={config.themeConfig.productGridColumnsDesktop}
                      onChange={(e) => setConfig((p) => ({ ...p, themeConfig: { ...p.themeConfig, productGridColumnsDesktop: Number(e.target.value) as 3 | 4 | 5 } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    >
                      <option value={3}>3 Columns (Large Cards)</option>
                      <option value={4}>4 Columns (Standard Retail)</option>
                      <option value={5}>5 Columns (High Density Supermarket)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Product Card Layout</label>
                    <select
                      value={config.themeConfig.productCardVariant}
                      onChange={(e) => setConfig((p) => ({ ...p, themeConfig: { ...p.themeConfig, productCardVariant: e.target.value as "modern-supermarket" | "electronics-spec" | "minimal-fashion" | "compact-list" } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    >
                      <option value="modern-supermarket">Modern Supermarket (+ Add Stepper)</option>
                      <option value="electronics-spec">Electronics Spec Card</option>
                      <option value="minimal-fashion">Minimalist Editorial</option>
                      <option value="compact-list">Quick Wholesale Order List</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {[
                    { key: "showMrpStrike", label: "Show Strikethrough MRP" },
                    { key: "showDiscountPercentageBadge", label: "Show % OFF Savings Badge" },
                    { key: "showBrandOnCard", label: "Show Brand Name Above Title" },
                    { key: "showQuickViewModal", label: "Enable Product Quick-View" },
                    { key: "showAddToWishlist", label: "Enable Wishlist Heart Button" },
                    { key: "stickyHeader", label: "Sticky Search & Category Header" },
                    { key: "enablePinCodeChecker", label: "Enable Delivery PIN Code Checker" },
                    { key: "enableDeliverySlotPicker", label: "Enable Delivery Time-Slot Picker" },
                    { key: "enableStorePickupToggle", label: "Enable Delivery / Store Pickup Switch" },
                  ].map((toggle) => (
                    <label key={toggle.key} className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(config.themeConfig[toggle.key as keyof typeof config.themeConfig])}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            themeConfig: { ...p.themeConfig, [toggle.key]: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      {toggle.label}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 6: SEO */}
            {settingsTab === "seo" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Search Engine Optimization (SEO) & Analytics Pixels</h3>
                  <p className="text-xs text-slate-500">Control how your store appears on Google Search, WhatsApp link previews, and ad pixels.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Homepage Meta Title</label>
                    <input
                      type="text"
                      value={config.seo.metaTitle}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, metaTitle: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Meta Description</label>
                    <textarea
                      rows={2}
                      value={config.seo.metaDescription}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, metaDescription: e.target.value } }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Google Analytics 4 Measurement ID</label>
                    <input
                      type="text"
                      placeholder="G-XXXXXXXXXX"
                      value={config.seo.googleAnalyticsId}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, googleAnalyticsId: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Meta (Facebook) Pixel ID</label>
                    <input
                      type="text"
                      placeholder="123456789012345"
                      value={config.seo.metaPixelId}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, metaPixelId: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 7: TOPBAR & FOOTER */}
            {settingsTab === "topbar-footer" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Announcement Topbar & Store Footer</h3>
                  <p className="text-xs text-slate-500">Configure top promotional announcement bar, legal policies, and footer links.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Top Announcement Bar Message</label>
                    <input
                      type="text"
                      value={config.topbarFooter.topbarText}
                      onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, topbarText: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Footer About Store Bio</label>
                    <textarea
                      rows={2}
                      value={config.topbarFooter.footerAboutText}
                      onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, footerAboutText: e.target.value } }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Return & Replacement Policy Summary</label>
                    <textarea
                      rows={2}
                      value={config.topbarFooter.refundPolicyText}
                      onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, refundPolicyText: e.target.value } }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Copyright Line</label>
                    <input
                      type="text"
                      value={config.topbarFooter.footerCopyrightText}
                      onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, footerCopyrightText: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 8: SOCIAL LINKS */}
            {settingsTab === "social" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Social Media Profiles & Sharing</h3>
                  <p className="text-xs text-slate-500">Connect your store social accounts and enable 1-click WhatsApp product sharing.</p>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {[
                    { key: "instagram", label: "Instagram URL" },
                    { key: "facebook", label: "Facebook Page URL" },
                    { key: "twitterX", label: "X (Twitter) URL" },
                    { key: "youtube", label: "YouTube Channel URL" },
                    { key: "whatsappChannel", label: "WhatsApp Broadcast Channel URL" },
                    { key: "telegram", label: "Telegram Channel URL" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-slate-700">{field.label}</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={String(config.social[field.key as keyof typeof config.social] ?? "")}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            social: { ...p.social, [field.key]: e.target.value },
                          }))
                        }
                        className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 9: HOMEPAGE BLOCKS */}
            {settingsTab === "blocks" ? (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Modular Homepage Sections Builder</h3>
                  <p className="text-xs text-slate-500">Toggle, reorder, and customize item limits for every section on your online storefront.</p>
                </div>
                <div className="space-y-2.5">
                  {config.blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[11px] font-semibold text-slate-500 shadow-2xs">
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{block.title}</div>
                          <div className="text-[11px] text-slate-500">{block.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span>Max items:</span>
                          <input
                            type="number"
                            value={block.itemLimit}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 1;
                              setConfig((p) => ({
                                ...p,
                                blocks: p.blocks.map((b) => (b.id === block.id ? { ...b, itemLimit: val } : b)),
                              }));
                            }}
                            className="h-8 w-16 rounded border border-slate-200 bg-white px-2 text-center text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((p) => ({
                              ...p,
                              blocks: p.blocks.map((b) => (b.id === block.id ? { ...b, enabled: !b.enabled } : b)),
                            }))
                          }
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            block.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {block.enabled ? "Visible" : "Hidden"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* SECTION 2: ONLINE STORE PAYMENT GATEWAYS & METHODS */}
      {activeSection === "payments" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-[#6c47ff]">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Storefront Checkout Payment Gateways & Methods
                    </h2>
                    <p className="text-xs text-slate-500">
                      Configure payment methods shown to online customers during storefront checkout. (For in-store POS UPI QR & cash billing, configure in Settings → Payment Gateways)
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void saveAllSettings()}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6c47ff] px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5b3ae6] disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Payment Settings"}
              </button>
            </div>

            {/* Offline & Storefront Native Methods */}
            <div className="mt-6 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Doorstep & Counter Payment Methods
              </h3>

              {/* Pay on Delivery (COD) */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-slate-900">Pay on Delivery (COD)</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        config.payments.cod.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                      }`}>
                        {config.payments.cod.enabled ? "Active on Storefront" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Allows customers to place orders without immediate digital payment and pay cash/UPI directly upon delivery.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={config.payments.cod.enabled}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          payments: {
                            ...p.payments,
                            cod: { ...p.payments.cod, enabled: e.target.checked },
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 peer-focus:outline-none peer-checked:bg-[#6c47ff] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                {config.payments.cod.enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 pt-3 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Checkout Display Title</label>
                      <input
                        type="text"
                        value={config.payments.cod.displayName}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              cod: { ...p.payments.cod, displayName: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Customer Instructions</label>
                      <input
                        type="text"
                        value={config.payments.cod.description}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              cod: { ...p.payments.cod, description: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Pay at Store (Pickup Counter) */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-slate-900">Pay at Store Counter</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        config.payments.payAtStore.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                      }`}>
                        {config.payments.payAtStore.enabled ? "Active on Storefront" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Allows customers picking up in-store to generate a pickup QR code and settle payment at the cashier counter.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={config.payments.payAtStore.enabled}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          payments: {
                            ...p.payments,
                            payAtStore: { ...p.payments.payAtStore, enabled: e.target.checked },
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 peer-focus:outline-none peer-checked:bg-[#6c47ff] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                {config.payments.payAtStore.enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 pt-3 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Checkout Display Title</label>
                      <input
                        type="text"
                        value={config.payments.payAtStore.displayName}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              payAtStore: { ...p.payments.payAtStore, displayName: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Customer Instructions</label>
                      <input
                        type="text"
                        value={config.payments.payAtStore.description}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              payAtStore: { ...p.payments.payAtStore, description: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Instant UPI QR for Storefront */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-slate-900">Direct UPI QR Payment</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        config.payments.upiQr.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                      }`}>
                        {config.payments.upiQr.enabled ? "Active on Storefront" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Renders dynamic UPI payment intent and QR code (Google Pay, PhonePe, Paytm, BHIM) on customer checkout.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={config.payments.upiQr.enabled}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          payments: {
                            ...p.payments,
                            upiQr: { ...p.payments.upiQr, enabled: e.target.checked },
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 peer-focus:outline-none peer-checked:bg-[#6c47ff] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                {config.payments.upiQr.enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 pt-3 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Store UPI ID / VPA</label>
                      <input
                        type="text"
                        placeholder="e.g. yourstore@okhdfcbank"
                        value={config.payments.upiQr.vpa}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              upiQr: { ...p.payments.upiQr, vpa: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Merchant / Payee Name</label>
                      <input
                        type="text"
                        placeholder="Store Trade Name"
                        value={config.payments.upiQr.merchantName}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              upiQr: { ...p.payments.upiQr, merchantName: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Checkout Display Label</label>
                      <input
                        type="text"
                        value={config.payments.upiQr.displayName}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              upiQr: { ...p.payments.upiQr, displayName: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Prepaid Online Payment Gateways */}
            <div className="mt-8 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Online Payment Gateways (Cards, Netbanking, Wallets)
              </h3>

              {/* Razorpay */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-slate-900">Razorpay Payment Gateway</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        config.payments.razorpay.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                      }`}>
                        {config.payments.razorpay.enabled ? `Active (${config.payments.razorpay.mode.toUpperCase()})` : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Accept credit/debit cards, net banking, UPI, and PayLater on online storefront.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={config.payments.razorpay.enabled}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          payments: {
                            ...p.payments,
                            razorpay: { ...p.payments.razorpay, enabled: e.target.checked },
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 peer-focus:outline-none peer-checked:bg-[#6c47ff] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                {config.payments.razorpay.enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 pt-3 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Mode</label>
                      <select
                        value={config.payments.razorpay.mode}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              razorpay: { ...p.payments.razorpay, mode: e.target.value as "test" | "live" },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      >
                        <option value="test">Test Mode (Sandbox)</option>
                        <option value="live">Live Mode (Production)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Key ID</label>
                      <input
                        type="text"
                        placeholder="rzp_test_..."
                        value={config.payments.razorpay.keyId}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              razorpay: { ...p.payments.razorpay, keyId: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Key Secret</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={config.payments.razorpay.keySecret}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              razorpay: { ...p.payments.razorpay, keySecret: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* PhonePe */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 transition hover:bg-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-semibold text-slate-900">PhonePe Payment Gateway</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        config.payments.phonepe.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                      }`}>
                        {config.payments.phonepe.enabled ? `Active (${config.payments.phonepe.mode.toUpperCase()})` : "Disabled"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Standard PhonePe PG integration for UPI, card, and wallet flows.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={config.payments.phonepe.enabled}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          payments: {
                            ...p.payments,
                            phonepe: { ...p.payments.phonepe, enabled: e.target.checked },
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 peer-focus:outline-none peer-checked:bg-[#6c47ff] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                  </label>
                </div>
                {config.payments.phonepe.enabled ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4 pt-3 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Mode</label>
                      <select
                        value={config.payments.phonepe.mode}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              phonepe: { ...p.payments.phonepe, mode: e.target.value as "test" | "live" },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      >
                        <option value="test">UAT / Test</option>
                        <option value="live">Production</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Merchant ID</label>
                      <input
                        type="text"
                        placeholder="MERCHANTUAT"
                        value={config.payments.phonepe.merchantId}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              phonepe: { ...p.payments.phonepe, merchantId: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Salt Key</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={config.payments.phonepe.saltKey}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              phonepe: { ...p.payments.phonepe, saltKey: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600">Salt Index</label>
                      <input
                        type="text"
                        placeholder="1"
                        value={config.payments.phonepe.saltIndex}
                        onChange={(e) =>
                          setConfig((p) => ({
                            ...p,
                            payments: {
                              ...p.payments,
                              phonepe: { ...p.payments.phonepe, saltIndex: e.target.value },
                            },
                          }))
                        }
                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* SECTION 3: ONLINE ORDERS */}
      {activeSection === "orders" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Online Storefront Orders</h2>
              <p className="text-xs text-slate-500">Manage incoming web & WhatsApp orders, assign delivery riders, or mark ready for pickup.</p>
            </div>
            <div className="flex items-center gap-1.5">
              {["all", "placed", "confirmed", "packed", "completed", "cancelled"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                    orderFilter === st ? "bg-[#6c47ff] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-400">
                  <th className="pb-3">Order</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Fulfillment</th>
                  <th className="pb-3">Payment</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders
                  .filter((o) => orderFilter === "all" || o.status === orderFilter)
                  .map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 font-mono font-semibold text-slate-900">
                        {order.order_number ?? `#${order.id.slice(0, 8)}`}
                      </td>
                      <td className="py-3.5">
                        <div className="font-semibold text-slate-800">{order.customer_name || "Online Shopper"}</div>
                        <div className="text-[11px] text-slate-400">{order.customer_phone || "Web Checkout"}</div>
                      </td>
                      <td className="py-3.5 capitalize text-slate-600">{order.fulfillment_mode ?? "delivery"}</td>
                      <td className="py-3.5 uppercase text-slate-600">{order.payment_method ?? "cod"}</td>
                      <td className="py-3.5 font-semibold text-slate-900">₹{((order.total_paise ?? 0) / 100).toFixed(2)}</td>
                      <td className="py-3.5">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-indigo-700">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <select
                          value={order.status}
                          onChange={(e) => void updateOrderStatus(order.id, e.target.value)}
                          className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium"
                        >
                          <option value="placed">Placed</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="packed">Packed</option>
                          <option value="out_for_delivery">Out for Delivery</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No online orders matching the current filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* SECTION 4: COLLECTIONS */}
      {activeSection === "collections" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Curated Product Collections</h2>
              <p className="text-xs text-slate-500">Group products into seasonal or thematic collections for your storefront landing page.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Collection title (e.g. Monsoon Essentials)"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
              />
              <input
                type="text"
                placeholder="Short subtitle"
                value={newCollectionDesc}
                onChange={(e) => setNewCollectionDesc(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCollectionName.trim()) return;
                  setConfig((p) => ({
                    ...p,
                    collections: [
                      ...p.collections,
                      {
                        id: `col-${Date.now()}`,
                        name: newCollectionName.trim(),
                        slug: newCollectionName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                        description: newCollectionDesc.trim() || "Curated storefront collection",
                        productCount: 12,
                        featured: true,
                        enabled: true,
                        sortOrder: p.collections.length + 1,
                      },
                    ],
                  }));
                  setNewCollectionName("");
                  setNewCollectionDesc("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Collection
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {config.collections.map((col) => (
              <div key={col.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{col.name}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">/{col.slug}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{col.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((p) => ({
                        ...p,
                        collections: p.collections.map((c) => (c.id === col.id ? { ...c, enabled: !c.enabled } : c)),
                      }))
                    }
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      col.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {col.enabled ? "Active" : "Paused"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((p) => ({
                        ...p,
                        collections: p.collections.filter((c) => c.id !== col.id),
                      }))
                    }
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* SECTION 5: BANNERS */}
      {activeSection === "banners" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Promotional Campaign Banners</h2>
              <p className="text-xs text-slate-500">Manage hero sliders, mid-page festival banners, and bank offer strips.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Banner headline"
                value={newBannerTitle}
                onChange={(e) => setNewBannerTitle(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
              />
              <input
                type="text"
                placeholder="Offer subtitle"
                value={newBannerSubtitle}
                onChange={(e) => setNewBannerSubtitle(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBannerTitle.trim()) return;
                  setConfig((p) => ({
                    ...p,
                    banners: [
                      ...p.banners,
                      {
                        id: `ban-${Date.now()}`,
                        title: newBannerTitle.trim(),
                        subtitle: newBannerSubtitle.trim() || "Special online storefront promotion",
                        ctaText: "Shop Now",
                        ctaLink: "#catalog",
                        placement: "home_top",
                        badgeText: "NEW CAMPAIGN",
                        bgColor: "#4f46e5",
                        enabled: true,
                      },
                    ],
                  }));
                  setNewBannerTitle("");
                  setNewBannerSubtitle("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Banner
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {config.banners.map((ban) => (
              <div key={ban.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl shrink-0" style={{ backgroundColor: ban.bgColor }} />
                  <div>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{ban.badgeText}</span>
                    <h4 className="mt-1 text-sm font-semibold text-slate-900">{ban.title}</h4>
                    <p className="text-xs text-slate-500">{ban.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((p) => ({
                        ...p,
                        banners: p.banners.map((b) => (b.id === ban.id ? { ...b, enabled: !b.enabled } : b)),
                      }))
                    }
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      ban.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {ban.enabled ? "Live" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, banners: p.banners.filter((b) => b.id !== ban.id) }))}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* SECTION 6: SUBSCRIBERS */}
      {activeSection === "subscribers" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Newsletter & WhatsApp Deal Subscribers</h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-400">
                <th className="pb-2.5">Email</th>
                <th className="pb-2.5">WhatsApp / Phone</th>
                <th className="pb-2.5">Source</th>
                <th className="pb-2.5">Subscribed On</th>
                <th className="pb-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {config.subscribers.map((sub) => (
                <tr key={sub.id}>
                  <td className="py-3 font-medium text-slate-900">{sub.email}</td>
                  <td className="py-3 text-slate-600">{sub.phone}</td>
                  <td className="py-3 text-slate-500">{sub.source}</td>
                  <td className="py-3 text-slate-500">{sub.subscribedAt}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {sub.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* SECTION 7: MESSAGES */}
      {activeSection === "messages" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Customer Inquiries & Support Messages</h2>
          <div className="space-y-3">
            {config.messages.map((msg) => (
              <div key={msg.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-900">{msg.subject}</span>
                    <div className="text-xs text-slate-500">
                      {msg.customerName} · {msg.phone} · {msg.email}
                    </div>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-indigo-700">
                    {msg.status}
                  </span>
                </div>
                <p className="mt-2.5 text-xs text-slate-700">{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* SECTION 8: INVITE & PROMO CODES */}
      {activeSection === "invite-codes" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Invite & Storefront Promo Codes</h2>
              <p className="text-xs text-slate-500">Create referral invite codes and instant checkout discount coupons.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Code (e.g. SAVE15)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-mono uppercase"
              />
              <input
                type="number"
                placeholder="Value"
                value={newCodeValue}
                onChange={(e) => setNewCodeValue(e.target.value)}
                className="h-9 w-24 rounded-lg border border-slate-200 px-3 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCode.trim()) return;
                  setConfig((p) => ({
                    ...p,
                    inviteCodes: [
                      ...p.inviteCodes,
                      {
                        id: `inv-${Date.now()}`,
                        code: newCode.trim(),
                        discountType: "percentage",
                        discountValue: Number(newCodeValue) || 10,
                        minOrderAmount: 299,
                        usageCount: 0,
                        maxUsage: 500,
                        expiresAt: "2026-12-31",
                        enabled: true,
                      },
                    ],
                  }));
                  setNewCode("");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Create Code
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {config.inviteCodes.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-semibold text-indigo-700">{inv.code}</span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {inv.discountType === "free_shipping"
                      ? "Free Delivery"
                      : inv.discountType === "percentage"
                      ? `${inv.discountValue}% OFF`
                      : `₹${inv.discountValue} OFF`}
                  </span>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  Min Order: ₹{inv.minOrderAmount} · Used: {inv.usageCount}/{inv.maxUsage}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* SECTION 9, 10, 11: CUSTOMER SEGMENTS (Pending, Guest, With Login) */}
      {activeSection === "pending-customers" ||
      activeSection === "guest-customers" ||
      activeSection === "registered-customers" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            {activeSection === "pending-customers"
              ? "Pending B2B / Wholesale Customer Approvals"
              : activeSection === "guest-customers"
              ? "Customers Without Login (Express Guest Checkout)"
              : "Registered Storefront Customers (With OTP / Account Login)"}
          </h2>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-400">
                <th className="pb-2.5">Customer Name</th>
                <th className="pb-2.5">Phone</th>
                <th className="pb-2.5">Email</th>
                <th className="pb-2.5">Loyalty Points</th>
                <th className="pb-2.5">Account Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="py-3 text-slate-600">{c.phone}</td>
                  <td className="py-3 text-slate-500">{c.email || "—"}</td>
                  <td className="py-3 font-semibold text-indigo-700">{c.loyalty_points ?? 0} pts</td>
                  <td className="py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      {activeSection === "guest-customers" ? "Guest Shopper" : "Verified Member"}
                    </span>
                  </td>
                </tr>
              ))}
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No customers in this segment yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* SECTION 12: SHIPPING METHODS & DELIVERY CHARGES */}
      {activeSection === "shipping" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Delivery Charges & Shipping Rules</h2>
                  <p className="text-xs text-slate-500">
                    Manage standard delivery fees, free shipping thresholds, packaging fees, and minimum order requirements for your storefront.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void saveAllSettings()}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6c47ff] px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5b3ae6] disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Delivery Settings"}
              </button>
            </div>

            {/* Storewide Delivery Fee Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Storewide Delivery Charges (Applied at Checkout)
              </h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <label className="block text-xs font-semibold text-slate-700">Standard Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={config.shipping.standardDeliveryFee}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        shipping: { ...p.shipping, standardDeliveryFee: Number(e.target.value) || 0 },
                      }))
                    }
                    className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Charged if order is below free delivery threshold</p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <label className="block text-xs font-semibold text-slate-700">Free Delivery Above (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={config.shipping.freeDeliveryAbove}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        shipping: { ...p.shipping, freeDeliveryAbove: Number(e.target.value) || 0 },
                      }))
                    }
                    className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Orders above this amount receive free delivery</p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Packaging Fee (₹)</label>
                    <input
                      type="checkbox"
                      checked={config.shipping.enablePackagingFee}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          shipping: { ...p.shipping, enablePackagingFee: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded accent-[#6c47ff]"
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    disabled={!config.shipping.enablePackagingFee}
                    value={config.shipping.packagingFee}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        shipping: { ...p.shipping, packagingFee: Number(e.target.value) || 0 },
                      }))
                    }
                    className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 disabled:opacity-50"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Bag and safety tamper packaging charge</p>
                </div>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                  <label className="block text-xs font-semibold text-slate-700">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={config.shipping.minOrderAmount}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        shipping: { ...p.shipping, minOrderAmount: Number(e.target.value) || 0 },
                        basics: { ...p.basics, minOrderAmount: Number(e.target.value) || 0 },
                      }))
                    }
                    className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">Cart must reach this subtotal to checkout (0 = any)</p>
                </div>
              </div>
            </div>

            {/* Hyperlocal Zones & Custom Delivery Methods */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Delivery Zones & Custom Shipping Methods
              </h3>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-6 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <input
                  type="text"
                  placeholder="Method Name (e.g. Standard Delivery)"
                  value={newShippingName}
                  onChange={(e) => setNewShippingName(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="PINs / Zone (e.g. 560001, 560038)"
                  value={newShippingZone}
                  onChange={(e) => setNewShippingZone(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                />
                <input
                  type="number"
                  placeholder="Fee ₹"
                  value={newShippingFee}
                  onChange={(e) => setNewShippingFee(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                />
                <input
                  type="number"
                  placeholder="Free above ₹"
                  value={newShippingFreeAbove}
                  onChange={(e) => setNewShippingFreeAbove(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newShippingName.trim()) return;
                    setConfig((p) => ({
                      ...p,
                      shippingMethods: [
                        ...p.shippingMethods,
                        {
                          id: `shp-${Date.now()}`,
                          name: newShippingName.trim(),
                          zone: newShippingZone.trim() || "All Local PINs",
                          pinCodes: "All",
                          etaText: newShippingEta || "45–60 mins",
                          feeAmount: Number(newShippingFee) || 0,
                          freeAboveAmount: Number(newShippingFreeAbove) || 499,
                          codAvailable: true,
                          enabled: true,
                        },
                      ],
                    }));
                    setNewShippingName("");
                    setNewShippingZone("");
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#5b3ae6] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Method
                </button>
              </div>

              <div className="space-y-3">
                {config.shippingMethods.map((shp) => (
                  <div key={shp.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{shp.name}</span>
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{shp.etaText}</span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Active</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Zone / Area: <span className="font-medium text-slate-700">{shp.zone}</span> · PIN Codes: <span className="font-medium text-slate-700">{shp.pinCodes}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right text-xs">
                        <div className="font-semibold text-slate-900">{shp.feeAmount === 0 ? "FREE" : `₹${shp.feeAmount}`}</div>
                        <div className="text-[11px] text-slate-400">Free above ₹{shp.freeAboveAmount}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((p) => ({
                            ...p,
                            shippingMethods: p.shippingMethods.filter((s) => s.id !== shp.id),
                          }))
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                        title="Delete shipping method"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* SECTION 13: STOREFRONT GST & TAX RATES */}
      {activeSection === "taxes" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Storefront GST & Tax Configuration</h2>
                  <p className="text-xs text-slate-500">
                    Configure CGST & SGST rates, pricing mode (inclusive vs exclusive), and category HSN slabs applied when customers place orders on your storefront.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void saveAllSettings()}
                disabled={saving}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6c47ff] px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-[#5b3ae6] disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save GST Settings"}
              </button>
            </div>

            {/* Default GST Calculation Card */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-5 space-y-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Default Storefront GST Rates (Applied to Online Orders)
              </h3>

              {/* Quick Slab Presets */}
              <div>
                <span className="text-[11px] font-medium text-slate-500">Quick Standard GST Presets:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { label: "0% GST (Exempt)", cgst: 0, sgst: 0 },
                    { label: "5% GST (2.5% CGST + 2.5% SGST)", cgst: 2.5, sgst: 2.5 },
                    { label: "12% GST (6% CGST + 6% SGST)", cgst: 6, sgst: 6 },
                    { label: "18% GST (9% CGST + 9% SGST)", cgst: 9, sgst: 9 },
                    { label: "28% GST (14% CGST + 14% SGST)", cgst: 14, sgst: 14 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setConfig((p) => ({
                          ...p,
                          taxSettings: {
                            ...p.taxSettings,
                            defaultCgstPct: preset.cgst,
                            defaultSgstPct: preset.sgst,
                            defaultIgstPct: preset.cgst + preset.sgst,
                          },
                        }))
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                        config.taxSettings.defaultCgstPct === preset.cgst && config.taxSettings.defaultSgstPct === preset.sgst
                          ? "border-[#6c47ff] bg-[#f3efff] text-[#6c47ff]"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom CGST & SGST Inputs */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <label className="block text-xs font-semibold text-slate-700">CGST Rate (%)</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      value={config.taxSettings.defaultCgstPct}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          taxSettings: {
                            ...p.taxSettings,
                            defaultCgstPct: Number(e.target.value) || 0,
                            defaultIgstPct: (Number(e.target.value) || 0) + p.taxSettings.defaultSgstPct,
                          },
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-900"
                    />
                    <span className="text-xs font-semibold text-slate-500">%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Central Goods & Services Tax</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <label className="block text-xs font-semibold text-slate-700">SGST Rate (%)</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="50"
                      value={config.taxSettings.defaultSgstPct}
                      onChange={(e) =>
                        setConfig((p) => ({
                          ...p,
                          taxSettings: {
                            ...p.taxSettings,
                            defaultSgstPct: Number(e.target.value) || 0,
                            defaultIgstPct: p.taxSettings.defaultCgstPct + (Number(e.target.value) || 0),
                          },
                        }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-900"
                    />
                    <span className="text-xs font-semibold text-slate-500">%</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">State Goods & Services Tax</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <label className="block text-xs font-semibold text-slate-700">Total Tax Slab</label>
                  <div className="mt-1.5 h-9 flex items-center px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-[#6c47ff]">
                    {config.taxSettings.defaultCgstPct + config.taxSettings.defaultSgstPct}% Total GST
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Combined CGST + SGST applied on online cart</p>
                </div>
              </div>

              {/* Pricing Mode: Inclusive vs Exclusive */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <span className="text-xs font-semibold text-slate-800">Tax Pricing Mode on Storefront:</span>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className={`flex items-start gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                    config.taxSettings.inclusiveInMrp ? "border-[#6c47ff] bg-[#f3efff]/40" : "border-slate-200 bg-slate-50/40"
                  }`}>
                    <input
                      type="radio"
                      name="inclusiveInMrp"
                      checked={config.taxSettings.inclusiveInMrp}
                      onChange={() =>
                        setConfig((p) => ({
                          ...p,
                          taxSettings: { ...p.taxSettings, inclusiveInMrp: true },
                        }))
                      }
                      className="mt-0.5 h-4 w-4 text-[#6c47ff] accent-[#6c47ff]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Inclusive of Tax (MRP includes GST)</div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Recommended for retail grocery & supermarket stores. Item prices already include CGST & SGST. Tax breakdown is displayed transparently on invoice & receipt.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                    !config.taxSettings.inclusiveInMrp ? "border-[#6c47ff] bg-[#f3efff]/40" : "border-slate-200 bg-slate-50/40"
                  }`}>
                    <input
                      type="radio"
                      name="inclusiveInMrp"
                      checked={!config.taxSettings.inclusiveInMrp}
                      onChange={() =>
                        setConfig((p) => ({
                          ...p,
                          taxSettings: { ...p.taxSettings, inclusiveInMrp: false },
                        }))
                      }
                      className="mt-0.5 h-4 w-4 text-[#6c47ff] accent-[#6c47ff]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Exclusive of Tax (+GST added at checkout)</div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Item prices are net. CGST & SGST are calculated and added as an additional line item to the customer bill during cart checkout.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Category Tax Slabs */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tax Slabs by HSN Category
                </h3>
              </div>

              {/* Add Slab Row */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-6 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <input
                  type="text"
                  placeholder="Slab Name (e.g. Dairy 5%)"
                  value={newTaxName}
                  onChange={(e) => setNewTaxName(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="HSN (e.g. 0401)"
                  value={newTaxHsn}
                  onChange={(e) => setNewTaxHsn(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                />
                <input
                  type="number"
                  placeholder="CGST %"
                  value={newTaxCgst}
                  onChange={(e) => setNewTaxCgst(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                />
                <input
                  type="number"
                  placeholder="SGST %"
                  value={newTaxSgst}
                  onChange={(e) => setNewTaxSgst(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTaxName.trim()) return;
                    const cgst = Number(newTaxCgst) || 0;
                    const sgst = Number(newTaxSgst) || 0;
                    setConfig((p) => ({
                      ...p,
                      taxRates: [
                        ...p.taxRates,
                        {
                          id: `tax-${Date.now()}`,
                          name: newTaxName.trim(),
                          hsnPrefix: newTaxHsn.trim() || "0000",
                          cgstPct: cgst,
                          sgstPct: sgst,
                          igstPct: cgst + sgst,
                          cessPct: 0,
                          inclusiveInMrp: newTaxInclusive,
                          enabled: true,
                        },
                      ],
                    }));
                    setNewTaxName("");
                    setNewTaxHsn("");
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#5b3ae6] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Slab
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 border-b border-slate-200">
                    <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 font-semibold">Tax Slab Name</th>
                      <th className="px-4 py-3 font-semibold">HSN Prefix</th>
                      <th className="px-4 py-3 font-semibold">CGST %</th>
                      <th className="px-4 py-3 font-semibold">SGST %</th>
                      <th className="px-4 py-3 font-semibold">Total GST</th>
                      <th className="px-4 py-3 font-semibold">Mode</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {config.taxRates.map((tax) => (
                      <tr key={tax.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">{tax.name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{tax.hsnPrefix}</td>
                        <td className="px-4 py-3 text-slate-700">{tax.cgstPct}%</td>
                        <td className="px-4 py-3 text-slate-700">{tax.sgstPct}%</td>
                        <td className="px-4 py-3 font-semibold text-indigo-700">{tax.cgstPct + tax.sgstPct}%</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${
                            tax.inclusiveInMrp ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {tax.inclusiveInMrp ? "Inclusive" : "Exclusive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setConfig((p) => ({
                                ...p,
                                taxRates: p.taxRates.filter((t) => t.id !== tax.id),
                              }))
                            }
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                            title="Delete tax slab"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function OnlineStorePage() {
  return <OnlineStoreWorkspace initialSection="settings" />;
}
