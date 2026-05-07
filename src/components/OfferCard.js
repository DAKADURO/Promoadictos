"use client";

import { ExternalLink, Tag, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function OfferCard({ offer }) {
  const { title, price, originalPrice, discount, imageUrl, affiliateUrl, category } = offer;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="card flex flex-col h-full group"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-white p-6 flex items-center justify-center">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
        />
        {discount && (
          <div className="absolute top-4 right-4 bg-accent text-white px-3 py-1 rounded-full text-sm font-bold shadow-xl">
            -{discount}%
          </div>
        )}
        <div className="absolute top-4 left-4 bg-primary/90 text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
          Oferta
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow bg-surface">
        <div className="flex items-center gap-2 text-primary text-xs font-bold mb-3 uppercase tracking-widest">
          <Tag size={12} strokeWidth={3} />
          {category}
        </div>
        
        <h3 className="text-lg font-bold text-text mb-4 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="mt-auto">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl font-black text-text tracking-tighter">
              ${price.toLocaleString()}
            </span>
            {originalPrice && (
              <span className="text-sm text-text-muted line-through decoration-accent/50">
                ${originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <a 
            href={affiliateUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary w-full justify-center"
          >
            Ver en Mercado Libre
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
