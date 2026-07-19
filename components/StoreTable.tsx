"use client";
import { useState, useMemo, ReactNode } from "react";
import Link from "next/link";
import { formatCurrency, formatNumber } from "@/lib/format";

function SortIcon({ dir }: { dir: "asc" | "desc" | null }) {
  return (
    <svg className="w-3.5 h-3.5 inline ml-1 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {dir === "asc" ? (
        <polyline points="18 15 12 9 6 15" />
      ) : dir === "desc" ? (
        <polyline points="6 9 12 15 18 9" />
      ) : (
        <>
          <polyline points="18 15 12 9 6 15" opacity="0.4" />
          <polyline points="6 17 12 23 18 17" opacity="0.4" />
        </>
      )}
    </svg>
  );
}

export type PeriodStat = { revenue: number; orders: number };

export type StoreRow = {
  shop: string;
  name: string;
  url: string;
  country: string | null;
  currencyCode: string;
  email: string;
  planDisplayName: string;
  wishlist_count: number;
  stats: { days7: PeriodStat; days30: PeriodStat; days90: PeriodStat; all: PeriodStat };
};

export type Period = "7" | "30" | "90" | "all";

export default function StoreTable({
  stores,
  title,
  subtitle,
  csvPrefix,
  extraHeaderActions,
  secondaryBackLink,
}: {
  stores: StoreRow[];
  title: string;
  subtitle: string;
  csvPrefix: string;
  extraHeaderActions?: ReactNode;
  secondaryBackLink?: { href: string; label: string };
}) {
  const [period, setPeriod] = useState<Period>("7");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"revenue" | "orders" | "name" | "country">("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const computed = useMemo(() => {
    const key = period === "7" ? "days7" : period === "30" ? "days30" : period === "90" ? "days90" : "all";
    return stores.map((s) => ({ ...s, revenue: s.stats[key].revenue, orders: s.stats[key].orders }));
  }, [stores, period]);

  const totals = useMemo(() => {
    const revenue = computed.reduce((sum, s) => sum + s.revenue, 0);
    const orders = computed.reduce((sum, s) => sum + s.orders, 0);
    const aov = orders > 0 ? revenue / orders : 0;
    return { revenue, orders, aov };
  }, [computed]);

  const filtered = useMemo(() => {
    let result = [...computed];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.url.toLowerCase().includes(q) ||
          s.shop.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.country?.toLowerCase().includes(q) ?? false)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "revenue") cmp = a.revenue - b.revenue;
      else if (sortKey === "orders") cmp = a.orders - b.orders;
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "country") cmp = (a.country ?? "").localeCompare(b.country ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result.slice(0, 100);
  }, [computed, search, sortKey, sortDir]);

  function handleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function exportCSV() {
    const header = ["Store Name", "Shop URL", "Revenue", "Orders", "Country", "Plan", "Email"];
    const rows = filtered.map((s) => [
      s.name, s.url, s.revenue.toFixed(2), s.orders, s.country ?? "", s.planDisplayName, s.email,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${csvPrefix}-${period}days.csv`;
    a.click();
  }

  const periodLabel = period === "all" ? "all time" : `${period} day`;

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{title} ({filtered.length})</h1>
          <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white border border-[#2a2a2a] hover:border-zinc-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
          {extraHeaderActions}
          {secondaryBackLink && (
            <Link href={secondaryBackLink.href} className="px-4 py-2 rounded-lg text-sm text-white border border-zinc-600 hover:border-white">
              {secondaryBackLink.label}
            </Link>
          )}
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: "#1a1a1a" }}>
        {(["7", "30", "90", "all"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === p ? "bg-white text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            {p === "all" ? "All Time" : `${p} Days`}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: "$", label: "Total Revenue", value: formatCurrency(totals.revenue), sub: `${periodLabel} total` },
          { icon: "🛒", label: "Total Conversions", value: formatNumber(totals.orders), sub: "Wishlist purchases" },
          { icon: "↗", label: "Average Order Value", value: formatCurrency(totals.aov), sub: "Per conversion" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-zinc-400 mb-2">{c.label}</p>
                <p className="text-3xl font-bold text-white">{c.value}</p>
                <p className="text-xs text-zinc-500 mt-1">{c.sub}</p>
              </div>
              <span className="text-zinc-600 text-xl">{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        {/* Search */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <div className="relative max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
              style={{ background: "#111", border: "1px solid #2a2a2a" }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-xs text-zinc-500">
                {[
                  { key: "name", label: "Store Name" },
                  { key: "url", label: "Shop URL" },
                  { key: "revenue", label: "Revenue" },
                  { key: "orders", label: "Conversions" },
                  { key: "country", label: "Country" },
                  { key: null, label: "View Analytics" },
                  { key: null, label: "Plan" },
                  { key: null, label: "Email" },
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={() => col.key && handleSort(col.key as typeof sortKey)}
                    className={`px-4 py-3 text-left text-sm font-medium text-zinc-400 whitespace-nowrap ${col.key ? "cursor-pointer hover:text-zinc-200 select-none" : ""}`}
                  >
                    {col.label}
                    {col.key && <SortIcon dir={sortKey === col.key ? sortDir : null} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.shop} className="border-b border-[#1f1f1f] transition-colors"
                  style={{ background: i % 2 === 0 ? "#0f0f0f" : "#141414" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1c1c1c")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#0f0f0f" : "#141414")}
                >
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{s.name}</td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">{s.url}</td>
                  <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{formatCurrency(s.revenue)}</td>
                  <td className="px-4 py-3 text-zinc-300">{formatNumber(s.orders)}</td>
                  <td className="px-4 py-3 text-zinc-400">{s.country ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/shops/${encodeURIComponent(s.shop)}`} className="text-blue-400 hover:underline whitespace-nowrap">
                      View Analytics
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{s.planDisplayName}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{s.email}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-zinc-500">No results.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
