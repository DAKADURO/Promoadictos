import OfferCard from "@/components/OfferCard";
import { prisma } from "@/lib/db";
import { Flame, TrendingUp } from "lucide-react";

async function getOffers() {
  try {
    return await prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("Error fetching offers:", e);
    return []; // Return empty if DB is not ready
  }
}

export default async function Home() {
  const offers = await getOffers();

  // Mock data if no offers in DB
  const displayOffers = offers.length > 0 ? offers : [
    {
      id: "1",
      title: "Consola PlayStation 5 con God of War Ragnarök",
      price: 10500,
      originalPrice: 13999,
      discount: 25,
      imageUrl: "https://http2.mlstatic.com/D_NQ_NP_603893-MLA52538153406_112022-O.webp",
      affiliateUrl: "https://www.mercadolibre.com.mx",
      category: "Tecnología"
    },
    {
      id: "2",
      title: "Silla Gamer Profesional Ergonómica Reclinable",
      price: 2499,
      originalPrice: 4500,
      discount: 44,
      imageUrl: "https://http2.mlstatic.com/D_NQ_NP_675276-MLA48098270559_112021-O.webp",
      affiliateUrl: "https://www.mercadolibre.com.mx",
      category: "Hogar"
    }
  ];

  return (
    <div className="container animate-fade">
      <header className="mb-12 text-center py-12 border-b border-white/5">
        <h1 className="text-5xl font-extrabold mb-4">
          <span className="text-white">Las mejores </span>
          <span className="gradient-text">ofertas del día</span>
        </h1>
        <p className="text-text-muted text-lg max-w-2xl mx-auto">
          Seleccionamos manualmente las mejores promociones de Mercado Libre para que ahorres en cada compra.
        </p>
      </header>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full font-bold">
          <Flame size={20} />
          Destacados
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-full font-bold">
          <TrendingUp size={20} />
          Más vendidos
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {displayOffers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>

      {displayOffers.length === 0 && (
        <div className="text-center py-20 bg-surface/50 rounded-3xl border border-dashed border-white/10">
          <p className="text-text-muted text-xl">No hay ofertas disponibles por el momento.</p>
        </div>
      )}
    </div>
  );
}
