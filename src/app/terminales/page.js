"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function TerminalesPage() {
  return (
    <>
      {/* Search is disabled here to keep it premium and clean */}
      <Navbar />

      <main style={{ minHeight: "85vh", padding: "3rem 0 6rem" }} className="animate-up">
        <section className="point-section" style={{ border: "none", background: "none", padding: "0 0 2rem" }}>
          <div className="container">
            <div className="point-header">
              <div className="point-header-tag">
                <span className="dot" />
                Socio Oficial Mercado Pago
              </div>
              <h1 className="point-title font-display">
                Equipa tu negocio con <span>Descuento Point</span>
              </h1>
              <p className="point-subtitle">
                Adquiere tu lector de tarjetas Point con el descuento exclusivo de PromoAdictos. Sin rentas mensuales ni contratos forzosos. ¡Empieza a cobrar hoy mismo y recibe cashback en tus primeros cobros!
              </p>
            </div>

            <div className="point-grid">
              {/* Card 1: Point Smart 2 */}
              <a 
                href="https://mpago.li/2PWowCN" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="point-card"
              >
                <div className="point-card-badge">89% DTO</div>
                <div className="point-card-cashback">Cashback $400</div>
                <div className="point-img-container">
                  <img 
                    src="/point_smart_2.png" 
                    alt="Point Smart 2" 
                    loading="lazy" 
                    decoding="async" 
                  />
                </div>
                <div className="point-card-body">
                  <div className="point-card-title-wrap">
                    <h3 className="point-card-title">Point Smart 2</h3>
                  </div>
                  <p className="point-card-subtitle">
                    El más completo. Chip 4G gratis e ilimitado y ticket impreso.
                  </p>
                  <div className="point-card-pricing">
                    <span className="point-card-price">$479</span>
                    <span className="point-card-original">$4,499</span>
                  </div>
                  <div className="point-card-features">
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Chip 4G gratis con internet ilimitado</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Impresión de recibos física y digital</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Batería de larga duración (todo el día)</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Envío gratis en 2h y 1 año de garantía</span>
                    </div>
                  </div>
                  <div className="point-card-btn">
                    Comprar con descuento
                    <ArrowRight size={15} />
                  </div>
                </div>
              </a>

              {/* Card 2: Point Air */}
              <a 
                href="https://mpago.li/2PWowCN" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="point-card"
              >
                <div className="point-card-badge">93% DTO</div>
                <div className="point-card-cashback">Cashback $200</div>
                <div className="point-img-container">
                  <img 
                    src="/point_air.png" 
                    alt="Point Air" 
                    loading="lazy" 
                    decoding="async" 
                  />
                </div>
                <div className="point-card-body">
                  <div className="point-card-title-wrap">
                    <h3 className="point-card-title">Point Air</h3>
                  </div>
                  <p className="point-card-subtitle">
                    Elegante y veloz. Con luz LED, chip 4G y WiFi gratis.
                  </p>
                  <div className="point-card-pricing">
                    <span className="point-card-price">$199</span>
                    <span className="point-card-original">$2,999</span>
                  </div>
                  <div className="point-card-features">
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Chip 4G gratis y conexión WiFi</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Pantalla a color y diseño ultraligero</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Cobros más rápidos y batería duradera</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Envío gratis en 2h y 1 año de garantía</span>
                    </div>
                  </div>
                  <div className="point-card-btn">
                    Comprar con descuento
                    <ArrowRight size={15} />
                  </div>
                </div>
              </a>

              {/* Card 3: Point Mini */}
              <a 
                href="https://mpago.li/2PWowCN" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="point-card"
              >
                <div className="point-card-badge">82% DTO</div>
                <div className="point-card-cashback">Point Mini Gratis (*)</div>
                <div className="point-img-container">
                  <img 
                    src="/point_mini.png" 
                    alt="Point Mini" 
                    loading="lazy" 
                    decoding="async" 
                  />
                </div>
                <div className="point-card-body">
                  <div className="point-card-title-wrap">
                    <h3 className="point-card-title">Point Mini</h3>
                  </div>
                  <p className="point-card-subtitle">
                    El más práctico. Cobra donde quieras usando tu celular.
                  </p>
                  <div className="point-card-pricing">
                    <span className="point-card-price">$89</span>
                    <span className="point-card-original">$499</span>
                  </div>
                  <div className="point-card-features">
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Conexión Bluetooth veloz a tu celular</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Tamaño ultra de bolsillo y recargable</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Teclado físico para mayor seguridad</span>
                    </div>
                    <div className="point-feature-item">
                      <CheckCircle2 size={14} className="point-feature-icon" />
                      <span>Envío gratis en 2h y 1 año de garantía</span>
                    </div>
                  </div>
                  <div className="point-card-btn">
                    Comprar con descuento
                    <ArrowRight size={15} />
                  </div>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Benefits details block */}
        <section style={{ padding: "4rem 0 2rem", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <div className="container" style={{ maxWidth: "800px" }}>
            <h2 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "2rem", textAlign: "center" }}>
              ¿Por qué elegir Mercado Pago Point?
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFB800", marginBottom: "0.5rem" }}>Sin Costos Ocultos</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--clr-muted)", lineHeight: 1.6 }}>
                  No pagas mensualidades, anualidades ni mínimos de venta. El dispositivo es tuyo para siempre. Solo pagas una comisión del 3.5% + IVA por cada transacción cobrada.
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFB800", marginBottom: "0.5rem" }}>Tu Dinero al Instante</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--clr-muted)", lineHeight: 1.6 }}>
                  El dinero de tus ventas se deposita inmediatamente en tu cuenta digital de Mercado Pago. Puedes transferirlo gratis a tu banco, pagar servicios o usar tu tarjeta gratis.
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#009EE3", marginBottom: "0.5rem" }}>Todas las Tarjetas</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--clr-muted)", lineHeight: 1.6 }}>
                  Cobra con Visa, Mastercard, American Express, Carnet, despensas (Sodexo, Toka, Edenred) y también pagos contactless como Apple Pay o Google Pay.
                </p>
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#009EE3", marginBottom: "0.5rem" }}>Meses Sin Intereses</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--clr-muted)", lineHeight: 1.6 }}>
                  Ofrece mensualidades a tus clientes con más de 15 bancos participantes en México, aumentando tus ventas promedio de manera significativa.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-brand gradient-text">PromoAdictos</div>
          <p style={{ marginTop: "0.4rem" }}>
            © {new Date().getFullYear()} PromoAdictos — Las mejores ofertas de México
          </p>
        </div>
      </footer>
    </>
  );
}
