"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  Monitor,
  Tablet,
  Printer,
  QrCode,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Sparkles,
  CreditCard,
  Building2,
  Layers,
  ArrowRight,
  ExternalLink,
  Info,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  PhoneCall,
  MapPin,
  Wrench,
  Search,
} from "lucide-react";

interface HardwareProduct {
  id: string;
  name: string;
  model_code: string;
  category: "kiosk" | "pos_terminal" | "handheld" | "printer" | "scanner" | "cash_drawer";
  description: string;
  specs: any;
  buy_price_paise: number;
  rent_price_monthly_paise: number;
  deposit_paise: number;
  stock_quantity: number;
  image_url: string;
  warranty_months: number;
  is_active: boolean;
}

function formatSpecs(specs: any): string[] {
  if (!specs) return [];
  if (Array.isArray(specs)) return specs.map(String);
  if (typeof specs === "object") {
    return Object.entries(specs).map(([key, val]) => {
      const cleanKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `${cleanKey}: ${val}`;
    });
  }
  if (typeof specs === "string") {
    try {
      const parsed = JSON.parse(specs);
      return formatSpecs(parsed);
    } catch {
      return specs.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

interface MyDeviceOrder {
  id: string;
  order_number: string;
  type: "buy" | "rent" | "demo";
  status: string;
  amount_paise: number;
  deposit_paise: number;
  courier_name?: string;
  tracking_number?: string;
  product_name: string;
  category: string;
  image_url: string;
  created_at: string;
}

export default function HardwareMarketplacePage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "my_devices">("catalog");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [products, setProducts] = useState<HardwareProduct[]>([]);
  const [myDevices, setMyDevices] = useState<MyDeviceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<HardwareProduct | null>(null);
  const [checkoutModal, setCheckoutModal] = useState<"buy" | "rent" | null>(null);
  const [demoModal, setDemoModal] = useState<HardwareProduct | null>(null);
  const [rmaModal, setRmaModal] = useState<MyDeviceOrder | null>(null);

  // Form states
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    phone: "",
    address_line: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  // Demo form
  const [demoForm, setDemoForm] = useState({
    demo_date: "",
    demo_time_slot: "11:00 AM - 12:00 PM",
    mode: "in_store",
    contact_name: "",
    contact_phone: "",
    notes: "",
  });
  const [submittingDemo, setSubmittingDemo] = useState(false);
  const [demoSuccessMsg, setDemoSuccessMsg] = useState<string | null>(null);

  // RMA form
  const [rmaForm, setRmaForm] = useState({
    type: "replace",
    reason: "",
    serial_number: "",
  });
  const [submittingRma, setSubmittingRma] = useState(false);
  const [rmaSuccessMsg, setRmaSuccessMsg] = useState<string | null>(null);

  async function loadStoreProfile() {
    try {
      const res = await fetch("/api/v1/stores", { credentials: "include" });
      const json = await res.json();
      const currentStore = Array.isArray(json.data) ? json.data[0] : json.data;
      if (currentStore) {
        setShippingAddress({
          name: currentStore.name || "",
          phone: currentStore.phone || "",
          address_line: currentStore.address_line1 || currentStore.address || "",
          city: currentStore.city || "",
          state: currentStore.state || "",
          pincode: currentStore.pincode || currentStore.postal_code || "",
        });
        if (currentStore.phone) {
          setDemoForm((prev) => ({ ...prev, contact_phone: currentStore.phone }));
        }
      }
    } catch (e) {
      // silently ignore if unconfigured
    }
  }

  async function loadCatalog() {
    try {
      const res = await fetch("/api/v1/tenant/hardware", { credentials: "include" });
      const json = await res.json();
      if (json.data) setProducts(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyDevices() {
    try {
      const res = await fetch("/api/v1/tenant/hardware/my-devices", { credentials: "include" });
      const json = await res.json();
      if (json.data) setMyDevices(json.data);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadCatalog();
    loadMyDevices();
    loadStoreProfile();
  }, []);

  async function handleProceedToPay(product: HardwareProduct, type: "buy" | "rent") {
    setSubmittingOrder(true);
    try {
      // 1. Checkout session creation
      const res = await fetch("/api/v1/tenant/hardware/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hardware_product_id: product.id,
          type,
          shipping_address: shippingAddress,
          gateway: "razorpay",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Checkout failed");

      const session = json.data;

      // 2. Confirm order with payment reference
      const confirmRes = await fetch("/api/v1/tenant/hardware/confirm-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_id: session.order_id,
          reference_id: session.reference_id,
          payment_id: session.reference_id,
        }),
      });
      const confirmJson = await confirmRes.json();
      if (confirmJson.data) {
        setOrderSuccess({
          order_number: confirmJson.data.order_number,
          product_name: product.name,
          type,
          amount_paise: session.amount_paise,
        });
        setCheckoutModal(null);
        loadMyDevices();
      }
    } catch (err: any) {
      alert(err.message || "Error processing payment");
    } finally {
      setSubmittingOrder(false);
    }
  }

  async function handleBookDemo(e: React.FormEvent) {
    e.preventDefault();
    if (!demoModal) return;
    setSubmittingDemo(true);
    try {
      const res = await fetch("/api/v1/tenant/hardware/book-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          hardware_product_id: demoModal.id,
          demo_date: demoForm.demo_date || new Date().toISOString().split("T")[0],
          demo_time_slot: demoForm.demo_time_slot,
          mode: demoForm.mode,
          contact_name: demoForm.contact_name,
          contact_phone: demoForm.contact_phone,
          notes: demoForm.notes,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setDemoSuccessMsg(json.data.message);
        setTimeout(() => {
          setDemoModal(null);
          setDemoSuccessMsg(null);
        }, 3000);
      }
    } catch (e) {
      alert("Failed to schedule demo.");
    } finally {
      setSubmittingDemo(false);
    }
  }

  async function handleSubmitRma(e: React.FormEvent) {
    e.preventDefault();
    if (!rmaModal) return;
    setSubmittingRma(true);
    try {
      const res = await fetch("/api/v1/tenant/hardware/rma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order_id: rmaModal.id,
          type: rmaForm.type,
          reason: rmaForm.reason,
          serial_number: rmaForm.serial_number,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setRmaSuccessMsg("Warranty claim / RMA ticket registered! Courier pickup scheduled.");
        setTimeout(() => {
          setRmaModal(null);
          setRmaSuccessMsg(null);
          loadMyDevices();
        }, 3000);
      }
    } catch (err) {
      alert("Error submitting RMA");
    } finally {
      setSubmittingRma(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-8 text-white shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 backdrop-blur">
          
            <span>Official SelfX First-Party Retail Hardware Hub</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-3xl text-white">
            Equip Your Stores with World-Class Hardware.
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            Plug-and-play interactive kiosks, ultra-fast dual-screen POS terminals, thermal printers, and handheld devices.
            Choose flexible <strong>Monthly Rental</strong> with zero capital expenditure or <strong>Buy Outright</strong> with 24-month replacement warranty.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>24 Months Comprehensive Warranty</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-blue-400" />
              <span>Free Next-Day Air Shipping</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4 text-violet-400" />
              <span>7-Day Return & Free Replacement</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="relative z-10 mt-8 flex space-x-2 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "catalog"
                ? "bg-white text-slate-950 shadow-lg"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Hardware Catalog & Pricing</span>
          </button>
          <button
            onClick={() => setActiveTab("my_devices")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === "my_devices"
                ? "bg-white text-slate-950 shadow-lg"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>My Store Devices & RMA ({myDevices.length})</span>
          </button>
        </div>
      </div>

      {orderSuccess && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-emerald-950">
                Congratulations! Order #{orderSuccess.order_number} confirmed.
              </p>
              <p className="text-xs text-emerald-700">
                Your {orderSuccess.type === "rent" ? "monthly rental lease" : "purchase"} of{" "}
                <strong>{orderSuccess.product_name}</strong> is booked. Our dispatch team is preparing courier delivery.
              </p>
            </div>
          </div>
          <button
            onClick={() => setOrderSuccess(null)}
            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {activeTab === "catalog" && (
        <div className="space-y-6">
          {/* Category Filter & Search */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search SelfX Hardware..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto p-1">
                {[
                  { id: "all", label: "All Hardware" },
                  { id: "kiosk", label: "Kiosks" },
                  { id: "pos_terminal", label: "POS Terminals" },
                  { id: "handheld", label: "Handheld Billing" },
                  { id: "printer", label: "Printers" },
                  { id: "scanner", label: "Scanners" },
                  { id: "cash_drawer", label: "Cash Drawers" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                      categoryFilter === cat.id
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-xl hover:border-indigo-200"
              >
                <div>
                  {/* Image & Badge container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 p-6 flex items-center justify-center">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="rounded-full bg-slate-900/80 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        {product.category.replace("_", " ")}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        <CheckCircle2 className="h-3 w-3" /> In Stock ({product.stock_quantity})
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6">
                    <span className="text-[11px] font-mono text-slate-400">{product.model_code}</span>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{product.description}</p>

                    {/* Spec Chips */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {formatSpecs(product.specs).slice(0, 4).map((spec, sIdx) => (
                        <span
                          key={sIdx}
                          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>

                    {/* Pricing Grid */}
                    <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Buy Outright
                        </span>
                        <p className="text-base font-black text-slate-900">
                          ₹{(product.buy_price_paise / 100).toLocaleString("en-IN")}
                        </p>
                        <span className="text-[10px] text-slate-400">One-time purchase</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          Monthly Rental
                        </span>
                        <p className="text-base font-black text-indigo-600">
                          ₹{(product.rent_price_monthly_paise / 100).toLocaleString("en-IN")}{" "}
                          <span className="text-xs font-normal text-slate-500">/mo</span>
                        </p>
                        <span className="text-[10px] text-slate-400">
                          + ₹{(product.deposit_paise / 100).toLocaleString("en-IN")} refundable deposit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Buttons */}
                <div className="p-6 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setCheckoutModal("buy");
                      }}
                      className="rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 shadow-sm"
                    >
                      Buy Device
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setCheckoutModal("rent");
                      }}
                      className="rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                    >
                      Rent Monthly
                    </button>
                  </div>

                  <button
                    onClick={() => setDemoModal(product)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Book Free Live Demo</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Cpu className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-base font-bold text-slate-800">
                  {search || categoryFilter !== "all"
                    ? "No hardware products matching your filter."
                    : "No hardware products available in catalog yet."}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  {search || categoryFilter !== "all"
                    ? "Try adjusting your search query or switching categories."
                    : "Hardware products (Self-ordering Kiosks, POS Terminals, Thermal Printers, Scanners) uploaded by SelfX Platform SuperAdmin will appear here for buying and rental."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Store Devices Tab */}
      {activeTab === "my_devices" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registered Devices & Rentals</h2>
                <p className="text-xs text-slate-500">Manage hardware warranty, courier tracking, and return/replace claims</p>
              </div>
              <button
                onClick={loadMyDevices}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500">
                  <tr>
                    <th className="px-6 py-3.5">Device</th>
                    <th className="px-6 py-3.5">Order #</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Courier Tracking</th>
                    <th className="px-6 py-3.5">Purchased Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myDevices.length > 0 ? (
                    myDevices.map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={dev.image_url}
                              alt={dev.product_name}
                              className="h-10 w-10 rounded-lg object-contain bg-slate-100 p-1"
                            />
                            <div>
                              <p className="font-bold text-slate-900">{dev.product_name}</p>
                              <span className="text-[11px] uppercase font-mono text-slate-400">
                                {dev.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">{dev.order_number}</td>
                        <td className="px-6 py-4 capitalize font-semibold text-slate-700">
                          {dev.type === "rent" ? "Monthly Rental" : "Outright Buy"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              dev.status === "confirmed" || dev.status === "active_rental"
                                ? "bg-emerald-50 text-emerald-700"
                                : dev.status === "shipped"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {dev.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          {dev.tracking_number ? (
                            <span className="text-indigo-600 font-bold">
                              {dev.courier_name || "Blue Dart"}: {dev.tracking_number}
                            </span>
                          ) : (
                            <span className="text-slate-400">Processing Dispatch</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(dev.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setRmaModal(dev)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            <Wrench className="h-3 w-3" />
                            <span>RMA / Replace</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <Cpu className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm font-medium">No hardware devices enrolled yet.</p>
                        <button
                          onClick={() => setActiveTab("catalog")}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Browse SelfX Hardware Catalog
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  {checkoutModal === "rent" ? "Monthly Rental Lease" : "Outright Purchase"}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedProduct.name}</h3>
              </div>
              <button
                onClick={() => setCheckoutModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Product summary card */}
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="h-14 w-14 rounded-xl object-contain bg-white p-1"
                />
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{selectedProduct.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedProduct.model_code}</p>
                  <span className="text-xs font-semibold text-indigo-600">
                    {checkoutModal === "rent"
                      ? `₹${(selectedProduct.rent_price_monthly_paise / 100).toLocaleString("en-IN")}/mo + ₹${(
                          selectedProduct.deposit_paise / 100
                        ).toLocaleString("en-IN")} deposit`
                      : `₹${(selectedProduct.buy_price_paise / 100).toLocaleString("en-IN")} One-time`}
                  </span>
                </div>
              </div>

              {/* Delivery Address fields */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Delivery Store Address
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Recipient / Store Name"
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={shippingAddress.address_line}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, address_line: e.target.value })}
                    className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={shippingAddress.pincode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Gateway Summary */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Billing Subtotal</span>
                  <span className="font-bold text-slate-900">
                    ₹
                    {(
                      (checkoutModal === "rent"
                        ? selectedProduct.rent_price_monthly_paise + selectedProduct.deposit_paise
                        : selectedProduct.buy_price_paise) / 100
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Express Courier & Insurance</span>
                  <span className="font-bold text-emerald-600">FREE</span>
                </div>
                <div className="pt-2 border-t border-indigo-200 flex items-center justify-between text-sm font-black text-indigo-950">
                  <span>Total Payable Now</span>
                  <span>
                    ₹
                    {(
                      (checkoutModal === "rent"
                        ? selectedProduct.rent_price_monthly_paise + selectedProduct.deposit_paise
                        : selectedProduct.buy_price_paise) / 100
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  Charged securely via your SaaS billing payment gateway account. Tax invoice generated instantly.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCheckoutModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleProceedToPay(selectedProduct, checkoutModal)}
                  disabled={submittingOrder}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                >
                  {submittingOrder ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  <span>Proceed with Platform Payment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Demo Modal */}
      {demoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Schedule Hardware Demo</span>
                <h3 className="text-lg font-bold text-slate-900">{demoModal.name}</h3>
              </div>
              <button onClick={() => setDemoModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {demoSuccessMsg ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <p className="font-bold text-slate-900">{demoSuccessMsg}</p>
                <p className="text-xs text-slate-500">Our hardware specialist will call to coordinate.</p>
              </div>
            ) : (
              <form onSubmit={handleBookDemo} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      required
                      value={demoForm.demo_date}
                      onChange={(e) => setDemoForm({ ...demoForm, demo_date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Time Slot
                    </label>
                    <select
                      value={demoForm.demo_time_slot}
                      onChange={(e) => setDemoForm({ ...demoForm, demo_time_slot: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    >
                      <option>10:00 AM - 11:00 AM</option>
                      <option>11:00 AM - 12:00 PM</option>
                      <option>02:00 PM - 03:00 PM</option>
                      <option>04:00 PM - 05:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Demo Mode
                  </label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDemoForm({ ...demoForm, mode: "in_store" })}
                      className={`rounded-xl border p-2.5 text-xs font-bold ${
                        demoForm.mode === "in_store"
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      In-Store Field Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoForm({ ...demoForm, mode: "virtual" })}
                      className={`rounded-xl border p-2.5 text-xs font-bold ${
                        demoForm.mode === "virtual"
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                          : "border-slate-200 text-slate-600"
                      }`}
                    >
                      Live Virtual Video Demo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      required
                      value={demoForm.contact_name}
                      onChange={(e) => setDemoForm({ ...demoForm, contact_name: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={demoForm.contact_phone}
                      onChange={(e) => setDemoForm({ ...demoForm, contact_phone: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDemoModal(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDemo}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {submittingDemo && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Confirm Demo Booking</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* RMA / Return / Replace Modal */}
      {rmaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  Hardware Warranty & RMA Request
                </span>
                <h3 className="text-lg font-bold text-slate-900">{rmaModal.product_name}</h3>
              </div>
              <button onClick={() => setRmaModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {rmaSuccessMsg ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <p className="font-bold text-slate-900">{rmaSuccessMsg}</p>
                <p className="text-xs text-slate-500">Our courier partner will arrive for pickup within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRma} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Request Type
                  </label>
                  <select
                    value={rmaForm.type}
                    onChange={(e) => setRmaForm({ ...rmaForm, type: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="replace">Warranty Replacement (Defect / Breakdown)</option>
                    <option value="return">Rental Return (Refund Security Deposit)</option>
                    <option value="service">Annual Preventive Maintenance Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Hardware Serial Number
                  </label>
                  <input
                    type="text"
                    required
                    value={rmaForm.serial_number}
                    onChange={(e) => setRmaForm({ ...rmaForm, serial_number: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Issue Description / Return Reason
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rmaForm.reason}
                    onChange={(e) => setRmaForm({ ...rmaForm, reason: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRmaModal(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRma}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
                  >
                    {submittingRma && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    <span>Submit Claim & Schedule Pickup</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
