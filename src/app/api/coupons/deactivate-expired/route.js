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
    const now = new Date();

    // Find coupons with expiryDate in the past
    const expiredCoupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        expiryDate: { lt: now }
      },
      select: { id: true, title: true, expiryDate: true }
    });

    if (expiredCoupons.length === 0) {
      return NextResponse.json({
        success: true,
        deactivated: [],
        count: 0
      });
    }

    const deactivatedIds = expiredCoupons.map(c => c.id);
    const result = await prisma.coupon.updateMany({
      where: { id: { in: deactivatedIds } },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      deactivated: expiredCoupons.map(c => ({
        id: c.id,
        title: c.title,
        expiryDate: c.expiryDate
      })),
      count: result.count
    });
  } catch (error) {
    console.error("Error deactivating expired coupons:", error);
    return NextResponse.json(
      { error: "Error al desactivar cupones", details: error.message },
      { status: 500 }
    );
  }
}
