import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { shop: string; customerId: string } }) {
  const shop = decodeURIComponent(params.shop);
  const customerId = decodeURIComponent(params.customerId);

  const wishlists = await prisma.wishlist.findMany({
    where: { shop, customerId },
    orderBy: { createdAt: "asc" },
    include: {
      items: {
        orderBy: { addedAt: "desc" },
        select: {
          id: true,
          productId: true,
          productHandle: true,
          productCache: true,
          cachedPrice: true,
          addedAt: true,
        },
      },
    },
  });

  return NextResponse.json(
    wishlists.map((w) => ({
      id: w.id,
      name: w.name ?? "Default Wishlist",
      isDefault: w.isDefault,
      createdAt: w.createdAt.toISOString(),
      itemCount: w.items.length,
      items: w.items.map((item) => {
        const cache = item.productCache as Record<string, string> | null;
        return {
          id: item.id,
          productId: item.productId,
          handle: item.productHandle,
          title: cache?.title ?? item.productHandle ?? item.productId,
          price: item.cachedPrice ? Number(item.cachedPrice) : null,
          addedAt: item.addedAt.toISOString(),
        };
      }),
    }))
  );
}
