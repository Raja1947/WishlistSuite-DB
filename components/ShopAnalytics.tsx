"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatNumber, formatDate } from "@/lib/format";

type Conversion = { amount: number; createdAt: string };
type AnalyticsRow = { date: string; totalWishlists: number; addedItems: number; convertedItems: number; revenue: number };
type TopProduct = { productId: string; product_handle: string | null; product_title: string | null; wishlist_count: number; customer_count: number; avg_price: number | null };
type TopCustomer = { customerId: string | null; email: string | null; wishlist_count: number; item_count: number; last_active: string | null };
type WishlistDetail = { id: string; name: string; isDefault: boolean; createdAt: string; itemCount: number; items: { id: string; productId: string; handle: string | null; title: string; price: number | null; addedAt: string }[] };

type Installation = {
  name: string;
  myshopifyDomain: string;
  planDisplayName: string;
  country: string | null;
  currencyCode: string;
  contactEmail: string;
  createdAt: string;
  shopifyPlus: boolean;
};

type Period = "7" | "30" | "90" | "all";

function cutoffDate(period: Period): Date | null {
  if (period === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(period));
  return d;
}

export default function ShopAnalytics({
  installation,
  allConversions,
  allAnalytics,
  topProducts,
  topCustomers,
  allWishlists,
}: {
  installation: Installation;
  allConversions: Conversion[];
  allAnalytics: AnalyticsRow[];
  topProducts: TopProduct[];
  topCustomers: TopCustomer[];
  allWishlists: { createdAt: string }[];
}) {
  const [period, setPeriod] = useState<Period>("30");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [customerWishlists, setCustomerWishlists] = useState<Record<string, WishlistDetail[]>>({});
  const [loadingCustomer, setLoadingCustomer] = useState<string | null>(null);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [allCustomers, setAllCustomers] = useState<TopCustomer[] | null>(null);
  const [loadingAllCustomers, setLoadingAllCustomers] = useState(false);

  const displayedCustomers = showAllCustomers && allCustomers ? allCustomers : topCustomers;

  async function handleShowAll() {
    if (showAllCustomers) { setShowAllCustomers(false); return; }
    setShowAllCustomers(true);
    if (allCustomers) return;
    setLoadingAllCustomers(true);
    const res = await fetch(`/api/shops/${encodeURIComponent(installation.myshopifyDomain)}/customers`);
    const data = await res.json();
    setAllCustomers(data);
    setLoadingAllCustomers(false);
  }

  async function toggleCustomer(customerId: string) {
    if (expandedCustomer === customerId) { setExpandedCustomer(null); return; }
    setExpandedCustomer(customerId);
    if (customerWishlists[customerId]) return;
    setLoadingCustomer(customerId);
    const res = await fetch(`/api/shops/${encodeURIComponent(installation.myshopifyDomain)}/customers/${encodeURIComponent(customerId)}`);
    const data = await res.json();
    setCustomerWishlists((prev) => ({ ...prev, [customerId]: data }));
    setLoadingCustomer(null);
  }

  const cutoff = useMemo(() => cutoffDate(period), [period]);

  const filteredConversions = useMemo(
    () => cutoff ? allConversions.filter((c) => new Date(c.createdAt) >= cutoff) : allConversions,
    [allConversions, cutoff]
  );

  const filteredAnalytics = useMemo(
    () => (cutoff ? allAnalytics.filter((a) => new Date(a.date) >= cutoff) : allAnalytics).sort((a, b) => a.date.localeCompare(b.date)),
    [allAnalytics, cutoff]
  );

  const totalRevenue = useMemo(() => filteredConversions.reduce((s, c) => s + c.amount, 0), [filteredConversions]);
  const totalWishlists = useMemo(
    () => cutoff ? allWishlists.filter((w) => new Date(w.createdAt) >= cutoff).length : allWishlists.length,
    [allWishlists, cutoff]
  );
  const totalConversions = filteredConversions.length;

  const maxRevenue = useMemo(() => Math.max(...filteredAnalytics.map((a) => a.revenue), 1), [filteredAnalytics]);

  const exportCSV = () => {
    const header = "Rank,Product,Handle,Times Wishlisted,Customers,Avg Price";
    const rows = topProducts.map((p, i) =>
      `${i + 1},"${(p.product_title || p.product_handle || p.productId).replace(/"/g, '""')}","${p.product_handle || ""}",${p.wishlist_count},${p.customer_count},${p.avg_price ?? ""}`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${installation.myshopifyDomain}-products.csv`; a.click();
  };

  const periods: { key: Period; label: string }[] = [
    { key: "7", label: "7 Days" },
    { key: "30", label: "30 Days" },
    { key: "90", label: "90 Days" },
    { key: "all", label: "All Time" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0f0f0f" }}>
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Link href="/" className="text-sm text-zinc-400 hover:text-white mb-3 inline-block">← All Shops</Link>
            <h1 className="text-3xl font-bold text-white">Analytics for {installation.name}</h1>
            <p className="text-zinc-400 mt-1">Monitor your wishlist performance and revenue</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white mt-6"
            style={{ border: "1px solid #2a2a2a" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={period === p.key ? { background: "white", color: "#111" } : { color: "#a1a1aa" }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">Total Revenue</span>
              <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue, installation.currencyCode)}</p>
            <p className="text-xs text-zinc-500 mt-1">{period === "all" ? "All time total" : `${period} day total`}</p>
          </div>
          <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">Total Wishlists</span>
              <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(totalWishlists)}</p>
            <p className="text-xs text-zinc-500 mt-1">Active wishlists</p>
          </div>
          <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">Total Conversions</span>
              <svg className="w-5 h-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(totalConversions)}</p>
            <p className="text-xs text-zinc-500 mt-1">Wishlist purchases</p>
          </div>
        </div>

        {/* Revenue Over Time */}
        <div className="rounded-xl p-5 mb-6" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <h2 className="text-lg font-semibold text-white mb-4">Revenue Over Time</h2>
          {filteredAnalytics.length === 0 || filteredAnalytics.every((a) => a.revenue === 0) ? (
            <div className="flex items-center justify-center h-40 text-zinc-500">No revenue data available</div>
          ) : (
            <div className="flex items-end gap-1 h-40 overflow-x-auto pb-6 relative">
              {filteredAnalytics.map((row) => {
                const pct = maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={row.date} className="flex flex-col items-center gap-1 min-w-[28px] flex-1 group relative">
                    <div
                      className="w-full rounded-t-sm bg-blue-500 group-hover:bg-blue-400 transition-colors"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                      title={`${formatDate(row.date)}: ${formatCurrency(row.revenue, installation.currencyCode)}`}
                    />
                    {filteredAnalytics.length <= 14 && (
                      <span className="absolute -bottom-5 text-[9px] text-zinc-500 rotate-45 origin-left whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid #2a2a2a" }}>
          <div className="px-5 py-4" style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
            <h2 className="text-lg font-semibold text-white">Top Wishlisted Products</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
                {["#", "Product", "Times Wishlisted", "Customers", "Avg Price"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">No products yet</td></tr>
              )}
              {topProducts.map((p, i) => {
                const name = p.product_title || p.product_handle || p.productId;
                return (
                  <tr key={p.productId} style={{ borderBottom: "1px solid #1a1a1a", background: i % 2 === 0 ? "#0f0f0f" : "#111" }}>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-zinc-200 font-medium truncate max-w-xs">{name}</div>
                      {p.product_handle && p.product_title && <div className="text-zinc-500 text-xs">{p.product_handle}</div>}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-semibold">{formatNumber(p.wishlist_count)}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatNumber(p.customer_count)}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.avg_price != null ? formatCurrency(p.avg_price, installation.currencyCode) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Top Customers */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">Top Customers</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {showAllCustomers && allCustomers ? `Showing all ${allCustomers.length}` : "Showing top 50"}
              </p>
            </div>
            <button
              onClick={handleShowAll}
              disabled={loadingAllCustomers}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
              style={{ border: "1px solid #2a2a2a" }}
            >
              {loadingAllCustomers ? "Loading…" : showAllCustomers ? "Show Top 50" : "Show All"}
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
                {["#", "Customer", "Wishlists", "Items", "Last Active"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedCustomers.length === 0 && !loadingAllCustomers && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">No customers yet</td></tr>
              )}
              {loadingAllCustomers && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Loading all customers…</td></tr>
              )}
              {displayedCustomers.map((c, i) => {
                const isExpanded = expandedCustomer === c.customerId;
                const wishlists = c.customerId ? customerWishlists[c.customerId] : undefined;
                const isLoading = loadingCustomer === c.customerId;
                return (
                  <>
                    <tr
                      key={c.customerId ?? i}
                      onClick={() => c.customerId && toggleCustomer(c.customerId)}
                      style={{ borderBottom: isExpanded ? "none" : "1px solid #1a1a1a", background: i % 2 === 0 ? "#0f0f0f" : "#111", cursor: c.customerId ? "pointer" : "default" }}
                      onMouseEnter={(e) => { if (c.customerId) e.currentTarget.style.background = "#1c1c1c"; }}
                      onMouseLeave={(e) => { if (c.customerId) e.currentTarget.style.background = i % 2 === 0 ? "#0f0f0f" : "#111"; }}
                    >
                      <td className="px-4 py-3 text-zinc-500 text-xs">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.customerId && (
                            <svg className={`w-3.5 h-3.5 text-zinc-500 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          <div>
                            <div className="text-zinc-200 font-medium">{c.email ?? "Guest"}</div>
                            {c.customerId && <div className="text-zinc-500 text-xs font-mono truncate max-w-xs">{c.customerId}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{formatNumber(c.wishlist_count)}</td>
                      <td className="px-4 py-3 text-zinc-300 font-semibold">{formatNumber(c.item_count)}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{c.last_active ? formatDate(c.last_active) : "—"}</td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${c.customerId}-expand`} style={{ borderBottom: "1px solid #1a1a1a" }}>
                        <td colSpan={5} style={{ background: "#0a0a0a", padding: "0 16px 16px 48px" }}>
                          {isLoading ? (
                            <p className="text-zinc-500 text-xs py-4">Loading wishlists…</p>
                          ) : wishlists && wishlists.length === 0 ? (
                            <p className="text-zinc-500 text-xs py-4">No wishlists found.</p>
                          ) : wishlists ? (
                            <div className="space-y-4 pt-3">
                              {wishlists.map((w) => (
                                <div key={w.id}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-zinc-300">{w.name}</span>
                                    {w.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded text-zinc-400" style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}>Default</span>}
                                    <span className="text-[10px] text-zinc-600">{w.itemCount} item{w.itemCount !== 1 ? "s" : ""}</span>
                                  </div>
                                  {w.items.length === 0 ? (
                                    <p className="text-xs text-zinc-600 pl-2">Empty wishlist</p>
                                  ) : (
                                    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr style={{ background: "#141414", borderBottom: "1px solid #1f1f1f" }}>
                                            <th className="px-3 py-2 text-left text-zinc-500 font-medium">Product</th>
                                            <th className="px-3 py-2 text-left text-zinc-500 font-medium">Price</th>
                                            <th className="px-3 py-2 text-left text-zinc-500 font-medium">Added</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {w.items.map((item, idx) => (
                                            <tr key={item.id} style={{ background: idx % 2 === 0 ? "#0f0f0f" : "#111", borderBottom: "1px solid #1a1a1a" }}>
                                              <td className="px-3 py-2 text-zinc-300">{item.title}</td>
                                              <td className="px-3 py-2 text-zinc-400">{item.price != null ? formatCurrency(item.price) : "—"}</td>
                                              <td className="px-3 py-2 text-zinc-500">{formatDate(item.addedAt)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">Data source: Real-time (current)</p>
      </div>
    </div>
  );
}
