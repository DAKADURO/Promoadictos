"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ExternalLink, ShoppingBag, MessageCircle, Send, Link2, Check } from "lucide-react";
import PriceChart from "@/components/PriceChart";

function ShareButtons({ title, url }) {
  const [copied, setCopied] = useState(false);
  const shareText = encodeURIComponent(`${title} — ${url}`);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Error copying link:", e);
    }
  };

  return (
    <div className="share-buttons">
      <a
        href={`https://wa.me/?text=${shareText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn whatsapp"
        aria-label="Compartir por WhatsApp"
      >
        <MessageCircle size={18} /> WhatsApp
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="share-btn telegram"
        aria-label="Compartir por Telegram"
      >
        <Send size={18} /> Telegram
      </a>
      <button onClick={handleCopy} className="share-btn copy" aria-label="Copiar link">
        {copied ? <Check size={18} /> : <Link2 size={18} />}
        {copied ? "¡Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}

function RelatedOfferCard({ offer }) {
  return (
    <Link href={`/oferta/${offer.id}`} className="offer-card related-offer-card">
      <div className="card-img-wrap">
        <Image
          src={offer.imageUrl}
          alt={offer.title}
          width={300}
          height={225}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {offer.discount && <span className="discount-badge">-{offer.discount}%</span>}
      </div>
      <div className="card-body">
        <div className="card-cat">
          <span className="card-cat-dot" />
          {offer.category}
        </div>
        <h3 className="card-title">{offer.title}</h3>
        <div className="card-pricing">
          <span className="card-price">${offer.price.toLocaleString("es-MX")}</span>
          {offer.originalPrice && (
            <span className="card-original">${offer.originalPrice.toLocaleString("es-MX")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function OfferDetailClient({ offer, related, storeInfo }) {
  const url = `https://promoadictos.com/oferta/${offer.id}`;
  const savings = offer.originalPrice ? offer.originalPrice - offer.price : 0;

  return (
    <div className="container offer-detail-page">
      <Link href="/" className="offer-detail-back">
        <ArrowLeft size={16} /> Volver a las ofertas
      </Link>

      <div className="offer-detail-grid">
        <div className="offer-detail-image-wrap">
          <img
            src={offer.imageUrl || "/logo.png"}
            alt={offer.title}
            onError={(e) => { e.target.src = "/logo.png"; }}
          />
          {offer.discount && <span className="price-modal-badge">-{offer.discount}%</span>}
        </div>

        <div className="offer-detail-info">
          <div className="store-micro-badge" style={{ color: storeInfo.color }}>
            <span className="store-micro-badge-dot" style={{ background: storeInfo.color }} />
            {storeInfo.name}
          </div>

          <span className="price-modal-cat">{offer.category}</span>
          <h1 className="offer-detail-title">{offer.title}</h1>

          {offer.description && <p className="offer-detail-description">{offer.description}</p>}

          <div className="price-modal-pricing" style={{ marginTop: "0.5rem" }}>
            <span className="price-modal-price">${offer.price.toLocaleString("es-MX")}</span>
            {offer.originalPrice && (
              <>
                <span className="price-modal-original">${offer.originalPrice.toLocaleString("es-MX")}</span>
                <span className="price-modal-savings">Ahorras ${savings.toLocaleString("es-MX")}</span>
              </>
            )}
          </div>

          <PriceChart priceHistories={offer.priceHistories} />

          <a href={offer.affiliateUrl} target="_blank" rel="noopener noreferrer" className="price-modal-btn">
            <ShoppingBag size={18} strokeWidth={2.5} />
            <span>Comprar ahora en {storeInfo.name}</span>
            <ExternalLink size={16} />
          </a>

          <ShareButtons title={offer.title} url={url} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="offer-detail-related">
          <div className="section-header">
            <span className="section-dot" />
            <span className="section-title">También te puede interesar</span>
          </div>
          <div className="offers-grid">
            {related.map((o) => (
              <RelatedOfferCard key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
