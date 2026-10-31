"use client";

import { PageHeader } from "@selfx/ui";
import { Send } from "lucide-react";
import { useEffect, useState } from "react";

type Thread = {
  order_id: string;
  number: string;
  customer_name?: string;
  status?: string;
  last_message?: string | null;
  last_at?: string | null;
};

type Message = {
  id: string;
  sender: "customer" | "partner";
  sender_name?: string;
  body: string;
  created_at?: string;
};

export default function DeliveryChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/v1/delivery/inbox", { credentials: "include", headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const body = (await res.json()) as { data?: Thread[] };
      const rows = body.data ?? [];
      setThreads(rows);
      setActiveId((current) => current ?? rows[0]?.order_id ?? null);
    };
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let stop = false;
    const load = async () => {
      const res = await fetch(`/api/v1/delivery/orders/${activeId}/messages`, { credentials: "include", headers: { Accept: "application/json" } });
      if (!res.ok || stop) return;
      const body = (await res.json()) as { data?: { messages?: Message[] } };
      setMessages(body.data?.messages ?? []);
    };
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [activeId]);

  const active = threads.find((thread) => thread.order_id === activeId);

  const send = async () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    const res = await fetch(`/api/v1/delivery/orders/${activeId}/messages`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": csrf() },
      body: JSON.stringify({ body: text }),
    });
    const body = (await res.json().catch(() => null)) as { data?: { messages?: Message[] } } | null;
    if (!res.ok) return;
    setDraft("");
    setMessages(body?.data?.messages ?? []);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <PageHeader title="Customer chat" description="Messages from the storefront tracking page land here." />
      <div className="grid h-[640px] overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[280px_1fr]">
        <aside className="overflow-y-auto border-b border-slate-200 md:border-b-0 md:border-r">
          {threads.length === 0 ? <p className="p-4 text-sm text-slate-500">No delivery conversations yet.</p> : null}
          {threads.map((thread) => (
            <button
              key={thread.order_id}
              type="button"
              onClick={() => setActiveId(thread.order_id)}
              className={`block w-full border-b border-slate-100 px-4 py-3 text-left ${thread.order_id === activeId ? "bg-indigo-50" : "hover:bg-slate-50"}`}
            >
              <p className="text-sm font-semibold text-slate-900">{thread.customer_name || "Customer"}</p>
              <p className="text-[11px] text-slate-500">{thread.number}</p>
              <p className="mt-1 truncate text-xs text-slate-600">{thread.last_message || "No messages yet"}</p>
            </button>
          ))}
        </aside>
        <section className="flex min-h-0 flex-col">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{active?.customer_name || "Select a delivery"}</p>
            <p className="text-[11px] text-slate-500">{active?.number}</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.map((message) => {
              const mine = message.sender === "partner";
              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-900"}`}>
                    {message.body}
                  </div>
                </div>
              );
            })}
          </div>
          <form
            className="flex gap-2 border-t border-slate-200 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Reply to the customer" className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400" />
            <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-40" disabled={!draft.trim() || !activeId}>
              <Send size={15} /> Send
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function csrf(): string {
  return decodeURIComponent(document.cookie.split("; ").find((row) => row.startsWith("XSRF-TOKEN="))?.slice("XSRF-TOKEN=".length) ?? "");
}
