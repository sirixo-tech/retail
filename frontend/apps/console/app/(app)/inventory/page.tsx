"use client";

import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
  Trash2,
  Truck,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatInr } from "@selfx/types";

export type Item = {
  id: string;
  sku: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  unit?: string | null;
  unit_short?: string | null;
  on_hand: string;
  reorder_point: string;
  selling_price_paise?: number | null;
  cost_paise?: number | null;
  mrp_paise?: number | null;
  status?: string | null;
  image?: string | null;
  details?: Record<string, any>;
};

export type Alert = {
  id: string;
  sku: string;
  name_override: string | null;
  on_hand: string;
};

export type ExpiryBatch = {
  id: string;
  batch_code: string | null;
  expires_at: string;
  qty_remaining: string;
  sku: string;
  name_override: string | null;
};

export type TransferLine = {
  id: string;
  store_item_id: string;
  item_name: string;
  sku: string;
  dispatched_qty: number;
  received_qty?: number | null;
  variance_qty: number;
};

export type StockTransfer = {
  id: string;
  transfer_number: string;
  from_store_id: string;
  from_store_name: string;
  to_store_id: string;
  to_store_name: string;
  is_incoming: boolean;
  status: "in_transit" | "received" | "draft";
  dispatched_at: string;
  received_at?: string | null;
  variance_notes?: string | null;
  lines: TransferLine[];
  created_at: string;
};

