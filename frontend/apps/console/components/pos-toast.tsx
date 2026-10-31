"use client";

import { Check, Info, X } from "lucide-react";
import { useCallback, useState } from "react";

export type ToastTone = "ok" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  tone?: ToastTone;
  createdAt: number;
  durationMs: number;
};

const announcedOrders = new Set<string>();

/** Returns true the first time this order should raise a toast. */
export function claimOrderAnnouncement(id: string): boolean {
  if (!id || announcedOrders.has(id)) return false;
  announcedOrders.add(id);
  return true;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "ok", durationMs = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = {
        id,
        message,
        tone,
        createdAt: Date.now(),
        durationMs,
      };
      setToasts((prev) => [...prev, item]);

      if (durationMs > 0) {
        setTimeout(() => {
          setToasts((current) => current.filter((t) => t.id !== id));
        }, durationMs);
      }
      return id;
    },
    [],
  );

  return { toasts, showToast, dismissToast };
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-5 right-5 z-[80] flex flex-col gap-2.5 max-w-[380px]"
    >
      {toasts.map((toast) => {
        const isError = toast.tone === "error";
        const isInfo = toast.tone === "info";

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-[14px] border bg-white px-4 py-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.06)] transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${
              isError
                ? "border-rose-200"
                : isInfo
                  ? "border-indigo-200"
                  : "border-emerald-200/90"
            }`}
          >
            <span
              className={`absolute inset-x-0 bottom-0 h-[3px] origin-left ${
                isError ? "bg-rose-500" : isInfo ? "bg-indigo-500" : "bg-emerald-500"
              }`}
              style={{ animation: `selfx-toast-life ${toast.durationMs}ms linear forwards` }}
            />
            {/* Tone Circular Icon matching Image 3 */}
            <div
              className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                isError
                  ? "border-rose-300 bg-rose-50 text-rose-600"
                  : isInfo
                    ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                    : "border-emerald-300 bg-emerald-50 text-emerald-600"
              }`}
            >
              {isError ? (
                <X size={13} strokeWidth={2.5} />
              ) : isInfo ? (
                <Info size={13} strokeWidth={2.5} />
              ) : (
                <Check size={13} strokeWidth={2.5} />
              )}
            </div>

            {/* Notification message */}
            <p className="flex-1 text-[13px] font-semibold text-slate-800 leading-snug">
              {toast.message}
            </p>

            {/* Dark circular X dismiss button matching Image 3 */}
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white transition hover:bg-slate-700 ml-1"
              aria-label="Dismiss"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes selfx-toast-life { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
    </div>
  );
}
