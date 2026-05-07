"use client";

import { useState, useRef } from "react";
import { ExternalLink, Tag } from "lucide-react";
import { motion } from "framer-motion";

export default function OfferCard({ offer }) {
  const { title, price, originalPrice, discount, imageUrl, affiliateUrl, category } = offer;
  const cardRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <motion.div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card flex flex-col h-full group"
      style={{ 
        "--x": `${mousePos.x}%`, 
        "--y": `${mousePos.y}%` 
      }}
    >
      <div className="card-glow" />
      
      <div className="img-container">
        <img 
          src={imageUrl} 
          alt={title} 
          loading="lazy"
          className="group-hover:scale-110 transition-transform duration-700"
        />
        {discount && (
          <div className="absolute top-0 right-0 bg-accent text-white px-4 py-1.5 rounded-tr-[0.75rem] rounded-bl-[1.5rem] text-sm font-black shadow-2xl">
            -{discount}%
          </div>
        )}
      </div>

      <div className="p-8 flex flex-col flex-grow">
        <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {category}
        </div>
        
        <h3 className="text-xl font-bold text-white mb-6 line-clamp-2 leading-[1.2] group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="mt-auto">
          <div className="flex items-end gap-3 mb-8">
            <span className="text-4xl font-black text-white leading-none tracking-tighter">
              ${price.toLocaleString()}
            </span>
            {originalPrice && (
              <span className="text-base text-white/30 line-through mb-1">
                ${originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <a 
            href={affiliateUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-primary w-full justify-center flex items-center gap-3"
          >
            🔥 ¡LO QUIERO!
            <ExternalLink size={20} strokeWidth={3} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
