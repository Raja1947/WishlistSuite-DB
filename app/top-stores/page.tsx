import { prisma } from "@/lib/db";
import TopStoresView from "@/components/TopStoresView";

export const revalidate = 60;

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

export default async function TopStoresPage() {
  const [rawStores, conversions] = await Promise.all([
    prisma.$queryRaw<RawRow[]>`
      SELECT
        si.shop, si.name, si.url, si.country, si."currencyCode", si.email, si."planDisplayName",
        COUNT(DISTINCT w.id)::bigint AS wishlist_count
      FROM "ShopInstallation" si
      LEFT JOIN "Wishlist" w ON w.shop = si.shop
      GROUP BY si.shop, si.name, si.url, si.country, si."currencyCode", si.email, si."planDisplayName"
    `,
    prisma.wishlistConversion.findMany({
      select: { shop: true, amount: true, createdAt: true },
    }),
  ]);

  // Group conversions by shop
  const convByShop = new Map<string, Array<{ amount: number; createdAt: string }>>();
  for (const c of conversions) {
    const key = c.shop;
    if (!convByShop.has(key)) convByShop.set(key, []);
    convByShop.get(key)!.push({ amount: Number(c.amount), createdAt: c.createdAt.toISOString() });
  }

  const stores = rawStores.map((s) => ({
    shop: s.shop,
    name: s.name,
    url: s.url || `https://${s.shop}`,
    country: s.country,
    currencyCode: s.currencyCode,
    email: s.email,
    planDisplayName: s.planDisplayName,
    wishlist_count: Number(s.wishlist_count),
    conversions: convByShop.get(s.shop) ?? [],
  }));

  return <TopStoresView stores={stores} />;
}
