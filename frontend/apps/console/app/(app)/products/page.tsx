"use client";

import { Button, PageHeader } from "@selfx/ui";
import { formatInr } from "@selfx/types";
import {
  Barcode,
  Boxes,
  Check,
  Download,
  Edit3,
  FileSpreadsheet,
  FolderTree,
  ImagePlus,
  Layers,
  Package,
  PackagePlus,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Stethoscope,
  Pill,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

type Item = {
  id: string;
  name: string;
  sku: string;
  mrp_paise?: number | null;
  selling_price_paise: number | null;
  cost_paise?: number;
  wholesale_paise?: number;
  min_price_paise?: number;
  gst_bps?: number;
  hsn_code?: string;
  barcode?: string | null;
  on_hand: string;
  reorder_point?: string;
  category_id?: string | null;
  sub_category_id?: string | null;
  brand_id?: string | null;
  unit_id?: string | null;
  category?: string | null;
  sub_category?: string | null;
  brand?: string | null;
  unit?: string | null;
  unit_short?: string | null;
  online_visible?: boolean;
  track_stock?: boolean;
  status?: string;
  image?: string | null;
  details?: Record<string, unknown> | null;
};

type CategoryRow = {
  id: string;
  name: string;
  code?: string;
  parent_id?: string | null;
  description?: string | null;
  image?: string | null;
  online_visible?: boolean;
  status?: string;
  sort_order?: number;
};

type BrandRow = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  image?: string | null;
  website?: string | null;
  status?: string;
  is_featured?: boolean;
};

type UnitRow = {
  id: string;
  name: string;
  short_name?: string;
  base_unit_id?: string | null;
  operator?: string;
  operation_value?: string | number;
  allow_decimal?: boolean;
  status?: string;
};

export type View =
  | "list"
  | "create"
  | "catalog"
  | "import"
  | "prices"
  | "opening"
  | "labels"
  | "categories"
  | "subcategories"
  | "brands"
  | "units";

const viewMeta: Record<View, { title: string; description: string }> = {
  create: {
    title: "Create Product",
    description: "Add a new product with barcode, pricing tiers, GST, stock rules, and gallery images.",
  },
  list: {
    title: "All Products",
    description: "Manage your store catalog, stock levels, pricing tiers, and online visibility.",
  },
  catalog: {
    title: "Shared Master Catalog",
    description: "Import pre-configured master products into your store with automatic retail margin.",
  },
  import: {
    title: "Import Products",
    description: "Bulk import products via CSV with categories, units, cost, and selling prices.",
  },
  prices: {
    title: "Import Prices",
    description: "Bulk update product cost and selling prices using SKU codes.",
  },
  opening: {
    title: "Opening Stock",
    description: "Set or adjust opening stock balances for your store products.",
  },
  labels: {
    title: "Print Barcode Labels",
    description: "Generate and print thermal or sheet barcode labels with SKU and retail price.",
  },
  categories: {
    title: "Product Categories",
    description: "Create and organize primary product categories for POS and online store navigation.",
  },
  subcategories: {
    title: "Sub Categories",
    description: "Organize deeper product hierarchies linked to parent categories.",
  },
  brands: {
    title: "Brands & Manufacturers",
    description: "Manage product brands, manufacturer codes, logos, and featured brand badges.",
  },
  units: {
    title: "Units of Measure",
    description: "Configure base units, packaging multipliers, and decimal quantity permissions.",
  },
};

