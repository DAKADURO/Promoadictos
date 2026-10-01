import { prisma } from "@/lib/db";

// Ajustes editables desde el admin. Prioridad: BD > variable de entorno > valor por defecto.
export const SETTINGS = {
  DISCOVER_MIN_DISCOUNT: { label: "Descuento mínimo para descubrir ofertas (%)", type: "int", min: 1, max: 90, def: 20 },
  DISCOVER_MAX_NEW_PER_DAY: { label: "Máximo de ofertas nuevas por día", type: "int", min: 0, max: 200, def: 20 },
  DISCOVER_AUTO_PUBLISH: { label: "Publicar automáticamente lo descubierto (sin borrador)", type: "bool", def: false },
  MIN_DISCOUNT_THRESHOLD: { label: "Desactivar ofertas con descuento menor a (%)", type: "int", min: 0, max: 90, def: 10 },
  MAX_DAYS_PUBLISHED: { label: "Desactivar ofertas con más de (días)", type: "int", min: 1, max: 365, def: 30 },
  MAX_MISMATCH_CHECKS: { label: "Comprobaciones seguidas 'ya no aparece en la página' para desactivar", type: "int", min: 1, max: 100, def: 8 },
  MAX_UNAVAILABLE_CHECKS: { label: "Comprobaciones seguidas 'no disponible' para desactivar", type: "int", min: 1, max: 20, def: 3 },
};

const TTL_MS = 15 * 1000;
const cache = new Map(); // key -> { at, value }

async function readRaw(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value = null;
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    value = row ? row.value : null;
  } catch {
    value = null; // si la BD falla se usa el entorno, nunca se rompe el job
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

function parse(def, raw) {
  if (raw === null || raw === undefined || raw === "") return undefined;
  if (def.type === "bool") return raw === "true" || raw === true;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function getSetting(key) {
  const def = SETTINGS[key];
  if (!def) throw new Error(`Ajuste desconocido: ${key}`);
  const fromDb = parse(def, await readRaw(key));
  if (fromDb !== undefined) return { value: fromDb, source: "admin" };
  const fromEnv = parse(def, process.env[key]);
  if (fromEnv !== undefined) return { value: fromEnv, source: "env" };
  return { value: def.def, source: "default" };
}

export async function getSettingValue(key) {
  return (await getSetting(key)).value;
}

export function validateSetting(key, value) {
  const def = SETTINGS[key];
  if (!def) return { ok: false, error: "Ajuste desconocido" };
  if (def.type === "bool") {
    if (typeof value !== "boolean") return { ok: false, error: "Debe ser sí/no" };
    return { ok: true, value: String(value) };
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < def.min || n > def.max) {
    return { ok: false, error: `Debe ser un entero entre ${def.min} y ${def.max}` };
  }
  return { ok: true, value: String(n) };
}

export async function setSetting(key, rawValue) {
  const v = validateSetting(key, rawValue);
  if (!v.ok) throw new Error(v.error);
  await prisma.setting.upsert({ where: { key }, update: { value: v.value }, create: { key, value: v.value } });
  cache.delete(key);
}

// Pausa por job: clave libre `JOB_PAUSED:<nombre>` (no editable como umbral).
export async function isJobPaused(name) {
  return (await readRaw(`JOB_PAUSED:${name}`)) === "true";
}

export async function setJobPaused(name, paused) {
  const key = `JOB_PAUSED:${name}`;
  await prisma.setting.upsert({ where: { key }, update: { value: String(!!paused) }, create: { key, value: String(!!paused) } });
  cache.delete(key);
}
