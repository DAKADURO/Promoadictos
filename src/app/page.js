export const dynamic = "force-dynamic";

import HomeClient from "@/components/HomeClient";
import { prisma } from "@/lib/db";

async function getOffers() {
  try {
    return await prisma.offer.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    return [];
  }
}

const MOCK_OFFERS = [
  {
    id: "1",
    title: "Apple iPhone 15 Pro Max 256 GB — Titanio Natural",
    price: 24999,
    originalPrice: 28999,
    discount: 13,
    imageUrl: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=600&auto=format&fit=crop",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Tecnología",
    isFeatured: true,
  },
  {
    id: "2",
    title: "Nike Air Force 1 '07 Blanco — Original",
    price: 1899,
    originalPrice: 2499,
    discount: 24,
    imageUrl: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=600&auto=format&fit=crop",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Moda",
  },
  {
    id: "3",
    title: 'Monitor Gamer Samsung Odyssey G5 27" Curvo 144 Hz',
    price: 4500,
    originalPrice: 6500,
    discount: 30,
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=600&auto=format&fit=crop",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Gaming",
    isFeatured: true,
  },
  {
    id: "4",
    title: "Cafetera Nespresso Vertuo Pop+ + 12 Cápsulas de regalo",
    price: 1599,
    originalPrice: 2999,
    discount: 46,
    imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=600&auto=format&fit=crop",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Hogar",
  },
  {
    id: "5",
    title: "Sony WH-1000XM5 — Auriculares ANC Inalámbricos",
    price: 5999,
    originalPrice: 8499,
    discount: 29,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Audio",
  },
  {
    id: "6",
    title: "Silla Gamer Razer Iskur Ergonómica — Negro",
    price: 6499,
    originalPrice: 9999,
    discount: 35,
    imageUrl: "https://images.unsplash.com/photo-1598550476439-6847785fce6e?q=80&w=600&auto=format&fit=crop",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Gaming",
  },
];

export default async function Home() {
  const dbOffers = await getOffers();
  const offers = dbOffers.length > 0 ? dbOffers : MOCK_OFFERS;

  return <HomeClient offers={offers} />;
}
