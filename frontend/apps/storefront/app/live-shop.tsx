"use client";

import { formatInr } from "@selfx/types";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Copy,
  CreditCard,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Info,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Minus,
  Moon,
  MoreVertical,
  Navigation,
  PackageCheck,
  Phone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Sun,
  Tag,
  Truck,
  User,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  sendFirebaseOtp,
  humanizeFirebaseError,
  type FirebaseConfirmationResult,
} from "./lib/firebase-phone";
import { StorefrontAiWidget } from "./storefront-ai-widget";
import { LiveOrderMap } from "./components/live-order-map";
import { StorefrontThemedCatalog } from "./theme-layouts";
import { TryOnStudioModal } from "./components/tryon-studio-modal";
import { PaymentPageView } from "./components/payment-page-view";

function stripEmojis(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

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
    enabled?: boolean;
    storeName?: string;
    storeTheme?: string;
    storeTagline?: string;
    storeUrlPath?: string;
    currency?: string;
    defaultLanguage?: string;
    displayCurrency?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    guestCheckout?: boolean;
    phoneSignIn?: boolean;
    minOrderAmount?: number;
    maxOrderAmount?: number;
    hideOutOfStock?: boolean;
    allowBackorders?: boolean;
    showStockCount?: boolean;
    lowStockBadgeThreshold?: number;
  };
  loyalty?: {
    enabled?: boolean;
    earnRupeesPerPoint?: number;
    redeemPaisePerPoint?: number;
    minRedeemPoints?: number;
    maxRedeemPercent?: number;
  };
  contact?: {
    supportEmail?: string;
    supportPhone?: string;
    whatsappNumber?: string;
    storeAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
    postalCode?: string;
    openingTime?: string;
    closingTime?: string;
    enableFloatingWhatsapp?: boolean;
    whatsappPrefillText?: string;
    openingHoursText?: string;
    supportHoursText?: string;
    googleMapsApiKey?: string;
    storeLatitude?: number;
    storeLongitude?: number;
  };
  branding?: {
    logoUrl?: string;
    darkLogoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    brandTagline?: string;
    borderRadiusStyle?: "sharp" | "rounded" | "pill" | string;
    cardShadowStyle?: "none" | "soft" | "elevated" | "flat" | "subtle" | string;
    buttonStyle?: "solid" | "gradient" | "outline" | string;
    badgeColor?: string;
    headerBackground?: string;
  };
  hero?: {
    enabled?: boolean;
    showHero?: boolean;
    layout?: string;
    headline?: string;
    subheadline?: string;
    eyebrowBadge?: string;
    primaryCtaLabel?: string;
    secondaryCtaLabel?: string;
    ctaText?: string;
    bannerImageUrl?: string;
    deliveryTimeText?: string;
    promoHighlightText?: string;
    showTrustPills?: boolean;
    trustPill1?: string;
    trustPill2?: string;
    trustPill3?: string;
  };
  topbarFooter?: {
    showTopbar?: boolean;
    topbarText?: string;
    topbarBgColor?: string;
    topbarTextColor?: string;
    topbarLinkLabel?: string;
    topbarLinkHref?: string;
    showLanguageSwitcher?: boolean;
    showStoreLocatorLink?: boolean;
    showOrderTrackingLink?: boolean;
    showFooter?: boolean;
    footerLayout?: "columns" | "centered" | "minimal";
    footerBgColor?: string;
    footerTextColor?: string;
    footerAboutText?: string;
    showStoreTimingsInFooter?: boolean;
    showNewsletterInFooter?: boolean;
    newsletterHeadline?: string;
    supportSectionTitle?: string;
    showPhoneInFooter?: boolean;
    showEmailInFooter?: boolean;
    showAddressInFooter?: boolean;
    showInquiryInFooter?: boolean;
    policiesSectionTitle?: string;
    refundPolicyText?: string;
    privacyPolicyText?: string;
    termsText?: string;
    showPaymentIconsInFooter?: boolean;
    paymentBadgesText?: string;
    footerCopyrightText?: string;
    showPoweredBy?: boolean;
    poweredByText?: string;
    showDownloadAppBadges?: boolean;
    playStoreUrl?: string;
    appStoreUrl?: string;
  };
  themeConfig?: {
    activeTheme?: string;
    showBanners?: boolean;
    showCollections?: boolean;
    showMrpStrike?: boolean;
    showDiscountPercentageBadge?: boolean;
    showBrandOnCard?: boolean;
    showSkuOnCard?: boolean;
    showQuickViewModal?: boolean;
    showAddToWishlist?: boolean;
    productGridColumnsDesktop?: number;
    productGridColumnsMobile?: number;
    productCardVariant?: string;
    stickyHeader?: boolean;
    stickyCartBarMobile?: boolean;
    enablePinCodeChecker?: boolean;
    enableDeliverySlotPicker?: boolean;
    enableStorePickupToggle?: boolean;
  };
  enableDeliveryAvailability?: boolean;
  serviceableLocations?: {
    id: string;
    areaName: string;
    pinCode: string;
    deliveryFee: number;
    minOrderAmount: number;
    etaText: string;
    enabled: boolean;
  }[];
  deliverySlots?: {
    id: string;
    label: string;
    sublabel: string;
    feeAmount: number;
    cutoffInfo?: string;
    enabled: boolean;
  }[];
  social?: {
    instagram?: string;
    facebook?: string;
    twitterX?: string;
    youtube?: string;
    whatsappChannel?: string;
    telegram?: string;
    whatsapp?: string;
    enableSocialShareOnProducts?: boolean;
  };
  blocks?: {
    id: string;
    title: string;
    subtitle: string;
    type: string;
    enabled: boolean;
    itemLimit: number;
  }[];
  collections?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    enabled: boolean;
  }[];
  banners?: {
    id: string;
    title: string;
    subtitle: string;
    ctaText?: string;
    ctaLink?: string;
    placement?: string;
    badgeText?: string;
    bgColor?: string;
    enabled?: boolean;
  }[];
  inviteCodes?: {
    id: string;
    code: string;
    discountType: "percentage" | "fixed" | "free_shipping";
    discountValue: number;
    minOrderAmount: number;
    enabled: boolean;
  }[];
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
const SAVED_ADDRESSES_STORAGE_KEY = "selfx_storefront_saved_addresses_v2";

