import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { scrapeProduct } from "@/lib/scraper";
import { extractProductId } from "@/lib/productId";
import { getMlAuthHeader } from "@/lib/mercadolibre";

// One representative search query per existing storefront category.
// Kept separate from scraper.js's CATEGORY_KEYWORDS (which classifies a
// single already-known product) since here we need query terms to search
// Mercado Libre's public catalog, not a classification dictionary.
const CATEGORY_QUERIES = {
  Gaming: "consola videojuegos",
  Audio: "audifonos bluetooth",
  Tecnología: "smartphone laptop",
  Hogar: "cocina hogar",
  Moda: "ropa calzado",
  Deportes: "fitness deportes",
  Belleza: "maquillaje skincare",
};

async function searchCategory(query, minDiscount) {
  const url = `https://api.mercadolibre.com/sites/MLM/search?q=${encodeURIComponent(query)}&limit=50`;
  const res = await fetch(url, { headers: await getMlAuthHeader() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML search failed for "${query}" with status ${res.status}: ${text}`);
  }
  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results
    .map((item) => {
      const price = item.price;
      const originalPrice = item.original_price || null;
      const discount = originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;
      return { item, discount };
    })
    .filter(({ discount }) => discount >= minDiscount)
    .sort((a, b) => b.discount - a.discount);
}

export async function GET(req) {
  const session = await auth();

  if (!session) {
    const { searchParams } = new URL(req.url);
    const secretParam = searchParams.get("secret");
    const configuredSecret = process.env.CRON_SECRET;

    if (!configuredSecret) {
      console.error("CRON_SECRET is not set in environment variables.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!secretParam || secretParam !== configuredSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Quality/quota thresholds (all configurable via env vars).
    const MIN_DISCOUNT = parseInt(process.env.DISCOVER_MIN_DISCOUNT || "20", 10);
    const MAX_PER_CATEGORY = parseInt(process.env.DISCOVER_MAX_PER_CATEGORY || "5", 10);
    const MAX_NEW_PER_DAY = parseInt(process.env.DISCOVER_MAX_NEW_PER_DAY || "20", 10);
    const AUTO_FEATURE_TOP_N = parseInt(process.env.DISCOVER_AUTO_FEATURE_TOP_N || "0", 10);
    // Switch: once discovery quality is trusted, flip this to publish offers
    // directly (isActive: true) instead of landing them as drafts.
    const AUTO_PUBLISH = process.env.DISCOVER_AUTO_PUBLISH === "true";

    // Rolling 24h window so a 2x/day schedule still respects the daily cap.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const createdLast24h = await prisma.offer.count({ where: { createdAt: { gte: since } } });
    let remainingBudget = Math.max(0, MAX_NEW_PER_DAY - createdLast24h);

    if (remainingBudget === 0) {
      return NextResponse.json({
        success: true,
        created: [],
        skipped: [],
        errors: [],
        count: 0,
        reason: "Daily discovery quota already reached",
      });
    }

    const existingOffers = await prisma.offer.findMany({
      select: { title: true, affiliateUrl: true },
    });
    const seenProductIds = new Set(
      existingOffers.map((o) => extractProductId(o.affiliateUrl)).filter(Boolean)
    );
    const seenTitles = new Set(existingOffers.map((o) => o.title.toLowerCase().trim()));

    const created = [];
    const skipped = [];
    const errors = [];

    for (const [category, query] of Object.entries(CATEGORY_QUERIES)) {
      if (remainingBudget <= 0) break;

      let candidates;
      try {
        candidates = await searchCategory(query, MIN_DISCOUNT);
      } catch (err) {
        errors.push({ category, error: err.message });
        continue;
      }

      let addedInCategory = 0;

      for (const { item, discount } of candidates) {
        if (remainingBudget <= 0 || addedInCategory >= MAX_PER_CATEGORY) break;

        const productId = extractProductId(item.permalink || item.id);
        const titleLower = (item.title || "").toLowerCase().trim();

        if (!productId || seenProductIds.has(productId) || seenTitles.has(titleLower)) {
          skipped.push({ category, title: item.title, reason: "duplicate" });
          continue;
        }

        try {
          const scraped = await scrapeProduct(item.permalink);

          if (!scraped.title || !scraped.price) {
            skipped.push({ category, title: item.title, reason: "incomplete scrape" });
            continue;
          }

          const offer = await prisma.offer.create({
            data: {
              title: scraped.title,
              price: scraped.price,
              originalPrice: scraped.originalPrice,
              discount: scraped.discount ?? discount,
              imageUrl: scraped.imageUrl || "",
              affiliateUrl: scraped.affiliateUrl,
              category: scraped.category || category,
              brand: scraped.brand || null,
              isFeatured: false,
              isActive: AUTO_PUBLISH,
            },
          });

          await prisma.priceHistory.create({
            data: { offerId: offer.id, price: offer.price },
          });

          created.push(offer);
          seenProductIds.add(productId);
          seenTitles.add(titleLower);
          addedInCategory++;
          remainingBudget--;
        } catch (err) {
          errors.push({ category, title: item.title, error: err.message });
        }
      }
    }

    // Auto-feature the highest-discount finds from this run.
    if (AUTO_FEATURE_TOP_N > 0 && created.length > 0) {
      const topIds = [...created]
        .sort((a, b) => (b.discount || 0) - (a.discount || 0))
        .slice(0, AUTO_FEATURE_TOP_N)
        .map((o) => o.id);

      if (topIds.length > 0) {
        await prisma.offer.updateMany({
          where: { id: { in: topIds } },
          data: { isFeatured: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: created.length,
      created: created.map((o) => ({ id: o.id, title: o.title, category: o.category, discount: o.discount, isActive: o.isActive })),
      skipped,
      errors,
      draftMode: !AUTO_PUBLISH,
    });
  } catch (error) {
    console.error("Error in discover-offers:", error);
    return NextResponse.json(
      { error: "Error al descubrir ofertas", details: error.message },
      { status: 500 }
    );
  }
}
