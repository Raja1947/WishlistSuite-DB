import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

type ShopConvRow = {
  shop: string;
  name: string | null;
  total_orders: bigint;
};

type Period = "7" | "30" | "90" | "all";

export default async function OrdersPage({ searchParams }: { searchParams: { period?: string } }) {
  const period = (searchParams.period ?? "all") as Period;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const cutoff = period === "all" ? null : new Date(Date.now() - Number(period) * 86400000);

  const [totalOrders, recentOrders, topShops] = await Promise.all([
    prisma.wishlistConversion.count(),
    prisma.wishlistConversion.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    cutoff
      ? prisma.$queryRaw<ShopConvRow[]>`
          SELECT
            wc.shop,
            si.name,
            COUNT(wc.id)::bigint AS total_orders
          FROM "WishlistConversion" wc
          LEFT JOIN "ShopInstallation" si ON si.shop = wc.shop
          WHERE wc."createdAt" >= ${cutoff}
          GROUP BY wc.shop, si.name
          ORDER BY total_orders DESC
          LIMIT 50
        `
      : prisma.$queryRaw<ShopConvRow[]>`
          SELECT
            wc.shop,
            si.name,
            COUNT(wc.id)::bigint AS total_orders
          FROM "WishlistConversion" wc
          LEFT JOIN "ShopInstallation" si ON si.shop = wc.shop
          GROUP BY wc.shop, si.name
          ORDER BY total_orders DESC
          LIMIT 50
        `,
  ]);

  const periods: { key: Period; label: string }[] = [
    { key: "7", label: "7 Days" },
    { key: "30", label: "30 Days" },
    { key: "90", label: "90 Days" },
    { key: "all", label: "All Time" },
  ];

  return (
    <div className="min-h-screen px-6 py-8" style={{ background: "#080808" }}>
      <style>{`
        .orders-row:nth-child(odd) { background: #0f0f0f; }
        .orders-row:nth-child(even) { background: #141414; }
        .orders-row:hover { background: #1c1c1c !important; }
      `}</style>
      <div className="max-w-screen-xl mx-auto">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>

        <h1 className="text-3xl font-bold text-white mb-1">Orders Dashboard</h1>
        <p className="text-zinc-500 text-sm mb-6">Overview of your conversion metrics</p>

        {/* Period tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg w-fit" style={{ background: "#1a1a1a" }}>
          {periods.map((p) => (
            <Link
              key={p.key}
              href={`/orders?period=${p.key}`}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.key ? "bg-white text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl p-6" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-zinc-400 mb-2">Total Orders Till Date</p>
                <p className="text-4xl font-bold text-white">{formatNumber(totalOrders)}</p>
                <p className="text-xs text-zinc-500 mt-2">Cumulative conversions from all time</p>
              </div>
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
          </div>
          <div className="rounded-xl p-6" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-zinc-400 mb-2">Orders in Last 30 Days</p>
                <p className="text-4xl font-bold text-white">{formatNumber(recentOrders)}</p>
                <p className="text-xs text-zinc-500 mt-2">Orders from the last 30 days</p>
              </div>
              <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </div>

        {/* Top stores table */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="px-6 py-4 border-b border-[#2a2a2a]">
            <h2 className="text-base font-semibold text-white">Top 50 Stores by Orders</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {period === "all" ? "All time conversions" : `Last ${period} days`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-xs text-zinc-500">
                  <th className="px-4 py-3 text-left font-medium w-16">Rank</th>
                  <th className="px-4 py-3 text-left font-medium">Store Name</th>
                  <th className="px-4 py-3 text-left font-medium">Store ID</th>
                  <th className="px-4 py-3 text-right font-medium">Total Orders</th>
                </tr>
              </thead>
              <tbody>
                {topShops.map((s, i) => (
                  <tr key={s.shop} className="orders-row border-b border-[#1f1f1f]">
                    <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">{s.name ?? s.shop}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs font-mono">
                      {s.shop.length > 20 ? s.shop.slice(0, 17) + "..." : s.shop}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      {formatNumber(Number(s.total_orders))}
                    </td>
                  </tr>
                ))}
                {topShops.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-16 text-center text-zinc-500">No conversion data for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
