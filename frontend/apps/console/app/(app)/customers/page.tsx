"use client";

import { formatInr } from "@selfx/types";
import { Download, MapPin, Plus, Search, Upload, Users, Wallet, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

type Customer = {
  id: string;
  name: string;
  phone_e164: string;
  khata_balance_paise?: number;
};

type Detail = {
  khata_balance_paise: number;
  loyalty_points: number;
  loyalty_tier: string;
  addresses: { id: string; line1: string; city: string | null; pincode: string | null }[];
  khata: { id: string; direction: string; amount_paise: number; note: string | null }[];
};

type Sale = { id: string; number: string; total_paise: number; status: string };

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  async function load(term = query) {
    const response = await fetch(`/api/v1/customers?q=${encodeURIComponent(term)}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) {
      window.location.href = "/login";
      return;
    }
    if (response.ok) setRows(((await response.json()) as { data: Customer[] }).data);
  }

  async function createCustomer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/v1/customers", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
      }),
    });
    const body = (await response.json()) as { data?: { id: string }; error?: { message: string } };
    setMessage(
      response.ok
        ? "Customer created."
        : (body.error?.message ?? "Could not create customer."),
    );
    if (response.ok) {
      setCreateOpen(false);
      await load("");
      if (body.data?.id) await open(body.data.id);
    }
  }

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const csv = new FormData(form).get("csv");
    const response = await fetch("/api/v1/customers/import", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ csv }),
    });
    const body = (await response.json()) as {
      data?: { created: number; skipped: number; invalid: number };
      error?: { message: string };
    };
    setMessage(
      response.ok
        ? `Created ${body.data?.created ?? 0}, skipped ${body.data?.skipped ?? 0}, invalid ${body.data?.invalid ?? 0}.`
        : (body.error?.message ?? "The import failed."),
    );
    if (response.ok) {
      form.reset();
      await load("");
    }
  }

  async function downloadCustomers() {
    const response = await fetch("/api/v1/customers/export", { credentials: "include" });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    void load("");
  }, []);

  async function open(id: string) {
    setSelected(id);
    const [salesResponse, detailResponse] = await Promise.all([
      fetch(`/api/v1/customers/${id}/sales`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
      fetch(`/api/v1/customers/${id}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      }),
    ]);
    if (salesResponse.ok) setSales(((await salesResponse.json()) as { data: Sale[] }).data);
    if (detailResponse.ok) setDetail(((await detailResponse.json()) as { data: Detail }).data);
  }

  async function khata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch(`/api/v1/customers/${selected}/khata`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        direction: data.get("direction"),
        amount_paise: Math.round(Number(data.get("rupees")) * 100),
        note: data.get("note"),
      }),
    });
    const body = (await response.json()) as { error?: { message: string } };
    setMessage(response.ok ? "Khata updated." : (body.error?.message ?? "Khata was not updated."));
    if (response.ok) {
      form.reset();
      await open(selected);
    }
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch(`/api/v1/customers/${selected}/addresses`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        line1: data.get("line1"),
        city: data.get("city"),
        pincode: data.get("pincode"),
      }),
    });
    if (response.ok) {
      setMessage("Delivery address saved.");
      form.reset();
      await open(selected);
    }
  }

  async function feedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch(`/api/v1/customers/${selected}/feedback`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({
        rating: Number(data.get("rating")),
        comment: data.get("comment"),
      }),
    });
    const body = (await response.json()) as { error?: { message: string } };
    setMessage(
      response.ok ? "Feedback saved." : (body.error?.message ?? "Feedback was not saved."),
    );
    if (response.ok) {
      form.reset();
      await open(selected);
    }
  }

  async function segment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const name = new FormData(form).get("name");
    const created = await fetch("/api/v1/segments", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ name }),
    });
    const createdBody = (await created.json()) as {
      data?: { id: string };
      error?: { message: string };
    };
    if (!created.ok || !createdBody.data?.id) {
      setMessage(createdBody.error?.message ?? "The segment was not created.");
      return;
    }
    const attached = await fetch(`/api/v1/segments/${createdBody.data.id}/customers`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ customer_id: selected }),
    });
    setMessage(attached.ok ? "Added to the segment." : "The customer was not added.");
    if (attached.ok) form.reset();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Customers, Khata Credit &amp; Loyalty CRM
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage customer profiles, credit (Khata) ledgers, loyalty points, delivery addresses, and segments.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void downloadCustomers()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Customer
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

      {/* Search & Bulk CSV Import */}
      <div className="grid gap-4 lg:grid-cols-12">
        <form
          className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-5 flex flex-col justify-between"
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Search Customer Directory
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Name or mobile"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pr-3 pl-9 text-xs text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
                />
              </div>
            </label>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{rows.length} customers in directory</span>
            <button
              type="submit"
              className="h-8 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white"
            >
              Search
            </button>
          </div>
        </form>

        <form
          onSubmit={importCsv}
          className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-7"
        >
          <label className="block text-xs font-semibold text-slate-700">
            Import
            <textarea
              name="csv"
              required
              rows={2}
              placeholder={"name,phone\nMeera,9876543210"}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900"
            />
          </label>
          <div className="mt-2.5 flex gap-2">
            <button
              type="submit"
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Import customers
            </button>
          </div>
        </form>
      </div>

      {/* Main Split View: Customer List + Selected Customer Ledger */}
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="xl:col-span-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Customer Directory
          </div>
          <ul className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void open(row.id)}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-xs transition ${
                    selected === row.id ? "bg-slate-900 text-white" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="font-semibold">{row.name}</span>
                  <span
                    className={`num ${selected === row.id ? "text-slate-300" : "text-slate-500"}`}
                  >
                    {row.phone_e164}
                  </span>
                </button>
              </li>
            ))}
            {rows.length === 0 ? (
              <li className="px-4 py-8 text-xs text-slate-400">
                No customers yet. Add one above or attach from POS.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="xl:col-span-7 space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Due on khata
                </p>
                <p className="num mt-1 text-xl font-semibold text-slate-900">
                  {formatInr(detail?.khata_balance_paise ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Loyalty · <span className="capitalize">{detail?.loyalty_tier ?? "bronze"}</span>
                </p>
                <p className="num mt-1 text-xl font-semibold text-slate-900">
                  {detail?.loyalty_points ?? 0} points
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Saved Address
                </p>
                <p className="mt-1 text-xs font-medium text-slate-700">
                  {detail?.addresses[0]
                    ? `${detail.addresses[0].line1} ${detail.addresses[0].pincode ?? ""}`
                    : "No address saved"}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-slate-100">
              {detail?.khata.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between px-5 py-3 text-xs"
                >
                  <span className="font-semibold capitalize text-slate-800">
                    {entry.direction}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </span>
                  <span className="num font-semibold text-slate-900">
                    {formatInr(entry.amount_paise)}
                  </span>
                </li>
              ))}
              {sales.map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-center justify-between px-5 py-3 text-xs"
                >
                  <span className="num font-semibold text-slate-800">{sale.number}</span>
                  <span className="num font-semibold text-slate-900">
                    {formatInr(sale.total_paise)}
                  </span>
                </li>
              ))}
              {sales.length === 0 && (detail?.khata.length ?? 0) === 0 ? (
                <li className="px-5 py-8 text-xs text-slate-400">
                  Select a customer to see bills and khata.
                </li>
              ) : null}
            </ul>
          </div>

          {selected ? (
            <div className="space-y-3">
              {/* Khata Charge / Collect */}
              <form
                onSubmit={khata}
                className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[8rem_8rem_1fr_auto]"
              >
                <select
                  name="direction"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800"
                >
                  <option value="charge">Charge</option>
                  <option value="collect">Collect</option>
                </select>
                <input
                  name="rupees"
                  required
                  inputMode="decimal"
                  placeholder="Rupees"
                  className="num h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
                <input
                  name="note"
                  placeholder="Note"
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Save
                </button>
              </form>

              {/* Delivery Address */}
              <form
                onSubmit={addAddress}
                className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_8rem_7rem_auto]"
              >
                <input
                  name="line1"
                  required
                  placeholder="Delivery street address"
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
                <input
                  name="city"
                  placeholder="City"
                  className="h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
                <input
                  name="pincode"
                  placeholder="PIN code"
                  className="num h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
                <button
                  type="submit"
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Save Address
                </button>
              </form>

              {/* Feedback & Segment */}
              <div className="grid gap-3 sm:grid-cols-2">
                <form
                  onSubmit={feedback}
                  className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[4.5rem_1fr_auto]"
                >
                  <input
                    name="rating"
                    required
                    type="number"
                    min={1}
                    max={5}
                    placeholder="1–5"
                    className="num h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-900"
                  />
                  <input
                    name="comment"
                    placeholder="Comment"
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                  <button
                    type="submit"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Feedback
                  </button>
                </form>

                <form
                  onSubmit={segment}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <input
                    name="name"
                    required
                    placeholder="Segment name"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                  />
                  <button
                    type="submit"
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Add to segment
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add Customer Modal */}
      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Add New Customer</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={createCustomer} className="mt-4 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Customer Name
                <input
                  name="name"
                  required
                  placeholder="e.g. Ananya Rao"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                10-Digit Mobile Number
                <input
                  name="phone"
                  required
                  placeholder="9876543210"
                  className="num mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
