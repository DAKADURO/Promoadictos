"use client";

import { useState } from "react";

const CATEGORIES = ["Todas", "Tecnología", "Hogar", "Moda", "Gaming", "Audio", "Deportes", "Otros"];

export default function CategoryFilter({ onFilter }) {
  const [active, setActive] = useState("Todas");

  const handleClick = (cat) => {
    setActive(cat);
    onFilter?.(cat === "Todas" ? null : cat);
  };

  return (
    <div className="filter-bar" role="tablist" aria-label="Filtrar por categoría">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          className={`filter-pill${active === cat ? " active" : ""}`}
          onClick={() => handleClick(cat)}
          role="tab"
          aria-selected={active === cat}
          id={`filter-${cat.toLowerCase()}`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
