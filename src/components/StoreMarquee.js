"use client";

const STORES = [
  { name: "Mercado Libre", icon: "🛒" },
  { name: "Amazon México", icon: "📦" },
  { name: "Liverpool", icon: "🏬" },
  { name: "Coppel", icon: "🏪" },
  { name: "Walmart", icon: "🛍️" },
  { name: "Best Buy", icon: "💻" },
  { name: "Elektra", icon: "⚡" },
  { name: "Sam's Club", icon: "🏷️" },
  { name: "Costco", icon: "🛒" },
  { name: "Office Depot", icon: "🖨️" },
];

export default function StoreMarquee() {
  // Duplicate for seamless loop
  const items = [...STORES, ...STORES];

  return (
    <section className="marquee-section" aria-label="Tiendas asociadas">
      <div className="marquee-track">
        {items.map((store, i) => (
          <div className="marquee-item" key={`${store.name}-${i}`}>
            <span style={{ fontSize: "1.1rem" }}>{store.icon}</span>
            {store.name}
          </div>
        ))}
      </div>
    </section>
  );
}
