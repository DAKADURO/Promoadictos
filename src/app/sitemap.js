import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const baseUrl = 'https://promoadictos.com';

  const staticRoutes = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/cupones`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/terminales`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  let offerRoutes = [];
  try {
    const offers = await prisma.offer.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    offerRoutes = offers.map((o) => ({
      url: `${baseUrl}/oferta/${o.id}`,
      lastModified: o.updatedAt,
      changeFrequency: 'daily',
      priority: 0.7,
    }));
  } catch (e) {
    console.error('Error building sitemap offer routes:', e);
  }

  return [...staticRoutes, ...offerRoutes];
}
