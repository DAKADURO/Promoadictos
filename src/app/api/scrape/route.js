import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { scrapeProduct } from "@/lib/scraper";

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

  try {
    const data = await scrapeProduct(targetUrl);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: "Internal scraper error", details: error.message }, { status: 500 });
  }
}
