"use client";

import { Button, PageHeader } from "@selfx/ui";
import {
  Banknote,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  Monitor,
  Printer,
  QrCode,
  Save,
  Settings,
  ShieldCheck,
  Sliders,
  Store,
  Volume2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

export type GatewayRow = {
  provider: string;
  status: string;
  mode: string;
  has_credentials: boolean;
  config?: Record<string, unknown>;
};

type GatewayMeta = {
  provider: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  isPrepaid: boolean;
  modeLabel: string;
  fields: {
    name: string;
    label: string;
    placeholder: string;
    type?: "text" | "password" | "select" | "number";
    options?: string[];
    required?: boolean;
    helper?: string;
  }[];
  toggles: {
    name: string;
    label: string;
    defaultChecked: boolean;
  }[];
};

const GATEWAY_CATALOG: GatewayMeta[] = [
  {
    provider: "phonepe",
    title: "PhonePe",
    subtitle: "Dynamic UPI QR payments & UPI Intent checkout.",
    badgeText: "पे",
    badgeBg: "#5f259f",
    badgeColor: "#ffffff",
    isPrepaid: true,
    modeLabel: "Dynamic UPI & PG",
    fields: [
      {
        name: "key_id",
        label: "Merchant ID",
        placeholder: "Enter Merchant ID (MID)",
        required: true,
        helper: "Issued in your PhonePe Business Dashboard under Developer Settings.",
      },
      {
        name: "key_secret",
        label: "Salt key",
        placeholder: "Enter PhonePe Salt Key",
        type: "password",
        required: true,
        helper: "Encrypted with AES-256 before storage.",
      },
      {
        name: "salt_index",
        label: "Salt index",
        placeholder: "1",
        type: "number",
      },
      {
        name: "provider_id",
        label: "Provider ID (X-PROVIDER-ID)",
        placeholder: "Enter Provider ID (e.g. from PhonePe POS onboarding)",
        helper: "Required for PhonePe Mercury Dynamic UPI QR POS terminals.",
      },
      {
        name: "store_id",
        label: "Store ID (UPI DQR)",
        placeholder: "STORE01",
        helper: "Required for the POS QR. Copy the Store ID from the PhonePe dashboard. It is not the same as the Merchant ID.",
      },
      {
        name: "terminal_id",
        label: "Terminal ID (UPI DQR)",
        placeholder: "TERM01",
        helper: "Required for the POS QR. Copy the Terminal ID from the PhonePe dashboard.",
      },
      {
        name: "upi_vpa",
        label: "UPI ID (optional fallback)",
        placeholder: "e.g. merchant@ybl",
        helper: "Optional fallback VPA if DQR service is unreachable.",
      },
      {
        name: "callback_url",
        label: "Webhook Callback URL",
        placeholder: "https://api.yourstore.com/api/v1/public/webhooks/phonepe",
      },
    ],
    toggles: [
      { name: "dynamic_qr", label: "Generate Dynamic UPI QR on POS & Online Checkout", defaultChecked: true },
      { name: "upi_intent", label: "Enable Mobile UPI Intent Flow (PhonePe / GPay / Paytm)", defaultChecked: true },
      { name: "auto_verify", label: "Auto-poll payment status every 3 seconds", defaultChecked: true },
    ],
  },
  {
    provider: "paytm",
    title: "Paytm",
    subtitle: "Dynamic UPI QR, Paytm Wallet, Postpaid & Cards.",
    badgeText: "paytm",
    badgeBg: "#002970",
    badgeColor: "#00baf2",
    isPrepaid: true,
    modeLabel: "UPI QR & Wallet",
    fields: [
      {
        name: "key_id",
        label: "Paytm Merchant ID (MID)",
        placeholder: "e.g.DIY12386817555501617",
        required: true,
      },
      {
        name: "key_secret",
        label: "Merchant Key",
        placeholder: "Enter 16/32-character Paytm Merchant Key",
        type: "password",
        required: true,
      },
      {
        name: "website",
        label: "Website Name",
        placeholder: "WEBSTAGING or DEFAULT",
        type: "select",
        options: ["WEBSTAGING", "DEFAULT", "APPSTAGING"],
      },
      {
        name: "industry_type",
        label: "Industry Type ID",
        placeholder: "Retail",
        type: "select",
        options: ["Retail", "Grocery", "ECommerce", "FoodAndBeverages"],
      },
      {
        name: "channel_id",
        label: "Channel ID",
        placeholder: "WEB",
        type: "select",
        options: ["WEB", "WAP", "POS"],
      },
      {
        name: "pos_tid",
        label: "Paytm Soundbox / EDC Terminal ID",
        placeholder: "PTM-SB-001",
      },
    ],
    toggles: [
      { name: "dynamic_qr", label: "Enable Dynamic QR Code on Checkout & Thermal Receipt", defaultChecked: true },
      { name: "accept_wallet", label: "Accept Paytm Wallet & Paytm Postpaid", defaultChecked: true },
      { name: "soundbox_notify", label: "Trigger Paytm Soundbox voice confirmation", defaultChecked: false },
    ],
  },
  {
    provider: "razorpay",
    title: "Razorpay",
    subtitle: "Cards, UPI, Netbanking, Wallets & Pay Later.",
    badgeText: "RZP",
    badgeBg: "#072654",
    badgeColor: "#3395ff",
    isPrepaid: true,
    modeLabel: "Full-Stack Payment Gateway",
    fields: [
      {
        name: "key_id",
        label: "Razorpay Key ID",
        placeholder: "rzp_test_...",
        required: true,
        helper: "Starts with rzp_test_ for sandbox or rzp_live_ for production.",
      },
      {
        name: "key_secret",
        label: "Razorpay Key Secret",
        placeholder: "Enter Key Secret",
        type: "password",
        required: true,
      },
      {
        name: "webhook_secret",
        label: "Webhook Signing Secret",
        placeholder: "whsec_...",
        type: "password",
      },
      {
        name: "merchant_label",
        label: "Checkout Brand Name",
        placeholder: "Annapurna Supermarket",
      },
      {
        name: "theme_color",
        label: "Checkout Theme Color",
        placeholder: "#6366f1",
      },
      {
        name: "settlement_speed",
        label: "Settlement Mode",
        placeholder: "Standard T+2",
        type: "select",
        options: ["Standard (T+2)", "Instant Settlement", "Same-Day Settlement"],
      },
    ],
    toggles: [
      { name: "auto_capture", label: "Auto-capture authorized payments immediately", defaultChecked: true },
      { name: "accept_upi", label: "Enable UPI & BharatQR on Razorpay Checkout", defaultChecked: true },
      { name: "accept_cards", label: "Enable Credit / Debit Cards & EMI", defaultChecked: true },
      { name: "magic_checkout", label: "Enable 1-Click Magic Checkout", defaultChecked: false },
    ],
  },
  {
    provider: "stripe",
    title: "Stripe",
    subtitle: "Domestic & International Cards, Apple Pay, Google Pay & Link.",
    badgeText: "S",
    badgeBg: "#635bff",
    badgeColor: "#ffffff",
    isPrepaid: true,
    modeLabel: "Global Cards & Wallets",
    fields: [
      {
        name: "key_id",
        label: "Publishable Key",
        placeholder: "pk_test_51...",
        required: true,
      },
      {
        name: "key_secret",
        label: "Secret Key",
        placeholder: "sk_test_51...",
        type: "password",
        required: true,
      },
      {
        name: "webhook_secret",
        label: "Webhook Endpoint Secret",
        placeholder: "whsec_...",
        type: "password",
      },
      {
        name: "currency",
        label: "Settlement Currency",
        placeholder: "INR",
        type: "select",
        options: ["INR (₹)", "USD ($)", "EUR (€)", "GBP (£)", "AED (د.إ)"],
      },
      {
        name: "statement_descriptor",
        label: "Bank Statement Descriptor",
        placeholder: "ANNAPURNA STORE",
      },
      {
        name: "capture_method",
        label: "Capture Strategy",
        placeholder: "Automatic",
        type: "select",
        options: ["Automatic", "Manual (Authorize first)"],
      },
    ],
    toggles: [
      { name: "apple_google_pay", label: "Enable Apple Pay & Google Pay Express Buttons", defaultChecked: true },
      { name: "enforce_3ds", label: "Enforce 3D Secure (SCA / OTP) on all card payments", defaultChecked: true },
      { name: "stripe_link", label: "Enable Stripe Link 1-click autofill", defaultChecked: true },
    ],
  },
  {
    provider: "cod",
    title: "Cash on Delivery (COD)",
    subtitle: "Collect cash or doorstep UPI when the delivery partner hands over the order.",
    badgeText: "₹",
    badgeBg: "#059669",
    badgeColor: "#ffffff",
    isPrepaid: false,
    modeLabel: "Doorstep Collection",
    fields: [
      {
        name: "min_order_rupees",
        label: "Minimum Order Amount for COD (₹)",
        placeholder: "99",
        type: "number",
      },
      {
        name: "max_order_rupees",
        label: "Maximum Order Amount for COD (₹)",
        placeholder: "5000",
        type: "number",
      },
      {
        name: "cod_fee_rupees",
        label: "COD Handling Fee (₹)",
        placeholder: "0",
        type: "number",
      },
      {
        name: "instructions",
        label: "Customer Checkout Instructions",
        placeholder: "Please keep exact change or scan rider UPI QR on delivery.",
      },
    ],
    toggles: [
      { name: "allow_doorstep_upi", label: "Allow customer to scan rider's UPI QR at doorstep", defaultChecked: true },
      { name: "require_otp", label: "Require delivery OTP verification before handover", defaultChecked: true },
    ],
  },
  {
    provider: "pay_at_store",
    title: "Pay at Store (Click & Collect)",
    subtitle: "Customers reserve items online and pay at the store counter on pickup.",
    badgeText: "🏪",
    badgeBg: "#2563eb",
    badgeColor: "#ffffff",
    isPrepaid: false,
    modeLabel: "Store Pickup Counter",
    fields: [
      {
        name: "hold_hours",
        label: "Stock Reservation Hold Duration (Hours)",
        placeholder: "6",
        type: "number",
      },
      {
        name: "pickup_instructions",
        label: "Store Pickup Instructions",
        placeholder: "Show your Order Number at Express Counter #1.",
      },
    ],
    toggles: [
      { name: "allow_khata_pickup", label: "Allow registered Khata customers to add to ledger", defaultChecked: true },
      { name: "priority_packing", label: "Auto-send pickup orders to Pick List immediately", defaultChecked: true },
    ],
  },
];

type TenantSettings = {
  businessName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  cin: string;
  fssai: string;
  drugLicense: string;
  supportEmail: string;
  supportPhone: string;
  registeredAddress: string;
  stateCode: string;
  currency: string;
  timezone: string;
  fiscalYearStart: string;
  invoicePrefix: string;
  posBillPrefix: string;
  onlineOrderPrefix: string;
  creditNotePrefix: string;
  purchaseOrderPrefix: string;
  defaultGstPercent: string;
  taxCalculationMethod: "Exclusive" | "Inclusive";
  enableEinvoice: boolean;
  ewayBillThresholdRupees: string;
  loyaltyEarnPer100: string;
  loyaltyPointValueRupees: string;
  minRedeemPoints: string;
  defaultKhataLimitRupees: string;
  requirePinForVoid: boolean;
  requirePinForDiscount: boolean;
  maxCashierDiscountPercent: string;
  autoLockMinutes: string;
  whatsappEnabled: boolean;
  whatsappSenderNumber: string;
  smsDltEntityId: string;
  smsSenderHeader: string;
  emailReceiptsEnabled: boolean;
  lowStockEmailAlerts: boolean;
};

const defaultTenantSettings: TenantSettings = {
  businessName: "",
  tradeName: "",
  gstin: "",
  pan: "",
  cin: "",
  fssai: "",
  drugLicense: "",
  supportEmail: "",
  supportPhone: "",
  registeredAddress: "",
  stateCode: "29 - Karnataka",
  currency: "INR (₹)",
  timezone: "Asia/Kolkata (IST +05:30)",
  fiscalYearStart: "April 1",
  invoicePrefix: "INV-",
  posBillPrefix: "POS-",
  onlineOrderPrefix: "ORD-",
  creditNotePrefix: "CN-",
  purchaseOrderPrefix: "PO-",
  defaultGstPercent: "5",
  taxCalculationMethod: "Inclusive",
  enableEinvoice: false,
  ewayBillThresholdRupees: "50000",
  loyaltyEarnPer100: "2",
  loyaltyPointValueRupees: "1",
  minRedeemPoints: "25",
  defaultKhataLimitRupees: "10000",
  requirePinForVoid: true,
  requirePinForDiscount: false,
  maxCashierDiscountPercent: "15",
  autoLockMinutes: "30",
  whatsappEnabled: true,
  whatsappSenderNumber: "",
  smsDltEntityId: "",
  smsSenderHeader: "",
  emailReceiptsEnabled: true,
  lowStockEmailAlerts: true,
};

function token() {
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((rowItem) => rowItem.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

function GatewayBrandLogo({ provider, size = "md", className = "" }: { provider: string; size?: "md" | "sm"; className?: string }) {
  const boxClass = className || (
    size === "sm"
      ? "flex h-9 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-1 shadow-2xs overflow-hidden"
      : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-2xs overflow-hidden"
  );

  if (provider === "phonepe") {
    return (
      <div className={boxClass}>
        <img
          src="/logos/phonepe.svg"
          alt="PhonePe"
          className={size === "sm" ? "h-5 w-auto max-w-full object-contain" : "h-7 w-auto max-w-full object-contain"}
        />
      </div>
    );
  }

  if (provider === "paytm") {
    return (
      <div className={boxClass}>
        <img
          src="/logos/paytm.svg"
          alt="Paytm"
          className={size === "sm" ? "h-3.5 w-auto max-w-full object-contain" : "h-5 w-auto max-w-full object-contain"}
        />
      </div>
    );
  }

  if (provider === "razorpay") {
    return (
      <div className={boxClass}>
        <img
          src="/logos/razorpay.png"
          alt="Razorpay"
          className={size === "sm" ? "h-3.5 w-auto max-w-full object-contain" : "h-5 w-auto max-w-full object-contain"}
        />
      </div>
    );
  }

  if (provider === "stripe") {
    return (
      <div className={boxClass}>
        <img
          src="/logos/stripe.png"
          alt="Stripe"
          className={size === "sm" ? "h-3.5 w-auto max-w-full object-contain" : "h-5 w-auto max-w-full object-contain"}
        />
      </div>
    );
  }

  if (provider === "cod") {
    return (
      <div className={`${boxClass} bg-emerald-50/80 border-emerald-200/60`}>
        <Banknote className={size === "sm" ? "h-4.5 w-4.5 text-emerald-600" : "h-6 w-6 text-emerald-600"} />
      </div>
    );
  }

  return (
    <div className={`${boxClass} bg-blue-50/80 border-blue-200/60`}>
      <Store className={size === "sm" ? "h-4.5 w-4.5 text-blue-600" : "h-6 w-6 text-blue-600"} />
    </div>
  );
}

/**
 * Reusable Payment Gateways Component with Enterprise Selection Cards
 */
export function PaymentGatewaysSection({
  rows: externalRows,
  gatewayConfigs: externalConfigs,
  onToggle: externalToggle,
  onSaveSetup: externalSaveSetup,
  hideHeader = false,
}: {
  rows?: GatewayRow[];
  gatewayConfigs?: Record<string, Record<string, unknown>>;
  onToggle?: (provider: string, currentStatus: string) => Promise<void>;
  onSaveSetup?: (
    provider: string,
    isPrepaid: boolean,
    keyId: string,
    keySecret: string,
    config: Record<string, unknown>,
  ) => Promise<boolean>;
  hideHeader?: boolean;
} = {}) {
  const [internalRows, setInternalRows] = useState<GatewayRow[]>([]);
  const [internalConfigs, setInternalConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [activeGateway, setActiveGateway] = useState<string>("phonepe");
  const [savingSetup, setSavingSetup] = useState(false);
  const [showSecretMap, setShowSecretMap] = useState<Record<string, boolean>>({});
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  const loadInternal = useCallback(async () => {
    if (externalRows) return;
    const response = await fetch("/api/v1/gateways", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const body = (await response.json()) as { data: GatewayRow[] };
      setInternalRows(body.data ?? []);
    }
  }, [externalRows]);

  useEffect(() => {
    void loadInternal();
  }, [loadInternal]);

  const rows = externalRows ?? internalRows;
  const gatewayConfigs = externalConfigs ?? internalConfigs;

  const onToggle = async (provider: string, currentStatus: string) => {
    if (externalToggle) {
      await externalToggle(provider, currentStatus);
      return;
    }
    await fetch(`/api/v1/gateways/${provider}`, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token(),
      },
      body: JSON.stringify({ status: currentStatus === "active" ? "inactive" : "active" }),
    });
    await loadInternal();
  };

  const onSaveSetup = async (
    provider: string,
    isPrepaid: boolean,
    keyId: string,
    keySecret: string,
    config: Record<string, unknown>,
  ) => {
    if (externalSaveSetup) {
      return externalSaveSetup(provider, isPrepaid, keyId, keySecret, config);
    }
    setInternalConfigs((prev) => ({ ...prev, [provider]: config }));
    if (isPrepaid && keyId.trim() && keySecret.trim()) {
      const res = await fetch(`/api/v1/gateways/${provider}/credentials`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token(),
        },
        body: JSON.stringify({
          key_id: keyId,
          key_secret: keySecret,
          mode: config.gateway_mode === "test" ? "test" : "live",
          config,
        }),
      });
      await loadInternal();
      return res.ok;
    }
    await fetch(`/api/v1/gateways/${provider}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token(),
      },
      body: JSON.stringify({ status: "active", config }),
    });
    await loadInternal();
    return true;
  };

  const stats = useMemo(() => {
    const total = GATEWAY_CATALOG.length;
    const turnedOn = GATEWAY_CATALOG.filter((g) => {
      const r = rows.find((item) => item.provider === g.provider);
      return r?.status === "active";
    }).length;
    const readyAtCheckout = GATEWAY_CATALOG.filter((g) => {
      const r = rows.find((item) => item.provider === g.provider);
      return r?.status === "active" && (!g.isPrepaid || r.has_credentials);
    }).length;
    return { total, turnedOn, readyAtCheckout };
  }, [rows]);

  const currentMeta = useMemo(
    () => GATEWAY_CATALOG.find((g) => g.provider === activeGateway) ?? GATEWAY_CATALOG[0],
    [activeGateway],
  );

  const currentRow = rows.find((r) => r.provider === currentMeta.provider);
  const isCurrentActive = currentRow?.status === "active";
  const hasCurrentKeys = Boolean(currentRow?.has_credentials);
  const currentSavedCfg = { ...(currentRow?.config ?? {}), ...(gatewayConfigs[currentMeta.provider] ?? {}) };

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/v1/public/webhooks/${currentMeta.provider}`
      : `https://api.yourstore.com/api/v1/public/webhooks/${currentMeta.provider}`;

  function copyWebhook() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Summary Bar (only if not hidden by parent) */}
      {!hideHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              In-Store POS &amp; Counter Billing Payment Gateways (UPI QR &amp; Terminal)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Configure UPI QR code generation, card machines, and counter billing gateways for POS orders. (For online storefront payment methods, configure under Online Store → Payment Gateway)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
              <CreditCard className="h-3.5 w-3.5 text-slate-500" />
              {stats.turnedOn} of {stats.total} Active
            </span>
            <a
              href="/store"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              Preview Storefront
            </a>
          </div>
        </div>
      ) : null}

      {/* Payment Options Selection Cards Grid */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Payment Options &amp; Providers ({GATEWAY_CATALOG.length})
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Select a payment method to configure credentials &amp; checkout rules
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {GATEWAY_CATALOG.map((gw) => {
            const isSelected = activeGateway === gw.provider;
            const row = rows.find((r) => r.provider === gw.provider);
            const isEnabled = row?.status === "active";
            const hasKeys = Boolean(row?.has_credentials);

            return (
              <button
                key={gw.provider}
                type="button"
                onClick={() => {
                  setActiveGateway(gw.provider);
                  setSaveSuccessNotice(null);
                }}
                className={`group relative flex flex-col justify-between rounded-xl p-3 text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "border-2 border-indigo-600 bg-indigo-50/25 shadow-xs ring-2 ring-indigo-500/10"
                    : "border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 hover:shadow-2xs"
                }`}
              >
                {/* Top: Brand Logo + Live Status Pill */}
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <GatewayBrandLogo provider={gw.provider} size="sm" />
                  {isEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Off
                    </span>
                  )}
                </div>

                {/* Middle: Gateway Name & Mode Subtitle */}
                <div className="mt-3 w-full">
                  <h3
                    className={`text-xs font-semibold truncate transition ${
                      isSelected ? "text-indigo-900" : "text-slate-900 group-hover:text-indigo-600"
                    }`}
                  >
                    {gw.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                    {gw.modeLabel || (gw.isPrepaid ? "Online Prepayment" : "Offline Collection")}
                  </p>
                </div>

                {/* Bottom: Selection Status Cue & Key Badge */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 w-full flex items-center justify-between text-[10px]">
                  {isSelected ? (
                    <span className="font-semibold text-indigo-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Selected
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium group-hover:text-slate-600">
                      Configure
                    </span>
                  )}
                  {gw.isPrepaid && hasKeys ? (
                    <span
                      className="inline-flex items-center gap-0.5 text-indigo-600 text-[10px] font-medium"
                      title="API credentials saved"
                    >
                      <KeyRound className="h-2.5 w-2.5" />
                      Ready
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Gateway Detail Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
        {/* Detail Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <GatewayBrandLogo provider={currentMeta.provider} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {currentMeta.title}
                </h2>
                {isCurrentActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 size={11} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                    Disabled
                  </span>
                )}
                {currentMeta.isPrepaid && hasCurrentKeys ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                    <KeyRound size={10} />
                    Keys Configured
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500 max-w-xl">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">
              {isCurrentActive ? "Accepting payments" : "Disabled"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isCurrentActive}
              onClick={() => void onToggle(currentMeta.provider, isCurrentActive ? "active" : "disabled")}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                isCurrentActive ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                  isCurrentActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {saveSuccessNotice ? (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
            <span>{saveSuccessNotice}</span>
            <button type="button" onClick={() => setSaveSuccessNotice(null)} className="text-emerald-700 hover:text-emerald-900">
              ✕
            </button>
          </div>
        ) : null}

        {/* Two-Column Grid: Left Configuration Form, Right Webhook & Setup Steps */}
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          {/* Left Column: Credentials & Operational Settings (7 cols) */}
          <div className="lg:col-span-7">
            <form
              key={currentMeta.provider}
              onSubmit={async (e) => {
                e.preventDefault();
                setSavingSetup(true);
                setSaveSuccessNotice(null);
                const formData = new FormData(e.currentTarget);
                const keyId = String(formData.get("key_id") ?? "").trim();
                const keySecret = String(formData.get("key_secret") ?? "").trim();
                const extraConfig: Record<string, unknown> = {};

                currentMeta.fields.forEach((f) => {
                  if (f.name !== "key_id" && f.name !== "key_secret") {
                    extraConfig[f.name] = String(formData.get(f.name) ?? "");
                  }
                });
                currentMeta.toggles.forEach((t) => {
                  extraConfig[t.name] = formData.get(t.name) === "on";
                });
                if (currentMeta.isPrepaid) {
                  extraConfig.gateway_mode = String(formData.get("gateway_mode") ?? "live");
                }

                try {
                  const ok = await onSaveSetup(
                    currentMeta.provider,
                    currentMeta.isPrepaid,
                    keyId,
                    keySecret,
                    extraConfig,
                  );
                  if (ok) {
                    setSaveSuccessNotice(`${currentMeta.title} configuration updated successfully.`);
                  }
                } finally {
                  setSavingSetup(false);
                }
              }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  API Credentials & Parameters
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Keys are stored encrypted and used securely during online customer checkout.
                </p>
              </div>

              {currentMeta.isPrepaid ? (
                <label className="block text-xs font-semibold text-slate-700">
                  Environment
                  <select
                    name="gateway_mode"
                    defaultValue={currentRow?.mode === "test" ? "test" : "live"}
                    key={`${currentMeta.provider}-${currentRow?.mode ?? "live"}`}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900"
                  >
                    <option value="live">Live — production Merchant ID</option>
                    <option value="test">Test — sandbox Merchant ID only</option>
                  </select>
                  <span className="mt-1 block font-normal text-slate-500">
                    Use Live for the Merchant ID, salt key, salt index, and Provider ID from PhonePe production. Test only works with a sandbox MID such as PGTESTPAYUAT.
                  </span>
                </label>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                {currentMeta.fields.map((field) => {
                  const defaultVal =
                    field.name === "key_id" || field.name === "key_secret"
                      ? ""
                      : String(currentSavedCfg[field.name] ?? "");
                  const isSecret = field.type === "password" || field.name === "key_secret" || field.name === "webhook_secret";
                  const showSecret = Boolean(showSecretMap[field.name]);

                  return (
                    <div
                      key={`${currentMeta.provider}-${field.name}`}
                      className={
                        field.name === "callback_url" ||
                        field.name === "webhook_url" ||
                        field.name === "instructions" ||
                        field.name === "pickup_instructions"
                          ? "sm:col-span-2"
                          : ""
                      }
                    >
                      <label className="block text-xs font-semibold text-slate-700">
                        {field.label} {field.required ? <span className="text-rose-500">*</span> : null}
                      </label>
                      <div className="relative mt-1.5">
                        {field.type === "select" ? (
                          <select
                            name={field.name}
                            defaultValue={defaultVal || field.options?.[0]}
                            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
                          >
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-900 focus-within:bg-white">
                            <input
                              name={field.name}
                              type={isSecret ? (showSecret ? "text" : "password") : field.type ?? "text"}
                              required={field.required}
                              minLength={field.name === "key_secret" ? 8 : undefined}
                              defaultValue={defaultVal}
                              placeholder={field.placeholder}
                              autoComplete="off"
                              className="h-full w-full bg-transparent text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
                            />
                            {isSecret ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setShowSecretMap((prev) => ({ ...prev, [field.name]: !prev[field.name] }))
                                }
                                className="text-slate-400 hover:text-slate-600 ml-1.5"
                                aria-label="Toggle secret visibility"
                              >
                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                      {field.helper ? (
                        <p className="mt-1 text-[11px] font-medium text-slate-400">{field.helper}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Checkout Capabilities & Feature Toggles */}
              {currentMeta.toggles.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Checkout Capabilities & Rules
                  </div>
                  <div className="space-y-2">
                    {currentMeta.toggles.map((t) => {
                      const checked =
                        currentSavedCfg[t.name] !== undefined
                          ? Boolean(currentSavedCfg[t.name])
                          : t.defaultChecked;

                      return (
                        <label
                          key={t.name}
                          className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            name={t.name}
                            defaultChecked={checked}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                          />
                          <span>{t.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="submit" variant="primary" disabled={savingSetup} className="font-semibold text-xs">
                  <Check size={14} className="mr-1.5" />
                  {savingSetup ? "Saving configuration..." : `Save ${currentMeta.title} Changes`}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Webhook URL & Setup Guide Checklist (5 cols) */}
          <div className="space-y-5 lg:col-span-5">
            {/* Webhook Endpoint Box (Matching Super Admin) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">Webhook Notification URL</span>
                <button
                  type="button"
                  onClick={copyWebhook}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <Copy size={12} />
                  {copiedWebhook ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Add this endpoint in your {currentMeta.title} developer portal to receive instant order payment confirmations.
              </p>
              <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-700 break-all select-all">
                {webhookUrl}
              </div>
            </div>

            {/* Integration Guide Checklist */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Setup Checklist
              </h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-800">
                    1
                  </span>
                  <span>Sign in to your {currentMeta.title} merchant dashboard.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-800">
                    2
                  </span>
                  <span>Navigate to API Keys / Credentials and copy your Key ID and Secret.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-800">
                    3
                  </span>
                  <span>Paste the credentials on the left and configure settlement rules.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-800">
                    4
                  </span>
                  <span>Turn on the gateway toggle switch to make it live on your store checkout.</span>
                </li>
              </ul>
            </div>

            {/* Supported Tender Methods Badges */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Supported Tender Modes
              </h4>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {currentMeta.isPrepaid ? (
                  <>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">UPI / QR</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">Visa / Mastercard</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">RuPay</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">Netbanking</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">Wallets</span>
                  </>
                ) : (
                  <>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">Doorstep Cash</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">Delivery Rider UPI QR</span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">Store Pickup Counter</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type TenantSettingsSectionId =
  | "profile"
  | "pos"
  | "taxes"
  | "receipt"
  | "loyalty"
  | "hours"
  | "gateways"
  | "theme"
  | "api"
  | "security";

export type LoyaltyProgramSettings = {
  enabled: boolean;
  posEnabled: boolean;
  onlineEnabled: boolean;
  earnRupeesPerPoint: number;
  minOrderToEarnRupees: number;
  welcomeBonusPoints: number;
  firstOrderBonusPoints: number;
  excludeDiscountedItems: boolean;
  redeemPaisePerPoint: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  maxRedeemRupeesCap: number;
  expiryMonths: number;
  tiers: {
    id: string;
    name: string;
    minLifetimePoints: number;
    multiplier: number;
    perkDescription: string;
  }[];
};

export const defaultLoyaltyProgram: LoyaltyProgramSettings = {
  enabled: true,
  posEnabled: true,
  onlineEnabled: true,
  earnRupeesPerPoint: 100,
  minOrderToEarnRupees: 100,
  welcomeBonusPoints: 25,
  firstOrderBonusPoints: 50,
  excludeDiscountedItems: false,
  redeemPaisePerPoint: 100,
  minRedeemPoints: 25,
  maxRedeemPercent: 50,
  maxRedeemRupeesCap: 500,
  expiryMonths: 12,
  tiers: [
    { id: "bronze", name: "Bronze Member", minLifetimePoints: 0, multiplier: 1.0, perkDescription: "Base 1x reward points accrual on all eligible POS & Online bills" },
    { id: "silver", name: "Silver Tier", minLifetimePoints: 250, multiplier: 1.25, perkDescription: "1.25x accelerated point earning + priority festival coupon access" },
    { id: "gold", name: "Gold Tier", minLifetimePoints: 750, multiplier: 1.5, perkDescription: "1.5x point earning + priority doorstep slot reservation" },
    { id: "platinum", name: "Platinum VIP", minLifetimePoints: 2000, multiplier: 2.0, perkDescription: "2x double reward points + dedicated VIP support & free express delivery" },
  ],
};

const SECTION_META: Record<
  TenantSettingsSectionId,
  { title: string; subtitle: string }
> = {
  profile: {
    title: "Store & Business Profile",
    subtitle: "Configure your store's legal identity, trade name, contact details, currency, and regional defaults.",
  },
  pos: {
    title: "POS & Billing Terminal",
    subtitle: "Configure product tap audio feedback, barcode scanner behavior, negative stock rules, and thermal print defaults.",
  },
  taxes: {
    title: "GST, Taxes & Statutory Compliance",
    subtitle: "Manage GSTIN, PAN, FSSAI, Drug License, default GST slabs, inclusive/exclusive pricing, and e-Way bill rules.",
  },
  receipt: {
    title: "Receipt, Invoice Series & Khata",
    subtitle: "Customize sequential invoice numbering prefixes, thermal receipt footer, and default customer Khata limits.",
  },
  loyalty: {
    title: "Loyalty Points & Customer Rewards Program",
    subtitle: "Configure omnichannel points earning rules, redemption caps, rupee valuation, and VIP membership tiers across POS and Online Storefront.",
  },
  hours: {
    title: "Business Hours & Storefront Banner",
    subtitle: "Set daily store operating hours and manage the top announcement bar shown on your online storefront.",
  },
  gateways: {
    title: "Payment Gateways (POS & Online Store)",
    subtitle: "Configure UPI QR codes, card machines, counter billing terminals, and online checkout payment gateways.",
  },
  theme: {
    title: "Theme & Brand Appearance",
    subtitle: "Switch between Light and Dark mode and select your organization's primary brand accent colour.",
  },
  api: {
    title: "API, Webhooks & Messaging Channels",
    subtitle: "Configure WhatsApp Business Cloud, TRAI DLT SMS, email alerts, and outbound webhook integrations.",
  },
  security: {
    title: "Security, Cashier PIN & Access Policies",
    subtitle: "Enforce supervisor PIN approvals for bill voids and discounts, and configure register auto-lock timers.",
  },
};

const THEME_PALETTES = [
  { id: "violet", label: "Royal Violet", desc: "Modern SaaS & Retail ERP default", hex: "#6c47ff" },
  { id: "blue", label: "Enterprise Blue", desc: "Classic corporate & financial", hex: "#2563eb" },
  { id: "emerald", label: "Emerald Green", desc: "Supermarket & grocery fresh", hex: "#059669" },
  { id: "indigo", label: "Deep Indigo", desc: "High-contrast executive", hex: "#4f46e5" },
  { id: "teal", label: "Ocean Teal", desc: "Pharmacy & healthcare retail", hex: "#0d9488" },
  { id: "rose", label: "Crimson Rose", desc: "Fashion, lifestyle & boutique", hex: "#e11d48" },
  { id: "amber", label: "Warm Amber", desc: "Bakery, cafe & quick-service", hex: "#d97706" },
  { id: "slate", label: "Graphite Slate", desc: "Minimal monochrome hardware", hex: "#334155" },
] as const;

export function SettingsWorkspace({ section = "profile" }: { section?: TenantSettingsSectionId }) {
  const activeSection: TenantSettingsSectionId = SECTION_META[section] ? section : "profile";
  const [rows, setRows] = useState<GatewayRow[]>([]);
  const [gatewayConfigs, setGatewayConfigs] = useState<Record<string, Record<string, unknown>>>({});
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "bad" } | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [footer, setFooter] = useState("Thank you for shopping with us!");
  const [opens, setOpens] = useState("09:00");
  const [closes, setCloses] = useState("21:30");
  const [announcement, setAnnouncement] = useState("");
  const [tenantCfg, setTenantCfg] = useState<TenantSettings>(defaultTenantSettings);
  const [loyaltyCfg, setLoyaltyCfg] = useState<LoyaltyProgramSettings>(defaultLoyaltyProgram);
  const [onlineStoreSettingsRaw, setOnlineStoreSettingsRaw] = useState<Record<string, unknown>>({});
  const [loyaltyMetrics, setLoyaltyMetrics] = useState<{
    enrolledMembers: number;
    activePointsBalance: number;
    vipMembers: number;
  }>({ enrolledMembers: 0, activePointsBalance: 0, vipMembers: 0 });
  const [simBillAmount, setSimBillAmount] = useState<number>(1000);

  // POS sound & terminal settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundTone, setSoundTone] = useState<"beep" | "click" | "chime" | "pop">("beep");
  const [soundVolume, setSoundVolume] = useState(0.7);
  const [allowOversell, setAllowOversell] = useState(true);
  const [autoPrint, setAutoPrint] = useState(false);
  const [paperSize, setPaperSize] = useState<"80mm" | "58mm" | "A4">("80mm");

  // Theme & Accent state
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
  const [currentAccent, setCurrentAccent] = useState<string>("violet");

  useEffect(() => {
    if (typeof document !== "undefined") {
      setCurrentTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
      setCurrentAccent(window.localStorage.getItem("selfx-accent") || document.documentElement.dataset.accent || "violet");
    }
  }, []);

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/gateways", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) {
      window.location.href = "/login";
      return;
    }
    if (response.ok) {
      setRows(((await response.json()) as { data: GatewayRow[] }).data);
    }
    const me = await fetch("/api/v1/auth/staff/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!me.ok) return;
    const meBody = (await me.json()) as {
      data?: {
        email?: string;
        tenant?: { name?: string; slug?: string };
        store?: { id: string; name?: string; slug?: string };
      };
    };
    const id = meBody.data?.store?.id;
    if (!id) return;
    setStoreId(id);

    const [receipt, hours, custRes] = await Promise.all([
      fetch(`/api/v1/stores/${id}/receipt`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch(`/api/v1/stores/${id}/hours`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch("/api/v1/customers", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
    ]);

    if (custRes.ok) {
      try {
        const cBody = (await custRes.json()) as { data?: { id: string; loyalty_points?: number }[] };
        const list = cBody.data ?? [];
        const enrolled = list.length;
        const totalPts = list.reduce((sum, c) => sum + (Number(c.loyalty_points) || 0), 0);
        const vips = list.filter((c) => (Number(c.loyalty_points) || 0) >= 250).length;
        setLoyaltyMetrics({ enrolledMembers: enrolled, activePointsBalance: totalPts, vipMembers: vips });
      } catch {
        // ignore
      }
    }

    if (receipt.ok) {
      const rBody = (await receipt.json()) as {
        data: {
          receipt_footer?: string;
          pos_settings?: Record<string, unknown>;
          online_store_settings?: Record<string, unknown>;
          tenant_settings?: Partial<TenantSettings>;
          gateway_configs?: Record<string, Record<string, unknown>>;
        };
      };
      if (rBody.data.receipt_footer) setFooter(rBody.data.receipt_footer);
      if (rBody.data.online_store_settings) {
        setOnlineStoreSettingsRaw(rBody.data.online_store_settings);
        const savedLoyalty = rBody.data.online_store_settings.loyalty as Partial<LoyaltyProgramSettings> | undefined;
        if (savedLoyalty && typeof savedLoyalty === "object") {
          setLoyaltyCfg((prev) => ({
            ...prev,
            ...savedLoyalty,
            tiers: Array.isArray(savedLoyalty.tiers) && savedLoyalty.tiers.length > 0 ? savedLoyalty.tiers : prev.tiers,
          }));
        }
      }
      setTenantCfg((prev) => ({
        ...prev,
        ...(rBody.data.tenant_settings ?? {}),
        businessName:
          rBody.data.tenant_settings?.businessName ||
          meBody.data?.tenant?.name ||
          meBody.data?.store?.name ||
          prev.businessName,
        tradeName:
          rBody.data.tenant_settings?.tradeName ||
          meBody.data?.store?.name ||
          meBody.data?.tenant?.name ||
          prev.tradeName,
        supportEmail:
          rBody.data.tenant_settings?.supportEmail ||
          meBody.data?.email ||
          prev.supportEmail,
      }));
      if (rBody.data.gateway_configs) {
        setGatewayConfigs(rBody.data.gateway_configs);
      }
      if (rBody.data.pos_settings) {
        const ps = rBody.data.pos_settings;
        if (typeof ps.tapSound === "boolean") setSoundEnabled(ps.tapSound);
        if (typeof ps.soundTone === "string") setSoundTone(ps.soundTone as typeof soundTone);
        if (typeof ps.soundVolume === "number") setSoundVolume(ps.soundVolume);
        if (typeof ps.allowOversell === "boolean") setAllowOversell(ps.allowOversell);
      }
    }

    if (hours.ok) {
      const body = (await hours.json()) as { data: { open: string | null; close: string | null } };
      if (body.data.open) setOpens(body.data.open);
      if (body.data.close) setCloses(body.data.close);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleGateway(provider: string, currentStatus: string) {
    const response = await fetch(`/api/v1/gateways/${provider}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token(),
      },
      body: JSON.stringify({ status: currentStatus === "active" ? "disabled" : "active" }),
    });
    const body = (await response.json()) as { data?: GatewayRow[]; error?: { message: string } };
    if (!response.ok) {
      setNotice({
        text: body.error?.message ?? "Click 'Set up' and save your credentials before turning this gateway on.",
        tone: "bad",
      });
      return;
    }
    setRows(body.data ?? []);
    setNotice({
      text: `${provider.toUpperCase()} gateway ${currentStatus === "active" ? "turned off" : "enabled for checkout"}.`,
      tone: "ok",
    });
  }

  async function saveGatewaySetup(
    provider: string,
    isPrepaid: boolean,
    keyId: string,
    keySecret: string,
    config: Record<string, unknown>,
  ): Promise<boolean> {
    if (isPrepaid) {
      const response = await fetch(`/api/v1/gateways/${provider}/credentials`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token(),
        },
        body: JSON.stringify({
          key_id: keyId,
          key_secret: keySecret,
          mode: config.gateway_mode === "test" ? "test" : "live",
          config,
        }),
      });
      const body = (await response.json()) as { data?: GatewayRow[]; error?: { message: string } };
      if (!response.ok) {
        setNotice({ text: body.error?.message ?? "Could not save gateway keys.", tone: "bad" });
        return false;
      }
      setRows(body.data ?? []);
      setGatewayConfigs((prev) => ({ ...prev, [provider]: config }));
      setNotice({
        text: `${provider.toUpperCase()} credentials & configuration saved. Toggle the switch to accept payments.`,
        tone: "ok",
      });
      return true;
    }

    const nextGw = { ...gatewayConfigs, [provider]: config };
    setGatewayConfigs(nextGw);
    const patchRes = await fetch(`/api/v1/gateways/${provider}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token(),
      },
      body: JSON.stringify({ status: "active", config }),
    });
    if (patchRes.ok) {
      const pBody = (await patchRes.json()) as { data?: GatewayRow[] };
      if (pBody.data) setRows(pBody.data);
    }
    setNotice({ text: `${provider.replace("_", " ").toUpperCase()} rules & credentials saved.`, tone: "ok" });
    return true;
  }

  async function saveTenantSettings(e: FormEvent) {
    e.preventDefault();
    if (!storeId) return;
    const posPatch = {
      tapSound: soundEnabled,
      soundTone,
      soundVolume,
      allowOversell,
      autoPrint,
      paperSize,
    };
    try {
      const existing = JSON.parse(localStorage.getItem("selfx-pos-settings-v2") ?? "{}");
      localStorage.setItem("selfx-pos-settings-v2", JSON.stringify({ ...existing, ...posPatch }));
    } catch {
      // ignore
    }

    const nextOnlineStore = {
      ...onlineStoreSettingsRaw,
      loyalty: loyaltyCfg,
    };
    setOnlineStoreSettingsRaw(nextOnlineStore);

    const syncedTenantCfg: TenantSettings = {
      ...tenantCfg,
      loyaltyEarnPer100: String(Math.max(1, Math.round(100 / Math.max(1, loyaltyCfg.earnRupeesPerPoint)))),
      loyaltyPointValueRupees: String((loyaltyCfg.redeemPaisePerPoint / 100).toFixed(2)),
      minRedeemPoints: String(loyaltyCfg.minRedeemPoints),
    };
    setTenantCfg(syncedTenantCfg);

    const res = await fetch(`/api/v1/stores/${storeId}/receipt`, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token(),
      },
      body: JSON.stringify({
        receipt_footer: footer,
        tenant_settings: syncedTenantCfg,
        pos_settings: posPatch,
        online_store_settings: nextOnlineStore,
      }),
    });
    setNotice(
      res.ok
        ? { text: "Settings saved & synced across your store workspace.", tone: "ok" }
        : { text: "Could not save settings.", tone: "bad" },
    );
  }

  async function saveHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) return;
    const response = await fetch(`/api/v1/stores/${storeId}/hours`, {
      method: "PUT",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token(),
      },
      body: JSON.stringify({ open: opens, close: closes }),
    });
    const body = (await response.json()) as { error?: { message: string } };
    setNotice(
      response.ok
        ? { text: "Shop operating hours saved.", tone: "ok" }
        : { text: body.error?.message ?? "The hours were not saved.", tone: "bad" },
    );
  }

  const meta = SECTION_META[activeSection];

  return (
    <div className="space-y-5 pb-12">
      {/* Breadcrumb + Dedicated Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span>Settings</span>
            <span>/</span>
            <span className="font-semibold text-slate-700">{meta.title}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{meta.title}</h1>
          <p className="mt-0.5 text-xs text-slate-500">{meta.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {activeSection === "gateways" ? (
            <a
              href="/store"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-ink hover:bg-bg"
            >
              <ExternalLink size={14} className="text-accent" />
              Preview Storefront
            </a>
          ) : (
            <Link
              href="/printer-setup"
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[12.5px] font-semibold text-ink hover:bg-bg"
            >
              <Printer size={14} className="text-accent" />
              Printer Setup
            </Link>
          )}
          <Link
            href="/online-store/settings"
            className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-3.5 text-[12.5px] font-semibold text-accent-ink shadow-2xs hover:opacity-95"
          >
            <Store size={14} />
            Online Store Settings
          </Link>
        </div>
      </div>

      {notice ? (
        <div
          className={`flex items-center justify-between rounded-[12px] border px-4 py-3 text-sm font-medium ${
            notice.tone === "bad"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      {/* 1. STORE & BUSINESS PROFILE (/settings/profile) */}
      {activeSection === "profile" ? (
        <form
          onSubmit={(e) => void saveTenantSettings(e)}
          className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent-soft text-accent">
                <Building2 size={18} />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Organization &amp; Store Identity</h2>
                <p className="text-[12px] text-muted">
                  Displayed on customer invoices, POS receipts, and online storefront header
                </p>
              </div>
            </div>
            <Button type="submit" variant="primary">
              <Save size={15} className="mr-1.5" />
              Save Store Profile
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-[12.5px] font-semibold text-ink">
              Legal Business Name *
              <input
                value={tenantCfg.businessName}
                onChange={(e) => setTenantCfg({ ...tenantCfg, businessName: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold text-ink">
              Store Trade / Brand Name *
              <input
                value={tenantCfg.tradeName}
                onChange={(e) => setTenantCfg({ ...tenantCfg, tradeName: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold text-ink">
              Place of Supply (State Code)
              <input
                value={tenantCfg.stateCode}
                onChange={(e) => setTenantCfg({ ...tenantCfg, stateCode: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[12.5px] font-semibold text-ink">
              Support Email
              <input
                type="email"
                value={tenantCfg.supportEmail}
                onChange={(e) => setTenantCfg({ ...tenantCfg, supportEmail: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold text-ink">
              Customer Care Phone
              <input
                value={tenantCfg.supportPhone}
                onChange={(e) => setTenantCfg({ ...tenantCfg, supportPhone: e.target.value })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold text-ink">
              Base Currency
              <select
                value={tenantCfg.currency}
                onChange={(e) => setTenantCfg({ ...tenantCfg, currency: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              >
                <option value="INR (₹)">Indian Rupee — INR (₹)</option>
                <option value="USD ($)">US Dollar — USD ($)</option>
                <option value="AED (د.إ)">UAE Dirham — AED (د.إ)</option>
              </select>
            </label>

            <label className="block text-[12.5px] font-semibold text-ink sm:col-span-3">
              Registered Street Address
              <input
                value={tenantCfg.registeredAddress}
                onChange={(e) => setTenantCfg({ ...tenantCfg, registeredAddress: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[12.5px] font-semibold text-ink">
              Store Timezone
              <select
                value={tenantCfg.timezone}
                onChange={(e) => setTenantCfg({ ...tenantCfg, timezone: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              >
                <option value="Asia/Kolkata (IST +05:30)">Asia/Kolkata (IST +05:30)</option>
                <option value="Asia/Dubai (GST +04:00)">Asia/Dubai (GST +04:00)</option>
                <option value="UTC">UTC</option>
              </select>
            </label>

            <label className="block text-[12.5px] font-semibold text-ink">
              Financial Year Start
              <select
                value={tenantCfg.fiscalYearStart}
                onChange={(e) => setTenantCfg({ ...tenantCfg, fiscalYearStart: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              >
                <option value="April 1">April 1 (India FY)</option>
                <option value="January 1">January 1 (Calendar Year)</option>
              </select>
            </label>
          </div>
        </form>
      ) : null}

      {/* 2. POS & BILLING TERMINAL (/settings/pos) */}
      {activeSection === "pos" ? (
        <form
          onSubmit={(e) => void saveTenantSettings(e)}
          className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent-soft text-accent">
                <Sliders size={18} />
              </span>
              <div>
                <h2 className="text-[15px] font-semibold text-ink">POS Terminal &amp; Product Tap Audio</h2>
                <p className="text-[12px] text-muted">
                  Configure audio feedback on product tap, negative stock rules, and receipt defaults
                </p>
              </div>
            </div>
            <Button type="submit" variant="primary">
              <Save size={15} className="mr-1.5" />
              Save POS Settings
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-[12px] border border-line bg-bg/50 p-5">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <Volume2 size={16} className="text-accent" />
                Sound on Tap Audio Engine
              </div>
              <label className="flex items-center justify-between text-[13px] font-medium">
                <span>Play Sound When Tapping Products / Buttons</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
              </label>
              <label className="block text-[12.5px] font-semibold">
                Tone Style
                <select
                  value={soundTone}
                  onChange={(e) => setSoundTone(e.target.value as typeof soundTone)}
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm font-normal"
                >
                  <option value="beep">Scanner Beep (Classic)</option>
                  <option value="click">Crisp Tactile Click</option>
                  <option value="chime">Harmonic Chime</option>
                  <option value="pop">Soft Bubble Pop</option>
                </select>
              </label>
              <label className="block text-[12.5px] font-semibold">
                Volume ({Math.round(soundVolume * 100)}%)
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  className="mt-2 w-full accent-[#6366f1]"
                />
              </label>
            </div>

            <div className="space-y-4 rounded-[12px] border border-line bg-bg/50 p-5">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                <Monitor size={16} className="text-accent" />
                Checkout &amp; Stock Rules
              </div>
              <label className="flex items-center justify-between text-[13px] font-medium">
                <span>Allow Selling When Stock is 0 (Never Block POS Sale)</span>
                <input
                  type="checkbox"
                  checked={allowOversell}
                  onChange={(e) => setAllowOversell(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
              </label>
              <label className="flex items-center justify-between text-[13px] font-medium">
                <span>Auto-Print Receipt After Payment</span>
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
              </label>
              <label className="block text-[12.5px] font-semibold">
                Default Receipt Paper Size
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as typeof paperSize)}
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm font-normal"
                >
                  <option value="80mm">80mm Thermal Roll</option>
                  <option value="58mm">58mm Compact Roll</option>
                  <option value="A4">A4 Full Tax Invoice</option>
                </select>
              </label>
              <label className="block text-[12.5px] font-semibold">
                Receipt Footer Text
                <input
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm font-normal"
                />
              </label>
            </div>
          </div>
        </form>
      ) : null}

      {/* 3. GST, TAXES & STATUTORY COMPLIANCE (/settings/taxes) */}
      {activeSection === "taxes" ? (
        <form
          onSubmit={(e) => void saveTenantSettings(e)}
          className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">GSTIN, Statutory Licenses &amp; Tax Calculation</h2>
              <p className="text-[12px] text-muted">
                Configure CGST/SGST/IGST rules, statutory numbers, and e-Way bill thresholds
              </p>
            </div>
            <Button type="submit" variant="primary">
              <Save size={15} className="mr-1.5" />
              Save Tax Settings
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-[12.5px] font-semibold text-ink">
              GSTIN (15-Digit)
              <input
                value={tenantCfg.gstin}
                onChange={(e) => setTenantCfg({ ...tenantCfg, gstin: e.target.value.toUpperCase() })}
                placeholder="29AAAAA0000A1Z5"
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal uppercase"
              />
            </label>
            <label className="block text-[12.5px] font-semibold text-ink">
              PAN Number
              <input
                value={tenantCfg.pan}
                onChange={(e) => setTenantCfg({ ...tenantCfg, pan: e.target.value.toUpperCase() })}
                placeholder="AAAAA0000A"
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal uppercase"
              />
            </label>
            <label className="block text-[12.5px] font-semibold text-ink">
              CIN / Registration Number
              <input
                value={tenantCfg.cin}
                onChange={(e) => setTenantCfg({ ...tenantCfg, cin: e.target.value.toUpperCase() })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal uppercase"
              />
            </label>

            <label className="block text-[12.5px] font-semibold text-ink">
              FSSAI Food License No.
              <input
                value={tenantCfg.fssai}
                onChange={(e) => setTenantCfg({ ...tenantCfg, fssai: e.target.value })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold text-ink">
              Drug License No. (Pharmacy)
              <input
                value={tenantCfg.drugLicense}
                onChange={(e) => setTenantCfg({ ...tenantCfg, drugLicense: e.target.value })}
                placeholder="DL-20B / 21B"
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold text-ink">
              Default GST Slab (%)
              <select
                value={tenantCfg.defaultGstPercent}
                onChange={(e) => setTenantCfg({ ...tenantCfg, defaultGstPercent: e.target.value })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              >
                <option value="0">0% (Exempt / Unbranded Staples)</option>
                <option value="5">5% (Packaged Grocery &amp; Essentials)</option>
                <option value="12">12% (Processed Foods &amp; Apparel)</option>
                <option value="18">18% (FMCG, Personal Care &amp; Electronics)</option>
                <option value="28">28% (Luxury &amp; Aerated Beverages)</option>
              </select>
            </label>

            <label className="block text-[12.5px] font-semibold text-ink">
              Tax Calculation Mode
              <select
                value={tenantCfg.taxCalculationMethod}
                onChange={(e) =>
                  setTenantCfg({
                    ...tenantCfg,
                    taxCalculationMethod: e.target.value as "Inclusive" | "Exclusive",
                  })
                }
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              >
                <option value="Inclusive">MRP is GST Inclusive (Retail Standard)</option>
                <option value="Exclusive">Add GST on Top of Base Price (B2B Wholesale)</option>
              </select>
            </label>

            <label className="block text-[12.5px] font-semibold text-ink">
              e-Way Bill Mandatory Threshold (₹)
              <input
                type="number"
                value={tenantCfg.ewayBillThresholdRupees}
                onChange={(e) => setTenantCfg({ ...tenantCfg, ewayBillThresholdRupees: e.target.value })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="flex items-center gap-2.5 self-end rounded-[8px] border border-line bg-bg px-3.5 py-2.5 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={tenantCfg.enableEinvoice}
                onChange={(e) => setTenantCfg({ ...tenantCfg, enableEinvoice: e.target.checked })}
                className="h-4 w-4 rounded accent-[#6366f1]"
              />
              <span>Enable B2B IRN e-Invoicing QR Code</span>
            </label>
          </div>
        </form>
      ) : null}

      {/* 4. RECEIPT, INVOICE SERIES & LOYALTY (/settings/receipt) */}
      {activeSection === "receipt" ? (
        <form
          onSubmit={(e) => void saveTenantSettings(e)}
          className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs space-y-6"
        >
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Document Numbering Prefixes, Loyalty &amp; Khata Rules</h2>
              <p className="text-[12px] text-muted">
                Customize sequential series prefixes and customer reward points accrual
              </p>
            </div>
            <Button type="submit" variant="primary">
              <Save size={15} className="mr-1.5" />
              Save Invoicing &amp; Loyalty
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-5">
            <label className="block text-[12px] font-semibold">
              POS Bill Prefix
              <input
                value={tenantCfg.posBillPrefix}
                onChange={(e) => setTenantCfg({ ...tenantCfg, posBillPrefix: e.target.value })}
                className="num mt-1 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12px] font-semibold">
              Tax Invoice Prefix
              <input
                value={tenantCfg.invoicePrefix}
                onChange={(e) => setTenantCfg({ ...tenantCfg, invoicePrefix: e.target.value })}
                className="num mt-1 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12px] font-semibold">
              Online Order Prefix
              <input
                value={tenantCfg.onlineOrderPrefix}
                onChange={(e) => setTenantCfg({ ...tenantCfg, onlineOrderPrefix: e.target.value })}
                className="num mt-1 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12px] font-semibold">
              Credit Note Prefix
              <input
                value={tenantCfg.creditNotePrefix}
                onChange={(e) => setTenantCfg({ ...tenantCfg, creditNotePrefix: e.target.value })}
                className="num mt-1 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12px] font-semibold">
              Purchase Order Prefix
              <input
                value={tenantCfg.purchaseOrderPrefix}
                onChange={(e) => setTenantCfg({ ...tenantCfg, purchaseOrderPrefix: e.target.value })}
                className="num mt-1 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
          </div>

          <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <label className="block text-[12px] font-semibold">
              Default Customer Khata Limit (₹)
              <input
                type="number"
                value={tenantCfg.defaultKhataLimitRupees}
                onChange={(e) => setTenantCfg({ ...tenantCfg, defaultKhataLimitRupees: e.target.value })}
                className="num mt-1 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <div className="flex items-center justify-between rounded-[10px] border border-indigo-200/80 bg-indigo-50/40 p-3.5">
              <div>
                <div className="text-xs font-semibold text-slate-900">Loyalty Points &amp; Customer Rewards</div>
                <div className="text-[11px] text-slate-500">Manage earning rates, redemption rules, and VIP tiers in dedicated settings</div>
              </div>
              <Link
                href="/settings/loyalty"
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#6c47ff] px-3 text-xs font-semibold text-white hover:bg-[#5b3ae6]"
              >
                Configure Loyalty
              </Link>
            </div>
          </div>
        </form>
      ) : null}

      {/* 4B. DEDICATED LOYALTY POINTS & REWARDS PROGRAM (/settings/loyalty) */}
      {activeSection === "loyalty" ? (
        <form onSubmit={(e) => void saveTenantSettings(e)} className="space-y-6">
          {/* Live Program Telemetry Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[14px] border border-line bg-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Program Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    loyaltyCfg.enabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${loyaltyCfg.enabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {loyaltyCfg.enabled ? "Active Omnichannel" : "Paused"}
                </span>
              </div>
              <div className="mt-2 text-lg font-bold text-ink">
                1 Pt / ₹{loyaltyCfg.earnRupeesPerPoint} Spent
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                1 Point = ₹{(loyaltyCfg.redeemPaisePerPoint / 100).toFixed(2)} redemption value
              </div>
            </div>

            <div className="rounded-[14px] border border-line bg-surface p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Enrolled Members</span>
              <div className="mt-2 text-2xl font-bold text-ink num">{loyaltyMetrics.enrolledMembers}</div>
              <div className="mt-0.5 text-[11px] text-muted">Verified POS &amp; Online Storefront profiles</div>
            </div>

            <div className="rounded-[14px] border border-line bg-surface p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Active Points Liability</span>
              <div className="mt-2 text-2xl font-bold text-indigo-600 num">
                {loyaltyMetrics.activePointsBalance.toLocaleString("en-IN")} pts
              </div>
              <div className="mt-0.5 text-[11px] text-muted">
                Worth ₹{((loyaltyMetrics.activePointsBalance * loyaltyCfg.redeemPaisePerPoint) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="rounded-[14px] border border-line bg-surface p-4 shadow-2xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Silver / Gold / VIP Members</span>
              <div className="mt-2 text-2xl font-bold text-emerald-600 num">{loyaltyMetrics.vipMembers}</div>
              <div className="mt-0.5 text-[11px] text-muted">Customers with 250+ lifetime points</div>
            </div>
          </div>

          {/* Master Program Switch & Channel Controls */}
          <div className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Zap size={18} />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Omnichannel Loyalty &amp; Rewards Engine</h2>
                  <p className="text-[12px] text-muted">
                    Synchronized across POS Counter Billing and Online Storefront Checkout using customer mobile number
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-bg px-3.5 py-2 text-xs font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loyaltyCfg.enabled}
                    onChange={(e) => setLoyaltyCfg((p) => ({ ...p, enabled: e.target.checked }))}
                    className="h-4 w-4 rounded accent-[#6c47ff]"
                  />
                  <span>Enable Loyalty Program</span>
                </label>
                <Button type="submit" variant="primary">
                  <Save size={15} className="mr-1.5" />
                  Save Loyalty Settings
                </Button>
              </div>
            </div>

            {/* Channel Enablement Pills */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex items-start justify-between gap-3 rounded-xl border border-line bg-bg/50 p-4 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-ink">POS Counter Terminal Accrual &amp; Burn</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    Cashiers can view customer balance and redeem points on counter bills
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={loyaltyCfg.posEnabled}
                  onChange={(e) => setLoyaltyCfg((p) => ({ ...p, posEnabled: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded accent-[#6c47ff]"
                />
              </label>

              <label className="flex items-start justify-between gap-3 rounded-xl border border-line bg-bg/50 p-4 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-ink">Online Storefront Self-Redemption</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    Signed-in shoppers can apply their available loyalty points during checkout
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={loyaltyCfg.onlineEnabled}
                  onChange={(e) => setLoyaltyCfg((p) => ({ ...p, onlineEnabled: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded accent-[#6c47ff]"
                />
              </label>

              <label className="flex items-start justify-between gap-3 rounded-xl border border-line bg-bg/50 p-4 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-ink">Exclude Promo-Discounted Orders</div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    Prevent double-discounting when a coupon code is already applied
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={loyaltyCfg.excludeDiscountedItems}
                  onChange={(e) => setLoyaltyCfg((p) => ({ ...p, excludeDiscountedItems: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded accent-[#6c47ff]"
                />
              </label>
            </div>

            {/* Earning Rules vs Redemption Rules */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Left: Accrual / Earning Rules */}
              <div className="rounded-xl border border-line bg-bg/30 p-5 space-y-4">
                <div className="border-b border-line pb-3">
                  <h3 className="text-sm font-semibold text-ink">1. Points Accrual (Earning) Rules</h3>
                  <p className="text-[11px] text-muted">Define how customers earn points on completed purchases</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink">Spend Required per 1 Point (₹)</label>
                    <input
                      type="number"
                      min={1}
                      value={loyaltyCfg.earnRupeesPerPoint}
                      onChange={(e) =>
                        setLoyaltyCfg((p) => ({ ...p, earnRupeesPerPoint: Math.max(1, Number(e.target.value) || 1) }))
                      }
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-muted">
                      Example: ₹{loyaltyCfg.earnRupeesPerPoint} spent = 1 Loyalty Point
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">Minimum Order Value to Earn (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={loyaltyCfg.minOrderToEarnRupees}
                      onChange={(e) =>
                        setLoyaltyCfg((p) => ({ ...p, minOrderToEarnRupees: Math.max(0, Number(e.target.value) || 0) }))
                      }
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-muted">
                      Bills below ₹{loyaltyCfg.minOrderToEarnRupees} do not accrue points
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">New Member Welcome Bonus (Pts)</label>
                    <input
                      type="number"
                      min={0}
                      value={loyaltyCfg.welcomeBonusPoints}
                      onChange={(e) =>
                        setLoyaltyCfg((p) => ({ ...p, welcomeBonusPoints: Math.max(0, Number(e.target.value) || 0) }))
                      }
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-muted">Credited on first verified customer sign-up</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">First Online Order Bonus (Pts)</label>
                    <input
                      type="number"
                      min={0}
                      value={loyaltyCfg.firstOrderBonusPoints}
                      onChange={(e) =>
                        setLoyaltyCfg((p) => ({ ...p, firstOrderBonusPoints: Math.max(0, Number(e.target.value) || 0) }))
                      }
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-muted">Extra reward for first storefront checkout</span>
                  </div>
                </div>
              </div>

              {/* Right: Redemption & Valuation Rules */}
              <div className="rounded-xl border border-line bg-bg/30 p-5 space-y-4">
                <div className="border-b border-line pb-3">
                  <h3 className="text-sm font-semibold text-ink">2. Points Redemption &amp; Valuation Rules</h3>
                  <p className="text-[11px] text-muted">Control point-to-rupee conversion and bill discount ceilings</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink">Redemption Value per 1 Point (Paise)</label>
                    <input
                      type="number"
                      min={1}
                      value={loyaltyCfg.redeemPaisePerPoint}
                      onChange={(e) =>
                        setLoyaltyCfg((p) => ({ ...p, redeemPaisePerPoint: Math.max(1, Number(e.target.value) || 100) }))
                      }
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-muted">
                      100 paise = ₹1.00 discount per redeemed point (Currently ₹{(loyaltyCfg.redeemPaisePerPoint / 100).toFixed(2)})
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">Minimum Points Balance to Redeem</label>
                    <input
                      type="number"
                      min={1}
                      value={loyaltyCfg.minRedeemPoints}
                      onChange={(e) =>
                        setLoyaltyCfg((p) => ({ ...p, minRedeemPoints: Math.max(1, Number(e.target.value) || 1) }))
                      }
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-muted">
                      Customer needs at least {loyaltyCfg.minRedeemPoints} pts to unlock redemption
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">Max Bill Payable via Points (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={loyaltyCfg.maxRedeemPercent}
                      onChange={(e) =>
                        setLoyaltyCfg((p) => ({
                          ...p,
                          maxRedeemPercent: Math.min(100, Math.max(1, Number(e.target.value) || 50)),
                        }))
                      }
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-muted">
                      Up to {loyaltyCfg.maxRedeemPercent}% of cart subtotal can be paid with points
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">Max Discount Cap per Bill (₹)</label>
                    <input
                      type="number"
                      min={10}
                      value={loyaltyCfg.maxRedeemRupeesCap}
                      onChange={(e) =>
                        setLoyaltyCfg((p) => ({ ...p, maxRedeemRupeesCap: Math.max(10, Number(e.target.value) || 500) }))
                      }
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-surface px-3 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-muted">
                      Maximum ₹{loyaltyCfg.maxRedeemRupeesCap} loyalty discount per single invoice
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Membership Tiers Configuration */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">3. Customer Loyalty Tiers &amp; Earning Multipliers</h3>
                  <p className="text-[11px] text-muted">
                    Customers automatically graduate to higher tiers based on cumulative lifetime points earned
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                  Auto-Upgraded on POS &amp; Storefront
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {loyaltyCfg.tiers.map((tier, idx) => (
                  <div
                    key={tier.id}
                    className="rounded-xl border border-line bg-bg/40 p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                          Tier {idx + 1}
                        </span>
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          {tier.multiplier}x Points
                        </span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-muted">Tier Title</label>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) =>
                            setLoyaltyCfg((p) => ({
                              ...p,
                              tiers: p.tiers.map((t, i) => (i === idx ? { ...t, name: e.target.value } : t)),
                            }))
                          }
                          className="mt-1 h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-semibold text-muted">Min Lifetime Pts</label>
                          <input
                            type="number"
                            min={0}
                            value={tier.minLifetimePoints}
                            onChange={(e) =>
                              setLoyaltyCfg((p) => ({
                                ...p,
                                tiers: p.tiers.map((t, i) =>
                                  i === idx ? { ...t, minLifetimePoints: Math.max(0, Number(e.target.value) || 0) } : t,
                                ),
                              }))
                            }
                            className="num mt-1 h-8 w-full rounded-lg border border-line bg-surface px-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-semibold text-muted">Earn Multiplier</label>
                          <input
                            type="number"
                            step="0.25"
                            min={1}
                            max={10}
                            value={tier.multiplier}
                            onChange={(e) =>
                              setLoyaltyCfg((p) => ({
                                ...p,
                                tiers: p.tiers.map((t, i) =>
                                  i === idx ? { ...t, multiplier: Math.max(1, Number(e.target.value) || 1) } : t,
                                ),
                              }))
                            }
                            className="num mt-1 h-8 w-full rounded-lg border border-line bg-surface px-2 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-semibold text-muted">Member Perks</label>
                        <input
                          type="text"
                          value={tier.perkDescription}
                          onChange={(e) =>
                            setLoyaltyCfg((p) => ({
                              ...p,
                              tiers: p.tiers.map((t, i) => (i === idx ? { ...t, perkDescription: e.target.value } : t)),
                            }))
                          }
                          className="mt-1 h-8 w-full rounded-lg border border-line bg-surface px-2.5 text-[11px] text-muted"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Live Rewards Simulator */}
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Interactive Bill Accrual &amp; Redemption Simulator
                </div>
                <p className="text-xs text-slate-600">
                  Test how your configured rules apply to a sample customer bill of{" "}
                  <span className="font-bold text-slate-900">₹{simBillAmount}</span>:
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600">Sample Bill (₹)</label>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    value={simBillAmount}
                    onChange={(e) => setSimBillAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="num mt-1 h-8 w-28 rounded-lg border border-indigo-200 bg-white px-2.5 text-xs font-bold text-slate-900"
                  />
                </div>
                <div className="rounded-lg bg-white border border-indigo-100 px-3.5 py-2 text-xs">
                  <span className="text-slate-500 block text-[10px]">Points Earned</span>
                  <span className="font-bold text-emerald-700">
                    +{simBillAmount >= loyaltyCfg.minOrderToEarnRupees ? Math.floor(simBillAmount / Math.max(1, loyaltyCfg.earnRupeesPerPoint)) : 0} pts
                  </span>
                </div>
                <div className="rounded-lg bg-white border border-indigo-100 px-3.5 py-2 text-xs">
                  <span className="text-slate-500 block text-[10px]">Max Redeemable Discount</span>
                  <span className="font-bold text-indigo-700">
                    ₹{Math.min(loyaltyCfg.maxRedeemRupeesCap, Math.floor((simBillAmount * loyaltyCfg.maxRedeemPercent) / 100))} (
                    {Math.floor(
                      (Math.min(loyaltyCfg.maxRedeemRupeesCap, Math.floor((simBillAmount * loyaltyCfg.maxRedeemPercent) / 100)) * 100) /
                        Math.max(1, loyaltyCfg.redeemPaisePerPoint),
                    )}{" "}
                    pts)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : null}

      {/* 5. BUSINESS HOURS & BANNER (/settings/hours) */}
      {activeSection === "hours" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <form
            onSubmit={saveHours}
            className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs"
          >
            <h2 className="text-[15px] font-semibold text-ink">Store Operating Hours</h2>
            <p className="mt-1 text-[12px] text-muted">
              Online checkout is automatically paused outside these operating hours.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="text-[12.5px] font-semibold">
                Opens At
                <input
                  type="time"
                  value={opens}
                  onChange={(event) => setOpens(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm"
                />
              </label>
              <label className="text-[12.5px] font-semibold">
                Closes At
                <input
                  type="time"
                  value={closes}
                  onChange={(event) => setCloses(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm"
                />
              </label>
            </div>
            <Button type="submit" variant="primary" className="mt-4">
              Save Operating Hours
            </Button>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!storeId || announcement.trim() === "") return;
              void (async () => {
                const response = await fetch(`/api/v1/stores/${storeId}/sections`, {
                  method: "PUT",
                  credentials: "include",
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-XSRF-TOKEN": token(),
                  },
                  body: JSON.stringify({
                    sections: [{ position: 1, kind: "announcement", title: announcement.trim() }],
                  }),
                });
                setNotice(
                  response.ok
                    ? { text: "The shop announcement banner is saved.", tone: "ok" }
                    : { text: "The announcement was not saved.", tone: "bad" },
                );
              })();
            }}
            className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs"
          >
            <h2 className="text-[15px] font-semibold text-ink">Storefront Top Announcement Banner</h2>
            <p className="mt-1 text-[12px] text-muted">
              Displayed at the very top of your public online store.
            </p>
            <input
              value={announcement}
              onChange={(event) => setAnnouncement(event.target.value)}
              maxLength={80}
              placeholder="e.g. Free 20-minute home delivery on orders above ₹499!"
              className="mt-4 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm"
            />
            <Button type="submit" variant="primary" className="mt-4">
              Save Announcement
            </Button>
          </form>
        </div>
      ) : null}

      {/* 6. PAYMENT GATEWAYS (/settings/gateways) */}
      {activeSection === "gateways" ? (
        <PaymentGatewaysSection
          rows={rows}
          gatewayConfigs={gatewayConfigs}
          onToggle={toggleGateway}
          onSaveSetup={saveGatewaySetup}
          hideHeader
        />
      ) : null}

      {/* 7. THEME & APPEARANCE (/settings/theme) */}
      {activeSection === "theme" ? (
        <div className="space-y-5">
          <div className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs">
            <h2 className="text-[15px] font-semibold text-ink">Display Mode (Light / Dark)</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Choose between high-contrast daylight mode and deep navy-slate dark mode across all console pages.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 max-w-xl">
              <button
                type="button"
                onClick={() => {
                  document.documentElement.dataset.theme = "light";
                  window.localStorage.setItem("selfx-theme", "light");
                  setCurrentTheme("light");
                  setNotice({ text: "Switched to Light Mode.", tone: "ok" });
                }}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                  currentTheme === "light"
                    ? "border-accent bg-accent-soft/40 ring-2 ring-accent/20"
                    : "border-line bg-bg hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-ink">Light Mode</div>
                  <div className="text-xs text-muted">Crisp daylight surfaces for bright retail counters</div>
                </div>
                {currentTheme === "light" ? <Check size={16} className="text-accent" /> : null}
              </button>

              <button
                type="button"
                onClick={() => {
                  document.documentElement.dataset.theme = "dark";
                  window.localStorage.setItem("selfx-theme", "dark");
                  setCurrentTheme("dark");
                  setNotice({ text: "Switched to Dark Mode.", tone: "ok" });
                }}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                  currentTheme === "dark"
                    ? "border-accent bg-accent-soft/40 ring-2 ring-accent/20"
                    : "border-line bg-bg hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-ink">Dark Mode</div>
                  <div className="text-xs text-muted">Deep enterprise navy-slate for low-glare shifts</div>
                </div>
                {currentTheme === "dark" ? <Check size={16} className="text-accent" /> : null}
              </button>
            </div>
          </div>

          <div className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs">
            <h2 className="text-[15px] font-semibold text-ink">Brand Accent Colour</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              Select the primary accent colour used for active navigation, buttons, badges, and highlights.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {THEME_PALETTES.map((pal) => {
                const active = currentAccent === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => {
                      document.documentElement.dataset.accent = pal.id;
                      window.localStorage.setItem("selfx-accent", pal.id);
                      setCurrentAccent(pal.id);
                      const shellEl = document.querySelector("[data-accent]");
                      if (shellEl) shellEl.setAttribute("data-accent", pal.id);
                      setNotice({ text: `Applied ${pal.label} accent palette.`, tone: "ok" });
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-accent bg-accent-soft/40 ring-2 ring-accent/20"
                        : "border-line bg-bg hover:border-slate-300"
                    }`}
                  >
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-xs"
                      style={{ backgroundColor: pal.hex }}
                    >
                      {active ? <Check size={14} strokeWidth={2.5} /> : null}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-ink">{pal.label}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{pal.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* 8. API, WEBHOOKS & MESSAGING CHANNELS (/settings/api) */}
      {activeSection === "api" ? (
        <form
          onSubmit={(e) => void saveTenantSettings(e)}
          className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">WhatsApp Business, DLT SMS &amp; Email Alerts</h2>
              <p className="text-[12px] text-muted">
                Configure digital receipt delivery, customer OTPs, and low-stock notifications
              </p>
            </div>
            <Button type="submit" variant="primary">
              <Save size={15} className="mr-1.5" />
              Save Channels
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-[12.5px] font-semibold">
              WhatsApp Business Sender Number
              <input
                value={tenantCfg.whatsappSenderNumber}
                onChange={(e) => setTenantCfg({ ...tenantCfg, whatsappSenderNumber: e.target.value })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold">
              TRAI DLT Principal Entity ID
              <input
                value={tenantCfg.smsDltEntityId}
                onChange={(e) => setTenantCfg({ ...tenantCfg, smsDltEntityId: e.target.value })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold">
              SMS Sender Header (6-Char)
              <input
                maxLength={6}
                value={tenantCfg.smsSenderHeader}
                onChange={(e) => setTenantCfg({ ...tenantCfg, smsSenderHeader: e.target.value.toUpperCase() })}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal uppercase"
              />
            </label>
          </div>

          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <label className="flex items-center gap-2.5 rounded-[10px] border border-line bg-bg/50 p-3.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={tenantCfg.whatsappEnabled}
                onChange={(e) => setTenantCfg({ ...tenantCfg, whatsappEnabled: e.target.checked })}
                className="h-4 w-4 rounded accent-[#6366f1]"
              />
              <span>Send Digital PDF Invoice on WhatsApp after POS &amp; Online Sale</span>
            </label>
            <label className="flex items-center gap-2.5 rounded-[10px] border border-line bg-bg/50 p-3.5 text-sm font-medium">
              <input
                type="checkbox"
                checked={tenantCfg.lowStockEmailAlerts}
                onChange={(e) => setTenantCfg({ ...tenantCfg, lowStockEmailAlerts: e.target.checked })}
                className="h-4 w-4 rounded accent-[#6366f1]"
              />
              <span>Send Daily Low-Stock &amp; Expiry Digest to Store Owner Email</span>
            </label>
          </div>
        </form>
      ) : null}

      {/* 9. SECURITY & CASHIER POLICIES (/settings/security) */}
      {activeSection === "security" ? (
        <form
          onSubmit={(e) => void saveTenantSettings(e)}
          className="rounded-[14px] border border-line bg-surface p-6 shadow-2xs space-y-5"
        >
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Security, Cashier Approvals &amp; Register Lock</h2>
              <p className="text-[12px] text-muted">
                Protect register operations with supervisor PINs and discount ceilings
              </p>
            </div>
            <Button type="submit" variant="primary">
              <Save size={15} className="mr-1.5" />
              Save Security Policies
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between rounded-[12px] border border-line bg-bg/50 p-4 text-sm font-medium">
              <span>Require Supervisor / Cashier PIN to Void a Completed Bill</span>
              <input
                type="checkbox"
                checked={tenantCfg.requirePinForVoid}
                onChange={(e) => setTenantCfg({ ...tenantCfg, requirePinForVoid: e.target.checked })}
                className="h-4 w-4 rounded accent-[#6366f1]"
              />
            </label>
            <label className="flex items-center justify-between rounded-[12px] border border-line bg-bg/50 p-4 text-sm font-medium">
              <span>Require Supervisor PIN for Manual Bill Discounts</span>
              <input
                type="checkbox"
                checked={tenantCfg.requirePinForDiscount}
                onChange={(e) => setTenantCfg({ ...tenantCfg, requirePinForDiscount: e.target.checked })}
                className="h-4 w-4 rounded accent-[#6366f1]"
              />
            </label>
            <label className="block text-[12.5px] font-semibold">
              Maximum Manual Discount Allowed on POS (%)
              <input
                type="number"
                value={tenantCfg.maxCashierDiscountPercent}
                onChange={(e) => setTenantCfg({ ...tenantCfg, maxCashierDiscountPercent: e.target.value })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
            <label className="block text-[12.5px] font-semibold">
              Auto-Lock POS Terminal After Inactivity (Minutes)
              <input
                type="number"
                value={tenantCfg.autoLockMinutes}
                onChange={(e) => setTenantCfg({ ...tenantCfg, autoLockMinutes: e.target.value })}
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsWorkspace section="profile" />;
}
