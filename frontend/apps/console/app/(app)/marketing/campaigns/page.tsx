"use client";

import { useEffect, useState } from "react";
import {
  Megaphone,
  Smartphone,
  MessageSquare,
  Mail,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Send,
  Sparkles,
  Users,
  Eye,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import { MarketingNav } from "../marketing-nav";

interface Campaign {
  id: string;
  name: string;
  channel: "whatsapp" | "sms" | "email";
  target_segment: string;
  target_count: number;
  sent_count: number;
  failed_count: number;
  status: "draft" | "scheduled" | "sent" | "failed";
  subject: string | null;
  message_body: string;
  scheduled_at: string | null;
  sent_at: string | null;
  metrics?: {
    delivered?: number;
    clicks?: number;
    conversions?: number;
    estimated_revenue_paise?: number;
  };
  created_at: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  estimated_count: number;
}

interface Template {
  id: string;
  name: string;
  channel: string;
  subject?: string;
  content: string;
}

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formChannel, setFormChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [formSegment, setFormSegment] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formSendNow, setFormSendNow] = useState(true);
  const [formScheduleTime, setFormScheduleTime] = useState("");

  // Test sending
  const [testRecipient, setTestRecipient] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);

  async function loadData() {
    try {
      const [cRes, sRes, tRes] = await Promise.all([
        fetch("/api/v1/marketing/campaigns", { credentials: "include" }),
        fetch("/api/v1/marketing/segments", { credentials: "include" }),
        fetch("/api/v1/marketing/templates", { credentials: "include" }),
      ]);

      const cJson = await cRes.json();
      const sJson = await sRes.json();
      const tJson = await tRes.json();

      if (cJson.data) setCampaigns(cJson.data);
      if (sJson.data) {
        setSegments(sJson.data);
        if (sJson.data.length > 0 && !formSegment) {
          setFormSegment(sJson.data[0].name);
        }
      }
      if (tJson.data) setTemplates(tJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // Check if URL has ?new=true
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("new") === "true") {
        setShowCreateModal(true);
      }
    }
  }, []);

  function handleSelectTemplate(tplId: string) {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setFormBody(tpl.content);
    if (tpl.subject) setFormSubject(tpl.subject);
    if (tpl.channel === "whatsapp" || tpl.channel === "sms" || tpl.channel === "email") {
      setFormChannel(tpl.channel as any);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);

    try {
      const payload = {
        name: formName,
        channel: formChannel,
        target_segment: formSegment,
        subject: formChannel === "email" ? formSubject : null,
        message_body: formBody,
        send_now: formSendNow,
        scheduled_at: !formSendNow && formScheduleTime ? formScheduleTime : null,
      };

      const res = await fetch("/api/v1/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to create campaign");
      }

      setFeedback(
        formSendNow
          ? `Campaign broadcast dispatched to ${json.data.sent_count} customers successfully!`
          : "Campaign scheduled successfully!"
      );
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setFeedback(err.message || "Error creating campaign");
    } finally {
      setCreating(false);
    }
  }

  async function handleDispatch(id: string) {
    try {
      const res = await fetch(`/api/v1/marketing/campaigns/${id}/dispatch`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (json.data) {
        setFeedback(`Campaign launched successfully! Dispatched to ${json.data.sent_count} recipients.`);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleTestSend() {
    if (!testRecipient || !formBody) {
      alert("Please enter a test recipient and message content first.");
      return;
    }
    setTestSending(true);
    setTestSuccessMsg(null);
    try {
      const res = await fetch("/api/v1/marketing/campaigns/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channel: formChannel,
          recipient: testRecipient,
          message_body: formBody,
          subject: formSubject,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setTestSuccessMsg(json.data.message);
      }
    } catch (err) {
      alert("Failed to send test message");
    } finally {
      setTestSending(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormBody("");
    setFormSubject("");
    setTestRecipient("");
    setTestSuccessMsg(null);
  }

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Selected segment details
  const activeSegmentObj = segments.find((s) => s.name === formSegment);

  return (
    <div className="space-y-6 pb-12">
      <MarketingNav
        title="Marketing Campaigns"
        subtitle="Create, schedule, and automate promotional campaigns across WhatsApp, SMS and Email."
        actionButton={
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        }
      />

      {feedback && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Channel Filter */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1">
            {["all", "whatsapp", "sms", "email"].map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  channelFilter === ch
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Campaigns Grid / Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredCampaigns.map((c) => {
          const isWa = c.channel === "whatsapp";
          const isSms = c.channel === "sms";
          const isEmail = c.channel === "email";

          return (
            <div
              key={c.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-xl p-2.5 ${
                        isWa
                          ? "bg-emerald-50 text-emerald-600"
                          : isSms
                          ? "bg-amber-50 text-amber-600"
                          : "bg-violet-50 text-violet-600"
                      }`}
                    >
                      {isWa ? (
                        <Smartphone className="h-5 w-5" />
                      ) : isSms ? (
                        <MessageSquare className="h-5 w-5" />
                      ) : (
                        <Mail className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {c.channel}
                      </span>
                      <h3 className="font-bold text-slate-900 line-clamp-1">{c.name}</h3>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.status === "sent"
                        ? "bg-emerald-50 text-emerald-700"
                        : c.status === "scheduled"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                {/* Target Segment */}
                <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>Segment: </span>
                  <span className="font-semibold text-slate-800">{c.target_segment}</span>
                </div>

                {/* Content preview snippet */}
                <p className="mt-2.5 text-xs text-slate-500 line-clamp-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                  {c.subject ? <strong className="text-slate-700 block mb-0.5">{c.subject}</strong> : null}
                  {c.message_body}
                </p>

                {/* Conversion metrics pill if sent */}
                {c.metrics && c.status === "sent" && (
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400">Delivered</span>
                      <span className="font-bold text-emerald-600">{c.metrics.delivered ?? c.sent_count}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400">Clicks</span>
                      <span className="font-bold text-indigo-600">{c.metrics.clicks ?? 0}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400">Sales</span>
                      <span className="font-bold text-slate-900">
                        ₹{(((c.metrics.estimated_revenue_paise || 0) / 100)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom control row */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">
                  {c.sent_at
                    ? `Sent ${new Date(c.sent_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                    : c.scheduled_at
                    ? `Runs ${new Date(c.scheduled_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
                    : "Draft"}
                </span>

                {c.status !== "sent" ? (
                  <button
                    onClick={() => handleDispatch(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                  >
                    <Play className="h-3 w-3" />
                    <span>Send Now</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Delivered ({c.sent_count})</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-800">No campaigns found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {search ? "Try adjusting your search criteria." : "Get started by creating your first promotional broadcast."}
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      )}

      {/* Professional Campaign Creator Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Marketing Campaign</h3>
                <p className="text-xs text-slate-500">Configure your broadcast content, channel, audience and scheduling.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">
              {/* Form Side */}
              <form onSubmit={handleCreate} className="p-6 space-y-5 lg:col-span-7 border-r border-slate-100">
                {/* Campaign Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Campaign Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekend Flash Sale 20% OFF"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Target Channel Selector */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Delivery Channel <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "whatsapp", label: "WhatsApp", icon: Smartphone, color: "text-emerald-600" },
                      { id: "sms", label: "SMS", icon: MessageSquare, color: "text-amber-600" },
                      { id: "email", label: "Email", icon: Mail, color: "text-violet-600" },
                    ].map((ch) => {
                      const Icon = ch.icon;
                      const active = formChannel === ch.id;
                      return (
                        <button
                          type="button"
                          key={ch.id}
                          onClick={() => setFormChannel(ch.id as any)}
                          className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${
                            active
                              ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm ring-1 ring-indigo-600"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${ch.color}`} />
                          <span>{ch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Target Segment */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Target Audience Segment <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-bold text-indigo-600">
                      {activeSegmentObj?.estimated_count ?? 0} recipients estimated
                    </span>
                  </div>
                  <select
                    value={formSegment}
                    onChange={(e) => setFormSegment(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.name}>
                        {seg.name} ({seg.estimated_count} contacts)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {activeSegmentObj?.description || "Online store buyers & POS counter customers."}
                  </p>
                </div>

                {/* Template Preset Selector */}
                {templates.filter((t) => t.channel === formChannel).length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Use Preset Template (Optional)
                    </label>
                    <select
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      defaultValue=""
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Choose a template to autofill --</option>
                      {templates
                        .filter((t) => t.channel === formChannel)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Email Subject if Email channel */}
                {formChannel === "email" && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Email Subject <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Exclusive Weekend Treat Just For You!"
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Message Content <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formBody.length} chars {formChannel === "sms" ? `(${Math.ceil(formBody.length / 160)} SMS)` : ""}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your broadcast message here..."
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  {/* Dynamic Tags Insertion */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Personalize:</span>
                    {["{{customer_name}}", "{{store_name}}", "{{store_url}}", "{{discount_code}}"].map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setFormBody((prev) => prev + " " + tag)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Send Now vs Schedule */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={formSendNow}
                        onChange={() => setFormSendNow(true)}
                        name="dispatch_mode"
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Dispatch Instantly</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formSendNow}
                        onChange={() => setFormSendNow(false)}
                        name="dispatch_mode"
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Schedule for Later</span>
                    </label>
                  </div>

                  {!formSendNow && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Select Broadcast Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        required={!formSendNow}
                        value={formScheduleTime}
                        onChange={(e) => setFormScheduleTime(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {creating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : formSendNow ? (
                      <Send className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    <span>{formSendNow ? "Dispatch Campaign" : "Schedule Campaign"}</span>
                  </button>
                </div>
              </form>

              {/* Live Preview & Test Sending Side */}
              <div className="p-6 bg-slate-50/50 flex flex-col justify-between space-y-6 lg:col-span-5">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Live Customer Preview
                    </span>
                    <span className="text-[11px] font-semibold text-indigo-600 capitalize">
                      {formChannel} Mockup
                    </span>
                  </div>

                  {/* WhatsApp Handset Preview */}
                  {formChannel === "whatsapp" && (
                    <div className="mt-4 mx-auto max-w-[280px] rounded-3xl border-4 border-slate-800 bg-[#EFEAE2] p-3 shadow-xl text-xs">
                      <div className="mb-2 flex items-center justify-between border-b border-[#075E54]/20 pb-1.5 text-[10px] text-slate-600">
                        <span className="font-bold text-[#075E54]">Official Store Channel</span>
                        <span>12:30 PM</span>
                      </div>
                      <div className="rounded-xl bg-white p-3 shadow-sm text-slate-800 space-y-2">
                        <p className="whitespace-pre-wrap font-sans text-xs text-slate-500 italic">
                          {formBody || "Enter message content on the left to preview..."}
                        </p>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-emerald-600 font-semibold">
                          <span>Visit Online Store</span>
                          <ExternalLink className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SMS Handset Preview */}
                  {formChannel === "sms" && (
                    <div className="mt-4 mx-auto max-w-[280px] rounded-3xl border-4 border-slate-800 bg-slate-100 p-3 shadow-xl text-xs">
                      <div className="mb-2 text-center text-[10px] font-bold text-slate-500">
                        SMS · VM-SELFX
                      </div>
                      <div className="rounded-2xl bg-blue-600 p-3 shadow-sm text-white">
                        <p className="whitespace-pre-wrap font-sans text-xs">
                          {formBody || "Enter SMS text to see live preview..."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Email Preview */}
                  {formChannel === "email" && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
                      <div className="border-b border-slate-100 pb-2 mb-2">
                        <p className="text-[10px] text-slate-400">Subject:</p>
                        <p className="font-bold text-slate-900">{formSubject || "Enter email subject..."}</p>
                      </div>
                      <div className="prose prose-sm text-slate-700 whitespace-pre-wrap">
                        {formBody || "Enter email body to preview..."}
                      </div>
                    </div>
                  )}
                </div>

                {/* Send a Test Message box */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Send a Test Message</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dispatch a sample directly to your phone/email to verify styling and wording.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={formChannel === "email" ? "admin@yourstore.com" : "+91 98765 43210"}
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleTestSend}
                      disabled={testSending}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                      {testSending ? "Sending..." : "Test"}
                    </button>
                  </div>
                  {testSuccessMsg && (
                    <p className="text-[11px] font-medium text-emerald-600 animate-in fade-in">
                      {testSuccessMsg}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
