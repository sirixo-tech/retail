"use client";

import { Phone, Send, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  sender: "customer" | "partner";
  sender_name?: string;
  body: string;
  created_at?: string;
};

export function DeliveryChatModal({
  isOpen,
  onClose,
  driverName,
  driverPhone,
  orderNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  driverName?: string | null;
  driverPhone?: string | null;
  storeName?: string | null;
  destinationAddress?: string | null;
  orderNumber: string;
  estimatedMinutes?: number;
}) {
  const partnerName = driverName?.trim() || "Delivery partner";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !orderNumber) return;
    let stop = false;
    const load = async () => {
      const res = await fetch(`/api/v1/public/orders/messages?number=${encodeURIComponent(orderNumber)}`, {
        headers: { Accept: "application/json" },
      });
      const body = await res.json().catch(() => null);
      if (stop || !res.ok) return;
      setMessages(Array.isArray(body?.data?.messages) ? body.data.messages : []);
    };
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [isOpen, orderNumber]);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const send = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/public/orders/messages", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ number: orderNumber, body: text }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || "The message was not sent.");
        return;
      }
      setInputText("");
      setMessages(Array.isArray(body?.data?.messages) ? body.data.messages : []);
    } catch {
      setError("The message was not sent.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[640px] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {partnerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{partnerName}</p>
              <p className="truncate text-[11px] text-slate-500">Order {orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {driverPhone ? (
              <a href={`tel:${driverPhone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700" aria-label="Call delivery partner">
                <Phone size={16} />
              </a>
            ) : null}
            <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700" aria-label="Close chat">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
          {messages.length === 0 ? (
            <p className="pt-8 text-center text-sm text-slate-500">No messages yet. Write to your delivery partner about the drop-off.</p>
          ) : (
            messages.map((message) => {
              const mine = message.sender === "customer";
              return (
                <div key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!mine ? <p className="mb-1 px-1 text-[11px] font-medium text-slate-500">{message.sender_name || partnerName}</p> : null}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-900"}`}>
                    {message.body}
                  </div>
                  <p className="mt-1 px-1 text-[10px] text-slate-400">
                    {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                  </p>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {error ? <p className="px-4 pb-1 text-xs text-rose-600">{error}</p> : null}
        <form
          className="flex items-center gap-2 border-t border-slate-200 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            placeholder="Message the delivery partner"
            className="h-11 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-slate-400"
          />
          <button type="submit" disabled={sending || !inputText.trim()} className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white disabled:opacity-40" aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
