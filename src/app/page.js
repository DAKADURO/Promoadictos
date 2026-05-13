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
    imageUrl: "https://http2.mlstatic.com/D_NQ_NP_615873-MLU72007534374_092023-O.webp",
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
    imageUrl: "https://http2.mlstatic.com/D_NQ_NP_896350-MLM51025537542_082022-O.webp",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Moda",
  },
  {
    id: "3",
    title: 'Monitor Gamer Samsung Odyssey G5 27" Curvo 144 Hz',
    price: 4500,
    originalPrice: 6500,
    discount: 30,
    imageUrl: "https://http2.mlstatic.com/D_NQ_NP_900605-MLA44358896000_122020-O.webp",
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
    imageUrl: "https://http2.mlstatic.com/D_NQ_NP_918073-MLM54911364401_042023-O.webp",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Hogar",
  },
  {
    id: "5",
    title: "Sony WH-1000XM5 — Auriculares ANC Inalámbricos",
    price: 5999,
    originalPrice: 8499,
    discount: 29,
    imageUrl: "https://http2.mlstatic.com/D_NQ_NP_791685-MLM52148448442_102022-O.webp",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Audio",
  },
  {
    id: "6",
    title: "Silla Gamer Razer Iskur Ergonómica — Negro",
    price: 6499,
    originalPrice: 9999,
    discount: 35,
    imageUrl: "https://http2.mlstatic.com/D_NQ_NP_986767-MLA52438665282_112022-O.webp",
    affiliateUrl: "https://www.mercadolibre.com.mx",
    category: "Gaming",
  },
];

export default async function Home() {
  const dbOffers = await getOffers();
  const offers = dbOffers.length > 0 ? dbOffers : MOCK_OFFERS;

  return <HomeClient offers={offers} />;
}
