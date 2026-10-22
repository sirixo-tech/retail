"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { 
  X, 
  Send, 
  RotateCcw, 
  Monitor, 
  FileText, 
  ArrowLeftRight,
  TrendingUp,
  AlertTriangle,
  Printer,
  ChevronRight,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";
import { GrokAgentAvatar } from "@selfx/ui";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  time: string;
}

const POPULAR_QUESTIONS = [
  "How much did we sell today?",
  "Which products are low on stock?",
  "Show me payment method breakdown",
  "How do I pair a new POS terminal?",
  "How do weighing scales work in SelfX?",
  "How do I do an inter-branch stock transfer?",
];

const QUICK_JUMPS = [
  { label: "Today's Sales", href: "/reports", icon: TrendingUp },
  { label: "Low Stock", href: "/inventory", icon: AlertTriangle },
  { label: "Pair POS", href: "/pos-terminals", icon: Monitor },
  { label: "GST Audit Pack", href: "/reports", icon: FileText },
  { label: "Branch Transfer", href: "/inventory", icon: ArrowLeftRight },
  { label: "Printers & Scales", href: "/printer-setup", icon: Printer },
];

function token() {
  if (typeof document === "undefined") return "";
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((row) => row.startsWith("XSRF-TOKEN="))
      ?.slice("XSRF-TOKEN=".length) ?? "",
  );
}

/**
 * Super professional Enterprise AI Intelligence Logo / Icon
 * Sleek geometric neural matrix with zero sparkles.
 */
function AiIntelligenceLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <path
        d="M12 4.5V19.5M4.5 12H19.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <rect
        x="8.5"
        y="8.5"
        width="7"
        height="7"
        rx="2"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="1.75" fill="currentColor" />
    </svg>
  );
}

export function TenantAiAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your SelfX Retail Intelligence assistant. I have direct access to your real-time store metrics, low-stock inventory, POS terminals, and operational workflows. How can I assist you today?",
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

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/ai/assistant", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": token(),
        },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.sender, content: m.text })),
        }),
      });

      const res = await response.json();
      const replyText =
        res?.data?.reply ?? res?.reply ?? "I received your query but couldn't generate an answer. Please try again.";

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "assistant",
          text: "Temporary connection error. Please verify network connectivity or try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "Hello! I am your SelfX Retail Intelligence assistant. I have direct access to your real-time store metrics, low-stock inventory, POS terminals, and operational workflows. How can I assist you today?",
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
        aria-label="Open SelfX AI Assistant"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0b0f19] text-white shadow-[0_10px_35px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_40px_rgba(56,189,248,0.35)] hover:scale-105 active:scale-95 transition-all duration-200 group border border-sky-500/40 p-1"
      >
        {isOpen ? (
          <X className="h-6 w-6 transition-transform group-hover:rotate-90 duration-200 text-slate-200" />
        ) : (
          <div className="relative flex items-center justify-center">
            <GrokAgentAvatar size="md" glowColor="#38bdf8" eyeColor="#38bdf8" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
            </span>
          </div>
        )}
      </button>

      {/* Chat Flyout Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col w-[390px] sm:w-[430px] max-w-[calc(100vw-32px)] h-[630px] max-h-[82vh] rounded-3xl border border-line bg-surface shadow-[0_20px_50px_rgba(15,23,42,0.22)] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sky-500/20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 border border-sky-400/30 text-white shadow-inner p-0.5">
                <GrokAgentAvatar size="sm" glowColor="#38bdf8" eyeColor="#38bdf8" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  SelfX Intelligence Core
                  <span className="rounded-md bg-sky-500/20 border border-sky-400/30 px-1.5 py-0.5 text-[9.5px] font-mono uppercase tracking-wider text-sky-200">
                    RAG v2.0
                  </span>
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Retail Operations • Connected</span>
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
            {/* Enterprise Intelligence Capabilities Card */}
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-surface dark:from-amber-950/25 dark:to-surface p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold text-xs">
                <AiIntelligenceLogo className="h-4 w-4 text-orange-600 shrink-0" />
                <span>Real-Time Operational Retail Intelligence</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-amber-950/80 dark:text-amber-200/80">
                Instant analytics for today&apos;s realized gross sales, tender split, low-stock reorder thresholds, POS pairing keys, and GST compliance.
              </p>

              {/* Quick Jump Shortcuts */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {QUICK_JUMPS.map((q) => {
                  const Icon = q.icon;
                  return (
                    <Link
                      key={q.label}
                      href={q.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-surface/90 px-2.5 py-2 text-[10.5px] font-semibold text-ink hover:bg-amber-100/60 dark:hover:bg-amber-950/50 transition shadow-2xs group"
                    >
                      <Icon className="h-3.5 w-3.5 text-orange-600 shrink-0 group-hover:scale-110 transition-transform" />
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
                {POPULAR_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="rounded-xl border border-line bg-surface hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 px-3 py-1.5 text-[11px] font-medium text-ink transition shadow-2xs text-left"
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
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-sky-500/30 shadow-2xs overflow-hidden">
                        <GrokAgentAvatar size="sm" className="scale-[0.7]" glowColor="#38bdf8" eyeColor="#38bdf8" />
                      </div>
                    )}
                    <div
                      className={`group relative max-w-[84%] rounded-2xl p-3.5 shadow-2xs space-y-1 text-xs leading-relaxed ${
                        isBot
                          ? "bg-surface border border-line text-ink rounded-tl-xs"
                          : "bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-tr-xs shadow-orange-500/10"
                      }`}
                    >
                      <div className="whitespace-pre-line font-normal">
                        {renderFormattedText(m.text)}
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
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-sky-500/30 overflow-hidden">
                    <GrokAgentAvatar size="sm" className="scale-[0.7]" glowColor="#38bdf8" eyeColor="#38bdf8" />
                  </div>
                  <div className="bg-surface border border-line rounded-2xl rounded-tl-xs p-3.5 shadow-2xs flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" />
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
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-bg/50 px-3.5 py-2 focus-within:border-orange-500 focus-within:bg-surface focus-within:ring-2 focus-within:ring-orange-500/10 transition">
              <input
                type="text"
                placeholder="Ask about live sales, stock, POS terminals, or GST..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="w-full bg-transparent text-xs text-ink placeholder:text-muted outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white transition hover:bg-orange-700 disabled:opacity-40 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 text-center text-[10px] text-muted">
              SelfX Retail Enterprise Intelligence Core • Powered by Deterministic Store Models
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function renderFormattedText(text: string) {
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
          <span className="text-orange-600 font-semibold">•</span>
          <span>{replaceBold(content)}</span>
        </div>
      );
    }
    return (
      <p key={idx} className="my-0.5">
        {replaceBold(trimmed)}
      </p>
    );
  });
}

function replaceBold(str: string) {
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
