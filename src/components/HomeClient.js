"use client";

import { useState, useMemo, useEffect } from "react";
import OfferCard from "@/components/OfferCard";
import CategoryFilter from "@/components/CategoryFilter";
import StoreMarquee from "@/components/StoreMarquee";
import Navbar from "@/components/Navbar";
import { Sparkles, Zap, ShieldCheck, Clock, CheckCircle2, ArrowRight } from "lucide-react";

export default function HomeClient({ offers }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(null);
  const [currentOffers, setCurrentOffers] = useState(offers);

  useEffect(() => {
    setCurrentOffers(offers);
  }, [offers]);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/offers");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setCurrentOffers(data);
          }
        }
      } catch (err) {
        console.error("Error polling latest offers:", err);
      }
    };

    // Poll every 8 seconds to synchronize new offers in real-time
    const interval = setInterval(fetchLatest, 8000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let result = currentOffers;
    if (category) {
      result = result.filter((o) => o.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [currentOffers, search, category]);

  const totalSavings = currentOffers.reduce((acc, o) => {
    if (o.originalPrice && o.price) return acc + (o.originalPrice - o.price);
    return acc;
  }, 0);

  return (
    <>
      <Navbar onSearch={setSearch} />

      {/* ── HERO ────────────────────────────────── */}
      <section className="hero animate-up">
        <div className="badge">
          <span className="dot" />
          Actualizado en tiempo real
        </div>

        <h1 className="hero-title font-display">
          Ofertas que otros
          <br />
          <span className="gradient-text">no encuentran</span>
        </h1>

        <p className="hero-sub">
          Rastreamos descuentos reales de las mejores tiendas de México.
          Sin spam, sin relleno — solo gangas que valen la pena.
        </p>

        {/* Stats */}
        <div className="stats-bar" style={{ marginTop: "1rem" }}>
          <div className="stat-item">
            <Zap size={15} color="var(--clr-orange)" />
            <span className="stat-value">{currentOffers.length}</span> ofertas activas
          </div>
          <div className="stat-item">
            <ShieldCheck size={15} color="var(--clr-green)" />
            <span className="stat-value">100%</span> verificadas
          </div>
          <div className="stat-item">
            <Clock size={15} color="var(--clr-purple)" />
            Actualizado <span className="stat-value">hoy</span>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────── */}
      <StoreMarquee />

      {/* ── TERMINALES POINT ────────────────────── */}
      <section className="point-section">
        <div className="container">
          <div className="point-header">
            <div className="point-header-tag">
              <span className="dot" />
              Oferta Especial Mercado Pago
            </div>
            <h2 className="point-title font-display">
              Acepta tarjetas en tu negocio con <span>Descuento Point</span>
            </h2>
            <p className="point-subtitle">
              Compra tu lector Point con descuento exclusivo de PromoAdictos y recibe cashback en tus primeros cobros. Sin mensualidades ni rentas fijas.
            </p>
          </div>

          <div className="point-grid">
            {/* Card 1: Point Smart 2 */}
            <a 
              href="https://mpago.li/2PWowCN" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="point-card"
            >
              <div className="point-card-badge">89% DTO</div>
              <div className="point-card-cashback">Cashback $400</div>
              <div className="point-img-container">
                <img 
                  src="/point_smart_2.png" 
                  alt="Point Smart 2" 
                  loading="lazy" 
                  decoding="async" 
                />
              </div>
              <div className="point-card-body">
                <div className="point-card-title-wrap">
                  <h3 className="point-card-title">Point Smart 2</h3>
                </div>
                <p className="point-card-subtitle">
                  El más completo. Chip 4G gratis e ilimitado y ticket impreso.
                </p>
                <div className="point-card-pricing">
                  <span className="point-card-price">$479</span>
                  <span className="point-card-original">$4,499</span>
                </div>
                <div className="point-card-features">
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Chip 4G gratis con internet ilimitado</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Impresión de recibos física y digital</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Batería de larga duración (todo el día)</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Envío gratis en 2h y 1 año de garantía</span>
                  </div>
                </div>
                <div className="point-card-btn">
                  Comprar con descuento
                  <ArrowRight size={15} />
                </div>
              </div>
            </a>

            {/* Card 2: Point Air */}
            <a 
              href="https://mpago.li/2PWowCN" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="point-card"
            >
              <div className="point-card-badge">93% DTO</div>
              <div className="point-card-cashback">Cashback $200</div>
              <div className="point-img-container">
                <img 
                  src="/point_air.png" 
                  alt="Point Air" 
                  loading="lazy" 
                  decoding="async" 
                />
              </div>
              <div className="point-card-body">
                <div className="point-card-title-wrap">
                  <h3 className="point-card-title">Point Air</h3>
                </div>
                <p className="point-card-subtitle">
                  Elegante y veloz. Con luz LED, chip 4G y WiFi gratis.
                </p>
                <div className="point-card-pricing">
                  <span className="point-card-price">$199</span>
                  <span className="point-card-original">$2,999</span>
                </div>
                <div className="point-card-features">
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Chip 4G gratis y conexión WiFi</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Pantalla a color y diseño ultraligero</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Cobros más rápidos y batería duradera</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Envío gratis en 2h y 1 año de garantía</span>
                  </div>
                </div>
                <div className="point-card-btn">
                  Comprar con descuento
                  <ArrowRight size={15} />
                </div>
              </div>
            </a>

            {/* Card 3: Point Mini */}
            <a 
              href="https://mpago.li/2PWowCN" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="point-card"
            >
              <div className="point-card-badge">82% DTO</div>
              <div className="point-card-cashback">Point Mini Gratis (*)</div>
              <div className="point-img-container">
                <img 
                  src="/point_mini.png" 
                  alt="Point Mini" 
                  loading="lazy" 
                  decoding="async" 
                />
              </div>
              <div className="point-card-body">
                <div className="point-card-title-wrap">
                  <h3 className="point-card-title">Point Mini</h3>
                </div>
                <p className="point-card-subtitle">
                  El más práctico. Cobra donde quieras usando tu celular.
                </p>
                <div className="point-card-pricing">
                  <span className="point-card-price">$89</span>
                  <span className="point-card-original">$499</span>
                </div>
                <div className="point-card-features">
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Conexión Bluetooth veloz a tu celular</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Tamaño ultra de bolsillo y recargable</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Teclado físico para mayor seguridad</span>
                  </div>
                  <div className="point-feature-item">
                    <CheckCircle2 size={14} className="point-feature-icon" />
                    <span>Envío gratis en 2h y 1 año de garantía</span>
                  </div>
                </div>
                <div className="point-card-btn">
                  Comprar con descuento
                  <ArrowRight size={15} />
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── OFFERS ──────────────────────────────── */}
      <section style={{ padding: "2rem 0 7rem" }}>
        <div className="container">
          <div className="section-header">
            <span className="section-dot" />
            <span className="section-title">Ofertas Activas</span>
            <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--clr-muted)" }}>
              {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Category filter */}
          <CategoryFilter onFilter={setCategory} />

          {filtered.length > 0 ? (
            <div className="offers-grid">
              {filtered.map((offer, i) => (
                <OfferCard key={offer.id} offer={offer} index={i} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={40} style={{ margin: "0 auto 1rem", opacity: 0.2 }} />
              <p style={{ fontSize: "1rem", fontWeight: 600 }}>
                {search || category ? "No hay ofertas que coincidan" : "Rastreando gangas…"}
              </p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.35rem", color: "var(--clr-dim)" }}>
                {search || category ? "Prueba con otro filtro o búsqueda" : "Pronto habrá ofertas increíbles"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────── */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-brand gradient-text">PromoAdictos</div>
          <p style={{ marginTop: "0.4rem" }}>
            © {new Date().getFullYear()} PromoAdictos — Las mejores ofertas de México
          </p>
        </div>
      </footer>
    </>
  );
}
