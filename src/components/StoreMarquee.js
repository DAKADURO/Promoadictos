"use client";

import { Store } from "lucide-react";
import { getStoreInfo } from "@/lib/store";

// Shows only the stores actually represented in the current catalog,
// instead of a fixed aspirational list — so we never claim a partnership
// with a retailer whose offers we don't actually publish.
export default function StoreMarquee({ offers = [] }) {
  const stores = [...new Set(offers.map((o) => getStoreInfo(o.affiliateUrl).name))];

  if (stores.length < 2) return null;

  const items = [...stores, ...stores];

  return (
    <section className="marquee-section" aria-label="Tiendas con ofertas activas">
      <div className="marquee-track">
        {items.map((name, i) => (
          <div className="marquee-item" key={`${name}-${i}`}>
            <Store size={16} />
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
