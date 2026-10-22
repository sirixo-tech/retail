"use client";

import { formatInr } from "@selfx/types";
import { RotateCcw, ShoppingBag, Truck, Wallet, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type Item = { id: string; name: string; sku?: string; on_hand?: string };
type Supplier = { id: string; name: string; gstin?: string | null; balance_paise?: number };

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
  const [storeId, setStoreId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplier, setSupplier] = useState("");
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("0");
  const [batchCode, setBatchCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadAll(preferredSupplierId?: string) {
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

    const [stock, people] = await Promise.all([
      fetch(`/api/v1/stores/${id}/items`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch("/api/v1/suppliers", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
    ]);

    if (stock.ok) {
      const rows = ((await stock.json()) as { data: Item[] }).data;
      setItems(rows);
      if (!itemId && rows[0]?.id) setItemId(rows[0].id);
    }
    if (people.ok) {
      const rows = ((await people.json()) as { data: Supplier[] }).data;
      setSuppliers(rows);
      setSupplierId(preferredSupplierId ?? rows[0]?.id ?? "");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function receive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId) return;
    const linePayload: Record<string, unknown> = {
      store_item_id: itemId,
      qty: Number(qty),
      cost_paise: Math.round(Number(cost) * 100),
    };
    if (batchCode.trim()) linePayload.batch_code = batchCode.trim();
    if (expiresAt) linePayload.expires_at = expiresAt;

    const response = await fetch(`/api/v1/stores/${storeId}/purchases`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        supplier_name: supplier,
        lines: [linePayload],
      }),
    });
    const body = (await response.json()) as {
      data?: { number: string; payable_paise: number; supplier_id?: string };
      error?: { message: string };
    };
    setMessage(
      response.ok
        ? `${body.data?.number} posted. Payable ₹${((body.data?.payable_paise ?? 0) / 100).toFixed(2)}.`
        : (body.error?.message ?? "Receipt failed."),
    );
    if (response.ok) {
      await loadAll(body.data?.supplier_id);
    }
  }

  async function sendBack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId || !supplierId) return;
    const response = await fetch(`/api/v1/stores/${storeId}/purchase-returns`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        supplier_id: supplierId,
        store_item_id: itemId,
        qty: Number(qty),
        cost_paise: Math.round(Number(cost) * 100),
      }),
    });
    const body = (await response.json()) as {
      data?: { amount_paise: number };
      error?: { message: string };
    };
    setMessage(
      response.ok
        ? `Returned. Supplier due reduced by ₹${((body.data?.amount_paise ?? 0) / 100).toFixed(2)}.`
        : (body.error?.message ?? "The return was not posted."),
    );
    if (response.ok) await loadAll(supplierId);
  }

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeId || !supplierId) return;
    const rupees = Number(new FormData(event.currentTarget).get("rupees"));
    const response = await fetch(`/api/v1/stores/${storeId}/supplier-payments`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        supplier_id: supplierId,
        amount_paise: Math.round(rupees * 100),
      }),
    });
    const body = (await response.json()) as {
      data?: { due_paise: number };
      error?: { message: string };
    };
    setMessage(
      response.ok
        ? `Paid. Still due ₹${((body.data?.due_paise ?? 0) / 100).toFixed(2)}.`
        : (body.error?.message ?? "The payment was not recorded."),
    );
    if (response.ok) await loadAll(supplierId);
  }

  const totalPayablePaise = suppliers.reduce((acc, s) => acc + (s.balance_paise ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Purchases (GRN), Supplier Returns &amp; Ledger
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Receive supplier stock batches (GRN), record debit-note purchase returns, and settle vendor payables.
        </p>
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Active Suppliers
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">
            {suppliers.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Total Supplier Payable
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-amber-600">
            {formatInr(totalPayablePaise)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Purchasable Catalog Items
          </div>
          <div className="num mt-1.5 text-2xl font-semibold text-slate-900">{items.length}</div>
        </div>
      </div>

      {/* 3 Action Cards Grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* 1. Receive Goods (GRN) */}
        <form
          onSubmit={receive}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">Receive Goods (GRN)</h2>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Supplier
              <input
                required
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                placeholder="e.g. Metro Cash & Carry"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Item
              <select
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-700">
                Quantity
                <input
                  value={qty}
                  onChange={(event) => setQty(event.target.value)}
                  className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Cost, rupees
                <input
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                  className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-slate-700">
                Batch Code (Optional)
                <input
                  value={batchCode}
                  onChange={(e) => setBatchCode(e.target.value)}
                  placeholder="LOT-2026"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Expiry Date (Optional)
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
                />
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 h-9 w-full rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Receive goods
          </button>
        </form>

        {/* 2. Return to Supplier */}
        <form
          onSubmit={sendBack}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">Return to supplier</h2>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Supplier
              <select
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900"
              >
                {suppliers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs leading-relaxed text-slate-500">
              Uses the selected item, quantity ({qty}), and unit cost (₹{cost}) from the GRN form to deduct damaged or excess stock and reduce supplier payable balance.
            </p>
          </div>
          <button
            type="submit"
            disabled={suppliers.length === 0}
            className="mt-4 h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Return goods
          </button>
        </form>

        {/* 3. Pay Supplier */}
        <form
          onSubmit={pay}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">Pay supplier</h2>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Record a payout against the selected supplier&apos;s payable ledger. A payment cannot exceed the amount still due.
            </p>
            <label className="block text-xs font-semibold text-slate-700">
              Rupees
              <input
                name="rupees"
                required
                inputMode="decimal"
                placeholder="0.00"
                className="num mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={suppliers.length === 0}
            className="mt-4 h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Record payment
          </button>
        </form>
      </div>

      {/* Suppliers Directory & Payable Ledger Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Supplier Ledger &amp; Payables</h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Supplier Name</th>
              <th className="px-5 py-3">GSTIN</th>
              <th className="px-5 py-3 text-right">Net Payable Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map((s) => (
              <tr
                key={s.id}
                onClick={() => setSupplierId(s.id)}
                className={`cursor-pointer hover:bg-slate-50/60 ${
                  supplierId === s.id ? "bg-slate-50" : ""
                }`}
              >
                <td className="px-5 py-3 font-semibold text-slate-900">{s.name}</td>
                <td className="font-mono px-5 py-3 text-slate-500">{s.gstin || "—"}</td>
                <td className="num px-5 py-3 text-right font-semibold text-slate-900">
                  {formatInr(s.balance_paise ?? 0)}
                </td>
              </tr>
            ))}
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-8 text-center text-xs text-slate-400">
                  No suppliers yet. Receiving goods automatically creates the supplier ledger.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
