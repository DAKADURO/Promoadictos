import { getSettingValue } from "@/lib/settings";

// Etiquetado de enlaces de afiliado de Mercado Libre México.
//
// Los parámetros `matt_tool` y `matt_word` se copian de un enlace de afiliado
// generado a mano desde tu barra de afiliados y se guardan SOLO en variables
// de entorno del servidor (ML_AFFILIATE_TOOL / ML_AFFILIATE_WORD).
//
// IMPORTANTE: que Mercado Libre atribuya la comisión a una URL directa con estos
// parámetros NO está verificado: se comprueba con una compra/clic de prueba en
// tu panel de afiliados antes de confiar en él. Por eso el interruptor
// AFFILIATE_AUTO_TAG (panel Automatización) viene apagado.

const PARAM = /^[A-Za-z0-9_.\-]{1,64}$/;

export function affiliateConfigured() {
  return PARAM.test(process.env.ML_AFFILIATE_TOOL || "") && PARAM.test(process.env.ML_AFFILIATE_WORD || "");
}

// URL directa de producto en mercadolibre.com.mx (no meli.la, no páginas sociales).
export function isDirectMlProductUrl(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:") return false;
    if (!(host === "mercadolibre.com.mx" || host.endsWith(".mercadolibre.com.mx"))) return false;
    if (u.pathname.includes("/social/")) return false;
    return /MLM-?\d+/i.test(u.pathname);
  } catch {
    return false;
  }
}

// Añade los parámetros si procede; si no, devuelve la URL tal cual.
// Nunca pisa parámetros de afiliado que la URL ya traiga.
export function applyAffiliateParams(raw) {
  if (!affiliateConfigured() || !isDirectMlProductUrl(raw)) return raw;
  const u = new URL(raw);
  if (u.searchParams.has("matt_tool") || u.searchParams.has("matt_word")) return raw;
  // El fragmento (#polycard_client=…&c_uid=…) lo añade Mercado Libre al navegar y
  // trae identificadores de tu sesión; no debe acabar en un enlace público.
  u.hash = "";
  u.searchParams.set("matt_tool", process.env.ML_AFFILIATE_TOOL);
  u.searchParams.set("matt_word", process.env.ML_AFFILIATE_WORD);
  return u.toString();
}

// Igual que applyAffiliateParams pero solo si el interruptor del panel está encendido.
export async function tagAffiliateUrl(raw) {
  try {
    if (!(await getSettingValue("AFFILIATE_AUTO_TAG"))) return raw;
  } catch {
    return raw; // si falla la BD, nunca se rompe la publicación
  }
  return applyAffiliateParams(raw);
}
