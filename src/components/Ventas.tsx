import { useState } from "react";
import { Product, Transaction } from "../types.ts";
import { apiService } from "../lib/api.ts";
import { Search, ShoppingCart, Trash2, Plus, Minus, Check, AlertTriangle, User, History, Calendar } from "lucide-react";

interface VentasProps {
  products: Product[];
  transactions: Transaction[];
  onSaleComplete: () => void;
}

interface CartItem {
  product: Product;
  qty: number;
  selectedPriceType?: "public" | "wholesale" | "promo";
}

export default function Ventas({ products, transactions, onSaleComplete }: VentasProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [cardPriceTypes, setCardPriceTypes] = useState<Record<number, "public" | "wholesale" | "promo">>({});

  // Negative Stock Modal States
  const [showNegativeModal, setShowNegativeModal] = useState(false);

  // Sales History States
  const [salesSearch, setSalesSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Parse descriptions like:
  // "Venta Caja: 2x Croissant, 1x Pan (Cliente: Juan) | Costo: 10.00 | Ganancia: 15.00"
  const parseSaleDescription = (desc: string) => {
    if (!desc) return { itemsList: "", client: "", cost: null, profit: null };
    const parts = desc.split(" | ");
    const mainPart = parts[0] || "";
    const costPart = parts.find(p => p.startsWith("Costo:"));
    const profitPart = parts.find(p => p.startsWith("Ganancia:"));

    let itemsAndClient = mainPart.replace(/^Venta Caja:\s*/i, "");
    
    let client = "";
    const clientMatch = itemsAndClient.match(/\(Cliente:\s*([^)]+)\)/i);
    if (clientMatch) {
      client = clientMatch[1];
      itemsAndClient = itemsAndClient.replace(/\(Cliente:\s*([^)]+)\)/i, "").trim();
    }

    const itemsList = itemsAndClient.replace(/,$/, "").trim();
    const cost = costPart ? costPart.replace("Costo:", "").trim() : null;
    const profit = profitPart ? profitPart.replace("Ganancia:", "").trim() : null;

    return {
      itemsList: itemsList || desc,
      client,
      cost,
      profit
    };
  };

  // Filter and sort sales transactions
  const salesTransactions = (transactions || [])
    .filter(tx => tx.type === "sale")
    .sort((a, b) => b.id - a.id);

  // Search filter for sales
  const filteredSales = salesTransactions.filter(tx => {
    if (!salesSearch) return true;
    const searchLower = salesSearch.toLowerCase();
    const { itemsList, client } = parseSaleDescription(tx.description);
    return (
      itemsList.toLowerCase().includes(searchLower) ||
      client.toLowerCase().includes(searchLower) ||
      tx.date.includes(searchLower) ||
      String(tx.amount).includes(searchLower)
    );
  });

  const handleDeleteSale = async (id: number) => {
    setDeleteLoading(true);
    try {
      await apiService.deleteTransaction(id);
      onSaleComplete();
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting sale transaction:", err);
      setErrorMsg("No se pudo anular la venta de la base de datos.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtered Products List
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (product: Product, priceType: "public" | "wholesale" | "promo" = "public") => {
    setErrorMsg("");
    const initialQty = (priceType === "promo" && product.promoQty && product.promoQty > 1) ? product.promoQty : 1;
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item => {
          if (item.product.id === product.id) {
            let nextQty = item.qty + 1;
            // If the user selected "promo" but the current quantity in cart is lower than the required promo quantity,
            // we can bring it up to the required promo quantity.
            if (priceType === "promo" && product.promoQty && product.promoQty > 1 && item.qty < product.promoQty) {
              nextQty = product.promoQty;
            }
            return { ...item, qty: nextQty, selectedPriceType: priceType };
          }
          return item;
        });
      } else {
        return [...prevCart, { product, qty: initialQty, selectedPriceType: priceType }];
      }
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const handleSetPriceType = (productId: number, type: "public" | "wholesale" | "promo") => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id === productId) {
          let nextQty = item.qty;
          // If switching to promo, make sure quantity matches at least the promoQty
          if (type === "promo" && item.product.promoQty && item.product.promoQty > 1 && item.qty < item.product.promoQty) {
            nextQty = item.product.promoQty;
          }
          return { ...item, selectedPriceType: type, qty: nextQty };
        }
        return item;
      })
    );
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id === productId) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : item;
        }
        return item;
      })
    );
  };

  const getCartItemSubtotal = (item: { product: Product; qty: number; selectedPriceType?: "public" | "wholesale" | "promo" }) => {
    const { product, qty, selectedPriceType } = item;
    const normalPrice = product.price;

    if (selectedPriceType === "wholesale" && product.priceWholesale !== null && product.priceWholesale !== undefined) {
      return {
        unitPrice: Number(product.priceWholesale),
        subtotal: Number(product.priceWholesale) * qty,
        isPromoApplied: false,
      };
    }

    if (selectedPriceType === "promo" && product.pricePromo !== null && product.pricePromo !== undefined) {
      const pQty = product.promoQty || 1;
      if (pQty > 1) {
        if (qty >= pQty) {
          const numPromos = Math.floor(qty / pQty);
          const leftovers = qty % pQty;
          const total = (numPromos * Number(product.pricePromo)) + (leftovers * normalPrice);
          return {
            unitPrice: total / qty,
            subtotal: total,
            isPromoApplied: true,
          };
        } else {
          return {
            unitPrice: normalPrice,
            subtotal: normalPrice * qty,
            isPromoApplied: false,
          };
        }
      } else {
        return {
          unitPrice: Number(product.pricePromo),
          subtotal: Number(product.pricePromo) * qty,
          isPromoApplied: true,
        };
      }
    }

    return {
      unitPrice: normalPrice,
      subtotal: normalPrice * qty,
      isPromoApplied: false,
    };
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + getCartItemSubtotal(item).subtotal, 0);
  };

  const checkHasNegativeStock = () => {
    return cart.some(item => item.qty > item.product.stock);
  };

  const handleCheckoutTrigger = () => {
    if (cart.length === 0) return;
    setErrorMsg("");
    
    // Check if any cart item exceeds physical ready stock
    if (checkHasNegativeStock()) {
      setShowNegativeModal(true);
    } else {
      executeCheckout();
    }
  };

  const executeCheckout = async () => {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setShowNegativeModal(false);

    try {
      const itemsPayload = cart.map(item => ({
        productId: item.product.id,
        qty: item.qty,
        selectedPriceType: item.selectedPriceType || "public",
      }));

      await apiService.checkoutCart(itemsPayload, clientName.trim() || undefined);

      // Reset cart and states
      setCart([]);
      setClientName("");
      setSuccessMsg("¡Venta registrada con éxito!");
      onSaleComplete();

      // Clear success notification
      setTimeout(() => {
        setSuccessMsg("");
      }, 3500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("No se pudo procesar la venta. Verifique los stocks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ventas-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Catalog Search & Grid Card List */}
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
          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider shrink-0">
            {filteredProducts.length} Productos
          </span>
        </div>

        {/* Catalog grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm">
            <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No hay productos que coincidan con la búsqueda.</p>
            <p className="text-xs text-slate-400 mt-1">Crea nuevos productos finales o fabrica recetas en el taller.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(prod => {
              const inCartItem = cart.find(item => item.product.id === prod.id);
              const cartQty = inCartItem ? inCartItem.qty : 0;
              const remainingStock = prod.stock - cartQty;

              const activePriceType = cardPriceTypes[prod.id] || "public";
              let activePriceValue = prod.price;
              if (activePriceType === "wholesale" && prod.priceWholesale !== null && prod.priceWholesale !== undefined) {
                activePriceValue = Number(prod.priceWholesale);
              } else if (activePriceType === "promo" && prod.pricePromo !== null && prod.pricePromo !== undefined) {
                activePriceValue = Number(prod.pricePromo);
              }
              const activeProfit = activePriceValue - (prod.cost || 0);

              return (
                <div
                  key={prod.id}
                  className={`bg-white p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    remainingStock < 0 
                    ? "border-amber-200/80 bg-amber-50/10" 
                    : prod.stock === 0 
                    ? "border-rose-100 bg-rose-50/5" 
                    : "border-slate-100 hover:shadow-md hover:border-indigo-100"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{prod.name}</h3>
                      <span className="text-sm font-bold text-indigo-600 shrink-0 bg-indigo-50/80 px-2.5 py-0.5 rounded-full font-mono border border-indigo-100">
                        ${activePriceValue.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        prod.stock > 10 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : prod.stock > 0 
                        ? "bg-amber-50 text-amber-700 border border-amber-100" 
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {prod.stock > 0 ? `Stock: ${prod.stock} u.` : "Sin Stock Físico"}
                      </span>

                      {cartQty > 0 && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          En carrito: {cartQty} u.
                        </span>
                      )}
                    </div>

                    {/* Interactive 3-price selectors directly in catalog card */}
                    {(prod.priceWholesale || prod.pricePromo) ? (
                      <div className="mt-3">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Elegir precio de venta:</span>
                        <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                          <button
                            type="button"
                            onClick={() => setCardPriceTypes(prev => ({ ...prev, [prod.id]: "public" }))}
                            className={`text-[9px] py-1 px-0.5 rounded-lg transition-all text-center font-bold cursor-pointer flex flex-col items-center justify-center ${
                              activePriceType === "public"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span className="text-[7px] uppercase font-bold tracking-wider opacity-90">Púb</span>
                            <span className="font-mono">${prod.price.toFixed(2)}</span>
                          </button>

                          <button
                            type="button"
                            disabled={!prod.priceWholesale}
                            onClick={() => setCardPriceTypes(prev => ({ ...prev, [prod.id]: "wholesale" }))}
                            className={`text-[9px] py-1 px-0.5 rounded-lg transition-all text-center font-bold flex flex-col items-center justify-center ${
                              !prod.priceWholesale
                                ? "text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-50"
                                : activePriceType === "wholesale"
                                ? "bg-slate-800 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100 cursor-pointer"
                            }`}
                          >
                            <span className="text-[7px] uppercase font-bold tracking-wider opacity-90">May</span>
                            <span className="font-mono">{prod.priceWholesale ? `$${Number(prod.priceWholesale).toFixed(2)}` : "--"}</span>
                          </button>

                          <button
                            type="button"
                            disabled={!prod.pricePromo}
                            onClick={() => setCardPriceTypes(prev => ({ ...prev, [prod.id]: "promo" }))}
                            className={`text-[9px] py-1 px-0.5 rounded-lg transition-all text-center font-bold flex flex-col items-center justify-center ${
                              !prod.pricePromo
                                ? "text-slate-300 bg-slate-50/50 cursor-not-allowed opacity-50"
                                : activePriceType === "promo"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-600 hover:bg-slate-100 cursor-pointer"
                            }`}
                          >
                            <span className="text-[7px] uppercase font-bold tracking-wider opacity-90">
                              Promo {prod.pricePromo && prod.promoQty && prod.promoQty > 1 ? `x${prod.promoQty}` : ""}
                            </span>
                            <span className="font-mono">{prod.pricePromo ? `$${Number(prod.pricePromo).toFixed(2)}` : "--"}</span>
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-3 gap-1 mt-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="text-center">
                        <span className="block text-[8px] text-slate-400 uppercase font-bold tracking-wider">Costo</span>
                        <span className="text-xs font-mono font-bold text-slate-650">${prod.cost ? prod.cost.toFixed(2) : "0.00"}</span>
                      </div>
                      <div className="text-center border-x border-slate-200/50">
                        <span className="block text-[8px] text-indigo-400 uppercase font-bold tracking-wider">Venta</span>
                        <span className="text-xs font-mono font-bold text-indigo-650">${activePriceValue.toFixed(2)}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[8px] text-emerald-500 uppercase font-bold tracking-wider">Ganas</span>
                        <span className="text-xs font-mono font-bold text-emerald-600">+${activeProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100/70">
                    <button
                      onClick={() => handleAddToCart(prod, activePriceType)}
                      className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir a Caja
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Ledger Panel */}
      <div className="lg:col-span-1">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[480px] h-full justify-between sticky top-4">
          
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-500" />
              Carrito de Facturación
            </h2>

            {/* Client register */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cliente (Opcional)</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez / Panadería San José"
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Cart Items list */}
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12">El carrito de compras está vacío.</p>
              ) : (
                cart.map(item => {
                  const hasNegative = item.qty > item.product.stock;

                  return (
                    <div
                      key={item.product.id}
                      className={`p-3 rounded-xl border flex flex-col gap-2.5 transition-all duration-150 ${
                        hasNegative 
                        ? "border-amber-200 bg-amber-50/20" 
                        : "border-slate-100 bg-slate-50/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={item.product.name}>
                            {item.product.name}
                          </h4>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Subtotal: <span className="font-bold text-slate-800">${getCartItemSubtotal(item).subtotal.toFixed(2)}</span>
                            {item.selectedPriceType === "promo" && item.product.promoQty && item.product.promoQty > 1 && item.qty >= item.product.promoQty && (
                              <span className="text-emerald-600 font-bold ml-1.5">(Promo aplicada)</span>
                            )}
                          </div>
                          {hasNegative && (
                            <div className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 font-bold px-1 py-0.5 rounded border border-amber-100 mt-1">
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Excede stock ({item.product.stock} u.)
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Adjust quantities buttons */}
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-xs">
                            <button
                              onClick={() => updateCartQty(item.product.id, -1)}
                              className="p-1 text-slate-500 hover:text-slate-850 hover:bg-slate-50 rounded-l-lg cursor-pointer"
                              title="Restar cantidad"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="px-1.5 text-xs font-bold font-mono text-slate-800">{item.qty}</span>
                            <button
                              onClick={() => updateCartQty(item.product.id, 1)}
                              className="p-1 text-slate-500 hover:text-slate-850 hover:bg-slate-50 rounded-r-lg cursor-pointer"
                              title="Sumar cantidad"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          {/* Trash */}
                          <button
                            onClick={() => handleRemoveFromCart(item.product.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Quitar de caja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive 3-price option selector toggles */}
                      <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-lg border border-slate-200/60 shadow-inner">
                        <button
                          type="button"
                          onClick={() => handleSetPriceType(item.product.id, "public")}
                          className={`text-[9px] py-1 rounded-md transition-all text-center font-semibold cursor-pointer ${
                            (!item.selectedPriceType || item.selectedPriceType === "public")
                              ? "bg-indigo-600 text-white shadow-xs font-bold"
                              : "text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          Púb: ${item.product.price.toFixed(2)}
                        </button>

                        <button
                          type="button"
                          disabled={!item.product.priceWholesale}
                          onClick={() => handleSetPriceType(item.product.id, "wholesale")}
                          className={`text-[9px] py-1 rounded-md transition-all text-center font-semibold ${
                            !item.product.priceWholesale
                              ? "text-slate-300 cursor-not-allowed opacity-50 bg-slate-50"
                              : item.selectedPriceType === "wholesale"
                              ? "bg-slate-800 text-white shadow-xs font-bold"
                              : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                          }`}
                          title={item.product.priceWholesale ? `Precio Mayorista: $${Number(item.product.priceWholesale).toFixed(2)}` : "Precio Mayorista no configurado"}
                        >
                          May: {item.product.priceWholesale ? `$${Number(item.product.priceWholesale).toFixed(2)}` : "--"}
                        </button>

                        <button
                          type="button"
                          disabled={!item.product.pricePromo}
                          onClick={() => handleSetPriceType(item.product.id, "promo")}
                          className={`text-[9px] py-1 rounded-md transition-all text-center font-semibold ${
                            !item.product.pricePromo
                              ? "text-slate-300 cursor-not-allowed opacity-50 bg-slate-50"
                              : item.selectedPriceType === "promo"
                              ? "bg-amber-600 text-white shadow-xs font-bold"
                              : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                          }`}
                          title={item.product.pricePromo ? `Precio Promo: $${Number(item.product.pricePromo).toFixed(2)}` : "Precio Promos no configurado"}
                        >
                          Promo: {item.product.pricePromo ? `$${Number(item.product.pricePromo).toFixed(2)}` : "--"}
                        </button>
                      </div>

                      {item.selectedPriceType === "promo" && item.product.promoQty && item.product.promoQty > 1 && (
                        <div className="flex flex-col gap-1 text-[10px] mt-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          {item.qty < item.product.promoQty ? (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-amber-700 font-bold leading-tight">
                                ⚠️ Faltan {item.product.promoQty - item.qty} u. para promo (mínimo {item.product.promoQty} u.)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setCart(prevCart =>
                                    prevCart.map(c =>
                                      c.product.id === item.product.id ? { ...c, qty: item.product.promoQty! } : c
                                    )
                                  );
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded text-center transition-all cursor-pointer"
                              >
                                Llevar {item.product.promoQty} u. (${item.product.pricePromo!.toFixed(2)})
                              </button>
                            </div>
                          ) : (
                            <span className="text-emerald-700 font-bold flex items-center gap-1 leading-tight">
                              ✓ ¡Precio Promo activado! (Superaste el mínimo de {item.product.promoQty} u.)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Subtotal & Action triggers */}
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-4">
            
            {/* Feedbacks */}
            {successMsg && <div className="text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-lg font-medium">{successMsg}</div>}
            {errorMsg && <div className="text-xs text-rose-500 bg-rose-50 p-2.5 rounded-lg font-medium">{errorMsg}</div>}

            <div className="flex items-center justify-between text-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider">Total Venta</span>
              <span className="text-xl font-bold font-mono text-slate-900">${calculateTotal().toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckoutTrigger}
              disabled={loading || cart.length === 0}
              className={`w-full font-bold py-3 px-4 rounded-xl text-sm transition-colors text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                cart.length === 0 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                : "bg-emerald-600 hover:bg-emerald-505 active:bg-emerald-700"
              }`}
            >
              <Check className="w-4 h-4" />
              {loading ? "Procesando pago..." : "Registrar Checkout (Cobro)"}
            </button>
          </div>

        </div>
      </div>

      {/* Negative Stock Warning Modal Overlay */}
      {showNegativeModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-md w-full font-sans animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Confirmar Venta con Stock Insuficiente</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Estás intentando vender productos que no poseen suficiente stock físico fabricado en el catálogo de productos terminados.
            </p>
            
            <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3 mt-3">
              <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider flex items-center gap-1">
                ⚠️ Consecuencia de venta negativa transitoria:
              </p>
              <p className="text-[11px] text-amber-700 mt-1 font-medium">
                El stock del catálogo se reducirá por debajo de cero (ej. -2 unidades). Deberás registrar tandas de fabricación en el taller posteriormente para regularizar tus existencias.
              </p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowNegativeModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Volver y Ajustar Carrito
              </button>
              <button
                onClick={executeCheckout}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
              >
                Vender en Negativo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales History Section spanning full width at the bottom */}
      <div id="historial-ventas-container" className="lg:col-span-3 mt-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                Historial de Ventas
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Registro cronológico de todas las ventas cobradas en caja.</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Sales search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={salesSearch}
                  onChange={e => setSalesSearch(e.target.value)}
                  placeholder="Buscar venta por cliente o producto..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase tracking-wider shrink-0">
                {filteredSales.length} Ventas
              </span>
            </div>
          </div>

          {filteredSales.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">No se encontraron ventas registradas.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Las ventas que realices en el carrito aparecerán aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Detalle de Productos</th>
                    <th className="py-3 px-4 text-right">Costo Total</th>
                    <th className="py-3 px-4 text-right">Ganancia</th>
                    <th className="py-3 px-4 text-right">Monto Cobrado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {filteredSales.map(tx => {
                    const { itemsList, client, cost, profit } = parseSaleDescription(tx.description);
                    const isDeleting = deletingId === tx.id;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {client ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-50/70 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-100/60">
                              <User className="w-2.5 h-2.5" />
                              {client}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-normal">Público General</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs md:max-w-md truncate" title={itemsList}>
                          {itemsList}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                          ${cost ? parseFloat(cost).toFixed(2) : "0.00"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                          +${profit ? parseFloat(profit).toFixed(2) : "0.00"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap text-sm">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-center">
                          {isDeleting ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleDeleteSale(tx.id)}
                                disabled={deleteLoading}
                                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-sm transition-all cursor-pointer"
                              >
                                {deleteLoading ? "..." : "Sí"}
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(tx.id)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors inline-block cursor-pointer"
                              title="Anular venta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
