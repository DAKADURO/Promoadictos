import { createHmac, timingSafeEqual } from "node:crypto";

// Enlace de baja firmado con HMAC: no se puede dar de baja a otra persona
// sin conocer el secreto del servidor, y no hay que guardar tokens en la BD.
function secret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function unsubscribeToken(email) {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(String(email).trim().toLowerCase()).digest("base64url");
}

export function verifyUnsubscribeToken(email, token) {
  const expected = unsubscribeToken(email);
  if (!expected || !token) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}

// URL pública de baja para un correo, o null si falta base o secreto.
export function unsubscribeUrl(email) {
  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const token = unsubscribeToken(email);
  if (!base || !token) return null;
  const e = encodeURIComponent(String(email).trim().toLowerCase());
  return `${base}/baja?e=${e}&t=${token}`;
}
