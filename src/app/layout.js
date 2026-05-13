import "./globals.css";

export const metadata = {
  title: "PromoAdictos | Las Mejores Ofertas y Descuentos de México",
  description:
    "Descubre descuentos reales en Mercado Libre, Amazon y más. Seleccionamos manualmente las mejores ofertas del día. Sin spam, solo gangas.",
  keywords: "ofertas, descuentos, mercado libre, amazon, promociones, méxico, gangas",
  openGraph: {
    title: "PromoAdictos | Ofertas y Descuentos en Tiempo Real",
    description: "Las mejores ofertas verificadas de México. Actualizado diariamente.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
