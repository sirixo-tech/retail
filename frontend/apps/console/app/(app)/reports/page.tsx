"use client";

import { formatInr } from "@selfx/types";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Mail,
  Package,
  Percent,
  PieChart as PieChartIcon,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  Trash2,
  X,
} from "lucide-react";
import { UsersReportView, type UsersReportData, type UserActivityRow } from "./UsersReportView";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";

type Summary = {
  bills: number;
  total_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
};

type ProfitSummary = {
  sales_paise: number;
  cogs_paise: number;
  profit_paise: number;
};

type StockLine = {
  id: string;
  name: string;
  on_hand: number;
  unit_cost_paise: number | null;
  value_paise: number;
};

type Movement = {
  best: { id: string; name: string; qty: number; total_paise: number }[];
  slow: { id: string; name: string; on_hand: number }[];
};

type ShiftRow = {
  id: string;
  opened_at?: string;
  closed_at?: string;
  opening_cash_paise?: number;
  expected_cash_paise: number;
  actual_cash_paise: number;
};

type PaymentRow = {
  method: string;
  amount_paise: number;
  change_paise: number;
  bills?: number;
};

type CustomerReportRow = {
  id: string;
  name: string;
  bills: number;
  total_paise: number;
};

type DashboardData = {
  sales_paise: number;
  purchases_paise: number;
  returns_paise: number;
  return_bills: number;
  sales_due_paise: number;
  purchase_due_paise: number;
  bills: number;
  profit_paise: number;
  stock_cost_paise: number;
  stock_retail_paise: number;
  stock_wholesale_paise: number;
  days: { date: string; label: string; sales_paise: number; purchases_paise: number }[];
  alerts: {
    sku: string;
    name: string;
    store_name: string;
    on_hand: number;
    reorder_point: number;
  }[];
  recent: {
    id: string;
    number: string;
    status: string;
    warehouse: string;
    total_paise: number;
    paid_paise: number;
    due_paise: number;
    payment_status: string;
    customer_name: string;
    created_at: string;
  }[];
};

type SupplierRow = {
  id: string;
  name: string;
  gstin?: string | null;
  phone?: string | null;
  balance_paise?: number;
};

type AuditRow = {
  id: string;
  action: string;
  subject_id: string | null;
  created_at: string;
};

type WarehouseRow = {
  id: string;
  name: string;
  code?: string;
};

type HsnRow = {
  hsn: string;
  description: string;
  uqc: string;
  total_qty: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_paise: number;
};

type DaybookData = {
  date: string;
  opening_cash_paise: number;
  cash_sales_paise: number;
  upi_sales_paise: number;
  card_sales_paise: number;
  total_inflow_paise: number;
  closing_cash_paise: number;
  shifts_count: number;
};

type StaffSalesRow = {
  staff_name: string;
  bills: number;
  total_paise: number;
};

type DiscountsData = {
  discounts: {
    id: string;
    number: string;
    subtotal_paise: number;
    discount_paise: number;
    total_paise: number;
    created_at: string;
  }[];
  voids: {
    id: string;
    number: string;
    total_paise: number;
    created_at: string;
  }[];
  total_discount_paise: number;
  total_void_count: number;
};

type CategorySalesRow = {
  category: string;
  units_sold: number;
  total_paise: number;
};

type ItemLedgerEntry = {
  id: string;
  date: string;
  type: string;
  reference: string;
  reason: string;
  qty_in: number;
  qty_out: number;
  balance: number;
  unit_cost_paise: number;
  total_paise: number;
};

type ItemLedgerData = {
  items: { id: string; name: string; sku?: string; current_stock: number; cost_paise: number }[];
  selected_item: { id: string; name: string; sku: string; cost_paise: number; on_hand: number } | null;
  opening_qty: number;
  closing_qty: number;
  total_inward: number;
  total_outward: number;
  valuation_paise: number;
  entries: ItemLedgerEntry[];
};

type PurchaseRegisterRow = {
  id: string;
  number: string;
  date: string;
  supplier_name: string;
  supplier_gstin: string;
  status: string;
  items_count: number;
  qty: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_paise: number;
  itc_status: string;
};

type PurchaseRegisterData = {
  summary: {
    invoices_count: number;
    total_taxable_paise: number;
    total_gst_paise: number;
    total_invoices_paise: number;
    total_qty: number;
    suppliers_count: number;
  };
  suppliers: { id: string; name: string; gstin?: string }[];
  rows: PurchaseRegisterRow[];
};

type ScheduleRow = {
  id: string;
  email: string;
  next_run_at?: string;
  created_at: string;
};

const REPORT_META: Record<
  string,
  {
    title: string;
    breadcrumb: string;
    subtitle: string;
  }
> = {
  users: {
    title: "Users Report",
    breadcrumb: "Users Report",
    subtitle: "Staff operational performance audit tracking sales, purchase orders, quotations, returns, transfers, and stock adjustments.",
  },
  sales: {
    title: "Sales Summary Report",
    breadcrumb: "Sales Summary",
    subtitle: "Daily revenue velocity, invoice ledger, net taxable sales, and cash vs. credit realization.",
  },
  products: {
    title: "Product-Wise Sales Report",
    breadcrumb: "Product Sales",
    subtitle: "Top-selling items by quantity and revenue share, plus slow-moving inventory analysis.",
  },
  profit: {
    title: "Profit & Margin Analysis",
    breadcrumb: "Profit & Margin",
    subtitle: "Gross billed revenue vs. FIFO/receipt COGS, blended margin percentage, and inventory valuation tiers.",
  },
  gst: {
    title: "GST & Tax Return Ledger (GSTR-1 / 3B)",
    breadcrumb: "GST & Tax Report",
    subtitle: "Outward taxable supplies, intra-state CGST + SGST, inter-state IGST, and Tally Prime export.",
  },
  payments: {
    title: "Payment Tender Mode Report",
    breadcrumb: "Payment Modes",
    subtitle: "Collection breakdown across Cash, UPI, Card, and Customer Khata with net tender reconciliation.",
  },
  shifts: {
    title: "Cashier Shift & Z-Report Register",
    breadcrumb: "Shift & Z-Reports",
    subtitle: "Opening float, expected drawer cash, actual physical count, and variance audit across terminals.",
  },
  stock: {
    title: "Closing Stock Valuation Report",
    breadcrumb: "Stock Valuation",
    subtitle: "Item-wise on-hand units valued at latest purchase receipt cost and share of total inventory capital.",
  },
  alerts: {
    title: "Low Stock & Replenishment Alerts",
    breadcrumb: "Low Stock Alerts",
    subtitle: "SKUs below configured reorder thresholds requiring immediate purchase order replenishment.",
  },
  customers: {
    title: "Customer Lifetime Value & Khata Report",
    breadcrumb: "Customer & Khata",
    subtitle: "Customer purchase frequency, revenue contribution share, and pending credit receivables.",
  },
  purchases: {
    title: "Purchase & Supplier Payable Report",
    breadcrumb: "Purchase & Suppliers",
    subtitle: "Goods receipt notes (GRN), supplier GSTIN directory, and outstanding vendor payable balances.",
  },
  audit: {
    title: "Security & Operational Audit Trail",
    breadcrumb: "Audit Trail",
    subtitle: "Immutable chronological log of billing, stock adjustments, shift closures, and administrative events.",
  },
  hsn: {
    title: "HSN-Wise GST Return Summary (GSTR-1 Table 12)",
    breadcrumb: "HSN GST Return",
    subtitle: "Harmonized System of Nomenclature breakdown with taxable turnovers, CGST, SGST, IGST, and quantity UQC.",
  },
  daybook: {
    title: "Day Book & Daily Cash Register",
    breadcrumb: "Day Book & Cash",
    subtitle: "Daily cash drawer ledger, opening float, cash vs. UPI receipts, operational expenses, and closing balance.",
  },
  "staff-sales": {
    title: "Staff & Register Performance Ledger",
    breadcrumb: "Staff Sales",
    subtitle: "Cashier productivity, bills processed, average basket value, and tender distribution across counter staff.",
  },
  discounts: {
    title: "Discount & Void/Refund Audit Ledger",
    breadcrumb: "Discounts & Voids",
    subtitle: "Audit register of cashier discounts, promotional markdowns, line voids, and bill cancellations.",
  },
  "category-sales": {
    title: "Category & Brand Velocity Matrix",
    breadcrumb: "Category Sales",
    subtitle: "Departmental revenue velocity, margin contribution, and category sales share across product lines.",
  },
  "item-ledger": {
    title: "Chronological Item Movement Ledger",
    breadcrumb: "Item Ledger",
    subtitle: "Complete SKU inventory journal tracking opening stock, purchase in, sales out, adjustments, and closing balance.",
  },
  "purchase-register": {
    title: "Supplier Purchase Register & ITC Book",
    breadcrumb: "Purchase Register",
    subtitle: "Vendor tax invoice journal with supplier GSTINs, taxable turnovers, Input Tax Credit (ITC), and invoice totals.",
  },
};

const CHART_COLORS = [
  "#7c3aed",
  "#10b981",
  "#2563eb",
  "#f59e0b",
  "#e11d48",
  "#0d9488",
  "#6366f1",
  "#ea580c",
];

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-white" />}>
      <ReportsWorkspace />
    </Suspense>
  );
}

