"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  Plus,
  Trash2,
  Pencil,
  Check,
  CheckCircle2,
  X,
  Truck,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Layers,
  Calendar,
  Eye,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { api, warmCsrf } from "../../lib/api";

interface HardwareProduct {
  id: string;
  name: string;
  model_code: string;
  category: string;
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

interface HardwareOrder {
  id: string;
  order_number: string;
  tenant_id: string;
  tenant_name?: string;
  hardware_product_id: string;
  product_name: string;
  type: string;
  status: string;
  amount_paise: number;
  deposit_paise: number;
  courier_name?: string;
  tracking_number?: string;
  shipping_address?: any;
  created_at: string;
}

export default function SuperAdminHardwarePage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog");
  const [products, setProducts] = useState<HardwareProduct[]>([]);
  const [orders, setOrders] = useState<HardwareOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Add / Edit Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<HardwareProduct | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formModelCode, setFormModelCode] = useState("");
  const [formCategory, setFormCategory] = useState("kiosk");
  const [formDescription, setFormDescription] = useState("");
  const [formSpecs, setFormSpecs] = useState("");
  const [formBuyPrice, setFormBuyPrice] = useState(49999);
  const [formRentPrice, setFormRentPrice] = useState(2499);
  const [formDeposit, setFormDeposit] = useState(5000);
  const [formStock, setFormStock] = useState(25);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formWarranty, setFormWarranty] = useState(24);

  // Status & Tracking Modal for Order
  const [selectedOrder, setSelectedOrder] = useState<HardwareOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState("");
  const [courierName, setCourierName] = useState("Blue Dart Express");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      await warmCsrf();
      const [prodRes, ordRes] = await Promise.all([
        api<{ data: HardwareProduct[] }>("/api/v1/platform/hardware"),
        api<{ data: HardwareOrder[] }>("/api/v1/platform/hardware/orders"),
      ]);
      if (prodRes?.data) setProducts(prodRes.data);
      if (ordRes?.data) setOrders(ordRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreateModal() {
    setEditingProduct(null);
    setFormName("");
    setFormModelCode("");
    setFormCategory("kiosk");
    setFormDescription("");
    setFormSpecs("");
    setFormBuyPrice(0);
    setFormRentPrice(0);
    setFormDeposit(0);
    setFormStock(0);
    setFormImageUrl("");
    setFormWarranty(12);
    setShowProductModal(true);
  }

  function openEditModal(prod: HardwareProduct) {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormModelCode(prod.model_code);
    setFormCategory(prod.category);
    setFormDescription(prod.description);
    setFormSpecs(formatSpecs(prod.specs).join(", "));
    setFormBuyPrice(prod.buy_price_paise / 100);
    setFormRentPrice(prod.rent_price_monthly_paise / 100);
    setFormDeposit(prod.deposit_paise / 100);
    setFormStock(prod.stock_quantity);
    setFormImageUrl(prod.image_url);
    setFormWarranty(prod.warranty_months);
    setShowProductModal(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setFormSaving(true);
    try {
      const payload = {
        name: formName,
        sku: formModelCode,
        model: formModelCode,
        model_code: formModelCode,
        category: formCategory === "handheld" ? "handheld_pos" : formCategory,
        description: formDescription,
        specs: formSpecs.split(",").map((s) => s.trim()).filter(Boolean),
        buy_price_paise: Math.round(formBuyPrice * 100),
        monthly_rent_paise: Math.round(formRentPrice * 100),
        rent_price_monthly_paise: Math.round(formRentPrice * 100),
        security_deposit_paise: Math.round(formDeposit * 100),
        deposit_paise: Math.round(formDeposit * 100),
        stock_qty: formStock,
        stock_quantity: formStock,
        images: formImageUrl ? [formImageUrl] : [],
        image_url: formImageUrl,
        warranty_months: formWarranty,
        is_active: true,
      };

      if (editingProduct) {
        await api(`/api/v1/platform/hardware/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setToast("Hardware product updated successfully!");
      } else {
        await api("/api/v1/platform/hardware", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setToast("New hardware model published to tenant marketplace!");
      }

      setShowProductModal(false);
      loadData();
    } catch (err: any) {
      alert(err?.error?.message || "Error saving hardware product");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this hardware model?")) return;
    try {
      await api(`/api/v1/platform/hardware/${id}`, { method: "DELETE" });
      setToast("Hardware product deleted.");
      loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUpdateOrderStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingStatus(true);
    try {
      await api(`/api/v1/platform/hardware/orders/${selectedOrder.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: orderStatus,
          courier_name: courierName,
          tracking_number: trackingNumber,
        }),
      });
      setToast("Hardware order status & tracking updated!");
      setSelectedOrder(null);
      loadData();
    } catch (err) {
      alert("Failed to update order status");
    } finally {
      setSavingStatus(false);
    }
  }

  const filteredProducts = products.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalUnits = products.reduce((acc, p) => acc + p.stock_quantity, 0);
  const totalRentals = orders.filter((o) => o.type === "rent" && o.status === "active_rental").length;
  const totalSales = orders.filter((o) => o.type === "buy" && o.status === "confirmed").length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <Cpu className="h-4 w-4 text-indigo-400" />
            <span>Platform Hardware Operations</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white lg:text-3xl">
            SelfX Hardware Marketplace & Rentals Hub
          </h1>
          <p className="mt-1 text-xs text-slate-300">
            Manage first-party retail equipment (Kiosks, POS, Handhelds), stock levels, and tenant fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            <span>Add Hardware Model</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hardware Catalog Models
          </span>
          <p className="mt-2 text-2xl font-bold text-slate-900">{products.length}</p>
          <span className="text-xs text-slate-400">Across 6 retail categories</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Warehouse Units
          </span>
          <p className="mt-2 text-2xl font-bold text-slate-900">{totalUnits}</p>
          <span className="text-xs text-emerald-600 font-medium">Ready for dispatch</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Tenant Rentals
          </span>
          <p className="mt-2 text-2xl font-bold text-indigo-600">{totalRentals}</p>
          <span className="text-xs text-slate-400">Monthly recurring billing</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Outright Orders
          </span>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{totalSales}</p>
          <span className="text-xs text-slate-400">Delivered & confirmed</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "catalog"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Hardware Catalog ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "orders"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Tenant Orders & Fulfillment ({orders.length})</span>
        </button>
      </div>

      {/* Catalog Tab */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="kiosk">Kiosks</option>
                <option value="pos_terminal">POS Terminals</option>
                <option value="handheld">Handheld</option>
                <option value="printer">Printers</option>
                <option value="scanner">Scanners</option>
                <option value="cash_drawer">Cash Drawers</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-100 p-4 flex items-center justify-center">
                    <img src={p.image_url} alt={p.name} className="max-h-full max-w-full object-contain" />
                    <span className="absolute top-2 left-2 rounded-lg bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold uppercase text-white backdrop-blur">
                      {p.category.replace("_", " ")}
                    </span>
                    <span className="absolute top-2 right-2 rounded-lg bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      Stock: {p.stock_quantity}
                    </span>
                  </div>

                  <div className="p-5">
                    <span className="font-mono text-xs text-slate-400">{p.model_code}</span>
                    <h3 className="font-bold text-slate-900">{p.name}</h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{p.description}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Buy Price</span>
                        <p className="font-bold text-slate-900">₹{(p.buy_price_paise / 100).toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 uppercase font-semibold">Rental Price</span>
                        <p className="font-bold text-indigo-600">
                          ₹{(p.rent_price_monthly_paise / 100).toLocaleString("en-IN")}/mo
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => openEditModal(p)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Cpu className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-base font-bold text-slate-800">
                  {search || categoryFilter !== "all"
                    ? "No hardware products matching your filter."
                    : "No hardware products in catalog yet."}
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                  Click the button below to upload your first hardware product (Kiosks, POS terminals, Printers) to the platform marketplace.
                </p>
                <button
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add First Hardware Product</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Tenant Hardware Orders & Rentals</h2>
            <p className="text-xs text-slate-500">Track equipment purchase orders, dispatch shipments, and assign courier tracking</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Order #</th>
                  <th className="px-6 py-3.5">Hardware Item</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Courier Tracking</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{ord.order_number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{ord.product_name}</td>
                    <td className="px-6 py-4 capitalize font-medium text-slate-700">
                      {ord.type === "rent" ? "Monthly Rental" : "Outright Buy"}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ₹{(((ord.amount_paise || 0) + (ord.deposit_paise || 0)) / 100).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          ord.status === "confirmed" || ord.status === "active_rental"
                            ? "bg-emerald-50 text-emerald-700"
                            : ord.status === "shipped"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {ord.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono">
                      {ord.tracking_number ? (
                        <span className="text-indigo-600 font-bold">
                          {ord.courier_name}: {ord.tracking_number}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedOrder(ord);
                          setOrderStatus(ord.status);
                          setCourierName(ord.courier_name || "Blue Dart Express");
                          setTrackingNumber(ord.tracking_number || "");
                        }}
                        className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        Fulfill / Track
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Create/Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? "Edit Hardware Model" : "Add New Hardware Model"}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SelfX Titan 32 Kiosk"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Model Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SX-KSK-3200"
                    value={formModelCode}
                    onChange={(e) => setFormModelCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="kiosk">Self-Ordering Kiosk</option>
                    <option value="pos_terminal">Dual-Screen POS Terminal</option>
                    <option value="handheld">Handheld Billing Terminal</option>
                    <option value="printer">Thermal Receipt Printer</option>
                    <option value="scanner">Barcode Scanner</option>
                    <option value="cash_drawer">Cash Drawer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Warehouse Stock Units
                  </label>
                  <input
                    type="number"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Tech Specs (comma-separated tags)
                </label>
                <input
                  type="text"
                  placeholder="32-inch 4K Touch, Intel i5, 8GB RAM, Thermal Printer"
                  value={formSpecs}
                  onChange={(e) => setFormSpecs(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Buy Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Monthly Rental (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={formRentPrice}
                    onChange={(e) => setFormRentPrice(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={formDeposit}
                    onChange={(e) => setFormDeposit(parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Image URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {formSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingProduct ? "Update Product" : "Publish to Marketplace"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fulfillment Status Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Order Fulfillment</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedOrder.order_number}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrderStatus} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Update Status
                </label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="pending_payment">Pending Payment</option>
                  <option value="confirmed">Confirmed / Packing</option>
                  <option value="shipped">Shipped / In Transit</option>
                  <option value="active_rental">Active Rental (Monthly billing)</option>
                  <option value="completed">Delivered & Installed</option>
                  <option value="rma_replacement">RMA Replacement Dispatched</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Courier Carrier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Blue Dart, Delhivery, DTDC"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Tracking / AWB Consignment Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. BLUEDART771928374"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStatus}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {savingStatus && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Update Tracking & Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
