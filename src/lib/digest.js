import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

const BATCH_SIZE = parseInt(process.env.DIGEST_BATCH_SIZE || "50", 10);
const MAX_OFFERS = parseInt(process.env.DIGEST_MAX_OFFERS || "8", 10);
const HOURS = parseInt(process.env.DIGEST_LOOKBACK_HOURS || "24", 10);

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = (n) => `$${Number(n).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

function buildHtml(offers) {
  const site = process.env.NEXTAUTH_URL || "";
  const items = offers
    .map(
      (o) => `
    <tr><td style="padding:16px 0;border-bottom:1px solid #eee;">
      ${o.imageUrl ? `<img src="${esc(o.imageUrl)}" alt="" style="max-width:160px;border-radius:8px;float:left;margin-right:16px;" />` : ""}
      <h3 style="margin:0 0 6px;color:#333;font-size:16px;">${esc(o.title)}</h3>
      <div><strong style="color:#E94B5E;font-size:20px;">${money(o.price)}</strong>
      ${o.originalPrice ? `<span style="text-decoration:line-through;color:#999;margin-left:8px;">${money(o.originalPrice)}</span>` : ""}
      ${o.discount ? `<span style="color:#16a34a;margin-left:8px;">-${o.discount}%</span>` : ""}</div>
      <a href="${esc(o.affiliateUrl)}" style="display:inline-block;margin-top:8px;background:#E94B5E;color:#fff;padding:8px 18px;border-radius:6px;text-decoration:none;font-weight:bold;">Ver oferta</a>
    </td></tr>`
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <h1 style="color:#E94B5E;text-align:center;">Las mejores ofertas de hoy 🔥</h1>
    <table width="100%" cellspacing="0" cellpadding="0">${items}</table>
    ${site ? `<p style="text-align:center;margin-top:24px;"><a href="${esc(site)}">Ver todas en Promoadictos</a></p>` : ""}
  </div>`;
}

export async function sendDailyDigest() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { skipped: "SMTP credentials missing" };
  }

  const since = new Date(Date.now() - HOURS * 3600 * 1000);
  let offers = await prisma.offer.findMany({
    where: { isActive: true, createdAt: { gte: since } },
    orderBy: [{ isFeatured: "desc" }, { discount: "desc" }],
    take: MAX_OFFERS,
  });
  // Día flojo: completar con las mejores ofertas activas
  if (offers.length < 3) {
    offers = await prisma.offer.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { discount: "desc" }, { createdAt: "desc" }],
      take: MAX_OFFERS,
    });
  }
  if (offers.length === 0) return { skipped: "no offers" };

  const subscribers = await prisma.subscriber.findMany({ where: { isActive: true }, select: { email: true } });
  if (subscribers.length === 0) return { skipped: "no subscribers" };

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const html = buildHtml(offers);
  const emails = subscribers.map((s) => s.email);
  let sent = 0;
  let failedBatches = 0;
  let lastError = null;

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    try {
      await transporter.sendMail({
        from: `"Promoadictos" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER,
        bcc: batch,
        subject: "Las mejores ofertas de hoy 🔥",
        html,
      });
      sent += batch.length;
    } catch (err) {
      failedBatches++;
      lastError = err.message;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (sent === 0) throw new Error(`Digest failed for all batches: ${lastError}`);
  return { offers: offers.length, recipients: sent, failedBatches };
}
