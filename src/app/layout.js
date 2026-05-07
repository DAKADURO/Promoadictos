import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "PromoAdictos | Las Mejores Ofertas de Mercado Libre",
  description: "Descubre descuentos reales en Mercado Libre. Seleccionamos manualmente las mejores ofertas del día.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
