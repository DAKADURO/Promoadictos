"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Trash2, Star,
  LogOut, Package, TrendingUp, DollarSign, CheckCircle, RefreshCw,
  Edit3, Search, X, ChevronLeft, ChevronRight
} from "lucide-react";
import { signOut } from "next-auth/react";
import Navbar from "@/components/Navbar";

const CATEGORIES = ["General", "Tecnología", "Hogar", "Moda", "Gaming", "Audio", "Deportes", "Belleza", "Otros"];

const EMPTY_FORM = {
  title: "", price: "", originalPrice: "", discount: "",
  imageUrl: "", affiliateUrl: "", category: "General", isFeatured: false,
};

function extractProductId(url) {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  
  // Mercado Libre item ID (e.g., MLM-1234567890 or MLM1234567890)
  const mlMatch = lowerUrl.match(/mlm-?[0-9]+/);
  if (mlMatch) {
    return mlMatch[0].replace("-", ""); // Normalize to MLM1234567890
  }
  
  // Amazon ASIN (10-character alphanumeric, e.g. B0XXXXXXXX)
  const amzMatch = lowerUrl.match(/\/dp\/([a-z0-9]{10})/i) || lowerUrl.match(/\/gp\/product\/([a-z0-9]{10})/i);
  if (amzMatch) {
    return amzMatch[1].toUpperCase();
  }
  
  return lowerUrl.trim();
}