function ReportsWorkspace() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "sales";
  const meta = REPORT_META[activeTab] ?? REPORT_META.sales;

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);


  const [summary, setSummary] = useState<Summary | null>(null);
  const [profitData, setProfitData] = useState<ProfitSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [stockTotal, setStockTotal] = useState(0);
  const [stockLines, setStockLines] = useState<StockLine[]>([]);
  const [movement, setMovement] = useState<Movement>({ best: [], slow: [] });
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [customers, setCustomers] = useState<CustomerReportRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [hsnRows, setHsnRows] = useState<HsnRow[]>([]);
  const [daybookData, setDaybookData] = useState<DaybookData | null>(null);
  const [staffSales, setStaffSales] = useState<StaffSalesRow[]>([]);
  const [discountsData, setDiscountsData] = useState<DiscountsData | null>(null);
  const [categorySales, setCategorySales] = useState<CategorySalesRow[]>([]);
  const [itemLedgerData, setItemLedgerData] = useState<ItemLedgerData | null>(null);
  const [selectedLedgerItemId, setSelectedLedgerItemId] = useState<string>("");
  const [purchaseRegisterData, setPurchaseRegisterData] = useState<PurchaseRegisterData | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [usersReportData, setUsersReportData] = useState<UsersReportData | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserActivityRow | null>(null);
  const [userTableSearch, setUserTableSearch] = useState("");
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [remoteWarehouses, setRemoteWarehouses] = useState<WarehouseRow[]>([]);

  const [answer, setAnswer] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/v1/warehouses", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.data && Array.isArray(body.data)) setRemoteWarehouses(body.data);
      })
      .catch(() => {});
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (fromDate) qs.set("from", fromDate);
      if (toDate) qs.set("to", `${toDate} 23:59:59`);
      if (selectedWarehouse && selectedWarehouse !== "ALL") qs.set("warehouse", selectedWarehouse);
      const qStr = qs.toString() ? `?${qs.toString()}` : "";

      const headers = { Accept: "application/json" };
      const salesRes = await fetch(`/api/v1/reports/sales${qStr}`, {
        credentials: "include",
        headers,
      });
      if (salesRes.status === 401 || salesRes.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (salesRes.ok) setSummary(((await salesRes.json()) as { data: Summary }).data);

      const [
        dashRes,
        stockRes,
        prodRes,
        profRes,
        shiftRes,
        payRes,
        custRes,
        suppRes,
        auditRes,
        hsnRes,
        daybookRes,
        staffRes,
        discRes,
        catRes,
        schedRes,
        itemLedgerRes,
        purchRegRes,
        usersRes,
      ] = await Promise.all([
        fetch(`/api/v1/reports/dashboard${qStr}`, { credentials: "include", headers }),
        fetch(`/api/v1/reports/stock${qStr}`, { credentials: "include", headers }),
        fetch(`/api/v1/reports/products${qStr}`, { credentials: "include", headers }),
        fetch("/api/v1/reports/profit", { credentials: "include", headers }),
        fetch("/api/v1/reports/shifts", { credentials: "include", headers }),
        fetch(`/api/v1/reports/payments${qStr}`, { credentials: "include", headers }),
        fetch("/api/v1/reports/customers", { credentials: "include", headers }),
        fetch("/api/v1/suppliers", { credentials: "include", headers }),
        fetch("/api/v1/audit", { credentials: "include", headers }),
        fetch(`/api/v1/reports/hsn${qStr}`, { credentials: "include", headers }),
        fetch(`/api/v1/reports/daybook${fromDate ? `?date=${fromDate}` : ""}`, { credentials: "include", headers }),
        fetch(`/api/v1/reports/staff-sales${qStr}`, { credentials: "include", headers }),
        fetch(`/api/v1/reports/discounts${qStr}`, { credentials: "include", headers }),
        fetch(`/api/v1/reports/category-sales${qStr}`, { credentials: "include", headers }),
        fetch("/api/v1/reports/schedules", { credentials: "include", headers }),
        fetch(`/api/v1/reports/item-ledger${qStr}${selectedLedgerItemId ? `&item_id=${selectedLedgerItemId}` : ""}`, { credentials: "include", headers }),
        fetch(`/api/v1/reports/purchase-register${qStr}${selectedSupplierId ? `&supplier_id=${selectedSupplierId}` : ""}`, { credentials: "include", headers }),
        fetch(`/api/v1/reports/users${qStr}`, { credentials: "include", headers }),
      ]);

      if (dashRes.ok) setDashboard(((await dashRes.json()) as { data: DashboardData }).data);
      if (stockRes.ok) {
        const body = (await stockRes.json()) as {
          data: { total_paise: number; lines: StockLine[] };
        };
        setStockTotal(body.data.total_paise);
        setStockLines(body.data.lines);
      }
      if (prodRes.ok) setMovement(((await prodRes.json()) as { data: Movement }).data);
      if (profRes.ok) setProfitData(((await profRes.json()) as { data: ProfitSummary }).data);
      if (shiftRes.ok) setShifts(((await shiftRes.json()) as { data: ShiftRow[] }).data);
      if (payRes.ok) setPayments(((await payRes.json()) as { data: PaymentRow[] }).data);
      if (custRes.ok) setCustomers(((await custRes.json()) as { data: CustomerReportRow[] }).data);
      if (suppRes.ok) setSuppliers(((await suppRes.json()) as { data: SupplierRow[] }).data);
      if (auditRes.ok) setAuditLogs(((await auditRes.json()) as { data: AuditRow[] }).data);
      if (hsnRes.ok) setHsnRows(((await hsnRes.json()) as { data: HsnRow[] }).data ?? []);
      if (daybookRes.ok) setDaybookData(((await daybookRes.json()) as { data: DaybookData }).data);
      if (staffRes.ok) setStaffSales(((await staffRes.json()) as { data: StaffSalesRow[] }).data ?? []);
      if (discRes.ok) setDiscountsData(((await discRes.json()) as { data: DiscountsData }).data);
      if (catRes.ok) setCategorySales(((await catRes.json()) as { data: CategorySalesRow[] }).data ?? []);
      if (schedRes.ok) setSchedules(((await schedRes.json()) as { data: ScheduleRow[] }).data ?? []);
      if (itemLedgerRes.ok) setItemLedgerData(((await itemLedgerRes.json()) as { data: ItemLedgerData }).data);
      if (purchRegRes.ok) setPurchaseRegisterData(((await purchRegRes.json()) as { data: PurchaseRegisterData }).data);
      if (usersRes.ok) setUsersReportData(((await usersRes.json()) as { data: UsersReportData }).data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, [fromDate, toDate, selectedWarehouse, selectedLedgerItemId, selectedSupplierId]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeTab]);

  async function downloadFile(format: "csv" | "tally" | "xlsx" | "pdf", filename: string) {
    const qs = new URLSearchParams({ format });
    if (fromDate) qs.set("from", fromDate);
    if (toDate) qs.set("to", `${toDate} 23:59:59`);
    if (selectedWarehouse && selectedWarehouse !== "ALL") qs.set("warehouse", selectedWarehouse);
    const response = await fetch(`/api/v1/reports/sales?${qs.toString()}`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadGstAuditPack() {
    const qs = new URLSearchParams();
    if (fromDate) qs.set("from", fromDate);
    if (toDate) qs.set("to", `${toDate} 23:59:59`);
    const response = await fetch(`/api/v1/reports/gst-audit-pack?${qs.toString()}`, {
      credentials: "include",
    });
    if (!response.ok) {
      setToast("Failed to generate GST CA Audit Package.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GST-CA-Audit-Pack-${fromDate || "all"}-to-${toDate || "current"}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("GST CA Audit Pack (.zip) downloaded successfully.");
  }

  async function downloadGstr1Json() {
    const month = (fromDate || new Date().toISOString()).slice(0, 7);
    const response = await fetch(`/api/v1/reports/gstr1/${month}`, {
      credentials: "include",
    });
    if (!response.ok) {
      setToast("Failed to generate GSTR-1 JSON.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gstr1_${month}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`GSTR-1 JSON for ${month} downloaded successfully.`);
  }

  async function handleScheduleReport(e: FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/v1/reports/schedules", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCsrfToken(),
      },
      body: JSON.stringify({ email: scheduleEmail }),
    });
    if (response.ok) {
      setToast(`Scheduled automated daily retail report delivery to ${scheduleEmail}.`);
      setScheduleEmail("");
      void fetch("/api/v1/reports/schedules", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => {
          if (b?.data) setSchedules(b.data);
        });
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    const token = getCsrfToken();
    const res = await fetch(`/api/v1/reports/schedules/${scheduleId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-XSRF-TOKEN": token,
      },
    });
    if (res.ok) {
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      setToast("Scheduled report deleted.");
    }
  }

  function applyQuickRange(days: number | null) {
    if (days === null) {
      setFromDate("");
      setToDate("");
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
  }

  const totalTaxPaise =
    (summary?.cgst_paise ?? 0) + (summary?.sgst_paise ?? 0) + (summary?.igst_paise ?? 0);
  const netTaxablePaise = Math.max(0, (summary?.total_paise ?? 0) - totalTaxPaise);
  const grossMarginPct =
    profitData && profitData.sales_paise > 0
      ? Math.round((profitData.profit_paise / profitData.sales_paise) * 1000) / 10
      : 0;

  const q = searchQuery.trim().toLowerCase();

  const warehouses = useMemo<WarehouseRow[]>(() => {
    const map = new Map<string, string>();
    for (const w of remoteWarehouses) map.set(w.name, w.id);
    for (const b of dashboard?.recent ?? []) if (b.warehouse && !map.has(b.warehouse)) map.set(b.warehouse, b.warehouse);
    for (const a of dashboard?.alerts ?? []) if (a.store_name && !map.has(a.store_name)) map.set(a.store_name, a.store_name);
    return Array.from(map.entries()).map(([name, id]) => ({ id, name }));
  }, [remoteWarehouses, dashboard?.recent, dashboard?.alerts]);

  const filteredHsn = useMemo(() => {
    return hsnRows.filter((h) => !q || h.hsn.toLowerCase().includes(q) || (h.description ?? "").toLowerCase().includes(q));
  }, [hsnRows, q]);

  const filteredStaffSales = useMemo(() => {
    return staffSales.filter((s) => !q || s.staff_name.toLowerCase().includes(q));
  }, [staffSales, q]);

  const filteredCategorySales = useMemo(() => {
    return categorySales.filter((c) => !q || c.category.toLowerCase().includes(q));
  }, [categorySales, q]);

  // Filtered datasets for tables
  const filteredInvoices = useMemo(() => {
    return (dashboard?.recent ?? []).filter((b) => {
      if (selectedWarehouse !== "ALL" && b.warehouse !== selectedWarehouse) return false;
      if (!q) return true;
      return (
        b.number.toLowerCase().includes(q) ||
        b.customer_name.toLowerCase().includes(q) ||
        b.warehouse.toLowerCase().includes(q) ||
        b.payment_status.toLowerCase().includes(q)
      );
    });
  }, [dashboard?.recent, selectedWarehouse, q]);

  const filteredBestProducts = useMemo(() => {
    return movement.best.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [movement.best, q]);

  const filteredStockLines = useMemo(() => {
    return stockLines.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [stockLines, q]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => !q || p.method.toLowerCase().includes(q));
  }, [payments, q]);

  const filteredShifts = useMemo(() => {
    return shifts.filter(
      (s) => !q || (s.closed_at ?? "").toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    );
  }, [shifts, q]);

  const filteredAlerts = useMemo(() => {
    return (dashboard?.alerts ?? []).filter((a) => {
      if (selectedWarehouse !== "ALL" && a.store_name !== selectedWarehouse) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.sku.toLowerCase().includes(q) ||
        a.store_name.toLowerCase().includes(q)
      );
    });
  }, [dashboard?.alerts, selectedWarehouse, q]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [customers, q]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.gstin ?? "").toLowerCase().includes(q),
    );
  }, [suppliers, q]);

  const filteredAudit = useMemo(() => {
    return auditLogs.filter(
      (a) =>
        !q ||
        a.action.toLowerCase().includes(q) ||
        (a.subject_id ?? "").toLowerCase().includes(q),
    );
  }, [auditLogs, q]);

  return (
    <div className="space-y-5">
      {/* Top Header & Export Bar (Matches Image 5) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {meta.title}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="text-slate-600">Reports</span>
            <span>/</span>
            <span className="text-slate-400">{meta.breadcrumb}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void downloadFile("pdf", `${activeTab}-report.pdf`)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-100/80"
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => void downloadFile("xlsx", `${activeTab}-report.xls`)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100/80"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            type="button"
            onClick={() => void downloadFile("csv", `${activeTab}-report.csv`)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => void downloadFile("tally", "tally-vouchers.csv")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-600" />
            Tally
          </button>
          <button
            type="button"
            onClick={() => void downloadGstAuditPack()}
            title="Download Chartered Accountant (CA) Audit Package with GSTR-1, Table 12 HSN, Purchase ITC & Daybook in a ZIP"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/70 px-3 text-xs font-semibold text-purple-700 transition hover:bg-purple-100/80"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
            CA Audit Pack (.zip)
          </button>
          <button
            type="button"
            onClick={() => void loadReports()}
            title="Refresh Report Data"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <Mail className="h-3.5 w-3.5" />
            Schedule Email
          </button>
        </div>
      </div>

      {toast ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Filter Bar Card (Matches Image 5 Date + Warehouse Filter Strip) */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="grid gap-4 md:grid-cols-12 md:items-end">
          <div className="md:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Warehouse / Store
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-900"
            >
              <option value="ALL">All Warehouses &amp; Stores</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.name}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:col-span-3">
            <button
              type="button"
              onClick={() => applyQuickRange(0)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange(7)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange(30)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              30D
            </button>
            <button
              type="button"
              onClick={() => {
                applyQuickRange(null);
                setSelectedWarehouse("ALL");
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {answer ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-800">
          <span>{answer}</span>
          <button type="button" onClick={() => setAnswer(null)}>
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      ) : null}

      {/* ===================================================================
       * 0. USERS REPORT (From Reference Image 3)
       * ================================================================= */}
      {activeTab === "users" ? (
        <UsersReportView
          data={usersReportData}
          searchQuery={userTableSearch}
          setSearchQuery={setUserTableSearch}
          onSelectUser={(u) => setSelectedUserDetail(u)}
          onRefresh={() => void loadReports()}
        />
      ) : null}

      {/* ===================================================================
       * 1. SALES SUMMARY REPORT
       * ================================================================= */}
      {activeTab === "sales" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IconKpiCard
              icon={TrendingUp}
              color="bg-violet-600"
              label="Total Billed Sales"
              value={formatInr(summary?.total_paise ?? 0)}
              sub={`${summary?.bills ?? 0} completed invoices`}
            />
            <IconKpiCard
              icon={Receipt}
              color="bg-emerald-500"
              label="Net Taxable Revenue"
              value={formatInr(netTaxablePaise)}
              sub={`Excl. ${formatInr(totalTaxPaise)} GST`}
            />
            <IconKpiCard
              icon={ArrowDownRight}
              color="bg-amber-500"
              label="Sales Returns / CN"
              value={formatInr(dashboard?.returns_paise ?? 0)}
              sub={`${dashboard?.return_bills ?? 0} credit notes issued`}
            />
            <IconKpiCard
              icon={Wallet}
              color="bg-blue-600"
              label="Khata Receivables"
              value={formatInr(dashboard?.sales_due_paise ?? 0)}
              sub="Pending customer credit"
            />
          </div>

          {/* Visual Charts Row: Bar Chart + Donut Chart */}
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Daily Sales vs. Purchases Trend (Last 7 Days)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Gross billed revenue compared against supplier stock purchases
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Live Ledger
                </span>
              </div>
              <VisualBarChart
                items={(dashboard?.days ?? []).map((d) => ({
                  label: `${d.label} (${d.date.slice(5)})`,
                  value: Math.round(d.sales_paise / 100),
                  secondaryValue: Math.round(d.purchases_paise / 100),
                  formatted: formatInr(d.sales_paise),
                }))}
                primaryLabel="Sales (₹)"
                secondaryLabel="Purchases (₹)"
                primaryColor="#7c3aed"
                secondaryColor="#10b981"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Revenue Composition Breakdown
                  </h2>
                  <p className="text-xs text-slate-500">
                    Net realization vs. GST tax &amp; credit notes
                  </p>
                </div>
                <PieChartIcon className="h-4 w-4 text-slate-400" />
              </div>
              <VisualDonutChart
                centerLabel="Gross Sales"
                centerValue={formatInr(summary?.total_paise ?? 0)}
                slices={[
                  {
                    label: "Net Taxable Sales",
                    value: Math.max(0, netTaxablePaise),
                    formatted: formatInr(netTaxablePaise),
                    color: "#7c3aed",
                  },
                  {
                    label: "Total GST Tax",
                    value: Math.max(0, totalTaxPaise),
                    formatted: formatInr(totalTaxPaise),
                    color: "#10b981",
                  },
                  {
                    label: "Khata Credit Due",
                    value: Math.max(0, dashboard?.sales_due_paise ?? 0),
                    formatted: formatInr(dashboard?.sales_due_paise ?? 0),
                    color: "#f59e0b",
                  },
                  {
                    label: "Sales Returns",
                    value: Math.max(0, dashboard?.returns_paise ?? 0),
                    formatted: formatInr(dashboard?.returns_paise ?? 0),
                    color: "#e11d48",
                  },
                ]}
              />
            </div>
          </div>

          {/* Searchable Sales Invoices Table with Share Bar & Total Footer */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <TableToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search by invoice #, customer, or warehouse..."
              countLabel={`${filteredInvoices.length} invoices`}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3 text-right">Billed Total</th>
                    <th className="px-4 py-3 text-right">Paid Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Share of Recent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const totalRecent = filteredInvoices.reduce((s, b) => s + b.total_paise, 0);
                    const totalPaid = filteredInvoices.reduce((s, b) => s + b.paid_paise, 0);
                    return (
                      <>
                        {filteredInvoices.map((bill, idx) => {
                          const pct =
                            totalRecent > 0
                              ? Math.round((bill.total_paise / totalRecent) * 1000) / 10
                              : 0;
                          return (
                            <tr key={bill.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3">
                                <RankBadge index={idx + 1} />
                              </td>
                              <td className="num px-4 py-3 font-semibold text-slate-900">
                                {bill.number}
                                <div className="text-[10px] font-normal text-slate-400">
                                  {new Date(bill.created_at).toLocaleString("en-IN")}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-700">
                                {bill.customer_name}
                              </td>
                              <td className="px-4 py-3 text-slate-500">{bill.warehouse}</td>
                              <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                                {formatInr(bill.total_paise)}
                              </td>
                              <td className="num px-4 py-3 text-right font-semibold text-emerald-600">
                                {formatInr(bill.paid_paise)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                                  {bill.payment_status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <ShareBar pct={pct} color="#7c3aed" />
                              </td>
                            </tr>
                          );
                        })}
                        {filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-5 py-8 text-center text-xs text-slate-400">
                              No matching sales invoices found.
                            </td>
                          </tr>
                        ) : (
                          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                            <td colSpan={4} className="px-4 py-3 text-xs">
                              Total ({filteredInvoices.length} Invoices)
                            </td>
                            <td className="num px-4 py-3 text-right text-xs">
                              {formatInr(totalRecent)}
                            </td>
                            <td className="num px-4 py-3 text-right text-xs text-emerald-700">
                              {formatInr(totalPaid)}
                            </td>
                            <td className="px-4 py-3 text-xs">—</td>
                            <td className="num px-4 py-3 text-xs font-semibold">100%</td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================================
       * 2. PRODUCT-WISE SALES REPORT (Matches Image 5 Directly!)
       * ================================================================= */}
      {activeTab === "products" ? (
        <div className="space-y-5">
          {(() => {
            const totalUnitsSold = movement.best.reduce((s, r) => s + r.qty, 0);
            const totalProductRev = movement.best.reduce((s, r) => s + r.total_paise, 0);
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={Package}
                    color="bg-violet-600"
                    label="Products Sold"
                    value={String(movement.best.length)}
                    sub="Active revenue-generating SKUs"
                  />
                  <IconKpiCard
                    icon={Layers}
                    color="bg-emerald-500"
                    label="Total Quantity"
                    value={String(totalUnitsSold)}
                    sub="Units billed across counters"
                  />
                  <IconKpiCard
                    icon={TrendingUp}
                    color="bg-blue-600"
                    label="Total Sales"
                    value={formatInr(totalProductRev)}
                    sub="Product line gross revenue"
                  />
                  <IconKpiCard
                    icon={AlertTriangle}
                    color="bg-amber-500"
                    label="Slow / Non-Moving"
                    value={String(movement.slow.length)}
                    sub="Items with 0 recent velocity"
                  />
                </div>

                {/* Top Selling Products Bar Chart + Revenue Share Donut */}
                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          Top Selling Products (By Quantity)
                        </h2>
                        <p className="text-xs text-slate-500">
                          Unit velocity across highest-performing store items
                        </p>
                      </div>
                    </div>
                    <VisualBarChart
                      items={movement.best.slice(0, 8).map((item) => ({
                        label: item.name.length > 18 ? `${item.name.slice(0, 18)}…` : item.name,
                        value: item.qty,
                        formatted: `${item.qty} units (${formatInr(item.total_paise)})`,
                      }))}
                      primaryLabel="Quantity Sold"
                      primaryColor="#8b5cf6"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                          Revenue Share by Product
                        </h2>
                        <p className="text-xs text-slate-500">
                          Contribution percentage to total product sales
                        </p>
                      </div>
                      <PieChartIcon className="h-4 w-4 text-slate-400" />
                    </div>
                    <VisualDonutChart
                      centerLabel="Product Sales"
                      centerValue={formatInr(totalProductRev)}
                      slices={movement.best.slice(0, 6).map((item, idx) => ({
                        label: item.name,
                        value: item.total_paise,
                        formatted: formatInr(item.total_paise),
                        color: CHART_COLORS[idx % CHART_COLORS.length],
                      }))}
                    />
                  </div>
                </div>

                {/* Product Sales Table matching Image 5 */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search by product name..."
                    countLabel={`${filteredBestProducts.length} products`}
                  />
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3 text-right">Qty Sold</th>
                          <th className="px-4 py-3 text-right">Avg. Unit Price</th>
                          <th className="px-4 py-3 text-right">Total Sales</th>
                          <th className="px-4 py-3">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBestProducts.map((row, idx) => {
                          const sharePct =
                            totalProductRev > 0
                              ? Math.round((row.total_paise / totalProductRev) * 1000) / 10
                              : 0;
                          const avgUnitPaise =
                            row.qty > 0 ? Math.round(row.total_paise / row.qty) : 0;
                          return (
                            <tr key={row.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3">
                                <RankBadge index={idx + 1} />
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {row.name}
                              </td>
                              <td className="num px-4 py-3 text-right font-semibold text-slate-800">
                                {row.qty}
                              </td>
                              <td className="num px-4 py-3 text-right text-slate-600">
                                {formatInr(avgUnitPaise)}
                              </td>
                              <td className="num px-4 py-3 text-right font-semibold text-emerald-600">
                                {formatInr(row.total_paise)}
                              </td>
                              <td className="px-4 py-3">
                                <ShareBar pct={sharePct} color="#7c3aed" />
                              </td>
                            </tr>
                          );
                        })}
                        {filteredBestProducts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                              No product sales recorded in this period.
                            </td>
                          </tr>
                        ) : (
                          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                            <td colSpan={2} className="px-4 py-3 text-xs">
                              Total
                            </td>
                            <td className="num px-4 py-3 text-right text-xs">
                              {filteredBestProducts.reduce((s, r) => s + r.qty, 0)}
                            </td>
                            <td className="num px-4 py-3 text-right text-xs">—</td>
                            <td className="num px-4 py-3 text-right text-xs text-emerald-700">
                              {formatInr(
                                filteredBestProducts.reduce((s, r) => s + r.total_paise, 0),
                              )}
                            </td>
                            <td className="num px-4 py-3 text-xs">100%</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 3. PROFIT & MARGIN REPORT
       * ================================================================= */}
      {activeTab === "profit" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IconKpiCard
              icon={TrendingUp}
              color="bg-violet-600"
              label="Total Billed Sales"
              value={formatInr(profitData?.sales_paise ?? 0)}
              sub="Gross sales revenue"
            />
            <IconKpiCard
              icon={ShoppingBag}
              color="bg-amber-500"
              label="Cost of Goods (COGS)"
              value={formatInr(profitData?.cogs_paise ?? 0)}
              sub="Valued at receipt cost"
            />
            <IconKpiCard
              icon={Wallet}
              color="bg-emerald-500"
              label="Gross Profit"
              value={formatInr(profitData?.profit_paise ?? 0)}
              sub="Net of product cost"
            />
            <IconKpiCard
              icon={Percent}
              color="bg-blue-600"
              label="Gross Margin %"
              value={`${grossMarginPct}%`}
              sub="Blended store margin"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Revenue vs. COGS vs. Gross Profit Comparison
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time profitability and inventory valuation across pricing tiers
                </p>
              </div>
              <VisualBarChart
                items={[
                  {
                    label: "Billed Sales",
                    value: Math.round((profitData?.sales_paise ?? 0) / 100),
                    formatted: formatInr(profitData?.sales_paise ?? 0),
                  },
                  {
                    label: "COGS Cost",
                    value: Math.round((profitData?.cogs_paise ?? 0) / 100),
                    formatted: formatInr(profitData?.cogs_paise ?? 0),
                  },
                  {
                    label: "Gross Profit",
                    value: Math.round(Math.max(0, profitData?.profit_paise ?? 0) / 100),
                    formatted: formatInr(profitData?.profit_paise ?? 0),
                  },
                  {
                    label: "Stock (Cost)",
                    value: Math.round((dashboard?.stock_cost_paise ?? stockTotal) / 100),
                    formatted: formatInr(dashboard?.stock_cost_paise ?? stockTotal),
                  },
                  {
                    label: "Stock (MRP)",
                    value: Math.round((dashboard?.stock_retail_paise ?? 0) / 100),
                    formatted: formatInr(dashboard?.stock_retail_paise ?? 0),
                  },
                ]}
                primaryLabel="Amount (₹)"
                primaryColor="#10b981"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Sales Revenue Split (COGS vs. Profit)
                </h2>
                <p className="text-xs text-slate-500">
                  Proportion of every rupee retained as gross margin
                </p>
              </div>
              <VisualDonutChart
                centerLabel="Margin"
                centerValue={`${grossMarginPct}%`}
                slices={[
                  {
                    label: "Gross Profit Retained",
                    value: Math.max(0, profitData?.profit_paise ?? 0),
                    formatted: formatInr(profitData?.profit_paise ?? 0),
                    color: "#10b981",
                  },
                  {
                    label: "Cost of Goods Sold",
                    value: Math.max(0, profitData?.cogs_paise ?? 0),
                    formatted: formatInr(profitData?.cogs_paise ?? 0),
                    color: "#f59e0b",
                  },
                ]}
              />
            </div>
          </div>

          {/* Profit & Valuation Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3.5">
              <h2 className="text-sm font-semibold text-slate-900">
                Profitability &amp; Inventory Valuation Ledger
              </h2>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Financial Metric</th>
                  <th className="px-4 py-3">Valuation Basis</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Proportion of Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    name: "Gross Billed Sales Revenue",
                    basis: "Completed POS + Online Orders",
                    val: profitData?.sales_paise ?? 0,
                    pct: 100,
                    color: "#7c3aed",
                  },
                  {
                    name: "Cost of Goods Sold (COGS)",
                    basis: "Latest Purchase Receipt Cost",
                    val: profitData?.cogs_paise ?? 0,
                    pct:
                      (profitData?.sales_paise ?? 0) > 0
                        ? Math.round(
                            ((profitData?.cogs_paise ?? 0) / (profitData?.sales_paise ?? 1)) *
                              1000,
                          ) / 10
                        : 0,
                    color: "#f59e0b",
                  },
                  {
                    name: "Net Realized Gross Profit",
                    basis: "Sales minus COGS",
                    val: profitData?.profit_paise ?? 0,
                    pct: Math.max(0, grossMarginPct),
                    color: "#10b981",
                  },
                  {
                    name: "Closing Inventory at Cost",
                    basis: "On-hand units × Purchase price",
                    val: dashboard?.stock_cost_paise ?? stockTotal,
                    pct: 100,
                    color: "#2563eb",
                  },
                  {
                    name: "Closing Inventory at Selling Price",
                    basis: "On-hand units × Retail selling price",
                    val: dashboard?.stock_retail_paise ?? 0,
                    pct: 100,
                    color: "#0d9488",
                  },
                ].map((row, idx) => (
                  <tr key={row.name} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <RankBadge index={idx + 1} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-500">{row.basis}</td>
                    <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                      {formatInr(row.val)}
                    </td>
                    <td className="px-4 py-3">
                      <ShareBar pct={row.pct} color={row.color} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ===================================================================
       * 4. GST & TAX RETURN REPORT (GSTR-1 / 3B Summary)
       * ================================================================= */}
      {activeTab === "gst" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IconKpiCard
              icon={Receipt}
              color="bg-violet-600"
              label="Taxable Value"
              value={formatInr(netTaxablePaise)}
              sub="Net sales before GST"
            />
            <IconKpiCard
              icon={Building2}
              color="bg-blue-600"
              label="Output CGST"
              value={formatInr(summary?.cgst_paise ?? 0)}
              sub="Central GST liability"
            />
            <IconKpiCard
              icon={Layers}
              color="bg-emerald-500"
              label="Output SGST"
              value={formatInr(summary?.sgst_paise ?? 0)}
              sub="State GST liability"
            />
            <IconKpiCard
              icon={ShieldCheck}
              color="bg-amber-500"
              label="Output IGST"
              value={formatInr(summary?.igst_paise ?? 0)}
              sub="Inter-state GST liability"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  GST Tax Component Comparison (CGST vs. SGST vs. IGST)
                </h2>
                <p className="text-xs text-slate-500">
                  Outward tax liability collected across completed GST invoices
                </p>
              </div>
              <VisualBarChart
                items={[
                  {
                    label: "Output CGST",
                    value: Math.round((summary?.cgst_paise ?? 0) / 100),
                    formatted: formatInr(summary?.cgst_paise ?? 0),
                  },
                  {
                    label: "Output SGST",
                    value: Math.round((summary?.sgst_paise ?? 0) / 100),
                    formatted: formatInr(summary?.sgst_paise ?? 0),
                  },
                  {
                    label: "Output IGST",
                    value: Math.round((summary?.igst_paise ?? 0) / 100),
                    formatted: formatInr(summary?.igst_paise ?? 0),
                  },
                  {
                    label: "Total GST",
                    value: Math.round(totalTaxPaise / 100),
                    formatted: formatInr(totalTaxPaise),
                  },
                ]}
                primaryLabel="Tax Liability (₹)"
                primaryColor="#2563eb"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Outward Tax Share by Head
                </h2>
                <p className="text-xs text-slate-500">
                  Distribution of collected GST across Central, State, and Integrated heads
                </p>
              </div>
              <VisualDonutChart
                centerLabel="Total GST"
                centerValue={formatInr(totalTaxPaise)}
                slices={[
                  {
                    label: "Output CGST (Intra-State)",
                    value: summary?.cgst_paise ?? 0,
                    formatted: formatInr(summary?.cgst_paise ?? 0),
                    color: "#2563eb",
                  },
                  {
                    label: "Output SGST (Intra-State)",
                    value: summary?.sgst_paise ?? 0,
                    formatted: formatInr(summary?.sgst_paise ?? 0),
                    color: "#10b981",
                  },
                  {
                    label: "Output IGST (Inter-State)",
                    value: summary?.igst_paise ?? 0,
                    formatted: formatInr(summary?.igst_paise ?? 0),
                    color: "#f59e0b",
                  },
                ]}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  GST Return Summary (GSTR-1 / GSTR-3B Outward Supplies)
                </h2>
                <p className="text-xs text-slate-500">
                  Ready for direct Tally Prime import or GSTR return filing.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void downloadGstr1Json()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  <span>Download GSTR-1 JSON (Govt Portal Format)</span>
                </button>
                <button
                  type="button"
                  onClick={() => void downloadGstAuditPack()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                  <span>Export Complete CA Audit Pack (.zip)</span>
                </button>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Tax Head</th>
                  <th className="px-4 py-3 text-right">Invoice Count</th>
                  <th className="px-4 py-3 text-right">Taxable Base</th>
                  <th className="px-4 py-3 text-right">Tax Amount</th>
                  <th className="px-4 py-3">Share of Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    head: "Output CGST (Intra-State)",
                    amount: summary?.cgst_paise ?? 0,
                    color: "#2563eb",
                  },
                  {
                    head: "Output SGST (Intra-State)",
                    amount: summary?.sgst_paise ?? 0,
                    color: "#10b981",
                  },
                  {
                    head: "Output IGST (Inter-State)",
                    amount: summary?.igst_paise ?? 0,
                    color: "#f59e0b",
                  },
                ].map((row, idx) => {
                  const pct =
                    totalTaxPaise > 0
                      ? Math.round((row.amount / totalTaxPaise) * 1000) / 10
                      : 0;
                  return (
                    <tr key={row.head} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <RankBadge index={idx + 1} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.head}</td>
                      <td className="num px-4 py-3 text-right text-slate-600">
                        {summary?.bills ?? 0}
                      </td>
                      <td className="num px-4 py-3 text-right text-slate-600">
                        {formatInr(netTaxablePaise)}
                      </td>
                      <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                        {formatInr(row.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <ShareBar pct={pct} color={row.color} />
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <td colSpan={2} className="px-4 py-3">
                    Total Outward GST Liability
                  </td>
                  <td className="num px-4 py-3 text-right">{summary?.bills ?? 0}</td>
                  <td className="num px-4 py-3 text-right">{formatInr(netTaxablePaise)}</td>
                  <td className="num px-4 py-3 text-right text-emerald-700">
                    {formatInr(totalTaxPaise)}
                  </td>
                  <td className="num px-4 py-3">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ===================================================================
       * 5. PAYMENT MODE BREAKDOWN
       * ================================================================= */}
      {activeTab === "payments" ? (
        <div className="space-y-5">
          {(() => {
            const totalNetCollected = payments.reduce(
              (s, p) => s + (p.amount_paise - p.change_paise),
              0,
            );
            const totalChange = payments.reduce((s, p) => s + p.change_paise, 0);
            const totalPaymentBills = payments.reduce((s, p) => s + (p.bills ?? 1), 0);
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={CreditCard}
                    color="bg-violet-600"
                    label="Active Tender Modes"
                    value={String(payments.length)}
                    sub="Payment channels used"
                  />
                  <IconKpiCard
                    icon={Receipt}
                    color="bg-blue-600"
                    label="Tender Transactions"
                    value={String(totalPaymentBills)}
                    sub="Total payment splits"
                  />
                  <IconKpiCard
                    icon={Wallet}
                    color="bg-emerald-500"
                    label="Net Collected"
                    value={formatInr(totalNetCollected)}
                    sub="Realized across all modes"
                  />
                  <IconKpiCard
                    icon={ArrowUpRight}
                    color="bg-amber-500"
                    label="Change Returned"
                    value={formatInr(totalChange)}
                    sub="Cash change handed back"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Collections by Payment Method
                      </h2>
                      <p className="text-xs text-slate-500">
                        Net amount collected across Cash, UPI, Card, and Khata
                      </p>
                    </div>
                    <VisualBarChart
                      items={payments.map((p) => {
                        const net = p.amount_paise - p.change_paise;
                        return {
                          label: p.method.toUpperCase(),
                          value: Math.round(net / 100),
                          formatted: formatInr(net),
                        };
                      })}
                      primaryLabel="Net Collected (₹)"
                      primaryColor="#10b981"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Payment Mode Share
                      </h2>
                      <p className="text-xs text-slate-500">
                        Customer preference across payment tenders
                      </p>
                    </div>
                    <VisualDonutChart
                      centerLabel="Net Collected"
                      centerValue={formatInr(totalNetCollected)}
                      slices={payments.map((p, idx) => ({
                        label: p.method.toUpperCase(),
                        value: Math.max(0, p.amount_paise - p.change_paise),
                        formatted: formatInr(p.amount_paise - p.change_paise),
                        color: CHART_COLORS[idx % CHART_COLORS.length],
                      }))}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search payment method..."
                    countLabel={`${filteredPayments.length} tender modes`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Payment Method</th>
                        <th className="px-4 py-3 text-right">Bills Count</th>
                        <th className="px-4 py-3 text-right">Gross Tendered</th>
                        <th className="px-4 py-3 text-right">Change Returned</th>
                        <th className="px-4 py-3 text-right">Net Collected</th>
                        <th className="px-4 py-3">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPayments.map((row, idx) => {
                        const net = row.amount_paise - row.change_paise;
                        const pct =
                          totalNetCollected > 0
                            ? Math.round((net / totalNetCollected) * 1000) / 10
                            : 0;
                        return (
                          <tr key={row.method} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <RankBadge index={idx + 1} />
                            </td>
                            <td className="px-4 py-3 font-semibold uppercase text-slate-900">
                              {row.method}
                            </td>
                            <td className="num px-4 py-3 text-right text-slate-600">
                              {row.bills ?? 1}
                            </td>
                            <td className="num px-4 py-3 text-right text-slate-600">
                              {formatInr(row.amount_paise)}
                            </td>
                            <td className="num px-4 py-3 text-right text-slate-500">
                              {formatInr(row.change_paise)}
                            </td>
                            <td className="num px-4 py-3 text-right font-semibold text-emerald-700">
                              {formatInr(net)}
                            </td>
                            <td className="px-4 py-3">
                              <ShareBar pct={pct} color="#10b981" />
                            </td>
                          </tr>
                        );
                      })}
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-400">
                            No payment tenders recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                          <td colSpan={2} className="px-4 py-3">
                            Total
                          </td>
                          <td className="num px-4 py-3 text-right">{totalPaymentBills}</td>
                          <td className="num px-4 py-3 text-right">
                            {formatInr(payments.reduce((s, p) => s + p.amount_paise, 0))}
                          </td>
                          <td className="num px-4 py-3 text-right">{formatInr(totalChange)}</td>
                          <td className="num px-4 py-3 text-right text-emerald-700">
                            {formatInr(totalNetCollected)}
                          </td>
                          <td className="num px-4 py-3">100%</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 6. SHIFT & Z-REPORTS
       * ================================================================= */}
      {activeTab === "shifts" ? (
        <div className="space-y-5">
          {(() => {
            const totalExpected = shifts.reduce((s, r) => s + r.expected_cash_paise, 0);
            const totalActual = shifts.reduce((s, r) => s + r.actual_cash_paise, 0);
            const totalVariance = totalActual - totalExpected;
            const exactCount = shifts.filter(
              (r) => r.actual_cash_paise === r.expected_cash_paise,
            ).length;
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={Clock}
                    color="bg-violet-600"
                    label="Closed Shifts"
                    value={String(shifts.length)}
                    sub="Completed Z-report closures"
                  />
                  <IconKpiCard
                    icon={Wallet}
                    color="bg-blue-600"
                    label="Expected Drawer Cash"
                    value={formatInr(totalExpected)}
                    sub="System calculated cash"
                  />
                  <IconKpiCard
                    icon={CheckCircle2}
                    color="bg-emerald-500"
                    label="Actual Counted Cash"
                    value={formatInr(totalActual)}
                    sub={`${exactCount} exact-match shifts`}
                  />
                  <IconKpiCard
                    icon={AlertTriangle}
                    color={totalVariance < 0 ? "bg-rose-600" : "bg-teal-600"}
                    label="Net Cash Variance"
                    value={formatInr(totalVariance)}
                    sub={totalVariance === 0 ? "Zero drawer discrepancy" : "Cumulative variance"}
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Shift Expected vs. Counted Cash Reconciliation
                      </h2>
                      <p className="text-xs text-slate-500">
                        Drawer audit comparison across recent cashier shifts
                      </p>
                    </div>
                    <VisualBarChart
                      items={shifts.slice(0, 8).map((s, idx) => ({
                        label: `Shift #${idx + 1}`,
                        value: Math.round(s.actual_cash_paise / 100),
                        secondaryValue: Math.round(s.expected_cash_paise / 100),
                        formatted: formatInr(s.actual_cash_paise),
                      }))}
                      primaryLabel="Counted Cash (₹)"
                      secondaryLabel="Expected Cash (₹)"
                      primaryColor="#10b981"
                      secondaryColor="#6366f1"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Shift Accuracy Breakdown
                      </h2>
                      <p className="text-xs text-slate-500">
                        Exact match vs. shortage or overage shifts
                      </p>
                    </div>
                    <VisualDonutChart
                      centerLabel="Shifts"
                      centerValue={String(shifts.length)}
                      slices={[
                        {
                          label: "Exact Match",
                          value: exactCount,
                          formatted: `${exactCount} shifts`,
                          color: "#10b981",
                        },
                        {
                          label: "Cash Overage",
                          value: shifts.filter((r) => r.actual_cash_paise > r.expected_cash_paise)
                            .length,
                          formatted: `${shifts.filter((r) => r.actual_cash_paise > r.expected_cash_paise).length} shifts`,
                          color: "#2563eb",
                        },
                        {
                          label: "Cash Shortage",
                          value: shifts.filter((r) => r.actual_cash_paise < r.expected_cash_paise)
                            .length,
                          formatted: `${shifts.filter((r) => r.actual_cash_paise < r.expected_cash_paise).length} shifts`,
                          color: "#e11d48",
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search shift closure date..."
                    countLabel={`${filteredShifts.length} shifts`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Shift Closed</th>
                        <th className="px-4 py-3 text-right">Opening Float</th>
                        <th className="px-4 py-3 text-right">Expected Drawer Cash</th>
                        <th className="px-4 py-3 text-right">Counted Actual Cash</th>
                        <th className="px-4 py-3 text-right">Cash Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredShifts.map((shift, idx) => {
                        const diff = shift.actual_cash_paise - shift.expected_cash_paise;
                        return (
                          <tr key={shift.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <RankBadge index={idx + 1} />
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              Closed shift{" "}
                              {shift.closed_at
                                ? `· ${new Date(shift.closed_at).toLocaleString("en-IN")}`
                                : ""}
                            </td>
                            <td className="num px-4 py-3 text-right text-slate-600">
                              {formatInr(shift.opening_cash_paise ?? 0)}
                            </td>
                            <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                              {formatInr(shift.expected_cash_paise)}
                            </td>
                            <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                              {formatInr(shift.actual_cash_paise)}
                            </td>
                            <td
                              className={`num px-4 py-3 text-right font-semibold ${
                                diff === 0
                                  ? "text-emerald-700"
                                  : diff < 0
                                    ? "text-rose-600"
                                    : "text-blue-600"
                              }`}
                            >
                              {diff === 0 ? "Exact Match" : formatInr(diff)}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredShifts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                            No closed cashier shifts recorded yet.
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                          <td colSpan={3} className="px-4 py-3">
                            Total ({filteredShifts.length} Shifts)
                          </td>
                          <td className="num px-4 py-3 text-right">{formatInr(totalExpected)}</td>
                          <td className="num px-4 py-3 text-right">{formatInr(totalActual)}</td>
                          <td className="num px-4 py-3 text-right">{formatInr(totalVariance)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 7. STOCK VALUATION REPORT
       * ================================================================= */}
      {activeTab === "stock" ? (
        <div className="space-y-5">
          {(() => {
            const totalUnits = stockLines.reduce((s, l) => s + l.on_hand, 0);
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={Package}
                    color="bg-violet-600"
                    label="Stocked SKUs"
                    value={String(stockLines.length)}
                    sub="Items with positive stock"
                  />
                  <IconKpiCard
                    icon={Layers}
                    color="bg-blue-600"
                    label="Total On-Hand Units"
                    value={String(totalUnits)}
                    sub="Physical units across bins"
                  />
                  <IconKpiCard
                    icon={Wallet}
                    color="bg-emerald-500"
                    label="Stock Value (Cost)"
                    value={formatInr(stockTotal)}
                    sub="Valued at receipt cost"
                  />
                  <IconKpiCard
                    icon={TrendingUp}
                    color="bg-amber-500"
                    label="Stock Value (Retail)"
                    value={formatInr(dashboard?.stock_retail_paise ?? 0)}
                    sub="Valued at selling price"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Top Inventory Items by Capital Value
                      </h2>
                      <p className="text-xs text-slate-500">
                        Highest-value stock lines held in store inventory
                      </p>
                    </div>
                    <VisualBarChart
                      items={stockLines.slice(0, 8).map((line) => ({
                        label: line.name.length > 18 ? `${line.name.slice(0, 18)}…` : line.name,
                        value: Math.round(line.value_paise / 100),
                        formatted: formatInr(line.value_paise),
                      }))}
                      primaryLabel="Stock Valuation (₹)"
                      primaryColor="#2563eb"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Inventory Capital Concentration
                      </h2>
                      <p className="text-xs text-slate-500">
                        Share of total stock value across top items
                      </p>
                    </div>
                    <VisualDonutChart
                      centerLabel="Total Cost"
                      centerValue={formatInr(stockTotal)}
                      slices={stockLines.slice(0, 6).map((line, idx) => ({
                        label: line.name,
                        value: line.value_paise,
                        formatted: formatInr(line.value_paise),
                        color: CHART_COLORS[idx % CHART_COLORS.length],
                      }))}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search stocked item name..."
                    countLabel={`${filteredStockLines.length} items`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-right">On-Hand Qty</th>
                        <th className="px-4 py-3 text-right">Latest Receipt Cost</th>
                        <th className="px-4 py-3 text-right">Total Valuation</th>
                        <th className="px-4 py-3">Capital Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStockLines.map((line, idx) => {
                        const pct =
                          stockTotal > 0
                            ? Math.round((line.value_paise / stockTotal) * 1000) / 10
                            : 0;
                        return (
                          <tr key={line.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <RankBadge index={idx + 1} />
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{line.name}</td>
                            <td className="num px-4 py-3 text-right font-semibold text-slate-700">
                              {line.on_hand}
                            </td>
                            <td className="num px-4 py-3 text-right text-slate-600">
                              {line.unit_cost_paise == null
                                ? "No cost"
                                : formatInr(line.unit_cost_paise)}
                            </td>
                            <td className="num px-4 py-3 text-right font-semibold text-emerald-700">
                              {line.unit_cost_paise == null
                                ? "No cost"
                                : formatInr(line.value_paise)}
                            </td>
                            <td className="px-4 py-3">
                              <ShareBar pct={pct} color="#2563eb" />
                            </td>
                          </tr>
                        );
                      })}
                      {filteredStockLines.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                            No positive stock balances found.
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                          <td colSpan={2} className="px-4 py-3">
                            Total
                          </td>
                          <td className="num px-4 py-3 text-right">
                            {filteredStockLines.reduce((s, l) => s + l.on_hand, 0)}
                          </td>
                          <td className="num px-4 py-3 text-right">—</td>
                          <td className="num px-4 py-3 text-right text-emerald-700">
                            {formatInr(filteredStockLines.reduce((s, l) => s + l.value_paise, 0))}
                          </td>
                          <td className="num px-4 py-3">100%</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 8. LOW STOCK & EXPIRY ALERTS
       * ================================================================= */}
      {activeTab === "alerts" ? (
        <div className="space-y-5">
          {(() => {
            const alertsList = dashboard?.alerts ?? [];
            const outOfStockCount = alertsList.filter((a) => a.on_hand <= 0).length;
            const totalDeficit = alertsList.reduce(
              (s, a) => s + Math.max(0, a.reorder_point - a.on_hand),
              0,
            );
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={AlertTriangle}
                    color="bg-rose-600"
                    label="Low Stock Alerts"
                    value={String(alertsList.length)}
                    sub="Items below reorder threshold"
                  />
                  <IconKpiCard
                    icon={Package}
                    color="bg-amber-500"
                    label="Out of Stock (0 Qty)"
                    value={String(outOfStockCount)}
                    sub="Immediate stockout SKUs"
                  />
                  <IconKpiCard
                    icon={Layers}
                    color="bg-violet-600"
                    label="Reorder Deficit Qty"
                    value={String(totalDeficit)}
                    sub="Units needed to reach threshold"
                  />
                  <IconKpiCard
                    icon={CheckCircle2}
                    color="bg-emerald-500"
                    label="Healthy Stock SKUs"
                    value={String(Math.max(0, stockLines.length - alertsList.length))}
                    sub="Stocked above threshold"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Available Stock vs. Reorder Point Threshold
                      </h2>
                      <p className="text-xs text-slate-500">
                        Comparison of current on-hand units against minimum reorder levels
                      </p>
                    </div>
                    <VisualBarChart
                      items={alertsList.slice(0, 8).map((a) => ({
                        label: a.name.length > 16 ? `${a.name.slice(0, 16)}…` : a.name,
                        value: a.on_hand,
                        secondaryValue: a.reorder_point,
                        formatted: `${a.on_hand} / ${a.reorder_point} units`,
                      }))}
                      primaryLabel="Available Qty"
                      secondaryLabel="Reorder Point"
                      primaryColor="#e11d48"
                      secondaryColor="#f59e0b"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Stock Health Distribution
                      </h2>
                      <p className="text-xs text-slate-500">
                        Healthy inventory vs. low stock &amp; out-of-stock SKUs
                      </p>
                    </div>
                    <VisualDonutChart
                      centerLabel="Alert SKUs"
                      centerValue={String(alertsList.length)}
                      slices={[
                        {
                          label: "Healthy Stock",
                          value: Math.max(1, stockLines.length),
                          formatted: `${stockLines.length} SKUs`,
                          color: "#10b981",
                        },
                        {
                          label: "Low Stock (Below Threshold)",
                          value: Math.max(0, alertsList.length - outOfStockCount),
                          formatted: `${Math.max(0, alertsList.length - outOfStockCount)} SKUs`,
                          color: "#f59e0b",
                        },
                        {
                          label: "Out of Stock (Zero)",
                          value: outOfStockCount,
                          formatted: `${outOfStockCount} SKUs`,
                          color: "#e11d48",
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search low stock SKU or product..."
                    countLabel={`${filteredAlerts.length} alerts`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">Store / Warehouse</th>
                        <th className="px-4 py-3 text-right">Available Qty</th>
                        <th className="px-4 py-3 text-right">Reorder Threshold</th>
                        <th className="px-4 py-3">Stock Fill %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAlerts.map((item, idx) => {
                        const fillPct =
                          item.reorder_point > 0
                            ? Math.min(
                                100,
                                Math.round((item.on_hand / item.reorder_point) * 1000) / 10,
                              )
                            : 0;
                        return (
                          <tr key={`${item.sku}-${idx}`} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <RankBadge index={idx + 1} />
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                                {item.sku}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                            <td className="px-4 py-3 text-slate-500">{item.store_name}</td>
                            <td className="num px-4 py-3 text-right font-semibold text-rose-600">
                              {item.on_hand}
                            </td>
                            <td className="num px-4 py-3 text-right font-semibold text-slate-700">
                              {item.reorder_point}
                            </td>
                            <td className="px-4 py-3">
                              <ShareBar pct={fillPct} color="#e11d48" />
                            </td>
                          </tr>
                        );
                      })}
                      {filteredAlerts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-400">
                            All store items are currently stocked above their reorder points.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 9. CUSTOMER & KHATA REPORT
       * ================================================================= */}
      {activeTab === "customers" ? (
        <div className="space-y-5">
          {(() => {
            const totalCustomerSpend = customers.reduce((s, c) => s + c.total_paise, 0);
            const totalCustomerBills = customers.reduce((s, c) => s + c.bills, 0);
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={Users}
                    color="bg-violet-600"
                    label="Active Customers"
                    value={String(customers.length)}
                    sub="Customers with billed orders"
                  />
                  <IconKpiCard
                    icon={Receipt}
                    color="bg-blue-600"
                    label="Customer Invoices"
                    value={String(totalCustomerBills)}
                    sub="Linked loyalty/khata bills"
                  />
                  <IconKpiCard
                    icon={TrendingUp}
                    color="bg-emerald-500"
                    label="Total Customer Spend"
                    value={formatInr(totalCustomerSpend)}
                    sub="Cumulative lifetime value"
                  />
                  <IconKpiCard
                    icon={Wallet}
                    color="bg-amber-500"
                    label="Khata Receivable Due"
                    value={formatInr(dashboard?.sales_due_paise ?? 0)}
                    sub="Pending customer dues"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Top Customers by Lifetime Spend
                      </h2>
                      <p className="text-xs text-slate-500">
                        Highest-value repeat buyers across POS and online orders
                      </p>
                    </div>
                    <VisualBarChart
                      items={customers.slice(0, 8).map((c) => ({
                        label: c.name.length > 16 ? `${c.name.slice(0, 16)}…` : c.name,
                        value: Math.round(c.total_paise / 100),
                        formatted: formatInr(c.total_paise),
                      }))}
                      primaryLabel="Lifetime Spend (₹)"
                      primaryColor="#7c3aed"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Customer Revenue Concentration
                      </h2>
                      <p className="text-xs text-slate-500">
                        Share of customer-linked revenue by buyer
                      </p>
                    </div>
                    <VisualDonutChart
                      centerLabel="Customer Spend"
                      centerValue={formatInr(totalCustomerSpend)}
                      slices={customers.slice(0, 6).map((c, idx) => ({
                        label: c.name,
                        value: c.total_paise,
                        formatted: formatInr(c.total_paise),
                        color: CHART_COLORS[idx % CHART_COLORS.length],
                      }))}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search customer name..."
                    countLabel={`${filteredCustomers.length} customers`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Customer Name</th>
                        <th className="px-4 py-3 text-right">Completed Bills</th>
                        <th className="px-4 py-3 text-right">Avg. Order Value</th>
                        <th className="px-4 py-3 text-right">Lifetime Spend</th>
                        <th className="px-4 py-3">Revenue Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.map((c, idx) => {
                        const pct =
                          totalCustomerSpend > 0
                            ? Math.round((c.total_paise / totalCustomerSpend) * 1000) / 10
                            : 0;
                        const aov = c.bills > 0 ? Math.round(c.total_paise / c.bills) : 0;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <RankBadge index={idx + 1} />
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                            <td className="num px-4 py-3 text-right text-slate-600">
                              {c.bills} bills
                            </td>
                            <td className="num px-4 py-3 text-right text-slate-600">
                              {formatInr(aov)}
                            </td>
                            <td className="num px-4 py-3 text-right font-semibold text-emerald-700">
                              {formatInr(c.total_paise)}
                            </td>
                            <td className="px-4 py-3">
                              <ShareBar pct={pct} color="#7c3aed" />
                            </td>
                          </tr>
                        );
                      })}
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                            No customer-linked sales recorded yet.
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                          <td colSpan={2} className="px-4 py-3">
                            Total
                          </td>
                          <td className="num px-4 py-3 text-right">{totalCustomerBills} bills</td>
                          <td className="num px-4 py-3 text-right">—</td>
                          <td className="num px-4 py-3 text-right text-emerald-700">
                            {formatInr(totalCustomerSpend)}
                          </td>
                          <td className="num px-4 py-3">100%</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 10. PURCHASE & SUPPLIERS REPORT
       * ================================================================= */}
      {activeTab === "purchases" ? (
        <div className="space-y-5">
          {(() => {
            const totalPayable = suppliers.reduce((s, r) => s + (r.balance_paise ?? 0), 0);
            const sevenDayPurchases = (dashboard?.days ?? []).reduce(
              (s, d) => s + d.purchases_paise,
              0,
            );
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={ShoppingBag}
                    color="bg-violet-600"
                    label="Registered Suppliers"
                    value={String(suppliers.length)}
                    sub="Active vendor accounts"
                  />
                  <IconKpiCard
                    icon={TrendingUp}
                    color="bg-emerald-500"
                    label="Today's Purchases (GRN)"
                    value={formatInr(dashboard?.purchases_paise ?? 0)}
                    sub="Stock inwarded today"
                  />
                  <IconKpiCard
                    icon={Layers}
                    color="bg-blue-600"
                    label="7-Day Purchase Volume"
                    value={formatInr(sevenDayPurchases)}
                    sub="Last 7 days GRN total"
                  />
                  <IconKpiCard
                    icon={Wallet}
                    color="bg-amber-500"
                    label="Supplier Payable Due"
                    value={formatInr(dashboard?.purchase_due_paise ?? totalPayable)}
                    sub="Pending vendor balances"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Daily Supplier Purchases (Last 7 Days)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Goods receipt note (GRN) inward value by day
                      </p>
                    </div>
                    <VisualBarChart
                      items={(dashboard?.days ?? []).map((d) => ({
                        label: `${d.label} (${d.date.slice(5)})`,
                        value: Math.round(d.purchases_paise / 100),
                        formatted: formatInr(d.purchases_paise),
                      }))}
                      primaryLabel="Purchases (₹)"
                      primaryColor="#0d9488"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Supplier Payable Share
                      </h2>
                      <p className="text-xs text-slate-500">
                        Vendor payable balances across registered suppliers
                      </p>
                    </div>
                    <VisualDonutChart
                      centerLabel="Suppliers"
                      centerValue={String(suppliers.length)}
                      slices={suppliers.slice(0, 6).map((s, idx) => ({
                        label: s.name,
                        value: Math.max(0, s.balance_paise ?? 0),
                        formatted: formatInr(s.balance_paise ?? 0),
                        color: CHART_COLORS[idx % CHART_COLORS.length],
                      }))}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search supplier name or GSTIN..."
                    countLabel={`${filteredSuppliers.length} suppliers`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Supplier Name</th>
                        <th className="px-4 py-3">GSTIN</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3 text-right">Payable Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSuppliers.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <RankBadge index={idx + 1} />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                          <td className="font-mono px-4 py-3 text-slate-600">
                            {s.gstin || "Unregistered"}
                          </td>
                          <td className="num px-4 py-3 text-slate-500">{s.phone || "—"}</td>
                          <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                            {formatInr(s.balance_paise ?? 0)}
                          </td>
                        </tr>
                      ))}
                      {filteredSuppliers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                            No supplier records found.
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                          <td colSpan={4} className="px-4 py-3">
                            Total Supplier Payable
                          </td>
                          <td className="num px-4 py-3 text-right text-emerald-700">
                            {formatInr(totalPayable)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 11. AUDIT TRAIL
       * ================================================================= */}
      {activeTab === "audit" ? (
        <div className="space-y-5">
          {(() => {
            const actionCounts: Record<string, number> = {};
            for (const a of auditLogs) {
              const prefix = a.action.split(".")[0] || a.action;
              actionCounts[prefix] = (actionCounts[prefix] ?? 0) + 1;
            }
            const groupEntries = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);
            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={Activity}
                    color="bg-violet-600"
                    label="Total Audit Events"
                    value={String(auditLogs.length)}
                    sub="Recorded operational actions"
                  />
                  <IconKpiCard
                    icon={ShieldCheck}
                    color="bg-emerald-500"
                    label="Event Categories"
                    value={String(groupEntries.length)}
                    sub="Distinct module namespaces"
                  />
                  <IconKpiCard
                    icon={Clock}
                    color="bg-blue-600"
                    label="Latest Event"
                    value={
                      auditLogs[0]?.created_at
                        ? new Date(auditLogs[0].created_at).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"
                    }
                    sub="Most recent logged activity"
                  />
                  <IconKpiCard
                    icon={CheckCircle2}
                    color="bg-teal-600"
                    label="Ledger Integrity"
                    value="Verified"
                    sub="Append-only audit log"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-12">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Audit Events by Module Category
                      </h2>
                      <p className="text-xs text-slate-500">
                        Frequency of logged security &amp; operational events
                      </p>
                    </div>
                    <VisualBarChart
                      items={groupEntries.slice(0, 8).map(([mod, cnt]) => ({
                        label: mod.toUpperCase(),
                        value: cnt,
                        formatted: `${cnt} events`,
                      }))}
                      primaryLabel="Events Count"
                      primaryColor="#6366f1"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-semibold text-slate-900">
                        Event Share by Module
                      </h2>
                      <p className="text-xs text-slate-500">
                        Distribution of audit trail entries across store operations
                      </p>
                    </div>
                    <VisualDonutChart
                      centerLabel="Audit Logs"
                      centerValue={String(auditLogs.length)}
                      slices={groupEntries.slice(0, 6).map(([mod, cnt], idx) => ({
                        label: mod.toUpperCase(),
                        value: cnt,
                        formatted: `${cnt} events`,
                        color: CHART_COLORS[idx % CHART_COLORS.length],
                      }))}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search audit action or subject ID..."
                    countLabel={`${filteredAudit.length} events`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Action Event</th>
                        <th className="px-4 py-3">Subject Reference</th>
                        <th className="px-4 py-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAudit.map((a, idx) => (
                        <tr key={a.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <RankBadge index={idx + 1} />
                          </td>
                          <td className="font-mono px-4 py-3 text-[11px] font-semibold text-slate-900">
                            {a.action}
                          </td>
                          <td className="font-mono px-4 py-3 text-[11px] text-slate-500">
                            {a.subject_id || "—"}
                          </td>
                          <td className="num px-4 py-3 text-right text-slate-500">
                            {new Date(a.created_at).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      {filteredAudit.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-400">
                            No audit trail entries found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 12. HSN-WISE GST RETURN (GSTR-1 TABLE 12)
       * ================================================================= */}
      {activeTab === "hsn" ? (
        <div className="space-y-5">
          {(() => {
            const totalTaxable = hsnRows.reduce((acc, h) => acc + h.taxable_paise, 0);
            const totalCgst = hsnRows.reduce((acc, h) => acc + h.cgst_paise, 0);
            const totalSgst = hsnRows.reduce((acc, h) => acc + h.sgst_paise, 0);
            const totalIgst = hsnRows.reduce((acc, h) => acc + h.igst_paise, 0);
            const totalTax = totalCgst + totalSgst + totalIgst;
            const totalBilled = hsnRows.reduce((acc, h) => acc + h.total_paise, 0);

            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={Building2}
                    color="bg-indigo-600"
                    label="Taxable Supplies"
                    value={formatInr(totalTaxable)}
                    sub="GSTR-1 Table 12 Taxable Turnover"
                  />
                  <IconKpiCard
                    icon={Percent}
                    color="bg-emerald-600"
                    label="Central GST (CGST)"
                    value={formatInr(totalCgst)}
                    sub="Intra-state central tax component"
                  />
                  <IconKpiCard
                    icon={Percent}
                    color="bg-sky-600"
                    label="State GST (SGST)"
                    value={formatInr(totalSgst)}
                    sub="Intra-state state tax component"
                  />
                  <IconKpiCard
                    icon={Receipt}
                    color="bg-violet-600"
                    label="Total Output Tax"
                    value={formatInr(totalTax)}
                    sub={`${hsnRows.length} registered HSN classifications`}
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search by HSN or item description..."
                    countLabel={`${filteredHsn.length} HSN codes`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">HSN / SAC</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-center">UQC</th>
                        <th className="px-4 py-3 text-right">Total Qty</th>
                        <th className="px-4 py-3 text-right">Taxable Turnover</th>
                        <th className="px-4 py-3 text-right">CGST</th>
                        <th className="px-4 py-3 text-right">SGST</th>
                        <th className="px-4 py-3 text-right">Total GST</th>
                        <th className="px-4 py-3 text-right">Invoice Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHsn.map((h) => (
                        <tr key={h.hsn} className="hover:bg-slate-50/60">
                          <td className="font-mono px-4 py-3 font-semibold text-indigo-700">
                            {h.hsn}
                          </td>
                          <td className="px-4 py-3 text-slate-800 font-semibold">{h.description || "General Goods"}</td>
                          <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">{h.uqc}</td>
                          <td className="num px-4 py-3 text-right text-slate-700 font-semibold">{h.total_qty}</td>
                          <td className="num px-4 py-3 text-right text-slate-900 font-semibold">{formatInr(h.taxable_paise)}</td>
                          <td className="num px-4 py-3 text-right text-emerald-700">{formatInr(h.cgst_paise)}</td>
                          <td className="num px-4 py-3 text-right text-sky-700">{formatInr(h.sgst_paise)}</td>
                          <td className="num px-4 py-3 text-right text-violet-700 font-semibold">
                            {formatInr(h.cgst_paise + h.sgst_paise + h.igst_paise)}
                          </td>
                          <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                            {formatInr(h.total_paise)}
                          </td>
                        </tr>
                      ))}
                      {filteredHsn.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-5 py-8 text-center text-xs text-slate-400">
                            No HSN sales recorded for the selected period.
                          </td>
                        </tr>
                      ) : (
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                          <td colSpan={3} className="px-4 py-3 text-slate-900">
                            GSTR-1 Summary Total
                          </td>
                          <td className="num px-4 py-3 text-right">
                            {hsnRows.reduce((acc, h) => acc + h.total_qty, 0)}
                          </td>
                          <td className="num px-4 py-3 text-right">{formatInr(totalTaxable)}</td>
                          <td className="num px-4 py-3 text-right text-emerald-700">{formatInr(totalCgst)}</td>
                          <td className="num px-4 py-3 text-right text-sky-700">{formatInr(totalSgst)}</td>
                          <td className="num px-4 py-3 text-right text-violet-700">{formatInr(totalTax)}</td>
                          <td className="num px-4 py-3 text-right text-slate-900">{formatInr(totalBilled)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 13. DAY BOOK & DAILY CASH REGISTER
       * ================================================================= */}
      {activeTab === "daybook" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IconKpiCard
              icon={Wallet}
              color="bg-amber-600"
              label="Opening Drawer Float"
              value={formatInr(daybookData?.opening_cash_paise ?? 0)}
              sub="Initial cash at shift opening"
            />
            <IconKpiCard
              icon={Receipt}
              color="bg-emerald-600"
              label="Cash Inflows"
              value={formatInr(daybookData?.cash_sales_paise ?? 0)}
              sub="Direct physical cash receipts"
            />
            <IconKpiCard
              icon={CreditCard}
              color="bg-sky-600"
              label="Digital (UPI & Card)"
              value={formatInr((daybookData?.upi_sales_paise ?? 0) + (daybookData?.card_sales_paise ?? 0))}
              sub="QR codes, UPI, card settlements"
            />
            <IconKpiCard
              icon={TrendingUp}
              color="bg-indigo-600"
              label="Closing Drawer Cash"
              value={formatInr(daybookData?.closing_cash_paise ?? 0)}
              sub={`${daybookData?.shifts_count ?? 1} cashier shift records`}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Day Book Ledger Summary</h2>
            <p className="mt-1 text-xs text-slate-500">
              Financial reconciliation for {daybookData?.date || "today"} across sales registers.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <span className="text-xs font-semibold text-slate-500">Total Drawer Inflows</span>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatInr(daybookData?.total_inflow_paise ?? 0)}
                </p>
                <span className="text-[11px] text-slate-400">All payment tender modes</span>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <span className="text-xs font-semibold text-slate-500">Cash vs Digital Ratio</span>
                <p className="mt-1 text-lg font-semibold text-indigo-700">
                  {daybookData && daybookData.total_inflow_paise > 0
                    ? `${Math.round((daybookData.cash_sales_paise / daybookData.total_inflow_paise) * 100)}% Cash / ${Math.round(
                        (((daybookData.upi_sales_paise ?? 0) + (daybookData.card_sales_paise ?? 0)) /
                          daybookData.total_inflow_paise) *
                          100,
                      )}% Digital`
                    : "100% Cash"}
                </p>
                <span className="text-[11px] text-slate-400">Collection channel split</span>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <span className="text-xs font-semibold text-slate-500">Active Shift Count</span>
                <p className="mt-1 text-lg font-semibold text-emerald-700">
                  {daybookData?.shifts_count ?? 0} Register Sessions
                </p>
                <span className="text-[11px] text-slate-400">Cashier reconciliations</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================================
       * 14. STAFF & COUNTER PERFORMANCE
       * ================================================================= */}
      {activeTab === "staff-sales" ? (
        <div className="space-y-5">
          {(() => {
            const totalStaffSales = staffSales.reduce((acc, s) => acc + s.total_paise, 0);
            const totalStaffBills = staffSales.reduce((acc, s) => acc + s.bills, 0);

            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={Users}
                    color="bg-indigo-600"
                    label="Active Cashiers"
                    value={String(staffSales.length)}
                    sub="Staff members processing sales"
                  />
                  <IconKpiCard
                    icon={Receipt}
                    color="bg-emerald-600"
                    label="Total Counter Bills"
                    value={String(totalStaffBills)}
                    sub="Customer invoices generated"
                  />
                  <IconKpiCard
                    icon={TrendingUp}
                    color="bg-violet-600"
                    label="Total Staff Revenue"
                    value={formatInr(totalStaffSales)}
                    sub="Gross billed checkout volume"
                  />
                  <IconKpiCard
                    icon={Percent}
                    color="bg-amber-600"
                    label="Average Basket Value"
                    value={totalStaffBills > 0 ? formatInr(Math.round(totalStaffSales / totalStaffBills)) : "₹0"}
                    sub="Average invoice size per checkout"
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search cashier name..."
                    countLabel={`${filteredStaffSales.length} staff members`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Staff / Cashier Name</th>
                        <th className="px-4 py-3 text-right">Invoices Billed</th>
                        <th className="px-4 py-3 text-right">Avg Ticket Size</th>
                        <th className="px-4 py-3 text-right">Total Net Sales</th>
                        <th className="px-4 py-3 text-right">Revenue Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStaffSales.map((s, idx) => {
                        const share = totalStaffSales > 0 ? Math.round((s.total_paise / totalStaffSales) * 100) : 0;
                        const avg = s.bills > 0 ? Math.round(s.total_paise / s.bills) : 0;
                        return (
                          <tr key={s.staff_name} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <RankBadge index={idx + 1} />
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{s.staff_name}</td>
                            <td className="num px-4 py-3 text-right text-slate-700 font-semibold">{s.bills}</td>
                            <td className="num px-4 py-3 text-right text-slate-500">{formatInr(avg)}</td>
                            <td className="num px-4 py-3 text-right font-semibold text-slate-900">{formatInr(s.total_paise)}</td>
                            <td className="num px-4 py-3 text-right text-indigo-600 font-semibold">{share}%</td>
                          </tr>
                        );
                      })}
                      {filteredStaffSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                            No staff sales records found for this period.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 15. DISCOUNTS & VOID/REFUND AUDIT
       * ================================================================= */}
      {activeTab === "discounts" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IconKpiCard
              icon={Percent}
              color="bg-rose-600"
              label="Total Markdowns"
              value={formatInr(discountsData?.total_discount_paise ?? 0)}
              sub="Discounts granted at billing"
            />
            <IconKpiCard
              icon={AlertTriangle}
              color="bg-amber-600"
              label="Voided Invoices"
              value={String(discountsData?.total_void_count ?? 0)}
              sub="Cancelled checkout bills"
            />
            <IconKpiCard
              icon={Receipt}
              color="bg-indigo-600"
              label="Discounted Invoices"
              value={String(discountsData?.discounts?.length ?? 0)}
              sub="Bills with bill-level markdown"
            />
            <IconKpiCard
              icon={ShieldCheck}
              color="bg-emerald-600"
              label="Audit Compliance"
              value="Monitored"
              sub="Real-time cashier override audit"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Recent Discounted Invoices
                </h3>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="px-3 py-2.5">Invoice #</th>
                    <th className="px-3 py-2.5 text-right">Subtotal</th>
                    <th className="px-3 py-2.5 text-right">Discount</th>
                    <th className="px-3 py-2.5 text-right">Final Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(discountsData?.discounts ?? []).map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="font-mono px-3 py-2.5 font-semibold text-slate-900">{d.number}</td>
                      <td className="num px-3 py-2.5 text-right text-slate-500">{formatInr(d.subtotal_paise)}</td>
                      <td className="num px-3 py-2.5 text-right font-semibold text-rose-600">{formatInr(d.discount_paise)}</td>
                      <td className="num px-3 py-2.5 text-right font-semibold text-slate-900">{formatInr(d.total_paise)}</td>
                    </tr>
                  ))}
                  {(discountsData?.discounts?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                        No discounted sales found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Voided &amp; Cancelled Bills Audit
                </h3>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                    <th className="px-3 py-2.5">Invoice #</th>
                    <th className="px-3 py-2.5 text-right">Voided Amount</th>
                    <th className="px-3 py-2.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(discountsData?.voids ?? []).map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50">
                      <td className="font-mono px-3 py-2.5 font-semibold text-rose-700">{v.number}</td>
                      <td className="num px-3 py-2.5 text-right font-semibold text-slate-900">{formatInr(v.total_paise)}</td>
                      <td className="num px-3 py-2.5 text-right text-slate-500">
                        {new Date(v.created_at).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {(discountsData?.voids?.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-xs text-slate-400">
                        Zero voided bills in the selected period.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================================================================
       * 16. CATEGORY & BRAND SALES VELOCITY
       * ================================================================= */}
      {activeTab === "category-sales" ? (
        <div className="space-y-5">
          {(() => {
            const totalTurnover = categorySales.reduce((acc, c) => acc + c.total_paise, 0);
            const totalUnits = categorySales.reduce((acc, c) => acc + c.units_sold, 0);

            return (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <IconKpiCard
                    icon={Layers}
                    color="bg-indigo-600"
                    label="Active Categories"
                    value={String(categorySales.length)}
                    sub="Product departments contributing sales"
                  />
                  <IconKpiCard
                    icon={Package}
                    color="bg-emerald-600"
                    label="Units Moved"
                    value={String(totalUnits)}
                    sub="Total quantity dispatched"
                  />
                  <IconKpiCard
                    icon={TrendingUp}
                    color="bg-violet-600"
                    label="Category Turnover"
                    value={formatInr(totalTurnover)}
                    sub="Departmental sales aggregate"
                  />
                  <IconKpiCard
                    icon={Percent}
                    color="bg-amber-600"
                    label="Top Category Share"
                    value={
                      categorySales[0] && totalTurnover > 0
                        ? `${Math.round((categorySales[0].total_paise / totalTurnover) * 100)}%`
                        : "0%"
                    }
                    sub={categorySales[0]?.category || "None"}
                  />
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <TableToolbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    placeholder="Search category name..."
                    countLabel={`${filteredCategorySales.length} categories`}
                  />
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Category Department</th>
                        <th className="px-4 py-3 text-right">Units Sold</th>
                        <th className="px-4 py-3 text-right">Turnover</th>
                        <th className="px-4 py-3 text-right">Revenue Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCategorySales.map((c, idx) => {
                        const share = totalTurnover > 0 ? Math.round((c.total_paise / totalTurnover) * 100) : 0;
                        return (
                          <tr key={c.category} className="hover:bg-slate-50/60">
                            <td className="px-4 py-3">
                              <RankBadge index={idx + 1} />
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{c.category}</td>
                            <td className="num px-4 py-3 text-right text-slate-700 font-semibold">{c.units_sold}</td>
                            <td className="num px-4 py-3 text-right font-semibold text-slate-900">{formatInr(c.total_paise)}</td>
                            <td className="num px-4 py-3 text-right text-indigo-600 font-semibold">{share}%</td>
                          </tr>
                        );
                      })}
                      {filteredCategorySales.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                            No category velocity data recorded.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      ) : null}

      {/* ===================================================================
       * 17. ITEM STOCK LEDGER (CHRONOLOGICAL INVENTORY JOURNAL)
       * ================================================================= */}
      {activeTab === "item-ledger" ? (
        <div className="space-y-5">
          {/* Item Selector Bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Select Product / SKU</label>
                <p className="text-[11px] text-slate-500">View complete historical stock movement journal</p>
              </div>
            </div>
            <select
              value={selectedLedgerItemId}
              onChange={(e) => setSelectedLedgerItemId(e.target.value)}
              className="h-9 min-w-[260px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
            >
              {itemLedgerData?.items?.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.sku || "No SKU"}) · Stock: {it.current_stock}
                </option>
              ))}
            </select>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <IconKpiCard
              icon={Clock}
              color="bg-slate-700"
              label="Opening Stock"
              value={`${itemLedgerData?.opening_qty ?? 0} Units`}
              sub="Balance before period"
            />
            <IconKpiCard
              icon={ArrowDownRight}
              color="bg-emerald-600"
              label="Stock Inward"
              value={`+${itemLedgerData?.total_inward ?? 0}`}
              sub="Purchases & inward GRNs"
            />
            <IconKpiCard
              icon={ArrowUpRight}
              color="bg-rose-600"
              label="Stock Outward"
              value={`-${itemLedgerData?.total_outward ?? 0}`}
              sub="POS sales & dispatches"
            />
            <IconKpiCard
              icon={Package}
              color="bg-indigo-600"
              label="Closing Balance"
              value={`${itemLedgerData?.closing_qty ?? 0} Units`}
              sub="Net inventory on hand"
            />
            <IconKpiCard
              icon={Wallet}
              color="bg-amber-600"
              label="Stock Valuation"
              value={formatInr(itemLedgerData?.valuation_paise || 0)}
              sub="Valued at item unit cost"
            />
          </div>

          {/* Ledger Entries Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <TableToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Filter by reference number or reason..."
              countLabel={`${itemLedgerData?.entries?.length || 0} ledger transactions`}
            />
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Date &amp; Time</th>
                  <th className="px-4 py-3">Transaction Type</th>
                  <th className="px-4 py-3">Reference / Bill #</th>
                  <th className="px-4 py-3">Reason / Details</th>
                  <th className="px-4 py-3 text-right">Inward</th>
                  <th className="px-4 py-3 text-right">Outward</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itemLedgerData?.entries
                  ?.filter(
                    (e) =>
                      !searchQuery ||
                      e.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      e.reason.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(e.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            e.qty_in > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {e.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{e.reference}</td>
                      <td className="px-4 py-3 text-slate-600">{e.reason}</td>
                      <td className="num px-4 py-3 text-right font-semibold text-emerald-600">
                        {e.qty_in > 0 ? `+${e.qty_in}` : "-"}
                      </td>
                      <td className="num px-4 py-3 text-right font-semibold text-rose-600">
                        {e.qty_out > 0 ? `-${e.qty_out}` : "-"}
                      </td>
                      <td className="num px-4 py-3 text-right font-semibold text-slate-900">{e.balance}</td>
                      <td className="num px-4 py-3 text-right text-slate-600">{formatInr(e.unit_cost_paise)}</td>
                      <td className="num px-4 py-3 text-right font-semibold text-slate-900">{formatInr(e.total_paise)}</td>
                    </tr>
                  ))}
                {(!itemLedgerData?.entries || itemLedgerData.entries.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-xs text-slate-400">
                      No stock movement ledger transactions recorded for this item in this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ===================================================================
       * 18. PURCHASE REGISTER & INPUT TAX CREDIT (GSTR-2B AUDIT)
       * ================================================================= */}
      {activeTab === "purchase-register" ? (
        <div className="space-y-5">
          {/* Supplier Filter Strip */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Filter Supplier</label>
                <p className="text-[11px] text-slate-500">Vendor invoice tax journal and ITC reconciliation</p>
              </div>
            </div>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="h-9 min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-600"
            >
              <option value="">All Registered Suppliers</option>
              {purchaseRegisterData?.suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.gstin ? `(${s.gstin})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IconKpiCard
              icon={Receipt}
              color="bg-indigo-600"
              label="Purchase Invoices"
              value={String(purchaseRegisterData?.summary.invoices_count ?? 0)}
              sub="Vendor purchase orders received"
            />
            <IconKpiCard
              icon={TrendingUp}
              color="bg-slate-800"
              label="Taxable Turnover"
              value={formatInr(purchaseRegisterData?.summary.total_taxable_paise || 0)}
              sub="Net purchase cost before GST"
            />
            <IconKpiCard
              icon={ShieldCheck}
              color="bg-emerald-600"
              label="Input GST (ITC)"
              value={formatInr(purchaseRegisterData?.summary.total_gst_paise || 0)}
              sub="Eligible input tax credit"
            />
            <IconKpiCard
              icon={Wallet}
              color="bg-amber-600"
              label="Gross Invoiced Value"
              value={formatInr(purchaseRegisterData?.summary.total_invoices_paise || 0)}
              sub="Total vendor payables"
            />
          </div>

          {/* Purchase Invoices Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <TableToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search invoice number, supplier name, or GSTIN..."
              countLabel={`${purchaseRegisterData?.rows?.length || 0} purchase invoices`}
            />
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Invoice / PO #</th>
                  <th className="px-4 py-3">Invoice Date</th>
                  <th className="px-4 py-3">Supplier Name</th>
                  <th className="px-4 py-3">Supplier GSTIN</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Items &amp; Qty</th>
                  <th className="px-4 py-3 text-right">Taxable Value</th>
                  <th className="px-4 py-3 text-right">CGST (9%)</th>
                  <th className="px-4 py-3 text-right">SGST (9%)</th>
                  <th className="px-4 py-3 text-right">Total Invoice</th>
                  <th className="px-4 py-3 text-center">ITC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseRegisterData?.rows
                  ?.filter(
                    (r) =>
                      !searchQuery ||
                      r.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      r.supplier_gstin.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">{r.number}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(r.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.supplier_name}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{r.supplier_gstin}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold capitalize border border-emerald-200">
                          {r.status}
                        </span>
                      </td>
                      <td className="num px-4 py-3 text-right text-slate-700">
                        {r.items_count} items ({r.qty} pcs)
                      </td>
                      <td className="num px-4 py-3 text-right font-semibold text-slate-900">
                        {formatInr(r.taxable_paise)}
                      </td>
                      <td className="num px-4 py-3 text-right text-slate-600">{formatInr(r.cgst_paise)}</td>
                      <td className="num px-4 py-3 text-right text-slate-600">{formatInr(r.sgst_paise)}</td>
                      <td className="num px-4 py-3 text-right font-semibold text-[#0c831f]">
                        {formatInr(r.total_paise)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                          GSTR-2B Match
                        </span>
                      </td>
                    </tr>
                  ))}
                {(!purchaseRegisterData?.rows || purchaseRegisterData.rows.length === 0) && (
                  <tr>
                    <td colSpan={11} className="px-5 py-8 text-center text-xs text-slate-400">
                      No purchase register records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Schedule Email Modal with List and Delete capabilities */}
      {scheduleOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Automated Email Report Schedules
                </h2>
                <p className="text-xs text-slate-500">
                  Configure daily executive summary emails dispatched at store closing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List of existing schedules */}
            <div className="mt-4 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Active Schedules ({schedules.length})
              </span>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">{s.email}</span>
                      <p className="text-[11px] text-slate-500">
                        Added: {new Date(s.created_at).toLocaleDateString("en-IN")} · Dispatches daily at 21:00
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteSchedule(s.id)}
                      className="rounded p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="Delete Schedule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {schedules.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">
                    No active email schedules yet. Add a recipient below.
                  </p>
                ) : null}
              </div>
            </div>

            {/* Form to add new schedule */}
            <form onSubmit={handleScheduleReport} className="mt-5 border-t border-slate-100 pt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Add Recipient Email Address
                <input
                  type="email"
                  required
                  value={scheduleEmail}
                  onChange={(e) => setScheduleEmail(e.target.value)}
                  placeholder="finance@store.in"
                  className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 outline-none focus:border-slate-900"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setScheduleOpen(false)}
                  className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Add Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* User Activity Detail Modal */}
      {selectedUserDetail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setSelectedUserDetail(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">
                  {selectedUserDetail.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedUserDetail.username}</h2>
                  <p className="text-xs text-slate-500">
                    {selectedUserDetail.email} · <span className="capitalize">{selectedUserDetail.role}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 text-xs">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500">Total Sales</span>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedUserDetail.total_sales}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500">Total Purchases</span>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedUserDetail.total_purchases}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500">Total Quotations</span>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedUserDetail.total_quotations}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500">Return Sales (Credit Notes)</span>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedUserDetail.total_return_sales}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500">Return Purchases</span>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedUserDetail.total_return_purchases}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500">Stock Transfers</span>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedUserDetail.total_transfers}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <span className="text-slate-500">Stock Adjustments</span>
                <p className="mt-1 text-lg font-bold text-slate-900">{selectedUserDetail.total_adjustments}</p>
              </div>
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                <span className="font-semibold text-indigo-700">Total Documents Created</span>
                <p className="mt-1 text-lg font-bold text-indigo-900">{selectedUserDetail.total_documents}</p>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="h-9 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================================
 * REUSABLE REPORT VISUAL COMPONENTS (Matching Image 5 Reference)
 * ========================================================================== */

function IconKpiCard({
  icon: Icon,
  color,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <article className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="num mt-0.5 truncate text-xl font-semibold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</p>
      </div>
    </article>
  );
}

function RankBadge({ index }: { index: number }) {
  const isTop3 = index <= 3;
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
        isTop3
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {index}
    </span>
  );
}

function ShareBar({ pct, color }: { pct: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="num text-xs font-semibold text-slate-600">{pct}%</span>
    </div>
  );
}

function TableToolbar({
  searchQuery,
  onSearchChange,
  placeholder,
  countLabel,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  placeholder: string;
  countLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/60 pr-3 pl-8 text-xs font-medium text-slate-900 outline-none focus:border-slate-900 focus:bg-white"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {countLabel}
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
      </div>
    </div>
  );
}

function VisualBarChart({
  items,
  primaryLabel,
  secondaryLabel,
  primaryColor = "#8b5cf6",
  secondaryColor = "#10b981",
}: {
  items: {
    label: string;
    value: number;
    secondaryValue?: number;
    formatted: string;
  }[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
        No chart data available for the selected period.
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...items.map((i) => Math.max(i.value, i.secondaryValue ?? 0)),
  );
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div>
      <div className="relative h-60 w-full pt-4 pr-2 pb-8 pl-12">
        {/* Horizontal Grid Lines & Y-Axis Ticks */}
        {ticks.map((t) => {
          const val = Math.round(maxVal * t);
          return (
            <div
              key={t}
              className="
                pointer-events-none absolute right-2 left-12 flex items-center
                border-b border-dashed border-slate-200/80
              "
              style={{ top: `${16 + (1 - t) * 184}px` }}
            >
              <span className="num -ml-12 w-10 pr-2 text-right text-[10px] font-medium text-slate-400">
                {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              </span>
            </div>
          );
        })}

        {/* Bars Container */}
        <div className="relative z-10 flex h-[184px] items-end justify-around gap-2 pt-2">
          {items.map((item, idx) => {
            const h1 = Math.max(4, Math.round((item.value / maxVal) * 172));
            const h2 =
              item.secondaryValue != null
                ? Math.max(4, Math.round((item.secondaryValue / maxVal) * 172))
                : null;
            return (
              <div
                key={`${item.label}-${idx}`}
                className="group relative flex flex-1 flex-col items-center"
              >
                {/* Value label above bar */}
                <div className="num mb-1 text-[10px] font-semibold text-slate-600">
                  {item.value >= 1000
                    ? `${(item.value / 1000).toFixed(1)}k`
                    : item.value}
                </div>

                {/* Bar pair */}
                <div className="flex items-end gap-1">
                  <div
                    className="w-6 rounded-t-md transition-all duration-300 group-hover:opacity-90 sm:w-8"
                    style={{
                      height: `${h1}px`,
                      background: `linear-gradient(180deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
                    }}
                    title={`${item.label}: ${item.formatted}`}
                  />
                  {h2 != null ? (
                    <div
                      className="w-5 rounded-t-md transition-all duration-300 group-hover:opacity-90 sm:w-6"
                      style={{
                        height: `${h2}px`,
                        background: `linear-gradient(180deg, ${secondaryColor} 0%, ${secondaryColor}cc 100%)`,
                      }}
                    />
                  ) : null}
                </div>

                {/* X-Axis Label */}
                <div className="mt-2 max-w-[84px] truncate text-center text-[10px] font-semibold text-slate-500">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-xs"
            style={{ backgroundColor: primaryColor }}
          />
          {primaryLabel}
        </span>
        {secondaryLabel ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-xs"
              style={{ backgroundColor: secondaryColor }}
            />
            {secondaryLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VisualDonutChart({
  centerLabel,
  centerValue,
  slices,
}: {
  centerLabel: string;
  centerValue: string;
  slices: {
    label: string;
    value: number;
    formatted: string;
    color: string;
  }[];
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <div className="grid items-center gap-4 sm:grid-cols-12">
      <div className="relative mx-auto flex h-44 w-44 items-center justify-center sm:col-span-5">
        <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="20"
          />
          {total > 0
            ? slices.map((slice) => {
                const val = Math.max(0, slice.value);
                const frac = val / total;
                const dash = frac * circumference;
                const offset = -accumulated * circumference;
                accumulated += frac;
                return (
                  <circle
                    key={slice.label}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth="20"
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeDashoffset={offset}
                  />
                );
              })
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {centerLabel}
          </span>
          <span className="num mt-0.5 text-sm font-semibold text-slate-900">
            {centerValue}
          </span>
        </div>
      </div>

      <div className="space-y-2 sm:col-span-7">
        {slices.map((slice) => {
          const pct =
            total > 0 ? Math.round((Math.max(0, slice.value) / total) * 1000) / 10 : 0;
          return (
            <div
              key={slice.label}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2.5 py-1.5 text-xs"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate font-semibold text-slate-700">
                  {slice.label}
                </span>
              </div>
              <div className="num shrink-0 text-right">
                <span className="font-semibold text-slate-900">{slice.formatted}</span>
                <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                  ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
