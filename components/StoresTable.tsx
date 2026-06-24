"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatNumber } from "@/lib/format";

export type Shop = {
  shop: string;
  name: string;
  myshopifyDomain: string;
  url: string;
  planDisplayName: string;
  shopifyPlus: boolean;
  country: string | null;
  currencyCode: string;
  email: string;
  contactEmail: string;
  createdAt: string;
  wishlist_count: number;
  customer_count: number;
  item_count: number;
  revenue: number;
  conversion_count: number;
};

type ColKey =
  | "url"
  | "myshopifyDomain"
  | "wishlist_count"
  | "customer_count"
  | "item_count"
  | "revenue"
  | "conversion_count"
  | "analytics"
  | "name"
  | "createdAt"
  | "email"
  | "contactEmail"
  | "currencyCode"
  | "planDisplayName"
  | "shopifyPlus"
  | "country";

type ColDef = { key: ColKey; label: string; sortable?: boolean };

const ALL_COLS: ColDef[] = [
  { key: "url", label: "Shop URL" },
  { key: "myshopifyDomain", label: "Myshopify Domain" },
  { key: "wishlist_count", label: "Wishlists", sortable: true },
  { key: "customer_count", label: "Customers", sortable: true },
  { key: "item_count", label: "Items", sortable: true },
  { key: "revenue", label: "Revenue", sortable: true },
  { key: "conversion_count", label: "Conversions", sortable: true },
  { key: "analytics", label: "View Analytics" },
  { key: "name", label: "Store Name", sortable: true },
  { key: "createdAt", label: "Installed At", sortable: true },
  { key: "email", label: "Email" },
  { key: "contactEmail", label: "Contact Email" },
  { key: "currencyCode", label: "Currency" },
  { key: "planDisplayName", label: "Plan", sortable: true },
  { key: "shopifyPlus", label: "Shopify Plus" },
  { key: "country", label: "Country", sortable: true },
];

const DEFAULT_VISIBLE = new Set<ColKey>([
  "url",
  "myshopifyDomain",
  "wishlist_count",
  "customer_count",
  "item_count",
  "revenue",
  "conversion_count",
  "analytics",
  "name",
  "createdAt",
  "email",
]);

const PAGE_SIZE = 10;

type DropdownType = "plan" | "country" | "storeType" | "columns" | null;

function FunnelIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
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
function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function formatInstalledAt(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${time}`;
}

export default function StoresTable({ shops }: { shops: Shop[] }) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [storeTypeFilter, setStoreTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState<ColKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [openDropdown, setOpenDropdown] = useState<DropdownType>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const plans = useMemo(() => Array.from(new Set(shops.map((s) => s.planDisplayName).filter(Boolean))).sort(), [shops]);
  const countries = useMemo(() => Array.from(new Set(shops.map((s) => s.country).filter((c): c is string => !!c))).sort(), [shops]);

  const filtered = useMemo(() => {
    let out = shops;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((s) =>
        [s.shop, s.name, s.myshopifyDomain, s.url, s.email, s.contactEmail, s.country, s.planDisplayName, s.currencyCode]
          .some((v) => v && v.toLowerCase().includes(q))
      );
    }
    if (planFilter) out = out.filter((s) => s.planDisplayName === planFilter);
    if (countryFilter) out = out.filter((s) => s.country === countryFilter);
    if (storeTypeFilter === "Plus") out = out.filter((s) => s.shopifyPlus);
    if (storeTypeFilter === "Regular") out = out.filter((s) => !s.shopifyPlus);
    return out;
  }, [shops, search, planFilter, countryFilter, storeTypeFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = a[sortKey as keyof Shop] as string | number ?? "";
      let bv: string | number = b[sortKey as keyof Shop] as string | number ?? "";
      if (sortKey === "shopifyPlus") { av = a.shopifyPlus ? 1 : 0; bv = b.shopifyPlus ? 1 : 0; }
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: ColKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  };

  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const resetFilters = () => {
    setSearch(""); setPlanFilter(""); setCountryFilter(""); setStoreTypeFilter(""); setPage(1);
  };
  const hasFilters = search || planFilter || countryFilter || storeTypeFilter;

  const exportCSV = () => {
    const visibleDefs = ALL_COLS.filter((c) => visibleCols.has(c.key) && c.key !== "analytics");
    const header = visibleDefs.map((c) => c.label).join(",");
    const rows = sorted.map((s) =>
      visibleDefs.map((c) => {
        const v = s[c.key as keyof Shop];
        if (c.key === "shopifyPlus") return s.shopifyPlus ? "Yes" : "No";
        return `"${String(v ?? "").replace(/"/g, '""')}"`;
      }).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "wishlistsuite-stores.csv"; a.click();
  };

  const visibleDefs = ALL_COLS.filter((c) => visibleCols.has(c.key));

  const toggleDropdown = (d: DropdownType) => setOpenDropdown((prev) => (prev === d ? null : d));

  useEffect(() => { setPage(1); }, [search, planFilter, countryFilter, storeTypeFilter]);

  return (
    <div className="relative" ref={containerRef}>
      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-[#2a2a2a]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search all columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            style={{ background: "#111", border: "1px solid #2a2a2a" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>

        {hasFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white" style={{ border: "1px solid #2a2a2a" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            Reset Filters
          </button>
        )}

        <div className="flex-1" />

        {/* Plan filter */}
        <div className="relative z-20">
          <button
            onClick={() => toggleDropdown("plan")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${planFilter ? "text-white bg-zinc-700" : "text-zinc-300 hover:text-white"}`}
            style={{ border: "1px solid #2a2a2a" }}
          >
            <FunnelIcon /> Plan {planFilter && `(${planFilter})`}
          </button>
          {openDropdown === "plan" && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg shadow-xl z-30 py-1 overflow-auto max-h-64" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {plans.map((p) => (
                <button key={p} onClick={() => { setPlanFilter(planFilter === p ? "" : p); setOpenDropdown(null); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 text-zinc-200">
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Country filter */}
        <div className="relative z-20">
          <button
            onClick={() => toggleDropdown("country")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${countryFilter ? "text-white bg-zinc-700" : "text-zinc-300 hover:text-white"}`}
            style={{ border: "1px solid #2a2a2a" }}
          >
            <FunnelIcon /> Country {countryFilter && `(${countryFilter})`}
          </button>
          {openDropdown === "country" && (
            <div className="absolute right-0 mt-1 w-52 rounded-lg shadow-xl z-30 py-1 overflow-auto max-h-64" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {countries.map((c) => (
                <button key={c} onClick={() => { setCountryFilter(countryFilter === c ? "" : c); setOpenDropdown(null); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 text-zinc-200">
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Store Type filter */}
        <div className="relative z-20">
          <button
            onClick={() => toggleDropdown("storeType")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${storeTypeFilter ? "text-white bg-zinc-700" : "text-zinc-300 hover:text-white"}`}
            style={{ border: "1px solid #2a2a2a" }}
          >
            <FunnelIcon /> Store Type {storeTypeFilter && `(${storeTypeFilter})`}
          </button>
          {openDropdown === "storeType" && (
            <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-xl z-30 py-1" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {["Plus", "Regular"].map((t) => (
                <button key={t} onClick={() => { setStoreTypeFilter(storeTypeFilter === t ? "" : t); setOpenDropdown(null); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 text-zinc-200">
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export CSV */}
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors" style={{ border: "1px solid #2a2a2a" }}>
          <DownloadIcon /> Export CSV
        </button>

        {/* Columns toggle */}
        <div className="relative z-20">
          <button
            onClick={() => toggleDropdown("columns")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
            style={{ border: openDropdown === "columns" ? "1px solid #555" : "1px solid #2a2a2a" }}
          >
            <SettingsIcon /> Columns
          </button>
          {openDropdown === "columns" && (
            <div className="absolute right-0 mt-1 w-52 rounded-lg shadow-xl z-30 py-1 overflow-auto max-h-72" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
              {ALL_COLS.filter((c) => c.key !== "analytics").map((col) => (
                <button key={col.key} onClick={() => toggleCol(col.key)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-zinc-700 text-zinc-200">
                  <span className="w-4">{visibleCols.has(col.key) ? <CheckIcon /> : null}</span>
                  {col.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#1a1a1a", borderBottom: "1px solid #2a2a2a" }}>
                {visibleDefs.map((col) => (
                  <th key={col.key}
                    onClick={() => col.sortable ? handleSort(col.key) : undefined}
                    className={`px-4 py-3 text-left text-sm font-medium text-zinc-400 whitespace-nowrap ${col.sortable ? "cursor-pointer hover:text-zinc-200 select-none" : ""}`}
                  >
                    {col.label}
                    {col.sortable && <SortIcon dir={sortKey === col.key ? sortDir : null} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={visibleDefs.length} className="px-4 py-12 text-center text-zinc-500">
                    No results.
                  </td>
                </tr>
              )}
              {pageData.map((shop, idx) => (
                <tr key={shop.shop}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid #222", background: idx % 2 === 0 ? "#0f0f0f" : "#161616" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1c1c1c")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#0f0f0f" : "#161616")}
                >
                  {visibleDefs.map((col) => (
                    <td key={col.key} className="px-4 py-7 text-zinc-300 whitespace-nowrap">
                      {col.key === "url" && (
                        <a href={`https://${shop.myshopifyDomain}`} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white break-all">
                          {shop.url || `https://${shop.myshopifyDomain}`}
                        </a>
                      )}
                      {col.key === "myshopifyDomain" && <span className="break-all">{shop.myshopifyDomain}</span>}
                      {col.key === "wishlist_count" && <span>{formatNumber(shop.wishlist_count)}</span>}
                      {col.key === "customer_count" && <span>{formatNumber(shop.customer_count)}</span>}
                      {col.key === "item_count" && <span>{formatNumber(shop.item_count)}</span>}
                      {col.key === "revenue" && <span>{formatCurrency(shop.revenue, shop.currencyCode)}</span>}
                      {col.key === "conversion_count" && <span>{formatNumber(shop.conversion_count)}</span>}
                      {col.key === "analytics" && (
                        <Link href={`/shops/${encodeURIComponent(shop.shop)}`} className="text-blue-400 hover:underline">
                          View Analytics
                        </Link>
                      )}
                      {col.key === "name" && <span>{shop.name}</span>}
                      {col.key === "createdAt" && <span className="text-xs">{formatInstalledAt(shop.createdAt)}</span>}
                      {col.key === "email" && <span className="text-zinc-400">{shop.email}</span>}
                      {col.key === "contactEmail" && <span className="text-zinc-400">{shop.contactEmail}</span>}
                      {col.key === "currencyCode" && <span>{shop.currencyCode}</span>}
                      {col.key === "planDisplayName" && <span>{shop.planDisplayName}</span>}
                      {col.key === "shopifyPlus" && <span>{shop.shopifyPlus ? "Yes" : "No"}</span>}
                      {col.key === "country" && <span>{shop.country ?? "—"}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-4 text-sm text-zinc-400" style={{ borderTop: "1px solid #2a2a2a" }}>
        <span>
          Showing {sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, sorted.length)} of {formatNumber(sorted.length)} stores
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-1.5 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-colors"
            style={{ border: "1px solid #2a2a2a" }}
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-1.5 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:text-white transition-colors"
            style={{ border: "1px solid #2a2a2a" }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
