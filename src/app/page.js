export const dynamic = "force-dynamic";

import HomeClient from "@/components/HomeClient";
import { prisma } from "@/lib/db";
import { MOCK_OFFERS } from "@/lib/mockData";

export default async function Home() {
  const limit = 24;
  let dbOffers = [];
  let total = 0;

  try {
    dbOffers = await prisma.offer.findMany({
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" }
      ],
      take: limit,
      include: {
        priceHistories: {
          orderBy: { createdAt: "desc" },
          take: 30
        }
      }
    });
    total = await prisma.offer.count();
  } catch (e) {
    console.error("Error fetching initial offers", e);
  }

  const offers = dbOffers.length > 0 ? dbOffers : MOCK_OFFERS;
  const initialTotal = dbOffers.length > 0 ? total : MOCK_OFFERS.length;
  const initialHasMore = dbOffers.length > 0 ? dbOffers.length < total : false;

  return <HomeClient initialOffers={offers} initialTotal={initialTotal} initialHasMore={initialHasMore} />;
}
