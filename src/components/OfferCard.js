"use client";
import { ExternalLink, TrendingDown, Flame } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function OfferCard({ offer, index = 0, onOpenModal }) {
  const { title, price, originalPrice, discount, imageUrl, affiliateUrl, category, brand, isFeatured } = offer;

  const savings = originalPrice ? originalPrice - price : 0;
  const isHotDeal = discount && discount >= 30;

  const handleCardClick = (e) => {
    // Si se hace clic en el cuerpo de la tarjeta, abrir el modal interactivo
    if (onOpenModal) {
      onOpenModal(offer);
    }
  };

  return (
    <motion.div
      onClick={handleCardClick}
      className={`offer-card${isFeatured ? " featured" : ""}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Image */}
      <div className="card-img-wrap">
        <Image
          src={imageUrl}
          alt={title}
          width={400}
          height={300}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading={index < 2 ? "eager" : "lazy"}
          priority={index < 2}
          decoding="async"
        />
        {discount && (
          <span className="discount-badge">-{discount}%</span>
        )}
        {/* Price trend badge */}
        {isHotDeal ? (
          <span className="price-trend hot">
            <Flame size={12} /> ¡Ofertón!
          </span>
        ) : discount ? (
          <span className="price-trend down">
            <TrendingDown size={12} /> Precio bajo
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="card-body">
        <div className="card-meta-row">
          <div className="card-cat" style={{ marginBottom: 0 }}>
            <span className="card-cat-dot" />
            {category}
          </div>
          {brand && (
            <span className="card-brand">
              {brand}
            </span>
          )}
        </div>

        <h2 className="card-title">{title}</h2>

        <div className="card-pricing">
          <span className="card-price">
            ${price.toLocaleString("es-MX")}
          </span>
          {originalPrice && (
            <span className="card-original">
              ${originalPrice.toLocaleString("es-MX")}
            </span>
          )}
        </div>

        {savings > 0 && (
          <span className="card-savings">
            Ahorras ${savings.toLocaleString("es-MX")}
          </span>
        )}

        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation(); // Evitar que abra el modal
          }}
          className="card-cta"
          id={`offer-cta-${offer.id}`}
        >
          Ver oferta
          <ExternalLink size={15} strokeWidth={2.5} />
        </a>
      </div>
    </motion.div>
  );
}

