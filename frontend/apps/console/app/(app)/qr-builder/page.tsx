"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Maximize2,
  PackageCheck,
  Printer,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Palette,
  Store,
  Wallet,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

type StoreBranch = {
  id: string;
  name: string;
  code: string;
  public_slug?: string;
  is_default: boolean;
};

const QUICK_STYLES = [
  { id: "emerald", label: "Emerald", fg: "#059669", bg: "#FFFFFF" },
  { id: "slate", label: "Slate", fg: "#0f172a", bg: "#FFFFFF" },
  { id: "indigo", label: "Indigo", fg: "#4f46e5", bg: "#FFFFFF" },
  { id: "zinc", label: "Zinc", fg: "#18181b", bg: "#FFFFFF" },
];

export default function QrBuilderPage() {
  const [branches, setBranches] = useState<StoreBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [qrType, setQrType] = useState<"general" | "table">("general");
  const [selectedTableCounter, setSelectedTableCounter] = useState<string>("T1");

  // Styling
  const [activeStyle, setActiveStyle] = useState("emerald");
  const [fgColor, setFgColor] = useState("#059669");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [sizePreset, setSizePreset] = useState<"small" | "medium" | "large" | "print">("medium");
  const [showStoreName, setShowStoreName] = useState(true);
  const [largeLogo, setLargeLogo] = useState(true);

  // QR outputs
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrSvgString, setQrSvgString] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Load branches
  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } });
        if (res.ok) {
          const body = await res.json();
          const list: StoreBranch[] = body.data?.stores ?? [];
          setBranches(list);
          const def = list.find((b) => b.is_default) ?? list[0];
          if (def) setSelectedBranchId(def.id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeBranch = branches.find((b) => b.id === selectedBranchId) ?? branches[0];

  // Compute the live target URL
  const targetUrl = (() => {
    const slug = activeBranch?.public_slug || activeBranch?.code || "annapurna";
    let base = `http://127.0.0.1:3003?store=${encodeURIComponent(slug)}`;
    if (qrType === "table") {
      base += `&counter=${encodeURIComponent(selectedTableCounter)}`;
    }
    return base;
  })();

  // Render QR Code whenever parameters change
  useEffect(() => {
    if (!targetUrl) return;

    const pxMap = {
      small: 300,
      medium: 400,
      large: 800,
      print: 1200,
    };
    const width = pxMap[sizePreset];

    void QRCode.toDataURL(targetUrl, {
      width,
      margin: 1,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    }).then(setQrDataUrl);

    void QRCode.toString(targetUrl, {
      type: "svg",
      width,
      margin: 1,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    }).then(setQrSvgString);
  }, [targetUrl, fgColor, bgColor, sizePreset]);

  function handleQuickStyle(s: (typeof QUICK_STYLES)[0]) {
    setActiveStyle(s.id);
    setFgColor(s.fg);
    setBgColor(s.bg);
  }

  function handleCopy() {
    void navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadPng() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `selfx-store-qr-${activeBranch?.code || "branch"}.png`;
    a.click();
  }

  function handleDownloadSvg() {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selfx-store-qr-${activeBranch?.code || "branch"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-standee-card,
          #print-standee-card * {
            visibility: visible;
          }
          #print-standee-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: 1px solid #ccc;
          }
        }
      `}</style>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">QR Code Builder</h1>
        <p className="mt-1 text-xs text-muted">
          Create printable codes for your menu, catalog, or counter ordering. Customers scan to order and pay on their phone.
        </p>
      </div>

      {/* Blue Informative Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 text-xs text-[#1e40af] dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 shadow-2xs">
        <Info size={17} className="mt-0.5 text-[#2563eb] dark:text-blue-400 shrink-0" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#1e3a8a] dark:text-blue-100">Where to use QR codes:</span> Print a standee code for dine-in or counter
          pickup (orders link to that counter), or a general storefront code for takeaway / online shopping. With
          multiple branches, the QR includes the location so guests always land on the right outlet.
        </div>
      </div>

      {/* Two Column Layout (Form on Left, Live Card Preview on Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Settings Panel (lg:col-span-7) */}
        <div className="space-y-5 lg:col-span-7">
          {/* Section 1: What should this QR open? */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 shadow-2xs">
                <QrCode size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">What should this QR open?</h2>
                <p className="text-[11px] text-muted">Pick a branch, then a general storefront link or specific counter.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-4">
              {/* Option 1: General menu */}
              <div
                onClick={() => setQrType("general")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  qrType === "general"
                    ? "border-emerald-600 bg-[#ecfdf5] ring-1 ring-emerald-600 dark:bg-emerald-950/40"
                    : "border-line bg-surface hover:border-slate-300 hover:bg-bg"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
                    <Store size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-ink">General Storefront</div>
                    <div className="text-[11px] text-muted">Counter, takeaway, or online catalog</div>
                  </div>
                </div>
              </div>

              {/* Option 2: Table / Counter QR */}
              <div
                onClick={() => setQrType("table")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  qrType === "table"
                    ? "border-emerald-600 bg-[#ecfdf5] ring-1 ring-emerald-600 dark:bg-emerald-950/40"
                    : "border-line bg-surface hover:border-slate-300 hover:bg-bg"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface-muted text-ink shadow-2xs">
                    <Layers size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-ink">Table / Counter QR</div>
                    <div className="text-[11px] text-muted">Links orders to a specific register/table</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Branch Selector Dropdown */}
            <div className="mt-4 pt-4 border-t border-line/70">
              <label className="block text-xs font-semibold text-ink">Branch Location</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink focus:border-emerald-600 focus:outline-hidden"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}){b.is_default ? " — Default" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Counter Selector if Table QR */}
            {qrType === "table" ? (
              <div className="mt-3">
                <label className="block text-xs font-semibold text-ink">Counter / Register Code</label>
                <input
                  type="text"
                  value={selectedTableCounter}
                  onChange={(e) => setSelectedTableCounter(e.target.value.toUpperCase())}
                  placeholder="e.g. T1, T2, COUNTER-A"
                  className="mt-1.5 h-10 w-full font-mono uppercase rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            ) : null}
          </div>

          {/* Section 2: Look & size */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 shadow-2xs">
                <Palette size={16} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">Look &amp; size</h2>
                <p className="text-[11px] text-muted">Colors, branding, and download resolution for printing.</p>
              </div>
            </div>

            {/* Quick styles */}
            <div>
              <label className="block text-xs font-semibold text-muted mb-2">QUICK STYLES</label>
              <div className="grid grid-cols-4 gap-2.5">
                {QUICK_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleQuickStyle(style)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all cursor-pointer ${
                      activeStyle === style.id
                        ? "border-emerald-600 bg-[#ecfdf5] ring-1 ring-emerald-600 dark:bg-emerald-950/40 shadow-xs"
                        : "border-line bg-surface hover:bg-bg"
                    }`}
                  >
                    <span className="size-4 rounded-sm mb-1.5 shadow-xs" style={{ backgroundColor: style.fg }} />
                    <span className="text-[11px] font-semibold text-ink">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Foreground & Background Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink">Foreground</label>
                <div className="mt-1.5 flex h-10 items-center overflow-hidden rounded-lg border border-line bg-surface px-2 gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => {
                      setFgColor(e.target.value);
                      setActiveStyle("custom");
                    }}
                    className="size-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => {
                      setFgColor(e.target.value);
                      setActiveStyle("custom");
                    }}
                    className="flex-1 font-mono text-xs text-ink uppercase bg-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Background</label>
                <div className="mt-1.5 flex h-10 items-center overflow-hidden rounded-lg border border-line bg-surface px-2 gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      setActiveStyle("custom");
                    }}
                    className="size-6 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => {
                      setBgColor(e.target.value);
                      setActiveStyle("custom");
                    }}
                    className="flex-1 font-mono text-xs text-ink uppercase bg-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Size Slider / Presets */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-ink">Download resolution</span>
                <span className="font-mono text-muted text-[11px]">
                  {sizePreset === "small"
                    ? "300 × 300 px"
                    : sizePreset === "medium"
                    ? "400 × 400 px"
                    : sizePreset === "large"
                    ? "800 × 800 px"
                    : "1200 × 1200 px (300 DPI Print)"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(["small", "medium", "large", "print"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSizePreset(s)}
                    className={`rounded-lg border py-1.5 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      sizePreset === s
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "border-line text-muted hover:text-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2 border-t border-line/70">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-ink">Show store name</div>
                  <div className="text-[11px] text-muted">Hide the name when your logo already includes branding.</div>
                </div>
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="size-4 rounded border-line text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-ink">Large centered logo</div>
                  <div className="text-[11px] text-muted">Show a bigger brand mark centered at the top of the card.</div>
                </div>
                <input
                  type="checkbox"
                  checked={largeLogo}
                  onChange={(e) => setLargeLogo(e.target.checked)}
                  className="size-4 rounded border-line text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Scanning Tip */}
            <div className="flex items-start gap-2.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3.5 text-xs text-[#92400e] dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 shadow-2xs">
              <AlertTriangle size={17} className="mt-0.5 text-[#d97706] dark:text-amber-400 shrink-0" />
              <div className="leading-relaxed">
                <span className="font-semibold text-[#78350f] dark:text-amber-100">Scanning tip:</span> Dark code on a light background works best. Avoid
                low-contrast pairs and glossy laminates that reflect phone flash.
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Standee Card Preview (lg:col-span-5) */}
        <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-6 lg:self-start">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            {qrType === "table" ? "Table / Counter Card Preview" : "Storefront QR Card Preview"}
          </div>

          {/* Standee Acrylic Card Preview (Printable target) */}
          <div
            id="print-standee-card"
            ref={printAreaRef}
            className="relative mx-auto flex w-full max-w-[340px] flex-col items-center rounded-2xl border-2 border-slate-900 bg-white p-5 sm:p-6 pb-6 text-center text-slate-900 shadow-xl"
          >
            {/* Store Brand / Logo */}
            <div>
              <div
                className={`mx-auto flex items-center justify-center rounded-2xl bg-amber-500 text-white font-semibold shadow-sm ${
                  largeLogo ? "size-12 text-xl" : "size-10 text-base"
                }`}
              >
                SX
              </div>
              {showStoreName ? (
                <div className="mt-1.5 text-sm font-semibold tracking-tight text-slate-900 uppercase">
                  {activeBranch?.name || "Retail Store"}
                </div>
              ) : null}
            </div>

            {/* Headline */}
            <div className="mt-1.5">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900 uppercase">
                Scan to Order &amp; Pay
              </h3>
              <p className="mt-0.5 text-[10.5px] font-semibold text-slate-500">
                {qrType === "table"
                  ? `Counter / Register ${selectedTableCounter} • ${activeBranch?.name}`
                  : `Online Storefront • ${activeBranch?.name}`}
              </p>
            </div>

            {/* Vector QR Code */}
            <div className="my-3 rounded-2xl border-2 border-slate-900 p-2.5 bg-white shadow-sm">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Storefront QR Code"
                  className="size-36 object-contain sm:size-40"
                />
              ) : (
                <div className="size-36 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            {/* 4-Step Instructions */}
            <div className="w-full border-t border-slate-200 pt-2.5">
              <div className="text-[9.5px] font-semibold tracking-widest text-slate-400 uppercase">
                Fast • Easy • Contactless
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[9px] font-semibold text-slate-700">
                <div>
                  <div className="mx-auto flex size-6 items-center justify-center rounded-full border border-orange-500 text-orange-600 mb-0.5">
                    <QrCode size={11} />
                  </div>
                  <div>1. SCAN</div>
                </div>
                <div>
                  <div className="mx-auto flex size-6 items-center justify-center rounded-full border border-orange-500 text-orange-600 mb-0.5">
                    <ShoppingBag size={11} />
                  </div>
                  <div>2. ORDER</div>
                </div>
                <div>
                  <div className="mx-auto flex size-6 items-center justify-center rounded-full border border-orange-500 text-orange-600 mb-0.5">
                    <Wallet size={11} />
                  </div>
                  <div>3. PAY</div>
                </div>
                <div>
                  <div className="mx-auto flex size-6 items-center justify-center rounded-full border border-orange-500 text-orange-600 mb-0.5">
                    <PackageCheck size={11} />
                  </div>
                  <div>4. COLLECT</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-[9.5px] font-medium text-slate-400">
              Thank You — Enjoy your shopping — app.selfx.in
            </div>
          </div>

          {/* URL Box & Copy */}
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-xs">
            <span className="flex-1 truncate font-mono text-[11px] text-muted pl-1">{targetUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              Copy
            </button>
          </div>

          {/* Action Buttons (Matching Image 4) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 cursor-pointer"
            >
              <Printer size={15} />
              Print standee QR card
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <Printer size={14} className="text-muted" />
              Print all branch QR cards
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <Download size={13} className="text-muted" />
                Download PNG
              </button>
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <Download size={13} className="text-muted" />
                Download SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
