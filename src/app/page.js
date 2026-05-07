import OfferCard from "@/components/OfferCard";
import { prisma } from "@/lib/db";
import { Flame, TrendingUp, Sparkles, Zap } from "lucide-react";

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

  // Updated Mock data with better images
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
    },
    {
      id: "4",
      title: "Cafetera Nespresso Vertuo Pop+ con 12 Capsulas",
      price: 1599,
      originalPrice: 2999,
      discount: 46,
      imageUrl: "https://http2.mlstatic.com/D_NQ_NP_918073-MLM54911364401_042023-O.webp",
      affiliateUrl: "https://www.mercadolibre.com.mx",
      category: "Hogar"
    }
  ];

  return (
    <div className="container">
      <section className="hero animate-fade">
        <div className="badge">
          <Sparkles className="text-primary" size={16} />
          <span>¡Nuevas ofertas cada hora!</span>
        </div>
        <h1 className="text-6xl font-black mb-6 leading-tight">
          Encuentra las mejores <br/>
          <span className="gradient-text">gangas de internet</span>
        </h1>
        <p className="text-text-muted text-xl max-w-2xl mx-auto mb-10">
          En <strong>PromoAdictos</strong> rastreamos Mercado Libre las 24 horas para traerte descuentos reales. Sin trucos, solo ahorros.
        </p>
        
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary rounded-2xl font-bold text-sm border border-primary/20">
            <Flame size={18} strokeWidth={2.5} />
            Hot Deals
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 bg-secondary/10 text-secondary rounded-2xl font-bold text-sm border border-secondary/20">
            <Zap size={18} strokeWidth={2.5} />
            Flash Sales
          </div>
        </div>
      </section>

      <div className="offer-grid">
        {displayOffers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} />
        ))}
      </div>

      {displayOffers.length === 0 && (
        <div className="text-center py-24 bg-surface/30 rounded-[3rem] border-2 border-dashed border-white/5 mt-12">
          <Sparkles className="text-primary/30 mx-auto mb-4" size={48} />
          <p className="text-text-muted text-xl font-medium">Preparando nuevas ofertas para ti...</p>
        </div>
      )}
    </div>
  );
}
