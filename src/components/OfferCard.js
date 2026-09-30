"use client";
import { ExternalLink, Flame, Award } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { getStoreInfo } from "@/lib/store";
import { isRealHistoricLow, shortTitle, trackOfferClick } from "@/lib/offerSignals";

export default function OfferCard({ offer, index = 0, onOpenModal }) {
  const { id, title, price, originalPrice, discount, imageUrl, affiliateUrl, isFeatured } = offer;

  const numericPrice = parseFloat(price) || 0;
  const numericOriginal = originalPrice ? parseFloat(originalPrice) : null;
  const savings = numericOriginal && numericOriginal > numericPrice ? numericOriginal - numericPrice : 0;
  const isHotDeal = discount && discount >= 50;

  const storeInfo = getStoreInfo(affiliateUrl);

  const isHistoricLow = isRealHistoricLow(offer);

  // Cálculo de Meses Sin Intereses (MSI) para productos de $500+ MXN
  const msiAmount = numericPrice >= 500 ? Math.round(numericPrice / 12) : null;

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
          <span className="price-trend historic-low" style={{ background: "linear-gradient(135deg, #e11d48, #ff5c00)", color: "#fff", fontWeight: 800 }}>
            <Award size={11} /> MÍNIMO HISTÓRICO
          </span>
        ) : isHotDeal ? (
          <span className="price-trend hot">
            <Flame size={11} /> ¡Ofertón!
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="card-body">
        <h2 className="card-title" title={title}>{shortTitle(title)}</h2>

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

        {/* MSI orientativo: depende del banco y de la tienda */}
        {msiAmount && (
          <div
            title="Sujeto a tarjetas participantes y disponibilidad en la tienda"
            style={{ fontSize: "0.72rem", color: "#34D399", fontWeight: 700, margin: "0.4rem 0 0.6rem" }}
          >
            💳 Hasta 12 MSI de ${msiAmount.toLocaleString("es-MX")}/mes*
          </div>
        )}

        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            trackOfferClick(offer, "card");
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


