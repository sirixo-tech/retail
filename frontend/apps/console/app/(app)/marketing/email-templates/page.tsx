"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  X,
  Eye,
  FileCode,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { MarketingNav } from "../marketing-nav";

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  content: string;
  created_at: string;
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("promotional");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewTpl, setPreviewTpl] = useState<EmailTemplate | null>(null);

  async function loadTemplates() {
    try {
      const res = await fetch("/api/v1/marketing/templates?channel=email", { credentials: "include" });
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
          channel: "email",
          name,
          category,
          subject,
          content,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setToast("Email template created successfully!");
        setShowModal(false);
        setName("");
        setSubject("");
        setContent("");
        loadTemplates();
      }
    } catch (err) {
      alert("Failed to save email template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this Email template?")) return;
    try {
      await fetch(`/api/v1/marketing/templates/${id}`, { method: "DELETE", credentials: "include" });
      setToast("Template removed.");
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <MarketingNav
        title="Email Templates"
        subtitle="HTML email templates for store launches, product drops, and customer retention campaigns."
        actionButton={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-violet-500 hover:shadow-violet-500/25 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Email Template</span>
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

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
                    <Mail className="h-5 w-5" />
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
                    onClick={() => setPreviewTpl(tpl)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    title="Preview Email"
                  >
                    <Eye className="h-4 w-4" />
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

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Subject Line:
                </span>
                <p className="text-xs font-semibold text-slate-900 line-clamp-1">{tpl.subject}</p>
                <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans">
                  {tpl.content}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Responsive HTML</span>
              <span>{new Date(tpl.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Email Preview</span>
                <h3 className="font-bold text-slate-900">{previewTpl.name}</h3>
              </div>
              <button onClick={() => setPreviewTpl(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <span className="font-semibold text-slate-500">Subject: </span>
                <span className="font-bold text-slate-900">{previewTpl.subject}</span>
              </div>
              <div className="rounded-xl border border-slate-200 p-6 bg-white prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                {previewTpl.content}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create Email Template</h3>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
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
                  placeholder="e.g. VIP Secret Sale Invite"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Subject Line <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 🌟 Private 25% Off for {{customer_name}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Email Body Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Hello {{customer_name}},\n\nWe wanted to share an exclusive treat..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-violet-500 focus:outline-none font-sans"
                />

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Insert tag:</span>
                  {["{{customer_name}}", "{{store_name}}", "{{store_url}}", "{{discount_code}}"].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setContent((prev) => prev + " " + tag)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-600 hover:bg-violet-50 hover:text-violet-700"
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-50"
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
