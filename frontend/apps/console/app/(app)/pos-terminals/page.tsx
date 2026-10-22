"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Info,
  Laptop,
  Monitor,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Tablet,
  Trash2,
  Tv,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Terminal = {
  id: string;
  name: string;
  code: string;
  status: string;
  is_paired: boolean;
  paired_at?: string;
  device_name?: string;
  pairing_code?: string;
  pairing_expires_at?: string;
  customer_display_url: string;
};

type TerminalStats = {
  total: number;
  paired: number;
  unpaired: number;
  branch_name: string;
  branch_code: string;
};

export default function PosTerminalsPage() {
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [stats, setStats] = useState<TerminalStats>({
    total: 0,
    paired: 0,
    unpaired: 0,
    branch_name: "Active Branch",
    branch_code: "MAIN",
  });
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openPairModal, setOpenPairModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);

  // Form Fields
  const [terminalName, setTerminalName] = useState("");
  const [terminalCode, setTerminalCode] = useState("");
  const [pairingInputCode, setPairingInputCode] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairMode, setPairMode] = useState<"enter_code" | "generate_code">("enter_code");

  async function loadTerminals() {
    setLoading(true);
    try {
      // First get active store id from /api/v1/stores
      const storesRes = await fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } });
      if (!storesRes.ok) return;
      const storesBody = await storesRes.json();
      const activeStoreId = storesBody.data?.stats?.active_location_id || storesBody.data?.stores?.[0]?.id;

      if (activeStoreId) {
        const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const body = await res.json();
          setTerminals(body.data?.terminals ?? []);
          setStats(body.data?.stats ?? stats);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTerminals();
  }, []);

  function handleOpenPair(t: Terminal) {
    setSelectedTerminal(t);
    setPairingInputCode("");
    setDeviceName(t.device_name || `Register ${t.code} Tablet`);
    setGeneratedPin(null);
    setError(null);
    setPairMode("enter_code");
    setOpenPairModal(true);
  }

  function handleOpenEdit(t: Terminal) {
    setSelectedTerminal(t);
    setTerminalName(t.name);
    setTerminalCode(t.code);
    setError(null);
    setOpenEditModal(true);
  }

  async function handleCreateTerminal(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );

    try {
      const storesRes = await fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } });
      const storesBody = await storesRes.json();
      const activeStoreId = storesBody.data?.stats?.active_location_id || storesBody.data?.stores?.[0]?.id;

      const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          name: terminalName,
          code: terminalCode ? terminalCode.toUpperCase().trim() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body?.error?.message ?? "Could not create terminal.");
        return;
      }

      setOpenAddModal(false);
      setTerminalName("");
      setTerminalCode("");
      await loadTerminals();
    } catch {
      setError("An error occurred creating the terminal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTerminal(e: FormEvent) {
    e.preventDefault();
    if (!selectedTerminal) return;
    setSaving(true);
    setError(null);

    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );

    try {
      const storesRes = await fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } });
      const storesBody = await storesRes.json();
      const activeStoreId = storesBody.data?.stats?.active_location_id || storesBody.data?.stores?.[0]?.id;

      const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals/${selectedTerminal.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          name: terminalName,
          code: terminalCode ? terminalCode.toUpperCase().trim() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body?.error?.message ?? "Could not update terminal.");
        return;
      }

      setOpenEditModal(false);
      await loadTerminals();
    } catch {
      setError("An error occurred updating the terminal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTerminal(t: Terminal) {
    if (!confirm(`Delete terminal ${t.name} (${t.code})?`)) return;

    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );

    try {
      const storesRes = await fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } });
      const storesBody = await storesRes.json();
      const activeStoreId = storesBody.data?.stats?.active_location_id || storesBody.data?.stores?.[0]?.id;

      const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals/${t.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": token,
        },
      });

      if (res.ok) {
        await loadTerminals();
      }
    } catch {
      alert("Failed to delete terminal.");
    }
  }

  async function handlePairSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedTerminal) return;
    setSaving(true);
    setError(null);

    const token = decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? "",
    );

    try {
      const storesRes = await fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } });
      const storesBody = await storesRes.json();
      const activeStoreId = storesBody.data?.stats?.active_location_id || storesBody.data?.stores?.[0]?.id;

      const res = await fetch(`/api/v1/stores/${activeStoreId}/terminals/${selectedTerminal.id}/pair`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token,
        },
        body: JSON.stringify({
          code: pairingInputCode ? pairingInputCode.replace(/[^0-9]/g, "") : undefined,
          device_name: deviceName || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Pairing failed. Please check the code.");
        return;
      }

      if (body.data?.pairing_code) {
        setGeneratedPin(body.data.pairing_code);
        setPairMode("generate_code");
      } else {
        setOpenPairModal(false);
        await loadTerminals();
      }
    } catch {
      setError("An error occurred during pairing.");
    } finally {
      setSaving(false);
    }
  }

  function copyDisplayUrl(t: Terminal) {
    void navigator.clipboard.writeText(t.customer_display_url);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Terminal Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">POS Terminals &amp; Registers</h1>
          <p className="mt-1 text-xs text-muted">
            Each physical register gets a code (e.g. T1, T2). Open the matching customer display URL on the second
            screen at that register.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setTerminalName(`Terminal ${terminals.length + 1}`);
            setTerminalCode(`T${terminals.length + 1}`);
            setError(null);
            setOpenAddModal(true);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-orange-700 cursor-pointer"
        >
          <Plus size={15} />
          Add terminal
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Terminals Total */}
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60">
            <Monitor size={20} />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight text-ink">{stats.total}</div>
            <div className="text-[11.5px] font-semibold text-muted">Terminals</div>
          </div>
        </div>

        {/* Tablets Paired */}
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
            <Tablet size={20} />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight text-ink">{stats.paired}</div>
            <div className="text-[11.5px] font-semibold text-muted">Tablets paired</div>
          </div>
        </div>

        {/* Active Branch */}
        <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60">
            <Tv size={20} />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-ink uppercase truncate max-w-[170px]">
              {stats.branch_name}
            </div>
            <div className="text-[11.5px] font-semibold text-muted">Branch</div>
          </div>
        </div>
      </div>

      {/* Blue Informative Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-4 text-xs text-[#1e40af] dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 shadow-2xs">
        <Info size={17} className="mt-0.5 text-[#2563eb] dark:text-blue-400 shrink-0" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#1e3a8a] dark:text-blue-100">One terminal per register.</span> Staff sign in on the POS app, pick branch
          and terminal, then open a shift. Pair tablets so devices remember their register. Set a quick unlock PIN under
          Profile.
        </div>
      </div>

      {/* Yellow Warning Banner if Unpaired */}
      {stats.unpaired > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4 text-xs text-[#92400e] dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 shadow-2xs">
          <AlertTriangle size={17} className="mt-0.5 text-[#d97706] dark:text-amber-400 shrink-0" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[#78350f] dark:text-amber-100">Some tablets are not paired yet.</span> {stats.unpaired} register(s) still
            need a tablet paired — use Pair tablet on each card.
          </div>
        </div>
      ) : null}

      {/* Section Subheading */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-ink">Registers at this branch</h2>
        <p className="text-xs text-muted">
          {stats.branch_name.toUpperCase()} • {stats.branch_code}
        </p>
      </div>

      {/* Responsive Terminal Cards Grid (Matching Image 3) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {loading ? (
          <div className="col-span-2 rounded-xl border border-line bg-surface p-8 text-center text-muted">
            <RefreshCw size={18} className="mx-auto animate-spin text-accent" />
            <p className="mt-2 text-xs">Loading registers and pairing status...</p>
          </div>
        ) : terminals.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-line bg-surface p-8 text-center text-muted">
            No terminals registered at this branch. Click &ldquo;+ Add terminal&rdquo; above.
          </div>
        ) : (
          terminals.map((t) => (
            <div
              key={t.id}
              className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-xs transition-shadow hover:shadow-sm"
            >
              <div>
                {/* Card Top: Code badge, Name, Status pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-lg border border-line bg-surface-muted font-mono text-xs font-semibold text-ink shadow-2xs">
                      {t.code}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">{t.name}</div>
                      <div className="text-[11px] text-muted">
                        {t.device_name ? t.device_name : `Code: ${t.code}`}
                      </div>
                    </div>
                  </div>

                  {t.is_paired ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-[#a7f3d0] bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-semibold text-[#065f46] dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Tablet paired
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#fde68a] bg-[#fffbeb] px-2.5 py-1 text-[11px] font-semibold text-[#92400e] dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                      Not paired
                    </span>
                  )}
                </div>

                {/* Customer Display Box */}
                <div className="mt-3.5 rounded-lg border border-line bg-surface-muted/50 p-2.5">
                  <div className="text-[11px] font-semibold text-muted">
                    Customer display • Dual screen URL
                  </div>
                  <div className="mt-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 min-w-0">
                    <span className="truncate font-mono text-[11px] text-muted flex-1 min-w-0">{t.customer_display_url}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyDisplayUrl(t)}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                        title="Copy customer display link"
                      >
                        {copiedId === t.id ? (
                          <Check size={12} className="text-emerald-600" />
                        ) : (
                          <Copy size={12} className="text-muted" />
                        )}
                        Copy link
                      </button>
                      <a
                        href={t.customer_display_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-accent-soft px-2 text-[11px] font-semibold text-accent hover:opacity-90 transition-opacity"
                      >
                        <ExternalLink size={12} />
                        Open display
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3">
                {t.is_paired ? (
                  <button
                    type="button"
                    onClick={() => handleOpenPair(t)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    <Wifi size={13} className="text-muted" />
                    Re-pair tablet
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenPair(t)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-orange-600 px-3.5 text-xs font-semibold text-white hover:bg-orange-700 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Tablet size={13} />
                    Pair tablet
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(t)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    <Pencil size={12} className="text-muted" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteTerminal(t)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Delete register"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pair POS Terminal Modal (6-Digit Code) */}
      {openPairModal && selectedTerminal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <Tablet size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Pair Register {selectedTerminal.code} ({selectedTerminal.name})
                  </h3>
                  <p className="text-[11px] text-muted">Zero-credential physical POS hardware pairing.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenPairModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePairSubmit} className="mt-4 space-y-4">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              {generatedPin ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/40">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Pairing Code Generated Successfully
                  </p>
                  <div className="my-3 font-mono text-3xl font-semibold tracking-widest text-emerald-700 dark:text-emerald-400">
                    {generatedPin}
                  </div>
                  <p className="text-[11px] text-muted">
                    Enter this code on your POS machine screen within 10 minutes to link it to {selectedTerminal.name}.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-ink">
                      Enter 6-Digit Code Displayed on POS Screen
                    </label>
                    <input
                      type="text"
                      maxLength={7}
                      value={pairingInputCode}
                      onChange={(e) => setPairingInputCode(e.target.value)}
                      placeholder="e.g. 742-891"
                      className="mt-1.5 h-12 w-full text-center font-mono text-xl font-semibold tracking-widest rounded-xl border border-line bg-surface px-3 text-ink focus:border-accent focus:outline-hidden"
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      Look at the companion POS app on your Android tablet or Windows POS terminal to find this code.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink">Device Label</label>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="e.g. Samsung Galaxy Tab S9 - Counter 1"
                      className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                    />
                  </div>
                </>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                {!generatedPin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPairingInputCode("");
                      void handlePairSubmit({ preventDefault: () => {} } as FormEvent);
                    }}
                    className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                  >
                    Or generate code for tablet
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenPairModal(false)}
                    className="rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink hover:bg-surface-muted cursor-pointer"
                  >
                    Close
                  </button>
                  {!generatedPin ? (
                    <button
                      type="submit"
                      disabled={saving || !pairingInputCode}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-orange-700 cursor-pointer disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          Pairing...
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          Confirm Pairing
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Add Terminal Modal */}
      {openAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-semibold text-ink">Add POS Register</h3>
              <button
                type="button"
                onClick={() => setOpenAddModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTerminal} className="mt-4 space-y-3">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-ink">Register Name *</label>
                <input
                  type="text"
                  required
                  value={terminalName}
                  onChange={(e) => setTerminalName(e.target.value)}
                  placeholder="e.g. Express Counter / Register 2"
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Register Code *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={terminalCode}
                  onChange={(e) => setTerminalCode(e.target.value.toUpperCase())}
                  placeholder="e.g. T2, REG1"
                  className="mt-1.5 h-10 w-full font-mono uppercase rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setOpenAddModal(false)}
                  className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-700 cursor-pointer disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Terminal Modal */}
      {openEditModal && selectedTerminal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-semibold text-ink">Edit Terminal</h3>
              <button
                type="button"
                onClick={() => setOpenEditModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-ink cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdateTerminal} className="mt-4 space-y-3">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-ink">Register Name *</label>
                <input
                  type="text"
                  required
                  value={terminalName}
                  onChange={(e) => setTerminalName(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Register Code *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={terminalCode}
                  onChange={(e) => setTerminalCode(e.target.value.toUpperCase())}
                  className="mt-1.5 h-10 w-full font-mono uppercase rounded-lg border border-line bg-surface px-3 text-xs text-ink focus:border-accent focus:outline-hidden"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setOpenEditModal(false)}
                  className="rounded-lg border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-orange-700 cursor-pointer disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
