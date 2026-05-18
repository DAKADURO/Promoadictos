import "./globals.css";
import Script from "next/script";

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

// Optimal viewport for mobile — viewport-fit=cover fills iPhone notch/dynamic island
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#050810",
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  return (
    <html lang="es">
      <head>
        {/* Google Analytics 4 */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}

        {/* Microsoft Clarity */}
        {clarityId && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window,document,"clarity","script","${clarityId}");
            `}
          </Script>
        )}
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
