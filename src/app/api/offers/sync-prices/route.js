import { prisma } from "@/lib/db";
import { authorizeCron } from "@/lib/cronAuth";
import { getSettingValue } from "@/lib/settings";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { scrapeProduct, getSimilarity } from "@/lib/scraper";

// Maximum concurrent scraping requests to avoid rate-limiting
const CONCURRENCY_LIMIT = 5;

// Veces seguidas que una oferta debe verse pausada/agotada/fuera de lista
// antes de desactivarse (evita desactivar por un fallo momentáneo).

/**
 * Registra una comprobación "no disponible". Desactiva la oferta (no la borra)
 * al llegar al umbral. Solo aplica a ofertas activas.
 */
// Si solo el título no coincide (p. ej. el admin lo editó) se exige más tiempo.
const MAX_MISMATCH_CHECKS = parseInt(process.env.MAX_MISMATCH_CHECKS || "8", 10);

async function markUnavailable(offer, reason, threshold) {
  if (threshold === undefined) threshold = await getSettingValue("MAX_UNAVAILABLE_CHECKS");
  if (!offer.isActive) {
    return { id: offer.id, title: offer.title, status: "skipped", reason };
  }
  const count = (offer.unavailableChecks || 0) + 1;
  const deactivate = count >= threshold;
  await prisma.offer.update({
    where: { id: offer.id },
    data: {
      unavailableChecks: count,
      lastCheckedAt: new Date(),
      ...(deactivate ? { isActive: false } : {}),
    },
  });
  return {
    id: offer.id,
    title: offer.title,
    status: deactivate ? "deactivated" : "unavailable",
    reason,
    unavailableChecks: count,
  };
}

export async function GET(req) {
  const denied = await authorizeCron(req);
  if (denied) return denied;

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
    const deactivatedCount = allResults.filter((r) => r.status === "deactivated").length;

    // 4. Revalidate all user-facing page caches
    // FIX #7: Revalidate every page that displays offer data, not just home.
    revalidatePath("/");
    revalidatePath("/cupones");
    revalidatePath("/admin");

    return NextResponse.json({
      success: true,
      processed: offers.length,
      updated: updatedCount,
      deactivated: deactivatedCount,
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
        // El producto ya no aparece en la lista/página: cuenta como no disponible
        return markUnavailable(offer, `Title mismatch (scraped: ${scraped.title})`, MAX_MISMATCH_CHECKS);
      }

      if (scraped.available === false) {
        return markUnavailable(offer, `Producto no disponible (${scraped.itemStatus || "sin stock"})`);
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
          data: { price: newPrice, originalPrice, discount, lastCheckedAt: new Date(), unavailableChecks: 0 }
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

      // Precio confirmado sin cambios: igual cuenta como verificado
      await prisma.offer.update({ where: { id: offer.id }, data: { lastCheckedAt: new Date(), unavailableChecks: 0 } });

      return { id: offer.id, title: offer.title, status: "no_change", price: newPrice };

    } else {
      return { id: offer.id, title: offer.title, status: "failed", reason: "Invalid price scraped" };
    }

  } catch (err) {
    if (err.httpStatus === 404 || err.httpStatus === 410) {
      return markUnavailable(offer, `Producto eliminado en Mercado Libre (HTTP ${err.httpStatus})`);
    }
    console.error(`Error syncing offer ${offer.id} (${offer.title}):`, err.message);
    return { id: offer.id, title: offer.title, status: "failed", reason: err.message };
  }
}
