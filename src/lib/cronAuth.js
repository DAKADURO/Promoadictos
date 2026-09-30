import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Autoriza una ruta de tareas: sesión de admin o CRON_SECRET.
 * El secreto debe ir en `Authorization: Bearer <secreto>`. El parámetro
 * `?secret=` sigue aceptándose por compatibilidad, pero queda en logs y
 * proxies: migrar cualquier cron externo al encabezado.
 * Devuelve una NextResponse de error, o null si está autorizado.
 */
export async function authorizeCron(req) {
  const session = await auth();
  if (session) return null;

  const configured = process.env.CRON_SECRET;
  if (!configured) {
    console.error("CRON_SECRET is not set in environment variables.");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const header = req.headers.get("authorization") || "";
  let provided = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!provided) {
    provided = new URL(req.url).searchParams.get("secret");
    if (provided) console.warn("[Security] CRON_SECRET recibido por query string; usa Authorization: Bearer.");
  }

  if (!provided || !safeEqual(provided, configured)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
