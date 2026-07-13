import { prisma } from "@/lib/db";
import TopEmailsView from "@/components/TopEmailsView";

export const revalidate = 300;

type RawShop = {
  shop: string;
  name: string;
  url: string;
  email: string;
  planDisplayName: string;
  country: string | null;
};

type RawTypeStat = {
  shop: string;
  all_: bigint;
  d7: bigint;
  d30: bigint;
  d90: bigint;
};

export default async function TopEmailsPage() {
  const now = new Date();
  const cutoff7 = new Date(now.getTime() - 7 * 86400000);
  const cutoff30 = new Date(now.getTime() - 30 * 86400000);
  const cutoff90 = new Date(now.getTime() - 90 * 86400000);

  const [rawShops, rawPriceDrop, rawBackInStock, rawLowInventory, rawKeptTooLong] = await Promise.all([
    prisma.$queryRaw<RawShop[]>`
      SELECT si.shop, si.name, si.url, si.email, si."planDisplayName", si.country
      FROM "ShopInstallation" si
    `,
    // Emails actually sent (emailSent = true). Price drop uses notifiedAt; others use sentAt.
    prisma.$queryRaw<RawTypeStat[]>`
      SELECT shop,
        COUNT(*) FILTER (WHERE "emailSent" = true)::bigint                                    AS all_,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "notifiedAt" >= ${cutoff7})::bigint     AS d7,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "notifiedAt" >= ${cutoff30})::bigint    AS d30,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "notifiedAt" >= ${cutoff90})::bigint    AS d90
      FROM "PriceDropNotification"
      GROUP BY shop
    `,
    prisma.$queryRaw<RawTypeStat[]>`
      SELECT shop,
        COUNT(*) FILTER (WHERE "emailSent" = true)::bigint                                AS all_,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff7})::bigint     AS d7,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff30})::bigint    AS d30,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff90})::bigint    AS d90
      FROM "BackInStockNotification"
      GROUP BY shop
    `,
    prisma.$queryRaw<RawTypeStat[]>`
      SELECT shop,
        COUNT(*) FILTER (WHERE "emailSent" = true)::bigint                                AS all_,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff7})::bigint     AS d7,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff30})::bigint    AS d30,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff90})::bigint    AS d90
      FROM "LowInventoryNotification"
      GROUP BY shop
    `,
    // Kept-too-long writes one row per product but sends one digest per customer per run:
    // count distinct (customer, day) to approximate actual emails sent.
    prisma.$queryRaw<RawTypeStat[]>`
      SELECT shop,
        COUNT(DISTINCT ("customerId" || '|' || "sentAt"::date::text)) FILTER (WHERE "emailSent" = true)::bigint                                AS all_,
        COUNT(DISTINCT ("customerId" || '|' || "sentAt"::date::text)) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff7})::bigint     AS d7,
        COUNT(DISTINCT ("customerId" || '|' || "sentAt"::date::text)) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff30})::bigint    AS d30,
        COUNT(DISTINCT ("customerId" || '|' || "sentAt"::date::text)) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff90})::bigint    AS d90
      FROM "KeptTooLongNotification"
      GROUP BY shop
    `,
  ]);

  const pdMap = new Map(rawPriceDrop.map((r) => [r.shop, r]));
  const bisMap = new Map(rawBackInStock.map((r) => [r.shop, r]));
  const liMap = new Map(rawLowInventory.map((r) => [r.shop, r]));
  const ktlMap = new Map(rawKeptTooLong.map((r) => [r.shop, r]));

  const pick = (r: RawTypeStat | undefined) => ({
    all: Number(r?.all_ ?? 0),
    days90: Number(r?.d90 ?? 0),
    days30: Number(r?.d30 ?? 0),
    days7: Number(r?.d7 ?? 0),
  });

  const stores = rawShops.map((s) => ({
    shop: s.shop,
    name: s.name,
    url: s.url || `https://${s.shop}`,
    email: s.email,
    planDisplayName: s.planDisplayName,
    country: s.country,
    byType: {
      priceDrop: pick(pdMap.get(s.shop)),
      backInStock: pick(bisMap.get(s.shop)),
      lowInventory: pick(liMap.get(s.shop)),
      keptTooLong: pick(ktlMap.get(s.shop)),
    },
  }));

  return <TopEmailsView stores={stores} />;
}
