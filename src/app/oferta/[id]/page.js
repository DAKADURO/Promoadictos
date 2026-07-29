import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import OfferDetailClient from "@/components/OfferDetailClient";
import { getStoreInfo } from "@/lib/store";

export const dynamic = "force-dynamic";

async function getOffer(id) {
  return prisma.offer.findUnique({
    where: { id },
    include: {
      priceHistories: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
}

export async function generateMetadata({ params }) {
  const { id } = await params;

  let offer;
  try {
    offer = await getOffer(id);
  } catch (e) {
    return {};
  }

  if (!offer || !offer.isActive) return {};

  const title = `${offer.title} — $${offer.price.toLocaleString("es-MX")} MXN | PromoAdictos`;
  const description =
    offer.description ||
    `${offer.discount ? `${offer.discount}% de descuento` : "Oferta"} en ${getStoreInfo(offer.affiliateUrl).name}. Precio actual: $${offer.price.toLocaleString("es-MX")} MXN.`;
  const url = `https://promoadictos.com/oferta/${offer.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName: "PromoAdictos",
      images: offer.imageUrl ? [{ url: offer.imageUrl, width: 800, height: 600, alt: offer.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: offer.imageUrl ? [offer.imageUrl] : undefined,
    },
  };
}

export default async function OfertaPage({ params }) {
  const { id } = await params;

  let offer = null;
  try {
    offer = await getOffer(id);
  } catch (e) {
    console.error("Error fetching offer detail:", e);
  }

  if (!offer || !offer.isActive) notFound();

  let related = [];
  try {
    related = await prisma.offer.findMany({
      where: { category: offer.category, isActive: true, id: { not: offer.id } },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
  } catch (e) {
    console.error("Error fetching related offers:", e);
  }

  const storeInfo = getStoreInfo(offer.affiliateUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: offer.title,
    image: offer.imageUrl ? [offer.imageUrl] : undefined,
    description: offer.description || offer.title,
    ...(offer.brand ? { brand: { "@type": "Brand", name: offer.brand } } : {}),
    offers: {
      "@type": "Offer",
      url: `https://promoadictos.com/oferta/${offer.id}`,
      priceCurrency: "MXN",
      price: offer.price,
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: storeInfo.name },
    },
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <OfferDetailClient offer={offer} related={related} storeInfo={storeInfo} />
    </>
  );
}
