"use client";

import {
  Check,
  CheckCheck,
  Compass,
  MapPin,
  Mic,
  Phone,
  Plus,
  Send,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  sender: "customer" | "driver";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
}

interface DeliveryChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverName?: string | null;
  driverPhone?: string | null;
  storeName?: string | null;
  destinationAddress?: string | null;
  orderNumber: string;
  estimatedMinutes?: number;
}

export function DeliveryChatModal({
  isOpen,
  onClose,
  driverName = "Khalid Omor",
  driverPhone,
  storeName = "Store",
  destinationAddress = "Your Address",
  orderNumber,
  estimatedMinutes = 12,
}: DeliveryChatModalProps) {
  const effectiveDriverName = driverName || "Khalid Omor";
  const effectivePhone = driverPhone || "";
  const storageKey = `selfx_driver_chat_${orderNumber || "demo"}`;

  // Formatted initial timestamp
  const getNowTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const defaultMessages: ChatMessage[] = [
    {
      id: "m-1",
      sender: "customer",
      text: `Hey ${effectiveDriverName.split(" ")[0]}, just checking - has my parcel left ${storeName || "the store"} yet?`,
      time: "9:15 AM",
      status: "read",
    },
    {
      id: "m-2",
      sender: "driver",
      text: `Yes, it's on the way now 🚚 I've just departed from ${storeName || "the store"}.`,
      time: "9:18 AM",
    },
    {
      id: "m-3",
      sender: "customer",
      text: "Great! When can I expect the delivery?",
      time: "9:18 AM",
      status: "read",
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // fallback to defaults
    }
    setMessages(defaultMessages);
  }, [isOpen, storageKey]);

  // Persist messages
  useEffect(() => {
    if (typeof window === "undefined" || !isOpen) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore storage error
    }
  }, [messages, isOpen, storageKey]);

  // Auto scroll
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendMessage = (textToSend?: string) => {
    const raw = (textToSend ?? inputText).trim();
    if (!raw) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "customer",
      text: raw,
      time: getNowTime(),
      status: "sent",
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputText("");
    setShowAttachMenu(false);

    // Simulate realistic 2-way driver response
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      let replyText = `Got it! I am about ${estimatedMinutes} minutes away. See you shortly!`;

      const lower = raw.toLowerCase();
      if (lower.includes("location") || lower.includes("gps") || lower.includes("live")) {
        replyText = "📍 Thanks for sharing! I have your exact pin and am navigating straight to your gate.";
      } else if (lower.includes("call") || lower.includes("phone")) {
        replyText = "Sure thing! I am riding right now; I will dial your phone number the moment I pull up.";
      } else if (lower.includes("time") || lower.includes("when") || lower.includes("eta") || lower.includes("update")) {
        replyText = `Roads are clear! I should reach your doorstep in approximately ${estimatedMinutes} minutes 🛵`;
      } else if (lower.includes("door") || lower.includes("leave")) {
        replyText = "Understood 👍 I will leave the parcel safely at your door and notify you immediately!";
      } else if (lower.includes("bell") || lower.includes("ring")) {
        replyText = "Noted! I will ring your doorbell once upon arrival.";
      } else if (lower.includes("fragile") || lower.includes("care")) {
        replyText = "Understood! Your package is safely secured in our thermal compartment. Handling with extra care.";
      }

      const driverMsg: ChatMessage = {
        id: `msg-drv-${Date.now()}`,
        sender: "driver",
        text: replyText,
        time: getNowTime(),
      };
      setMessages((prev) => [...prev, driverMsg]);
    }, 1400);
  };

  const quickPills = [
    { label: "Share live location", text: "📍 Sharing my live delivery location for quick arrival." },
    { label: "Call Courier", text: "Hi, please call me once you reach the building gate." },
    { label: "Delivery Time Update", text: "Could you share a quick delivery time update?" },
    { label: "Leave at door", text: "Please leave the parcel at my door if I am not available." },
    { label: "Ring the doorbell", text: "Please ring the doorbell when you arrive." },
  ];

  if (!isOpen) return null;

  // Format route subtitle e.g. "Store -> City/Address"
  const destClean = destinationAddress ? destinationAddress.split(",")[0] : "Your Location";
  const routeSubtitle = `Courier — ${storeName || "Store"} → ${destClean}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Chat Card / Bottom Sheet (Image 2 Match) */}
      <div className="relative w-full max-w-md sm:max-w-lg h-[92vh] sm:h-[680px] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
        {/* Grab Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* 1. TOP HEADER (Image 2 Match) */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 bg-white">
          {/* Driver Info */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with Status Dot */}
            <div className="relative">
              <div className="h-11 w-11 rounded-full overflow-hidden bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-xs shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80"
                  alt={effectiveDriverName}
                  className="h-full w-full rounded-full object-cover"
                  onError={(e) => {
                    // Fallback to driver initial
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                <div className="h-full w-full rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  {effectiveDriverName.charAt(0)}
                </div>
              </div>
              {/* Online Green Pulsing Badge */}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate leading-snug">
                {effectiveDriverName}
              </h3>
              <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5">
                {routeSubtitle}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-emerald-600">Active Now</span>
              </div>
            </div>
          </div>

          {/* Top Action Buttons (Image 2: Call, Video, Close) */}
          <div className="flex items-center gap-2 shrink-0">
            {effectivePhone ? (
              <a
                href={`tel:${effectivePhone}`}
                aria-label={`Call ${effectiveDriverName}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                title={`Call ${effectiveDriverName}`}
              >
                <Phone size={17} className="stroke-[2.2]" />
              </a>
            ) : (
              <button
                type="button"
                onClick={() => showToast("Connecting voice line with delivery partner…")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
                title="Call Courier"
              >
                <Phone size={17} className="stroke-[2.2]" />
              </button>
            )}

            <button
              type="button"
              onClick={() => showToast("Doorstep video feed enables when rider arrives at your gate.")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Video Verification"
            >
              <Video size={17} className="stroke-[2.2]" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs ml-0.5"
              title="Close Chat"
            >
              <X size={18} className="stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* 2. CHAT MESSAGES THREAD (Image 2 Match) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-[#fdfdfd]">
          {/* Encrypted Notice */}
          <div className="text-center py-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 border border-slate-200/60 px-3 py-1 text-[10.5px] font-medium text-slate-500">
              <Sparkles size={11} className="text-amber-500" />
              Direct live delivery channel for Order #{orderNumber}
            </span>
          </div>

          {messages.map((msg) => {
            const isCustomer = msg.sender === "customer";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}
              >
                {/* Driver Name Label for Driver Message (Image 2 style) */}
                {!isCustomer && (
                  <div className="flex items-center gap-1.5 mb-1 pl-1">
                    <div className="h-4 w-4 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-700">
                      {effectiveDriverName.charAt(0)}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {effectiveDriverName}
                    </span>
                  </div>
                )}

                {/* Message Bubble (Image 2: Black for User, Light Gray for Driver) */}
                <div
                  className={`max-w-[82%] sm:max-w-[76%] rounded-2xl px-4 py-2.5 text-sm font-medium leading-relaxed shadow-2xs ${
                    isCustomer
                      ? "bg-[#18181b] text-white rounded-tr-xs"
                      : "bg-[#f1f3f5] text-slate-900 rounded-tl-xs border border-slate-200/50"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>

                {/* Timestamp & Status */}
                <div className={`flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1 ${isCustomer ? "justify-end" : "justify-start"}`}>
                  <span>{msg.time}</span>
                  {isCustomer && (
                    <span title="Delivered">
                      <CheckCheck size={12} className="text-slate-400" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex flex-col items-start animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 mb-1 pl-1">
                <span className="text-[11px] font-semibold text-slate-500">
                  {effectiveDriverName} is typing…
                </span>
              </div>
              <div className="bg-[#f1f3f5] border border-slate-200/50 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-slate-500 flex items-center gap-1.5 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" />
                <span
                  className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 3. QUICK SUGGESTION PILLS (Image 2 Match: Share live location, Call Courier, etc.) */}
        <div className="border-t border-slate-100 bg-white py-2 px-3 sm:px-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {quickPills.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => handleSendMessage(pill.text)}
                className="whitespace-nowrap shrink-0 rounded-full border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition active:scale-95 cursor-pointer shadow-2xs"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. ATTACH / QUICK OPTIONS MENU (When + is clicked) */}
        {showAttachMenu && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-2 animate-in slide-in-from-bottom-2 duration-150 text-xs">
            <button
              type="button"
              onClick={() => {
                handleSendMessage("📍 Verified Delivery Pin: Indiranagar 100ft Rd, Bangalore");
                setShowAttachMenu(false);
              }}
              className="flex flex-col items-center justify-center gap-1 p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <Compass size={18} className="text-emerald-600" />
              <span className="font-semibold text-[11px]">Send Pin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleSendMessage("🚪 Gate Entry Code / Wing B Security Pass shared.");
                setShowAttachMenu(false);
              }}
              className="flex flex-col items-center justify-center gap-1 p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <MapPin size={18} className="text-blue-600" />
              <span className="font-semibold text-[11px]">Gate Note</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleSendMessage("⚠️ Fragile & temperature-sensitive grocery package.");
                setShowAttachMenu(false);
              }}
              className="flex flex-col items-center justify-center gap-1 p-2.5 bg-white rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <Sparkles size={18} className="text-amber-600" />
              <span className="font-semibold text-[11px]">Fragile Care</span>
            </button>
          </div>
        )}

        {/* 5. INPUT BAR (Image 2 Match: + button, text input, mic, black send button) */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Plus Button */}
            <button
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Add Attachments / Quick Action"
            >
              <Plus size={19} className={`transition-transform duration-200 ${showAttachMenu ? "rotate-45" : ""}`} />
            </button>

            {/* Input Pill */}
            <div className="relative flex-1 flex items-center bg-[#f1f3f5] rounded-full px-4 py-2 border border-slate-200/60 focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-400 transition">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message…"
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => showToast("Microphone voice note simulation: Speaking…")}
                className="ml-2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                title="Voice Message"
              >
                <Mic size={18} />
              </button>
            </div>

            {/* Circular Black Send Button with Paper Plane (Image 2) */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#18181b] hover:bg-black text-white transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              title="Send Message"
            >
              <Send size={16} className="translate-x-0.5" />
            </button>
          </form>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-slate-900/95 text-white px-4 py-2 text-xs font-semibold shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
