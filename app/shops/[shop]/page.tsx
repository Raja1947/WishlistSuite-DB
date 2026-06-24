import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import ShopAnalytics from "@/components/ShopAnalytics";

export const dynamic = "force-dynamic";

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

async function getShopData(shop: string) {
  const installation = await prisma.shopInstallation.findUnique({
    where: { shop },
  });
  if (!installation) return null;

  const [allConversions, rawAnalytics, rawTopProducts, rawTopCustomers, actualWishlistCount] = await Promise.all([
    prisma.wishlistConversion.findMany({
      where: { shop },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
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
    prisma.wishlist.findMany({ where: { shop }, select: { createdAt: true } }),
  ]);

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
    allConversions: allConversions.map((c) => ({
      amount: Number(c.amount),
      createdAt: c.createdAt.toISOString(),
    })),
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
    allWishlists: actualWishlistCount.map((w) => ({ createdAt: w.createdAt.toISOString() })),
  };
}

export default async function ShopDetailPage({ params }: { params: { shop: string } }) {
  const shop = decodeURIComponent(params.shop);
  const data = await getShopData(shop);
  if (!data) notFound();

  return (
    <ShopAnalytics
      installation={data.installation}
      allConversions={data.allConversions}
      allAnalytics={data.allAnalytics}
      topProducts={data.topProducts}
      topCustomers={data.topCustomers}
      allWishlists={data.allWishlists}
    />
  );
}
