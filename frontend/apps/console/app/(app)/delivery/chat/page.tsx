"use client";

import { PageHeader } from "@selfx/ui";
import { formatInr } from "@selfx/types";
import {
  ArrowLeft,
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { DeliveryNav } from "../delivery-nav";

type Thread = {
  order_id: string;
  number: string;
  customer_name?: string;
  customer_phone?: string;
  status?: string;
  delivery_status?: string;
  total_paise?: number;
  payment_method?: string;
  payment_status?: string;
  has_messages?: boolean;
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
  "🚪 I have placed your package safely at your door.",
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

function formatDateSeparator(isoString?: string | null): string {
  if (!isoString) return "Today";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Today";
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isToday) return "Today";

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return "Yesterday";

    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Today";
  }
}

function getInitials(name?: string): string {
  if (!name) return "C";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getStatusBadge(status?: string, deliveryStatus?: string) {
  const s = deliveryStatus || status || "placed";
  switch (s) {
    case "out_for_delivery":
      return {
        label: "Out for Delivery",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dotClass: "bg-emerald-500",
      };
    case "ready":
    case "packing":
    case "accepted":
      return {
        label: s.replace(/_/g, " "),
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
        dotClass: "bg-amber-500",
      };
    case "delivered":
    case "picked_up":
      return {
        label: "Delivered",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        dotClass: "bg-blue-500",
      };
    case "cancelled":
    case "rejected":
      return {
        label: "Cancelled",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        dotClass: "bg-rose-500",
      };
    default:
      return {
        label: s.replace(/_/g, " "),
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        dotClass: "bg-slate-400",
      };
  }
}

function DeliveryChatContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramOrderId = searchParams.get("orderId");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"active" | "with_messages" | "all">("active");
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

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

        // Auto-select thread if specified in URL query, or default to first with messages / first order
        setActiveId((curr) => {
          if (curr && rows.some((r) => r.order_id === curr || r.number === curr)) {
            return curr;
          }
          if (paramOrderId) {
            const matched = rows.find((r) => r.order_id === paramOrderId || r.number === paramOrderId);
            if (matched) return matched.order_id;
          }
          const firstWithMsg = rows.find((r) => r.has_messages);
          return firstWithMsg?.order_id ?? rows[0]?.order_id ?? null;
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

  const activeThread = useMemo(() => {
    if (!activeId) return null;
    return threads.find((t) => t.order_id === activeId || t.number === activeId) || null;
  }, [threads, activeId]);

  const hasMessagesCount = useMemo(
    () => threads.filter((t) => t.has_messages).length,
    [threads]
  );

  const filteredThreads = useMemo(() => {
    let list = threads;

    if (filterTab === "with_messages") {
      list = list.filter((t) => t.has_messages);
    } else if (filterTab === "active") {
      list = list.filter(
        (t) =>
          t.has_messages ||
          ["out_for_delivery", "ready", "packing", "placed", "accepted"].includes(
            t.delivery_status || t.status || ""
          )
      );
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter(
      (t) =>
        t.number.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        (t.customer_phone && t.customer_phone.includes(q)) ||
        (t.last_message && t.last_message.toLowerCase().includes(q))
    );
  }, [threads, filterTab, searchQuery]);

  const handleSelectThread = (thread: Thread) => {
    setActiveId(thread.order_id);
    setMobileThreadOpen(true);
    // Sync URL query without full reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("orderId", thread.order_id);
      window.history.replaceState({}, "", url.toString());
    }
  };

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

      if (!overrideText) {
        setDraft("");
      }
      if (body?.data?.messages) {
        setMessages(body.data.messages);
      }
      setTimeout(() => scrollToBottom("smooth"), 50);
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const statusInfo = getStatusBadge(activeThread?.status, activeThread?.delivery_status);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customer Chat</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Messenger
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Live two-way communication between delivery partners and customers tracking orders on the storefront.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/delivery"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50"
          >
            <Truck size={14} className="text-slate-400" />
            <span>Dispatch Board</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <DeliveryNav chatBadgeCount={hasMessagesCount} />

      {/* Main 2-Pane Messenger Card */}
      <div className="grid h-[calc(100vh-215px)] min-h-[640px] max-h-[820px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs md:grid-cols-[330px_1fr] lg:grid-cols-[380px_1fr]">
        {/* Left Column: Conversations List */}
        <aside
          className={`flex flex-col border-r border-slate-200/90 bg-slate-50/60 transition-all ${
            mobileThreadOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search Header */}
          <div className="border-b border-slate-200/80 bg-white p-3.5 space-y-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, order #, or phone..."
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-7 text-xs text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterTab("active")}
                className={`flex-1 rounded-lg py-1 text-center font-semibold transition cursor-pointer ${
                  filterTab === "active"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("with_messages")}
                className={`flex-1 rounded-lg py-1 text-center font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                  filterTab === "with_messages"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Chats</span>
                {hasMessagesCount > 0 && (
                  <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700">
                    {hasMessagesCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`flex-1 rounded-lg py-1 text-center font-semibold transition cursor-pointer ${
                  filterTab === "all"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({threads.length})
              </button>
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/90">
            {threadsLoading && threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-slate-300" />
                Loading conversations...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">No conversations found</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {searchQuery
                    ? "No orders match your search query."
                    : filterTab === "with_messages"
                    ? "No customer messages yet. Select an order to start a chat."
                    : "Orders ready for delivery will appear here."}
                </p>
                {filterTab !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className="mt-3 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                  >
                    View all orders ({threads.length})
                  </button>
                )}
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.order_id === activeId;
                const isCustomerLast = thread.last_sender === "customer";
                const initials = getInitials(thread.customer_name);
                const badge = getStatusBadge(thread.status, thread.delivery_status);

                return (
                  <button
                    key={thread.order_id}
                    type="button"
                    onClick={() => handleSelectThread(thread)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition cursor-pointer relative ${
                      isSelected
                        ? "bg-indigo-50/70 border-l-4 border-l-indigo-600 shadow-2xs"
                        : "hover:bg-slate-100/80"
                    }`}
                  >
                    {/* Customer Initials Avatar */}
                    <div
                      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-bold shadow-2xs ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : thread.has_messages
                          ? "bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {initials}
                      {thread.has_messages && isCustomerLast && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
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

                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-semibold text-slate-600">
                          #{thread.number}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 text-[9px] font-semibold capitalize ${badge.badgeClass}`}
                        >
                          <span className={`h-1 w-1 rounded-full ${badge.dotClass}`} />
                          {badge.label}
                        </span>
                      </div>

                      <p
                        className={`mt-1.5 line-clamp-1 text-xs leading-snug ${
                          isCustomerLast
                            ? "font-semibold text-slate-900"
                            : "text-slate-500"
                        }`}
                      >
                        {isCustomerLast ? (
                          <span className="text-emerald-700 font-bold">Customer: </span>
                        ) : thread.last_sender ? (
                          <span className="text-slate-600 font-medium">You: </span>
                        ) : null}
                        {thread.last_message ? (
                          thread.last_message
                        ) : (
                          <span className="italic text-slate-400">No messages yet</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Active Conversation */}
        <section
          className={`flex min-h-0 flex-1 flex-col bg-slate-50/40 ${
            !mobileThreadOpen ? "hidden md:flex" : "flex"
          }`}
        >
          {activeThread ? (
            <>
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-200/90 bg-white px-4 py-3 shadow-2xs sm:px-6">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setMobileThreadOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden cursor-pointer shrink-0"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-sm font-bold text-white shadow-2xs">
                    {getInitials(activeThread.customer_name)}
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-sm font-bold text-slate-900">
                        {activeThread.customer_name || "Customer"}
                      </h2>
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">
                        #{activeThread.number}
                      </span>
                      <span>·</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.2 text-[10px] font-semibold capitalize ${statusInfo.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotClass}`} />
                        {statusInfo.label}
                      </span>
                      {typeof activeThread.total_paise === "number" && (
                        <>
                          <span className="hidden sm:inline">·</span>
                          <span className="hidden sm:inline font-semibold text-slate-600">
                            {formatInr(activeThread.total_paise)} (
                            {(activeThread.payment_method || "COD").toUpperCase()})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {activeThread.customer_phone && (
                    <a
                      href={`tel:${activeThread.customer_phone}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
                      title={`Call ${activeThread.customer_phone}`}
                    >
                      <Phone size={13} className="text-indigo-600" />
                      <span className="hidden sm:inline">{activeThread.customer_phone}</span>
                      <span className="sm:hidden">Call</span>
                    </a>
                  )}

                  <Link
                    href={`/delivery?orderId=${activeThread.order_id}`}
                    className="inline-flex h-9 items-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
                    title="View order in dispatch board"
                  >
                    <span>View Order</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>

              {/* Messages History Feed */}
              <div className="flex-1 space-y-3.5 overflow-y-auto p-4 sm:p-6">
                {messagesLoading && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    <RefreshCw size={18} className="mr-2 animate-spin text-slate-300" />
                    Loading conversation history...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-2xs">
                      <MessageSquare size={28} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-900">
                      No messages yet with {activeThread.customer_name || "Customer"}
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                      Keep the customer updated about order arrival ETA, gate access, or location details.
                      Choose a quick reply below or type your message.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-md">
                      {QUICK_REPLIES.slice(0, 3).map((reply) => (
                        <button
                          key={reply}
                          type="button"
                          onClick={() => void sendMessage(reply)}
                          className="rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 cursor-pointer"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center my-1">
                      <span className="rounded-full bg-slate-200/60 px-3 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {formatDateSeparator(messages[0]?.created_at)}
                      </span>
                    </div>

                    {messages.map((message, idx) => {
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
                            className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
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
                    })}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Bar */}
              <div className="border-t border-slate-200/70 bg-white/90 px-4 py-2 backdrop-blur-xs">
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
                    placeholder={`Message ${activeThread.customer_name || "customer"}... (Press Enter to send)`}
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
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <Send size={14} className={sending ? "animate-pulse" : ""} />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            /* Empty State when no orders exist */
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-2xs">
                <MessageSquare size={32} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">Select a Conversation</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
                Choose an order thread from the left to view customer inquiries, reply in real time, and share delivery updates.
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
