"use client";

import { formatInr } from "@selfx/types";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Filter,
  Folder,
  Gift,
  Globe,
  Home,
  MapPin,
  Maximize2,
  Minus,
  Monitor,
  Package,
  Pause,
  Phone,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Scale,
  ScanLine,
  ScreenShare,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  Tag,
  Trash2,
  Truck,
  Undo2,
  UserPlus,
  UserRound,
  Volume2,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ReceiptData, ReceiptModal } from "../../components/receipt-modal";
import { claimOrderAnnouncement, ToastContainer, useToast } from "../../components/pos-toast";
import QRCode from "qrcode";
import { PasswordGate } from "../password-gate";
import { usePrintJobPoller } from "../lib/print-transport";

export type SoundTone = "beep" | "click" | "chime" | "pop";

export type PosTheme = "slate" | "charcoal" | "emerald" | "violet" | "amber" | "light";

export type PosSettings = {
  quickAdd: boolean;
  tapSound: boolean;
  soundTone: SoundTone;
  soundVolume: number;
  tapCardToAdd: boolean;
  holdSales: boolean;
  points: boolean;
  enableDiscount: boolean;
  enableKhata: boolean;
  allowOversell: boolean;
  autoPrint: boolean;
  paperSize: "80mm" | "58mm" | "A4";
  showTaxBreakdown: boolean;
  showCustomerOnReceipt: boolean;
  showImages: boolean;
  showStock: boolean;
  showSku: boolean;
  showCategories: boolean;
  showBrands: boolean;
  defaultPayMethod: "cash" | "upi" | "card" | "khata";
  gridColumns: 3 | 4 | 5;
  pageSize: number;
  keyboardShortcuts: boolean;
  cartPosition: "right" | "left";
  posTheme: PosTheme;
};

export const defaultPosSettings: PosSettings = {
  quickAdd: true,
  tapSound: true,
  soundTone: "beep",
  soundVolume: 0.7,
  tapCardToAdd: true,
  holdSales: true,
  points: true,
  enableDiscount: true,
  enableKhata: true,
  allowOversell: true,
  autoPrint: false,
  paperSize: "80mm",
  showTaxBreakdown: true,
  showCustomerOnReceipt: true,
  showImages: true,
  showStock: true,
  showSku: true,
  showCategories: true,
  showBrands: true,
  defaultPayMethod: "cash",
  gridColumns: 4,
  pageSize: 12,
  keyboardShortcuts: true,
  cartPosition: "right",
  posTheme: "slate",
};

const POS_SETTINGS_KEY = "selfx-pos-settings-v2";

function loadPosSettings(): PosSettings {
  if (typeof window === "undefined") return defaultPosSettings;
  try {
    const raw = localStorage.getItem(POS_SETTINGS_KEY);
    if (!raw) return defaultPosSettings;
    const parsed = JSON.parse(raw) as Partial<PosSettings>;
    return {
      ...defaultPosSettings,
      ...parsed,
      allowOversell: parsed.allowOversell ?? true,
      tapSound: parsed.tapSound ?? true,
      cartPosition: parsed.cartPosition ?? "right",
      posTheme: parsed.posTheme ?? "slate",
    };
  } catch {
    return defaultPosSettings;
  }
}

let sharedAudioCtx: AudioContext | null = null;

export function playPosSound(toneType: SoundTone = "beep", volume = 0.7) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      void sharedAudioCtx.resume();
    }
    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const peakGain = Math.max(0.01, Math.min(0.25, volume * 0.14));

    if (toneType === "click") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (toneType === "chime") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.setValueAtTime(1046.5, now + 0.055);
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (toneType === "pop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.05);
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(peakGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    }
  } catch {
    // Ignore audio context restrictions if not yet interacted
  }
}

type Item = {
  id: string;
  name: string;
  sku: string;
  paise: number;
  image?: string | null;
  category?: string | null;
  brand?: string | null;
  onHand?: number;
  trackStock?: boolean;
  batchNumber?: string | null;
  expiresOn?: string | null;
};

