"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/format";

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

type Counts = { all: number; days90: number; days30: number; days7: number };

type StoreRow = {
  shop: string;
  name: string;
  url: string;
  email: string;
  planDisplayName: string;
  country: string | null;
  byType: {
    priceDrop: Counts;
    backInStock: Counts;
    lowInventory: Counts;
    keptTooLong: Counts;
  };
};

type Period = "7" | "30" | "90" | "all";
type SortKey = "total" | "priceDrop" | "backInStock" | "lowInventory" | "keptTooLong" | "name";

export default function TopEmailsView({ stores }: { stores: StoreRow[] }) {
  const [period, setPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const computed = useMemo(() => {
    const key = period === "7" ? "days7" : period === "30" ? "days30" : period === "90" ? "days90" : "all";
    return stores.map((s) => {
      const priceDrop = s.byType.priceDrop[key];
      const backInStock = s.byType.backInStock[key];
      const lowInventory = s.byType.lowInventory[key];
      const keptTooLong = s.byType.keptTooLong[key];
      return { ...s, priceDrop, backInStock, lowInventory, keptTooLong, total: priceDrop + backInStock + lowInventory + keptTooLong };
    });
  }, [stores, period]);

  const totals = useMemo(() => {
    return computed.reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        priceDrop: acc.priceDrop + s.priceDrop,
        backInStock: acc.backInStock + s.backInStock,
        lowInventory: acc.lowInventory + s.lowInventory,
        keptTooLong: acc.keptTooLong + s.keptTooLong,
      }),
      { total: 0, priceDrop: 0, backInStock: 0, lowInventory: 0, keptTooLong: 0 }
    );
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
          s.email.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const cmp = sortKey === "name" ? a.name.localeCompare(b.name) : a[sortKey] - b[sortKey];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result.slice(0, 50);
  }, [computed, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function exportCSV() {
    const header = ["Rank", "Store Name", "Shop URL", "Total Emails", "Price Drop", "Back in Stock", "Low Inventory", "Kept Too Long", "Plan", "Email"];
    const rows = filtered.map((s, i) => [
      i + 1, s.name, s.url, s.total, s.priceDrop, s.backInStock, s.lowInventory, s.keptTooLong, s.planDisplayName, s.email,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `top-email-stores-${period === "all" ? "all-time" : period + "days"}.csv`;
    a.click();
  }

  const periodLabel = period === "all" ? "all time" : `${period} day`;

  const cards = [
    { label: "Total Emails Sent", value: totals.total, accent: "#ffffff" },
    { label: "Price Drop", value: totals.priceDrop, accent: "#818cf8" },
    { label: "Back in Stock", value: totals.backInStock, accent: "#34d399" },
    { label: "Low Inventory", value: totals.lowInventory, accent: "#fbbf24" },
    { label: "Kept Too Long", value: totals.keptTooLong, accent: "#f472b6" },
  ];

  const columns: { key: SortKey | null; label: string }[] = [
    { key: "name", label: "Store Name" },
    { key: "total", label: "Total Emails" },
    { key: "priceDrop", label: "Price Drop" },
    { key: "backInStock", label: "Back in Stock" },
    { key: "lowInventory", label: "Low Inventory" },
    { key: "keptTooLong", label: "Kept Too Long" },
    { key: null, label: "View Analytics" },
    { key: null, label: "Plan" },
  ];

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "#080808" }}>
      <div className="max-w-screen-xl mx-auto">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 px-3 py-1.5 rounded-lg transition-colors" style={{ border: "1px solid #2a2a2a" }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Reminder Emails by Store</h1>
            <p className="text-zinc-500 text-sm mt-1">Stores ranked by reminder emails sent — top 50 for the selected period</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white border border-[#2a2a2a] hover:border-zinc-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
            <Link href="/" className="px-4 py-2 rounded-lg text-sm text-white border border-zinc-600 hover:border-white">
              Back to All Stores
            </Link>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <p className="text-sm text-zinc-400 mb-2">{c.label}</p>
              <p className="text-3xl font-bold" style={{ color: c.accent }}>{formatNumber(c.value)}</p>
              <p className="text-xs text-zinc-500 mt-1">{periodLabel} total</p>
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">#</th>
                  {columns.map((col) => (
                    <th
                      key={col.label}
                      onClick={() => col.key && handleSort(col.key)}
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
                    <td className="px-4 py-3 text-zinc-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3 text-white font-semibold">{formatNumber(s.total)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatNumber(s.priceDrop)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatNumber(s.backInStock)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatNumber(s.lowInventory)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatNumber(s.keptTooLong)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/shops/${encodeURIComponent(s.shop)}`} className="text-blue-400 hover:underline whitespace-nowrap">
                        View Analytics
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{s.planDisplayName}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-16 text-center text-zinc-500">No results.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-zinc-600 px-4 py-3 border-t border-[#1f1f1f] leading-relaxed">
            Counts built-in reminder emails actually sent via WishlistSuite (Brevo). Klaviyo/Omnisend-only sends aren&apos;t logged and aren&apos;t counted.
            Kept Too Long is de-duplicated to one digest email per customer per day.
          </p>
        </div>
      </div>
    </div>
  );
}