export type AutoPoProposal = {
  store_id: string;
  store_name: string;
  supplier: { id: string; name: string } | null;
  items_count: number;
  total_estimated_paise: number;
  lines: {
    store_item_id: string;
    name: string;
    sku: string;
    on_hand: number;
    reorder_point: number;
    suggested_qty: number;
    estimated_cost_paise: number;
    line_total_paise: number;
  }[];
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

export default function InventoryPage() {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("Current Store");
  const [stores, setStores] = useState<{ id: string; name: string; code: string }[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expiring, setExpiring] = useState<ExpiryBatch[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");

  // Tab & Filters
  const [activeTab, setActiveTab] = useState<"stock" | "transfers" | "audit" | "expiry" | "replenish">("stock");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockHealthFilter, setStockHealthFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [sortBy, setSortBy] = useState<"sku" | "name" | "stock_desc" | "stock_asc" | "valuation_desc">("name");

  // Inline inputs
  const [reorderInputs, setReorderInputs] = useState<Record<string, string>>({});
  const [countedInputs, setCountedInputs] = useState<Record<string, string>>({});
  const [isPostingReorder, setIsPostingReorder] = useState<Record<string, boolean>>({});

  // Quick Stock Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustMode, setAdjustMode] = useState<"add" | "reduce">("add");
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustReason, setAdjustReason] = useState("correction");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Inter-Branch Stock Transfers State
  const [newTransferModal, setNewTransferModal] = useState(false);
  const [transferTargetStore, setTransferTargetStore] = useState("");
  const [transferItem, setTransferItem] = useState("");
  const [transferQty, setTransferQty] = useState("1");
  const [receiveTransferModal, setReceiveTransferModal] = useState<StockTransfer | null>(null);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({});
  const [varianceNotes, setVarianceNotes] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferFilter, setTransferFilter] = useState<"all" | "incoming" | "outgoing" | "in_transit" | "received">("all");

  // Automated PO State
  const [autoPoProposal, setAutoPoProposal] = useState<AutoPoProposal | null>(null);
  const [autoPoModalOpen, setAutoPoModalOpen] = useState(false);
  const [isLoadingAutoPo, setIsLoadingAutoPo] = useState(false);
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);

  // Single Item PO Modal
  const [singlePoItem, setSinglePoItem] = useState<Item | null>(null);
  const [singlePoQty, setSinglePoQty] = useState("10");
  const [singlePoCostRupees, setSinglePoCostRupees] = useState("");
  const [singlePoSupplier, setSinglePoSupplier] = useState("Primary Vendor");

  async function load(targetStoreId?: string) {
    try {
      setIsLoading(true);
      const me = await fetch("/api/v1/auth/staff/me", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!me.ok) {
        window.location.href = "/login";
        return;
      }
      const staffData = ((await me.json()) as { data?: { store?: { id: string; name: string } } }).data;
      const id = targetStoreId || staffData?.store?.id;
      if (!id) return;
      setStoreId(id);
      if (staffData?.store?.name) setStoreName(staffData.store.name);

      const [stockRes, lowRes, expRes, trRes, storesRes] = await Promise.all([
        fetch(`/api/v1/stores/${id}/items`, { credentials: "include", headers: { Accept: "application/json" } }),
        fetch(`/api/v1/stores/${id}/stock/alerts`, { credentials: "include", headers: { Accept: "application/json" } }),
        fetch(`/api/v1/stores/${id}/stock/expiry`, { credentials: "include", headers: { Accept: "application/json" } }),
        fetch(`/api/v1/stores/${id}/transfers`, { credentials: "include", headers: { Accept: "application/json" } }),
        fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } }),
      ]);

      if (stockRes.ok) {
        const d = ((await stockRes.json()) as { data: Item[] }).data;
        const loadedItems = Array.isArray(d) ? d : [];
        setItems(loadedItems);
        // Pre-fill reorder points
        const initialReorders: Record<string, string> = {};
        for (const item of loadedItems) {
          initialReorders[item.id] = String(item.reorder_point || 0);
        }
        setReorderInputs(initialReorders);
      }
      if (lowRes.ok) {
        const d = ((await lowRes.json()) as { data: Alert[] }).data;
        setAlerts(Array.isArray(d) ? d : []);
      }
      if (expRes.ok) {
        const d = ((await expRes.json()) as { data: ExpiryBatch[] }).data;
        setExpiring(Array.isArray(d) ? d : []);
      }
      if (trRes.ok) {
        const d = ((await trRes.json()) as { data: StockTransfer[] }).data;
        setTransfers(Array.isArray(d) ? d : []);
      }
      if (storesRes.ok) {
        const storesJson = (await storesRes.json()) as {
          data?: { stores?: { id: string; name: string; code: string }[] } | { id: string; name: string; code: string }[];
        };
        const rawStores = Array.isArray(storesJson?.data)
          ? storesJson.data
          : (storesJson?.data?.stores ?? []);
        setStores(Array.isArray(rawStores) ? rawStores : []);
      }
    } catch {
      showToast("Failed to load inventory data.", "error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function showToast(msg: string, tone: "ok" | "error" = "ok") {
    setMessage(msg);
    setMessageTone(tone);
    setTimeout(() => {
      setMessage((cur) => (cur === msg ? null : cur));
    }, 4500);
  }

  // Switch Branch
  async function switchStore(newStoreId: string) {
    if (newStoreId === storeId) return;
    try {
      const res = await fetch("/api/v1/auth/switch-store", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({ store_id: newStoreId }),
      });
      if (res.ok) {
        await load(newStoreId);
        showToast("Switched active branch location.", "ok");
      }
    } catch {
      showToast("Could not switch store branch.", "error");
    }
  }

  // Stock Adjustment
  async function handlePostAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || !adjustItem) return;
    setIsSubmittingAdjust(true);
    try {
      const rawQty = Math.abs(Number(adjustQty)) || 1;
      const delta = adjustMode === "add" ? rawQty : -rawQty;
      const reasonFull = adjustNotes.trim() ? `${adjustReason}: ${adjustNotes.trim()}` : adjustReason;

      const res = await fetch(`/api/v1/stores/${storeId}/adjustments`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          store_item_id: adjustItem.id,
          qty_delta: delta,
          reason: reasonFull,
        }),
      });

      if (res.ok) {
        showToast(`Stock adjusted by ${delta > 0 ? `+${delta}` : delta} for ${adjustItem.name}.`, "ok");
        setAdjustItem(null);
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        showToast(body.error?.message ?? "Stock adjustment failed.", "error");
      }
    } finally {
      setIsSubmittingAdjust(false);
    }
  }

  // Save Reorder Threshold
  async function handleSaveReorder(itemId: string) {
    if (!storeId) return;
    setIsPostingReorder((cur) => ({ ...cur, [itemId]: true }));
    try {
      const res = await fetch(`/api/v1/stores/${storeId}/items/${itemId}/reorder`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({ reorder_point: Number(reorderInputs[itemId] || 0) }),
      });
      if (res.ok) {
        showToast("Reorder point updated.", "ok");
        await load();
      } else {
        showToast("Failed to save reorder point.", "error");
      }
    } finally {
      setIsPostingReorder((cur) => ({ ...cur, [itemId]: false }));
    }
  }

  // Post Physical Count (Single Line)
  async function handlePostCount(itemId: string) {
    if (!storeId) return;
    const qty = countedInputs[itemId];
    if (qty === undefined || qty.trim() === "") {
      showToast("Please enter a counted quantity.", "error");
      return;
    }
    try {
      const res = await fetch(`/api/v1/stores/${storeId}/counts`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          lines: [{ store_item_id: itemId, counted_qty: Number(qty) }],
        }),
      });
      if (res.ok) {
        showToast("Physical count posted and variance reconciled.", "ok");
        setCountedInputs((cur) => {
          const next = { ...cur };
          delete next[itemId];
          return next;
        });
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        showToast(body.error?.message ?? "Count was not posted.", "error");
      }
    } catch {
      showToast("Could not post physical stock count.", "error");
    }
  }

  // Bulk Reconcile All Filled Counts
  async function handleReconcileAllCounts() {
    if (!storeId) return;
    const filledEntries = Object.entries(countedInputs).filter(
      ([, val]) => val !== undefined && val.trim() !== "" && !isNaN(Number(val)),
    );
    if (filledEntries.length === 0) {
      showToast("No physical counts entered to reconcile.", "error");
      return;
    }

    try {
      const lines = filledEntries.map(([itemId, val]) => ({
        store_item_id: itemId,
        counted_qty: Number(val),
      }));

      const res = await fetch(`/api/v1/stores/${storeId}/counts`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({ lines }),
      });

      if (res.ok) {
        showToast(`Reconciled ${lines.length} inventory items against physical count.`, "ok");
        setCountedInputs({});
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        showToast(body.error?.message ?? "Batch cycle count failed.", "error");
      }
    } catch {
      showToast("Could not submit bulk audit count.", "error");
    }
  }

  // Inter-Branch Transfer: Dispatch
  async function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || !transferTargetStore || !transferItem) return;
    setIsSubmittingTransfer(true);
    try {
      const res = await fetch(`/api/v1/stores/${storeId}/transfers`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          to_store_id: transferTargetStore,
          store_item_id: transferItem,
          qty: Number(transferQty),
        }),
      });

      if (res.ok) {
        showToast("Stock transfer dispatched. Consignment is IN TRANSIT.", "ok");
        setNewTransferModal(false);
        setTransferItem("");
        setTransferQty("1");
        setTransferTargetStore("");
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        showToast(body.error?.message ?? "Could not initiate transfer.", "error");
      }
    } finally {
      setIsSubmittingTransfer(false);
    }
  }

  // Inter-Branch Transfer: Receive & Acknowledge
  function openReceiveModal(transfer: StockTransfer) {
    setReceiveTransferModal(transfer);
    const initial: Record<string, string> = {};
    for (const l of transfer.lines) {
      initial[l.id] = String(l.dispatched_qty);
    }
    setReceivedQtys(initial);
    setVarianceNotes(transfer.variance_notes ?? "");
  }

  async function handleReceiveTransfer() {
    if (!storeId || !receiveTransferModal) return;
    setIsSubmittingTransfer(true);
    try {
      const linesPayload = receiveTransferModal.lines.map((l) => ({
        line_id: l.id,
        received_qty: Number(receivedQtys[l.id] ?? l.dispatched_qty),
      }));

      const res = await fetch(
        `/api/v1/stores/${storeId}/transfers/${receiveTransferModal.id}/receive`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": getCsrfToken(),
          },
          body: JSON.stringify({
            lines: linesPayload,
            variance_notes: varianceNotes.trim() ? varianceNotes.trim() : null,
          }),
        },
      );

      if (res.ok) {
        showToast("Consignment acknowledged and received. Stock balances updated.", "ok");
        setReceiveTransferModal(null);
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        showToast(body.error?.message ?? "Could not receive transfer.", "error");
      }
    } finally {
      setIsSubmittingTransfer(false);
    }
  }

  // Batch Expiry: Write-off
  async function markBatchExpired(batchId: string) {
    try {
      const res = await fetch(`/api/v1/inventory/batches/${batchId}/mark-expired`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
      });
      if (res.ok) {
        showToast("Expired batch written off from inventory.", "ok");
        await load();
      } else {
        showToast("Failed to write off batch.", "error");
      }
    } catch {
      showToast("Error processing batch write-off.", "error");
    }
  }

  // Auto-PO Generator
  async function openAutoPo() {
    if (!storeId) return;
    setIsLoadingAutoPo(true);
    try {
      const res = await fetch(`/api/v1/stores/${storeId}/purchases/auto-po`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = ((await res.json()) as { data: AutoPoProposal }).data;
        setAutoPoProposal(data);
        setAutoPoModalOpen(true);
      } else {
        showToast("Could not calculate automatic replenishment PO.", "error");
      }
    } finally {
      setIsLoadingAutoPo(false);
    }
  }

  async function confirmAutoPo() {
    if (!storeId || !autoPoProposal || autoPoProposal.lines.length === 0) return;
    setIsSubmittingPo(true);
    try {
      const res = await fetch(`/api/v1/stores/${storeId}/purchases`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          supplier_name: autoPoProposal.supplier?.name || "Auto-Replenish Vendor",
          lines: autoPoProposal.lines.map((l) => ({
            store_item_id: l.store_item_id,
            qty: l.suggested_qty,
            cost_paise: l.estimated_cost_paise,
          })),
        }),
      });

      if (res.ok) {
        showToast(`Purchase Order created for ${autoPoProposal.lines.length} replenishment items.`, "ok");
        setAutoPoModalOpen(false);
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        showToast(body.error?.message ?? "Failed to create purchase order.", "error");
      }
    } finally {
      setIsSubmittingPo(false);
    }
  }

  // Single Item PO
  function openSinglePoModal(item: Item) {
    setSinglePoItem(item);
    const deficit = Math.max(1, (Number(item.reorder_point || 0) * 2) - Number(item.on_hand || 0));
    setSinglePoQty(String(deficit > 0 ? deficit : 10));
    setSinglePoCostRupees(item.cost_paise ? (item.cost_paise / 100).toFixed(2) : "0.00");
    setSinglePoSupplier("Primary Vendor");
  }

  async function handleConfirmSinglePo(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId || !singlePoItem) return;
    setIsSubmittingPo(true);
    try {
      const costPaise = Math.round((parseFloat(singlePoCostRupees) || 0) * 100);
      const res = await fetch(`/api/v1/stores/${storeId}/purchases`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          supplier_name: singlePoSupplier.trim() || "Primary Vendor",
          lines: [
            {
              store_item_id: singlePoItem.id,
              qty: Number(singlePoQty) || 1,
              cost_paise: costPaise,
            },
          ],
        }),
      });

      if (res.ok) {
        showToast(`Purchase order generated for ${singlePoItem.name}.`, "ok");
        setSinglePoItem(null);
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        showToast(body.error?.message ?? "Could not create purchase order.", "error");
      }
    } finally {
      setIsSubmittingPo(false);
    }
  }

  // Export CSV
  function exportInventoryCsv() {
    if (!items.length) {
      showToast("No inventory items to export.", "error");
      return;
    }
    const headers = [
      "SKU",
      "Product Name",
      "Category",
      "Brand",
      "Unit",
      "On Hand Stock",
      "Reorder Point",
      "Cost Price (INR)",
      "Selling Price (INR)",
      "Total Valuation (INR)",
      "Stock Status",
    ];
    const rows = items.map((item) => {
      const onHand = Number(item.on_hand || 0);
      const reorderPt = Number(item.reorder_point || 0);
      const costPaise = item.cost_paise || 0;
      const sellPaise = item.selling_price_paise || 0;
      const valuation = (onHand * (costPaise || sellPaise)) / 100;
      const status = onHand <= 0 ? "Out of Stock" : onHand <= reorderPt ? "Low Stock" : "In Stock";

      return [
        `"${item.sku.replace(/"/g, '""')}"`,
        `"${(item.name || "").replace(/"/g, '""')}"`,
        `"${(item.category || "").replace(/"/g, '""')}"`,
        `"${(item.brand || "").replace(/"/g, '""')}"`,
        `"${(item.unit_short || item.unit || "pcs").replace(/"/g, '""')}"`,
        onHand,
        reorderPt,
        (costPaise / 100).toFixed(2),
        (sellPaise / 100).toFixed(2),
        valuation.toFixed(2),
        status,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `store-inventory-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Inventory master exported to CSV.", "ok");
  }

  // Computed Categories
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) {
      if (i.category) set.add(i.category);
    }
    return Array.from(set).sort();
  }, [items]);

  // Executive Metrics
  const totalUnits = useMemo(() => {
    return items.reduce((acc, i) => acc + (Number(i.on_hand) || 0), 0);
  }, [items]);

  const totalValuationPaise = useMemo(() => {
    return items.reduce((acc, i) => {
      const onHand = Number(i.on_hand) || 0;
      const unitVal = (i.cost_paise && i.cost_paise > 0) ? i.cost_paise : (i.selling_price_paise || 0);
      return acc + (onHand * unitVal);
    }, 0);
  }, [items]);

  const inStockCount = useMemo(() => {
    return items.filter((i) => Number(i.on_hand) > 0).length;
  }, [items]);

  const outOfStockCount = useMemo(() => {
    return items.filter((i) => Number(i.on_hand) <= 0).length;
  }, [items]);

  // Filtered & Sorted Stock Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Category filter
        if (selectedCategory !== "all" && item.category !== selectedCategory) return false;

        // Health filter
        const onHand = Number(item.on_hand || 0);
        const reorderPt = Number(item.reorder_point || 0);
        if (stockHealthFilter === "in_stock" && onHand <= reorderPt) return false;
        if (stockHealthFilter === "low_stock" && (onHand <= 0 || onHand > reorderPt)) return false;
        if (stockHealthFilter === "out_of_stock" && onHand > 0) return false;

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchName = item.name.toLowerCase().includes(q);
          const matchSku = item.sku.toLowerCase().includes(q);
          const matchBrand = (item.brand || "").toLowerCase().includes(q);
          const matchCategory = (item.category || "").toLowerCase().includes(q);
          return matchName || matchSku || matchBrand || matchCategory;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "sku") return a.sku.localeCompare(b.sku);
        if (sortBy === "stock_desc") return Number(b.on_hand) - Number(a.on_hand);
        if (sortBy === "stock_asc") return Number(a.on_hand) - Number(b.on_hand);
        if (sortBy === "valuation_desc") {
          const valA = Number(a.on_hand) * (a.cost_paise || a.selling_price_paise || 0);
          const valB = Number(b.on_hand) * (b.cost_paise || b.selling_price_paise || 0);
          return valB - valA;
        }
        return 0;
      });
  }, [items, selectedCategory, stockHealthFilter, search, sortBy]);

  // Filtered Transfers
  const filteredTransfers = useMemo(() => {
    return transfers.filter((tr) => {
      if (transferFilter === "incoming" && !tr.is_incoming) return false;
      if (transferFilter === "outgoing" && tr.is_incoming) return false;
      if (transferFilter === "in_transit" && tr.status !== "in_transit") return false;
      if (transferFilter === "received" && tr.status !== "received") return false;
      return true;
    });
  }, [transfers, transferFilter]);

  // Other Branches
  const otherBranches = useMemo(() => {
    return stores.filter((s) => s.id !== storeId);
  }, [stores, storeId]);

  return (
    <div className="space-y-6 pb-12">
      {/* =====================================================================
          EXECUTIVE HEADER & BRANCH SELECTION
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Inventory &amp; Stock Operations
            </h1>
            {/* Store Badge / Switcher */}
            <div className="relative inline-block">
              {stores.length > 1 ? (
                <select
                  value={storeId || ""}
                  onChange={(e) => void switchStore(e.target.value)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pr-6 pl-2.5 text-[11px] font-semibold text-slate-800 shadow-2xs hover:border-slate-300 focus:outline-none cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.name} ({s.code || "Branch"})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                  <Store size={12} className="text-slate-500" />
                  {storeName}
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Perpetual inventory ledger, multi-branch transit, physical stock audit, and automated replenishment.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportInventoryCsv}
            title="Download CSV report of current inventory"
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            <Download size={14} className="text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            <FileSpreadsheet size={14} className="text-indigo-600" />
            <span>Physical Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setNewTransferModal(true)}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          >
            <ArrowRightLeft size={14} className="text-blue-600" />
            <span>Branch Transfer</span>
          </button>

          <button
            type="button"
            onClick={() => void openAutoPo()}
            disabled={isLoadingAutoPo}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 text-xs font-semibold text-white shadow-2xs transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
          >
            <Zap size={14} />
            <span>{isLoadingAutoPo ? "Calculating..." : "Auto-PO Generator"}</span>
          </button>
        </div>
      </div>

      {/* Toast Notice */}
      {message ? (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
            messageTone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {messageTone === "ok" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{message}</span>
          </div>
          <button type="button" onClick={() => setMessage(null)} className="cursor-pointer">
            <X size={15} />
          </button>
        </div>
      ) : null}

      {/* =====================================================================
          5 EXECUTIVE KPI CARDS
         ===================================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Card 1: Total SKUs */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Items</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Boxes size={15} />
            </div>
          </div>
          <div className="num mt-2 text-2xl font-bold text-slate-900">{items.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">{inStockCount} active in stock</div>
        </div>

        {/* Card 2: Units On Hand */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stock</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Package size={15} />
            </div>
          </div>
          <div className="num mt-2 text-2xl font-bold text-slate-900">{totalUnits.toLocaleString()}</div>
          <div className="mt-1 text-[11px] text-slate-500">Units in shelves &amp; store</div>
        </div>

        {/* Card 3: Working Capital Valuation */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stock Valuation</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Wallet size={15} />
            </div>
          </div>
          <div className="num mt-2 text-2xl font-bold text-emerald-600">{formatInr(totalValuationPaise)}</div>
          <div className="mt-1 text-[11px] text-slate-500">Inventory working capital</div>
        </div>

        {/* Card 4: Low Stock Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Low Stock Alerts</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle size={15} />
            </div>
          </div>
          <div className="num mt-2 text-2xl font-bold text-amber-600">{alerts.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {outOfStockCount > 0 ? `${outOfStockCount} out of stock` : "Threshold breached"}
          </div>
        </div>

        {/* Card 5: Expiring Batches */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiring (30d)</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <Clock size={15} />
            </div>
          </div>
          <div className="num mt-2 text-2xl font-bold text-rose-600">{expiring.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Batches needing rotation</div>
        </div>
      </div>

      {/* Low Stock Replenishment Action Banner */}
      {alerts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle size={16} className="text-amber-600" />
              <span>Immediate Replenishment Recommended</span>
              <span className="rounded-full bg-amber-200/70 px-2 py-0.2 text-[10px] font-bold text-amber-800">
                {alerts.length} items breached
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {alerts.slice(0, 6).map((alert) => (
                <span
                  key={alert.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  <span>{alert.name_override || alert.sku}</span>
                  <span className="num font-bold text-amber-700">({alert.on_hand} left)</span>
                </span>
              ))}
              {alerts.length > 6 ? (
                <span className="self-center text-xs font-medium text-amber-800">
                  +{alerts.length - 6} more items
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void openAutoPo()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition cursor-pointer"
          >
            <Zap size={14} />
            <span>Generate Suggested PO</span>
          </button>
        </div>
      ) : null}

      {/* =====================================================================
          5-TAB NAVIGATION BAR
         ===================================================================== */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: "stock", label: "Live Stock Master", count: items.length, icon: Boxes },
            { id: "transfers", label: "Inter-Branch Transfers", count: transfers.length, icon: ArrowRightLeft },
            { id: "audit", label: "Physical Stock Audit", count: null, icon: FileSpreadsheet },
            { id: "expiry", label: "Batch & Expiry Control", count: expiring.length, icon: Clock },
            { id: "replenish", label: "Auto-Replenish Watch", count: alerts.length, icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-2 pb-3 px-3.5 text-xs font-bold transition border-b-2 cursor-pointer whitespace-nowrap ${
                  active
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon size={14} className={active ? "text-slate-900" : "text-slate-400"} />
                <span>{tab.label}</span>
                {tab.count !== null ? (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          TAB 1: LIVE STOCK MASTER GRID
         ===================================================================== */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Filter & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="relative min-w-[240px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stock by SKU, product name, or brand..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Select */}
              {categoriesList.length > 0 ? (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              ) : null}

              {/* Stock Health Pills */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                {[
                  { id: "all", label: `All (${items.length})` },
                  { id: "in_stock", label: `In Stock (${inStockCount})`, dot: "bg-emerald-500" },
                  { id: "low_stock", label: `Low (${alerts.length})`, dot: "bg-amber-500" },
                  { id: "out_of_stock", label: `OOS (${outOfStockCount})`, dot: "bg-rose-500" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStockHealthFilter(f.id as any)}
                    className={`inline-flex items-center gap-1.5 h-8 rounded-lg px-2.5 text-xs font-semibold transition cursor-pointer ${
                      stockHealthFilter === f.id
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {f.dot ? <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} /> : null}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none cursor-pointer"
              >
                <option value="name">Sort: Name (A-Z)</option>
                <option value="sku">Sort: SKU Code</option>
                <option value="stock_desc">Sort: Stock (High to Low)</option>
                <option value="stock_asc">Sort: Stock (Low to High)</option>
                <option value="valuation_desc">Sort: Valuation (High to Low)</option>
              </select>
            </div>
          </div>

          {/* Master Stock Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Product &amp; SKU</th>
                  <th className="px-4 py-3.5">Pricing &amp; Cost</th>
                  <th className="px-4 py-3.5">Stock Level</th>
                  <th className="px-4 py-3.5">Valuation</th>
                  <th className="px-4 py-3.5">Safety Reorder Pt</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const onHand = Number(item.on_hand || 0);
                  const reorderPt = Number(item.reorder_point || 0);
                  const isLow = onHand <= reorderPt && onHand > 0;
                  const isOos = onHand <= 0;
                  const valuation = (onHand * (item.cost_paise || item.selling_price_paise || 0)) / 100;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      {/* Product Name & SKU */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-500">{item.sku}</span>
                          {item.category ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                              {item.category}
                            </span>
                          ) : null}
                          {item.brand ? (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700 border border-indigo-100">
                              {item.brand}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Pricing */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.selling_price_paise ? formatInr(item.selling_price_paise) : "₹0.00"}
                          <span className="text-[10px] text-slate-400 ml-1">retail</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Cost: {item.cost_paise ? formatInr(item.cost_paise) : "₹0.00"} / {item.unit_short || item.unit || "unit"}
                        </div>
                      </td>

                      {/* Stock Level with Status Badge */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="num font-bold text-slate-900 text-[13px]">
                            {item.on_hand} {item.unit_short || item.unit || "units"}
                          </span>
                          {isOos ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.2 text-[10px] font-bold text-rose-700 border border-rose-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                              OOS
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              HEALTHY
                            </span>
                          )}
                        </div>
                        {/* Miniature Stock Level Bar */}
                        <div className="mt-1 h-1.5 w-28 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isOos ? "w-0" : isLow ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, (onHand / Math.max(1, reorderPt * 2)) * 100))}%` }}
                          />
                        </div>
                      </td>

                      {/* Valuation */}
                      <td className="px-4 py-3">
                        <div className="num font-bold text-slate-900">
                          ₹{valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400">Total line worth</div>
                      </td>

                      {/* Reorder Threshold */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={reorderInputs[item.id] ?? item.reorder_point}
                            onChange={(e) =>
                              setReorderInputs((cur) => ({ ...cur, [item.id]: e.target.value }))
                            }
                            className="num h-8 w-16 rounded-lg border border-slate-200 px-2 text-center text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveReorder(item.id)}
                            disabled={isPostingReorder[item.id]}
                            title="Save reorder threshold"
                            className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            <Check size={12} className={isPostingReorder[item.id] ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustMode("add");
                              setAdjustQty("1");
                              setAdjustReason("correction");
                              setAdjustNotes("");
                            }}
                            className="inline-flex items-center gap-1 h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <span>± Adjust</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openSinglePoModal(item)}
                            title="Create purchase replenishment order"
                            className="inline-flex items-center gap-1 h-8 rounded-lg bg-slate-900 px-2.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs transition cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>PO</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Boxes size={24} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">No inventory items found</p>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                        Try adjusting your search criteria, category selection, or stock health filters.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: INTER-BRANCH TRANSFERS
         ===================================================================== */}
      {activeTab === "transfers" && (
        <div className="space-y-4">
          {/* Header & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: `All Consignments (${transfers.length})` },
                { id: "in_transit", label: `In Transit (${transfers.filter((t) => t.status === "in_transit").length})` },
                { id: "incoming", label: `Incoming (${transfers.filter((t) => t.is_incoming).length})` },
                { id: "outgoing", label: `Outgoing (${transfers.filter((t) => !t.is_incoming).length})` },
                { id: "received", label: `Received (${transfers.filter((t) => t.status === "received").length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTransferFilter(f.id as any)}
                  className={`h-8 rounded-lg px-3 text-xs font-semibold transition cursor-pointer ${
                    transferFilter === f.id
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setNewTransferModal(true)}
              className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs transition cursor-pointer"
            >
              <ArrowRightLeft size={13} />
              <span>Dispatch New Transfer</span>
            </button>
          </div>

          {/* Transfers Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Consignment #</th>
                  <th className="px-5 py-3.5">Branch Route</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Items &amp; Quantities</th>
                  <th className="px-5 py-3.5">Receiving / Variance</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransfers.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50/70 transition">
                    {/* Consignment Number */}
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-slate-900">{tr.transfer_number}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(tr.dispatched_at).toLocaleDateString()} at{" "}
                        {new Date(tr.dispatched_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    {/* Route */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                        <span>{tr.from_store_name}</span>
                        <ArrowRightLeft size={12} className="text-slate-400" />
                        <span>{tr.to_store_name}</span>
                      </div>
                      <div className="mt-1">
                        {tr.is_incoming ? (
                          <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 border border-blue-200">
                            Incoming Consignment
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-700">
                            Outgoing Dispatch
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="px-5 py-3.5">
                      {tr.status === "in_transit" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          IN TRANSIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          RECEIVED
                        </span>
                      )}
                    </td>

                    {/* Items lines */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-1">
                        {tr.lines.map((l) => (
                          <div key={l.id} className="text-xs text-slate-700">
                            <span className="font-semibold text-slate-900">{l.item_name}</span>
                            <span className="ml-1.5 font-mono text-[10px] text-slate-400">({l.sku})</span>
                            <span className="ml-2 font-bold text-slate-800">{l.dispatched_qty} units</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Receipt & Variance */}
                    <td className="px-5 py-3.5">
                      {tr.status === "received" ? (
                        <div>
                          <div className="text-[11px] font-semibold text-emerald-700">
                            Received {tr.received_at ? new Date(tr.received_at).toLocaleDateString() : "Yes"}
                          </div>
                          {tr.lines.some((l) => Number(l.variance_qty) !== 0) ? (
                            <div className="mt-1 text-[11px] font-bold text-rose-600">
                              Variance:{" "}
                              {tr.lines
                                .filter((l) => Number(l.variance_qty) !== 0)
                                .map((l) => `${l.variance_qty > 0 ? "+" : ""}${l.variance_qty} (${l.sku})`)
                                .join(", ")}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">Zero variance (100% matched)</div>
                          )}
                          {tr.variance_notes ? (
                            <div className="mt-0.5 text-[10px] text-slate-500 italic">
                              &quot;{tr.variance_notes}&quot;
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Awaiting branch arrival</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 text-right">
                      {tr.is_incoming && tr.status === "in_transit" ? (
                        <button
                          type="button"
                          onClick={() => openReceiveModal(tr)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 cursor-pointer"
                        >
                          <CheckCircle2 size={13} />
                          <span>Receive &amp; Verify</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <ArrowRightLeft size={24} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">No stock transfers found</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                        Use the &quot;Dispatch New Transfer&quot; button to consign inventory items to another store location.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: PHYSICAL STOCK AUDIT (CYCLE COUNT)
         ===================================================================== */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-2xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                <FileSpreadsheet size={16} className="text-indigo-600" />
                <span>Physical Cycle Count Workspace</span>
              </div>
              <p className="text-xs text-indigo-900/80">
                Enter physical shelf counts. Discrepancies are highlighted in real-time and post adjusting journal entries to the stock ledger.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCountedInputs({})}
                className="h-8 rounded-lg border border-indigo-300 bg-white px-3 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 transition cursor-pointer"
              >
                Clear Inputs
              </button>
              <button
                type="button"
                onClick={() => void handleReconcileAllCounts()}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-indigo-600 px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition cursor-pointer"
              >
                <Check size={13} />
                <span>Reconcile All Audited</span>
              </button>
            </div>
          </div>

          {/* Audit Sheet Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Item &amp; SKU</th>
                  <th className="px-4 py-3.5 text-center">System On-Hand</th>
                  <th className="px-4 py-3.5 text-center">Physical Count</th>
                  <th className="px-4 py-3.5 text-center">Variance (Qty)</th>
                  <th className="px-4 py-3.5 text-right">Variance Impact</th>
                  <th className="px-4 py-3.5 text-right">Reconcile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const onHand = Number(item.on_hand || 0);
                  const countedVal = countedInputs[item.id];
                  const hasCount = countedVal !== undefined && countedVal.trim() !== "";
                  const countNum = Number(countedVal || 0);
                  const variance = hasCount ? countNum - onHand : 0;
                  const unitCost = (item.cost_paise || item.selling_price_paise || 0) / 100;
                  const varianceCost = variance * unitCost;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {item.on_hand} {item.unit_short || "units"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Counted"
                          value={countedInputs[item.id] ?? ""}
                          onChange={(e) =>
                            setCountedInputs((cur) => ({ ...cur, [item.id]: e.target.value }))
                          }
                          className="num h-8 w-24 rounded-lg border border-slate-300 px-2 text-center text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        {!hasCount ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : variance === 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                            0 (Matched)
                          </span>
                        ) : variance > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
                            +{variance} (Surplus)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-rose-700 border border-rose-200">
                            {variance} (Shortage)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {!hasCount ? (
                          <span className="text-slate-400 font-normal">—</span>
                        ) : varianceCost === 0 ? (
                          <span className="text-slate-500">₹0.00</span>
                        ) : varianceCost > 0 ? (
                          <span className="text-emerald-600">+₹{varianceCost.toFixed(2)}</span>
                        ) : (
                          <span className="text-rose-600">-₹{Math.abs(varianceCost).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!hasCount}
                          onClick={() => void handlePostCount(item.id)}
                          className="inline-flex items-center gap-1 h-8 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-40 cursor-pointer"
                        >
                          <Check size={12} />
                          <span>Post</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: BATCH & EXPIRY CONTROL
         ===================================================================== */}
      {activeTab === "expiry" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Product &amp; SKU</th>
                  <th className="px-5 py-3.5">Batch / Lot Code</th>
                  <th className="px-5 py-3.5">Expiry Date</th>
                  <th className="px-5 py-3.5">Shelf Life Status</th>
                  <th className="px-5 py-3.5 text-right">Remaining Units</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expiring.map((b) => {
                  const expiryDate = new Date(b.expires_at);
                  const today = new Date();
                  const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                  const isExpired = diffDays <= 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {b.name_override || b.sku}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        {b.batch_code || "DEFAULT"}
                      </td>
                      <td className="num px-5 py-3.5 font-bold text-slate-900">{b.expires_at}</td>
                      <td className="px-5 py-3.5">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10.5px] font-bold text-rose-700 border border-rose-200">
                            EXPIRED ({Math.abs(diffDays)}d ago)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200">
                            EXPIRING SOON ({diffDays}d left)
                          </span>
                        )}
                      </td>
                      <td className="num px-5 py-3.5 text-right font-bold text-slate-900">
                        {b.qty_remaining} units
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => void markBatchExpired(b.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        >
                          Mark Expired
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {expiring.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">All Batches Fresh</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                        No product batches are expiring within the next 30 days for this store branch.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: AUTO-REPLENISHMENT WATCH
         ===================================================================== */}
      {activeTab === "replenish" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <Zap size={16} className="text-amber-600" />
                <span>Automated Replenishment Watch</span>
              </div>
              <p className="text-xs text-amber-900/80">
                Analyzes on-hand balances against defined safety thresholds and historical reorder points.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void openAutoPo()}
              disabled={isLoadingAutoPo}
              className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-amber-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition cursor-pointer disabled:opacity-50"
            >
              <Zap size={14} />
              <span>{isLoadingAutoPo ? "Calculating..." : "Launch Auto-PO Generator"}</span>
            </button>
          </div>

          {/* Breached Items Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Item &amp; SKU</th>
                  <th className="px-4 py-3.5 text-center">Current On Hand</th>
                  <th className="px-4 py-3.5 text-center">Safety Reorder Point</th>
                  <th className="px-4 py-3.5 text-center">Deficit</th>
                  <th className="px-4 py-3.5 text-center">Suggested PO Qty</th>
                  <th className="px-4 py-3.5 text-right">Quick Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items
                  .filter((item) => Number(item.on_hand || 0) <= Number(item.reorder_point || 0))
                  .map((item) => {
                    const onHand = Number(item.on_hand || 0);
                    const reorderPt = Number(item.reorder_point || 0);
                    const deficit = Math.max(1, reorderPt - onHand);
                    const suggested = Math.max(10, Math.ceil(reorderPt * 2) - onHand);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="font-mono text-[11px] text-slate-500">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-center num font-bold text-amber-700">
                          {item.on_hand} {item.unit_short || "units"}
                        </td>
                        <td className="px-4 py-3 text-center num font-semibold text-slate-700">
                          {item.reorder_point} {item.unit_short || "units"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                            -{deficit} units
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center num font-bold text-slate-900">
                          {suggested} {item.unit_short || "units"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openSinglePoModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs transition cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Create PO</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {items.filter((item) => Number(item.on_hand || 0) <= Number(item.reorder_point || 0)).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">Optimal Stock Levels</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                        All catalog items are currently above their minimum safety thresholds.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: QUICK STOCK ADJUSTMENT MODAL
         ===================================================================== */}
      {adjustItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Stock Adjustment</h2>
                <p className="text-xs text-slate-500 font-medium">{adjustItem.name} ({adjustItem.sku})</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void handlePostAdjustment(e)} className="mt-4 space-y-4">
              {/* Add vs Reduce Mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustMode("add")}
                  className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    adjustMode === "add"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  + Add Inward Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustMode("reduce")}
                  className={`h-9 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    adjustMode === "reduce"
                      ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  − Reduce / Write-off
                </button>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Adjustment Units
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Reason Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Reason Code
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="correction">Stock Count Correction</option>
                  <option value="damage">Damage / Spoilage</option>
                  <option value="shrinkage">Shrinkage / Pilferage</option>
                  <option value="expiry">Expired Stock</option>
                  <option value="found">Unregistered Inward Found</option>
                  <option value="sample">Internal Sample / Demo</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Audit Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Broken packaging discovered during shelf reset"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Preview */}
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 flex justify-between items-center">
                <span>Current: <strong className="text-slate-900">{adjustItem.on_hand}</strong></span>
                <span>→</span>
                <span>
                  Resulting:{" "}
                  <strong className="text-slate-900 font-bold">
                    {(Number(adjustItem.on_hand) + (adjustMode === "add" ? Number(adjustQty || 0) : -Number(adjustQty || 0))).toFixed(3)}
                  </strong>
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingAdjust ? "Posting..." : "Commit Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 2: INTER-BRANCH STOCK DISPATCH MODAL
         ===================================================================== */}
      {newTransferModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Dispatch Inter-Branch Stock</h2>
                  <p className="text-xs text-slate-500">Transfer consignment to another registered branch.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewTransferModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateTransfer(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Destination Store / Branch
                </label>
                <select
                  required
                  value={transferTargetStore}
                  onChange={(e) => setTransferTargetStore(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Select destination branch...</option>
                  {otherBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code || "Branch"})
                    </option>
                  ))}
                </select>
                {otherBranches.length === 0 ? (
                  <p className="mt-1 text-[11px] text-amber-600">
                    No other stores registered under this tenant organization.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Select Item to Transfer
                </label>
                <select
                  required
                  value={transferItem}
                  onChange={(e) => setTransferItem(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="">Choose item from catalog...</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.sku}) — {i.on_hand} in stock
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Dispatch Quantity
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setNewTransferModal(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer || !transferTargetStore || !transferItem}
                  className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  <Truck size={14} />
                  <span>{isSubmittingTransfer ? "Dispatching..." : "Dispatch Consignment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 3: RECEIVE CONSIGNMENT & VARIANCE AUDIT MODAL
         ===================================================================== */}
      {receiveTransferModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Receive Consignment</h2>
                <p className="text-xs text-slate-500">
                  Transfer #{receiveTransferModal.transfer_number} from {receiveTransferModal.from_store_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiveTransferModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-center">Dispatched</th>
                      <th className="px-3 py-2 text-center">Counted Received</th>
                      <th className="px-3 py-2 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiveTransferModal.lines.map((line) => {
                      const recQty = Number(receivedQtys[line.id] ?? line.dispatched_qty);
                      const variance = recQty - line.dispatched_qty;
                      return (
                        <tr key={line.id}>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900">{line.item_name}</div>
                            <div className="font-mono text-[10px] text-slate-400">{line.sku}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                            {line.dispatched_qty}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={receivedQtys[line.id] ?? line.dispatched_qty}
                              onChange={(e) =>
                                setReceivedQtys((cur) => ({
                                  ...cur,
                                  [line.id]: e.target.value,
                                }))
                              }
                              className="num h-7 w-20 rounded border border-slate-300 px-2 text-center text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold">
                            {variance === 0 ? (
                              <span className="text-slate-400">0</span>
                            ) : variance > 0 ? (
                              <span className="text-emerald-600">+{variance} (Surplus)</span>
                            ) : (
                              <span className="text-rose-600">{variance} (Shortage)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Discrepancy / Variance Remarks
                </label>
                <textarea
                  rows={2}
                  value={varianceNotes}
                  onChange={(e) => setVarianceNotes(e.target.value)}
                  placeholder="Record damages, broken bottles, or missing units for audit trail..."
                  className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setReceiveTransferModal(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingTransfer}
                  onClick={() => void handleReceiveTransfer()}
                  className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>{isSubmittingTransfer ? "Updating..." : "Acknowledge & Adjust Stock"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 4: AUTOMATED PURCHASE ORDER PROPOSAL MODAL
         ===================================================================== */}
      {autoPoModalOpen && autoPoProposal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Zap size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Automated PO Replenishment Proposal</h2>
                  <p className="text-xs text-slate-500">Generated from minimum stock alert thresholds.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoPoModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {autoPoProposal.lines.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                  <p className="mt-2 text-sm font-bold text-slate-900">All Items Well-Stocked</p>
                  <p className="text-xs text-slate-500 mt-1">No replenishment needed for this store location.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                    <div>
                      <span className="text-slate-500">Suggested Supplier: </span>
                      <strong className="text-slate-900">{autoPoProposal.supplier?.name || "Primary Vendor"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Estimated Spend: </span>
                      <strong className="text-slate-900 font-mono text-sm">{formatInr(autoPoProposal.total_estimated_paise)}</strong>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2 text-center">Current</th>
                          <th className="px-3 py-2 text-center">Safety Pt</th>
                          <th className="px-3 py-2 text-center">Suggested Qty</th>
                          <th className="px-3 py-2 text-right">Est. Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {autoPoProposal.lines.map((l) => (
                          <tr key={l.store_item_id}>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-slate-900">{l.name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{l.sku}</div>
                            </td>
                            <td className="px-3 py-2.5 text-center font-bold text-amber-700">{l.on_hand}</td>
                            <td className="px-3 py-2.5 text-center text-slate-500">{l.reorder_point}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-slate-900">{l.suggested_qty}</td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-800">
                              {formatInr(l.line_total_paise)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAutoPoModalOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                {autoPoProposal.lines.length > 0 ? (
                  <button
                    type="button"
                    disabled={isSubmittingPo}
                    onClick={() => void confirmAutoPo()}
                    className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 shadow-2xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <FileSpreadsheet size={14} />
                    <span>{isSubmittingPo ? "Creating PO..." : "Create Purchase Order"}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          MODAL 5: SINGLE-ITEM QUICK PO MODAL
         ===================================================================== */}
      {singlePoItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Create Replenishment PO</h2>
                <p className="text-xs text-slate-500">{singlePoItem.name} ({singlePoItem.sku})</p>
              </div>
              <button
                type="button"
                onClick={() => setSinglePoItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => void handleConfirmSinglePo(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Supplier Name
                </label>
                <input
                  type="text"
                  required
                  value={singlePoSupplier}
                  onChange={(e) => setSinglePoSupplier(e.target.value)}
                  placeholder="Primary Supplier or Distributor"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={singlePoQty}
                    onChange={(e) => setSinglePoQty(e.target.value)}
                    className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={singlePoCostRupees}
                    onChange={(e) => setSinglePoCostRupees(e.target.value)}
                    className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs flex justify-between items-center text-slate-700">
                <span>Estimated Total:</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  ₹{((Number(singlePoQty) || 0) * (parseFloat(singlePoCostRupees) || 0)).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setSinglePoItem(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPo}
                  className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>{isSubmittingPo ? "Creating PO..." : "Issue Purchase Order"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