function PosScreen() {
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Record<string, number>>({});
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("Counter");
  const [stores, setStores] = useState<{ id: string; name: string; code: string }[]>([]);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [cashRupees, setCashRupees] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptTone, setReceiptTone] = useState<"ok" | "error">("ok");
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<{ type: "queued" | "success" | "error"; message: string } | null>(null);
  const [printFallbackPrompt, setPrintFallbackPrompt] = useState<string | null>(null);
  const [returnNumber, setReturnNumber] = useState("");
  const [returnSale, setReturnSale] = useState<{ id: string; lines: { id: string; name: string; qty: string; line_total_paise?: number }[] } | null>(null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [onKhata, setOnKhata] = useState(false);
  const [quickIds, setQuickIds] = useState<string[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState("");
  const [discountRupees, setDiscountRupees] = useState("");
  const [discountMode, setDiscountMode] = useState<"rupees" | "percent">("rupees");
  const [discountReason, setDiscountReason] = useState("");
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID());
  const [holds, setHolds] = useState<{ id: string; label: string | null; lines: { store_item_id: string; qty: number }[] }[]>([]);
  const [panel, setPanel] = useState<null | "shift" | "customer" | "pay" | "return" | "today" | "holds" | "settings" | "pos-orders">(null);
  const [posOrders, setPosOrders] = useState<any[]>([]);
  const [posOrdersLoading, setPosOrdersLoading] = useState(false);
  const [posOrdersTab, setPosOrdersTab] = useState<"all" | "online" | "counter" | "held">("all");
  const [posOrdersFilter, setPosOrdersFilter] = useState<"all" | "today" | "pending" | "ready" | "completed" | "unpaid">("all");
  const [posOrdersSearch, setPosOrdersSearch] = useState("");
  const [settings, setSettings] = useState<PosSettings>(defaultPosSettings);
  const [receiptFooter, setReceiptFooter] = useState("");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; phone_e164: string | null }[]>([]);
  const [todayPaise, setTodayPaise] = useState(0);
  const [tenderRupees, setTenderRupees] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "upi" | "card" | "wallet" | "other" | "khata" | "upi_qr">("cash");
  const [tipPercent, setTipPercent] = useState<number | null>(0);
  const [customTipRupees, setCustomTipRupees] = useState("");
  const [upiQrModalOpen, setUpiQrModalOpen] = useState(false);
  const [upiQrError, setUpiQrError] = useState<string | null>(null);
  const [posQrProvider, setPosQrProvider] = useState("phonepe");
  const [qrTimerSeconds, setQrTimerSeconds] = useState(300);
  const [activeGateways, setActiveGateways] = useState<string[]>([]);
  const [isSplitTender, setIsSplitTender] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: "cash" | "upi" | "card" | "wallet" | "other" | "khata"; amountRupees: string }[]>([
    { method: "cash", amountRupees: "" },
    { method: "upi", amountRupees: "" },
  ]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [openingRupees, setOpeningRupees] = useState("0");
  const [countedRupees, setCountedRupees] = useState("");
  const [noteCounts, setNoteCounts] = useState<Record<number, string>>({});
  const [page, setPage] = useState(1);
  const [storeUpiVpa, setStoreUpiVpa] = useState<string>("");
  const [storePayeeName, setStorePayeeName] = useState<string>("");
  const [posUpiQrUrl, setPosUpiQrUrl] = useState<string | null>(null);
  const [activePosTxnId, setActivePosTxnId] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [autoCaptureSuccess, setAutoCaptureSuccess] = useState(false);

  useEffect(() => {
    const loaded = loadPosSettings();
    setSettings(loaded);
    setPayMethod(loaded.defaultPayMethod);
  }, []);

  async function switchBranch(newStoreId: string) {
    if (newStoreId === storeId) return;
    const token = csrf();
    await fetch("/api/v1/auth/switch-store", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": token,
      },
      body: JSON.stringify({ store_id: newStoreId }),
    });
    window.location.reload();
  }

  function updateSettings(patch: Partial<PosSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(POS_SETTINGS_KEY, JSON.stringify(next));
      if (storeId) {
        void fetch(`/api/v1/stores/${storeId}/receipt`, {
          method: "PUT",
          credentials: "include",
          headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
          body: JSON.stringify({ receipt_footer: receiptFooter, pos_settings: next }),
        });
      }
      return next;
    });
  }

  function showNotice(msg: string | null, tone: "ok" | "error" = "ok") {
    setReceipt(msg);
    setReceiptTone(tone);
    if (msg) {
      showToast(msg, tone);
    }
  }

  const { toasts, showToast, dismissToast } = useToast();
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loadingReceiptModal, setLoadingReceiptModal] = useState(false);

  async function openPosReceipt(saleId: string) {
    setReceiptModalOpen(true);
    setLoadingReceiptModal(true);
    try {
      const response = await fetch(`/api/v1/sales/${saleId}/receipt`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        const body = (await response.json()) as { data: ReceiptData };
        setActiveReceipt({
          ...body.data,
          order_type: "Dine in",
        });
      }
    } finally {
      setLoadingReceiptModal(false);
    }
  }

  useEffect(() => {
    void (async () => {
      const me = await fetch("/api/v1/auth/staff/me", { credentials: "include", headers: { Accept: "application/json" } });
      if (!me.ok) return;
      const body = (await me.json()) as {
        data?: {
          store?: { id: string; name: string };
          stores?: { id: string; name: string; code: string }[];
        };
      };
      const id = body.data?.store?.id;
      if (!id) return;
      setStoreId(id);
      setStoreName(body.data?.store?.name ?? "Store");

      if (body.data?.stores && body.data.stores.length > 0) {
        setStores(body.data.stores);
      } else {
        void fetch("/api/v1/stores", { credentials: "include", headers: { Accept: "application/json" } })
          .then((r) => r.json())
          .then((stBody) => {
            if (stBody.data?.stores) setStores(stBody.data.stores);
          })
          .catch(() => {});
      }

      const [parked, current, items, keys, receiptRes] = await Promise.all([
        fetch(`/api/v1/stores/${id}/holds`, { credentials: "include", headers: { Accept: "application/json" } }),
        fetch(`/api/v1/stores/${id}/shifts/current`, { credentials: "include", headers: { Accept: "application/json" } }),
        fetch(`/api/v1/stores/${id}/items`, { credentials: "include", headers: { Accept: "application/json" } }),
        fetch(`/api/v1/stores/${id}/quick-keys`, { credentials: "include", headers: { Accept: "application/json" } }),
        fetch(`/api/v1/stores/${id}/receipt`, { credentials: "include", headers: { Accept: "application/json" } }),
      ]);

      if (parked.ok) {
        setHolds(((await parked.json()) as { data: { id: string; label: string | null; lines: { store_item_id: string; qty: number }[] }[] }).data);
      }
      if (current.ok) {
        const shift = (await current.json()) as { data: { status?: string } | null };
        setShiftOpen(shift.data?.status === "open");
      }
      if (receiptRes.ok) {
        const rData = ((await receiptRes.json()) as { data?: { receipt_footer?: string; pos_settings?: Partial<PosSettings> | null; upi_vpa?: string; payee_name?: string; active_payment_gateways?: string[] } }).data;
        if (rData?.receipt_footer != null) setReceiptFooter(rData.receipt_footer);
        if (rData?.upi_vpa) setStoreUpiVpa(rData.upi_vpa);
        if (rData?.payee_name) setStorePayeeName(rData.payee_name);
        if (rData?.active_payment_gateways) setActiveGateways(rData.active_payment_gateways);
        if (rData?.pos_settings) {
          const merged = { ...loadPosSettings(), ...rData.pos_settings, allowOversell: rData.pos_settings.allowOversell ?? true };
          setSettings(merged);
          localStorage.setItem(POS_SETTINGS_KEY, JSON.stringify(merged));
        }
      }
      if (items.ok) {
        const payload = (await items.json()) as {
          data: {
            id: string;
            name: string;
            sku: string;
            selling_price_paise: number;
            category?: string | null;
            brand?: string | null;
            on_hand?: string;
            image?: string | null;
            track_stock?: boolean;
          }[];
        };
        if (payload.data.length === 0) {
          setCatalog([]);
        } else {
          const mapped = payload.data.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            paise: item.selling_price_paise,
            category: item.category,
            brand: item.brand,
            image: item.image,
            onHand: Number(item.on_hand ?? 0),
            trackStock: item.track_stock ?? true,
          }));
          setCatalog(mapped);
          void cacheCatalogLocally(mapped);
          setCategories([...new Set(payload.data.map((item) => item.category).filter((name): name is string => Boolean(name)))]);
          setBrands([...new Set(payload.data.map((item) => item.brand).filter((name): name is string => Boolean(name)))]);
        }
      } else {
        const cached = await loadCachedCatalog();
        if (cached.length > 0) {
          setCatalog(cached);
          showNotice(`Offline mode: loaded ${cached.length} items from local cache`, "ok");
        }
      }
      if (keys.ok) {
        setQuickIds(((await keys.json()) as { data: { store_item_id: string }[] }).data.map((row) => row.store_item_id));
      }
      void loadPosOrders();
    })();

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-pos.js", { scope: "/pos" }).catch(() => {});
    }

    function handleOnline() {
      setIsOnline(true);
      showNotice("Network connection restored. Syncing offline bills...", "ok");
      void sendParked();
    }
    function handleOffline() {
      setIsOnline(false);
      showNotice("Offline mode active. Sales will queue safely in local outbox.", "error");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void readOutbox().then((parked) => setPendingSyncCount(parked.length));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function loadPosOrders(options?: { quiet?: boolean }) {
    const quiet = options?.quiet === true;
    try {
      if (!quiet) setPosOrdersLoading(true);
      const res = await fetch("/api/v1/orders", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json();
        setPosOrders(Array.isArray(body?.data) ? body.data : []);
      }
      if (storeId) {
        const holdsRes = await fetch(`/api/v1/stores/${storeId}/holds`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (holdsRes.ok) {
          const holdsBody = await holdsRes.json();
          if (Array.isArray(holdsBody?.data)) setHolds(holdsBody.data);
        }
      }
    } catch {
      // ignore
    } finally {
      if (!quiet) setPosOrdersLoading(false);
    }
  }

  useEffect(() => {
    const seen = new Set<string>();
    let ready = false;
    const tick = async () => {
      const response = await fetch("/api/v1/orders", { credentials: "include", headers: { Accept: "application/json" } });
      if (!response.ok) return;
      const rows = ((await response.json()) as { data?: { id: string; status?: string; number?: string; channel?: string; payment_status?: string }[] }).data ?? [];
      const fresh = rows.filter((row) => {
        if (row.channel === "counter") return row.status !== "voided";
        return row.payment_status === "captured" || ["placed", "accepted", "packing", "ready", "ready_for_pickup", "out_for_delivery", "completed"].includes(String(row.status));
      });
      if (!ready) {
        fresh.forEach((row) => claimOrderAnnouncement(`paid:${row.id}`));
      } else {
        const created: any[] = [];
        for (const row of fresh) {
          if (seen.has(row.id)) continue;
          if (!claimOrderAnnouncement(`paid:${row.id}`)) continue;
          created.push(row);
          showToast(`Order ${row.number ?? "new"} placed.`, "ok", 3000);
        }
        if (created.length > 0) {
          setPosOrders((current) => {
            const known = new Set(current.map((order) => order.id));
            const added = created.filter((order) => !known.has(order.id));
            if (added.length === 0) return current;
            return [...added, ...current];
          });
        }
      }
      seen.clear();
      fresh.forEach((row) => seen.add(row.id));
      ready = true;
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 5000);
    return () => window.clearInterval(timer);
  }, [showToast]);

  async function transitionPosOrder(orderId: string, toStatus: string) {
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/transitions`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrf(),
        },
        body: JSON.stringify({ to: toStatus }),
      });
      if (res.ok) {
        showNotice(`Order marked as ${toStatus}.`, "ok");
        await loadPosOrders({ quiet: true });
      } else {
        const data = await res.json();
        showNotice(data?.error?.message ?? "Status transition failed.", "error");
      }
    } catch {
      showNotice("Failed to update order status.", "error");
    }
  }

  async function discardHold(holdId: string) {
    if (!storeId) return;
    await fetch(`/api/v1/stores/${storeId}/holds/${holdId}`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json", "X-XSRF-TOKEN": csrf() },
    });
    setHolds((current) => current.filter((row) => row.id !== holdId));
    showNotice("Draft ticket discarded.", "ok");
  }

  const filteredPosOrders = useMemo(() => {
    return posOrders.filter((order) => {
      if (posOrdersTab === "online" && order.channel !== "online") return false;
      if (posOrdersTab === "counter" && order.channel !== "counter") return false;

      if (posOrdersFilter === "pending" && !["placed", "pending"].includes(order.status)) return false;
      if (posOrdersFilter === "ready" && !["ready", "ready_for_pickup", "out_for_delivery"].includes(order.status)) return false;
      if (posOrdersFilter === "completed" && !["delivered", "picked_up", "completed"].includes(order.status)) return false;
      if (posOrdersFilter === "unpaid" && order.payment_status !== "unpaid" && order.payment_status !== "due") return false;
      if (posOrdersFilter === "today") {
        const orderDate = new Date(order.created_at).toDateString();
        const todayDate = new Date().toDateString();
        if (orderDate !== todayDate) return false;
      }

      if (posOrdersSearch.trim()) {
        const q = posOrdersSearch.toLowerCase().trim();
        const matchNum = String(order.number || "").toLowerCase().includes(q);
        const matchCust = String(order.customer_name || "").toLowerCase().includes(q);
        const matchPhone = String(order.customer_phone || "").toLowerCase().includes(q);
        const matchAddress = String(order.address || "").toLowerCase().includes(q);
        return matchNum || matchCust || matchPhone || matchAddress;
      }

      return true;
    });
  }, [posOrders, posOrdersTab, posOrdersFilter, posOrdersSearch]);

  function printPackingSlip(order: any) {
    const popup = window.open("", "_blank", "width=420,height=650");
    if (!popup) return;
    const rows = (order.lines || []).map((l: any) => `<tr><td style="font-size:13px;font-weight:600;padding:6px 0;border-bottom:1px dashed #ccc">${l.qty}x ${l.name}</td><td style="text-align:right;padding:6px 0;border-bottom:1px dashed #ccc;font-family:monospace">₹${(((l.total_paise || (l.qty * (l.unit_price_paise || 0))) || 0) / 100).toFixed(2)}</td></tr>`).join("");
    const customerInfo = order.customer_name ? `<p style="margin:4px 0"><strong>Customer:</strong> ${order.customer_name} ${order.customer_phone ? `(${order.customer_phone})` : ""}</p>` : "";
    const addressInfo = order.address ? `<p style="margin:4px 0;font-size:11px;color:#555"><strong>Delivery Address:</strong> ${order.address}${order.city ? `, ${order.city}` : ""}${order.pincode ? ` - ${order.pincode}` : ""}</p>` : "";
    const notesInfo = order.order_notes ? `<p style="margin:4px 0;font-size:11px;background:#f5f5f5;padding:4px"><strong>Notes:</strong> ${order.order_notes}</p>` : "";

    popup.document.write(`<!doctype html><html><head><title>Packing Slip - ${order.number}</title><style>body{font-family:Inter,sans-serif;width:76mm;margin:12px auto;color:#1a1d23}h2{text-align:center;margin:4px 0;font-size:15px;text-transform:uppercase}p{margin:3px 0;font-size:12px}table{width:100%;margin:10px 0;border-collapse:collapse}</style></head><body><h2>*** PACKING SLIP ***</h2><p><strong>Order:</strong> ${order.number}</p><p><strong>Channel:</strong> ${(order.channel === "online" ? "Online Storefront" : "POS Counter")} · ${(order.fulfillment || "Store Pickup").toUpperCase()}</p><p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>${customerInfo}${addressInfo}${notesInfo}<table style="margin-top:8px">${rows}</table><div style="border-top:1px solid #000;margin-top:8px;padding-top:4px;display:flex;justify-content:space-between;font-size:13px"><strong>Total Amount:</strong><strong style="font-family:monospace">₹${((order.total_paise || 0) / 100).toFixed(2)}</strong></div><p style="text-align:center;margin-top:16px;font-size:10px;color:#888">Verified & Packed by Retail Staff</p></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function printOrderReceipt(order: any) {
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) return;
    const rows = (order.lines || []).map((l: any) => `<tr><td style="padding:6px 0;border-bottom:1px dashed #ccc">${l.name}<br><span style="font-size:11px;color:#666">${l.qty} × ₹${((l.unit_price_paise || 0) / 100).toFixed(2)}</span></td><td style="text-align:right;padding:6px 0;border-bottom:1px dashed #ccc">₹${(((l.total_paise || (l.qty * (l.unit_price_paise || 0))) || 0) / 100).toFixed(2)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><title>${order.number}</title><style>body{font-family:Inter,sans-serif;width:76mm;margin:16px auto;color:#1a1d23}h1{font-size:16px;text-align:center;margin-bottom:4px}table{width:100%;border-collapse:collapse;font-size:13px;margin:10px 0}.muted{color:#5c6570;font-size:12px;text-align:center;margin:2px 0}</style></head><body><h1>${order.store_name || "SelfX Store"}</h1><p class="muted">${order.number}<br>${new Date(order.created_at).toLocaleString()}</p>${order.customer_name ? `<p class="muted">Customer: ${order.customer_name}</p>` : ""}<table>${rows}</table><p style="display:flex;justify-content:space-between;font-size:15px;margin-top:8px"><strong>Total</strong> <strong>₹${((order.total_paise || 0) / 100).toFixed(2)}</strong></p><p class="muted">${receiptFooter || "Thank you for shopping with us!"}</p></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function parseScaleBarcode(raw: string): { sku: string; qty: number; isScale: boolean; pricePaise?: number } {
    const code = raw.trim();
    if ((code.length === 12 || code.length === 13) && /^(02|2[0-9])\d{10,11}$/.test(code)) {
      const prefix = code.slice(0, 2);
      const plu = code.slice(2, 7);
      const rawVal = parseInt(code.slice(7, 12), 10);
      if (prefix === "21" || prefix === "22") {
        return { sku: plu, qty: 1, pricePaise: rawVal * 100, isScale: true };
      }
      const weightKg = rawVal > 0 ? rawVal / 1000 : 1;
      return { sku: plu, qty: Math.max(0.001, Number(weightKg.toFixed(3))), isScale: true };
    }
    return { sku: code, qty: 1, isScale: false };
  }

  function kickCashDrawer() {
    try {
      const kickBytes = [0x1B, 0x70, 0x00, 0x19, 0xFA]; // ESC p 0 25 250
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel("selfx_hardware_bridge");
        channel.postMessage({ type: "CASH_DRAWER_KICK", bytes: kickBytes });
        channel.close();
      }
      showNotice("Cash drawer kicked open (ESC/POS pin 2)", "ok");
    } catch {
      // ignore
    }
  }

  // Live Weighing Scale state & WebSerial driver
  const [liveWeightKg, setLiveWeightKg] = useState<number>(0);
  const [isScaleConnected, setIsScaleConnected] = useState(false);
  const [scaleModalOpen, setScaleModalOpen] = useState(false);
  const [scaleStatusText, setScaleStatusText] = useState("Disconnected");

  async function connectScale() {
    if (typeof window === "undefined") return;
    if (!("serial" in navigator)) {
      setScaleStatusText("Web Serial not supported in this browser. Please use Chrome, Edge, or Brave.");
      return;
    }
    try {
      setScaleStatusText("Requesting COM / USB Serial Port...");
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: "none" });
      setIsScaleConnected(true);
      setScaleStatusText("Connected: Streaming live weight from scale");
      showNotice("Weighing scale connected via COM Serial", "ok");

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();

      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split(/[\r\n]+/);
          buffer = lines.pop() || "";
          for (const line of lines) {
            const match = line.match(/([+-]?\s*\d+\.\d{2,3})/);
            if (match && match[1]) {
              const parsed = parseFloat(match[1].replace(/\s+/g, ""));
              if (!isNaN(parsed) && parsed >= 0) {
                setLiveWeightKg(parsed);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.warn("Serial scale error:", err);
      setScaleStatusText(`Scale status: ${err?.message || err}`);
      setIsScaleConnected(false);
    }
  }

  function simulateScaleWeight(weight: number) {
    setLiveWeightKg(weight);
    setIsScaleConnected(true);
    setScaleStatusText(`Simulated: ${weight.toFixed(3)} kg`);
    showNotice(`Weighing scale set to ${weight.toFixed(3)} kg`, "ok");
  }

  async function scan(code: string) {
    if (!storeId || code.trim().length < 2) return;
    const { sku: parsedCode, qty: scaleQty, isScale } = parseScaleBarcode(code);

    const localMatch = catalog.find((row) => 
      row.sku.toLowerCase() === parsedCode.toLowerCase() ||
      row.sku.toLowerCase().endsWith(parsedCode.toLowerCase()) ||
      row.id.toLowerCase() === parsedCode.toLowerCase()
    );
    if (localMatch) {
      add(localMatch.id, isScale ? scaleQty : 1);
      if (isScale) {
        showNotice(`Weighed scale item: ${localMatch.name} (${scaleQty} kg)`, "ok");
      }
      setQuery("");
      return;
    }
    const response = await fetch(`/api/v1/stores/${storeId}/pos/lookup?code=${encodeURIComponent(parsedCode)}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const body = (await response.json()) as { data: { id: string; name: string; sku: string; selling_price_paise: number } };
    const item: Item = { id: body.data.id, name: body.data.name, sku: body.data.sku, paise: body.data.selling_price_paise };
    setCatalog((current) => (current.some((row) => row.id === item.id) ? current : [item, ...current]));
    add(item.id, isScale ? scaleQty : 1);
    setQuery("");
  }

  function csrf(): string {
    return decodeURIComponent(document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "");
  }

  usePrintJobPoller({
    storeId,
    enabled: Boolean(storeId),
    intervalMs: 3000,
    csrfToken: typeof document !== "undefined" ? csrf() : "",
    onJobStarted: (job) => {
      setPrintStatus({
        type: "queued",
        message: `Printing receipt #${job.id.slice(0, 8)}...`,
      });
    },
    onJobProcessed: (job, transport) => {
      setPrintStatus({
        type: "success",
        message: `Receipt printed successfully (#${job.id.slice(0, 8)}) via ${
          transport === "agent" ? "Print Agent" : transport === "browser_raw" ? "WebUSB" : "Print Dialog"
        }`,
      });
      showToast(
        `Receipt #${job.id.slice(0, 8)} printed via ${
          transport === "agent" ? "Print Agent" : transport === "browser_raw" ? "WebUSB" : "Print Dialog"
        }`,
        "ok",
      );
      setTimeout(() => {
        setPrintStatus(null);
      }, 6000);
    },
    onFallbackPrompt: (_job, reason) => {
      setPrintFallbackPrompt(reason);
    },
  });

  async function openShift() {
    if (!storeId) return;
    const response = await fetch(`/api/v1/stores/${storeId}/shifts/open`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({ opening_cash_paise: Math.round(Number(openingRupees || 0) * 100) }),
    });
    if (response.ok) {
      setShiftOpen(true);
      setPanel(null);
      showNotice("Shift is now open.", "ok");
    }
  }

  async function moveCash(direction: "in" | "out") {
    if (!storeId) return;
    const response = await fetch(`/api/v1/stores/${storeId}/shifts/cash`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({
        direction,
        amount_paise: Math.round(Number(cashRupees) * 100),
        reason: cashReason,
      }),
    });
    const body = (await response.json()) as { data?: { expected_paise: number }; error?: { message: string } };
    showNotice(
      response.ok ? `Drawer ${formatInr(body.data?.expected_paise ?? 0)}` : (body.error?.message ?? "The cash movement was not saved."),
      response.ok ? "ok" : "error",
    );
  }

  async function pay() {
    if (!storeId || total === 0) return;
    const method = payMethod;
    if (method === "khata" && !customer) {
      showNotice("A khata sale needs a customer.", "error");
      return;
    }
    if (!shiftOpen) {
      await fetch(`/api/v1/stores/${storeId}/shifts/open`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
        body: JSON.stringify({ opening_cash_paise: 0 }),
      }).then((res) => {
        if (res.ok) setShiftOpen(true);
      });
    }
    const discountPaise = manualDiscountPaise;
    const payable = totalDuePaise;

    let finalPayments: { method: string; amount_paise: number }[] | undefined = undefined;
    let cashTender = 0;

    const actualMethod = payMethod === "upi_qr" ? "upi" : payMethod;

    if (isSplitTender) {
      const activeRows = splitPayments
        .filter((row) => Number(row.amountRupees) > 0)
        .map((row) => ({
          method: (row.method as string) === "upi_qr" ? "upi" : row.method,
          amount_paise: Math.round(Number(row.amountRupees) * 100),
        }));
      const enteredTotal = activeRows.reduce((sum, r) => sum + r.amount_paise, 0);
      if (enteredTotal < payable) {
        showNotice(`Payment is short. Total due: ₹${(payable / 100).toFixed(2)}, entered: ₹${(enteredTotal / 100).toFixed(2)}`, "error");
        return;
      }
      const cashPart = activeRows.find((r) => r.method === "cash");
      cashTender = cashPart ? cashPart.amount_paise : 0;
      finalPayments = activeRows;
    } else {
      const typed = Math.round(Number(tenderRupees || 0) * 100);
      cashTender = actualMethod === "cash" ? Math.max(typed, payable) : 0;
      if (actualMethod !== "cash") {
        finalPayments = [{ method: actualMethod, amount_paise: payable }];
      }
    }

    const payload = {
      client_uuid: clientUuid,
      cash_tender_paise: cashTender,
      customer_id: customer?.id ?? null,
      loyalty_points: customer && Number(loyaltyPoints) > 0 ? Number(loyaltyPoints) : 0,
      discount_paise: discountPaise,
      discount_reason: discountPaise > 0 ? (discountReason.trim() || (discountMode === "percent" ? `${discountRupees}% POS Discount` : `₹${discountRupees} POS Discount`)) : discountReason,
      lines: entries.map((item) => ({
        store_item_id: item.id,
        qty: lines[item.id],
        batch_number: item.batchNumber ?? null,
        expires_on: item.expiresOn ?? null,
      })),
      ...(finalPayments ? { payments: finalPayments } : {}),
      oversell: settings.allowOversell,
    };
    let response: Response;
    try {
      response = await fetch(`/api/v1/stores/${storeId}/sales`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
        body: JSON.stringify(payload),
      });
    } catch {
      if (onKhata || method === "khata") {
        showNotice("A khata bill needs a connection.", "error");
        return;
      }
      const offlineNum = `OFF-${Date.now().toString().slice(-6)}`;
      await saveOutbox({ client_uuid: clientUuid, cash_tender_paise: payable, lines: payload.lines });
      setPendingSyncCount((prev) => prev + 1);
      showNotice(`Recorded offline (${offlineNum}). Queued in local outbox.`, "ok");
      setLines({});
      setClientUuid(crypto.randomUUID());
      setPanel(null);
      return;
    }
    const body = (await response.json()) as { data?: { id: string; number: string }; error?: { message: string } };
    if (!response.ok) {
      showNotice(body.error?.message ?? "Sale was not completed.", "error");
      if (body.error?.message?.includes("shift")) setShiftOpen(false);
      return;
    }
    if (settings.tapSound) playPosSound("chime", settings.soundVolume);
    if (!body.data?.id || claimOrderAnnouncement(`paid:${body.data.id}`)) {
      showToast(`Order ${body.data?.number ?? "new"} placed.`, "ok", 3000);
    }
    setLastSaleId(body.data?.id ?? null);
    setPrintStatus({
      type: "queued",
      message: `Printing receipt for order ${body.data?.number ?? ""}...`,
    });
    kickCashDrawer();
    setCatalog((prev) =>
      prev.map((item) => {
        const soldQty = lines[item.id] ?? 0;
        if (soldQty > 0 && item.onHand != null) {
          return { ...item, onHand: item.onHand - soldQty };
        }
        return item;
      }),
    );
    setLines({});
    setDiscountRupees("");
    setDiscountReason("");
    setLoyaltyPoints("");
    setClientUuid(crypto.randomUUID());
    setPanel(null);
    if (body.data?.id) {
      void openPosReceipt(body.data.id);
    }
  }

  async function sendParked() {
    if (!storeId) {
      showNotice("Sign in to the store before sending parked bills.", "error");
      return;
    }
    const parked = await readOutbox();
    if (parked.length === 0) {
      showNotice("No bills are waiting on this counter.", "ok");
      return;
    }
    const response = await fetch(`/api/v1/stores/${storeId}/sales/sync`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({ sales: parked }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: { message: string } };
      showNotice(body.error?.message ?? "Parked bills were not sent.", "error");
      return;
    }
    await clearOutbox();
    showNotice(`Sent ${parked.length} parked bill${parked.length === 1 ? "" : "s"}.`, "ok");
  }

  async function exchangeBill() {
    if (!storeId || !returnSale || entries.length === 0) return;
    const response = await fetch(`/api/v1/sales/${returnSale.id}/exchange`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({
        reason: "Exchange",
        client_uuid: crypto.randomUUID(),
        cash_tender_paise: total,
        lines: returnSale.lines.map((line) => ({ sale_line_id: line.id, qty: 1 })),
        replacement: entries.map((item) => ({ store_item_id: item.id, qty: lines[item.id] })),
      }),
    });
    const body = (await response.json()) as { data?: { sale?: { number: string } }; error?: { message: string } };
    showNotice(
      response.ok ? `Exchange ${body.data?.sale?.number}` : (body.error?.message ?? "The exchange was not completed."),
      response.ok ? "ok" : "error",
    );
    if (response.ok) {
      setLines({});
      setReturnSale(null);
    }
  }

  async function park() {
    const bill = catalog.filter((item) => (lines[item.id] ?? 0) > 0);
    if (!storeId || bill.length === 0) return;
    const response = await fetch(`/api/v1/stores/${storeId}/holds`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({
        label: customer ? `${customer.name} (${count} items)` : `Counter (${count} items)`,
        lines: bill.map((item) => ({ store_item_id: item.id, qty: lines[item.id] })),
      }),
    });
    if (!response.ok) return;
    setLines({});
    showNotice("Bill parked in drafts.", "ok");
    const parked = await fetch(`/api/v1/stores/${storeId}/holds`, { credentials: "include", headers: { Accept: "application/json" } });
    if (parked.ok) setHolds(((await parked.json()) as { data: { id: string; label: string | null; lines: { store_item_id: string; qty: number }[] }[] }).data);
  }

  async function recall(hold: { id: string; lines: { store_item_id: string; qty: number }[] }) {
    if (!storeId) return;
    const next: Record<string, number> = {};
    hold.lines.forEach((line) => {
      next[line.store_item_id] = line.qty;
    });
    setLines(next);
    await fetch(`/api/v1/stores/${storeId}/holds/${hold.id}`, {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json", "X-XSRF-TOKEN": csrf() },
    });
    setHolds((current) => current.filter((row) => row.id !== hold.id));
  }

  async function voidLast() {
    if (!lastSaleId) return;
    const reason = window.prompt("Reason for voiding this bill");
    if (!reason) return;
    const response = await fetch(`/api/v1/sales/${lastSaleId}/void`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({ reason }),
    });
    const body = (await response.json()) as { error?: { message: string } };
    showNotice(response.ok ? "Bill voided." : (body.error?.message ?? "The bill was not voided."), response.ok ? "ok" : "error");
    if (response.ok) setLastSaleId(null);
  }

  async function closeShift() {
    if (!storeId) return;
    const notes = [50000, 20000, 10000, 5000, 2000, 1000, 500, 100]
      .map((value) => ({ value_paise: value, count: Number(noteCounts[value] || 0) }))
      .filter((note) => note.count > 0);
    const countedFromNotes = notes.reduce((sum, note) => sum + note.value_paise * note.count, 0);
    const actual = notes.length > 0 ? countedFromNotes : Math.round(Number(countedRupees || 0) * 100);
    const response = await fetch(`/api/v1/stores/${storeId}/shifts/close`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({ actual_cash_paise: actual, ...(notes.length > 0 ? { denominations: notes } : {}) }),
    });
    const body = (await response.json()) as { data?: { expected_cash_paise: number; difference_paise: number }; error?: { message: string } };
    if (!response.ok) {
      showNotice(body.error?.message ?? "The shift was not closed.", "error");
      return;
    }
    setShiftOpen(false);
    setPanel(null);
    showNotice(`Expected ${formatInr(body.data?.expected_cash_paise ?? 0)}. Difference ${formatInr(body.data?.difference_paise ?? 0)}.`, "ok");
  }

  async function findInvoice() {
    if (!storeId || returnNumber.trim() === "") return;
    const response = await fetch(`/api/v1/stores/${storeId}/sales/find?number=${encodeURIComponent(returnNumber.trim())}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      showNotice("Invoice not found.", "error");
      setReturnSale(null);
      return;
    }
    const body = (await response.json()) as { data: { id: string; lines: { id: string; name: string; qty: string }[] } };
    setReturnSale(body.data);
  }

  async function returnLine(lineId: string) {
    if (!returnSale) return;
    const response = await fetch(`/api/v1/sales/${returnSale.id}/returns`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({ reason: "Customer return", lines: [{ sale_line_id: lineId, qty: 1 }] }),
    });
    const body = (await response.json()) as { data?: { number: string }; error?: { message: string } };
    showNotice(response.ok ? `Credit note ${body.data?.number}` : (body.error?.message ?? "Return was not accepted."), response.ok ? "ok" : "error");
  }

  async function attachCustomer() {
    const response = await fetch("/api/v1/customers", {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({ name: customerQuery || "Walk-in", phone: customerQuery }),
    });
    if (!response.ok) {
      const found = await fetch(`/api/v1/customers?q=${encodeURIComponent(customerQuery)}`, { credentials: "include", headers: { Accept: "application/json" } });
      if (!found.ok) return;
      const body = (await found.json()) as { data: { id: string; name: string }[] };
      if (body.data[0]) setCustomer(body.data[0]);
      return;
    }
    setCustomer(((await response.json()) as { data: { id: string; name: string } }).data);
  }

  const visible = catalog.filter((item) => {
    const text = item.name.toLowerCase().includes(query.toLowerCase()) || item.sku.toLowerCase().includes(query.toLowerCase());
    return text && (category === "all" || item.category === category) && (brand === "all" || item.brand === brand);
  });
  const pageSize = Math.max(4, Number(settings.pageSize) || 12);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const pageItems = visible.slice((page - 1) * pageSize, page * pageSize);
  const entries = catalog.filter((item) => (lines[item.id] ?? 0) > 0);
  const total = entries.reduce((sum, item) => sum + item.paise * (lines[item.id] ?? 0), 0);

  const count = useMemo(() => Object.values(lines).reduce((sum, qty) => sum + qty, 0), [lines]);

  function add(id: string, qtyDelta = 1) {
    const item = catalog.find((row) => row.id === id);
    const next = (lines[id] ?? 0) + qtyDelta;
    if (
      item &&
      !settings.allowOversell &&
      item.trackStock !== false &&
      item.onHand != null &&
      item.onHand > 0 &&
      next > item.onHand + 0.0001
    ) {
      showNotice("Not enough stock is available to sell.", "error");
      return;
    }
    if (settings.tapSound) playPosSound(settings.soundTone, settings.soundVolume);
    if (receipt && receiptTone === "error") setReceipt(null);
    setLines((current) => ({ ...current, [id]: Number(((current[id] ?? 0) + qtyDelta).toFixed(3)) }));
  }

  function change(id: string, delta: number) {
    if (delta > 0) {
      add(id);
      return;
    }
    if (settings.tapSound) playPosSound(settings.soundTone, settings.soundVolume);
    if (receipt && receiptTone === "error") setReceipt(null);
    setLines((current) => {
      const next = Math.max(0, (current[id] ?? 0) + delta);
      return { ...current, [id]: next };
    });
  }

  async function openCustomers() {
    const response = await fetch(`/api/v1/customers?q=${encodeURIComponent(customerQuery)}`, { credentials: "include", headers: { Accept: "application/json" } });
    if (response.ok) setCustomers(((await response.json()) as { data: { id: string; name: string; phone_e164: string | null }[] }).data);
    setPanel("customer");
  }

  async function openToday() {
    const response = await fetch("/api/v1/reports/dashboard", { credentials: "include", headers: { Accept: "application/json" } });
    if (response.ok) setTodayPaise(((await response.json()) as { data: { sales_paise: number } }).data.sales_paise);
    setPanel("today");
  }

  async function previewReceipt(saleId: string) {
    const response = await fetch(`/api/v1/sales/${saleId}/receipt`, { credentials: "include", headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const bill = ((await response.json()) as {
      data: {
        number: string;
        store: string;
        created_at: string;
        lines: { name: string; qty: string; total_paise: number }[];
        total_paise: number;
        cgst_paise: number;
        sgst_paise: number;
        tender_paise: number;
        change_paise: number;
        footer: string;
      };
    }).data;
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) return;
    const widthCss = settings.paperSize === "58mm" ? "58mm" : settings.paperSize === "A4" ? "180mm" : "76mm";
    const rows = bill.lines.map((line) => `<tr><td>${line.name}<br><span>Qty: ${line.qty}</span></td><td>${(line.total_paise / 100).toFixed(2)}</td></tr>`).join("");
    const taxRow = settings.showTaxBreakdown
      ? `<p>CGST ₹${(bill.cgst_paise / 100).toFixed(2)} · SGST ₹${(bill.sgst_paise / 100).toFixed(2)}</p>`
      : "";
    const customerRow = settings.showCustomerOnReceipt && customer ? `<p class="muted">Customer: ${customer.name}</p>` : "";
    popup.document.write(`<!doctype html><html><head><title>${bill.number}</title><style>body{font-family:Inter,sans-serif;width:${widthCss};margin:16px auto;color:#1a1d23}h1{font-size:16px;text-align:center;margin-bottom:4px}table{width:100%;border-collapse:collapse;font-size:13px;margin:10px 0}td{padding:6px 0;border-bottom:1px dashed #ccc}td:last-child{text-align:right;font-variant-numeric:tabular-nums}.muted{color:#5c6570;font-size:12px;text-align:center;margin:2px 0}</style></head><body><h1>${bill.store}</h1><p class="muted">${bill.number}<br>${bill.created_at}</p>${customerRow}<table>${rows}</table>${taxRow}<p><strong>Total ₹${(bill.total_paise / 100).toFixed(2)}</strong></p><p>Paid ₹${(bill.tender_paise / 100).toFixed(2)} · Change ₹${(bill.change_paise / 100).toFixed(2)}</p><p class="muted">${bill.footer || receiptFooter || "Thank you for shopping with us!"}</p></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  const [taxPercent, setTaxPercent] = useState("0");
  const [shippingRupees, setShippingRupees] = useState("0");
  const [promoCode, setPromoCode] = useState("");

  const gridColsClass =
    settings.gridColumns === 3
      ? "grid-cols-2 xl:grid-cols-3"
      : settings.gridColumns === 5
        ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
        : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

  const manualDiscountPaise = useMemo(() => {
    const raw = Number(discountRupees || 0);
    if (isNaN(raw) || raw <= 0) return 0;
    if (discountMode === "percent") {
      const pct = Math.min(100, Math.max(0, raw));
      return Math.round((total * pct) / 100);
    }
    return Math.min(total, Math.round(raw * 100));
  }, [discountRupees, discountMode, total]);
  const shippingPaise = Math.max(0, Math.round(Number(shippingRupees || 0) * 100));
  const extraTaxPaise = Math.max(
    0,
    Math.round((( Math.max(0, total - manualDiscountPaise) ) * Number(taxPercent || 0)) / 100),
  );
  const netPayablePaise = Math.max(0, total - manualDiscountPaise + extraTaxPaise + shippingPaise);

  const tipPaise = useMemo(() => {
    if (customTipRupees !== "" && !isNaN(Number(customTipRupees))) {
      return Math.round(Number(customTipRupees) * 100);
    }
    if (tipPercent && tipPercent > 0) {
      return Math.round((netPayablePaise * tipPercent) / 100);
    }
    return 0;
  }, [netPayablePaise, tipPercent, customTipRupees]);

  const totalDuePaise = netPayablePaise + tipPaise;

  const posTempOrderRef = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `ORD-${y}${m}${day}${rand}`;
  }, [panel]);

  const gatewayOn = (name: string) => activeGateways.some((g) => g.toLowerCase() === name);
  const hasDynamicQr = ["phonepe", "paytm", "razorpay", "stripe"].some((name) => gatewayOn(name));
  const hasManualUpi = gatewayOn("upi_qr");

  // UPI QR Countdown timer
  useEffect(() => {
    if (!upiQrModalOpen) {
      setQrTimerSeconds(300);
      return;
    }
    const timer = setInterval(() => {
      setQrTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [upiQrModalOpen]);

  // Thermal QR Slip Print function
  const printPosUpiQrSlip = () => {
    if (!posUpiQrUrl) return;
    const w = window.open("", "_blank", "width=320,height=480");
    if (!w) return;
    const totalStr = (totalDuePaise / 100).toFixed(2);
    const vpaStr = storeUpiVpa || "";
    const nameStr = storePayeeName || storeName || "Store";
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>UPI QR Slip</title>
          <style>
            body { font-family: monospace; text-align: center; margin: 0; padding: 12px; font-size: 12px; }
            .store { font-weight: bold; font-size: 15px; margin-bottom: 4px; }
            .amount { font-size: 20px; font-weight: bold; margin: 8px 0; }
            .qr { width: 180px; height: 180px; margin: 6px auto; display: block; }
            .vpa { font-weight: bold; word-break: break-all; margin-top: 6px; }
            .footer { font-size: 10px; color: #555; margin-top: 10px; border-top: 1px dashed #999; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="store">${nameStr}</div>
          <div>SCAN TO PAY VIA UPI</div>
          <div class="amount">₹${totalStr}</div>
          <img class="qr" src="${posUpiQrUrl}" />
          <div class="vpa">UPI ID: ${vpaStr}</div>
          <div class="footer">Scan with GPay, PhonePe, Paytm, BHIM</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    w.document.close();
  };

  // Generate PhonePe Mercury DQR or Local fallback
  useEffect(() => {
    if (!upiQrModalOpen || totalDuePaise <= 0 || !storeId) return;

    let cancelled = false;
    setQrGenerating(true);
    setUpiQrError(null);
    setAutoCaptureSuccess(false);

    // Call server to generate official gateway Dynamic QR (PhonePe Mercury DQR)
    const qrParams = new URLSearchParams({
      amount_paise: String(Math.round(totalDuePaise)),
      order_ref: posTempOrderRef,
    });
    fetch(`/api/v1/stores/${storeId}/receipt?${qrParams.toString()}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        return { ok: res.ok, body };
      })
      .then(async ({ ok, body }) => {
        if (cancelled) return;
        const d = body?.data;
        if (ok && d?.qr_string && d?.success !== false) {
          if (typeof d.vpa === "string" && d.vpa.includes("@")) setStoreUpiVpa(d.vpa);
          if (d.payee_name) setStorePayeeName(d.payee_name);
          if (d.provider) setPosQrProvider(d.provider);
          if (d.transaction_id) setActivePosTxnId(d.transaction_id);

          const url = await QRCode.toDataURL(d.qr_string, {
            width: 320,
            margin: 1,
            errorCorrectionLevel: "L",
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          if (!cancelled) setPosUpiQrUrl(url);
        } else if (!cancelled) {
          setPosUpiQrUrl(null);
          setUpiQrError(
            d?.error ||
              (Array.isArray(d?.active_payment_gateways)
                ? "This server is still serving the previous POS build. Deploy the latest backend, then open the QR again."
                : "") ||
              body?.error?.message ||
              body?.message ||
              (!ok ? "The POS could not ask PhonePe for a QR. Stay signed in and try again." : "PhonePe did not return a QR. Check the Merchant ID, salt key, salt index, and Provider ID, then turn PhonePe on in Live mode."),
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPosUpiQrUrl(null);
        setUpiQrError("Could not reach the payment service. Check that PhonePe is turned on and try again.");
      })
      .finally(() => {
        if (!cancelled) setQrGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [upiQrModalOpen, totalDuePaise, storeId, posTempOrderRef]);

  // Dynamic QR auto-status polling
  useEffect(() => {
    if (!upiQrModalOpen || !activePosTxnId || !storeId || autoCaptureSuccess) return;

    const poll = setInterval(() => {
      const statusParams = new URLSearchParams({
        transaction_id: activePosTxnId,
        provider: posQrProvider || "phonepe",
      });
      fetch(`/api/v1/stores/${storeId}/receipt?${statusParams.toString()}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((body) => {
          if (body?.data?.paid === true) {
            clearInterval(poll);
            setAutoCaptureSuccess(true);
            if (settings.tapSound) playPosSound("chime", settings.soundVolume);
            showNotice("Payment confirmed. Completing the sale...", "ok");
            setTimeout(async () => {
              setPayMethod("upi");
              setUpiQrModalOpen(false);
              await pay();
            }, 1000);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(poll);
  }, [upiQrModalOpen, activePosTxnId, storeId, autoCaptureSuccess, settings, posQrProvider]);

  useEffect(() => {
    try {
      const cfdItems = Object.entries(lines).map(([id, qty]) => {
        const item = catalog.find((row) => row.id === id);
        const unitPricePaise = item?.paise ?? 0;
        return {
          id,
          name: item?.name ?? "Item",
          sku: item?.sku ?? "",
          unitPricePaise,
          qty,
          lineTotalPaise: Math.round(unitPricePaise * qty),
        };
      });

      const cfdPayload = {
        storeName: storeName || "SelfX Retail Flagship",
        storeTagline: "Counter Checkout Terminal",
        customerName: customer?.name ?? null,
        items: cfdItems,
        subtotalPaise: total,
        taxPaise: extraTaxPaise,
        discountPaise: manualDiscountPaise,
        totalPaise: netPayablePaise,
        status: panel === "pay" ? "payment" : cfdItems.length > 0 ? "scanning" : "idle",
        invoiceNumber: lastSaleId ? `INV-${lastSaleId.slice(-4).toUpperCase()}` : undefined,
      };

      if (typeof window !== "undefined") {
        window.localStorage.setItem("selfx_pos_cfd_state", JSON.stringify(cfdPayload));
        if ("BroadcastChannel" in window) {
          const ch = new BroadcastChannel("selfx_pos_cfd");
          ch.postMessage(cfdPayload);
          ch.close();
        }
      }
    } catch {
      // ignore
    }
  }, [lines, catalog, total, extraTaxPaise, manualDiscountPaise, netPayablePaise, panel, storeName, customer, lastSaleId]);

  function resolveProductImage(item: Item): string | null {
    if (item.image) return item.image;
    const n = item.name.toLowerCase();
    if (n.includes("coffee") || n.includes("tea") || n.includes("nescafe")) return "/products/coffee.jpg";
    if (n.includes("orange") || n.includes("juice") || n.includes("drink")) return "/products/orange.jpg";
    if (n.includes("milk") || n.includes("curd") || n.includes("paneer") || n.includes("dairy")) return "/products/milk.jpg";
    if (n.includes("apple") || n.includes("fruit") || n.includes("banana")) return "/products/apples.jpg";
    if (n.includes("rice") || n.includes("atta") || n.includes("dal") || n.includes("grain")) return "/products/rice.jpg";
    if (n.includes("bread") || n.includes("cake") || n.includes("croissant") || n.includes("biscuit")) return "/products/bread.jpg";
    return null;
  }

  function toggleFullscreen() {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
    } else {
      void document.exitFullscreen().catch(() => {});
    }
  }

  const themeContainerClass = {
    slate: "bg-[#0f172a] text-slate-100",
    charcoal: "bg-[#18181b] text-zinc-100",
    emerald: "bg-[#022c22] text-emerald-50",
    violet: "bg-[#1e1b4b] text-purple-50",
    amber: "bg-[#451a03] text-amber-50",
    light: "bg-[#f4f6fa] text-[#1e293b]",
  }[settings.posTheme || "slate"];

  return (
    <div className={`flex h-screen flex-col overflow-hidden select-none transition-colors duration-200 ${themeContainerClass}`} data-pos-theme={settings.posTheme}>
      {/* =====================================================================
          TOP POS HEADER BAR (Matches Image 1)
         ===================================================================== */}
      <header className="flex h-[62px] shrink-0 items-center justify-between gap-3 border-b border-[#e5e8f0] bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Left Controls: Brand Icon + Register Status + Warehouse + Categories + Brands */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/"
            aria-label="Home"
            className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-[#6366f1] to-[#7c3aed] text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            S
          </a>

          <div className="flex items-center gap-2 pr-1">
            <span className="text-[14px] font-semibold tracking-tight text-slate-800">Register</span>
            <button
              type="button"
              onClick={() => setPanel("shift")}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold tracking-wide transition ${
                shiftOpen
                  ? " border border-emerald-200 bg-[#ecfdf5] text-[#059669]"
                  : "border border-rose-200 bg-[#fff1f2] text-[#e11d48]"
              }`}
            >
              <span className={`size-1.5 rounded-full ${shiftOpen ? "bg-[#059669]" : "bg-[#e11d48]"}`} />
              {shiftOpen ? "OPEN" : "CLOSED"}
            </button>
          </div>

          {/* Branch Selection Dropdown (Matches Image 3) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="inline-flex h-10 items-center gap-2.5 rounded-full border border-[#bae6fd] bg-[#f0f9ff] pl-1.5 pr-3.5 transition hover:border-[#0284c7] hover:bg-[#e0f2fe] text-left cursor-pointer"
            >
              <span className="grid size-7 place-items-center rounded-full bg-[#0284c7] text-white shadow-2xs">
                <Store size={14} />
              </span>
              <div className="leading-tight">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#0369a1]">Branch</p>
                <p className="flex items-center gap-1 text-[12px] font-semibold text-slate-800">
                  <span className="max-w-[130px] truncate">{storeName || "Main Branch"}</span>
                  <ChevronDown size={12} className="text-slate-400" />
                </p>
              </div>
            </button>

            {branchDropdownOpen ? (
              <div className="absolute top-full left-0 z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Select Active Branch
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {stores.length > 0 ? (
                    stores.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setBranchDropdownOpen(false);
                          void switchBranch(st.id);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                          storeId === st.id
                            ? "bg-sky-50 text-[#0284c7]"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{st.name}</span>
                          <span className="rounded bg-slate-100 px-1 font-mono text-[9.5px] text-slate-500">
                            {st.code}
                          </span>
                        </div>
                        {storeId === st.id ? <Check size={13} className="text-[#0284c7]" /> : null}
                      </button>
                    ))
                  ) : (
                    <div className="px-2.5 py-2 text-xs text-slate-500">No other branches registered</div>
                  )}
                </div>
                <div className="mt-1 border-t border-slate-100 pt-1">
                  <a
                    href="/branches"
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                  >
                    <Building2 size={12} />
                    Manage branches &rarr;
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          {/* All Categories Selector Pill */}
          {settings.showCategories ? (
            <div className="relative inline-flex h-10 items-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3.5 transition hover:border-indigo-300 hover:bg-white">
              <Folder size={14} className="mr-2 text-[#6366f1]" />
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                aria-label="Category"
                className="appearance-none bg-transparent pr-5 text-[12.5px] font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 text-slate-400" />
            </div>
          ) : null}

          {/* All Brands Selector Pill */}
          {settings.showBrands ? (
            <div className="relative inline-flex h-10 items-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3.5 transition hover:border-indigo-300 hover:bg-white">
              <Tag size={14} className="mr-2 text-[#6366f1]" />
              <select
                value={brand}
                onChange={(event) => {
                  setBrand(event.target.value);
                  setPage(1);
                }}
                aria-label="Brand"
                className="appearance-none bg-transparent pr-5 text-[12.5px] font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Brands</option>
                {brands.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 text-slate-400" />
            </div>
          ) : null}
        </div>

        {/* Right Controls: Customer Pill + Add Customer + Action Icon Buttons */}
        <div className="flex items-center gap-2">
          {/* Offline/Online Live Resilience Indicator */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition ${
              isOnline
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <span className={`size-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span>{isOnline ? "Online" : "Offline Mode"}</span>
            {pendingSyncCount > 0 ? (
              <button
                type="button"
                onClick={() => void sendParked()}
                className="ml-1 rounded bg-amber-600 px-1.5 py-0.5 text-[9.5px] font-semibold text-white hover:bg-amber-700 cursor-pointer"
                title="Sync queued offline sales to server"
              >
                Sync ({pendingSyncCount})
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => {
              void loadPosOrders({ quiet: true });
              setPosOrdersTab("all");
              setPanel("pos-orders");
            }}
            title="Orders &amp; Held Tickets"
            aria-label="Orders"
            className="relative flex items-center gap-1.5 h-9 rounded-[10px] border border-[#e2e8f0] bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 shadow-2xs"
          >
            <ShoppingBag size={15} className="text-indigo-600" />
            <span className="hidden sm:inline font-bold">Orders</span>
            {(posOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length + holds.length) > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">
                {posOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length + holds.length}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => void openCustomers()}
            title="Add or Switch Customer"
            aria-label="Add Customer"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-[#6366f1]"
          >
            <UserPlus size={15} />
          </button>

          <button
            type="button"
            onClick={() => setPanel("shift")}
            title="Cash Register & Shift"
            aria-label="Shift register"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-slate-600 transition hover:border-indigo-300 hover:text-[#6366f1]"
          >
            <Wallet size={15} />
          </button>

          <button
            type="button"
            onClick={() => setPanel("return")}
            title="Return / Credit Note"
            aria-label="Return an item"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-slate-600 transition hover:border-indigo-300 hover:text-[#6366f1]"
          >
            <Undo2 size={15} />
          </button>

          <button
            type="button"
            onClick={() => setPanel("settings")}
            title="POS Settings"
            aria-label="POS settings"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-slate-600 transition hover:border-indigo-300 hover:text-[#6366f1]"
          >
            <Settings size={15} />
          </button>

          <button
            type="button"
            onClick={() => {
              updateSettings({ tapSound: !settings.tapSound });
              if (!settings.tapSound) playPosSound(settings.soundTone, settings.soundVolume);
            }}
            title={settings.tapSound ? "Sound on tap: ON" : "Sound on tap: OFF"}
            aria-label="Toggle tap sound"
            className={`grid size-9 place-items-center rounded-[10px] border transition ${
              settings.tapSound
                ? "border-indigo-200 bg-indigo-50 text-[#6366f1]"
                : "border-[#e2e8f0] bg-white text-slate-400"
            }`}
          >
            <Volume2 size={15} />
          </button>

          <button
            type="button"
            onClick={() => void openToday()}
            title="Today's Sales Summary"
            aria-label="Today's sales"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-slate-600 transition hover:border-indigo-300 hover:text-[#6366f1]"
          >
            <Monitor size={15} />
          </button>

          {/* Live Weighing Scale Trigger & Weight Pill */}
          <button
            type="button"
            onClick={() => setScaleModalOpen(true)}
            title={isScaleConnected ? `Scale Active: ${liveWeightKg.toFixed(3)} kg` : "Connect Weighing Scale (COM / USB Serial)"}
            aria-label="Weighing Scale"
            className={`flex h-9 items-center gap-1.5 rounded-[10px] border px-2.5 text-xs font-semibold transition cursor-pointer ${
              isScaleConnected
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400"
                : "border-[#e2e8f0] bg-white text-slate-600 hover:border-indigo-300 hover:text-[#6366f1]"
            }`}
          >
            <Scale size={15} className={isScaleConnected ? "text-emerald-600" : "text-slate-500"} />
            <span>{isScaleConnected ? `${liveWeightKg.toFixed(3)} kg` : "Scale"}</span>
          </button>

          {/* Cash Drawer Manual Kick */}
          <button
            type="button"
            onClick={kickCashDrawer}
            title="Kick Open Cash Drawer (ESC/POS pin 2)"
            aria-label="Kick Cash Drawer"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-slate-600 transition hover:border-indigo-300 hover:text-[#6366f1] cursor-pointer"
          >
            <Wallet size={15} />
          </button>

          <a
            href="/printer-setup"
            title="Printer & Receipt Setup"
            aria-label="Printer Setup"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-slate-600 transition hover:border-indigo-300 hover:text-[#6366f1]"
          >
            <Printer size={15} />
          </a>

          <a
            href="/customer-display"
            target="_blank"
            rel="noreferrer"
            title="Open Dual-Screen Customer Facing Display"
            aria-label="Customer Display"
            className="grid size-9 place-items-center rounded-[10px] border border-indigo-200 bg-indigo-50/70 text-[#6366f1] transition hover:bg-indigo-100"
          >
            <ScreenShare size={15} />
          </a>

          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            aria-label="Fullscreen"
            className="grid size-9 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-slate-600 transition hover:border-indigo-300 hover:text-[#6366f1]"
          >
            <Maximize2 size={15} />
          </button>

          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] text-white shadow-xs">
            <UserRound size={16} />
          </span>
        </div>
      </header>

      {/* =====================================================================
          MAIN SPLIT WORKSPACE (Catalog & Cart)
         ===================================================================== */}
      <div
        className={`grid min-h-0 flex-1 grid-cols-1 ${
          settings.cartPosition === "left"
            ? "lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr]"
            : "lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px]"
        }`}
      >
        {/* CART PANEL */}
        <section
          className={`flex min-h-0 flex-col bg-white ${
            settings.cartPosition === "left"
              ? "order-1 border-r border-[#e5e8f0]"
              : "order-2 border-l border-[#e5e8f0]"
          }`}
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-[#f1f3f9] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-[12px] bg-[#ede9fe] text-[#6366f1]">
                <ShoppingCart size={18} />
              </span>
              <div>
                <h1 className="text-[14px] font-semibold text-slate-800">Current Cart</h1>
                <p className="text-[12px] text-slate-400">
                  {count} {count === 1 ? "item" : "items"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</p>
                <p className="num text-[16px] font-semibold text-slate-900">{formatInr(netPayablePaise)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLines({});
                  setReceipt(null);
                }}
                title="Clear Cart"
                aria-label="Clear Cart"
                className="grid size-9 place-items-center rounded-[10px] border border-[#e5e8f0] bg-[#f8fafc] text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Cart Items Scrollable Area */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            {entries.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div className="py-10">
                  <ShoppingCart className="mx-auto mb-3 text-[#cbd5e1]" size={42} strokeWidth={1.5} />
                  <p className="text-[14px] font-semibold text-slate-600">No items added</p>
                  <p className="mt-1 text-[12px] text-slate-400">Select products from the right panel</p>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-[#f1f3f9]">
                {entries.map((item) => {
                  const imgUrl = resolveProductImage(item);
                  return (
                    <li key={item.id} className="flex items-center gap-3 py-3">
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="size-12 shrink-0 rounded-[10px] border border-slate-100 object-cover" />
                      ) : (
                        <span className="grid size-12 shrink-0 place-items-center rounded-[10px] bg-[#f5f3ff] text-xs font-semibold text-[#6366f1]">
                          {item.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-slate-800">{item.name}</p>
                        <p className="num text-[11px] text-slate-400">SKU {item.sku}</p>
                        <p className="num text-[12px] font-semibold text-[#6366f1]">{formatInr(item.paise)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="grid size-7 place-items-center rounded-[7px] border border-[#e2e8f0] bg-white text-slate-600 hover:bg-slate-50"
                          onClick={() => change(item.id, -1)}
                          aria-label={`Remove one ${item.name}`}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="num w-6 text-center text-[13px] font-semibold text-slate-800">
                          {lines[item.id]}
                        </span>
                        <button
                          type="button"
                          className="grid size-7 place-items-center rounded-[7px] border border-[#e2e8f0] bg-white text-slate-600 hover:bg-slate-50"
                          onClick={() => change(item.id, 1)}
                          aria-label={`Add one ${item.name}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="num w-20 text-right text-[13.5px] font-semibold text-slate-900">
                        {formatInr(item.paise * (lines[item.id] ?? 0))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Cart Bottom Calculation & Loyalty Panel (Matches Image 1) */}
          <div className="border-t border-[#eef0f5] bg-[#fafbfe] px-5 py-3.5 space-y-3">
            {/* 3-Column Inputs: Tax %, Discount, Shipping */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500">Tax %</label>
                <div className="mt-1 flex h-9 items-center rounded-[8px] border border-[#e2e8f0] bg-white px-2.5">
                  <input
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    inputMode="decimal"
                    className="num w-full bg-transparent text-[13px] font-semibold text-slate-800 outline-none"
                  />
                  <span className="text-[11px] font-semibold text-slate-400">%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-500">Discount</label>
                  <div className="flex rounded-[4px] border border-slate-200 bg-slate-100 p-0.5 text-[9px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setDiscountMode("rupees")}
                      className={`px-1 rounded-[3px] transition ${discountMode === "rupees" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
                    >
                      ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountMode("percent")}
                      className={`px-1 rounded-[3px] transition ${discountMode === "percent" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex h-9 items-center rounded-[8px] border border-[#e2e8f0] bg-white px-2">
                  <span className="mr-1 text-[11px] font-semibold text-slate-400">
                    {discountMode === "rupees" ? "₹" : "%"}
                  </span>
                  <input
                    value={discountRupees}
                    onChange={(event) => setDiscountRupees(event.target.value)}
                    inputMode="decimal"
                    aria-label={`Discount in ${discountMode === "rupees" ? "rupees" : "percentage"}`}
                    placeholder="0"
                    className="num w-full bg-transparent text-[13px] font-semibold text-slate-800 outline-none"
                  />
                  {discountMode === "percent" && manualDiscountPaise > 0 ? (
                    <span className="text-[9.5px] font-semibold text-emerald-600 whitespace-nowrap">
                      -₹{(manualDiscountPaise / 100).toFixed(0)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500">Shipping</label>
                <div className="mt-1 flex h-9 items-center rounded-[8px] border border-[#e2e8f0] bg-white px-2.5">
                  <span className="mr-1 text-[11px] font-semibold text-slate-400">₹</span>
                  <input
                    value={shippingRupees}
                    onChange={(e) => setShippingRupees(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    className="num w-full bg-transparent text-[13px] font-semibold text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Available Points & Convert / Redeem Row */}
            {settings.points ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#ede9fe] bg-[#f5f3ff]/80 px-3 py-2">
                <span className="text-[12px] font-medium text-slate-600">
                  Available Points <strong className="num ml-1 font-semibold text-[#6366f1]">0</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    value={loyaltyPoints}
                    onChange={(event) => setLoyaltyPoints(event.target.value)}
                    inputMode="numeric"
                    aria-label="Points to redeem"
                    placeholder="0"
                    className="num h-8 w-14 rounded-[7px] border border-[#ddd6fe] bg-white px-2 text-center text-xs font-semibold text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => showNotice("Loyalty points applied to current bill.", "ok")}
                    className="inline-flex h-8 items-center gap-1 rounded-[7px] bg-[#6366f1] px-2.5 text-[11.5px] font-semibold text-white shadow-2xs transition hover:bg-[#4f46e5]"
                  >
                    Convert
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod((prev) => (prev === "khata" ? "cash" : "khata"))}
                    className={`inline-flex h-8 items-center gap-1 rounded-[7px] border px-2.5 text-[11.5px] font-semibold transition ${
                      payMethod === "khata"
                        ? "border-[#6366f1] bg-[#6366f1] text-white"
                        : "border-[#c4b5fd] bg-white text-[#6366f1] hover:bg-[#ede9fe]"
                    }`}
                  >
                    <Gift size={12} />
                    {payMethod === "khata" ? "On Khata ✓" : "Redeem Reward"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Subtotal & Tax Lines */}
            <div className="space-y-1 text-[12.5px]">
              <div className="flex items-center justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="num font-semibold text-slate-800">{formatInr(total)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Tax</span>
                <span className="num font-semibold text-slate-800">{formatInr(extraTaxPaise)}</span>
              </div>
            </div>

            {/* Promo Code Row */}
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Promo Code</p>
              <div className="flex gap-2">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter code"
                  className="h-9 flex-1 rounded-[8px] border border-[#e2e8f0] bg-white px-3 text-[12.5px] text-slate-800 outline-none focus:border-[#6366f1]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!promoCode.trim()) return;
                    showNotice(`Promo code "${promoCode.toUpperCase()}" verified.`, "ok");
                  }}
                  className="h-9 rounded-[8px] bg-[#6366f1] px-4 text-[12.5px] font-semibold text-white shadow-2xs transition hover:bg-[#4f46e5]"
                >
                  Apply
                </button>
              </div>
            </div>

            {receipt ? (
              <p
                className={`flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-semibold ${
                  receiptTone === "error"
                    ? "bg-rose-50 text-[#be123c]"
                    : "bg-emerald-50 text-[#15803d]"
                }`}
              >
                {receiptTone === "ok" ? <CheckCircle2 size={14} /> : null}
                <span>{receipt}</span>
              </p>
            ) : null}
          </div>
        </section>

        {/* PRODUCT CATALOG & PAGINATION PANEL */}
        <section
          className={`flex min-h-0 flex-col bg-[#f8f9fc] ${
            settings.cartPosition === "left" ? "order-2" : "order-1"
          }`}
        >
          {/* Search Bar Header */}
          <div className="flex items-center gap-2.5 border-b border-[#e5e8f0] bg-white px-5 py-3">
            <label className="flex h-10 flex-1 items-center gap-2.5 rounded-[10px] border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-sm text-slate-400 transition focus-within:border-[#6366f1] focus-within:bg-white">
              <ScanLine size={16} className="text-slate-400" />
              <input
                data-testid="barcode-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void scan(query);
                  }
                }}
                placeholder="Scan/Search Product by Code Or Name"
                className="w-full bg-transparent text-[13px] font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void scan(query)}
              className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#e2e8f0] bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:text-[#6366f1]"
            >
              <ScanLine size={15} />
              Scan
            </button>
          </div>

          {/* 4-Column Product Card Grid */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className={`grid gap-4 ${gridColsClass}`}>
              {pageItems.map((item) => {
                const inCartQty = lines[item.id] ?? 0;
                const imgUrl = resolveProductImage(item);
                return (
                  <article
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (settings.tapCardToAdd) add(item.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        add(item.id);
                      }
                    }}
                    className={`group relative flex flex-col justify-between rounded-[14px] border bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#6366f1] hover:shadow-md active:scale-[0.99] ${
                      inCartQty > 0 ? "border-[#6366f1] ring-2 ring-[#6366f1]/15" : "border-[#e9ecf2]"
                    }`}
                  >
                    {inCartQty > 0 ? (
                      <span className="num absolute top-2.5 right-2.5 z-10 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#6366f1] px-1.5 text-[11px] font-semibold text-white shadow-sm">
                        {inCartQty}
                      </span>
                    ) : null}

                    <div>
                      <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-[10px] bg-[#f8fafc]">
                        {settings.showImages && imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#eef2ff] to-[#f5f3ff] text-[#6366f1]">
                            <span className="text-2xl font-semibold">{item.name.slice(0, 2).toUpperCase()}</span>
                            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                              {item.category ?? "Retail"}
                            </span>
                          </div>
                        )}
                      </div>

                      <h2 className="mt-3 truncate text-[13.5px] font-semibold text-slate-800">{item.name}</h2>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">
                        {settings.showSku ? `SKU ${item.sku}` : ""}
                        {settings.showStock
                          ? `${settings.showSku ? " · " : ""}${Number(item.onHand ?? 50).toFixed(2)}...`
                          : ""}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-1">
                      <span className="num text-[15px] font-semibold text-[#6366f1]">{formatInr(item.paise)}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          add(item.id);
                        }}
                        aria-label={`Add ${item.name}`}
                        className="grid size-8 place-items-center rounded-[8px] bg-[#ede9fe] text-[#6366f1] transition-colors group-hover:bg-[#6366f1] group-hover:text-white"
                      >
                        <Plus size={15} strokeWidth={2.5} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Right Panel Pagination Row (Matches Image 1) */}
          <div className="flex h-12 shrink-0 items-center justify-between border-t border-[#e5e8f0] bg-white px-5 text-[12px] text-slate-500">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="grid size-7 place-items-center rounded-[7px] border border-[#e2e8f0] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="flex items-center gap-4">
              <div className="text-center leading-tight">
                <p className="text-[11px] font-semibold text-slate-700">Page {page}</p>
                <p className="text-[10px] text-slate-400">{visible.length} products</p>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(pageCount, 5) }).map((_, idx) => {
                  const p = idx + 1;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`num grid size-7 place-items-center rounded-[7px] text-[12px] font-semibold transition ${
                        page === p
                          ? "bg-[#6366f1] text-white shadow-2xs"
                          : "border border-[#e2e8f0] bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="grid size-7 place-items-center rounded-[7px] border border-[#e2e8f0] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </section>
      </div>

      {/* =====================================================================
          FULL-WIDTH STICKY BOTTOM BAR (Matches Image 1)
         ===================================================================== */}
      <footer className="flex h-[64px] shrink-0 items-center justify-between border-t border-[#e5e8f0] bg-white px-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mr-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
            <span className="size-2 rounded-full bg-emerald-500" />
            Online <span className="font-normal text-slate-400">· synced</span>
          </span>

          <a
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e2e8f0] bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Home size={15} className="text-slate-500" />
            Home
          </a>

          <button
            type="button"
            onClick={() => {
              setLines({});
              setDiscountRupees("");
              setShippingRupees("0");
              setTaxPercent("0");
              setReceipt(null);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e2e8f0] bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw size={15} className="text-slate-500" />
            Reset
          </button>

          <button
            type="button"
            onClick={() => {
              void loadPosOrders({ quiet: true });
              setPosOrdersTab("held");
              setPanel("pos-orders");
            }}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e2e8f0] bg-white px-4 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FileText size={15} className="text-slate-500" />
            Recent Drafts {holds.length > 0 ? `(${holds.length})` : ""}
          </button>

          {lastSaleId ? (
            <>
              <button
                type="button"
                onClick={() => void voidLast()}
                className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 text-[12.5px] font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Void
              </button>
              <button
                type="button"
                onClick={() => void openPosReceipt(lastSaleId)}
                aria-label="View receipt"
                className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#e2e8f0] bg-white px-3.5 text-[12.5px] font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
              >
                <Printer size={15} />
                Receipt
              </button>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Payable</p>
            <p className="num text-[20px] font-semibold leading-tight text-slate-900">
              {formatInr(netPayablePaise)}
            </p>
          </div>

          <button
            type="button"
            disabled={total === 0 || !settings.holdSales}
            onClick={() => void park()}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-amber-300/80 bg-gradient-to-r from-amber-500 to-amber-600 px-5 text-[14px] font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Pause size={16} strokeWidth={2.4} />
            Hold
          </button>

          <button
            type="button"
            data-testid="pay-button"
            disabled={total === 0}
            onClick={() => {
              if (settings.tapSound) playPosSound(settings.soundTone, settings.soundVolume);
              setReceipt(null);
              setTenderRupees((netPayablePaise / 100).toFixed(2));
              setPanel("pay");
            }}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-7 text-[15px] font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-45 cursor-pointer"
          >
            <Check size={17} strokeWidth={2.6} />
            Pay Now
          </button>
        </div>
      </footer>

      {/* =====================================================================
          1. DEDICATED RIGHT-SIDE SLIDE-OVER DRAWER FOR POS & ONLINE ORDERS
         ===================================================================== */}
      {(panel === "pos-orders" || panel === "holds") && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] transition-opacity"
          onClick={() => setPanel(null)}
        >
          <div
            className="h-full w-full max-w-xl md:max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-sm">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Orders &amp; Recent Drafts</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Live online storefront orders &amp; counter sales</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadPosOrders({ quiet: true })}
                  disabled={posOrdersLoading}
                  title="Refresh activity"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw size={15} className={posOrdersLoading ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Channels & Tabs */}
            <div className="border-b border-slate-200 bg-white px-6 pt-3 pb-0">
              <div className="flex gap-2">
                {[
                  { id: "all", label: "All Activity", count: posOrders.length },
                  { id: "online", label: "Storefront", count: posOrders.filter((o) => o.channel === "online").length, icon: Globe },
                  { id: "counter", label: "Counter POS", count: posOrders.filter((o) => o.channel === "counter").length, icon: Store },
                  { id: "held", label: "Parked Drafts", count: holds.length, icon: Pause },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = (panel === "holds" && tab.id === "held") || (panel === "pos-orders" && posOrdersTab === tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === "held") {
                          setPanel("holds");
                          setPosOrdersTab("held");
                        } else {
                          setPanel("pos-orders");
                          setPosOrdersTab(tab.id as any);
                        }
                      }}
                      className={`relative flex items-center gap-1.5 pb-3 px-3 text-xs font-semibold transition cursor-pointer border-b-2 ${
                        active
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      {Icon ? <Icon size={13} /> : null}
                      <span>{tab.label}</span>
                      <span
                        className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter Bar & Search (For Orders tabs) */}
            {posOrdersTab !== "held" && panel !== "holds" ? (
              <div className="space-y-2 border-b border-slate-100 bg-slate-50/50 p-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={posOrdersSearch}
                    onChange={(e) => setPosOrdersSearch(e.target.value)}
                    placeholder="Search by order #, customer name, phone, address..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-2xs"
                  />
                  {posOrdersSearch ? (
                    <button
                      type="button"
                      onClick={() => setPosOrdersSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[
                    { id: "all", label: "All Status" },
                    { id: "pending", label: "Pending" },
                    { id: "ready", label: "Ready / Dispatch" },
                    { id: "completed", label: "Completed" },
                    { id: "unpaid", label: "Unpaid / COD" },
                    { id: "today", label: "Today Only" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setPosOrdersFilter(f.id as any)}
                      className={`h-6 rounded-md px-2.5 text-[11px] font-semibold transition cursor-pointer ${
                        posOrdersFilter === f.id
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
              {posOrdersTab === "held" || panel === "holds" ? (
                /* PARKED DRAFTS VIEW */
                holds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Pause size={24} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">No Parked Drafts</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Press &quot;Hold (Pause)&quot; in the POS register to save temporary bills for customers stepped aside.
                    </p>
                  </div>
                ) : (
                  holds.map((hold, idx) => (
                    <div
                      key={hold.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-700">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {hold.label || `Draft Ticket (${hold.id.slice(0, 8)})`}
                          </span>
                        </div>
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
                          {hold.lines.reduce((acc, l) => acc + l.qty, 0)} items
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="text-[11px] text-slate-500">
                          Items: {hold.lines.map((l) => `${l.qty}x`).join(", ")}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void discardHold(hold.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                            Discard
                          </button>
                          <button
                            type="button"
                            onClick={() => void recall(hold)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
                          >
                            <RotateCcw size={12} />
                            Recall to Register
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                /* LIVE ORDERS & SALES VIEW */
                posOrdersLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <RefreshCw size={24} className="animate-spin text-indigo-600" />
                    <p className="mt-2 text-xs font-medium text-slate-500">Loading live storefront &amp; POS orders...</p>
                  </div>
                ) : filteredPosOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <ShoppingBag size={24} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">No orders found</p>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      No customer orders match your selected filters. New orders from the online storefront or POS counter will appear here in real time.
                    </p>
                  </div>
                ) : (
                  filteredPosOrders.map((order) => {
                    const isOnline = order.channel === "online";
                    const isDelivery = order.fulfillment === "delivery";
                    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
                      placed: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
                      accepted: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
                      packing: { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200" },
                      ready: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
                      ready_for_pickup: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
                      out_for_delivery: { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200" },
                      delivered: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
                      picked_up: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
                      completed: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
                      cancelled: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
                      voided: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
                    };
                    const color = statusColors[order.status] || { bg: "bg-white/20", text: "text-white", border: "border-white/30" };
                    const headerTone = !isOnline
                      ? "bg-emerald-600"
                      : order.status === "awaiting_payment"
                        ? "bg-amber-500"
                        : isDelivery
                          ? "bg-sky-600"
                          : "bg-indigo-600";
                    const typeLabel = !isOnline ? "Counter" : isDelivery ? "Delivery" : "Pickup";

                    return (
                      <div
                        key={`${order.channel}-${order.id}`}
                        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
                      >
                        <div className={`flex items-center justify-between gap-2 px-3 py-2 text-white ${headerTone}`}>
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate font-mono text-[12px] font-bold tracking-tight">
                              #{order.number}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold">
                              {isOnline ? <Globe size={10} /> : <Store size={10} />}
                              {typeLabel}
                            </span>
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${color.bg} ${color.text} ${color.border}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {String(order.status || "open").replace(/_/g, " ").toUpperCase()}
                          </span>
                        </div>
                        <div className="px-3 pt-2">

                        {/* Customer & Fulfillment Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{order.customer_name || "Walk-in Customer"}</span>
                            </div>
                            {order.customer_phone ? (
                              <a
                                href={`tel:${order.customer_phone}`}
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline mt-0.5"
                              >
                                <Phone size={10} />
                                {order.customer_phone}
                              </a>
                            ) : null}
                          </div>
                          <div className="text-right sm:text-right text-[11px] text-slate-500">
                            <div>{new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                            <div className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>

                        {/* Delivery Address & Notes (if applicable) */}
                        {order.address ? (
                          <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 flex items-start gap-1.5">
                            <MapPin size={13} className="text-rose-500 mt-0.5 shrink-0" />
                            <div className="flex-1 text-[11px]">
                              <span className="font-medium text-slate-800">{order.address}</span>
                              {order.city ? `, ${order.city}` : ""}
                              {order.pincode ? ` - ${order.pincode}` : ""}
                              {order.delivery_slot ? (
                                <span className="ml-1.5 inline-block font-semibold text-indigo-700">
                                  (Slot: {order.delivery_slot})
                                </span>
                              ) : null}
                            </div>
                            {order.live_location_url ? (
                              <a
                                href={order.live_location_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-600 hover:underline shrink-0"
                              >
                                <span>Map</span>
                                <ExternalLink size={9} />
                              </a>
                            ) : null}
                          </div>
                        ) : null}

                        {order.order_notes ? (
                          <div className="mt-1.5 rounded-lg bg-amber-50/70 border border-amber-200/50 p-2 text-[11px] text-amber-900">
                            <strong className="font-semibold">Note:</strong> {order.order_notes}
                          </div>
                        ) : null}

                        {/* Items List Preview */}
                        <div className="mt-2 border-t border-slate-100 pt-2">
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Items ({order.lines?.length || 0})
                          </div>
                          <div className="space-y-1">
                            {(order.lines || []).map((line: any, lIdx: number) => (
                              <div key={lIdx} className="flex items-center justify-between text-xs text-slate-700">
                                <span className="font-medium text-slate-800">
                                  {line.qty} × {line.name}
                                </span>
                                <span className="font-mono text-slate-900">
                                  ₹{(((line.total_paise || (line.qty * (line.unit_price_paise || 0))) || 0) / 100).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment & Total Row */}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">Total:</span>
                              <span className="font-mono text-sm font-bold text-slate-900">
                                ₹{((order.total_paise || 0) / 100).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`text-[10px] font-bold uppercase ${
                                  order.payment_status === "paid" || order.payment_status === "captured" ? "text-emerald-600" : "text-amber-600"
                                }`}
                              >
                                {order.payment_status === "paid" || order.payment_status === "captured" ? "● Paid" : "○ Unpaid / COD"}
                              </span>
                              <span className="text-[10px] text-slate-400">·</span>
                              <span className="text-[10px] font-semibold text-slate-600 uppercase">
                                {order.payment_method || "Counter"}
                              </span>
                            </div>
                          </div>

                          {/* Retail Action Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Workflow transitions for Online storefront orders */}
                            {isOnline && order.status === "placed" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void transitionPosOrder(order.id, "accepted")}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition cursor-pointer"
                                >
                                  <Check size={12} />
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void transitionPosOrder(order.id, "rejected")}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </>
                            ) : null}

                            {isOnline && order.status === "accepted" ? (
                              <button
                                type="button"
                                onClick={() => void transitionPosOrder(order.id, "packing")}
                                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs transition cursor-pointer"
                              >
                                <Package size={12} />
                                Pack Items
                              </button>
                            ) : null}

                            {isOnline && order.status === "packing" ? (
                              <button
                                type="button"
                                onClick={() => void transitionPosOrder(order.id, "ready")}
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 shadow-2xs transition cursor-pointer"
                              >
                                <CheckCircle2 size={12} />
                                Mark Ready
                              </button>
                            ) : null}

                            {isOnline && order.status === "ready" && isDelivery ? (
                              <button
                                type="button"
                                onClick={() => void transitionPosOrder(order.id, "out_for_delivery")}
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 shadow-2xs transition cursor-pointer"
                              >
                                <Truck size={12} />
                                Dispatch
                              </button>
                            ) : null}

                            {isOnline && order.status === "ready" && !isDelivery ? (
                              <button
                                type="button"
                                onClick={() => void transitionPosOrder(order.id, "picked_up")}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition cursor-pointer"
                              >
                                <CheckCircle2 size={12} />
                                Picked Up
                              </button>
                            ) : null}

                            {isOnline && order.status === "out_for_delivery" ? (
                              <button
                                type="button"
                                onClick={() => void transitionPosOrder(order.id, "delivered")}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition cursor-pointer"
                              >
                                <CheckCircle2 size={12} />
                                Delivered
                              </button>
                            ) : null}

                            {/* Retail Printing */}
                            <button
                              type="button"
                              onClick={() => printPackingSlip(order)}
                              title="Print retail packing slip"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <FileText size={12} className="text-slate-500" />
                              Slip
                            </button>

                            <button
                              type="button"
                              onClick={() => printOrderReceipt(order)}
                              title="Print customer receipt / invoice"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            >
                              <Printer size={12} className="text-slate-500" />
                              Invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. CENTERED MODAL FOR SHIFT, CUSTOMER, PAY, RETURN, SETTINGS, TODAY
         ===================================================================== */}
      {panel && panel !== "pos-orders" && panel !== "holds" ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-[#1a1d23]/30 p-4 backdrop-blur-[1px]" onClick={() => setPanel(null)}>
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[16px] border border-[#eceef3] bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {panel === "shift" ? (
              <form
                className="p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void (shiftOpen ? closeShift() : openShift());
                }}
              >
                <h2 className="text-lg font-semibold">{shiftOpen ? "Close shift" : "Open shift"}</h2>
                <p className="mt-1 text-sm text-muted">
                  {shiftOpen
                    ? "Count the drawer. Expected cash is opening plus cash sales and paid in, minus paid out."
                    : "Enter the cash in the drawer before the first bill."}
                </p>
                <label className="mt-4 block text-[13px] font-medium">
                  {shiftOpen ? "Counted cash, rupees" : "Opening cash, rupees"}
                  <input
                    value={shiftOpen ? countedRupees : openingRupees}
                    onChange={(event) => (shiftOpen ? setCountedRupees(event.target.value) : setOpeningRupees(event.target.value))}
                    className="num mt-1 h-11 w-full rounded-[8px] border border-[#eceef3] px-3 text-sm"
                  />
                </label>
                {shiftOpen ? (
                  <>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[50000, 20000, 10000, 5000, 2000, 1000, 500, 100].map((value) => (
                        <label key={value} className="text-[11px] text-muted">
                          ₹{value / 100}
                          <input
                            value={noteCounts[value] ?? ""}
                            onChange={(event) => setNoteCounts((current) => ({ ...current, [value]: event.target.value }))}
                            inputMode="numeric"
                            aria-label={`Count of ${value / 100} rupee notes`}
                            className="num mt-1 h-9 w-full rounded-[8px] border border-[#eceef3] px-2 text-sm text-ink"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_1fr_auto_auto] gap-2">
                      <input
                        value={cashRupees}
                        onChange={(event) => setCashRupees(event.target.value)}
                        inputMode="decimal"
                        aria-label="Cash amount in rupees"
                        placeholder="Cash, rupees"
                        className="h-10 rounded-[8px] border border-[#eceef3] px-3 text-sm"
                      />
                      <input
                        value={cashReason}
                        onChange={(event) => setCashReason(event.target.value)}
                        aria-label="Cash reason"
                        placeholder="Reason"
                        className="h-10 rounded-[8px] border border-[#eceef3] px-3 text-sm"
                      />
                      <button type="button" onClick={() => void moveCash("in")} className="h-10 cursor-pointer rounded-[8px] border border-[#eceef3] px-3 text-sm">
                        Paid in
                      </button>
                      <button type="button" onClick={() => void moveCash("out")} className="h-10 cursor-pointer rounded-[8px] border border-[#eceef3] px-3 text-sm">
                        Paid out
                      </button>
                    </div>
                  </>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setPanel(null)} className="h-10 cursor-pointer rounded-[8px] border border-[#eceef3] px-4 text-sm">
                    Cancel
                  </button>
                  <button type="submit" className="h-10 cursor-pointer rounded-[8px] bg-accent px-4 text-sm font-medium text-accent-ink">
                    {shiftOpen ? "Close shift" : "Open shift"}
                  </button>
                </div>
              </form>
            ) : null}

            {panel === "customer" ? (
              <div>
                <div className="flex items-center justify-between bg-accent px-5 py-4 text-accent-ink">
                  <h2 className="text-base font-semibold">Select customer</h2>
                  <button type="button" onClick={() => setPanel(null)} className="cursor-pointer text-sm">
                    Close
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex gap-2">
                    <input
                      value={customerQuery}
                      onChange={(event) => setCustomerQuery(event.target.value)}
                      placeholder="Search by name or phone"
                      className="h-10 flex-1 rounded-[8px] border border-[#eceef3] px-3 text-sm"
                    />
                    <button type="button" onClick={() => void openCustomers()} className="h-10 cursor-pointer rounded-[8px] border border-[#eceef3] px-3 text-sm">
                      Search
                    </button>
                    {settings.quickAdd ? (
                      <button type="button" onClick={() => void attachCustomer()} className="h-10 cursor-pointer rounded-[8px] bg-accent px-3 text-sm text-accent-ink">
                        Quick add
                      </button>
                    ) : null}
                  </div>
                  <ul className="mt-3 divide-y divide-[#f1f2f6]">
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomer(null);
                          setPanel(null);
                        }}
                        className="flex w-full cursor-pointer px-2 py-3 text-left text-sm hover:bg-[#f9fafb]"
                      >
                        Walk-in customer (No customer)
                      </button>
                    </li>
                    {customers.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomer(row);
                            setPanel(null);
                          }}
                          className="flex w-full cursor-pointer items-center justify-between px-2 py-3 text-left text-sm hover:bg-[#f9fafb]"
                        >
                          <span>
                            <span className="font-medium">{row.name}</span>
                            <span className="mt-0.5 block text-[12px] text-muted">{row.phone_e164}</span>
                          </span>
                          {customer?.id === row.id ? <span className="text-accent font-medium">Selected</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {panel === "pay" ? (
              <div className="p-6 sm:p-8">
                {/* Top Header */}
                <div className="flex items-center justify-between pb-5 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Take payment</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Select method and complete</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    className="h-8 w-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* 2-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  {/* LEFT COLUMN */}
                  <div className="space-y-4">
                    {/* Amount Due Card */}
                    <div className="rounded-2xl bg-[#0f172a] text-white text-center py-7 px-4 shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">AMOUNT DUE</p>
                      <p className="num text-4xl font-extrabold tracking-tight mt-1 text-white">
                        {formatInr(totalDuePaise)}
                      </p>
                    </div>

                    {/* TIP Selector */}
                    <div className="rounded-2xl border border-slate-200/90 p-4 bg-slate-50/40 space-y-3">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <svg className="w-3.5 h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        <span className="text-[11px] font-bold uppercase tracking-wider">TIP</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: "None", percent: 0 },
                          { label: "10%", percent: 10 },
                          { label: "15%", percent: 15 },
                          { label: "18%", percent: 18 },
                          { label: "20%", percent: 20 },
                        ].map((t) => {
                          const isSel = (tipPercent === t.percent && customTipRupees === "") || (t.percent === 0 && tipPercent === 0 && customTipRupees === "");
                          return (
                            <button
                              key={t.label}
                              type="button"
                              onClick={() => {
                                setCustomTipRupees("");
                                setTipPercent(t.percent);
                              }}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                isSel
                                  ? "bg-[#0f172a] text-white shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CUSTOM</span>
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={customTipRupees}
                            onChange={(e) => {
                              setCustomTipRupees(e.target.value.replace(/[^0-9.]/g, ""));
                              setTipPercent(null);
                            }}
                            placeholder="0.00"
                            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pay Later (Open tab / Khata) */}
                    <button
                      type="button"
                      onClick={() => {
                        setPayMethod("khata");
                        if (!customer) {
                          setPanel("customer");
                        }
                      }}
                      className={`w-full rounded-2xl border-2 border-dashed p-4 flex items-center gap-3.5 transition text-left cursor-pointer ${
                        payMethod === "khata"
                          ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20"
                          : "border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">Pay later</div>
                        <div className="text-xs text-slate-500">Open tab — charge when ready</div>
                      </div>
                    </button>

                    {/* Multi-tender toggle */}
                    <div className="pt-1 flex items-center justify-between text-xs text-slate-500 px-1">
                      <span>Need split billing?</span>
                      <button
                        type="button"
                        onClick={() => setIsSplitTender(!isSplitTender)}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        {isSplitTender ? "Single Tender" : "Split Tender (Multi-Pay)"}
                      </button>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div>
                    {!isSplitTender ? (
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                          PAYMENT METHOD
                        </div>

                        {/* 6-Grid Method Selector */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* 1. Cash */}
                          <button
                            type="button"
                            data-testid="cash-payment"
                            onClick={() => {
                              if (settings.tapSound) playPosSound("click", settings.soundVolume);
                              setPayMethod("cash");
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer min-h-[92px] ${
                              payMethod === "cash"
                                ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-indigo-100/60 text-indigo-600 flex items-center justify-center">
                              <Banknote className="h-5 w-5" />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm font-bold text-slate-900">Cash</div>
                              <div className="text-[11px] text-slate-500">Tender &amp; change</div>
                            </div>
                          </button>

                          {/* 2. Card */}
                          <button
                            type="button"
                            onClick={() => {
                              if (settings.tapSound) playPosSound("click", settings.soundVolume);
                              setPayMethod("card");
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer min-h-[92px] ${
                              payMethod === "card"
                                ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                              <CreditCard className="h-5 w-5" />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm font-bold text-slate-900">Card</div>
                              <div className="text-[11px] text-slate-500">Terminal</div>
                            </div>
                          </button>

                          {/* 3. Manual UPI — only when the UPI QR gateway is turned on */}
                          {hasManualUpi && (
                          <button
                            type="button"
                            onClick={() => {
                              if (settings.tapSound) playPosSound("click", settings.soundVolume);
                              setPayMethod("upi");
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer min-h-[92px] ${
                              payMethod === "upi"
                                ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-emerald-100/60 text-emerald-600 flex items-center justify-center">
                              <Smartphone className="h-5 w-5" />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm font-bold text-slate-900">UPI</div>
                              <div className="text-[11px] text-slate-500 leading-tight">Soundbox / standee — mark paid after guest pays</div>
                            </div>
                          </button>
                          )}

                          {/* 4. Wallet */}
                          <button
                            type="button"
                            onClick={() => {
                              if (settings.tapSound) playPosSound("click", settings.soundVolume);
                              setPayMethod("wallet");
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer min-h-[92px] ${
                              payMethod === "wallet"
                                ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-amber-100/60 text-amber-600 flex items-center justify-center">
                              <Wallet className="h-5 w-5" />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm font-bold text-slate-900">Wallet</div>
                              <div className="text-[11px] text-slate-500">Digital pay</div>
                            </div>
                          </button>

                          {/* 5. Other */}
                          <button
                            type="button"
                            onClick={() => {
                              if (settings.tapSound) playPosSound("click", settings.soundVolume);
                              setPayMethod("other");
                            }}
                            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer min-h-[92px] ${
                              payMethod === "other"
                                ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/40"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                              <CircleDot className="h-5 w-5" />
                            </div>
                            <div className="mt-2">
                              <div className="text-sm font-bold text-slate-900">Other</div>
                              <div className="text-[11px] text-slate-500">Voucher, etc.</div>
                            </div>
                          </button>

                          {/* 6. UPI QR (Dynamic QR modal trigger - Only shown if online gateway is active) */}
                          {hasDynamicQr && (
                            <button
                              type="button"
                              onClick={() => {
                                if (settings.tapSound) playPosSound("click", settings.soundVolume);
                                setPayMethod("upi_qr");
                                setUpiQrModalOpen(true);
                              }}
                              className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer min-h-[92px] ${
                                payMethod === "upi_qr"
                                  ? "border-[#5f259f] ring-2 ring-[#5f259f]/20 bg-[#5f259f]/5"
                                  : "border-slate-200 bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className="h-8 w-8 rounded-lg bg-[#5f259f]/10 flex items-center justify-center p-1">
                                <img src="/logos/phonepe.svg" alt="PhonePe" className="h-full w-full object-contain" />
                              </div>
                              <div className="mt-2">
                                <div className="text-sm font-bold text-slate-900">UPI QR</div>
                                <div className="text-[11px] text-slate-500">Scan &amp; Pay</div>
                              </div>
                            </button>
                          )}
                        </div>

                        {/* Cash Tender Shortcuts */}
                        {payMethod === "cash" && (
                          <div className="mt-5 space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">CASH TENDER</div>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => setTenderRupees((totalDuePaise / 100).toFixed(2))}
                                className="h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                              >
                                Exact
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = Number(tenderRupees || totalDuePaise / 100);
                                  setTenderRupees(String(cur + 5));
                                }}
                                className="h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = Number(tenderRupees || totalDuePaise / 100);
                                  setTenderRupees(String(cur + 10));
                                }}
                                className="h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = Number(tenderRupees || totalDuePaise / 100);
                                  setTenderRupees(String(cur + 20));
                                }}
                                className="h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                              >
                                +20
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = Number(tenderRupees || totalDuePaise / 100);
                                  setTenderRupees(String(cur + 50));
                                }}
                                className="h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                              >
                                +50
                              </button>
                              <button
                                type="button"
                                onClick={() => setTenderRupees("")}
                                className="h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                              >
                                Clear
                              </button>
                            </div>
                            <div className="pt-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">RECEIVED</div>
                              <div className="relative">
                                <span className="absolute left-3.5 top-3.5 text-sm font-bold text-slate-400">₹</span>
                                <input
                                  value={tenderRupees}
                                  onChange={(e) => setTenderRupees(e.target.value.replace(/[^0-9.]/g, ""))}
                                  placeholder={(totalDuePaise / 100).toFixed(2)}
                                  className="num h-12 w-full rounded-xl border border-slate-200 pl-8 pr-4 text-base font-bold text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30"
                                />
                              </div>
                              {Number(tenderRupees) * 100 > totalDuePaise ? (
                                <div className="mt-1.5 flex justify-between items-center px-1 text-xs font-bold text-emerald-600">
                                  <span>Change Due:</span>
                                  <span className="text-sm">{formatInr(Math.round(Number(tenderRupees) * 100) - totalDuePaise)}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Multi-Tender Split Billing Rows */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-slate-700">Split Tenders</p>
                          <button
                            type="button"
                            onClick={() =>
                              setSplitPayments((prev) => [...prev, { method: "card", amountRupees: "" }])
                            }
                            className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                          >
                            + Add Tender Row
                          </button>
                        </div>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {splitPayments.map((row, idx) => (
                            <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                              <select
                                value={row.method}
                                onChange={(e) => {
                                  const m = e.target.value as any;
                                  setSplitPayments((prev) => prev.map((item, i) => (i === idx ? { ...item, method: m } : item)));
                                }}
                                className="h-9 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-semibold uppercase text-slate-700"
                              >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="wallet">Wallet</option>
                                <option value="other">Other</option>
                                <option value="khata">Khata</option>
                              </select>

                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400">₹</span>
                                <input
                                  value={row.amountRupees}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSplitPayments((prev) => prev.map((item, i) => (i === idx ? { ...item, amountRupees: val } : item)));
                                  }}
                                  placeholder="0.00"
                                  className="num h-9 w-full rounded-md border border-slate-200 pl-6 pr-2 text-sm font-semibold text-slate-900 outline-none"
                                />
                              </div>

                              <button
                                type="button"
                                title="Fill remaining balance into this tender"
                                onClick={() => {
                                  const otherTotalPaise = splitPayments
                                    .filter((_, i) => i !== idx)
                                    .reduce((sum, p) => sum + Math.round((Number(p.amountRupees) || 0) * 100), 0);
                                  const remRupees = Math.max(0, (totalDuePaise - otherTotalPaise) / 100);
                                  setSplitPayments((prev) => prev.map((item, i) => (i === idx ? { ...item, amountRupees: String(remRupees) } : item)));
                                }}
                                className="h-9 px-2.5 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                Fill Balance
                              </button>

                              {splitPayments.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setSplitPayments((prev) => prev.filter((_, i) => i !== idx))}
                                  className="h-9 w-8 grid place-items-center text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  &times;
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {receipt && receiptTone === "error" ? <p className="mt-3 text-xs font-medium text-rose-600">{receipt}</p> : null}

                    {/* Action Buttons */}
                    <div className="mt-6 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPanel(null)}
                        className="h-12 px-6 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        data-testid="complete-sale"
                        onClick={() => {
                          if (payMethod === "upi_qr") {
                            setUpiQrModalOpen(true);
                          } else {
                            void pay();
                          }
                        }}
                        className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        Complete payment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {panel === "return" ? (
              <div className="p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Exchange & Return Management</h2>
                    <p className="text-xs text-slate-500">Auto-issue official GST Credit Notes or apply exchange value to active counter cart.</p>
                  </div>
                  <button type="button" onClick={() => setPanel(null)} className="text-xs text-slate-400 hover:text-slate-800 cursor-pointer">
                    Close
                  </button>
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    value={returnNumber}
                    onChange={(event) => setReturnNumber(event.target.value)}
                    placeholder="Enter Invoice / Bill # (e.g. INV-000142)"
                    className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => void findInvoice()}
                    className="h-10 cursor-pointer rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Lookup Bill
                  </button>
                </div>

                {returnSale ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold text-slate-700">Original Invoice: <strong className="text-slate-900">{returnNumber}</strong></p>
                      <p className="text-[11px] text-slate-500">Select items to return or exchange:</p>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {returnSale.lines.map((line) => (
                        <div key={line.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{line.name}</p>
                            <p className="text-[11px] text-slate-500">Purchased Qty: {line.qty}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void returnLine(line.id)}
                              className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                            >
                              Issue Credit Note
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {entries.length > 0 ? (
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-indigo-950">Active Cart Exchange</p>
                            <p className="text-[11px] text-indigo-700">Offset return lines against current items in cart ({count} items)</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void exchangeBill()}
                            className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                          >
                            Execute Exchange
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-6 text-center py-6 text-xs text-slate-400">
                    Enter an invoice number above to inspect purchase lines and initiate a return or exchange.
                  </div>
                )}
              </div>
            ) : null}



            {panel === "settings" ? (
              <div>
                <div className="flex items-center justify-between border-b border-[#eceef3] bg-[#f8f7ff] px-6 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">POS Counter Settings</h2>
                    <p className="text-xs text-muted">Configure sound on tap, stock rules, receipt layout, and counter display.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanel(null)}
                    className="grid size-8 cursor-pointer place-items-center rounded-full border border-[#eceef3] bg-white text-muted hover:text-ink"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-6 p-6">
                  {/* Theme Switcher Section */}
                  <section className="rounded-[12px] border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">POS Visual Theme</h3>
                    <p className="text-xs text-slate-500 mb-3">Custom color scheme for POS counter, action pills, and summary sidebar.</p>
                    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                      {[
                        { id: "slate", label: "Modern Slate", dot: "bg-[#0f172a]" },
                        { id: "charcoal", label: "Charcoal Dark", dot: "bg-[#18181b]" },
                        { id: "emerald", label: "Supermarket Emerald", dot: "bg-[#065f46]" },
                        { id: "violet", label: "Boutique Violet", dot: "bg-[#6b21a8]" },
                        { id: "amber", label: "Bakery Amber", dot: "bg-[#b45309]" },
                        { id: "light", label: "Crisp Light", dot: "bg-slate-200 border border-slate-300" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => updateSettings({ posTheme: t.id as any })}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition cursor-pointer ${
                            settings.posTheme === t.id
                              ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <span className={`size-6 rounded-lg ${t.dot}`} />
                          <span className="text-[10.5px] font-semibold text-slate-700">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Sound & Audio Section */}
                  <section className="rounded-[12px] border border-[#e6e4f5] bg-[#faf9ff] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <Volume2 size={16} className="text-accent" />
                          Sound on Product Tap
                        </h3>
                        <p className="mt-0.5 text-xs text-muted">Play an instant audio feedback tone whenever products or buttons are tapped.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => playPosSound(settings.soundTone, settings.soundVolume)}
                          className="h-8 cursor-pointer rounded-[8px] border border-accent/30 bg-white px-3 text-xs font-semibold text-accent hover:bg-[#efeefe]"
                        >
                          Test Sound
                        </button>
                        <input
                          type="checkbox"
                          checked={settings.tapSound}
                          onChange={() => {
                            const nextVal = !settings.tapSound;
                            updateSettings({ tapSound: nextVal });
                            if (nextVal) playPosSound(settings.soundTone, settings.soundVolume);
                          }}
                          className="size-4 accent-accent"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-muted">
                        Sound Tone Profile
                        <select
                          value={settings.soundTone}
                          onChange={(e) => {
                            const tone = e.target.value as SoundTone;
                            updateSettings({ soundTone: tone });
                            playPosSound(tone, settings.soundVolume);
                          }}
                          className="mt-1 h-9 w-full rounded-[8px] border border-[#eceef3] bg-white px-3 text-sm text-ink"
                        >
                          <option value="beep">Classic POS Beep</option>
                          <option value="click">Crisp Mechanical Click</option>
                          <option value="chime">Soft Dual Chime</option>
                          <option value="pop">Modern Pop</option>
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-muted">
                        Sound Volume ({Math.round(settings.soundVolume * 100)}%)
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.1}
                          value={settings.soundVolume}
                          onChange={(e) => {
                            const vol = Number(e.target.value);
                            updateSettings({ soundVolume: vol });
                            playPosSound(settings.soundTone, vol);
                          }}
                          className="mt-2.5 w-full accent-accent"
                        />
                      </label>
                    </div>
                  </section>

                  {/* Toggle switches grid */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Counter & Billing Options</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["allowOversell", "Allow overselling", "Complete POS sales even when on-hand shelf stock is zero."],
                          ["tapCardToAdd", "Tap anywhere on product card", "Tap the entire product card to add to cart immediately."],
                          ["holdSales", "Hold / Draft sales", "Park a bill and recall it later from Drafts."],
                          ["points", "Customer loyalty points", "Show loyalty points redemption box in the cart."],
                          ["enableDiscount", "Cart discount & reason", "Allow applying bill discounts directly on the counter."],
                          ["enableKhata", "Khata / Credit billing", "Allow putting counter bills on customer khata account."],
                          ["quickAdd", "Quick add customer", "Create a new customer directly inside the POS customer dialog."],
                          ["autoPrint", "Auto-print invoice", "Open the thermal receipt print dialog automatically after payment."],
                          ["showImages", "Show product images", "Display product photos on the POS product grid."],
                          ["showStock", "Show stock quantity", "Display current on-hand stock badge on product cards."],
                          ["showSku", "Show product SKU code", "Display barcode / SKU number under product title."],
                          ["showCategories", "Show category filter", "Display category filter dropdown in the POS top bar."],
                          ["showBrands", "Show brand filter", "Display brand filter dropdown in the POS top bar."],
                          ["showTaxBreakdown", "Show GST breakdown on receipt", "Print CGST & SGST split on thermal receipts."],
                        ] as const
                      ).map(([key, title, detail]) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-start justify-between gap-3 rounded-[10px] border border-[#eceef3] bg-white p-3 text-sm transition-colors hover:border-accent/40"
                        >
                          <span>
                            <span className="font-medium text-ink">{title}</span>
                            <span className="mt-0.5 block text-[12px] text-muted">{detail}</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(settings[key])}
                            onChange={() => updateSettings({ [key]: !settings[key] })}
                            className="mt-0.5 size-4 accent-accent"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Layout & Receipt Configuration */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    <label className="block text-xs font-medium text-muted">
                      Cart Layout Position
                      <select
                        value={settings.cartPosition ?? "right"}
                        onChange={(e) => updateSettings({ cartPosition: e.target.value as "right" | "left" })}
                        className="mt-1 h-10 w-full rounded-[8px] border border-[#eceef3] bg-white px-3 text-sm text-ink"
                      >
                        <option value="right">Right Side (Default)</option>
                        <option value="left">Left Side</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-muted">
                      Default Payment Method
                      <select
                        value={settings.defaultPayMethod}
                        onChange={(e) => {
                          const method = e.target.value as PosSettings["defaultPayMethod"];
                          updateSettings({ defaultPayMethod: method });
                          setPayMethod(method);
                        }}
                        className="mt-1 h-10 w-full rounded-[8px] border border-[#eceef3] bg-white px-3 text-sm text-ink"
                      >
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="card">Card</option>
                        <option value="khata">Khata</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-muted">
                      Receipt Paper Size
                      <select
                        value={settings.paperSize}
                        onChange={(e) => updateSettings({ paperSize: e.target.value as PosSettings["paperSize"] })}
                        className="mt-1 h-10 w-full rounded-[8px] border border-[#eceef3] bg-white px-3 text-sm text-ink"
                      >
                        <option value="80mm">80mm (Thermal Standard)</option>
                        <option value="58mm">58mm (Compact Thermal)</option>
                        <option value="A4">A4 Full Page</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-muted">
                      Product Grid Columns
                      <select
                        value={settings.gridColumns}
                        onChange={(e) => updateSettings({ gridColumns: Number(e.target.value) as 3 | 4 | 5 })}
                        className="mt-1 h-10 w-full rounded-[8px] border border-[#eceef3] bg-white px-3 text-sm text-ink"
                      >
                        <option value={3}>3 Columns (Large cards)</option>
                        <option value={4}>4 Columns (Standard)</option>
                        <option value={5}>5 Columns (Compact)</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-muted">
                      Items Per Page
                      <input
                        type="number"
                        min={4}
                        max={48}
                        value={settings.pageSize}
                        onChange={(event) => updateSettings({ pageSize: Number(event.target.value) || 12 })}
                        className="num mt-1 h-10 w-full rounded-[8px] border border-[#eceef3] bg-white px-3 text-sm text-ink"
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 border-t border-[#eceef3] pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSettings(defaultPosSettings);
                        localStorage.setItem(POS_SETTINGS_KEY, JSON.stringify(defaultPosSettings));
                      }}
                      className="h-10 cursor-pointer rounded-[8px] border border-[#eceef3] px-4 text-sm text-muted hover:text-ink"
                    >
                      Reset to Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setPanel(null)}
                      className="h-10 cursor-pointer rounded-[8px] bg-accent px-5 text-sm font-semibold text-accent-ink"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {panel === "today" ? (
              <div className="p-6">
                <h2 className="text-lg font-semibold">Today</h2>
                <p className="num mt-3 text-3xl font-semibold">{formatInr(todayPaise)}</p>
                <p className="mt-1 text-sm text-muted">Completed bills dated today, excluding voids.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* =====================================================================
          WEIGHING SCALE BRIDGE MODAL (WebSerial COM Port)
         ===================================================================== */}
      {scaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Scale size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">Weighing Scale Bridge</h3>
                  <p className="text-xs text-slate-500">
                    Connect USB/Serial COM scale (CAS, Essae, Phoenix, Toledo)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScaleModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {/* Large Digital Weight Display */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-center text-white shadow-inner">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                  LIVE SCALE READING
                </span>
                <div className="my-2 flex items-baseline justify-center gap-2">
                  <span className="font-mono text-5xl font-semibold tracking-tight text-white">
                    {liveWeightKg.toFixed(3)}
                  </span>
                  <span className="font-mono text-lg font-semibold text-slate-400">kg</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      isScaleConnected
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        isScaleConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                      }`}
                    />
                    <span>{scaleStatusText}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: Connect COM Port & Tare */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={connectScale}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Scale size={14} />
                  <span>Connect COM / USB Serial Port</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLiveWeightKg(0)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Zero / Tare
                </button>
              </div>

              {/* Simulation buttons for testing without hardware */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Hardware Test Presets (Instant Simulation)
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.25, 0.5, 1.0, 2.35].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => simulateScaleWeight(w)}
                      className="rounded-lg border border-slate-200 bg-white py-1.5 text-center font-mono text-xs font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer"
                    >
                      {w.toFixed(3)} kg
                    </button>
                  ))}
                </div>
              </div>

              {/* Helpful instructions */}
              <p className="text-[11px] text-slate-500 leading-normal">
                When active, loose and produce items tapped in POS will automatically calculate line totals based on this weight. Supports 9600 baud rate standard RS-232 / USB scale interfaces.
              </p>
            </div>

            <div className="mt-5 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setScaleModalOpen(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 cursor-pointer"
              >
                Apply &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top-Right Notification Toasts matching Image 3 */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Print Job Status Notifications & Fallback Dialog */}
      {printStatus?.type === "queued" ? (
        <div
          data-testid="print-job-queued"
          className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 rounded-[12px] border border-indigo-200 bg-white px-4 py-3 text-xs font-semibold text-indigo-900 shadow-xl"
        >
          <span className="size-2 rounded-full bg-indigo-500 animate-ping" />
          <span>{printStatus.message}</span>
        </div>
      ) : null}

      {printStatus?.type === "success" ? (
        <div
          data-testid="print-job-success"
          className="fixed bottom-5 left-5 z-50 flex items-center gap-2.5 rounded-[12px] border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold text-emerald-900 shadow-xl"
        >
          <span className="size-2 rounded-full bg-emerald-500" />
          <span>{printStatus.message}</span>
        </div>
      ) : null}

      {printFallbackPrompt ? (
        <div
          data-testid="print-fallback-dialog"
          className="fixed bottom-5 right-5 z-50 flex max-w-sm items-center justify-between gap-3 rounded-[12px] border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 shadow-2xl"
        >
          <div>
            <p className="font-semibold text-amber-950">Print Fallback Notice</p>
            <p className="mt-0.5">{printFallbackPrompt}</p>
          </div>
          <button
            type="button"
            onClick={() => setPrintFallbackPrompt(null)}
            className="rounded bg-amber-200/60 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Dedicated UPI QR Modal matching Image 2 */}
      {upiQrModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setUpiQrModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 relative border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button at top right */}
            <button
              type="button"
              onClick={() => setUpiQrModalOpen(false)}
              className="absolute right-5 top-5 h-8 w-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Title & Subtitle */}
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Scan to pay with UPI QR
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Order {posTempOrderRef} · {formatInr(totalDuePaise)}
            </p>

            {/* Provider Badge + Countdown */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[#5f259f] flex items-center justify-center p-1 text-white">
                <img src="/logos/phonepe.svg" alt="PhonePe" className="h-full w-full object-contain" />
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {Math.floor(qrTimerSeconds / 60)}:
                {String(qrTimerSeconds % 60).padStart(2, "0")}
              </span>
            </div>

            {/* Dynamic QR Code Card */}
            <div className="mt-4 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              {posUpiQrUrl ? (
                <img
                  src={posUpiQrUrl}
                  alt="UPI QR Code"
                  className="h-56 w-56 object-contain rounded-lg"
                />
              ) : (
                <div className="h-56 w-56 flex flex-col items-center justify-center text-xs text-slate-500 gap-2 px-3 text-center">
                  {upiQrError ? (
                    <span>{upiQrError}</span>
                  ) : (
                    <>
                      <QrCode className="h-12 w-12 animate-pulse text-slate-300" />
                      <span>Generating QR...</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* UPI ID */}
            {storeUpiVpa.includes("@") && (
              <div className="mt-3 text-xs text-slate-600">
                <span className="text-slate-400">UPI ID: </span>
                <span className="font-mono font-bold text-slate-800">
                  {storeUpiVpa}
                </span>
              </div>
            )}

            {/* Open UPI App link */}
            {storeUpiVpa.includes("@") && (
              <a
                href={`upi://pay?pa=${encodeURIComponent(
                  storeUpiVpa
                )}&pn=${encodeURIComponent(
                  storePayeeName || storeName || "Retail Store"
                )}&am=${(totalDuePaise / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(
                  posTempOrderRef
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
              >
                <span>Open UPI app</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}

            {/* Waiting status */}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Waiting for payment confirmation...</span>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 w-full flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={printPosUpiQrSlip}
                className="h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print QR</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUpiQrModalOpen(false)}
                  className="h-10 px-3 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel payment
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setPayMethod("upi");
                    setUpiQrModalOpen(false);
                    await pay();
                  }}
                  className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Payment Received</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Receipt Modal matching Image 3 */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        data={activeReceipt}
        loading={loadingReceiptModal}
        orderType="Dine in"
      />
    </div>
  );
}

type ParkedSale = { client_uuid: string; cash_tender_paise: number; lines: { store_item_id: string; qty: number }[] };

function posDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("selfx-pos", 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("outbox")) {
        request.result.createObjectStore("outbox", { keyPath: "client_uuid" });
      }
      if (!request.result.objectStoreNames.contains("catalog")) {
        request.result.createObjectStore("catalog", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveOutbox(sale: ParkedSale): Promise<void> {
  const db = await posDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").put(sale);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readOutbox(): Promise<ParkedSale[]> {
  const db = await posDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("outbox", "readonly");
    const request = tx.objectStore("outbox").getAll();
    request.onsuccess = () => resolve(request.result as ParkedSale[]);
    request.onerror = () => reject(request.error);
  });
}

async function clearOutbox(): Promise<void> {
  const db = await posDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("outbox", "readwrite");
    tx.objectStore("outbox").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function cacheCatalogLocally(items: Item[]): Promise<void> {
  try {
    const db = await posDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("catalog", "readwrite");
      const store = tx.objectStore("catalog");
      store.clear();
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

async function loadCachedCatalog(): Promise<Item[]> {
  try {
    const db = await posDb();
    return new Promise((resolve) => {
      const tx = db.transaction("catalog", "readonly");
      const req = tx.objectStore("catalog").getAll();
      req.onsuccess = () => resolve((req.result as Item[]) || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export default function PosPage() {
  return (
    <PasswordGate>
      <PosScreen />
    </PasswordGate>
  );
}