export default function AdminPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Estados avanzados para interactividad y UX
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Todas");
  const [currentPage, setCurrentPage] = useState(1);

  const isTitleDuplicate = useMemo(() => {
    if (!formData.title) return false;
    const titleLower = formData.title.toLowerCase().trim();
    return offers.some(o => {
      if (editingOfferId && o.id === editingOfferId) return false;
      return o.title.toLowerCase().trim() === titleLower;
    });
  }, [formData.title, offers, editingOfferId]);

  const isUrlDuplicate = useMemo(() => {
    if (!formData.affiliateUrl) return false;
    const urlProductId = extractProductId(formData.affiliateUrl);
    return offers.some(o => {
      if (editingOfferId && o.id === editingOfferId) return false;
      const existingProductId = extractProductId(o.affiliateUrl);
      if (urlProductId && existingProductId && urlProductId === existingProductId) return true;
      return o.affiliateUrl.toLowerCase().trim() === formData.affiliateUrl.toLowerCase().trim();
    });
  }, [formData.affiliateUrl, offers, editingOfferId]);

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
          category: data.category || prev.category,
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

  const handleSyncPrices = async () => {
    setSyncing(true);
    showToast("⚡ Iniciando sincronización de precios...", "success");
    try {
      const res = await fetch("/api/offers/sync-prices");
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchOffers();
        showToast(`¡Sincronizado! ${data.updated} de ${data.processed} ofertas actualizadas.`, "success");
      } else {
        showToast(data?.error || "Error al sincronizar precios", "error");
      }
    } catch (err) {
      showToast("Error de conexión al sincronizar", "error");
    } finally {
      setSyncing(false);
    }
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

  // Lógica de búsqueda, filtrado y paginación en tiempo real
  const filteredOffers = offers.filter(o => {
    const matchesSearch = o.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === "Todas" || o.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const OFFERS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredOffers.length / OFFERS_PER_PAGE));

  // Ajustar la página si los filtros dejan la página actual vacía
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [searchQuery, selectedCategoryFilter, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * OFFERS_PER_PAGE;
  const paginatedOffers = filteredOffers.slice(startIndex, startIndex + OFFERS_PER_PAGE);

  // Controladores para el flujo de edición rápida
  const handleEditClick = (offer) => {
    setEditingOfferId(offer.id);
    setFormData({
      title: offer.title || "",
      price: offer.price !== null && offer.price !== undefined ? offer.price.toString() : "",
      originalPrice: offer.originalPrice !== null && offer.originalPrice !== undefined ? offer.originalPrice.toString() : "",
      discount: offer.discount !== null && offer.discount !== undefined ? offer.discount.toString() : "",
      imageUrl: offer.imageUrl || "",
      affiliateUrl: offer.affiliateUrl || "",
      category: offer.category || "General",
      isFeatured: !!offer.isFeatured,
    });
    // Scroll suave hacia el formulario (ideal para móviles y pantallas reducidas)
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingOfferId(null);
    setFormData(EMPTY_FORM);
    setImportUrl("");
  };

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
      const isEditing = !!editingOfferId;
      const res = await fetch("/api/offers", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingOfferId || undefined,
          ...formData,
          price: parseFloat(formData.price),
          originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
          discount: formData.discount ? parseInt(formData.discount) : null,
        }),
      });
      if (res.ok) {
        setFormData(EMPTY_FORM);
        setImportUrl("");
        setEditingOfferId(null);
        fetchOffers();
        showToast(isEditing ? "¡Oferta actualizada exitosamente!" : "¡Oferta publicada exitosamente!");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || (isEditing ? "Error al actualizar la oferta" : "Error al guardar la oferta");
        showToast(errorMsg, "error");
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

  const updateOffer = async (id, updatedFields) => {
    try {
      const res = await fetch("/api/offers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updatedFields }),
      });
      if (res.ok) {
        setOffers(prev => prev.map(o => o.id === id ? { ...o, ...updatedFields } : o));
        showToast("¡Oferta actualizada!");
      } else {
        showToast("Error al actualizar la oferta", "error");
      }
    } catch {
      showToast("Error de conexión al actualizar", "error");
    }
  };

  const totalValue = offers.reduce((acc, o) => acc + o.price, 0);
  const avgDiscount = offers.length
    ? Math.round(offers.filter(o => o.discount).reduce((a, o) => a + (o.discount || 0), 0) / offers.length)
    : 0;

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Efecto de borde de energía para el módulo de scraping inteligente */
        @keyframes energy-border-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .energy-border-container {
          position: relative;
          border-radius: 0.85rem;
          padding: 1px;
          background: rgba(255, 92, 0, 0.02);
          border: 1px dashed rgba(255, 92, 0, 0.2);
          transition: all 0.4s ease;
        }

        .energy-border-container.active {
          border: 1px solid transparent;
          background: linear-gradient(90deg, #ff5c00, #ff8c00, #7c3aed, #ff5c00);
          background-size: 300% 300%;
          animation: energy-border-animation 2s linear infinite;
          box-shadow: 0 0 15px rgba(255, 92, 0, 0.15);
        }

        /* Tarjetas de estadísticas con Glassmorphism premium */
        .admin-glass-card {
          position: relative;
          background: rgba(14, 19, 38, 0.45) !important;
          backdrop-filter: blur(16px) saturate(1.2);
          -webkit-backdrop-filter: blur(16px) saturate(1.2);
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          border-radius: 1.25rem;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }

        .admin-glass-card:hover {
          transform: translateY(-4px) translateZ(0);
          border-color: rgba(255, 92, 0, 0.25) !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45), 
                      0 0 25px rgba(255, 92, 0, 0.05);
        }

        /* Resplandores radiales de fondo para los iconos de KPIs */
        .radial-glow {
          position: absolute;
          top: -20px;
          left: -20px;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          filter: blur(35px);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
          transition: all 0.4s ease;
        }

        .admin-glass-card:hover .radial-glow {
          opacity: 0.25;
          transform: scale(1.35);
        }

        /* Botones de Paginación interactiva */
        .pagination-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 0.65rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--clr-border);
          color: var(--clr-muted);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
          font-family: inherit;
        }

        .pagination-btn:hover:not(:disabled) {
          color: #fff;
          border-color: rgba(255, 92, 0, 0.4);
          background: rgba(255, 92, 0, 0.08);
          transform: translateY(-1px);
        }

        .pagination-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .pagination-btn.active {
          background: var(--clr-orange);
          border-color: var(--clr-orange);
          color: #fff;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(255, 92, 0, 0.25);
        }

        /* Animación para carga de elementos */
        .fade-in-item {
          animation: fadeInItem 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes fadeInItem {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ─── OPTIMIZACIONES PARA DISPOSITIVOS MÓVILES ─── */
        .admin-container {
          padding: 2.5rem 1.75rem 5rem;
        }

        .admin-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2.5rem;
          gap: 1.25rem;
        }

        .admin-header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2.5rem;
        }

        .admin-grid-layout {
          display: grid;
          grid-template-columns: 380px minmax(0, 1fr);
          gap: 2rem;
          align-items: start;
        }

        .admin-filters-grid {
          display: grid;
          grid-template-columns: 1fr 150px;
          gap: 0.75rem;
        }

        /* Tarjetas de ofertas adaptativas */
        .admin-offer-card {
          background: var(--clr-card);
          border: 1px solid var(--clr-border);
          border-radius: 1rem;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .admin-offer-card.featured {
          border-color: rgba(255, 92, 0, 0.2);
        }

        .admin-offer-card:hover {
          border-color: rgba(255, 92, 0, 0.25) !important;
        }

        @media (max-width: 992px) {
          .admin-grid-layout {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
        }

        @media (max-width: 640px) {
          .admin-container {
            padding: 1.5rem 1rem 3rem !important;
          }

          .admin-header-row {
            flex-direction: column;
            align-items: stretch;
            margin-bottom: 1.75rem;
            gap: 1rem;
          }

          .admin-header-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .admin-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)) !important;
            gap: 0.75rem !important;
            margin-bottom: 1.5rem !important;
          }

          .admin-glass-card {
            padding: 1rem !important;
            gap: 0.75rem !important;
          }

          .admin-stat-value {
            font-size: 1.25rem !important;
          }

          .admin-stat-icon-box {
            width: 36px !important;
            height: 36px !important;
          }

          /* Transformación de la tarjeta a modo vertical/responsivo */
          .admin-offer-card {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
            padding: 1rem !important;
          }

          .admin-offer-body {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
            padding-top: 0.75rem !important;
            width: 100% !important;
            margin-top: 0.25rem;
          }

          .admin-offer-prices {
            text-align: left !important;
          }
        }

        @media (max-width: 520px) {
          .admin-filters-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
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

        <div className="container admin-container">

          {/* Header */}
          <div className="admin-header-row">
            <div>
              <h1 className="font-display" style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
                Panel de Control
              </h1>
              <p style={{ color: "var(--clr-muted)", marginTop: "0.25rem", fontSize: "0.9rem" }}>
                Gestiona tus ofertas — sé mejor que la competencia 🔥
              </p>
            </div>
            <div className="admin-header-actions">
              <button
                onClick={handleSyncPrices}
                disabled={syncing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1.1rem",
                  borderRadius: "0.75rem",
                  background: syncing 
                    ? "rgba(255,255,255,0.02)" 
                    : "linear-gradient(135deg, rgba(255,92,0,0.1), rgba(255,142,77,0.05))",
                  border: syncing 
                    ? "1px solid rgba(255,255,255,0.05)" 
                    : "1px solid rgba(255,92,0,0.25)",
                  color: syncing ? "var(--clr-muted)" : "var(--clr-orange-lt)",
                  cursor: syncing ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  transition: "all 0.3s",
                  boxShadow: syncing ? "none" : "0 4px 12px rgba(255,92,0,0.08)",
                }}
                onMouseEnter={e => {
                  if (!syncing) {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,92,0,0.2), rgba(255,142,77,0.1))";
                    e.currentTarget.style.borderColor = "var(--clr-orange)";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(255,92,0,0.15)";
                  }
                }}
                onMouseLeave={e => {
                  if (!syncing) {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,92,0,0.1), rgba(255,142,77,0.05))";
                    e.currentTarget.style.borderColor = "rgba(255,92,0,0.25)";
                    e.currentTarget.style.color = "var(--clr-orange-lt)";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(255,92,0,0.08)";
                  }
                }}
              >
                <RefreshCw 
                  size={15} 
                  style={{ 
                    animation: syncing ? "spin 1.5s linear infinite" : "none",
                  }} 
                />
                {syncing ? "Sincronizando..." : "⚡ Sincronizar Precios"}
              </button>

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
          </div>

          {/* Stats */}
          <div className="admin-stats-grid">
            {[
              { label: "Ofertas activas", value: offers.length, icon: <Package size={20} style={{ position: "relative", zIndex: 1 }} />, color: "var(--clr-orange)" },
              { label: "Valor total", value: `$${totalValue.toLocaleString("es-MX")}`, icon: <DollarSign size={20} style={{ position: "relative", zIndex: 1 }} />, color: "var(--clr-purple)" },
              { label: "Descuento promedio", value: `${avgDiscount}%`, icon: <TrendingUp size={20} style={{ position: "relative", zIndex: 1 }} />, color: "#10B981" },
            ].map((s, i) => (
              <div key={i} className="admin-glass-card">
                {/* Halo de luz de color radial degradado */}
                <div className="radial-glow" style={{ background: s.color }} />

                <div className="admin-stat-icon-box" style={{
                  width: "42px", height: "42px", borderRadius: "0.75rem",
                  background: `${s.color}20`, color: s.color,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  boxShadow: `0 4px 12px ${s.color}15`,
                  position: "relative", zIndex: 1
                }}>
                  {s.icon}
                </div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div className="admin-stat-value" style={{ fontSize: "1.45rem", fontWeight: 800, lineHeight: 1, fontFamily: "Sora, sans-serif", color: "#fff" }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--clr-muted)", marginTop: "0.25rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div className="admin-grid-layout">

            {/* Form */}
            <form onSubmit={handleSubmit} style={{
              background: "rgba(14, 19, 38, 0.4)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.04)",
              borderRadius: "1.25rem", padding: "1.25rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease",
            }}>
              <h2 className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "#fff" }}>
                <span style={{ 
                  width: "28px", height: "28px", 
                  background: editingOfferId ? "linear-gradient(135deg, var(--clr-purple), #a78bfa)" : "linear-gradient(135deg, var(--clr-orange), var(--clr-orange-lt))", 
                  borderRadius: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: editingOfferId ? "0 4px 10px rgba(124,58,237,0.3)" : "0 4px 10px rgba(255,92,0,0.3)",
                  transition: "all 0.3s ease"
                }}>
                  {editingOfferId ? <Edit3 size={14} color="#fff" /> : <Plus size={14} color="#fff" />}
                </span>
                {editingOfferId ? "Editar oferta" : "Nueva oferta"}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {/* Autocompletar inteligente con Energy Border animado */}
                {!editingOfferId && (
                  <div className={`energy-border-container ${importing ? "active" : ""}`} style={{ padding: "0.85rem", marginBottom: "0.25rem" }}>
                    <label style={{ ...labelStyle, color: "var(--clr-orange)", marginBottom: "0.35rem", display: "block" }}>⚡ Autocompletar con Link</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="url"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        placeholder="Pega tu link meli.la..."
                        style={{ ...inputStyle, background: "rgba(0,0,0,0.15)", flex: 1, border: "1px solid rgba(255,255,255,0.05)" }}
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
                )}

                {/* Title */}
                <div>
                  <label style={labelStyle}>Título del producto</label>
                  <input name="title" value={formData.title} onChange={handleChange}
                    placeholder="Ej: iPhone 15 Pro Max 256GB" required style={inputStyle} />
                  {isTitleDuplicate && (
                    <span style={{ fontSize: "0.75rem", color: "#FFAC3E", marginTop: "0.25rem", display: "block" }}>
                      ⚠️ Ya existe una oferta activa con este título.
                    </span>
                  )}
                </div>

                {/* Price row con adornos en línea */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Precio ($)</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--clr-muted)", fontSize: "0.85rem", fontWeight: 700 }}>$</span>
                      <input name="price" type="number" step="0.01" min="0" value={formData.price}
                        onChange={handleChange} placeholder="24999" required style={{ ...inputStyle, paddingLeft: "1.6rem" }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Precio original ($)</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--clr-muted)", fontSize: "0.85rem", fontWeight: 700 }}>$</span>
                      <input name="originalPrice" type="number" step="0.01" min="0" value={formData.originalPrice}
                        onChange={handleChange} placeholder="28999" style={{ ...inputStyle, paddingLeft: "1.6rem" }} />
                    </div>
                  </div>
                </div>

                {/* Discount + Category */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>Descuento (%)</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--clr-muted)", fontSize: "0.85rem", fontWeight: 700 }}>%</span>
                      <input name="discount" type="number" min="0" max="100" value={formData.discount}
                        onChange={handleChange} placeholder="13" style={{ ...inputStyle, paddingRight: "1.6rem" }} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Categoría</label>
                    <div style={{ position: "relative" }}>
                      <select name="category" value={formData.category} onChange={handleChange} style={{ ...inputStyle, appearance: "none" }}>
                        {Array.from(new Set([...CATEGORIES, formData.category])).map(c => <option key={c}>{c}</option>)}
                      </select>
                      <span style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--clr-muted)", pointerEvents: "none", fontSize: "0.6rem" }}>▼</span>
                    </div>
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label style={labelStyle}>URL de la imagen</label>
                  <input name="imageUrl" type="url" value={formData.imageUrl} onChange={handleChange}
                    placeholder="https://..." required style={inputStyle} />
                  {formData.imageUrl && (
                    <div style={{ marginTop: "0.5rem", background: "#fff", borderRadius: "0.5rem", padding: "0.5rem", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 10px rgba(0,0,0,0.1)" }}>
                      <img src={formData.imageUrl} alt="preview" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
                    </div>
                  )}
                </div>

                {/* Affiliate URL */}
                <div>
                  <label style={labelStyle}>Link de afiliado</label>
                  <input name="affiliateUrl" type="url" value={formData.affiliateUrl} onChange={handleChange}
                    placeholder="https://mercadolibre.com.mx/..." required style={inputStyle} />
                  {isUrlDuplicate && (
                    <span style={{ fontSize: "0.75rem", color: "#FFAC3E", marginTop: "0.25rem", display: "block" }}>
                      ⚠️ Ya existe una oferta activa con este mismo enlace.
                    </span>
                  )}
                </div>

                {/* Featured toggle */}
                <label style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  cursor: "pointer", padding: "0.6rem 0",
                }}>
                  <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange}
                    style={{ accentColor: "var(--clr-orange)", width: "18px", height: "18px" }} />
                  <Star size={16} color="var(--clr-orange)" fill={formData.isFeatured ? "var(--clr-orange)" : "none"} style={{ transition: "all 0.2s" }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--clr-text)" }}>Marcar como destacada</span>
                </label>

                {/* Botones de acción (dinámicos para creación y edición) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <button 
                    type="submit" 
                    disabled={submitting || (!editingOfferId && (isTitleDuplicate || isUrlDuplicate))} 
                    style={{
                      background: submitting 
                        ? "var(--clr-dim)" 
                        : !editingOfferId && (isTitleDuplicate || isUrlDuplicate)
                          ? "rgba(255,255,255,0.05)"
                          : editingOfferId
                            ? "linear-gradient(135deg, var(--clr-purple), #8b5cf6)"
                            : "linear-gradient(135deg, var(--clr-orange), var(--clr-orange-lt))",
                      color: !editingOfferId && (isTitleDuplicate || isUrlDuplicate) ? "var(--clr-muted)" : "#fff",
                      border: !editingOfferId && (isTitleDuplicate || isUrlDuplicate) ? "1px solid var(--clr-border)" : "none",
                      borderRadius: "0.75rem",
                      padding: "0.9rem", 
                      fontWeight: 700, 
                      fontSize: "0.95rem",
                      cursor: submitting || (!editingOfferId && (isTitleDuplicate || isUrlDuplicate)) ? "not-allowed" : "pointer",
                      transition: "all 0.3s",
                      opacity: !editingOfferId && (isTitleDuplicate || isUrlDuplicate) ? 0.6 : 1,
                      boxShadow: submitting || (!editingOfferId && (isTitleDuplicate || isUrlDuplicate))
                        ? "none" 
                        : editingOfferId 
                          ? "0 4px 16px rgba(124,58,237,0.3)" 
                          : "0 4px 16px rgba(255,92,0,0.3)",
                    }}
                  >
                    {submitting 
                      ? "Procesando..." 
                      : !editingOfferId && (isTitleDuplicate || isUrlDuplicate)
                        ? "⚠️ Corregir duplicados"
                        : editingOfferId 
                          ? "✦ Guardar cambios" 
                          : "✦ Publicar oferta"}
                  </button>

                  {editingOfferId && (
                    <button type="button" onClick={handleCancelEdit} style={{
                      background: "rgba(255,255,255,0.03)",
                      color: "var(--clr-muted)",
                      border: "1px solid var(--clr-border)",
                      borderRadius: "0.75rem",
                      padding: "0.75rem",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      transition: "all 0.3s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--clr-muted)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    >
                      <X size={15} />
                      Cancelar edición
                    </button>
                  )}
                </div>
              </div>
            </form>

            {/* Offers list */}
            <div>
              {/* Header con Buscador e Interactividad de Filtros */}
              <div style={{
                background: "rgba(14, 19, 38, 0.4)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
                borderRadius: "1.25rem",
                padding: "1.25rem",
                marginBottom: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--clr-orange)", boxShadow: "0 0 8px var(--clr-orange)" }} />
                    <span style={{ color: "var(--clr-muted)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      Ofertas publicadas
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--clr-muted)", fontWeight: 600 }}>
                    {searchQuery || selectedCategoryFilter !== "Todas"
                      ? `Mostrando ${filteredOffers.length} de ${offers.length}`
                      : `${offers.length} ofertas en total`}
                  </span>
                </div>

                <div className="admin-filters-grid">
                  {/* Buscador inteligente */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar oferta por título..."
                      style={{ 
                        ...inputStyle, 
                        background: "rgba(0, 0, 0, 0.15)", 
                        border: "1px solid rgba(255,255,255,0.05)",
                        paddingLeft: "2.2rem" 
                      }}
                    />
                    <Search size={15} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--clr-muted)" }} />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => setSearchQuery("")}
                        style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--clr-muted)", cursor: "pointer" }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Selector rápido de categorías */}
                  <div style={{ position: "relative" }}>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      style={{ 
                        ...inputStyle, 
                        background: "rgba(0, 0, 0, 0.15)", 
                        border: "1px solid rgba(255,255,255,0.05)",
                        appearance: "none",
                        paddingRight: "1.8rem"
                      }}
                    >
                      <option value="Todas" style={{ background: "var(--clr-card)", color: "var(--clr-text)" }}>Todas</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c} style={{ background: "var(--clr-card)", color: "var(--clr-text)" }}>{c}</option>
                      ))}
                    </select>
                    <span style={{ position: "absolute", right: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--clr-muted)", pointerEvents: "none", fontSize: "0.55rem" }}>▼</span>
                  </div>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--clr-muted)" }}>Cargando ofertas...</div>
              ) : filteredOffers.length === 0 ? (
                <div style={{
                  textAlign: "center", padding: "4rem 2rem",
                  background: "rgba(14, 19, 38, 0.3)", border: "2px dashed var(--clr-border)",
                  borderRadius: "1.25rem", color: "var(--clr-muted)",
                }}>
                  <Package size={40} style={{ margin: "0 auto 1rem", opacity: 0.15 }} />
                  <p style={{ fontWeight: 600 }}>No se encontraron ofertas</p>
                  <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Intenta cambiar los términos de búsqueda o los filtros.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Lista paginada y filtrada con animación fade-in */}
                  <div key={`${currentPage}-${searchQuery}-${selectedCategoryFilter}`} className="fade-in-item" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {paginatedOffers.map(offer => (
                      <div 
                        key={offer.id} 
                        className={`admin-offer-card ${offer.isFeatured ? "featured" : ""}`}
                      >
                        {/* Contenedor superior para Thumbnail + Título/Categoría */}
                        <div className="admin-offer-header" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "1rem" }}>
                          {/* Thumbnail miniatura del producto */}
                          <div style={{
                            width: "56px", height: "56px", flexShrink: 0,
                            background: "#fff", borderRadius: "0.6rem", padding: "0.3rem",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                            position: "relative"
                          }}>
                            <img src={offer.imageUrl} alt={offer.title}
                              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
                            
                            {offer.isFeatured && (
                              <div style={{ position: "absolute", top: "-6px", left: "-6px", background: "var(--clr-bg)", borderRadius: "50%", padding: "2px", border: "1px solid rgba(255,92,0,0.3)" }}>
                                <Star size={12} color="var(--clr-orange)" fill="var(--clr-orange)" />
                              </div>
                            )}
                          </div>

                          {/* Info de la oferta */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className="admin-offer-title" style={{ fontWeight: 600, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff" }}>
                              {offer.title}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem" }}>
                              <select
                                value={offer.category}
                                onChange={(e) => updateOffer(offer.id, { category: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: "var(--clr-orange)",
                                  background: "rgba(255,92,0,0.06)",
                                  border: "1px solid rgba(255,92,0,0.15)",
                                  borderRadius: "4px",
                                  padding: "0.1rem 0.35rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.1em",
                                  cursor: "pointer",
                                  outline: "none",
                                  fontFamily: "inherit",
                                  transition: "all 0.2s",
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.borderColor = "var(--clr-orange)";
                                  e.currentTarget.style.background = "rgba(255,92,0,0.12)";
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = "rgba(255,92,0,0.15)";
                                  e.currentTarget.style.background = "rgba(255,92,0,0.06)";
                                }}
                              >
                                {CATEGORIES.map(c => (
                                  <option key={c} value={c} style={{ background: "var(--clr-card)", color: "var(--clr-text)" }}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              {offer.discount && (
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--clr-red)", background: "rgba(225,29,72,0.1)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>
                                  -{offer.discount}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Precios y Acciones */}
                        <div className="admin-offer-body" style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexShrink: 0 }}>
                          {/* Precios */}
                          <div className="admin-offer-prices" style={{ textAlign: "right" }}>
                            <p style={{ fontWeight: 800, fontFamily: "Sora, sans-serif", fontSize: "1.1rem", color: "#fff" }}>
                              ${offer.price.toLocaleString("es-MX")}
                            </p>
                            {offer.originalPrice && (
                              <p style={{ fontSize: "0.75rem", color: "var(--clr-muted)", textDecoration: "line-through" }}>
                                ${offer.originalPrice.toLocaleString("es-MX")}
                              </p>
                            )}
                          </div>

                          {/* Acciones interactivas (Editar y Eliminar) */}
                          <div className="admin-offer-actions" style={{ display: "flex", gap: "0.35rem" }}>
                            {/* Botón de Edición Rápida */}
                            <button
                              type="button"
                              onClick={() => handleEditClick(offer)}
                              style={{
                                width: "36px", height: "36px", borderRadius: "0.6rem",
                                background: "transparent", border: "1px solid transparent",
                                color: "var(--clr-muted)", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = "var(--clr-purple)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; e.currentTarget.style.background = "rgba(124,58,237,0.08)"; }}
                              onMouseLeave={e => { e.currentTarget.style.color = "var(--clr-muted)"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Botón de Eliminación */}
                            <button
                              type="button"
                              onClick={() => deleteOffer(offer.id)}
                              style={{
                                width: "36px", height: "36px", borderRadius: "0.6rem",
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
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginador interactivo con transiciones premium */}
                  {totalPages > 1 && (
                    <div style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: "0.4rem", 
                      marginTop: "1.5rem",
                      background: "rgba(14, 19, 38, 0.2)",
                      padding: "0.6rem",
                      borderRadius: "0.85rem",
                      border: "1px solid var(--clr-border)"
                    }}>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="pagination-btn"
                        style={{ width: "auto", padding: "0 0.8rem", gap: "0.2rem" }}
                      >
                        <ChevronLeft size={14} />
                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Ant</span>
                      </button>

                      {Array.from({ length: totalPages }).map((_, index) => {
                        const pageNum = index + 1;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`pagination-btn ${currentPage === pageNum ? "active" : ""}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="pagination-btn"
                        style={{ width: "auto", padding: "0 0.8rem", gap: "0.2rem" }}
                      >
                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Sig</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
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
  padding: "0.55rem 0.8rem", color: "var(--clr-text)", fontSize: "0.88rem",
  outline: "none", transition: "border-color 0.3s", fontFamily: "inherit",
};
