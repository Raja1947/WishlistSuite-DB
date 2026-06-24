import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { shop: string } }) {
  const shop = decodeURIComponent(params.shop);

  const customers = await prisma.$queryRaw<
    Array<{ customerId: string | null; email: string | null; wishlist_count: bigint; item_count: bigint; last_active: Date | null }>
  >`
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
  `;

  return NextResponse.json(
    customers.map((c) => ({
      customerId: c.customerId,
      email: c.email,
      wishlist_count: Number(c.wishlist_count),
      item_count: Number(c.item_count),
      last_active: c.last_active ? c.last_active.toISOString() : null,
    }))
  );
}
