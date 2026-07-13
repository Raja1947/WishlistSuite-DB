import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ShopAnalytics from "@/components/ShopAnalytics";

export const revalidate = 300;

type RawTopProduct = {
  productId: string;
  product_handle: string | null;
  product_title: string | null;
  wishlist_count: bigint;
  customer_count: bigint;
  avg_price: number | null;
};

type RawTopCustomer = {
  customerId: string | null;
  email: string | null;
  wishlist_count: bigint;
  item_count: bigint;
  last_active: Date | null;
};

type RawConvStats = {
  conv_all: bigint;
  conv7: bigint;
  conv30: bigint;
  conv90: bigint;
  rev7: number;
  rev30: number;
  rev90: number;
  rev_all: number;
};

type RawWishlistCounts = {
  count_all: bigint;
  count7: bigint;
  count30: bigint;
  count90: bigint;
};

type RawReminderCounts = {
  all_: bigint;
  d7: bigint;
  d30: bigint;
  d90: bigint;
};

type RawRevenuePoint = { date: string; revenue: number };

async function getShopData(shop: string) {
  const now = new Date();
  const cutoff7  = new Date(now.getTime() - 7  * 86400000);
  const cutoff30 = new Date(now.getTime() - 30 * 86400000);
  const cutoff90 = new Date(now.getTime() - 90 * 86400000);

  const [
    installation,
    rawAnalytics,
    rawTopProducts,
    rawTopCustomers,
    rawConvStats,
    rawRevenueByDate,
    rawWishlistCounts,
    rawPriceDrop,
    rawBackInStock,
    rawLowInventory,
    rawKeptTooLong,
  ] = await Promise.all([
    prisma.shopInstallation.findUnique({ where: { shop } }),
    prisma.wishlistAnalytics.findMany({
      where: { shop },
      orderBy: { date: "desc" },
      take: 90,
    }),
    prisma.$queryRaw<RawTopProduct[]>`
      SELECT
        wi."productId",
        MIN(wi."productHandle")             AS product_handle,
        MIN(wi."productCache"->>'title')    AS product_title,
        COUNT(wi.id)::bigint                AS wishlist_count,
        COUNT(DISTINCT w."customerId")::bigint AS customer_count,
        AVG(wi."cachedPrice"::numeric)::float  AS avg_price
      FROM "WishlistItem" wi
      JOIN "Wishlist" w ON w.id = wi."wishlistId"
      WHERE w.shop = ${shop}
      GROUP BY wi."productId"
      ORDER BY wishlist_count DESC
      LIMIT 25
    `,
    prisma.$queryRaw<RawTopCustomer[]>`
      SELECT
        w."customerId",
        c.email,
        COUNT(DISTINCT w.id)::bigint      AS wishlist_count,
        COUNT(DISTINCT wi.id)::bigint     AS item_count,
        MAX(wi."addedAt")                 AS last_active
      FROM "Wishlist" w
      LEFT JOIN "Customer"     c  ON c.id = w."customerId" AND c.shop = ${shop}
      LEFT JOIN "WishlistItem" wi ON wi."wishlistId" = w.id
      WHERE w.shop = ${shop} AND w."customerId" IS NOT NULL
      GROUP BY w."customerId", c.email
      ORDER BY item_count DESC
      LIMIT 50
    `,
    prisma.$queryRaw<RawConvStats[]>`
      SELECT
        COUNT(*)::bigint                                                                  AS conv_all,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff7})::bigint                         AS conv7,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff30})::bigint                        AS conv30,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff90})::bigint                        AS conv90,
        COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${cutoff7}),  0)::float         AS rev7,
        COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${cutoff30}), 0)::float         AS rev30,
        COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${cutoff90}), 0)::float         AS rev90,
        COALESCE(SUM(amount), 0)::float                                                   AS rev_all
      FROM "WishlistConversion"
      WHERE shop = ${shop}
    `,
    prisma.$queryRaw<RawRevenuePoint[]>`
      SELECT
        "createdAt"::date::text AS date,
        SUM(amount)::float      AS revenue
      FROM "WishlistConversion"
      WHERE shop = ${shop}
      GROUP BY "createdAt"::date
      ORDER BY date ASC
    `,
    prisma.$queryRaw<RawWishlistCounts[]>`
      SELECT
        COUNT(*)::bigint                                               AS count_all,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff7})::bigint      AS count7,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff30})::bigint     AS count30,
        COUNT(*) FILTER (WHERE "createdAt" >= ${cutoff90})::bigint     AS count90
      FROM "Wishlist"
      WHERE shop = ${shop}
    `,
    // Reminder emails actually sent (emailSent = true). Price drop uses notifiedAt; others use sentAt.
    prisma.$queryRaw<RawReminderCounts[]>`
      SELECT
        COUNT(*) FILTER (WHERE "emailSent" = true)::bigint                                    AS all_,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "notifiedAt" >= ${cutoff7})::bigint     AS d7,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "notifiedAt" >= ${cutoff30})::bigint    AS d30,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "notifiedAt" >= ${cutoff90})::bigint    AS d90
      FROM "PriceDropNotification"
      WHERE shop = ${shop}
    `,
    prisma.$queryRaw<RawReminderCounts[]>`
      SELECT
        COUNT(*) FILTER (WHERE "emailSent" = true)::bigint                                AS all_,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff7})::bigint     AS d7,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff30})::bigint    AS d30,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff90})::bigint    AS d90
      FROM "BackInStockNotification"
      WHERE shop = ${shop}
    `,
    prisma.$queryRaw<RawReminderCounts[]>`
      SELECT
        COUNT(*) FILTER (WHERE "emailSent" = true)::bigint                                AS all_,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff7})::bigint     AS d7,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff30})::bigint    AS d30,
        COUNT(*) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff90})::bigint    AS d90
      FROM "LowInventoryNotification"
      WHERE shop = ${shop}
    `,
    // Kept-too-long writes one row per product but sends one digest email per customer per run,
    // so count distinct (customer, day) to approximate actual emails sent.
    prisma.$queryRaw<RawReminderCounts[]>`
      SELECT
        COUNT(DISTINCT ("customerId" || '|' || "sentAt"::date::text)) FILTER (WHERE "emailSent" = true)::bigint                                AS all_,
        COUNT(DISTINCT ("customerId" || '|' || "sentAt"::date::text)) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff7})::bigint     AS d7,
        COUNT(DISTINCT ("customerId" || '|' || "sentAt"::date::text)) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff30})::bigint    AS d30,
        COUNT(DISTINCT ("customerId" || '|' || "sentAt"::date::text)) FILTER (WHERE "emailSent" = true AND "sentAt" >= ${cutoff90})::bigint    AS d90
      FROM "KeptTooLongNotification"
      WHERE shop = ${shop}
    `,
  ]);

  if (!installation) return null;

  const cs = rawConvStats[0];
  const wc = rawWishlistCounts[0];

  const mapReminder = (r: RawReminderCounts) => ({
    all: Number(r.all_),
    days90: Number(r.d90),
    days30: Number(r.d30),
    days7: Number(r.d7),
  });

  return {
    installation: {
      name: installation.name,
      myshopifyDomain: installation.myshopifyDomain,
      planDisplayName: installation.planDisplayName,
      country: installation.country,
      currencyCode: installation.currencyCode,
      contactEmail: installation.contactEmail,
      createdAt: installation.createdAt.toISOString(),
      shopifyPlus: installation.shopifyPlus,
    },
    allAnalytics: rawAnalytics.map((a) => ({
      date: a.date.toISOString(),
      totalWishlists: a.totalWishlists,
      addedItems: a.addedItems,
      convertedItems: a.convertedItems,
      revenue: Number(a.revenue),
    })),
    topProducts: rawTopProducts.map((p) => ({
      productId: p.productId,
      product_handle: p.product_handle,
      product_title: p.product_title,
      wishlist_count: Number(p.wishlist_count),
      customer_count: Number(p.customer_count),
      avg_price: p.avg_price,
    })),
    topCustomers: rawTopCustomers.map((c) => ({
      customerId: c.customerId,
      email: c.email,
      wishlist_count: Number(c.wishlist_count),
      item_count: Number(c.item_count),
      last_active: c.last_active ? c.last_active.toISOString() : null,
    })),
    periodStats: {
      all:    { totalConversions: Number(cs.conv_all), totalRevenue: cs.rev_all },
      days90: { totalConversions: Number(cs.conv90),   totalRevenue: cs.rev90  },
      days30: { totalConversions: Number(cs.conv30),   totalRevenue: cs.rev30  },
      days7:  { totalConversions: Number(cs.conv7),    totalRevenue: cs.rev7   },
    },
    allRevenueByDate: rawRevenueByDate,
    wishlistCounts: {
      all:    Number(wc.count_all),
      days90: Number(wc.count90),
      days30: Number(wc.count30),
      days7:  Number(wc.count7),
    },
    reminderEmails: {
      priceDrop:   mapReminder(rawPriceDrop[0]),
      backInStock: mapReminder(rawBackInStock[0]),
      lowInventory: mapReminder(rawLowInventory[0]),
      keptTooLong: mapReminder(rawKeptTooLong[0]),
    },
  };
}

export default async function ShopDetailPage({ params }: { params: { shop: string } }) {
  const shop = decodeURIComponent(params.shop);
  const data = await getShopData(shop);
  if (!data) notFound();

  return (
    <ShopAnalytics
      installation={data.installation}
      allAnalytics={data.allAnalytics}
      topProducts={data.topProducts}
      topCustomers={data.topCustomers}
      periodStats={data.periodStats}
      allRevenueByDate={data.allRevenueByDate}
      wishlistCounts={data.wishlistCounts}
      reminderEmails={data.reminderEmails}
    />
  );
}
