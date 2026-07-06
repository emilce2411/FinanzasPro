import React, { useState } from "react";
import { Product } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { Plus, Trash2, Search, Sliders, ShoppingBag, ArrowUpRight, TrendingUp } from "lucide-react";

interface ProductosCatalogProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onProductsChange: () => void;
}

export default function ProductosCatalog({ products, setProducts, onProductsChange }: ProductosCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [catalogError, setCatalogError] = useState("");

  // Manual Product Form States
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [price, setPrice] = useState("");
  const [priceWholesale, setPriceWholesale] = useState("");
  const [pricePromo, setPricePromo] = useState("");
  const [promoQty, setPromoQty] = useState("");
  const [cost, setCost] = useState("");

  // Filter products list
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProductManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !stock || !price || !cost) {
      setErrorMsg("Completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await apiService.createProduct({
        name: name.trim(),
        stock: parseInt(stock),
        price: parseFloat(price),
        priceWholesale: priceWholesale ? parseFloat(priceWholesale) : null,
        pricePromo: pricePromo ? parseFloat(pricePromo) : null,
        promoQty: promoQty ? parseInt(promoQty) : null,
        cost: parseFloat(cost),
      });

      setName("");
      setStock("");
      setPrice("");
      setPriceWholesale("");
      setPricePromo("");
      setPromoQty("");
      setCost("");
      setSuccessMsg("¡Producto manual cargado al catálogo!");
      onProductsChange();
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo registrar el producto.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (id: number, delta: number) => {
    // 1. Optimistic update (instantaneous UI response)
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, stock: p.stock + delta } : p))
    );

    try {
      // 2. Perform background database update
      await apiService.updateProductStockDelta(id, delta);
      // 3. Silently sync other components/data
      onProductsChange();
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo ajustar el stock.");
      // Rollback on failure
      setProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, stock: p.stock - delta } : p))
      );
    }
  };

  const handleDeleteProduct = async (id: number) => {
    setCatalogError("");
    try {
      await apiService.deleteProduct(id);
      onProductsChange();
    } catch (err) {
      console.error(err);
      setCatalogError("Error al eliminar el producto de la base de datos.");
    }
  };

  return (
    <div id="catalog-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Col 1: Add Manual Resale Product */}
      <div className="lg:col-span-1">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm sticky top-4">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Cargar Producto Directo (Reventa)
          </h2>

          <form onSubmit={handleCreateProductManual} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre Comercial *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Gaseosa Cola 500ml"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Stock Inicial *</label>
                <input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="Ej. 10"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Costo Unit *</label>
                <input
                  type="number"
                  step="any"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  placeholder="Ej. 1.20"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">P. Público *</label>
                <input
                  type="number"
                  step="any"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="Ej. 2.50"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">P. Mayorista</label>
                <input
                  type="number"
                  step="any"
                  value={priceWholesale}
                  onChange={e => setPriceWholesale(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">P. Promos</label>
                <input
                  type="number"
                  step="any"
                  value={pricePromo}
                  onChange={e => setPricePromo(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cant. Promo</label>
                <input
                  type="number"
                  value={promoQty}
                  onChange={e => setPromoQty(e.target.value)}
                  placeholder="Ej. 3 u."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            {errorMsg && <div className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}
            {successMsg && <div className="text-xs text-emerald-500 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Cargar Producto
            </button>
          </form>
        </div>
      </div>

      {/* Col 2-3: Catalog interactive table */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Search header bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar productos finales de venta..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
          </div>
        </div>

        {catalogError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
            <span>{catalogError}</span>
            <button onClick={() => setCatalogError("")} className="text-rose-400 hover:text-rose-600 font-bold cursor-pointer">✕</button>
          </div>
        )}

        {/* Catalog Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Catálogo vacío.</p>
              <p className="text-xs mt-1">Crea fórmulas en el taller de fabricación o registra productos de reventa manuales para comenzar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Producto</th>
                    <th className="px-5 py-3">Procedencia</th>
                    <th className="px-5 py-3">Stock</th>
                    <th className="px-5 py-3 text-slate-500">Costo Unit.</th>
                    <th className="px-5 py-3 text-indigo-600">Lista de Precios</th>
                    <th className="px-5 py-3 text-emerald-600">Ganancia Unit. (Púb)</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(prod => {
                    const profit = prod.price - prod.cost;
                    const marginPercent = prod.cost > 0 ? (profit / prod.cost) * 100 : 0;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-900">
                          <div className="font-bold text-slate-800">{prod.name}</div>
                        </td>

                        <td className="px-5 py-4 text-xs">
                          {prod.recipeId ? (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200/50 px-2 py-0.5 rounded-full font-semibold">
                              🛠️ Receta Taller
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200/50 px-2 py-0.5 rounded-full font-semibold">
                              📦 Compra Reventa
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`font-mono font-bold ${prod.stock < 0 ? "text-rose-600" : prod.stock === 0 ? "text-slate-400" : "text-slate-700"}`}>
                            {prod.stock} u.
                          </span>
                          {prod.stock < 0 && (
                            <div className="text-[8px] text-rose-500 font-bold tracking-wider uppercase mt-0.5 animate-pulse">Negativo transitorio</div>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500">
                          ${prod.cost.toFixed(2)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-mono font-bold text-indigo-600" title="Precio al público">
                              Púb: ${prod.price.toFixed(2)}
                            </span>
                            <span className="font-mono text-slate-500 text-[11px]" title="Precio por mayorista">
                              May: {prod.priceWholesale ? `$${Number(prod.priceWholesale).toFixed(2)}` : <span className="text-slate-400 italic">--</span>}
                            </span>
                            <span className="font-mono text-amber-600 text-[11px]" title="Precio promocional">
                              Promo: {prod.pricePromo ? (
                                <>
                                  ${Number(prod.pricePromo).toFixed(2)}
                                  {prod.promoQty && prod.promoQty > 1 ? <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200 ml-1">x{prod.promoQty}u</span> : ""}
                                </>
                              ) : <span className="text-slate-400 italic">--</span>}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-600 font-mono">+${profit.toFixed(2)}</span>
                            <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-max mt-0.5">
                              {marginPercent.toFixed(0)}%
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Stock speed adjust buttons */}
                            <div className="flex bg-slate-50 border border-slate-200 rounded-lg">
                              <button
                                onClick={() => handleAdjustStock(prod.id, -1)}
                                className="px-2 py-1 text-slate-600 hover:text-rose-600 font-bold hover:bg-slate-100/50 rounded-l-lg border-r border-slate-200"
                                title="Restar 1 unidad"
                              >
                                -1
                              </button>
                              <button
                                onClick={() => handleAdjustStock(prod.id, 1)}
                                className="px-2 py-1 text-slate-600 hover:text-emerald-600 font-bold hover:bg-slate-100/50 rounded-r-lg"
                                title="Sumar 1 unidad"
                              >
                                +1
                              </button>
                            </div>

                            {/* Delete product with custom inline confirm */}
                            {deletingId === prod.id ? (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-in fade-in zoom-in duration-200">
                                <span className="text-[10px] font-bold text-rose-700 px-1">¿Eliminar?</span>
                                <button
                                  onClick={() => {
                                    handleDeleteProduct(prod.id);
                                    setDeletingId(null);
                                  }}
                                  className="px-2 py-0.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded cursor-pointer"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(prod.id)}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Eliminar Producto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
