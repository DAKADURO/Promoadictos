"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="glass sticky top-0 z-[100] py-3">
      <div className="container flex justify-between items-center">
        <Link href="/" className="flex items-center gap-4 no-underline group">
          <div className="relative w-12 h-12">
            <img 
              src="/logo.png" 
              alt="PromoAdictos Logo" 
              className="w-full h-full object-contain filter drop-shadow(0 0 8px rgba(255,107,0,0.5)) group-hover:scale-110 transition-transform"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black gradient-text tracking-tighter uppercase leading-none">
              PromoAdictos
            </span>
            <span className="text-[10px] text-white/40 font-bold tracking-[0.3em] uppercase mt-1">
              Smart Deals Only
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link 
            href="/admin" 
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-white/50 hover:text-primary hover:border-primary/30 transition-all shadow-inner"
          >
            <Lock size={20} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
