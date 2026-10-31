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
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
  UserCheck,
  UserMinus,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ReceiptData, ReceiptModal } from "../../../components/receipt-modal";

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
  | "loyalty"
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
    phoneSignIn: boolean;
    minOrderAmount: number;
    maxOrderAmount: number;
    orderAutoConfirm: boolean;
    inventorySyncMode: "realtime" | "scheduled" | "manual";
    hideOutOfStock: boolean;
    allowBackorders: boolean;
    showStockCount: boolean;
    lowStockBadgeThreshold: number;
  };
  loyalty: {
    enabled: boolean;
    programName?: string;
    posEnabled?: boolean;
    onlineEnabled?: boolean;
    enableOnlineEarnRedeem?: boolean;
    enablePosEarnRedeem?: boolean;
    allowStackWithCoupons?: boolean;
    earnRupeesPerPoint: number;
    minOrderToEarnRupees?: number;
    minOrderAmountToRedeem?: number;
    welcomeBonusPoints?: number;
    signupBonusPoints?: number;
    birthdayBonusPoints?: number;
    firstOrderBonusPoints?: number;
    excludeDiscountedItems?: boolean;
    redeemPaisePerPoint: number;
    minRedeemPoints: number;
    maxRedeemPercent: number;
    maxRedeemRupeesCap?: number;
    expiryMonths?: number;
    expiryDays?: number;
    tierEnabled?: boolean;
    silverThresholdPoints?: number;
    silverMultiplier?: number;
    goldThresholdPoints?: number;
    goldMultiplier?: number;
    platinumThresholdPoints?: number;
    platinumMultiplier?: number;
    tiers?: {
      id: string;
      name: string;
      minLifetimePoints: number;
      multiplier: number;
      perkDescription: string;
    }[];
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
    showBanners: boolean;
    showCollections: boolean;
  };
  enableDeliveryAvailability: boolean;
  serviceableLocations: {
    id: string;
    name?: string;
    areaName?: string;
    pincode?: string;
    pinCode?: string;
    deliveryFee: number;
    minOrderAmount: number;
    etaText: string;
    enabled: boolean;
  }[];
  deliverySlots: {
    id: string;
    label: string;
    sublabel?: string;
    feeAmount?: number;
    cutoffInfo?: string;
    enabled: boolean;
  }[];
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
    showFooter?: boolean;
    footerLayout?: "columns" | "centered" | "minimal";
    footerBgColor?: string;
    footerTextColor?: string;
    footerAboutText: string;
    showStoreTimingsInFooter?: boolean;
    showNewsletterInFooter: boolean;
    newsletterHeadline?: string;
    supportSectionTitle?: string;
    showPhoneInFooter?: boolean;
    showEmailInFooter?: boolean;
    showAddressInFooter?: boolean;
    showInquiryInFooter?: boolean;
    policiesSectionTitle?: string;
    refundPolicyText: string;
    privacyPolicyText: string;
    termsText: string;
    showPaymentIconsInFooter: boolean;
    paymentBadgesText?: string;
    footerCopyrightText: string;
    showPoweredBy?: boolean;
    poweredByText?: string;
    showDownloadAppBadges: boolean;
    playStoreUrl: string;
    appStoreUrl: string;
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

