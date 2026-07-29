// Detects which store an affiliate URL points to, for display purposes
// (badges, CTAs). Anything that isn't recognized falls back to a neutral
// label instead of being mislabeled as a specific competitor's store.
export function getStoreInfo(affiliateUrl) {
  const url = (affiliateUrl || "").toLowerCase();

  if (url.includes("mercadolibre") || url.includes("meli.la")) {
    return { name: "Mercado Libre", color: "#FFE600" };
  }

  if (url.includes("amazon")) {
    return { name: "Amazon", color: "#FF9900" };
  }

  return { name: "Tienda oficial", color: "#9CA3AF" };
}
