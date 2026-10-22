"use client";

import { formatInr } from "@selfx/types";
import { CheckCircle2, Maximize2, Minimize2, QrCode, ShoppingBag, Store } from "lucide-react";
import { useEffect, useState } from "react";

interface CfdItem {
  id: string;
  name: string;
  sku: string;
  unitPricePaise: number;
  qty: number;
  lineTotalPaise: number;
}

interface CfdPayload {
  storeName: string;
  storeTagline?: string;
  customerName?: string | null;
  items: CfdItem[];
  subtotalPaise: number;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
  status: "idle" | "scanning" | "payment" | "completed";
  paymentMethod?: string;
  invoiceNumber?: string;
}

const DEFAULT_STATE: CfdPayload = {
  storeName: "SelfX Retail Flagship",
  storeTagline: "Freshness & Value Guaranteed",
  customerName: null,
  items: [],
  subtotalPaise: 0,
  taxPaise: 0,
  discountPaise: 0,
  totalPaise: 0,
  status: "idle",
};

export default function CustomerFacingDisplayPage() {
  const [data, setData] = useState<CfdPayload>(DEFAULT_STATE);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // 1. BroadcastChannel for zero-latency local screen sync
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      channel = new BroadcastChannel("selfx_pos_cfd");
      channel.onmessage = (event) => {
        if (event.data && typeof event.data === "object") {
          setData(event.data as CfdPayload);
        }
      };
    }

    // 2. Storage fallback for multi-window sync across browser tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "selfx_pos_cfd_state" && e.newValue) {
        try {
          setData(JSON.parse(e.newValue) as CfdPayload);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // Initial check from localStorage
    try {
      const saved = window.localStorage.getItem("selfx_pos_cfd_state");
      if (saved) setData(JSON.parse(saved) as CfdPayload);
    } catch {
      // ignore
    }

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  const isCompleted = data.status === "completed";
  const isPayment = data.status === "payment";
  const isIdle = data.items.length === 0 && !isCompleted;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-900 font-sans text-white select-none">
      {/* Top CFD Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">{data.storeName}</h1>
            <p className="text-xs text-slate-400">{data.storeTagline || "Customer Display Terminal"}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {data.customerName && (
            <div className="rounded-full border border-slate-800 bg-slate-900 px-3.5 py-1 text-xs font-semibold text-slate-300">
              Customer: <span className="text-white">{data.customerName}</span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Split Screen */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Scanned Items List */}
        <section className="flex flex-1 flex-col border-r border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 px-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Item Description</span>
            <div className="flex items-center gap-12">
              <span className="w-16 text-center">Qty</span>
              <span className="w-24 text-right">Price</span>
              <span className="w-28 text-right">Total</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 px-8">
            {data.items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center justify-between py-4 text-sm transition hover:bg-slate-800/20"
              >
                <div>
                  <h3 className="font-semibold text-white">{item.name}</h3>
                  <span className="font-mono text-xs text-slate-500">SKU: {item.sku}</span>
                </div>

                <div className="flex items-center gap-12 font-mono">
                  <span className="w-16 rounded-md bg-slate-800/60 py-1 text-center font-semibold text-white">
                    {item.qty}
                  </span>
                  <span className="w-24 text-right text-slate-400">
                    {formatInr(item.unitPricePaise)}
                  </span>
                  <span className="w-28 text-right font-semibold text-white">
                    {formatInr(item.lineTotalPaise)}
                  </span>
                </div>
              </div>
            ))}

            {isIdle && (
              <div className="flex h-full flex-col items-center justify-center py-24 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-600">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-300">Welcome to {data.storeName}</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Items scanned by the cashier will appear here in real-time.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right: Payment, QR & Totals Card */}
        <section className="w-[440px] shrink-0 flex flex-col justify-between bg-slate-950 p-8 border-l border-slate-800">
          {/* Dynamic Status Display */}
          <div>
            {isCompleted ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                <h2 className="mt-3 text-lg font-semibold text-emerald-300">Payment Successful!</h2>
                <p className="mt-1 font-mono text-xs text-emerald-400/80">
                  Invoice #{data.invoiceNumber || "INV-PAID"}
                </p>
                <p className="mt-3 text-xs text-slate-300">Thank you for shopping with us!</p>
              </div>
            ) : isPayment ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6 text-center">
                <QrCode className="h-8 w-8 text-indigo-400" />
                <h2 className="mt-2 text-base font-semibold text-white">Scan &amp; Pay via UPI</h2>
                <p className="mt-0.5 text-xs text-slate-400">Accepting Google Pay, PhonePe, Paytm, BHIM</p>

                {/* Simulated dynamic UPI QR code */}
                <div className="mt-4 rounded-xl border border-white/10 bg-white p-3 shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=merchant@selfx&pn=${encodeURIComponent(data.storeName)}&am=${(
                        data.totalPaise / 100
                      ).toFixed(2)}&cu=INR`,
                    )}`}
                    alt="UPI QR"
                    className="h-40 w-40"
                  />
                </div>
                <span className="mt-3 font-mono text-lg font-semibold text-indigo-300">
                  {formatInr(data.totalPaise)}
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Billing Overview
                </span>
                <p className="mt-1 text-xs text-slate-400">
                  {data.items.length} {data.items.length === 1 ? "item" : "items"} currently scanned
                </p>
              </div>
            )}
          </div>

          {/* Running Totals Block */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Subtotal</span>
              <span className="font-mono text-white">{formatInr(data.subtotalPaise)}</span>
            </div>

            {data.discountPaise > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span>Savings / Discount</span>
                <span className="font-mono font-semibold">- {formatInr(data.discountPaise)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Taxes (GST)</span>
              <span className="font-mono text-white">{formatInr(data.taxPaise)}</span>
            </div>

            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 p-4 border border-slate-800">
              <span className="text-sm font-semibold uppercase tracking-wide text-white">Amount Payable</span>
              <span className="font-mono text-2xl font-semibold text-emerald-400">
                {formatInr(data.totalPaise)}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
