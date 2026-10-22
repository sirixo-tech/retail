"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { 
  X, 
  Send, 
  RotateCcw, 
  Store, 
  Plus, 
  Check, 
  ShoppingBag,
  ArrowRight
} from "lucide-react";
import { GrokAgentAvatar } from "@selfx/ui";

interface SuggestedProduct {
  id: string;
  name: string;
  price: string;
}

interface Message {
  id: string;
  sender: "customer" | "assistant";
  text: string;
  time: string;
  suggestedProducts?: SuggestedProduct[];
}

const STOREFRONT_QUESTIONS = [
  "What do you recommend?",
  "What are your delivery hours?",
  "How do I place an order online?",
  "Are there any offers or discounts?",
  "Where is your store located?",
];

/**
 * Super professional Storefront Digital Concierge Emblem
 * Minimalist geometric retail intelligence glyph without sparkles.
 */
function StoreIntelligenceLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <path
        d="M8 9.5H16M6 6H18L17 17.5H7L6 6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="1.75" fill="currentColor" />
    </svg>
  );
}

export function StorefrontAiWidget({
  storeName,
  slug,
  onAddToCart,
}: {
  storeName: string;
  slug: string;
  onAddToCart?: (itemId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Welcome to ${storeName}!\n\nI am your digital shopping assistant. I have live access to our product catalog, current prices, inventory availability, and order status. How can I assist your order today?`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    const custMsg: Message = {
      id: `cust-${Date.now()}`,
      sender: "customer",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, custMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`/api/v1/public/stores/${encodeURIComponent(slug)}/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.sender, content: m.text })),
        }),
      });

      const res = await response.json();
      const replyText =
        res?.data?.reply ?? "I received your question but couldn't load the details. Please try asking again!";
      const suggested = res?.data?.suggested_products ?? [];

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedProducts: suggested,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "assistant",
          text: "Temporary connection error. Please verify network connectivity and try again.",
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
        text: `Welcome to ${storeName}!\n\nI am your digital shopping assistant. I have live access to our product catalog, current prices, inventory availability, and order status. How can I assist your order today?`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }

  function handleItemAdd(item: SuggestedProduct) {
    if (onAddToCart) {
      onAddToCart(item.id);
      setAddedItems((prev) => ({ ...prev, [item.id]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [item.id]: false }));
      }, 2500);
    }
  }

  return (
    <>
      {/* Sleek Floating Action Button with Grok-style Animated AI Avatar */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Ask Store Assistant"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0a0f1d] text-white shadow-[0_10px_35px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all duration-200 group border border-emerald-500/40 p-1"
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

      {/* Customer Chat Flyout */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col w-[370px] sm:w-[410px] max-w-[calc(100vw-32px)] h-[600px] max-h-[80vh] rounded-3xl border border-[#e4e5e9] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#085a14] bg-gradient-to-r from-[#0c831f] via-[#0ea928] to-[#076215] px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 border border-emerald-400/30 text-white shadow-inner p-0.5">
                <GrokAgentAvatar size="sm" glowColor="#10b981" eyeColor="#34d399" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                  {storeName} Digital Help
                  <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[9.5px] font-mono uppercase tracking-wider text-emerald-100">
                    Live
                  </span>
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-white/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Live Catalog &amp; Ordering • Online</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Restart chat"
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
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-[#f8f9fa]">
            {/* Friendly Greeting Card */}
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 text-[#0c831f] font-semibold text-xs">
                <StoreIntelligenceLogo className="h-4 w-4 shrink-0" />
                <span>Instant Retail Assistance &amp; Product Search</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-[#2c3e50]">
                Ask about real-time product stock, prices, ingredients, doorstep delivery times, or counter pickups.
              </p>
            </div>

            {/* Popular Questions Chips */}
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#666]">
                Suggested Questions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STOREFRONT_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="rounded-xl border border-[#e4e5e9] bg-white hover:border-[#0c831f] hover:text-[#0c831f] px-3 py-1.5 text-[11px] font-medium text-[#1c1c1c] transition shadow-2xs text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages Feed */}
            <div className="space-y-3 pt-1">
              {messages.map((m) => {
                const isBot = m.sender === "assistant";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isBot ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`flex gap-2 max-w-[85%] ${
                        isBot ? "flex-row" : "flex-row-reverse"
                      }`}
                    >
                      {isBot && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-emerald-500/30 shadow-2xs overflow-hidden">
                          <GrokAgentAvatar size="sm" className="scale-[0.7]" glowColor="#10b981" eyeColor="#34d399" />
                        </div>
                      )}
                      <div
                        className={`rounded-2xl p-3.5 shadow-2xs space-y-1 text-xs leading-relaxed ${
                          isBot
                            ? "bg-white border border-[#e4e5e9] text-[#1c1c1c] rounded-tl-xs"
                            : "bg-[#0c831f] text-white rounded-tr-xs shadow-emerald-500/10"
                        }`}
                      >
                        <div className="whitespace-pre-line font-normal">
                          {renderFormattedStoreText(m.text)}
                        </div>
                        <div
                          className={`text-[9.5px] text-right ${
                            isBot ? "text-[#888]" : "text-white/80"
                          }`}
                        >
                          {m.time}
                        </div>
                      </div>
                    </div>

                    {/* Suggested products with 1-click Add to Cart */}
                    {isBot && m.suggestedProducts && m.suggestedProducts.length > 0 && (
                      <div className="mt-2.5 ml-9 flex flex-col gap-1.5 w-[85%]">
                        <span className="text-[10px] font-semibold text-[#666] uppercase tracking-wider">
                          Suggested Items from Store
                        </span>
                        <div className="grid gap-1.5">
                          {m.suggestedProducts.map((prod) => {
                            const isAdded = addedItems[prod.id];
                            return (
                              <div
                                key={prod.id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-[#e4e5e9] bg-white p-2.5 shadow-2xs hover:border-[#0c831f]/40 transition"
                              >
                                <div className="min-w-0">
                                  <span className="block font-semibold text-[#1c1c1c] text-xs truncate">
                                    {prod.name}
                                  </span>
                                  <span className="text-[11px] font-semibold text-[#0c831f]">
                                    {prod.price}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleItemAdd(prod)}
                                  className={`shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition shadow-2xs ${
                                    isAdded
                                      ? "bg-[#0c831f] text-white"
                                      : "bg-[#0c831f]/10 text-[#0c831f] hover:bg-[#0c831f] hover:text-white"
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="h-3 w-3" /> Added
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3" /> Add
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-emerald-500/30 overflow-hidden">
                    <GrokAgentAvatar size="sm" className="scale-[0.7]" glowColor="#10b981" eyeColor="#34d399" />
                  </div>
                  <div className="bg-white border border-[#e4e5e9] rounded-2xl rounded-tl-xs p-3.5 shadow-2xs flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#0c831f] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 rounded-full bg-[#0c831f] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 rounded-full bg-[#0c831f] animate-bounce" />
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
            className="border-t border-[#e4e5e9] bg-white p-3"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-[#d4d5d9] bg-[#f8f9fa] px-3.5 py-2 focus-within:border-[#0c831f] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0c831f]/10 transition">
              <input
                type="text"
                placeholder="Ask about products, prices, or store info..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="w-full bg-transparent text-xs text-[#1c1c1c] placeholder:text-[#888] outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0c831f] text-white transition hover:bg-[#096b18] disabled:opacity-40 shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 text-center text-[10px] text-[#888]">
              Powered by SelfX Storefront AI Core
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function renderFormattedStoreText(text: string) {
  return text.split("\n").map((line, idx) => {
    let trimmed = line.trim();
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={idx} className="font-semibold text-xs text-[#1c1c1c] mt-1 mb-0.5">
          {trimmed.replace("### ", "")}
        </h4>
      );
    }
    if (trimmed.startsWith("- ")) {
      const content = trimmed.substring(2);
      return (
        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5">
          <span className="text-[#0c831f] font-semibold">•</span>
          <span>{replaceStoreBold(content)}</span>
        </div>
      );
    }
    return (
      <p key={idx} className="my-0.5">
        {replaceStoreBold(trimmed)}
      </p>
    );
  });
}

function replaceStoreBold(str: string) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[#1c1c1c]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
