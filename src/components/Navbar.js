"use client";
import Link from "next/link";
import Image from "next/image";
import { Lock, Search, CreditCard, Tag, Sparkles } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";

export default function Navbar({ onSearch, offers = [] }) {
  const { data: session } = useSession();
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
          <div className="nav-brand-logo-wrap">
            <Image src="/logo.png" alt="PromoAdictos" width={34} height={34} className="nav-brand-logo" priority />
          </div>
          <div>
            <div className="nav-brand-name">
              PROMO<span className="brand-accent">ADICTOS</span>
            </div>
            <div className="nav-brand-tagline">Descuentos Reales en México</div>
          </div>
        </Link>

        {/* Search */}
        {onSearch && (
          <div className="nav-search" ref={containerRef}>
            <input
              type="text"
              placeholder="Buscar marcas, productos u ofertas..."
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
                      className={`nav-search-item${idx === activeIndex ? " active" : ""}`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <Image
                        src={offer.imageUrl || "/logo.png"}
                        alt={offer.title}
                        width={38}
                        height={38}
                        className="nav-search-thumb"
                        onError={(e) => { e.currentTarget.srcset = "/logo.png 1x"; e.currentTarget.src = "/logo.png"; }}
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
                          {offer.discount > 0 && (
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
                    No se encontraron ofertas para &quot;{query}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="nav-actions">
          <Link href="/cupones" className="nav-pill-btn cupones" id="nav-cupones-btn">
            <Tag size={15} />
            <span>Cupones</span>
          </Link>
          <Link href="/terminales" className="nav-pill-btn terminales" id="nav-terminales-btn">
            <CreditCard size={15} />
            <span>Terminales Point</span>
          </Link>
          {session && (
            <Link href="/admin" className="btn-ghost" title="Admin" id="nav-admin-btn">
              <Lock size={16} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

