import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { scrapeProduct } from "@/lib/scraper";

// Solo dominios de tiendas conocidas: evita que el admin (o una sesión robada)
// use el scraper para hacer peticiones a servicios internos (SSRF).
const ALLOWED_HOSTS = [
  "mercadolibre.com", "mercadolibre.com.mx", "mercadolivre.com.br", "meli.la",
  "amazon.com", "amazon.com.mx", "amzn.to", "amzn.mx",
  "aliexpress.com", "ali.ski", "liverpool.com.mx", "walmart.com.mx", "sams.com.mx",
];

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return ALLOWED_HOSTS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

export async function GET(req) {
  // 1. Secure authorization check
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!isAllowedUrl(targetUrl)) {
    return NextResponse.json({ error: "URL no permitida: usa un enlace https de una tienda soportada" }, { status: 400 });
  }

  try {
    const data = await scrapeProduct(targetUrl);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: "Internal scraper error", details: error.message }, { status: 500 });
  }
}
