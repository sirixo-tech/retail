"use client";

import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Maximize2,
  RefreshCw,
  ShoppingBag,
  Sliders,
  Sparkles,
  Tag,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StorefrontProduct } from "../live-shop";

interface TryOnStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: StorefrontProduct | null;
  storeSlug: string;
  brandPrimaryColor?: string;
  formatPrice: (paise: number) => string;
  onAddToCart: (productId: string, quantity: number, options?: { size?: string; color?: string }) => void;
}

interface ModelPreset {
  id: string;
  name: string;
  gender: "female" | "male";
  tag: string;
  avatarUrl: string;
  fullImageUrl: string;
}

const PRESET_MODELS: ModelPreset[] = [
  {
    id: "model_female_1",
    name: "Ava",
    gender: "female",
    tag: "Casual Fit · 5'7\"",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80",
    fullImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "model_female_2",
    name: "Priya",
    gender: "female",
    tag: "Classic · 5'6\"",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80",
    fullImageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "model_female_3",
    name: "Elena",
    gender: "female",
    tag: "Athletic · 5'8\"",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&auto=format&fit=crop&q=80",
    fullImageUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "model_male_1",
    name: "Marcus",
    gender: "male",
    tag: "Urban · 6'0\"",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80",
    fullImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "model_male_2",
    name: "Rohan",
    gender: "male",
    tag: "Smart Formal · 5'11\"",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80",
    fullImageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&auto=format&fit=crop&q=80",
  },
  {
    id: "model_male_3",
    name: "Leo",
    gender: "male",
    tag: "Streetwear · 5'10\"",
    avatarUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=240&auto=format&fit=crop&q=80",
    fullImageUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&auto=format&fit=crop&q=80",
  },
];

