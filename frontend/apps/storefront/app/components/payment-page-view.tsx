"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Lock,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

interface PaymentPageViewProps {
  grandTotalPaise: number;
  checkoutOrderId: string;
  formattedPaymentTimer: string;
  paymentTimerSeconds: number;
  displayStoreName: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  landmark?: string;
  pincode?: string;
  etaText?: string;
  fulfillment: "delivery" | "pickup";
  setFulfillment?: (f: "delivery" | "pickup") => void;
  payment: string;
  setPayment: (m: string) => void;
  onBack: () => void;
  onPlaceOrder: () => void;
  submittingOrder: boolean;
  formatStorePrice: (paise: number) => string;
  isUpiQrEnabled: boolean;
  isCodEnabled: boolean;
  isPayAtStoreEnabled: boolean;
  isRazorpayEnabled: boolean;
  isPhonePeEnabled: boolean;
  upiConfig: { vpa: string; payee: string; instructions: string };
  upiQrDataUrl: string | null;
  upiUtr: string;
  setUpiUtr: (val: string) => void;
  upiUtrError: string | null;
  setUpiUtrError: (err: string | null) => void;
  copiedUpi: boolean;
  setCopiedUpi: (c: boolean) => void;
  brandPrimaryColor?: string;
}

export function PaymentPageView({
  grandTotalPaise,
  checkoutOrderId,
  formattedPaymentTimer,
  paymentTimerSeconds,
  displayStoreName,
  customerName,
  customerPhone,
  customerAddress,
  landmark,
  pincode,
  etaText,
  fulfillment,
  setFulfillment,
  payment,
  setPayment,
  onBack,
  onPlaceOrder,
  submittingOrder,
  formatStorePrice,
  isUpiQrEnabled,
  isCodEnabled,
  isPayAtStoreEnabled,
  isRazorpayEnabled,
  isPhonePeEnabled,
  upiConfig,
  upiQrDataUrl,
  upiUtr,
  setUpiUtr,
  upiUtrError,
  setUpiUtrError,
  copiedUpi,
  setCopiedUpi,
}: PaymentPageViewProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Available payment methods strictly enabled in gateway settings
  const availableOptions: { id: string; label: string }[] = [];
  if (isUpiQrEnabled) availableOptions.push({ id: "upi_qr", label: "UPI Apps & QR" });
  if (isCodEnabled) availableOptions.push({ id: "cod", label: "Cash on Delivery" });
  if (isPayAtStoreEnabled) availableOptions.push({ id: "pay_at_store", label: "Pay at Store" });
  if (isRazorpayEnabled) availableOptions.push({ id: "razorpay", label: "Cards & NetBanking" });
  if (isPhonePeEnabled) availableOptions.push({ id: "phonepe", label: "PhonePe Gateway" });

  const upiAmount = (grandTotalPaise / 100).toFixed(2);
  const upiUri = upiConfig.vpa
    ? `upi://pay?pa=${encodeURIComponent(upiConfig.vpa)}&pn=${encodeURIComponent(
        upiConfig.payee,
      )}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(`Order ${checkoutOrderId}`)}`
    : "";

  return (
    <div className="max-w-xl mx-auto space-y-4 animate-in fade-in slide-in-from-right-2 duration-200 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          aria-label="Back to details"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-2xs hover:bg-slate-50">
            <ArrowLeft size={16} />
          </div>
          <span>Back to Details</span>
        </button>
      </div>

      {/* CARD 1: Amount to Pay & Order ID (Exact Match to Image 1 Top Card) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Amount to Pay
          </span>
          <div className="text-3xl sm:text-3xl font-black text-[#ea580c] tracking-tight mt-0.5">
            {formatStorePrice(grandTotalPaise)}
          </div>
          <div className="text-xs font-mono font-medium text-slate-600 mt-1">
            Order ID <strong className="text-slate-900 font-bold">{checkoutOrderId}</strong>
          </div>
        </div>

        <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
          <FileText size={28} className="stroke-[1.8]" />
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-black shadow-xs">
            ₹
          </span>
        </div>
      </div>

      {/* CARD 2: Session Countdown Timer (Exact Match to Image 1 Timer Card) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Clock size={16} className="text-slate-400" />
          <span>Time left</span>
        </div>
        <div
          className={`font-mono text-base sm:text-lg font-black tracking-wider ${
            paymentTimerSeconds < 60 ? "text-rose-600 animate-pulse" : "text-slate-900"
          }`}
        >
          {formattedPaymentTimer}
        </div>
      </div>

      {/* Delivery / Pickup Summary Pill */}
      <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/80 text-slate-700 shrink-0">
            {fulfillment === "pickup" ? <Store size={12} /> : <Truck size={12} />}
          </div>
          <span className="truncate font-medium">
            {customerName || "Customer"} · +91 {customerPhone}{" "}
            {fulfillment === "delivery" && customerAddress
              ? `· ${customerAddress}${landmark ? `, ${landmark}` : ""}${pincode ? ` (${pincode})` : ""}`
              : `· In-Store Pickup at ${displayStoreName}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="text-[11px] font-bold text-blue-600 hover:underline shrink-0 ml-2 cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* PAYMENT GATEWAY METHOD SELECTOR (Strictly only enabled payment options!) */}
      {availableOptions.length > 1 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
            Choose Payment Method
          </span>
          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
            {availableOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPayment(opt.id);
                  if (opt.id === "pay_at_store") {
                    setFulfillment?.("pickup");
                  } else if (opt.id === "cod") {
                    setFulfillment?.("delivery");
                  }
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition cursor-pointer text-center ${
                  payment === opt.id
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200/90"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MAIN PAYMENT BOX */}
      {/* 1. UPI Payment Interface (Exact Match to Image 1) */}
      {payment === "upi_qr" && isUpiQrEnabled && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Pay using any UPI App
            </h3>
            <p className="text-xs text-slate-500">
              Tap on any app below to open and pay
            </p>
          </div>

          {/* 7 Official UPI App Tiles with Real Vector Company Logos */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {/* 1. PhonePe */}
            <a
              href={upiUri}
              className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-[#5f259f] hover:shadow-sm active:scale-95 transition-all text-center group cursor-pointer shadow-2xs min-h-[84px] sm:min-h-[94px]"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center group-hover:scale-105 transition shrink-0">
                <img
                  src="/logos/phonepe.svg"
                  alt="PhonePe"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="text-[10.5px] sm:text-xs font-bold text-slate-800 group-hover:text-[#5f259f] mt-1 leading-tight line-clamp-1">
                PhonePe
              </span>
            </a>

            {/* 2. Google Pay */}
            <a
              href={upiUri}
              className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-400 hover:shadow-sm active:scale-95 transition-all text-center group cursor-pointer shadow-2xs min-h-[84px] sm:min-h-[94px]"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center group-hover:scale-105 transition shrink-0">
                <img
                  src="/logos/google-pay.svg"
                  alt="Google Pay"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="text-[10.5px] sm:text-xs font-bold text-slate-800 group-hover:text-blue-600 mt-1 leading-tight line-clamp-1">
                Google Pay
              </span>
            </a>

            {/* 3. Paytm */}
            <a
              href={upiUri}
              className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-sky-400 hover:shadow-sm active:scale-95 transition-all text-center group cursor-pointer shadow-2xs min-h-[84px] sm:min-h-[94px]"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center group-hover:scale-105 transition shrink-0">
                <img
                  src="/logos/paytm.svg"
                  alt="Paytm"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="text-[10.5px] sm:text-xs font-bold text-slate-800 group-hover:text-sky-600 mt-1 leading-tight line-clamp-1">
                Paytm
              </span>
            </a>

            {/* 4. BHIM */}
            <a
              href={upiUri}
              className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-teal-400 hover:shadow-sm active:scale-95 transition-all text-center group cursor-pointer shadow-2xs min-h-[84px] sm:min-h-[94px]"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center group-hover:scale-105 transition shrink-0">
                <img
                  src="/logos/bhim.svg"
                  alt="BHIM"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="text-[10.5px] sm:text-xs font-bold text-slate-800 group-hover:text-teal-700 mt-1 leading-tight line-clamp-1">
                BHIM
              </span>
            </a>

            {/* 5. Amazon Pay */}
            <a
              href={upiUri}
              className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-amber-400 hover:shadow-sm active:scale-95 transition-all text-center group cursor-pointer shadow-2xs min-h-[84px] sm:min-h-[94px]"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center group-hover:scale-105 transition shrink-0">
                <img
                  src="/logos/amazon-pay.svg"
                  alt="Amazon Pay"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="text-[10.5px] sm:text-xs font-bold text-slate-800 group-hover:text-amber-700 mt-1 leading-tight line-clamp-1">
                Amazon Pay
              </span>
            </a>

            {/* 6. Any Bank UPI */}
            <a
              href={upiUri}
              className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-sky-500 hover:shadow-sm active:scale-95 transition-all text-center group cursor-pointer shadow-2xs min-h-[84px] sm:min-h-[94px]"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center group-hover:scale-105 transition shrink-0">
                <img
                  src="/logos/bank.png"
                  alt="Any Bank UPI"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="text-[10.5px] sm:text-xs font-bold text-slate-800 group-hover:text-sky-700 mt-1 leading-tight line-clamp-1">
                Any Bank UPI
              </span>
            </a>

            {/* 7. Other UPI Apps */}
            <a
              href={upiUri}
              className="flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 bg-white hover:border-emerald-500 hover:shadow-sm active:scale-95 transition-all text-center group cursor-pointer shadow-2xs min-h-[84px] sm:min-h-[94px]"
            >
              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center group-hover:scale-105 transition shrink-0">
                <img
                  src="/logos/upi.svg"
                  alt="Other UPI Apps"
                  className="h-full w-full object-contain"
                  loading="eager"
                />
              </div>
              <span className="text-[10.5px] sm:text-xs font-bold text-slate-800 group-hover:text-emerald-700 mt-1 leading-tight line-clamp-1">
                Other UPI Apps
              </span>
            </a>
          </div>

          {/* Divider: OR SCAN QR WITH ANY UPI APP (Exact Match to Image 1) */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              OR SCAN QR WITH ANY UPI APP
            </span>
          </div>

          {/* Centered QR Code with High-Quality Frame */}
          <div className="flex flex-col items-center justify-center">
            <div className="h-56 w-56 sm:h-64 sm:w-64 rounded-3xl bg-white p-3.5 border-2 border-slate-200/90 shadow-sm flex items-center justify-center relative">
              {upiQrDataUrl ? (
                <img
                  src={upiQrDataUrl}
                  alt="Scan to Pay via UPI"
                  className="h-full w-full object-contain rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <QrCode size={56} className="animate-pulse" />
                  <span className="text-xs font-semibold mt-2">Generating QR...</span>
                </div>
              )}
            </div>

            {/* VPA Copy Pill or Setup Notice */}
            {upiConfig.vpa ? (
              <div className="mt-3 flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                  {upiConfig.vpa}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(upiConfig.vpa);
                    setCopiedUpi(true);
                    setTimeout(() => setCopiedUpi(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedUpi ? "Copied" : "Copy"}</span>
                </button>
              </div>
            ) : (
              <div className="mt-3 text-center px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-800 max-w-sm">
                Merchant UPI ID not configured. Please enter your Merchant UPI ID in Settings → Payment Gateways.
              </div>
            )}
          </div>

          {/* Primary CTA Button: Open in UPI App (Exact Match to Image 1) */}
          <div className="space-y-2">
            <a
              href={upiUri || "#"}
              onClick={(e) => {
                if (!upiConfig.vpa) {
                  e.preventDefault();
                  alert("Merchant UPI ID is not configured yet in Settings → Payment Gateways.");
                }
              }}
              className="w-full h-13 rounded-2xl bg-[#ea580c] hover:bg-[#c2410c] text-white font-black text-sm tracking-wide shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer"
            >
              <img
                src="/logos/upi.svg"
                alt="UPI"
                className="h-5 w-auto brightness-0 invert"
              />
              <span>Open in UPI App</span>
            </a>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center">
              <Lock size={12} className="text-slate-400" />
              <span>You will be redirected to your UPI app to complete the payment.</span>
            </div>
          </div>

          {/* 12-Digit UTR Reference Input (Static Standee Verification) */}
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>Enter 12-Digit UPI Reference (UTR)</span>
                <span className="text-rose-500">*</span>
              </label>
              <span
                className={`text-[11px] font-mono font-bold ${
                  upiUtr.length === 12 ? "text-emerald-700 font-extrabold" : "text-slate-500"
                }`}
              >
                {upiUtr.length}/12 digits
              </span>
            </div>
            <input
              type="text"
              maxLength={12}
              value={upiUtr}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setUpiUtr(val);
                if (upiUtrError) setUpiUtrError(null);
              }}
              placeholder="e.g. 412345678901"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none transition ${
                upiUtrError
                  ? "border-rose-400 ring-2 ring-rose-200 bg-rose-50/40"
                  : "border-slate-300 focus:border-orange-600 focus:ring-2 focus:ring-orange-100 bg-white"
              }`}
            />
            {upiUtrError ? (
              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{upiUtrError}</span>
              </p>
            ) : (
              <p className="text-[10.5px] text-slate-500">
                After paying in your UPI app, enter the 12-digit UTR reference from your payment confirmation screen.
              </p>
            )}

            <button
              type="button"
              disabled={submittingOrder}
              onClick={onPlaceOrder}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 mt-2"
            >
              {submittingOrder ? (
                <>
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying &amp; Placing Order...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Confirm Payment &amp; Place Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 2. Cash on Delivery (Enabled ONLY if Active in Payment Gateways) */}
      {payment === "cod" && isCodEnabled && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shrink-0">
              <Wallet size={28} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Cash on Delivery (COD)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pay cash directly to the delivery rider at your doorstep upon order arrival.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1.5 text-xs text-emerald-900">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span>Verified Doorstep Cash Settlement</span>
            </div>
            <p className="text-[11.5px] text-emerald-800 leading-relaxed">
              Please keep the exact cash amount of <strong>{formatStorePrice(grandTotalPaise)}</strong> ready for a quick handoff.
            </p>
          </div>

          <button
            type="button"
            disabled={submittingOrder}
            onClick={onPlaceOrder}
            className="w-full h-13 rounded-2xl bg-[#16a34a] hover:bg-green-700 text-white font-black text-sm tracking-wide shadow-lg shadow-green-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {submittingOrder ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Placing Cash Order...</span>
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                <span>Place Cash on Delivery Order ({formatStorePrice(grandTotalPaise)})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 3. Pay at Store Counter (Enabled ONLY if Active in Payment Gateways) */}
      {payment === "pay_at_store" && isPayAtStoreEnabled && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shrink-0">
              <Store size={28} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Pay at Store Counter
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Receive your digital pickup pass and pay at the counter when collecting your order.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs text-slate-700">
            <div className="font-bold flex items-center gap-1.5 text-slate-900">
              <QrCode size={14} className="text-slate-900" />
              <span>Digital Pickup QR Pass Provided</span>
            </div>
            <p className="text-[11.5px] text-slate-600 leading-relaxed">
              Show your order confirmation or pickup QR at {displayStoreName} counter. You can pay via cash, card, or UPI standee in-store.
            </p>
          </div>

          <button
            type="button"
            disabled={submittingOrder}
            onClick={onPlaceOrder}
            className="w-full h-13 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm tracking-wide shadow-lg shadow-slate-900/25 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {submittingOrder ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Confirming Store Order...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Confirm Store Pickup Order ({formatStorePrice(grandTotalPaise)})</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 4. Razorpay / PhonePe Gateway (Enabled ONLY if Active) */}
      {(payment === "razorpay" || payment === "phonepe") && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200/90 p-2.5 shadow-2xs shrink-0">
              {payment === "razorpay" ? (
                <img src="/logos/razorpay.png" alt="Razorpay" className="h-full w-full object-contain" />
              ) : (
                <img src="/logos/phonepe.svg" alt="PhonePe" className="h-full w-full object-contain" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                {payment === "razorpay" ? "Razorpay Gateway" : "PhonePe Payment Gateway"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Credit/Debit Cards, NetBanking, Wallets &amp; Official UPI Integration.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={submittingOrder}
            onClick={onPlaceOrder}
            className="w-full h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm tracking-wide shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {submittingOrder ? (
              <>
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Opening Gateway...</span>
              </>
            ) : (
              <>
                <CreditCard size={16} />
                <span>Pay {formatStorePrice(grandTotalPaise)} via {payment === "razorpay" ? "Razorpay" : "PhonePe"}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* CARD 4: Real-time Status Notice (Exact Match to Image 1 Status Card) */}
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/50 p-4 flex items-start gap-3 shadow-2xs">
        <div className="h-5 w-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="text-xs font-bold text-slate-900">Waiting for payment...</div>
          <p className="text-[11.5px] text-slate-600 leading-relaxed">
            We will confirm your payment automatically.{" "}
            <strong className="text-amber-900 font-bold">Please do not close this page.</strong>
          </p>
        </div>
      </div>

      {/* Cancel Payment Link (Exact Match to Image 1) */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          Cancel payment
        </button>
      </div>

      {/* Footer: Powered by SELFX (Exact Match to Image 1 Footer) */}
      <div className="pt-6 pb-2 text-center space-y-1 border-t border-slate-100">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <span>Powered by</span>
          <span className="font-black text-orange-600 tracking-wider">SELFX</span>
        </div>
        <p className="text-[10px] text-slate-400">
          © SELFX (A Product of SIRIXO Software Technologies Pvt. Ltd.)
        </p>
      </div>

      {/* SECURE PAYMENT CANCELLATION CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">
                Cancel Payment Session?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to go back? Your current payment session for{" "}
                <strong className="text-slate-900">{formatStorePrice(grandTotalPaise)}</strong> will be closed. Your cart items will remain safely saved.
              </p>
            </div>

       

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition cursor-pointer"
              >
                No, Continue Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  onBack();
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs transition cursor-pointer"
              >
                Yes, Cancel &amp; Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
