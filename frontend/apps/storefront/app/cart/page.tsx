"use client";

import { formatInr } from "@selfx/types";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  Edit3,
  ExternalLink,
  FileText,
  Home,
  Lock,
  MapPin,
  Minus,
  Navigation,
  PackageCheck,
  Phone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tag,
  Truck,
  User,
  Utensils,
  Wallet,
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
const SAVED_ADDRESSES_STORAGE_KEY = "selfx_storefront_saved_addresses_v2";

export type SavedCustomerAddress = {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

export default function CartPage() {
  const [storeSlug, setStoreSlug] = useState("bangalore");
  const [storeInfo, setStoreInfo] = useState<PublicStoreSummary | null>(null);
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState<Record<string, number>>({});

  // Checkout choices: pay on delivery vs pay in store
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState("cod");
  const [checkoutStep, setCheckoutStep] = useState<"details" | "payment">("details");
  const [savedAddresses, setSavedAddresses] = useState<SavedCustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddressLabel, setNewAddressLabel] = useState<string>("Home");
  const [detailedBillOpen, setDetailedBillOpen] = useState(false);
  const [isVerifiedSignIn, setIsVerifiedSignIn] = useState(false);

  const activeSavedAddress = useMemo(() => {
    if (savedAddresses.length === 0) return null;
    return savedAddresses.find((a) => a.id === selectedAddressId) || savedAddresses[0];
  }, [savedAddresses, selectedAddressId]);

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
          verifiedSignIn?: boolean;
        };
        if (parsed.phone && !phone) setPhone(parsed.phone);
        if (parsed.name && !name) setName(parsed.name);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.address && !address) setAddress(parsed.address);
        if (parsed.landmark && !landmark) setLandmark(parsed.landmark);
        if (parsed.pincode && !pincode) setPincode(parsed.pincode);
        if (parsed.verifiedSignIn) {
          setIsVerifiedSignIn(true);
          if (parsedAddrs.length === 0 && parsed.address) {
            const initialAddr: SavedCustomerAddress = {
              id: "addr-init-1",
              label: "Home",
              name: parsed.name || "Customer",
              phone: parsed.phone || "",
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

  // Dynamic Payment Gateway options from Tenant Settings -> Payment Gateways
  const cartPaymentsConfig = storeInfo?.online_store_settings?.payments ?? {};
  const cartActiveGateways: string[] = Array.isArray((storeInfo as any)?.active_payment_gateways)
    ? (storeInfo as any).active_payment_gateways.map((g: any) => (typeof g === "string" ? g : g?.provider)).filter(Boolean)
    : [];
  const cartGatewayStatuses: Record<string, string> = (storeInfo as any)?.payment_gateways_status ?? {};

  const cartGatewayOn = (name: string) =>
    cartGatewayStatuses[name] === "active" || cartActiveGateways.includes(name);

  const isCodActiveInGateway = cartGatewayOn("cod");
  const isPayAtStoreActiveInGateway = cartGatewayOn("pay_at_store");
  const isUpiActiveInGateway = cartGatewayOn("upi_qr") || cartGatewayOn("upi");
  const isRazorpayActiveInGateway = cartGatewayOn("razorpay");
  const isPhonePeActiveInGateway = cartGatewayOn("phonepe");

  const isCodEnabled = isCodActiveInGateway;
  const isPayAtStoreEnabled = isPayAtStoreActiveInGateway;
  const isUpiEnabled = isUpiActiveInGateway;
  const isRazorpayEnabled = isRazorpayActiveInGateway;
  const isPhonePeEnabled = isPhonePeActiveInGateway;

  // Auto-switch to delivery if pay_at_store is disabled in Payment Gateways
  useEffect(() => {
    if (!isPayAtStoreEnabled && fulfillment === "pickup") {
      setFulfillment("delivery");
    }
  }, [isPayAtStoreEnabled, fulfillment]);

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
    shippingSettings.freeDeliveryAbove ?? firstShippingMethod?.freeAboveAmount ?? checkoutSettings.freeDeliveryAbove ?? 0,
  );
  const isFreeDeliveryConfigured =
    configuredFreeAbove > 0 &&
    (shippingSettings.enableFreeDelivery !== false);
  const configuredPackagingFee = Number(
    (shippingSettings.enablePackagingFee !== false ? shippingSettings.packagingFee : 0) ?? checkoutSettings.packagingFee ?? 0,
  );
  const minOrderAmount = Number(
    storeInfo?.online_store_settings?.basics?.minOrderAmount ?? shippingSettings.minOrderAmount ?? 0,
  );

  const freeDeliveryThresholdPaise = isFreeDeliveryConfigured ? configuredFreeAbove * 100 : 0;
  const deliveryChargePaise =
    fulfillment === "delivery" && grossSubtotalPaise > 0
      ? (freeDeliveryThresholdPaise > 0 && grossSubtotalPaise >= freeDeliveryThresholdPaise ? 0 : configuredDeliveryFee * 100)
      : 0;
  const packagingChargePaise = grossSubtotalPaise > 0 ? configuredPackagingFee * 100 : 0;
  const grandTotalPaise = isTaxInclusive
    ? grossSubtotalPaise + deliveryChargePaise + packagingChargePaise
    : grossSubtotalPaise + totalGstPaise + deliveryChargePaise + packagingChargePaise;

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
      setErrorMsg("Please enter recipient name for this address.");
      return;
    }
    const cleanPh = phone.replace(/\D/g, "");
    if (cleanPh.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Please enter the delivery street address.");
      return;
    }
    const cleanPin = pincode.replace(/\D/g, "");
    if (cleanPin.length < 6) {
      setErrorMsg("Please enter a valid 6-digit PIN code.");
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
    setErrorMsg(null);
  };

  const handleProceedToPayment = () => {
    setErrorMsg(null);

    if (lines.length === 0) {
      setErrorMsg("Your cart is empty. Please add items first.");
      return;
    }

    if (minOrderAmount > 0 && grossSubtotalPaise < minOrderAmount * 100) {
      setErrorMsg(`Minimum order amount is ${formatInr(minOrderAmount * 100)}. Please add more items to cart.`);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!name.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }

    if (fulfillment === "delivery") {
      if (!address.trim() && !liveLocationUrl) {
        setErrorMsg("Please enter your delivery address or detect live GPS location.");
        return;
      }
    }

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

    setCheckoutStep("payment");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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
        return_url: typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined,
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

      // Check if prepaid gateway returned a redirect URL (PhonePe, Paytm, Razorpay)
      const paymentUrl = orderData.payment?.redirect_url || orderData.payment?.payment_url;
      const redirectForm = orderData.payment?.redirect_form;
      const isPrepaid = ["phonepe", "paytm", "razorpay", "stripe"].includes(payment);

      if (isPrepaid && redirectForm?.action && redirectForm?.fields) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = String(redirectForm.action);
        Object.entries(redirectForm.fields as Record<string, string>).forEach(([name, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = String(value);
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      if (isPrepaid && typeof paymentUrl === "string" && /^https?:\/\//i.test(paymentUrl)) {
        window.location.href = paymentUrl;
        return;
      }

      if (isPrepaid) {
        setErrorMsg(orderData.payment?.error || "The payment page did not open. The order is not confirmed.");
        return;
      }

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
          /* TWO-STEP CHECKOUT (Step 1: Details & Address -> Step 2: Payment Options) */
          <div className="pb-32 sm:pb-24">
            {checkoutStep === "details" ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Order details & fulfillment */}
            <div className="space-y-6 lg:col-span-8">
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

              {/* Card 2: Contact Details & 1-Click Live Location (Shown on 1st order or when editing/adding) */}
              {(isAddingNewAddress || savedAddresses.length === 0) && (
                <div className={`${cardRadiusClass} border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: brandPrimaryColor }}
                      >
                        <User size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {editingAddressId
                            ? "Edit Delivery Address"
                            : savedAddresses.length === 0
                            ? "Enter Delivery Address (Saved for 1-Click reorder)"
                            : "Add New Delivery Address"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {fulfillment === "delivery"
                            ? "Enter delivery details with 1-click live GPS location."
                            : "Enter your contact info for order pickup notification."}
                        </p>
                      </div>
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
                  {fulfillment === "delivery" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Save address as</label>
                      <div className="flex gap-2">
                        {["Home", "Work", "Other"].map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setNewAddressLabel(lbl)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
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
                  )}

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Full name *</label>
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
                          Phone {fulfillment === "delivery" ? "* (Required for rider dispatch)" : "(Optional)"}
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
                          className={`w-full flex items-center justify-center gap-2 ${buttonRadiusClass} border py-2.5 px-4 text-xs font-semibold shadow-2xs transition hover:opacity-90 cursor-pointer`}
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
                            Delivery Address (Flat / House No, Street) *
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
                            <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
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

                        {/* Save Address Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSaveAddress}
                            style={{ backgroundColor: brandPrimaryColor }}
                            className={`w-full ${buttonRadiusClass} py-2.5 text-xs font-semibold text-white shadow-2xs hover:opacity-95 transition cursor-pointer`}
                          >
                            {editingAddressId ? "Save Updated Address" : "Save Delivery Address"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              <div className={`${cardRadiusClass} border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-2`}>
                <label className="block text-xs font-semibold text-slate-700">Special instructions (Optional)</label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Less spicy, pack extra chutney, ring the door bell"
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-base sm:text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 resize-none"
                />
              </div>
            </div>

            {/* Right Column: Sticky Summary in Step 1 */}
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
                  <span className="text-xl font-bold text-slate-900">{formatInr(grandTotalPaise)}</span>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  style={{ backgroundColor: brandPrimaryColor }}
                  className={`w-full flex items-center justify-center gap-2 ${buttonRadiusClass} text-white py-3.5 text-xs font-bold uppercase tracking-wider shadow-sm transition hover:opacity-90 cursor-pointer`}
                >
                  <span>Proceed to Pay</span>
                  <ChevronRight size={16} />
                </button>

                <p className="text-[10px] text-center text-slate-400 leading-tight">
                  Click Proceed to Pay to review payment options and confirm your order.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* STEP 2: PAYMENT OPTIONS PAGE */
          <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Back to Details Header */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCheckoutStep("details");
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                aria-label="Back to details"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">Payment Options</h1>
                <p className="text-xs text-slate-500">
                  {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} · Total: {formatInr(grandTotalPaise)}
                </p>
              </div>
            </div>

            {/* Delivery / Pickup Summary Card */}
            <div className={`${cardRadiusClass} border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3`}>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  {fulfillment === "pickup" ? <Store size={20} /> : <Truck size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {storeInfo?.name || "Store"} · {fulfillment === "pickup" ? "In-Store Pickup" : "Doorstep Delivery"}
                    </span>
                    {isPayAtStoreEnabled && (
                      <div className="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setFulfillment("delivery");
                            if (payment === "pay_at_store") setPayment(isCodEnabled ? "cod" : "upi_qr");
                          }}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            fulfillment === "delivery"
                              ? "bg-white text-slate-900 shadow-2xs font-bold"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          Delivery
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFulfillment("pickup");
                            setPayment("pay_at_store");
                          }}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                            fulfillment === "pickup"
                              ? "bg-white text-slate-900 shadow-2xs font-bold"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          Store Pickup
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-1 truncate">
                    {name || "Customer"} · +91 {phone}
                  </p>
                  {fulfillment === "delivery" && address && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {address}{landmark ? `, Near ${landmark}` : ""}{pincode ? ` (${pincode})` : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Cards */}
            <div className="space-y-4">
              {/* UPI Option */}
              {isUpiEnabled && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">UPI Payment</h3>
                  <div className={`${cardRadiusClass} border border-slate-200 bg-white overflow-hidden shadow-2xs`}>
                    <button
                      type="button"
                      onClick={() => setPayment("upi_qr")}
                      className={`w-full p-4 flex items-center justify-between text-left transition cursor-pointer ${
                        payment === "upi_qr" ? "bg-emerald-50/40" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white"
                          style={{ backgroundColor: brandPrimaryColor }}
                        >
                          <QrCode size={18} />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900">
                            {cartPaymentsConfig.upiQr?.displayName || "Direct UPI QR Payment"}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {cartPaymentsConfig.upiQr?.vpa
                              ? `Pay to VPA: ${cartPaymentsConfig.upiQr.vpa}`
                              : "Scan UPI QR code or pay via Google Pay, PhonePe, Paytm"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          payment === "upi_qr"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {payment === "upi_qr" && <Check size={12} />}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Gateways */}
              {(isRazorpayEnabled || isPhonePeEnabled) && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                    Cards & Online Gateways
                  </h3>
                  <div className={`${cardRadiusClass} border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden shadow-2xs`}>
                    {isRazorpayEnabled && (
                      <button
                        type="button"
                        onClick={() => setPayment("razorpay")}
                        className={`w-full p-4 flex items-center justify-between text-left transition cursor-pointer ${
                          payment === "razorpay" ? "bg-emerald-50/40" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900">
                              Razorpay Online Checkout
                            </div>
                            <p className="text-[11px] text-slate-500">Cards, Netbanking, UPI, Wallets</p>
                          </div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            payment === "razorpay"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {payment === "razorpay" && <Check size={12} />}
                        </div>
                      </button>
                    )}

                    {isPhonePeEnabled && (
                      <button
                        type="button"
                        onClick={() => setPayment("phonepe")}
                        className={`w-full p-4 flex items-center justify-between text-left transition cursor-pointer ${
                          payment === "phonepe" ? "bg-emerald-50/40" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm font-bold text-slate-900">
                              PhonePe Payment Gateway
                            </div>
                            <p className="text-[11px] text-slate-500">Instant payment via PhonePe UPI or Cards</p>
                          </div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            payment === "phonepe"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {payment === "phonepe" && <Check size={12} />}
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cash on Delivery */}
              {isCodEnabled && fulfillment === "delivery" && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                    Pay on Delivery
                  </h3>
                  <div className={`${cardRadiusClass} border border-slate-200 bg-white overflow-hidden shadow-2xs`}>
                    <button
                      type="button"
                      onClick={() => setPayment("cod")}
                      className={`w-full p-4 flex items-center justify-between text-left transition cursor-pointer ${
                        payment === "cod" ? "bg-emerald-50/40" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          <Wallet size={18} />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900">
                            {cartPaymentsConfig.cod?.displayName || "Cash on Delivery (Pay on Delivery)"}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {cartPaymentsConfig.cod?.description || "Pay cash or scan rider UPI QR upon doorstep delivery"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          payment === "cod"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {payment === "cod" && <Check size={12} />}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Pay at Store */}
              {fulfillment === "pickup" && isPayAtStoreEnabled && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                    Store Pickup Payment
                  </h3>
                  <div className={`${cardRadiusClass} border border-slate-200 bg-white overflow-hidden shadow-2xs`}>
                    <button
                      type="button"
                      onClick={() => setPayment("pay_at_store")}
                      className="w-full p-4 flex items-center justify-between text-left bg-emerald-50/40 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                          <Store size={18} />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900">
                            {cartPaymentsConfig.payAtStore?.displayName || "Pay at Store Counter"}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Receive pickup QR code and pay at the counter when collecting your order
                          </p>
                        </div>
                      </div>
                      <div className="h-5 w-5 rounded-full border-2 border-emerald-600 bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check size={12} />
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Place Order Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={submitting}
                style={{ backgroundColor: brandPrimaryColor }}
                className={`w-full flex items-center justify-center gap-2 ${buttonRadiusClass} text-white py-4 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md hover:opacity-95 transition disabled:opacity-50 cursor-pointer`}
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Placing Your Order...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {payment === "cod"
                        ? `Place Order (${formatInr(grandTotalPaise)} - Cash on Delivery)`
                        : payment === "pay_at_store"
                        ? `Place Order (${formatInr(grandTotalPaise)} - Pay at Store)`
                        : `Pay ${formatInr(grandTotalPaise)} Now`}
                    </span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-500">
              <ShieldCheck size={14} style={{ color: brandPrimaryColor }} />
              <span>Safe & Secure 256-Bit SSL Encrypted Checkout</span>
            </div>
          </div>
        )}

        {/* FIXED BOTTOM BAR ON DETAILS PAGE */}
        {checkoutStep === "details" && totalItemsCount > 0 && !orderConfirmed && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 py-3 sm:px-6 sm:py-3.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
              <div className="flex flex-col items-start leading-tight">
                <span className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
                  {formatInr(grandTotalPaise)}
                </span>
                <button
                  type="button"
                  onClick={() => setDetailedBillOpen(true)}
                  className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-blue-600 hover:text-blue-700 hover:underline transition cursor-pointer"
                >
                  <span>VIEW BILL</span>
                  <ChevronUp size={13} />
                </button>
              </div>

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

        {/* DETAILED BILL MODAL */}
        {detailedBillOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-200">
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

              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Items Ordered</div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                  {lines.map((l) => (
                    <div key={l.product.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">
                        {l.product.name} × {l.count}
                      </span>
                      <span className="font-semibold text-slate-900">{formatInr(l.lineTotalPaise)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatInr(netSubtotalPaise)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST ({cgstPct}%)</span>
                  <span className="font-semibold text-slate-900">{formatInr(cgstPaise)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST ({sgstPct}%)</span>
                  <span className="font-semibold text-slate-900">{formatInr(sgstPaise)}</span>
                </div>
                {deliveryChargePaise > 0 ? (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span className="font-semibold text-slate-900">{formatInr(deliveryChargePaise)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Delivery Fee</span>
                    <span>FREE</span>
                  </div>
                )}
                {packagingChargePaise > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Packaging Fee</span>
                    <span className="font-semibold text-slate-900">{formatInr(packagingChargePaise)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2.5 flex justify-between text-sm font-bold text-slate-900">
                  <span>To Pay</span>
                  <span>{formatInr(grandTotalPaise)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailedBillOpen(false)}
                style={{ backgroundColor: brandPrimaryColor }}
                className="w-full h-11 rounded-xl text-xs font-bold text-white shadow-2xs hover:opacity-95 transition cursor-pointer"
              >
                Close Bill
              </button>
            </div>
          </div>
        )}
      </div>
    )}
      </main>
    </div>
  );
}
