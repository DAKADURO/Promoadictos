import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { scrapeProduct } from "@/lib/scraper";

export async function GET(req) {
  // 1. Authentication Check (Hybrid: Session or Cron Secret)
  const session = await auth();
  
  if (!session) {
    const { searchParams } = new URL(req.url);
    const secretParam = searchParams.get("secret");
    const configuredSecret = process.env.CRON_SECRET || "promo_adictos_sync_secret_2026_x1";
    
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

    const results = [];
    let updatedCount = 0;
    let errorCount = 0;

    // 3. Process each offer
    for (const offer of offers) {
      try {
        if (!offer.affiliateUrl) {
          results.push({
            id: offer.id,
            title: offer.title,
            status: "skipped",
            reason: "No affiliate URL"
          });
          continue;
        }

        // Scrape the product details
        const scraped = await scrapeProduct(offer.affiliateUrl, offer.title);

        if (scraped.success && scraped.price !== null && scraped.price !== undefined) {
          // Safety check: ensure the scraped product is reasonably similar to the original offer
          const getSimilarity = (t1, t2) => {
            if (!t1 || !t2) return 0;
            const words1 = t1.toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 2);
            if (words1.length === 0) return 0;
            const w2 = t2.toLowerCase();
            return words1.filter(w => w2.includes(w)).length / words1.length;
          };

          const similarity = getSimilarity(offer.title, scraped.title);
          if (similarity < 0.3) {
            console.log(`Title mismatch for offer ${offer.id}: Original="${offer.title}", Scraped="${scraped.title}". Skipping price update.`);
            results.push({
              id: offer.id,
              title: offer.title,
              status: "skipped",
              reason: `Title mismatch (scraped: ${scraped.title})`
            });
            continue;
          }
          const oldPrice = offer.price;
          const newPrice = scraped.price;
          const priceChanged = oldPrice !== newPrice;

          // Determine original price and discount
          const originalPrice = scraped.originalPrice || offer.originalPrice;
          let discount = scraped.discount || offer.discount;

          // Recalculate discount if price changed or is present
          if (originalPrice && originalPrice > newPrice) {
            discount = Math.round(((originalPrice - newPrice) / originalPrice) * 100);
          } else {
            discount = null; // Clear discount if price isn't lower than original
          }

          const originalPriceChanged = originalPrice !== offer.originalPrice;
          const discountChanged = discount !== offer.discount;

          if (priceChanged || originalPriceChanged || discountChanged) {
            // Update in database
            await prisma.offer.update({
              where: { id: offer.id },
              data: {
                price: newPrice,
                originalPrice: originalPrice,
                discount: discount
              }
            });

            updatedCount++;
            results.push({
              id: offer.id,
              title: offer.title,
              status: "updated",
              oldPrice,
              newPrice,
              originalPrice,
              discount
            });
          } else {
            results.push({
              id: offer.id,
              title: offer.title,
              status: "no_change",
              price: newPrice
            });
          }
        } else {
          results.push({
            id: offer.id,
            title: offer.title,
            status: "failed",
            reason: "Invalid price scraped"
          });
          errorCount++;
        }
      } catch (err) {
        console.error(`Error syncing offer ${offer.id} (${offer.title}):`, err.message);
        results.push({
          id: offer.id,
          title: offer.title,
          status: "failed",
          reason: err.message
        });
        errorCount++;
      }
    }

    // 4. Revalidate home page cache
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      processed: offers.length,
      updated: updatedCount,
      errors: errorCount,
      results
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
