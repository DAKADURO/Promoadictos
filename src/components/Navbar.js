"use client";

import Link from "next/link";
import { ShoppingBag, Lock, Zap } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50 py-4">
      <div className="container flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 no-underline group">
          <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:rotate-6 transition-transform">
            <ShoppingBag className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black gradient-text leading-none tracking-tighter uppercase">
              PromoAdictos
            </span>
            <span className="text-[10px] text-text-muted font-bold tracking-[0.2em] uppercase mt-1">
              Smart Shopping
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link 
            href="/admin" 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-text-muted hover:text-primary hover:bg-primary/10 transition-all border border-white/5"
          >
            <Lock size={18} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
