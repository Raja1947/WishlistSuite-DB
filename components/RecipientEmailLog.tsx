"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/format";

type EmailEvent = {
  ts: string;
  type: string;
  productId: string;
  variantId: string | null;
  priceWas: number | null;
  priceNow: number | null;
  title: string | null;
  handle: string | null;
};

type Period = "7" | "30" | "90" | "all";
type TypeKey = "all" | "price_drop" | "back_in_stock" | "low_inventory" | "kept_too_long";

const TYPE_META: Record<string, { label: string; color: string }> = {
  price_drop: { label: "Price Drop", color: "#818cf8" },
  back_in_stock: { label: "Back in Stock", color: "#34d399" },
  low_inventory: { label: "Low Inventory", color: "#fbbf24" },
  kept_too_long: { label: "Kept Too Long", color: "#f472b6" },
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtGap(hours: number) {
  if (!isFinite(hours)) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min apart`;
  if (hours < 48) return `${hours.toFixed(1)} hours apart`;
  return `${Math.round(hours / 24)} days apart`;
}

export default function RecipientEmailLog({
  shop,
  storeName,
  customerId,
  email,
  events,
}: {
  shop: string;
  storeName: string;
  customerId: string;
  email: string | null;
  events: EmailEvent[];
}) {
  const [period, setPeriod] = useState<Period>("all");
  const [typeFilter, setTypeFilter] = useState<TypeKey>("all");
  const [hoverTip, setHoverTip] = useState<{ x: number; y: number; title: string; lines: string[]; gap: string } | null>(null);

  const cutoff = useMemo(() => {
    if (period === "all") return 0;
    return Date.now() - parseInt(period) * 86400000;
  }, [period]);

  // For each (type, product, variant): every send time + the closest gap between two sends.
  const repeatInfo = useMemo(() => {
    const times = new Map<string, string[]>();
    for (const e of events) {
      const k = `${e.type}|${e.productId}|${e.variantId ?? ""}`;
      const arr = times.get(k) ?? [];
      arr.push(e.ts);
      times.set(k, arr);
    }
    const info = new Map<string, { count: number; times: string[]; minGapHours: number }>();
    for (const [k, arr] of Array.from(times.entries())) {
      arr.sort();
      let minGapHours = Infinity;
      for (let i = 1; i < arr.length; i++) {
        const g = (new Date(arr[i]).getTime() - new Date(arr[i - 1]).getTime()) / 3600000;
        if (g < minGapHours) minGapHours = g;
      }
      info.set(k, { count: arr.length, times: arr, minGapHours });
    }
    return info;
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (cutoff && new Date(e.ts).getTime() < cutoff) return false;
      return true;
    });
  }, [events, typeFilter, cutoff]);

  const byType = useMemo(() => {
    const c: Record<string, number> = { price_drop: 0, back_in_stock: 0, low_inventory: 0, kept_too_long: 0 };
    for (const e of filtered) c[e.type] = (c[e.type] ?? 0) + 1;
    return c;
  }, [filtered]);

  // Count distinct products that were emailed twice WITHIN 24h (genuinely suspicious),
  // vs. products emailed more than once but spread apart (normal re-triggers).
  const { suspicious, spreadRepeats } = useMemo(() => {
    const seen = new Set<string>();
    let suspicious = 0, spreadRepeats = 0;
    for (const e of filtered) {
      const k = `${e.type}|${e.productId}|${e.variantId ?? ""}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const info = repeatInfo.get(k);
      if (info && info.count > 1) {
        if (info.minGapHours < 24) suspicious++;
        else spreadRepeats++;
      }
    }
    return { suspicious, spreadRepeats };
  }, [filtered, repeatInfo]);

  function exportCSV() {
    const header = ["Date/Time (UTC)", "Type", "Product ID", "Product Title", "Variant ID", "Price Was", "Price Now"];
    const rows = filtered.map((e) => [
      e.ts, TYPE_META[e.type]?.label ?? e.type, e.productId, e.title ?? "", e.variantId ?? "", e.priceWas ?? "", e.priceNow ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${customerId}-email-log.csv`;
    a.click();
  }

  const typeChips: { key: TypeKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "price_drop", label: "Price Drop" },
    { key: "back_in_stock", label: "Back in Stock" },
    { key: "low_inventory", label: "Low Inventory" },
    { key: "kept_too_long", label: "Kept Too Long" },
  ];

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "#080808" }}>
      {hoverTip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            left: hoverTip.x,
            top: hoverTip.y - 8,
            transform: "translate(-50%, -100%)",
            background: "#000",
            border: "1px solid #3a3a3a",
            color: "#e4e4e7",
            maxWidth: 300,
          }}
        >
          <div className="font-semibold text-white mb-1">{hoverTip.title}</div>
          {hoverTip.lines.map((l, i) => (
            <div key={i} className="text-zinc-300 whitespace-nowrap">• {l}</div>
          ))}
          <div className="text-zinc-400 mt-1">{hoverTip.gap}</div>
        </div>
      )}
      <div className="max-w-screen-xl mx-auto">
        {/* Back */}
        <Link href={`/top-emails/${encodeURIComponent(shop)}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-6 px-3 py-1.5 rounded-lg transition-colors" style={{ border: "1px solid #2a2a2a" }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Recipients
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{email ?? "Unknown customer"}</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {storeName} · Customer <span className="font-mono">{customerId}</span> · Every reminder email sent
            </p>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white border border-[#2a2a2a] hover:border-zinc-500 self-start">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: "#1a1a1a" }}>
          {(["7", "30", "90", "all"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? "bg-white text-black" : "text-zinc-400 hover:text-white"}`}
            >
              {p === "all" ? "All Time" : `${p} Days`}
            </button>
          ))}
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {typeChips.map((t) => {
            const active = typeFilter === t.key;
            const count = t.key === "all" ? filtered.length : byType[t.key] ?? 0;
            return (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-white text-black" : "text-zinc-300 hover:text-white border border-[#2a2a2a]"}`}
              >
                {t.label} <span className={active ? "text-zinc-500" : "text-zinc-500"}>({formatNumber(count)})</span>
              </button>
            );
          })}
        </div>

        {/* Health banner */}
        <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="text-lg">{suspicious === 0 ? "✅" : "⚠️"}</div>
          <div className="text-sm text-zinc-300">
            <span className="font-semibold text-white">{formatNumber(filtered.length)}</span> emails shown.{" "}
            {suspicious === 0 ? (
              <>
                No product was emailed twice within 24 hours — sending looks healthy.
                {spreadRepeats > 0 && <> {formatNumber(spreadRepeats)} product(s) were emailed more than once, but days/weeks apart (genuine re-triggers). Hover a “sent ×” badge to see the exact times.</>}
              </>
            ) : (
              <><span className="text-amber-300 font-semibold">{formatNumber(suspicious)} product(s) were emailed twice within 24 hours</span> — possible duplicate. Hover the amber “sent ×” badge to see the exact times.</>
            )}
          </div>
        </div>

        {/* Log table */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-xs text-zinc-500">
                  {["#", "Date / Time", "Type", "Product", "Variant", "Detail"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-medium text-zinc-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const meta = TYPE_META[e.type] ?? { label: e.type, color: "#a1a1aa" };
                  const k = `${e.type}|${e.productId}|${e.variantId ?? ""}`;
                  const info = repeatInfo.get(k);
                  const count = info?.count ?? 1;
                  const short = (info?.minGapHours ?? Infinity) < 24;
                  return (
                    <tr key={`${e.ts}-${i}`} className="border-b border-[#1f1f1f]" style={{ background: i % 2 === 0 ? "#0f0f0f" : "#141414" }}>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{fmtDateTime(e.ts)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${meta.color}22`, color: meta.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {e.handle ? (
                          <a href={`https://${shop}/products/${e.handle}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                            {e.title ?? e.handle}
                          </a>
                        ) : (
                          <span className="text-zinc-300">{e.title ?? <span className="font-mono text-xs text-zinc-400">{e.productId}</span>}</span>
                        )}
                        {count > 1 && info && (
                          <span
                            onMouseEnter={(ev) => {
                              const r = ev.currentTarget.getBoundingClientRect();
                              setHoverTip({
                                x: r.left + r.width / 2,
                                y: r.top,
                                title: `Sent ${count}× to this customer`,
                                lines: info.times.map((t) => fmtDateTime(t)),
                                gap: `Closest gap: ${fmtGap(info.minGapHours)}`,
                              });
                            }}
                            onMouseLeave={() => setHoverTip(null)}
                            className="ml-2 text-[10px] px-1.5 py-0.5 rounded cursor-help whitespace-nowrap"
                            style={short ? { background: "#3a2f14", color: "#fcd34d" } : { background: "#242424", color: "#a1a1aa" }}
                          >
                            sent {count}×
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{e.variantId ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                        {e.type === "price_drop" && e.priceWas != null && e.priceNow != null
                          ? `${e.priceWas} → ${e.priceNow}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-zinc-500">No emails in this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-zinc-600 px-4 py-3 border-t border-[#1f1f1f] leading-relaxed">
            Times shown in your local timezone. Product titles fall back to the product ID when no cached title is available.
            Kept Too Long lists each product inside a digest email (one digest can cover several products sent the same day).
          </p>
        </div>
      </div>
    </div>
  );
}
