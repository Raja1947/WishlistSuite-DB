import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import StoreEmailRecipients from "@/components/StoreEmailRecipients";

export const revalidate = 300;

type RawRecipient = {
  customerId: string;
  email: string | null;
  all_: bigint;
  d7: bigint;
  d30: bigint;
  d90: bigint;
};

export default async function StoreEmailsPage({ params }: { params: { shop: string } }) {
  const shop = decodeURIComponent(params.shop);
  const now = new Date();
  const cutoff7 = new Date(now.getTime() - 7 * 86400000);
  const cutoff30 = new Date(now.getTime() - 30 * 86400000);
  const cutoff90 = new Date(now.getTime() - 90 * 86400000);

  const [installation, rawPriceDrop, rawBackInStock, rawLowInventory, rawKeptTooLong] = await Promise.all([
    prisma.shopInstallation.findUnique({ where: { shop }, select: { name: true, myshopifyDomain: true } }),
    // Per-customer emails actually sent (emailSent = true). Price drop uses notifiedAt; others use sentAt.
    prisma.$queryRaw<RawRecipient[]>`
      SELECT n."customerId", MIN(c.email) AS email,
        COUNT(*) FILTER (WHERE n."emailSent" = true)::bigint                                    AS all_,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."notifiedAt" >= ${cutoff7})::bigint   AS d7,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."notifiedAt" >= ${cutoff30})::bigint  AS d30,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."notifiedAt" >= ${cutoff90})::bigint  AS d90
      FROM "PriceDropNotification" n
      LEFT JOIN "Customer" c ON c.id = n."customerId" AND c.shop = ${shop}
      WHERE n.shop = ${shop} AND n."customerId" IS NOT NULL
      GROUP BY n."customerId"
    `,
    prisma.$queryRaw<RawRecipient[]>`
      SELECT n."customerId", MIN(c.email) AS email,
        COUNT(*) FILTER (WHERE n."emailSent" = true)::bigint                                AS all_,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff7})::bigint   AS d7,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff30})::bigint  AS d30,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff90})::bigint  AS d90
      FROM "BackInStockNotification" n
      LEFT JOIN "Customer" c ON c.id = n."customerId" AND c.shop = ${shop}
      WHERE n.shop = ${shop}
      GROUP BY n."customerId"
    `,
    prisma.$queryRaw<RawRecipient[]>`
      SELECT n."customerId", MIN(c.email) AS email,
        COUNT(*) FILTER (WHERE n."emailSent" = true)::bigint                                AS all_,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff7})::bigint   AS d7,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff30})::bigint  AS d30,
        COUNT(*) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff90})::bigint  AS d90
      FROM "LowInventoryNotification" n
      LEFT JOIN "Customer" c ON c.id = n."customerId" AND c.shop = ${shop}
      WHERE n.shop = ${shop}
      GROUP BY n."customerId"
    `,
    // Kept-too-long: one digest per customer per day → count distinct sentAt::date per customer.
    prisma.$queryRaw<RawRecipient[]>`
      SELECT n."customerId", MIN(c.email) AS email,
        COUNT(DISTINCT n."sentAt"::date) FILTER (WHERE n."emailSent" = true)::bigint                                AS all_,
        COUNT(DISTINCT n."sentAt"::date) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff7})::bigint   AS d7,
        COUNT(DISTINCT n."sentAt"::date) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff30})::bigint  AS d30,
        COUNT(DISTINCT n."sentAt"::date) FILTER (WHERE n."emailSent" = true AND n."sentAt" >= ${cutoff90})::bigint  AS d90
      FROM "KeptTooLongNotification" n
      LEFT JOIN "Customer" c ON c.id = n."customerId" AND c.shop = ${shop}
      WHERE n.shop = ${shop} AND n."customerId" IS NOT NULL
      GROUP BY n."customerId"
    `,
  ]);

  if (!installation) notFound();

  const pick = (r: RawRecipient) => ({
    all: Number(r.all_),
    days90: Number(r.d90),
    days30: Number(r.d30),
    days7: Number(r.d7),
  });
  const empty = { all: 0, days90: 0, days30: 0, days7: 0 };

  // Merge the four per-type maps into one recipient row per customer.
  const byCustomer = new Map<string, {
    customerId: string;
    email: string | null;
    priceDrop: typeof empty;
    backInStock: typeof empty;
    lowInventory: typeof empty;
    keptTooLong: typeof empty;
  }>();

  const ensure = (id: string, email: string | null) => {
    let row = byCustomer.get(id);
    if (!row) {
      row = { customerId: id, email: null, priceDrop: empty, backInStock: empty, lowInventory: empty, keptTooLong: empty };
      byCustomer.set(id, row);
    }
    if (email && !row.email) row.email = email;
    return row;
  };

  for (const r of rawPriceDrop) ensure(r.customerId, r.email).priceDrop = pick(r);
  for (const r of rawBackInStock) ensure(r.customerId, r.email).backInStock = pick(r);
  for (const r of rawLowInventory) ensure(r.customerId, r.email).lowInventory = pick(r);
  for (const r of rawKeptTooLong) ensure(r.customerId, r.email).keptTooLong = pick(r);

  const recipients = Array.from(byCustomer.values());

  return (
    <StoreEmailRecipients
      shop={shop}
      storeName={installation.name}
      recipients={recipients}
    />
  );
}