export function TryOnStudioModal({
  isOpen,
  onClose,
  product,
  storeSlug,
  brandPrimaryColor = "#4f46e5",
  formatPrice,
  onAddToCart,
}: TryOnStudioModalProps) {
  const [selectedModel, setSelectedModel] = useState<ModelPreset>(PRESET_MODELS[0]!);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<"preset" | "upload">("preset");
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [tryOnResultUrl, setTryOnResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Extract metadata safely
  const productDetails = useMemo(() => {
    if (!product?.details) return {} as Record<string, any>;
    if (typeof product.details === "string") {
      try {
        return JSON.parse(product.details);
      } catch {
        return {};
      }
    }
    return product.details as Record<string, any>;
  }, [product]);

  const sizes = useMemo<string[]>(() => {
    if (Array.isArray(productDetails.sizes) && productDetails.sizes.length > 0) {
      return productDetails.sizes;
    }
    return ["XS", "S", "M", "L", "XL", "XXL"];
  }, [productDetails]);

  const colors = useMemo<{ name: string; hex: string }[]>(() => {
    if (Array.isArray(productDetails.colors) && productDetails.colors.length > 0) {
      return productDetails.colors.map((c: any) =>
        typeof c === "string" ? { name: c, hex: "#334155" } : c,
      );
    }
    return [
      { name: "Default", hex: "#1e293b" },
      { name: "Navy", hex: "#1e3a8a" },
      { name: "Olive", hex: "#365314" },
      { name: "Cream", hex: "#fef08a" },
    ];
  }, [productDetails]);

  // Sync initial size & color
  useEffect(() => {
    if (sizes.length > 0 && !sizes.includes(selectedSize)) {
      setSelectedSize(sizes[0] || "M");
    }
    if (colors.length > 0 && (!selectedColor || !colors.some((c) => c.name === selectedColor))) {
      setSelectedColor(colors[0]?.name || "Default");
    }
    setTryOnResultUrl(null);
    setErrorMessage(null);
  }, [product, sizes, colors]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle User Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("Photo size exceeds 8MB. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setUserPhoto(dataUrl);
      setPhotoMode("upload");
      setTryOnResultUrl(null);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Run Virtual Try-On
  const handleGenerateTryOn = async () => {
    if (!product) return;
    setIsGenerating(true);
    setErrorMessage(null);

    const activeUserImage = photoMode === "upload" && userPhoto ? userPhoto : selectedModel.fullImageUrl;
    const cutoutUrl = productDetails.tryon_cutout_url || product.image || "";

    try {
      const res = await fetch(`/api/v1/public/stores/${encodeURIComponent(storeSlug)}/tryon/generate`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          garment_id: product.id,
          garment_cutout_url: cutoutUrl,
          garment_name: product.name,
          category: productDetails.tryon_category || product.category || "upper_body",
          user_image_url: activeUserImage,
          model_preset: photoMode === "preset" ? selectedModel.id : undefined,
          size: selectedSize,
          color: selectedColor,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || body.error?.message || "Failed to generate virtual try-on");
      }

      const generatedUrl = body.data?.result_image_url || activeUserImage;
      setTryOnResultUrl(generatedUrl);
      setSliderPosition(50);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not complete try-on fitting. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Drag handler for comparison slider
  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  };

  if (!isOpen || !product) return null;

  const currentOriginalImage = photoMode === "upload" && userPhoto ? userPhoto : selectedModel.fullImageUrl;
  const pricePaise = product.selling_price_paise || 0;
  const mrpPaise = product.mrp_paise || 0;
  const hasDiscount = mrpPaise > pricePaise;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[94vh] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Studio Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25">
              <Sparkles size={20} className="animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">AI Virtual Fitting Room</h2>
                <span className="rounded-full bg-indigo-500/30 border border-indigo-400/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                  Interactive Mirror
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Photorealistic neural fitting &amp; drape simulation powered by TryOn AI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Product Specs, Size Matrix, Color Palette & Try-On Action (5 cols) */}
          <div className="lg:col-span-5 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-100 space-y-5 bg-slate-50/50">
            {/* Garment Preview Card */}
            <div className="flex items-center gap-3.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shrink-0 relative">
                <img
                  src={productDetails.tryon_cutout_url || product.image || ""}
                  alt={product.name}
                  className="h-full w-full object-contain p-1"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {productDetails.tryon_category || product.category || "Apparel"}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1 truncate">{product.name}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-black text-slate-900 text-sm">{formatPrice(pricePaise)}</span>
                  {hasDiscount && (
                    <span className="text-xs text-slate-400 line-through">{formatPrice(mrpPaise)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Garment Fabric & Technical Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white p-2.5 border border-slate-200/70">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Fabric Blend</span>
                <div className="font-bold text-slate-800 mt-0.5 truncate">
                  {productDetails.fabric || "Premium Cotton Blend"}
                </div>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-slate-200/70">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Silhouette / Fit</span>
                <div className="font-bold text-slate-800 mt-0.5 truncate">
                  {productDetails.fit_type || "Regular Comfort Fit"}
                </div>
              </div>
            </div>

            {/* Size Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Select Size:</span>
                <span className="text-indigo-600 font-semibold cursor-pointer hover:underline text-[11px]">
                  Size Guide
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setSelectedSize(sz);
                      if (tryOnResultUrl) setTryOnResultUrl(null);
                    }}
                    className={`h-9 min-w-10 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      selectedSize === sz
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm scale-105"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette Selector */}
            {colors.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-700 text-xs">Garment Color: {selectedColor}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {colors.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => {
                        setSelectedColor(c.name);
                        if (tryOnResultUrl) setTryOnResultUrl(null);
                      }}
                      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 border text-xs font-semibold transition cursor-pointer ${
                        selectedColor === c.name
                          ? "bg-white border-indigo-600 ring-2 ring-indigo-600/20 text-slate-900 shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Persona Model Selection Header */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Choose Fit Model:</span>
                <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPhotoMode("preset")}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      photoMode === "preset" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
                    }`}
                  >
                    Preset Models
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMode("upload");
                      if (!userPhoto && fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                      photoMode === "upload" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
                    }`}
                  >
                    Your Photo
                  </button>
                </div>
              </div>

              {photoMode === "preset" ? (
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModel(m);
                        if (tryOnResultUrl) setTryOnResultUrl(null);
                      }}
                      className={`flex flex-col items-center p-2 rounded-2xl border transition text-center cursor-pointer ${
                        selectedModel.id === m.id
                          ? "bg-indigo-50 border-indigo-600 ring-2 ring-indigo-600/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-xs"
                      />
                      <span className="text-xs font-bold text-slate-900 mt-1">{m.name}</span>
                      <span className="text-[9.5px] text-slate-500">{m.tag.split("·")[0]}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {userPhoto ? (
                    <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <img
                        src={userPhoto}
                        alt="Your photo"
                        className="h-12 w-12 rounded-lg object-cover border border-slate-200"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">Your Photo Ready</span>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                          <Check size={11} /> High Resolution
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-bold text-indigo-600 hover:underline px-2"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer py-3 space-y-1.5"
                    >
                      <div className="h-10 w-10 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Camera size={18} />
                      </div>
                      <div className="text-xs font-bold text-slate-800">Upload a full-length photo</div>
                      <p className="text-[10px] text-slate-500">
                        Front-facing portrait works best for neural alignment
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateTryOn}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98] disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing Neural Fitting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{tryOnResultUrl ? "Re-Generate Fitting" : "✨ Generate Virtual Fitting"}</span>
                  </>
                )}
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Right Column: AI Mirror Display / Before-After Comparison Slider (7 cols) */}
          <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col items-center justify-between bg-slate-900 text-white relative min-h-[420px] sm:min-h-[500px]">
            {/* Mirror Top Badge */}
            <div className="w-full flex items-center justify-between text-xs text-slate-300 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                  Live Neural View
                </span>
              </div>

              {tryOnResultUrl && (
                <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-semibold">
                  <Sliders size={12} className="text-amber-400" />
                  <span>Drag Slider to Compare</span>
                </div>
              )}
            </div>

            {/* Interactive Display Canvas */}
            <div className="relative w-full max-w-md h-[400px] sm:h-[450px] rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl flex items-center justify-center">
              {/* Scan Line effect during generation */}
              {isGenerating && (
                <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-center items-center bg-slate-950/70 backdrop-blur-xs">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce" />
                  <div className="h-16 w-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin mb-4" />
                  <span className="text-xs font-bold text-white tracking-wide">Fitting {product.name}...</span>
                  <span className="text-[10px] text-slate-400 mt-1">Calibrating garment mesh and drape contours</span>
                </div>
              )}

              {tryOnResultUrl ? (
                /* Before / After Drag Slider */
                <div
                  ref={sliderContainerRef}
                  onMouseDown={(e) => {
                    const handleMove = (ev: MouseEvent) => handleSliderMove(ev.clientX);
                    const handleUp = () => {
                      window.removeEventListener("mousemove", handleMove);
                      window.removeEventListener("mouseup", handleUp);
                    };
                    window.addEventListener("mousemove", handleMove);
                    window.addEventListener("mouseup", handleUp);
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    if (touch) handleSliderMove(touch.clientX);
                  }}
                  className="relative w-full h-full select-none cursor-ew-resize overflow-hidden"
                >
                  {/* Underneath: After Image (Dressed by AI) */}
                  <img
                    src={tryOnResultUrl}
                    alt="AI Virtual Try-On Result"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Cutout overlay: If Try-on returns composite or model */}
                  {productDetails.tryon_cutout_url && (
                    <div
                      className="absolute inset-0 pointer-events-none flex items-center justify-center"
                      style={{ opacity: 0.95 }}
                    >
                      <img
                        src={productDetails.tryon_cutout_url}
                        alt="Draped Apparel"
                        className="w-1/2 h-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                      />
                    </div>
                  )}

                  {/* Clip: Original Image */}
                  <div
                    className="absolute inset-y-0 left-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img
                      src={currentOriginalImage}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-cover max-w-none"
                      style={{ width: sliderContainerRef.current?.offsetWidth || 400 }}
                    />
                  </div>

                  {/* Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center text-[10px] font-black">
                      ⇆
                    </div>
                  </div>

                  {/* Floating Labels */}
                  <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white pointer-events-none">
                    Before
                  </span>
                  <span className="absolute bottom-3 right-3 bg-indigo-600/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white pointer-events-none">
                    AI Try-On ({selectedSize})
                  </span>
                </div>
              ) : (
                /* Initial Preview with garment placement teaser */
                <div className="relative w-full h-full">
                  <img
                    src={currentOriginalImage}
                    alt={selectedModel.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-400" />
                      <span className="text-xs font-bold text-white">Ready for Virtual Drape</span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Click &ldquo;Generate Virtual Fitting&rdquo; to fit {product.name} on {selectedModel.name}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer: Add to Cart CTA */}
            <div className="w-full pt-4 mt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Check size={14} className="text-emerald-400" />
                <span>Selected: <strong className="text-white">{selectedSize} · {selectedColor}</strong></span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product.id, 1, { size: selectedSize, color: selectedColor });
                    setAddedNotice(true);
                    setTimeout(() => setAddedNotice(false), 2200);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <ShoppingBag size={14} />
                  <span>{addedNotice ? "✓ Added to Bag!" : `Add to Bag (${formatPrice(pricePaise)})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
