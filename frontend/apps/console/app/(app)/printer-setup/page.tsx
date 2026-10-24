"use client";

import { Button, PageHeader } from "@selfx/ui";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Barcode,
  Bluetooth,
  Check,
  CheckCircle2,
  Cpu,
  Edit3,
  FileText,
  Monitor,
  Network,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  Usb,
  Wifi,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { checkAgentStatus, DEVICE_TOKEN_KEY } from "../../lib/print-transport";

type PrintMode = "browser" | "bridge" | "webusb";
type PaperFormat = "80mm" | "58mm" | "A4" | "label_50x25";

type HardwarePrinter = {
  id: string;
  name: string;
  role: string;
  connection: "lan" | "usb" | "bluetooth" | "serial" | "spooler";
  ipAddress: string;
  port: string;
  paperWidth: PaperFormat;
  dpi: "203" | "300";
  codepage: string;
  autoCut: "partial" | "full" | "none";
  openDrawer: "none" | "pin2" | "pin5";
  buzzer: boolean;
  feedLines: number;
  density: "light" | "normal" | "dark";
  status: "online" | "standby";
};

type RoutingRule = {
  id: string;
  docType: string;
  description: string;
  printerId: string;
  paperFormat: PaperFormat;
  copies: number;
  autoPrint: boolean;
  openDrawer: boolean;
  cutPaper: boolean;
};

type ReceiptBlock = {
  id: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  fontSize: "S" | "M" | "L";
  align: "left" | "center" | "right";
  bold: boolean;
  tags: string[];
};

type PrinterSetupState = {
  activeModes: Record<PrintMode, boolean>;
  bridgeHost: string;
  bridgePort: string;
  fallbackToBrowser: boolean;
  silentPrint: boolean;
  printers: HardwarePrinter[];
  routing: RoutingRule[];
  activeTemplateTab: PaperFormat;
  headerStoreName: string;
  headerTagline: string;
  headerAddress: string;
  headerPhone: string;
  headerGstin: string;
  headerFssai: string;
  headerDrugLic: string;
  invoiceTitle: string;
  upiVpa: string;
  upiPayeeName: string;
  returnPolicyText: string;
  footerThankYou: string;
  blocks: ReceiptBlock[];
};

const PRINTER_STORAGE_KEY = "selfx-printer-setup-v1";

