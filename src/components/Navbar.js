"use client";
import Link from "next/link";
import { Lock } from "lucide-react";

export default function Navbar() {
  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="container" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", height:"68px" }}>
        
        {/* Brand */}
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:"0.85rem", textDecoration:"none" }}>
          <img
            src="/logo.png"
            alt="PromoAdictos"
            style={{ height:"38px", width:"auto", flexShrink:0 }}
          />
          <div>
            <div className="font-display gradient-text" style={{ fontSize:"1.25rem", fontWeight:800, letterSpacing:"-0.03em", lineHeight:1, textTransform:"uppercase" }}>
              PromoAdictos
            </div>
            <div style={{ fontSize:"0.6rem", color:"var(--clr-muted)", fontWeight:600, letterSpacing:"0.25em", textTransform:"uppercase", marginTop:"3px" }}>
              Tu adicción a las ofertas
            </div>
          </div>
        </Link>

        {/* Actions */}
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <Link href="/admin" className="btn-ghost" title="Admin">
            <Lock size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
