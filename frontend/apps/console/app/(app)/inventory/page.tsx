"use client";

import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Plus,
  Search,
  Zap,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatInr } from "@selfx/types";

type Item = {
  id: string;
  name: string;
  sku: string;
  on_hand: string;
  reorder_point: string;
  selling_price_paise?: number;
};

type Alert = { id: string; sku: string; name_override: string | null; on_hand: string };

type ExpiryBatch = {
  id: string;
  batch_code: string | null;
  expires_at: string;
  qty_remaining: string;
  sku: string;
  name_override: string | null;
};

type TransferLine = {
  id: string;
  store_item_id: string;
  item_name: string;
  sku: string;
  dispatched_qty: number;
  received_qty?: number | null;
  variance_qty: number;
};

type StockTransfer = {
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

type AutoPoProposal = {
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
  const [items, setItems] = useState<Item[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expiring, setExpiring] = useState<ExpiryBatch[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [reorder, setReorder] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "low" | "expiry" | "transfers">("all");

  // Inter-Branch Stock Transfers State
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [stores, setStores] = useState<{ id: string; name: string; code: string }[]>([]);
  const [newTransferModal, setNewTransferModal] = useState(false);
  const [transferTargetStore, setTransferTargetStore] = useState("");
  const [transferItem, setTransferItem] = useState("");
  const [transferQty, setTransferQty] = useState("1");
  const [receiveTransferModal, setReceiveTransferModal] = useState<StockTransfer | null>(null);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, string>>({});
  const [varianceNotes, setVarianceNotes] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Automated PO State
  const [autoPoProposal, setAutoPoProposal] = useState<AutoPoProposal | null>(null);
  const [autoPoModalOpen, setAutoPoModalOpen] = useState(false);
  const [isLoadingAutoPo, setIsLoadingAutoPo] = useState(false);

  // Custom adjustment modal
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("1");
  const [adjustReason, setAdjustReason] = useState("correction");

  async function load() {
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

    const [stock, low, exp, trRes, storesRes] = await Promise.all([
      fetch(`/api/v1/stores/${id}/items`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch(`/api/v1/stores/${id}/stock/alerts`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch(`/api/v1/stores/${id}/stock/expiry`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch(`/api/v1/stores/${id}/transfers`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch("/api/v1/stores", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
    ]);

    if (stock.ok) {
      const d = ((await stock.json()) as { data: Item[] }).data;
      setItems(Array.isArray(d) ? d : []);
    }
    if (low.ok) {
      const d = ((await low.json()) as { data: Alert[] }).data;
      setAlerts(Array.isArray(d) ? d : []);
    }
    if (exp.ok) {
      const d = ((await exp.json()) as { data: ExpiryBatch[] }).data;
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
  }

  useEffect(() => {
    void load();
  }, []);

  async function adjust(itemId: string, delta: number, reason: string) {
    if (!storeId) return;
    const response = await fetch(`/api/v1/stores/${storeId}/adjustments`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ store_item_id: itemId, qty_delta: delta, reason }),
    });
    setMessage(response.ok ? "Stock ledger adjusted." : "Stock was not changed.");
    setAdjustItem(null);
    await load();
  }

  async function postCount(itemId: string) {
    if (!storeId) return;
    const response = await fetch(`/api/v1/stores/${storeId}/counts`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        lines: [{ store_item_id: itemId, counted_qty: Number(counted[itemId]) }],
      }),
    });
    const body = (await response.json()) as { error?: { message: string } };
    setMessage(
      response.ok ? "Physical stock count posted." : (body.error?.message ?? "Count was not posted."),
    );
    await load();
  }

  async function markBatchExpired(batchId: string) {
    const response = await fetch(`/api/v1/inventory/batches/${batchId}/mark-expired`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
    });
    setMessage(response.ok ? "Batch marked as expired." : "Failed to mark batch as expired.");
    await load();
  }

  async function saveReorder(itemId: string) {
    if (!storeId) return;
    const response = await fetch(`/api/v1/stores/${storeId}/items/${itemId}/reorder`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ reorder_point: Number(reorder[itemId]) }),
    });
    setMessage(response.ok ? "Reorder point saved." : "Reorder point was not saved.");
    await load();
  }

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
        setMessage("Could not calculate automatic PO.");
      }
    } finally {
      setIsLoadingAutoPo(false);
    }
  }

  async function confirmAutoPo() {
    if (!storeId || !autoPoProposal || autoPoProposal.lines.length === 0) return;
    setIsSubmittingTransfer(true);
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
          supplier_name: autoPoProposal.supplier?.name || "Auto-Replenish Supplier",
          lines: autoPoProposal.lines.map((l) => ({
            store_item_id: l.store_item_id,
            qty: l.suggested_qty,
            cost_paise: l.estimated_cost_paise,
          })),
        }),
      });

      if (res.ok) {
        setMessage(`Automated Purchase Order generated for ${autoPoProposal.lines.length} replenishment items.`);
        setAutoPoModalOpen(false);
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        setMessage(body.error?.message ?? "Failed to create automated purchase order.");
      }
    } finally {
      setIsSubmittingTransfer(false);
    }
  }

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
        setMessage("Inter-branch stock transfer dispatched. Consignment is IN_TRANSIT.");
        setNewTransferModal(false);
        setTransferItem("");
        setTransferQty("1");
        setTransferTargetStore("");
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        setMessage(body.error?.message ?? "Could not initiate transfer.");
      }
    } finally {
      setIsSubmittingTransfer(false);
    }
  }

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
        setMessage("Transfer acknowledged and received. Inventory ledger updated with transit variance.");
        setReceiveTransferModal(null);
        await load();
      } else {
        const body = (await res.json()) as { error?: { message: string } };
        setMessage(body.error?.message ?? "Could not receive transfer.");
      }
    } finally {
      setIsSubmittingTransfer(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => {
      if (filterMode === "low") {
        const isLow = Number(item.on_hand) <= Number(item.reorder_point || 0);
        if (!isLow) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, filterMode, search]);

  const otherBranches = useMemo(() => {
    if (!Array.isArray(stores)) return [];
    return stores.filter((s) => s.id !== storeId);
  }, [stores, storeId]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Inventory, Stock Counts &amp; Batch Control
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Real-time on-hand stock balances, inter-branch transit, physical cycle counts, and automated purchase orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void openAutoPo()}
            disabled={isLoadingAutoPo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>{isLoadingAutoPo ? "Analyzing..." : "Auto-PO Generator"}</span>
          </button>

          <button
            type="button"
            onClick={() => setNewTransferModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>New Branch Transfer</span>
          </button>
        </div>
      </div>

      {message ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Store Items
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{items.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            In-Stock Items
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-emerald-600">
            {items.filter((i) => Number(i.on_hand) > 0).length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Low Stock Alerts
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-amber-600">{alerts.length}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            In-Transit Transfers
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-blue-600">
            {transfers.filter((t) => t.status === "in_transit").length}
          </div>
        </div>
      </div>

      {/* Low Stock Replenishment Banner */}
      {alerts.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Replenishment Required ({alerts.length} items at or below reorder threshold)
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {alerts.slice(0, 6).map((alert) => (
                <span
                  key={alert.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  <span>{alert.name_override || alert.sku}</span>
                  <span className="num text-amber-700">({alert.on_hand} left)</span>
                </span>
              ))}
              {alerts.length > 6 ? (
                <span className="self-center text-[11px] font-medium text-amber-800">
                  +{alerts.length - 6} more
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void openAutoPo()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Generate Suggested PO</span>
          </button>
        </div>
      ) : null}

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inventory by product name or SKU..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pr-3 pl-9 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all" as const, label: `All Items (${items.length})` },
            { id: "low" as const, label: `Low Stock (${alerts.length})` },
            { id: "expiry" as const, label: `Expiring Batches (${expiring.length})` },
            { id: "transfers" as const, label: `Branch Transfers (${transfers.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`h-9 rounded-lg px-3 text-xs font-semibold transition ${
                filterMode === tab.id
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transfers View */}
      {filterMode === "transfers" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Transfer / Consignment</th>
                <th className="px-5 py-3">Branch Route</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Items &amp; Dispatched Qty</th>
                <th className="px-5 py-3">Receipt / Variance</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <div className="font-mono font-semibold text-slate-900">{tr.transfer_number}</div>
                    <div className="text-[11px] text-slate-400">
                      Dispatched {new Date(tr.dispatched_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                      <span className="font-semibold">{tr.from_store_name}</span>
                      <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                      <span className="font-semibold">{tr.to_store_name}</span>
                    </div>
                    <div className="mt-0.5">
                      {tr.is_incoming ? (
                        <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          Incoming Consignment
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          Outgoing Dispatch
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {tr.status === "in_transit" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        IN TRANSIT
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        RECEIVED
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="space-y-1">
                      {tr.lines.map((l) => (
                        <div key={l.id} className="text-xs text-slate-700">
                          <span className="font-semibold text-slate-900">{l.item_name}</span>
                          <span className="ml-2 font-mono text-[11px] text-slate-400">({l.sku})</span>
                          <span className="ml-2 font-semibold text-slate-800">{l.dispatched_qty} units</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {tr.status === "received" ? (
                      <div>
                        <div className="text-[11px] font-medium text-emerald-700">
                          Received {tr.received_at ? new Date(tr.received_at).toLocaleDateString() : "Yes"}
                        </div>
                        {tr.lines.some((l) => Number(l.variance_qty) !== 0) ? (
                          <div className="mt-1 text-[11px] font-semibold text-rose-600">
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
                      <span className="text-xs text-slate-400 italic">Awaiting arrival</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {tr.is_incoming && tr.status === "in_transit" ? (
                      <button
                        type="button"
                        onClick={() => openReceiveModal(tr)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Receive &amp; Acknowledge</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-xs text-slate-400">
                    No stock transfers recorded between branches yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : filterMode === "expiry" ? (
        /* Expiry View */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Batch Code</th>
                <th className="px-5 py-3">Expiry Date</th>
                <th className="px-5 py-3 text-right">Remaining Batch Qty</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expiring.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {b.name_override || b.sku}
                  </td>
                  <td className="font-mono px-5 py-3 text-slate-600">{b.batch_code || "DEFAULT"}</td>
                  <td className="num px-5 py-3 font-semibold text-rose-600">{b.expires_at}</td>
                  <td className="num px-5 py-3 text-right font-semibold text-slate-900">
                    {b.qty_remaining}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => void markBatchExpired(b.id)}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Mark Expired
                    </button>
                  </td>
                </tr>
              ))}
              {expiring.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-400">
                    No batches expiring within the next 30 days.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        /* Main Stock Table */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Item / SKU</th>
                <th className="px-4 py-3">On-Hand Stock</th>
                <th className="px-4 py-3">Physical Cycle Count</th>
                <th className="px-4 py-3">Reorder Point</th>
                <th className="px-4 py-3 text-right">Quick Adjustments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{item.sku}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="num text-sm font-semibold text-slate-900">
                      {item.on_hand} on hand
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        aria-label={`Counted quantity for ${item.name}`}
                        value={counted[item.id] ?? ""}
                        onChange={(event) =>
                          setCounted((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        placeholder="Counted"
                        className="num h-8 w-24 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => void postCount(item.id)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Post count
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        aria-label={`Reorder point for ${item.name}`}
                        value={reorder[item.id] ?? item.reorder_point}
                        onChange={(event) =>
                          setReorder((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        className="num h-8 w-20 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => void saveReorder(item.id)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Reorder
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void adjust(item.id, -1, "wastage")}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Wastage 1
                      </button>
                      <button
                        type="button"
                        onClick={() => void adjust(item.id, 1, "correction")}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Add 1
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustItem(item);
                          setAdjustDelta("1");
                          setAdjustReason("correction");
                        }}
                        className="h-8 rounded-lg bg-slate-900 px-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Custom
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-xs text-slate-400">
                    No inventory items found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {/* New Inter-Branch Transfer Modal */}
      {newTransferModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <ArrowRightLeft className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Dispatch Inter-Branch Stock
                  </h2>
                  <p className="text-xs text-slate-500">
                    Consign items to another store location. Stock will move to IN_TRANSIT.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewTransferModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
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
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
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
                    No other stores registered under this organization yet.
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
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                >
                  <option value="">Choose item from current stock...</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.sku}) — {i.on_hand} on hand
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
                  className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setNewTransferModal(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer || !transferTargetStore || !transferItem}
                  className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>{isSubmittingTransfer ? "Dispatching..." : "Dispatch Consignment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Receive Transfer Modal with Variance Tracking */}
      {receiveTransferModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Receive &amp; Acknowledge Consignment
                </h2>
                <p className="text-xs text-slate-500">
                  Transfer #{receiveTransferModal.transfer_number} from {receiveTransferModal.from_store_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceiveTransferModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2 text-center">Dispatched</th>
                      <th className="px-3 py-2 text-center">Received</th>
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
                          <td className="px-3 py-2.5 text-center font-semibold text-slate-700">
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
                              className="num h-7 w-20 rounded border border-slate-200 px-2 text-center text-xs font-semibold text-slate-900"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-semibold">
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
                  Transit Variance / Discrepancy Remarks
                </label>
                <textarea
                  rows={2}
                  value={varianceNotes}
                  onChange={(e) => setVarianceNotes(e.target.value)}
                  placeholder="Note damages, broken packages, or discrepancies for audit trail..."
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setReceiveTransferModal(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingTransfer}
                  onClick={() => void handleReceiveTransfer()}
                  className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isSubmittingTransfer ? "Updating Ledger..." : "Acknowledge & Adjust Stock"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Automated PO Proposal Modal */}
      {autoPoModalOpen && autoPoProposal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Automated Purchase Order (PO) Proposal
                  </h2>
                  <p className="text-xs text-slate-500">
                    Generated from minimum stock alert thresholds and historical replenishment costs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoPoModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {autoPoProposal.lines.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    All items are above reorder thresholds!
                  </p>
                  <p className="text-xs text-slate-500">
                    No replenishments are currently needed for this store location.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                    <div>
                      <span className="text-slate-500">Suggested Supplier: </span>
                      <span className="font-semibold text-slate-900">
                        {autoPoProposal.supplier?.name || "Primary Vendor"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Estimated Total: </span>
                      <span className="font-semibold text-slate-900">
                        {formatInr(autoPoProposal.total_estimated_paise)}
                      </span>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase font-semibold text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2 text-center">Current</th>
                          <th className="px-3 py-2 text-center">Reorder Pt</th>
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
                            <td className="px-3 py-2.5 text-center font-semibold text-amber-600">
                              {l.on_hand}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-500">
                              {l.reorder_point}
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-slate-900">
                              {l.suggested_qty}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">
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
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                {autoPoProposal.lines.length > 0 ? (
                  <button
                    type="button"
                    disabled={isSubmittingTransfer}
                    onClick={() => void confirmAutoPo()}
                    className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>{isSubmittingTransfer ? "Creating PO..." : "Create Purchase Order"}</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Custom Adjustment Modal */}
      {adjustItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Stock Adjustment — {adjustItem.name}
              </h2>
              <button
                type="button"
                onClick={() => setAdjustItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Quantity Delta (e.g. +10 or -5)
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Reason Code
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
                >
                  <option value="correction">Stock Correction</option>
                  <option value="wastage">Damage / Wastage</option>
                  <option value="expiry">Expired Batch Write-Off</option>
                  <option value="promotion">Sample / Promotional Use</option>
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void adjust(adjustItem.id, Number(adjustDelta) || 1, adjustReason)
                  }
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Post Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
