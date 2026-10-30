"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  ShoppingBag,
  Sparkles,
  Plus,
  Clock,
  ArrowRight,
  TrendingUp,
  Filter,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import { MarketingNav } from "../marketing-nav";

interface Segment {
  id: string;
  name: string;
  description: string;
  estimated_count: number;
  rules?: any;
  created_at: string;
}

export default function MarketingSegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [criteria, setCriteria] = useState("all");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function loadSegments() {
    try {
      const res = await fetch("/api/v1/marketing/segments", { credentials: "include" });
      const json = await res.json();
      if (json.data) {
        setSegments(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSegments();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/v1/marketing/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          description,
          rules: { criteria },
        }),
      });
      const json = await res.json();
      if (json.data) {
        setToast("New audience segment created successfully!");
        setShowCreateModal(false);
        setName("");
        setDescription("");
        loadSegments();
      }
    } catch (err) {
      alert("Failed to create segment");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <MarketingNav
        title="Customer Segments"
        subtitle="Group your online store buyers and POS counter shoppers into targeted segments for personalized promotions."
        actionButton={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Custom Segment</span>
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

      {/* Segments Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {segments.map((seg) => (
          <div
            key={seg.id}
            className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  {seg.estimated_count} contacts
                </span>
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-900">{seg.name}</h3>
              <p className="mt-1 text-xs text-slate-500">{seg.description}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Dynamic sync active</span>
              <Link
                href={`/marketing/campaigns?new=true&segment=${encodeURIComponent(seg.name)}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100"
              >
                <span>Target Segment</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Segment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Create Audience Segment</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Segment Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwalii High Spenders"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the audience criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Target Rule Criteria
                </label>
                <select
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="all">All Store Customers</option>
                  <option value="online_orders">Online Store Shoppers only</option>
                  <option value="high_spenders">Total spend &gt; ₹5,000</option>
                  <option value="inactive_30_days">Inactive for more than 30 days</option>
                  <option value="frequent_shoppers">Placed 3 or more orders</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {creating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Segment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
