import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

// Avisos por correo al admin. Un mismo aviso no se repite en 24 h (en memoria:
// si el servidor se reinicia puede repetirse una vez, es aceptable).
const lastSent = new Map();
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function sendAdminAlert(key, subject, text) {
  const to = process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
  if (!to || !process.env.SMTP_USER || !process.env.SMTP_PASS) return false;
  if (Date.now() - (lastSent.get(key) || 0) < COOLDOWN_MS) return false;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: `"Promoadictos" <${process.env.SMTP_USER}>`, to, subject: `[Promoadictos] ${subject}`, text });
    lastSent.set(key, Date.now());
    return true;
  } catch (err) {
    console.error("[Alerts] No se pudo enviar el aviso:", err.message);
    return false;
  }
}

const FAIL_STREAK = parseInt(process.env.ALERT_FAIL_STREAK || "3", 10);
const ZERO_STREAK = parseInt(process.env.ALERT_DISCOVER_ZERO_STREAK || "4", 10);

// Se llama después de cada ejecución programada de un job.
export async function evaluateAlerts(jobName) {
  try {
    const recent = await prisma.jobLog.findMany({
      where: { job: jobName, endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: Math.max(FAIL_STREAK, ZERO_STREAK),
    });

    if (recent.length >= FAIL_STREAK && recent.slice(0, FAIL_STREAK).every((l) => !l.success)) {
      await sendAdminAlert(
        `fail:${jobName}`,
        `El job "${jobName}" falló ${FAIL_STREAK} veces seguidas`,
        `Último error: ${recent[0].error || "(sin detalle)"}\n\nRevisa el panel Automatización del admin.`
      );
    }

    if (jobName === "discover-offers" && recent.length >= ZERO_STREAK) {
      const zero = recent.slice(0, ZERO_STREAK).every((l) => l.success && Number(l.result?.count ?? l.result?.created ?? 0) === 0);
      if (zero) {
        await sendAdminAlert(
          "discover-zero",
          `El descubrimiento de ofertas lleva ${ZERO_STREAK} ejecuciones sin resultados`,
          "Puede indicar un cambio en Mercado Libre (token vencido o API bloqueada) o umbrales demasiado estrictos.\n\nRevisa /api/ml/authorize y el panel Automatización."
        );
      }
    }
  } catch (err) {
    console.error("[Alerts] Error evaluando avisos:", err.message);
  }
}
