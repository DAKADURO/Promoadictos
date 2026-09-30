// Señales de confianza calculadas solo con datos reales (historial de
// precios, fecha de verificación, clics medidos). Nada aquí inventa cifras.
import { getStoreInfo } from "@/lib/store";

export function getDiscount(offer) {
  const price = parseFloat(offer.price) || 0;
  const original = offer.originalPrice ? parseFloat(offer.originalPrice) : 0;
  const stored = parseInt(offer.discount) || 0;
  if (stored > 0) return stored;
  if (original > price && price > 0) return Math.round(((original - price) / original) * 100);
  return 0;
}

// Mínimo histórico solo con historial real: al menos 2 registros, el precio
// actual es el más bajo registrado y antes hubo un precio mayor.
export function isRealHistoricLow(offer) {
  const hist = Array.isArray(offer.priceHistories) ? offer.priceHistories : [];
  if (hist.length < 2) return false;
  const prices = hist.map((h) => parseFloat(h.price)).filter((n) => n > 0);
  if (prices.length < 2) return false;
  const current = parseFloat(offer.price) || 0;
  return current > 0 && current <= Math.min(...prices) && Math.max(...prices) > current;
}

// Oferta con descuento verificable; las que no lo tienen no se muestran.
export function hasRealDiscount(offer) {
  return getDiscount(offer) > 0;
}

// Título corto: marca/modelo + beneficio, sin la cadena de palabras clave.
export function shortTitle(title, max = 70) {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  const first = clean.split(/,| - | – /)[0].trim();
  const base = first.length >= 12 ? first : clean;
  if (base.length <= max) return base;
  const cut = base.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 30)).trim() + "…";
}

export function ctaLabel(affiliateUrl) {
  const name = getStoreInfo(affiliateUrl).name;
  return name === "Tienda oficial" ? "Ver oferta" : `Ver en ${name}`;
}

export function timeAgo(date) {
  if (!date) return null;
  const ms = Date.now() - new Date(date).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 60) return `hace ${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

// Verificación reciente (<48 h); si es más vieja no se muestra como "verificado".
export function isFresh(date, maxHours = 48) {
  if (!date) return false;
  const ms = Date.now() - new Date(date).getTime();
  return Number.isFinite(ms) && ms >= 0 && ms < maxHours * 3600 * 1000;
}

// Clic saliente hacia la tienda. Se manda a Google Analytics como
// `offer_click` (márcalo como evento clave en GA4 para medir conversión).
export function trackOfferClick(offer, placement) {
  try {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "offer_click", {
      offer_id: offer.id,
      offer_title: String(offer.title || "").slice(0, 100),
      store: getStoreInfo(offer.affiliateUrl).name,
      category: offer.category || "",
      discount: getDiscount(offer),
      price: parseFloat(offer.price) || 0,
      placement,
    });
  } catch {
    /* la medición nunca debe romper la compra */
  }
}