function token() {
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

function randomCode(prefix = "") {
  const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
  return prefix ? `${prefix}-${digits.slice(0, 5)}` : digits;
}

export function ProductWorkspace({ view }: { view: View }) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [labels, setLabels] = useState<{ sku: string; name: string; selling_price_paise: number }[]>([]);
  const [masters, setMasters] = useState<{ id: string; name: string; reference_mrp_paise?: number | null; barcodes?: { value: string }[] }[]>([]);
  const [addedMasters, setAddedMasters] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // List filters
  const [query, setQuery] = useState("");
  const [codeQuery, setCodeQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "low" | "out">("all");

  // Create Product controlled state
  const [prodType, setProdType] = useState("Standard Product");
  const [prodName, setProdName] = useState("");
  const [prodSku, setProdSku] = useState(() => randomCode());
  const [prodSymbology, setProdSymbology] = useState("CODE128");
  const [prodCategoryId, setProdCategoryId] = useState("");
  const [prodSubCategoryId, setProdSubCategoryId] = useState("");
  const [prodBrandId, setProdBrandId] = useState("");
  const [prodUnitId, setProdUnitId] = useState("");
  const [prodSaleUnitId, setProdSaleUnitId] = useState("");
  const [prodPurchaseUnitId, setProdPurchaseUnitId] = useState("");
  const [prodCost, setProdCost] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodMrp, setProdMrp] = useState("");
  const [prodWholesale, setProdWholesale] = useState("");
  const [prodMinPrice, setProdMinPrice] = useState("");
  const [prodGst, setProdGst] = useState("0");
  const [prodTaxType, setProdTaxType] = useState("Exclusive");
  const [prodDiscountType, setProdDiscountType] = useState("Fixed");
  const [prodDiscount, setProdDiscount] = useState("0");
  const [prodHsn, setProdHsn] = useState("");
  const [prodOpeningQty, setProdOpeningQty] = useState("0");
  const [prodAlertQty, setProdAlertQty] = useState("5");
  const [prodPoints, setProdPoints] = useState("0");
  const [prodWeight, setProdWeight] = useState("");
  const [prodRack, setProdRack] = useState("");
  const [prodNote, setProdNote] = useState("");
  const [prodImage, setProdImage] = useState<string>("");
  const [prodGallery, setProdGallery] = useState<string[]>([]);

  // Status & Feature Toggles (Image 5 Right Column)
  const [statusActive, setStatusActive] = useState(true);
  const [notForSelling, setNotForSelling] = useState(false);
  const [pharmacyBatchMode, setPharmacyBatchMode] = useState(false);
  const [pharmacyBatchNumber, setPharmacyBatchNumber] = useState("");
  const [pharmacyMfgDate, setPharmacyMfgDate] = useState("");
  const [pharmacyExpDate, setPharmacyExpDate] = useState("");
  const [pharmacyComposition, setPharmacyComposition] = useState("");
  const [pharmacySchedule, setPharmacySchedule] = useState("OTC");
  const [pharmacyDosageForm, setPharmacyDosageForm] = useState("Tablets");
  const [pharmacyPackSize, setPharmacyPackSize] = useState("10 Tablets / Strip");
  const [pharmacyManufacturer, setPharmacyManufacturer] = useState("");
  const [pharmacyDrugLicense, setPharmacyDrugLicense] = useState("");
  const [pharmacyStorageCondition, setPharmacyStorageCondition] = useState("Room Temperature (< 25°C)");
  const [pharmacyRequiresRx, setPharmacyRequiresRx] = useState(false);
  const [pharmacyIsNarcotic, setPharmacyIsNarcotic] = useState(false);
  const [featuredProduct, setFeaturedProduct] = useState(false);
  const [hideFromOnline, setHideFromOnline] = useState(false);
  const [alwaysInStock, setAlwaysInStock] = useState(true);

  // Pre-Order & Warranty
  const [preOrderAvailable, setPreOrderAvailable] = useState(false);
  const [preOrderDate, setPreOrderDate] = useState("");
  const [preOrderLimit, setPreOrderLimit] = useState("");
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyPeriod, setWarrantyPeriod] = useState("12 Months");
  const [warrantyTerms, setWarrantyTerms] = useState("");
  const [guaranteePeriod, setGuaranteePeriod] = useState("");

  // Quick Inline Modals on Create Product page
  const [quickModal, setQuickModal] = useState<null | "category" | "subcategory" | "brand" | "unit">(null);

  // Edit Modals for List / Categories / Brands / Units
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [editingBrand, setEditingBrand] = useState<BrandRow | null>(null);
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null);

  // Barcode Label studio options
  const [labelShowPrice, setLabelShowPrice] = useState(true);
  const [labelShowStore, setLabelShowStore] = useState(true);
  const [labelCopies, setLabelCopies] = useState(1);

  const load = useCallback(async (id: string) => {
    const [stock, cats, brandRows, unitRows, labelRows, catalog] = await Promise.all([
      fetch(`/api/v1/stores/${id}/items`, { credentials: "include", headers: { Accept: "application/json" } }),
      fetch("/api/v1/catalog/own/categories", { credentials: "include", headers: { Accept: "application/json" } }),
      fetch("/api/v1/catalog/own/brands", { credentials: "include", headers: { Accept: "application/json" } }),
      fetch("/api/v1/catalog/own/units", { credentials: "include", headers: { Accept: "application/json" } }),
      fetch("/api/v1/catalog/own/labels", { credentials: "include", headers: { Accept: "application/json" } }),
      fetch("/api/v1/catalog/products", { credentials: "include", headers: { Accept: "application/json" } }),
    ]);
    if (stock.ok) setItems(((await stock.json()) as { data: Item[] }).data);
    if (cats.ok) setCategories(((await cats.json()) as { data: CategoryRow[] }).data);
    if (brandRows.ok) setBrands(((await brandRows.json()) as { data: BrandRow[] }).data);
    if (unitRows.ok) setUnits(((await unitRows.json()) as { data: UnitRow[] }).data);
    if (labelRows.ok) {
      setLabels(((await labelRows.json()) as { data: { sku: string; name: string; selling_price_paise: number }[] }).data);
    }
    if (catalog.ok) setMasters(((await catalog.json()) as { data: { id: string; name: string }[] }).data);
  }, []);

  useEffect(() => {
    void (async () => {
      const me = await fetch("/api/v1/auth/staff/me", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!me.ok) {
        window.location.href = "/login";
        return;
      }
      const id = ((await me.json()) as { data?: { store?: { id: string } } }).data?.store?.id;
      if (!id) return;
      setStoreId(id);
      await load(id);
    })();
  }, [load]);

  async function send(path: string, body: unknown, method: "POST" | "PATCH" = "POST") {
    const response = await fetch(path, {
      method,
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token(),
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: { id?: string };
      error?: { message?: string };
      message?: string;
    };
    if (response.ok) {
      setMessage({ text: "Saved successfully.", error: false });
      if (storeId) await load(storeId);
      return payload.data ?? true;
    }
    setMessage({
      text: payload.error?.message ?? payload.message ?? "Could not save changes.",
      error: true,
    });
    return null;
  }

  async function remove(path: string) {
    const response = await fetch(path, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json", "X-XSRF-TOKEN": token() },
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    setMessage({
      text: response.ok ? "Removed successfully." : (payload.error?.message ?? "Item is still in use and cannot be removed."),
      error: !response.ok,
    });
    if (response.ok && storeId) await load(storeId);
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        if (!result) return;
        setProdGallery((prev) => {
          const next = [...prev, result];
          if (!prodImage) setProdImage(result);
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleCreateProduct(e: FormEvent) {
    e.preventDefault();
    const pricePaise = Math.round(Number(prodPrice || 0) * 100);
    const mrpPaise = prodMrp ? Math.round(Number(prodMrp) * 100) : pricePaise;
    const costPaise = Math.round(Number(prodCost || 0) * 100);
    const primaryImage = prodImage || prodGallery[0] || null;

    const created = await send("/api/v1/catalog/own/products", {
      name: prodName.trim(),
      sku: prodSku.trim(),
      selling_price_paise: pricePaise,
      mrp_paise: mrpPaise,
      cost_paise: costPaise,
      gst_bps: Math.round(Number(prodGst || 0) * 100),
      hsn_code: prodHsn.trim() || "0000",
      barcode: prodSku.trim(),
      opening_qty: Number(prodOpeningQty || 0),
      category_id: prodCategoryId || null,
      sub_category_id: prodSubCategoryId || null,
      brand_id: prodBrandId || null,
      unit_id: prodUnitId || null,
      reorder_point: Number(prodAlertQty || 0),
      online_visible: !hideFromOnline,
      track_stock: !alwaysInStock && prodType !== "Service Product",
      status: statusActive ? "active" : "inactive",
      image: primaryImage,
      details: {
        type: prodType,
        barcode: prodSymbology,
        wholesale_paise: Math.round(Number(prodWholesale || 0) * 100),
        min_price_paise: Math.round(Number(prodMinPrice || 0) * 100),
        tax_type: prodTaxType,
        discount_type: prodDiscountType,
        discount: Number(prodDiscount || 0),
        sale_unit_id: prodSaleUnitId || prodUnitId || null,
        purchase_unit_id: prodPurchaseUnitId || prodUnitId || null,
        points: Number(prodPoints || 0),
        weight: prodWeight,
        rack_location: prodRack,
        not_for_sale: notForSelling,
        pharmacy_batch_mode: pharmacyBatchMode,
        pharmacy: pharmacyBatchMode
          ? {
              batch_number: pharmacyBatchNumber.trim(),
              mfg_date: pharmacyMfgDate,
              expiry_date: pharmacyExpDate,
              composition: pharmacyComposition.trim(),
              schedule: pharmacySchedule,
              dosage_form: pharmacyDosageForm,
              pack_size: pharmacyPackSize.trim(),
              manufacturer: pharmacyManufacturer.trim(),
              drug_license_no: pharmacyDrugLicense.trim(),
              storage_condition: pharmacyStorageCondition,
              requires_prescription: pharmacyRequiresRx,
              is_narcotic: pharmacyIsNarcotic,
            }
          : null,
        featured: featuredProduct,
        always_in_stock: alwaysInStock,
        pre_order: preOrderAvailable
          ? { available: true, release_date: preOrderDate, limit: Number(preOrderLimit || 0) }
          : { available: false },
        warranty: hasWarranty
          ? { enabled: true, period: warrantyPeriod, terms: warrantyTerms, guarantee_period: guaranteePeriod }
          : { enabled: false },
        gallery: prodGallery,
        note: prodNote,
      },
    });

    if (created) {
      setProdName("");
      setProdSku(randomCode());
      setProdCost("");
      setProdPrice("");
      setProdMrp("");
      setProdWholesale("");
      setProdMinPrice("");
      setProdNote("");
      setProdImage("");
      setProdGallery([]);
      setPharmacyBatchNumber("");
      setPharmacyMfgDate("");
      setPharmacyExpDate("");
      setPharmacyComposition("");
      setPharmacySchedule("OTC");
      setPharmacyDosageForm("Tablets");
      setPharmacyPackSize("10 Tablets / Strip");
      setPharmacyManufacturer("");
      setPharmacyDrugLicense("");
      setPharmacyStorageCondition("Room Temperature (< 25°C)");
      setPharmacyRequiresRx(false);
      setPharmacyIsNarcotic(false);
    }
  }

  const parents = useMemo(() => categories.filter((row) => !row.parent_id), [categories]);
  const children = useMemo(() => categories.filter((row) => Boolean(row.parent_id)), [categories]);
  const filteredSubCategories = useMemo(() => {
    if (!prodCategoryId) return children;
    return children.filter((row) => row.parent_id === prodCategoryId);
  }, [children, prodCategoryId]);

  const shown = useMemo(() => {
    return items.filter((item) => {
      const matchName = item.name.toLowerCase().includes(query.toLowerCase());
      const matchCode = item.sku.toLowerCase().includes(codeQuery.toLowerCase());
      const matchCat = !categoryFilter || item.category === categoryFilter || item.category_id === categoryFilter;
      const matchBrand = !brandFilter || item.brand === brandFilter || item.brand_id === brandFilter;
      const qty = Number(item.on_hand || 0);
      const reorder = Number(item.reorder_point || 0);
      if (stockFilter === "in" && qty <= 0) return false;
      if (stockFilter === "low" && (qty <= 0 || qty > Math.max(reorder, 5))) return false;
      if (stockFilter === "out" && qty > 0) return false;
      return matchName && matchCode && matchCat && matchBrand;
    });
  }, [items, query, codeQuery, categoryFilter, brandFilter, stockFilter]);

  const meta = viewMeta[view] ?? viewMeta.list;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={meta.title}
        description={meta.description}
        aside={
          <div className="flex flex-wrap items-center gap-2">
            {view !== "list" ? (
              <Link
                href="/products"
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[13px] font-medium text-ink transition hover:bg-bg"
              >
                <Boxes size={14} />
                All Products ({items.length})
              </Link>
            ) : null}
            {view !== "create" ? (
              <Link
                href="/products/create"
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-accent px-3.5 text-[13px] font-semibold text-white shadow-xs transition hover:opacity-95"
              >
                <Plus size={15} />
                Create Product
              </Link>
            ) : null}
          </div>
        }
      />

      {message ? (
        <div
          className={`flex items-center justify-between rounded-[10px] border px-4 py-3 text-sm ${
            message.error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span className="font-medium">{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      {/* =====================================================================
          VIEW 1: CREATE PRODUCT (Matches Image 5 Two-Column Studio)
         ===================================================================== */}
      {view === "create" ? (
        <form onSubmit={(e) => void handleCreateProduct(e)} className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,1fr)]">
          {/* LEFT COLUMN: Basic Info + Price & Tax + Units & Stock */}
          <div className="space-y-6">
            {/* Card 1: Basic Information */}
            <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <div className="mb-5 flex items-center gap-2.5 border-b border-line pb-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-indigo-50 text-indigo-600">
                  <Package size={17} />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Basic Information</h2>
                  <p className="text-[12px] text-muted">Core product identity, barcode symbology, and classification</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-[13px] font-semibold text-ink">
                  Type <span className="text-rose-500">*</span>
                  <select
                    value={prodType}
                    onChange={(e) => setProdType(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-accent focus:bg-surface focus:outline-none"
                  >
                    <option value="Standard Product">Standard Product</option>
                    <option value="Variable Product">Variable Product</option>
                    <option value="Service Product">Service Product</option>
                    <option value="Combo Product">Combo Product</option>
                  </select>
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Name <span className="text-rose-500">*</span>
                  <input
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    required
                    placeholder="Enter Product Name"
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-accent focus:bg-surface focus:outline-none"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Barcode Symbology <span className="text-rose-500">*</span>
                  <select
                    value={prodSymbology}
                    onChange={(e) => setProdSymbology(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-accent focus:bg-surface focus:outline-none"
                  >
                    <option value="CODE128">Code 128</option>
                    <option value="CODE39">Code 39</option>
                    <option value="EAN13">EAN13</option>
                    <option value="EAN8">EAN8</option>
                    <option value="UPC">UPC-A</option>
                  </select>
                </label>

                <div className="block text-[13px] font-semibold text-ink">
                  <span>
                    Code Product (SKU / Barcode) <span className="text-rose-500">*</span>
                  </span>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      required
                      placeholder="Scan or generate code"
                      className="num h-10 flex-1 rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-accent focus:bg-surface focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setProdSku(randomCode())}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[8px] border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <RefreshCw size={14} />
                      Generate
                    </button>
                  </div>
                </div>

                {/* Category with inline + Create modal trigger */}
                <div className="block text-[13px] font-semibold text-ink">
                  <span>
                    Category <span className="text-rose-500">*</span>
                  </span>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={prodCategoryId}
                      onChange={(e) => {
                        setProdCategoryId(e.target.value);
                        setProdSubCategoryId("");
                      }}
                      className="h-10 flex-1 rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-accent focus:bg-surface focus:outline-none"
                    >
                      <option value="">Choose Category</option>
                      {parents.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setQuickModal("category")}
                      title="Quick Create Category"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Sub Category with inline + Create modal trigger */}
                <div className="block text-[13px] font-semibold text-ink">
                  <span>Sub Category</span>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={prodSubCategoryId}
                      onChange={(e) => setProdSubCategoryId(e.target.value)}
                      className="h-10 flex-1 rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-accent focus:bg-surface focus:outline-none"
                    >
                      <option value="">Choose Sub Category</option>
                      {filteredSubCategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setQuickModal("subcategory")}
                      title="Quick Create Sub Category"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Brand with inline + Create modal trigger */}
                <div className="block text-[13px] font-semibold text-ink">
                  <span>Brand</span>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={prodBrandId}
                      onChange={(e) => setProdBrandId(e.target.value)}
                      className="h-10 flex-1 rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-accent focus:bg-surface focus:outline-none"
                    >
                      <option value="">Choose Brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setQuickModal("brand")}
                      title="Quick Create Brand"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[13px] font-semibold text-ink">
                    Loyalty Points
                    <input
                      type="number"
                      value={prodPoints}
                      onChange={(e) => setProdPoints(e.target.value)}
                      placeholder="0"
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                    />
                  </label>
                  <label className="block text-[13px] font-semibold text-ink">
                    Weight / Size
                    <input
                      value={prodWeight}
                      onChange={(e) => setProdWeight(e.target.value)}
                      placeholder="e.g. 500g"
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                    />
                  </label>
                </div>

                <label className="block text-[13px] font-semibold text-ink sm:col-span-2">
                  Description / Notes
                  <textarea
                    rows={3}
                    value={prodNote}
                    onChange={(e) => setProdNote(e.target.value)}
                    placeholder="Enter product specifications, ingredients, or cashier notes..."
                    className="mt-1.5 w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-sm font-normal text-ink focus:border-accent focus:bg-surface focus:outline-none"
                  />
                </label>
              </div>
            </section>

            {/* Card 2: Price & Tax */}
            <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <div className="mb-5 flex items-center gap-2.5 border-b border-line pb-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-emerald-50 text-emerald-600">
                  <Tag size={17} />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Price & Tax Configuration</h2>
                  <p className="text-[12px] text-muted">Cost, retail price, wholesale price, minimum selling floor, and GST</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-[13px] font-semibold text-ink">
                  Product Cost (₹) <span className="text-rose-500">*</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    placeholder="0.00"
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Product Price (₹) <span className="text-rose-500">*</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodPrice}
                    onChange={(e) => {
                      setProdPrice(e.target.value);
                      if (!prodMrp) setProdMrp(e.target.value);
                    }}
                    placeholder="0.00"
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  MRP (₹)
                  <input
                    type="number"
                    step="0.01"
                    value={prodMrp}
                    onChange={(e) => setProdMrp(e.target.value)}
                    placeholder="Same as selling price"
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Wholesale Price (₹)
                  <input
                    type="number"
                    step="0.01"
                    value={prodWholesale}
                    onChange={(e) => setProdWholesale(e.target.value)}
                    placeholder="0.00"
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Min Selling Price (₹)
                  <input
                    type="number"
                    step="0.01"
                    value={prodMinPrice}
                    onChange={(e) => setProdMinPrice(e.target.value)}
                    placeholder="0.00"
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  HSN / SAC Code
                  <input
                    value={prodHsn}
                    onChange={(e) => setProdHsn(e.target.value)}
                    placeholder="e.g. 2101"
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Order Tax (GST %)
                  <select
                    value={prodGst}
                    onChange={(e) => setProdGst(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  >
                    <option value="0">0% (Exempt / Nil)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                    <option value="28">28% GST</option>
                  </select>
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Tax Method
                  <select
                    value={prodTaxType}
                    onChange={(e) => setProdTaxType(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  >
                    <option value="Exclusive">Exclusive</option>
                    <option value="Inclusive">Inclusive</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[13px] font-semibold text-ink">
                    Discount
                    <input
                      type="number"
                      step="0.01"
                      value={prodDiscount}
                      onChange={(e) => setProdDiscount(e.target.value)}
                      className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-2.5 text-sm font-normal text-ink"
                    />
                  </label>
                  <label className="block text-[13px] font-semibold text-ink">
                    Disc. Type
                    <select
                      value={prodDiscountType}
                      onChange={(e) => setProdDiscountType(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-2 text-sm font-normal text-ink"
                    >
                      <option value="Fixed">Fixed (₹)</option>
                      <option value="Percentage">% Off</option>
                    </select>
                  </label>
                </div>
              </div>
            </section>

            {/* Card 3: Units & Stock */}
            <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <div className="mb-5 flex items-center gap-2.5 border-b border-line pb-3.5">
                <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-amber-50 text-amber-600">
                  <Scale size={17} />
                </span>
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Units & Stock Management</h2>
                  <p className="text-[12px] text-muted">Measurement units, initial opening stock, and low-stock alert threshold</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="block text-[13px] font-semibold text-ink">
                  <span>
                    Product Unit <span className="text-rose-500">*</span>
                  </span>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      value={prodUnitId}
                      onChange={(e) => {
                        setProdUnitId(e.target.value);
                        if (!prodSaleUnitId) setProdSaleUnitId(e.target.value);
                        if (!prodPurchaseUnitId) setProdPurchaseUnitId(e.target.value);
                      }}
                      className="h-10 flex-1 rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                    >
                      <option value="">Choose Product Unit</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.short_name})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setQuickModal("unit")}
                      title="Quick Create Unit"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-indigo-200 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <label className="block text-[13px] font-semibold text-ink">
                  Sale Unit
                  <select
                    value={prodSaleUnitId}
                    onChange={(e) => setProdSaleUnitId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  >
                    <option value="">Same as Product Unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.short_name})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Purchase Unit
                  <select
                    value={prodPurchaseUnitId}
                    onChange={(e) => setProdPurchaseUnitId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  >
                    <option value="">Same as Product Unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.short_name})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Opening Stock Quantity
                  <input
                    type="number"
                    step="0.01"
                    value={prodOpeningQty}
                    onChange={(e) => setProdOpeningQty(e.target.value)}
                    placeholder="0"
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Stock Alert (Reorder Point)
                  <input
                    type="number"
                    step="0.01"
                    value={prodAlertQty}
                    onChange={(e) => setProdAlertQty(e.target.value)}
                    placeholder="5"
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>

                <label className="block text-[13px] font-semibold text-ink">
                  Warehouse Rack / Shelf
                  <input
                    value={prodRack}
                    onChange={(e) => setProdRack(e.target.value)}
                    placeholder="e.g. Aisle-2 / Shelf-B"
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink"
                  />
                </label>
              </div>
            </section>

            {/* Pharmacy & Clinical Compliance (Appears when Pharmacy Mode is Active) */}
            {pharmacyBatchMode && (
              <section className="rounded-[16px] border-2 border-emerald-400/80 bg-gradient-to-b from-emerald-50/50 via-surface to-surface p-6 shadow-[0_4px_20px_rgba(16,185,129,0.08)] transition-all animate-in fade-in slide-in-from-top-3">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-emerald-100 text-emerald-700 shadow-2xs">
                      <Stethoscope size={19} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[15px] font-semibold text-ink">Pharmacy &amp; Batch Compliance</h2>
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-2xs">
                          Active Rx Mode
                        </span>
                      </div>
                      <p className="text-[12px] text-muted">
                        Drug Schedule, active generic salt, batch number, manufacturer, and expiry tracking
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 cursor-pointer transition hover:bg-amber-100">
                      <input
                        type="checkbox"
                        checked={pharmacyRequiresRx}
                        onChange={(e) => setPharmacyRequiresRx(e.target.checked)}
                        className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                      />
                      <span>Prescription Required (Rx)</span>
                    </label>
                    <label className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 cursor-pointer transition hover:bg-rose-100">
                      <input
                        type="checkbox"
                        checked={pharmacyIsNarcotic}
                        onChange={(e) => setPharmacyIsNarcotic(e.target.checked)}
                        className="rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Narcotic / Schedule X</span>
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-[13px] font-semibold text-ink">
                    Initial Batch Number <span className="text-emerald-600">*</span>
                    <input
                      value={pharmacyBatchNumber}
                      onChange={(e) => setPharmacyBatchNumber(e.target.value)}
                      placeholder="e.g. BT-2026-X01"
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </label>

                  <label className="block text-[13px] font-semibold text-ink">
                    Manufacturing Date (MFG)
                    <input
                      type="date"
                      value={pharmacyMfgDate}
                      onChange={(e) => setPharmacyMfgDate(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </label>

                  <label className="block text-[13px] font-semibold text-ink">
                    Expiry Date (EXP) <span className="text-rose-500">*</span>
                    <input
                      type="date"
                      value={pharmacyExpDate}
                      onChange={(e) => setPharmacyExpDate(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </label>

                  <div className="sm:col-span-2 block text-[13px] font-semibold text-ink">
                    Generic / Salt Name (Composition) <span className="text-emerald-600">*</span>
                    <input
                      value={pharmacyComposition}
                      onChange={(e) => setPharmacyComposition(e.target.value)}
                      placeholder="e.g. Paracetamol IP 500mg + Phenylephrine HCl 5mg"
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <label className="block text-[13px] font-semibold text-ink">
                    Drug Schedule
                    <select
                      value={pharmacySchedule}
                      onChange={(e) => setPharmacySchedule(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="OTC">OTC (Over the Counter / General)</option>
                      <option value="Schedule H">Schedule H (Prescription)</option>
                      <option value="Schedule H1">Schedule H1 (High-Alert Rx & Register)</option>
                      <option value="Schedule X">Schedule X (Narcotics / Psychotropic)</option>
                      <option value="Schedule G">Schedule G (Medical Supervision)</option>
                      <option value="AYUSH">AYUSH / Herbal Medicine</option>
                    </select>
                  </label>

                  <label className="block text-[13px] font-semibold text-ink">
                    Dosage Form
                    <select
                      value={pharmacyDosageForm}
                      onChange={(e) => setPharmacyDosageForm(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Tablets">Tablets</option>
                      <option value="Capsules">Capsules</option>
                      <option value="Syrup / Suspension">Syrup / Suspension</option>
                      <option value="Injection / Vial">Injection / Vial</option>
                      <option value="Ointment / Gel">Ointment / Gel</option>
                      <option value="Drops (Eye/Ear)">Drops (Eye/Ear)</option>
                      <option value="Inhaler / Respules">Inhaler / Respules</option>
                      <option value="Powder / Granules">Powder / Granules</option>
                    </select>
                  </label>

                  <label className="block text-[13px] font-semibold text-ink">
                    Pack / Strip Details
                    <input
                      value={pharmacyPackSize}
                      onChange={(e) => setPharmacyPackSize(e.target.value)}
                      placeholder="e.g. 1 Strip of 10 Tablets"
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </label>

                  <label className="block text-[13px] font-semibold text-ink">
                    Manufacturer / Marketer
                    <input
                      value={pharmacyManufacturer}
                      onChange={(e) => setPharmacyManufacturer(e.target.value)}
                      placeholder="e.g. Sun Pharma / Cipla / Abbott"
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </label>

                  <label className="block text-[13px] font-semibold text-ink">
                    Drug License (DL) / FSSAI No.
                    <input
                      value={pharmacyDrugLicense}
                      onChange={(e) => setPharmacyDrugLicense(e.target.value)}
                      placeholder="e.g. DL-20B-18492"
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    />
                  </label>

                  <label className="sm:col-span-2 block text-[13px] font-semibold text-ink">
                    Storage &amp; Temperature Instructions
                    <select
                      value={pharmacyStorageCondition}
                      onChange={(e) => setPharmacyStorageCondition(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal text-ink focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Room Temperature (< 25°C)">Room Temperature (Store below 25°C)</option>
                      <option value="Cool Place (15°C - 20°C)">Cool Place (15°C to 20°C)</option>
                      <option value="Cold Storage / Refrigerate (2°C - 8°C)">Cold Storage / Refrigerate (2°C to 8°C - Do Not Freeze)</option>
                      <option value="Protect from Light & Moisture">Protect from Direct Light &amp; Moisture</option>
                    </select>
                  </label>
                </div>
              </section>
            )}
          </div>

          {/* RIGHT COLUMN: Product Gallery + Status Checkboxes + Pre-Order + Warranty */}
          <div className="space-y-6">
            {/* Card 4: Product Images Gallery */}
            <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <h2 className="mb-3 text-[15px] font-semibold text-ink">Product images gallery</h2>
              <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-7 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-indigo-600 transition group-hover:scale-105">
                  <ImagePlus size={22} />
                </span>
                <p className="mt-2.5 text-[13px] font-semibold text-ink">Drag & Drop images here or click to browse</p>
                <p className="mt-0.5 text-[11px] text-muted">Supports PNG, JPG, WEBP</p>
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[#6366f1] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-xs">
                  <Upload size={13} />
                  Choose Images
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <div className="mt-3">
                <label className="block text-[12px] font-medium text-muted">
                  Or paste direct Image URL
                  <input
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-[12px] text-ink"
                  />
                </label>
              </div>

              {(prodImage || prodGallery.length > 0) ? (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[...(prodImage && !prodGallery.includes(prodImage) ? [prodImage] : []), ...prodGallery].map(
                    (img, idx) => (
                      <div
                        key={idx}
                        className="group relative aspect-square overflow-hidden rounded-[8px] border border-line bg-bg"
                      >
                        <img src={img} alt="Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            if (img === prodImage) setProdImage("");
                            setProdGallery((prev) => prev.filter((item) => item !== img));
                          }}
                          className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              ) : null}
            </section>

            {/* Card 5: Status (Matches Image 5 Checkboxes) */}
            <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <h2 className="mb-3.5 text-[15px] font-semibold text-ink">Status</h2>
              <div className="space-y-3 text-[13px] font-medium text-ink">
                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={statusActive}
                    onChange={(e) => setStatusActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#6366f1]"
                  />
                  <span>Active</span>
                </label>

                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={notForSelling}
                    onChange={(e) => setNotForSelling(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#6366f1]"
                  />
                  <span>This Product Not For Selling</span>
                </label>

                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={pharmacyBatchMode}
                    onChange={(e) => setPharmacyBatchMode(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#6366f1]"
                  />
                  <span>Track batches & expiry (Pharmacy Mode)</span>
                </label>

                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={featuredProduct}
                    onChange={(e) => setFeaturedProduct(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#6366f1]"
                  />
                  <span>Featured Product</span>
                </label>

                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={hideFromOnline}
                    onChange={(e) => setHideFromOnline(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#6366f1]"
                  />
                  <span>Hide From Online Store</span>
                </label>

                <label className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={alwaysInStock}
                    onChange={(e) => setAlwaysInStock(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#6366f1]"
                  />
                  <span>Always in stock (Allow POS sale at 0 qty)</span>
                </label>
              </div>
            </section>

            {/* Card 6: Pre-Order */}
            <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <h2 className="mb-3 text-[15px] font-semibold text-ink">Pre-Order</h2>
              <label className="flex items-center gap-2.5 text-[13px] font-medium text-ink">
                <input
                  type="checkbox"
                  checked={preOrderAvailable}
                  onChange={(e) => setPreOrderAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#6366f1]"
                />
                <span>Pre-Order Available</span>
              </label>

              {preOrderAvailable ? (
                <div className="mt-3.5 grid gap-3 border-t border-line pt-3.5">
                  <label className="block text-[12px] font-semibold text-ink">
                    Expected Release Date
                    <input
                      type="date"
                      value={preOrderDate}
                      onChange={(e) => setPreOrderDate(e.target.value)}
                      className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-xs"
                    />
                  </label>
                  <label className="block text-[12px] font-semibold text-ink">
                    Max Pre-Order Quantity
                    <input
                      type="number"
                      value={preOrderLimit}
                      onChange={(e) => setPreOrderLimit(e.target.value)}
                      placeholder="50"
                      className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-xs"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            {/* Card 7: Warranty & Guarantee Tracking */}
            <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={17} className="text-indigo-600" />
                <h2 className="text-[15px] font-semibold text-ink">Warranty & Guarantee Tracking</h2>
              </div>
              <label className="flex items-center gap-2.5 text-[13px] font-medium text-ink">
                <input
                  type="checkbox"
                  checked={hasWarranty}
                  onChange={(e) => setHasWarranty(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#6366f1]"
                />
                <span>Product Has Warranty / Guarantee</span>
              </label>

              {hasWarranty ? (
                <div className="mt-3.5 space-y-3 border-t border-line pt-3.5">
                  <label className="block text-[12px] font-semibold text-ink">
                    Warranty Period
                    <select
                      value={warrantyPeriod}
                      onChange={(e) => setWarrantyPeriod(e.target.value)}
                      className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-xs"
                    >
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="12 Months">1 Year (12 Months)</option>
                      <option value="24 Months">2 Years (24 Months)</option>
                      <option value="36 Months">3 Years (36 Months)</option>
                    </select>
                  </label>
                  <label className="block text-[12px] font-semibold text-ink">
                    Guarantee Period (Optional)
                    <input
                      value={guaranteePeriod}
                      onChange={(e) => setGuaranteePeriod(e.target.value)}
                      placeholder="e.g. 6 Months replacement guarantee"
                      className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-xs"
                    />
                  </label>
                  <label className="block text-[12px] font-semibold text-ink">
                    Warranty Terms
                    <textarea
                      rows={2}
                      value={warrantyTerms}
                      onChange={(e) => setWarrantyTerms(e.target.value)}
                      placeholder="Covers manufacturing defects..."
                      className="mt-1 w-full rounded-[8px] border border-line bg-bg px-3 py-1.5 text-xs"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            {/* Submit Button */}
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-[#6366f1] px-6 text-[15px] font-semibold text-white shadow-md transition hover:bg-[#4f46e5]"
            >
              <Check size={18} />
              Submit & Save Product
            </button>
          </div>
        </form>
      ) : null}

      {/* =====================================================================
          VIEW 2: ALL PRODUCTS LIST
         ===================================================================== */}
      {view === "list" ? (
        <section className="rounded-[16px] border border-line bg-surface shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by product name..."
                  className="h-9 w-52 rounded-[8px] border border-line bg-bg pl-8 pr-3 text-[13px]"
                />
              </div>
              <input
                value={codeQuery}
                onChange={(event) => setCodeQuery(event.target.value)}
                placeholder="Search by SKU / code..."
                className="num h-9 w-40 rounded-[8px] border border-line bg-bg px-3 text-[13px]"
              />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label="Category"
                className="h-9 rounded-[8px] border border-line bg-bg px-3 text-[13px]"
              >
                <option value="">All Categories</option>
                {parents.map((row) => (
                  <option key={row.id} value={row.name}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select
                value={brandFilter}
                onChange={(event) => setBrandFilter(event.target.value)}
                aria-label="Brand"
                className="h-9 rounded-[8px] border border-line bg-bg px-3 text-[13px]"
              >
                <option value="">All Brands</option>
                {brands.map((row) => (
                  <option key={row.id} value={row.name}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as "all" | "in" | "low" | "out")}
                className="h-9 rounded-[8px] border border-line bg-bg px-3 text-[13px]"
              >
                <option value="all">All Stock Levels</option>
                <option value="in">In Stock (&gt; 0)</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock (0)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[13px] font-medium hover:bg-bg"
              >
                <Printer size={14} />
                PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  const csv = [
                    "name,code,cost_paise,price_paise,brand,category,sub_category,unit,on_hand",
                    ...shown.map(
                      (item) =>
                        `"${item.name}",${item.sku},${item.cost_paise ?? 0},${item.selling_price_paise ?? 0},"${
                          item.brand ?? ""
                        }","${item.category ?? ""}","${item.sub_category ?? ""}","${item.unit_short ?? ""}",${
                          item.on_hand
                        }`,
                    ),
                  ].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = "products-catalog.csv";
                  link.click();
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[13px] font-medium hover:bg-bg"
              >
                <Download size={14} />
                Excel / CSV
              </button>
              <Link
                href="/products/import"
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-line bg-surface px-3 text-[13px] font-medium hover:bg-bg"
              >
                <FileSpreadsheet size={14} />
                Import
              </Link>
              <Link
                href="/products/create"
                className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[#6366f1] px-3.5 text-[13px] font-semibold text-white shadow-xs hover:bg-[#4f46e5]"
              >
                <Plus size={15} />
                Create Product
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="py-3.5 pr-4">Code (SKU)</th>
                  <th className="py-3.5 pr-4">Category</th>
                  <th className="py-3.5 pr-4">Brand</th>
                  <th className="py-3.5 pr-4">Cost</th>
                  <th className="py-3.5 pr-4">Retail Price</th>
                  <th className="py-3.5 pr-4">Quantity</th>
                  <th className="py-3.5 pr-4">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((item) => {
                  const qty = Number(item.on_hand || 0);
                  const reorder = Number(item.reorder_point || 0);
                  const isLow = qty <= reorder && reorder > 0;
                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-10 w-10 shrink-0 rounded-[8px] border border-line object-cover"
                            />
                          ) : (
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-indigo-50 font-semibold text-indigo-600">
                              {item.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-ink">{item.name}</p>
                            <p className="text-[11px] text-muted">
                              {item.unit_short ? `Unit: ${item.unit_short}` : "Standard item"}
                              {item.gst_bps ? ` · GST ${(item.gst_bps / 100).toFixed(0)}%` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="num py-3.5 pr-4 font-mono font-semibold text-slate-700">{item.sku}</td>
                      <td className="py-3.5 pr-4">
                        <span className="font-medium text-ink">{item.category ?? "—"}</span>
                        {item.sub_category ? (
                          <span className="block text-[11px] text-muted">↳ {item.sub_category}</span>
                        ) : null}
                      </td>
                      <td className="py-3.5 pr-4 text-muted">{item.brand ?? "—"}</td>
                      <td className="num py-3.5 pr-4 text-muted">{formatInr(item.cost_paise ?? 0)}</td>
                      <td className="num py-3.5 pr-4 font-semibold text-ink">
                        {item.selling_price_paise == null ? "—" : formatInr(item.selling_price_paise)}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`num inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${
                            qty <= 0
                              ? "bg-rose-50 text-rose-700"
                              : isLow
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {qty} {item.unit_short ?? ""}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                            item.status === "inactive"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {item.status ?? "active"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="rounded-[7px] border border-line p-1.5 text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                            title="Edit Product"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(`/api/v1/catalog/own/products/${item.id}`)}
                            className="rounded-[7px] border border-line p-1.5 text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 ? (
                  <tr>
                    <td className="px-5 py-12 text-center text-muted" colSpan={9}>
                      No matching products found. Click &ldquo;Create Product&rdquo; to add one.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* =====================================================================
          VIEW 3: SHARED MASTER CATALOG
         ===================================================================== */}
      {view === "catalog" ? (
        <form
          className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!storeId) return;
            const data = new FormData(event.currentTarget);
            const ids = Object.entries(picked)
              .filter(([, on]) => on)
              .map(([id]) => id);
            void send(`/api/v1/stores/${storeId}/items/bulk-from-catalog`, {
              margin_bps: Math.round(Number(data.get("margin") || 0) * 100),
              master_product_ids: ids,
            }).then(() => {
              setAddedMasters((prev) => {
                const next = { ...prev };
                for (const id of ids) next[id] = true;
                return next;
              });
              setPicked({});
            });
          }}
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Import from Shared Master Catalog</h2>
              <p className="text-[12px] text-muted">
                Select published FMCG & retail items below. Selling price is automatically calculated from reference MRP minus your margin.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-[12px] font-semibold text-ink">
                Retail Margin (%)
                <input
                  name="margin"
                  defaultValue="10"
                  aria-label="Margin percent"
                  className="num mt-1 block h-10 w-28 rounded-[8px] border border-line bg-bg px-3 text-sm"
                />
              </label>
              <label className="text-[12px] font-semibold text-ink">
                Opening Quantity
                <input
                  name="qty"
                  defaultValue="20"
                  aria-label="Opening quantity"
                  className="num mt-1 block h-10 w-28 rounded-[8px] border border-line bg-bg px-3 text-sm"
                />
              </label>
              <Button type="submit" variant="primary">
                <PackagePlus size={15} className="mr-1.5" />
                Add Selected to Store
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {masters.map((master) => {
              const isAdded = addedMasters[master.id];
              return (
                <div
                  key={master.id}
                  className={`flex items-center justify-between gap-3 rounded-[12px] border p-3.5 text-sm font-medium transition ${
                    picked[master.id]
                      ? "border-indigo-500 bg-indigo-50/50 text-indigo-950"
                      : "border-line bg-bg/50 text-ink hover:border-slate-300"
                  }`}
                >
                  <label className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={picked[master.id] ?? false}
                      onChange={(event) =>
                        setPicked((current) => ({ ...current, [master.id]: event.target.checked }))
                      }
                      aria-label={master.name}
                      className="h-4 w-4 rounded accent-[#6366f1] shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-ink text-xs sm:text-sm">{master.name}</span>
                      <div className="flex items-center gap-2 text-[11px] text-muted font-normal mt-0.5">
                        {master.barcodes?.[0]?.value && (
                          <span className="font-mono bg-surface px-1 py-0.5 rounded border border-line">{master.barcodes[0].value}</span>
                        )}
                        {master.reference_mrp_paise != null && (
                          <span>MRP: {formatInr(master.reference_mrp_paise)}</span>
                        )}
                      </div>
                    </div>
                  </label>
                  <button
                    type="button"
                    disabled={isAdded || !storeId}
                    onClick={() => {
                      if (!storeId) return;
                      void send(`/api/v1/stores/${storeId}/items/from-catalog`, {
                        margin_bps: 1000,
                        items: [{ master_product_id: master.id, opening_qty: 20 }],
                      }).then(() => {
                        setAddedMasters((prev) => ({ ...prev, [master.id]: true }));
                      });
                    }}
                    className={`shrink-0 rounded-[8px] px-2.5 py-1 text-xs font-semibold transition ${
                      isAdded
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-surface border border-line text-ink hover:bg-indigo-600 hover:text-white hover:border-indigo-600 shadow-xs"
                    }`}
                  >
                    {isAdded ? "✓ Added" : "+ 1-Click Add"}
                  </button>
                </div>
              );
            })}
            {masters.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-muted">
                No master catalog products published yet.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}

      {/* =====================================================================
          VIEW 4: CATEGORIES MANAGEMENT
         ===================================================================== */}
      {view === "categories" ? (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          {/* Create / Edit Category Form */}
          <form
            key={editingCategory?.id ?? "new-cat"}
            className="h-fit space-y-4 rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const payload = {
                name: data.get("name"),
                code: data.get("code"),
                description: data.get("description") || null,
                image: data.get("image") || null,
                sort_order: Number(data.get("sort_order") || 0),
                online_visible: data.get("online_visible") === "on",
                status: data.get("status") === "on" ? "active" : "inactive",
                parent_id: null,
              };
              if (editingCategory) {
                void send(`/api/v1/catalog/own/categories/${editingCategory.id}`, payload, "PATCH").then(() =>
                  setEditingCategory(null),
                );
              } else {
                void send("/api/v1/catalog/own/categories", payload);
                event.currentTarget.reset();
              }
            }}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FolderTree size={18} className="text-indigo-600" />
                <h2 className="text-[15px] font-semibold text-ink">
                  {editingCategory ? "Edit Category" : "Create New Category"}
                </h2>
              </div>
              {editingCategory ? (
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <label className="block text-[13px] font-semibold text-ink">
              Category Name <span className="text-rose-500">*</span>
              <input
                name="name"
                required
                defaultValue={editingCategory?.name ?? ""}
                placeholder="e.g. Beverages, Dairy & Bakery"
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Category Code <span className="text-rose-500">*</span>
              <input
                name="code"
                required
                defaultValue={editingCategory?.code ?? randomCode("CAT")}
                placeholder="e.g. CAT-101"
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Description
              <textarea
                name="description"
                rows={2}
                defaultValue={editingCategory?.description ?? ""}
                placeholder="Short category description..."
                className="mt-1.5 w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-sm font-normal"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[13px] font-semibold text-ink">
                Icon / Image URL
                <input
                  name="image"
                  defaultValue={editingCategory?.image ?? ""}
                  placeholder="https://..."
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[13px] font-semibold text-ink">
                Display Order
                <input
                  name="sort_order"
                  type="number"
                  defaultValue={editingCategory?.sort_order ?? 0}
                  className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
            </div>

            <div className="space-y-2 pt-1 text-[13px] font-medium">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="online_visible"
                  defaultChecked={editingCategory?.online_visible ?? true}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Show in Online Storefront</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="status"
                  defaultChecked={(editingCategory?.status ?? "active") === "active"}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Active Status</span>
              </label>
            </div>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#6366f1] text-sm font-semibold text-white shadow-xs transition hover:bg-[#4f46e5]"
            >
              <Plus size={15} />
              {editingCategory ? "Update Category" : "Create Category"}
            </button>
          </form>

          {/* Categories Table */}
          <section className="rounded-[16px] border border-line bg-surface shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink">All Categories ({parents.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Code</th>
                    <th className="py-3 pr-4">Category Name</th>
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 pr-4">Sub Categories</th>
                    <th className="py-3 pr-4">Online</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {parents.map((cat) => {
                    const subCount = children.filter((c) => c.parent_id === cat.id).length;
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/80">
                        <td className="num px-5 py-3.5 font-mono font-semibold text-indigo-600">{cat.code}</td>
                        <td className="py-3.5 pr-4 font-semibold text-ink">{cat.name}</td>
                        <td className="py-3.5 pr-4 text-muted">{cat.description || "—"}</td>
                        <td className="py-3.5 pr-4">
                          <span className="num rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            {subCount} sub
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              cat.online_visible !== false
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {cat.online_visible !== false ? "Visible" : "Hidden"}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                              (cat.status ?? "active") === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {cat.status ?? "active"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCategory(cat)}
                              className="rounded-[7px] border border-line p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(`/api/v1/catalog/own/categories/${cat.id}`)}
                              className="rounded-[7px] border border-line p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {parents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted">
                        No categories created yet. Use the form on the left to add your first category.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {/* =====================================================================
          VIEW 5: SUB CATEGORIES MANAGEMENT
         ===================================================================== */}
      {view === "subcategories" ? (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <form
            key={editingCategory?.id ?? "new-subcat"}
            className="h-fit space-y-4 rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const payload = {
                name: data.get("name"),
                code: data.get("code"),
                parent_id: data.get("parent_id"),
                description: data.get("description") || null,
                sort_order: Number(data.get("sort_order") || 0),
                online_visible: data.get("online_visible") === "on",
                status: data.get("status") === "on" ? "active" : "inactive",
              };
              if (editingCategory) {
                void send(`/api/v1/catalog/own/categories/${editingCategory.id}`, payload, "PATCH").then(() =>
                  setEditingCategory(null),
                );
              } else {
                void send("/api/v1/catalog/own/categories", payload);
                event.currentTarget.reset();
              }
            }}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" />
                <h2 className="text-[15px] font-semibold text-ink">
                  {editingCategory ? "Edit Sub Category" : "Create Sub Category"}
                </h2>
              </div>
              {editingCategory ? (
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <label className="block text-[13px] font-semibold text-ink">
              Parent Category <span className="text-rose-500">*</span>
              <select
                name="parent_id"
                required
                defaultValue={editingCategory?.parent_id ?? parents[0]?.id ?? ""}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              >
                <option value="">Select Parent Category</option>
                {parents.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Sub Category Name <span className="text-rose-500">*</span>
              <input
                name="name"
                required
                defaultValue={editingCategory?.name ?? ""}
                placeholder="e.g. Cold Coffee, Herbal Tea"
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Sub Category Code <span className="text-rose-500">*</span>
              <input
                name="code"
                required
                defaultValue={editingCategory?.code ?? randomCode("SUB")}
                placeholder="e.g. SUB-201"
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Description
              <textarea
                name="description"
                rows={2}
                defaultValue={editingCategory?.description ?? ""}
                placeholder="Optional description..."
                className="mt-1.5 w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-sm font-normal"
              />
            </label>

            <div className="space-y-2 pt-1 text-[13px] font-medium">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="online_visible"
                  defaultChecked={editingCategory?.online_visible ?? true}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Show in Online Storefront</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="status"
                  defaultChecked={(editingCategory?.status ?? "active") === "active"}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Active Status</span>
              </label>
            </div>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#6366f1] text-sm font-semibold text-white shadow-xs transition hover:bg-[#4f46e5]"
            >
              <Plus size={15} />
              {editingCategory ? "Update Sub Category" : "Create Sub Category"}
            </button>
          </form>

          <section className="rounded-[16px] border border-line bg-surface shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink">All Sub Categories ({children.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Code</th>
                    <th className="py-3 pr-4">Sub Category</th>
                    <th className="py-3 pr-4">Parent Category</th>
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {children.map((sub) => {
                    const parentName = categories.find((c) => c.id === sub.parent_id)?.name ?? "—";
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/80">
                        <td className="num px-5 py-3.5 font-mono font-semibold text-indigo-600">{sub.code}</td>
                        <td className="py-3.5 pr-4 font-semibold text-ink">{sub.name}</td>
                        <td className="py-3.5 pr-4">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[12px] font-semibold text-indigo-700">
                            {parentName}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-muted">{sub.description || "—"}</td>
                        <td className="py-3.5 pr-4">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-emerald-700">
                            {sub.status ?? "active"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingCategory(sub)}
                              className="rounded-[7px] border border-line p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void remove(`/api/v1/catalog/own/categories/${sub.id}`)}
                              className="rounded-[7px] border border-line p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {children.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted">
                        No sub categories created yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {/* =====================================================================
          VIEW 6: BRANDS MANAGEMENT
         ===================================================================== */}
      {view === "brands" ? (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <form
            key={editingBrand?.id ?? "new-brand"}
            className="h-fit space-y-4 rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const payload = {
                name: data.get("name"),
                code: data.get("code") || null,
                description: data.get("description") || null,
                image: data.get("image") || null,
                website: data.get("website") || null,
                is_featured: data.get("is_featured") === "on",
                status: data.get("status") === "on" ? "active" : "inactive",
              };
              if (editingBrand) {
                void send(`/api/v1/catalog/own/brands/${editingBrand.id}`, payload, "PATCH").then(() =>
                  setEditingBrand(null),
                );
              } else {
                void send("/api/v1/catalog/own/brands", payload);
                event.currentTarget.reset();
              }
            }}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-indigo-600" />
                <h2 className="text-[15px] font-semibold text-ink">
                  {editingBrand ? "Edit Brand" : "Create New Brand"}
                </h2>
              </div>
              {editingBrand ? (
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <label className="block text-[13px] font-semibold text-ink">
              Brand Name <span className="text-rose-500">*</span>
              <input
                name="name"
                required
                defaultValue={editingBrand?.name ?? ""}
                placeholder="e.g. Nescafé, Amul, Britannia"
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Brand Code
              <input
                name="code"
                defaultValue={editingBrand?.code ?? randomCode("BRD")}
                placeholder="e.g. BRD-101"
                className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Description
              <textarea
                name="description"
                rows={2}
                defaultValue={editingBrand?.description ?? ""}
                placeholder="Brand overview or distributor notes..."
                className="mt-1.5 w-full rounded-[8px] border border-line bg-bg px-3 py-2 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Brand Logo URL
              <input
                name="image"
                defaultValue={editingBrand?.image ?? ""}
                placeholder="https://..."
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Official Website
              <input
                name="website"
                defaultValue={editingBrand?.website ?? ""}
                placeholder="https://brand.com"
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <div className="space-y-2 pt-1 text-[13px] font-medium">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_featured"
                  defaultChecked={editingBrand?.is_featured ?? false}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Featured Brand</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="status"
                  defaultChecked={(editingBrand?.status ?? "active") === "active"}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Active Status</span>
              </label>
            </div>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#6366f1] text-sm font-semibold text-white shadow-xs transition hover:bg-[#4f46e5]"
            >
              <Plus size={15} />
              {editingBrand ? "Update Brand" : "Create Brand"}
            </button>
          </form>

          <section className="rounded-[16px] border border-line bg-surface shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink">All Brands ({brands.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Brand</th>
                    <th className="py-3 pr-4">Code</th>
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 pr-4">Featured</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {brands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {brand.image ? (
                            <img
                              src={brand.image}
                              alt={brand.name}
                              className="h-9 w-9 rounded-[8px] border border-line object-cover"
                            />
                          ) : (
                            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-indigo-50 text-xs font-semibold text-indigo-600">
                              {brand.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-ink">{brand.name}</p>
                            {brand.website ? (
                              <span className="text-[11px] text-muted">{brand.website}</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="num py-3.5 pr-4 font-mono text-xs text-muted">{brand.code || "—"}</td>
                      <td className="py-3.5 pr-4 text-muted">{brand.description || "—"}</td>
                      <td className="py-3.5 pr-4">
                        {brand.is_featured ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                            Featured
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Standard</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-emerald-700">
                          {brand.status ?? "active"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingBrand(brand)}
                            className="rounded-[7px] border border-line p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(`/api/v1/catalog/own/brands/${brand.id}`)}
                            className="rounded-[7px] border border-line p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {brands.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted">
                        No brands created yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {/* =====================================================================
          VIEW 7: UNITS MANAGEMENT
         ===================================================================== */}
      {view === "units" ? (
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <form
            key={editingUnit?.id ?? "new-unit"}
            className="h-fit space-y-4 rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const payload = {
                name: data.get("name"),
                short_name: data.get("short_name"),
                base_unit_id: data.get("base_unit_id") || null,
                operator: data.get("operator") || "*",
                operation_value: Number(data.get("operation_value") || 1),
                allow_decimal: data.get("allow_decimal") === "on",
                status: data.get("status") === "on" ? "active" : "inactive",
              };
              if (editingUnit) {
                void send(`/api/v1/catalog/own/units/${editingUnit.id}`, payload, "PATCH").then(() =>
                  setEditingUnit(null),
                );
              } else {
                void send("/api/v1/catalog/own/units", payload);
                event.currentTarget.reset();
              }
            }}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-indigo-600" />
                <h2 className="text-[15px] font-semibold text-ink">
                  {editingUnit ? "Edit Unit" : "Create Unit of Measure"}
                </h2>
              </div>
              {editingUnit ? (
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="text-xs font-semibold text-muted hover:text-ink"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <label className="block text-[13px] font-semibold text-ink">
              Unit Name <span className="text-rose-500">*</span>
              <input
                name="name"
                required
                defaultValue={editingUnit?.name ?? ""}
                placeholder="e.g. Piece, Kilogram, Box of 12"
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Short Name (Symbol) <span className="text-rose-500">*</span>
              <input
                name="short_name"
                required
                defaultValue={editingUnit?.short_name ?? ""}
                placeholder="e.g. pc, kg, box"
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              />
            </label>

            <label className="block text-[13px] font-semibold text-ink">
              Base Unit (Optional)
              <select
                name="base_unit_id"
                defaultValue={editingUnit?.base_unit_id ?? ""}
                className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
              >
                <option value="">None (This is a base unit)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.short_name})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[13px] font-semibold text-ink">
                Operator
                <select
                  name="operator"
                  defaultValue={editingUnit?.operator ?? "*"}
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                >
                  <option value="*">Multiply (*)</option>
                  <option value="/">Divide (/)</option>
                </select>
              </label>

              <label className="block text-[13px] font-semibold text-ink">
                Operation Value
                <input
                  name="operation_value"
                  type="number"
                  step="0.001"
                  defaultValue={editingUnit?.operation_value ?? 1}
                  className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
            </div>

            <div className="space-y-2 pt-1 text-[13px] font-medium">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="allow_decimal"
                  defaultChecked={editingUnit?.allow_decimal ?? false}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Allow Decimal Quantities (e.g. 0.5 kg)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="status"
                  defaultChecked={(editingUnit?.status ?? "active") === "active"}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Active Status</span>
              </label>
            </div>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[8px] bg-[#6366f1] text-sm font-semibold text-white shadow-xs transition hover:bg-[#4f46e5]"
            >
              <Plus size={15} />
              {editingUnit ? "Update Unit" : "Create Unit"}
            </button>
          </form>

          <section className="rounded-[16px] border border-line bg-surface shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
            <div className="border-b border-line px-5 py-4">
              <h3 className="text-[15px] font-semibold text-ink">All Units ({units.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Unit Name</th>
                    <th className="py-3 pr-4">Short Name</th>
                    <th className="py-3 pr-4">Base Conversion</th>
                    <th className="py-3 pr-4">Decimals</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {units.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-semibold text-ink">{u.name}</td>
                      <td className="num py-3.5 pr-4 font-mono font-semibold text-indigo-600">{u.short_name}</td>
                      <td className="num py-3.5 pr-4 text-muted">
                        {u.operator ?? "*"} {u.operation_value ?? 1}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            u.allow_decimal ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {u.allow_decimal ? "Allowed" : "Whole only"}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-emerald-700">
                          {u.status ?? "active"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingUnit(u)}
                            className="rounded-[7px] border border-line p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(`/api/v1/catalog/own/units/${u.id}`)}
                            className="rounded-[7px] border border-line p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {units.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-muted">
                        No units configured yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {/* =====================================================================
          VIEW 8: IMPORT PRODUCTS / IMPORT PRICES / OPENING STOCK
         ===================================================================== */}
      {view === "import" || view === "prices" || view === "opening" ? (
        <div className="space-y-6">
          {view === "opening" && items.length > 0 ? (
            <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Quick Opening Stock Updater</h2>
                  <p className="text-[12px] text-muted">
                    Instantly set or top-up stock balances for any product in your store.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <form
                    key={item.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const qty = Number(new FormData(e.currentTarget).get("qty") || 0);
                      void send("/api/v1/catalog/own/products/opening", {
                        csv: `product_code,qty\n${item.sku},${qty}`,
                      });
                    }}
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-line bg-bg/50 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{item.name}</p>
                      <p className="text-[11px] text-muted">
                        SKU: <span className="font-mono">{item.sku}</span> · Current:{" "}
                        <span className="font-semibold text-ink">{item.on_hand}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        name="qty"
                        type="number"
                        step="1"
                        defaultValue="25"
                        className="num h-8 w-20 rounded-[6px] border border-line bg-surface px-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="h-8 rounded-[6px] bg-indigo-600 px-2.5 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                ))}
              </div>
            </section>
          ) : null}

          <CsvBox
            title={
              view === "import"
                ? "Bulk CSV Product Import"
                : view === "prices"
                  ? "Bulk CSV Price Update"
                  : "Bulk CSV Opening Stock"
            }
            hint={
              view === "import"
                ? "name,code,cost,category,sub_category,unit,retail_price,brand"
                : view === "prices"
                  ? "code,cost,retail_price"
                  : "product_code,qty"
            }
            example={
              view === "import"
                ? "name,code,cost,category,unit,retail_price,brand\nOrange juice,OJ-2,1.10,Beverages,pc,2.60,AquaPure"
                : view === "prices"
                  ? "code,cost,retail_price\nOJ-1,1.20,2.80"
                  : "product_code,qty\n33990,50"
            }
            onSubmit={(csv) =>
              void send(
                view === "import"
                  ? "/api/v1/catalog/own/products/import"
                  : view === "prices"
                    ? "/api/v1/catalog/own/products/prices"
                    : "/api/v1/catalog/own/products/opening",
                { csv },
              )
            }
          />
        </div>
      ) : null}

      {/* =====================================================================
          VIEW 9: PRINT BARCODE LABELS STUDIO
         ===================================================================== */}
      {view === "labels" ? (
        <div className="space-y-5">
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-line bg-surface p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
            <div className="flex flex-wrap items-center gap-5 text-[13px] font-medium">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={labelShowStore}
                  onChange={(e) => setLabelShowStore(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Show Store Name</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={labelShowPrice}
                  onChange={(e) => setLabelShowPrice(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#6366f1]"
                />
                <span>Show Retail Price</span>
              </label>
              <label className="flex items-center gap-2">
                <span>Copies per item:</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={labelCopies}
                  onChange={(e) => setLabelCopies(Math.max(1, Number(e.target.value || 1)))}
                  className="num h-8 w-16 rounded-[6px] border border-line bg-bg px-2 text-center text-xs"
                />
              </label>
            </div>
            <Button type="button" variant="primary" onClick={() => window.print()}>
              <Printer size={15} className="mr-1.5" />
              Print Barcode Sheet
            </Button>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {labels.flatMap((label) =>
              Array.from({ length: labelCopies }).map((_, idx) => (
                <article
                  key={`${label.sku}-${idx}`}
                  className="flex flex-col items-center justify-center rounded-[12px] border border-dashed border-slate-300 bg-white p-5 text-center shadow-xs"
                >
                  {labelShowStore ? (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">SelfX Retail</p>
                  ) : null}
                  <p className="mt-1 line-clamp-1 text-[14px] font-semibold text-slate-900">{label.name}</p>
                  {/* Simulated crisp barcode bars */}
                  <div className="my-2.5 flex h-11 items-stretch justify-center gap-[2px] px-3">
                    {Array.from({ length: 28 }).map((__, barIdx) => (
                      <span
                        key={barIdx}
                        className="bg-slate-900"
                        style={{
                          width: barIdx % 3 === 0 ? "3px" : barIdx % 2 === 0 ? "1.5px" : "2px",
                          opacity: barIdx % 7 === 0 ? 0.85 : 1,
                        }}
                      />
                    ))}
                  </div>
                  <p className="num font-mono text-[12px] font-semibold tracking-[0.25em] text-slate-700">
                    {label.sku}
                  </p>
                  {labelShowPrice ? (
                    <p className="num mt-1.5 text-[14px] font-semibold text-slate-900">
                      MRP {formatInr(label.selling_price_paise)}
                    </p>
                  ) : null}
                </article>
              )),
            )}
          </section>
        </div>
      ) : null}

      {/* =====================================================================
          QUICK INLINE CREATION MODAL (For + Buttons on Create Product Page)
         ===================================================================== */}
      {quickModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-line bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-[15px] font-semibold capitalize text-ink">
                Quick Create {quickModal === "subcategory" ? "Sub Category" : quickModal}
              </h3>
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="rounded-lg p-1 text-muted hover:bg-bg hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                if (quickModal === "category") {
                  void send("/api/v1/catalog/own/categories", {
                    name: data.get("name"),
                    code: data.get("code") || randomCode("CAT"),
                    parent_id: null,
                  }).then((res) => {
                    if (res && typeof res === "object" && "id" in res && res.id) {
                      setProdCategoryId(String(res.id));
                    }
                    setQuickModal(null);
                  });
                } else if (quickModal === "subcategory") {
                  void send("/api/v1/catalog/own/categories", {
                    name: data.get("name"),
                    code: data.get("code") || randomCode("SUB"),
                    parent_id: data.get("parent_id") || prodCategoryId || parents[0]?.id,
                  }).then((res) => {
                    if (res && typeof res === "object" && "id" in res && res.id) {
                      setProdSubCategoryId(String(res.id));
                    }
                    setQuickModal(null);
                  });
                } else if (quickModal === "brand") {
                  void send("/api/v1/catalog/own/brands", {
                    name: data.get("name"),
                    code: data.get("code") || randomCode("BRD"),
                    description: data.get("description") || null,
                  }).then((res) => {
                    if (res && typeof res === "object" && "id" in res && res.id) {
                      setProdBrandId(String(res.id));
                    }
                    setQuickModal(null);
                  });
                } else if (quickModal === "unit") {
                  void send("/api/v1/catalog/own/units", {
                    name: data.get("name"),
                    short_name: data.get("short_name"),
                    operator: "*",
                    operation_value: 1,
                  }).then((res) => {
                    if (res && typeof res === "object" && "id" in res && res.id) {
                      setProdUnitId(String(res.id));
                    }
                    setQuickModal(null);
                  });
                }
              }}
            >
              {quickModal === "subcategory" ? (
                <label className="block text-[13px] font-semibold text-ink">
                  Parent Category <span className="text-rose-500">*</span>
                  <select
                    name="parent_id"
                    required
                    defaultValue={prodCategoryId || parents[0]?.id || ""}
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                  >
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block text-[13px] font-semibold text-ink">
                Name <span className="text-rose-500">*</span>
                <input
                  name="name"
                  required
                  placeholder={`Enter ${quickModal} name`}
                  className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>

              {quickModal === "unit" ? (
                <label className="block text-[13px] font-semibold text-ink">
                  Short Name (Symbol) <span className="text-rose-500">*</span>
                  <input
                    name="short_name"
                    required
                    placeholder="e.g. pc, kg, box"
                    className="mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                  />
                </label>
              ) : (
                <label className="block text-[13px] font-semibold text-ink">
                  Code
                  <input
                    name="code"
                    defaultValue={randomCode(quickModal.slice(0, 3).toUpperCase())}
                    className="num mt-1.5 h-10 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                  />
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setQuickModal(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save & Select
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          EDIT PRODUCT MODAL (From All Products Table)
         ===================================================================== */}
      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[16px] border border-line bg-surface p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-[15px] font-semibold text-ink">Edit Product: {editingItem.name}</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-lg p-1 text-muted hover:bg-bg hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>
            <form
              className="grid gap-3.5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                void send(
                  `/api/v1/catalog/own/products/${editingItem.id}`,
                  {
                    name: data.get("name"),
                    sku: data.get("sku"),
                    cost_paise: Math.round(Number(data.get("cost") || 0) * 100),
                    selling_price_paise: Math.round(Number(data.get("price") || 0) * 100),
                    mrp_paise: Math.round(Number(data.get("price") || 0) * 100),
                    category_id: data.get("category_id") || null,
                    sub_category_id: data.get("sub_category_id") || null,
                    brand_id: data.get("brand_id") || null,
                    unit_id: data.get("unit_id") || null,
                    reorder_point: Number(data.get("reorder_point") || 0),
                    online_visible: data.get("online_visible") === "on",
                    status: data.get("status") === "on" ? "active" : "inactive",
                  },
                  "PATCH",
                ).then(() => setEditingItem(null));
              }}
            >
              <label className="block text-[12px] font-semibold text-ink sm:col-span-2">
                Product Name
                <input
                  name="name"
                  required
                  defaultValue={editingItem.name}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                SKU / Code
                <input
                  name="sku"
                  required
                  defaultValue={editingItem.sku}
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Stock Alert (Reorder Point)
                <input
                  name="reorder_point"
                  type="number"
                  defaultValue={editingItem.reorder_point ?? "5"}
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Cost (₹)
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  defaultValue={((editingItem.cost_paise ?? 0) / 100).toFixed(2)}
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Selling Price (₹)
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={((editingItem.selling_price_paise ?? 0) / 100).toFixed(2)}
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Category
                <select
                  name="category_id"
                  defaultValue={editingItem.category_id ?? ""}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                >
                  <option value="">None</option>
                  {parents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Brand
                <select
                  name="brand_id"
                  defaultValue={editingItem.brand_id ?? ""}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                >
                  <option value="">None</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-4 pt-1 text-[13px] font-medium sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="online_visible"
                    defaultChecked={editingItem.online_visible ?? true}
                    className="h-4 w-4 rounded accent-[#6366f1]"
                  />
                  <span>Visible Online</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="status"
                    defaultChecked={(editingItem.status ?? "active") === "active"}
                    className="h-4 w-4 rounded accent-[#6366f1]"
                  />
                  <span>Active</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-3 sm:col-span-2">
                <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProductsPage() {
  return <ProductWorkspace view="list" />;
}

function CsvBox({
  title,
  hint,
  example,
  onSubmit,
}: {
  title: string;
  hint: string;
  example: string;
  onSubmit: (csv: string) => void;
}) {
  const [csvContent, setCsvContent] = useState(example);

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setCsvContent(text);
      }
    };
    reader.readAsText(file);
  }

  return (
    <form
      className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(csvContent);
      }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <p className="text-[12px] text-muted">
            Required CSV Columns: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-indigo-600">{hint}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-line bg-bg px-3 text-xs font-semibold text-ink hover:bg-slate-100 cursor-pointer">
            <Upload size={13} />
            Upload File
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([example], { type: "text/csv" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = "sample-template.csv";
              link.click();
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-line bg-bg px-3 text-xs font-semibold text-ink hover:bg-slate-100"
          >
            <Download size={13} />
            Download Sample CSV
          </button>
        </div>
      </div>
      <textarea
        name="csv"
        required
        rows={8}
        value={csvContent}
        onChange={(e) => setCsvContent(e.target.value)}
        className="mt-2 w-full rounded-[10px] border border-dashed border-line bg-bg p-3.5 font-mono text-[12px] text-ink focus:border-accent focus:bg-surface focus:outline-none"
      />
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-[#6366f1] px-5 text-sm font-semibold text-white shadow-xs hover:bg-[#4f46e5]"
        >
          <Upload size={15} />
          Import CSV Data Now
        </button>
      </div>
    </form>
  );
}
