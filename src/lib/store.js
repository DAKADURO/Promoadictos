// Detects which store an affiliate URL points to, for display purposes
// (badges, CTAs). Anything that isn't recognized falls back to a neutral
// label instead of being mislabeled as a specific competitor's store.
export function getStoreInfo(affiliateUrl) {
  const url = (affiliateUrl || "").toLowerCase();

  if (url.includes("mercadolibre") || url.includes("meli.la")) {
    return { name: "Mercado Libre", color: "#FFE600" };
  }

  if (url.includes("amazon") || url.includes("amzn.to") || url.includes("amzn.mX")) {
    return { name: "Amazon", color: "#FF9900" };
  }

  if (url.includes("aliexpress") || url.includes("ali.ski")) {
    return { name: "AliExpress", color: "#FF4747" };
  }

  if (url.includes("liverpool")) {
    return { name: "Liverpool", color: "#E4007C" };
  }

  if (url.includes("walmart")) {
    return { name: "Walmart", color: "#0071DC" };
  }

  if (url.includes("sams") || url.includes("sam.com")) {
    return { name: "Sam's Club", color: "#0067A5" };
  }

  return { name: "Tienda oficial", color: "#9CA3AF" };
}
