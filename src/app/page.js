import OfferCard from "@/components/OfferCard";
import { prisma } from "@/lib/db";
import { Sparkles, ArrowDown } from "lucide-react";

async function getOffers() {
  try {
    return await prisma.offer.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("Error fetching offers:", e);
    return [];
  }
}

export default async function Home() {
  const offers = await getOffers();

  const displayOffers = offers.length > 0 ? offers : [
    {
      id: "1",
      title: "Apple iPhone 15 Pro Max (256 GB) - Titanio Natural",
      price: 24999,
      originalPrice: 28999,
      discount: 13,
      imageUrl: "https://http2.mlstatic.com/D_NQ_NP_615873-MLU72007534374_092023-O.webp",
      affiliateUrl: "https://www.mercadolibre.com.mx",
      category: "Tecnología"
    },
    {
      id: "2",
      title: "Tenis Nike Air Force 1 '07 - Blanco Original",
      price: 1899,
      originalPrice: 2499,
      discount: 24,
      imageUrl: "https://http2.mlstatic.com/D_NQ_NP_896350-MLM51025537542_082022-O.webp",
      affiliateUrl: "https://www.mercadolibre.com.mx",
      category: "Moda"
    },
    {
      id: "3",
      title: "Monitor Gamer Samsung Odyssey G5 27\" Curvo 144Hz",
      price: 4500,
      originalPrice: 6500,
      discount: 30,
      imageUrl: "https://http2.mlstatic.com/D_NQ_NP_900605-MLA44358896000_122020-O.webp",
      affiliateUrl: "https://www.mercadolibre.com.mx",
      category: "Gamer"
    }
  ];

  return (
    <div className="container">
      <section className="hero animate-fade">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-[0.3em] mb-12">
          <Sparkles size={14} />
          Exclusivo de PromoAdictos
        </div>
        
        <h1>
          EL PARAÍSO DE LAS <br/>
          <span className="gradient-text">OFERTAS ADICTIVAS</span>
        </h1>
        
        <p className="text-white/40 text-lg max-w-xl mx-auto mt-8 mb-16 font-medium leading-relaxed">
          No buscamos ofertas, las cazamos. Productos de Mercado Libre con descuentos que parecen un error.
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="w-px h-16 bg-gradient-to-b from-primary to-transparent" />
          <ArrowDown className="text-primary animate-bounce" size={24} />
        </div>
      </section>

      <div className="offer-grid">
        {displayOffers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>

      {displayOffers.length === 0 && (
        <div className="text-center py-40">
          <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/10">
            <Sparkles className="text-primary/20" size={40} />
          </div>
          <p className="text-white/20 text-xl font-black uppercase tracking-widest">
            Rastreando gangas...
          </p>
        </div>
      )}
    </div>
  );
}
