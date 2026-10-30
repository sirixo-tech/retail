"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  X,
  FileCode,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { MarketingNav } from "../marketing-nav";

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  created_at: string;
}

export default function SmsTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("promotional");
  const [content, setContent] = useState("");
  const [dltId, setDltId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadTemplates() {
    try {
      const res = await fetch("/api/v1/marketing/templates?channel=sms", { credentials: "include" });
      const json = await res.json();
      if (json.data) setTemplates(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/marketing/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channel: "sms",
          name,
          category,
          content,
          meta_payload: dltId ? { dlt_template_id: dltId } : null,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setToast("SMS Template saved successfully!");
        setShowModal(false);
        setName("");
        setContent("");
        setDltId("");
        loadTemplates();
      }
    } catch (err) {
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this SMS template?")) return;
    try {
      await fetch(`/api/v1/marketing/templates/${id}`, { method: "DELETE", credentials: "include" });
      setToast("Template removed.");
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const charCount = content.length;
  const smsCount = charCount === 0 ? 0 : Math.ceil(charCount / 160);

  return (
    <div className="space-y-6 pb-12">
      <MarketingNav
        title="SMS Templates"
        subtitle="Manage DLT-compliant SMS marketing messages with dynamic variables and character limits."
        actionButton={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create SMS Template</span>
          </button>
        }
      />

      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1">{tpl.name}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {tpl.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopy(tpl.content, tpl.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Copy template text"
                  >
                    {copiedId === tpl.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete template"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                {tpl.content}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>{tpl.content.length} characters</span>
                <span className="font-medium text-amber-600">
                  {Math.ceil(tpl.content.length / 160)} SMS Part(s)
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" /> DLT Ready
              </span>
              <span className="text-slate-400 font-mono">
                {new Date(tpl.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create SMS Template</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Template Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Order Delivery Alert"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="promotional">Promotional</option>
                    <option value="transactional">Transactional</option>
                    <option value="otp">OTP / Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    DLT Template ID (TRAI)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 14071612345678"
                    value={dltId}
                    onChange={(e) => setDltId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Message Content <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs font-mono text-slate-400">
                    {charCount} chars · {smsCount} SMS
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Dear {{customer_name}}, special offer..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none font-mono"
                />

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Insert tag:</span>
                  {["{{customer_name}}", "{{store_name}}", "{{store_url}}", "{{discount_code}}"].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setContent((prev) => prev + " " + tag)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Template</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
