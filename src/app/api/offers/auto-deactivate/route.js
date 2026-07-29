import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

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
    // Configuration thresholds (from env vars)
    const MIN_DISCOUNT = parseInt(process.env.MIN_DISCOUNT_THRESHOLD || "10", 10);
    const MAX_DAYS_ACTIVE = parseInt(process.env.MAX_DAYS_PUBLISHED || "30", 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_DAYS_ACTIVE);

    // Find offers to deactivate
    const offerToDeactivate = await prisma.offer.findMany({
      where: {
        isActive: true,
        OR: [
          // Discount below threshold
          { discount: { lt: MIN_DISCOUNT } },
          // Published more than MAX_DAYS_ACTIVE days ago
          { createdAt: { lt: cutoffDate } }
        ]
      },
      select: { id: true, title: true, discount: true, createdAt: true }
    });

    if (offerToDeactivate.length === 0) {
      return NextResponse.json({
        success: true,
        deactivated: [],
        count: 0
      });
    }

    // Deactivate all matching offers
    const deactivatedIds = offerToDeactivate.map(o => o.id);
    const result = await prisma.offer.updateMany({
      where: { id: { in: deactivatedIds } },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      deactivated: offerToDeactivate.map(o => ({
        id: o.id,
        title: o.title,
        discount: o.discount,
        reason: !o.discount || o.discount < MIN_DISCOUNT
          ? `Descuento bajo (${o.discount}% < ${MIN_DISCOUNT}%)`
          : `Expirada por antigüedad (${MAX_DAYS_ACTIVE} días)`
      })),
      count: result.count
    });
  } catch (error) {
    console.error("Error in auto-deactivate:", error);
    return NextResponse.json(
      { error: "Error al desactivar ofertas", details: error.message },
      { status: 500 }
    );
  }
}
