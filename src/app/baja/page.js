export const dynamic = "force-dynamic";
export const metadata = { title: "Darte de baja | PromoAdictos", robots: { index: false } };

import Link from "next/link";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

const box = { maxWidth: 480, margin: "4rem auto", padding: "0 1.25rem", textAlign: "center", color: "#fff" };
const btn = {
  background: "#ff5c00", color: "#fff", border: 0, borderRadius: 8,
  padding: "0.8rem 1.4rem", fontWeight: 800, fontSize: "1rem", cursor: "pointer",
};

export default async function BajaPage({ searchParams }) {
  const sp = await searchParams;

  if (sp?.ok) {
    return (
      <main style={box}>
        <h1>Listo, te diste de baja</h1>
        <p style={{ color: "#9ca3af" }}>Ya no recibirás el correo diario. Puedes volver a suscribirte cuando quieras.</p>
        <p><Link href="/" style={{ color: "#ff8a3d" }}>Volver a PromoAdictos</Link></p>
      </main>
    );
  }

  const email = String(sp?.e || "");
  const token = String(sp?.t || "");
  if (!email || !verifyUnsubscribeToken(email, token)) {
    return (
      <main style={box}>
        <h1>Enlace no válido</h1>
        <p style={{ color: "#9ca3af" }}>Usa el enlace de baja del último correo que recibiste.</p>
        <p><Link href="/" style={{ color: "#ff8a3d" }}>Volver a PromoAdictos</Link></p>
      </main>
    );
  }

  return (
    <main style={box}>
      <h1>¿Darte de baja del correo diario?</h1>
      <p style={{ color: "#9ca3af" }}>Dejaremos de enviar ofertas a {email}.</p>
      <form method="POST" action="/api/unsubscribe">
        <input type="hidden" name="e" value={email} />
        <input type="hidden" name="t" value={token} />
        <button type="submit" style={btn}>Sí, darme de baja</button>
      </form>
    </main>
  );
}
