"use client";

import Link from "next/link";
import { ShoppingBag, Lock } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50 py-4 mb-8">
      <div className="container flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ShoppingBag className="text-white" size={24} />
          </div>
          <span className="text-2xl font-bold gradient-text tracking-tight">
            PromoAdictos
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/admin" className="text-text-muted hover:text-primary transition-colors">
            <Lock size={20} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
