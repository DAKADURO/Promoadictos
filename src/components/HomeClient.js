"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OfferCard from "@/components/OfferCard";
import CategoryFilter from "@/components/CategoryFilter";
import StoreMarquee from "@/components/StoreMarquee";
import PriceChart from "@/components/PriceChart";
import Navbar from "@/components/Navbar";
import { Sparkles, Zap, ShieldCheck, Clock, CheckCircle2, ArrowRight, X, TrendingDown, Flame, ShoppingBag, Coins, BarChart3, Mail, Loader2, MessageCircle, Send } from "lucide-react";
import { getStoreInfo } from "@/lib/store";
import { BASE_CATEGORIES } from "@/lib/categories";

const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "";
const TELEGRAM_URL = process.env.NEXT_PUBLIC_TELEGRAM_URL || "";

export default function HomeClient({ initialOffers, initialTotal, initialHasMore }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => searchParams.get("categoria") || null);
  const [brand, setBrand] = useState(null);
  const [store, setStore] = useState(null);
  const [offers, setOffers] = useState(initialOffers || []);
  const [currentOffers, setCurrentOffers] = useState(initialOffers || []);
  const [sortBy, setSortBy] = useState(() => searchParams.get("orden") || "hot"); // "hot" | "price-asc" | "recent"

  // Keep category/sort shareable and restorable via the URL without
  // triggering a Next.js navigation/refetch (this state doesn't affect
  // what the server component fetched).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (category) url.searchParams.set("categoria", category);
    else url.searchParams.delete("categoria");
    if (sortBy && sortBy !== "hot") url.searchParams.set("orden", sortBy);
    else url.searchParams.delete("orden");
    window.history.replaceState({}, "", url.toString());
  }, [category, sortBy]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── ESTADO Y LÓGICA DE SUSCRIPCIÓN A ALERTAS ─────
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState("idle"); // "idle" | "loading" | "success" | "error"
  const [subscribeError, setSubscribeError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isSubbed = localStorage.getItem("promoadictos_subscribed");
      if (isSubbed) {
        setSubscribeStatus("success");
      }
    }
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubscribeError("");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!subscribeEmail.trim()) {
      setSubscribeError("Por favor, ingresa tu correo electrónico.");
      setSubscribeStatus("error");
      return;
    }
    if (!emailRegex.test(subscribeEmail)) {
      setSubscribeError("Ingresa un correo electrónico válido.");
      setSubscribeStatus("error");
      return;
    }

    setSubscribeStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: subscribeEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubscribeError(data.error || "Ocurrió un error al suscribirte.");
        setSubscribeStatus("error");
        return;
      }

      setSubscribeStatus("success");
      if (typeof window !== "undefined") {
        localStorage.setItem("promoadictos_subscribed", "true");
      }
    } catch (error) {
      setSubscribeError("Error de conexión. Intenta nuevamente.");
      setSubscribeStatus("error");
    }
  };

  // ── MODAL HISTORIAL DE PRECIOS ──────────────────
  const [selectedOffer, setSelectedOffer] = useState(null);

  // Gestos táctiles de arrastre para móviles (Bottom Sheet)
  const [touchStart, setTouchStart] = useState(0);
  const [touchCurrent, setTouchCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Restablecer los gestos al abrir un nuevo producto
  useEffect(() => {
    if (selectedOffer) {
      setTouchStart(0);
      setTouchCurrent(0);
      setIsDragging(false);
    }
  }, [selectedOffer]);

  const handleTouchStart = (e) => {
    // Solo permitir el arrastre desde la barra de arrastre o la cabecera móvil
    if (e.target.closest(".price-modal-drag-handle") || e.target.closest(".price-modal-mobile-header")) {
      setTouchStart(e.touches[0].clientY);
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStart;
    // Solo arrastrar hacia abajo (valores positivos)
    if (deltaY > 0) {
      setTouchCurrent(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Si se arrastró más de 80px, cerrar el modal
    if (touchCurrent > 80) {
      setSelectedOffer(null);
    }
    setTouchCurrent(0);
  };

  // Tecla Escape y control de scroll en el body
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedOffer(null);
      }
    };
    if (selectedOffer) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedOffer]);

  const storeInfo = useMemo(
    () => (selectedOffer ? getStoreInfo(selectedOffer.affiliateUrl) : { name: "", color: "" }),
    [selectedOffer]
  );

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
        const res = await fetch("/api/offers?page=1&limit=24");
        if (!res.ok) return;
        const data = await res.json();
        const latest = Array.isArray(data.offers) ? data.offers : [];
        if (latest.length === 0) return;

        // Refresh the first page in place; keep any additional pages the
        // user already loaded via "Cargar más" appended after it.
        setOffers(prev => {
          const latestIds = new Set(latest.map(o => o.id));
          const rest = prev.filter(o => !latestIds.has(o.id));
          return [...latest, ...rest];
        });
      } catch (err) {
        console.error("Error polling latest offers:", err);
      }
    };

    // Poll every 60 seconds, first page only, to keep prices/new offers fresh
    const interval = setInterval(fetchLatest, 60000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let result = [...currentOffers];
    if (category) {
      result = result.filter((o) => o.category === category);
    }
    if (brand) {
      result = result.filter((o) => o.brand === brand);
    }
    if (store) {
      result = result.filter((o) => getStoreInfo(o.affiliateUrl).name === store);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          o.category.toLowerCase().includes(q)
      );
    }

    // Ordenar según criterio
    result.sort((a, b) => {
      if (sortBy === "hot") {
        const discountA = parseInt(a.discount) || 0;
        const discountB = parseInt(b.discount) || 0;
        // Priorizar destacados en modo calientes
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return discountB - discountA;
      }
      if (sortBy === "price-asc") {
        return parseFloat(a.price) - parseFloat(b.price);
      }
      if (sortBy === "recent") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id) || 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id) || 0;
        return dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [currentOffers, search, category, brand, store, sortBy]);

  const dynamicCategories = useMemo(() => {
    const activeCategories = Array.from(new Set(currentOffers.map(o => o.category)));
    const extraCategories = activeCategories.filter(
      cat => cat && cat !== "General" && cat !== "Otros" && !BASE_CATEGORIES.includes(cat)
    );
    return ["Todas", ...BASE_CATEGORIES, ...extraCategories, "Otros"];
  }, [currentOffers]);

  const dynamicStores = useMemo(() => {
    const activeStores = Array.from(new Set(currentOffers.map(o => getStoreInfo(o.affiliateUrl).name)));
    return activeStores.length > 1 ? ["Todas", ...activeStores] : [];
  }, [currentOffers]);

  const dynamicBrands = useMemo(() => {
    const activeBrands = Array.from(new Set(currentOffers.map(o => o.brand).filter(Boolean)));
    return activeBrands.length > 0 ? ["Todas", ...activeBrands] : [];
  }, [currentOffers]);

  // ── DYNAMIC SAVINGS METRICS ──────────────────
  const savingsMetrics = useMemo(() => {
    let totalSavingsVal = 0;
    let totalDiscountPercent = 0;
    let maxDiscountPercent = 0;
    let countWithDiscount = 0;

    currentOffers.forEach((o) => {
      const price = parseFloat(o.price) || 0;
      const original = o.originalPrice ? parseFloat(o.originalPrice) : null;
      let discount = parseInt(o.discount) || 0;

      // Calcular descuento en caliente si no está en la base de datos
      if (!discount && original && original > price) {
        discount = Math.round(((original - price) / original) * 100);
      }

      if (original && price && original > price) {
        totalSavingsVal += original - price;
      }

      if (discount > 0) {
        totalDiscountPercent += discount;
        countWithDiscount++;
        if (discount > maxDiscountPercent) {
          maxDiscountPercent = discount;
        }
      }
    });

    const averageDiscount = countWithDiscount > 0 ? Math.round(totalDiscountPercent / countWithDiscount) : 0;

    return {
      totalSavings: totalSavingsVal,
      averageDiscount,
      maxDiscountPercent
    };
  }, [currentOffers]);

  // ── TOP 3 HOT DEALS ──────────────────────────
  const topHotOffers = useMemo(() => {
    return [...currentOffers]
      .map((o) => {
        const price = parseFloat(o.price) || 0;
        const original = o.originalPrice ? parseFloat(o.originalPrice) : null;
        let discount = parseInt(o.discount) || 0;
        
        if (!discount && original && original > price) {
          discount = Math.round(((original - price) / original) * 100);
        }
        
        return {
          ...o,
          calculatedDiscount: discount
        };
      })
      .filter((o) => o.calculatedDiscount > 0)
      .sort((a, b) => b.calculatedDiscount - a.calculatedDiscount)
      .slice(0, 3);
  }, [currentOffers]);

  return (
    <>
      <Navbar onSearch={setSearch} offers={currentOffers} />

      {/* ── HERO COMPACTO Y DE ALTO IMPACTO ────────────────── */}
      <section className="hero animate-up">
        <div className="hero-container">
          {/* Left side: Sales value proposition */}
          <div className="hero-left">
            <div className="badge">
              <span className="dot" />
              Verificado & Actualizado Hoy
            </div>

            <h1 className="hero-title font-display">
              Descuentos reales en
              <br />
              <span className="gradient-text">las mejores tiendas</span>
            </h1>

            <p className="hero-sub">
              Encontramos y verificamos precios bajos en Amazon, Mercado Libre, Liverpool y más.
            </p>

            <div className="hero-quick-tags">
              <span className="hero-tag">🔥 {currentOffers.length} Ofertas activas</span>
              <span className="hero-tag green">⚡ Enlaces 100% directos</span>
            </div>
          </div>

          {/* Right side: Spotlight Deal */}
          {dealOfTheDay && (
            <div className="spotlight-card-wrapper">
              <div
                className="spotlight-card"
                onClick={() => setSelectedOffer(dealOfTheDay)}
              >
                <div className="spotlight-header">
                  <span className="spotlight-tag">
                    ⚡ Oferta Destacada
                  </span>
                  {dealOfTheDay.discount > 0 && (
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
                    Expira en:
                  </div>
                  <div className="spotlight-timer-values">
                    {timeLeft}
                  </div>
                </div>

                {/* Direct CTA */}
                <a
                  href={dealOfTheDay.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="spotlight-btn"
                >
                  <span>Ver Oferta Directa</span>
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── MARQUEE TIENDAS ─────────────────────────────── */}
      <StoreMarquee offers={currentOffers} />

      {/* ── PORTAL FEED SECTION ────────────────── */}
      <section className="portal-layout-section animate-up">
        <div className="container portal-layout-container">
          
          {/* MAIN PRODUCT FEED (LEFT COLUMN) */}
          <div className="portal-main-feed">

            {/* UNIFIED FILTER TOOLBAR */}
            <div className="unified-filter-toolbar">

              {/* Row 1: Category horizontal pills */}
              <CategoryFilter
                onFilter={(cat) => {
                  setCategory(cat);
                  setPage(1);
                }}
                categories={dynamicCategories}
                active={category || "Todas"}
              />

              {/* Row 2: Controls bar (Store, Brand, Sort, Reset) */}
              <div className="filter-controls-row">
                <div className="filter-count">
                  <strong>{filtered.length}</strong> {filtered.length === 1 ? "oferta" : "ofertas"}
                </div>

                <div className="filter-selects-wrap">
                  {/* Select Tienda */}
                  {dynamicStores.length > 0 && (
                    <select
                      className="filter-select"
                      value={store || "Todas"}
                      onChange={(e) => setStore(e.target.value === "Todas" ? null : e.target.value)}
                      aria-label="Filtrar por tienda"
                    >
                      <option value="Todas">Todas las tiendas</option>
                      {dynamicStores.filter(s => s !== "Todas").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}

                  {/* Select Marca */}
                  {dynamicBrands.length > 0 && (
                    <select
                      className="filter-select"
                      value={brand || "Todas"}
                      onChange={(e) => setBrand(e.target.value === "Todas" ? null : e.target.value)}
                      aria-label="Filtrar por marca"
                    >
                      <option value="Todas">Todas las marcas</option>
                      {dynamicBrands.filter(b => b !== "Todas").map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  )}

                  {/* Select Ordenar */}
                  <select
                    className="filter-select sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Ordenar ofertas"
                  >
                    <option value="hot">🔥 Más Calientes</option>
                    <option value="price-asc">💵 Menor Precio</option>
                    <option value="recent">📅 Más Recientes</option>
                  </select>

                  {/* Clear Filters Button if any is active */}
                  {(category || brand || store || search) && (
                    <button
                      className="filter-reset-btn"
                      onClick={() => {
                        setCategory(null);
                        setBrand(null);
                        setStore(null);
                        setSearch("");
                      }}
                      title="Limpiar filtros"
                    >
                      <X size={14} />
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PRODUCT GRID */}
            {filtered.length > 0 ? (
              <>
                <div className="offers-grid">
                  {filtered.map((offer, i) => (
                    <OfferCard key={offer.id} offer={offer} index={i} onOpenModal={setSelectedOffer} />
                  ))}
                  {loadingMore && Array.from({ length: 4 }).map((_, i) => (
                    <div className="offer-card-skeleton" key={`skeleton-${i}`} aria-hidden="true">
                      <div className="skeleton offer-card-skeleton-img" />
                      <div className="offer-card-skeleton-body">
                        <div className="skeleton offer-card-skeleton-line" style={{ width: "40%" }} />
                        <div className="skeleton offer-card-skeleton-line" style={{ width: "90%" }} />
                        <div className="skeleton offer-card-skeleton-line" style={{ width: "60%" }} />
                      </div>
                    </div>
                  ))}
                </div>
                {hasMore && !search && !category && !brand && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "2.5rem" }}>
                    <button 
                      className="btn-primary" 
                      onClick={async () => {
                        setLoadingMore(true);
                        try {
                          const res = await fetch(`/api/offers?page=${page + 1}&limit=24`);
                          const data = await res.json();
                          if (res.ok) {
                            setOffers(prev => {
                              const newOffers = [...prev, ...data.offers];
                              setCurrentOffers(newOffers);
                              return newOffers;
                            });
                            setHasMore(data.hasMore);
                            setPage(prev => prev + 1);
                          }
                        } catch (err) {
                          console.error("Error loading more", err);
                        } finally {
                          setLoadingMore(false);
                        }
                      }}
                      disabled={loadingMore}
                      style={{ padding: "0.85rem 2.2rem", fontSize: "0.95rem" }}
                    >
                      {loadingMore ? <Loader2 size={18} className="animate-spin" /> : "Ver más ofertas"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Sparkles size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.3 }} />
                <p style={{ fontSize: "1rem", fontWeight: 600 }}>
                  {search || category || brand || store ? "No hay ofertas que coincidan" : "Rastreando gangas…"}
                </p>
                <p style={{ fontSize: "0.85rem", marginTop: "0.35rem", color: "var(--clr-dim)" }}>
                  {search || category || brand || store ? "Prueba con otros filtros o término de búsqueda" : "Pronto habrá ofertas increíbles"}
                </p>
              </div>
            )}
          </div>

          {/* SALES-FOCUSED SIDEBAR (RIGHT COLUMN) */}
          {currentOffers.length > 0 && (
            <aside className="portal-sidebar">

              {/* Top Hot Deals Group */}
              {topHotOffers.length > 0 && (
                <div className="sidebar-hot-deals-group">
                  <div className="sidebar-section-header">
                    <span className="sidebar-section-dot orange" />
                    <span className="sidebar-section-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      Top Descuentos <Flame size={16} color="var(--clr-orange)" />
                    </span>
                  </div>

                  <div className="hot-deals-grid">
                    {topHotOffers.map((offer) => {
                      const discount = offer.calculatedDiscount;

                      return (
                        <div 
                          key={`hot-${offer.id}`} 
                          className="hot-deal-card"
                          onClick={() => setSelectedOffer(offer)}
                        >
                          <div className="hot-deal-badge-row">
                            <span className="hot-deal-category-pill">
                              {offer.category}
                            </span>
                            <span className="hot-deal-discount">
                              -{discount}% DCTO
                            </span>
                          </div>

                          <div className="hot-deal-content">
                            <div className="hot-deal-img-wrap">
                              <img 
                                src={offer.imageUrl || "/logo.png"} 
                                alt={offer.title} 
                                onError={(e) => { e.target.src = "/logo.png"; }}
                              />
                            </div>
                            <div className="hot-deal-details">
                              <h3 className="hot-deal-title">{offer.title}</h3>
                              <div className="hot-deal-prices">
                                <span className="hot-deal-price">
                                  ${parseFloat(offer.price).toLocaleString("es-MX")}
                                </span>
                                {offer.originalPrice && (
                                  <span className="hot-deal-original">
                                    ${parseFloat(offer.originalPrice).toLocaleString("es-MX")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* CTA button */}
                          <a 
                            href={offer.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hot-deal-btn"
                          >
                            <span>Comprar oferta</span>
                            <ArrowRight size={14} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Módulo de Suscripción a Alertas */}
              <div className="sidebar-subscribe-card">
                {subscribeStatus === "success" ? (
                  <div className="subscribe-success-state">
                    <div className="subscribe-success-icon">
                      <CheckCircle2 size={28} color="var(--clr-green)" />
                    </div>
                    <h3 className="subscribe-success-title font-display">
                      ¡Alertas activadas! ⚡
                    </h3>
                    <p className="subscribe-success-desc">
                      Te notificaremos apenas detectemos descuentos importantes.
                    </p>
                    <button 
                      className="subscribe-reset-btn"
                      onClick={() => {
                        setSubscribeStatus("idle");
                        setSubscribeEmail("");
                        if (typeof window !== "undefined") {
                          localStorage.removeItem("promoadictos_subscribed");
                        }
                      }}
                    >
                      Registrar otro correo
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="subscribe-header">
                      <div className="subscribe-icon-wrap">
                        <Mail size={20} color="var(--clr-orange)" />
                      </div>
                      <div>
                        <h3 className="subscribe-title font-display">
                          Alertas Volcánicas
                        </h3>
                        <span className="subscribe-subtitle">
                          Recibe ofertas al instante
                        </span>
                      </div>
                    </div>
                    
                    <p className="subscribe-description">
                      ¿Cansado de llegar tarde a las de 90% de descuento? Únete al radar y recíbelas antes que todos.
                    </p>

                    <form onSubmit={handleSubscribe} className="subscribe-form">
                      <div className="subscribe-input-wrapper">
                        <input
                          type="email"
                          placeholder="Tu correo electrónico..."
                          className={`subscribe-input ${subscribeStatus === "error" ? "error" : ""}`}
                          value={subscribeEmail}
                          onChange={(e) => {
                            setSubscribeEmail(e.target.value);
                            if (subscribeStatus === "error") {
                              setSubscribeStatus("idle");
                              setSubscribeError("");
                            }
                          }}
                          disabled={subscribeStatus === "loading"}
                        />
                      </div>

                      {subscribeStatus === "error" && (
                        <div className="subscribe-error-msg">
                          {subscribeError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className={`subscribe-btn ${subscribeStatus === "loading" ? "loading" : ""}`}
                        disabled={subscribeStatus === "loading"}
                      >
                        {subscribeStatus === "loading" ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Registrando...</span>
                          </>
                        ) : (
                          <>
                            <span>Unirse al club 🌋</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>

              {WHATSAPP_URL && (
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="sidebar-whatsapp-card">
                  <div className="subscribe-icon-wrap whatsapp">
                    <MessageCircle size={20} color="#25D366" />
                  </div>
                  <div>
                    <h3 className="subscribe-title font-display">Comunidad de WhatsApp</h3>
                    <span className="subscribe-subtitle">Únete y recibe ofertas al instante</span>
                  </div>
                  <ArrowRight size={18} className="sidebar-whatsapp-arrow" />
                </a>
              )}

            </aside>
          )}

        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────── */}
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-col footer-col-brand">
            <div className="footer-brand gradient-text">PromoAdictos</div>
            <p className="footer-tagline">Rastreamos descuentos reales para que no tengas que hacerlo tú.</p>
            {(WHATSAPP_URL || TELEGRAM_URL) && (
              <div className="footer-social">
                {WHATSAPP_URL && (
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="footer-social-link">
                    <MessageCircle size={18} />
                  </a>
                )}
                {TELEGRAM_URL && (
                  <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="footer-social-link">
                    <Send size={18} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="footer-col">
            <span className="footer-col-title">Navegación</span>
            <Link href="/">Inicio</Link>
            <Link href="/cupones">Cupones</Link>
            <Link href="/terminales">Terminales Point</Link>
          </div>

          <div className="footer-col">
            <span className="footer-col-title">Legal</span>
            <p className="footer-disclosure">
              PromoAdictos participa en programas de afiliados de Mercado Libre y otras tiendas.
              Podemos recibir una comisión por compras realizadas a través de nuestros enlaces, sin costo
              adicional para ti. Los precios y descuentos pueden variar después de publicados.
            </p>
          </div>
        </div>

        <div className="container footer-bottom">
          © {new Date().getFullYear()} PromoAdictos — Las mejores ofertas de México
        </div>
      </footer>

      {/* ── MODAL DETALLE & HISTORIAL DE PRECIOS ────────────────── */}
      {selectedOffer && (
        <div 
          className="price-modal-overlay"
          onClick={() => setSelectedOffer(null)}
          style={{
            backgroundColor: touchCurrent > 0 ? `rgba(3, 5, 10, ${Math.max(0.2, 0.8 - (touchCurrent / 200) * 0.6)})` : undefined,
            backdropFilter: touchCurrent > 0 ? `blur(${Math.max(2, 12 - (touchCurrent / 200) * 10)}px)` : undefined,
            WebkitBackdropFilter: touchCurrent > 0 ? `blur(${Math.max(2, 12 - (touchCurrent / 200) * 10)}px)` : undefined,
            transition: isDragging ? "none" : "background-color 0.3s, backdrop-filter 0.3s, -webkit-backdrop-filter 0.3s"
          }}
        >
          <div 
            className="price-modal-card"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: touchCurrent > 0 ? `translateY(${touchCurrent}px)` : undefined,
              transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)"
            }}
          >
            {/* Barra superior de arrastre / Handle para móviles */}
            <div className="price-modal-drag-handle" />

            {/* Botón de cerrar */}
            <button 
              className="price-modal-close"
              onClick={() => setSelectedOffer(null)}
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>

            <div className="price-modal-grid">
              {/* Lado izquierdo: Imagen y descuento (Desktop únicamente) */}
              <div className="price-modal-left price-modal-desktop-only">
                <div className="price-modal-img-wrap">
                  <img 
                    src={selectedOffer.imageUrl || "/logo.png"} 
                    alt={selectedOffer.title} 
                    onError={(e) => { e.target.src = "/logo.png"; }}
                  />
                  {selectedOffer.discount && (
                    <span className="price-modal-badge">
                      -{selectedOffer.discount}%
                    </span>
                  )}
                </div>
                
                {/* Micro-badge de tienda */}
                <div className="store-micro-badge" style={{ color: storeInfo.color }}>
                  <span className="store-micro-badge-dot" style={{ background: storeInfo.color }} />
                  {storeInfo.name}
                </div>
              </div>

              {/* Lado derecho: Detalles, gráfica SVG y CTA */}
              <div className="price-modal-right">
                {/* Cabecera Compacta Horizontal para Móviles */}
                <div className="price-modal-mobile-header">
                  <div className="price-modal-mobile-img-wrap">
                    <img 
                      src={selectedOffer.imageUrl || "/logo.png"} 
                      alt={selectedOffer.title}
                      onError={(e) => { e.target.src = "/logo.png"; }}
                    />
                    {selectedOffer.discount && (
                      <span className="price-modal-mobile-badge">
                        -{selectedOffer.discount}%
                      </span>
                    )}
                  </div>
                  <div className="price-modal-mobile-info">
                    <span className="price-modal-cat">{selectedOffer.category}</span>
                    <h2 className="price-modal-title">{selectedOffer.title}</h2>
                    <div className="price-modal-pricing" style={{ marginTop: "0.15rem", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      <span className="price-modal-price" style={{ fontSize: "1.35rem", fontWeight: 900 }}>
                        ${parseFloat(selectedOffer.price).toLocaleString("es-MX")}
                      </span>
                      {selectedOffer.originalPrice && (
                        <span className="price-modal-original" style={{ fontSize: "0.85rem", color: "var(--clr-muted)", textDecoration: "line-through" }}>
                          ${parseFloat(selectedOffer.originalPrice).toLocaleString("es-MX")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cabecera Desktop (Oculta en móviles) */}
                <div className="price-modal-header price-modal-desktop-only">
                  <span className="price-modal-cat">{selectedOffer.category}</span>
                  <h2 className="price-modal-title">{selectedOffer.title}</h2>
                </div>

                <div className="price-modal-pricing price-modal-desktop-only">
                  <span className="price-modal-price">
                    ${parseFloat(selectedOffer.price).toLocaleString("es-MX")}
                  </span>
                  {selectedOffer.originalPrice && (
                    <>
                      <span className="price-modal-original">
                        ${parseFloat(selectedOffer.originalPrice).toLocaleString("es-MX")}
                      </span>
                      <span className="price-modal-savings">
                        Ahorras ${(parseFloat(selectedOffer.originalPrice) - parseFloat(selectedOffer.price)).toLocaleString("es-MX")}
                      </span>
                    </>
                  )}
                </div>

                {/* Gráfico de precio real */}
                <PriceChart priceHistories={selectedOffer.priceHistories} />

                {/* Link a la página completa de la oferta */}
                <Link href={`/oferta/${selectedOffer.id}`} className="price-modal-detail-link">
                  Ver página completa de esta oferta <ArrowRight size={14} />
                </Link>

                {/* Botón CTA gigante */}
                <a 
                  href={selectedOffer.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="price-modal-btn"
                >
                  <ShoppingBag size={18} strokeWidth={2.5} />
                  <span>Comprar ahora en {storeInfo.name}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