const defaultPrinterState: PrinterSetupState = {
  activeModes: {
    browser: true,
    bridge: true,
    webusb: false,
  },
  bridgeHost: "127.0.0.1",
  bridgePort: "9100",
  fallbackToBrowser: true,
  silentPrint: true,
  printers: [
    {
      id: "prn-counter-1",
      name: "Epson TM-T82III Counter #1",
      role: "Primary POS Thermal Printer",
      connection: "usb",
      ipAddress: "192.168.1.201",
      port: "9100",
      paperWidth: "80mm",
      dpi: "203",
      codepage: "PC437 / UTF-8",
      autoCut: "partial",
      openDrawer: "pin2",
      buzzer: false,
      feedLines: 4,
      density: "normal",
      status: "online",
    },
    {
      id: "prn-label-1",
      name: "TSC TE244 Barcode Roll Printer",
      role: "Product Barcode & Shelf Labels",
      connection: "lan",
      ipAddress: "192.168.1.205",
      port: "9100",
      paperWidth: "label_50x25",
      dpi: "203",
      codepage: "TSPL / ZPL",
      autoCut: "none",
      openDrawer: "none",
      buzzer: false,
      feedLines: 1,
      density: "dark",
      status: "online",
    },
    {
      id: "prn-a4-1",
      name: "HP LaserJet Pro A4",
      role: "B2B GST Tax Invoices & Reports",
      connection: "spooler",
      ipAddress: "",
      port: "",
      paperWidth: "A4",
      dpi: "300",
      codepage: "PDF / OS Driver",
      autoCut: "none",
      openDrawer: "none",
      buzzer: false,
      feedLines: 0,
      density: "normal",
      status: "standby",
    },
  ],
  routing: [
    {
      id: "rt-pos",
      docType: "POS Counter Receipt",
      description: "Instant customer bill printed upon POS payment completion",
      printerId: "prn-counter-1",
      paperFormat: "80mm",
      copies: 1,
      autoPrint: true,
      openDrawer: true,
      cutPaper: true,
    },
    {
      id: "rt-gst-a4",
      docType: "B2B GST Tax Invoice",
      description: "Full A4 tax invoice with HSN summary and buyer GSTIN",
      printerId: "prn-a4-1",
      paperFormat: "A4",
      copies: 2,
      autoPrint: false,
      openDrawer: false,
      cutPaper: false,
    },
    {
      id: "rt-pick",
      docType: "Online Order Packing / Pick Slip",
      description: "Warehouse picking checklist when an online order is accepted",
      printerId: "prn-counter-1",
      paperFormat: "80mm",
      copies: 1,
      autoPrint: true,
      openDrawer: false,
      cutPaper: true,
    },
    {
      id: "rt-label",
      docType: "Barcode Product Labels",
      description: "Adhesive SKU barcode stickers with MRP and store branding",
      printerId: "prn-label-1",
      paperFormat: "label_50x25",
      copies: 1,
      autoPrint: false,
      openDrawer: false,
      cutPaper: false,
    },
    {
      id: "rt-khata",
      docType: "Khata / Credit Acknowledgment Slip",
      description: "Customer credit ledger balance and payment receipt",
      printerId: "prn-counter-1",
      paperFormat: "80mm",
      copies: 1,
      autoPrint: false,
      openDrawer: false,
      cutPaper: true,
    },
    {
      id: "rt-shift",
      docType: "Shift Closing Z-Report",
      description: "End-of-day register cash count and tender reconciliation",
      printerId: "prn-counter-1",
      paperFormat: "80mm",
      copies: 1,
      autoPrint: true,
      openDrawer: true,
      cutPaper: true,
    },
  ],
  activeTemplateTab: "80mm",
  headerStoreName: "ANNAPURNA SUPERMARKET",
  headerTagline: "Fresh Groceries & Daily Essentials",
  headerAddress: "Plot 42, Road No. 12, Banjara Hills, Hyderabad - 500034",
  headerPhone: "+91 98765 43210",
  headerGstin: "36AABCA1234F1Z5",
  headerFssai: "13621011000452",
  headerDrugLic: "",
  invoiceTitle: "TAX INVOICE",
  upiVpa: "annapurnastore@icici",
  upiPayeeName: "Annapurna Supermarket",
  returnPolicyText: "Goods once sold can be exchanged within 7 days with original bill.",
  footerThankYou: "Thank you for shopping with us! Visit again.",
  blocks: [
    {
      id: "store_logo",
      title: "Store Logo & Monogram",
      subtitle: "High-contrast monochrome bitmap logo at the top of the receipt",
      enabled: true,
      fontSize: "L",
      align: "center",
      bold: true,
      tags: ["Logo", "Header"],
    },
    {
      id: "store_identity",
      title: "Store Name & Tagline",
      subtitle: "Legal trade name and store subtitle banner",
      enabled: true,
      fontSize: "L",
      align: "center",
      bold: true,
      tags: ["Trade Name", "Tagline"],
    },
    {
      id: "store_contact",
      title: "Store Address & Contact Info",
      subtitle: "Branch street address, city, PIN code, and support phone number",
      enabled: true,
      fontSize: "S",
      align: "center",
      bold: false,
      tags: ["Address", "Phone", "Email"],
    },
    {
      id: "tax_licences",
      title: "GSTIN, FSSAI & Statutory Licenses",
      subtitle: "Mandatory tax registration numbers printed below address",
      enabled: true,
      fontSize: "S",
      align: "center",
      bold: true,
      tags: ["GSTIN", "FSSAI", "CIN"],
    },
    {
      id: "invoice_banner",
      title: "Invoice Title Header",
      subtitle: "Displays TAX INVOICE, CASH MEMO, or ESTIMATE title bar",
      enabled: true,
      fontSize: "M",
      align: "center",
      bold: true,
      tags: ["TAX INVOICE"],
    },
    {
      id: "invoice_meta",
      title: "Bill Number, Date & Time",
      subtitle: "Sequential invoice reference, date, and exact timestamp",
      enabled: true,
      fontSize: "S",
      align: "left",
      bold: false,
      tags: ["Bill No", "Date", "Time"],
    },
    {
      id: "register_cashier",
      title: "POS Register & Cashier Name",
      subtitle: "Counter terminal code, shift ID, and billed staff member",
      enabled: true,
      fontSize: "S",
      align: "left",
      bold: false,
      tags: ["Counter", "Cashier", "Channel"],
    },
    {
      id: "customer_info",
      title: "Customer Details & GSTIN",
      subtitle: "Customer name, phone number, B2B GSTIN, and delivery address",
      enabled: true,
      fontSize: "S",
      align: "left",
      bold: false,
      tags: ["Customer Name", "Mobile", "Buyer GSTIN"],
    },
    {
      id: "line_items",
      title: "Itemized Products Table",
      subtitle: "Product name, qty, unit rate, and line total columns",
      enabled: true,
      fontSize: "M",
      align: "left",
      bold: false,
      tags: ["Item Name", "Qty", "Rate", "Total"],
    },
    {
      id: "item_hsn_sku",
      title: "HSN Code, SKU & Tax % per Line",
      subtitle: "Print secondary sub-line under each item with HSN and SKU",
      enabled: true,
      fontSize: "S",
      align: "left",
      bold: false,
      tags: ["HSN", "SKU", "GST %"],
    },
    {
      id: "item_mrp_savings",
      title: "MRP vs Selling Price Column",
      subtitle: "Show original MRP alongside discounted selling price",
      enabled: true,
      fontSize: "S",
      align: "left",
      bold: false,
      tags: ["MRP", "Item Discount"],
    },
    {
      id: "subtotal_discounts",
      title: "Subtotal, Promo Discount & Shipping",
      subtitle: "Gross subtotal, coupon/manual discount, and delivery fee",
      enabled: true,
      fontSize: "S",
      align: "right",
      bold: false,
      tags: ["Subtotal", "Discount", "Shipping"],
    },
    {
      id: "gst_breakup",
      title: "GST Tax Breakup Table (CGST / SGST / IGST)",
      subtitle: "Detailed taxable value, CGST, SGST, and total tax summary",
      enabled: true,
      fontSize: "S",
      align: "left",
      bold: false,
      tags: ["Taxable", "CGST", "SGST"],
    },
    {
      id: "grand_total",
      title: "Grand Total & Round-Off Banner",
      subtitle: "High-visibility net payable total with coin round-off",
      enabled: true,
      fontSize: "L",
      align: "right",
      bold: true,
      tags: ["Grand Total", "Round Off"],
    },
    {
      id: "items_qty_summary",
      title: "Total Items & Total Quantity Count",
      subtitle: "Quick bag-check counter (e.g. Items: 4 | Total Qty: 7)",
      enabled: true,
      fontSize: "S",
      align: "center",
      bold: true,
      tags: ["Items Count", "Total Qty"],
    },
    {
      id: "savings_highlight",
      title: "Customer Total Savings Box",
      subtitle: "Highlighted banner showing 'YOU SAVED ₹... ON THIS BILL!'",
      enabled: true,
      fontSize: "M",
      align: "center",
      bold: true,
      tags: ["You Saved Banner"],
    },
    {
      id: "payment_tender",
      title: "Payment Mode, Tendered Cash & Change",
      subtitle: "Breakdown of Cash, Card, UPI, or Khata tender and change returned",
      enabled: true,
      fontSize: "S",
      align: "left",
      bold: false,
      tags: ["Payment Mode", "Cash Tendered", "Change"],
    },
    {
      id: "loyalty_khata",
      title: "Loyalty Points & Khata Balance Summary",
      subtitle: "Points earned on this bill, available points, and credit due",
      enabled: true,
      fontSize: "S",
      align: "center",
      bold: false,
      tags: ["Points Earned", "Total Points", "Khata Balance"],
    },
    {
      id: "upi_qr_code",
      title: "Dynamic UPI Payment QR Code",
      subtitle: "Prints scannable BHIM / PhonePe / GPay QR code with exact bill amount",
      enabled: true,
      fontSize: "M",
      align: "center",
      bold: true,
      tags: ["UPI QR", "VPA ID"],
    },
    {
      id: "invoice_barcode",
      title: "Scannable Invoice Barcode (CODE-128)",
      subtitle: "1D barcode at bottom of receipt for instant bill lookup & returns",
      enabled: true,
      fontSize: "M",
      align: "center",
      bold: false,
      tags: ["CODE128", "Quick Return"],
    },
    {
      id: "footer_policy",
      title: "Return Policy & Thank You Footer",
      subtitle: "Exchange terms, store hours, and custom thank-you message",
      enabled: true,
      fontSize: "S",
      align: "center",
      bold: false,
      tags: ["Terms", "Thank You"],
    },
  ],
};

