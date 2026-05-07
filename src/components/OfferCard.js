"use client";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function OfferCard({ offer }) {
  const { title, price, originalPrice, discount, imageUrl, affiliateUrl, category } = offer;

  return (
    <motion.article
      className="offer-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Image */}
      <div className="card-img-wrap">
        <img src={imageUrl} alt={title} loading="lazy" />
        {discount && (
          <span className="discount-badge">-{discount}%</span>
        )}
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

        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="card-cta"
        >
          Ver en Mercado Libre
          <ExternalLink size={16} strokeWidth={2.5} />
        </a>
      </div>
    </motion.article>
  );
}
