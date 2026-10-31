"use client";

import { PageHeader } from "@selfx/ui";
import { formatInr } from "@selfx/types";
import {
  Bike,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Truck,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { DeliveryNav } from "../delivery-nav";

type Thread = {
  order_id: string;
  number: string;
  customer_name?: string;
  customer_phone?: string;
  status?: string;
  last_message?: string | null;
  last_sender?: string | null;
  last_at?: string | null;
};

type Message = {
  id: string;
  sender: "customer" | "partner";
  sender_name?: string;
  body: string;
  created_at?: string;
};

const QUICK_REPLIES = [
  "🛵 On my way! Arriving in 5-10 minutes.",
  "📍 I have arrived at your building / main gate.",
  "📞 Please share your flat number or nearby landmark.",
  "🚪 I have placed your package safely at the door.",
  "📦 Order handed over. Thank you for shopping with us!",
];

function formatMessageTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function getInitials(name?: string): string {
  if (!name) return "C";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function DeliveryChatContent() {
  const searchParams = useSearchParams();
  const paramOrderId = searchParams.get("orderId");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Poll Inbox threads
  useEffect(() => {
    let stop = false;
    const loadInbox = async () => {
      try {
        const res = await fetch("/api/v1/delivery/inbox", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || stop) return;
        const body = (await res.json()) as { data?: Thread[] };
        const rows = body.data ?? [];
        setThreads(rows);

        // Auto select thread if specified in URL query or if none selected yet
        setActiveId((curr) => {
          if (paramOrderId && rows.some((r) => r.order_id === paramOrderId)) {
            return paramOrderId;
          }
          return curr ?? rows[0]?.order_id ?? null;
        });
      } catch {
        // Keep existing threads on background error
      } finally {
        if (!stop) setThreadsLoading(false);
      }
    };

    void loadInbox();
    const timer = window.setInterval(() => void loadInbox(), 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [paramOrderId]);

  // Poll active thread messages
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    let stop = false;
    let initial = true;

    const loadMessages = async () => {
      if (initial) setMessagesLoading(true);
      try {
        const res = await fetch(`/api/v1/delivery/orders/${activeId}/messages`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || stop) return;
        const body = (await res.json()) as { data?: { messages?: Message[] } };
        const newMessages = body.data?.messages ?? [];
        setMessages(newMessages);

        if (initial) {
          setTimeout(() => scrollToBottom("auto"), 50);
          initial = false;
        }
      } catch {
        // Keep existing messages
      } finally {
        if (!stop && initial) setMessagesLoading(false);
      }
    };

    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [activeId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages.length]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.order_id === activeId),
    [threads, activeId]
  );

  const filteredThreads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.number.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        (t.customer_phone && t.customer_phone.includes(q)) ||
        (t.last_message && t.last_message.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? draft).trim();
    if (!text || !activeId || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/v1/delivery/orders/${activeId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": csrf(),
        },
        body: JSON.stringify({ body: text }),
      });
      const body = (await res.json().catch(() => null)) as {
        data?: { messages?: Message[] };
      } | null;

      if (!res.ok) return;

      setDraft("");
      if (body?.data?.messages) {
        setMessages(body.data.messages);
      }
      setTimeout(() => scrollToBottom("smooth"), 50);
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {/* Page Title & Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Chat</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Inbox
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time conversations with customers tracking their orders from the storefront.
          </p>
        </div>

        <Link
          href="/delivery"
          className="inline-flex h-9 items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 sm:self-auto"
        >
          <Truck size={13} className="text-slate-400" />
          <span>Dispatch Board</span>
        </Link>
      </div>

      {/* Sub-Navigation Bar */}
      <DeliveryNav />

      {/* Main Messenger Container */}
      <div className="grid h-[calc(100vh-210px)] min-h-[640px] max-h-[820px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]">
        {/* Left Column: Conversations List */}
        <aside className="flex flex-col border-b border-slate-200 bg-slate-50/50 md:border-b-0 md:border-r">
          {/* Inbox Search & Filter Header */}
          <div className="border-b border-slate-200/80 bg-white p-3.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer or order #..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>{filteredThreads.length} conversation{filteredThreads.length === 1 ? "" : "s"}</span>
              <span className="text-slate-400">Auto-updating</span>
            </div>
          </div>

          {/* Threads Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {threadsLoading && threads.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <RefreshCw size={18} className="mx-auto mb-2 animate-spin text-slate-300" />
                Loading conversations...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">No conversations found</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {searchQuery ? "Try matching a different name or number." : "When customers send messages on tracking, they appear here."}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.order_id === activeId;
                const isCustomerLast = thread.last_sender === "customer";
                const initials = getInitials(thread.customer_name);

                return (
                  <button
                    key={thread.order_id}
                    type="button"
                    onClick={() => setActiveId(thread.order_id)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-white shadow-2xs border-l-4 border-l-indigo-600"
                        : "hover:bg-slate-100/70"
                    }`}
                  >
                    {/* Avatar Initials Circle */}
                    <div
                      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold shadow-2xs ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {initials}
                      {isCustomerLast && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`truncate text-xs font-bold ${isSelected ? "text-indigo-950" : "text-slate-900"}`}>
                          {thread.customer_name || "Customer"}
                        </p>
                        <span className="shrink-0 text-[10px] font-medium text-slate-400">
                          {formatRelativeTime(thread.last_at)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-slate-500">
                          #{thread.number}
                        </span>
                        {thread.status && (
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-semibold capitalize text-slate-600">
                            {thread.status.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>

                      <p
                        className={`mt-1 line-clamp-1 text-xs leading-snug ${
                          isCustomerLast
                            ? "font-semibold text-slate-900"
                            : "text-slate-500"
                        }`}
                      >
                        {isCustomerLast ? "Customer: " : thread.last_sender ? "You: " : ""}
                        {thread.last_message || "No messages yet"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Active Conversation */}
        <section className="flex min-h-0 flex-1 flex-col bg-slate-50/30">
          {activeThread ? (
            <>
              {/* Conversation Top Header */}
              <div className="flex items-center justify-between border-b border-slate-200/90 bg-white px-4 py-3 shadow-2xs sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-sm font-bold text-white shadow-2xs">
                    {getInitials(activeThread.customer_name)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        {activeThread.customer_name || "Customer"}
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-medium text-slate-700">
                        Order #{activeThread.number}
                      </span>
                      {activeThread.customer_phone && (
                        <>
                          <span>·</span>
                          <a
                            href={`tel:${activeThread.customer_phone}`}
                            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-indigo-600 hover:underline"
                          >
                            <Phone size={11} className="text-slate-400" />
                            <span>{activeThread.customer_phone}</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeThread.customer_phone && (
                    <a
                      href={`tel:${activeThread.customer_phone}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                      title="Call customer directly"
                    >
                      <Phone size={13} className="text-indigo-600" />
                      <span className="hidden sm:inline">Call</span>
                    </a>
                  )}

                  <Link
                    href={`/delivery?orderId=${activeThread.order_id}`}
                    className="inline-flex h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
                  >
                    <span>View Order</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    <RefreshCw size={18} className="mr-2 animate-spin text-slate-300" />
                    Loading message history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <MessageSquare size={24} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-900">Start the conversation</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">
                      Send a message to update the customer on delivery status, arrival ETA, or directions.
                    </p>
                  </div>
                ) : (
                  messages.map((message, idx) => {
                    const isPartner = message.sender === "partner";
                    const timeStr = formatMessageTime(message.created_at);

                    return (
                      <div
                        key={message.id || idx}
                        className={`flex flex-col ${isPartner ? "items-end" : "items-start"}`}
                      >
                        <span className="mb-1 px-1 text-[10px] font-semibold text-slate-400">
                          {isPartner ? "You (Delivery Partner)" : message.sender_name || "Customer"}
                        </span>

                        <div
                          className={`group relative max-w-[82%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                            isPartner
                              ? "bg-indigo-600 text-white rounded-br-xs"
                              : "border border-slate-200/90 bg-white text-slate-900 rounded-bl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>

                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              isPartner ? "text-indigo-200" : "text-slate-400"
                            }`}
                          >
                            <span>{timeStr}</span>
                            {isPartner && <CheckCheck size={12} className="text-indigo-200" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Chips */}
              <div className="border-t border-slate-200/60 bg-white px-4 py-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="flex items-center gap-1 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 pr-1">
                    <Sparkles size={11} className="text-amber-500" />
                    Quick replies:
                  </span>
                  {QUICK_REPLIES.map((text) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => void sendMessage(text)}
                      className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Bar */}
              <form
                className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 sm:px-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage();
                }}
              >
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message to the customer... (Press Enter to send)"
                    maxLength={1000}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-xs sm:text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                  {draft.length > 800 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400">
                      {1000 - draft.length}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                >
                  <Send size={14} className={sending ? "animate-pulse" : ""} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          ) : (
            /* Empty Selection State */
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-2xs">
                <MessageSquare size={32} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">Select a Conversation</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                Choose a customer from the left inbox to view their live order thread, reply to inquiries, and share delivery updates.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function DeliveryChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center text-xs text-slate-400">
          <RefreshCw size={20} className="mr-2 animate-spin text-slate-300" />
          Loading customer chat...
        </div>
      }
    >
      <DeliveryChatContent />
    </Suspense>
  );
}

function csrf(): string {
  if (typeof document === "undefined") return "";
  return (
    decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.slice("XSRF-TOKEN=".length) ?? ""
    ) || ""
  );
}
