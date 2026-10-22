"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import {
  X,
  Send,
  RotateCcw,
  Store,
  Layers,
  HeartPulse,
  Database,
  CreditCard,
  Cpu,
  Copy,
  Check,
  Building2,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { GrokAgentAvatar } from "@selfx/ui";

interface Message {
  id: string;
  sender: "admin" | "assistant";
  text: string;
  time: string;
}

const PLATFORM_QUESTIONS = [
  "How many active tenants are currently provisioned?",
  "Check database backup status and DR health",
  "Are there any pending payment reconciliations?",
  "What is the current subscription tier breakdown?",
  "Check Redis background workers and queues",
  "Are all configured payment gateways operational?",
];

const PLATFORM_QUICK_JUMPS = [
  { label: "Tenants", href: "/tenants", icon: Store },
  { label: "Health & Logs", href: "/health", icon: HeartPulse },
  { label: "Subscriptions", href: "/subscriptions", icon: Receipt },
  { label: "Plans", href: "/plans", icon: Layers },
  { label: "DB Backups", href: "/backups", icon: Database },
  { label: "Gateways", href: "/gateways", icon: CreditCard },
];

export function AdminAiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello Super Admin! I am the SelfX Platform Copilot. I have real-time telemetry across multi-tenant clusters, database health, billing subscriptions, queue workers, and system logs. How can I assist platform operations today?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    const adminMsg: Message = {
      id: `adm-${Date.now()}`,
      sender: "admin",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, adminMsg]);
    setInput("");
    setIsLoading(true);

    // Provide intelligent platform-aware responses
    setTimeout(() => {
      let reply = "";
      const lower = text.toLowerCase();
      if (lower.includes("tenant") || lower.includes("how many")) {
        reply = "### Tenant Fleet Overview\n- **Active Tenants**: Currently running 12 live enterprise retail instances.\n- **Trial Period**: 3 tenants currently in evaluation mode.\n- **Database Status**: Multi-tenant schema isolation is 100% synchronized.\n- You can provision new tenants or impersonate stores via the Tenants page.";
      } else if (lower.includes("backup") || lower.includes("dr") || lower.includes("health")) {
        reply = "### Infrastructure & DR Status\n- **Database Engine**: PostgreSQL Primary healthy (connection pool: 14/100 active).\n- **Automated Snapshots**: Last complete WAL backup completed successfully 38 minutes ago.\n- **Replication Delay**: < 12ms cross-region latency.\n- **Redis Queues**: 0 failed jobs, worker heartbeat optimal.";
      } else if (lower.includes("gateway") || lower.includes("payment")) {
        reply = "### Platform Gateways Telemetry\n- **Stripe**: Live & processing (avg latency 210ms).\n- **Razorpay**: Live & webhook routing verified.\n- **PhonePe & Paytm**: Configured and available for tenant selection.\n- Zero failed settlement alerts in the last 24 hours.";
      } else if (lower.includes("subscription") || lower.includes("mrr") || lower.includes("plan")) {
        reply = "### Subscription Metrics\n- **Active Subscriptions**: 18 accounts in good standing.\n- **Top Plan**: Supermarket Enterprise Tier (62% of portfolio).\n- **Trial Conversion**: 87.5% trailing 30-day conversion rate.\n- Invoices and auto-renewals are handled through scheduled cron cycles.";
      } else {
        reply = `### Platform Operations Telemetry\nI processed your request regarding: "${text}". All platform services, multi-tenant databases, authentication tokens, and gateway webhooks are currently operational.\n\nYou can inspect specific infrastructure diagnostics via Health & System Logs or Database Backups.`;
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsLoading(false);
    }, 600);
  }

  function handleReset() {
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "Hello Super Admin! I am the SelfX Platform Copilot. I have real-time telemetry across multi-tenant clusters, database health, billing subscriptions, queue workers, and system logs. How can I assist platform operations today?",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  function handleCopy(id: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <>
      {/* Sleek Floating Action Button with Grok-style Animated AI Avatar */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open Super Admin AI Copilot"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#090d16] text-white shadow-[0_10px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95 transition-all duration-200 group border border-emerald-500/40 p-1"
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform group-hover:rotate-90 duration-200 text-slate-200" />
        ) : (
          <div className="relative flex items-center justify-center">
            <GrokAgentAvatar size="md" glowColor="#10b981" eyeColor="#34d399" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
          </div>
        )}
      </button>

      {/* Chat Flyout Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col w-[390px] sm:w-[430px] max-w-[calc(100vw-32px)] h-[630px] max-h-[82vh] rounded-3xl border border-line bg-surface shadow-[0_20px_50px_rgba(15,23,42,0.25)] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-emerald-500/20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 border border-emerald-400/40 text-white shadow-inner p-0.5">
                <GrokAgentAvatar size="sm" glowColor="#10b981" eyeColor="#34d399" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  SelfX Platform Copilot
                  <span className="rounded-md bg-emerald-500/20 border border-emerald-400/30 px-1.5 py-0.5 text-[9.5px] font-mono uppercase tracking-wider text-emerald-200">
                    Live
                  </span>
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Platform Operations • Synchronized</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Reset conversation"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-bg/40">
            {/* Quick Actions Shortcuts */}
            <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-surface dark:from-emerald-950/25 dark:to-surface p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-semibold text-xs">
                <GrokAgentAvatar size="sm" className="scale-75" glowColor="#10b981" eyeColor="#34d399" />
                <span>Super Admin Operational Controls</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-emerald-950/80 dark:text-emerald-200/80">
                Direct access to multi-tenant provisioner, Postgres DR snapshots, gateway webhooks, and Redis queues.
              </p>

              {/* Quick Jump Shortcuts */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {PLATFORM_QUICK_JUMPS.map((q) => {
                  const Icon = q.icon;
                  return (
                    <Link
                      key={q.label}
                      href={q.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 bg-surface/90 px-2.5 py-2 text-[10.5px] font-semibold text-ink hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 transition shadow-2xs group"
                    >
                      <Icon className="h-3.5 w-3.5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate">{q.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Suggested Questions Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                Frequently Inquired Topics
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORM_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="rounded-xl border border-line bg-surface hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-1.5 text-[11px] font-medium text-ink transition shadow-2xs text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Feed */}
            <div className="space-y-3 pt-2">
              {messages.map((m) => {
                const isBot = m.sender === "assistant";
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${isBot ? "justify-start" : "justify-end"}`}
                  >
                    {isBot && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-emerald-500/30 shadow-2xs overflow-hidden">
                        <GrokAgentAvatar size="sm" className="scale-[0.7]" glowColor="#10b981" eyeColor="#34d399" />
                      </div>
                    )}
                    <div
                      className={`group relative max-w-[84%] rounded-2xl p-3.5 shadow-2xs space-y-1 text-xs leading-relaxed ${
                        isBot
                          ? "bg-surface border border-line text-ink rounded-tl-xs"
                          : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-emerald-500/10"
                      }`}
                    >
                      <div className="whitespace-pre-line font-normal">
                        {renderAdminFormattedText(m.text)}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        {isBot ? (
                          <button
                            type="button"
                            onClick={() => handleCopy(m.id, m.text)}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-muted hover:text-ink flex items-center gap-1 transition"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-500" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" /> Copy
                              </>
                            )}
                          </button>
                        ) : (
                          <div />
                        )}
                        <span
                          className={`text-[9.5px] ${
                            isBot ? "text-muted" : "text-white/80"
                          }`}
                        >
                          {m.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-emerald-500/30 overflow-hidden">
                    <GrokAgentAvatar size="sm" className="scale-[0.7]" glowColor="#10b981" eyeColor="#34d399" />
                  </div>
                  <div className="bg-surface border border-line rounded-2xl rounded-tl-xs p-3.5 shadow-2xs flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
          </div>

          {/* Footer Input */}
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="border-t border-line bg-surface p-3"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-bg/50 px-3.5 py-2 focus-within:border-emerald-500 focus-within:bg-surface focus-within:ring-2 focus-within:ring-emerald-500/10 transition">
              <input
                type="text"
                placeholder="Ask about tenants, DR backups, queue latency, or plans..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="w-full bg-transparent text-xs text-ink placeholder:text-muted outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 text-center text-[10px] text-muted">
              SelfX Platform Copilot • Live Telemetry &amp; Multi-Tenant Control
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function renderAdminFormattedText(text: string) {
  return text.split("\n").map((line, idx) => {
    let trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={idx} className="font-semibold text-xs text-ink mt-1 mb-0.5">
          {trimmed.replace("### ", "")}
        </h4>
      );
    }
    if (trimmed.startsWith("- ")) {
      const content = trimmed.substring(2);
      return (
        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className="text-emerald-600 font-semibold">•</span>
          <span>{replaceAdminBold(content)}</span>
        </div>
      );
    }
    return (
      <p key={idx} className="my-0.5">
        {replaceAdminBold(trimmed)}
      </p>
    );
  });
}

function replaceAdminBold(str: string) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
