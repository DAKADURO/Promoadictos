import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { extractProductId } from "@/lib/productId";

async function notifySubscribers(offer) {
  try {
    const subscribers = await prisma.subscriber.findMany({
      where: { isActive: true },
      select: { email: true }
    });

    if (subscribers.length === 0) return;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP credentials missing. Email notification skipped.");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emails = subscribers.map(sub => sub.email).join(",");
    
    const mailOptions = {
      from: `"Promoadictos" <${process.env.SMTP_USER}>`,
      bcc: emails,
      subject: `¡Nueva Oferta: ${offer.title}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
          <h1 style="color: #E94B5E;">¡Nueva oferta en Promoadictos!</h1>
          <p style="font-size: 16px; color: #555;">Hemos encontrado un excelente descuento para ti:</p>
          ${offer.imageUrl ? `<img src="${offer.imageUrl}" alt="${offer.title}" style="max-width: 100%; border-radius: 10px; margin: 20px 0;" />` : ''}
          <h2 style="color: #333;">${offer.title}</h2>
          <p style="font-size: 18px;">
            <strong style="color: #E94B5E; font-size: 24px;">$${offer.price}</strong> 
            ${offer.originalPrice ? `<span style="text-decoration: line-through; color: #999; margin-left: 10px;">$${offer.originalPrice}</span>` : ""}
          </p>
          <p style="margin-top: 30px;">
            <a href="${offer.affiliateUrl}" style="background-color: #E94B5E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Ver Oferta</a>
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending newsletter:", error);
  }
}


export async function GET(req) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit"), 10) : 24;
    const isAdmin = !!session; // Only show inactive offers to admins
    const where = isAdmin ? {} : { isActive: true };

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const skip = (pageNum - 1) * limit;

      const offers = await prisma.offer.findMany({
        where,
        orderBy: [
          { isFeatured: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
        include: {
          priceHistories: {
            orderBy: { createdAt: "desc" },
            take: 30
          }
        }
      });

      const total = await prisma.offer.count({ where });
      const hasMore = skip + offers.length < total;

      return NextResponse.json({ offers, hasMore, total });
    } else {
      // Legacy support for admin dashboard which expects an array
      const offers = await prisma.offer.findMany({
        where,
        orderBy: [
          { isFeatured: "desc" },
          { createdAt: "desc" },
        ],
        include: {
          priceHistories: {
            orderBy: { createdAt: "desc" },
            take: 30
          }
        }
      });
      return NextResponse.json(offers);
    }
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
        brand: data.brand || null,
        isFeatured: data.isFeatured || false,
      },
    });

    // P1: Create initial price history
    await prisma.priceHistory.create({
      data: {
        offerId: offer.id,
        price: data.price
      }
    });

    // Notificar a los suscriptores en segundo plano (sin await para no bloquear la respuesta)
    notifySubscribers(offer);

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

    const existingOffer = await prisma.offer.findUnique({ where: { id }, select: { price: true } });

    const updatedOffer = await prisma.offer.update({
      where: { id },
      data: updateData,
    });

    // P1: Add price history if price changed manually from admin
    if (updateData.price !== undefined && existingOffer && existingOffer.price !== updateData.price) {
      await prisma.priceHistory.create({
        data: {
          offerId: id,
          price: updateData.price
        }
      });
    }
    revalidatePath("/");
    return NextResponse.json(updatedOffer);
  } catch (error) {
    console.error("Prisma PUT Error:", error);
    return NextResponse.json({ error: "Error updating offer" }, { status: 500 });
  }
}
