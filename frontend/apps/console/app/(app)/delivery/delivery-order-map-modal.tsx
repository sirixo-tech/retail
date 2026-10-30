"use client";

import { Button } from "@selfx/ui";
import { formatInr } from "@selfx/types";
import {
  Bike,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Store,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface DeliveryOrderMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    number: string;
    status: string;
    fulfillment: string;
    customer_name: string;
    customer_phone?: string | null;
    total_paise: number;
    payment_method: string;
    delivery_status: string;
    delivery_staff_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    live_location_url?: string | null;
    address: string;
    city?: string | null;
    pincode?: string | null;
    landmark?: string | null;
    order_notes?: string | null;
    store_name?: string | null;
    store_address?: string | null;
    store_lat?: number | null;
    store_lng?: number | null;
  } | null;
  googleMapsApiKey?: string | null;
  onStatusTransition?: (orderId: string, toStatus: string, otp?: string) => Promise<boolean | void>;
}

function computeVerificationCode(orderNumber?: string, id?: string): string {
  const source = `${orderNumber ?? ""} ${id ?? ""}`;
  const digits = source.replace(/\D+/g, "");
  if (!digits) return "2045";
  const lastFour = digits.slice(-4);
  return lastFour.length === 4 ? lastFour : lastFour.padStart(4, "0");
}

