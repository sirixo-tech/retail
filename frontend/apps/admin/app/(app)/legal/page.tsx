"use client";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Copy,
  FileCheck,
  FileText,
  Landmark,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { api, warmCsrf } from "../../lib/api";

type LegalEntityData = {
  legal_name: string | null;
  trade_name: string | null;
  cin: string | null;
  pan: string | null;
  gstin: string | null;
  sac: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  bank_upi_id: string | null;
  signatory_name: string | null;
  signatory_designation: string | null;
  invoice_prefix: string | null;
  specimen: boolean;
};

export default function LegalEntityPage() {
  const [entity, setEntity] = useState<LegalEntityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cin, setCin] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [sac, setSac] = useState("");
  const [address, setAddress] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankUpiId, setBankUpiId] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryDesignation, setSignatoryDesignation] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("SFX-");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await warmCsrf();
      try {
        const body = await api<{ data: LegalEntityData }>("/api/v1/platform/legal-entity");
        const data = body.data;
        setEntity(data);
        setLegalName(data.legal_name ?? "SelfX Retail Technologies Private Limited");
        setTradeName(data.trade_name ?? "SelfX Retail");
        setCin(data.cin ?? "U72900TG2026PTC198765");
        setPan(data.pan ?? "AABCU9603R");
        setGstin(data.gstin ?? "");
        setSac(data.sac ?? "998313");
        setAddress(data.address ?? "Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India");
        setBankName(data.bank_name ?? "HDFC Bank Ltd");
        setBankAccountName(data.bank_account_name ?? "SelfX Retail Technologies Pvt Ltd");
        setBankAccountNumber(data.bank_account_number ?? "50200087654321");
        setBankIfsc(data.bank_ifsc ?? "HDFC0000240");
        setBankBranch(data.bank_branch ?? "Madhapur Branch, Hyderabad");
        setBankUpiId(data.bank_upi_id ?? "selfxretail@hdfcbank");
        setSignatoryName(data.signatory_name ?? "");
        setSignatoryDesignation(data.signatory_designation ?? "Director & Head of Finance");
        setInvoicePrefix(data.invoice_prefix ?? "SFX-");
      } catch (err) {
        console.error("Failed to load legal entity:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await warmCsrf();
      const body = await api<{ data: LegalEntityData }>("/api/v1/platform/legal-entity", {
        method: "PUT",
        body: JSON.stringify({
          legal_name: legalName,
          trade_name: tradeName,
          cin,
          pan,
          gstin,
          sac,
          address,
          bank_name: bankName,
          bank_account_name: bankAccountName,
          bank_account_number: bankAccountNumber,
          bank_ifsc: bankIfsc,
          bank_branch: bankBranch,
          bank_upi_id: bankUpiId,
          signatory_name: signatoryName,
          signatory_designation: signatoryDesignation,
          invoice_prefix: invoicePrefix,
        }),
      });
      setEntity(body.data);
      setMessage({
        type: "success",
        text: body.data.specimen
          ? "Legal entity updated. Tax invoices will remain marked SPECIMEN until a valid 15-digit GSTIN is stored."
          : "Legal entity updated. All newly issued tenant subscription invoices will feature this corporate GSTIN and banking details.",
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.error?.message ?? err?.message ?? "Failed to save corporate legal entity details.",
      });
    } finally {
      setSaving(false);
    }
  }

  function copyText(key: string, val: string) {
    void navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Legal Entity &amp; Corporate Compliance
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure corporate statutory identifiers, GSTIN, PAN, bank remittance accounts, and authorized signatory for platform tax invoices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {entity?.specimen === false ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              GST Compliant Invoicing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Specimen Watermark Active
            </span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {message ? (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button type="button" onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form: 2 cols */}
          <div className="space-y-6 lg:col-span-2">
            {/* 1. Corporate Identity */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Corporate Identity</h2>
                  <p className="text-[11px] text-slate-500">
                    Official registered company name, brand name, and corporate registration certificates.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Registered Company Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. SelfX Retail Technologies Private Limited"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Must match Certificate of Incorporation (MCA) verbatim.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Trade / Operating Name
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="e.g. SelfX Retail"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Corporate Identification Number (CIN)
                  </label>
                  <input
                    type="text"
                    value={cin}
                    onChange={(e) => setCin(e.target.value.toUpperCase())}
                    placeholder="e.g. U72900TG2026PTC198765"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs uppercase text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Company PAN (10 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="e.g. AABCU9603R"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs uppercase text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Services Accounting Code (SAC)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={sac}
                    onChange={(e) => setSac(e.target.value)}
                    placeholder="e.g. 998313"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    Standard SaaS code is 998313 (IT Software Hosting).
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Tax & Statutory Registration */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Tax &amp; Statutory GSTIN</h2>
                  <p className="text-[11px] text-slate-500">
                    Goods &amp; Services Tax Identification Number and registered office location.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Principal GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 36AABCU9603R1ZM"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-mono uppercase text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    An empty GSTIN will keep generated subscription invoice PDFs marked with the &quot;SPECIMEN&quot; watermark.
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Registered Corporate Address
                  </label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Registered office address, Building, Street, City, State, PIN..."
                    className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 3. Bank Remittance & Wire Accounts */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Landmark className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Bank Remittance Accounts</h2>
                  <p className="text-[11px] text-slate-500">
                    Direct wire transfer details printed on tenant invoices for NEFT / RTGS / IMPS settlements.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Beneficiary Account Name
                  </label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="e.g. SelfX Retail Technologies Pvt Ltd"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="e.g. 50200087654321"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0000240"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-mono uppercase text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Branch Name &amp; City
                  </label>
                  <input
                    type="text"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    placeholder="e.g. Madhapur Branch, Hyderabad"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Primary UPI VPA
                  </label>
                  <input
                    type="text"
                    value={bankUpiId}
                    onChange={(e) => setBankUpiId(e.target.value)}
                    placeholder="e.g. selfxretail@hdfcbank"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Invoice Authorization & Compliance */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Invoice Compliance &amp; Signatory</h2>
                  <p className="text-[11px] text-slate-500">
                    Authorized signatory details and prefix configuration for official SaaS invoices.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Authorized Signatory
                  </label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. Surya Varma"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={signatoryDesignation}
                    onChange={(e) => setSignatoryDesignation(e.target.value)}
                    placeholder="e.g. Director & Head of Finance"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Invoice Series Prefix
                  </label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="e.g. SFX-"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Saving Changes..." : "Save Legal Entity"}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Tax Invoice Preview & Quick Summary */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    Tax Invoice Preview
                  </h3>
                </div>
                {gstin ? (
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                    Official
                  </span>
                ) : (
                  <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                    Specimen
                  </span>
                )}
              </div>

              {/* Rendered Invoice Card Simulation */}
              <div className="relative mt-4 rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 font-mono text-[11px] text-slate-700 space-y-2">
                {!gstin ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
                    <span className="rotate-[-25deg] text-3xl font-semibold uppercase tracking-widest text-slate-900">
                      SPECIMEN
                    </span>
                  </div>
                ) : null}

                <div className="border-b border-slate-200 pb-2">
                  <p className="font-semibold text-slate-900 text-xs">{legalName || "SelfX Retail"}</p>
                  {tradeName ? <p className="text-[10px] text-slate-500 font-sans">Trading as: {tradeName}</p> : null}
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{address || "Address not configured"}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                  <div>
                    <span className="text-slate-400 block font-sans">GSTIN:</span>
                    <span className="font-semibold text-slate-800">{gstin || "NOT CONFIGURED"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">PAN:</span>
                    <span className="font-semibold text-slate-800">{pan || "NOT CONFIGURED"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">CIN:</span>
                    <span className="font-semibold text-slate-800 truncate block">{cin || "NOT CONFIGURED"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-sans">SAC Code:</span>
                    <span className="font-semibold text-slate-800">{sac || "998313"}</span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 text-[10px]">
                  <span className="text-slate-400 block font-sans">Remittance Bank:</span>
                  <p className="font-semibold text-slate-800">{bankName || "HDFC Bank Ltd"}</p>
                  <p className="text-slate-600">A/C: {bankAccountNumber || "—"}</p>
                  <p className="text-slate-600">IFSC: {bankIfsc || "—"}</p>
                  {bankUpiId ? <p className="text-slate-600">UPI: {bankUpiId}</p> : null}
                </div>

                <div className="border-t border-slate-200 pt-2 text-[10px]">
                  <span className="text-slate-400 block font-sans">Authorized Signatory:</span>
                  <p className="font-semibold text-slate-800">{signatoryName || "Authorized Signatory"}</p>
                  <p className="text-slate-500 text-[9px]">{signatoryDesignation || "Director"}</p>
                </div>
              </div>
            </div>

            {/* Quick Copy Verification Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Quick Copy Information
              </h3>
              <p className="text-[11px] text-slate-500">
                Copy statutory identifiers for tenant vendor onboarding forms or audit verification.
              </p>

              <div className="space-y-2 pt-1">
                {[
                  { label: "GSTIN", value: gstin },
                  { label: "PAN", value: pan },
                  { label: "CIN", value: cin },
                  { label: "IFSC", value: bankIfsc },
                  { label: "Account No.", value: bankAccountNumber },
                  { label: "UPI ID", value: bankUpiId },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">{item.label}</span>
                      <span className="font-mono text-xs font-semibold text-slate-800">
                        {item.value || "—"}
                      </span>
                    </div>
                    {item.value ? (
                      <button
                        type="button"
                        onClick={() => copyText(item.label, item.value!)}
                        className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                        title={`Copy ${item.label}`}
                      >
                        {copiedKey === item.label ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
