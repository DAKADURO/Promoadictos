"use client";

import { BASE_CATEGORIES } from "@/lib/categories";

const DEFAULT_CATEGORIES = ["Todas", ...BASE_CATEGORIES, "Otros"];

export default function CategoryFilter({
  onFilter,
  categories = DEFAULT_CATEGORIES,
  active = "Todas",
  label = "Filtrar por categoría",
  idPrefix = "filter",
}) {
  const handleClick = (cat) => {
    onFilter?.(cat === "Todas" ? null : cat);
  };

  return (
    <div className="filter-bar" role="tablist" aria-label={label}>
      {categories.map((cat) => (
        <button
          key={cat}
          className={`filter-pill${active === cat ? " active" : ""}`}
          onClick={() => handleClick(cat)}
          role="tab"
          aria-selected={active === cat}
          id={`${idPrefix}-${cat.toLowerCase()}`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
