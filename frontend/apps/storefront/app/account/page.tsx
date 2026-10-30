"use client";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Edit3,
  ExternalLink,
  HelpCircle,
  Home,
  Info,
  KeyRound,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const STORE_STORAGE_KEY = "selfx_active_store_slug_v1";
const CUSTOMER_STORAGE_KEY = "selfx_storefront_customer_v2";
const SAVED_ADDRESSES_STORAGE_KEY = "selfx_storefront_saved_addresses_v2";
const ORDER_RATINGS_STORAGE_KEY = "selfx_storefront_order_ratings_v1";

function getCartKey(storeSlug: string) {
  return `selfx_storefront_cart_${storeSlug}_v2`;
}

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

type OrderLine = {
  store_item_id: string;
  name: string;
  qty: number;
  unit_price_paise: number;
  total_paise?: number;
};

type PastOrder = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  customer_name: string;
  total_paise: number;
  subtotal_paise: number;
  delivery_fee_paise: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  store_slug: string;
  store_name: string;
  items_count: number;
  lines: OrderLine[];
};

type StoreDetails = {
  name: string;
  city?: string | null;
  address_line?: string | null;
  pincode?: string | null;
  open?: string | null;
  close?: string | null;
  open_now?: boolean;
  sms_otp_enabled?: boolean;
  active_payment_gateways?: string[];
  online_store_settings?: any;
};

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AccountPage() {
  const [storeSlug, setStoreSlug] = useState("bangalore");
  const [storeInfo, setStoreInfo] = useState<StoreDetails | null>(null);

  // Authentication State
  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("Customer");
  const [userEmail, setUserEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verified, setVerified] = useState(false);

  // Dashboard & Loyalty State
  const [loyalty, setLoyalty] = useState<{ name: string; points: number; tier: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "delivery" | "pickup">("all");

  // Saved Addresses State
  const [savedAddresses, setSavedAddresses] = useState<SavedCustomerAddress[]>([]);
  const [addressesModalOpen, setAddressesModalOpen] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("Home");
  const [newAddrName, setNewAddrName] = useState("");
  const [newAddrPhone, setNewAddrPhone] = useState("");
  const [newAddrText, setNewAddrText] = useState("");
  const [newAddrLandmark, setNewAddrLandmark] = useState("");
  const [newAddrPincode, setNewAddrPincode] = useState("");
  const [newAddrLat, setNewAddrLat] = useState<number | null>(null);
  const [newAddrLng, setNewAddrLng] = useState<number | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  // Ratings State (Order ID -> { foodRating: number, deliveryRating: number })
  const [orderRatings, setOrderRatings] = useState<Record<string, { food: number; delivery: number }>>({});

  // Modals
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [paymentModesModalOpen, setPaymentModesModalOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Load Initial State
  useEffect(() => {
    const activeSlug =
      (typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("store") ||
          window.localStorage.getItem(STORE_STORAGE_KEY))) ||
      "bangalore";
    setStoreSlug(activeSlug);

    // Load active store details
    void loadStoreMeta(activeSlug);

    // Read stored cart count
    try {
      const cartKey = getCartKey(activeSlug);
      const rawCart = window.localStorage.getItem(cartKey);
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        const count = Object.values(parsed).reduce((acc: number, item: any) => acc + (item?.qty || item || 0), 0);
        setCartCount(Number(count) || 0);
      }
    } catch {
      // ignore
    }

    // Load saved customer data
    try {
      const savedCustomer = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (savedCustomer) {
        const parsed = JSON.parse(savedCustomer) as {
          phone?: string;
          name?: string;
          email?: string;
          verifiedSignIn?: boolean;
        };
        if (parsed.phone) {
          setPhone(parsed.phone);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.email) setUserEmail(parsed.email);
          setVerified(true);
          void loadCustomerData(parsed.phone, activeSlug);
        }
      }
    } catch {
      // ignore
    }

    // Load saved addresses
    try {
      const rawAddrs = window.localStorage.getItem(SAVED_ADDRESSES_STORAGE_KEY);
      if (rawAddrs) {
        const parsedAddrs = JSON.parse(rawAddrs);
        if (Array.isArray(parsedAddrs)) setSavedAddresses(parsedAddrs);
      }
    } catch {
      // ignore
    }

    // Load stored ratings
    try {
      const rawRatings = window.localStorage.getItem(ORDER_RATINGS_STORAGE_KEY);
      if (rawRatings) {
        setOrderRatings(JSON.parse(rawRatings));
      }
    } catch {
      // ignore
    }
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  async function loadStoreMeta(slug: string) {
    try {
      const res = await fetch(`/api/v1/public/stores/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) setStoreInfo(json.data);
      }
    } catch {
      // ignore
    }
  }

  async function loadCustomerData(userPhone: string, slug: string) {
    const cleaned = userPhone.replace(/\D/g, "").slice(0, 10);
    if (!cleaned) return;

    // 1. Fetch loyalty
    try {
      const resLoyalty = await fetch(
        `/api/v1/public/stores/${encodeURIComponent(slug)}/loyalty?phone=${encodeURIComponent(cleaned)}`,
      );
      if (resLoyalty.ok) {
        const body = (await resLoyalty.json()) as { data?: { name: string; points: number; tier: string } };
        if (body.data) {
          setLoyalty(body.data);
          if (body.data.name && body.data.name !== "Customer" && !userName) {
            setUserName(body.data.name);
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch past orders
    setLoadingOrders(true);
    try {
      const resOrders = await fetch(`/api/v1/public/orders/customer?phone=${encodeURIComponent(cleaned)}`);
      if (resOrders.ok) {
        const body = (await resOrders.json()) as { data: PastOrder[] };
        setPastOrders(body.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOrders(false);
    }
  }

  async function handleSendOtp(e?: FormEvent) {
    if (e) e.preventDefault();
    const cleaned = phone.replace(/\D/g, "").slice(0, 10);
    if (cleaned.length < 10 || !storeSlug) {
      setStatusMsg("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpLoading(true);
    setStatusMsg("Sending OTP code…");
    try {
      const response = await fetch(`/api/v1/public/stores/${encodeURIComponent(storeSlug)}/otp`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });
      const body = (await response.json()) as {
        data?: { status?: string; code?: string; dev_otp?: string };
        error?: { message?: string };
      };
      if (!response.ok) {
        setStatusMsg(body.error?.message ?? "Failed to send code. Please try again.");
        return;
      }
      setOtpSent(true);
      setResendTimer(30);
      setStatusMsg("Verification code sent to your mobile number.");
    } catch {
      setStatusMsg("Network error sending code. Please check your connection.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\D/g, "").slice(0, 10);
    if (!storeSlug || !otp) return;
    setOtpLoading(true);
    try {
      const response = await fetch(`/api/v1/public/stores/${encodeURIComponent(storeSlug)}/otp/verify`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned, code: otp }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setStatusMsg(body.error?.message ?? "Invalid verification code.");
        setOtpLoading(false);
        return;
      }
    } catch {
      setStatusMsg("Error verifying code.");
      setOtpLoading(false);
      return;
    }

    const defaultName = userName && userName !== "Customer" ? userName : `Customer ${cleaned.slice(-4)}`;
    const customerObj = {
      phone: cleaned,
      name: defaultName,
      email: userEmail,
      verifiedSignIn: true,
    };
    try {
      window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customerObj));
    } catch {
      // ignore
    }
    setUserName(defaultName);
    setVerified(true);
    setOtpLoading(false);
    setStatusMsg(null);
    void loadCustomerData(cleaned, storeSlug);
  }

  function handleSignOut() {
    try {
      window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    } catch {
      // ignore
    }
    setVerified(false);
    setOtpSent(false);
    setOtp("");
    setPhone("");
    setLoyalty(null);
    setPastOrders([]);
    setStatusMsg("Signed out successfully.");
  }

  function handleSaveProfile() {
    const updated = {
      phone: phone.replace(/\D/g, "").slice(0, 10),
      name: userName.trim() || "Customer",
      email: userEmail.trim(),
      verifiedSignIn: true,
    };
    try {
      window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setEditProfileModalOpen(false);
  }

  // 1-Click Reorder Action
  function handleReorder(order: PastOrder) {
    setReordering(order.id);
    try {
      const cartKey = getCartKey(storeSlug);
      const existingRaw = window.localStorage.getItem(cartKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};

      // Add all order lines to cart
      for (const line of order.lines) {
        existing[line.store_item_id] = {
          product: {
            id: line.store_item_id,
            name: line.name,
            slug: line.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            selling_price_paise: line.unit_price_paise,
          },
          qty: (existing[line.store_item_id]?.qty || 0) + line.qty,
        };
      }

      window.localStorage.setItem(cartKey, JSON.stringify(existing));
      window.location.href = `/cart?store=${encodeURIComponent(storeSlug)}`;
    } catch {
      setReordering(null);
    }
  }

  // Save Star Rating
  function handleRateOrder(orderId: string, type: "food" | "delivery", rating: number) {
    const existing = orderRatings[orderId] || { food: 0, delivery: 0 };
    const updated = {
      ...orderRatings,
      [orderId]: {
        ...existing,
        [type]: rating,
      },
    };
    setOrderRatings(updated);
    try {
      window.localStorage.setItem(ORDER_RATINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  // Detect GPS coordinates for new address
  function handleDetectGps() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewAddrLat(pos.coords.latitude);
        setNewAddrLng(pos.coords.longitude);
        setDetectingGps(false);
      },
      () => {
        setDetectingGps(false);
        alert("Unable to retrieve GPS coordinates. Please ensure location permissions are enabled.");
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function handleSaveNewAddress() {
    if (!newAddrText.trim() || !newAddrPincode.trim()) {
      alert("Please enter delivery address and 6-digit PIN code.");
      return;
    }
    const newAddr: SavedCustomerAddress = {
      id: `addr-${Date.now()}`,
      label: newAddrLabel,
      name: newAddrName.trim() || userName,
      phone: newAddrPhone.trim() || phone,
      address: newAddrText.trim(),
      landmark: newAddrLandmark.trim(),
      pincode: newAddrPincode.trim(),
      latitude: newAddrLat,
      longitude: newAddrLng,
      isDefault: savedAddresses.length === 0,
    };
    const updated = [...savedAddresses, newAddr];
    setSavedAddresses(updated);
    try {
      window.localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setIsAddingAddress(false);
    setNewAddrText("");
    setNewAddrLandmark("");
    setNewAddrPincode("");
  }

  function handleDeleteAddress(id: string) {
    const updated = savedAddresses.filter((a) => a.id !== id);
    setSavedAddresses(updated);
    try {
      window.localStorage.setItem(SAVED_ADDRESSES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") return pastOrders;
    return pastOrders.filter((o) => o.fulfillment === orderFilter);
  }, [pastOrders, orderFilter]);

  const brandName = storeInfo?.name || "SelfX Store";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href={`/?store=${encodeURIComponent(storeSlug)}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition"
              aria-label="Back to store"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">My Account</h1>
              <p className="text-[11px] text-slate-500 truncate max-w-[180px] sm:max-w-xs">{brandName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSupportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 text-orange-500" />
              <span className="hidden sm:inline">Help</span>
            </button>

            <Link
              href={`/cart?store=${encodeURIComponent(storeSlug)}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-orange-600 px-3 text-xs font-bold text-white shadow-2xs transition hover:bg-orange-700"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-orange-600">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3.5 sm:px-6 py-5 sm:py-8 pb-28">
        {!verified ? (
          /* Sleek Phone OTP Login Card */
          <div className="mx-auto max-w-md pt-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-2xs">
                <User className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Sign in to your account</h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Enter your mobile number to view saved addresses, past orders, live order tracking, and loyalty rewards.
                </p>
              </div>

              {statusMsg && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3 text-xs font-semibold text-orange-900 flex items-center gap-2">
                  <Info className="h-4 w-4 text-orange-600 shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number</label>
                  <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3.5 shadow-2xs focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 transition">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 pr-2.5 border-r border-slate-200 shrink-0">
                      <span>🇮🇳 +91</span>
                    </span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter 10-digit mobile"
                      className="w-full bg-transparent pl-3 text-sm font-semibold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <label className="block text-xs font-bold text-slate-700">Verification Code (OTP)</label>
                    <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-3.5 shadow-2xs focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 transition">
                      <KeyRound className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit OTP code"
                        className="w-full bg-transparent pl-3 font-mono text-base font-bold tracking-widest text-slate-900 outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-slate-400">Didn&apos;t receive code?</span>
                      {resendTimer > 0 ? (
                        <span className="font-semibold text-slate-500">Resend in {resendTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          className="font-bold text-orange-600 hover:underline cursor-pointer"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={otpLoading || phone.length < 10}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {otpLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>{otpSent ? "Verify & Sign In" : "Send Verification Code"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Protected by 256-Bit Encrypted Mobile Verification</span>
              </div>
            </div>
          </div>
        ) : (
          /* Production-Grade Account Dashboard (Image 2 & 3 Experience) */
          <div className="space-y-6">
            {/* HERO PROFILE BANNER (Matches Image 2 Visual Hierarchy) */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-rose-600 to-amber-700 text-white p-5 sm:p-7 shadow-lg">
              {/* Background ambient accents */}
              <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-black/10 blur-xl pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white font-black text-xl sm:text-2xl shadow-inner border border-white/30 shrink-0">
                    {userName.charAt(0).toUpperCase() || "S"}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">{userName}</h2>
                      <span className="rounded-full bg-emerald-400/25 border border-emerald-300/40 px-2 py-0.5 text-[10px] font-bold text-emerald-100">
                        Active
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white/90 font-mono">+91 - {phone}</p>
                    {userEmail ? (
                      <p className="text-xs text-white/80 truncate">{userEmail}</p>
                    ) : (
                      <p className="text-[11px] text-white/60 italic">No email linked</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => setEditProfileModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-black/20 hover:bg-black/30 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-bold text-rose-200 shadow-xs transition cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MEMBERSHIP & REWARDS CARD (Matches Image 2 "ONE Active" Banner) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs transition hover:border-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 font-black text-sm shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">SelfX Club Rewards</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[9px] font-black uppercase tracking-wider text-emerald-800">
                        {loyalty?.tier || "Active Tier"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Earn 1 point per ₹1 spent. Redeem directly for instant cart discounts.
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                  <span className="text-base sm:text-lg font-black text-slate-900">
                    {loyalty?.points ?? 0}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Points Available</span>
                </div>
              </div>
            </div>

            {/* 4 QUICK ACTION TILES (Image 2 Inspiration) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Tile 1: Saved Addresses */}
              <button
                type="button"
                onClick={() => setAddressesModalOpen(true)}
                className="flex flex-col items-center text-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition group cursor-pointer"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition">
                  <MapPin className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-bold text-slate-900">Saved Addresses</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {savedAddresses.length} {savedAddresses.length === 1 ? "address" : "addresses"}
                </span>
              </button>

              {/* Tile 2: Payment Modes */}
              <button
                type="button"
                onClick={() => setPaymentModesModalOpen(true)}
                className="flex flex-col items-center text-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition group cursor-pointer"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-105 transition">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-bold text-slate-900">Payment Modes</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Active Gateways</span>
              </button>

              {/* Tile 3: Order History */}
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("past-orders-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex flex-col items-center text-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition group cursor-pointer"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-bold text-slate-900">Past Orders</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{pastOrders.length} orders</span>
              </button>

              {/* Tile 4: Store Support */}
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="flex flex-col items-center text-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition group cursor-pointer"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <span className="mt-2 text-xs font-bold text-slate-900">Store Support</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Help & FAQ</span>
              </button>
            </div>

            {/* PAST ORDERS SECTION (Image 3 Inspiration with Star Ratings & 1-Click Reorder) */}
            <div id="past-orders-section" className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-900">
                    Past Orders ({pastOrders.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track delivery status, rate items, and reorder favorites in 1 click.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Category Pill Tabs (Image 3 Style: Food vs Instamart/Pickup) */}
                  <div className="flex rounded-xl bg-slate-200/80 p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setOrderFilter("all")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        orderFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilter("delivery")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        orderFilter === "delivery" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilter("pickup")}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        orderFilter === "pickup" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Pickup
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadCustomerData(phone, storeSlug)}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
                    title="Refresh orders"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {loadingOrders ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-14">
                  <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
                  <p className="mt-2 text-xs font-semibold text-slate-500">Loading your past orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center p-6 space-y-3">
                  <Package className="h-12 w-12 text-slate-300" />
                  <h4 className="text-sm font-bold text-slate-800">No Orders Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {orderFilter === "all"
                      ? `No purchases found linked to +91 ${phone}. Add food or retail items from our catalog to place your first order.`
                      : `No past ${orderFilter} orders found.`}
                  </p>
                  <Link
                    href={`/?store=${encodeURIComponent(storeSlug)}`}
                    className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-xl bg-orange-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition"
                  >
                    Browse Catalog
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((ord) => {
                    const ratings = orderRatings[ord.id] || { food: 0, delivery: 0 };
                    const isDelivered = ord.status === "delivered" || ord.status === "completed";

                    return (
                      <div
                        key={ord.id}
                        className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs transition hover:border-slate-300 space-y-3.5"
                      >
                        {/* Order Header (Store Name, Status Pill) */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0 font-black text-sm">
                              {ord.store_name?.charAt(0).toUpperCase() || <Store className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {ord.store_name || brandName}
                              </h4>
                              <p className="text-[11px] text-slate-400 font-mono">
                                Order #{ord.number}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                isDelivered
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : ord.status === "out_for_delivery"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : ord.status === "cancelled"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {isDelivered && <CheckCircle2 className="h-3 w-3" />}
                              <span>{ord.status.toUpperCase().replace("_", " ")}</span>
                            </span>
                          </div>
                        </div>

                        {/* Order Line Items List (Image 3 Style: "1x Chicken Fry Bone") */}
                        <div className="rounded-xl bg-slate-50/70 p-3 space-y-1.5 border border-slate-100 text-xs">
                          {ord.lines?.length > 0 ? (
                            ord.lines.map((l, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-slate-900 bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[10px]">
                                    {l.qty}X
                                  </span>
                                  <span className="font-semibold text-slate-800 truncate">{l.name}</span>
                                </div>
                                <span className="font-medium text-slate-600">
                                  {formatInr(l.unit_price_paise * l.qty)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-slate-600 font-medium">{ord.items_count} items ordered</p>
                          )}
                        </div>

                        {/* Interactive Star Rating Widget (Image 3 Style) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                          {/* Food Rating */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600">Food Rating</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => handleRateOrder(ord.id, "food", star)}
                                  className="p-0.5 text-slate-300 hover:text-amber-400 transition cursor-pointer"
                                  aria-label={`Rate food ${star} stars`}
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      ratings.food >= star
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-slate-300"
                                    }`}
                                  />
                                </button>
                              ))}
                              {ratings.food > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 ml-1">
                                  {ratings.food}/5
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delivery Rating */}
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-slate-600">Delivery Rating</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => handleRateOrder(ord.id, "delivery", star)}
                                  className="p-0.5 text-slate-300 hover:text-amber-400 transition cursor-pointer"
                                  aria-label={`Rate delivery ${star} stars`}
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      ratings.delivery >= star
                                        ? "text-amber-400 fill-amber-400"
                                        : "text-slate-300"
                                    }`}
                                  />
                                </button>
                              ))}
                              {ratings.delivery > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 ml-1">
                                  {ratings.delivery}/5
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reorder Button (Prominent, Image 3 Style) */}
                        <div className="pt-1">
                          <button
                            type="button"
                            disabled={reordering === ord.id}
                            onClick={() => handleReorder(ord)}
                            className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/80 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-60"
                          >
                            <Repeat className={`h-4 w-4 ${reordering === ord.id ? "animate-spin" : ""}`} />
                            <span>{reordering === ord.id ? "Adding Items to Cart..." : "Reorder"}</span>
                          </button>
                        </div>

                        {/* Order Summary Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                          <div>
                            <span>
                              Ordered:{" "}
                              {new Date(ord.created_at).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="mx-1.5 font-bold">·</span>
                            <span className="font-bold text-slate-900">
                              Bill Total: {formatInr(ord.total_paise)}
                            </span>
                          </div>

                          <Link
                            href={`/track?order=${encodeURIComponent(ord.number)}&phone=${encodeURIComponent(phone)}`}
                            className="inline-flex items-center gap-1 font-bold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            <span>Live Track Status</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* SAVED ADDRESSES MODAL */}
      {addressesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900">Manage Saved Addresses</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddressesModalOpen(false);
                  setIsAddingAddress(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!isAddingAddress ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(true)}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-orange-300 bg-orange-50/50 text-orange-700 font-bold text-xs hover:bg-orange-50 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Delivery Address</span>
                </button>

                {savedAddresses.length === 0 ? (
                  <p className="text-xs text-center text-slate-500 py-6">
                    No addresses saved yet. Add one above for 1-click checkout.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-1.5 text-xs text-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{addr.label}</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-medium text-slate-800">{addr.name}</span>
                            {addr.isDefault && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                                Default
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Delete address"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <p className="text-slate-600">{addr.address}</p>
                        {addr.landmark && (
                          <p className="text-[11px] text-slate-400">Landmark: {addr.landmark}</p>
                        )}
                        <p className="text-[11px] text-slate-400 font-mono">
                          PIN: {addr.pincode} · +91 {addr.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Add New Address Form */
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Save Address As</label>
                  <div className="flex gap-2">
                    {["Home", "Work", "Other"].map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setNewAddrLabel(lbl)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          newAddrLabel === lbl
                            ? "border-orange-600 bg-orange-50 text-orange-900 shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Name</label>
                    <input
                      type="text"
                      value={newAddrName}
                      onChange={(e) => setNewAddrName(e.target.value)}
                      placeholder={userName || "Full name"}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={newAddrPhone}
                      onChange={(e) => setNewAddrPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder={phone || "Mobile"}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Flat / House No, Building, Street *
                  </label>
                  <input
                    type="text"
                    value={newAddrText}
                    onChange={(e) => setNewAddrText(e.target.value)}
                    placeholder="e.g. 104, Green Heights, 1st Cross"
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Landmark</label>
                    <input
                      type="text"
                      value={newAddrLandmark}
                      onChange={(e) => setNewAddrLandmark(e.target.value)}
                      placeholder="e.g. Near Metro Station"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={newAddrPincode}
                      onChange={(e) => setNewAddrPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit PIN"
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* 1-Click GPS Detector */}
                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={detectingGps}
                  className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl border border-orange-200 bg-orange-50/50 text-orange-700 text-xs font-bold hover:bg-orange-50 transition cursor-pointer"
                >
                  <Navigation className={`h-3.5 w-3.5 ${detectingGps ? "animate-spin" : ""}`} />
                  <span>
                    {detectingGps
                      ? "Detecting GPS coordinates..."
                      : newAddrLat && newAddrLng
                      ? `GPS Locked: ${newAddrLat.toFixed(4)}, ${newAddrLng.toFixed(4)}`
                      : "Detect Live Location (1-Click GPS)"}
                  </span>
                </button>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewAddress}
                    className="flex-1 h-11 rounded-xl bg-orange-600 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {editProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Profile</h3>
              <button
                type="button"
                onClick={() => setEditProfileModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-900 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registered Mobile Number</label>
                <div className="h-11 rounded-xl border border-slate-100 bg-slate-50 px-3.5 flex items-center text-xs font-bold text-slate-500 font-mono">
                  +91 {phone} (Verified via OTP)
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditProfileModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="flex-1 h-11 rounded-xl bg-orange-600 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STORE SUPPORT & HELP MODAL */}
      {supportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900">Customer Support</h3>
              </div>
              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">{brandName}</h4>
                <p className="text-slate-500">{storeInfo?.address_line || storeInfo?.city || "Store Location"}</p>
                {storeInfo?.open && storeInfo?.close && (
                  <p className="text-[11px] text-slate-400">
                    Timings: {storeInfo.open} – {storeInfo.close}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <a
                  href={`https://wa.me/91${phone}?text=${encodeURIComponent("Hello, I need help with my SelfX store order.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-900 font-bold transition"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                    <span>WhatsApp Support</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-500" />
                </a>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                  <div className="font-bold text-slate-900">Cancellation & Refund Policy</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Orders can be cancelled before they are packed for delivery. For issues with received items, please contact store support within 24 hours.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSupportModalOpen(false)}
                className="w-full h-11 rounded-xl bg-orange-600 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition cursor-pointer"
              >
                Close Support
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODES INFO MODAL */}
      {paymentModesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900">Payment Modes Supported</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModesModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Cash on Delivery (Pay on Delivery)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Pay via cash or scan rider UPI QR code when your order arrives at your doorstep.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Pay at Store Counter (Take Away)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Receive your pickup QR and pay at the counter when picking up your packaged order.
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Configured directly by tenant payment gateway settings.</span>
              </div>

              <button
                type="button"
                onClick={() => setPaymentModesModalOpen(false)}
                className="w-full h-11 rounded-xl bg-orange-600 text-xs font-bold text-white shadow-xs hover:bg-orange-700 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}