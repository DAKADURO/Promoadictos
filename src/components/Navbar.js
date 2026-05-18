"use client";
import Link from "next/link";
import { Lock, Search, CreditCard } from "lucide-react";
import { useState } from "react";

export default function Navbar({ onSearch }) {
  const [query, setQuery] = useState("");

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onSearch?.(val);
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
          <div className="nav-search">
            <input
              type="text"
              placeholder="Buscar ofertas…"
              value={query}
              onChange={handleInput}
              id="nav-search-input"
            />
            <Search size={16} className="nav-search-icon" />
          </div>
        )}

        {/* Actions */}
        <div className="nav-actions">
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
