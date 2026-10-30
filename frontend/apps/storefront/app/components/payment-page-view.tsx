"use client";

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  CreditCard,
  QrCode,
  ShieldCheck,
  Store,
  Truck,
  Wallet,
} from "lucide-react";

interface PaymentPageViewProps {
  grandTotalPaise: number;
  totalItemsCount?: number;
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
  onPlaceOrder: (overrideMethod?: string) => void;
  submittingOrder: boolean;
  formatStorePrice: (paise: number) => string;
  isUpiQrEnabled: boolean;
  isCodEnabled: boolean;
  isPayAtStoreEnabled: boolean;
  isRazorpayEnabled: boolean;
  isPhonePeEnabled: boolean;
  isPaytmEnabled?: boolean;
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
  totalItemsCount = 1,
  checkoutOrderId,
  formattedPaymentTimer,
  paymentTimerSeconds,
  displayStoreName,
  customerName,
  customerPhone,
  customerAddress,
  landmark,
  pincode,
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
  isPaytmEnabled = false,
  upiConfig,
  upiQrDataUrl,
  upiUtr,
  setUpiUtr,
  upiUtrError,
  setUpiUtrError,
  copiedUpi,
  setCopiedUpi,
  brandPrimaryColor = "#16a34a",
}: PaymentPageViewProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>("phonepe");
  const [showAllUpiOptions, setShowAllUpiOptions] = useState(false);

  // Determine enabled prepaid gateways
  const hasPrepaid = isPhonePeEnabled || isPaytmEnabled || isRazorpayEnabled;

  const upiAmount = (grandTotalPaise / 100).toFixed(2);
  const vpa = upiConfig.vpa || "";
  const payee = upiConfig.payee || displayStoreName;
  const note = `Order ${checkoutOrderId}`;

  // App-specific UPI URIs
  const upiUris: Record<string, string> = {
    phonepe: vpa ? `phonepe://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(note)}` : "",
    gpay: vpa ? `tez://upi/pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(note)}` : "",
    paytm: vpa ? `paytmmp://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(note)}` : "",
    amazon: vpa ? `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(note)}` : "",
    bhim: vpa ? `bhim://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(note)}` : "",
    generic: vpa ? `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${upiAmount}&cu=INR&tn=${encodeURIComponent(note)}` : "",
  };

  const formattedTotal = formatStorePrice(grandTotalPaise);

  const handleSelectGateway = (method: string) => {
    setPayment(method);
    if (method === "pay_at_store") {
      setFulfillment?.("pickup");
    } else if (method === "cod") {
      setFulfillment?.("delivery");
    }
  };

  const handleSelectUpiApp = (appKey: string) => {
    setSelectedUpiApp(appKey);
    // If PhonePe gateway is enabled and user clicks PhonePe, prefer PhonePe gateway/intent
    if (appKey === "phonepe" && isPhonePeEnabled) {
      setPayment("phonepe");
    } else if (appKey === "paytm" && isPaytmEnabled) {
      setPayment("paytm");
    } else {
      setPayment("upi_qr");
    }
  };

  const handleLaunchUpiApp = (appKey: string) => {
    const targetUri = upiUris[appKey] || upiUris.generic;
    if (targetUri && typeof window !== "undefined") {
      window.location.href = targetUri;
    }
    // Also initiate the order recording in backend
    const methodToUse = (appKey === "phonepe" && isPhonePeEnabled) ? "phonepe" : (appKey === "paytm" && isPaytmEnabled) ? "paytm" : "upi_qr";
    onPlaceOrder(methodToUse);
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-in fade-in duration-200 pb-16 px-1 sm:px-0">
      {/* 1. Header (Exact Match to Image 5: Payment Options + Subtitle) */}
      <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-slate-100 text-slate-700 transition cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            Payment Options
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"} · Total: {formattedTotal}
          </p>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-400" />
          <span>Payment window expires in</span>
        </div>
        <span
          className={`font-mono font-bold tracking-wider ${
            paymentTimerSeconds < 60 ? "text-rose-600 animate-pulse" : "text-slate-900"
          }`}
        >
          {formattedPaymentTimer}
        </span>
      </div>

      {/* 2. SECTION: PREFERRED PAYMENT (Shown if PhonePe, Paytm, or Razorpay enabled) */}
      {hasPrepaid && (
        <div className="space-y-2">
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight px-1">
            Preferred Payment
          </h2>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden divide-y divide-slate-100">
            {/* PhonePe Option */}
            {isPhonePeEnabled && (
              <div className="p-3.5 transition-colors hover:bg-slate-50/50">
                <div
                  onClick={() => handleSelectGateway("phonepe")}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5f259f]/10 p-1.5 shrink-0">
                      <img
                        src="/logos/phonepe.svg"
                        alt="PhonePe"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">PhonePe UPI</div>
                      <div className="text-[11px] text-slate-500">Fast &amp; direct UPI / App payment</div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                      payment === "phonepe"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {payment === "phonepe" && <Check size={12} className="stroke-[3]" />}
                  </div>
                </div>

                {/* Prominent Action Button when PhonePe is Selected (Image 5 Match) */}
                {payment === "phonepe" && (
                  <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      disabled={submittingOrder}
                      onClick={() => onPlaceOrder("phonepe")}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      {submittingOrder ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Connecting to PhonePe...</span>
                        </>
                      ) : (
                        <span>Pay via PhonePe ({formattedTotal})</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Paytm Option */}
            {isPaytmEnabled && (
              <div className="p-3.5 transition-colors hover:bg-slate-50/50">
                <div
                  onClick={() => handleSelectGateway("paytm")}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#002970]/10 p-1.5 shrink-0">
                      <img
                        src="/logos/paytm.svg"
                        alt="Paytm"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">Paytm UPI</div>
                      <div className="text-[11px] text-slate-500">Paytm Wallet, UPI &amp; Postpaid</div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                      payment === "paytm"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {payment === "paytm" && <Check size={12} className="stroke-[3]" />}
                  </div>
                </div>

                {payment === "paytm" && (
                  <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      disabled={submittingOrder}
                      onClick={() => onPlaceOrder("paytm")}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      {submittingOrder ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Connecting to Paytm...</span>
                        </>
                      ) : (
                        <span>Pay via Paytm ({formattedTotal})</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Razorpay Option */}
            {isRazorpayEnabled && (
              <div className="p-3.5 transition-colors hover:bg-slate-50/50">
                <div
                  onClick={() => handleSelectGateway("razorpay")}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c2340]/10 p-1.5 shrink-0">
                      <img
                        src="/logos/razorpay.png"
                        alt="Razorpay"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">Razorpay</div>
                      <div className="text-[11px] text-slate-500">Cards, UPI, NetBanking &amp; Wallets</div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                      payment === "razorpay"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {payment === "razorpay" && <Check size={12} className="stroke-[3]" />}
                  </div>
                </div>

                {payment === "razorpay" && (
                  <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      disabled={submittingOrder}
                      onClick={() => onPlaceOrder("razorpay")}
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      {submittingOrder ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Opening Razorpay...</span>
                        </>
                      ) : (
                        <span>Pay via Razorpay ({formattedTotal})</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SECTION: PAY ON DELIVERY (Exact Match to Image 5) */}
      {(isCodEnabled || isPayAtStoreEnabled) && (
        <div className="space-y-2 pt-1">
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight px-1">
            Pay on Delivery
          </h2>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden divide-y divide-slate-100">
            {/* Cash on Delivery */}
            {isCodEnabled && (
              <div className="p-3.5 transition-colors hover:bg-slate-50/50">
                <div
                  onClick={() => handleSelectGateway("cod")}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                      <Banknote size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">Cash/Pay on Delivery</div>
                      <div className="text-[11px] text-slate-500">Pay cash at the time of delivery.</div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                      payment === "cod"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {payment === "cod" && <Check size={12} className="stroke-[3]" />}
                  </div>
                </div>

                {payment === "cod" && (
                  <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      disabled={submittingOrder}
                      onClick={() => onPlaceOrder("cod")}
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      {submittingOrder ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Placing COD Order...</span>
                        </>
                      ) : (
                        <span>Place Cash on Delivery Order ({formattedTotal})</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Pay at Store Counter */}
            {isPayAtStoreEnabled && (
              <div className="p-3.5 transition-colors hover:bg-slate-50/50">
                <div
                  onClick={() => handleSelectGateway("pay_at_store")}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shrink-0">
                      <Store size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">Pay at Store Counter</div>
                      <div className="text-[11px] text-slate-500">Pay via Cash, Card or UPI at pickup.</div>
                    </div>
                  </div>

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                      payment === "pay_at_store"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {payment === "pay_at_store" && <Check size={12} className="stroke-[3]" />}
                  </div>
                </div>

                {payment === "pay_at_store" && (
                  <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      disabled={submittingOrder}
                      onClick={() => onPlaceOrder("pay_at_store")}
                      className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      {submittingOrder ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Confirming Store Order...</span>
                        </>
                      ) : (
                        <span>Confirm Store Pickup Order ({formattedTotal})</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. SECTION: PAY BY ANY UPI APP (Exact Match to Image 5) */}
      {(isUpiQrEnabled || isPhonePeEnabled || isPaytmEnabled) && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 px-1">
            <img src="/logos/upi.svg" alt="UPI" className="h-4 w-auto object-contain" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight">
              Pay by any UPI App
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden divide-y divide-slate-100">
            {/* Google Pay */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/50">
              <div
                onClick={() => handleSelectUpiApp("gpay")}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 p-1.5 shrink-0">
                    <img
                      src="/logos/google-pay.svg"
                      alt="Google Pay"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Google Pay</span>
                </div>

                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                    payment === "upi_qr" && selectedUpiApp === "gpay"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {payment === "upi_qr" && selectedUpiApp === "gpay" && (
                    <Check size={12} className="stroke-[3]" />
                  )}
                </div>
              </div>

              {payment === "upi_qr" && selectedUpiApp === "gpay" && (
                <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    disabled={submittingOrder}
                    onClick={() => handleLaunchUpiApp("gpay")}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {submittingOrder ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Opening Google Pay...</span>
                      </>
                    ) : (
                      <span>Pay via Google Pay ({formattedTotal})</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* PhonePe in UPI list */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/50">
              <div
                onClick={() => handleSelectUpiApp("phonepe")}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5f259f]/10 p-1.5 shrink-0">
                    <img
                      src="/logos/phonepe.svg"
                      alt="PhonePe"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900">PhonePe</span>
                </div>

                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                    (payment === "phonepe" || (payment === "upi_qr" && selectedUpiApp === "phonepe"))
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {(payment === "phonepe" || (payment === "upi_qr" && selectedUpiApp === "phonepe")) && (
                    <Check size={12} className="stroke-[3]" />
                  )}
                </div>
              </div>

              {((payment === "phonepe" && !hasPrepaid) || (payment === "upi_qr" && selectedUpiApp === "phonepe")) && (
                <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    disabled={submittingOrder}
                    onClick={() => handleLaunchUpiApp("phonepe")}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {submittingOrder ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Opening PhonePe...</span>
                      </>
                    ) : (
                      <span>Pay via PhonePe ({formattedTotal})</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Paytm in UPI list */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/50">
              <div
                onClick={() => handleSelectUpiApp("paytm")}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#002970]/10 p-1.5 shrink-0">
                    <img
                      src="/logos/paytm.svg"
                      alt="Paytm"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Paytm</span>
                </div>

                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                    payment === "upi_qr" && selectedUpiApp === "paytm"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {payment === "upi_qr" && selectedUpiApp === "paytm" && (
                    <Check size={12} className="stroke-[3]" />
                  )}
                </div>
              </div>

              {payment === "upi_qr" && selectedUpiApp === "paytm" && (
                <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    disabled={submittingOrder}
                    onClick={() => handleLaunchUpiApp("paytm")}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {submittingOrder ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Opening Paytm...</span>
                      </>
                    ) : (
                      <span>Pay via Paytm ({formattedTotal})</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Amazon Pay UPI (Exact Match to Image 5) */}
            <div className="p-3.5 transition-colors hover:bg-slate-50/50">
              <div
                onClick={() => handleSelectUpiApp("amazon")}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 p-1.5 shrink-0">
                    <img
                      src="/logos/amazon-pay.png"
                      alt="Amazon Pay"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Amazon Pay UPI</span>
                </div>

                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all shrink-0 ${
                    payment === "upi_qr" && selectedUpiApp === "amazon"
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {payment === "upi_qr" && selectedUpiApp === "amazon" && (
                    <Check size={12} className="stroke-[3]" />
                  )}
                </div>
              </div>

              {payment === "upi_qr" && selectedUpiApp === "amazon" && (
                <div className="mt-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    type="button"
                    disabled={submittingOrder}
                    onClick={() => handleLaunchUpiApp("amazon")}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {submittingOrder ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Opening Amazon Pay...</span>
                      </>
                    ) : (
                      <span>Pay via Amazon Pay ({formattedTotal})</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Collapsible: View all UPI options / Scan QR & UTR (Exact Match to Image 5) */}
            <div className="p-3.5 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowAllUpiOptions(!showAllUpiOptions)}
                className="w-full flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600">
                    {showAllUpiOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  <span>{showAllUpiOptions ? "Hide other UPI options" : "View all UPI options (QR & Manual UTR)"}</span>
                </div>
                <QrCode size={16} className="text-slate-400" />
              </button>

              {showAllUpiOptions && (
                <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-4 animate-in fade-in duration-200">
                  {/* Dynamic QR Display */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="h-48 w-48 rounded-2xl bg-white p-3 border border-slate-200 shadow-sm flex items-center justify-center">
                      {upiQrDataUrl ? (
                        <img
                          src={upiQrDataUrl}
                          alt="Scan to Pay via UPI"
                          className="h-full w-full object-contain rounded-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <QrCode size={48} className="animate-pulse" />
                          <span className="text-xs font-semibold mt-2">Generating QR...</span>
                        </div>
                      )}
                    </div>

                    {vpa ? (
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {vpa}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(vpa);
                            setCopiedUpi(true);
                            setTimeout(() => setCopiedUpi(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                        >
                          {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                          <span>{copiedUpi ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* 12-Digit Reference (UTR) for manual verification */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-800">
                        Paid via Standee / Scanner? Enter 12-Digit UTR
                      </label>
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">
                        {upiUtr.length}/12
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
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono tracking-widest text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 transition"
                    />

                    {upiUtrError && (
                      <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        <span>{upiUtrError}</span>
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={submittingOrder || upiUtr.length !== 12}
                      onClick={() => onPlaceOrder("upi_qr")}
                      className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      {submittingOrder ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Verifying UTR...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>Confirm Payment with UTR</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-400 font-medium">
        <ShieldCheck size={14} className="text-emerald-600" />
        <span>100% Secure &amp; Verified Transactions</span>
      </div>

      {/* SECURE CANCELLATION MODAL */}
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
                Are you sure you want to go back? Your current order session for{" "}
                <strong className="text-slate-900">{formattedTotal}</strong> will be paused. Your cart items will remain safely saved.
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
                Yes, Change Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
