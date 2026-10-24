"use client";

import { useEffect, useRef } from "react";

export interface CommandPlan {
  format: "escpos" | "html" | "pdf";
  data: string; // Base64 encoded
  metadata?: Record<string, unknown>;
}

export interface PrintJobItem {
  id: string;
  kind: string;
  sale_id: string | null;
  command_plan: CommandPlan | null;
  cut: string;
  drawer: boolean;
  status: string;
  purpose: string;
  created_at: string;
}

export type TransportMode = "agent" | "browser_raw" | "browser_dialog";

const AGENT_URL = "http://127.0.0.1:27182";
export const DEVICE_TOKEN_KEY = "selfx_device_token";

/**
 * Check if the native local Print Agent is running and healthy.
 */
export async function checkAgentStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const res = await fetch(`${AGENT_URL}/status`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === "online";
  } catch {
    return false;
  }
}

/**
 * 3-Tier Progressive Fallback Printing Executor:
 * 1. Print Agent (127.0.0.1:27182) ->
 * 2. WebUSB browser raw ->
 * 3. Browser Print Dialog (window.print)
 */
export type PrintExecutionResult = {
  success: boolean;
  transport: TransportMode;
  error?: string;
  fallbackReason?: string;
};

export async function executePrintJob(
  job: PrintJobItem,
  options: {
    deviceToken?: string;
    preferredTransport?: TransportMode;
  } = {},
): Promise<PrintExecutionResult> {
  const token = options.deviceToken || (typeof window !== "undefined" ? window.localStorage.getItem(DEVICE_TOKEN_KEY) || "" : "");
  let agentFailed = false;

  // Tier 1: Print Agent Transport (127.0.0.1:27182/print)
  if (options.preferredTransport !== "browser_dialog") {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const payload: Record<string, unknown> = {
        job_id: job.id,
        command_plan: job.command_plan,
      };

      const agentRes = await fetch(`${AGENT_URL}/print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Token": token,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (agentRes.ok) {
        return { success: true, transport: "agent" };
      }
      agentFailed = true;
    } catch {
      agentFailed = true;
    }
  }

  // Tier 2: WebUSB Browser Raw (if supported and device available)
  if (
    typeof navigator !== "undefined" &&
    "usb" in navigator &&
    job.command_plan?.format === "escpos" &&
    job.command_plan.data
  ) {
    try {
      // Attempt sending to previously granted paired USB device
      const devices = await (navigator as any).usb.getDevices();
      if (devices.length > 0) {
        const device = devices[0];
        await device.open();
        if (device.configuration === null) await device.selectConfiguration(1);
        await device.claimInterface(0);

        // Decode base64 bytes
        const binaryString = atob(job.command_plan.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Find OUT endpoint (usually endpoint 1 or 2)
        const endpoint =
          device.configuration?.interfaces?.[0]?.alternate?.endpoints?.find(
            (ep: any) => ep.direction === "out",
          )?.endpointNumber || 1;

        await device.transferOut(endpoint, bytes);
        return { success: true, transport: "browser_raw" };
      }
    } catch {
      // Fall through to Tier 3
    }
  }

  // Tier 3: Browser Dialog Fallback (window.print)
  try {
    let htmlContent = "";
    if (job.command_plan?.format === "html" && job.command_plan.data) {
      try {
        htmlContent = atob(job.command_plan.data);
      } catch {
        htmlContent = job.command_plan.data;
      }
    } else {
      htmlContent = `
        <div style="font-family: monospace; padding: 12px; text-align: center;">
          <h3>Receipt Job #${job.id.slice(0, 8)}</h3>
          <p>Document Kind: ${job.kind}</p>
          <hr style="border: 1px dashed #666;" />
          <p>Printed via Browser Fallback Dialog</p>
        </div>
      `;
    }

    if (typeof window !== "undefined") {
      const popup = window.open("", "_blank", "width=420,height=680");
      if (popup) {
        popup.document.write(htmlContent);
        popup.document.close();
        popup.focus();
        popup.print();
      }
    }

    return {
      success: true,
      transport: "browser_dialog",
      fallbackReason: agentFailed ? "Print Agent unavailable. Use browser print dialog" : undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      transport: "browser_dialog",
      error: err?.message || "Browser print failed",
      fallbackReason: agentFailed ? "Print Agent unavailable. Use browser print dialog" : undefined,
    };
  }
}

/**
 * Send acknowledgment back to Laravel backend.
 */
export async function acknowledgePrintJob(
  jobId: string,
  status: "printed" | "failed",
  failureReason?: string,
  csrfToken?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`/api/v1/print-jobs/${jobId}/ack`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
      },
      body: JSON.stringify({
        status,
        failure_reason: failureReason,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Hook for POS to continuously poll queued print jobs every 3 seconds.
 */
export function usePrintJobPoller({
  storeId,
  enabled = true,
  intervalMs = 3000,
  csrfToken = "",
  onJobStarted,
  onJobProcessed,
  onFallbackPrompt,
}: {
  storeId: string | null;
  enabled?: boolean;
  intervalMs?: number;
  csrfToken?: string;
  onJobStarted?: (job: PrintJobItem) => void;
  onJobProcessed?: (job: PrintJobItem, transport: TransportMode) => void;
  onFallbackPrompt?: (job: PrintJobItem, reason: string) => void;
}) {
  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !storeId) return;

    const timer = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const res = await fetch(`/api/v1/print-jobs?store_id=${storeId}&status=queued&limit=3`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) return;
        const body = (await res.json()) as { data?: PrintJobItem[] };
        const jobs = body.data || [];

        for (const job of jobs) {
          if (onJobStarted) {
            onJobStarted(job);
          }
          const result = await executePrintJob(job);
          await acknowledgePrintJob(
            job.id,
            result.success ? "printed" : "failed",
            result.error,
            csrfToken,
          );
          if (result.fallbackReason && onFallbackPrompt) {
            onFallbackPrompt(job, result.fallbackReason);
          }
          if (onJobProcessed) {
            onJobProcessed(job, result.transport);
          }
        }
      } catch {
        // Silently handle transient network errors
      } finally {
        isPollingRef.current = false;
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [storeId, enabled, intervalMs, csrfToken, onJobStarted, onJobProcessed, onFallbackPrompt]);
}
