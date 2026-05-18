"use client";

import { useState, useEffect } from "react";
import {
  Plus, Trash2, Star,
  LogOut, Package, TrendingUp, DollarSign, CheckCircle
} from "lucide-react";
import { signOut } from "next-auth/react";
import Navbar from "@/components/Navbar";

const CATEGORIES = ["General", "Tecnología", "Hogar", "Moda", "Gaming", "Audio", "Deportes", "Otros"];

const EMPTY_FORM = {
  title: "", price: "", originalPrice: "", discount: "",
  imageUrl: "", affiliateUrl: "", category: "General", isFeatured: false,
};

export default function AdminPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const triggerAutoImport = async (url) => {
    setImporting(true);
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          price: data.price !== null && data.price !== undefined ? data.price.toString() : prev.price,
          originalPrice: data.originalPrice !== null && data.originalPrice !== undefined ? data.originalPrice.toString() : prev.originalPrice,
          discount: data.discount !== null && data.discount !== undefined ? data.discount.toString() : prev.discount,
          imageUrl: data.imageUrl || prev.imageUrl,
          affiliateUrl: data.affiliateUrl || prev.affiliateUrl || url,
        }));
        showToast("¡Datos importados con éxito!");
      } else {
        showToast(data?.error || "Error al importar el enlace", "error");
      }
    } catch (err) {
      showToast("Error de conexión al importar", "error");
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!importUrl) {
      showToast("Por favor ingresa un link primero", "error");
      return;
    }
    await triggerAutoImport(importUrl);
  };

  useEffect(() => {
    fetchOffers();
    // Auto import if URL query param exists
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const autoUrl = params.get("importUrl");
      if (autoUrl) {
        setImportUrl(autoUrl);
        triggerAutoImport(autoUrl);
      }
    }
  }, []);

  // Auto-calculate discount when price or originalPrice changes
  useEffect(() => {
    const p = parseFloat(formData.price);
    const op = parseFloat(formData.originalPrice);
    if (p && op && op > p) {
      const calcDiscount = Math.round(((op - p) / op) * 100);
      setFormData(prev => {
        const discountStr = calcDiscount.toString();
        if (prev.discount !== discountStr) {
          return { ...prev, discount: discountStr };
        }
        return prev;
      });
    }
  }, [formData.price, formData.originalPrice]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/offers");
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : []);
    } catch { setOffers([]); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
          discount: formData.discount ? parseInt(formData.discount) : null,
        }),
      });
      if (res.ok) {
        setFormData(EMPTY_FORM);
        fetchOffers();
        showToast("¡Oferta publicada exitosamente!");
      } else {
        showToast("Error al guardar", "error");
      }
    } catch { showToast("Error de conexión", "error"); }
    finally { setSubmitting(false); }
  };

  const deleteOffer = async (id) => {
    if (!confirm("¿Eliminar esta oferta?")) return;
    try {
      await fetch(`/api/offers?id=${id}`, { method: "DELETE" });
      fetchOffers();
      showToast("Oferta eliminada");
    } catch { showToast("Error al eliminar", "error"); }
  };

  const totalValue = offers.reduce((acc, o) => acc + o.price, 0);
  const avgDiscount = offers.length
    ? Math.round(offers.filter(o => o.discount).reduce((a, o) => a + (o.discount || 0), 0) / offers.length)
    : 0;

  return (
    <>
      <Navbar />
      <div style={{ minHeight: "calc(100vh - 72px)", background: "var(--clr-bg)" }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: "5rem", right: "1.5rem", zIndex: 200,
            background: toast.type === "error" ? "var(--clr-red)" : "var(--clr-orange)",
            color: "#fff", padding: "0.85rem 1.25rem", borderRadius: "0.75rem",
            display: "flex", alignItems: "center", gap: "0.6rem",
            fontWeight: 700, fontSize: "0.9rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", animation: "fadeUp 0.3s ease both",
          }}>
            <CheckCircle size={18} />
            {toast.msg}
          </div>
        )}

        <div className="container" style={{ padding: "2.5rem 1.75rem 5rem" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2.5rem" }}>
            <div>
              <h1 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
                Panel de Control
              </h1>
              <p style={{ color: "var(--clr-muted)", marginTop: "0.25rem", fontSize: "0.9rem" }}>
                Gestiona tus ofertas — sé mejor que la competencia 🔥
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.6rem 1.1rem", borderRadius: "0.75rem",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                color: "var(--clr-muted)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
                transition: "all 0.3s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--clr-red)"; e.currentTarget.style.borderColor = "rgba(225,29,72,0.3)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--clr-muted)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
            {[
              { label: "Ofertas activas", value: offers.length, icon: <Package size={20} />, color: "var(--clr-orange)" },
              { label: "Valor total", value: `$${totalValue.toLocaleString("es-MX")}`, icon: <DollarSign size={20} />, color: "var(--clr-purple)" },
              { label: "Descuento promedio", value: `${avgDiscount}%`, icon: <TrendingUp size={20} />, color: "#10B981" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "var(--clr-card)", border: "1px solid var(--clr-border)",
                borderRadius: "1rem", padding: "1.25rem 1.5rem",
                display: "flex", alignItems: "center", gap: "1rem",
              }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "0.75rem",
                  background: `${s.color}15`, color: s.color,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, lineHeight: 1, fontFamily: "Sora, sans-serif" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--clr-muted)", marginTop: "0.2rem", fontWeight: 500 }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: "2rem", alignItems: "start" }}>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
              background: "var(--clr-card)", border: "1px solid var(--clr-border)",
              borderRadius: "1.25rem", padding: "1.75rem", position: "sticky", top: "92px",
            }}>
              <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ width: "28px", height: "28px", background: "var(--clr-orange)", borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={16} color="#fff" />
                </span>
                Nueva oferta
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {/* Autocompletar inteligente */}
                <div style={{
                  background: "rgba(255,92,0,0.03)",
                  border: "1px dashed rgba(255,92,0,0.25)",
                  borderRadius: "0.75rem",
                  padding: "0.85rem",
                  marginBottom: "0.25rem",
                }}>
                  <label style={{ ...labelStyle, color: "var(--clr-orange)", marginBottom: "0.35rem", display: "block" }}>⚡ Autocompletar con Link</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="Pega tu link meli.la..."
                      style={{ ...inputStyle, background: "rgba(0,0,0,0.15)", flex: 1 }}
                    />
                    <button
                      type="button"
                      disabled={importing}
                      onClick={handleImport}
                      style={{
                        background: importing ? "var(--clr-dim)" : "var(--clr-orange)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "0.6rem",
                        padding: "0 1.2rem",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: importing ? "not-allowed" : "pointer",
                        transition: "all 0.3s",
                        whiteSpace: "nowrap",
                        boxShadow: importing ? "none" : "0 2px 8px rgba(255,92,0,0.2)",
                      }}
                    >
                      {importing ? "..." : "✦ Importar"}
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label style={labelStyle}>Título del producto</label>
                  <input name="title" value={formData.title} onChange={handleChange}
                    placeholder="Ej: iPhone 15 Pro Max 256GB" required style={inputStyle} />
                </div>

                {/* Price row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Precio ($)</label>
                    <input name="price" type="number" step="0.01" min="0" value={formData.price}
                      onChange={handleChange} placeholder="24999" required style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Precio original ($)</label>
                    <input name="originalPrice" type="number" step="0.01" min="0" value={formData.originalPrice}
                      onChange={handleChange} placeholder="28999" style={inputStyle} />
                  </div>
                </div>

                {/* Discount + Category */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Descuento (%)</label>
                    <input name="discount" type="number" min="0" max="100" value={formData.discount}
                      onChange={handleChange} placeholder="13" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Categoría</label>
                    <select name="category" value={formData.category} onChange={handleChange} style={{ ...inputStyle, appearance: "none" }}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label style={labelStyle}>URL de la imagen</label>
                  <input name="imageUrl" type="url" value={formData.imageUrl} onChange={handleChange}
                    placeholder="https://..." required style={inputStyle} />
                  {formData.imageUrl && (
                    <div style={{ marginTop: "0.5rem", background: "#fff", borderRadius: "0.5rem", padding: "0.5rem", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={formData.imageUrl} alt="preview" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
                    </div>
                  )}
                </div>

                {/* Affiliate URL */}
                <div>
                  <label style={labelStyle}>Link de afiliado</label>
                  <input name="affiliateUrl" type="url" value={formData.affiliateUrl} onChange={handleChange}
                    placeholder="https://mercadolibre.com.mx/..." required style={inputStyle} />
                </div>

                {/* Featured toggle */}
                <label style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  cursor: "pointer", padding: "0.6rem 0",
                }}>
                  <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange}
                    style={{ accentColor: "var(--clr-orange)", width: "18px", height: "18px" }} />
                  <Star size={16} color="var(--clr-orange)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-text)" }}>Marcar como destacada</span>
                </label>

                <button type="submit" disabled={submitting} style={{
                  marginTop: "0.25rem",
                  background: submitting ? "var(--clr-dim)" : "linear-gradient(135deg, var(--clr-orange), var(--clr-orange-lt))",
                  color: "#fff", border: "none", borderRadius: "0.75rem",
                  padding: "0.9rem", fontWeight: 700, fontSize: "0.95rem",
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "all 0.3s",
                  boxShadow: submitting ? "none" : "0 4px 16px rgba(255,92,0,0.3)",
                }}>
                  {submitting ? "Publicando..." : "✦ Publicar oferta"}
                </button>
              </div>
            </form>

            {/* Offers list */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--clr-orange)", boxShadow: "0 0 8px var(--clr-orange)" }} />
                <span style={{ color: "var(--clr-muted)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Ofertas publicadas
                </span>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--clr-muted)" }}>Cargando...</div>
              ) : offers.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "4rem 2rem",
                  background: "var(--clr-card)", border: "2px dashed var(--clr-border)",
                  borderRadius: "1.25rem", color: "var(--clr-muted)",
                }}>
                  <Package size={40} style={{ margin: "0 auto 1rem", opacity: 0.2 }} />
                  <p style={{ fontWeight: 600 }}>Sin ofertas aún</p>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Agrega tu primera oferta usando el formulario</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {offers.map(offer => (
                    <div key={offer.id} style={{
                      background: "var(--clr-card)", border: `1px solid ${offer.isFeatured ? "rgba(255,92,0,0.2)" : "var(--clr-border)"}`,
                      borderRadius: "1rem", padding: "1rem 1.25rem",
                      display: "flex", alignItems: "center", gap: "1rem",
                      transition: "border-color 0.3s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,92,0,0.25)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = offer.isFeatured ? "rgba(255,92,0,0.2)" : "var(--clr-border)"}
                    >
                      {/* Featured indicator */}
                      {offer.isFeatured && (
                        <Star size={14} color="var(--clr-orange)" fill="var(--clr-orange)" style={{ flexShrink: 0 }} />
                      )}

                      {/* Thumbnail */}
                      <div style={{
                        width: "56px", height: "56px", flexShrink: 0,
                        background: "#fff", borderRadius: "0.6rem", padding: "0.3rem",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <img src={offer.imageUrl} alt={offer.title}
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {offer.title}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem" }}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--clr-orange)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            {offer.category}
                          </span>
                          {offer.discount && (
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--clr-red)", background: "rgba(225,29,72,0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                              -{offer.discount}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontWeight: 800, fontFamily: "Sora, sans-serif", fontSize: "1.1rem" }}>
                          ${offer.price.toLocaleString("es-MX")}
                        </p>
                        {offer.originalPrice && (
                          <p style={{ fontSize: "0.75rem", color: "var(--clr-muted)", textDecoration: "line-through" }}>
                            ${offer.originalPrice.toLocaleString("es-MX")}
                          </p>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => deleteOffer(offer.id)}
                        style={{
                          width: "36px", height: "36px", borderRadius: "0.6rem", flexShrink: 0,
                          background: "transparent", border: "1px solid transparent",
                          color: "var(--clr-muted)", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--clr-red)"; e.currentTarget.style.borderColor = "rgba(225,29,72,0.3)"; e.currentTarget.style.background = "rgba(225,29,72,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--clr-muted)"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const labelStyle = {
  display: "block", fontSize: "0.75rem", fontWeight: 700,
  color: "var(--clr-muted)", textTransform: "uppercase",
  letterSpacing: "0.08em", marginBottom: "0.4rem",
};

const inputStyle = {
  width: "100%", background: "rgba(255,255,255,0.03)",
  border: "1px solid var(--clr-border)", borderRadius: "0.65rem",
  padding: "0.7rem 0.9rem", color: "var(--clr-text)", fontSize: "0.9rem",
  outline: "none", transition: "border-color 0.3s", fontFamily: "inherit",
};
