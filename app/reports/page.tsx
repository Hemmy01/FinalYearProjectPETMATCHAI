"use client";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import { FileText, Download, Filter, Loader2, Users, Store, Wallet, CalendarRange, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api-client";
import type { ReportMeta } from "@/lib/pdf-report";

type ReportKey = "buyers" | "sellers" | "finance";
type ReportData = { summary: Record<string, number>; rows: Record<string, any>[] };

const naira = (n: number) => `₦${Math.round(Number(n ?? 0)).toLocaleString()}`;
const shortDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const FINANCE_STATUS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid_escrow", label: "In Escrow" },
  { value: "released", label: "Released" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLE: Record<string, string> = {
  released: "bg-green-100 text-green-700",
  paid_escrow: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  refunded: "bg-amber-100 text-amber-700",
  cancelled: "bg-gray-100 text-gray-600",
};

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === "administrator";

  // Report types available to this role.
  const available: { key: ReportKey; label: string; icon: any; adminTitle: string; selfTitle: string; subtitle: string }[] = useMemo(() => {
    const buyers = { key: "buyers" as const, icon: Users, label: isAdmin ? "Buyers" : "My Activity", adminTitle: "Buyers Report", selfTitle: "My Buyer Report", subtitle: isAdmin ? "Registered buyers and their offer & purchase activity" : "Your offers and completed purchases on PetMatchAI" };
    const sellers = { key: "sellers" as const, icon: Store, label: isAdmin ? "Sellers" : "My Performance", adminTitle: "Sellers Report", selfTitle: "My Seller Report", subtitle: isAdmin ? "Seller listings, sales and revenue performance" : "Your listings, sales and revenue performance" };
    const finance = { key: "finance" as const, icon: Wallet, label: isAdmin ? "Finance" : "My Payments", adminTitle: "Finance Report", selfTitle: "My Payments Report", subtitle: isAdmin ? "Escrow transactions, settlement and platform value" : "Your escrow transactions and settlement history" };
    if (isAdmin) return [buyers, sellers, finance];
    if (user?.role === "seller") return [sellers, finance];
    return [buyers, finance];
  }, [isAdmin, user?.role]);

  const [type, setType] = useState<ReportKey>("buyers");
  useEffect(() => { if (available.length && !available.some((r) => r.key === type)) setType(available[0].key); }, [available, type]);
  const active = available.find((r) => r.key === type) ?? available[0];

  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState("2020-01-01");
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("all");
  // Overall mode ignores the date inputs entirely and reports the full history.
  const [allTime, setAllTime] = useState(true);

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Reset the loaded preview whenever the report definition changes.
  useEffect(() => { setData(null); setError(""); }, [type, from, to, status, allTime]);

  const presets: { label: string; range: () => [string, string] }[] = [
    { label: "Since 2020", range: () => ["2020-01-01", today] },
    { label: "This year", range: () => [`${new Date().getFullYear()}-01-01`, today] },
    { label: "Last 12 months", range: () => [new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10), today] },
    { label: "Last 30 days", range: () => [new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), today] },
  ];

  // Picking a preset or typing a date implies you want a bounded period.
  function applyRange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom); setTo(nextTo); setAllTime(false);
  }

  function buildParams() {
    const p = new URLSearchParams({ type });
    if (allTime) p.set("allTime", "1");
    else { p.set("from", from); p.set("to", to); }
    if (type === "finance") p.set("status", status);
    return p.toString();
  }

  async function fetchData(): Promise<ReportData | null> {
    const res = await api.get(`/api/reports?${buildParams()}`);
    if (res.error) { setError(res.error); return null; }
    return { summary: res.summary ?? {}, rows: res.rows ?? [] };
  }

  async function preview() {
    setLoading(true); setError(""); setData(null);
    const d = await fetchData();
    if (d) setData(d);
    setLoading(false);
  }

  function reportMeta(): ReportMeta {
    const period = allTime
      ? "Overall — complete history (no date limit)"
      : `${shortDate(from)}  to  ${shortDate(to)}`;
    const filters: string[] = [];
    if (type === "finance") filters.push(`Status: ${FINANCE_STATUS.find((s) => s.value === status)?.label ?? "All"}`);
    // Ratings are the seller's standing today, not a figure earned in the window.
    if (type === "sellers") filters.push("Rating: all-time, not period-bound");
    if (!allTime) filters.push("Listed: joined or active in period");
    return {
      title: isAdmin ? active.adminTitle : active.selfTitle,
      subtitle: active.subtitle,
      period,
      scope: isAdmin ? "Platform-wide" : "Your account",
      preparedBy: `${user?.name || user?.email || "User"} (${isAdmin ? "Administrator" : user?.role})`,
      filters: filters.length ? filters : undefined,
    };
  }

  async function downloadPdf() {
    setGenerating(true); setError("");
    try {
      const d = data ?? (await fetchData());
      if (!d) { setGenerating(false); return; }
      if (!data) setData(d);
      const meta = reportMeta();
      const mod = await import("@/lib/pdf-report");
      if (type === "buyers") await mod.buildBuyersReport(d as any, meta);
      else if (type === "sellers") await mod.buildSellersReport(d as any, meta);
      else await mod.buildFinanceReport(d as any, meta);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the PDF.");
    }
    setGenerating(false);
  }

  if (authLoading) {
    return <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-600" /></div>;
  }
  if (!user) {
    return <div className="text-center py-16 text-sm text-gray-500">Please sign in to generate reports.</div>;
  }

  // KPI + column definitions per report type (drives the on-screen preview).
  const kpis = data ? kpiCards(type, data.summary) : [];
  const preview_table = data ? previewTable(type, data.rows) : null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText size={22} className="text-blue-600" /> Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? "Generate branded PDF reports for Buyers, Sellers and Finance — filtered by any date range."
              : "Generate a branded PDF report of your own activity on PetMatchAI."}
          </p>
        </div>
      </div>

      {/* Report type switch */}
      <div className="flex flex-wrap gap-2 mb-5">
        {available.map((r) => {
          const Icon = r.icon;
          const on = r.key === type;
          return (
            <button key={r.key} onClick={() => setType(r.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                on ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
              <Icon size={16} /> {r.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Filters</h2>
          <span className="text-xs text-gray-400">Choose a period, then preview or download the PDF</span>
        </div>

        {/* Overall vs date range */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setAllTime(true)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              allTime ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <Globe size={12} /> Overall (all time)
          </button>
          <button onClick={() => setAllTime(false)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              !allTime ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            <CalendarRange size={12} /> Date range
          </button>
        </div>

        {/* Presets */}
        <div className={`flex flex-wrap gap-2 mb-4 ${allTime ? "opacity-40 pointer-events-none" : ""}`}>
          {presets.map((p) => {
            const [pf, pt] = p.range();
            const on = !allTime && from === pf && to === pt;
            return (
              <button key={p.label} onClick={() => applyRange(pf, pt)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  on ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                <CalendarRange size={12} /> {p.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={allTime ? "opacity-40" : ""}>
            <label className="block text-xs text-gray-500 mb-1 font-medium">From</label>
            <input type="date" value={from} max={to} disabled={allTime}
              onChange={(e) => applyRange(e.target.value, to)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed" />
          </div>
          <div className={allTime ? "opacity-40" : ""}>
            <label className="block text-xs text-gray-500 mb-1 font-medium">To</label>
            <input type="date" value={to} min={from} max={today} disabled={allTime}
              onChange={(e) => applyRange(from, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed" />
          </div>
          {type === "finance" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Payment status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {FINANCE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <button onClick={preview} disabled={loading || generating}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />} Preview
          </button>
          <button onClick={downloadPdf} disabled={generating || loading}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download PDF
          </button>
          <span className="text-xs text-gray-400">
            {allTime
              ? "Overall report — every record, no date limit."
              : `Covering ${shortDate(from)} to ${shortDate(to)} — people who joined or were active in that window.`}
          </span>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      </div>

      {/* Preview */}
      {data && (
        <div className="space-y-5">
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpis.map((k) => (
                <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-3">
                  <p className="text-[11px] text-gray-500 uppercase tracking-wide">{k.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5 leading-tight">{k.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-sm">{active.adminTitle.replace(" Report", "")} — Preview</h2>
              <span className="text-xs text-gray-400">{data.rows.length} record{data.rows.length === 1 ? "" : "s"}</span>
            </div>
            {data.rows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No records match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs">
                    <tr>{preview_table!.head.map((h) => <th key={h} className="text-left px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview_table!.body.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {row.map((cell, j) => <td key={j} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.rows.length > 50 && (
                  <p className="text-xs text-gray-400 text-center py-3 border-t border-gray-100">
                    Showing first 50 of {data.rows.length}. The PDF includes all records.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Preview shapers (mirror the PDF columns) ── */

function kpiCards(type: ReportKey, s: Record<string, number>): { label: string; value: string }[] {
  if (type === "buyers") return [
    { label: "Total Buyers", value: (s.totalBuyers ?? 0).toLocaleString() },
    { label: "Active Buyers", value: (s.activeBuyers ?? 0).toLocaleString() },
    { label: "Offers Made", value: (s.totalOffers ?? 0).toLocaleString() },
    { label: "Purchases", value: (s.totalPurchases ?? 0).toLocaleString() },
    { label: "Total Spent", value: naira(s.totalSpent ?? 0) },
  ];
  if (type === "sellers") return [
    { label: "Total Sellers", value: (s.totalSellers ?? 0).toLocaleString() },
    { label: "Active Sellers", value: (s.activeSellers ?? 0).toLocaleString() },
    { label: "Listings", value: (s.totalListings ?? 0).toLocaleString() },
    { label: "Pets Sold", value: (s.totalSold ?? 0).toLocaleString() },
    { label: "Total Views", value: (s.totalViews ?? 0).toLocaleString() },
    { label: "Revenue", value: naira(s.totalRevenue ?? 0) },
  ];
  return [
    { label: "Transactions", value: (s.count ?? 0).toLocaleString() },
    { label: "Gross Value", value: naira(s.gmv ?? 0) },
    { label: "Released", value: naira(s.released ?? 0) },
    { label: "In Escrow", value: naira(s.inEscrow ?? 0) },
    { label: "Refunded", value: naira(s.refunded ?? 0) },
    { label: "Pending", value: naira(s.pending ?? 0) },
  ];
}

function previewTable(type: ReportKey, rows: Record<string, any>[]): { head: string[]; body: ReactNode[][] } {
  if (type === "buyers") return {
    head: ["#", "Buyer", "Email", "Location", "Joined", "Offers", "Purchases", "Total Spent"],
    body: rows.map((r, i) => [i + 1, r.name || "—", r.email || "—", r.location || "—", shortDate(r.joinedAt), r.offers, r.purchases, naira(r.spent)]),
  };
  if (type === "sellers") return {
    head: ["#", "Seller", "Email", "Listings", "Active", "Sold", "Views", "Revenue", "Rating*"],
    body: rows.map((r, i) => [i + 1, r.name || "—", r.email || "—", r.listings, r.active, r.sold, r.views, naira(r.revenue), r.rating ? `${r.rating.toFixed(1)}/5` : "—"]),
  };
  return {
    head: ["Date", "Reference", "Buyer", "Seller", "Pet", "Amount", "Method", "Status"],
    body: rows.map((r) => [
      shortDate(r.date),
      <span key="ref" className="font-mono text-[11px] text-gray-500">{r.reference}</span>,
      r.buyer || "—", r.seller || "—", r.pet || "—", naira(r.amount),
      <span key="m" className="capitalize">{r.provider || "—"}</span>,
      <span key="s" className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600"}`}>{String(r.status).replace("_", " ")}</span>,
    ]),
  };
}