export type SavedCustomerAddress = {
  id: string;
  label: string; // "Home" | "Work" | "Other"
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

const FINISHED_ORDER_STATUSES = new Set(["delivered", "picked_up", "completed", "cancelled", "rejected"]);

export function computeVerificationCode(orderNumber?: string, id?: string): string {
  const source = `${orderNumber ?? ""} ${id ?? ""}`;
  const digits = source.replace(/\D+/g, "");
  if (!digits) return "2045";
  const lastFour = digits.slice(-4);
  return lastFour.length === 4 ? lastFour : lastFour.padStart(4, "0");
}

function openTrackingOrder(orders: { status?: string }[]) {
  return orders.find((order) => !FINISHED_ORDER_STATUSES.has(String(order.status || "").toLowerCase())) ?? null;
}

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
  const [storeUpiVpa, setStoreUpiVpa] = useState<string>("");
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
  const [quickViewItem, setQuickViewItem] = useState<StorefrontProduct | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState<"refund" | "privacy" | "terms" | null>(null);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [pincodeValid, setPincodeValid] = useState<boolean | null>(null);
  const [deliveryPopoverOpen, setDeliveryPopoverOpen] = useState(false);
  const [deliverySlot, setDeliverySlot] = useState("");
  const [smsOtpEnabled, setSmsOtpEnabled] = useState(false);
  const [activePaymentGateways, setActivePaymentGateways] = useState<string[]>([]);
  const [gatewayStatuses, setGatewayStatuses] = useState<Record<string, string>>({});
  const [gatewayConfigs, setGatewayConfigs] = useState<Record<string, any>>({});
  const [tryOnItem, setTryOnItem] = useState<StorefrontProduct | null>(null);
  const [upiUtr, setUpiUtr] = useState<string>("");
  const [upiUtrError, setUpiUtrError] = useState<string | null>(null);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [paymentTimerSeconds, setPaymentTimerSeconds] = useState(300); // 5 mins countdown (Image 1)
  const [customerAuthMode, setCustomerAuthMode] = useState<"signed_in" | "guest">("guest");
  const [isVerifiedSignIn, setIsVerifiedSignIn] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const storefrontFirebaseConfirmation = useRef<FirebaseConfirmationResult | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "percentage" | "fixed" | "free_shipping";
    discountValue: number;
  } | null>(null);
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSent, setContactSent] = useState(false);

  // Checkout form state
  const [customerProfileOpen, setCustomerProfileOpen] = useState(false);
  const [profileOrdersSegment, setProfileOrdersSegment] = useState<"all" | "delivery" | "pickup">("all");
  const [orderRatings, setOrderRatings] = useState<Record<string, { food?: number; delivery?: number }>>({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileAddressesOpen, setProfileAddressesOpen] = useState(false);
  const [profileCouponsOpen, setProfileCouponsOpen] = useState(false);
  const [profilePaymentsOpen, setProfilePaymentsOpen] = useState(false);
  const [profileRefundsOpen, setProfileRefundsOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<string>("cod");
  const [checkoutStep, setCheckoutStep] = useState<"details" | "payment">("details");
  const [savedAddresses, setSavedAddresses] = useState<SavedCustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddressLabel, setNewAddressLabel] = useState<string>("Home");
  const [detailedBillOpen, setDetailedBillOpen] = useState(false);

  const activeSavedAddress = useMemo(() => {
    if (savedAddresses.length === 0) return null;
    return savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];
  }, [savedAddresses, selectedAddressId]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [coupon, setCoupon] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);

  // Live Location State (1-Click GPS detection)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [liveLocationUrl, setLiveLocationUrl] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Confirmed Order with Pickup QR (for Store Pickup) or Delivery Verification OTP (for Delivery Orders)
  const [orderConfirmed, setOrderConfirmed] = useState<{
    id?: string;
    number: string;
    totalPaise: number;
    fulfillment: string;
    payment: string;
    deliverySlot?: string | null;
    pickupQr?: string | null;
    qrDataUrl?: string | null;
    deliveryOtp?: string | null;
    address?: string | null;
    liveLocationUrl?: string | null;
  } | null>(null);

  // Hydrate saved cart & customer session
  useEffect(() => {
    if (!slug || phone.replace(/\D/g, "").length < 10 || onlineSettings?.loyalty?.enabled !== true) {
      setLoyaltyBalance(0);
      return;
    }
    const digits = phone.replace(/\D/g, "").slice(-10);
    void fetch(`/api/v1/public/stores/${encodeURIComponent(slug)}/loyalty?phone=${encodeURIComponent(digits)}`, {
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setLoyaltyBalance(Number(body?.data?.points ?? 0)))
      .catch(() => setLoyaltyBalance(0));
  }, [slug, phone, onlineSettings?.loyalty?.enabled]);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setQty(JSON.parse(savedCart) as Record<string, number>);

      const savedAddrsRaw = window.localStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY);
      let parsedAddrs: SavedCustomerAddress[] = [];
      if (savedAddrsRaw) {
        try {
          parsedAddrs = JSON.parse(savedAddrsRaw);
          if (Array.isArray(parsedAddrs) && parsedAddrs.length > 0) {
            setSavedAddresses(parsedAddrs);
            const def = parsedAddrs.find((a) => a.isDefault) || parsedAddrs[0];
            setSelectedAddressId(def.id);
            if (def.name) setName(def.name);
            if (def.phone) setPhone(def.phone);
            if (def.address) setAddress(def.address);
            if (def.landmark) setLandmark(def.landmark);
            if (def.pincode) setPincode(def.pincode);
            if (def.latitude && def.longitude) {
              setLatitude(def.latitude);
              setLongitude(def.longitude);
              setLiveLocationUrl(`https://www.google.com/maps?q=${def.latitude},${def.longitude}`);
              setLocationSuccess(true);
            }
          }
        } catch {
          // ignore
        }
      }

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
          verifiedSignIn?: boolean;
        };
        if (parsed.name && !name) setName(parsed.name);
        if (parsed.phone && !phone) setPhone(parsed.phone);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.address && !address) setAddress(parsed.address);
        if (parsed.landmark && !landmark) setLandmark(parsed.landmark);
        if (parsed.pincode && !pincode) setPincode(parsed.pincode);
        if (parsed.verifiedSignIn && parsed.phone) {
          setIsVerifiedSignIn(true);
          setCustomerAuthMode("signed_in");
          if (parsedAddrs.length === 0 && parsed.address) {
            const initialAddr: SavedCustomerAddress = {
              id: "addr-init-1",
              label: "Home",
              name: parsed.name || "Customer",
              phone: parsed.phone,
              address: parsed.address,
              landmark: parsed.landmark || "",
              pincode: parsed.pincode || "",
              latitude: parsed.latitude || null,
              longitude: parsed.longitude || null,
              isDefault: true,
            };
            setSavedAddresses([initialAddr]);
            setSelectedAddressId(initialAddr.id);
            window.localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify([initialAddr]));
          }
        }
        if (parsed.latitude && parsed.longitude && !latitude) {
          setLatitude(parsed.latitude);
          setLongitude(parsed.longitude);
          setLiveLocationUrl(`https://www.google.com/maps?q=${parsed.latitude},${parsed.longitude}`);
          setLocationSuccess(true);
        }
      }

      // Restore active guest tracking order across refreshes until delivered
      const savedGuestOrderRaw = window.localStorage.getItem("selfx_guest_active_order");
      if (savedGuestOrderRaw) {
        try {
          const parsedGuestOrder = JSON.parse(savedGuestOrderRaw);
          if (parsedGuestOrder?.number) {
            setActiveTrackingOrder(parsedGuestOrder);
            // Verify latest status with backend immediately
            void fetch("/api/v1/public/orders/track", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({ number: parsedGuestOrder.number }),
            })
              .then((res) => (res.ok ? res.json() : null))
              .then((body) => {
                if (body?.data) {
                  const nextActive = openTrackingOrder([body.data]);
                  setActiveTrackingOrder(nextActive);
                  if (!nextActive) {
                    try {
                      window.localStorage.removeItem("selfx_guest_active_order");
                    } catch {}
                  } else {
                    try {
                      window.localStorage.setItem("selfx_guest_active_order", JSON.stringify(nextActive));
                    } catch {}
                  }
                }
              })
              .catch(() => {});
          }
        } catch {
          // ignore
        }
      }

      // Check for returning payment order (from PhonePe, Paytm, or URL redirect)
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const paymentOrderId = urlParams?.get("payment_order_id");
      const pendingRaw = window.localStorage.getItem("selfx_pending_payment_order");

      let orderIdToCheck = paymentOrderId;
      let pendingData: any = null;

      if (!orderIdToCheck && pendingRaw) {
        try {
          pendingData = JSON.parse(pendingRaw);
          if (pendingData?.orderId && Date.now() - (pendingData.timestamp || 0) < 30 * 60 * 1000) {
            orderIdToCheck = pendingData.orderId;
          }
        } catch {
          // ignore
        }
      }

      if (orderIdToCheck) {
        void fetch(`/api/v1/public/orders/${encodeURIComponent(orderIdToCheck)}/verify-payment`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then(async (body) => {
            if (body?.data?.paid || body?.data?.status === "captured") {
              try {
                window.localStorage.removeItem("selfx_pending_payment_order");
                window.localStorage.removeItem(CART_STORAGE_KEY);
              } catch {}
              setQty({});

              if (paymentOrderId && typeof window !== "undefined") {
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
              }

              if (pendingData) {
                setOrderConfirmed({
                  id: pendingData.orderId,
                  number: pendingData.orderNumber,
                  totalPaise: pendingData.totalPaise,
                  fulfillment: pendingData.fulfillment,
                  payment: pendingData.payment,
                  deliverySlot: pendingData.deliverySlot,
                  pickupQr: pendingData.pickupQr,
                  deliveryOtp: pendingData.deliveryOtp,
                  address: pendingData.address,
                });
                setViewMode("catalog");
              } else {
                void fetch("/api/v1/public/orders/track", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Accept: "application/json" },
                  body: JSON.stringify({ number: orderIdToCheck }),
                })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((trackBody) => {
                    if (trackBody?.data) {
                      const o = trackBody.data;
                      setOrderConfirmed({
                        id: o.id,
                        number: o.number,
                        totalPaise: o.total_paise,
                        fulfillment: o.fulfillment,
                        payment: o.payment_method,
                        deliverySlot: o.delivery_slot ?? null,
                        pickupQr: o.pickup_qr,
                        deliveryOtp: computeVerificationCode(o.number, o.id),
                        address: o.address_snapshot?.address || "Store Counter",
                      });
                      setViewMode("catalog");
                    }
                  });
              }
            } else if (paymentOrderId) {
              setMessage("Payment was not completed. If amount was debited, it will be updated within a couple of minutes.");
            }
          })
          .catch(() => {});
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

  // Load customer orders from server ONLY when signed in with Phone + OTP (guest users cannot view previous order history)
  const refreshCustomerOrders = useCallback(async (custPhone?: string, forceVerified?: boolean) => {
    const rawPhone = custPhone || phone;
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const verified = forceVerified ?? isVerifiedSignIn;

    if (!verified) {
      setCustomerOrders([]);
      return;
    }

    if (cleanPhone.length >= 10) {
      setLoadingOrders(true);
      try {
        const res = await fetch(`/api/v1/public/orders/customer?phone=${encodeURIComponent(cleanPhone)}`);
        if (res.ok) {
          const body = await res.json();
          if (Array.isArray(body.data)) {
            setCustomerOrders(body.data);
            setActiveTrackingOrder(openTrackingOrder(body.data));
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingOrders(false);
      }
    }
  }, [phone, isVerifiedSignIn]);

  // Load customer orders whenever verified sign-in state changes
  useEffect(() => {
    if (phone && isVerifiedSignIn) {
      void refreshCustomerOrders(phone, true);
    } else if (!isVerifiedSignIn) {
      setCustomerOrders([]);
    }
  }, [phone, isVerifiedSignIn, refreshCustomerOrders]);

  // Resend OTP countdown interval (Industry-standard 30s cooldown)
  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const interval = setInterval(() => {
      setOtpResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpResendCountdown]);

  const handleEditPhone = () => {
    setOtpRequested(false);
    setOtpCode("");
    setOtpError(null);
    if (storefrontFirebaseConfirmation.current) {
      storefrontFirebaseConfirmation.current.clear();
      storefrontFirebaseConfirmation.current = null;
    }
  };

  const handleRequestOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (cleanPhone.length < 10) {
      setOtpError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      const res = await fetch(`/api/v1/public/stores/${encodeURIComponent(slug || "bangalore")}/otp`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOtpError(
          body?.error?.message ||
            body?.message ||
            "SMS OTP service is not configured by Super Admin yet. Please use Guest Checkout or contact store support.",
        );
        return;
      }

      if (body?.data?.status === "firebase" && body.data.firebase?.active) {
        try {
          storefrontFirebaseConfirmation.current = await sendFirebaseOtp(
            body.data.firebase,
            cleanPhone,
            "storefront-recaptcha"
          );
          setOtpRequested(true);
          setOtpResendCountdown(30);
          return;
        } catch (fbErr: any) {
          setOtpError(humanizeFirebaseError(fbErr));
          return;
        }
      }

      setOtpRequested(true);
      setOtpResendCountdown(30);
    } catch {
      setOtpError("Could not send OTP right now. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    const cleanOtp = otpCode.replace(/\D/g, "").slice(0, 6);
    if (cleanPhone.length < 10 || cleanOtp.length < 6) {
      setOtpError("Please enter the 6-digit OTP sent to your mobile.");
      return;
    }
    setOtpLoading(true);
    setOtpError(null);
    try {
      let body: any = null;
      if (storefrontFirebaseConfirmation.current) {
        let idToken = "";
        try {
          const res = await storefrontFirebaseConfirmation.current.confirm(cleanOtp);
          idToken = res.idToken;
        } catch (fbErr: any) {
          setOtpError(humanizeFirebaseError(fbErr));
          return;
        }
        const res = await fetch(`/api/v1/public/stores/${encodeURIComponent(slug || "bangalore")}/otp/verify`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone, id_token: idToken }),
        });
        body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setOtpError(body?.error?.message || body?.message || "Invalid or expired Firebase verification.");
          return;
        }
      } else {
        const res = await fetch(`/api/v1/public/stores/${encodeURIComponent(slug || "bangalore")}/otp/verify`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone, code: cleanOtp, otp: cleanOtp }),
        });
        body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setOtpError(body?.error?.message || body?.message || "Invalid or expired OTP code.");
          return;
        }
      }

      const profile = body?.data || {};
      const resolvedName = profile.customer_name || name;
      const resolvedAddress = profile.address || address;
      const resolvedPincode = profile.pincode || pincode;
      if (profile.customer_name && !name) setName(profile.customer_name);
      if (profile.address && !address) setAddress(profile.address);
      if (profile.pincode && !pincode) setPincode(profile.pincode);
      if (typeof profile.loyalty_points === "number") setLoyaltyBalance(profile.loyalty_points);

      setIsVerifiedSignIn(true);
      setCustomerAuthMode("signed_in");
      setOtpRequested(false);
      setOtpCode("");
      setOtpResendCountdown(0);

      // Hydrate or initialize saved addresses for signed-in customer
      try {
        const rawAddrs = window.localStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY);
        let existingList: SavedCustomerAddress[] = [];
        if (rawAddrs) {
          try {
            existingList = JSON.parse(rawAddrs);
          } catch {}
        }
        if (existingList.length > 0) {
          setSavedAddresses(existingList);
          const def = existingList.find((a) => a.isDefault) || existingList[0];
          setSelectedAddressId(def.id);
          setName(def.name);
          setPhone(def.phone);
          setAddress(def.address);
          setLandmark(def.landmark || "");
          setPincode(def.pincode);
          if (def.latitude && def.longitude) {
            setLatitude(def.latitude);
            setLongitude(def.longitude);
            setLiveLocationUrl(`https://www.google.com/maps?q=${def.latitude},${def.longitude}`);
            setLocationSuccess(true);
          }
        } else if (resolvedAddress) {
          const initAddr: SavedCustomerAddress = {
            id: `addr-${Date.now()}`,
            label: "Home",
            name: resolvedName || name || "Customer",
            phone: cleanPhone,
            address: resolvedAddress,
            landmark: landmark || "",
            pincode: resolvedPincode || pincode || "",
            latitude,
            longitude,
            isDefault: true,
          };
          setSavedAddresses([initAddr]);
          setSelectedAddressId(initAddr.id);
          window.localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify([initAddr]));
        }
      } catch {
        // ignore
      }

      try {
        window.localStorage.setItem(
          CUSTOMER_STORAGE_KEY,
          JSON.stringify({
            name: resolvedName,
            phone: cleanPhone,
            email,
            address: resolvedAddress,
            landmark,
            pincode: resolvedPincode,
            latitude,
            longitude,
            verifiedSignIn: true,
          }),
        );
      } catch {
        // ignore
      }
      void refreshCustomerOrders(cleanPhone, true);
      setLoginModalOpen(false);
      setMessage("Signed in with mobile OTP! Your saved addresses and order history are unlocked.");
    } catch {
      setOtpError("Failed to verify OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSignOutCustomer = () => {
    setIsVerifiedSignIn(false);
    setCustomerAuthMode("guest");
    setCustomerOrders([]);
    setOtpRequested(false);
    setOtpCode("");
    setIsAddressDropdownOpen(false);
    setIsAddingNewAddress(false);
    try {
      window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleRateOrder = (orderNumber: string, stars: number, type: "food" | "delivery" = "food") => {
    const prev = orderRatings[orderNumber] || { food: 0, delivery: 0 };
    const next = { ...orderRatings, [orderNumber]: { ...prev, [type]: stars } };
    setOrderRatings(next);
    try {
      window.localStorage.setItem("selfx_order_ratings", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleReorder = (ord: any) => {
    if (!ord.lines || !Array.isArray(ord.lines)) return;
    const newQty = { ...qty };
    let addedCount = 0;
    ord.lines.forEach((line: any) => {
      const lineName = (line.name || "").toLowerCase().trim();
      const item = items.find(
        (i) =>
          i.id === line.store_item_id ||
          (i.sku && i.sku.toLowerCase() === lineName) ||
          i.name.toLowerCase().trim() === lineName
      );
      if (item) {
        newQty[item.id] = (newQty[item.id] || 0) + (Number(line.qty) || 1);
        addedCount++;
      }
    });
    if (addedCount > 0) {
      setQty(newQty);
      setCustomerProfileOpen(false);
      setOrdersDrawerOpen(false);
      setCartDrawerOpen(true);
      setMessage(`Reordered ${addedCount} item(s) from order #${ord.number}!`);
    } else {
      setMessage(`Items from order #${ord.number} could not be found in active inventory.`);
    }
  };

  const handleSaveProfile = () => {
    try {
      const raw = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem(
        CUSTOMER_STORAGE_KEY,
        JSON.stringify({
          ...existing,
          name,
          email,
          phone,
          verifiedSignIn: isVerifiedSignIn,
        })
      );
    } catch {
      // ignore
    }
    setProfileEditOpen(false);
    setMessage("Profile details updated successfully!");
  };

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
            const nextActive = openTrackingOrder([body.data]);
            setActiveTrackingOrder(nextActive);
            if (!nextActive) {
              try {
                window.localStorage.removeItem("selfx_guest_active_order");
              } catch {}
            } else {
              try {
                window.localStorage.setItem("selfx_guest_active_order", JSON.stringify(nextActive));
              } catch {}
            }
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
            sms_otp_enabled?: boolean;
            active_payment_gateways?: string[] | { provider: string }[];
            payment_gateways_status?: Record<string, string>;
            gateway_configs?: Record<string, any>;
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
        setSmsOtpEnabled(Boolean(sData.data.sms_otp_enabled));
        const rawActive = sData.data.active_payment_gateways;
        const normalizedActive: string[] = Array.isArray(rawActive)
          ? rawActive.map((g: any) => (typeof g === "string" ? g : g?.provider)).filter(Boolean)
          : [];
        setActivePaymentGateways(normalizedActive);
        if (sData.data.payment_gateways_status && typeof sData.data.payment_gateways_status === "object") {
          setGatewayStatuses(sData.data.payment_gateways_status);
        }
        if (sData.data.gateway_configs && typeof sData.data.gateway_configs === "object") {
          setGatewayConfigs(sData.data.gateway_configs);
        }
        if ((sData.data as any).upi_vpa) {
          setStoreUpiVpa((sData.data as any).upi_vpa);
        }
        const loadedSettings = sData.data.online_store_settings ?? null;
        setOnlineSettings(loadedSettings);
        setTenantSettings(sData.data.tenant_settings ?? null);

        const configuredSlots = (loadedSettings?.deliverySlots ?? []).filter((s) => s.enabled !== false);
        if (configuredSlots.length > 0) {
          setDeliverySlot((prev) =>
            prev && configuredSlots.some((s) => `${s.label} (${s.sublabel})` === prev || s.label === prev)
              ? prev
              : `${configuredSlots[0]!.label}${configuredSlots[0]!.sublabel ? ` (${configuredSlots[0]!.sublabel})` : ""}`,
          );
        }
        if (loadedSettings?.basics?.guestCheckout === false && loadedSettings?.basics?.phoneSignIn !== false) {
          setCustomerAuthMode("signed_in");
        } else if (loadedSettings?.basics?.phoneSignIn === false && loadedSettings?.basics?.guestCheckout !== false) {
          setCustomerAuthMode("guest");
        }
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

  // Filtered & sorted items (respecting hideOutOfStock setting)
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hideOos = onlineSettings?.basics?.hideOutOfStock === true;
    const filtered = items.filter((item) => {
      if (hideOos && typeof item.on_hand === "number" && item.on_hand <= 0) {
        return false;
      }
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
  }, [items, activeCategory, query, sortBy, onlineSettings?.basics?.hideOutOfStock]);

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

  // Active registered serviceable locations & delivery time slots managed by tenant
  const activeServiceableLocations = useMemo(
    () => (onlineSettings?.serviceableLocations ?? []).filter((l) => l.enabled !== false),
    [onlineSettings?.serviceableLocations],
  );

  const matchedServiceableLocation = useMemo(() => {
    if (activeServiceableLocations.length === 0) return null;
    const cleanPin = pincode.trim().toLowerCase();
    const cleanAddr = address.trim().toLowerCase();
    return (
      activeServiceableLocations.find((loc) => {
        const locPin = String(loc.pinCode || "").trim().toLowerCase();
        const locArea = String(loc.areaName || "").trim().toLowerCase();
        if (locPin && cleanPin && (cleanPin === locPin || locPin.includes(cleanPin))) return true;
        if (locArea && cleanAddr && cleanAddr.includes(locArea)) return true;
        return false;
      }) ?? null
    );
  }, [activeServiceableLocations, pincode, address]);

  const activeDeliverySlots = useMemo(
    () => (onlineSettings?.deliverySlots ?? []).filter((s) => s.enabled !== false),
    [onlineSettings?.deliverySlots],
  );

  const selectedSlotObj = useMemo(() => {
    if (!deliverySlot || activeDeliverySlots.length === 0) return null;
    return (
      activeDeliverySlots.find(
        (s) => `${s.label}${s.sublabel ? ` (${s.sublabel})` : ""}` === deliverySlot || s.label === deliverySlot,
      ) ?? null
    );
  }, [activeDeliverySlots, deliverySlot]);

  // Shipping / Delivery charges dynamically driven by tenant shipping settings + registered location / slot fee
  const shippingSettings = onlineSettings?.shipping ?? {
    standardDeliveryFee: Number(onlineSettings?.checkout?.deliveryFee ?? 35),
    freeDeliveryAbove: Number(onlineSettings?.checkout?.freeDeliveryAbove ?? 0),
    packagingFee: Number(onlineSettings?.checkout?.packagingFee ?? 10),
    enablePackagingFee: true,
    minOrderAmount: Number(onlineSettings?.basics?.minOrderAmount ?? 0),
  };
  const locationOrStandardFeeRupees =
    matchedServiceableLocation && typeof matchedServiceableLocation.deliveryFee === "number"
      ? matchedServiceableLocation.deliveryFee
      : Number(shippingSettings.standardDeliveryFee ?? 35);
  const slotFeeRupees = selectedSlotObj ? Number(selectedSlotObj.feeAmount || 0) : 0;
  const standardFeePaise = Math.round((locationOrStandardFeeRupees + slotFeeRupees) * 100);
  const freeThreshold = Number(shippingSettings.freeDeliveryAbove);
  const isFreeDeliveryConfigured =
    typeof shippingSettings.freeDeliveryAbove === "number" &&
    shippingSettings.freeDeliveryAbove > 0 &&
    (shippingSettings as any).enableFreeDelivery !== false;
  const freeThresholdPaise = isFreeDeliveryConfigured ? Math.round(freeThreshold * 100) : 0;
  const packagingFeePaise =
    shippingSettings.enablePackagingFee === false
      ? 0
      : Math.round(Number(shippingSettings.packagingFee ?? 0) * 100);

  const baseDeliveryChargePaise =
    fulfillment === "delivery" && grossSubtotalPaise > 0
      ? (freeThresholdPaise > 0 && grossSubtotalPaise >= freeThresholdPaise ? 0 : standardFeePaise)
      : 0;
  const deliveryChargePaise =
    appliedCoupon?.discountType === "free_shipping" ? 0 : baseDeliveryChargePaise;
  const packagingChargePaise = grossSubtotalPaise > 0 ? packagingFeePaise : 0;

  const couponDiscountPaise = useMemo(() => {
    if (!appliedCoupon || grossSubtotalPaise <= 0) return 0;
    if (appliedCoupon.discountType === "percentage") {
      return Math.min(
        grossSubtotalPaise,
        Math.round((grossSubtotalPaise * appliedCoupon.discountValue) / 100),
      );
    }
    if (appliedCoupon.discountType === "fixed") {
      return Math.min(grossSubtotalPaise, Math.round(appliedCoupon.discountValue * 100));
    }
    return 0;
  }, [appliedCoupon, grossSubtotalPaise]);

  const grandTotalPaise = Math.max(
    0,
    grossSubtotalPaise - couponDiscountPaise + taxAdditionPaise + deliveryChargePaise + packagingChargePaise,
  );

  // Dynamic Currency Formatter respecting Online Store Basics currency/displayCurrency
  const formatStorePrice = useCallback(
    (paise: number) => {
      const displayCur = onlineSettings?.basics?.displayCurrency || "";
      const baseCur = onlineSettings?.basics?.currency || "Indian Rupee (₹)";
      const chosen = displayCur && displayCur !== "Same as base currency" ? displayCur : baseCur;
      const amount = (paise || 0) / 100;
      if (chosen.includes("$") || chosen.includes("USD")) return `$${amount.toFixed(2)}`;
      if (chosen.includes("€") || chosen.includes("EUR")) return `€${amount.toFixed(2)}`;
      if (chosen.includes("£") || chosen.includes("GBP")) return `£${amount.toFixed(2)}`;
      if (chosen.includes("AED")) return `AED ${amount.toFixed(2)}`;
      return formatInr(paise);
    },
    [onlineSettings?.basics?.currency, onlineSettings?.basics?.displayCurrency],
  );

  const handleApplyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    const configuredCodes = (onlineSettings?.inviteCodes ?? []).filter((c) => c.enabled !== false);
    const matched = configuredCodes.find((c) => c.code.toUpperCase() === code);
    if (matched) {
      const minPaise = (matched.minOrderAmount || 0) * 100;
      if (grossSubtotalPaise < minPaise) {
        setMessage(`Coupon ${code} requires a minimum order of ${formatStorePrice(minPaise)}.`);
        return;
      }
      setAppliedCoupon({
        code: matched.code,
        discountType: matched.discountType,
        discountValue: matched.discountValue,
      });
      setMessage(`Coupon ${matched.code} applied!`);
      return;
    }
    setMessage(`Invalid or expired coupon code: ${code}`);
  };

  const handleSubscribeNewsletter = async () => {
    const cleanEmail = newsletterEmail.trim();
    if (!cleanEmail) return;
    try {
      await fetch(`/api/v1/public/stores/${encodeURIComponent(slug)}/subscribe`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, phone: phone || undefined, source: "Storefront Newsletter" }),
      });
    } catch {
      // ignore
    }
    setNewsletterSubscribed(true);
    setNewsletterEmail("");
  };

  const handleSendContactMessage = async () => {
    if (!contactMessage.trim()) return;
    try {
      await fetch(`/api/v1/public/stores/${encodeURIComponent(slug)}/contact`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name || "Online Shopper",
          email: email || undefined,
          phone: phone || undefined,
          subject: contactSubject || "Storefront Customer Inquiry",
          message: contactMessage,
        }),
      });
    } catch {
      // ignore
    }
    setContactSent(true);
    setContactSubject("");
    setContactMessage("");
  };

  const handleCheckPincode = () => {
    const cleanInput = pincode.trim();
    if (!cleanInput) {
      setPincodeValid(false);
      setPincodeStatus("Enter a PIN code or area name to check delivery.");
      return;
    }
    if (activeServiceableLocations.length > 0) {
      const lower = cleanInput.toLowerCase();
      const matchedLoc = activeServiceableLocations.find(
        (loc) =>
          String(loc.pinCode || "").toLowerCase() === lower ||
          String(loc.pinCode || "").toLowerCase().includes(lower) ||
          String(loc.areaName || "").toLowerCase().includes(lower),
      );
      if (matchedLoc) {
        setPincodeValid(true);
        setPincodeStatus(
          `Deliverable · ${matchedLoc.areaName} (${matchedLoc.pinCode}) · ${matchedLoc.etaText || "30–45 mins"}`,
        );
      } else {
        setPincodeValid(false);
        const allowedSummary = activeServiceableLocations
          .slice(0, 3)
          .map((l) => `${l.areaName} (${l.pinCode})`)
          .join(", ");
        setPincodeStatus(
          `Not serviceable at "${cleanInput}". Registered areas: ${allowedSummary || "Contact store"}`,
        );
      }
      return;
    }

    const methods = (onlineSettings?.shippingMethods ?? []).filter((m) => m.enabled !== false);
    const matched = methods.find(
      (m) => m.pinCodes === "All" || m.pinCodes.includes(cleanInput) || m.zone.includes(cleanInput),
    );
    if (matched) {
      setPincodeValid(true);
      setPincodeStatus(`Deliverable to ${cleanInput} (${matched.etaText || "30–45 mins"})`);
    } else {
      setPincodeValid(true);
      setPincodeStatus(`Delivery available at ${cleanInput}`);
    }
  };

  const handleToggleWishlist = (itemId: string) => {
    setWishlistIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  // Payment methods dynamically driven by tenant Settings -> Payment Gateways + online store settings
  const hasIntegratedPaymentGateway = activePaymentGateways.length > 0;
  const paymentsConfig: NonNullable<OnlineStoreSettingsPayload["payments"]> = useMemo(() => {
    return (
      onlineSettings?.payments ?? {
        cod: { enabled: true, displayName: "Cash on Delivery (COD)", description: "Pay cash directly to the delivery rider" },
        payAtStore: { enabled: true, displayName: "Pay at Store Counter", description: "Receive pickup QR and pay at store counter" },
        upiQr: { enabled: false, displayName: "UPI / QR Payment", instructions: "Scan UPI QR code or pay via phone app" },
        razorpay: { enabled: false },
        phonepe: { enabled: false },
      }
    );
  }, [onlineSettings]);

  // Payment gateways dynamic status from Tenant Settings -> Payment Gateways:
  // If an option is disabled in the tenant payment gateway settings, it MUST NOT show in the storefront.
  const isCodActiveInGateway =
    gatewayStatuses["cod"] !== undefined
      ? gatewayStatuses["cod"] === "active"
      : (activePaymentGateways.length === 0 || activePaymentGateways.includes("cod"));

  const isPayAtStoreActiveInGateway =
    gatewayStatuses["pay_at_store"] !== undefined
      ? gatewayStatuses["pay_at_store"] === "active"
      : activePaymentGateways.includes("pay_at_store");

  const isUpiActiveInGateway =
    gatewayStatuses["upi_qr"] === "active" ||
    gatewayStatuses["upi"] === "active" ||
    activePaymentGateways.includes("upi_qr") ||
    activePaymentGateways.includes("upi");

  const isRazorpayActiveInGateway =
    gatewayStatuses["razorpay"] === "active" ||
    activePaymentGateways.includes("razorpay");

  const isPhonePeActiveInGateway =
    gatewayStatuses["phonepe"] === "active" ||
    activePaymentGateways.includes("phonepe");

  const isPaytmActiveInGateway =
    gatewayStatuses["paytm"] === "active" ||
    activePaymentGateways.includes("paytm");

  const isCodEnabled = isCodActiveInGateway && paymentsConfig.cod?.enabled !== false;
  const isPayAtStoreEnabled = isPayAtStoreActiveInGateway && paymentsConfig.payAtStore?.enabled !== false;

  // UPI / Online Payment is enabled when active in Settings -> Payment Gateways or configured in online store settings
  const isUpiQrEnabled = isUpiActiveInGateway || paymentsConfig.upiQr?.enabled === true;
  const isRazorpayEnabled =
    isRazorpayActiveInGateway ||
    (paymentsConfig.razorpay?.enabled === true && Boolean(paymentsConfig.razorpay?.keyId));
  const isPhonePeEnabled =
    isPhonePeActiveInGateway ||
    (paymentsConfig.phonepe?.enabled === true && Boolean(paymentsConfig.phonepe?.merchantId));
  const isPaytmEnabled =
    isPaytmActiveInGateway ||
    ((paymentsConfig as any).paytm?.enabled === true && Boolean((paymentsConfig as any).paytm?.merchantId));

  // Resolve UPI configuration from store & gateways (PhonePe, Paytm, or direct)
  const upiConfig = useMemo(() => {
    const phonepeGw = gatewayConfigs["phonepe"] || {};
    const paytmGw = gatewayConfigs["paytm"] || {};
    const upiGw = gatewayConfigs["upi_qr"] || {};
    const vpa = (
      storeUpiVpa ||
      phonepeGw.upi_vpa ||
      paytmGw.upi_vpa ||
      upiGw.upi_vpa ||
      paymentsConfig.upiQr?.vpa ||
      ""
    ).trim();
    const payee = (
      phonepeGw.payee_name ||
      phonepeGw.merchant_name ||
      paytmGw.payee_name ||
      upiGw.payee_name ||
      storeName ||
      "Selfx Retail"
    ).trim();
    const standeeImg = upiGw.standee_image_url || null;
    const instructions =
      phonepeGw.instructions ||
      upiGw.instructions ||
      "Scan the UPI QR code using Google Pay, PhonePe, Paytm, or BHIM.";
    return { vpa, payee, standeeImg, instructions };
  }, [gatewayConfigs, paymentsConfig.upiQr, storeUpiVpa, storeName]);

  // Generate dynamic client-side UPI payment QR Code Data URL
  useEffect(() => {
    if (payment !== "upi_qr" || grandTotalPaise <= 0 || !upiConfig.vpa) {
      setUpiQrDataUrl(null);
      return;
    }
    const amountInRupees = (grandTotalPaise / 100).toFixed(2);
    const upiUri = `upi://pay?pa=${encodeURIComponent(upiConfig.vpa)}&pn=${encodeURIComponent(
      upiConfig.payee,
    )}&am=${amountInRupees}&cu=INR&tn=${encodeURIComponent(`Order at ${storeName || "Retail Store"}`)}`;

    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1.5,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => setUpiQrDataUrl(url))
      .catch(() => setUpiQrDataUrl(null));
  }, [payment, grandTotalPaise, upiConfig, storeName]);

  // Payment Session Countdown Timer (Image 1 UX)
  useEffect(() => {
    if (checkoutStep !== "payment") {
      setPaymentTimerSeconds(300);
      return;
    }
    const timer = setInterval(() => {
      setPaymentTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [checkoutStep]);

  const formattedPaymentTimer = useMemo(() => {
    const mins = Math.floor(paymentTimerSeconds / 60);
    const secs = paymentTimerSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }, [paymentTimerSeconds]);

  const checkoutOrderId = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const suffix = phone ? phone.slice(-5) : "50001";
    return `ORD-${yyyy}${mm}${dd}${suffix}`;
  }, [phone]);

  // If Pay at Store is disabled in Payment Gateways, force fulfillment to delivery
  useEffect(() => {
    if (!isPayAtStoreEnabled && fulfillment === "pickup") {
      setFulfillment("delivery");
    }
  }, [isPayAtStoreEnabled, fulfillment]);

  // Auto-align selected payment method with fulfillment type and enabled methods
  useEffect(() => {
    if (fulfillment === "pickup") {
      if (isPayAtStoreEnabled) {
        setPayment("pay_at_store");
      }
    } else {
      if (
        payment === "pay_at_store" ||
        (payment === "cod" && !isCodEnabled) ||
        (payment === "upi_qr" && !isUpiQrEnabled) ||
        (payment === "razorpay" && !isRazorpayEnabled) ||
        (payment === "phonepe" && !isPhonePeEnabled)
      ) {
        if (isCodEnabled) setPayment("cod");
        else if (isUpiQrEnabled) setPayment("upi_qr");
        else if (isRazorpayEnabled) setPayment("razorpay");
        else if (isPhonePeEnabled) setPayment("phonepe");
      }
    }
  }, [fulfillment, isCodEnabled, isPayAtStoreEnabled, isUpiQrEnabled, isRazorpayEnabled, isPhonePeEnabled, payment]);

  // Address management for signed-in customer
  const selectAddress = (addr: SavedCustomerAddress) => {
    setSelectedAddressId(addr.id);
    setName(addr.name);
    setPhone(addr.phone);
    setAddress(addr.address);
    setLandmark(addr.landmark || "");
    setPincode(addr.pincode);
    if (addr.latitude && addr.longitude) {
      setLatitude(addr.latitude);
      setLongitude(addr.longitude);
      setLiveLocationUrl(`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`);
      setLocationSuccess(true);
    } else {
      setLatitude(null);
      setLongitude(null);
      setLiveLocationUrl(null);
      setLocationSuccess(false);
    }
    setIsAddressDropdownOpen(false);
    setIsAddingNewAddress(false);
    setEditingAddressId(null);
  };

  const handleSaveAddress = () => {
    if (!name.trim()) {
      setMessage("Please enter recipient name for this address.");
      return;
    }
    const cleanPh = phone.replace(/\D/g, "");
    if (cleanPh.length < 10) {
      setMessage("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!address.trim()) {
      setMessage("Please enter the delivery street address.");
      return;
    }
    const cleanPin = pincode.replace(/\D/g, "");
    if (cleanPin.length < 6) {
      setMessage("Please enter a valid 6-digit PIN code.");
      return;
    }

    let updatedList: SavedCustomerAddress[];
    if (editingAddressId) {
      updatedList = savedAddresses.map((a) =>
        a.id === editingAddressId
          ? {
              ...a,
              label: newAddressLabel,
              name: name.trim(),
              phone: phone.trim(),
              address: address.trim(),
              landmark: landmark.trim(),
              pincode: pincode.trim(),
              latitude,
              longitude,
            }
          : a,
      );
      setSelectedAddressId(editingAddressId);
    } else {
      const newId = `addr-${Date.now()}`;
      const newAddr: SavedCustomerAddress = {
        id: newId,
        label: newAddressLabel,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        latitude,
        longitude,
        isDefault: savedAddresses.length === 0,
      };
      updatedList = [...savedAddresses, newAddr];
      setSelectedAddressId(newId);
    }

    setSavedAddresses(updatedList);
    setIsAddingNewAddress(false);
    setEditingAddressId(null);
    setIsAddressDropdownOpen(false);
    try {
      window.localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }
    setMessage(null);
  };

  // Transition from Customer Details page to Payment Options page
  const handleProceedToPayment = () => {
    setMessage(null);

    const lines = Object.entries(qty).filter(([, count]) => count > 0);
    if (lines.length === 0) {
      setMessage("Your cart is empty. Please add items first.");
      return;
    }

    const minOrderAmt = Number(
      onlineSettings?.basics?.minOrderAmount ?? onlineSettings?.shipping?.minOrderAmount ?? 0,
    );
    if (minOrderAmt > 0 && grossSubtotalPaise < minOrderAmt * 100) {
      setMessage(
        `Minimum order amount is ${formatStorePrice(minOrderAmt * 100)}. Please add ${formatStorePrice(
          minOrderAmt * 100 - grossSubtotalPaise,
        )} more to proceed.`,
      );
      return;
    }

    const guestAllowed = onlineSettings?.basics?.guestCheckout !== false;
    const signInAllowed = onlineSettings?.basics?.phoneSignIn !== false;

    if ((!guestAllowed || customerAuthMode === "signed_in") && signInAllowed && !isVerifiedSignIn) {
      setMessage("Please verify your mobile number with OTP to proceed, or switch to Guest Checkout.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setMessage("Please enter a valid 10-digit mobile number so our delivery rider can contact you.");
      return;
    }
    if (!name.trim()) {
      setMessage("Please enter your full name.");
      return;
    }

    if (fulfillment === "delivery") {
      if (onlineSettings?.enableDeliveryAvailability === false || onlineSettings?.checkout?.enableDelivery === false) {
        setMessage("Home delivery is currently disabled by the store.");
        return;
      }
      if (!address.trim() && !liveLocationUrl) {
        setMessage("Please enter your delivery address or detect live GPS location.");
        return;
      }
      if (activeServiceableLocations.length > 0 && !matchedServiceableLocation) {
        const registeredList = activeServiceableLocations
          .map((l) => `${l.areaName} (${l.pinCode})`)
          .join(", ");
        setMessage(
          `Delivery is available only for registered store locations: ${registeredList}. Please select or enter a registered PIN code.`,
        );
        return;
      }
      if (
        matchedServiceableLocation &&
        matchedServiceableLocation.minOrderAmount > 0 &&
        grossSubtotalPaise < matchedServiceableLocation.minOrderAmount * 100
      ) {
        setMessage(
          `Minimum order for delivery to ${matchedServiceableLocation.areaName} (${matchedServiceableLocation.pinCode}) is ${formatStorePrice(
            matchedServiceableLocation.minOrderAmount * 100,
          )}.`,
        );
        return;
      }
    }

    // Auto-save first address for signed-in customer if list was empty
    if (isVerifiedSignIn && savedAddresses.length === 0 && address.trim()) {
      const firstAddr: SavedCustomerAddress = {
        id: `addr-${Date.now()}`,
        label: newAddressLabel || "Home",
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        latitude,
        longitude,
        isDefault: true,
      };
      const updated = [firstAddr];
      setSavedAddresses(updated);
      setSelectedAddressId(firstAddr.id);
      try {
        window.localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    // Ensure active payment method is valid
    if (fulfillment === "delivery") {
      if (payment === "pay_at_store" || (payment === "cod" && !isCodEnabled)) {
        if (isCodEnabled) setPayment("cod");
        else if (isUpiQrEnabled) setPayment("upi_qr");
        else if (isRazorpayEnabled) setPayment("razorpay");
        else if (isPhonePeEnabled) setPayment("phonepe");
      }
    } else {
      setPayment("pay_at_store");
    }

    setCheckoutStep("payment");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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
  const handlePlaceOrder = async (overrideMethod?: string) => {
    const lines = Object.entries(qty)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => ({ store_item_id: id, qty: count }));

    if (lines.length === 0) {
      setMessage("Your cart is empty. Please add items first.");
      return;
    }

    const minOrderAmt = Number(
      onlineSettings?.basics?.minOrderAmount ?? onlineSettings?.shipping?.minOrderAmount ?? 0,
    );
    if (minOrderAmt > 0 && grossSubtotalPaise < minOrderAmt * 100) {
      setMessage(
        `Minimum order amount is ${formatStorePrice(minOrderAmt * 100)}. Please add ${formatStorePrice(
          minOrderAmt * 100 - grossSubtotalPaise,
        )} more to proceed.`,
      );
      return;
    }

    const resolvedMethod = overrideMethod || (fulfillment === "pickup" ? "pay_at_store" : payment);

    const maxOrderAmt = Number(onlineSettings?.basics?.maxOrderAmount ?? 0);
    if (maxOrderAmt > 0 && grossSubtotalPaise > maxOrderAmt * 100) {
      setMessage(
        `Maximum single order limit is ${formatStorePrice(maxOrderAmt * 100)}. Please reduce cart items to proceed.`,
      );
      return;
    }

    const guestAllowed = onlineSettings?.basics?.guestCheckout !== false;
    const signInAllowed = onlineSettings?.basics?.phoneSignIn !== false;

    if ((!guestAllowed || customerAuthMode === "signed_in") && signInAllowed && !isVerifiedSignIn) {
      setMessage("Please verify your mobile number with OTP to place your order in Sign-In mode, or switch to Guest Checkout.");
      return;
    }

    // Validate details for delivery & guest checkout
    if (fulfillment === "delivery") {
      if (onlineSettings?.enableDeliveryAvailability === false || onlineSettings?.checkout?.enableDelivery === false) {
        setMessage("Home delivery is currently disabled by the store. Please select Pay in Store (Pickup).");
        return;
      }
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        setMessage("Please enter a valid 10-digit mobile number so our delivery rider can contact you.");
        return;
      }
      if (!name.trim()) {
        setMessage("Please enter your full name in Your Details.");
        return;
      }
      if (!address.trim() && !liveLocationUrl) {
        setMessage("Please detect your live GPS location or enter your delivery address.");
        return;
      }
      if (activeServiceableLocations.length > 0 && !matchedServiceableLocation) {
        const registeredList = activeServiceableLocations
          .map((l) => `${l.areaName} (${l.pinCode})`)
          .join(", ");
        setMessage(
          `Delivery is available only for registered store locations: ${registeredList}. Please select or enter a registered PIN code.`,
        );
        return;
      }
      if (
        matchedServiceableLocation &&
        matchedServiceableLocation.minOrderAmount > 0 &&
        grossSubtotalPaise < matchedServiceableLocation.minOrderAmount * 100
      ) {
        setMessage(
          `Minimum order for delivery to ${matchedServiceableLocation.areaName} (${matchedServiceableLocation.pinCode}) is ${formatStorePrice(
            matchedServiceableLocation.minOrderAmount * 100,
          )}.`,
        );
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
      setUpiUtrError(null);

      if (fulfillment === "delivery" && payment === "upi_qr") {
        const cleanUtr = upiUtr.trim();
        if (cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
          setUpiUtrError(
            "Please enter the valid 12-digit numeric UPI reference (UTR) from your payment confirmation screen.",
          );
          setSubmittingOrder(false);
          return;
        }
      }

      const resolvedSlot =
        fulfillment === "delivery" && onlineSettings?.themeConfig?.enableDeliverySlotPicker !== false
          ? deliverySlot || undefined
          : undefined;

      const combinedInstructions = [
        resolvedSlot ? `[Slot: ${resolvedSlot}]` : "",
        specialInstructions.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      const payload = {
        customer_name: name.trim() || (phone ? `Customer ${phone.slice(-4)}` : "Store Guest"),
        customer_phone: phone.trim() || "9999999999",
        customer_email: email.trim() || null,
        fulfillment,
        payment_method: resolvedMethod,
        upi_utr: resolvedMethod === "upi_qr" ? upiUtr.trim() : undefined,
        delivery_slot: resolvedSlot,
        customer_auth_mode: isVerifiedSignIn ? "signed_in" : "guest",
        pincode: pincode.trim() || undefined,
        address: address.trim() || undefined,
        landmark: landmark.trim() || undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        live_location_url: liveLocationUrl ?? undefined,
        special_instructions: combinedInstructions || undefined,
        coupon_code: appliedCoupon?.code || coupon.trim() || undefined,
        loyalty_points: loyaltyPoints > 0 ? loyaltyPoints : undefined,
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

      // Check if prepaid gateway returned a redirect URL (PhonePe, Paytm, etc.)
      const paymentUrl = orderData.payment?.payment_url || orderData.payment?.redirect_url || orderData.payment?.upi_intent_url;
      const isPrepaidMethod = ["phonepe", "paytm", "razorpay"].includes(resolvedMethod);

      if (isPrepaidMethod) {
        if (paymentUrl) {
          try {
            window.localStorage.setItem(
              "selfx_pending_payment_order",
              JSON.stringify({
                orderId: orderData.id,
                orderNumber: orderData.number,
                totalPaise: grandTotalPaise,
                fulfillment,
                payment: resolvedMethod,
                deliverySlot: resolvedSlot ?? null,
                address: address || "Store Counter",
                pickupQr: pickupQrCode,
                name,
                phone,
                timestamp: Date.now(),
              }),
            );
          } catch {
            // ignore
          }

          window.location.href = paymentUrl;
          return;
        } else {
          setMessage(
            `Unable to initiate ${resolvedMethod.toUpperCase()} payment session. Please check gateway credentials in settings or select an alternate payment option.`
          );
          setSubmittingOrder(false);
          return;
        }
      }

      // Generate visual QR code Data URL ONLY for In-Store Pickup / Pay at Store
      let qrImgUrl: string | null = null;
      if (fulfillment === "pickup") {
        try {
          qrImgUrl = await QRCode.toDataURL(pickupQrCode, {
            width: 320,
            margin: 2,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
        } catch {
          // ignore
        }
      }

      // Save customer session
      try {
        window.localStorage.setItem(
          CUSTOMER_STORAGE_KEY,
          JSON.stringify({
            name,
            phone,
            email,
            address,
            landmark,
            pincode,
            latitude,
            longitude,
            verifiedSignIn: isVerifiedSignIn,
          }),
        );
      } catch {
        // ignore
      }

      const deliveryOtp = computeVerificationCode(orderData.number, orderData.id);

      setOrderConfirmed({
        id: orderData.id,
        number: orderData.number,
        totalPaise: grandTotalPaise,
        fulfillment,
        payment: fulfillment === "pickup" ? "pay_at_store" : payment,
        deliverySlot: resolvedSlot ?? null,
        pickupQr: fulfillment === "pickup" ? pickupQrCode : null,
        qrDataUrl: qrImgUrl,
        deliveryOtp: fulfillment === "pickup" ? null : deliveryOtp,
        address: address || "Store Counter",
        liveLocationUrl: liveLocationUrl,
      });

      const orderRecord = {
        id: orderData.id,
        number: orderData.number,
        total_paise: grandTotalPaise,
        fulfillment,
        delivery_slot: resolvedSlot ?? null,
        customer_auth_mode: isVerifiedSignIn ? "signed_in" : "guest",
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
      try {
        window.localStorage.setItem("selfx_guest_active_order", JSON.stringify(orderRecord));
      } catch {
        // ignore
      }
      if (isVerifiedSignIn) {
        setCustomerOrders((prev) => [orderRecord, ...prev.filter((o) => o.number !== orderData.number)]);
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
    "Online Store";

  const logoUrl =
    (darkMode && onlineSettings?.branding?.darkLogoUrl?.trim()) ||
    onlineSettings?.branding?.logoUrl?.trim() ||
    "";

  const rawThemeStr =
    onlineSettings?.basics?.storeTheme?.trim() ||
    onlineSettings?.themeConfig?.activeTheme?.trim() ||
    "";

  const activeThemeVariant: "default" | "technova" | "littlejoy" | "freshmart" = useMemo(() => {
    const lower = rawThemeStr.toLowerCase();
    if (
      lower.includes("electropulse") ||
      lower.includes("technova") ||
      lower.includes("electronics") ||
      lower.includes("gadget") ||
      lower.includes("appliances")
    ) {
      return "technova";
    }
    if (
      lower.includes("wonderkids") ||
      lower.includes("littlejoy") ||
      lower.includes("kids") ||
      lower.includes("toy") ||
      lower.includes("boutique") ||
      lower.includes("gifts")
    ) {
      return "littlejoy";
    }
    if (
      lower.includes("verdantmart") ||
      lower.includes("freshmart") ||
      lower.includes("organic") ||
      lower.includes("daily supermarket") ||
      lower.includes("daily needs")
    ) {
      return "freshmart";
    }
    return "default";
  }, [rawThemeStr]);

  const brandPrimaryColor =
    onlineSettings?.basics?.primaryColor?.trim() ||
    onlineSettings?.branding?.primaryColor?.trim() ||
    (activeThemeVariant === "technova"
      ? "#1d4ed8"
      : activeThemeVariant === "littlejoy"
      ? "#6d5acd"
      : activeThemeVariant === "freshmart"
      ? "#16a34a"
      : "#16a34a");

  const brandSecondaryColor =
    onlineSettings?.basics?.secondaryColor?.trim() ||
    onlineSettings?.branding?.secondaryColor?.trim() ||
    "#0f172a";

  const actionColor = activeThemeVariant === "default" ? "#f97316" : brandPrimaryColor;
  const stockHeroHeadlines = new Set([
    "Stock up on daily essentials",
    "Upgrade Your Tech Lifestyle",
    "Little Ones' Big Smiles!",
    "Farm-fresh groceries delivered to your door",
  ]);
  const showConfiguredHero = Boolean(
    onlineSettings?.hero?.bannerImageUrl ||
      (onlineSettings?.banners ?? []).some((banner) => banner.enabled !== false) ||
      (onlineSettings?.hero?.enabled === true &&
        onlineSettings.hero.headline &&
        !stockHeroHeadlines.has(onlineSettings.hero.headline.trim())),
  );
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
    onlineSettings?.branding?.cardShadowStyle === "flat" || onlineSettings?.branding?.cardShadowStyle === "none"
      ? "shadow-none border border-slate-200"
      : onlineSettings?.branding?.cardShadowStyle === "elevated"
      ? "shadow-lg border border-slate-100 hover:shadow-xl"
      : "shadow-2xs border border-slate-200/90 hover:shadow-md";

  const isStoreOffline =
    !loading &&
    (onlineSettings?.basics?.enabled === false || onlineSettings?.basics?.maintenanceMode === true);

  if (isStoreOffline) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
        style={{ fontFamily: fontFamily !== "inherit" ? fontFamily : undefined }}
      >
        <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl space-y-4">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ backgroundColor: brandPrimaryColor }}
          >
            <Store size={30} />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
            <Clock size={12} />
            {onlineSettings?.basics?.maintenanceMode ? "Scheduled Maintenance" : "Online Ordering Paused"}
          </span>
          <h1 className="text-xl font-bold text-slate-900">{displayStoreName}</h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {onlineSettings?.basics?.maintenanceMessage?.trim() ||
              "We are currently updating our catalog and preparing fresh stock. Online ordering will resume shortly!"}
          </p>
          {(onlineSettings?.contact?.supportPhone || onlineSettings?.contact?.whatsappNumber) && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-2.5">
              {onlineSettings?.contact?.supportPhone && (
                <a
                  href={`tel:${onlineSettings.contact.supportPhone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <Phone size={14} />
                  <span>Call Store</span>
                </a>
              )}
              {onlineSettings?.contact?.enableFloatingWhatsapp === true && onlineSettings?.contact?.whatsappNumber && (
                <a
                  href={`https://wa.me/${onlineSettings.contact.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:opacity-95 transition"
                >
                  <MessageSquare size={14} />
                  <span>WhatsApp Us</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const useCustomThemeCatalog =
    viewMode === "catalog" && !orderConfirmed && activeThemeVariant !== "default";

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-slate-900 text-slate-100" : "bg-[#f6f5f2] text-slate-900"} transition-colors pb-24 sm:pb-0`}
      style={{
        fontFamily: fontFamily !== "inherit" ? fontFamily : undefined,
        ["--brand-primary" as any]: brandPrimaryColor,
        ["--brand-secondary" as any]: brandSecondaryColor,
      }}
    >
      {/* Top Announcement Bar (shown on Default theme or Checkout/Confirmation views; themed catalogs render their own bespoke topbars) */}
      {!useCustomThemeCatalog &&
      onlineSettings?.topbarFooter?.showTopbar !== false &&
      onlineSettings?.topbarFooter?.topbarText ? (
        <div
          className="px-3 sm:px-4 py-2 text-center text-[11px] sm:text-xs font-semibold transition"
          style={{ backgroundColor: topbarBg, color: topbarTextColor }}
        >
          <span>{stripEmojis(onlineSettings.topbarFooter.topbarText)}</span>
          {onlineSettings.topbarFooter.topbarLinkLabel && onlineSettings.topbarFooter.topbarLinkHref && (
            <a
              href={onlineSettings.topbarFooter.topbarLinkHref}
              className="ml-2 underline font-bold hover:opacity-90"
            >
              {stripEmojis(onlineSettings.topbarFooter.topbarLinkLabel)}
            </a>
          )}
        </div>
      ) : null}

      {/* 1. STORE HEADER (Shown on Default Theme & Checkout / Order Confirmed screens) */}
      {!useCustomThemeCatalog && (
        <header
          className={`${
            onlineSettings?.themeConfig?.stickyHeader !== false ? "sticky top-0 z-30" : "relative z-20"
          } border-b ${
            darkMode
              ? "border-slate-800 bg-slate-900/95"
              : onlineSettings?.branding?.headerBackground === "Dark Slate"
              ? "border-slate-800 bg-slate-900 text-white"
              : "border-slate-200/80 bg-white/95"
          } backdrop-blur-md`}
        >
          <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 gap-2">
            {/* Left: Brand Logo & Store Name */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {viewMode === "checkout" && (
                <button
                  type="button"
                  onClick={() => {
                    if (checkoutStep === "payment") {
                      setCheckoutStep("details");
                    } else {
                      setViewMode("catalog");
                    }
                  }}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 transition shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewMode("catalog")}
                className="flex items-center gap-2 sm:gap-2.5 text-left group min-w-0"
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={displayStoreName}
                    className="h-8 sm:h-9 w-auto max-w-[96px] sm:max-w-[150px] object-contain shrink-0"
                  />
                ) : (
                  <div
                    className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-white shadow-2xs shrink-0"
                    style={{ backgroundColor: brandPrimaryColor }}
                  >
                    <Utensils size={16} />
                  </div>
                )}
                <div className="min-w-0">
                  <h1
                    className={`text-xs sm:text-base font-bold tracking-tight group-hover:opacity-85 transition truncate max-w-[125px] xs:max-w-[160px] sm:max-w-none ${
                      darkMode || onlineSettings?.branding?.headerBackground === "Dark Slate"
                        ? "text-white"
                        : "text-slate-900"
                    }`}
                  >
                    {displayStoreName}
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 truncate max-w-[130px] sm:max-w-xs">
                    {onlineSettings?.basics?.storeTagline?.trim() ||
                      onlineSettings?.branding?.brandTagline?.trim() ||
                      (storeAddress ? `Ordering from ${storeAddress.split(",")[0]}` : "Online Ordering")}
                  </p>
                </div>
              </button>
            </div>

            {/* Right Action Icons: Language, Dark mode, Sign in, Orders, and Checkout Button */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
              {/* Interactive Language Switcher */}
              {onlineSettings?.topbarFooter?.showLanguageSwitcher !== false && (
                <div className="hidden md:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1 text-xs font-medium text-slate-700">
                  <Globe size={13} className="text-slate-500 shrink-0" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    aria-label="Language"
                    className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Telugu">తెలుగు (Telugu)</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Kannada">ಕನ್ನಡ (Kannada)</option>
                  </select>
                </div>
              )}

              {/* Customer Support / Contact Trigger */}
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="hidden lg:inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                title="Contact Store Support"
              >
                <MessageSquare size={13} className="text-slate-500" />
                <span>Support</span>
              </button>

              {/* Dark mode toggle */}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              </button>

              {/* Sign in / Customer Profile Button */}
              {onlineSettings?.basics?.phoneSignIn !== false && (
              <button
                type="button"
                onClick={() => {
                  if (isVerifiedSignIn) {
                    setCustomerProfileOpen(true);
                    if (phone) void refreshCustomerOrders(phone, true);
                  } else {
                    setLoginModalOpen(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                aria-label={isVerifiedSignIn ? "Customer Account" : "Sign in"}
              >
                <User size={14} className={isVerifiedSignIn ? "text-emerald-600" : "text-slate-500"} />
                <span className="hidden sm:inline">
                  {isVerifiedSignIn ? (name ? name.split(" ")[0] : `+91 ${phone ? phone.slice(-4) : "User"}`) : "Sign in"}
                </span>
              </button>
              )}

              {/* Orders Tracker Link */}
              {onlineSettings?.topbarFooter?.showOrderTrackingLink !== false && (
                <button
                  type="button"
                  onClick={() => {
                    if (isVerifiedSignIn) {
                      setCustomerProfileOpen(true);
                      if (phone) void refreshCustomerOrders(phone, true);
                    } else {
                      setOrdersDrawerOpen(true);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition relative cursor-pointer"
                  aria-label="Orders"
                >
                  <FileText size={14} className="text-slate-500" />
                  <span className="hidden sm:inline">Orders</span>
                  {isVerifiedSignIn && customerOrders.length > 0 && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: brandPrimaryColor }}
                    >
                      {customerOrders.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Status Notice Toast / Alert */}
      {message && (
        <div className="mx-auto mt-3 max-w-7xl px-3.5 sm:px-6">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-900 shadow-2xs">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="font-semibold text-amber-700 hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Order Confirmation Screen — Blinkit & Myntra Style Eyefeasting Animated Success Experience */}
      {orderConfirmed && (
        <div className="mx-auto mt-4 sm:mt-8 max-w-2xl px-4 sm:px-6 relative animate-in fade-in zoom-in-95 duration-300">
          {/* Confetti & Fireworks CSS Keyframe Animations */}
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(-40px) rotate(0deg) scale(0.7); opacity: 1; }
              70% { opacity: 1; }
              100% { transform: translateY(280px) rotate(540deg) scale(0.9); opacity: 0; }
            }
            @keyframes successRipple {
              0% { transform: scale(0.85); opacity: 0.8; }
              100% { transform: scale(1.6); opacity: 0; }
            }
            @keyframes checkmarkStroke {
              0% { stroke-dashoffset: 48; }
              100% { stroke-dashoffset: 0; }
            }
            .confetti-particle {
              position: absolute;
              width: 8px;
              height: 12px;
              border-radius: 2px;
              animation: confettiFall 2.8s cubic-bezier(0.25, 1, 0.5, 1) infinite;
            }
            .success-ripple {
              animation: successRipple 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
            }
            .checkmark-path {
              stroke-dasharray: 48;
              stroke-dashoffset: 48;
              animation: checkmarkStroke 0.65s cubic-bezier(0.65, 0, 0.45, 1) 0.15s forwards;
            }
          `}</style>

          {/* Floating Confetti Layer */}
          <div className="absolute inset-x-0 -top-6 h-64 overflow-hidden pointer-events-none z-10">
            <span className="confetti-particle bg-amber-400" style={{ left: "10%", animationDelay: "0s" }} />
            <span className="confetti-particle bg-emerald-500" style={{ left: "22%", animationDelay: "0.3s", width: "10px", height: "10px", borderRadius: "50%" }} />
            <span className="confetti-particle bg-indigo-500" style={{ left: "35%", animationDelay: "0.15s" }} />
            <span className="confetti-particle bg-rose-400" style={{ left: "48%", animationDelay: "0.45s", width: "7px", height: "14px" }} />
            <span className="confetti-particle bg-emerald-400" style={{ left: "62%", animationDelay: "0.2s" }} />
            <span className="confetti-particle bg-orange-400" style={{ left: "75%", animationDelay: "0.35s", width: "9px", height: "9px", borderRadius: "50%" }} />
            <span className="confetti-particle bg-sky-400" style={{ left: "88%", animationDelay: "0.1s" }} />
          </div>

          <div className="relative rounded-[28px] border-2 border-emerald-100 bg-white p-6 sm:p-9 shadow-[0_20px_50px_rgba(16,185,129,0.12)] text-center overflow-hidden">
            {/* Top Soft Emerald Ambient Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-72 rounded-full bg-emerald-100/60 blur-3xl pointer-events-none" />

            {/* Central Animated Checkmark with Pulsing Ripple Waves */}
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <span className="success-ripple absolute inset-0 rounded-full bg-emerald-200" />
              <span className="success-ripple absolute inset-0 rounded-full bg-emerald-300" style={{ animationDelay: "0.7s" }} />
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#16a34a] via-[#10b981] to-[#34d399] text-white shadow-[0_10px_25px_rgba(16,185,129,0.45)]">
                <svg viewBox="0 0 48 48" className="h-10 w-10 text-white" fill="none">
                  <path
                    className="checkmark-path"
                    d="M12 24 L21 33 L36 15"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Headline & Badges */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
       
                Order Placed Successfully
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 pt-1">
                Thank You for Your Order!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
                Your order is confirmed and sent directly to the store for packing and dispatch.
              </p>
            </div>

            {/* Blinkit-Style Estimated Delivery Countdown Card */}
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-[#f0fdf4] to-emerald-50/90 p-4 sm:p-4.5 text-left flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#16a34a] text-white shadow-xs shrink-0">
                  <Clock size={20} className="stroke-[2.5]" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    {orderConfirmed.fulfillment === "pickup" ? "Ready for Store Pickup" : "Doorstep Delivery"}
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                    {orderConfirmed.deliverySlot
                      ? `Slot: ${orderConfirmed.deliverySlot}`
                      : orderConfirmed.fulfillment === "pickup"
                      ? "Ready at counter in 10–15 mins"
                      : "Estimated Delivery: 15–25 mins"}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
                  Preparing Now
                </span>
              </div>
            </div>

            {/* Order Details & Summary Pills */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Order ID
                </span>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 truncate block mt-0.5">
                  #{orderConfirmed.number}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Amount
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-[#16a34a] block mt-0.5">
                  {formatStorePrice(orderConfirmed.totalPaise)}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Order Mode
                </span>
                <span className="capitalize text-xs font-bold text-slate-800 truncate block mt-0.5">
                  {orderConfirmed.fulfillment.replace(/_/g, " ")}
                </span>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Payment
                </span>
                <span className="capitalize text-xs font-bold text-slate-800 truncate block mt-0.5">
                  {orderConfirmed.payment.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Verification Card: QR Code ONLY for Store Pickup; Delivery OTP (NO QR) for Doorstep Delivery */}
            {orderConfirmed.fulfillment === "pickup" ? (
              <div className="mt-4 rounded-2xl border border-dashed border-orange-300 bg-orange-50/50 p-4 text-center max-w-sm mx-auto">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-orange-800 mb-2">
                  <QrCode size={16} />
                  <span>Show this QR at Store Counter for Receipt</span>
                </div>
                {orderConfirmed.qrDataUrl && (
                  <div className="mx-auto flex justify-center bg-white p-3 rounded-xl shadow-xs border border-slate-200 max-w-[180px]">
                    <img src={orderConfirmed.qrDataUrl} alt="Store Pickup QR" className="w-full h-auto" />
                  </div>
                )}
                <div className="mt-2 font-mono text-xs font-extrabold text-slate-800">
                  {orderConfirmed.pickupQr}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Present this QR to counter staff to scan and print your receipt.
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-emerald-50/30 p-4 text-center max-w-sm mx-auto space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800">
                  <ShieldCheck size={16} />
                  <span>Delivery Verification OTP</span>
                </div>
                <div className="inline-block bg-white px-6 py-2 rounded-xl border border-emerald-300 shadow-2xs font-mono text-3xl font-black tracking-widest text-emerald-950">
                  {orderConfirmed.deliveryOtp || computeVerificationCode(orderConfirmed.number, orderConfirmed.id)}
                </div>
                <p className="text-[11.5px] text-emerald-700 leading-tight">
                  Share this <strong>4-digit OTP</strong> with your delivery partner upon arrival to verify delivery.
                </p>
              </div>
            )}

            {/* Primary Action Buttons: Track Order Live (Opens Modified Tracking Page) & Continue */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/track?number=${encodeURIComponent(orderConfirmed.number)}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#16a34a] hover:bg-green-700 text-white px-7 py-3.5 text-xs sm:text-sm font-extrabold shadow-md transition active:scale-95 cursor-pointer"
              >
                <Navigation size={15} className="rotate-45 fill-white stroke-none" />
                <span>Track Live Order</span>
                <ChevronRight size={16} />
              </Link>

              <button
                type="button"
                onClick={() => setOrderConfirmed(null)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3.5 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2A. INDUSTRY THEMED CATALOG VIEWS (Image 1: TechNova, Image 2: LittleJoy, Image 3: FreshMart) */}
      {useCustomThemeCatalog && (
        <StorefrontThemedCatalog
          themeVariant={activeThemeVariant as "technova" | "littlejoy" | "freshmart"}
          displayStoreName={displayStoreName}
          logoUrl={logoUrl}
          brandPrimaryColor={brandPrimaryColor}
          brandSecondaryColor={brandSecondaryColor}
          onlineSettings={onlineSettings}
          storeAddress={storeAddress}
          hours={hours}
          openNow={openNow}
          items={items}
          visibleItems={visibleItems}
          categoriesWithCounts={categoriesWithCounts}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          query={query}
          setQuery={setQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          qty={qty}
          updateItemQty={updateItemQty}
          totalItemsCount={totalItemsCount}
          grandTotalPaise={grandTotalPaise}
          formatPrice={formatStorePrice}
          productImageFor={productImageFor}
          onOpenCart={() => setCartDrawerOpen(true)}
          onOpenLogin={() => setLoginModalOpen(true)}
          onOpenOrders={() => {
            setOrdersDrawerOpen(true);
            if (phone) void refreshCustomerOrders(phone);
          }}
          onOpenQuickView={(item) => setQuickViewItem(item)}
          onOpenTryOn={(item) => setTryOnItem(item)}
          onOpenContactModal={() => setContactModalOpen(true)}
          wishlistIds={wishlistIds}
          onToggleWishlist={handleToggleWishlist}
          customerPhone={phone}
          customerOrdersCount={customerOrders.length}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          newsletterEmail={newsletterEmail}
          setNewsletterEmail={setNewsletterEmail}
          onSubscribeNewsletter={handleSubscribeNewsletter}
          newsletterSubscribed={newsletterSubscribed}
          pincode={pincode}
          setPincode={setPincode}
          pincodeStatus={pincodeStatus}
          onCheckPincode={handleCheckPincode}
        />
      )}

      {/* 2B. DEFAULT THEME CATALOG VIEW (Present Express Menu & Storefront Theme) */}
      {viewMode === "catalog" && !orderConfirmed && activeThemeVariant === "default" && (
        <main className="mx-auto max-w-5xl px-3.5 sm:px-6 py-4 sm:py-6 space-y-5">
          <section className="overflow-hidden rounded-[20px] border border-orange-100 bg-gradient-to-b from-[#fff7ed] to-white px-4 py-6 sm:px-8 sm:py-8 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${openNow ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${openNow ? "bg-emerald-500" : "bg-slate-400"}`} />
                    {openNow ? "Open" : "Closed"}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Menu and order</span>
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{displayStoreName}</h2>
                <p className="mt-1 max-w-xl text-sm text-slate-500">
                  {stripEmojis(onlineSettings?.branding?.brandTagline) || "Browse the menu, choose what you need, and check out in a few taps."}
                </p>
              </div>

              {/* Orders Button & Delivery Availability Control Side-by-Side in Banner */}
              <div className="flex flex-wrap items-center gap-2">
                {onlineSettings?.enableDeliveryAvailability !== false &&
                  onlineSettings?.themeConfig?.enablePinCodeChecker !== false && (
                    <button
                      type="button"
                      onClick={() => setDeliveryPopoverOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-xs font-semibold transition shadow-2xs ${
                        matchedServiceableLocation || pincodeValid === true
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : pincodeValid === false
                          ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
                          : "border-orange-200 bg-white text-slate-800 hover:border-orange-300"
                      }`}
                    >
                      <MapPin size={13} className="text-[#f97316] shrink-0" />
                      <span>
                        {matchedServiceableLocation
                          ? `Deliver to: ${matchedServiceableLocation.areaName} (${matchedServiceableLocation.pinCode})`
                          : pincode
                          ? `Delivery PIN: ${pincode}`
                          : "Check Delivery Availability"}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-slate-400 transition-transform ${deliveryPopoverOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => {
                    setOrdersDrawerOpen(true);
                    if (phone && isVerifiedSignIn) void refreshCustomerOrders(phone, true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f97316] hover:bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs transition"
                >
                  <span>Orders</span>
                  {isVerifiedSignIn && customerOrders.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#f97316]">
                      {customerOrders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Delivery Availability Panel right inside the Banner */}
            {onlineSettings?.enableDeliveryAvailability !== false &&
              onlineSettings?.themeConfig?.enablePinCodeChecker !== false &&
              deliveryPopoverOpen && (
                <div className="rounded-2xl border border-orange-200/80 bg-white/95 p-3.5 shadow-xs space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <Truck size={14} className="text-[#f97316]" />
                      <span>Check if we deliver to your area or PIN code</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeliveryPopoverOpen(false)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => {
                        setPincode(e.target.value);
                        setPincodeStatus(null);
                      }}
                      placeholder="Enter 6-digit PIN or area name"
                      className="h-9 flex-1 min-w-[180px] sm:max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-orange-400"
                    />
                    <button
                      type="button"
                      onClick={handleCheckPincode}
                      className="h-9 rounded-xl bg-[#f97316] hover:bg-orange-600 px-4 text-xs font-semibold text-white transition"
                    >
                      Check Availability
                    </button>
                    {pincodeStatus && (
                      <span
                        className={`text-xs font-semibold ${
                          pincodeValid === false ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {pincodeStatus}
                      </span>
                    )}
                  </div>

                  {activeServiceableLocations.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Registered Serviceable Locations ({activeServiceableLocations.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeServiceableLocations.map((loc) => {
                          const isSelected =
                            pincode.trim() === loc.pinCode ||
                            matchedServiceableLocation?.id === loc.id;
                          return (
                            <button
                              key={loc.id}
                              type="button"
                              onClick={() => {
                                setPincode(loc.pinCode);
                                if (!address) setAddress(loc.areaName);
                                setPincodeValid(true);
                                setPincodeStatus(
                                  `Deliverable · ${loc.areaName} (${loc.pinCode}) · ${loc.etaText || "30–45 mins"}`,
                                );
                              }}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:bg-orange-50/40"
                              }`}
                            >
                              <MapPin size={11} className={isSelected ? "text-emerald-600" : "text-[#f97316]"} />
                              <span>{loc.areaName}</span>
                              <span className="font-mono text-[10px] text-slate-500">({loc.pinCode})</span>
                              {loc.etaText && (
                                <span className="text-[10px] text-emerald-700">· {loc.etaText}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </section>

          {/* Tenant Hero Section if configured */}
          {showConfiguredHero &&
            (onlineSettings?.hero?.headline || onlineSettings?.hero?.bannerImageUrl) && (
              <div
                className={`relative overflow-hidden ${cardRadiusClass} text-white p-5 sm:p-8 shadow-sm`}
                style={{
                  background: `linear-gradient(135deg, ${brandPrimaryColor} 0%, ${brandSecondaryColor} 100%)`,
                }}
              >
                <div className="relative z-10 max-w-xl space-y-2 sm:space-y-3">
                  {onlineSettings.hero.eyebrowBadge && (
                    <span className="inline-block rounded-full bg-white/20 backdrop-blur-xs px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-white">
                      {stripEmojis(onlineSettings.hero.eyebrowBadge)}
                    </span>
                  )}
                  {onlineSettings.hero.deliveryTimeText && !onlineSettings.hero.eyebrowBadge && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-xs px-3 py-1 text-[11px] font-semibold text-white">
                      <Clock size={12} />
                      <span>{stripEmojis(onlineSettings.hero.deliveryTimeText)}</span>
                    </div>
                  )}
                  <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
                    {stripEmojis(onlineSettings.hero.headline)}
                  </h2>
                  {onlineSettings.hero.subheadline && (
                    <p className="text-xs sm:text-sm text-white/90 font-normal leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {stripEmojis(onlineSettings.hero.subheadline)}
                    </p>
                  )}
                  {onlineSettings.hero.promoHighlightText && (
                    <div className="pt-1 text-[11px] sm:text-xs font-medium text-amber-200 flex items-center gap-1.5">
                      <Tag size={12} className="shrink-0" />
                      <span>{stripEmojis(onlineSettings.hero.promoHighlightText)}</span>
                    </div>
                  )}
                  {onlineSettings.hero.showTrustPills !== false &&
                    (onlineSettings.hero.trustPill1 ||
                      onlineSettings.hero.trustPill2 ||
                      onlineSettings.hero.trustPill3) && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {[
                          onlineSettings.hero.trustPill1,
                          onlineSettings.hero.trustPill2,
                          onlineSettings.hero.trustPill3,
                        ]
                          .filter(Boolean)
                          .map((pill, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white"
                            >
                              <Check size={10} />
                              {stripEmojis(pill)}
                            </span>
                          ))}
                      </div>
                    )}
                </div>
                {onlineSettings.hero.bannerImageUrl && (
                  <div className="absolute right-0 top-0 bottom-0 w-2/5 sm:w-1/3 opacity-20 sm:opacity-35 pointer-events-none">
                    <img
                      src={onlineSettings.hero.bannerImageUrl}
                      alt="Store Banner"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}

          {/* Promotional Banners from Online Store -> Banners (Off by default unless showBanners is enabled) */}
          {onlineSettings?.themeConfig?.showBanners === true &&
            Array.isArray(onlineSettings?.banners) &&
            onlineSettings.banners.filter((b) => b.enabled !== false).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {onlineSettings.banners
                  .filter((b) => b.enabled !== false)
                  .slice(0, 2)
                  .map((banner) => (
                    <div
                      key={banner.id}
                      className={`flex items-center justify-between gap-3 p-4 text-white shadow-xs ${cardRadiusClass}`}
                      style={{ backgroundColor: banner.bgColor || brandPrimaryColor }}
                    >
                      <div className="space-y-1 min-w-0">
                        {banner.badgeText && (
                          <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {banner.badgeText}
                          </span>
                        )}
                        <h3 className="text-sm font-bold leading-snug truncate">{banner.title}</h3>
                        {banner.subtitle && (
                          <p className="text-xs text-white/85 truncate">{banner.subtitle}</p>
                        )}
                      </div>
                      {banner.ctaText && (
                        <span className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-slate-900 shadow-2xs">
                          {banner.ctaText}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}

          {/* Search Bar & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, brands, or categories..."
                className="w-full h-11 rounded-full border border-slate-200 bg-white pl-10 pr-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-none"
                style={{ outlineColor: brandPrimaryColor }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Filter"
                >
                  <SlidersHorizontal size={15} />
                </button>
              )}
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

          {/* Curated Collections Strip if configured in Online Store -> Collections (Off by default unless showCollections is enabled) */}
          {onlineSettings?.themeConfig?.showCollections === true &&
            Array.isArray(onlineSettings?.collections) &&
            onlineSettings.collections.filter((c) => c.enabled !== false).length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                  Collections:
                </span>
                {onlineSettings.collections
                  .filter((c) => c.enabled !== false)
                  .map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setQuery(col.name)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 shadow-2xs transition"
                    >
                      <Tag size={11} style={{ color: brandPrimaryColor }} />
                      <span>{col.name}</span>
                    </button>
                  ))}
              </div>
            )}

          {/* Horizontal Category Filter Pills with Item Counts */}
          <div className="-mx-3.5 px-3.5 sm:mx-0 sm:px-0 flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {categoriesWithCounts.map((cat) => {
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(cat.name)}
                  style={isActive ? { backgroundColor: brandPrimaryColor, color: "#ffffff" } : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 sm:px-4 py-2 text-xs font-semibold transition ${
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

          {/* Catalog Products Section Header */}
          <div className="pt-1">
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 rounded-full" style={{ backgroundColor: brandPrimaryColor }} />
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide text-slate-900">
                  {activeCategory === "All" ? "All Store Items" : activeCategory}
                </h2>
                <span className="text-xs text-slate-500 font-medium">({visibleItems.length} items)</span>
              </div>
            </div>

            {/* Product Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className={`h-28 ${cardRadiusClass} border border-slate-200 bg-white p-3 animate-pulse`}
                  />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className={`border border-dashed border-slate-200 bg-white p-10 text-center ${cardRadiusClass}`}>
                <Utensils size={32} className="mx-auto text-slate-300 mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No items found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try selecting another category or clear your search filter.
                </p>
              </div>
            ) : (
              <div
                className={`grid ${
                  onlineSettings?.themeConfig?.productGridColumnsMobile === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1"
                } ${
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
                  const discountPct = hasDiscount
                    ? Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100)
                    : 0;
                  const isWishlisted = wishlistIds.includes(item.id);
                  const lowStockThreshold = Number(onlineSettings?.basics?.lowStockBadgeThreshold ?? 5);
                  const isLowStock =
                    typeof item.on_hand === "number" &&
                    item.on_hand > 0 &&
                    item.on_hand <= lowStockThreshold;
                  const isMobileTwoCol = onlineSettings?.themeConfig?.productGridColumnsMobile === 2;

                  return (
                    <div
                      key={item.id}
                      className={`group flex ${
                        isMobileTwoCol ? "flex-col sm:flex-row sm:items-center" : "items-center"
                      } justify-between ${cardRadiusClass} bg-white p-3 sm:p-3.5 ${cardShadowClass} transition`}
                    >
                      {/* Left: Product Thumbnail with Veg/Non-Veg & Quick Actions */}
                      <div
                        onClick={() => {
                          if (onlineSettings?.themeConfig?.showQuickViewModal !== false) {
                            setQuickViewItem(item);
                          }
                        }}
                        className={`relative ${
                          isMobileTwoCol
                            ? "h-32 w-full sm:h-24 sm:w-24 mb-2.5 sm:mb-0"
                            : "h-22 w-22 sm:h-24 sm:w-24"
                        } shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 cursor-pointer`}
                      >
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

                        {/* Veg / Non-Veg Indicator Badge */}
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

                        {/* Wishlist Heart Icon if enabled */}
                        {onlineSettings?.themeConfig?.showAddToWishlist && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWishlist(item.id);
                            }}
                            aria-label="Toggle wishlist"
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-2xs hover:text-rose-600"
                          >
                            <Heart
                              size={12}
                              className={isWishlisted ? "fill-rose-500 text-rose-500" : ""}
                            />
                          </button>
                        )}
                      </div>

                      {/* Middle: Title, Brand, SKU, Stock & Price info */}
                      <div className={`flex-1 ${isMobileTwoCol ? "sm:px-3.5" : "px-3 sm:px-3.5"} min-w-0`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {onlineSettings?.themeConfig?.showBrandOnCard !== false && item.brand && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                              {item.brand}
                            </span>
                          )}
                          {onlineSettings?.themeConfig?.showSkuOnCard && item.sku && (
                            <span className="text-[9px] font-mono text-slate-400">#{item.sku}</span>
                          )}
                        </div>

                        <h3
                          onClick={() => {
                            if (onlineSettings?.themeConfig?.showQuickViewModal !== false) {
                              setQuickViewItem(item);
                            }
                          }}
                          className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug line-clamp-2 cursor-pointer hover:opacity-80"
                        >
                          {item.name}
                        </h3>

                        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">
                            {item.unit_short || "1 Unit"}
                          </span>
                          {onlineSettings?.basics?.showStockCount && typeof item.on_hand === "number" && (
                            <span className="text-[10px] font-semibold text-slate-500">
                              · {item.on_hand} in stock
                            </span>
                          )}
                          {isLowStock && (
                            <span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[9px] font-semibold text-amber-800">
                              Only {item.on_hand} left
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold" style={{ color: brandPrimaryColor }}>
                            {formatStorePrice(pricePaise)}
                          </span>
                          {onlineSettings?.themeConfig?.showMrpStrike !== false && hasDiscount && (
                            <span className="text-[11px] text-slate-400 line-through font-normal">
                              {formatStorePrice(mrpPaise)}
                            </span>
                          )}
                          {onlineSettings?.themeConfig?.showDiscountPercentageBadge !== false && hasDiscount && (
                            <span className="rounded px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                              {discountPct}% OFF
                            </span>
                          )}
                        </div>

                        {/* Virtual Try-On Badge & Trigger Button */}
                        {Boolean(
                          (typeof item.details === "object" && (item.details as any)?.tryon_enabled) ||
                          (typeof item.details === "string" && item.details.includes("tryon_enabled")) ||
                          (typeof item.details === "object" && (item.details as any)?.tryon_cutout_url)
                        ) && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTryOnItem(item);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 px-2.5 py-1 text-[10px] font-black text-white shadow-xs hover:shadow-sm active:scale-95 transition cursor-pointer"
                            >
                              <Sparkles size={11} className="text-amber-300 animate-pulse" />
                              <span>Try In AI Mirror</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right: + Add Button / [-] qty [+] Stepper */}
                      <div className={`shrink-0 ${isMobileTwoCol ? "mt-2.5 sm:mt-0 w-full sm:w-auto flex justify-end" : ""}`}>
                        {currentQty === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateItemQty(item.id, 1)}
                            style={{
                              color: actionColor,
                              borderColor: actionColor,
                              backgroundColor: "#fff7ed",
                            }}
                            className={`inline-flex items-center justify-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-2xs hover:opacity-90 active:scale-95 transition ${
                              isMobileTwoCol ? "w-full sm:w-auto" : ""
                            }`}
                          >
                            <Plus size={13} />
                            <span>Add</span>
                          </button>
                        ) : (
                          <div
                            style={{ backgroundColor: actionColor, color: "#ffffff" }}
                            className={`inline-flex items-center justify-between gap-1.5 sm:gap-2 px-2 py-1 text-xs font-semibold shadow-xs ${
                              isMobileTwoCol ? "w-full sm:w-auto" : ""
                            } ${buttonRadiusClass}`}
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
                        <p className="text-[11px] text-slate-500">{formatStorePrice(line.pricePaise)} each</p>
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
                        {formatStorePrice(line.lineTotalPaise)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Breakdown & Continue CTA Box (Matches Image 2) */}
            {cartLines.length > 0 && (
              <div className="border-t border-slate-200 bg-slate-50/70 p-4 space-y-3">
                {/* Promo / Invite Code Input */}
                <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag size={13} className="text-slate-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Have a promo or invite code?"
                      className="flex-1 bg-transparent text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 outline-none uppercase"
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCoupon("");
                        }}
                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        style={{ color: brandPrimaryColor }}
                        className="rounded-lg px-2.5 py-1 text-xs font-bold hover:bg-slate-50"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                  {Array.isArray(onlineSettings?.inviteCodes) &&
                    onlineSettings.inviteCodes.filter((c) => c.enabled !== false).length > 0 &&
                    !appliedCoupon && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
                        {onlineSettings.inviteCodes
                          .filter((c) => c.enabled !== false)
                          .slice(0, 3)
                          .map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCoupon(c.code);
                              }}
                              className="shrink-0 rounded-md border border-dashed border-emerald-300 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                            >
                              {c.code}
                            </button>
                          ))}
                      </div>
                    )}
                </div>

                {/* Cost Breakdown */}
                <div className="rounded-xl bg-[#fffcf7] border border-orange-100 p-3.5 text-xs space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatStorePrice(netSubtotalPaise)}</span>
                  </div>
                  {couponDiscountPaise > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                      <span>Promo Discount ({appliedCoupon?.code})</span>
                      <span>-{formatStorePrice(couponDiscountPaise)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>CGST ({cgstPct}%)</span>
                    <span>{formatStorePrice(cgstPaise)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>SGST ({sgstPct}%)</span>
                    <span>{formatStorePrice(sgstPaise)}</span>
                  </div>
                  {!isTaxInclusive && taxAdditionPaise > 0 && (
                    <div className="flex justify-between text-amber-700 text-[11px] font-medium">
                      <span>GST Added ({totalTaxPct}%)</span>
                      <span>+{formatStorePrice(taxAdditionPaise)}</span>
                    </div>
                  )}
                  {deliveryChargePaise > 0 && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Delivery Fee</span>
                      <span>{formatStorePrice(deliveryChargePaise)}</span>
                    </div>
                  )}
                  {packagingChargePaise > 0 && (
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Packaging Fee</span>
                      <span>{formatStorePrice(packagingChargePaise)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-orange-200/60 flex justify-between items-baseline">
                    <span className="font-medium text-slate-800">Total {isTaxInclusive ? "(incl. tax)" : ""}</span>
                    <span className="text-base font-semibold" style={{ color: brandPrimaryColor }}>
                      {formatStorePrice(grandTotalPaise)}
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
                  style={{ backgroundColor: actionColor }}
                  className="w-full flex items-center justify-center gap-2 rounded-full text-white py-3.5 text-xs font-semibold uppercase tracking-wider shadow-sm hover:opacity-95 transition"
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

      {/* 4. TWO-STEP CHECKOUT SCREEN (Details & Address -> Payment Options) */}
      {viewMode === "checkout" && !orderConfirmed && (
        <main className="mx-auto max-w-7xl px-3.5 sm:px-6 py-4 sm:py-8 pb-32 sm:pb-28">
          {checkoutStep === "details" ? (
            /* STEP 1: CUSTOMER DETAILS & SAVED ADDRESSES */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Customer Details, Registered Address Dropdown, & Delivery Location */}
              <div className="space-y-4 sm:space-y-6 lg:col-span-8">
                {/* Registered Details Header with Dropdown (2nd Order Onwards for Signed-in Customers) */}
                {isVerifiedSignIn && savedAddresses.length > 0 && !isAddingNewAddress && (
                  <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0"
                          style={{ backgroundColor: brandPrimaryColor }}
                        >
                          <Home size={15} />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                          className="flex items-center gap-1.5 text-left group cursor-pointer min-w-0"
                        >
                          <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                            {activeSavedAddress?.label || "Home"} · {activeSavedAddress?.name || name}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-slate-500 shrink-0 transition-transform duration-200 ${
                              isAddressDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewAddress(true);
                          setEditingAddressId(null);
                          setNewAddressLabel("Home");
                          setAddress("");
                          setLandmark("");
                          setPincode("");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add New Address</span>
                      </button>
                    </div>

                    {/* Active Address Card Preview */}
                    <div className="rounded-xl bg-slate-50/80 border border-slate-200/80 p-3 sm:p-3.5 flex items-start justify-between gap-3">
                      <div className="space-y-1 text-xs text-slate-600 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {activeSavedAddress?.name || name}
                          </span>
                          <span className="rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2">
                            {activeSavedAddress?.label || "Home"}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed">
                          {activeSavedAddress?.address || address}
                          {activeSavedAddress?.landmark ? `, Near ${activeSavedAddress.landmark}` : ""}
                        </p>
                        <p className="text-slate-500 text-[11px] font-mono">
                          PIN: {activeSavedAddress?.pincode || pincode} · Mobile: +91 {activeSavedAddress?.phone || phone}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (activeSavedAddress) {
                            setEditingAddressId(activeSavedAddress.id);
                            setNewAddressLabel(activeSavedAddress.label || "Home");
                            setName(activeSavedAddress.name);
                            setPhone(activeSavedAddress.phone);
                            setAddress(activeSavedAddress.address);
                            setLandmark(activeSavedAddress.landmark || "");
                            setPincode(activeSavedAddress.pincode);
                            setIsAddingNewAddress(true);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs transition shrink-0 cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* Dropdown Menu of All Registered Addresses */}
                    {isAddressDropdownOpen && (
                      <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Select Saved Address ({savedAddresses.length})
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {savedAddresses.map((addr) => {
                            const isSelected = addr.id === (selectedAddressId || activeSavedAddress?.id);
                            return (
                              <div
                                key={addr.id}
                                onClick={() => selectAddress(addr)}
                                className={`flex items-start justify-between gap-3 rounded-xl border p-3 cursor-pointer transition ${
                                  isSelected
                                    ? "border-emerald-600 bg-emerald-50/50 shadow-2xs ring-1 ring-emerald-500/20"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div
                                    className={`h-4 w-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                      isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300 bg-white"
                                    }`}
                                  >
                                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </div>
                                  <div className="min-w-0 text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900">{addr.label}</span>
                                      <span className="text-slate-400">·</span>
                                      <span className="font-medium text-slate-700">{addr.name}</span>
                                    </div>
                                    <p className="text-slate-600 text-[11px] truncate mt-0.5">{addr.address}</p>
                                    <p className="text-slate-400 text-[10px] mt-0.5">
                                      PIN: {addr.pincode} · +91 {addr.phone}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAddressId(addr.id);
                                    setNewAddressLabel(addr.label || "Home");
                                    setName(addr.name);
                                    setPhone(addr.phone);
                                    setAddress(addr.address);
                                    setLandmark(addr.landmark || "");
                                    setPincode(addr.pincode);
                                    setIsAddingNewAddress(true);
                                  }}
                                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 p-1 shrink-0 hover:underline"
                                >
                                  Edit
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Add New Address or Edit Address Card (1st Order for signed in or explicitly editing/adding) */}
                {(isAddingNewAddress || (isVerifiedSignIn && savedAddresses.length === 0)) && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={17} style={{ color: brandPrimaryColor }} />
                        <h3 className="text-sm font-bold text-slate-900">
                          {editingAddressId
                            ? "Edit Delivery Address"
                            : savedAddresses.length === 0
                            ? "Enter Delivery Address (Saved for 1-Click reorder)"
                            : "Add New Delivery Address"}
                        </h3>
                      </div>
                      {savedAddresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewAddress(false);
                            setEditingAddressId(null);
                            if (activeSavedAddress) selectAddress(activeSavedAddress);
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    {/* Address Label Pills (Home / Work / Other) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Save address as</label>
                      <div className="flex gap-2">
                        {["Home", "Work", "Other"].map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setNewAddressLabel(lbl)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                              newAddressLabel === lbl
                                ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Name & Phone Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Full name *</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Recipient's full name"
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                        <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-slate-400">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 pr-2 border-r border-slate-200">
                            <Phone size={11} className="text-slate-400" />
                            <span>+91</span>
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder="10-digit mobile"
                            className="w-full bg-transparent pl-2 text-xs font-medium text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Line with embedded 1-Click GPS button */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Delivery Address (Flat / House No, Building, Street) *
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. 104, Green Heights, 1st Cross"
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-28 sm:pr-32 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400"
                        />
                        <button
                          type="button"
                          onClick={handleDetectLiveLocation}
                          disabled={detectingLocation}
                          title={locationSuccess ? "GPS Location Locked" : "Auto-detect location via GPS"}
                          style={{
                            borderColor: `${brandPrimaryColor}40`,
                            color: brandPrimaryColor,
                            backgroundColor: `${brandPrimaryColor}10`,
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer select-none"
                        >
                          <Navigation size={12} className={detectingLocation ? "animate-spin" : ""} />
                          <span className="truncate max-w-[90px] sm:max-w-none">
                            {detectingLocation
                              ? "Locating..."
                              : locationSuccess
                              ? "GPS Locked"
                              : "1-Click GPS"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Landmark & PIN code */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 truncate">Landmark</label>
                        <input
                          type="text"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          placeholder="e.g. Near Metro Station"
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="6-digit PIN"
                          className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>

                    {/* GPS Coordinates Badge if detected */}
                    {latitude && longitude && (
                      <div className="pt-1">
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2 sm:p-2.5 flex items-center justify-between text-xs text-slate-700">
                          <span className="font-mono text-[10px] sm:text-[11px] flex items-center gap-1.5 truncate">
                            <MapPin size={12} style={{ color: brandPrimaryColor }} />
                            GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                          </span>
                          <a
                            href={liveLocationUrl || `https://www.google.com/maps?q=${latitude},${longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold hover:underline shrink-0 ml-2"
                            style={{ color: brandPrimaryColor }}
                          >
                            <span>Open Map</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Save Address Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSaveAddress}
                        style={{ backgroundColor: brandPrimaryColor }}
                        className="w-full h-11 rounded-xl text-xs sm:text-sm font-bold text-white shadow-2xs hover:opacity-95 transition cursor-pointer"
                      >
                        {editingAddressId ? "Save Updated Address" : "Save Delivery Address"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Details Form for Guest or Unverified Customers */}
                {!isVerifiedSignIn && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs space-y-4">
                    {/* Sign In vs Guest Toggle or Store Enforcement Badge */}
                    {onlineSettings?.basics?.phoneSignIn !== false && onlineSettings?.basics?.guestCheckout !== false ? (
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 rounded-xl bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerAuthMode("signed_in");
                            setOtpError(null);
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 text-xs font-bold transition ${
                            customerAuthMode === "signed_in"
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Lock size={12} className="text-emerald-600 shrink-0" />
                          <span className="sm:hidden">Sign In (OTP)</span>
                          <span className="hidden sm:inline">Sign In (Phone + OTP)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerAuthMode("guest");
                            setOtpError(null);
                          }}
                          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 sm:py-2 px-2 sm:px-3 text-xs font-bold transition ${
                            customerAuthMode === "guest"
                              ? "bg-white text-slate-900 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <User size={12} className="text-slate-500 shrink-0" />
                          <span className="sm:hidden">Guest</span>
                          <span className="hidden sm:inline">Guest Checkout</span>
                        </button>
                      </div>
                    ) : onlineSettings?.basics?.phoneSignIn !== false ? (
                      <div className="flex items-center gap-2 rounded-xl bg-indigo-50/70 border border-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-900">
                        <Lock size={14} className="text-indigo-600 shrink-0" />
                        <span>Sign In with Phone + OTP Required (Guest checkout disabled by store)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                        <User size={14} className="text-slate-500 shrink-0" />
                        <span>Instant Guest Checkout (Sign-in disabled by store)</span>
                      </div>
                    )}

                    {/* OTP Sign-In Card */}
                    {customerAuthMode === "signed_in" && onlineSettings?.basics?.phoneSignIn !== false ? (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3.5 sm:p-4 space-y-3 shadow-2xs transition-all">
                        {!otpRequested ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-slate-900">
                                  Verify Mobile Number with OTP
                                </div>
                                <p className="hidden sm:block text-[11px] text-slate-600 mt-0.5">
                                  Sign in to unlock saved addresses and order history.
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold ${
                                  smsOtpEnabled
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {smsOtpEnabled ? "SMS Active" : "SMS Gateway Pending"}
                              </span>
                            </div>

                            <div className="flex h-12 w-full items-center rounded-xl border border-slate-200 bg-white px-3.5 shadow-2xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 transition">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 pr-2.5 border-r border-slate-200 shrink-0">
                                <Phone size={13} className="text-slate-400" />
                                <span>+91</span>
                              </span>
                              <input
                                type="tel"
                                maxLength={10}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile number"
                                className="w-full bg-transparent pl-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                              />
                            </div>

                            {/* Google reCAPTCHA Container for Firebase Phone Auth */}
                            <div id="storefront-recaptcha" className="my-1.5" />

                            <button
                              type="button"
                              onClick={handleRequestOtp}
                              disabled={otpLoading || phone.replace(/\D/g, "").length < 10}
                              style={{ backgroundColor: brandPrimaryColor }}
                              className="w-full h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold text-white shadow-2xs hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {otpLoading ? (
                                <>
                                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Sending OTP...</span>
                                </>
                              ) : (
                                <>
                                  <span>Send 6-Digit OTP</span>
                                  <ChevronRight size={15} />
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200/90 px-3 py-2 shadow-2xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-xs text-slate-600 truncate">
                                  OTP sent to <strong className="text-slate-900 font-semibold">+91 {phone}</strong>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleEditPhone}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0 ml-2 cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>

                            <div>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="• • • • • •"
                                autoFocus
                                className="w-full h-12 rounded-xl border border-slate-300 bg-white text-center font-mono text-xl sm:text-2xl font-bold tracking-[0.45em] sm:tracking-[0.6em] text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs placeholder:text-slate-300 placeholder:tracking-normal transition"
                              />
                            </div>

                            <div className="text-center text-xs text-slate-500 pt-0.5">
                              {otpResendCountdown > 0 ? (
                                <span>
                                  Resend code in{" "}
                                  <strong className="font-mono font-semibold text-slate-700">
                                    00:{otpResendCountdown < 10 ? `0${otpResendCountdown}` : otpResendCountdown}
                                  </strong>
                                </span>
                              ) : (
                                <span>
                                  Didn&apos;t receive code?{" "}
                                  <button
                                    type="button"
                                    onClick={handleRequestOtp}
                                    disabled={otpLoading}
                                    className="font-bold hover:underline cursor-pointer"
                                    style={{ color: brandPrimaryColor }}
                                  >
                                    Resend OTP
                                  </button>
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              disabled={otpLoading || otpCode.length < 6}
                              className="w-full h-11 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm font-bold text-white shadow-2xs disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {otpLoading ? (
                                <>
                                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Verifying...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={16} />
                                  <span>Verify &amp; Continue</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {otpError && (
                          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-700 flex items-start gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                            <span>{otpError}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Guest Form Fields */
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Full name *</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none"
                            style={{ outlineColor: brandPrimaryColor }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Phone * <span className="hidden sm:inline font-normal text-slate-400">(Rider contact)</span>
                            </label>
                            <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-slate-400">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 pr-2 border-r border-slate-200">
                                <Phone size={11} className="text-slate-400" />
                                <span>+91</span>
                              </span>
                              <input
                                type="tel"
                                maxLength={10}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile"
                                className="w-full bg-transparent pl-2 text-xs font-medium text-slate-900 outline-none"
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
                              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none"
                              style={{ outlineColor: brandPrimaryColor }}
                            />
                          </div>
                        </div>

                        {/* Fulfillment Mode Toggle (Doorstep Delivery vs Store Pickup) */}
                        {isPayAtStoreEnabled && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2 sm:p-2.5 space-y-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                              Fulfillment Option
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setFulfillment("delivery");
                                  if (payment === "pay_at_store") {
                                    if (isUpiQrEnabled) setPayment("upi_qr");
                                    else if (isCodEnabled) setPayment("cod");
                                  }
                                }}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                                  fulfillment === "delivery"
                                    ? "border-emerald-600 bg-white text-emerald-900 shadow-2xs ring-1 ring-emerald-500/20"
                                    : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300"
                                }`}
                              >
                                <Truck size={14} className={fulfillment === "delivery" ? "text-emerald-600" : "text-slate-400"} />
                                <span>Doorstep Delivery</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setFulfillment("pickup");
                                  setPayment("pay_at_store");
                                }}
                                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                                  fulfillment === "pickup"
                                    ? "border-emerald-600 bg-white text-emerald-900 shadow-2xs ring-1 ring-emerald-500/20"
                                    : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300"
                                }`}
                              >
                                <Store size={14} className={fulfillment === "pickup" ? "text-emerald-600" : "text-slate-400"} />
                                <span>Store Pickup (Pay at Store)</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {fulfillment === "pickup" ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                              <Store size={15} className="text-emerald-600" />
                              <span>Pickup at Counter · {displayStoreName}</span>
                            </div>
                            <p className="text-[11.5px] text-slate-600 leading-relaxed">
                              {storeAddress || "Counter Collection at Store"}. Your items will be packed and held ready for pickup. You can pay via Cash, Card, or UPI standee at the counter.
                            </p>
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 w-fit">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Free Store Pickup · No Delivery Fee</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Registered Serviceable Locations Selector */}
                            {activeServiceableLocations.length > 0 && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                    <MapPin size={13} style={{ color: brandPrimaryColor }} />
                                    <span>Select Delivery Location / PIN</span>
                                  </span>
                                  {matchedServiceableLocation ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-800">
                                      Deliverable · {matchedServiceableLocation.etaText || "30–45m"}
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-800">
                                      Registered areas
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {activeServiceableLocations.map((loc) => {
                                    const isSelected =
                                      pincode.trim() === loc.pinCode || matchedServiceableLocation?.id === loc.id;
                                    return (
                                      <button
                                        key={loc.id}
                                        type="button"
                                        onClick={() => {
                                          setPincode(loc.pinCode);
                                          if (!address.trim()) {
                                            setAddress(loc.areaName);
                                          }
                                        }}
                                        className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold transition ${
                                          isSelected
                                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                        }`}
                                      >
                                        <span>{loc.areaName}</span>
                                        <span className="font-mono text-[9px] sm:text-[10px] text-slate-500">({loc.pinCode})</span>
                                        <span className="text-[9px] sm:text-[10px] text-emerald-700">
                                          {loc.deliveryFee === 0 ? "Free" : `₹${loc.deliveryFee}`}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Street Address with embedded 1-Click GPS button */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Delivery Address (Flat / House No, Street) *
                              </label>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  value={address}
                                  onChange={(e) => setAddress(e.target.value)}
                                  placeholder="e.g. 104, Green Heights, 1st Cross"
                                  className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-28 sm:pr-32 text-xs font-medium text-slate-900 focus:outline-none"
                                  style={{ outlineColor: brandPrimaryColor }}
                                />
                                <button
                                  type="button"
                                  onClick={handleDetectLiveLocation}
                                  disabled={detectingLocation}
                                  title={locationSuccess ? "GPS Location Locked" : "Auto-detect location via GPS"}
                                  style={{
                                    borderColor: `${brandPrimaryColor}40`,
                                    color: brandPrimaryColor,
                                    backgroundColor: `${brandPrimaryColor}10`,
                                  }}
                                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer select-none"
                                >
                                  <Navigation size={12} className={detectingLocation ? "animate-spin" : ""} />
                                  <span className="truncate max-w-[90px] sm:max-w-none">
                                    {detectingLocation
                                      ? "Locating..."
                                      : locationSuccess
                                      ? "GPS Locked"
                                      : "1-Click GPS"}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Landmark & PIN code */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1 truncate">Landmark</label>
                                <input
                                  type="text"
                                  value={landmark}
                                  onChange={(e) => setLandmark(e.target.value)}
                                  placeholder="e.g. Near Metro"
                                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none"
                                  style={{ outlineColor: brandPrimaryColor }}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                                <input
                                  type="text"
                                  maxLength={6}
                                  value={pincode}
                                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  placeholder="6-digit PIN"
                                  className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:outline-none"
                                  style={{ outlineColor: brandPrimaryColor }}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tenant Delivery Slots (if configured) */}
                {fulfillment === "delivery" &&
                  onlineSettings?.themeConfig?.enableDeliverySlotPicker !== false &&
                  activeDeliverySlots.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-800">
                          Preferred Delivery Slot
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Store slots
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {activeDeliverySlots.map((slotObj) => {
                          const slotKey = `${slotObj.label}${slotObj.sublabel ? ` (${slotObj.sublabel})` : ""}`;
                          const active = deliverySlot === slotKey || deliverySlot === slotObj.label;
                          return (
                            <button
                              key={slotObj.id}
                              type="button"
                              onClick={() => setDeliverySlot(slotKey)}
                              style={
                                active
                                  ? {
                                      borderColor: brandPrimaryColor,
                                      backgroundColor: `${brandPrimaryColor}10`,
                                      color: brandPrimaryColor,
                                    }
                                  : undefined
                              }
                              className={`flex flex-col items-start justify-between rounded-xl border p-2.5 text-left transition ${
                                active
                                  ? "shadow-2xs ring-1 ring-current/20"
                                  : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <div className="flex w-full items-center justify-between gap-1">
                                <span className="text-xs font-bold leading-snug truncate">{slotObj.label}</span>
                                {slotObj.feeAmount > 0 ? (
                                  <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 shrink-0">
                                    +{formatStorePrice(slotObj.feeAmount * 100)}
                                  </span>
                                ) : (
                                  <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800 shrink-0">
                                    Free
                                  </span>
                                )}
                              </div>
                              {slotObj.sublabel && (
                                <span className="mt-0.5 text-[11px] font-medium opacity-80 truncate w-full">
                                  {slotObj.sublabel}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Special Instructions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Special instructions (Optional)</label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Ring the door bell, leave package with security guard"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 resize-none"
                  />
                </div>
              </div>

              {/* Right Column: Order Summary (Desktop) */}
              <div className="lg:col-span-4 sticky top-20 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: brandPrimaryColor }}
                      >
                        <ShoppingBag size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Order Summary</h3>
                        <p className="text-[11px] text-slate-500">
                          {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
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

                  {/* Cart Items List */}
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
                        <span className="font-semibold text-slate-900">{formatStorePrice(line.lineTotalPaise)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Promo Code Input */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-center gap-2">
                    <Tag size={13} className="text-slate-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Promo or coupon code"
                      className="flex-1 bg-transparent text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 outline-none uppercase"
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCoupon("");
                        }}
                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        style={{ color: brandPrimaryColor }}
                        className="rounded-lg px-2.5 py-1 text-xs font-bold hover:bg-white cursor-pointer"
                      >
                        Apply
                      </button>
                    )}
                  </div>

                  {/* Taxes & Fees Breakdown */}
                  <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-900">{formatStorePrice(netSubtotalPaise)}</span>
                    </div>
                    {couponDiscountPaise > 0 && (
                      <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                        <span>Promo Discount ({appliedCoupon?.code})</span>
                        <span>-{formatStorePrice(couponDiscountPaise)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>CGST ({cgstPct}%)</span>
                      <span>{formatStorePrice(cgstPaise)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>SGST ({sgstPct}%)</span>
                      <span>{formatStorePrice(sgstPaise)}</span>
                    </div>
                    {!isTaxInclusive && taxAdditionPaise > 0 && (
                      <div className="flex justify-between text-[11px] text-amber-700 font-medium">
                        <span>GST Added ({totalTaxPct}%)</span>
                        <span>+{formatStorePrice(taxAdditionPaise)}</span>
                      </div>
                    )}
                    {deliveryChargePaise > 0 ? (
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Delivery Fee</span>
                        <span className="font-semibold text-slate-800">{formatStorePrice(deliveryChargePaise)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[11px] text-emerald-700 font-semibold">
                        <span>Delivery Fee</span>
                        <span>FREE</span>
                      </div>
                    )}
                    {packagingChargePaise > 0 && (
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Packaging Fee</span>
                        <span>{formatStorePrice(packagingChargePaise)}</span>
                      </div>
                    )}
                  </div>

                  {/* Total Amount Box */}
                  <div className="rounded-xl bg-[#fffcf7] border border-orange-100 p-3.5 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-slate-800">Total to Pay</span>
                    <span className="text-xl font-black text-slate-900">{formatStorePrice(grandTotalPaise)}</span>
                  </div>

                  {/* Proceed to Pay Action */}
                  <button
                    type="button"
                    onClick={handleProceedToPayment}
                    style={{ backgroundColor: brandPrimaryColor }}
                    className="w-full flex items-center justify-center gap-2 rounded-full text-white py-3.5 text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95 transition cursor-pointer"
                  >
                    <span>Proceed to Pay</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <PaymentPageView
              grandTotalPaise={grandTotalPaise}
              checkoutOrderId={checkoutOrderId}
              formattedPaymentTimer={formattedPaymentTimer}
              paymentTimerSeconds={paymentTimerSeconds}
              displayStoreName={displayStoreName}
              customerName={name}
              customerPhone={phone}
              customerAddress={address}
              landmark={landmark}
              pincode={pincode}
              etaText={matchedServiceableLocation?.etaText || deliverySlot || "25–35 mins"}
              fulfillment={fulfillment}
              setFulfillment={setFulfillment}
              payment={payment}
              setPayment={setPayment}
              onBack={() => {
                setCheckoutStep("details");
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              onPlaceOrder={handlePlaceOrder}
              submittingOrder={submittingOrder}
              formatStorePrice={formatStorePrice}
              isUpiQrEnabled={isUpiQrEnabled}
              isCodEnabled={isCodEnabled}
              isPayAtStoreEnabled={isPayAtStoreEnabled}
              isRazorpayEnabled={isRazorpayEnabled}
              isPhonePeEnabled={isPhonePeEnabled}
              isPaytmEnabled={isPaytmEnabled}
              totalItemsCount={totalItemsCount}
              upiConfig={upiConfig}
              upiQrDataUrl={upiQrDataUrl}
              upiUtr={upiUtr}
              setUpiUtr={setUpiUtr}
              upiUtrError={upiUtrError}
              setUpiUtrError={setUpiUtrError}
              copiedUpi={copiedUpi}
              setCopiedUpi={setCopiedUpi}
              brandPrimaryColor={brandPrimaryColor}
            />
          )}
        </main>
      )}

      {/* FIXED BOTTOM BAR ON DETAILS PAGE (Matches Image 1 UX with Total & View Detailed Bill) */}
      {viewMode === "checkout" && checkoutStep === "details" && !orderConfirmed && totalItemsCount > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 py-3 sm:px-6 sm:py-3.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
            {/* Left: Total Amount & Clickable View Detailed Bill */}
            <div className="flex flex-col items-start leading-tight">
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
                  {formatStorePrice(grandTotalPaise)}
                </span>
                {couponDiscountPaise > 0 && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                    Saved {formatStorePrice(couponDiscountPaise)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailedBillOpen(true)}
                className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer"
              >
                <span>VIEW BILL</span>
                <ChevronUp size={13} />
              </button>
            </div>

            {/* Right: Proceed to Pay Action */}
            <button
              type="button"
              onClick={handleProceedToPayment}
              style={{ backgroundColor: brandPrimaryColor }}
              className="flex items-center justify-center gap-1.5 sm:gap-2 h-11 sm:h-12 px-6 sm:px-8 rounded-full text-xs sm:text-sm font-bold text-white shadow-md hover:opacity-95 active:scale-95 transition cursor-pointer shrink-0"
            >
              <span>Proceed to Pay</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* DETAILED BILL MODAL / BOTTOM SHEET */}
      {detailedBillOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} style={{ color: brandPrimaryColor }} />
                <h3 className="text-base font-bold text-slate-900">Detailed Bill Breakdown</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailedBillOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Itemized Cart List */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Items Ordered</div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                {cartLines.map((line) => (
                  <div key={line.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-700">x{line.count}</span>
                      <span className="font-medium text-slate-900 truncate max-w-[200px]">{line.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900">{formatStorePrice(line.lineTotalPaise)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charges Breakdown */}
            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-slate-900">{formatStorePrice(netSubtotalPaise)}</span>
              </div>
              {couponDiscountPaise > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span>-{formatStorePrice(couponDiscountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>CGST ({cgstPct}%)</span>
                <span>{formatStorePrice(cgstPaise)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>SGST ({sgstPct}%)</span>
                <span>{formatStorePrice(sgstPaise)}</span>
              </div>
              {deliveryChargePaise > 0 ? (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-slate-900">{formatStorePrice(deliveryChargePaise)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Delivery Fee</span>
                  <span>FREE</span>
                </div>
              )}
              {packagingChargePaise > 0 && (
                <div className="flex justify-between">
                  <span>Packaging Charges</span>
                  <span>{formatStorePrice(packagingChargePaise)}</span>
                </div>
              )}
              {loyaltyPoints > 0 && (
                <div className="flex justify-between text-orange-700 font-semibold">
                  <span>Loyalty Discount ({loyaltyPoints} pts)</span>
                  <span>-{formatStorePrice(loyaltyPoints * 100)}</span>
                </div>
              )}
            </div>

            {/* Grand Total Row */}
            <div className="border-t border-slate-200 pt-3 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">Final Amount to Pay</span>
              <span className="text-xl font-black text-slate-900">{formatStorePrice(grandTotalPaise)}</span>
            </div>

            <button
              type="button"
              onClick={() => setDetailedBillOpen(false)}
              className="w-full h-11 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}

      {/* Bottom-Center Floating Cart Pill (Decreased size per Image 1 request) */}
      {totalItemsCount > 0 &&
        viewMode === "catalog" &&
        !cartDrawerOpen &&
        onlineSettings?.themeConfig?.stickyCartBarMobile !== false && (
          <div className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="group flex items-center justify-between gap-3 sm:gap-4 rounded-full bg-[#e05a00] hover:bg-[#cc5200] px-2.5 py-1.5 text-white shadow-[0_10px_26px_rgba(224,90,0,0.4)] transition-all transform active:scale-95 min-w-[195px] sm:min-w-[225px] max-w-[260px] cursor-pointer"
            >
              {/* Left Circular Bag Badge with White Item Count Pill */}
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/15">
                <ShoppingBag size={15} className="text-white" />
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9.5px] font-black text-[#e05a00] shadow-2xs">
                  {totalItemsCount}
                </span>
              </div>

              {/* Center VIEW CART + Bold Price */}
              <div className="flex flex-col items-start text-left leading-none">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/90">
                  VIEW CART
                </span>
                <span className="mt-0.5 text-xs sm:text-sm font-black tracking-tight text-white">
                  {formatStorePrice(grandTotalPaise)}
                </span>
              </div>

              {/* Right Circular Arrow Button */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/15 group-hover:bg-black/25 transition">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </div>
            </button>
          </div>
        )}

      {/* Floating WhatsApp chat button if enabled in Online Store settings */}
      {onlineSettings?.contact?.enableFloatingWhatsapp === true && onlineSettings?.contact?.whatsappNumber && (
        <a
          href={`https://wa.me/${(onlineSettings.contact.whatsappNumber || "").replace(/\D/g, "")}?text=${encodeURIComponent(
            onlineSettings.contact.whatsappPrefillText ||
              "Hi, I would like to place an order from your online store.",
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className={`fixed ${
            totalItemsCount > 0 && viewMode === "catalog" && activeTrackingOrder
              ? "bottom-[190px] sm:bottom-24"
              : (totalItemsCount > 0 || activeTrackingOrder) && viewMode === "catalog"
              ? "bottom-[136px] sm:bottom-24"
              : "bottom-24 sm:bottom-24"
          } right-4 sm:right-6 z-40 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_25px_rgba(37,211,102,0.45)] hover:shadow-[0_12px_32px_rgba(37,211,102,0.65)] hover:scale-105 active:scale-95 transition-all duration-200 group border border-white/40`}
        >
          <svg className="h-6 w-6 sm:h-7 sm:w-7 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
          </svg>
          <span className="pointer-events-none absolute right-full mr-2.5 hidden sm:group-hover:flex items-center whitespace-nowrap rounded-lg bg-slate-900/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-md backdrop-blur-xs">
            Chat on WhatsApp
          </span>
        </a>
      )}

      {/* Storefront Footer - Displayed on home page only (catalog view) and OFF by default per tenant settings */}
      {viewMode === "catalog" && !orderConfirmed && Boolean(onlineSettings?.topbarFooter?.showFooter) && (() => {
        const footerBgColor = onlineSettings?.topbarFooter?.footerBgColor?.trim() || "#ffffff";
        const footerTextColor = onlineSettings?.topbarFooter?.footerTextColor?.trim() || "#475569";
        const footerLayout = onlineSettings?.topbarFooter?.footerLayout || "columns";
        const paymentBadges = (
          onlineSettings?.topbarFooter?.paymentBadgesText ||
          "UPI, Visa / MasterCard, Razorpay, Cash on Delivery"
        )
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean);

        return (
          <footer
            className="mt-16 border-t border-slate-200 transition-colors"
            style={{ backgroundColor: footerBgColor, color: footerTextColor }}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
              {footerLayout === "centered" ? (
                /* Layout 2: Centered */
                <div className="text-center space-y-6">
                  <div className="flex flex-col items-center gap-2">
                    {logoUrl ? (
                      <img src={logoUrl} alt={displayStoreName} className="h-9 w-auto max-w-[140px] object-contain" />
                    ) : (
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-2xs"
                        style={{ backgroundColor: brandPrimaryColor }}
                      >
                        <Utensils size={20} />
                      </div>
                    )}
                    <span className="font-bold text-base tracking-tight">{displayStoreName}</span>
                  </div>

                  <p className="text-xs max-w-lg mx-auto opacity-80 leading-relaxed">
                    {onlineSettings?.topbarFooter?.footerAboutText ||
                      onlineSettings?.branding?.brandTagline ||
                      "Freshly prepared meals and daily essentials delivered directly to your doorstep or ready for instant in-store pickup."}
                  </p>

                  {onlineSettings?.topbarFooter?.showStoreTimingsInFooter !== false &&
                    (onlineSettings?.contact?.openingHoursText || hours) && (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-current/15 px-3 py-1 text-xs opacity-85">
                        <span className="font-semibold">Store Timings:</span>
                        <span>{onlineSettings?.contact?.openingHoursText || hours}</span>
                      </div>
                    )}

                  {/* Customer Support & Policies Links */}
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
                    {onlineSettings?.topbarFooter?.showPhoneInFooter !== false && onlineSettings?.contact?.supportPhone && (
                      <a
                        href={`tel:${onlineSettings.contact.supportPhone}`}
                        className="hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <Phone size={13} className="opacity-70" />
                        <span>{onlineSettings.contact.supportPhone}</span>
                      </a>
                    )}
                    {onlineSettings?.topbarFooter?.showEmailInFooter !== false && onlineSettings?.contact?.supportEmail && (
                      <a
                        href={`mailto:${onlineSettings.contact.supportEmail}`}
                        className="hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <Mail size={13} className="opacity-70" />
                        <span>{onlineSettings.contact.supportEmail}</span>
                      </a>
                    )}
                    {onlineSettings?.topbarFooter?.showInquiryInFooter !== false && (
                      <button
                        type="button"
                        onClick={() => setContactModalOpen(true)}
                        className="hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <MessageSquare size={13} className="opacity-70" />
                        <span>Support Inquiry</span>
                      </button>
                    )}
                    {onlineSettings?.topbarFooter?.showOrderTrackingLink !== false && (
                      <Link
                        href="/track"
                        className="hover:underline font-semibold"
                        style={{ color: brandPrimaryColor }}
                      >
                        Track Your Order →
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => setActivePolicyModal("refund")}
                      className="hover:underline opacity-80 hover:opacity-100 transition"
                    >
                      Refund Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePolicyModal("privacy")}
                      className="hover:underline opacity-80 hover:opacity-100 transition"
                    >
                      Privacy Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePolicyModal("terms")}
                      className="hover:underline opacity-80 hover:opacity-100 transition"
                    >
                      Terms of Service
                    </button>
                  </div>

                  {/* Social Links */}
                  {onlineSettings?.social && (
                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs opacity-75">
                      {onlineSettings.social.instagram && (
                        <a href={onlineSettings.social.instagram} target="_blank" rel="noreferrer" className="hover:opacity-100 transition">Instagram</a>
                      )}
                      {onlineSettings.social.facebook && (
                        <a href={onlineSettings.social.facebook} target="_blank" rel="noreferrer" className="hover:opacity-100 transition">Facebook</a>
                      )}
                      {onlineSettings.social.twitterX && (
                        <a href={onlineSettings.social.twitterX} target="_blank" rel="noreferrer" className="hover:opacity-100 transition">Twitter / X</a>
                      )}
                      {onlineSettings.social.youtube && (
                        <a href={onlineSettings.social.youtube} target="_blank" rel="noreferrer" className="hover:opacity-100 transition">YouTube</a>
                      )}
                    </div>
                  )}

                  {/* Newsletter Signup */}
                  {onlineSettings?.topbarFooter?.showNewsletterInFooter !== false && (
                    <div className="pt-2 max-w-sm mx-auto">
                      <div className="text-xs font-semibold mb-1.5">
                        {onlineSettings?.topbarFooter?.newsletterHeadline || "Subscribe for Exclusive Store Offers"}
                      </div>
                      {newsletterSubscribed ? (
                        <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 size={14} className="shrink-0" />
                          <span>Subscribed! You&apos;ll receive our latest deals.</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="h-9 flex-1 rounded-xl border border-current/20 bg-white/90 px-3 text-xs text-slate-900 outline-none focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={handleSubscribeNewsletter}
                            style={{ backgroundColor: brandPrimaryColor }}
                            className="h-9 rounded-xl px-3.5 text-xs font-semibold text-white hover:opacity-95 transition shrink-0"
                          >
                            Subscribe
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Badges */}
                  {onlineSettings?.topbarFooter?.showPaymentIconsInFooter !== false && paymentBadges.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
                      {paymentBadges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-lg border border-current/15 bg-current/5 px-2.5 py-1 text-[11px] font-medium"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : footerLayout === "minimal" ? (
                /* Layout 3: Minimal */
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
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
                      <div>
                        <div className="font-bold text-sm tracking-tight">{displayStoreName}</div>
                        <p className="text-[11px] opacity-75">
                          {onlineSettings?.branding?.brandTagline || "Direct Online Store"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {onlineSettings?.topbarFooter?.showPhoneInFooter !== false && onlineSettings?.contact?.supportPhone && (
                        <a href={`tel:${onlineSettings.contact.supportPhone}`} className="hover:underline font-medium">
                          {onlineSettings.contact.supportPhone}
                        </a>
                      )}
                      {onlineSettings?.topbarFooter?.showOrderTrackingLink !== false && (
                        <Link href="/track" className="hover:underline font-semibold" style={{ color: brandPrimaryColor }}>
                          Track Order
                        </Link>
                      )}
                      {onlineSettings?.topbarFooter?.showInquiryInFooter !== false && (
                        <button
                          type="button"
                          onClick={() => setContactModalOpen(true)}
                          className="hover:underline font-medium"
                        >
                          Support Inquiry
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActivePolicyModal("refund")}
                        className="hover:underline opacity-80"
                      >
                        Refund Policy
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePolicyModal("privacy")}
                        className="hover:underline opacity-80"
                      >
                        Privacy
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePolicyModal("terms")}
                        className="hover:underline opacity-80"
                      >
                        Terms
                      </button>
                    </div>
                  </div>

                  {onlineSettings?.topbarFooter?.showPaymentIconsInFooter !== false && paymentBadges.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-2 border-t border-current/10">
                      {paymentBadges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-md border border-current/15 bg-current/5 px-2 py-0.5 text-[10px] font-medium"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Layout 1: Columns (Default) */
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center gap-2.5">
                      {logoUrl ? (
                        <img src={logoUrl} alt={displayStoreName} className="h-8 w-auto max-w-[130px] object-contain" />
                      ) : (
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-2xs"
                          style={{ backgroundColor: brandPrimaryColor }}
                        >
                          <Utensils size={16} />
                        </div>
                      )}
                      <span className="font-bold text-sm tracking-tight">{displayStoreName}</span>
                    </div>
                    <p className="text-xs opacity-80 leading-relaxed max-w-md">
                      {onlineSettings?.topbarFooter?.footerAboutText ||
                        onlineSettings?.branding?.brandTagline ||
                        "Freshly prepared meals and daily essentials delivered directly to your doorstep or ready for instant in-store pickup."}
                    </p>
                    {onlineSettings?.topbarFooter?.showStoreTimingsInFooter !== false &&
                      (onlineSettings?.contact?.openingHoursText || hours) && (
                        <p className="text-xs opacity-80">
                          <span className="font-semibold">Opening Hours:</span>{" "}
                          {onlineSettings?.contact?.openingHoursText || hours}
                        </p>
                      )}

                    {/* Newsletter Signup in Footer */}
                    {onlineSettings?.topbarFooter?.showNewsletterInFooter !== false && (
                      <div className="pt-2 max-w-sm">
                        <div className="text-xs font-semibold mb-1.5">
                          {onlineSettings?.topbarFooter?.newsletterHeadline || "Subscribe for Exclusive Store Offers"}
                        </div>
                        {newsletterSubscribed ? (
                          <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 size={14} className="shrink-0" />
                            <span>Subscribed! You&apos;ll receive our latest deals and announcements.</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={newsletterEmail}
                              onChange={(e) => setNewsletterEmail(e.target.value)}
                              placeholder="Enter your email address"
                              className="h-9 flex-1 rounded-xl border border-current/20 bg-white/90 px-3 text-xs text-slate-900 outline-none focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={handleSubscribeNewsletter}
                              style={{ backgroundColor: brandPrimaryColor }}
                              className="h-9 rounded-xl px-3.5 text-xs font-semibold text-white hover:opacity-95 transition shrink-0"
                            >
                              Subscribe
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3">
                      {onlineSettings?.topbarFooter?.supportSectionTitle || "Customer Support"}
                    </h4>
                    <ul className="space-y-2 text-xs opacity-80">
                      {onlineSettings?.topbarFooter?.showPhoneInFooter !== false && onlineSettings?.contact?.supportPhone && (
                        <li>
                          Phone:{" "}
                          <a href={`tel:${onlineSettings.contact.supportPhone}`} className="hover:underline font-medium">
                            {onlineSettings.contact.supportPhone}
                          </a>
                        </li>
                      )}
                      {onlineSettings?.topbarFooter?.showEmailInFooter !== false && onlineSettings?.contact?.supportEmail && (
                        <li>
                          Email:{" "}
                          <a href={`mailto:${onlineSettings.contact.supportEmail}`} className="hover:underline font-medium">
                            {onlineSettings.contact.supportEmail}
                          </a>
                        </li>
                      )}
                      {onlineSettings?.topbarFooter?.showAddressInFooter !== false && (onlineSettings?.contact?.storeAddress || storeAddress) && (
                        <li>
                          Address:{" "}
                          <span>{onlineSettings?.contact?.storeAddress || storeAddress}</span>
                        </li>
                      )}
                      {onlineSettings?.topbarFooter?.showInquiryInFooter !== false && (
                        <li>
                          <button
                            type="button"
                            onClick={() => setContactModalOpen(true)}
                            className="hover:underline font-semibold"
                          >
                            Send a Support Inquiry
                          </button>
                        </li>
                      )}
                      {onlineSettings?.topbarFooter?.showOrderTrackingLink !== false && (
                        <li>
                          <Link href="/track" className="hover:underline font-semibold" style={{ color: brandPrimaryColor }}>
                            Track Your Order →
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3">
                      {onlineSettings?.topbarFooter?.policiesSectionTitle || "Policies & Legal"}
                    </h4>
                    <ul className="space-y-2 text-xs opacity-80 mb-3">
                      <li>
                        <button
                          type="button"
                          onClick={() => setActivePolicyModal("refund")}
                          className="hover:underline text-left"
                        >
                          Refund &amp; Cancellation Policy
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => setActivePolicyModal("privacy")}
                          className="hover:underline text-left"
                        >
                          Privacy Policy
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => setActivePolicyModal("terms")}
                          className="hover:underline text-left"
                        >
                          Terms &amp; Conditions
                        </button>
                      </li>
                    </ul>

                    {onlineSettings?.social && (
                      <div className="flex flex-wrap items-center gap-3 opacity-75 text-xs">
                        {onlineSettings.social.instagram && (
                          <a href={onlineSettings.social.instagram} target="_blank" rel="noreferrer" className="hover:opacity-100 transition">Instagram</a>
                        )}
                        {onlineSettings.social.facebook && (
                          <a href={onlineSettings.social.facebook} target="_blank" rel="noreferrer" className="hover:opacity-100 transition">Facebook</a>
                        )}
                        {onlineSettings.social.twitterX && (
                          <a href={onlineSettings.social.twitterX} target="_blank" rel="noreferrer" className="hover:opacity-100 transition">Twitter / X</a>
                        )}
                        {onlineSettings.social.youtube && (
                          <a href={onlineSettings.social.youtube} target="_blank" rel="noreferrer" className="hover:opacity-100 transition">YouTube</a>
                        )}
                      </div>
                    )}

                    {onlineSettings?.topbarFooter?.showPaymentIconsInFooter !== false && paymentBadges.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-1.5">
                        {paymentBadges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded border border-current/15 bg-current/5 px-2 py-0.5 text-[10px] font-semibold"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Copyright & Engine line */}
              <div className="mt-8 pt-6 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-75">
                <p>
                  {onlineSettings?.topbarFooter?.footerCopyrightText ||
                    `© ${new Date().getFullYear()} ${displayStoreName}. All rights reserved.`}
                </p>
                {onlineSettings?.topbarFooter?.showPoweredBy !== false && (
                  <p className="text-[11px]">
                    {onlineSettings?.topbarFooter?.poweredByText || "Powered by Selfx Retail Enterprise Engine"}
                  </p>
                )}
              </div>
            </div>
          </footer>
        );
      })()}

      {/* Floating AI Assistant Widget */}
      <StorefrontAiWidget
        storeName={displayStoreName}
        slug={slug}
        hasBottomBar={
          Boolean(activeTrackingOrder) ||
          (totalItemsCount > 0 &&
            (viewMode === "catalog" || (viewMode === "checkout" && checkoutStep === "details")))
        }
        hidden={viewMode === "checkout" && checkoutStep === "payment"}
        onAddToCart={(itemId) => updateItemQty(itemId, (qty[itemId] || 0) + 1)}
      />

      {/* Product Quick View Modal */}
      {quickViewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setQuickViewItem(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-4">
              <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                {productImageFor(quickViewItem) ? (
                  <img
                    src={productImageFor(quickViewItem)!}
                    alt={quickViewItem.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <Utensils size={28} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 pr-6">
                {quickViewItem.category && (
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    {quickViewItem.category}
                  </span>
                )}
                <h3 className="text-base font-bold text-slate-900 leading-snug">{quickViewItem.name}</h3>
                {quickViewItem.brand && (
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Brand: {quickViewItem.brand}</p>
                )}
                {quickViewItem.sku && (
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">SKU: {quickViewItem.sku}</p>
                )}
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold" style={{ color: brandPrimaryColor }}>
                    {formatStorePrice(quickViewItem.selling_price_paise ?? 0)}
                  </span>
                  {quickViewItem.mrp_paise &&
                    quickViewItem.mrp_paise > (quickViewItem.selling_price_paise ?? 0) && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatStorePrice(quickViewItem.mrp_paise)}
                      </span>
                    )}
                </div>
              </div>
            </div>

            {/* QuickView Virtual Try-On CTA */}
            {Boolean(
              (typeof quickViewItem.details === "object" && (quickViewItem.details as any)?.tryon_enabled) ||
              (typeof quickViewItem.details === "string" && quickViewItem.details.includes("tryon_enabled")) ||
              (typeof quickViewItem.details === "object" && (quickViewItem.details as any)?.tryon_cutout_url)
            ) && (
              <button
                type="button"
                onClick={() => {
                  setTryOnItem(quickViewItem);
                  setQuickViewItem(null);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs shadow-md active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-300 animate-pulse" />
                <span>✨ Try On in AI Mirror</span>
              </button>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 gap-3">
              {onlineSettings?.social?.enableSocialShareOnProducts !== false && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Check out ${quickViewItem.name} (${formatStorePrice(
                      quickViewItem.selling_price_paise ?? 0,
                    )}) at ${displayStoreName}!`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Share2 size={13} />
                  <span>Share</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  updateItemQty(quickViewItem.id, (qty[quickViewItem.id] || 0) + 1);
                  setQuickViewItem(null);
                }}
                style={{ backgroundColor: brandPrimaryColor }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-4 text-xs font-bold text-white shadow-sm hover:opacity-95"
              >
                <Plus size={14} />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Fitting Room Studio Modal */}
      <TryOnStudioModal
        isOpen={Boolean(tryOnItem)}
        onClose={() => setTryOnItem(null)}
        product={tryOnItem}
        storeSlug={slug}
        brandPrimaryColor={brandPrimaryColor}
        formatPrice={formatStorePrice}
        onAddToCart={(itemId, addQty) => {
          updateItemQty(itemId, (qty[itemId] || 0) + addQty);
          setCartDrawerOpen(true);
        }}
      />

      {/* Customer Support / Contact Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => {
                setContactModalOpen(false);
                setContactSent(false);
              }}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900">Contact {displayStoreName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Send an inquiry or order support message directly to the store team.
              </p>
            </div>

            {contactSent ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
                <div className="text-sm font-bold text-emerald-900">Message Sent Successfully!</div>
                <p className="text-xs text-emerald-700">
                  Our store team has received your inquiry and will get back to you shortly.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none"
                  />
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Mobile Number"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="Subject (e.g. Bulk order inquiry / Delivery timing)"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-900 outline-none"
                />
                <textarea
                  rows={3}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Write your message..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-medium text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendContactMessage}
                  style={{ backgroundColor: brandPrimaryColor }}
                  className="w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-95 transition"
                >
                  Send Message
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Policy Modal (Refund, Privacy, Terms) */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setActivePolicyModal(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: brandPrimaryColor }} />
                <h3 className="text-base font-bold text-slate-900">
                  {activePolicyModal === "refund" &&
                    (onlineSettings?.topbarFooter?.refundPolicyText
                      ? "Refund & Cancellation Policy"
                      : "Refund Policy")}
                  {activePolicyModal === "privacy" && "Privacy Policy"}
                  {activePolicyModal === "terms" && "Terms & Conditions"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">{displayStoreName}</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
              {activePolicyModal === "refund" &&
                (onlineSettings?.topbarFooter?.refundPolicyText ||
                  "Orders once placed can be tracked in real-time. For refunds or order alterations, please contact customer support immediately. Returns and cancellations are subject to store policies and inspection.")}
              {activePolicyModal === "privacy" &&
                (onlineSettings?.topbarFooter?.privacyPolicyText ||
                  "We respect your privacy and protect your personal information. Customer details such as contact numbers and addresses are strictly used for order processing, customer support, and delivery fulfillment.")}
              {activePolicyModal === "terms" &&
                (onlineSettings?.topbarFooter?.termsText ||
                  "By placing an order on our store, you agree to our standard terms and conditions. Prices and availability are subject to change. Delivery timelines depend on location, traffic, and order volume.")}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                style={{ backgroundColor: brandPrimaryColor }}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-white hover:opacity-95 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign in Modal (Phone + OTP via Super Admin SMS Integration) */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => {
                setLoginModalOpen(false);
                setOtpError(null);
              }}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>

            <div className="text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-white mb-2 shadow-2xs"
                style={{ backgroundColor: brandPrimaryColor }}
              >
                <Lock size={20} />
              </div>
              <h3 className="text-base font-bold text-slate-900">{displayStoreName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign in with your mobile number &amp; OTP to view past orders and loyalty points
              </p>
            </div>

            {isVerifiedSignIn ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white font-black text-xl mx-auto shadow-sm">
                  {name ? name.charAt(0).toUpperCase() : "U"}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {name || "Customer Account"}
                  </div>
                  <div className="text-xs font-semibold text-emerald-800 font-mono mt-0.5">
                    +91 {phone}
                  </div>
                  {email && <div className="text-[11px] text-slate-500 mt-0.5">{email}</div>}
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginModalOpen(false);
                      setCustomerProfileOpen(true);
                      if (phone) void refreshCustomerOrders(phone, true);
                    }}
                    style={{ backgroundColor: brandPrimaryColor }}
                    className="w-full rounded-xl py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer hover:opacity-95 transition"
                  >
                    Open Profile &amp; Dashboard &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOutCustomer}
                    className="w-full rounded-xl border border-rose-200 bg-white py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer transition"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700">Verification Method</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      smsOtpEnabled
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {smsOtpEnabled ? "SMS OTP Active" : "SMS Gateway Required"}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                  <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-slate-400">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 pr-2 border-r border-slate-200">
                      <Phone size={11} className="text-slate-400" />
                      <span>+91</span>
                    </span>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name (Optional)</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-base sm:text-xs font-medium text-slate-900 focus:outline-none"
                    style={{ outlineColor: brandPrimaryColor }}
                  />
                </div>

                {!otpRequested ? (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={otpLoading || phone.replace(/\D/g, "").length < 10}
                    style={{ backgroundColor: brandPrimaryColor }}
                    className={`w-full text-white py-2.5 text-xs font-bold transition hover:opacity-95 disabled:opacity-50 ${buttonRadiusClass}`}
                  >
                    {otpLoading ? "Sending OTP..." : "Send 6-Digit OTP"}
                  </button>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 truncate">
                        OTP sent to <strong className="text-slate-900">+91 {phone}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleEditPhone}
                        className="font-bold text-emerald-700 hover:underline shrink-0 ml-2"
                      >
                        Edit
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="• • • • • •"
                        autoFocus
                        className="w-full h-11 rounded-xl border border-slate-300 bg-white text-center font-mono text-xl font-bold tracking-[0.45em] text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                      />
                    </div>

                    <div className="text-center text-xs text-slate-500">
                      {otpResendCountdown > 0 ? (
                        <span>
                          Resend in{" "}
                          <strong className="font-mono text-slate-700">
                            00:{otpResendCountdown < 10 ? `0${otpResendCountdown}` : otpResendCountdown}
                          </strong>
                        </span>
                      ) : (
                        <span>
                          Didn&apos;t receive code?{" "}
                          <button
                            type="button"
                            onClick={handleRequestOtp}
                            disabled={otpLoading}
                            className="font-bold hover:underline"
                            style={{ color: brandPrimaryColor }}
                          >
                            Resend OTP
                          </button>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || otpCode.length < 6}
                      style={{ backgroundColor: brandPrimaryColor }}
                      className={`w-full text-white py-2.5 text-xs font-bold transition hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2 ${buttonRadiusClass}`}
                    >
                      {otpLoading ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          <span>Verify &amp; Sign In</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {otpError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-700">
                    {otpError}
                  </div>
                )}

                {onlineSettings?.basics?.guestCheckout !== false && (
                  <div className="pt-2 border-t border-slate-100 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerAuthMode("guest");
                        setLoginModalOpen(false);
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline"
                    >
                      Or continue as Guest without OTP (no order history)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Blinkit & Instamart Style Floating Active Order Status Bar (Matches Image 2) */}
      {activeTrackingOrder && viewMode === "catalog" && (
        <div
          className={`fixed z-40 transition-all duration-300 left-1/2 -translate-x-1/2 ${
            totalItemsCount > 0 ? "bottom-[76px]" : "bottom-4 sm:bottom-6"
          } w-[calc(100%-24px)] sm:w-auto min-w-[300px] sm:min-w-[440px] max-w-lg`}
        >
          <div
            onClick={() => {
              window.location.href = `/track?number=${encodeURIComponent(activeTrackingOrder.number)}`;
            }}
            className="group flex items-center justify-between gap-3 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/15 p-2 pl-2.5 sm:p-2.5 sm:pl-3.5 shadow-[0_14px_36px_-6px_rgba(0,0,0,0.18)] cursor-pointer hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#16a34a] text-white shadow-xs transition group-hover:scale-105">
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
                  <span className="text-xs sm:text-[13px] font-bold truncate text-slate-900 dark:text-white leading-tight">
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-semibold">
                  Order #{activeTrackingOrder.number} · {formatStorePrice(activeTrackingOrder.total_paise || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href={`/track?number=${encodeURIComponent(activeTrackingOrder.number)}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#16a34a] hover:bg-green-700 px-3.5 sm:px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Navigation size={13} className="shrink-0 rotate-45 fill-white stroke-none" />
                <span>Track</span>
              </Link>
            </div>
          </div>

        </div>
      )}

      {/* ====================================================================
       * Customer Profile & Account Dashboard Drawer (Images 2 & 3 Experience)
       * ==================================================================== */}
      {(ordersDrawerOpen || customerProfileOpen) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="relative flex h-full w-full max-w-lg flex-col bg-[#f8fafc] shadow-2xl overflow-hidden">
            {!isVerifiedSignIn ? (
              <>
                {/* Drawer Header for Guest / Unauthenticated */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
                      style={{ backgroundColor: brandPrimaryColor }}
                    >
                      <User size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Customer Sign In</h3>
                      <p className="text-[11px] text-slate-500">
                        {displayStoreName} · Sign in with Mobile OTP
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOrdersDrawerOpen(false);
                      setCustomerProfileOpen(false);
                    }}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center space-y-3 my-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
                      <Lock size={24} />
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      Sign In to Access Your Account
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                      Sign in with your mobile number &amp; OTP to view your saved delivery addresses, club rewards, past order tracking, and 1-click reorder.
                    </p>
                    {onlineSettings?.basics?.phoneSignIn !== false && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrdersDrawerOpen(false);
                          setCustomerProfileOpen(false);
                          setCustomerAuthMode("signed_in");
                          setLoginModalOpen(true);
                        }}
                        style={{ backgroundColor: brandPrimaryColor }}
                        className={`inline-flex items-center justify-center gap-2 text-white px-5 py-3 text-xs font-bold uppercase tracking-wider shadow-sm transition hover:opacity-95 cursor-pointer ${buttonRadiusClass}`}
                      >
                        <Phone size={14} />
                        <span>Sign In with Mobile OTP</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* HERO PROFILE LIGHT ORANGE GRADIENT BANNER (Image 3 Inspiration) */}
                <div className="relative overflow-hidden bg-gradient-to-br from-[#ff723b] via-[#f97316] to-[#f59e0b] text-white shadow-sm pb-11">
                  {/* Atmospheric decorative circles (Matching Image 3) */}
                  <div className="absolute -top-12 -right-12 h-52 w-52 rounded-full bg-white/15 blur-xl pointer-events-none" />
                  <div className="absolute top-1/2 -right-8 h-44 w-44 rounded-full border border-white/20 pointer-events-none" />
                  <div className="absolute -bottom-10 right-16 h-32 w-32 rounded-full bg-white/10 blur-md pointer-events-none" />

                  {/* Top Navigation Bar */}
                  <div className="relative flex items-center justify-between px-4 sm:px-5 pt-4 pb-2 z-20">
                    <button
                      type="button"
                      onClick={() => {
                        setOrdersDrawerOpen(false);
                        setCustomerProfileOpen(false);
                      }}
                      className="rounded-full p-2 text-white hover:bg-white/20 transition cursor-pointer"
                      aria-label="Back to store"
                    >
                      <ArrowLeft size={20} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setContactModalOpen(true)}
                        className="rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/25 px-3.5 py-1 text-xs font-semibold text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Help</span>
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setProfileMenuOpen((prev) => !prev)}
                          className="rounded-full p-1.5 text-white hover:bg-white/20 transition cursor-pointer"
                          aria-label="Profile options"
                        >
                          <MoreVertical size={20} />
                        </button>

                        {profileMenuOpen && (
                          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setProfileMenuOpen(false);
                                setProfileEditOpen(true);
                              }}
                              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer text-slate-700"
                            >
                              <Edit3 size={14} className="text-slate-500" />
                              <span>Edit Profile</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProfileMenuOpen(false);
                                handleSignOutCustomer();
                                setOrdersDrawerOpen(false);
                                setCustomerProfileOpen(false);
                              }}
                              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-rose-50 transition cursor-pointer text-rose-600"
                            >
                              <LogOut size={14} className="text-rose-500" />
                              <span>Sign Out</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hero Customer Information (Image 3 Style) */}
                  <div className="relative px-5 sm:px-6 pt-2 pb-2 space-y-1">
                    <h2 className="text-2xl font-bold text-white tracking-tight leading-snug">
                      {name || "Customer"}
                    </h2>
                    <p className="text-xs text-white/95 font-semibold flex items-center gap-1.5">
                      <span>+91 - {phone}</span>
                    </p>
                    {email ? (
                      <p className="text-xs text-white/90 font-medium truncate">{email}</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setProfileEditOpen(true)}
                        className="text-xs text-amber-100 hover:text-white underline font-semibold cursor-pointer"
                      >
                        + Add email address
                      </button>
                    )}
                  </div>
                </div>

                {/* Drawer Content Body with Overlapping Card */}
                <div className="px-4 sm:px-5 pb-8 space-y-3.5">
                  {/* OVERLAPPING MEMBERSHIP & REWARDS CARD (Image 3 "ONE Active" Banner) */}
                  <div className="-mt-7 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5 shadow-lg relative z-20 transition hover:shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-orange-600 tracking-tight">SelfX Club</span>
                        <span className="rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          ACTIVE
                        </span>
                      </div>
                      <ChevronDown size={16} className="text-slate-400" />
                    </div>

                    <div className="text-base font-bold text-slate-900 mt-2">
                      {(loyaltyPoints || 0) > 0
                        ? `₹${(loyaltyPoints || 0).toFixed(2)} savings & credit balance`
                        : "0 pts • ₹0.00 Credit Balance"}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Earn 1 point per ₹1 spent. Redeem directly for instant cart discounts.
                    </p>
                  </div>

                  {/* VERIFIED CUSTOMER STATUS BADGE (Image 3 Inspiration) */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Verified Customer Profile</div>
                        <div className="text-[11px] text-slate-400">Secure OTP Authenticated Account</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                      Active
                    </span>
                  </div>

                  {/* 4 QUICK ACTION TILES (Image 3 Horizontal 4-Column Grid) */}
                  <div className="grid grid-cols-4 gap-2">
                    {/* Saved Addresses */}
                    <button
                      type="button"
                      onClick={() => setProfileAddressesOpen(true)}
                      className="flex flex-col items-center text-center justify-center rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 hover:shadow-xs transition group cursor-pointer min-h-[84px]"
                    >
                      <MapPin size={20} className="text-slate-800 group-hover:scale-105 transition" />
                      <span className="mt-1.5 text-[11px] font-bold text-slate-800 leading-tight">
                        Saved<br />Address
                      </span>
                    </button>

                    {/* Payment Modes */}
                    <button
                      type="button"
                      onClick={() => setProfilePaymentsOpen(true)}
                      className="flex flex-col items-center text-center justify-center rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 hover:shadow-xs transition group cursor-pointer min-h-[84px]"
                    >
                      <CreditCard size={20} className="text-slate-800 group-hover:scale-105 transition" />
                      <span className="mt-1.5 text-[11px] font-bold text-slate-800 leading-tight">
                        Payment<br />Modes
                      </span>
                    </button>

                    {/* Returns & Refunds */}
                    <button
                      type="button"
                      onClick={() => setProfileRefundsOpen(true)}
                      className="flex flex-col items-center text-center justify-center rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 hover:shadow-xs transition group cursor-pointer min-h-[84px]"
                    >
                      <RotateCcw size={20} className="text-slate-800 group-hover:scale-105 transition" />
                      <span className="mt-1.5 text-[11px] font-bold text-slate-800 leading-tight">
                        My<br />Refunds
                      </span>
                    </button>

                    {/* Store Wallet */}
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(`Store Credit Balance: ₹${(loyaltyBalance || 0).toFixed(2)}`);
                      }}
                      className="flex flex-col items-center text-center justify-center rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-slate-300 hover:shadow-xs transition group cursor-pointer min-h-[84px]"
                    >
                      <Wallet size={20} className="text-slate-800 group-hover:scale-105 transition" />
                      <span className="mt-1.5 text-[11px] font-bold text-slate-800 leading-tight">
                        Store<br />Wallet
                      </span>
                    </button>
                  </div>

                  {/* QUICK ACTION ROWS (Image 3 List Style) */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
                    {/* Coupons & Offers */}
                    <button
                      type="button"
                      onClick={() => setProfileCouponsOpen(true)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Tag size={18} className="text-slate-800" />
                        <span className="text-xs font-bold text-slate-900">Available Coupons &amp; Offers</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>

                    {/* Dedicated Account Page Link */}
                    <Link
                      href={`/account?store=${encodeURIComponent(slug)}`}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <ExternalLink size={18} className="text-slate-800" />
                        <span className="text-xs font-bold text-slate-900">Full Account Dashboard Page</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </Link>

                    {/* Store Help & Support */}
                    <button
                      type="button"
                      onClick={() => setContactModalOpen(true)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle size={18} className="text-slate-800" />
                        <span className="text-xs font-bold text-slate-900">Store Support &amp; FAQ</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>
                  </div>

                  {/* PAST ORDERS SECTION (Image 4 Inspiration) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        PAST ORDERS
                      </h4>
                      <button
                        type="button"
                        onClick={() => void refreshCustomerOrders(phone, true)}
                        className="text-[11px] font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw size={11} className={loadingOrders ? "animate-spin" : ""} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {/* Segment Filter Tabs (Swiggy Pill Style: Image 4) */}
                    <div className="flex items-center gap-2 pt-0.5 overflow-x-auto no-scrollbar">
                      {[
                        { id: "all" as const, label: "All", count: customerOrders.length },
                        {
                          id: "delivery" as const,
                          label: "Delivery",
                          count: customerOrders.filter((o: any) => o.fulfillment === "delivery").length,
                        },
                        {
                          id: "pickup" as const,
                          label: "Store",
                          count: customerOrders.filter((o: any) => o.fulfillment !== "delivery").length,
                        },
                      ].map((tab) => {
                        const active = profileOrdersSegment === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setProfileOrdersSegment(tab.id)}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? "bg-slate-950 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span className="ml-1 text-[10px] opacity-75 font-mono">({tab.count})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Orders List */}
                    {loadingOrders ? (
                      <div className="py-8 text-center text-xs font-semibold text-slate-400">
                        Loading your verified order history...
                      </div>
                    ) : customerOrders.length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-2">
                        <ShoppingBag size={32} className="mx-auto text-slate-300" />
                        <div className="text-xs font-bold text-slate-900">No orders placed yet</div>
                        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                          You haven&apos;t placed any orders with +91 {phone} yet. Browse our store catalog and order today!
                        </p>
                      </div>
                    ) : (
                      customerOrders
                        .filter((ord: any) => {
                          if (profileOrdersSegment === "delivery") return ord.fulfillment === "delivery";
                          if (profileOrdersSegment === "pickup") return ord.fulfillment !== "delivery";
                          return true;
                        })
                        .map((ord: any) => {
                          const isDeliv = ord.fulfillment === "delivery";
                          const isDelivered = ord.status === "delivered";
                          const ratingData = orderRatings[ord.number] as { food?: number; delivery?: number } | undefined;
                          const storeRating = Number(ratingData?.food ?? 0);
                          const deliveryRating = Number(ratingData?.delivery ?? 0);

                          const dateStr = ord.created_at
                            ? new Date(ord.created_at).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Recent";

                          const firstLine = ord.lines?.[0];
                          const matchingCatalogItem = firstLine
                            ? items.find((i) => i.id === firstLine.store_item_id || i.name?.toLowerCase() === firstLine.name?.toLowerCase())
                            : null;
                          const orderImageUrl =
                            firstLine?.image_url ||
                            firstLine?.image ||
                            ord.image_url ||
                            (matchingCatalogItem ? productImageFor(matchingCatalogItem) : null);

                          return (
                            <div
                              key={ord.number}
                              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm space-y-3 transition hover:shadow-md hover:border-slate-300"
                            >
                              {/* Order Card Header: Item Thumbnail on left of Store Name + Inline Status Pill */}
                              <div className="flex items-center gap-3">
                                <div className="relative h-11 w-11 rounded-xl overflow-hidden bg-orange-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                                  {orderImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={orderImageUrl}
                                      alt={firstLine?.name || displayStoreName}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = "none";
                                        const fallback = e.currentTarget.parentElement?.querySelector(".fallback-img") as HTMLElement | null;
                                        if (fallback) fallback.style.display = "flex";
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className={`fallback-img h-full w-full items-center justify-center text-orange-600 bg-orange-50 ${
                                      orderImageUrl ? "hidden" : "flex"
                                    }`}
                                  >
                                    <ShoppingBag size={18} className="text-orange-500" />
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="font-bold text-sm text-slate-900 truncate">
                                      {displayStoreName}
                                    </h5>
                                    {isDelivered ? (
                                      <span className="font-bold text-[10px] text-emerald-700 inline-flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                                        <span>Delivered</span>
                                        <CheckCircle2 size={10} className="text-emerald-600 fill-emerald-100" />
                                      </span>
                                    ) : ord.status === "out_for_delivery" ? (
                                      <span className="font-bold text-[10px] text-blue-700 inline-flex items-center bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200/60 shrink-0">
                                        Out for Delivery
                                      </span>
                                    ) : ord.status === "cancelled" ? (
                                      <span className="font-bold text-[10px] text-rose-700 inline-flex items-center bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200/60 shrink-0">
                                        Cancelled
                                      </span>
                                    ) : (
                                      <span className="font-bold text-[10px] text-amber-700 inline-flex items-center bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200/60 shrink-0">
                                        Order Placed
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {isDeliv ? "Doorstep Delivery" : "Store Counter Pickup"} · {dateStr}
                                  </p>
                                </div>
                              </div>

                              {/* Items Line (Image 4: 1X pill + item name) */}
                              {ord.lines && Array.isArray(ord.lines) && ord.lines.length > 0 && (
                                <div className="flex items-center text-xs text-slate-800">
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 mr-2 shrink-0">
                                    {ord.lines[0]?.qty || 1}X
                                  </span>
                                  <span className="font-semibold text-slate-800 truncate">
                                    {ord.lines.map((l: any) => l.name).join(", ")}
                                  </span>
                                </div>
                              )}

                              {/* Divider */}
                              <div className="border-t border-slate-100" />

                              {/* Dual Star Rating (Image 4: Food Rating & Delivery Rating) */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {/* Store / Food Rating */}
                                <div className="space-y-1">
                                  <div className="text-[11px] font-bold text-slate-600">Store Rating</div>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRateOrder(ord.number, star, "food")}
                                        className="p-0.5 text-amber-400 hover:scale-110 transition cursor-pointer"
                                        title={`Rate store ${star} stars`}
                                      >
                                        <Star
                                          size={15}
                                          className={
                                            star <= storeRating
                                              ? "fill-amber-400 text-amber-400"
                                              : "text-slate-200"
                                          }
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Delivery Rating */}
                                <div className="space-y-1">
                                  <div className="text-[11px] font-bold text-slate-600">Delivery Rating</div>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRateOrder(ord.number, star, "delivery")}
                                        className="p-0.5 text-amber-400 hover:scale-110 transition cursor-pointer"
                                        title={`Rate delivery ${star} stars`}
                                      >
                                        <Star
                                          size={15}
                                          className={
                                            star <= deliveryRating
                                              ? "fill-amber-400 text-amber-400"
                                              : "text-slate-200"
                                          }
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Reorder CTA (Image 4 Exact Soft Peach Button) */}
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleReorder(ord)}
                                  className="w-full py-2.5 rounded-xl bg-[#fff1eb] hover:bg-[#ffe4d6] text-[#ea580c] font-bold text-xs tracking-wide transition border border-[#fed7aa]/60 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                                >
                                  <RefreshCw size={13} />
                                  <span>Reorder</span>
                                </button>
                              </div>

                              {/* Card Footer: Metadata & Tax Invoice */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Order #{ord.number} · <strong className="text-slate-900 font-mono">{formatStorePrice(ord.total_paise || 0)}</strong>
                                </span>

                                <div className="flex items-center gap-2.5">
                                  <Link
                                    href={`/track?order=${encodeURIComponent(ord.number)}`}
                                    onClick={() => {
                                      setOrdersDrawerOpen(false);
                                      setCustomerProfileOpen(false);
                                    }}
                                    className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline"
                                  >
                                    Tax Invoice
                                  </Link>

                                  {ord.delivery_otp && (
                                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                                      OTP: {ord.delivery_otp}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {profileEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Edit Customer Profile</h3>
              <button
                type="button"
                onClick={() => setProfileEditOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. priya@example.com"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-400 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-400">Order invoices and live status updates will be sent to this email.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number (Verified)</label>
                <input
                  type="text"
                  disabled
                  value={`+91 ${phone}`}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setProfileEditOpen(false)}
                className="h-8 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                style={{ backgroundColor: brandPrimaryColor }}
                className="h-8 rounded-xl px-4 text-xs font-bold text-white shadow-xs hover:opacity-95 cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Addresses Modal */}
      {profileAddressesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Saved Delivery Addresses</h3>
              </div>
              <button
                type="button"
                onClick={() => setProfileAddressesOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {/* GPS Detection Bar */}
              <button
                type="button"
                disabled={detectingLocation}
                onClick={() => {
                  setDetectingLocation(true);
                  if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setLatitude(pos.coords.latitude);
                        setLongitude(pos.coords.longitude);
                        setLiveLocationUrl(
                          `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`
                        );
                        setLocationSuccess(true);
                        setDetectingLocation(false);
                        setMessage("GPS location detected accurately!");
                      },
                      () => {
                        setDetectingLocation(false);
                        setMessage("Could not access GPS. Please ensure location permissions are allowed.");
                      },
                      { enableHighAccuracy: true, timeout: 8000 }
                    );
                  } else {
                    setDetectingLocation(false);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
              >
                <Compass size={16} className={detectingLocation ? "animate-spin" : ""} />
                <span>{detectingLocation ? "Detecting GPS Coordinates..." : "Use Current GPS Location"}</span>
              </button>

              {savedAddresses.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No saved addresses yet. Save an address during checkout or add one below.
                </div>
              ) : (
                savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold text-emerald-700">Default</span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-800">{addr.address}</div>
                    {addr.landmark && (
                      <div className="text-[11px] text-slate-500">Landmark: {addr.landmark}</div>
                    )}
                    <div className="text-[11px] font-mono text-slate-400">PIN: {addr.pincode}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setProfileAddressesOpen(false)}
                className="h-8 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coupons Modal */}
      {profileCouponsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-orange-600" />
                <h3 className="text-sm font-bold text-slate-900">Store Promotional Coupons</h3>
              </div>
              <button
                type="button"
                onClick={() => setProfileCouponsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              {[
                { code: "WELCOME10", desc: "10% off on your order", min: "Min. order ₹200" },
                { code: "FREESHIP", desc: "Free Doorstep Delivery", min: "Min. order ₹350" },
                { code: "FLAT50", desc: "Flat ₹50 discount on groceries", min: "Min. order ₹500" },
              ].map((c) => (
                <div
                  key={c.code}
                  className="flex items-center justify-between rounded-xl border border-dashed border-orange-200 bg-orange-50/60 p-3"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-orange-800 tracking-wider">
                      {c.code}
                    </span>
                    <p className="text-[11px] font-medium text-slate-700 mt-0.5">{c.desc}</p>
                    <span className="text-[10px] text-slate-400">{c.min}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(c.code);
                      setCoupon(c.code);
                      setMessage(`Coupon ${c.code} copied!`);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-orange-700 cursor-pointer"
                  >
                    <Copy size={12} />
                    <span>Copy</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProfileCouponsOpen(false)}
                className="h-8 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modes Modal */}
      {profilePaymentsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Supported Payment Methods</h3>
              </div>
              <button
                type="button"
                onClick={() => setProfilePaymentsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                  UPI
                </div>
                <div>
                  <div className="font-bold text-slate-900">Instant UPI &amp; Dynamic QR</div>
                  <div className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm, BHIM</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold">
                  Card
                </div>
                <div>
                  <div className="font-bold text-slate-900">Credit / Debit Cards</div>
                  <div className="text-[11px] text-slate-500">Visa, Mastercard, RuPay, Maestro</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 font-bold">
                  COD
                </div>
                <div>
                  <div className="font-bold text-slate-900">Pay on Delivery &amp; Counter Collection</div>
                  <div className="text-[11px] text-slate-500">Cash, Store POS UPI, or Card Swipe</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProfilePaymentsOpen(false)}
                className="h-8 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refunds & Returns Modal */}
      {profileRefundsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">My Returns &amp; Refunds</h3>
              </div>
              <button
                type="button"
                onClick={() => setProfileRefundsOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Returns can be initiated within <strong className="text-slate-900">7 days</strong> of delivery for eligible items in their original packaging.
              </p>
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 space-y-1">
                <div className="font-bold text-purple-900">Refund Processing Timeline:</div>
                <div className="text-[11px] text-purple-800">
                  &bull; Instant UPI / Store Credit: 2 to 4 hours<br />
                  &bull; Debit / Credit Card: 3 to 5 business days
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                To request a return or check refund status for a specific order, reach out to our store helpdesk or contact us with your order number.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProfileRefundsOpen(false)}
                className="h-8 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
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
                allowWhatsapp={onlineSettings?.contact?.enableFloatingWhatsapp === true}
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
