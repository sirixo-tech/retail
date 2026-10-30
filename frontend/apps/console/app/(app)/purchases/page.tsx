"use client";

import { formatInr } from "@selfx/types";
import {
  AlertCircle,
  ArrowDownLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingCart,
  Store as StoreIcon,
  Trash2,
  Truck,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Store = { id: string; name: string; code?: string };
type Supplier = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  balance_paise?: number;
};

type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  cost_paise?: number;
  on_hand?: string | number;
  tax_bps?: number;
};

type PurchaseLine = {
  store_item_id: string;
  name: string;
  sku: string;
  cost_rupees: string;
  current_stock: number;
  qty: string;
  discount_rupees: string;
  tax_percent: string;
  subtotal_rupees: number;
  batch_number?: string;
  expires_on?: string;
};

type PurchaseOrder = {
  id: string;
  number: string;
  supplier_id: string;
  supplier_name: string;
  supplier_phone?: string | null;
  supplier_gstin?: string | null;
  store_id: string;
  store_name: string;
  status: "received" | "pending" | "ordered";
  payment_status: "paid" | "partial" | "unpaid";
  total_paise: number;
  paid_paise: number;
  due_paise: number;
  order_tax_rate: number;
  order_tax_paise: number;
  discount_paise: number;
  shipping_paise: number;
  notes?: string | null;
  created_at: string;
};

