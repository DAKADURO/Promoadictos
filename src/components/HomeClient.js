"use client";

import { useState, useMemo, useEffect } from "react";
import OfferCard from "@/components/OfferCard";
import CategoryFilter from "@/components/CategoryFilter";
import StoreMarquee from "@/components/StoreMarquee";
import Navbar from "@/components/Navbar";
import { Sparkles, Zap, ShieldCheck, Clock } from "lucide-react";

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
