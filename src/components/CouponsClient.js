"use client";

import { useState, useMemo, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Ticket, Tag, Copy, Check, ExternalLink, Calendar, Search, Sparkles, Clock, RefreshCw } from "lucide-react";

import { MOCK_COUPONS } from "@/lib/mockData";

export default function CouponsClient({ initialCoupons = [] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState("Todas");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

  // Fetch real coupons from API and fallback to mock if empty
  useEffect(() => {
    if (initialCoupons.length > 0) {
      setCoupons(initialCoupons);
    } else {
      const fetchCoupons = async () => {
        try {
          const res = await fetch("/api/coupons");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              setCoupons(data);
            } else {
              setCoupons(MOCK_COUPONS);
            }
          } else {
            setCoupons(MOCK_COUPONS);
          }
        } catch {
          setCoupons(MOCK_COUPONS);
        }
      };
      fetchCoupons();
    }
  }, [initialCoupons]);

  const [toastMessage, setToastMessage] = useState(null);

  // Copy handler + Auto redirect to affiliate store
  const handleCopy = (id, code, link) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code)
        .then(() => {
          setCopiedId(id);
          setToastMessage(`¡Cupón ${code} copiado! Abriendo tienda...`);
          setTimeout(() => setToastMessage(null), 3000);
          setTimeout(() => setCopiedId(null), 2500);

          if (link) {
            setTimeout(() => {
              window.open(link, "_blank", "noopener,noreferrer");
            }, 350);
          }
        })
        .catch(() => {
          if (link) window.open(link, "_blank", "noopener,noreferrer");
        });
    } else {
      if (link) window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  // Get dynamic stores and categories for filters
  const stores = useMemo(() => {
    const list = coupons.map(c => c.store);
    return ["Todas", ...Array.from(new Set(list))];
  }, [coupons]);

  const categories = useMemo(() => {
    const list = coupons.map(c => c.category);
    return ["Todas", ...Array.from(new Set(list))];
  }, [coupons]);

  // Filtering logic
  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStore = selectedStore === "Todas" || c.store === selectedStore;
      const matchesCategory = selectedCategory === "Todas" || c.category === selectedCategory;
      const matchesActive = c.isActive !== false;

      return matchesSearch && matchesStore && matchesCategory && matchesActive;
    });
  }, [coupons, searchQuery, selectedStore, selectedCategory]);

  return (
    <>
      <Navbar onSearch={setSearchQuery} />

      <main style={{ minHeight: "85vh", background: "var(--clr-bg)" }} className="animate-up">
        <div className="container coupons-container">
          
          {/* Hero */}
          <section className="coupons-hero">
            <div className="badge" style={{ margin: "0 auto 1rem", width: "fit-content" }}>
              <Sparkles size={13} color="var(--clr-orange)" />
              Cupones Verificados
            </div>
            <h1 className="coupons-title font-display">
              Códigos de Descuento <br />
              <span className="gradient-text">para ahorrar más</span>
            </h1>
            <p className="coupons-subtitle">
              Copia códigos verificados de tus tiendas favoritas de México y aplícalos al pagar. 
              ¡Combínalos con nuestras ofertas para llevarte las mayores gangas!
            </p>
          </section>

          {/* Filters by Store */}
          <div className="store-filter-bar">
            {stores.map(store => (
              <button
                key={store}
                className={`store-filter-pill ${selectedStore === store ? "active" : ""}`}
                onClick={() => setSelectedStore(store)}
              >
                <Ticket size={14} />
                {store}
              </button>
            ))}
          </div>

          {/* Category Quick Filter */}
          <div className="filter-bar" style={{ justifyContent: "center", marginBottom: "2.5rem", padding: 0 }}>
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid View */}
          {filteredCoupons.length > 0 ? (
            <div className="coupons-grid">
              {filteredCoupons.map(coupon => {
                const isFeatured = !!coupon.isFeatured;
                const storeClass = coupon.store.toLowerCase().replace(/\s+/g, "");
                const formattedStoreClass = ["mercadolibre", "amazon", "aliexpress"].includes(storeClass) ? storeClass : "general";

                // Format expiry date
                let expiryText = null;
                if (coupon.expiryDate) {
                  const expiry = new Date(coupon.expiryDate);
                  if (expiry > Date.now()) {
                    const diffDays = Math.ceil((expiry - Date.now()) / (1000 * 60 * 60 * 24));
                    expiryText = diffDays === 1 ? "Expira mañana" : `Expira en ${diffDays} días`;
                  } else {
                    expiryText = "Expirado";
                  }
                }

                return (
                  <div key={coupon.id} className="coupon-card">
                    {/* Ticket punch hole cutouts on side borders */}
                    <div className="ticket-cutout-left" />
                    <div className="ticket-cutout-right" />

                    {/* UPPER CARD SECTION */}
                    <div className="coupon-upper-panel">
                      <div className="coupon-badge-row">
                        <span className={`coupon-store-tag ${formattedStoreClass}`}>
                          {coupon.store}
                        </span>
                        {isFeatured && (
                          <span className="coupon-featured-badge">
                            ⚡ Destacado
                          </span>
                        )}
                      </div>

                      {coupon.discount && (
                        <div className="coupon-discount-value">
                          {coupon.discount}
                        </div>
                      )}

                      <h3 className="coupon-title">{coupon.title}</h3>
                      {coupon.description && (
                        <p className="coupon-desc">{coupon.description}</p>
                      )}
                    </div>

                    {/* DASHED SEPARATOR */}
                    <div className="coupon-ticket-divider" />

                    {/* LOWER CARD SECTION */}
                    <div className="coupon-lower-panel">
                      <div className="coupon-expiry-row">
                        {expiryText ? (
                          <>
                            <Clock size={13} className="coupon-expiry-icon" color="var(--clr-orange-lt)" />
                            <span style={{ color: "var(--clr-orange-lt)", fontWeight: 600 }}>{expiryText}</span>
                          </>
                        ) : (
                          <>
                            <Calendar size={13} className="coupon-expiry-icon" />
                            <span>Válido por tiempo limitado</span>
                          </>
                        )}
                      </div>

                      <div className="coupon-action-row">
                        {/* Copy Code Button */}
                        <button
                          className={`coupon-copy-btn ${copiedId === coupon.id ? "copied" : ""}`}
                          onClick={() => handleCopy(coupon.id, coupon.code, coupon.link)}
                        >
                          {copiedId === coupon.id ? (
                            <>
                              <Check size={15} />
                              <span>¡Copiado y Abriendo!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={15} />
                              <span>{coupon.code}</span>
                            </>
                          )}
                        </button>

                        {/* Affiliate Store Link */}
                        <a
                          href={coupon.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="coupon-shop-link"
                          title={`Ir a la tienda ${coupon.store}`}
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <Ticket size={40} style={{ margin: "0 auto 1rem", opacity: 0.2 }} />
              <p style={{ fontSize: "1rem", fontWeight: 600 }}>No se encontraron cupones</p>
              <p style={{ fontSize: "0.85rem", marginTop: "0.35rem", color: "var(--clr-dim)" }}>
                Prueba buscando por otra tienda o eliminando los filtros aplicados.
              </p>
            </div>
          )}

          {/* Floating Toast Notification for 1-Click Copy */}
          {toastMessage && (
            <div style={{
              position: "fixed",
              bottom: "2rem",
              right: "2rem",
              background: "linear-gradient(135deg, var(--clr-orange), var(--clr-orange-lt))",
              color: "#fff",
              padding: "0.85rem 1.35rem",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "0.9rem",
              boxShadow: "0 10px 30px rgba(255,92,0,0.4)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              gap: "0.6rem"
            }}>
              <Check size={18} />
              {toastMessage}
            </div>
          )}

        </div>
      </main>

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
