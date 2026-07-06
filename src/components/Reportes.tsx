import { useState } from "react";
import { Transaction } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { Trash2, ShieldAlert, Sparkles, Filter, FileText, ArrowUpRight, ArrowDownRight, RefreshCw, Layers, Coins, Package, TrendingUp } from "lucide-react";

interface ReportesProps {
  transactions: Transaction[];
  onResetComplete: () => void;
}

export default function Reportes({ transactions, onResetComplete }: ReportesProps) {
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [wipeMode, setWipeMode] = useState<"clear" | "reset">("clear");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Calculations
  let totalSales = 0;
  let totalPurchases = 0;
  let totalExpenses = 0;

  transactions.forEach(tx => {
    if (tx.type === "sale") {
      totalSales += Math.abs(tx.amount);
    } else if (tx.type === "purchase") {
      totalPurchases += Math.abs(tx.amount);
    } else if (tx.type === "expense") {
      totalExpenses += Math.abs(tx.amount);
    }
  });

  const totalInflow = totalSales;
  const totalOutflow = totalPurchases + totalExpenses;
  const netProfit = totalSales - totalPurchases - totalExpenses;
  const insumosFund = totalSales - totalPurchases;
  const marginPercent = totalOutflow > 0 ? (netProfit / totalOutflow) * 100 : 0;

  // Filter transactions
  const filteredTxs = transactions.filter(tx => {
    if (filterType === "all") return true;
    if (filterType === "sales") return tx.type === "sale";
    if (filterType === "purchases") return tx.type === "purchase";
    if (filterType === "expenses") return tx.type === "expense";
    return true;
  });

  const handleWipeDatabase = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setShowConfirmWipe(false);

    try {
      await apiService.resetDatabase(wipeMode);
      if (wipeMode === "clear") {
        setSuccessMsg("¡Base de datos vaciada por completo! Listo para ingresar tus propios datos.");
      } else {
        setSuccessMsg("¡Base de datos restablecida con datos de ejemplo correctamente!");
      }
      onResetComplete();

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Fallo al procesar base de datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="reportes-section" className="space-y-6 font-sans">
      
      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1: Todo el dinero que entra */}
        <div id="metric-dinero-entra" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dinero que Entra</span>
            <span className="text-xs text-emerald-600 font-bold">Ingresos Totales (Ventas)</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <h3 className="text-2xl font-black text-slate-900">
              ${totalInflow.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Suma acumulada de todas las ventas cobradas.</p>
        </div>

        {/* Metric 2: Ganancia */}
        <div id="metric-ganancia" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ganancia Neta</span>
            <span className="text-xs text-indigo-600 font-bold">Utilidad Real</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <h3 className={`text-2xl font-black ${netProfit >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              ${netProfit.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </h3>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${netProfit >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-rose-50 text-rose-600"}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Suma de ventas menos compras de insumos y costos operativos.</p>
        </div>

        {/* Metric 3: Fondo de Insumos */}
        <div id="metric-fondo-insumos" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dinero para Insumos</span>
            <span className="text-xs text-amber-600 font-bold">Fondo de Reposición</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <h3 className={`text-2xl font-black ${insumosFund >= 0 ? "text-slate-900" : "text-rose-600"}`}>
              ${insumosFund.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </h3>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${insumosFund >= 0 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2 leading-tight">
            Disminuye al comprar insumos, aumenta al vender. Para saber cuánto tienes para reponer.
          </p>
        </div>

      </div>

      {/* Historical Ledger & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Libro de Caja y Ledger Diario
            </h2>
            <p className="text-[10px] text-slate-400">Listado cronológico de compras de insumos, gastos operativos y cobro de ventas.</p>
          </div>

          {/* Filters controls */}
          <div className="flex items-center bg-slate-50 border border-slate-150 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setFilterType("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filterType === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType("sales")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filterType === "sales" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Ventas
            </button>
            <button
              onClick={() => setFilterType("purchases")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filterType === "purchases" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              Compras
            </button>
          </div>
        </div>

        {/* Ledger logs List */}
        {filteredTxs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">No hay movimientos registrados para este filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[350px] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs text-slate-600 font-mono">
                <thead className="bg-slate-50 font-sans text-[10px] text-slate-400 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5">Fecha</th>
                    <th className="px-4 py-2.5">Categoría</th>
                    <th className="px-4 py-2.5">Descripción de Operación</th>
                    <th className="px-4 py-2.5 text-right">Monto ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTxs.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-2 uppercase font-bold text-[9px] font-sans">
                        {tx.type === "sale" && <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Cobro Venta</span>}
                        {tx.type === "purchase" && <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Inversión Insumos</span>}
                        {tx.type === "expense" && <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Gasto Operativo</span>}
                        {tx.type === "adjustment" && <span className="text-slate-600 bg-slate-50 px-2 py-0.5 rounded">Ajuste</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-700 font-sans">{tx.description}</td>
                      <td className={`px-4 py-2 text-right font-bold ${tx.type === "sale" ? "text-emerald-600" : "text-rose-500"}`}>
                        {tx.type === "sale" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Advanced Maintenance panel */}
      <div className="bg-rose-50/30 border border-rose-100 p-5 rounded-2xl space-y-4">
        <div>
          <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Panel de Mantenimiento y Limpieza
          </h3>
          <p className="text-[10px] text-rose-700 mt-1 leading-relaxed">
            Si deseas limpiar de forma segura registros de prueba para comenzar a auditar tus números de producción reales con un catálogo vacío, o si quieres restablecer los datos demostrativos iniciales (Alfajor, Dulce de Leche, etc.), puedes gatillar estas acciones a continuación.
          </p>
        </div>

        {/* Feedback alerts */}
        {successMsg && <div className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}
        {errorMsg && <div className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setWipeMode("clear");
              setShowConfirmWipe(true);
            }}
            disabled={loading}
            className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Borrar Todo (Comenzar Vacío)
          </button>

          <button
            onClick={() => {
              setWipeMode("reset");
              setShowConfirmWipe(true);
            }}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restablecer con Datos de Ejemplo
          </button>
        </div>
      </div>

      {/* Database Wipe Overlay Modal */}
      {showConfirmWipe && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-md w-full font-sans animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              {wipeMode === "clear" ? "¿Eliminar absolutamente todos los datos?" : "¿Restablecer con datos de demostración?"}
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Esta acción eliminará de forma irreversible todos tus clientes, transacciones de caja, catálogo de productos, recetas e insumos cargados en tu cuenta.
            </p>
            {wipeMode === "clear" ? (
              <p className="text-xs text-rose-600 mt-2 font-semibold">
                ⚠️ Comenzarás con una cuenta completamente limpia y vacía, sin productos de ejemplo ni parámetros de referencia.
              </p>
            ) : (
              <p className="text-xs text-indigo-600 mt-2 font-semibold">
                ℹ️ Posteriormente a la limpieza, se cargarán de forma segura los valores de demostración iniciales (Dulce de Leche, Alfajor de Maicena, Harina, etc.).
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmWipe(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                No, Cancelar
              </button>
              <button
                onClick={handleWipeDatabase}
                disabled={loading}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
              >
                {wipeMode === "clear" ? "Sí, Borrar Todo" : "Sí, Cargar Demo"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
