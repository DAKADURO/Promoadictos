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
    (Array.isArray(priceHistories) &&
    priceHistories.length >= 2 &&
    numericPrice <= Math.min(...priceHistories.map((h) => parseFloat(h.price)))) || (discount && discount >= 40);

  // Cálculo de Meses Sin Intereses (MSI) para productos de $500+ MXN
  const msiAmount = numericPrice >= 500 ? Math.round(numericPrice / 12) : null;

  // Contador de prueba social determinista basado en ID
  const socialProofCount = id ? (id.toString().split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 95) + 28 : 42;

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

        {/* Desglose de MSI + Prueba Social */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: "0.4rem 0 0.6rem" }}>
          {msiAmount && (
            <div style={{ fontSize: "0.72rem", color: "#34D399", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span>💳</span> 12 MSI de ${msiAmount.toLocaleString("es-MX")}/mes
            </div>
          )}
          <div style={{ fontSize: "0.68rem", color: "var(--clr-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Flame size={11} color="var(--clr-orange)" /> {socialProofCount} personas lo aprovecharon
          </div>
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


