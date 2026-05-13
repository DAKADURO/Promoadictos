"use client";
import { ExternalLink, TrendingDown, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function OfferCard({ offer, index = 0 }) {
  const { title, price, originalPrice, discount, imageUrl, affiliateUrl, category, isFeatured } = offer;

  const savings = originalPrice ? originalPrice - price : 0;
  const isHotDeal = discount && discount >= 30;

  return (
    <motion.article
      className={`offer-card${isFeatured ? " featured" : ""}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Image */}
      <div className="card-img-wrap">
        <img src={imageUrl} alt={title} loading="lazy" />
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
        <div className="card-cat">
          <span className="card-cat-dot" />
          {category}
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
          className="card-cta"
          id={`offer-cta-${offer.id}`}
        >
          Ver oferta
          <ExternalLink size={15} strokeWidth={2.5} />
        </a>
      </div>
    </motion.article>
  );
}
