import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import RecipientEmailLog from "@/components/RecipientEmailLog";

export const revalidate = 300;

type RawEvent = {
  ts: Date;
  type: string;
  productId: string;
  variantId: string | null;
  priceWas: unknown | null;
  priceNow: unknown | null;
  title: string | null;
  handle: string | null;
};

export default async function RecipientLogPage({ params }: { params: { shop: string; customerId: string } }) {
  const shop = decodeURIComponent(params.shop);
  const customerId = decodeURIComponent(params.customerId);

  const [installation, customer, rawEvents] = await Promise.all([
    prisma.shopInstallation.findUnique({ where: { shop }, select: { name: true } }),
    prisma.customer.findFirst({ where: { shop, id: customerId }, select: { email: true } }),
    prisma.$queryRaw<RawEvent[]>`
      SELECT e.ts, e.type, e."productId", e."variantId", e."priceWas", e."priceNow",
             pl.title, pl.handle
      FROM (
        SELECT "notifiedAt" AS ts, 'price_drop' AS type, "productId", "variantId", "priceWas", "priceNow"
          FROM "PriceDropNotification"
          WHERE shop = ${shop} AND "customerId" = ${customerId} AND "emailSent" = true
        UNION ALL
        SELECT "sentAt", 'back_in_stock', "productId", "variantId", NULL, NULL
          FROM "BackInStockNotification"
          WHERE shop = ${shop} AND "customerId" = ${customerId} AND "emailSent" = true
        UNION ALL
        SELECT "sentAt", 'low_inventory', "productId", "variantId", NULL, NULL
          FROM "LowInventoryNotification"
          WHERE shop = ${shop} AND "customerId" = ${customerId} AND "emailSent" = true
        UNION ALL
        SELECT "sentAt", 'kept_too_long', "productId", "variantId", NULL, NULL
          FROM "KeptTooLongNotification"
          WHERE shop = ${shop} AND "customerId" = ${customerId} AND "emailSent" = true
      ) e
      LEFT JOIN LATERAL (
        SELECT wi."productCache"->>'title' AS title, wi."productHandle" AS handle
        FROM "WishlistItem" wi
        JOIN "Wishlist" w ON w.id = wi."wishlistId"
        WHERE w.shop = ${shop} AND wi."productId" = e."productId"
          AND (wi."productCache"->>'title' IS NOT NULL OR wi."productHandle" IS NOT NULL)
        LIMIT 1
      ) pl ON true
      ORDER BY e.ts DESC
    `,
  ]);

  if (!installation) notFound();

  const events = rawEvents.map((e) => ({
    ts: e.ts.toISOString(),
    type: e.type,
    productId: e.productId,
    variantId: e.variantId,
    priceWas: e.priceWas != null ? Number(e.priceWas) : null,
    priceNow: e.priceNow != null ? Number(e.priceNow) : null,
    title: e.title,
    handle: e.handle,
  }));

  return (
    <RecipientEmailLog
      shop={shop}
      storeName={installation.name}
      customerId={customerId}
      email={customer?.email ?? null}
      events={events}
    />
  );
}
