import { prisma } from "@/lib/db";
import TopStoresView from "@/components/TopStoresView";

export const revalidate = 300;

type RawRow = {
  shop: string;
  name: string;
  url: string;
  country: string | null;
  currencyCode: string;
  email: string;
  planDisplayName: string;
  wishlist_count: bigint;
};

type RawConvStat = {
  shop: string;
  rev7: number;
  rev30: number;
  rev90: number;
  rev_all: number;
  orders7: bigint;
  orders30: bigint;
  orders90: bigint;
  orders_all: bigint;
};

export default async function TopStoresPage() {
  const now = new Date();
  const cutoff7 = new Date(now.getTime() - 7 * 86400000);
  const cutoff30 = new Date(now.getTime() - 30 * 86400000);
  const cutoff90 = new Date(now.getTime() - 90 * 86400000);

  const [rawStores, rawConvStats] = await Promise.all([
    prisma.$queryRaw<RawRow[]>`
      SELECT
        si.shop, si.name, si.url, si.country, si."currencyCode", si.email, si."planDisplayName",
        (SELECT COUNT(*) FROM "Wishlist" w WHERE w.shop = si.shop)::bigint AS wishlist_count
      FROM "ShopInstallation" si
    `,
    prisma.$queryRaw<RawConvStat[]>`
      SELECT
        shop,
        COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${cutoff7}),  0)::float AS rev7,
        COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${cutoff30}), 0)::float AS rev30,
        COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${cutoff90}), 0)::float AS rev90,
        COALESCE(SUM(amount), 0)::float                                            AS rev_all,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff7})::bigint                  AS orders7,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff30})::bigint                 AS orders30,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff90})::bigint                 AS orders90,
        COUNT(*)::bigint                                                            AS orders_all
      FROM "WishlistConversion"
      GROUP BY shop
    `,
  ]);

  const statsByShop = new Map(rawConvStats.map((s) => [s.shop, s]));

  const stores = rawStores.map((s) => {
    const c = statsByShop.get(s.shop);
    return {
      shop: s.shop,
      name: s.name,
      url: s.url || `https://${s.shop}`,
      country: s.country,
      currencyCode: s.currencyCode,
      email: s.email,
      planDisplayName: s.planDisplayName,
      wishlist_count: Number(s.wishlist_count),
      stats: {
        days7:  { revenue: c?.rev7   ?? 0, orders: Number(c?.orders7   ?? 0) },
        days30: { revenue: c?.rev30  ?? 0, orders: Number(c?.orders30  ?? 0) },
        days90: { revenue: c?.rev90  ?? 0, orders: Number(c?.orders90  ?? 0) },
        all:    { revenue: c?.rev_all ?? 0, orders: Number(c?.orders_all ?? 0) },
      },
    };
  });

  return <TopStoresView stores={stores} />;
}
