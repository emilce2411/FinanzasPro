import { useState } from "react";
import { Insumo, Product, Transaction } from "../types.ts";
import { apiService } from "../lib/api.ts";
import {
  TrendingUp,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  ArrowRightLeft,
  DollarSign,
  Layers,
  Wrench,
  Send,
  HelpCircle,
  Clock,
  Briefcase,
  Package,
  Coins,
  Edit2,
  Check,
  X
} from "lucide-react";

interface DashboardProps {
  insumos: Insumo[];
  products: Product[];
  transactions: Transaction[];
  onTabChange: (tab: string) => void;
  bizName: string;
}

export default function Dashboard({ insumos, products, transactions, onTabChange, bizName }: DashboardProps) {
  // AI State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Overrides for manual editing of metrics
  const [overrideGanancia, setOverrideGanancia] = useState<number | null>(() => {
    const v = localStorage.getItem("finanzaspro_override_ganancia");
    return v ? parseFloat(v) : null;
  });
  const [overrideCostos, setOverrideCostos] = useState<number | null>(() => {
    const v = localStorage.getItem("finanzaspro_override_costos");
    return v ? parseFloat(v) : null;
  });
  const [overrideCaja, setOverrideCaja] = useState<number | null>(() => {
    const v = localStorage.getItem("finanzaspro_override_caja");
    return v ? parseFloat(v) : null;
  });
  const [overrideVentas, setOverrideVentas] = useState<number | null>(() => {
    const v = localStorage.getItem("finanzaspro_override_ventas");
    return v ? parseFloat(v) : null;
  });
  const [overrideFondo, setOverrideFondo] = useState<number | null>(() => {
    const v = localStorage.getItem("finanzaspro_override_fondo");
    return v ? parseFloat(v) : null;
  });

  const [isEditingGanancia, setIsEditingGanancia] = useState(false);
  const [isEditingCostos, setIsEditingCostos] = useState(false);
  const [isEditingCaja, setIsEditingCaja] = useState(false);
  const [isEditingVentas, setIsEditingVentas] = useState(false);
  const [isEditingFondo, setIsEditingFondo] = useState(false);

  const [tempGanancia, setTempGanancia] = useState("");
  const [tempCostos, setTempCostos] = useState("");
  const [tempCaja, setTempCaja] = useState("");
  const [tempVentas, setTempVentas] = useState("");
  const [tempFondo, setTempFondo] = useState("");

  // Financial calculations
  let totalSales = 0;
  let totalPurchases = 0;
  let totalExpenses = 0;
  let totalCostFromSales = 0;
  let totalProfitFromSales = 0;

  transactions.forEach((tx) => {
    if (tx.type === "sale") {
      totalSales += Math.abs(tx.amount);
      const match = tx.description.match(/\|\s*Costo:\s*\$?([\d.]+)\s*\|\s*Ganancia:\s*\$?([\d.]+)/i);
      if (match) {
        totalCostFromSales += parseFloat(match[1]);
        totalProfitFromSales += parseFloat(match[2]);
      } else {
        const estimatedCost = tx.amount / 2.5;
        totalCostFromSales += estimatedCost;
        totalProfitFromSales += (tx.amount - estimatedCost);
      }
    } else if (tx.type === "purchase") {
      totalPurchases += Math.abs(tx.amount);
    } else if (tx.type === "expense") {
      totalExpenses += Math.abs(tx.amount);
    }
  });

  const netCaja = totalSales - totalPurchases;
  const gananciaNeta = totalProfitFromSales;
  const fondoInsumos = totalCostFromSales - totalPurchases;

  const displaySales = overrideVentas !== null ? overrideVentas : totalSales;
  const displayGanancia = overrideGanancia !== null ? overrideGanancia : gananciaNeta;
  const displayCostos = overrideCostos !== null ? overrideCostos : totalPurchases;
  const displayFondo = overrideFondo !== null ? overrideFondo : fondoInsumos;
  const displayCaja = overrideCaja !== null ? overrideCaja : netCaja;

  // Alerts: items with stock under 1500g/ml or units
  const lowStockInsumos = insumos.filter((i) => i.quantity < 1500);

  // Quick preset questions for AI Advisor
  const presetPrompts = [
    "¿Qué insumos tienen el stock más crítico y cuándo debo reponerlos?",
    "¿Cuáles de mis productos tienen el mejor margen y cómo puedo maximizar ventas?",
    "Dame un diagnóstico de mi caja neta libre actual y cómo reducir costos operativos.",
    "Sugiéreme un precio óptimo para mis alfajores si la harina sube un 20%."
  ];

  const handleAskAi = async (promptText: string) => {
    if (!promptText.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const response = await apiService.askAiAdvisor(promptText);
      setAiResponse(response);
    } catch (err: any) {
      console.error(err);
      setAiResponse("Lo siento, no pude contactar al asesor inteligente. Revisa tu conexión.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div id="dashboard-section" className="space-y-8 font-sans">
      
      {/* Welcome & Fast Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 p-6 rounded-2xl border border-slate-800 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/35 font-bold uppercase tracking-wider">Taller Activo</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> UTC {new Date().toISOString().slice(0, 10)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-2 font-display">¡Hola, {bizName || "Emprendedor"}!</h1>
          <p className="text-xs text-slate-300 mt-1">Este es tu centro de operaciones para controlar producción, insumos y utilidades netas.</p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onTabChange("ventas")}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Registrar Venta (🟢)
          </button>
          <button
            onClick={() => onTabChange("insumos")}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-750 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            Comprar Insumos (🔴)
          </button>
          <button
            onClick={() => onTabChange("fabricacion")}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-450 active:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            Fabricar Tanda (🛠️)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Ventas Totales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 min-h-[100px]">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ventas Totales</p>
            {isEditingVentas ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={tempVentas}
                  onChange={(e) => setTempVentas(e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-200 text-xs font-bold rounded px-1.5 py-0.5 text-slate-800 focus:outline-hidden focus:border-emerald-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const val = parseFloat(tempVentas);
                    if (!isNaN(val)) {
                      localStorage.setItem("finanzaspro_override_ventas", val.toString());
                      setOverrideVentas(val);
                    } else {
                      localStorage.removeItem("finanzaspro_override_ventas");
                      setOverrideVentas(null);
                    }
                    setIsEditingVentas(false);
                  }}
                  className="p-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingVentas(false)}
                  className="p-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5 group">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  ${displaySales.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </h3>
                <button
                  onClick={() => {
                    setTempVentas(overrideVentas !== null ? overrideVentas.toString() : totalSales.toFixed(2));
                    setIsEditingVentas(true);
                  }}
                  className="p-0.5 text-slate-300 hover:text-emerald-600 rounded transition-colors cursor-pointer shrink-0"
                  title="Editar a mano"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {overrideVentas !== null && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("finanzaspro_override_ventas");
                      setOverrideVentas(null);
                    }}
                    className="text-[8px] text-emerald-600 hover:underline font-bold"
                  >
                    Auto
                  </button>
                )}
              </div>
            )}
            <p className="text-[9px] text-emerald-600 font-semibold mt-1">🟢 Total Cobrado</p>
          </div>
        </div>

        {/* KPI 2: Ganancia de Ventas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 min-h-[100px]">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ganancia Neta</p>
            {isEditingGanancia ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={tempGanancia}
                  onChange={(e) => setTempGanancia(e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-200 text-xs font-bold rounded px-1.5 py-0.5 text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const val = parseFloat(tempGanancia);
                    if (!isNaN(val)) {
                      localStorage.setItem("finanzaspro_override_ganancia", val.toString());
                      setOverrideGanancia(val);
                    } else {
                      localStorage.removeItem("finanzaspro_override_ganancia");
                      setOverrideGanancia(null);
                    }
                    setIsEditingGanancia(false);
                  }}
                  className="p-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingGanancia(false)}
                  className="p-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5 group">
                <h3 className={`text-base font-bold truncate ${displayGanancia >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                  ${displayGanancia.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </h3>
                <button
                  onClick={() => {
                    setTempGanancia(overrideGanancia !== null ? overrideGanancia.toString() : gananciaNeta.toFixed(2));
                    setIsEditingGanancia(true);
                  }}
                  className="p-0.5 text-slate-300 hover:text-indigo-600 rounded transition-colors cursor-pointer shrink-0"
                  title="Editar a mano"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {overrideGanancia !== null && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("finanzaspro_override_ganancia");
                      setOverrideGanancia(null);
                    }}
                    className="text-[8px] text-indigo-600 hover:underline font-bold"
                  >
                    Auto
                  </button>
                )}
              </div>
            )}
            <p className="text-[9px] text-indigo-600 font-semibold mt-1">⭐ Utilidad de Margen</p>
          </div>
        </div>

        {/* KPI 3: Inversión Insumos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 min-h-[100px]">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Inversión Insumos</p>
            {isEditingCostos ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={tempCostos}
                  onChange={(e) => setTempCostos(e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-200 text-xs font-bold rounded px-1.5 py-0.5 text-slate-800 focus:outline-hidden focus:border-rose-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const val = parseFloat(tempCostos);
                    if (!isNaN(val)) {
                      localStorage.setItem("finanzaspro_override_costos", val.toString());
                      setOverrideCostos(val);
                    } else {
                      localStorage.removeItem("finanzaspro_override_costos");
                      setOverrideCostos(null);
                    }
                    setIsEditingCostos(false);
                  }}
                  className="p-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingCostos(false)}
                  className="p-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5 group">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  ${displayCostos.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </h3>
                <button
                  onClick={() => {
                    setTempCostos(overrideCostos !== null ? overrideCostos.toString() : totalPurchases.toFixed(2));
                    setIsEditingCostos(true);
                  }}
                  className="p-0.5 text-slate-300 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                  title="Editar a mano"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {overrideCostos !== null && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("finanzaspro_override_costos");
                      setOverrideCostos(null);
                    }}
                    className="text-[8px] text-rose-600 hover:underline font-bold"
                  >
                    Auto
                  </button>
                )}
              </div>
            )}
            <p className="text-[9px] text-rose-500 font-semibold mt-1">🔴 Compras Registradas</p>
          </div>
        </div>

        {/* KPI 4: Fondo para Insumos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 min-h-[100px]">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Fondo Insumos</p>
            {isEditingFondo ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={tempFondo}
                  onChange={(e) => setTempFondo(e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-200 text-xs font-bold rounded px-1.5 py-0.5 text-slate-800 focus:outline-hidden focus:border-amber-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const val = parseFloat(tempFondo);
                    if (!isNaN(val)) {
                      localStorage.setItem("finanzaspro_override_fondo", val.toString());
                      setOverrideFondo(val);
                    } else {
                      localStorage.removeItem("finanzaspro_override_fondo");
                      setOverrideFondo(null);
                    }
                    setIsEditingFondo(false);
                  }}
                  className="p-0.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingFondo(false)}
                  className="p-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5 group">
                <h3 className={`text-base font-bold truncate ${displayFondo >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                  ${displayFondo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </h3>
                <button
                  onClick={() => {
                    setTempFondo(overrideFondo !== null ? overrideFondo.toString() : fondoInsumos.toFixed(2));
                    setIsEditingFondo(true);
                  }}
                  className="p-0.5 text-slate-300 hover:text-amber-600 rounded transition-colors cursor-pointer shrink-0"
                  title="Editar a mano"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {overrideFondo !== null && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("finanzaspro_override_fondo");
                      setOverrideFondo(null);
                    }}
                    className="text-[8px] text-amber-600 hover:underline font-bold"
                  >
                    Auto
                  </button>
                )}
              </div>
            )}
            <p className="text-[9px] text-amber-600 font-semibold mt-1">📦 Reposición de Stock</p>
          </div>
        </div>

        {/* KPI 5: Caja Neta Libre */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 min-h-[100px]">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Caja Libre</p>
            {isEditingCaja ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={tempCaja}
                  onChange={(e) => setTempCaja(e.target.value)}
                  className="w-20 bg-slate-50 border border-slate-200 text-xs font-bold rounded px-1.5 py-0.5 text-slate-850 focus:outline-hidden focus:border-slate-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const val = parseFloat(tempCaja);
                    if (!isNaN(val)) {
                      localStorage.setItem("finanzaspro_override_caja", val.toString());
                      setOverrideCaja(val);
                    } else {
                      localStorage.removeItem("finanzaspro_override_caja");
                      setOverrideCaja(null);
                    }
                    setIsEditingCaja(false);
                  }}
                  className="p-0.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsEditingCaja(false)}
                  className="p-0.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5 group">
                <h3 className={`text-base font-bold truncate ${displayCaja >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                  ${displayCaja.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </h3>
                <button
                  onClick={() => {
                    setTempCaja(overrideCaja !== null ? overrideCaja.toString() : netCaja.toFixed(2));
                    setIsEditingCaja(true);
                  }}
                  className="p-0.5 text-slate-300 hover:text-slate-600 rounded transition-colors cursor-pointer shrink-0"
                  title="Editar a mano"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                {overrideCaja !== null && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("finanzaspro_override_caja");
                      setOverrideCaja(null);
                    }}
                    className="text-[8px] text-slate-600 hover:underline font-bold"
                  >
                    Auto
                  </button>
                )}
              </div>
            )}
            <p className="text-[9px] font-semibold mt-1 text-slate-500">
              {displayCaja >= 0 ? "🟢 Balance Efectivo" : "⚠️ Saldo Negativo"}
            </p>
          </div>
        </div>
      </div>

      {/* Critical Stock Warning */}
      {lowStockInsumos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-amber-900">Alerta de Abastecimiento de Materias Primas</h4>
            <div className="mt-1 flex flex-wrap gap-2">
              {lowStockInsumos.map((i) => (
                <span key={i.id} className="inline-flex items-center gap-1 bg-white border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-amber-800">
                  ⚠️ {i.name}: {i.quantity.toLocaleString()}{i.unit}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-amber-700/85 mt-1.5">Sugerimos registrar una nueva compra de insumos desde el Taller para evitar detener la fabricación.</p>
          </div>
        </div>
      )}

      {/* Intelligent AI Advisor Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Advisor Section */}
        <div className="lg:col-span-2 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl border border-slate-800 p-6 flex flex-col shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">Asesor de Negocios Inteligente</h2>
              <p className="text-[10px] text-slate-400">Desarrollado con Gemini 3.5 y PostgreSQL para diagnóstico predictivo</p>
            </div>
          </div>

          {/* Preset Prompts Bubble Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
            {presetPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setAiPrompt(p);
                  handleAskAi(p);
                }}
                className="text-left bg-slate-900/60 hover:bg-slate-800/80 active:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 p-3 rounded-xl text-[10px] text-slate-300 hover:text-white transition-all cursor-pointer flex gap-1.5 items-start group"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 group-hover:text-emerald-400 transition-colors" />
                <span>{p}</span>
              </button>
            ))}
          </div>

          {/* AI Response Box */}
          <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 overflow-y-auto max-h-[220px] text-xs leading-relaxed text-slate-300 font-mono scrollbar-thin">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] text-indigo-400 tracking-wider uppercase animate-pulse">Analizando flujos, recetas y costos de inventario...</p>
              </div>
            ) : aiResponse ? (
              <div className="whitespace-pre-wrap select-all selection:bg-indigo-600">
                {aiResponse}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-[11px]">Haz una consulta arriba o redacta una pregunta sobre tus márgenes, balance o necesidades de taller.</p>
              </div>
            )}
          </div>

          {/* Chat Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskAi(aiPrompt);
            }}
            className="mt-4 flex items-center gap-2"
          >
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ej. ¿Cómo puedo optimizar la receta del Alfajor Premium?"
              className="flex-1 bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:border-indigo-500 placeholder-slate-500 font-mono"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-750 text-white rounded-xl transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Business Summary Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            Resumen de Activos
          </h2>

          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="p-3 bg-slate-50 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-medium">Insumos Registrados</span>
              <span className="text-xl font-bold text-slate-800 mt-2">{insumos.length}</span>
              <span className="text-[9px] text-slate-500 mt-1">Materias en despensa</span>
            </div>
            
            <div className="p-3 bg-slate-50 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-medium">Catálogo de Productos</span>
              <span className="text-xl font-bold text-slate-800 mt-2">{products.length}</span>
              <span className="text-[9px] text-slate-500 mt-1">Bienes listos de venta</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-medium">Movimientos de Caja</span>
              <span className="text-xl font-bold text-slate-800 mt-2">{transactions.length}</span>
              <span className="text-[9px] text-slate-500 mt-1">Transacciones históricas</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 font-medium">Stock Total de Venta</span>
              <span className="text-xl font-bold text-slate-850 mt-2">
                {products.reduce((acc, p) => acc + p.stock, 0)} u.
              </span>
              <span className="text-[9px] text-slate-500 mt-1">Unidades físicas listas</span>
            </div>
          </div>

          <div className="border-t pt-3.5 flex items-center justify-between text-xs text-slate-500">
            <span>Última Transacción:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[150px]">
              {transactions[0] ? transactions[0].description : "Ninguna registrada"}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
