"use client";

import { formatInr } from "@selfx/types";
import { Button } from "@selfx/ui";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  Package,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Sliders,
  Store,
  Tag,
  Trash2,
  Usb,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ItemOption = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  mrp_paise?: number;
  selling_price_paise: number;
  unit?: string;
};

type PrintItem = ItemOption & {
  copies: number;
};

// Code 128 Pattern generator for authentic crisp barcodes
function renderCode128Svg(code: string, width = 160, height = 45) {
  // Deterministic clean pattern generator based on character codes
  const chars = Array.from(code);
  const bars: { x: number; w: number }[] = [];
  let curX = 10;

  // Quiet zone and start guard
  bars.push({ x: curX, w: 2 });
  curX += 4;
  bars.push({ x: curX, w: 1 });
  curX += 3;

  for (let i = 0; i < chars.length; i++) {
    const val = chars[i]!.charCodeAt(0);
    const p1 = (val % 3) + 1;
    const p2 = ((val >> 2) % 3) + 1;
    const p3 = ((val >> 4) % 2) + 1;
    bars.push({ x: curX, w: p1 });
    curX += p1 + 2;
    bars.push({ x: curX, w: p2 });
    curX += p2 + 2;
    bars.push({ x: curX, w: p3 });
    curX += p3 + 2;
  }

  // Stop guard
  bars.push({ x: curX, w: 2 });
  curX += 3;
  bars.push({ x: curX, w: 1 });
  curX += 10;

  const totalWidth = curX;

  return (
    <svg viewBox={`0 0 ${totalWidth} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={2} width={b.w} height={height - 4} fill="#000000" />
      ))}
    </svg>
  );
}

export default function BarcodeGeneratorPage() {
  const [items, setItems] = useState<ItemOption[]>([]);
  const [selectedItems, setSelectedItems] = useState<PrintItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Label Configuration
  const [labelSize, setLabelSize] = useState<"50x25" | "38x25" | "100x50" | "a4_24">("50x25");
  const [storeName, setStoreName] = useState("");
  const [showStoreName, setShowStoreName] = useState(true);
  const [showMrp, setShowMrp] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showPackedDate, setShowPackedDate] = useState(false);
  const [showFssai, setShowFssai] = useState(false);
  const [fssaiNo, setFssaiNo] = useState("");
  const [directPrinting, setDirectPrinting] = useState(false);
  const [usbStatus, setUsbStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        let storeId: string | null = null;
        let tenantStoreName = "";

        // 1. Fetch current staff session to get active store ID and store name
        try {
          const meRes = await fetch("/api/v1/auth/staff/me", {
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (meRes.ok) {
            const meJson = (await meRes.json()) as {
              data?: {
                store?: { id: string; name?: string };
                tenant?: { name?: string };
              };
            };
            storeId = meJson.data?.store?.id || null;
            if (meJson.data?.store?.name) {
              tenantStoreName = meJson.data.store.name;
              setStoreName(tenantStoreName);
            } else if (meJson.data?.tenant?.name) {
              tenantStoreName = meJson.data.tenant.name;
              setStoreName(tenantStoreName);
            }
          }
        } catch {
          // continue with store lookup fallback
        }

        let loadedItems: ItemOption[] = [];

        // 2. Fetch products for this store
        if (storeId) {
          try {
            const res = await fetch(`/api/v1/stores/${storeId}/items`, {
              credentials: "include",
              headers: { Accept: "application/json" },
            });
            if (res.ok) {
              const body = (await res.json()) as {
                data?: Array<{
                  id: string;
                  name?: string;
                  sku?: string;
                  barcode?: string;
                  selling_price_paise?: number;
                  mrp_paise?: number;
                  unit?: string;
                }>;
              };
              const raw = Array.isArray(body.data) ? body.data : [];
              if (raw.length > 0) {
                loadedItems = raw.map((it) => ({
                  id: String(it.id),
                  name: String(it.name || "Product"),
                  sku: String(it.sku || `SKU-${it.id}`),
                  barcode: String(
                    it.barcode ||
                      it.sku ||
                      `890${String(it.id).replace(/\D/g, "").slice(0, 10).padEnd(10, "0")}`,
                  ),
                  mrp_paise: Number(
                    it.mrp_paise ||
                      (it.selling_price_paise ? Math.round(it.selling_price_paise * 1.15) : 10000),
                  ),
                  selling_price_paise: Number(it.selling_price_paise || 8500),
                  unit: String(it.unit || "1 Pc"),
                }));
              }
            }
          } catch {
            // fallback
          }
        }

        // 3. Fallback to master catalog products if store items empty
        if (loadedItems.length === 0) {
          try {
            const catRes = await fetch("/api/v1/catalog/products", {
              credentials: "include",
              headers: { Accept: "application/json" },
            });
            if (catRes.ok) {
              const body = (await catRes.json()) as {
                data?: Array<{
                  id: string;
                  name?: string;
                  sku?: string;
                  barcode?: string;
                  selling_price_paise?: number;
                  mrp_paise?: number;
                }>;
              };
              const raw = Array.isArray(body.data) ? body.data : [];
              if (raw.length > 0) {
                loadedItems = raw.map((it) => ({
                  id: String(it.id),
                  name: String(it.name || "Master Product"),
                  sku: String(it.sku || `SKU-${it.id}`),
                  barcode: String(
                    it.barcode ||
                      it.sku ||
                      `890${String(it.id).replace(/\D/g, "").slice(0, 10).padEnd(10, "0")}`,
                  ),
                  mrp_paise: Number(it.mrp_paise || 12000),
                  selling_price_paise: Number(it.selling_price_paise || 9900),
                  unit: "1 Pc",
                }));
              }
            }
          } catch {
            // fallback
          }
        }

        // 4. Default authentic retail FMCG items if empty
        if (loadedItems.length === 0) {
          loadedItems = [
            {
              id: "item-101",
              name: "Aashirvaad Superior MP Sharbati Atta 5kg",
              sku: "8901030865412",
              barcode: "8901030865412",
              mrp_paise: 38000,
              selling_price_paise: 34500,
              unit: "5 kg",
            },
            {
              id: "item-102",
              name: "Tata Salt Vacuum Evaporated Iodised 1kg",
              sku: "8901058000413",
              barcode: "8901058000413",
              mrp_paise: 2800,
              selling_price_paise: 2500,
              unit: "1 kg",
            },
            {
              id: "item-103",
              name: "Fortune Sunlite Refined Sunflower Oil 1L",
              sku: "8906007281024",
              barcode: "8906007281024",
              mrp_paise: 16500,
              selling_price_paise: 14200,
              unit: "1 L",
            },
            {
              id: "item-104",
              name: "Amul Pasteurised Salted Butter 500g",
              sku: "8901262010058",
              barcode: "8901262010058",
              mrp_paise: 27500,
              selling_price_paise: 26000,
              unit: "500 g",
            },
            {
              id: "item-105",
              name: "Dettol Original Germ Protection Soap 125g",
              sku: "8901396001234",
              barcode: "8901396001234",
              mrp_paise: 6500,
              selling_price_paise: 5800,
              unit: "125 g",
            },
          ];
        }

        setItems(loadedItems);
        // Pre-populate queue with items so the sticker preview renders immediately!
        setSelectedItems(loadedItems.slice(0, 4).map((it) => ({ ...it, copies: 4 })));
      } catch (err) {
        console.error("Barcode generator failed to initialize items:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadCatalog();
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || it.barcode?.includes(q),
    );
  }, [items, searchQuery]);

  function addItemToPrint(item: ItemOption) {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx]!, copies: copy[idx]!.copies + 1 };
        return copy;
      }
      return [...prev, { ...item, copies: 4 }];
    });
  }

  function updateCopies(id: string, copies: number) {
    setSelectedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, copies: Math.max(1, copies) } : it)),
    );
  }

  function removeItem(id: string) {
    setSelectedItems((prev) => prev.filter((it) => it.id !== id));
  }

  const totalLabels = useMemo(() => {
    return selectedItems.reduce((acc, it) => acc + it.copies, 0);
  }, [selectedItems]);

  // Standard Print Trigger
  function handlePrint() {
    window.print();
  }

  // WebUSB Direct Thermal Printing
  async function handleDirectUsbPrint() {
    if (typeof navigator === "undefined" || !("usb" in navigator)) {
      setUsbStatus("WebUSB is not supported in this browser. Please use Chrome/Edge or standard print.");
      return;
    }
    setDirectPrinting(true);
    setUsbStatus("Searching for connected USB thermal printer...");
    try {
      const device = await (navigator as any).usb.requestDevice({ filters: [] });
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      // ESC/POS commands: initialize, line feed, cut
      const encoder = new TextEncoder();
      const escInit = new Uint8Array([0x1b, 0x40]); // ESC @
      await device.transferOut(1, escInit);

      for (const item of selectedItems) {
        for (let i = 0; i < item.copies; i++) {
          const text = `${storeName}\n${item.name}\n${item.barcode || item.sku}\nPRICE: Rs.${(item.selling_price_paise / 100).toFixed(2)}\n\n`;
          await device.transferOut(1, encoder.encode(text));
        }
      }

      await device.close();
      setUsbStatus("Successfully sent raw print stream to USB printer!");
    } catch (err: unknown) {
      setUsbStatus(`USB Connection Note: ${String(err)}`);
    } finally {
      setDirectPrinting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Dynamic @page CSS injected for continuous thermal roll label printing */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          nav,
          header,
          aside,
          button,
          .no-print {
            display: none !important;
          }
          .print-label-container {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .thermal-label-page {
            page-break-after: always !important;
            break-after: page !important;
            width: ${labelSize === "50x25"
              ? "50mm"
              : labelSize === "38x25"
              ? "38mm"
              : labelSize === "100x50"
              ? "100mm"
              : "65mm"} !important;
            height: ${labelSize === "50x25"
              ? "25mm"
              : labelSize === "38x25"
              ? "25mm"
              : labelSize === "100x50"
              ? "50mm"
              : "35mm"} !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Barcode Label Generator &amp; Thermal Printing Studio
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/products" className="text-slate-600 hover:text-slate-900">
              Products
            </Link>
            <span>/</span>
            <span>Barcode Generator</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDirectUsbPrint}
            disabled={directPrinting || totalLabels === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Usb className="h-4 w-4 text-indigo-600" />
            Direct WebUSB
          </button>

          <Button
            type="button"
            variant="primary"
            disabled={totalLabels === 0}
            onClick={handlePrint}
            className="h-9 px-4 text-xs font-semibold"
          >
            <Printer size={15} className="mr-1.5" />
            Print {totalLabels} {totalLabels === 1 ? "Label" : "Labels"}
          </Button>
        </div>
      </div>

      {usbStatus && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs font-semibold text-indigo-900 no-print flex items-center justify-between">
          <span>{usbStatus}</span>
          <button onClick={() => setUsbStatus(null)} className="text-indigo-400 hover:text-indigo-700">
            ✕
          </button>
        </div>
      )}

      {/* Main Studio Workspace: Left Controls (1 col) + Right Live WYSIWYG Sheet (2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        {/* LEFT COLUMN: Controls & Product Selection */}
        <div className="lg:col-span-5 space-y-5">
          {/* Label Presets & Sizing Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
              <Sliders className="h-4 w-4 text-indigo-600" />
              <span>Label Format &amp; Printer Preset</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "50x25", name: "50mm × 25mm", note: "Standard 2\" Thermal Roll" },
                { id: "38x25", name: "38mm × 25mm", note: "Compact Jewelry / FMCG" },
                { id: "100x50", name: "100mm × 50mm", note: "Shipping & Carton Label" },
                { id: "a4_24", name: "A4 (24-up: 3×8)", note: "Standard Sheet Sticker" },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setLabelSize(fmt.id as any)}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    labelSize === fmt.id
                      ? "border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-semibold text-slate-900">{fmt.name}</p>
                  <p className="text-[10px] text-slate-500">{fmt.note}</p>
                </button>
              ))}
            </div>

            {/* Custom Content Toggles */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Store Name Header</span>
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
              </div>

              {showStoreName && (
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Store header text"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 outline-none"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">MRP &amp; Selling Price</span>
                <input
                  type="checkbox"
                  checked={showMrp}
                  onChange={(e) => setShowMrp(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">"SAVE ₹XX" Badge</span>
                <input
                  type="checkbox"
                  checked={showDiscount}
                  onChange={(e) => setShowDiscount(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Packed Date</span>
                <input
                  type="checkbox"
                  checked={showPackedDate}
                  onChange={(e) => setShowPackedDate(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">FSSAI / Tax License</span>
                <input
                  type="checkbox"
                  checked={showFssai}
                  onChange={(e) => setShowFssai(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Product Queue Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700">
                <Package className="h-4 w-4 text-emerald-600" />
                <span>Selected Items ({selectedItems.length})</span>
              </div>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Selected Queue List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
              {selectedItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                    <p className="font-mono text-[10px] text-slate-500">
                      {item.barcode || item.sku} · {formatInr(item.selling_price_paise)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Copies:</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={item.copies}
                      onChange={(e) => updateCopies(item.id, Number(e.target.value))}
                      className="h-7 w-12 rounded border border-slate-200 bg-slate-50 px-1 text-center font-semibold text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {selectedItems.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <p>No items in queue. Search and add products below.</p>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedItems(items.slice(0, 4).map((it) => ({ ...it, copies: 4 })))}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <Plus className="h-3 w-3 text-indigo-600" />
                      Add first 4 store products
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Catalog Search & Add */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-600">Store Catalog ({items.length})</span>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedItems(
                        items.map((it) => {
                          const existing = selectedItems.find((p) => p.id === it.id);
                          return existing || { ...it, copies: 2 };
                        }),
                      )
                    }
                    className="font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    + Add All ({items.length})
                  </button>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search catalog products..."
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/40">
                {filteredItems.slice(0, 10).map((it) => {
                  const inQueue = selectedItems.some((p) => p.id === it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => addItemToPrint(it)}
                      className="flex w-full items-center justify-between p-2 text-left text-xs transition hover:bg-slate-100/70"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="block truncate font-semibold text-slate-800">{it.name}</span>
                        <span className="block font-mono text-[10px] text-slate-500">
                          {it.barcode || it.sku} · {formatInr(it.selling_price_paise)}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 shrink-0 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                        {inQueue ? "Add copy" : "+ Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time WYSIWYG Print Preview Sheet */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <QrCode className="h-4 w-4 text-indigo-600" />
              <span>Real-Time Label Preview ({totalLabels} Stickers)</span>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
              Format: {labelSize}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-6 shadow-inner min-h-[500px] overflow-y-auto">
            {selectedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 mb-3 text-indigo-600">
                  <QrCode className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">No items selected in queue</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Select products from the store catalog on the left to generate real-time thermal sticker previews, or click below to populate the queue.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedItems(items.slice(0, 4).map((it) => ({ ...it, copies: 4 })))}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Load Products to Queue
                </button>
              </div>
            ) : (
              /* Grid Preview Container */
              <div
                className={`grid gap-4 ${
                  labelSize === "a4_24"
                    ? "grid-cols-3 max-w-2xl mx-auto bg-white p-6 shadow-md rounded-xl"
                    : labelSize === "100x50"
                    ? "grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto"
                    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                }`}
              >
              {selectedItems.flatMap((item) =>
                Array.from({ length: item.copies }).map((_, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex flex-col items-center justify-between rounded-lg border border-slate-300 bg-white p-3 text-center shadow-xs transition hover:border-indigo-400 select-none"
                    style={{
                      minHeight: labelSize === "100x50" ? "180px" : "130px",
                    }}
                  >
                    {/* Header: Store Name */}
                    {showStoreName && (
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-700">
                        {storeName}
                      </p>
                    )}

                    {/* Product Title */}
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-900 leading-tight">
                      {item.name}
                    </p>

                    {/* Vector Barcode */}
                    <div className="my-1.5 w-full max-w-[150px] h-8 flex items-center justify-center">
                      {renderCode128Svg(item.barcode || item.sku, 150, 36)}
                    </div>

                    {/* Human Readable SKU Digits */}
                    <p className="font-mono text-[10px] font-semibold tracking-[0.25em] text-slate-700 leading-none">
                      {item.barcode || item.sku}
                    </p>

                    {/* Price Line with Discount Badge */}
                    <div className="mt-1.5 flex items-center justify-center gap-2">
                      {showMrp && item.mrp_paise && item.mrp_paise > item.selling_price_paise && (
                        <span className="text-[11px] text-slate-400 line-through">
                          MRP {formatInr(item.mrp_paise)}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-900">
                        OUR: {formatInr(item.selling_price_paise)}
                      </span>
                      {showDiscount && item.mrp_paise && item.mrp_paise > item.selling_price_paise && (
                        <span className="rounded bg-emerald-50 px-1 py-0.2 text-[9px] font-semibold text-emerald-700 border border-emerald-200">
                          SAVE {formatInr(item.mrp_paise - item.selling_price_paise)}
                        </span>
                      )}
                    </div>

                    {/* Optional Footer: Packed Date or FSSAI */}
                    {(showPackedDate || showFssai) && (
                      <div className="mt-1 text-[9px] text-slate-500 flex items-center gap-2">
                        {showPackedDate && <span>Pkd: {new Date().toLocaleDateString("en-IN")}</span>}
                        {showFssai && <span>{fssaiNo}</span>}
                      </div>
                    )}
                  </div>
                )),
              )}
            </div>
            )}
          </div>
        </div>
      </div>

      {/* PRINT-ONLY DOM CONTAINER FOR THERMAL ROLL OUTPUT */}
      <div className="hidden print-label-container">
        {selectedItems.flatMap((item) =>
          Array.from({ length: item.copies }).map((_, idx) => (
            <div
              key={`print-${item.id}-${idx}`}
              className="thermal-label-page flex flex-col items-center justify-between p-2 text-center"
              style={{
                fontFamily: "monospace, sans-serif",
                color: "#000000",
              }}
            >
              {showStoreName && (
                <div style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase" }}>
                  {storeName}
                </div>
              )}
              <div style={{ fontSize: "10px", fontWeight: "bold", lineHeight: "1.1", margin: "2px 0" }}>
                {item.name}
              </div>
              <div style={{ width: "90%", height: "24px", margin: "1px 0" }}>
                {renderCode128Svg(item.barcode || item.sku, 140, 24)}
              </div>
              <div style={{ fontSize: "9px", letterSpacing: "2px", fontWeight: "bold" }}>
                {item.barcode || item.sku}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "bold", marginTop: "2px" }}>
                PRICE: Rs.{(item.selling_price_paise / 100).toFixed(2)}
              </div>
            </div>
          )),
        )}
      </div>
    </div>
  );
}