function token() {
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

export default function PrinterSetupPage() {
  const [state, setState] = useState<PrinterSetupState>(defaultPrinterState);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [editingPrinter, setEditingPrinter] = useState<HardwarePrinter | null>(null);
  const [showAddPrinter, setShowAddPrinter] = useState(false);
  const [showPairModal, setShowPairModal] = useState(false);
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [pairingStatus, setPairingStatus] = useState<string | null>(null);
  const [isAgentOnline, setIsAgentOnline] = useState(false);
  const [deviceToken, setDeviceToken] = useState("");

  const refreshAgentStatus = useCallback(async () => {
    const online = await checkAgentStatus();
    setIsAgentOnline(online);
    if (typeof window !== "undefined") {
      setDeviceToken(window.localStorage.getItem(DEVICE_TOKEN_KEY) || "");
    }
  }, []);

  async function fetchCodeFromAgent() {
    setPairingStatus("Contacting local agent...");
    try {
      const res = await fetch("http://127.0.0.1:27182/pair", { method: "POST" });
      if (res.ok) {
        const body = (await res.json()) as { code?: string };
        if (body.code) {
          setPairCodeInput(body.code);
          setPairingStatus(`Code ${body.code} generated by local agent. Click 'Authorize & Pair' to link.`);
        }
      } else {
        setPairingStatus("Could not fetch code from Print Agent. Is it running on port 27182?");
      }
    } catch {
      setPairingStatus("Agent not responding on 127.0.0.1:27182. Please verify Print Agent is running.");
    }
  }

  async function submitPairCode() {
    if (!storeId || !pairCodeInput.trim()) return;
    setPairingStatus("Authorizing pairing code with backend...");
    try {
      const res = await fetch("/api/v1/printers/pair", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token(),
        },
        body: JSON.stringify({
          code: pairCodeInput.trim(),
          store_id: storeId,
          agent_fingerprint: "agent-local",
        }),
      });

      const body = await res.json();
      if (res.ok && body.data?.device_token) {
        window.localStorage.setItem(DEVICE_TOKEN_KEY, body.data.device_token);
        setDeviceToken(body.data.device_token);
        setPairingStatus("Pairing successful! Device token registered.");
        setNotice({ text: "Print Agent successfully authorized and paired with store.", error: false });
        setTimeout(() => setShowPairModal(false), 1200);
      } else {
        setPairingStatus(body.error?.message || "Invalid or expired pairing code.");
      }
    } catch (err: any) {
      setPairingStatus(err?.message || "Failed to submit pairing code.");
    }
  }

  function unpairAgent() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(DEVICE_TOKEN_KEY);
      setDeviceToken("");
      setPairingStatus("Agent unpaired from this browser.");
      setNotice({ text: "Print Agent unpaired from this terminal.", error: false });
    }
  }

  const [previewMode, setPreviewMode] = useState<"visual" | "server">("visual");
  const [serverHtml, setServerHtml] = useState<string>("");
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);
  const [loadingServerPreview, setLoadingServerPreview] = useState(false);

  const fetchServerPreview = useCallback(async () => {
    setLoadingServerPreview(true);
    try {
      const res = await fetch("/api/v1/templates/preview", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token(),
        },
        body: JSON.stringify({
          kind: "receipt",
          locale: "en",
          driver: "system",
          content: {
            paper_width_mm: state.activeTemplateTab === "58mm" ? 58 : 80,
            blocks: state.blocks,
          },
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: { html?: string; warnings?: string[] } };
        setServerHtml(body.data?.html || "");
        setServerWarnings(body.data?.warnings || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingServerPreview(false);
    }
  }, [state.activeTemplateTab, state.blocks]);


  const load = useCallback(async () => {
    try {
      const saved = window.localStorage.getItem(PRINTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<PrinterSetupState>;
        setState((prev) => ({
          ...prev,
          ...parsed,
          blocks: parsed.blocks && parsed.blocks.length > 0 ? parsed.blocks : prev.blocks,
          printers: parsed.printers && parsed.printers.length > 0 ? parsed.printers : prev.printers,
          routing: parsed.routing && parsed.routing.length > 0 ? parsed.routing : prev.routing,
        }));
      }
    } catch {
      // ignore local storage parse error
    }

    const me = await fetch("/api/v1/auth/staff/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (me.status === 401 || me.status === 403) {
      window.location.href = "/login";
      return;
    }
    if (!me.ok) return;
    const meBody = (await me.json()) as { data?: { store?: { id: string; name?: string } } };
    const id = meBody.data?.store?.id;
    if (!id) return;
    setStoreId(id);

    // Sync from backend printers table
    fetch(`/api/v1/printers?store_id=${id}`, { credentials: "include", headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((prnBody) => {
        if (prnBody.data && Array.isArray(prnBody.data) && prnBody.data.length > 0) {
          const mapped: HardwarePrinter[] = prnBody.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            role: "Billing Counter Thermal",
            connection: (p.transport === "agent" ? "lan" : p.transport === "browser_raw" ? "usb" : "spooler") as any,
            paperWidth: "80mm",
            ipAddress: p.connection_params?.ip || "192.168.1.100",
            port: String(p.connection_params?.port || 9100),
            status: p.status === "online" ? "online" : "offline",
            isDefault: false,
            openDrawer: "pin2",
            feedLines: 2,
          }));
          setState((prev) => ({ ...prev, printers: mapped }));
        }
      })
      .catch(() => {});

    const receiptRes = await fetch(`/api/v1/stores/${id}/receipt`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (receiptRes.ok) {
      const body = (await receiptRes.json()) as {
        data: {
          receipt_footer?: string;
          printer_settings?: Partial<PrinterSetupState> | null;
        };
      };
      if (body.data.printer_settings && Object.keys(body.data.printer_settings).length > 0) {
        setState((prev) => ({
          ...prev,
          ...body.data.printer_settings,
          blocks: body.data.printer_settings?.blocks ?? prev.blocks,
          printers: body.data.printer_settings?.printers ?? prev.printers,
          routing: body.data.printer_settings?.routing ?? prev.routing,
        }));
      } else if (body.data.receipt_footer) {
        setState((prev) => ({ ...prev, footerThankYou: body.data.receipt_footer || prev.footerThankYou }));
      }
    }
  }, []);

  useEffect(() => {
    void load();
    void refreshAgentStatus();
  }, [load, refreshAgentStatus]);

  async function saveAllSettings(nextState = state) {
    setSaving(true);
    try {
      window.localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(nextState));
      if (storeId) {
        // Sync store receipt
        await fetch(`/api/v1/stores/${storeId}/receipt`, {
          method: "PUT",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": token(),
          },
          body: JSON.stringify({
            receipt_footer: nextState.footerThankYou,
            printer_settings: nextState,
          }),
        }).catch(() => {});

        // Sync printers to backend
        for (const prn of nextState.printers) {
          await fetch(`/api/v1/printers`, {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "X-XSRF-TOKEN": token(),
            },
            body: JSON.stringify({
              store_id: storeId,
              name: prn.name,
              transport: prn.connection === "lan" ? "agent" : prn.connection === "usb" ? "browser_raw" : "browser_dialog",
              driver: "escpos",
              connection_params: { ip: prn.ipAddress, port: prn.port },
            }),
          }).catch(() => {});
        }
      }
      setNotice({ text: "Printer hardware routing and receipt template settings saved.", error: false });
    } finally {
      setSaving(false);
    }
  }

  async function triggerTestPrint(kind: "receipt" | "label" = "receipt") {
    if (storeId) {
      await fetch("/api/v1/print-jobs", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": token(),
        },
        body: JSON.stringify({ kind, cut: "partial", drawer: true, store_id: storeId, purpose: "test" }),
      }).catch(() => {});
    }
  }

  function updateBlock(id: string, patch: Partial<ReceiptBlock>) {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }

  function isBlockEnabled(id: string) {
    return state.blocks.find((b) => b.id === id)?.enabled ?? true;
  }

  function blockStyle(id: string) {
    const b = state.blocks.find((item) => item.id === id);
    if (!b) return "text-center text-[11px]";
    const size =
      b.fontSize === "L" ? "text-[13.5px]" : b.fontSize === "M" ? "text-[12px]" : "text-[10.5px]";
    const align =
      b.align === "left" ? "text-left" : b.align === "right" ? "text-right" : "text-center";
    const weight = b.bold ? "font-semibold" : "font-normal";
    return `${size} ${align} ${weight}`;
  }

  return (
    <div className="space-y-6 pb-14">
      <PageHeader
        title="Printer Setup & Receipt Studio"
        description="Configure thermal & barcode printer hardware, connection modes, document routing, and live receipt layout."
        aside={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void triggerTestPrint("receipt")}
            >
              <Printer size={14} className="mr-1.5" />
              Test Print Sample
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={() => void saveAllSettings(state)}
            >
              <Save size={14} className="mr-1.5" />
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        }
      />

      {notice ? (
        <div
          className={`flex items-center justify-between rounded-[12px] border px-4 py-3 text-sm font-medium ${
            notice.error
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {notice.text}
          </span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}

      {/* =====================================================================
          SECTION 1: PRINT CONNECTION ARCHITECTURE & MODES (Matches Image 4 Top)
         ===================================================================== */}
      <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-sky-50 text-sky-600">
              <Cpu size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Print Connection Architecture</h2>
              <p className="text-[12px] text-muted">
                Enable one or more print transport engines for your POS counters and warehouse stations
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                isAgentOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              <span className={`size-2 rounded-full ${isAgentOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {isAgentOnline ? "Agent Online (127.0.0.1:27182)" : "Agent Offline"}
              <button
                type="button"
                onClick={() => void refreshAgentStatus()}
                title="Refresh Agent Status"
                className="ml-1 text-slate-500 hover:text-slate-900"
              >
                <RefreshCw size={11} />
              </button>
            </div>

            <Button
              type="button"
              variant={deviceToken ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                setShowPairModal(true);
                setPairingStatus(null);
              }}
            >
              <Zap size={13} className="mr-1" />
              {deviceToken ? "Agent Paired ✓" : "Pair Print Agent"}
            </Button>
          </div>
        </div>

        {/* 3 Mode Cards (Purple, Amber, Emerald — Matches Image 4) */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Mode 1: Browser / System Dialog */}
          <div
            className={`rounded-[14px] border p-4 transition ${
              state.activeModes.browser
                ? "border-violet-300 bg-[#faf5ff]"
                : "border-line bg-bg/50 opacity-75"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-violet-600 text-white shadow-xs">
                <Monitor size={18} />
              </span>
              <input
                type="checkbox"
                checked={state.activeModes.browser}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    activeModes: { ...s.activeModes, browser: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded accent-violet-600"
              />
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-ink">Browser / OS Print Engine</h3>
            <p className="mt-1 text-[12px] text-muted">
              Uses macOS / Windows CUPS & system drivers. Works with all USB, Wi-Fi, and AirPrint printers.
            </p>
            <span className="mt-3 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
              Universal Zero-Setup
            </span>
          </div>

          {/* Mode 2: Local Bridge / Raw Socket (LAN 9100) */}
          <div
            className={`rounded-[14px] border p-4 transition ${
              state.activeModes.bridge
                ? "border-amber-300 bg-[#fffbeb]"
                : "border-line bg-bg/50 opacity-75"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-amber-500 text-white shadow-xs">
                <Network size={18} />
              </span>
              <input
                type="checkbox"
                checked={state.activeModes.bridge}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    activeModes: { ...s.activeModes, bridge: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded accent-amber-500"
              />
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-ink">SelfX Local Print Bridge (ESC/POS)</h3>
            <p className="mt-1 text-[12px] text-muted">
              Silent 1-click printing over Ethernet IP (Port 9100) or USB with automatic paper cutter & RJ11 cash drawer pulse.
            </p>
            <span className="mt-3 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              Silent High-Speed
            </span>
          </div>

          {/* Mode 3: WebUSB / WebSerial */}
          <div
            className={`rounded-[14px] border p-4 transition ${
              state.activeModes.webusb
                ? "border-emerald-300 bg-[#ecfdf5]"
                : "border-line bg-bg/50 opacity-75"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-emerald-600 text-white shadow-xs">
                <Usb size={18} />
              </span>
              <input
                type="checkbox"
                checked={state.activeModes.webusb}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    activeModes: { ...s.activeModes, webusb: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded accent-emerald-600"
              />
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-ink">Direct WebUSB / Bluetooth Thermal</h3>
            <p className="mt-1 text-[12px] text-muted">
              Connects directly from Chrome/Edge to USB or BLE thermal & label printers without background software.
            </p>
            <span className="mt-3 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
              Direct Hardware IO
            </span>
          </div>
        </div>

        {/* Document Routing Matrix Table (Matches Image 4 Matrix) */}
        <div className="mt-6 rounded-[14px] border border-line bg-bg/40 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">Document Print Routing Matrix</h3>
              <p className="text-[12px] text-muted">
                Map each retail slip type to its target printer, paper format, copy count, and hardware triggers
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 pr-4">Document Type</th>
                  <th className="py-2.5 pr-4">Target Printer</th>
                  <th className="py-2.5 pr-4">Paper Size</th>
                  <th className="py-2.5 pr-4 text-center">Copies</th>
                  <th className="py-2.5 pr-4 text-center">Auto-Print</th>
                  <th className="py-2.5 pr-4 text-center">Kick Cash Drawer</th>
                  <th className="py-2.5 text-center">Auto-Cut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {state.routing.map((rule) => (
                  <tr key={rule.id} className="hover:bg-white/80">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-ink">{rule.docType}</p>
                      <p className="text-[11px] text-muted">{rule.description}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={rule.printerId}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            routing: s.routing.map((r) =>
                              r.id === rule.id ? { ...r, printerId: e.target.value } : r,
                            ),
                          }))
                        }
                        className="h-9 rounded-[8px] border border-line bg-white px-2.5 text-xs font-semibold text-ink"
                      >
                        {state.printers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={rule.paperFormat}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            routing: s.routing.map((r) =>
                              r.id === rule.id
                                ? { ...r, paperFormat: e.target.value as PaperFormat }
                                : r,
                            ),
                          }))
                        }
                        className="h-9 rounded-[8px] border border-line bg-white px-2.5 text-xs font-semibold text-ink"
                      >
                        <option value="80mm">80mm Thermal</option>
                        <option value="58mm">58mm Thermal</option>
                        <option value="A4">A4 Sheet</option>
                        <option value="label_50x25">Barcode 50×25mm</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={rule.copies}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            routing: s.routing.map((r) =>
                              r.id === rule.id
                                ? { ...r, copies: Math.max(1, Number(e.target.value || 1)) }
                                : r,
                            ),
                          }))
                        }
                        className="num h-8 w-14 rounded-[6px] border border-line bg-white text-center text-xs font-semibold"
                      />
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <input
                        type="checkbox"
                        checked={rule.autoPrint}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            routing: s.routing.map((r) =>
                              r.id === rule.id ? { ...r, autoPrint: e.target.checked } : r,
                            ),
                          }))
                        }
                        className="h-4 w-4 rounded accent-[#6366f1]"
                      />
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <input
                        type="checkbox"
                        checked={rule.openDrawer}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            routing: s.routing.map((r) =>
                              r.id === rule.id ? { ...r, openDrawer: e.target.checked } : r,
                            ),
                          }))
                        }
                        className="h-4 w-4 rounded accent-amber-500"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={rule.cutPaper}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            routing: s.routing.map((r) =>
                              r.id === rule.id ? { ...r, cutPaper: e.target.checked } : r,
                            ),
                          }))
                        }
                        className="h-4 w-4 rounded accent-emerald-600"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: CONFIGURED HARDWARE PRINTERS FLEET
         ===================================================================== */}
      <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Configured Hardware Printers ({state.printers.length})</h2>
            <p className="text-[12px] text-muted">
              Manage thermal receipt printers, barcode label roll printers, and A4 laser printers
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingPrinter({
                id: `prn-${Date.now()}`,
                name: "",
                role: "Counter Receipt Printer",
                connection: "lan",
                ipAddress: "192.168.1.210",
                port: "9100",
                paperWidth: "80mm",
                dpi: "203",
                codepage: "PC437 / UTF-8",
                autoCut: "partial",
                openDrawer: "pin2",
                buzzer: false,
                feedLines: 4,
                density: "normal",
                status: "online",
              });
              setShowAddPrinter(true);
            }}
          >
            <Plus size={14} className="mr-1.5" />
            Add Hardware Printer
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {state.printers.map((prn) => (
            <article
              key={prn.id}
              className="flex flex-col justify-between rounded-[14px] border border-line bg-bg/40 p-4 transition hover:border-indigo-200 hover:bg-surface"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-indigo-50 text-indigo-600">
                      {prn.connection === "lan" ? (
                        <Wifi size={18} />
                      ) : prn.connection === "bluetooth" ? (
                        <Bluetooth size={18} />
                      ) : (
                        <Printer size={18} />
                      )}
                    </span>
                    <div>
                      <h3 className="text-[14px] font-semibold text-ink">{prn.name}</h3>
                      <p className="text-[11px] text-muted">{prn.role}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                    {prn.status}
                  </span>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-[10px] border border-line bg-surface p-2.5 text-[11px]">
                  <div>
                    <span className="text-muted">Interface:</span>{" "}
                    <strong className="uppercase text-ink">{prn.connection}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Format:</span>{" "}
                    <strong className="text-ink">{prn.paperWidth}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Address:</span>{" "}
                    <strong className="font-mono text-ink">
                      {prn.ipAddress ? `${prn.ipAddress}:${prn.port}` : "Local Port"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted">Cutter / Drawer:</span>{" "}
                    <strong className="capitalize text-ink">
                      {prn.autoCut} / {prn.openDrawer}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => void triggerTestPrint(prn.paperWidth === "label_50x25" ? "label" : "receipt")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <Zap size={13} />
                  Test Print
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPrinter(prn);
                      setShowAddPrinter(true);
                    }}
                    className="rounded-[6px] border border-line p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <Edit3 size={13} />
                  </button>
                  {state.printers.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          printers: s.printers.filter((item) => item.id !== prn.id),
                        }))
                      }
                      className="rounded-[6px] border border-line p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: RECEIPT & INVOICE DESIGN STUDIO + LIVE THERMAL PREVIEW (Image 4)
         ===================================================================== */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_400px]">
        {/* Left Column: Paper Tabs, Store Header Values, and 21 Modular Toggleable Blocks */}
        <div className="space-y-6">
          {/* Paper Format Selector Bar */}
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Receipt & Label Template Customizer</h2>
                <p className="text-[12px] text-muted">
                  Configure store branding, statutory IDs, and toggle individual receipt sections
                </p>
              </div>
              <div className="inline-flex rounded-[10px] border border-line bg-bg p-1">
                {(
                  [
                    { id: "80mm", label: "80mm (3 in)" },
                    { id: "58mm", label: "58mm (2 in)" },
                    { id: "A4", label: "A4 Invoice" },
                    { id: "label_50x25", label: "Barcode Label" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setState((s) => ({ ...s, activeTemplateTab: tab.id }))}
                    className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold transition ${
                      state.activeTemplateTab === tab.id
                        ? "bg-[#6366f1] text-white shadow-2xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Store Header & Statutory Fields */}
            <div className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <label className="block text-[12px] font-semibold text-ink">
                Printed Store / Trade Name
                <input
                  value={state.headerStoreName}
                  onChange={(e) => setState((s) => ({ ...s, headerStoreName: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Store Tagline / Subtitle
                <input
                  value={state.headerTagline}
                  onChange={(e) => setState((s) => ({ ...s, headerTagline: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink sm:col-span-2">
                Store Branch Address
                <input
                  value={state.headerAddress}
                  onChange={(e) => setState((s) => ({ ...s, headerAddress: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Customer Care Phone
                <input
                  value={state.headerPhone}
                  onChange={(e) => setState((s) => ({ ...s, headerPhone: e.target.value }))}
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Invoice Header Title
                <input
                  value={state.invoiceTitle}
                  onChange={(e) => setState((s) => ({ ...s, invoiceTitle: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                GSTIN Number
                <input
                  value={state.headerGstin}
                  onChange={(e) => setState((s) => ({ ...s, headerGstin: e.target.value }))}
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal uppercase"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                FSSAI / Food License No.
                <input
                  value={state.headerFssai}
                  onChange={(e) => setState((s) => ({ ...s, headerFssai: e.target.value }))}
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                UPI VPA ID (for Dynamic QR on Bill)
                <input
                  value={state.upiVpa}
                  onChange={(e) => setState((s) => ({ ...s, upiVpa: e.target.value }))}
                  placeholder="merchant@upi"
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink">
                Drug License No. (Pharmacy Optional)
                <input
                  value={state.headerDrugLic}
                  onChange={(e) => setState((s) => ({ ...s, headerDrugLic: e.target.value }))}
                  placeholder="e.g. DL-20B/21B"
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink sm:col-span-2">
                Return / Exchange Policy Note
                <input
                  value={state.returnPolicyText}
                  onChange={(e) => setState((s) => ({ ...s, returnPolicyText: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
              <label className="block text-[12px] font-semibold text-ink sm:col-span-2">
                Thank You Footer Message
                <input
                  value={state.footerThankYou}
                  onChange={(e) => setState((s) => ({ ...s, footerThankYou: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>
            </div>
          </section>

          {/* Modular Receipt Sections List (Matches Image 4 Block Stack) */}
          <section className="rounded-[16px] border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-indigo-50 text-indigo-600">
                  <Settings2 size={17} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">Modular Receipt Blocks ({state.blocks.length})</h3>
                  <p className="text-[12px] text-muted">
                    Toggle visibility, font size (S/M/L), text alignment, and bold weight for every section
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      blocks: s.blocks.map((b) => ({ ...b, enabled: true })),
                    }))
                  }
                  className="rounded-[7px] border border-line px-2.5 py-1 text-xs font-semibold text-ink hover:bg-bg"
                >
                  Enable All
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {state.blocks.map((block, index) => (
                <div
                  key={block.id}
                  className={`rounded-[12px] border p-4 transition ${
                    block.enabled
                      ? "border-slate-200 bg-white shadow-2xs"
                      : "border-slate-100 bg-slate-50/60 opacity-65"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="num mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-[11px] font-semibold text-indigo-600">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="text-[13.5px] font-semibold text-ink">{block.title}</h4>
                        <p className="text-[11.5px] text-muted">{block.subtitle}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {block.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-indigo-50/80 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Font Size S / M / L */}
                      <div className="inline-flex rounded-[7px] border border-line bg-bg p-0.5 text-[11px] font-semibold">
                        {(["S", "M", "L"] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => updateBlock(block.id, { fontSize: sz })}
                            className={`h-6 w-6 rounded-[5px] transition ${
                              block.fontSize === sz
                                ? "bg-indigo-600 text-white"
                                : "text-muted hover:text-ink"
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>

                      {/* Alignment Left / Center / Right */}
                      <div className="inline-flex rounded-[7px] border border-line bg-bg p-0.5">
                        {(
                          [
                            { id: "left", icon: AlignLeft },
                            { id: "center", icon: AlignCenter },
                            { id: "right", icon: AlignRight },
                          ] as const
                        ).map((al) => {
                          const Icon = al.icon;
                          return (
                            <button
                              key={al.id}
                              type="button"
                              onClick={() => updateBlock(block.id, { align: al.id })}
                              className={`grid h-6 w-6 place-items-center rounded-[5px] transition ${
                                block.align === al.id
                                  ? "bg-indigo-600 text-white"
                                  : "text-muted hover:text-ink"
                              }`}
                            >
                              <Icon size={12} />
                            </button>
                          );
                        })}
                      </div>

                      {/* Bold Toggle */}
                      <button
                        type="button"
                        onClick={() => updateBlock(block.id, { bold: !block.bold })}
                        className={`h-7 rounded-[7px] border px-2 text-[11px] font-semibold transition ${
                          block.bold
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-line bg-bg text-muted"
                        }`}
                      >
                        B
                      </button>

                      {/* Enable Toggle Switch */}
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink">
                        <input
                          type="checkbox"
                          checked={block.enabled}
                          onChange={(e) => updateBlock(block.id, { enabled: e.target.checked })}
                          className="h-4 w-4 rounded accent-[#6366f1]"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Live Thermal Receipt Preview (Matches Image 4 Right Panel) */}
        <div className="xl:sticky xl:top-6 xl:h-fit">
          <section className="rounded-[16px] border border-line bg-surface p-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" />
                <div>
                  <h3 className="text-[14px] font-semibold text-ink">Thermal Receipt Preview</h3>
                  <div className="mt-1 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("visual")}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        previewMode === "visual"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:text-ink"
                      }`}
                    >
                      Canvas ({state.activeTemplateTab})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMode("server");
                        void fetchServerPreview();
                      }}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        previewMode === "server"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:text-ink"
                      }`}
                    >
                      Server HTML
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {previewMode === "server" ? (
                  <button
                    type="button"
                    onClick={() => void fetchServerPreview()}
                    disabled={loadingServerPreview}
                    className="inline-flex h-8 items-center gap-1 rounded-[7px] border border-line bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw size={12} className={loadingServerPreview ? "animate-spin" : ""} />
                    Sync
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void triggerTestPrint("receipt")}
                  className="inline-flex h-8 items-center gap-1 rounded-[7px] bg-indigo-50 px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <Printer size={13} />
                  Print
                </button>
              </div>
            </div>

            {/* Simulated Thermal Roll Container */}
            <div className="rounded-[12px] bg-slate-200/70 p-4">
              {previewMode === "server" ? (
                <div>
                  {serverWarnings.length > 0 ? (
                    <div className="mb-3 rounded-[8px] border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      <strong>Template Warnings:</strong>
                      <ul className="list-disc pl-4">
                        {serverWarnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {loadingServerPreview ? (
                    <div className="p-8 text-center text-xs text-slate-500">Compiling server template...</div>
                  ) : serverHtml ? (
                    <div
                      className="mx-auto bg-white p-4 font-mono shadow-md max-w-[340px] text-xs text-slate-900 overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: serverHtml }}
                    />
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Click "Sync" to preview live output compiled by backend driver.
                    </div>
                  )}
                </div>
              ) : (
              <div
                className={`mx-auto bg-white p-5 font-mono text-slate-900 shadow-md transition-all ${
                  state.activeTemplateTab === "58mm" ? "max-w-[260px]" : "max-w-[330px]"
                }`}
              >
                {/* 1. Store Logo */}
                {isBlockEnabled("store_logo") ? (
                  <div className="mb-2 flex justify-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-slate-900 text-sm font-semibold">
                      S
                    </div>
                  </div>
                ) : null}

                {/* 2. Store Name & Tagline */}
                {isBlockEnabled("store_identity") ? (
                  <div className={blockStyle("store_identity")}>
                    <p className="tracking-tight uppercase">{state.headerStoreName}</p>
                    {state.headerTagline ? (
                      <p className="text-[10px] font-normal text-slate-600">{state.headerTagline}</p>
                    ) : null}
                  </div>
                ) : null}

                {/* 3. Store Address & Contact */}
                {isBlockEnabled("store_contact") ? (
                  <div className={`mt-1 text-slate-700 ${blockStyle("store_contact")}`}>
                    <p>{state.headerAddress}</p>
                    <p>Ph: {state.headerPhone}</p>
                  </div>
                ) : null}

                {/* 4. Tax Licenses */}
                {isBlockEnabled("tax_licences") ? (
                  <div className={`mt-1.5 border-t border-dashed border-slate-300 pt-1.5 ${blockStyle("tax_licences")}`}>
                    {state.headerGstin ? <p>GSTIN: {state.headerGstin}</p> : null}
                    {state.headerFssai ? <p>FSSAI: {state.headerFssai}</p> : null}
                    {state.headerDrugLic ? <p>DL No: {state.headerDrugLic}</p> : null}
                  </div>
                ) : null}

                {/* 5. Invoice Title Banner */}
                {isBlockEnabled("invoice_banner") ? (
                  <div className="my-2 border-y border-dashed border-slate-400 py-1 text-center text-[11.5px] font-semibold tracking-widest uppercase">
                    {state.invoiceTitle}
                  </div>
                ) : null}

                {/* 6. Invoice Meta */}
                {isBlockEnabled("invoice_meta") ? (
                  <div className="space-y-0.5 text-[10.5px]">
                    <div className="flex justify-between">
                      <span>Bill No: INV-2026-0842</span>
                      <span>20/10/2026 10:42 AM</span>
                    </div>
                  </div>
                ) : null}

                {/* 7. Register & Cashier */}
                {isBlockEnabled("register_cashier") ? (
                  <div className="flex justify-between text-[10.5px] text-slate-600">
                    <span>Reg: Counter #1</span>
                    <span>Cashier: Store Owner</span>
                  </div>
                ) : null}

                {/* 8. Customer Info */}
                {isBlockEnabled("customer_info") ? (
                  <div className="mt-1 border-t border-dashed border-slate-300 pt-1 text-[10.5px]">
                    <p>Customer: Ananya Rao (+91 9876543210)</p>
                  </div>
                ) : null}

                {/* 9. Line Items Table */}
                {isBlockEnabled("line_items") ? (
                  <div className="mt-2 border-t border-dashed border-slate-400 pt-1.5">
                    <div className="flex justify-between border-b border-dashed border-slate-300 pb-1 text-[10px] font-semibold uppercase">
                      <span>Item</span>
                      <span>Qty × Rate</span>
                      <span>Amt</span>
                    </div>
                    <div className="divide-y divide-dashed divide-slate-200 text-[10.5px]">
                      <div className="py-1.5">
                        <div className="flex justify-between font-semibold">
                          <span>1. Ground Coffee 250g</span>
                          <span>₹690.00</span>
                        </div>
                        <div className="flex justify-between text-[9.5px] text-slate-600">
                          <span>
                            {isBlockEnabled("item_hsn_sku") ? "HSN:0901 SKU:33990 " : ""}
                            {isBlockEnabled("item_mrp_savings") ? "(MRP ₹750)" : ""}
                          </span>
                          <span>1 × ₹690.00</span>
                        </div>
                      </div>
                      <div className="py-1.5">
                        <div className="flex justify-between font-semibold">
                          <span>2. Orange Juice 1L</span>
                          <span>₹520.00</span>
                        </div>
                        <div className="flex justify-between text-[9.5px] text-slate-600">
                          <span>
                            {isBlockEnabled("item_hsn_sku") ? "HSN:2009 SKU:10011 " : ""}
                            {isBlockEnabled("item_mrp_savings") ? "(MRP ₹560)" : ""}
                          </span>
                          <span>2 × ₹260.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 10. Subtotal & Discounts */}
                {isBlockEnabled("subtotal_discounts") ? (
                  <div className="mt-1.5 border-t border-dashed border-slate-400 pt-1.5 space-y-0.5 text-[10.5px]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹1,210.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bill Discount</span>
                      <span>-₹50.00</span>
                    </div>
                  </div>
                ) : null}

                {/* 11. GST Breakup */}
                {isBlockEnabled("gst_breakup") ? (
                  <div className="mt-1.5 border-t border-dashed border-slate-300 pt-1 text-[9.5px] text-slate-600">
                    <div className="flex justify-between font-semibold">
                      <span>GST Slab</span>
                      <span>Taxable</span>
                      <span>CGST</span>
                      <span>SGST</span>
                    </div>
                    <div className="flex justify-between">
                      <span>5% GST</span>
                      <span>₹1,104.76</span>
                      <span>₹27.62</span>
                      <span>₹27.62</span>
                    </div>
                  </div>
                ) : null}

                {/* 12. Grand Total */}
                {isBlockEnabled("grand_total") ? (
                  <div className="my-2 flex items-center justify-between border-y-2 border-slate-900 py-1.5 text-[14px] font-semibold">
                    <span>NET PAYABLE</span>
                    <span>₹1,160.00</span>
                  </div>
                ) : null}

                {/* 13. Items & Qty Counter */}
                {isBlockEnabled("items_qty_summary") ? (
                  <p className="text-center text-[10px] font-semibold">Items: 2 | Total Qty: 3</p>
                ) : null}

                {/* 14. Customer Savings Banner */}
                {isBlockEnabled("savings_highlight") ? (
                  <div className="my-2 rounded border border-slate-900 px-2 py-1 text-center text-[11px] font-semibold">
                    ★ YOU SAVED ₹150.00 ON THIS BILL! ★
                  </div>
                ) : null}

                {/* 15. Payment & Tender */}
                {isBlockEnabled("payment_tender") ? (
                  <div className="mt-1.5 border-t border-dashed border-slate-300 pt-1 text-[10px]">
                    <div className="flex justify-between">
                      <span>Paid via Cash</span>
                      <span>₹1,200.00</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Change Returned</span>
                      <span>₹40.00</span>
                    </div>
                  </div>
                ) : null}

                {/* 16. Loyalty Summary */}
                {isBlockEnabled("loyalty_khata") ? (
                  <p className="mt-1.5 text-center text-[9.5px] text-slate-600">
                    Points Earned: +11 | Available Points: 142
                  </p>
                ) : null}

                {/* 17. Dynamic UPI QR Code */}
                {isBlockEnabled("upi_qr_code") ? (
                  <div className="mt-3 flex flex-col items-center border-t border-dashed border-slate-300 pt-2.5">
                    <p className="text-[9.5px] font-semibold uppercase">Scan & Pay via UPI</p>
                    <div className="my-1.5 grid h-20 w-20 place-items-center rounded border border-slate-900 bg-slate-50">
                      <QrCode size={56} className="text-slate-900" />
                    </div>
                    <p className="text-[9px] text-slate-600">{state.upiVpa}</p>
                  </div>
                ) : null}

                {/* 18. Scannable Invoice Barcode */}
                {isBlockEnabled("invoice_barcode") ? (
                  <div className="mt-2.5 flex flex-col items-center pt-1">
                    <div className="flex h-8 items-stretch justify-center gap-[1.5px]">
                      {Array.from({ length: 32 }).map((_, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-900"
                          style={{ width: idx % 3 === 0 ? "2.5px" : "1.5px" }}
                        />
                      ))}
                    </div>
                    <p className="mt-0.5 text-[9px] tracking-[0.25em]">INV20260842</p>
                  </div>
                ) : null}

                {/* 19. Footer & Return Policy */}
                {isBlockEnabled("footer_policy") ? (
                  <div className="mt-2.5 border-t border-dashed border-slate-300 pt-2 text-center text-[9.5px] text-slate-600">
                    <p>{state.returnPolicyText}</p>
                    <p className="mt-1 font-semibold text-slate-900">{state.footerThankYou}</p>
                  </div>
                ) : null}
              </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Add / Edit Hardware Printer Modal */}
      {showAddPrinter && editingPrinter ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[16px] border border-line bg-surface p-6 shadow-2xl">
            <h3 className="text-[16px] font-semibold text-ink">Configure Hardware Printer</h3>
            <p className="text-[12px] text-muted">
              Set connection interface, IP/port, paper width, auto-cutter, and cash drawer pulse pin.
            </p>

            <form
              className="mt-4 grid gap-3.5 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                setState((prev) => {
                  const exists = prev.printers.some((p) => p.id === editingPrinter.id);
                  const nextPrinters = exists
                    ? prev.printers.map((p) => (p.id === editingPrinter.id ? editingPrinter : p))
                    : [...prev.printers, editingPrinter];
                  return { ...prev, printers: nextPrinters };
                });
                setShowAddPrinter(false);
                setEditingPrinter(null);
              }}
            >
              <label className="block text-[12px] font-semibold text-ink sm:col-span-2">
                Printer Name *
                <input
                  required
                  value={editingPrinter.name}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, name: e.target.value })}
                  placeholder="e.g. Epson TM-T82 Counter #2"
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>

              <label className="block text-[12px] font-semibold text-ink">
                Role / Location
                <input
                  value={editingPrinter.role}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, role: e.target.value })}
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>

              <label className="block text-[12px] font-semibold text-ink">
                Connection Type
                <select
                  value={editingPrinter.connection}
                  onChange={(e) =>
                    setEditingPrinter({
                      ...editingPrinter,
                      connection: e.target.value as HardwarePrinter["connection"],
                    })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                >
                  <option value="lan">Ethernet / LAN IP (Port 9100)</option>
                  <option value="usb">Direct USB POS Printer</option>
                  <option value="bluetooth">Bluetooth Thermal (BLE)</option>
                  <option value="serial">RS-232 Serial COM Port</option>
                  <option value="spooler">Windows / macOS System Spooler</option>
                </select>
              </label>

              <label className="block text-[12px] font-semibold text-ink">
                IP Address (for LAN)
                <input
                  value={editingPrinter.ipAddress}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, ipAddress: e.target.value })}
                  placeholder="192.168.1.200"
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>

              <label className="block text-[12px] font-semibold text-ink">
                Port
                <input
                  value={editingPrinter.port}
                  onChange={(e) => setEditingPrinter({ ...editingPrinter, port: e.target.value })}
                  placeholder="9100"
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>

              <label className="block text-[12px] font-semibold text-ink">
                Paper Width / Format
                <select
                  value={editingPrinter.paperWidth}
                  onChange={(e) =>
                    setEditingPrinter({
                      ...editingPrinter,
                      paperWidth: e.target.value as PaperFormat,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                >
                  <option value="80mm">80mm Thermal Roll (48 cols)</option>
                  <option value="58mm">58mm Thermal Roll (32 cols)</option>
                  <option value="label_50x25">Barcode Label (50×25mm)</option>
                  <option value="A4">A4 Full Sheet</option>
                </select>
              </label>

              <label className="block text-[12px] font-semibold text-ink">
                Auto-Cutter Mode
                <select
                  value={editingPrinter.autoCut}
                  onChange={(e) =>
                    setEditingPrinter({
                      ...editingPrinter,
                      autoCut: e.target.value as HardwarePrinter["autoCut"],
                    })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                >
                  <option value="partial">Partial Cut</option>
                  <option value="full">Full Cut</option>
                  <option value="none">No Auto-Cut</option>
                </select>
              </label>

              <label className="block text-[12px] font-semibold text-ink">
                RJ11 Cash Drawer Kick Pulse
                <select
                  value={editingPrinter.openDrawer}
                  onChange={(e) =>
                    setEditingPrinter({
                      ...editingPrinter,
                      openDrawer: e.target.value as HardwarePrinter["openDrawer"],
                    })
                  }
                  className="mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                >
                  <option value="pin2">Pin 2 (Standard 100ms)</option>
                  <option value="pin5">Pin 5 (200ms)</option>
                  <option value="none">Disabled</option>
                </select>
              </label>

              <label className="block text-[12px] font-semibold text-ink">
                Feed Lines After Print
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={editingPrinter.feedLines}
                  onChange={(e) =>
                    setEditingPrinter({ ...editingPrinter, feedLines: Number(e.target.value || 0) })
                  }
                  className="num mt-1 h-9 w-full rounded-[8px] border border-line bg-bg px-3 text-sm font-normal"
                />
              </label>

              <div className="flex justify-end gap-2 pt-3 sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddPrinter(false);
                    setEditingPrinter(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Printer
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Pair Print Agent Modal */}
      {showPairModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-amber-500 text-white shadow-xs">
                  <Zap size={20} />
                </span>
                <div>
                  <h3 className="text-[16px] font-semibold text-ink">Pair SelfX Print Agent</h3>
                  <p className="text-[12px] text-muted">
                    Fast, silent local printing via port 27182
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className="text-slate-400 hover:text-ink text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900 mb-1">How local pairing works:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Ensure the Print Agent binary is running on this PC (<code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border">./print-agent</code>).</li>
                  <li>Click <strong>Auto-Fetch Code</strong> or run <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border">curl -X POST http://127.0.0.1:27182/pair</code>.</li>
                  <li>Enter the 4-digit numeric code and click <strong>Authorize & Pair</strong>.</li>
                </ol>
              </div>

              {deviceToken ? (
                <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Terminal Currently Paired</p>
                      <p className="font-mono text-[11px] mt-0.5 truncate max-w-[220px]">Token: {deviceToken}</p>
                    </div>
                    <button
                      type="button"
                      onClick={unpairAgent}
                      className="rounded bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50"
                    >
                      Unpair
                    </button>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-[12px] font-semibold text-ink">
                  4-Digit Pairing Code
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={pairCodeInput}
                      onChange={(e) => setPairCodeInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="e.g. 4892"
                      className="h-10 flex-1 rounded-[8px] border border-line bg-bg px-3 font-mono text-center text-lg font-bold tracking-widest text-ink outline-none focus:border-indigo-600"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void fetchCodeFromAgent()}
                    >
                      Auto-Fetch
                    </Button>
                  </div>
                </label>
              </div>

              {pairingStatus ? (
                <div className="rounded-[8px] bg-indigo-50 border border-indigo-100 p-2.5 text-xs text-indigo-900">
                  {pairingStatus}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPairModal(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={pairCodeInput.length !== 4}
                  onClick={() => void submitPairCode()}
                >
                  Authorize & Pair
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
