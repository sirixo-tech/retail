"use client";

import {
  Bike,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface LiveOrderMapProps {
  storeLat: number;
  storeLng: number;
  storeName: string;
  storeAddress?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  customerAddress?: string | null;
  orderNumber: string;
  orderStatus: string; // placed, confirmed, packed, out_for_delivery, delivered, cancelled
  fulfillment?: string; // delivery, pickup
  deliveryStaffName?: string | null;
  deliveryStaffPhone?: string | null;
  googleMapsApiKey?: string | null;
  liveLocationUrl?: string | null;
  brandPrimaryColor?: string;
  heightClass?: string;
  showDetails?: boolean;
}

// Calculate straight-line distance in km via Haversine formula
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function LiveOrderMap({
  storeLat,
  storeLng,
  storeName,
  storeAddress,
  customerLat,
  customerLng,
  customerAddress,
  orderNumber,
  orderStatus,
  fulfillment = "delivery",
  deliveryStaffName,
  deliveryStaffPhone,
  googleMapsApiKey,
  liveLocationUrl,
  brandPrimaryColor = "#0c831f",
  heightClass = "h-72 sm:h-80",
  showDetails = true,
}: LiveOrderMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [googleMapLoaded, setGoogleMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const hasCustGps = typeof customerLat === "number" && typeof customerLng === "number" && !isNaN(customerLat);
  const safeCustLat = hasCustGps ? (customerLat as number) : storeLat + 0.012;
  const safeCustLng = hasCustGps ? (customerLng as number) : storeLng + 0.015;

  const distanceKm = calculateDistanceKm(storeLat, storeLng, safeCustLat, safeCustLng);
  // Estimate time: avg 20 km/h in city plus 4 min buffer
  const estMins = Math.max(8, Math.round((distanceKm / 20) * 60 + 4));

  // Turn-by-turn Google Maps direction URL
  const directionsUrl = liveLocationUrl || `https://www.google.com/maps/dir/?api=1&origin=${storeLat},${storeLng}&destination=${safeCustLat},${safeCustLng}&travelmode=driving`;

  // Dynamically load Google Maps if API key is provided
  useEffect(() => {
    const key = googleMapsApiKey?.trim();
    if (!key) {
      setGoogleMapLoaded(false);
      return;
    }

    if (typeof window === "undefined") return;

    // Check if google maps already loaded
    if ((window as any).google?.maps) {
      setGoogleMapLoaded(true);
      return;
    }

    const scriptId = "selfx-google-maps-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleMapLoaded(true);
      script.onerror = () => {
        setMapError(true);
        setGoogleMapLoaded(false);
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", () => setGoogleMapLoaded(true));
    }
  }, [googleMapsApiKey]);

  // Initialize real Google Map if API key is available
  useEffect(() => {
    if (!googleMapLoaded || !mapRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    try {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: (storeLat + safeCustLat) / 2, lng: (storeLng + safeCustLng) / 2 },
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
        ],
      });

      // Store Marker
      new google.maps.Marker({
        position: { lat: storeLat, lng: storeLng },
        map,
        title: storeName,
        label: {
          text: "🏪",
          fontSize: "18px",
        },
      });

      // Customer Marker
      new google.maps.Marker({
        position: { lat: safeCustLat, lng: safeCustLng },
        map,
        title: "Your Delivery Location",
        label: {
          text: "📍",
          fontSize: "20px",
        },
      });

      // Rider Marker if out for delivery
      if (orderStatus === "out_for_delivery") {
        const midLat = storeLat + (safeCustLat - storeLat) * 0.65;
        const midLng = storeLng + (safeCustLng - storeLng) * 0.65;
        new google.maps.Marker({
          position: { lat: midLat, lng: midLng },
          map,
          title: deliveryStaffName ? `Rider: ${deliveryStaffName}` : "Delivery Partner",
          label: {
            text: "🛵",
            fontSize: "22px",
          },
        });
      }

      // Route Polyline
      const routeLine = new google.maps.Polyline({
        path: [
          { lat: storeLat, lng: storeLng },
          { lat: safeCustLat, lng: safeCustLng },
        ],
        geodesic: true,
        strokeColor: brandPrimaryColor || "#0c831f",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });
      routeLine.setMap(map);

      // Fit bounds
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: storeLat, lng: storeLng });
      bounds.extend({ lat: safeCustLat, lng: safeCustLng });
      map.fitBounds(bounds, 50);
    } catch {
      setMapError(true);
    }
  }, [googleMapLoaded, storeLat, storeLng, safeCustLat, safeCustLng, orderStatus, deliveryStaffName, brandPrimaryColor]);

  const isOutForDelivery = orderStatus === "out_for_delivery";
  const isDelivered = orderStatus === "delivered";
  const isPacked = orderStatus === "packed";
  const isConfirmed = orderStatus === "confirmed" || orderStatus === "accepted" || orderStatus === "processing";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      {/* Live Status Header Strip (Instamart / Blinkit Standard) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#fbfcfb] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs"
            style={{ backgroundColor: brandPrimaryColor }}
          >
            {isDelivered ? (
              <CheckCircle2 size={18} />
            ) : isOutForDelivery ? (
              <Bike size={18} className="animate-bounce" />
            ) : (
              <Clock size={18} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-slate-900">
                {isDelivered
                  ? "Order Delivered"
                  : isOutForDelivery
                  ? `Arriving in ~${estMins} mins`
                  : isPacked
                  ? "Order Packed & Ready"
                  : isConfirmed
                  ? "Order Confirmed & Preparing"
                  : "Order Placed & Awaiting Store"}
              </h4>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Order #{orderNumber} · {distanceKm} km away
            </p>
          </div>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
        >
          <Navigation size={13} style={{ color: brandPrimaryColor }} />
          <span>Open in Google Maps</span>
          <ExternalLink size={11} className="text-slate-400" />
        </a>
      </div>

      {/* Map Canvas Viewport */}
      <div className={`relative w-full ${heightClass} bg-slate-900 overflow-hidden`}>
        {/* Real Google Map Container (when loaded) */}
        {googleMapLoaded && !mapError ? (
          <div ref={mapRef} className="h-full w-full" />
        ) : (
          /* High-Fidelity Vector Radar Map Fallback */
          <div className="relative h-full w-full bg-[#0a1120] p-4 flex flex-col justify-between select-none">
            {/* Grid Pattern Background */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            {/* Radar Pulse Wave Animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-emerald-500/20 animate-ping pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-emerald-500/30 pointer-events-none" />

            {/* SVG Interactive Route Path */}
            <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              {/* Route line */}
              <path
                d="M 22 75 Q 45 35 78 28"
                fill="none"
                stroke="url(#routeGrad)"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                className="animate-pulse"
              />
            </svg>

            {/* Store Origin Pin (Bottom Left) */}
            <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-500/30">
                <Store size={18} />
              </div>
              <div className="rounded-lg bg-black/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white border border-white/10 shadow-md">
                <div className="text-emerald-400 text-[10px] uppercase font-bold tracking-wider">Pickup Store</div>
                <div className="truncate max-w-[130px]">{storeName}</div>
              </div>
            </div>

            {/* Moving Delivery Rider (Along route) */}
            {isOutForDelivery && (
              <div className="absolute top-[48%] left-[48%] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-xl ring-4 ring-orange-500/40 animate-pulse"
                  style={{ backgroundColor: brandPrimaryColor }}
                >
                  <Bike size={20} />
                </div>
                <span className="mt-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold text-slate-800 shadow-sm border border-slate-200">
                  Rider En Route
                </span>
              </div>
            )}

            {/* Customer Drop-off Pin (Top Right) */}
            <div className="absolute top-6 right-6 z-10 flex items-center gap-2 flex-row-reverse">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-500/30">
                <MapPin size={18} />
              </div>
              <div className="rounded-lg bg-black/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white border border-white/10 shadow-md text-right">
                <div className="text-indigo-400 text-[10px] uppercase font-bold tracking-wider">Your Location</div>
                <div className="truncate max-w-[140px]">{customerAddress || "GPS Pinned Drop-off"}</div>
              </div>
            </div>

            {/* Live GPS Radar Floating Badge */}
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-slate-200 border border-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live GPS Radar · ~{estMins} mins ETA</span>
            </div>
          </div>
        )}
      </div>

      {/* Driver & Delivery Information Card */}
      {showDetails && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Driver Contact & Verification */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                {deliveryStaffName ? deliveryStaffName.charAt(0).toUpperCase() : "D"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900">
                    {deliveryStaffName || "Delivery Partner Assigned"}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                    <ShieldCheck size={10} />
                    Verified
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Contactless sanitized delivery</p>
              </div>
            </div>

            {deliveryStaffPhone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${deliveryStaffPhone}`}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition"
                >
                  <Phone size={12} />
                  <span>Call Rider</span>
                </a>
                <a
                  href={`https://wa.me/91${deliveryStaffPhone.replace(/\D/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>

          {/* 5-Step Status Progress Tracker */}
          <div className="pt-2">
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {[
                { key: "placed", label: "Placed", active: true },
                { key: "confirmed", label: "Accepted", active: isConfirmed || isPacked || isOutForDelivery || isDelivered },
                { key: "packed", label: "Packed", active: isPacked || isOutForDelivery || isDelivered },
                { key: "out_for_delivery", label: "On the way", active: isOutForDelivery || isDelivered },
                { key: "delivered", label: "Delivered", active: isDelivered },
              ].map((step, idx) => (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition ${
                      step.active
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {step.active ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`mt-1 text-[10px] font-semibold ${
                      step.active ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            {/* Progress line */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  backgroundColor: brandPrimaryColor,
                  width: isDelivered
                    ? "100%"
                    : isOutForDelivery
                    ? "75%"
                    : isPacked
                    ? "50%"
                    : isConfirmed
                    ? "25%"
                    : "10%",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