type PurchaseKPIs = {
  total_count: number;
  total_amount_paise: number;
  total_paid_paise: number;
  total_due_paise: number;
};

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "create" | "import">("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reference data
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);

  // Tab 1: All Purchases State
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [kpis, setKpis] = useState<PurchaseKPIs>({
    total_count: 0,
    total_amount_paise: 0,
    total_paid_paise: 0,
    total_due_paise: 0,
  });
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Modals state
  const [viewPoModal, setViewPoModal] = useState<{
    open: boolean;
    po: PurchaseOrder | null;
    lines: any[];
    loading: boolean;
  }>({ open: false, po: null, lines: [], loading: false });

  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    po: PurchaseOrder | null;
    amountRupees: string;
    method: string;
    note: string;
    submitting: boolean;
  }>({ open: false, po: null, amountRupees: "", method: "cash", note: "", submitting: false });

  const [quickSupplierModal, setQuickSupplierModal] = useState<{
    open: boolean;
    name: string;
    phone: string;
    email: string;
    gstin: string;
    address: string;
    submitting: boolean;
  }>({ open: false, name: "", phone: "", email: "", gstin: "", address: "", submitting: false });

  // Tab 2: Create Purchase State
  const [createDate, setCreateDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [createSupplierId, setCreateSupplierId] = useState("");
  const [createStoreId, setCreateStoreId] = useState("");
  const [createStatus, setCreateStatus] = useState<"received" | "pending" | "ordered">("received");
  const [createOrderTaxRate, setCreateOrderTaxRate] = useState("0");
  const [createDiscountRupees, setCreateDiscountRupees] = useState("0");
  const [createShippingRupees, setCreateShippingRupees] = useState("0");
  const [createPaidRupees, setCreatePaidRupees] = useState("0");
  const [createNotes, setCreateNotes] = useState("");
  const [createLines, setCreateLines] = useState<PurchaseLine[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Tab 3: Import Purchases State
  const [importStoreId, setImportStoreId] = useState("");
  const [importSupplierId, setImportSupplierId] = useState("");
  const [importStatus, setImportStatus] = useState<"received" | "pending" | "ordered">("received");
  const [importNotes, setImportNotes] = useState("");
  const [importParsedRows, setImportParsedRows] = useState<any[]>([]);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  async function loadInitialData() {
    try {
      setLoading(true);
      const [storesRes, suppliersRes, meRes] = await Promise.all([
        fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } }),
        fetch("/api/v1/suppliers", { credentials: "include", headers: { Accept: "application/json" } }),
        fetch("/api/v1/auth/staff/me", { credentials: "include", headers: { Accept: "application/json" } }),
      ]);

      let initialStoreId = "";
      if (meRes.ok) {
        const meData = await meRes.json();
        initialStoreId = meData?.data?.store?.id ?? "";
      }

      if (storesRes.ok) {
        const storesData = await storesRes.json();
        const rows: Store[] = Array.isArray(storesData?.data) ? storesData.data : [];
        setStores(rows);
        if (!initialStoreId && rows.length > 0) {
          initialStoreId = rows[0].id;
        }
      }

      setSelectedStoreId(initialStoreId);
      setCreateStoreId(initialStoreId);
      setImportStoreId(initialStoreId);

      if (suppliersRes.ok) {
        const supData = await suppliersRes.json();
        const rows: Supplier[] = Array.isArray(supData?.data) ? supData.data : [];
        setSuppliers(rows);
        if (rows.length > 0) {
          setCreateSupplierId(rows[0].id);
          setImportSupplierId(rows[0].id);
        }
      }

      if (initialStoreId) {
        await loadCatalogItems(initialStoreId);
      }

      await loadPurchasesList();
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to initialize purchases data." });
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogItems(storeId: string) {
    if (!storeId) return;
    try {
      const res = await fetch(`/api/v1/stores/${storeId}/items`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setCatalogItems(Array.isArray(data?.data) ? data.data : []);
      }
    } catch {
      // ignore
    }
  }

  async function loadPurchasesList() {
    try {
      const params = new URLSearchParams();
      if (filterStore !== "all" && filterStore) params.set("store_id", filterStore);
      if (filterSupplier !== "all" && filterSupplier) params.set("supplier_id", filterSupplier);
      if (filterStatus !== "all" && filterStatus) params.set("status", filterStatus);
      if (filterPaymentStatus !== "all" && filterPaymentStatus)
        params.set("payment_status", filterPaymentStatus);
      if (filterSearch.trim()) params.set("search", filterSearch.trim());
      if (filterDateFrom) params.set("date_from", filterDateFrom);
      if (filterDateTo) params.set("date_to", filterDateTo);

      const res = await fetch(`/api/v1/purchases?${params.toString()}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setPurchases(data?.data?.purchases ?? []);
        if (data?.data?.kpis) {
          setKpis(data.data.kpis);
        }
      }
    } catch {
      setMessage({ type: "error", text: "Could not load purchases list." });
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      void loadPurchasesList();
    }
  }, [
    filterStore,
    filterSupplier,
    filterStatus,
    filterPaymentStatus,
    filterDateFrom,
    filterDateTo,
    filterSearch,
  ]);

  // When store changes in Tab 2, reload store items
  useEffect(() => {
    if (createStoreId) {
      void loadCatalogItems(createStoreId);
    }
  }, [createStoreId]);

  // Handle adding an item to line items in Tab 2
  function addProductToCreateLines(item: CatalogItem) {
    const existingIndex = createLines.findIndex((l) => l.store_item_id === item.id);
    const unitCost = Number(((item.cost_paise ?? 0) / 100).toFixed(2));
    const onHand = Number(item.on_hand ?? 0);
    const taxBps = item.tax_bps ?? 0;
    const taxPercent = (taxBps / 100).toString();

    if (existingIndex >= 0) {
      const updated = [...createLines];
      const currentQty = Number(updated[existingIndex].qty) || 1;
      const nextQty = currentQty + 1;
      updated[existingIndex].qty = nextQty.toString();
      updated[existingIndex].subtotal_rupees = calculateLineSubtotal(
        unitCost,
        nextQty,
        Number(updated[existingIndex].discount_rupees) || 0,
        Number(updated[existingIndex].tax_percent) || 0,
      );
      setCreateLines(updated);
    } else {
      const initialQty = 1;
      const subtotal = calculateLineSubtotal(unitCost, initialQty, 0, Number(taxPercent) || 0);
      setCreateLines([
        ...createLines,
        {
          store_item_id: item.id,
          name: item.name,
          sku: item.sku,
          cost_rupees: unitCost.toString(),
          current_stock: onHand,
          qty: initialQty.toString(),
          discount_rupees: "0",
          tax_percent: taxPercent,
          subtotal_rupees: subtotal,
        },
      ]);
    }
    setProductSearch("");
    setSearchDropdownOpen(false);
  }

  function calculateLineSubtotal(
    cost: number,
    qty: number,
    discount: number,
    taxPercent: number,
  ): number {
    const base = Math.max(0, cost * qty - discount);
    const tax = base * (taxPercent / 100);
    return Math.round((base + tax) * 100) / 100;
  }

  function updateLineItem(index: number, field: keyof PurchaseLine, val: string) {
    const updated = [...createLines];
    (updated[index] as any)[field] = val;

    const cost = Number(updated[index].cost_rupees) || 0;
    const qty = Number(updated[index].qty) || 0;
    const discount = Number(updated[index].discount_rupees) || 0;
    const tax = Number(updated[index].tax_percent) || 0;

    updated[index].subtotal_rupees = calculateLineSubtotal(cost, qty, discount, tax);
    setCreateLines(updated);
  }

  function removeLineItem(index: number) {
    setCreateLines(createLines.filter((_, i) => i !== index));
  }

  // Filtered search list for autocomplete
  const filteredCatalogItems = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase().trim();
    return catalogItems
      .filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      .slice(0, 10);
  }, [productSearch, catalogItems]);

  // Tab 2 Calculation
  const linesTotalRupees = useMemo(() => {
    return createLines.reduce((acc, l) => acc + l.subtotal_rupees, 0);
  }, [createLines]);

  const grandTotalRupees = useMemo(() => {
    const net = Math.max(0, linesTotalRupees - (Number(createDiscountRupees) || 0));
    const taxRate = Number(createOrderTaxRate) || 0;
    const orderTax = net * (taxRate / 100);
    const shipping = Number(createShippingRupees) || 0;
    return Math.round((net + orderTax + shipping) * 100) / 100;
  }, [linesTotalRupees, createDiscountRupees, createOrderTaxRate, createShippingRupees]);

  // Submit Tab 2: Create Purchase
  async function handleCreatePurchase(e: FormEvent) {
    e.preventDefault();
    if (!createStoreId) {
      setMessage({ type: "error", text: "Please select a warehouse/branch." });
      return;
    }
    if (!createSupplierId) {
      setMessage({ type: "error", text: "Please select a supplier." });
      return;
    }
    if (createLines.length === 0) {
      setMessage({ type: "error", text: "Please add at least one line item to the purchase." });
      return;
    }

    try {
      setCreateSubmitting(true);
      setMessage(null);

      const payload = {
        store_id: createStoreId,
        supplier_id: createSupplierId,
        status: createStatus,
        date: createDate,
        order_tax_rate: Number(createOrderTaxRate) || 0,
        discount_paise: Math.round((Number(createDiscountRupees) || 0) * 100),
        shipping_paise: Math.round((Number(createShippingRupees) || 0) * 100),
        paid_paise: Math.round((Number(createPaidRupees) || 0) * 100),
        notes: createNotes || undefined,
        lines: createLines.map((l) => ({
          store_item_id: l.store_item_id,
          qty: Number(l.qty),
          cost_paise: Math.round((Number(l.cost_rupees) || 0) * 100),
          discount_paise: Math.round((Number(l.discount_rupees) || 0) * 100),
          tax_bps: Math.round((Number(l.tax_percent) || 0) * 100),
          batch_number: l.batch_number || undefined,
          expires_on: l.expires_on || undefined,
        })),
      };

      const res = await fetch("/api/v1/purchases", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to create purchase order.");
      }

      setMessage({
        type: "success",
        text: `Purchase order ${data.data?.number} created successfully! ${
          createStatus === "received" ? "Stock inventory updated immediately." : ""
        }`,
      });

      // Reset form
      setCreateLines([]);
      setCreateDiscountRupees("0");
      setCreateOrderTaxRate("0");
      setCreateShippingRupees("0");
      setCreatePaidRupees("0");
      setCreateNotes("");
      setActiveTab("all");

      // Reload
      await loadPurchasesList();
      if (createStoreId) {
        await loadCatalogItems(createStoreId);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message ?? "An error occurred while creating purchase." });
    } finally {
      setCreateSubmitting(false);
    }
  }

  // Quick Add Supplier
  async function handleQuickAddSupplier(e: FormEvent) {
    e.preventDefault();
    if (!quickSupplierModal.name.trim()) return;

    try {
      setQuickSupplierModal((prev) => ({ ...prev, submitting: true }));
      const res = await fetch("/api/v1/suppliers", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          name: quickSupplierModal.name.trim(),
          phone: quickSupplierModal.phone.trim() || undefined,
          email: quickSupplierModal.email.trim() || undefined,
          gstin: quickSupplierModal.gstin.trim() || undefined,
          address: quickSupplierModal.address.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to create supplier.");
      }

      const newSupplier = data.data;
      setSuppliers((prev) => [newSupplier, ...prev]);
      setCreateSupplierId(newSupplier.id);
      setImportSupplierId(newSupplier.id);
      setQuickSupplierModal({
        open: false,
        name: "",
        phone: "",
        email: "",
        gstin: "",
        address: "",
        submitting: false,
      });
      setMessage({ type: "success", text: `Supplier ${newSupplier.name} added successfully!` });
    } catch (err: any) {
      alert(err.message ?? "Failed to add supplier.");
      setQuickSupplierModal((prev) => ({ ...prev, submitting: false }));
    }
  }

  // View PO Details
  async function openPoDetails(po: PurchaseOrder) {
    setViewPoModal({ open: true, po, lines: [], loading: true });
    try {
      const res = await fetch(`/api/v1/purchases/${po.id}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setViewPoModal({
          open: true,
          po: data.data?.purchase ?? po,
          lines: data.data?.lines ?? [],
          loading: false,
        });
      } else {
        setViewPoModal((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setViewPoModal((prev) => ({ ...prev, loading: false }));
    }
  }

  // Record Payment
  async function handleRecordPayment(e: FormEvent) {
    e.preventDefault();
    if (!paymentModal.po) return;
    const amountRupees = Number(paymentModal.amountRupees);
    if (!amountRupees || amountRupees <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    try {
      setPaymentModal((prev) => ({ ...prev, submitting: true }));
      const res = await fetch(`/api/v1/purchases/${paymentModal.po.id}/payment`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          amount_paise: Math.round(amountRupees * 100),
          payment_method: paymentModal.method,
          note: paymentModal.note || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Payment failed.");
      }

      setMessage({ type: "success", text: `Payment of ₹${amountRupees.toFixed(2)} recorded successfully!` });
      setPaymentModal({
        open: false,
        po: null,
        amountRupees: "",
        method: "cash",
        note: "",
        submitting: false,
      });
      await loadPurchasesList();
    } catch (err: any) {
      alert(err.message ?? "Failed to record payment.");
      setPaymentModal((prev) => ({ ...prev, submitting: false }));
    }
  }

  // Delete PO
  async function handleDeletePo(po: PurchaseOrder) {
    if (!confirm(`Are you sure you want to delete purchase order ${po.number}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/purchases/${po.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message ?? "Failed to delete purchase order.");
      }

      setMessage({ type: "success", text: `Purchase order ${po.number} deleted successfully.` });
      await loadPurchasesList();
      if (selectedStoreId) {
        await loadCatalogItems(selectedStoreId);
      }
    } catch (err: any) {
      alert(err.message ?? "Could not delete purchase order.");
    }
  }

  // Tab 3: CSV Import handling
  function handleDownloadSampleCsv() {
    const csvContent =
      "product_identifier,cost,qty,discount,tax_bps,batch_number,expires_on\n" +
      "ITEM-001,45.50,10,0,500,LOT-2026-A,2027-12-31\n" +
      "ITEM-002,120.00,5,10,1800,LOT-2026-B,2028-06-30\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "sample_purchases_import.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCsvFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        alert("The CSV file must contain a header row and at least one data row.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const parsed = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length === 0 || !cols[0]) continue;

        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] ?? "";
        });

        parsed.push({
          product_identifier: rowObj["product_identifier"] || cols[0],
          cost_paise: Math.round((Number(rowObj["cost"] || cols[1]) || 0) * 100),
          qty: Number(rowObj["qty"] || cols[2]) || 1,
          discount_paise: Math.round((Number(rowObj["discount"] || cols[3]) || 0) * 100),
          tax_bps: Number(rowObj["tax_bps"] || cols[4]) || 0,
          batch_number: rowObj["batch_number"] || cols[5] || undefined,
          expires_on: rowObj["expires_on"] || cols[6] || undefined,
        });
      }

      setImportParsedRows(parsed);
    };
    reader.readAsText(file);
  }

  async function handleImportSubmit(e: FormEvent) {
    e.preventDefault();
    if (!importStoreId) {
      alert("Please select a store/warehouse.");
      return;
    }
    if (!importSupplierId) {
      alert("Please select a supplier.");
      return;
    }
    if (importParsedRows.length === 0) {
      alert("Please select a valid CSV file with line items.");
      return;
    }

    try {
      setImportSubmitting(true);
      const res = await fetch("/api/v1/purchases/import", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          store_id: importStoreId,
          supplier_id: importSupplierId,
          status: importStatus,
          notes: importNotes || undefined,
          rows: importParsedRows,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "CSV Import failed.");
      }

      setMessage({
        type: "success",
        text: `Successfully imported ${importParsedRows.length} purchase items as ${data.data?.number}!`,
      });
      setImportParsedRows([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveTab("all");
      await loadPurchasesList();
      if (importStoreId) {
        await loadCatalogItems(importStoreId);
      }
    } catch (err: any) {
      alert(err.message ?? "CSV import failed.");
    } finally {
      setImportSubmitting(false);
    }
  }

  // Export Table to CSV
  function exportPurchasesToCsv() {
    if (purchases.length === 0) {
      alert("No purchases to export.");
      return;
    }

    const header = [
      "PO Number",
      "Supplier",
      "Warehouse",
      "Status",
      "Total (INR)",
      "Paid (INR)",
      "Due (INR)",
      "Payment Status",
      "Date",
    ];

    const rows = purchases.map((po) => [
      po.number,
      `"${po.supplier_name.replace(/"/g, '""')}"`,
      `"${po.store_name.replace(/"/g, '""')}"`,
      po.status.toUpperCase(),
      (po.total_paise / 100).toFixed(2),
      (po.paid_paise / 100).toFixed(2),
      (po.due_paise / 100).toFixed(2),
      po.payment_status.toUpperCase(),
      po.created_at.slice(0, 10),
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `purchases_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Purchases &amp; Inventory Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage purchase orders (PO), record goods receipt (GRN), track supplier dues, and import bulk stock.
          </p>
        </div>
        {/* Navigation Tab Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            All Purchases
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "create"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Purchase
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "import"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Import Purchases
          </button>
        </div>
      </div>

      {/* Global alert feedback */}
      {message && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ALL PURCHASES VIEW (Image 2) */}
      {/* ========================================================================= */}
      {activeTab === "all" && (
        <div className="space-y-6">
          {/* 4 Summary KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Purchases Count */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Purchases Count
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-slate-900">{kpis.total_count}</span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  Total Orders
                </span>
              </div>
            </div>

            {/* Card 2: Total Amount */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Purchase ₹
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {formatInr(kpis.total_amount_paise)}
                </span>
                <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  Net Spend
                </span>
              </div>
            </div>

            {/* Card 3: Paid Amount */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Paid ₹
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-emerald-600">
                  {formatInr(kpis.total_paid_paise)}
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Settled
                </span>
              </div>
            </div>

            {/* Card 4: Due Amount */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Due ₹
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-2xl font-bold text-amber-600">
                  {formatInr(kpis.total_due_paise)}
                </span>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Outstanding
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Filters &amp; Search
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {/* Warehouse */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Warehouse</label>
                <select
                  value={filterStore}
                  onChange={(e) => setFilterStore(e.target.value)}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                >
                  <option value="all">All Warehouses</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Supplier</label>
                <select
                  value={filterSupplier}
                  onChange={(e) => setFilterSupplier(e.target.value)}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Order Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                >
                  <option value="all">All Statuses</option>
                  <option value="received">Received</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                </select>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500">Payment Status</label>
                <select
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value)}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partial</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500">From Date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-900"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500">To Date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Action Row: Search & Export & Add */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search by PO number, supplier name..."
                className="h-9 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportPurchasesToCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                EXCEL
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                PDF
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                + Create Purchase
              </button>
            </div>
          </div>

          {/* Purchases Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Grand Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Due</th>
                    <th className="px-4 py-3">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-500">
                        No purchase orders found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    purchases.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/75 transition-colors">
                        {/* Action buttons */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void openPoDetails(po)}
                              title="View Details"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {po.due_paise > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPaymentModal({
                                    open: true,
                                    po,
                                    amountRupees: (po.due_paise / 100).toFixed(2),
                                    method: "cash",
                                    note: "",
                                    submitting: false,
                                  })
                                }
                                title="Record Payment"
                                className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                              >
                                <Wallet className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void handleDeletePo(po)}
                              title="Delete Purchase"
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Reference / PO number */}
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void openPoDetails(po)}
                            className="font-mono font-bold text-indigo-600 hover:underline"
                          >
                            {po.number}
                          </button>
                          <div className="text-[10px] text-slate-400">
                            {po.created_at ? po.created_at.slice(0, 10) : ""}
                          </div>
                        </td>

                        {/* Supplier */}
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {po.supplier_name}
                          {po.supplier_phone && (
                            <div className="text-[10px] font-mono font-normal text-slate-400">
                              {po.supplier_phone}
                            </div>
                          )}
                        </td>

                        {/* Warehouse */}
                        <td className="px-4 py-3 text-slate-600">{po.store_name}</td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              po.status === "received"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : po.status === "pending"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                po.status === "received"
                                  ? "bg-emerald-500"
                                  : po.status === "pending"
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              }`}
                            />
                            {po.status ? po.status.toUpperCase() : "RECEIVED"}
                          </span>
                        </td>

                        {/* Grand Total */}
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                          {formatInr(po.total_paise)}
                        </td>

                        {/* Paid */}
                        <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                          {formatInr(po.paid_paise)}
                        </td>

                        {/* Due */}
                        <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600">
                          {formatInr(po.due_paise)}
                        </td>

                        {/* Payment Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              po.payment_status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : po.payment_status === "partial"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {po.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CREATE PURCHASE VIEW (Image 1) */}
      {/* ========================================================================= */}
      {activeTab === "create" && (
        <form onSubmit={handleCreatePurchase} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Create Purchase</h2>
              <p className="text-xs text-slate-500">
                Please fill in the information below. Field labels marked with * are required.
              </p>
            </div>

            {/* Top Row Inputs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Date *</label>
                <input
                  type="date"
                  required
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Supplier with + Quick Add */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Supplier *</label>
                  <button
                    type="button"
                    onClick={() => setQuickSupplierModal((prev) => ({ ...prev, open: true }))}
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add Supplier
                  </button>
                </div>
                <div className="relative mt-1">
                  <select
                    required
                    value={createSupplierId}
                    onChange={(e) => setCreateSupplierId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.phone ? `(${s.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Warehouse *</label>
                <select
                  required
                  value={createStoreId}
                  onChange={(e) => setCreateStoreId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="">Select Warehouse / Store</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Status *</label>
                <select
                  required
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value as any)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="received">Received (Increments Stock Now)</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                </select>
              </div>
            </div>

            {/* Product Scan / Search bar */}
            <div className="relative mt-6">
              <label className="block text-xs font-semibold text-slate-700">
                Scan / Search Product by Code Or Name
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onFocus={() => setSearchDropdownOpen(true)}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSearchDropdownOpen(true);
                  }}
                  placeholder="Scan barcode or type SKU / item name to add to purchase..."
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Autocomplete dropdown */}
              {searchDropdownOpen && filteredCatalogItems.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg max-h-60 overflow-y-auto">
                  {filteredCatalogItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addProductToCreateLines(item)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="font-mono text-[11px] text-slate-400">SKU: {item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold text-slate-900">
                          ₹{((item.cost_paise ?? 0) / 100).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          In Stock: {item.on_hand ?? 0}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5 w-10">#</th>
                      <th className="px-3 py-2.5">Product (Name &amp; SKU)</th>
                      <th className="px-3 py-2.5 w-28">Net Unit Cost (₹)</th>
                      <th className="px-3 py-2.5 w-24">Current Stock</th>
                      <th className="px-3 py-2.5 w-24">Qty</th>
                      <th className="px-3 py-2.5 w-24">Discount (₹)</th>
                      <th className="px-3 py-2.5 w-20">Tax (%)</th>
                      <th className="px-3 py-2.5 w-28 text-right">Subtotal (₹)</th>
                      <th className="px-3 py-2.5 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {createLines.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                          No items added yet. Search or scan products above to add them to this purchase.
                        </td>
                      </tr>
                    ) : (
                      createLines.map((line, idx) => (
                        <tr key={line.store_item_id} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900">{line.name}</div>
                            <div className="font-mono text-[10px] text-slate-400">{line.sku}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.cost_rupees}
                              onChange={(e) => updateLineItem(idx, "cost_rupees", e.target.value)}
                              className="h-8 w-full rounded border border-slate-200 px-2 font-mono text-xs text-slate-900"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px]">
                              {line.current_stock}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              value={line.qty}
                              onChange={(e) => updateLineItem(idx, "qty", e.target.value)}
                              className="h-8 w-full rounded border border-slate-200 px-2 font-mono text-xs text-slate-900 font-bold"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.discount_rupees}
                              onChange={(e) =>
                                updateLineItem(idx, "discount_rupees", e.target.value)
                              }
                              className="h-8 w-full rounded border border-slate-200 px-2 font-mono text-xs text-slate-900"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={line.tax_percent}
                              onChange={(e) => updateLineItem(idx, "tax_percent", e.target.value)}
                              className="h-8 w-full rounded border border-slate-200 px-2 font-mono text-xs text-slate-900"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            ₹{line.subtotal_rupees.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              className="rounded p-1 text-rose-500 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Controls & Summary Breakdown */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Left Column: Order tax, discount, shipping, notes */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Order Tax (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={createOrderTaxRate}
                      onChange={(e) => setCreateOrderTaxRate(e.target.value)}
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 font-mono text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Discount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={createDiscountRupees}
                      onChange={(e) => setCreateDiscountRupees(e.target.value)}
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 font-mono text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Shipping (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={createShippingRupees}
                      onChange={(e) => setCreateShippingRupees(e.target.value)}
                      className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 font-mono text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Paid Now (₹ optional initial settlement)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={grandTotalRupees}
                    value={createPaidRupees}
                    onChange={(e) => setCreatePaidRupees(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2 font-mono text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Note</label>
                  <textarea
                    rows={3}
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="Delivery notes, PO remarks, vehicle number..."
                    className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Right Column: Grand Total Card */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal:</span>
                    <span className="font-mono font-semibold">₹{linesTotalRupees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Order Tax ({createOrderTaxRate}%):</span>
                    <span className="font-mono font-semibold">
                      ₹
                      {(
                        Math.max(0, linesTotalRupees - Number(createDiscountRupees || 0)) *
                        (Number(createOrderTaxRate || 0) / 100)
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Order Discount:</span>
                    <span className="font-mono font-semibold text-rose-600">
                      -₹{(Number(createDiscountRupees) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping Charges:</span>
                    <span className="font-mono font-semibold">
                      +₹{(Number(createShippingRupees) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Grand Total:</span>
                    <span className="font-mono text-2xl font-bold text-indigo-700">
                      ₹{grandTotalRupees.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {createSubmitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Submit Purchase
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: IMPORT PURCHASES VIEW (Image 3) */}
      {/* ========================================================================= */}
      {activeTab === "import" && (
        <form onSubmit={handleImportSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">Import Purchase</h2>
              <p className="text-xs text-slate-500">
                The first line of the CSV file must remain the header. Do not change column order. Please
                make sure the CSV file is UTF-8 encoded.
              </p>
            </div>

            {/* Warehouse, Supplier & Status */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Warehouse *</label>
                <select
                  required
                  value={importStoreId}
                  onChange={(e) => setImportStoreId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                >
                  <option value="">Select Warehouse / Branch</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Supplier *</label>
                <select
                  required
                  value={importSupplierId}
                  onChange={(e) => setImportSupplierId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Status *</label>
                <select
                  required
                  value={importStatus}
                  onChange={(e) => setImportStatus(e.target.value as any)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                >
                  <option value="received">Received (Increments Stock Immediately)</option>
                  <option value="pending">Pending</option>
                  <option value="ordered">Ordered</option>
                </select>
              </div>
            </div>

            {/* Drag & drop upload area */}
            <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
              <div className="mt-3 text-xs font-semibold text-slate-800">
                Choose CSV file or drag and drop it here
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Supports standard comma-separated values (.csv)
              </p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  className="hidden"
                  id="csv-file-input"
                />
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Browse File
                </label>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample Template
                </button>
              </div>
            </div>

            {/* Parsed Preview Table */}
            {importParsedRows.length > 0 && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Previewing {importParsedRows.length} Rows from CSV:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImportParsedRows([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Clear File
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Item Code / SKU</th>
                        <th className="px-3 py-2">Cost (₹)</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Discount (₹)</th>
                        <th className="px-3 py-2">Tax Bps</th>
                        <th className="px-3 py-2">Batch</th>
                        <th className="px-3 py-2">Expires</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {importParsedRows.slice(0, 15).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-semibold text-slate-900">
                            {row.product_identifier}
                          </td>
                          <td className="px-3 py-1.5">₹{(row.cost_paise / 100).toFixed(2)}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">{row.qty}</td>
                          <td className="px-3 py-1.5">₹{(row.discount_paise / 100).toFixed(2)}</td>
                          <td className="px-3 py-1.5">{row.tax_bps}</td>
                          <td className="px-3 py-1.5 text-slate-400">{row.batch_number ?? "—"}</td>
                          <td className="px-3 py-1.5 text-slate-400">{row.expires_on ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {importParsedRows.length > 15 && (
                  <div className="mt-1 text-[11px] text-slate-400 text-right">
                    ...and {importParsedRows.length - 15} more rows
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700">Import Notes</label>
              <textarea
                rows={2}
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder="Bulk stock invoice number, supplier consignment..."
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900"
              />
            </div>

            {/* Submit */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importSubmitting || importParsedRows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {importSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                Import Purchases
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW PURCHASE DETAIL */}
      {/* ========================================================================= */}
      {viewPoModal.open && viewPoModal.po && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Purchase Order #{viewPoModal.po.number}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      viewPoModal.po.status === "received"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {viewPoModal.po.status}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Created on {viewPoModal.po.created_at?.slice(0, 10)} · Warehouse:{" "}
                  {viewPoModal.po.store_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewPoModal({ open: false, po: null, lines: [], loading: false })}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Supplier Details Card */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs">
              <div className="font-bold text-slate-900">Supplier: {viewPoModal.po.supplier_name}</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-slate-600">
                <div>Phone: {viewPoModal.po.supplier_phone || "—"}</div>
                <div>GSTIN: {viewPoModal.po.supplier_gstin || "—"}</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Cost (₹)</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewPoModal.lines.map((l: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{l.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{l.sku}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        ₹{(l.cost_paise / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{l.qty}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-500">
                        ₹{((l.discount_paise ?? 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                        ₹{(l.subtotal_paise / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Grand Total:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatInr(viewPoModal.po.total_paise)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Total Paid:</span>
                <span className="font-mono font-bold">{formatInr(viewPoModal.po.paid_paise)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Total Due:</span>
                <span className="font-mono font-bold">{formatInr(viewPoModal.po.due_paise)}</span>
              </div>
              {viewPoModal.po.notes && (
                <div className="pt-2 border-t border-slate-200 text-slate-500 italic">
                  Note: {viewPoModal.po.notes}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewPoModal({ open: false, po: null, lines: [], loading: false })}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD PAYMENT */}
      {/* ========================================================================= */}
      {paymentModal.open && paymentModal.po && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleRecordPayment}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Record Payment - {paymentModal.po.number}
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModal((prev) => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
                <div className="text-amber-800">
                  Current Due:{" "}
                  <strong className="font-mono text-sm">
                    {formatInr(paymentModal.po.due_paise)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={paymentModal.po.due_paise / 100}
                  value={paymentModal.amountRupees}
                  onChange={(e) =>
                    setPaymentModal((prev) => ({ ...prev, amountRupees: e.target.value }))
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Payment Method</label>
                <select
                  value={paymentModal.method}
                  onChange={(e) => setPaymentModal((prev) => ({ ...prev, method: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Note / Reference</label>
                <input
                  type="text"
                  value={paymentModal.note}
                  onChange={(e) => setPaymentModal((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="e.g. UTR-982138 or Cash Receipt #12"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentModal((prev) => ({ ...prev, open: false }))}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentModal.submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {paymentModal.submitting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Save Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK ADD SUPPLIER */}
      {/* ========================================================================= */}
      {quickSupplierModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleQuickAddSupplier}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add New Supplier</h3>
              <button
                type="button"
                onClick={() => setQuickSupplierModal((prev) => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={quickSupplierModal.name}
                  onChange={(e) =>
                    setQuickSupplierModal((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Metro Wholesale Distributors"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={quickSupplierModal.phone}
                  onChange={(e) =>
                    setQuickSupplierModal((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+91 98765 43210"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={quickSupplierModal.email}
                  onChange={(e) =>
                    setQuickSupplierModal((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="orders@supplier.com"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">GSTIN</label>
                <input
                  type="text"
                  value={quickSupplierModal.gstin}
                  onChange={(e) =>
                    setQuickSupplierModal((prev) => ({ ...prev, gstin: e.target.value }))
                  }
                  placeholder="29ABCDE1234F1Z5"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Address</label>
                <textarea
                  rows={2}
                  value={quickSupplierModal.address}
                  onChange={(e) =>
                    setQuickSupplierModal((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Street, City, State, PIN"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickSupplierModal((prev) => ({ ...prev, open: false }))}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={quickSupplierModal.submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {quickSupplierModal.submitting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Create Supplier
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
