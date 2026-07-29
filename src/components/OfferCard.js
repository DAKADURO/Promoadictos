"use client";
import { ExternalLink, Flame, Award } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { getStoreInfo } from "@/lib/store";

export default function OfferCard({ offer, index = 0, onOpenModal }) {
  const { id, title, price, originalPrice, discount, imageUrl, affiliateUrl, category, brand, isFeatured, priceHistories } = offer;

  const numericPrice = parseFloat(price) || 0;
  const numericOriginal = originalPrice ? parseFloat(originalPrice) : null;
  const savings = numericOriginal && numericOriginal > numericPrice ? numericOriginal - numericPrice : 0;
  const isHotDeal = discount && discount >= 30;

  const storeInfo = getStoreInfo(affiliateUrl);

  const isHistoricLow =
    Array.isArray(priceHistories) &&
    priceHistories.length >= 2 &&
    numericPrice <= Math.min(...priceHistories.map((h) => parseFloat(h.price)));

  const handleCardClick = (e) => {
    if (onOpenModal) {
      onOpenModal(offer);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCardClick(e);
    }
  };

  return (
    <motion.div
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalles de ${title}`}
      className={`offer-card${isFeatured ? " featured" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Image Wrap */}
      <div className="card-img-wrap">
        <Image
          src={imageUrl || "/logo.png"}
          alt={title}
          width={360}
          height={260}
          style={{ width: "100%", height: "100%", objectFit: "contain", background: "#ffffff" }}
          loading={index < 4 ? "eager" : "lazy"}
          priority={index < 4}
          decoding="async"
          onError={(e) => { e.currentTarget.srcset = "/logo.png"; }}
        />

        {/* Discount Badge Overlay */}
        {discount > 0 && (
          <span className="discount-badge">
            -{discount}%
          </span>
        )}

        {/* Store Tag Overlay */}
        {storeInfo?.name && (
          <span className="card-store-badge">
            {storeInfo.name}
          </span>
        )}

        {/* Special tag overlay */}
        {isHistoricLow ? (
          <span className="price-trend historic-low">
            <Award size={11} /> Mínimo histórico
          </span>
        ) : isHotDeal ? (
          <span className="price-trend hot">
            <Flame size={11} /> ¡Ofertón!
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="card-body">
        <div className="card-meta-row">
          <span className="card-cat">{category || "Oferta"}</span>
          {brand && <span className="card-brand">{brand}</span>}
        </div>

        <h2 className="card-title" title={title}>{title}</h2>

        <div className="card-pricing-wrap">
          <div className="card-pricing">
            <span className="card-price">
              ${numericPrice.toLocaleString("es-MX")}
            </span>
            {numericOriginal && numericOriginal > numericPrice && (
              <span className="card-original">
                ${numericOriginal.toLocaleString("es-MX")}
              </span>
            )}
          </div>
          {savings > 0 && (
            <span className="card-savings">
              Ahorras ${savings.toLocaleString("es-MX")}
            </span>
          )}
        </div>

        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="card-cta"
          id={`offer-cta-${id}`}
        >
          <span>Ver oferta</span>
          <ExternalLink size={15} strokeWidth={2.5} />
        </a>
      </div>
    </motion.div>
  );
}


