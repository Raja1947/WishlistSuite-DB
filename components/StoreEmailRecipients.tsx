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

type Recipient = {
  customerId: string;
  email: string | null;
  priceDrop: Counts;
  backInStock: Counts;
  lowInventory: Counts;
  keptTooLong: Counts;
};

type Period = "7" | "30" | "90" | "all";
type SortKey = "total" | "priceDrop" | "backInStock" | "lowInventory" | "keptTooLong" | "email";

const MAX_ROWS = 500;

export default function StoreEmailRecipients({
  shop,
  storeName,
  recipients,
}: {
  shop: string;
  storeName: string;
  recipients: Recipient[];
}) {
  const [period, setPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const computed = useMemo(() => {
    const key = period === "7" ? "days7" : period === "30" ? "days30" : period === "90" ? "days90" : "all";
    return recipients
      .map((r) => {
        const priceDrop = r.priceDrop[key];
        const backInStock = r.backInStock[key];
        const lowInventory = r.lowInventory[key];
        const keptTooLong = r.keptTooLong[key];
        return { ...r, priceDrop, backInStock, lowInventory, keptTooLong, total: priceDrop + backInStock + lowInventory + keptTooLong };
      })
      .filter((r) => r.total > 0); // only recipients who got an email in this period
  }, [recipients, period]);

  const totals = useMemo(() => {
    return computed.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        priceDrop: acc.priceDrop + r.priceDrop,
        backInStock: acc.backInStock + r.backInStock,
        lowInventory: acc.lowInventory + r.lowInventory,
        keptTooLong: acc.keptTooLong + r.keptTooLong,
        recipients: acc.recipients + 1,
      }),
      { total: 0, priceDrop: 0, backInStock: 0, lowInventory: 0, keptTooLong: 0, recipients: 0 }
    );
  }, [computed]);

  const filtered = useMemo(() => {
    let result = [...computed];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((r) => (r.email ?? "").toLowerCase().includes(q) || r.customerId.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const cmp = sortKey === "email" ? (a.email ?? "").localeCompare(b.email ?? "") : a[sortKey] - b[sortKey];
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result.slice(0, MAX_ROWS);
  }, [computed, search, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function exportCSV() {
    const header = ["Rank", "Customer Email", "Customer ID", "Total Emails", "Price Drop", "Back in Stock", "Low Inventory", "Kept Too Long"];
    const rows = filtered.map((r, i) => [
      i + 1, r.email ?? "", r.customerId, r.total, r.priceDrop, r.backInStock, r.lowInventory, r.keptTooLong,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${shop}-email-recipients-${period === "all" ? "all-time" : period + "days"}.csv`;
    a.click();
  }

  const periodLabel = period === "all" ? "all time" : `${period} day`;

  const cards = [
    { label: "Emails Sent", value: totals.total, accent: "#ffffff" },
    { label: "Recipients", value: totals.recipients, accent: "#a1a1aa" },
    { label: "Price Drop", value: totals.priceDrop, accent: "#818cf8" },
    { label: "Back in Stock", value: totals.backInStock, accent: "#34d399" },
    { label: "Low Inventory", value: totals.lowInventory, accent: "#fbbf24" },
    { label: "Kept Too Long", value: totals.keptTooLong, accent: "#f472b6" },
  ];

  const columns: { key: SortKey | null; label: string }[] = [
    { key: "email", label: "Customer" },
    { key: "total", label: "Total Emails" },
    { key: "priceDrop", label: "Price Drop" },
    { key: "backInStock", label: "Back in Stock" },
    { key: "lowInventory", label: "Low Inventory" },
    { key: "keptTooLong", label: "Kept Too Long" },
  ];

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "#080808" }}>
      <div className="max-w-screen-xl mx-auto">
        {/* Back */}
        <Link href="/top-emails" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 px-3 py-1.5 rounded-lg transition-colors" style={{ border: "1px solid #2a2a2a" }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Email Data
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{storeName} — Email Recipients</h1>
            <p className="text-zinc-500 text-sm mt-1">Which customers received reminder emails, and how many of each type</p>
          </div>
          <div className="flex gap-3">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white border border-[#2a2a2a] hover:border-zinc-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
            <Link href={`/shops/${encodeURIComponent(shop)}`} className="px-4 py-2 rounded-lg text-sm text-white border border-zinc-600 hover:border-white">
              Store Analytics
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {cards.map((c) => (
            <div key={c.label} className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              <p className="text-sm text-zinc-400 mb-2">{c.label}</p>
              <p className="text-2xl font-bold" style={{ color: c.accent }}>{formatNumber(c.value)}</p>
              <p className="text-xs text-zinc-500 mt-1">{periodLabel}</p>
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
                placeholder="Search recipients..."
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
                {filtered.map((r, i) => (
                  <tr key={r.customerId} className="border-b border-[#1f1f1f] transition-colors"
                    style={{ background: i % 2 === 0 ? "#0f0f0f" : "#141414" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#1c1c1c")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#0f0f0f" : "#141414")}
                  >
                    <td className="px-4 py-3 text-zinc-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/top-emails/${encodeURIComponent(shop)}/${encodeURIComponent(r.customerId)}`} className="group">
                        <div className="text-blue-400 group-hover:underline font-medium">{r.email ?? "Unknown"}</div>
                        <div className="text-zinc-500 text-xs font-mono truncate max-w-[220px]">{r.customerId}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">{formatNumber(r.total)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatNumber(r.priceDrop)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatNumber(r.backInStock)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatNumber(r.lowInventory)}</td>
                    <td className="px-4 py-3 text-zinc-300">{formatNumber(r.keptTooLong)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-zinc-500">No emails sent in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-zinc-600 px-4 py-3 border-t border-[#1f1f1f] leading-relaxed">
            {computed.length > MAX_ROWS ? `Showing top ${MAX_ROWS} of ${formatNumber(computed.length)} recipients. ` : ""}
            Counts built-in reminder emails actually sent via WishlistSuite (Brevo). Kept Too Long is de-duplicated to one digest per customer per day.
            Guest (non-account) sends aren&apos;t shown here.
          </p>
        </div>
      </div>
    </div>
  );
}
