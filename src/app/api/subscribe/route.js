import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      return NextResponse.json(
        { error: "Correo electrónico no válido" },
        { status: 400 }
      );
    }

    // Verificar si el correo ya existe
    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      return NextResponse.json(
        { error: "Este correo ya está suscrito" },
        { status: 400 }
      );
    }

    // Guardar nuevo suscriptor
    await prisma.subscriber.create({
      data: { email },
    });

    return NextResponse.json({ success: true, message: "Suscrito correctamente" });
  } catch (error) {
    console.error("Error subscribing:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
