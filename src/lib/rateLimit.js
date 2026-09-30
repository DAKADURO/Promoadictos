// Limitador en memoria (ventana deslizante). Suficiente para una sola
// instancia (Railway con 1 réplica); con varias réplicas habría que usar
// un almacén compartido.
const buckets = new Map();

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  return { ok: true };
}

export function clientIp(headers) {
  const get = (n) => (typeof headers?.get === "function" ? headers.get(n) : headers?.[n]);
  const fwd = get("x-forwarded-for");
  return (fwd ? String(fwd).split(",")[0].trim() : get("x-real-ip")) || "unknown";
}

// Contador de fallos (p. ej. logins): bloquea tras `limit` fallos en `windowMs`.
const failures = new Map();

export function isBlocked(key, { limit, windowMs }) {
  const now = Date.now();
  const recent = (failures.get(key) || []).filter((t) => now - t < windowMs);
  failures.set(key, recent);
  return recent.length >= limit;
}

export function recordFailure(key) {
  const list = failures.get(key) || [];
  list.push(Date.now());
  failures.set(key, list);
}

export function clearFailures(key) {
  failures.delete(key);
}
