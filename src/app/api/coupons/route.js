import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
    });
    return NextResponse.json(coupons);
  } catch (error) {
    console.error("Prisma Error fetching coupons:", error);
    return NextResponse.json({ error: "Error fetching coupons", details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();

    if (!data.title || !data.code || !data.store || !data.link) {
      return NextResponse.json({ error: "Faltan campos obligatorios (título, código, tienda y enlace)" }, { status: 400 });
    }

    const titleLower = data.title.toLowerCase().trim();
    const codeLower = data.code.toLowerCase().trim();

    // Check for exact duplicate coupons (same code and same store)
    const existingCoupons = await prisma.coupon.findMany({
      select: {
        id: true,
        code: true,
        store: true,
      }
    });

    const isDuplicate = existingCoupons.some(c => 
      c.code.toLowerCase().trim() === codeLower && 
      c.store.toLowerCase().trim() === data.store.toLowerCase().trim()
    );

    if (isDuplicate) {
      return NextResponse.json({ 
        error: "El cupón ya existe", 
        details: "Ya existe un cupón con el mismo código para esta tienda." 
      }, { status: 409 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        title: data.title,
        code: data.code,
        discount: data.discount || null,
        description: data.description || null,
        store: data.store,
        link: data.link,
        category: data.category || "General",
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        isFeatured: data.isFeatured || false,
      },
    });

    revalidatePath("/cupones");
    return NextResponse.json(coupon);
  } catch (error) {
    console.error("Error creating coupon:", error);
    return NextResponse.json({ error: "Error al crear el cupón", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing coupon ID" }, { status: 400 });
  }

  try {
    await prisma.coupon.delete({ where: { id } });
    revalidatePath("/cupones");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json({ error: "Error deleting coupon", details: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing coupon ID" }, { status: 400 });
    }

    // Convert expiryDate string back to Date object if present
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/cupones");
    return NextResponse.json(updatedCoupon);
  } catch (error) {
    console.error("Prisma PUT Error updating coupon:", error);
    return NextResponse.json({ error: "Error updating coupon", details: error.message }, { status: 500 });
  }
}
