import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function POST(req) {
  try {
    // 5 suscripciones por hora por IP (evita spam de correos)
    const limited = rateLimit(`subscribe:${clientIp(req.headers)}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos. Inténtalo más tarde." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Correo electrónico no válido" }, { status: 400 });
    }

    // Misma respuesta exista o no el correo, para no revelar quién está suscrito
    const existing = await prisma.subscriber.findUnique({ where: { email } });
    if (!existing) {
      await prisma.subscriber.create({ data: { email } });
    } else if (!existing.isActive) {
      await prisma.subscriber.update({ where: { email }, data: { isActive: true } });
    }

    return NextResponse.json({ success: true, message: "Suscrito correctamente" });
  } catch (error) {
    console.error("Error subscribing:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
