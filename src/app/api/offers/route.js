import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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

function extractProductId(url) {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  
  // Mercado Libre item ID (e.g., MLM-1234567890 or MLM1234567890)
  const mlMatch = lowerUrl.match(/mlm-?[0-9]+/);
  if (mlMatch) {
    return mlMatch[0].replace("-", ""); // Normalize to MLM1234567890
  }
  
  // Amazon ASIN (10-character alphanumeric, e.g. B0XXXXXXXX)
  const amzMatch = lowerUrl.match(/\/dp\/([a-z0-9]{10})/i) || lowerUrl.match(/\/gp\/product\/([a-z0-9]{10})/i);
  if (amzMatch) {
    return amzMatch[1].toUpperCase();
  }
  
  return lowerUrl.trim();
}

export async function POST(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();

    if (!data.title || !data.affiliateUrl || data.price === undefined || data.price === null) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const titleLower = data.title.toLowerCase().trim();
    const urlProductId = extractProductId(data.affiliateUrl);

    // Obtener las ofertas existentes para checar duplicados
    const existingOffers = await prisma.offer.findMany({
      select: {
        id: true,
        title: true,
        affiliateUrl: true,
      }
    });

    const isDuplicate = existingOffers.some(o => {
      // Comparar títulos ignorando mayúsculas y espacios extremos
      if (o.title.toLowerCase().trim() === titleLower) return true;
      
      // Comparar identificadores extraídos de las URLs
      const existingProductId = extractProductId(o.affiliateUrl);
      if (urlProductId && existingProductId && urlProductId === existingProductId) return true;
      
      // Fallback a enlace exacto
      if (o.affiliateUrl.toLowerCase().trim() === data.affiliateUrl.toLowerCase().trim()) return true;
      
      return false;
    });

    if (isDuplicate) {
      return NextResponse.json({ 
        error: "La oferta ya existe", 
        details: "Ya existe un producto publicado con el mismo título o enlace." 
      }, { status: 409 });
    }

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
    revalidatePath("/");
    return NextResponse.json(offer);
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json({ error: "Error al crear la oferta", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    await prisma.offer.delete({ where: { id } });
    revalidatePath("/");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting offer" }, { status: 500 });
  }
}

export async function PUT(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "Missing offer ID" }, { status: 400 });
    }

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: updateData,
    });
    revalidatePath("/");
    return NextResponse.json(updatedOffer);
  } catch (error) {
    console.error("Prisma PUT Error:", error);
    return NextResponse.json({ error: "Error updating offer" }, { status: 500 });
  }
}
