import { prisma } from "@/lib/db";
import StoresTable, { type Shop } from "@/components/StoresTable";

export const dynamic = "force-dynamic";

type RawShopRow = {
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
  createdAt: Date;
  wishlist_count: bigint;
  customer_count: bigint;
  item_count: bigint;
  revenue: number;
  conversion_count: bigint;
};

async function getData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [rawShops, totalShops, plusStores, recentInstalls] = await Promise.all([
    prisma.$queryRaw<RawShopRow[]>`
      SELECT
        si.shop,
        si.name,
        si."myshopifyDomain",
        si.url,
        si."planDisplayName",
        si."shopifyPlus",
        si.country,
        si."currencyCode",
        si.email,
        si."contactEmail",
        si."createdAt",
        COUNT(DISTINCT w.id)             AS wishlist_count,
        COUNT(DISTINCT w."customerId")   AS customer_count,
        COUNT(DISTINCT wi.id)            AS item_count,
        COALESCE(SUM(wc.amount), 0)::float AS revenue,
        COUNT(DISTINCT wc.id)            AS conversion_count
      FROM "ShopInstallation" si
      LEFT JOIN "Wishlist"           w  ON w.shop         = si.shop
      LEFT JOIN "WishlistItem"       wi ON wi."wishlistId" = w.id
      LEFT JOIN "WishlistConversion" wc ON wc.shop        = si.shop
      GROUP BY si.shop, si.name, si."myshopifyDomain", si.url, si."planDisplayName",
               si."shopifyPlus", si.country, si."currencyCode", si.email,
               si."contactEmail", si."createdAt"
      ORDER BY revenue DESC
    `,
    prisma.shopInstallation.count(),
    prisma.shopInstallation.count({ where: { shopifyPlus: true } }),
    prisma.shopInstallation.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  const uniqueCountries = new Set(rawShops.map((s) => s.country).filter(Boolean)).size;

  const shops: Shop[] = rawShops.map((s) => ({
    ...s,
    wishlist_count: Number(s.wishlist_count),
    customer_count: Number(s.customer_count),
    item_count: Number(s.item_count),
    revenue: Number(s.revenue),
    conversion_count: Number(s.conversion_count),
    createdAt: s.createdAt.toISOString(),
    url: s.url || `https://${s.myshopifyDomain}`,
  }));

  return { shops, totalShops, uniqueCountries, plusStores, recentInstalls };
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-zinc-400">{icon}</div>
        <div>
          <p className="text-sm text-zinc-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-xs text-zinc-500 mt-1">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { shops, totalShops, uniqueCountries, plusStores, recentInstalls } = await getData();

  return (
    <div className="min-h-screen" style={{ background: "#0f0f0f" }}>
      <div className="max-w-screen-2xl mx-auto px-16 py-16">
        {/* Page heading */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Wishlist Stores ({totalShops.toLocaleString()})</h1>
            <p className="text-sm text-zinc-500 mt-1">Manage and monitor your connected Shopify stores</p>
          </div>
          <div className="flex gap-3">
            <a href="/top-stores" className="px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors hover:border-zinc-500" style={{ background: "#1a1a1a", border: "1px solid #3a3a3a" }}>
              View Top Stores
            </a>
            <a href="/orders" className="px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors hover:border-zinc-500" style={{ background: "#1a1a1a", border: "1px solid #3a3a3a" }}>
              View orders data
            </a>
          </div>
        </div>

        {/* Stat cards */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Stores"
            value={totalShops.toLocaleString()}
            sub="Active Shopify stores"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
          />
          <StatCard
            label="Countries"
            value={uniqueCountries}
            sub="Unique countries"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>}
          />
          <StatCard
            label="Plus Stores"
            value={plusStores}
            sub="Shopify Plus merchants"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>}
          />
          <StatCard
            label="Recent Installs"
            value={recentInstalls}
            sub="Last 30 days"
            icon={<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
          />
        </div>

        {/* Stores table */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <StoresTable shops={shops} />
        </div>
      </div>
    </div>
  );
}
