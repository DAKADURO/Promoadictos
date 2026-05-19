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

  // ── SPOTLIGHT DEAL OF THE DAY ──────────────────
  const dealOfTheDay = useMemo(() => {
    if (!currentOffers.length) return null;
    const sorted = [...currentOffers].sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (b.discount || 0) - (a.discount || 0);
    });
    return sorted[0];
  }, [currentOffers]);

  // Live Countdown Timer to Midnight
  const [timeLeft, setTimeLeft] = useState("00h 00m 00s");
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight
      const diffMs = midnight - now;

      if (diffMs <= 0) {
        setTimeLeft("00h 00m 00s");
        return;
      }

      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      const hrsStr = hrs.toString().padStart(2, "0");
      const minsStr = mins.toString().padStart(2, "0");
      const secsStr = secs.toString().padStart(2, "0");

      setTimeLeft(`${hrsStr}h ${minsStr}m ${secsStr}s`);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // 3D Card Rotation State
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;

    // Calculate rotation angle (max 10 degrees)
    const factorX = -(y / (box.height / 2)) * 10;
    const factorY = (x / (box.width / 2)) * 10;

    setRotate({ x: factorX, y: factorY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

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

  const dynamicCategories = useMemo(() => {
    const baseCategories = ["Tecnología", "Hogar", "Moda", "Gaming", "Audio", "Deportes", "Belleza"];
    const activeCategories = Array.from(new Set(currentOffers.map(o => o.category)));
    const extraCategories = activeCategories.filter(
      cat => cat && cat !== "General" && cat !== "Otros" && !baseCategories.includes(cat)
    );
    return ["Todas", ...baseCategories, ...extraCategories, "Otros"];
  }, [currentOffers]);

  return (
    <>
      <Navbar onSearch={setSearch} offers={currentOffers} />

      {/* ── HERO ────────────────────────────────── */}
      <section className="hero animate-up">
        <div className="hero-container">
          {/* Left side: Text & Stats */}
          <div className="hero-left">
            <div className="badge">
              <span className="dot" />
              Actualizado en tiempo real
            </div>

            <h1 className="hero-title font-display" style={{ textAlign: "inherit" }}>
              Ofertas que otros
              <br />
              <span className="gradient-text">no encuentran</span>
            </h1>

            <p className="hero-sub" style={{ textAlign: "inherit", margin: "1rem 0 1.5rem" }}>
              Rastreamos descuentos reales de las mejores tiendas de México.
              Sin spam, sin relleno — solo gangas que valen la pena.
            </p>

            {/* Stats */}
            <div className="stats-bar" style={{ justifyContent: "inherit" }}>
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
          </div>

          {/* Right side: 3D Spotlight Card */}
          {dealOfTheDay && (
            <div className="spotlight-card-wrapper">
              <div
                className="spotlight-card"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                  transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.02, 1.02, 1.02)`,
                  transition: rotate.x === 0 && rotate.y === 0 ? "transform 0.5s ease" : "none"
                }}
              >
                <div className="spotlight-header">
                  <span className="spotlight-tag">
                    ⚡ Oferta del Día
                  </span>
                  {dealOfTheDay.discount && (
                    <span className="spotlight-discount-badge">
                      -{dealOfTheDay.discount}% DCTO
                    </span>
                  )}
                </div>

                <div className="spotlight-body">
                  <div className="spotlight-img-wrap">
                    <img
                      src={dealOfTheDay.imageUrl || "/logo.png"}
                      alt={dealOfTheDay.title}
                      className="spotlight-img"
                      onError={(e) => { e.target.src = "/logo.png"; }}
                    />
                  </div>
                  <div className="spotlight-info">
                    <h3 className="spotlight-title">{dealOfTheDay.title}</h3>
                    <div className="spotlight-prices">
                      <span className="spotlight-price">
                        ${parseFloat(dealOfTheDay.price).toLocaleString("es-MX")}
                      </span>
                      {dealOfTheDay.originalPrice && (
                        <span className="spotlight-original">
                          ${parseFloat(dealOfTheDay.originalPrice).toLocaleString("es-MX")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="spotlight-timer-box">
                  <div className="spotlight-timer-label">
                    <Clock size={13} color="var(--clr-orange)" />
                    Termina en:
                  </div>
                  <div className="spotlight-timer-values">
                    {timeLeft}
                  </div>
                </div>

                {/* Action CTA */}
                <a
                  href={dealOfTheDay.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spotlight-btn"
                >
                  <span>Aprovechar Oferta</span>
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>
          )}
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
          <CategoryFilter onFilter={setCategory} categories={dynamicCategories} />

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