type ServiceableLocationItem = OnlineStoreConfig["serviceableLocations"][number];
type DeliverySlotItem = OnlineStoreConfig["deliverySlots"][number];
type CollectionItem = OnlineStoreConfig["collections"][number];
type BannerItem = OnlineStoreConfig["banners"][number];
type SubscriberItem = OnlineStoreConfig["subscribers"][number];
type InviteCodeItem = OnlineStoreConfig["inviteCodes"][number];

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
    phoneSignIn: true,
    minOrderAmount: 0,
    maxOrderAmount: 100000,
    orderAutoConfirm: false,
    inventorySyncMode: "realtime",
    hideOutOfStock: false,
    allowBackorders: false,
    showStockCount: true,
    lowStockBadgeThreshold: 5,
  },
  loyalty: {
    enabled: false,
    posEnabled: true,
    onlineEnabled: true,
    earnRupeesPerPoint: 100,
    minOrderToEarnRupees: 100,
    welcomeBonusPoints: 25,
    firstOrderBonusPoints: 50,
    excludeDiscountedItems: false,
    redeemPaisePerPoint: 100,
    minRedeemPoints: 50,
    maxRedeemPercent: 50,
    maxRedeemRupeesCap: 500,
    expiryMonths: 12,
    tiers: [
      { id: "bronze", name: "Bronze Member", minLifetimePoints: 0, multiplier: 1.0, perkDescription: "Base 1x reward points accrual on all eligible POS & Online bills" },
      { id: "silver", name: "Silver Tier", minLifetimePoints: 250, multiplier: 1.25, perkDescription: "1.25x accelerated point earning + priority festival coupon access" },
      { id: "gold", name: "Gold Tier", minLifetimePoints: 750, multiplier: 1.5, perkDescription: "1.5x point earning + priority doorstep slot reservation" },
      { id: "platinum", name: "Platinum VIP", minLifetimePoints: 2000, multiplier: 2.0, perkDescription: "2x double reward points + dedicated VIP support & free express delivery" },
    ],
  },
  contact: {
    supportEmail: "",
    supportPhone: "",
    whatsappNumber: "",
    enableFloatingWhatsapp: false,
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
    enabled: false,
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
    showBanners: false,
    showCollections: false,
  },
  enableDeliveryAvailability: true,
  serviceableLocations: [],
  deliverySlots: [
    { id: "slot-express", label: "Express (30–45 mins)", sublabel: "Immediate dispatch", enabled: true },
    { id: "slot-morning", label: "Morning (9 AM – 12 PM)", sublabel: "Morning batch", enabled: true },
    { id: "slot-afternoon", label: "Afternoon (12 PM – 4 PM)", sublabel: "Midday batch", enabled: true },
    { id: "slot-evening", label: "Evening (5 PM – 9 PM)", sublabel: "Evening batch", enabled: true },
  ],
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
    showFooter: false,
    footerLayout: "columns",
    footerBgColor: "#ffffff",
    footerTextColor: "#475569",
    footerAboutText: "",
    showStoreTimingsInFooter: true,
    showNewsletterInFooter: true,
    newsletterHeadline: "Subscribe for Exclusive Store Offers",
    supportSectionTitle: "Customer Support",
    showPhoneInFooter: true,
    showEmailInFooter: true,
    showAddressInFooter: true,
    showInquiryInFooter: true,
    policiesSectionTitle: "Policies & Legal",
    refundPolicyText: "Orders cannot be cancelled once packed for delivery. In case of unexpected delays, a refund will be provided, if applicable.",
    privacyPolicyText: "Customer mobile and address data is used strictly for billing and order fulfillment.",
    termsText: "All prices are inclusive of applicable GST unless specified otherwise.",
    showPaymentIconsInFooter: true,
    paymentBadgesText: "UPI, Visa / MasterCard, Razorpay, COD",
    footerCopyrightText: "",
    showPoweredBy: true,
    poweredByText: "Powered by Selfx Retail Enterprise Engine",
    showDownloadAppBadges: false,
    playStoreUrl: "",
    appStoreUrl: "",
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
    { id: "blk-1", title: "Hero Promotional Banner", subtitle: "Primary campaign banner at top of storefront", type: "hero", enabled: false, itemLimit: 1 },
    { id: "blk-2", title: "Promotional Category Tiles", subtitle: "Quick category cards below hero banner", type: "promo_banners", enabled: false, itemLimit: 3 },
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
  shippingMethods: [],
  taxSettings: {
    defaultCgstPct: 2.5,
    defaultSgstPct: 2.5,
    defaultIgstPct: 5,
    inclusiveInMrp: true,
  },
  taxRates: [],
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
      enabled: false,
      displayName: "Instant UPI QR Payment",
      vpa: "",
      merchantName: "",
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
  customer_phone?: string | null;
  fulfillment?: string;
  fulfillment_mode?: string;
  payment_method?: string;
  payment_status?: string;
  status: string;
  delivery_status?: string;
  delivery_staff_id?: string | null;
  delivery_staff_name?: string | null;
  delivery_staff_phone?: string | null;
  delivery_slot?: string | null;
  customer_auth_mode?: "signed_in" | "guest" | null;
  subtotal_paise?: number;
  tax_paise?: number;
  discount_paise?: number;
  delivery_fee_paise?: number;
  total_paise: number;
  address?: string | null;
  delivery_address?: string | null;
  city?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  live_location_url?: string | null;
  order_notes?: string | null;
  pickup_qr?: string | null;
  store_name?: string;
  items_count?: number;
  lines_summary?: string;
  items?: {
    name: string;
    qty: number;
    unit_price_paise: number;
    total_paise?: number;
  }[];
  lines?: {
    name: string;
    qty: number;
    unit_price_paise: number;
    total_paise: number;
  }[];
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
  const [activeSection, setActiveSection] = useState<OnlineStoreSectionId>(
    initialSection === "payments" ? "settings" : initialSection,
  );
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
  const [orderFulfillmentFilter, setOrderFulfillmentFilter] = useState<"all" | "delivery" | "pickup">("all");
  const [orderSlotFilter, setOrderSlotFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderReceipt, setSelectedOrderReceipt] = useState<ReceiptData | null>(null);

  // Serviceable location & Delivery Slot add inputs
  const [newLocArea, setNewLocArea] = useState("");
  const [newLocPin, setNewLocPin] = useState("");
  const [newLocFee, setNewLocFee] = useState("35");
  const [newLocMinOrder, setNewLocMinOrder] = useState("0");
  const [newLocEta, setNewLocEta] = useState("30–45 mins");
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newSlotSublabel, setNewSlotSublabel] = useState("");

  // Modal states for adding items
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDesc, setNewCollectionDesc] = useState("");
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerSubtitle, setNewBannerSubtitle] = useState("");
  const [newBannerBadge, setNewBannerBadge] = useState("SPECIAL OFFER");
  const [newBannerPlacement, setNewBannerPlacement] = useState<"home_top" | "home_mid" | "category_header" | "popup">("home_mid");
  const [newBannerColor, setNewBannerColor] = useState("#1d4ed8");
  const [newCode, setNewCode] = useState("");
  const [newCodeType, setNewCodeType] = useState<"percentage" | "fixed" | "free_shipping">("percentage");
  const [newCodeValue, setNewCodeValue] = useState("10");
  const [newCodeMinOrder, setNewCodeMinOrder] = useState("299");
  const [newSubEmail, setNewSubEmail] = useState("");
  const [newSubPhone, setNewSubPhone] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
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
          const next: OnlineStoreConfig = {
            ...prev,
            ...(remoteSettings ?? {}),
            loyalty: {
              ...prev.loyalty,
              ...(remoteSettings?.loyalty ?? {}),
            },
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
            themeConfig: {
              ...prev.themeConfig,
              ...(remoteSettings?.themeConfig ?? {}),
              showBanners: remoteSettings?.themeConfig?.showBanners ?? false,
              showCollections: remoteSettings?.themeConfig?.showCollections ?? false,
            },
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
            enableDeliveryAvailability: remoteSettings?.enableDeliveryAvailability ?? prev.enableDeliveryAvailability,
            serviceableLocations: Array.isArray(remoteSettings?.serviceableLocations)
              ? remoteSettings.serviceableLocations
              : prev.serviceableLocations,
            deliverySlots: Array.isArray(remoteSettings?.deliverySlots)
              ? remoteSettings.deliverySlots
              : prev.deliverySlots,
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

  async function persistConfigImmediately(nextConfig: OnlineStoreConfig, customToast?: string) {
    setConfig(nextConfig);
    setSaving(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
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
            online_store_settings: nextConfig,
          }),
        });
      }
      setSavedToast(customToast || "Online Store configuration saved & synced to live storefront.");
      window.setTimeout(() => setSavedToast(null), 3500);
    } finally {
      setSaving(false);
    }
  }

  async function saveAllSettings() {
    await persistConfigImmediately(config);
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
    { id: "orders", label: "Online Orders", icon: ShoppingBag },
    { id: "loyalty", label: "Loyalty Points", icon: Star },
    { id: "collections", label: "Collections", icon: Layers },
    { id: "banners", label: "Banners", icon: ImageIcon },
    { id: "subscribers", label: "Subscribers", icon: Users },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "invite-codes", label: "Invite Codes", icon: Tag },
    { id: "pending-customers", label: "Pending Customers", icon: Clock },
    { id: "guest-customers", label: "Customers without Login", icon: UserMinus },
    { id: "registered-customers", label: "Customers with Login", icon: UserCheck },
    { id: "shipping", label: "Shipping & Slots", icon: Truck },
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
                      onChange={(e) => {
                        const val = e.target.value;
                        const themeDefaults =
                          val === "ElectroPulse — Electronics, Gadgets & Appliances"
                            ? { primaryColor: "#1d4ed8", secondaryColor: "#0f172a" }
                            : val === "WonderKids — Kids, Toys & Boutique"
                            ? { primaryColor: "#6d5acd", secondaryColor: "#e11d48" }
                            : val === "VerdantMart — Organic & Daily Supermarket"
                            ? { primaryColor: "#16a34a", secondaryColor: "#f97316" }
                            : { primaryColor: config.basics.primaryColor || "#0c831f", secondaryColor: config.basics.secondaryColor || "#1d4ed8" };
                        setConfig((prev) => ({
                          ...prev,
                          basics: {
                            ...prev.basics,
                            storeTheme: val,
                            primaryColor: themeDefaults.primaryColor,
                            secondaryColor: themeDefaults.secondaryColor,
                          },
                          themeConfig: { ...prev.themeConfig, activeTheme: val },
                        }));
                      }}
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-[#6c47ff]"
                    >
                      <option value="Modern Supermarket & Retail Theme">
                        Modern Supermarket &amp; Retail Theme (Default)
                      </option>
                      <option value="ElectroPulse — Electronics, Gadgets & Appliances">
                        ElectroPulse — Electronics, Gadgets &amp; Appliances
                      </option>
                      <option value="WonderKids — Kids, Toys & Boutique">
                        WonderKids — Kids, Toys &amp; Boutique
                      </option>
                      <option value="VerdantMart — Organic & Daily Supermarket">
                        VerdantMart — Organic &amp; Daily Supermarket
                      </option>
                    </select>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      Choose between the Default Express Storefront or the 3 curated fixed-layout industry themes. You can also preview and configure theme layouts in the{" "}
                      <button
                        type="button"
                        onClick={() => setSettingsTab("theme")}
                        className="font-semibold text-[#6c47ff] underline cursor-pointer"
                      >
                        Store Theme tab
                      </button>
                      .
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
                <div className="border-t border-slate-200/80 pt-6 space-y-5">
                  <h3 className="text-xs font-semibold text-slate-800">Checkout, Maintenance &amp; Live Stock Rules</h3>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Min Order Amount</label>
                      <input
                        type="number"
                        value={config.basics.minOrderAmount}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, minOrderAmount: Number(e.target.value) || 0 },
                            shipping: { ...prev.shipping, minOrderAmount: Number(e.target.value) || 0 },
                          }))
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Max Order Amount</label>
                      <input
                        type="number"
                        value={config.basics.maxOrderAmount}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, maxOrderAmount: Number(e.target.value) || 0 },
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
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Inventory Sync Mode</label>
                      <select
                        value={config.basics.inventorySyncMode}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: {
                              ...prev.basics,
                              inventorySyncMode: e.target.value as "realtime" | "scheduled" | "manual",
                            },
                          }))
                        }
                        className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      >
                        <option value="realtime">Real-Time POS Sync</option>
                        <option value="scheduled">Scheduled (15m interval)</option>
                        <option value="manual">Manual Stock Push</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 text-xs font-medium text-slate-700 bg-slate-50/40">
                      <input
                        type="checkbox"
                        checked={config.basics.phoneSignIn !== false}
                        onChange={(e) => {
                          const next = {
                            ...config,
                            basics: { ...config.basics, phoneSignIn: e.target.checked },
                          };
                          void persistConfigImmediately(next, "Customer Sign-In (Phone + OTP) setting updated.");
                        }}
                        className="mt-0.5 h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">Enable Customer Sign-In (Phone + OTP)</div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Authenticates shoppers via Phone + OTP (powered by Super Admin SMS integration) and unlocks previous order history &amp; loyalty points.
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 text-xs font-medium text-slate-700 bg-slate-50/40">
                      <input
                        type="checkbox"
                        checked={config.basics.guestCheckout}
                        onChange={(e) => {
                          const next = {
                            ...config,
                            basics: { ...config.basics, guestCheckout: e.target.checked },
                          };
                          void persistConfigImmediately(next, "Guest Checkout setting updated.");
                        }}
                        className="mt-0.5 h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">Enable Guest Checkout (No OTP Required)</div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Allows shoppers to enter full contact &amp; delivery details without OTP. Guests cannot view previous order history.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Delivery Availability & Registered Serviceable Locations */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Delivery Availability &amp; Registered Serviceable Locations
                          </h3>
                          <p className="text-xs text-slate-500">
                            Displayed beside the <span className="font-semibold text-slate-700">Orders</span> button in your storefront banner. Delivery orders can only be placed for the locations/PINs registered below.
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.enableDeliveryAvailability !== false}
                          onChange={(e) => {
                            const next = {
                              ...config,
                              enableDeliveryAvailability: e.target.checked,
                              themeConfig: { ...config.themeConfig, enablePinCodeChecker: e.target.checked },
                            };
                            void persistConfigImmediately(next, "Storefront banner Delivery Availability updated.");
                          }}
                          className="h-4 w-4 rounded accent-[#6c47ff]"
                        />
                        Show Delivery Availability in Banner
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                      <input
                        type="text"
                        placeholder="Area / Locality Name (e.g. Indiranagar)"
                        value={newLocArea}
                        onChange={(e) => setNewLocArea(e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:col-span-2"
                      />
                      <input
                        type="text"
                        placeholder="PIN Code (e.g. 560038)"
                        value={newLocPin}
                        onChange={(e) => setNewLocPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                      />
                      <input
                        type="number"
                        placeholder="Delivery Fee ₹"
                        value={newLocFee}
                        onChange={(e) => setNewLocFee(e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="ETA (e.g. 30–45 mins)"
                        value={newLocEta}
                        onChange={(e) => setNewLocEta(e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newLocArea.trim() && !newLocPin.trim()) return;
                          const nextLoc: ServiceableLocationItem = {
                            id: `loc-${Date.now()}`,
                            areaName: newLocArea.trim() || `PIN ${newLocPin.trim()}`,
                            pinCode: newLocPin.trim() || "All",
                            deliveryFee: Number(newLocFee) || 0,
                            minOrderAmount: Number(newLocMinOrder) || 0,
                            etaText: newLocEta.trim() || "30–45 mins",
                            enabled: true,
                          };
                          const next: OnlineStoreConfig = {
                            ...config,
                            serviceableLocations: [...(config.serviceableLocations ?? []), nextLoc],
                          };
                          setNewLocArea("");
                          setNewLocPin("");
                          void persistConfigImmediately(next, "Serviceable delivery location registered & saved.");
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#6c47ff] px-3 text-xs font-semibold text-white hover:bg-[#5a36eb] cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Register Location
                      </button>
                    </div>

                    {(config.serviceableLocations ?? []).length > 0 ? (
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {(config.serviceableLocations ?? []).map((loc) => (
                          <div
                            key={loc.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-900">{loc.areaName}</span>
                                <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                                  {loc.pinCode}
                                </span>
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {loc.deliveryFee === 0 ? "Free Delivery" : `₹${loc.deliveryFee} Fee`} · {loc.etaText}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const next: OnlineStoreConfig = {
                                    ...config,
                                    serviceableLocations: (config.serviceableLocations ?? []).map((l) =>
                                      l.id === loc.id ? { ...l, enabled: !l.enabled } : l
                                    ),
                                  };
                                  void persistConfigImmediately(next, "Location availability updated.");
                                }}
                                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                                  loc.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {loc.enabled ? "Active" : "Paused"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next: OnlineStoreConfig = {
                                    ...config,
                                    serviceableLocations: (config.serviceableLocations ?? []).filter((l) => l.id !== loc.id),
                                  };
                                  void persistConfigImmediately(next, "Serviceable location removed.");
                                }}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                        No restricted locations registered yet. Register PIN codes or localities above to restrict delivery strictly to your serviceable areas.
                      </div>
                    )}
                  </div>

                  {/* Registered Delivery Time Slots Manager */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Registered Delivery Time Slots
                          </h3>
                          <p className="text-xs text-slate-500">
                            Only the active time slots registered here are shown on Storefront checkout and stamped on Delivery Orders &amp; Online Orders cards.
                          </p>
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.themeConfig.enableDeliverySlotPicker}
                          onChange={(e) => {
                            const next = {
                              ...config,
                              themeConfig: { ...config.themeConfig, enableDeliverySlotPicker: e.target.checked },
                            };
                            void persistConfigImmediately(next, "Delivery Time-Slot selector updated.");
                          }}
                          className="h-4 w-4 rounded accent-[#6c47ff]"
                        />
                        Show Time Slots on Checkout
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                      <input
                        type="text"
                        placeholder="Slot Title (e.g. Morning 9 AM – 12 PM)"
                        value={newSlotLabel}
                        onChange={(e) => setNewSlotLabel(e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:col-span-2"
                      />
                      <input
                        type="text"
                        placeholder="Subtitle (e.g. Express Dispatch / Today)"
                        value={newSlotSublabel}
                        onChange={(e) => setNewSlotSublabel(e.target.value)}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:col-span-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSlotLabel.trim()) return;
                          const nextSlot: DeliverySlotItem = {
                            id: `slot-${Date.now()}`,
                            label: newSlotLabel.trim(),
                            sublabel: newSlotSublabel.trim() || "Scheduled Window",
                            feeAmount: 0,
                            cutoffInfo: "",
                            enabled: true,
                          };
                          const next: OnlineStoreConfig = {
                            ...config,
                            deliverySlots: [...(config.deliverySlots ?? []), nextSlot],
                          };
                          setNewSlotLabel("");
                          setNewSlotSublabel("");
                          void persistConfigImmediately(next, "Delivery time slot registered & saved.");
                        }}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#6c47ff] px-3 text-xs font-semibold text-white hover:bg-[#5a36eb] cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Time Slot
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      {(config.deliverySlots ?? []).map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900">{slot.label}</div>
                            <div className="text-[11px] text-slate-500">{slot.sublabel}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const next: OnlineStoreConfig = {
                                  ...config,
                                  deliverySlots: (config.deliverySlots ?? []).map((s) =>
                                    s.id === slot.id ? { ...s, enabled: !s.enabled } : s
                                  ),
                                };
                                void persistConfigImmediately(next, "Delivery slot status updated.");
                              }}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                                slot.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {slot.enabled ? "Active" : "Off"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next: OnlineStoreConfig = {
                                  ...config,
                                  deliverySlots: (config.deliverySlots ?? []).filter((s) => s.id !== slot.id),
                                };
                                void persistConfigImmediately(next, "Delivery slot removed.");
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Links to Dedicated Loyalty Points & Unified Payment Gateways */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-slate-900">Loyalty Points &amp; Rewards Program</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            config.loyalty?.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                          }`}>
                            {config.loyalty?.enabled ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Manage point accrual, redemption caps, membership tiers, and rewards in the dedicated Loyalty settings.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection("loyalty")}
                        className="shrink-0 rounded-lg bg-[#6c47ff] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#5a36eb] cursor-pointer"
                      >
                        Configure Loyalty →
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div>
                        <h3 className="text-xs font-semibold text-slate-900">Unified Payment Gateways (POS &amp; Storefront)</h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                          All online and POS payment integrations (Razorpay, PhonePe, Paytm, Stripe, UPI) are managed in Settings → Payment Gateways.
                        </p>
                      </div>
                      <a
                        href="/settings/gateways"
                        className="shrink-0 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                      >
                        Payment Gateways →
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
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
                      Auto-hide Out of Stock
                    </label>
                    <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.basics.showStockCount}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, showStockCount: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      Show Live Stock Count on Cards
                    </label>
                    <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.basics.allowBackorders}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            basics: { ...prev.basics, allowBackorders: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      Allow Pre-order / Backorders
                    </label>
                  </div>

                  {/* Maintenance Mode */}
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">Storefront Maintenance Mode</div>
                        <p className="text-[11px] text-slate-500">
                          Temporarily show a maintenance notice to customers while updating prices or stock.
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.basics.maintenanceMode}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              basics: { ...prev.basics, maintenanceMode: e.target.checked },
                            }))
                          }
                          className="h-4 w-4 rounded accent-amber-600"
                        />
                        {config.basics.maintenanceMode ? "Maintenance Active" : "Enable Maintenance Mode"}
                      </label>
                    </div>
                    {config.basics.maintenanceMode && (
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="We are restocking fresh inventory and will be back online shortly!"
                          value={config.basics.maintenanceMessage}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              basics: { ...prev.basics, maintenanceMessage: e.target.value },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-amber-200 bg-white px-3 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 2: CONTACT */}
            {settingsTab === "contact" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Store Contact &amp; Customer Support Details</h3>
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
                    <label className="block text-xs font-semibold text-slate-700">WhatsApp Order &amp; Support Number</label>
                    <input
                      type="text"
                      value={config.contact.whatsappNumber}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, whatsappNumber: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">WhatsApp Default Prefill Message</label>
                    <input
                      type="text"
                      value={config.contact.whatsappPrefillText}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, whatsappPrefillText: e.target.value } }))}
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Customer Support Hours</label>
                    <input
                      type="text"
                      value={config.contact.supportHoursText}
                      onChange={(e) => setConfig((p) => ({ ...p, contact: { ...p.contact, supportHoursText: e.target.value } }))}
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
                    <label className="block text-xs font-semibold text-slate-700">City &amp; State</label>
                    <input
                      type="text"
                      value={`${config.contact.city}${config.contact.state ? `, ${config.contact.state}` : ""}`}
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
                  Show floating WhatsApp button on the storefront. Off until you turn this on and save a WhatsApp number.
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

                  <p className="text-xs text-slate-600">
                    Google Maps is set once for the whole platform by the super admin. This store uses that key for live tracking. Store latitude and longitude below are this branch only.
                  </p>

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
                  <h3 className="text-sm font-semibold text-slate-900">Brand Identity, Logos &amp; Visual Tokens</h3>
                  <p className="text-xs text-slate-500">Customize logos, favicons, button shapes, colors, and card elevation across the online store.</p>
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
                    <label className="block text-xs font-semibold text-slate-700">Dark Mode / Footer Logo URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={config.branding.darkLogoUrl}
                      onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, darkLogoUrl: e.target.value } }))}
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
                  <div>
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
                      <option value="sharp">Sharp &amp; Structured (4px)</option>
                      <option value="rounded">Modern Rounded (12px)</option>
                      <option value="pill">Soft Pill &amp; Friendly (20px)</option>
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
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">CTA Button Style</label>
                    <select
                      value={config.branding.buttonStyle}
                      onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, buttonStyle: e.target.value as "solid" | "gradient" | "outline" } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    >
                      <option value="solid">Solid Brand Fill</option>
                      <option value="gradient">Rich Brand Gradient</option>
                      <option value="outline">Clean Outlined Pill</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Discount Badge Color</label>
                      <div className="mt-1.5 flex h-10 items-center rounded-lg border border-slate-200 p-1">
                        <input
                          type="color"
                          value={config.branding.badgeColor || "#0c831f"}
                          onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, badgeColor: e.target.value } }))}
                          className="h-full w-full cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Header Background</label>
                      <div className="mt-1.5 flex h-10 items-center rounded-lg border border-slate-200 p-1">
                        <input
                          type="color"
                          value={config.branding.headerBackground || "#ffffff"}
                          onChange={(e) => setConfig((p) => ({ ...p, branding: { ...p.branding, headerBackground: e.target.value } }))}
                          className="h-full w-full cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 4: HERO HEADER */}
            {settingsTab === "hero" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Hero Header &amp; Above-the-Fold Campaign Banner</h3>
                    <p className="text-xs text-slate-500">Configure the main hero banner headline, CTAs, background showcase image, and trust badges across all themes.</p>
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
                    <label className="block text-xs font-semibold text-slate-700">Hero Layout Variant (Default Theme)</label>
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
                    <label className="block text-xs font-semibold text-slate-700">Secondary CTA Button Text</label>
                    <input
                      type="text"
                      value={config.hero.secondaryCtaLabel}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, secondaryCtaLabel: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Custom Hero Banner Image URL (Optional)</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={config.hero.bannerImageUrl}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, bannerImageUrl: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Promo Offer Strip / Discount Badge Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Up to 40% OFF"
                      value={config.hero.promoHighlightText}
                      onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, promoHighlightText: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                </div>

                {/* Trust Strip Pills */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">Hero Trust Guarantee Pills</span>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.hero.showTrustPills}
                        onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, showTrustPills: e.target.checked } }))}
                        className="h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      Show Trust Badges
                    </label>
                  </div>
                  {config.hero.showTrustPills && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <input
                        type="text"
                        value={config.hero.trustPill1}
                        onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, trustPill1: e.target.value } }))}
                        placeholder="Trust badge 1"
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                      <input
                        type="text"
                        value={config.hero.trustPill2}
                        onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, trustPill2: e.target.value } }))}
                        placeholder="Trust badge 2"
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                      <input
                        type="text"
                        value={config.hero.trustPill3}
                        onChange={(e) => setConfig((p) => ({ ...p, hero: { ...p.hero, trustPill3: e.target.value } }))}
                        placeholder="Trust badge 3"
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 5: STORE THEME & PRODUCT CARDS */}
            {settingsTab === "theme" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Select Storefront Theme &amp; Product Card Experience</h3>
                  <p className="text-xs text-slate-500">
                    Choose a theme. Colours, homepage blocks, banners, and sign-in rules are saved for the store and apply no matter which theme is active. Banners stay hidden until you add one.
                  </p>
                </div>

                {/* Visual Theme Selector Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    {
                      id: "Modern Supermarket & Retail Theme",
                      badge: "DEFAULT THEME",
                      title: "Counter",
                      categoryFit: "Every store. Colours, blocks, and banners come from these settings.",
                      desc: "Light menu layout with a green selection colour and orange checkout. Banners & collections stay off by default unless enabled.",
                      colors: ["#0c831f", "#14532d", "#facc15"],
                      previewBg: "from-emerald-900 via-emerald-800 to-slate-900",
                    },
                    {
                      id: "ElectroPulse — Electronics, Gadgets & Appliances",
                      badge: "ELECTRONICS",
                      title: "ElectroPulse — Electronics, Gadgets & Appliances",
                      categoryFit: "Electronics, mobiles, computers, and appliances",
                      desc: "High-contrast tech layout. Uses the same store settings as every other theme; banners and collections stay off by default.",
                      colors: ["#1d4ed8", "#0f172a", "#38bdf8"],
                      previewBg: "from-blue-700 via-indigo-800 to-slate-900",
                    },
                    {
                      id: "WonderKids — Kids, Toys & Boutique",
                      badge: "KIDS AND GIFTS",
                      title: "WonderKids — Kids, Toys & Boutique",
                      categoryFit: "Kids, toys, baby care, and gift shops",
                      desc: "Playful boutique layout. Uses the same store settings as every other theme; banners and collections stay off by default.",
                      colors: ["#6d5acd", "#e11d48", "#fde047"],
                      previewBg: "from-[#6d5acd] via-purple-600 to-pink-500",
                    },
                    {
                      id: "VerdantMart — Organic & Daily Supermarket",
                      badge: "GROCERY",
                      title: "VerdantMart — Organic & Daily Supermarket",
                      categoryFit: "Supermarkets, grocery, and daily essentials",
                      desc: "Fresh organic grocery layout. Uses the same store settings as every other theme; banners and collections stay off by default.",
                      colors: ["#16a34a", "#f97316", "#064e3b"],
                      previewBg: "from-emerald-600 via-green-600 to-amber-500",
                    },
                  ].map((themeItem) => {
                    const isSelected =
                      config.basics.storeTheme === themeItem.id || config.themeConfig.activeTheme === themeItem.id;
                    return (
                      <div
                        key={themeItem.id}
                        onClick={() => {
                          const next: OnlineStoreConfig = {
                            ...config,
                            basics: {
                              ...config.basics,
                              storeTheme: themeItem.id,
                              primaryColor: themeItem.colors[0] || config.basics.primaryColor,
                              secondaryColor: themeItem.colors[1] || config.basics.secondaryColor,
                            },
                            themeConfig: { ...config.themeConfig, activeTheme: themeItem.id },
                          };
                          void persistConfigImmediately(next, `Theme switched to "${themeItem.title}".`);
                        }}
                        className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all ${
                          isSelected
                            ? "border-[#6c47ff] bg-[#f3efff]/30 shadow-md ring-2 ring-[#6c47ff]/15"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        <div className={`h-20 w-full bg-gradient-to-r ${themeItem.previewBg} p-3.5 text-white flex items-start justify-between`}>
                          <div>
                            <span className="inline-block rounded-full bg-white/20 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              {themeItem.badge}
                            </span>
                            <div className="mt-1.5 text-sm font-bold tracking-tight">{themeItem.title}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {themeItem.colors.map((hex, i) => (
                              <span
                                key={i}
                                className="h-4 w-4 rounded-full border border-white/60 shadow-2xs"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              Best for: {themeItem.categoryFit}
                            </span>
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#6c47ff]">
                                <CheckCircle2 size={14} /> Active Theme
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-700">
                                Click to Select
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{themeItem.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Banners & Collections Default Off Toggles */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100">
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(config.themeConfig.showBanners)}
                      onChange={(e) => {
                        const next = {
                          ...config,
                          themeConfig: { ...config.themeConfig, showBanners: e.target.checked },
                        };
                        void persistConfigImmediately(next, e.target.checked ? "Storefront banners enabled." : "Storefront banners turned off.");
                      }}
                      className="mt-0.5 h-4 w-4 rounded accent-[#6c47ff]"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Show Promotional Banners on Storefront (Off by Default)</div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Kept off by default for a clean storefront. Turn on when you want active banners from the Banners section displayed.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(config.themeConfig.showCollections)}
                      onChange={(e) => {
                        const next = {
                          ...config,
                          themeConfig: { ...config.themeConfig, showCollections: e.target.checked },
                        };
                        void persistConfigImmediately(next, e.target.checked ? "Storefront collections enabled." : "Storefront collections turned off.");
                      }}
                      className="mt-0.5 h-4 w-4 rounded accent-[#6c47ff]"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">Show Curated Collections Strip on Storefront (Off by Default)</div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Kept off by default. Turn on when you want curated collections from the Collections section highlighted on the storefront.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3 pt-2 border-t border-slate-100">
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
                    <label className="block text-xs font-semibold text-slate-700">Mobile Grid Columns</label>
                    <select
                      value={config.themeConfig.productGridColumnsMobile}
                      onChange={(e) => setConfig((p) => ({ ...p, themeConfig: { ...p.themeConfig, productGridColumnsMobile: Number(e.target.value) as 1 | 2 } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
                    >
                      <option value={2}>2 Columns (Compact Mobile Grid)</option>
                      <option value={1}>1 Column (Full-Width Mobile Cards)</option>
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
                    { key: "showBrandOnCard", label: "Show Category / Brand Above Title" },
                    { key: "showSkuOnCard", label: "Show Product SKU Code on Card" },
                    { key: "showQuickViewModal", label: "Enable Product Quick-View Modal" },
                    { key: "showAddToWishlist", label: "Enable Wishlist Heart Button" },
                    { key: "stickyHeader", label: "Sticky Search & Category Header" },
                    { key: "stickyCartBarMobile", label: "Floating Bottom Cart Bar on Mobile" },
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
                  <h3 className="text-sm font-semibold text-slate-900">Search Engine Optimization (SEO) &amp; Analytics Pixels</h3>
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
                    <label className="block text-xs font-semibold text-slate-700">Meta Keywords (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="supermarket, online grocery, express delivery"
                      value={config.seo.metaKeywords}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, metaKeywords: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">OpenGraph Social Share Image URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={config.seo.ogImageUrl}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, ogImageUrl: e.target.value } }))}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.seo.robotsIndex}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, robotsIndex: e.target.checked } }))}
                      className="h-4 w-4 rounded accent-[#6c47ff]"
                    />
                    Allow Search Engine Indexing
                  </label>
                  <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.seo.structuredDataJsonLd}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, structuredDataJsonLd: e.target.checked } }))}
                      className="h-4 w-4 rounded accent-[#6c47ff]"
                    />
                    Emit Rich Product JSON-LD Schema
                  </label>
                  <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.seo.autoGenerateSitemap}
                      onChange={(e) => setConfig((p) => ({ ...p, seo: { ...p.seo, autoGenerateSitemap: e.target.checked } }))}
                      className="h-4 w-4 rounded accent-[#6c47ff]"
                    />
                    Auto-generate XML Sitemap
                  </label>
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 7: TOPBAR & FOOTER */}
            {settingsTab === "topbar-footer" ? (
              <div className="space-y-8">
                {/* 1. ANNOUNCEMENT TOPBAR */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Announcement Topbar</h3>
                      <p className="text-xs text-slate-500">Promotional bar displayed at the very top of your storefront.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.topbarFooter.showTopbar}
                        onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showTopbar: e.target.checked } }))}
                        className="h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      Show Top Announcement Bar
                    </label>
                  </div>
                  {config.topbarFooter.showTopbar && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700">Top Announcement Bar Message</label>
                        <input
                          type="text"
                          placeholder="🎉 Free Express Delivery on orders above ₹499! Use code WELCOME10"
                          value={config.topbarFooter.topbarText}
                          onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, topbarText: e.target.value } }))}
                          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700">Topbar CTA Link Label (Optional)</label>
                        <input
                          type="text"
                          placeholder="Shop Deals →"
                          value={config.topbarFooter.topbarLinkLabel}
                          onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, topbarLinkLabel: e.target.value } }))}
                          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Topbar Background</label>
                          <div className="mt-1.5 flex h-10 items-center rounded-lg border border-slate-200 p-1">
                            <input
                              type="color"
                              value={config.topbarFooter.topbarBgColor || "#0f172a"}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, topbarBgColor: e.target.value } }))}
                              className="h-full w-full cursor-pointer border-0 bg-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Topbar Text Color</label>
                          <div className="mt-1.5 flex h-10 items-center rounded-lg border border-slate-200 p-1">
                            <input
                              type="color"
                              value={config.topbarFooter.topbarTextColor || "#ffffff"}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, topbarTextColor: e.target.value } }))}
                              className="h-full w-full cursor-pointer border-0 bg-transparent"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(config.topbarFooter.showLanguageSwitcher)}
                            onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showLanguageSwitcher: e.target.checked } }))}
                            className="h-4 w-4 rounded accent-[#6c47ff]"
                          />
                          Show Language Switcher in Topbar
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. STOREFRONT HOME FOOTER (Master Toggle & Full Customization) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Storefront Home Footer</h3>
                      <p className="text-xs text-slate-500">
                        Displayed exclusively on the Storefront Home page (hidden automatically during checkout &amp; tracking).
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.topbarFooter.showFooter !== false}
                        onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showFooter: e.target.checked } }))}
                        className="h-4 w-4 rounded accent-[#6c47ff]"
                      />
                      <span>Enable Storefront Footer</span>
                    </label>
                  </div>

                  {config.topbarFooter.showFooter !== false ? (
                    <div className="space-y-6">
                      {/* Footer Layout & Colors */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Footer Layout Style</label>
                          <select
                            value={config.topbarFooter.footerLayout || "columns"}
                            onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, footerLayout: e.target.value as any } }))}
                            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 font-medium"
                          >
                            <option value="columns">4-Column Comprehensive (Standard)</option>
                            <option value="centered">Centered Stack (Clean &amp; Minimal)</option>
                            <option value="minimal">2-Column Compact</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Footer Background Color</label>
                          <div className="mt-1.5 flex h-10 items-center rounded-lg border border-slate-200 p-1">
                            <input
                              type="color"
                              value={config.topbarFooter.footerBgColor || "#ffffff"}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, footerBgColor: e.target.value } }))}
                              className="h-full w-full cursor-pointer border-0 bg-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Footer Text Color</label>
                          <div className="mt-1.5 flex h-10 items-center rounded-lg border border-slate-200 p-1">
                            <input
                              type="color"
                              value={config.topbarFooter.footerTextColor || "#475569"}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, footerTextColor: e.target.value } }))}
                              className="h-full w-full cursor-pointer border-0 bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Store Bio & Timings */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700">Footer Store Tagline / About Bio</label>
                          <textarea
                            rows={2}
                            value={config.topbarFooter.footerAboutText}
                            placeholder="Stock up on daily essentials or freshly prepared meals delivered to your doorstep."
                            onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, footerAboutText: e.target.value } }))}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-900 font-medium"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.topbarFooter.showStoreTimingsInFooter !== false}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showStoreTimingsInFooter: e.target.checked } }))}
                              className="h-4 w-4 rounded accent-[#6c47ff]"
                            />
                            Show Store Opening Hours in Footer
                          </label>
                        </div>
                        <div>
                          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.topbarFooter.showNewsletterInFooter !== false}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showNewsletterInFooter: e.target.checked } }))}
                              className="h-4 w-4 rounded accent-[#6c47ff]"
                            />
                            Show Newsletter Email Subscription
                          </label>
                        </div>
                        {config.topbarFooter.showNewsletterInFooter !== false && (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-slate-700">Newsletter Box Headline</label>
                            <input
                              type="text"
                              value={config.topbarFooter.newsletterHeadline || "Subscribe for Exclusive Store Offers"}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, newsletterHeadline: e.target.value } }))}
                              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                            />
                          </div>
                        )}
                      </div>

                      {/* Customer Support Block Settings */}
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Customer Support Column
                          </label>
                          <input
                            type="text"
                            value={config.topbarFooter.supportSectionTitle || "CUSTOMER SUPPORT"}
                            onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, supportSectionTitle: e.target.value } }))}
                            placeholder="CUSTOMER SUPPORT"
                            className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          <label className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.topbarFooter.showPhoneInFooter !== false}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showPhoneInFooter: e.target.checked } }))}
                              className="h-4 w-4 rounded accent-[#6c47ff]"
                            />
                            Show Phone Number
                          </label>
                          <label className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.topbarFooter.showEmailInFooter !== false}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showEmailInFooter: e.target.checked } }))}
                              className="h-4 w-4 rounded accent-[#6c47ff]"
                            />
                            Show Email Address
                          </label>
                          <label className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.topbarFooter.showAddressInFooter !== false}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showAddressInFooter: e.target.checked } }))}
                              className="h-4 w-4 rounded accent-[#6c47ff]"
                            />
                            Show Store Address
                          </label>
                          <label className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.topbarFooter.showInquiryInFooter !== false}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showInquiryInFooter: e.target.checked } }))}
                              className="h-4 w-4 rounded accent-[#6c47ff]"
                            />
                            Show &quot;Send Support Inquiry&quot; Link
                          </label>
                          <label className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2.5 text-xs text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.topbarFooter.showOrderTrackingLink !== false}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showOrderTrackingLink: e.target.checked } }))}
                              className="h-4 w-4 rounded accent-[#6c47ff]"
                            />
                            Show &quot;Track Your Order &rarr;&quot; Link
                          </label>
                        </div>
                      </div>

                      {/* Policies & Legal Block Settings */}
                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Policies &amp; Legal Column
                          </label>
                          <input
                            type="text"
                            value={config.topbarFooter.policiesSectionTitle || "POLICIES & LEGAL"}
                            onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, policiesSectionTitle: e.target.value } }))}
                            placeholder="POLICIES & LEGAL"
                            className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Return &amp; Replacement Policy Text</label>
                          <textarea
                            rows={2}
                            value={config.topbarFooter.refundPolicyText}
                            onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, refundPolicyText: e.target.value } }))}
                            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700">Privacy Policy Text</label>
                            <textarea
                              rows={2}
                              value={config.topbarFooter.privacyPolicyText}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, privacyPolicyText: e.target.value } }))}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700">Terms &amp; GST Note</label>
                            <textarea
                              rows={2}
                              value={config.topbarFooter.termsText}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, termsText: e.target.value } }))}
                              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-900"
                            />
                          </div>
                        </div>

                        {/* Payment Badges */}
                        <div className="pt-2 border-t border-slate-200/60 space-y-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.topbarFooter.showPaymentIconsInFooter !== false}
                              onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, showPaymentIconsInFooter: e.target.checked } }))}
                              className="h-4 w-4 rounded accent-[#6c47ff]"
                            />
                            Show Payment Badges in Footer (e.g. UPI, Visa, COD)
                          </label>
                          {config.topbarFooter.showPaymentIconsInFooter !== false && (
                            <div>
                              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                Payment Badges (comma-separated labels)
                              </label>
                              <input
                                type="text"
                                value={config.topbarFooter.paymentBadgesText ?? "UPI, Visa / MasterCard, Razorpay, COD"}
                                onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, paymentBadgesText: e.target.value } }))}
                                placeholder="UPI, Visa / MasterCard, Razorpay, COD"
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Copyright & Powered-By Line */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Copyright Line</label>
                          <input
                            type="text"
                            value={config.topbarFooter.footerCopyrightText}
                            placeholder={`© ${new Date().getFullYear()} ${config.basics.storeName || "store"}. All rights reserved.`}
                            onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, footerCopyrightText: e.target.value } }))}
                            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700">Powered-By Attribution Text</label>
                          <input
                            type="text"
                            value={config.topbarFooter.poweredByText || "Powered by Selfx Retail Enterprise Engine"}
                            onChange={(e) => setConfig((p) => ({ ...p, topbarFooter: { ...p.topbarFooter, poweredByText: e.target.value } }))}
                            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      The storefront footer is currently disabled. Toggle &quot;Enable Storefront Footer&quot; above to re-activate it.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* SUB-TAB 8: SOCIAL LINKS */}
            {settingsTab === "social" ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Social Media Profiles &amp; Sharing</h3>
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
                <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-700 w-fit">
                  <input
                    type="checkbox"
                    checked={config.social.enableSocialShareOnProducts}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        social: { ...p.social, enableSocialShareOnProducts: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded accent-[#6c47ff]"
                  />
                  Enable 1-Click WhatsApp Share button on product cards &amp; quick view
                </label>
              </div>
            ) : null}

            {/* SUB-TAB 9: HOMEPAGE BLOCKS */}
            {settingsTab === "blocks" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Modular Homepage Sections Builder</h3>
                    <p className="text-xs text-slate-500">Toggle, reorder, and customize titles &amp; item limits for every section on your online storefront.</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { type: "flash_deals", title: "Flash Deals & Weekly Offers", subtitle: "Discounted items highlight section" },
                        { type: "trust_strip", title: "Store Guarantee & Trust Strip", subtitle: "Delivery, warranty & payment badges" },
                        { type: "testimonials", title: "Customer Reviews & Testimonials", subtitle: "Verified shopper feedback cards" },
                        { type: "newsletter", title: "Newsletter & Deal Subscription", subtitle: "Collect customer email & WhatsApp" },
                        { type: "brand_marquee", title: "Shop by Brand Showcase", subtitle: "Featured brand tiles grid" },
                      ] as const
                    ).map((preset) => {
                      const exists = config.blocks.some((b) => b.type === preset.type);
                      if (exists) return null;
                      return (
                        <button
                          key={preset.type}
                          type="button"
                          onClick={() =>
                            setConfig((p) => ({
                              ...p,
                              blocks: [
                                ...p.blocks,
                                {
                                  id: `blk-${Date.now()}-${preset.type}`,
                                  title: preset.title,
                                  subtitle: preset.subtitle,
                                  type: preset.type,
                                  enabled: true,
                                  itemLimit: 8,
                                },
                              ],
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                        >
                          <Plus size={12} /> {preset.title.split(" ")[0]} {preset.title.split(" ")[1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {config.blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() =>
                              setConfig((p) => {
                                const next = [...p.blocks];
                                if (index > 0) {
                                  const tmp = next[index - 1]!;
                                  next[index - 1] = next[index]!;
                                  next[index] = tmp;
                                }
                                return { ...p, blocks: next };
                              })
                            }
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === config.blocks.length - 1}
                            onClick={() =>
                              setConfig((p) => {
                                const next = [...p.blocks];
                                if (index < next.length - 1) {
                                  const tmp = next[index + 1]!;
                                  next[index + 1] = next[index]!;
                                  next[index] = tmp;
                                }
                                return { ...p, blocks: next };
                              })
                            }
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={block.title}
                            onChange={(e) =>
                              setConfig((p) => ({
                                ...p,
                                blocks: p.blocks.map((b) => (b.id === block.id ? { ...b, title: e.target.value } : b)),
                              }))
                            }
                            className="h-7 w-full max-w-xs rounded border border-transparent bg-transparent px-1.5 text-xs font-semibold text-slate-900 focus:border-slate-300 focus:bg-white"
                          />
                          <div className="text-[11px] text-slate-500 px-1.5">{block.subtitle}</div>
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

      {/* SECTION 2: DEDICATED LOYALTY POINTS & CUSTOMER REWARDS PROGRAM */}
      {activeSection === "loyalty" ? (
        <div className="space-y-6">
          {/* Top KPI & Program Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Program Status</span>
                <Star className={`h-4 w-4 ${config.loyalty.enabled ? "text-amber-500" : "text-slate-400"}`} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">
                  {config.loyalty.enabled ? "Active Live" : "Disabled"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    config.loyalty.enabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {config.loyalty.enabled ? "POS + Storefront" : "Off"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{config.loyalty.programName || "Store Rewards Club"}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Earning Rate</span>
           
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                1 pt / ₹{config.loyalty.earnRupeesPerPoint || 100}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Effective cashback ~
                {(
                  ((config.loyalty.redeemPaisePerPoint || 100) /
                    100 /
                    Math.max(1, config.loyalty.earnRupeesPerPoint || 100)) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Redemption Value</span>
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                1 pt = ₹{((config.loyalty.redeemPaisePerPoint || 100) / 100).toFixed(2)}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Min {config.loyalty.minRedeemPoints} pts · Max {config.loyalty.maxRedeemPercent}% of bill
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Enrolled Members</span>
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {customers.filter((c) => (c.loyalty_points ?? 0) > 0).length}
                <span className="ml-1.5 text-xs font-medium text-slate-400">/ {customers.length} customers</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Total balance: {customers.reduce((acc, c) => acc + (c.loyalty_points ?? 0), 0).toLocaleString()} pts
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Loyalty Points &amp; Customer Rewards Configuration
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure omnichannel point accrual, checkout redemption caps, welcome bonuses, and VIP membership tier multipliers.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.loyalty.enabled}
                    onChange={(e) => {
                      const next: OnlineStoreConfig = {
                        ...config,
                        loyalty: { ...config.loyalty, enabled: e.target.checked },
                      };
                      void persistConfigImmediately(
                        next,
                        e.target.checked
                          ? "Loyalty Points program enabled across Storefront & POS."
                          : "Loyalty Points program paused."
                      );
                    }}
                    className="h-4 w-4 rounded accent-[#6c47ff]"
                  />
                  {config.loyalty.enabled ? "Program Enabled" : "Enable Loyalty Program"}
                </label>
                <button
                  type="button"
                  onClick={() => void persistConfigImmediately(config, "Loyalty Points configuration saved.")}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6c47ff] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#5a36eb] disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save Loyalty Rules"}
                </button>
              </div>
            </div>

            {/* Accrual & Redemption Core Rules */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Rewards Program Name</label>
                <input
                  type="text"
                  value={config.loyalty.programName ?? "Store Rewards Club"}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, programName: e.target.value },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">Displayed in customer checkout &amp; account wallet</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Spend Required per 1 Point (₹)</label>
                <input
                  type="number"
                  min={1}
                  value={config.loyalty.earnRupeesPerPoint}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, earnRupeesPerPoint: Math.max(1, Number(e.target.value) || 1) },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-semibold"
                />
                <p className="mt-1 text-[11px] text-slate-400">Customer earns 1 point for every ₹{config.loyalty.earnRupeesPerPoint} spent</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Redemption Value of 1 Point (Paise)</label>
                <input
                  type="number"
                  min={1}
                  value={config.loyalty.redeemPaisePerPoint}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, redeemPaisePerPoint: Math.max(1, Number(e.target.value) || 1) },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-semibold"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  100 paise = ₹1.00 discount per point (Currently ₹{((config.loyalty.redeemPaisePerPoint || 100) / 100).toFixed(2)}/pt)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Minimum Points Required to Redeem</label>
                <input
                  type="number"
                  min={0}
                  value={config.loyalty.minRedeemPoints}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, minRedeemPoints: Math.max(0, Number(e.target.value) || 0) },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">Minimum point balance before customer can redeem at checkout</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Max Bill Coverage (% of Order Subtotal)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.loyalty.maxRedeemPercent}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, maxRedeemPercent: Math.min(100, Math.max(1, Number(e.target.value) || 1)) },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">Caps maximum points discount to {config.loyalty.maxRedeemPercent}% of cart value</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Minimum Order Value for Redemption (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={config.loyalty.minOrderAmountToRedeem ?? 199}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, minOrderAmountToRedeem: Math.max(0, Number(e.target.value) || 0) },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">Cart must reach ₹{config.loyalty.minOrderAmountToRedeem ?? 199} to apply points</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">New Member Welcome Bonus (Points)</label>
                <input
                  type="number"
                  min={0}
                  value={config.loyalty.signupBonusPoints ?? 25}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, signupBonusPoints: Math.max(0, Number(e.target.value) || 0) },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Birthday Bonus Points</label>
                <input
                  type="number"
                  min={0}
                  value={config.loyalty.birthdayBonusPoints ?? 50}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, birthdayBonusPoints: Math.max(0, Number(e.target.value) || 0) },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Points Validity / Expiry (Days)</label>
                <input
                  type="number"
                  min={30}
                  value={config.loyalty.expiryDays ?? 365}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, expiryDays: Math.max(30, Number(e.target.value) || 365) },
                    }))
                  }
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
                />
              </div>
            </div>

            {/* Channel & Stackability Toggles */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.loyalty.enableOnlineEarnRedeem !== false}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, enableOnlineEarnRedeem: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded accent-[#6c47ff]"
                />
                Enable Earn &amp; Redeem on Online Storefront
              </label>
              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={config.loyalty.enablePosEarnRedeem !== false}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, enablePosEarnRedeem: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded accent-[#6c47ff]"
                />
                Enable Earn &amp; Redeem at POS Billing Counter
              </label>
              <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(config.loyalty.allowStackWithCoupons)}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      loyalty: { ...p.loyalty, allowStackWithCoupons: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded accent-[#6c47ff]"
                />
                Allow Combining Points with Promo Coupons
              </label>
            </div>

            {/* Tier Multipliers */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Membership Tiers &amp; Point Multipliers
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reward repeat shoppers automatically as their cumulative point balance grows.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={config.loyalty.tierEnabled !== false}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        loyalty: { ...p.loyalty, tierEnabled: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded accent-[#6c47ff]"
                  />
                  Enable VIP Tiers
                </label>
              </div>

              {config.loyalty.tierEnabled !== false && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-800">
                        SILVER TIER
                      </span>
                      <span className="text-xs font-bold text-slate-700">{config.loyalty.silverMultiplier ?? 1.25}x Points</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] font-medium text-slate-600">
                        Threshold (Pts)
                        <input
                          type="number"
                          value={config.loyalty.silverThresholdPoints ?? 500}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              loyalty: { ...p.loyalty, silverThresholdPoints: Number(e.target.value) || 0 },
                            }))
                          }
                          className="mt-1 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                        />
                      </label>
                      <label className="text-[11px] font-medium text-slate-600">
                        Multiplier
                        <input
                          type="number"
                          step="0.05"
                          value={config.loyalty.silverMultiplier ?? 1.25}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              loyalty: { ...p.loyalty, silverMultiplier: Number(e.target.value) || 1 },
                            }))
                          }
                          className="mt-1 h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        GOLD TIER
                      </span>
                      <span className="text-xs font-bold text-amber-800">{config.loyalty.goldMultiplier ?? 1.5}x Points</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] font-medium text-slate-600">
                        Threshold (Pts)
                        <input
                          type="number"
                          value={config.loyalty.goldThresholdPoints ?? 1500}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              loyalty: { ...p.loyalty, goldThresholdPoints: Number(e.target.value) || 0 },
                            }))
                          }
                          className="mt-1 h-8 w-full rounded border border-amber-200 bg-white px-2 text-xs"
                        />
                      </label>
                      <label className="text-[11px] font-medium text-slate-600">
                        Multiplier
                        <input
                          type="number"
                          step="0.05"
                          value={config.loyalty.goldMultiplier ?? 1.5}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              loyalty: { ...p.loyalty, goldMultiplier: Number(e.target.value) || 1 },
                            }))
                          }
                          className="mt-1 h-8 w-full rounded border border-amber-200 bg-white px-2 text-xs"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                        PLATINUM TIER
                      </span>
                      <span className="text-xs font-bold text-indigo-800">{config.loyalty.platinumMultiplier ?? 2.0}x Points</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-[11px] font-medium text-slate-600">
                        Threshold (Pts)
                        <input
                          type="number"
                          value={config.loyalty.platinumThresholdPoints ?? 5000}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              loyalty: { ...p.loyalty, platinumThresholdPoints: Number(e.target.value) || 0 },
                            }))
                          }
                          className="mt-1 h-8 w-full rounded border border-indigo-200 bg-white px-2 text-xs"
                        />
                      </label>
                      <label className="text-[11px] font-medium text-slate-600">
                        Multiplier
                        <input
                          type="number"
                          step="0.05"
                          value={config.loyalty.platinumMultiplier ?? 2.0}
                          onChange={(e) =>
                            setConfig((p) => ({
                              ...p,
                              loyalty: { ...p.loyalty, platinumMultiplier: Number(e.target.value) || 1 },
                            }))
                          }
                          className="mt-1 h-8 w-full rounded border border-indigo-200 bg-white px-2 text-xs"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* SECTION 3: ONLINE ORDERS (Production-Grade Omnichannel Order Desk) */}
      {activeSection === "orders" ? (
        <div className="space-y-5">
          {/* Online Orders KPI Strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Online Orders</span>
                <ShoppingBag className="h-4 w-4 text-[#6c47ff]" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{orders.length}</div>
              <div className="mt-1 text-xs text-slate-500">
                {orders.filter((o) => (o.fulfillment_mode ?? o.fulfillment) !== "pickup").length} Delivery ·{" "}
                {orders.filter((o) => (o.fulfillment_mode ?? o.fulfillment) === "pickup").length} Store Pickup
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Action Required</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-900">
                {orders.filter((o) => o.status === "placed" || o.status === "confirmed").length}
              </div>
              <div className="mt-1 text-xs text-amber-700">New &amp; confirmed orders awaiting packing</div>
            </div>

            <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/40 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-800">Packed / In Transit</span>
                <Truck className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-indigo-900">
                {orders.filter((o) => o.status === "packed" || o.status === "out_for_delivery").length}
              </div>
              <div className="mt-1 text-xs text-indigo-700">Ready for pickup or out with rider</div>
            </div>

            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">Online Gross Revenue</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-900">
                ₹
                {(
                  orders
                    .filter((o) => o.status !== "cancelled")
                    .reduce((acc, o) => acc + (o.total_paise ?? 0), 0) / 100
                ).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="mt-1 text-xs text-emerald-700">
                {orders.filter((o) => o.status === "completed").length} completed orders
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Online Storefront Orders</h2>
                <p className="text-xs text-slate-500">
                  Filter by status, fulfillment mode, or registered delivery time slot. Print thermal receipts or dispatch directly to riders.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/delivery"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Truck className="h-3.5 w-3.5 text-indigo-600" />
                  Open Delivery Dispatch Board →
                </a>
              </div>
            </div>

            {/* Search, Fulfillment Mode, Time Slot & Status Filter Bar */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="relative md:col-span-4">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Order #, customer name, mobile, PIN..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#6c47ff]"
                />
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 md:col-span-3">
                {(
                  [
                    { id: "all", label: "All Modes" },
                    { id: "delivery", label: "Delivery" },
                    { id: "pickup", label: "In-Store Pickup" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOrderFulfillmentFilter(m.id)}
                    className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition cursor-pointer ${
                      orderFulfillmentFilter === m.id
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="md:col-span-2">
                <select
                  value={orderSlotFilter}
                  onChange={(e) => setOrderSlotFilter(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                >
                  <option value="all">All Time Slots</option>
                  {Array.from(
                    new Set([
                      ...(config.deliverySlots ?? []).map((s) => s.label),
                      ...orders.map((o) => o.delivery_slot).filter((s): s is string => Boolean(s)),
                    ])
                  ).map((slotLabel) => (
                    <option key={slotLabel} value={slotLabel}>
                      {slotLabel}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto md:col-span-3">
                {["all", "placed", "confirmed", "packed", "out_for_delivery", "completed", "cancelled"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setOrderFilter(st)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold capitalize cursor-pointer ${
                      orderFilter === st
                        ? "bg-[#6c47ff] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {st.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Rich Order Cards / Table */}
            <div className="space-y-3">
              {orders
                .filter((o) => {
                  if (orderFilter !== "all" && o.status !== orderFilter) return false;
                  const mode = o.fulfillment_mode ?? o.fulfillment ?? "delivery";
                  if (orderFulfillmentFilter !== "all" && mode !== orderFulfillmentFilter) return false;
                  if (orderSlotFilter !== "all" && (o.delivery_slot || "") !== orderSlotFilter) return false;
                  const q = orderSearch.trim().toLowerCase();
                  if (!q) return true;
                  const hay = `${o.order_number ?? ""} ${o.id} ${o.customer_name ?? ""} ${o.customer_phone ?? ""} ${o.delivery_address ?? ""} ${o.pincode ?? ""} ${o.delivery_slot ?? ""}`.toLowerCase();
                  return hay.includes(q);
                })
                .map((order) => {
                  const mode = order.fulfillment_mode ?? order.fulfillment ?? "delivery";
                  const isSignedIn = order.customer_auth_mode === "signed_in";
                  const cleanPhone = (order.customer_phone ?? "").replace(/[^0-9]/g, "");
                  const statusTone =
                    order.status === "completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : order.status === "cancelled"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : order.status === "out_for_delivery"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : order.status === "packed"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-amber-50 text-amber-800 border-amber-200";

                  const nextStatusAction =
                    order.status === "placed"
                      ? { to: "confirmed", label: "Confirm Order" }
                      : order.status === "confirmed"
                      ? { to: "packed", label: "Mark Packed" }
                      : order.status === "packed" && mode === "delivery"
                      ? { to: "out_for_delivery", label: "Dispatch Order" }
                      : order.status === "packed" || order.status === "out_for_delivery"
                      ? { to: "completed", label: "Mark Completed" }
                      : null;

                  return (
                    <div
                      key={order.id}
                      className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs transition hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-bold text-slate-900">
                              {order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`}
                            </span>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusTone}`}>
                              {order.status.replace(/_/g, " ")}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                mode === "pickup"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-sky-50 text-sky-800 border border-sky-200"
                              }`}
                            >
                              {mode === "pickup" ? <Store className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                              {mode === "pickup" ? "In-Store Pickup" : "Doorstep Delivery"}
                            </span>
                            {order.delivery_slot ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                <Clock className="h-3 w-3" />
                                Slot: {order.delivery_slot}
                              </span>
                            ) : null}
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isSignedIn
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {isSignedIn ? <UserCheck className="h-3 w-3" /> : <UserMinus className="h-3 w-3" />}
                              {isSignedIn ? "Verified Sign-In" : "Guest Checkout"}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                            <span className="font-semibold text-slate-900">
                              {order.customer_name || "Online Customer"}
                            </span>
                            {order.customer_phone ? (
                              <span className="font-mono text-slate-600">{order.customer_phone}</span>
                            ) : null}
                            {order.delivery_address ? (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {order.delivery_address}
                                {order.pincode ? ` (${order.pincode})` : ""}
                              </span>
                            ) : null}
                            {order.created_at ? (
                              <span className="text-[11px] text-slate-400">
                                {new Date(order.created_at).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-right mr-2">
                            <div className="text-sm font-bold text-slate-900">
                              ₹{((order.total_paise ?? 0) / 100).toFixed(2)}
                            </div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              {order.payment_method ?? "cod"}
                            </div>
                          </div>

                          {cleanPhone ? (
                            <>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                title="Call Customer"
                              >
                                <Phone className="h-3 w-3 text-slate-500" />
                                Call
                              </a>
                              <a
                                href={`https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(
                                  `Hello ${order.customer_name || ""}, update regarding your order ${
                                    order.order_number ?? order.id.slice(0, 8)
                                  }${order.delivery_slot ? ` (Slot: ${order.delivery_slot})` : ""}.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                              >
                                <MessageSquare className="h-3 w-3 text-emerald-600" />
                                WhatsApp
                              </a>
                            </>
                          ) : null}

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedOrderReceipt({
                                number: order.order_number ?? `#${order.id.slice(0, 8).toUpperCase()}`,
                                store: order.store_name || config.basics.storeName || "Online Store",
                                city: order.city ?? config.contact.city ?? undefined,
                                created_at: order.created_at || new Date().toISOString(),
                                subtotal_paise: order.subtotal_paise ?? order.total_paise ?? 0,
                                discount_paise: order.discount_paise ?? 0,
                                total_paise: order.total_paise ?? 0,
                                payment_method: order.payment_method ?? "cod",
                                order_type: mode,
                                lines: ((order.lines ?? order.items) ?? []).map((it) => ({
                                  name: it.name,
                                  qty: it.qty,
                                  unit_price_paise: it.unit_price_paise,
                                  total_paise: it.total_paise ?? it.unit_price_paise * it.qty,
                                })),
                              })
                            }
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <FileText className="h-3 w-3 text-slate-500" />
                            Receipt
                          </button>

                          {nextStatusAction ? (
                            <button
                              type="button"
                              onClick={() => void updateOrderStatus(order.id, nextStatusAction.to)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#6c47ff] px-3 text-[11px] font-semibold text-white shadow-2xs hover:bg-[#5a36eb] cursor-pointer"
                            >
                              {nextStatusAction.label} →
                            </button>
                          ) : null}

                          <select
                            value={order.status}
                            onChange={(e) => void updateOrderStatus(order.id, e.target.value)}
                            className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700"
                          >
                            <option value="placed">Placed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="packed">Packed</option>
                            <option value="out_for_delivery">Out for Delivery</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Itemized Lines Strip */}
                      {(order.items ?? []).length > 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                          <span className="text-[11px] font-semibold text-slate-400">Items:</span>
                          {(order.items ?? []).map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                            >
                              <span>{item.name}</span>
                              <span className="font-bold text-slate-900">×{item.qty}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

              {orders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-xs text-slate-400">
                  No online orders matching the current filter.
                </div>
              ) : null}
            </div>
          </div>
          <ReceiptModal
            isOpen={selectedOrderReceipt !== null}
            data={selectedOrderReceipt}
            onClose={() => setSelectedOrderReceipt(null)}
          />
        </div>
      ) : null}

      {/* SECTION 4: COLLECTIONS */}
      {activeSection === "collections" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Curated Product Collections</h2>
              <p className="text-xs text-slate-500">
                Group products into seasonal or thematic collections. Collections are off by default on the storefront and can be turned on anytime.
              </p>
            </div>
            <label className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.themeConfig.showCollections)}
                onChange={(e) => {
                  const next: OnlineStoreConfig = {
                    ...config,
                    themeConfig: { ...config.themeConfig, showCollections: e.target.checked },
                  };
                  void persistConfigImmediately(
                    next,
                    e.target.checked
                      ? "Curated Collections enabled on Storefront."
                      : "Curated Collections hidden on Storefront (Off)."
                  );
                }}
                className="h-4 w-4 rounded accent-[#6c47ff]"
              />
              {config.themeConfig.showCollections ? "Showing on Storefront (On)" : "Show Collections on Storefront (Off by Default)"}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <input
              type="text"
              placeholder="Collection title (e.g. Monsoon Essentials)"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCollectionName.trim()) {
                  e.preventDefault();
                }
              }}
              className="h-9 flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-xs"
            />
            <input
              type="text"
              placeholder="Short subtitle (e.g. Top daily picks)"
              value={newCollectionDesc}
              onChange={(e) => setNewCollectionDesc(e.target.value)}
              className="h-9 flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                const title = newCollectionName.trim();
                if (!title) return;
                const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                const desc = newCollectionDesc.trim() || "Curated storefront collection";
                const newCol: CollectionItem = {
                  id: `col-${Date.now()}`,
                  name: title,
                  slug,
                  description: desc,
                  productCount: 0,
                  featured: true,
                  enabled: true,
                  sortOrder: config.collections.length + 1,
                };
                const next: OnlineStoreConfig = {
                  ...config,
                  collections: [...config.collections, newCol],
                };
                setNewCollectionName("");
                setNewCollectionDesc("");
                void persistConfigImmediately(next, `Collection "${title}" added & saved.`);
                void (async () => {
                  try {
                    const token = await csrfToken();
                    await fetch("/api/v1/catalog/own/categories", {
                      method: "POST",
                      credentials: "include",
                      headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-XSRF-TOKEN": token,
                      },
                      body: JSON.stringify({
                        name: title,
                        slug,
                        description: desc,
                        online_visible: true,
                      }),
                    });
                  } catch {
                    // ignore category sync fallback
                  }
                })();
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6c47ff] px-4 text-xs font-semibold text-white hover:bg-[#5a36eb] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Collection
            </button>
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
                    onClick={() => {
                      const next: OnlineStoreConfig = {
                        ...config,
                        collections: config.collections.map((c) =>
                          c.id === col.id ? { ...c, enabled: !c.enabled } : c
                        ),
                      };
                      void persistConfigImmediately(next, `Collection "${col.name}" status updated.`);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                      col.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {col.enabled ? "Active" : "Paused"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next: OnlineStoreConfig = {
                        ...config,
                        collections: config.collections.filter((c) => c.id !== col.id),
                      };
                      void persistConfigImmediately(next, `Collection "${col.name}" removed.`);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {config.collections.length === 0 ? (
              <div className="md:col-span-2 rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                No collections created yet. Enter a collection title above and click + Add Collection.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* SECTION 5: BANNERS */}
      {activeSection === "banners" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Promotional Campaign Banners</h2>
              <p className="text-xs text-slate-500">
                Manage hero sliders, mid-page festival banners, and offer strips. Banners are off by default and can be turned on anytime.
              </p>
            </div>
            <label className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.themeConfig.showBanners)}
                onChange={(e) => {
                  const next: OnlineStoreConfig = {
                    ...config,
                    themeConfig: { ...config.themeConfig, showBanners: e.target.checked },
                  };
                  void persistConfigImmediately(
                    next,
                    e.target.checked
                      ? "Promotional Banners enabled on Storefront."
                      : "Promotional Banners hidden on Storefront (Off)."
                  );
                }}
                className="h-4 w-4 rounded accent-[#6c47ff]"
              />
              {config.themeConfig.showBanners ? "Showing on Storefront (On)" : "Show Banners on Storefront (Off by Default)"}
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <input
              type="text"
              placeholder="Badge (e.g. UP TO 40% OFF)"
              value={newBannerBadge}
              onChange={(e) => setNewBannerBadge(e.target.value)}
              className="h-9 w-36 rounded-lg border border-slate-200 bg-white px-3 text-xs"
            />
            <input
              type="text"
              placeholder="Banner headline"
              value={newBannerTitle}
              onChange={(e) => setNewBannerTitle(e.target.value)}
              className="h-9 flex-1 min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 text-xs"
            />
            <input
              type="text"
              placeholder="Offer subtitle"
              value={newBannerSubtitle}
              onChange={(e) => setNewBannerSubtitle(e.target.value)}
              className="h-9 flex-1 min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 text-xs"
            />
            <select
              value={newBannerPlacement}
              onChange={(e) => setNewBannerPlacement(e.target.value as "home_top" | "home_mid" | "category_header" | "popup")}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
            >
              <option value="home_top">Top Hero Strip</option>
              <option value="home_mid">Mid-Page Promo Tile</option>
              <option value="category_header">Category Header</option>
              <option value="popup">Offer Highlight</option>
            </select>
            <input
              type="color"
              value={newBannerColor}
              onChange={(e) => setNewBannerColor(e.target.value)}
              className="h-9 w-10 cursor-pointer rounded-lg border border-slate-200 p-1 bg-white"
            />
            <button
              type="button"
              onClick={() => {
                const title = newBannerTitle.trim();
                if (!title) return;
                const newBan: BannerItem = {
                  id: `ban-${Date.now()}`,
                  title,
                  subtitle: newBannerSubtitle.trim() || "Special online storefront promotion",
                  ctaText: "Shop Now",
                  ctaLink: "#catalog-grid",
                  placement: newBannerPlacement,
                  badgeText: newBannerBadge.trim() || "SPECIAL OFFER",
                  bgColor: newBannerColor || "#1d4ed8",
                  enabled: true,
                };
                const next: OnlineStoreConfig = {
                  ...config,
                  banners: [...config.banners, newBan],
                };
                setNewBannerTitle("");
                setNewBannerSubtitle("");
                void persistConfigImmediately(next, `Banner "${title}" added & saved.`);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6c47ff] px-4 text-xs font-semibold text-white hover:bg-[#5a36eb] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Banner
            </button>
          </div>

          <div className="space-y-3">
            {config.banners.map((ban) => (
              <div key={ban.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl shrink-0 shadow-xs" style={{ backgroundColor: ban.bgColor }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{ban.badgeText}</span>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{ban.placement}</span>
                    </div>
                    <h4 className="mt-1 text-sm font-semibold text-slate-900">{ban.title}</h4>
                    <p className="text-xs text-slate-500">{ban.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next: OnlineStoreConfig = {
                        ...config,
                        banners: config.banners.map((b) => (b.id === ban.id ? { ...b, enabled: !b.enabled } : b)),
                      };
                      void persistConfigImmediately(next, `Banner "${ban.title}" status updated.`);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      ban.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {ban.enabled ? "Live" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next: OnlineStoreConfig = {
                        ...config,
                        banners: config.banners.filter((b) => b.id !== ban.id),
                      };
                      void persistConfigImmediately(next, `Banner "${ban.title}" removed.`);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {config.banners.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                No promotional banners added yet. Add a banner above and toggle &quot;Show Banners on Storefront&quot; when ready.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* SECTION 6: SUBSCRIBERS */}
      {activeSection === "subscribers" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Newsletter &amp; WhatsApp Deal Subscribers</h2>
              <p className="text-xs text-slate-500">Customers who subscribed via the storefront newsletter box or manual console entry.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="email"
                placeholder="Customer email"
                value={newSubEmail}
                onChange={(e) => setNewSubEmail(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
              />
              <input
                type="text"
                placeholder="WhatsApp / Mobile"
                value={newSubPhone}
                onChange={(e) => setNewSubPhone(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newSubEmail.trim() && !newSubPhone.trim()) return;
                  const newSub: SubscriberItem = {
                    id: `sub-${Date.now()}`,
                    email: newSubEmail.trim() || "—",
                    phone: newSubPhone.trim() || "—",
                    source: "Manual Console Entry",
                    subscribedAt: new Date().toISOString().slice(0, 10),
                    status: "active",
                  };
                  const next: OnlineStoreConfig = {
                    ...config,
                    subscribers: [newSub, ...config.subscribers],
                  };
                  setNewSubEmail("");
                  setNewSubPhone("");
                  void persistConfigImmediately(next, "Subscriber added & saved.");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white hover:bg-[#5a36eb] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add Subscriber
              </button>
              {config.subscribers.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const csv = [
                      "Email,Phone,Source,SubscribedOn,Status",
                      ...config.subscribers.map(
                        (s) => `"${s.email}","${s.phone}","${s.source}","${s.subscribedAt}","${s.status}"`
                      ),
                    ].join("\n");
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "storefront-subscribers.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Export CSV
                </button>
              ) : null}
            </div>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase text-slate-400">
                <th className="pb-2.5">Email</th>
                <th className="pb-2.5">WhatsApp / Phone</th>
                <th className="pb-2.5">Source</th>
                <th className="pb-2.5">Subscribed On</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Action</th>
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
                    <button
                      type="button"
                      onClick={() => {
                        const next: OnlineStoreConfig = {
                          ...config,
                          subscribers: config.subscribers.map((s) =>
                            s.id === sub.id ? { ...s, status: s.status === "active" ? "unsubscribed" : "active" } : s
                          ),
                        };
                        void persistConfigImmediately(next, "Subscriber status updated.");
                      }}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize cursor-pointer ${
                        sub.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {sub.status}
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        const next: OnlineStoreConfig = {
                          ...config,
                          subscribers: config.subscribers.filter((s) => s.id !== sub.id),
                        };
                        void persistConfigImmediately(next, "Subscriber removed.");
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {config.subscribers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No subscribers yet. Customers subscribing from the storefront footer/newsletter box will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* SECTION 7: MESSAGES */}
      {activeSection === "messages" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Customer Inquiries &amp; Support Messages</h2>
            <p className="text-xs text-slate-500">Inquiries sent by shoppers from your online storefront Contact / Help drawer appear here.</p>
          </div>
          <div className="space-y-3">
            {config.messages.map((msg) => (
              <div key={msg.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-900">{msg.subject}</span>
                    <div className="text-xs text-slate-500">
                      {msg.customerName} · {msg.phone} · {msg.email} {msg.createdAt ? `· ${msg.createdAt}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={msg.status}
                      onChange={(e) => {
                        const next: OnlineStoreConfig = {
                          ...config,
                          messages: config.messages.map((m) =>
                            m.id === msg.id ? { ...m, status: e.target.value as "unread" | "replied" | "resolved" } : m
                          ),
                        };
                        void persistConfigImmediately(next, "Inquiry status updated.");
                      }}
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold capitalize text-indigo-700"
                    >
                      <option value="unread">Unread</option>
                      <option value="replied">Replied</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const next: OnlineStoreConfig = {
                          ...config,
                          messages: config.messages.filter((m) => m.id !== msg.id),
                        };
                        void persistConfigImmediately(next, "Inquiry deleted.");
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2.5 text-xs text-slate-700 leading-relaxed">{msg.message}</p>
              </div>
            ))}
            {config.messages.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                No customer inquiries yet.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* SECTION 8: INVITE & PROMO CODES */}
      {activeSection === "invite-codes" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Invite &amp; Storefront Promo Codes</h2>
              <p className="text-xs text-slate-500">Create referral invite codes and instant checkout discount coupons that customers can apply in their cart.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Code (e.g. WELCOME10)"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="h-9 w-36 rounded-lg border border-slate-200 px-3 text-xs font-mono uppercase"
              />
              <select
                value={newCodeType}
                onChange={(e) => setNewCodeType(e.target.value as "percentage" | "fixed" | "free_shipping")}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
              >
                <option value="percentage">% Percentage Off</option>
                <option value="fixed">₹ Flat Discount</option>
                <option value="free_shipping">Free Delivery</option>
              </select>
              {newCodeType !== "free_shipping" && (
                <input
                  type="number"
                  placeholder="Value"
                  value={newCodeValue}
                  onChange={(e) => setNewCodeValue(e.target.value)}
                  className="h-9 w-20 rounded-lg border border-slate-200 px-3 text-xs"
                />
              )}
              <input
                type="number"
                placeholder="Min Order ₹"
                value={newCodeMinOrder}
                onChange={(e) => setNewCodeMinOrder(e.target.value)}
                className="h-9 w-28 rounded-lg border border-slate-200 px-3 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  const cleanCode = newCode.trim().toUpperCase();
                  if (!cleanCode) return;
                  const val = newCodeType === "free_shipping" ? 0 : Number(newCodeValue) || 10;
                  const minOrd = Number(newCodeMinOrder) || 0;
                  const newInv: InviteCodeItem = {
                    id: `inv-${Date.now()}`,
                    code: cleanCode,
                    discountType: newCodeType,
                    discountValue: val,
                    minOrderAmount: minOrd,
                    usageCount: 0,
                    maxUsage: 500,
                    expiresAt: "2026-12-31",
                    enabled: true,
                  };
                  const next: OnlineStoreConfig = {
                    ...config,
                    inviteCodes: [...config.inviteCodes, newInv],
                  };
                  setNewCode("");
                  void persistConfigImmediately(next, `Promo code "${cleanCode}" created & active on checkout.`);
                  void (async () => {
                    try {
                      const token = await csrfToken();
                      await fetch("/api/v1/coupons", {
                        method: "POST",
                        credentials: "include",
                        headers: {
                          Accept: "application/json",
                          "Content-Type": "application/json",
                          "X-XSRF-TOKEN": token,
                        },
                        body: JSON.stringify({
                          code: cleanCode,
                          discount_paise: Math.round(val * 100),
                          min_order_paise: Math.round(minOrd * 100),
                        }),
                      });
                    } catch {
                      // ignore backend coupon sync fallback
                    }
                  })();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white hover:bg-[#5a36eb] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Create Code
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {config.inviteCodes.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 font-mono text-xs font-bold text-indigo-700">{inv.code}</span>
                    <span className="text-xs font-bold text-emerald-700">
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
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const next: OnlineStoreConfig = {
                        ...config,
                        inviteCodes: config.inviteCodes.map((c) =>
                          c.id === inv.id ? { ...c, enabled: !c.enabled } : c
                        ),
                      };
                      void persistConfigImmediately(next, `Promo code "${inv.code}" updated.`);
                    }}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                      inv.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {inv.enabled ? "Active on Checkout" : "Disabled"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next: OnlineStoreConfig = {
                        ...config,
                        inviteCodes: config.inviteCodes.filter((c) => c.id !== inv.id),
                      };
                      void persistConfigImmediately(next, `Promo code "${inv.code}" deleted.`);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {config.inviteCodes.length === 0 && (
              <div className="md:col-span-3 rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                No promo codes created yet. Create a code like WELCOME10 above to enable it immediately at checkout.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* SECTION 9, 10, 11: CUSTOMER SEGMENTS (Pending, Guest, With Login) */}
      {activeSection === "pending-customers" ||
      activeSection === "guest-customers" ||
      activeSection === "registered-customers" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {activeSection === "pending-customers"
                  ? "Pending B2B / Wholesale Customer Approvals"
                  : activeSection === "guest-customers"
                  ? "Customers Without Login (Express Guest Checkout)"
                  : "Registered Storefront Customers (With OTP / Account Login)"}
              </h2>
              <p className="text-xs text-slate-500">
                {activeSection === "pending-customers"
                  ? "Customers awaiting credit/wholesale account verification."
                  : activeSection === "guest-customers"
                  ? "Shoppers who placed express orders using Guest Checkout without OTP login."
                  : "Verified customers with complete profile or loyalty points."}
              </p>
            </div>
            <input
              type="text"
              placeholder="Search name or mobile..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="h-9 w-60 rounded-lg border border-slate-200 px-3 text-xs"
            />
          </div>
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
              {customers
                .filter((c) => {
                  const q = customerSearch.trim().toLowerCase();
                  if (q && !c.name.toLowerCase().includes(q) && !c.phone.toLowerCase().includes(q)) return false;
                  if (activeSection === "pending-customers") return (c.loyalty_points ?? 0) === 0 && !c.email;
                  if (activeSection === "guest-customers") return !c.email;
                  return Boolean(c.email) || (c.loyalty_points ?? 0) > 0 || customers.length > 0;
                })
                .map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3 text-slate-600">{c.phone}</td>
                    <td className="py-3 text-slate-500">{c.email || "—"}</td>
                    <td className="py-3 font-semibold text-indigo-700">{c.loyalty_points ?? 0} pts</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          activeSection === "pending-customers"
                            ? "bg-amber-50 text-amber-700"
                            : activeSection === "guest-customers"
                            ? "bg-sky-50 text-sky-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {activeSection === "pending-customers"
                          ? "Pending Review"
                          : activeSection === "guest-customers"
                          ? "Guest Shopper"
                          : "Verified Member"}
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

      {/* SECTION 12: SHIPPING METHODS, REGISTERED LOCATIONS & DELIVERY SLOTS */}
      {activeSection === "shipping" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Delivery Availability, Registered Locations, Time Slots &amp; Shipping Rules
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage registered serviceable PIN codes/locations, delivery time slots, standard delivery fees, and free shipping thresholds.
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

            {/* Registered Serviceable Locations Manager */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Registered Serviceable Delivery Locations &amp; PIN Codes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Delivery can only be made for the locations registered here. Displayed beside the Orders button in the storefront banner.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableDeliveryAvailability !== false}
                    onChange={(e) => {
                      const next: OnlineStoreConfig = {
                        ...config,
                        enableDeliveryAvailability: e.target.checked,
                        themeConfig: { ...config.themeConfig, enablePinCodeChecker: e.target.checked },
                      };
                      void persistConfigImmediately(next, "Delivery Availability banner toggle updated.");
                    }}
                    className="h-4 w-4 rounded accent-[#6c47ff]"
                  />
                  Show Delivery Availability in Storefront Banner
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-6 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <input
                  type="text"
                  placeholder="Area / Locality Name (e.g. Indiranagar)"
                  value={newLocArea}
                  onChange={(e) => setNewLocArea(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="PIN Code (e.g. 560038)"
                  value={newLocPin}
                  onChange={(e) => setNewLocPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-mono"
                />
                <input
                  type="number"
                  placeholder="Fee ₹"
                  value={newLocFee}
                  onChange={(e) => setNewLocFee(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                />
                <input
                  type="text"
                  placeholder="ETA (e.g. 30–45 mins)"
                  value={newLocEta}
                  onChange={(e) => setNewLocEta(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newLocArea.trim() && !newLocPin.trim()) return;
                    const nextLoc: ServiceableLocationItem = {
                      id: `loc-${Date.now()}`,
                      areaName: newLocArea.trim() || `PIN ${newLocPin.trim()}`,
                      pinCode: newLocPin.trim() || "All",
                      deliveryFee: Number(newLocFee) || 0,
                      minOrderAmount: Number(newLocMinOrder) || 0,
                      etaText: newLocEta.trim() || "30–45 mins",
                      enabled: true,
                    };
                    const next: OnlineStoreConfig = {
                      ...config,
                      serviceableLocations: [...(config.serviceableLocations ?? []), nextLoc],
                    };
                    setNewLocArea("");
                    setNewLocPin("");
                    void persistConfigImmediately(next, "Serviceable location registered & saved.");
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#5b3ae6] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Register Location
                </button>
              </div>

              {(config.serviceableLocations ?? []).length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(config.serviceableLocations ?? []).map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">{loc.areaName}</span>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700">
                            {loc.pinCode}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {loc.deliveryFee === 0 ? "Free Delivery" : `₹${loc.deliveryFee} Fee`} · {loc.etaText}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const next: OnlineStoreConfig = {
                              ...config,
                              serviceableLocations: (config.serviceableLocations ?? []).map((l) =>
                                l.id === loc.id ? { ...l, enabled: !l.enabled } : l
                              ),
                            };
                            void persistConfigImmediately(next, "Location status updated.");
                          }}
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                            loc.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {loc.enabled ? "Active" : "Paused"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next: OnlineStoreConfig = {
                              ...config,
                              serviceableLocations: (config.serviceableLocations ?? []).filter((l) => l.id !== loc.id),
                            };
                            void persistConfigImmediately(next, "Serviceable location deleted.");
                          }}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Registered Delivery Time Slots */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Registered Delivery Time Slots (Shown on Checkout &amp; Order Cards)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Register the delivery time slots shoppers can pick during checkout. Reflected on Delivery Orders and Online Orders cards.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                <input
                  type="text"
                  placeholder="Slot Title (e.g. Morning 9 AM – 12 PM)"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Subtitle (e.g. Today / Express)"
                  value={newSlotSublabel}
                  onChange={(e) => setNewSlotSublabel(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:col-span-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newSlotLabel.trim()) return;
                    const nextSlot: DeliverySlotItem = {
                      id: `slot-${Date.now()}`,
                      label: newSlotLabel.trim(),
                      sublabel: newSlotSublabel.trim() || "Scheduled Window",
                      feeAmount: 0,
                      cutoffInfo: "",
                      enabled: true,
                    };
                    const next: OnlineStoreConfig = {
                      ...config,
                      deliverySlots: [...(config.deliverySlots ?? []), nextSlot],
                    };
                    setNewSlotLabel("");
                    setNewSlotSublabel("");
                    void persistConfigImmediately(next, "Delivery time slot added & saved.");
                  }}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#6c47ff] px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#5b3ae6] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Time Slot
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {(config.deliverySlots ?? []).map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{slot.label}</div>
                      <div className="text-[11px] text-slate-500">{slot.sublabel}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next: OnlineStoreConfig = {
                            ...config,
                            deliverySlots: (config.deliverySlots ?? []).map((s) =>
                              s.id === slot.id ? { ...s, enabled: !s.enabled } : s
                            ),
                          };
                          void persistConfigImmediately(next, "Delivery slot updated.");
                        }}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                          slot.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {slot.enabled ? "Active" : "Off"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next: OnlineStoreConfig = {
                            ...config,
                            deliverySlots: (config.deliverySlots ?? []).filter((s) => s.id !== slot.id),
                          };
                          void persistConfigImmediately(next, "Delivery slot deleted.");
                        }}
                        className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hyperlocal Zones & Custom Delivery Methods */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Delivery Zones &amp; Custom Shipping Methods
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
                    const next: OnlineStoreConfig = {
                      ...config,
                      shippingMethods: [
                        ...config.shippingMethods,
                        {
                          id: `shp-${Date.now()}`,
                          name: newShippingName.trim(),
                          zone: newShippingZone.trim() || "All Local PINs",
                          pinCodes: newShippingZone.trim() || "All",
                          etaText: newShippingEta || "45–60 mins",
                          feeAmount: Number(newShippingFee) || 0,
                          freeAboveAmount: Number(newShippingFreeAbove) || 499,
                          codAvailable: true,
                          enabled: true,
                        },
                      ],
                    };
                    setNewShippingName("");
                    setNewShippingZone("");
                    void persistConfigImmediately(next, "Shipping method added & saved.");
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
                        onClick={() => {
                          const next: OnlineStoreConfig = {
                            ...config,
                            shippingMethods: config.shippingMethods.filter((s) => s.id !== shp.id),
                          };
                          void persistConfigImmediately(next, "Shipping method removed.");
                        }}
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
                    const next: OnlineStoreConfig = {
                      ...config,
                      taxRates: [
                        ...config.taxRates,
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
                    };
                    setNewTaxName("");
                    setNewTaxHsn("");
                    void persistConfigImmediately(next, "Tax slab added & saved.");
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
                            onClick={() => {
                              const next: OnlineStoreConfig = {
                                ...config,
                                taxRates: config.taxRates.filter((t) => t.id !== tax.id),
                              };
                              void persistConfigImmediately(next, "Tax slab removed.");
                            }}
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