export function DeliveryOrderMapModal({
  isOpen,
  onClose,
  order,
  googleMapsApiKey,
  onStatusTransition,
}: DeliveryOrderMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [googleMapLoaded, setGoogleMapLoaded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [otpPromptOpen, setOtpPromptOpen] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const storeLat = order.store_lat || 12.9716;
  const storeLng = order.store_lng || 77.5946;
  const custLat = order.latitude || storeLat + 0.015;
  const custLng = order.longitude || storeLng + 0.018;

  const navUrl =
    order.live_location_url ||
    `https://www.google.com/maps/dir/?api=1&origin=${storeLat},${storeLng}&destination=${custLat},${custLng}&travelmode=driving`;

  const isCod = order.payment_method === "cod";
  const isDelivered = order.delivery_status === "delivered" || order.status === "delivered";
  const isOutForDelivery = order.delivery_status === "out_for_delivery" || order.status === "out_for_delivery";

  // Load Google Maps script if API key is provided
  useEffect(() => {
    const key = googleMapsApiKey?.trim();
    if (!key || typeof window === "undefined") {
      setGoogleMapLoaded(false);
      return;
    }

    if ((window as any).google?.maps) {
      setGoogleMapLoaded(true);
      return;
    }

    const scriptId = "console-delivery-google-maps";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleMapLoaded(true);
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", () => setGoogleMapLoaded(true));
    }
  }, [googleMapsApiKey]);

  // Render Google Map
  useEffect(() => {
    if (!googleMapLoaded || !mapRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: (storeLat + custLat) / 2, lng: (storeLng + custLng) / 2 },
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
      });

      new google.maps.Marker({
        position: { lat: storeLat, lng: storeLng },
        map,
        title: "Store Pickup",
        label: { text: "🏪", fontSize: "16px" },
      });

      new google.maps.Marker({
        position: { lat: custLat, lng: custLng },
        map,
        title: "Customer Drop-off",
        label: { text: "📍", fontSize: "18px" },
      });

      const line = new google.maps.Polyline({
        path: [
          { lat: storeLat, lng: storeLng },
          { lat: custLat, lng: custLng },
        ],
        geodesic: true,
        strokeColor: "#4f46e5",
        strokeWeight: 4,
      });
      line.setMap(map);

      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: storeLat, lng: storeLng });
      bounds.extend({ lat: custLat, lng: custLng });
      map.fitBounds(bounds, 40);
    } catch {
      // ignore
    }
  }, [googleMapLoaded, storeLat, storeLng, custLat, custLng]);

  async function handleAction(status: string, otp?: string) {
    if (!onStatusTransition || !order) return;
    setTransitioning(true);
    try {
      await onStatusTransition(order.id, status, otp);
    } finally {
      setTransitioning(false);
    }
  }

  async function handleVerifyAndDeliver() {
    if (!order || !onStatusTransition) return;
    const clean = deliveryOtp.trim();
    if (clean.length !== 4) {
      setOtpError("Enter 4-digit OTP from customer");
      return;
    }
    const expected = computeVerificationCode(order.number, order.id);
    if (clean !== expected) {
      setOtpError("Incorrect OTP. Ask customer for 4-digit tracking code.");
      return;
    }
    setTransitioning(true);
    try {
      await onStatusTransition(order.id, "delivered", clean);
      setOtpPromptOpen(false);
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-line bg-bg px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Navigation size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  Delivery Route Navigation · #{order.number}
                </h3>
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {order.delivery_status.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-muted">Turn-by-turn live navigation for rider dispatch</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-slate-200/60 hover:text-ink transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Map Viewport */}
          <div className="relative h-64 sm:h-72 w-full rounded-xl bg-[#090d16] overflow-hidden border border-line">
            {googleMapLoaded ? (
              <div ref={mapRef} className="h-full w-full" />
            ) : (
              /* Vector Radar Map */
              <div className="relative h-full w-full p-4 flex flex-col justify-between select-none">
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M 25 75 Q 50 35 75 25" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="4 3" />
                </svg>

                {/* Store Pin */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                    <Store size={16} />
                  </div>
                  <div className="rounded-lg bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                    <div className="text-[10px] text-emerald-400 uppercase font-bold">Store Origin</div>
                    <div>{order.store_name || "Store"}</div>
                  </div>
                </div>

                {/* Customer Pin */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 flex-row-reverse">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg">
                    <MapPin size={16} />
                  </div>
                  <div className="rounded-lg bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-white text-right">
                    <div className="text-[10px] text-indigo-400 uppercase font-bold">Customer Drop-off</div>
                    <div className="truncate max-w-[150px]">{order.address}</div>
                  </div>
                </div>

                {/* Navigation Button Floating on Map */}
                <div className="absolute top-4 left-4 z-20">
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 transition"
                  >
                    <Navigation size={13} />
                    <span>Start Turn-by-Turn GPS</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Customer & Destination Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-line bg-bg p-3.5 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <User size={13} className="text-indigo-600" />
                <span>Customer Details</span>
              </div>
              <div className="font-semibold text-sm text-ink">{order.customer_name}</div>
              {order.customer_phone && (
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`tel:${order.customer_phone}`}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700"
                  >
                    <Phone size={12} />
                    <span>Call Customer</span>
                  </a>
                  <a
                    href={`https://wa.me/91${order.customer_phone.replace(/\D/g, "").slice(-10)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:bg-bg"
                  >
                    <span>WhatsApp</span>
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-bg p-3.5 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <MapPin size={13} className="text-indigo-600" />
                <span>Drop-off Address</span>
              </div>
              <p className="text-xs text-ink leading-relaxed font-medium">
                {order.address}
                {order.landmark ? ` (Near ${order.landmark})` : ""}
                {order.pincode ? ` - ${order.pincode}` : ""}
              </p>
              {order.latitude && order.longitude && (
                <div className="text-[11px] font-mono text-emerald-700">
                  GPS: {order.latitude.toFixed(5)}, {order.longitude.toFixed(5)}
                </div>
              )}
            </div>
          </div>

          {/* Cash on Delivery prompt */}
          {isCod && !isDelivered && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 flex items-center justify-between text-xs text-amber-950">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white font-semibold">
                  ₹
                </span>
                <div>
                  <div className="font-semibold">Collect Cash on Delivery (COD)</div>
                  <div className="text-[11px] text-amber-800">Collect exact amount from customer upon arrival</div>
                </div>
              </div>
              <span className="text-base font-semibold">{formatInr(order.total_paise)}</span>
            </div>
          )}

          {order.order_notes && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">Delivery Instructions:</span> {order.order_notes}
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-bg px-4 sm:px-5 py-3">
          <Button type="button" variant="secondary" onClick={onClose} size="sm">
            Close
          </Button>

          {otpPromptOpen ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                autoFocus
                placeholder="4-digit OTP"
                value={deliveryOtp}
                onChange={(e) => {
                  setDeliveryOtp(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setOtpError(null);
                }}
                className="h-8 w-28 rounded-lg border border-slate-300 px-2 text-center font-mono font-bold text-sm tracking-widest text-slate-900 outline-none focus:border-emerald-600 bg-white"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={transitioning || deliveryOtp.length !== 4}
                onClick={handleVerifyAndDeliver}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Verify &amp; Deliver
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setOtpPromptOpen(false);
                  setOtpError(null);
                }}
              >
                Cancel
              </Button>
              {otpError && (
                <span className="text-[11px] font-semibold text-rose-600 w-full text-right">
                  {otpError}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {!isOutForDelivery && !isDelivered && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={transitioning}
                  onClick={() => handleAction("out_for_delivery")}
                  className="inline-flex items-center gap-1.5 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                >
                  <Bike size={14} />
                  <span>Start Delivery (Out for Delivery)</span>
                </Button>
              )}

              {!isDelivered && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={transitioning}
                  onClick={() => {
                    if (order.fulfillment === "pickup") {
                      void handleAction("delivered");
                    } else {
                      setOtpPromptOpen(true);
                      setDeliveryOtp("");
                      setOtpError(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <ShieldCheck size={14} />
                  <span>{order.fulfillment === "pickup" ? "Mark Picked Up" : "Enter OTP & Deliver"}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
