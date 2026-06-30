import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { scrapeProduct, getSimilarity } from "@/lib/scraper";

// Maximum concurrent scraping requests to avoid rate-limiting
const CONCURRENCY_LIMIT = 5;

export async function GET(req) {
  // 1. Authentication Check (Hybrid: Session or Cron Secret)
  const session = await auth();

  if (!session) {
    const { searchParams } = new URL(req.url);
    const secretParam = searchParams.get("secret");
    // FIX #1: Never fall back to a hardcoded secret — must be set in .env
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
    // 2. Fetch all active offers
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: "desc" }
    });

    if (offers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No offers found to synchronize",
        processed: 0,
        updated: 0,
        errors: 0,
        results: []
      });
    }

    // FIX #3 & N5: Process offers in parallel with a true concurrency queue.
    const allResults = await withConcurrency(offers, CONCURRENCY_LIMIT, processOffer);

    const updatedCount = allResults.filter((r) => r.status === "updated").length;
    const errorCount = allResults.filter((r) => r.status === "failed").length;

    // 4. Revalidate all user-facing page caches
    // FIX #7: Revalidate every page that displays offer data, not just home.
    revalidatePath("/");
    revalidatePath("/cupones");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      processed: offers.length,
      updated: updatedCount,
      errors: errorCount,
      results: allResults
    });

  } catch (error) {
    console.error("Bulk sync error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error during price synchronization",
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Concurrency queue: runs up to `limit` promises simultaneously.
 */
async function withConcurrency(items, limit, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = fn(item).then(r => { executing.splice(executing.indexOf(p), 1); return r; });
    results.push(p);
    executing.push(p);
    if (executing.length >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

/**
 * Scrapes and evaluates a single offer. Returns a result object.
 * Extracted from the main handler to keep it clean and testable.
 */
async function processOffer(offer) {
  try {
    if (!offer.affiliateUrl) {
      return { id: offer.id, title: offer.title, status: "skipped", reason: "No affiliate URL" };
    }

    const scraped = await scrapeProduct(offer.affiliateUrl, offer.title);

    if (scraped.success && scraped.price !== null && scraped.price !== undefined) {
      // FIX #5: Use the canonical getSimilarity from scraper.js — no duplicate logic.
      const similarity = getSimilarity(offer.title, scraped.title);
      if (similarity < 0.3) {
        console.log(
          `Title mismatch for offer ${offer.id}: ` +
          `Original="${offer.title}", Scraped="${scraped.title}". Skipping.`
        );
        return {
          id: offer.id,
          title: offer.title,
          status: "skipped",
          reason: `Title mismatch (scraped: ${scraped.title})`
        };
      }

      const oldPrice = offer.price;
      const newPrice = scraped.price;
      const priceChanged = oldPrice !== newPrice;

      // Determine original price and discount
      const originalPrice = scraped.originalPrice || offer.originalPrice;
      let discount;

      // Recalculate discount if price changed or is present
      if (originalPrice && originalPrice > newPrice) {
        discount = Math.round(((originalPrice - newPrice) / originalPrice) * 100);
      } else {
        discount = null; // Clear discount if price isn't lower than original
      }

      const originalPriceChanged = originalPrice !== offer.originalPrice;
      const discountChanged = discount !== offer.discount;

      if (priceChanged || originalPriceChanged || discountChanged) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: { price: newPrice, originalPrice, discount }
        });

        // P1: Record price history if the actual price changed
        if (priceChanged) {
          await prisma.priceHistory.create({
            data: {
              offerId: offer.id,
              price: newPrice
            }
          });
        }

        return { id: offer.id, title: offer.title, status: "updated", oldPrice, newPrice, originalPrice, discount };
      }

      return { id: offer.id, title: offer.title, status: "no_change", price: newPrice };

    } else {
      return { id: offer.id, title: offer.title, status: "failed", reason: "Invalid price scraped" };
    }

  } catch (err) {
    console.error(`Error syncing offer ${offer.id} (${offer.title}):`, err.message);
    return { id: offer.id, title: offer.title, status: "failed", reason: err.message };
  }
}
