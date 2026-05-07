"use client";

import { ExternalLink, Tag } from "lucide-react";
import { motion } from "framer-motion";

export default function OfferCard({ offer }) {
  const { title, price, originalPrice, discount, imageUrl, affiliateUrl, category } = offer;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="card flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-white p-4">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-contain"
        />
        {discount && (
          <div className="absolute top-4 left-4 bg-accent text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            -{discount}%
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-primary text-xs font-semibold mb-2 uppercase tracking-wider">
          <Tag size={12} />
          {category}
        </div>
        
        <h3 className="text-lg font-bold text-text mb-3 line-clamp-2">
          {title}
        </h3>

        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-text">
              ${price.toLocaleString()}
            </span>
            {originalPrice && (
              <span className="text-sm text-text-muted line-through">
                ${originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <a 
            href={affiliateUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary w-full justify-center group"
          >
            Ver en Mercado Libre
            <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
