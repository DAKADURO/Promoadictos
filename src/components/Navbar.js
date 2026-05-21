"use client";
import Link from "next/link";
import { Lock, Search, CreditCard, Tag } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";

export default function Navbar({ onSearch, offers = [] }) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  // Click outside handler to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter matching suggestions dynamically (max 5)
  const suggestions = useMemo(() => {
    if (!query.trim() || !offers.length) return [];
    const q = query.toLowerCase();
    return offers.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query, offers]);

  // Reset activeIndex when query or suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [query, suggestions]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onSearch?.(val);
    setShowDropdown(true);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || !suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        window.open(suggestions[activeIndex].affiliateUrl, "_blank", "noopener,noreferrer");
        setShowDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <header className="glass-nav">
      <div className="container nav-inner">

        {/* Brand */}
        <Link href="/" className="nav-brand">
          <img src="/logo.png" alt="PromoAdictos" className="nav-brand-logo" />
          <div>
            <div className="nav-brand-name gradient-text">PromoAdictos</div>
            <div className="nav-brand-tagline">Tu adicción a las ofertas</div>
          </div>
        </Link>

        {/* Search */}
        {onSearch && (
          <div className="nav-search" ref={containerRef}>
            <input
              type="text"
              placeholder="Buscar ofertas…"
              value={query}
              onChange={handleInput}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              id="nav-search-input"
              autoComplete="off"
            />
            <Search size={16} className="nav-search-icon" />

            {/* Suggestions dropdown */}
            {showDropdown && query.trim() && (
              <div className="nav-search-dropdown">
                {suggestions.length > 0 ? (
                  suggestions.map((offer, idx) => (
                    <a
                      key={offer.id}
                      href={offer.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nav-search-item"
                      onClick={() => setShowDropdown(false)}
                      style={{
                        background: idx === activeIndex ? "rgba(255, 255, 255, 0.05)" : "",
                        borderLeftColor: idx === activeIndex ? "var(--clr-orange)" : ""
                      }}
                    >
                      <img
                        src={offer.imageUrl || "/logo.png"}
                        alt={offer.title}
                        className="nav-search-thumb"
                        onError={(e) => { e.target.src = "/logo.png"; }}
                      />
                      <div className="nav-search-info">
                        <div className="nav-search-item-title">{offer.title}</div>
                        <div className="nav-search-item-meta">
                          <span className="nav-search-item-price">
                            ${parseFloat(offer.price).toLocaleString("es-MX")}
                          </span>
                          {offer.originalPrice && (
                            <span className="nav-search-item-op">
                              ${parseFloat(offer.originalPrice).toLocaleString("es-MX")}
                            </span>
                          )}
                          {offer.discount && (
                            <span className="nav-search-item-discount">
                              -{offer.discount}%
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="nav-search-empty">
                    No se encontraron ofertas para "{query}" ⚡
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="nav-actions">
          <Link href="/cupones" className="nav-cupones-btn" id="nav-cupones-btn">
            <Tag size={16} />
            <span>Cupones</span>
          </Link>
          <Link href="/terminales" className="nav-terminal-btn" id="nav-terminales-btn">
            <CreditCard size={16} />
            <span>Terminales Point</span>
          </Link>
          <Link href="/admin" className="btn-ghost" title="Admin" id="nav-admin-btn">
            <Lock size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
