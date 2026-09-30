import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// POST (no GET): los escáneres de correo abren los enlaces GET y darían de
// baja a todos sin querer. El botón de /baja y el "List-Unsubscribe-Post"
// de un clic (RFC 8058) llegan aquí.
export async function POST(req) {
  const limited = rateLimit(`unsub:${clientIp(req.headers)}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!limited.ok) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const url = new URL(req.url);
  let email = url.searchParams.get("e");
  let token = url.searchParams.get("t");
  let fromForm = false;

  const type = req.headers.get("content-type") || "";
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    const form = await req.formData();
    email = form.get("e") || email;
    token = form.get("t") || token;
    fromForm = form.has("e");
  }

  email = String(email || "").trim().toLowerCase();
  if (!email || !verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "Enlace no válido" }, { status: 400 });
  }

  await prisma.subscriber.updateMany({ where: { email }, data: { isActive: false } });

  if (fromForm) {
    return NextResponse.redirect(new URL("/baja?ok=1", req.url), 303);
  }
  return NextResponse.json({ success: true });
}
