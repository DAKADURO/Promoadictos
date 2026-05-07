"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Link as LinkIcon, Image as ImageIcon, DollarSign, Tag, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AdminPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    originalPrice: "",
    discount: "",
    imageUrl: "",
    affiliateUrl: "",
    category: "General"
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const res = await fetch("/api/offers");
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        setFormData({
          title: "",
          price: "",
          originalPrice: "",
          discount: "",
          imageUrl: "",
          affiliateUrl: "",
          category: "General"
        });
        fetchOffers();
      }
    } catch (err) {
      alert("Error al guardar la oferta");
    }
  };

  const deleteOffer = async (id) => {
    if (!confirm("¿Seguro que quieres borrar esta oferta?")) return;
    try {
      await fetch(`/api/offers?id=${id}`, { method: "DELETE" });
      fetchOffers();
    } catch (err) {
      alert("Error al borrar");
    }
  };

  return (
    <div className="container animate-fade">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">Panel de Control</h1>
          <p className="text-text-muted">Gestiona tus ofertas de Mercado Libre</p>
        </div>
        <button 
          onClick={() => signOut()}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl hover:bg-accent/10 hover:text-accent transition-all"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl space-y-4 sticky top-24">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="text-primary" size={20} />
              Nueva Oferta
            </h2>
            
            <div className="space-y-4">
              <input 
                name="title"
                placeholder="Título del producto"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full bg-background/50 border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input 
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="Precio"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full bg-background/50 border border-white/10 rounded-xl p-3 pl-8 focus:border-primary outline-none"
                    required
                  />
                </div>
                <input 
                  name="discount"
                  type="number"
                  placeholder="% Descuento"
                  value={formData.discount}
                  onChange={handleInputChange}
                  className="w-full bg-background/50 border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
                />
              </div>
              <input 
                name="originalPrice"
                type="number"
                step="0.01"
                placeholder="Precio Original (opcional)"
                value={formData.originalPrice}
                onChange={handleInputChange}
                className="w-full bg-background/50 border border-white/10 rounded-xl p-3 focus:border-primary outline-none"
              />
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  name="imageUrl"
                  placeholder="URL de la imagen"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  className="w-full bg-background/50 border border-white/10 rounded-xl p-3 pl-8 focus:border-primary outline-none"
                  required
                />
              </div>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <input 
                  name="affiliateUrl"
                  placeholder="Link de Afiliado"
                  value={formData.affiliateUrl}
                  onChange={handleInputChange}
                  className="w-full bg-background/50 border border-white/10 rounded-xl p-3 pl-8 focus:border-primary outline-none"
                  required
                />
              </div>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full bg-background/50 border border-white/10 rounded-xl p-3 pl-8 focus:border-primary outline-none appearance-none"
                >
                  <option value="General">General</option>
                  <option value="Tecnología">Tecnología</option>
                  <option value="Hogar">Hogar</option>
                  <option value="Moda">Moda</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center mt-4">
              Publicar Oferta
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-4 text-sm font-semibold text-text-muted">Producto</th>
                  <th className="p-4 text-sm font-semibold text-text-muted">Precio</th>
                  <th className="p-4 text-sm font-semibold text-text-muted">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan="3" className="p-10 text-center text-text-muted">Cargando ofertas...</td></tr>
                ) : offers.length === 0 ? (
                  <tr><td colSpan="3" className="p-10 text-center text-text-muted">No has subido ofertas aún.</td></tr>
                ) : (
                  offers.map(offer => (
                    <tr key={offer.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={offer.imageUrl} className="w-12 h-12 object-contain bg-white rounded-lg p-1" />
                          <div className="max-w-[200px]">
                            <p className="font-semibold truncate">{offer.title}</p>
                            <p className="text-xs text-text-muted">{offer.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-primary">
                        ${offer.price.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => deleteOffer(offer.id)}
                          className="text-text-muted hover:text-accent transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
