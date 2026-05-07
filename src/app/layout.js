import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "PromoAdictos | Las Mejores Ofertas de Mercado Libre",
  description: "Encuentra productos con descuentos increíbles y ofertas exclusivas de Mercado Libre.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Navbar />
        <main className="pb-20">
          {children}
        </main>
      </body>
    </html>
  );
}
