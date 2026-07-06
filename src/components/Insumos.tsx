import React, { useState } from "react";
import { Insumo } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { Plus, Trash2, Edit, Save, X, Search, Layers, ShoppingCart, HelpCircle } from "lucide-react";

interface InsumosProps {
  insumos: Insumo[];
  onInsumosChange: () => void;
}

export default function Insumos({ insumos, onInsumosChange }: InsumosProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [catalogError, setCatalogError] = useState("");

  // Form states (Add)
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("g"); // Default to grams
  const [totalCost, setTotalCost] = useState("");

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editTotalCost, setEditTotalCost] = useState("");

  // Units list
  const unitsList = ["g", "ml", "unidades", "kg", "litros", "metros"];

  // Filtered list
  const filteredInsumos = insumos.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity || !totalCost) {
      setErrorMsg("Completa todos los campos obligatorios.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await apiService.createInsumo({
        name: name.trim(),
        quantity: parseFloat(quantity),
        unit: unit,
        totalCost: parseFloat(totalCost),
      });

      setName("");
      setQuantity("");
      setTotalCost("");
      setSuccessMsg("¡Insumo registrado y cargado a caja con éxito!");
      onInsumosChange();

      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error al guardar el insumo.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (ins: Insumo) => {
    setEditingId(ins.id);
    setEditName(ins.name);
    setEditQuantity(ins.quantity.toString());
    setEditUnit(ins.unit);
    setEditTotalCost(ins.totalCost.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editName.trim() || !editQuantity || !editTotalCost) {
      setErrorMsg("Los campos no pueden estar vacíos.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await apiService.updateInsumo(id, {
        name: editName.trim(),
        quantity: parseFloat(editQuantity),
        unit: editUnit,
        totalCost: parseFloat(editTotalCost),
      });

      setEditingId(null);
      setSuccessMsg("Insumo actualizado correctamente.");
      onInsumosChange();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al actualizar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInsumo = async (id: number) => {
    setCatalogError("");
    try {
      await apiService.deleteInsumo(id);
      onInsumosChange();
    } catch (err: any) {
      console.error(err);
      setCatalogError(err.message || "No se puede eliminar el insumo. Verifique si está en alguna receta activa.");
    }
  };

  // Dynamically calculate unit cost for placeholder preview
  const qVal = parseFloat(quantity);
  const cVal = parseFloat(totalCost);
  const calculatedUnitCostPreview = qVal > 0 && cVal >= 0 ? cVal / qVal : 0;

  return (
    <div id="insumos-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Col 1: Add New Ingredient Card */}
      <div className="lg:col-span-1">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm sticky top-4">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-600" />
            Cargar Compra de Insumo
          </h2>

          <form onSubmit={handleAddInsumo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre de la Materia Prima *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Harina de Trigo 0000"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Cantidad Física *</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="Ej. 1000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unidad Medida</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
                >
                  {unitsList.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Costo Total Compra ($) *</label>
              <input
                type="number"
                step="any"
                value={totalCost}
                onChange={e => setTotalCost(e.target.value)}
                placeholder="Ej. 12"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            {/* Dynamic cost preview on form */}
            {qVal > 0 && cVal >= 0 && (
              <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl flex items-start gap-2 text-indigo-800">
                <HelpCircle className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider">Cálculo de Costo Unitario:</p>
                  <p className="text-xs font-medium mt-0.5 font-mono">
                    Cuesta <b>${calculatedUnitCostPreview.toFixed(4)}</b> por cada 1 {unit}.
                  </p>
                </div>
              </div>
            )}

            {errorMsg && <div className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}
            {successMsg && <div className="text-xs text-emerald-500 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
            >
              Cargar y Registrar en Caja
            </button>
          </form>
        </div>
      </div>

      {/* Col 2-3: Ingredients Despensa Listing */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Search header bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar materia prima / insumo..."
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

        {/* Desktop grid / table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredInsumos.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No hay insumos registrados.</p>
              <p className="text-xs mt-1">Utiliza el formulario de la izquierda para registrar compras iniciales de tu despensa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Insumo</th>
                    <th className="px-5 py-3">Stock Físico</th>
                    <th className="px-5 py-3">Costo Lote</th>
                    <th className="px-5 py-3">Costo Unitario</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInsumos.map(ins => {
                    const isEditing = editingId === ins.id;

                    return (
                      <tr key={ins.id} className="hover:bg-slate-50/40 transition-colors">
                        {/* Name column */}
                        <td className="px-5 py-4 font-medium text-slate-800">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{ins.name}</span>
                              {ins.quantity < 1500 && (
                                <span className="bg-amber-50 text-amber-700 font-bold text-[8px] px-1.5 py-0.5 rounded border border-amber-200">
                                  Bajo
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Stock Quantity Column */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={editQuantity}
                                onChange={e => setEditQuantity(e.target.value)}
                                className="w-20 px-2 py-1 text-sm border rounded focus:outline-none bg-white font-mono"
                              />
                              <select
                                value={editUnit}
                                onChange={e => setEditUnit(e.target.value)}
                                className="px-1 py-1 text-xs border rounded bg-white"
                              >
                                {unitsList.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-slate-700">
                              {ins.quantity.toLocaleString()} <span className="text-slate-400 font-medium">{ins.unit}</span>
                            </span>
                          )}
                        </td>

                        {/* Cost of last purchase */}
                        <td className="px-5 py-4 font-mono text-slate-700">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editTotalCost}
                              onChange={e => setEditTotalCost(e.target.value)}
                              className="w-20 px-2 py-1 text-sm border rounded focus:outline-none bg-white font-mono"
                            />
                          ) : (
                            `$${ins.totalCost.toFixed(2)}`
                          )}
                        </td>

                        {/* Cost Per Unit */}
                        <td className="px-5 py-4 font-mono text-slate-600 text-xs">
                          ${ins.unitCost.toFixed(4)} <span className="text-slate-400 font-sans">/ {ins.unit}</span>
                        </td>

                        {/* Actions column */}
                        <td className="px-5 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleSaveEdit(ins.id)}
                                disabled={loading}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/50 cursor-pointer"
                                title="Guardar"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 rounded bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200/50 cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEdit(ins)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              
                              {deletingId === ins.id ? (
                                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-lg animate-in fade-in zoom-in duration-200">
                                  <span className="text-[10px] font-bold text-rose-700 px-1">¿Eliminar?</span>
                                  <button
                                    onClick={() => {
                                      handleDeleteInsumo(ins.id);
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
                                  onClick={() => setDeletingId(ins.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
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
