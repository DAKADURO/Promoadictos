import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: [
        { isFeatured: "desc" },
        { createdAt: "desc" },
      ],
    });
    return NextResponse.json(offers);
  } catch (error) {
    console.error("Prisma Error:", error);
    return NextResponse.json({ error: "Error fetching offers", details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();
    const offer = await prisma.offer.create({
      data: {
        title: data.title,
        price: data.price,
        originalPrice: data.originalPrice,
        discount: data.discount,
        imageUrl: data.imageUrl,
        affiliateUrl: data.affiliateUrl,
        category: data.category,
        isFeatured: data.isFeatured || false,
      },
    });
    return NextResponse.json(offer);
  } catch (error) {
    return NextResponse.json({ error: "Error creating offer" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    await prisma.offer.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting offer" }, { status: 500 });
  }
}
