"use client";

import { Check, Laptop, RefreshCw, Smartphone, Tablet, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export default function PosPairScreen() {
  const [pairingCode, setPairingCode] = useState<string>("--- ---");
  const [rawCode, setRawCode] = useState<string>("");
  const [expiresIn, setExpiresIn] = useState<number>(900);
  const [loading, setLoading] = useState(true);
  const [pairedSuccess, setPairedSuccess] = useState(false);
  const [pairedInfo, setPairedInfo] = useState<{
    counter_name?: string;
    counter_code?: string;
    store_name?: string;
  } | null>(null);

  async function requestPairingCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/public/terminals/generate-pair-code");
      if (res.ok) {
        const body = await res.json();
        setPairingCode(body.data?.pairing_code ?? "839-214");
        setRawCode(body.data?.raw_code ?? "839214");
        setExpiresIn(body.data?.expires_in_seconds ?? 900);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void requestPairingCode();
  }, []);

  // Poll check status every 3 seconds
  useEffect(() => {
    if (!rawCode || pairedSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/public/terminals/check-pair-status?code=${rawCode}`);
        if (res.ok) {
          const body = await res.json();
          if (body.data?.paired) {
            setPairedSuccess(true);
            setPairedInfo(body.data.counter);
            clearInterval(interval);
            setTimeout(() => {
              window.location.href = "/pos";
            }, 2500);
          }
        }
      } catch {
        // keep polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [rawCode, pairedSuccess]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white font-sans">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md">
        {pairedSuccess ? (
          <div className="space-y-4 py-8 animate-in fade-in zoom-in duration-300">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg">
              <Check size={32} strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">Device Successfully Paired!</h2>
            <p className="text-sm text-slate-300">
              Linked to{" "}
              <span className="font-semibold text-white">
                {pairedInfo?.counter_name} ({pairedInfo?.counter_code})
              </span>{" "}
              at <span className="font-semibold text-emerald-400">{pairedInfo?.store_name}</span>.
            </p>
            <p className="text-xs text-slate-400 animate-pulse">Launching POS Terminal workspace...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2 text-slate-400">
              <Tablet size={22} className="text-orange-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                POS Machine / Tablet Pairing
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Pair This Register
              </h1>
              <p className="text-xs text-slate-400">
                To activate this device without entering passwords, enter this 6-digit code in SelfX Console:
              </p>
            </div>

            {/* 6-Digit Big Code Badge */}
            <div className="rounded-2xl border-2 border-dashed border-orange-500/40 bg-orange-500/10 p-6">
              {loading ? (
                <div className="flex h-16 items-center justify-center gap-2 text-sm text-orange-400">
                  <RefreshCw size={18} className="animate-spin" />
                  Generating secure pairing PIN...
                </div>
              ) : (
                <div className="font-mono text-5xl font-semibold tracking-widest text-orange-400 select-all sm:text-6xl">
                  {pairingCode}
                </div>
              )}
            </div>

            {/* Steps Guide */}
            <div className="space-y-2 rounded-xl bg-slate-800/60 p-4 text-left text-xs text-slate-300">
              <div className="font-semibold text-white">How to pair from manager dashboard:</div>
              <ol className="list-decimal space-y-1 pl-4 text-slate-400">
                <li>Log in to SelfX Console on desktop or mobile.</li>
                <li>Go to <span className="font-semibold text-slate-200">Devices &amp; channels → POS terminals</span>.</li>
                <li>Click <span className="font-semibold text-orange-400">Pair tablet</span> on your desired register card.</li>
                <li>Enter the 6-digit code above to authorize.</li>
              </ol>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                Listening for manager approval...
              </div>

              <button
                type="button"
                onClick={requestPairingCode}
                className="text-orange-400 hover:underline cursor-pointer"
              >
                Regenerate PIN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
