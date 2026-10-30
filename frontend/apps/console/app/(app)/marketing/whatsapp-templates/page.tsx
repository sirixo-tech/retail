"use client";

import { useEffect, useState } from "react";
import {
  Smartphone,
  Plus,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  X,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Link2,
} from "lucide-react";
import { MarketingNav } from "../marketing-nav";

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  meta_payload?: {
    header_type?: string;
    header_text?: string;
    buttons?: Array<{ type: string; text: string; url?: string }>;
    meta_status?: string;
  };
  created_at: string;
}

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("marketing");
  const [headerText, setHeaderText] = useState("");
  const [content, setContent] = useState("");
  const [ctaButtonText, setCtaButtonText] = useState("Visit Store");
  const [ctaButtonUrl, setCtaButtonUrl] = useState("https://store.selfx.in");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function loadTemplates() {
    try {
      const res = await fetch("/api/v1/marketing/templates?channel=whatsapp", { credentials: "include" });
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
      const metaPayload = {
        header_type: headerText ? "TEXT" : "NONE",
        header_text: headerText || null,
        buttons: ctaButtonText ? [{ type: "URL", text: ctaButtonText, url: ctaButtonUrl }] : [],
        meta_status: "APPROVED",
      };

      const res = await fetch("/api/v1/marketing/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          channel: "whatsapp",
          name,
          category,
          content,
          meta_payload: metaPayload,
        }),
      });

      const json = await res.json();
      if (json.data) {
        setToast("WhatsApp template registered and approved for dispatch!");
        setShowModal(false);
        setName("");
        setHeaderText("");
        setContent("");
        loadTemplates();
      }
    } catch (err) {
      alert("Failed to save WhatsApp template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this WhatsApp template?")) return;
    try {
      await fetch(`/api/v1/marketing/templates/${id}`, { method: "DELETE", credentials: "include" });
      setToast("Template deleted.");
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <MarketingNav
        title="WhatsApp Templates"
        subtitle="Meta Cloud API verified rich message templates with buttons, interactive headers, and personalized variables."
        actionButton={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-500 hover:shadow-emerald-500/25 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create WhatsApp Template</span>
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

      {/* WhatsApp Templates Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1">{tpl.name}</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {tpl.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Approved
                  </span>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 ml-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Handset Bubble Mock */}
              <div className="mt-4 rounded-2xl bg-[#EFEAE2] p-3 text-xs shadow-inner">
                <div className="rounded-xl bg-white p-3 shadow-sm space-y-2">
                  {tpl.meta_payload?.header_text && (
                    <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                      {tpl.meta_payload.header_text}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-slate-800 leading-relaxed font-sans">
                    {tpl.content}
                  </p>
                  {tpl.meta_payload?.buttons && tpl.meta_payload.buttons.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      {tpl.meta_payload.buttons.map((btn, bIdx) => (
                        <div
                          key={bIdx}
                          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-[11px] font-bold text-emerald-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{btn.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Meta Cloud API Synced</span>
              <span>{new Date(tpl.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create WhatsApp Template</h3>
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
                  placeholder="e.g. order_delivered_feedback"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Header Text (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SPECIAL OFFER FROM BANGALORE STORE"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Body Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Hi {{customer_name}}, your order has shipped! Shop more at {{store_url}}."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none font-mono"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Insert tag:</span>
                  {["{{customer_name}}", "{{store_name}}", "{{store_url}}", "{{discount_code}}"].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => setContent((prev) => prev + " " + tag)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Call-To-Action (CTA) Button</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Button Label (e.g. Order Online)"
                    value={ctaButtonText}
                    onChange={(e) => setCtaButtonText(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Website URL"
                    value={ctaButtonUrl}
                    onChange={(e) => setCtaButtonUrl(e.target.value)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  />
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
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
