"use client";

import { Printer, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export type ReceiptLine = {
  id?: string;
  name: string;
  qty: number | string;
  unit_price_paise?: number;
  total_paise?: number;
  line_total_paise?: number;
};

export type ReceiptData = {
  number: string;
  store: string;
  city?: string;
  created_at: string;
  subtotal_paise?: number;
  discount_paise?: number;
  cgst_paise?: number;
  sgst_paise?: number;
  igst_paise?: number;
  total_paise: number;
  tender_paise?: number;
  change_paise?: number;
  payment_method?: string;
  order_type?: string;
  lines: ReceiptLine[];
  footer?: string;
};

export function computeTokenNumber(orderNumber?: string): string {
  if (!orderNumber) return "1";
  const digits = orderNumber.replace(/\D+/g, "");
  if (!digits) return "1";
  const num = parseInt(digits.slice(-4), 10);
  return isNaN(num) || num === 0 ? "1" : String(num);
}

export function printThermalReceipt(receipt: ReceiptData) {
  const popup = window.open("", "_blank", "width=380,height=680");
  if (!popup) return;

  const tokenNum = computeTokenNumber(receipt.number);
  const formattedDate = new Date(receipt.created_at).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const linesHtml = receipt.lines
    .map((line) => {
      const lineTotal = line.line_total_paise ?? line.total_paise ?? 0;
      const qtyNum = Number(line.qty) || 1;
      const unitPrice =
        line.unit_price_paise ?? (qtyNum > 0 ? Math.round(lineTotal / qtyNum) : lineTotal);

      return `
        <tr>
          <td style="padding: 4px 0; vertical-align: top;">
            <div style="font-weight: 600;">${line.qty}x ${line.name}</div>
            <div style="font-size: 10px; color: #64748b;">@ ${(unitPrice / 100).toFixed(2)} each</div>
          </td>
          <td style="text-align: right; vertical-align: top; font-variant-numeric: tabular-nums; font-weight: 600; padding: 4px 0;">
            ${(lineTotal / 100).toFixed(2)}
          </td>
        </tr>
      `;
    })
    .join("");

  const taxRows: string[] = [];
  if ((receipt.cgst_paise ?? 0) > 0) {
    taxRows.push(`
      <div style="display:flex; justify-content:space-between; margin:2px 0;">
        <span>CGST (2.5%)</span>
        <span>${((receipt.cgst_paise ?? 0) / 100).toFixed(2)}</span>
      </div>
    `);
  }
  if ((receipt.sgst_paise ?? 0) > 0) {
    taxRows.push(`
      <div style="display:flex; justify-content:space-between; margin:2px 0;">
        <span>SGST (2.5%)</span>
        <span>${((receipt.sgst_paise ?? 0) / 100).toFixed(2)}</span>
      </div>
    `);
  }
  if ((receipt.discount_paise ?? 0) > 0) {
    taxRows.push(`
      <div style="display:flex; justify-content:space-between; margin:2px 0; color:#16a34a;">
        <span>Discount</span>
        <span>-${((receipt.discount_paise ?? 0) / 100).toFixed(2)}</span>
      </div>
    `);
  }

  popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${receipt.number}</title>
  <style>
    @page { margin: 4mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      width: 76mm;
      margin: 0 auto;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.35;
    }
    .center { text-align: center; }
    .muted { color: #64748b; font-size: 11px; }
    .dashed { border-top: 1px dashed #94a3b8; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    .bold { font-weight: 600; }
  </style>
</head>
<body>
  <div class="center">
    <div style="font-size: 15px; font-weight: 600; letter-spacing: 0.5px;">${receipt.store}</div>
    <div class="muted" style="text-transform: uppercase;">${receipt.city || "BANGALORE"}</div>
    <div style="font-size: 13px; font-weight: 600; margin: 6px 0 2px;">TOKEN #${tokenNum}</div>
    <div class="muted">Bill No: ${receipt.number}</div>
    <div class="muted">${receipt.order_type || "Dine in"}</div>
    <div class="muted">Date: ${formattedDate}</div>
  </div>
  <div class="dashed"></div>
  <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 11px;">
    <span>Item</span>
    <span>Amount</span>
  </div>
  <table>${linesHtml}</table>
  <div class="dashed"></div>
  <div style="font-size: 11.5px; color: #475569;">
    <div style="display:flex; justify-content:space-between; margin:2px 0;">
      <span>Subtotal</span>
      <span>${((receipt.subtotal_paise ?? receipt.total_paise) / 100).toFixed(2)}</span>
    </div>
    ${taxRows.join("")}
  </div>
  <div class="dashed"></div>
  <div style="display:flex; justify-content:space-between; font-size: 14px; font-weight: 600;">
    <span>TOTAL</span>
    <span>${(receipt.total_paise / 100).toFixed(2)}</span>
  </div>
  <div class="center" style="margin-top: 8px; font-size: 11px;">
    <div class="bold">Paid</div>
    <div class="muted">Method: ${receipt.payment_method || "Cash"}</div>
    <div class="muted" style="font-size: 10px; margin-top: 10px; letter-spacing: 0.5px;">
      ${receipt.footer || "THANK YOU FOR YOUR ORDER!"}
    </div>
  </div>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`);
  popup.document.close();
}

export function ReceiptModal({
  isOpen,
  onClose,
  data,
  orderType = "Dine in",
  loading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
  orderType?: string;
  loading?: boolean;
}) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !data) {
      setQrUrl("");
      return;
    }
    let isCancelled = false;
    QRCode.toDataURL(data.number, {
      width: 140,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!isCancelled) setQrUrl(url);
      })
      .catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [isOpen, data]);

  if (!isOpen) return null;

  const tokenNum = computeTokenNumber(data?.number);

  const formattedDate = data?.created_at
    ? new Date(data.created_at).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="flex w-full max-w-[340px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl max-h-[92vh]">
        {/* Header matching Image 3 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
          <h3 className="text-[14px] font-semibold text-slate-800">
            Token #{tokenNum}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg bg-[#fef2f2] text-[#ef4444] transition hover:bg-[#fee2e2]"
            aria-label="Close receipt"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Receipt Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-xs font-semibold text-slate-400">
            <span className="mb-2 block">Loading bill receipt...</span>
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 text-center font-sans text-slate-700">
            {/* Store Name & Location */}
            <h4 className="text-[15px] font-semibold tracking-wide text-slate-900">
              {data.store}
            </h4>
            <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
              {data.city || "BANGALORE"}
            </p>

            {/* Token & Metadata */}
            <div className="my-2.5 space-y-0.5">
              <span className="inline-block text-[13px] font-semibold tracking-wider text-slate-900">
                TOKEN #{tokenNum}
              </span>
              <p className="text-[11px] text-slate-500">Bill No: {data.number}</p>
              <p className="text-[11px] text-slate-500 capitalize">{data.order_type || orderType}</p>
              <p className="text-[11px] text-slate-500">Date: {formattedDate}</p>
            </div>

            {/* Dashed line */}
            <div className="my-2.5 border-t border-dashed border-slate-300" />

            {/* Items Header */}
            <div className="flex justify-between py-1 text-[11px] font-semibold text-slate-800">
              <span>Item</span>
              <span>Amount</span>
            </div>

            {/* Items Lines */}
            <div className="space-y-2 py-1 text-left text-[12px]">
              {data.lines.map((line, idx) => {
                const lineTotal = line.line_total_paise ?? line.total_paise ?? 0;
                const qtyNum = Number(line.qty) || 1;
                const unitPrice =
                  line.unit_price_paise ??
                  (qtyNum > 0 ? Math.round(lineTotal / qtyNum) : lineTotal);

                return (
                  <div key={line.id || idx}>
                    <div className="flex justify-between font-medium text-slate-800">
                      <span>
                        {line.qty}x {line.name}
                      </span>
                      <span className="num font-semibold">
                        {(lineTotal / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      @ {(unitPrice / 100).toFixed(2)} each
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dashed line */}
            <div className="my-2.5 border-t border-dashed border-slate-300" />

            {/* Totals Breakdown */}
            <div className="space-y-1 text-[11.5px] text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="num font-medium">
                  {((data.subtotal_paise ?? data.total_paise) / 100).toFixed(2)}
                </span>
              </div>
              {(data.cgst_paise ?? 0) > 0 ? (
                <div className="flex justify-between">
                  <span>CGST (2.5%)</span>
                  <span className="num font-medium">
                    {((data.cgst_paise ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
              ) : null}
              {(data.sgst_paise ?? 0) > 0 ? (
                <div className="flex justify-between">
                  <span>SGST (2.5%)</span>
                  <span className="num font-medium">
                    {((data.sgst_paise ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
              ) : null}
              {(data.discount_paise ?? 0) > 0 ? (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="num font-medium">
                    -{((data.discount_paise ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Grand Total */}
            <div className="my-2.5 flex justify-between border-t border-dashed border-slate-300 pt-2 text-[14px] font-semibold text-slate-900">
              <span>TOTAL</span>
              <span className="num font-semibold">
                {(data.total_paise / 100).toFixed(2)}
              </span>
            </div>

            {/* Payment Info */}
            <div className="mt-2 text-center text-[11px] text-slate-600">
              <p className="font-semibold text-slate-800">Paid</p>
              <p className="text-slate-500 capitalize">
                Method: {(data.payment_method || "Cash").replaceAll("_", " ")}
              </p>
            </div>

            {/* Dynamic QR Code */}
            {qrUrl ? (
              <div className="my-3 flex justify-center">
                <img
                  src={qrUrl}
                  alt={`QR code for ${data.number}`}
                  className="size-28 rounded-md border border-slate-100 p-0.5"
                />
              </div>
            ) : null}

            {/* Footer */}
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              {data.footer || "THANK YOU FOR YOUR ORDER!"}
            </p>
          </div>
        ) : null}

        {/* Modal Actions matching Image 3 */}
        <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-3.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-[12.5px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              if (data) printThermalReceipt(data);
              else window.print();
            }}
            className="flex-1 rounded-xl bg-slate-900 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-slate-800"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
