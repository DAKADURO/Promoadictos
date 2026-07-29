export const dynamic = "force-dynamic";

import CouponsClient from "@/components/CouponsClient";
import { prisma } from "@/lib/db";

async function getCoupons() {
  try {
    return await prisma.coupon.findMany({
      where: { isActive: true },
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" }
      ]
    });
  } catch (error) {
    console.error("Error loading coupons from DB:", error);
    return [];
  }
}

export default async function CuponesPage() {
  const coupons = await getCoupons();
  
  // JSON serialization safety check for Next.js Server Components passing to Client Components
  const serializedCoupons = coupons.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    expiryDate: c.expiryDate ? c.expiryDate.toISOString() : null,
  }));

  return <CouponsClient initialCoupons={serializedCoupons} />;
}
