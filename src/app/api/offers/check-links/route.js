import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Checks a single URL to see if it's alive.
 * Returns { ok: boolean, status: number, finalUrl: string }
 */
async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    clearTimeout(timeout);

    const finalUrl = res.url;

    // meli.la links that didn't redirect properly land on a "not found" page
    if (finalUrl.includes("meli.la") && res.status !== 200) {
      return { ok: false, status: res.status, finalUrl, reason: "Shortlink no redirigió" };
    }

    // Mercado Libre "item not found" pages return 200 but contain a specific path
    if (
      finalUrl.includes("mercadolibre.com") &&
      (finalUrl.includes("/noindex/") ||
        finalUrl.includes("listingTypeId=") ||
        finalUrl.includes("/home") ||
        finalUrl.includes("?from=") && !finalUrl.match(/MLM-?[0-9]+/))
    ) {
      return { ok: false, status: 200, finalUrl, reason: "Producto eliminado de Mercado Libre" };
    }

    if (res.status === 404 || res.status === 410) {
      return { ok: false, status: res.status, finalUrl, reason: "Página no encontrada (404)" };
    }

    if (res.status >= 400) {
      return { ok: false, status: res.status, finalUrl, reason: `Error HTTP ${res.status}` };
    }

    return { ok: true, status: res.status, finalUrl };
  } catch (err) {
    if (err.name === "AbortError") {
      return { ok: false, status: 0, finalUrl: url, reason: "Timeout (sin respuesta en 8s)" };
    }
    return { ok: false, status: 0, finalUrl: url, reason: `Error de red: ${err.message}` };
  }
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
    // Threshold for deactivating offers (default: 3 failed checks)
    const MAX_FAILED_CHECKS = parseInt(process.env.MAX_FAILED_CHECKS || "3", 10);

    const offers = await prisma.offer.findMany({
      select: { id: true, title: true, affiliateUrl: true, price: true, imageUrl: true, isActive: true, failedChecks: true },
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (offers.length === 0) {
      return NextResponse.json({ broken: [], total: 0, deactivated: 0, updated: 0 });
    }

    const BATCH_SIZE = 5;
    const broken = [];
    let deactivatedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < offers.length; i += BATCH_SIZE) {
      const batch = offers.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (offer) => {
          if (!offer.affiliateUrl) {
            return { ...offer, ok: false, reason: "Sin URL de afiliado", status: 0, finalUrl: "" };
          }
          const check = await checkUrl(offer.affiliateUrl);
          return { ...offer, ...check };
        })
      );

      for (const r of results) {
        const updateData = { lastCheckedAt: new Date() };

        if (!r.ok) {
          // Increment failed checks
          const newFailedCount = (r.failedChecks || 0) + 1;
          updateData.failedChecks = newFailedCount;

          // Deactivate if threshold reached
          if (newFailedCount >= MAX_FAILED_CHECKS) {
            updateData.isActive = false;
            deactivatedCount++;
          }

          broken.push({
            id: r.id,
            title: r.title,
            affiliateUrl: r.affiliateUrl,
            price: r.price,
            imageUrl: r.imageUrl,
            status: r.status,
            reason: r.reason,
            finalUrl: r.finalUrl,
            failedChecks: newFailedCount,
            willDeactivate: newFailedCount >= MAX_FAILED_CHECKS
          });
        } else {
          // Reset failed checks if link is working
          updateData.failedChecks = 0;
        }

        await prisma.offer.update({
          where: { id: r.id },
          data: updateData
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      broken,
      total: offers.length,
      brokenCount: broken.length,
      deactivated: deactivatedCount,
      updated: updatedCount
    });
  } catch (error) {
    console.error("Error checking links:", error);
    return NextResponse.json(
      { error: "Error interno al verificar links", details: error.message },
      { status: 500 }
    );
  }
}
