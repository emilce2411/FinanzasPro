import { Insumo, Recipe, Product, Transaction, Client } from "../types.ts";
import { supabase } from "./supabase.ts";

const memoryStorage: Record<string, string> = {};

const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("localStorage.getItem blocked, falling back to memory:", e);
      return memoryStorage[key] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("localStorage.setItem blocked, falling back to memory:", e);
      memoryStorage[key] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("localStorage.removeItem blocked, falling back to memory:", e);
      delete memoryStorage[key];
    }
  }
};

let isLocalMode = false;
let currentToken: string | null = null;
let currentUserId = "local-demo-user";
let currentBizName = "Mi Emprendimiento de Pastelería";

export function setApiAuth(token: string | null, userId: string, bizName?: string | null) {
  currentToken = token;
  currentUserId = userId;
  if (bizName) {
    currentBizName = bizName;
  }
  isLocalMode = !token;
}

export function setLocalModeOnly(enabled: boolean) {
  isLocalMode = enabled;
  if (enabled) {
    currentToken = null;
    currentUserId = "local-demo-user";
  }
}

export function getIsLocalMode() {
  return isLocalMode;
}

export function getBizName() {
  if (isLocalMode) {
    return safeStorage.getItem(`es_biz_profile_user_${currentUserId}`) || "Emprendimiento Demo";
  }
  return currentBizName;
}

export function setBizNameLocally(name: string) {
  currentBizName = name;
  if (isLocalMode || currentUserId !== "local-demo-user") {
    safeStorage.setItem(`es_biz_profile_user_${currentUserId}`, name);
  }
}

// Seeding standard local demo data to make sure Local Mode is also pre-loaded
function ensureLocalDemoDataSeeded() {
  const seedKey = `es_biz_is_seeded_user_${currentUserId}`;
  if (safeStorage.getItem(seedKey) === "true") {
    return; // Already seeded or explicitly wiped empty, do not auto-re-seed
  }

  const keyCheck = `es_biz_insumos_user_${currentUserId}`;
  if (!safeStorage.getItem(keyCheck)) {
    const defaultInsumos: Insumo[] = [
      { id: 101, name: "Harina de Trigo", quantity: 15000, unit: "g", totalCost: 15, unitCost: 15 / 15000 },
      { id: 102, name: "Dulce de Leche", quantity: 8000, unit: "g", totalCost: 40, unitCost: 40 / 8000 },
      { id: 103, name: "Mantequilla", quantity: 3000, unit: "g", totalCost: 24, unitCost: 24 / 3000 },
      { id: 104, name: "Chocolate de Cobertura", quantity: 2000, unit: "g", totalCost: 36, unitCost: 36 / 2000 },
      { id: 105, name: "Azúcar", quantity: 10000, unit: "g", totalCost: 10, unitCost: 10 / 10000 },
    ];
    safeStorage.setItem(keyCheck, JSON.stringify(defaultInsumos));

    const defaultRecipes: Recipe[] = [
      {
        id: 201,
        name: "Alfajor de Dulce de Leche Premium",
        yield: 24,
        marginPercent: 150,
        costPerPiece: 0.225,
        suggestedPrice: 3.50,
        ingredients: [
          { insumoId: 101, quantityUsed: 300, insumoName: "Harina de Trigo", insumoUnit: "g", insumoUnitCost: 15 / 15000 },
          { insumoId: 102, quantityUsed: 400, insumoName: "Dulce de Leche", insumoUnit: "g", insumoUnitCost: 40 / 8000 },
          { insumoId: 103, quantityUsed: 150, insumoName: "Mantequilla", insumoUnit: "g", insumoUnitCost: 24 / 3000 },
          { id: Date.now(), insumoId: 104, quantityUsed: 100, insumoName: "Chocolate de Cobertura", insumoUnit: "g", insumoUnitCost: 36 / 2000 },
          { id: Date.now() + 1, insumoId: 105, quantityUsed: 100, insumoName: "Azúcar", insumoUnit: "g", insumoUnitCost: 10 / 10000 },
        ]
      }
    ];
    safeStorage.setItem(`es_biz_recipes_user_${currentUserId}`, JSON.stringify(defaultRecipes));

    const defaultProducts: Product[] = [
      { id: 301, recipeId: 201, name: "Alfajor Premium Maicena x Unid", stock: 36, price: 3.50, priceWholesale: 2.90, pricePromo: 2.70, promoQty: 3, cost: 0.225 },
      { id: 302, recipeId: null, name: "Conito de Dulce de Leche x Unid", stock: 15, price: 2.80, priceWholesale: 2.20, pricePromo: 2.00, promoQty: 2, cost: 0.90 }
    ];
    safeStorage.setItem(`es_biz_products_user_${currentUserId}`, JSON.stringify(defaultProducts));

    const defaultTransactions: Transaction[] = [
      { id: 401, type: "purchase", amount: -125, description: "Compra inicial de materias primas (Local Offline)", date: "2026-06-25" },
      { id: 402, type: "expense", amount: -45, description: "Gastos operativos taller (Local Offline)", date: "2026-06-26" },
      { id: 403, type: "sale", amount: 84, description: "Venta: 24 Alfajores Premium (Local) | Costo: 5.40 | Ganancia: 78.60", date: "2026-06-27" },
      { id: 404, type: "sale", amount: 42, description: "Venta: 15 Conitos de Dulce de Leche (Local) | Costo: 13.50 | Ganancia: 28.50", date: "2026-06-27" },
    ];
    safeStorage.setItem(`es_biz_transactions_user_${currentUserId}`, JSON.stringify(defaultTransactions));

    const defaultClients: Client[] = [
      { id: 501, name: "Café de las Artes (Local)", phone: "+54 11 4455-8899", email: "artes@cafe.com", lat: -34.6037, lng: -58.3816 },
      { id: 502, name: "Panadería San José (Local)", phone: "+54 11 9988-7766", email: "contacto@sanjose.com", lat: -34.6150, lng: -58.4120 },
    ];
    safeStorage.setItem(`es_biz_clients_user_${currentUserId}`, JSON.stringify(defaultClients));

    safeStorage.setItem(`es_biz_profile_user_${currentUserId}`, "Emprendimiento Demo (Offline)");

    safeStorage.setItem(seedKey, "true");
  }
}

// ------------------ LOCALSTORAGE HELPER GET/SET ------------------

function getLocalItems<T>(collection: string): T[] {
  ensureLocalDemoDataSeeded();
  const key = `es_biz_${collection}_user_${currentUserId}`;
  const data = safeStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveLocalItems<T>(collection: string, items: T[]) {
  const key = `es_biz_${collection}_user_${currentUserId}`;
  safeStorage.setItem(key, JSON.stringify(items));
}

// ------------------ API SERVICES ------------------

export const apiService = {
  // Sync after login
  async syncAuth(bizName?: string) {
    if (bizName) setBizNameLocally(bizName);
    ensureLocalDemoDataSeeded();
    return { success: true, isLocal: false };
  },

  // Update biz profile name
  async updateProfile(bizName: string) {
    setBizNameLocally(bizName);
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        await supabase.auth.updateUser({
          data: { biz_name: bizName }
        });
      } catch (err) {
        console.warn("Could not sync profile update to Supabase auth:", err);
      }
    }
    return { success: true, bizName };
  },

  // Insumos
  async getInsumos(): Promise<Insumo[]> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data, error } = await supabase
          .from("insumos")
          .select("*")
          .eq("user_id", currentUserId)
          .order("id", { ascending: false });
        if (!error && data) {
          return data as Insumo[];
        }
      } catch (err) {
        console.warn("Supabase fetch failed for insumos, using local storage cache:", err);
      }
    }
    return getLocalItems<Insumo>("insumos");
  },

  async createInsumo(data: { name: string; quantity: number; unit: string; totalCost: number }): Promise<Insumo> {
    const unitCost = data.quantity > 0 ? data.totalCost / data.quantity : 0;
    const newInsumo: Insumo = {
      id: Date.now(),
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      totalCost: data.totalCost,
      unitCost: unitCost,
    };

    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data: inserted, error } = await supabase
          .from("insumos")
          .insert([{ ...newInsumo, user_id: currentUserId }])
          .select()
          .single();
        if (!error && inserted) {
          const items = getLocalItems<Insumo>("insumos");
          items.unshift(inserted);
          saveLocalItems("insumos", items);
          return inserted as Insumo;
        }
      } catch (err) {
        console.warn("Supabase create failed for insumos, saving locally:", err);
      }
    }

    const items = getLocalItems<Insumo>("insumos");
    items.unshift(newInsumo);
    saveLocalItems("insumos", items);

    // Log purchase movement offline/locally
    if (data.totalCost > 0) {
      await this.createTransaction({
        type: "purchase",
        amount: -data.totalCost,
        description: `Compra de Materia Prima: ${data.quantity}${data.unit} de ${data.name}`,
        date: new Date().toISOString().split("T")[0],
      });
    }

    return newInsumo;
  },

  async updateInsumo(id: number, data: { name: string; quantity: number; unit: string; totalCost: number }): Promise<Insumo> {
    const unitCost = data.quantity > 0 ? data.totalCost / data.quantity : 0;
    const updates = {
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      totalCost: data.totalCost,
      unitCost: unitCost,
    };

    // Find previous state to calculate stock difference
    const currentItems = getLocalItems<Insumo>("insumos");
    const oldInsumo = currentItems.find(i => i.id === id);
    const oldQty = oldInsumo ? oldInsumo.quantity : 0;

    let finalInsumo: Insumo | null = null;

    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data: updated, error } = await supabase
          .from("insumos")
          .update(updates)
          .eq("id", id)
          .eq("user_id", currentUserId)
          .select()
          .single();
        if (!error && updated) {
          const items = getLocalItems<Insumo>("insumos");
          const idx = items.findIndex(i => i.id === id);
          if (idx !== -1) {
            items[idx] = updated;
            saveLocalItems("insumos", items);
          }
          finalInsumo = updated as Insumo;
        }
      } catch (err) {
        console.warn("Supabase update failed for insumos, saving locally:", err);
      }
    }

    if (!finalInsumo) {
      const items = getLocalItems<Insumo>("insumos");
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) {
        items[idx] = {
          ...items[idx],
          ...updates,
        };
        saveLocalItems("insumos", items);
        finalInsumo = items[idx];
      }
    }

    if (!finalInsumo) {
      throw new Error("Materia prima no encontrada");
    }

    // Check if stock has been increased (compró más de ese producto/insumo)
    const diffQty = data.quantity - oldQty;
    if (diffQty > 0) {
      const purchaseAmount = diffQty * unitCost;
      if (purchaseAmount > 0) {
        await this.createTransaction({
          type: "purchase",
          amount: -purchaseAmount,
          description: `Compra de Materia Prima (Actualización Stock): +${diffQty.toFixed(1)}${data.unit} de ${data.name}`,
          date: new Date().toISOString().split("T")[0],
        });
      }
    }

    return finalInsumo;
  },

  async deleteInsumo(id: number): Promise<{ success: boolean }> {
    // Check if ingredient is used in active recipes (local verification)
    const recs = getLocalItems<Recipe>("recipes");
    const isUsed = recs.some(r => r.ingredients.some(ing => ing.insumoId === id));
    if (isUsed) {
      throw new Error("No se puede eliminar porque está referenciado en una receta activa.");
    }

    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { error } = await supabase
          .from("insumos")
          .delete()
          .eq("id", id)
          .eq("user_id", currentUserId);
        if (!error) {
          let items = getLocalItems<Insumo>("insumos");
          items = items.filter(i => i.id !== id);
          saveLocalItems("insumos", items);
          return { success: true };
        }
      } catch (err) {
        console.warn("Supabase delete failed for insumos, removing locally:", err);
      }
    }

    let items = getLocalItems<Insumo>("insumos");
    items = items.filter(i => i.id !== id);
    saveLocalItems("insumos", items);
    return { success: true };
  },

  // Recipes
  async getRecipes(): Promise<Recipe[]> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data, error } = await supabase
          .from("recipes")
          .select("*")
          .eq("user_id", currentUserId)
          .order("id", { ascending: false });
        if (!error && data) {
          return data as Recipe[];
        }
      } catch (err) {
        console.warn("Supabase fetch failed for recipes, returning local storage:", err);
      }
    }
    return getLocalItems<Recipe>("recipes");
  },

  async createRecipe(data: { name: string; yield: number; marginPercent: number; ingredients: any[] }): Promise<Recipe> {
    const insList = getLocalItems<Insumo>("insumos");

    let totalCostOfIngredients = 0;
    const ingredientsWithMeta = data.ingredients.map(ing => {
      const ins = insList.find(i => i.id === ing.insumoId);
      const insCost = ins ? ins.unitCost : 0;
      totalCostOfIngredients += insCost * ing.quantityUsed;
      return {
        ...ing,
        insumoName: ins ? ins.name : "Insumo",
        insumoUnit: ins ? ins.unit : "unidades",
        insumoUnitCost: insCost,
      };
    });

    const costPerPiece = data.yield > 0 ? totalCostOfIngredients / data.yield : 0;
    const suggestedPrice = costPerPiece * (1 + data.marginPercent / 100);

    const newRecipe: Recipe = {
      id: Date.now(),
      name: data.name,
      yield: data.yield,
      marginPercent: data.marginPercent,
      costPerPiece,
      suggestedPrice,
      ingredients: ingredientsWithMeta,
    };

    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data: inserted, error } = await supabase
          .from("recipes")
          .insert([{ ...newRecipe, user_id: currentUserId }])
          .select()
          .single();
        if (!error && inserted) {
          const recs = getLocalItems<Recipe>("recipes");
          recs.unshift(inserted);
          saveLocalItems("recipes", recs);
          
          // Also register product in Supabase & locally
          await this.createProduct({
            name: data.name,
            stock: 0,
            price: parseFloat(suggestedPrice.toFixed(2)),
            cost: costPerPiece,
            recipeId: inserted.id
          });

          return inserted as Recipe;
        }
      } catch (err) {
        console.warn("Supabase recipe create failed, fall back to local:", err);
      }
    }

    const recs = getLocalItems<Recipe>("recipes");
    recs.unshift(newRecipe);
    saveLocalItems("recipes", recs);

    // Register or update product catalog locally
    const prods = getLocalItems<Product>("products");
    const existingProduct = prods.find(p => p.name.toLowerCase() === data.name.toLowerCase());
    if (!existingProduct) {
      prods.unshift({
        id: Date.now() + 10,
        recipeId: newRecipe.id,
        name: data.name,
        stock: 0,
        price: parseFloat(suggestedPrice.toFixed(2)),
        cost: costPerPiece,
      });
      saveLocalItems("products", prods);
    }

    return newRecipe;
  },

  async deleteRecipe(id: number): Promise<{ success: boolean }> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { error } = await supabase
          .from("recipes")
          .delete()
          .eq("id", id)
          .eq("user_id", currentUserId);
        if (!error) {
          let recs = getLocalItems<Recipe>("recipes");
          recs = recs.filter(r => r.id !== id);
          saveLocalItems("recipes", recs);
          return { success: true };
        }
      } catch (err) {
        console.warn("Supabase recipe delete failed, removing locally:", err);
      }
    }

    let recs = getLocalItems<Recipe>("recipes");
    recs = recs.filter(r => r.id !== id);
    saveLocalItems("recipes", recs);
    return { success: true };
  },

  // Products
  async getProducts(): Promise<Product[]> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("user_id", currentUserId)
          .order("id", { ascending: false });
        if (!error && data) {
          return (data as any[]).map(p => ({
            ...p,
            priceWholesale: p.price_wholesale !== undefined ? p.price_wholesale : p.priceWholesale,
            pricePromo: p.price_promo !== undefined ? p.price_promo : p.pricePromo,
            promoQty: p.promo_qty !== undefined ? p.promo_qty : p.promoQty,
          })) as Product[];
        }
      } catch (err) {
        console.warn("Supabase fetch failed for products, returning local storage:", err);
      }
    }
    return getLocalItems<Product>("products");
  },

  async createProduct(data: { name: string; stock: number; price: number; priceWholesale?: number | null; pricePromo?: number | null; promoQty?: number | null; cost: number; recipeId?: number | null }): Promise<Product> {
    const newProduct: Product = {
      id: Date.now(),
      recipeId: data.recipeId || null,
      name: data.name,
      stock: data.stock,
      price: data.price,
      priceWholesale: data.priceWholesale || null,
      pricePromo: data.pricePromo || null,
      promoQty: data.promoQty || null,
      cost: data.cost,
    };

    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const insertData = {
          ...newProduct,
          price_wholesale: newProduct.priceWholesale,
          price_promo: newProduct.pricePromo,
          promo_qty: newProduct.promoQty,
          user_id: currentUserId,
        };
        const { data: inserted, error } = await supabase
          .from("products")
          .insert([insertData])
          .select()
          .single();
        if (!error && inserted) {
          const mappedInserted: Product = {
            ...inserted,
            priceWholesale: (inserted as any).price_wholesale !== undefined ? (inserted as any).price_wholesale : (inserted as any).priceWholesale,
            pricePromo: (inserted as any).price_promo !== undefined ? (inserted as any).price_promo : (inserted as any).pricePromo,
            promoQty: (inserted as any).promo_qty !== undefined ? (inserted as any).promo_qty : (inserted as any).promoQty,
          };
          const prods = getLocalItems<Product>("products");
          prods.unshift(mappedInserted);
          saveLocalItems("products", prods);
          return mappedInserted;
        }
      } catch (err) {
        console.warn("Supabase product create failed, saving locally:", err);
      }
    }

    const prods = getLocalItems<Product>("products");
    prods.unshift(newProduct);
    saveLocalItems("products", prods);
    return newProduct;
  },

  async updateProduct(id: number, data: { name?: string; stock?: number; price?: number; priceWholesale?: number | null; pricePromo?: number | null; promoQty?: number | null; cost?: number }): Promise<Product> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const updateData: any = { ...data };
        if (data.priceWholesale !== undefined) {
          updateData.price_wholesale = data.priceWholesale;
        }
        if (data.pricePromo !== undefined) {
          updateData.price_promo = data.pricePromo;
        }
        if (data.promoQty !== undefined) {
          updateData.promo_qty = data.promoQty;
        }
        const { data: updated, error } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", id)
          .eq("user_id", currentUserId)
          .select()
          .single();
        if (!error && updated) {
          const mappedUpdated: Product = {
            ...updated,
            priceWholesale: (updated as any).price_wholesale !== undefined ? (updated as any).price_wholesale : (updated as any).priceWholesale,
            pricePromo: (updated as any).price_promo !== undefined ? (updated as any).price_promo : (updated as any).pricePromo,
            promoQty: (updated as any).promo_qty !== undefined ? (updated as any).promo_qty : (updated as any).promoQty,
          };
          const prods = getLocalItems<Product>("products");
          const idx = prods.findIndex(p => p.id === id);
          if (idx !== -1) {
            prods[idx] = mappedUpdated;
            saveLocalItems("products", prods);
          }
          return mappedUpdated;
        }
      } catch (err) {
        console.warn("Supabase product update failed, updating locally:", err);
      }
    }

    const prods = getLocalItems<Product>("products");
    const idx = prods.findIndex(p => p.id === id);
    if (idx !== -1) {
      prods[idx] = {
        ...prods[idx],
        ...data,
      } as Product;
      saveLocalItems("products", prods);
      return prods[idx];
    }
    throw new Error("Product not found");
  },

  async updateProductStockDelta(id: number, delta: number): Promise<Product> {
    const prods = getLocalItems<Product>("products");
    const idx = prods.findIndex(p => p.id === id);
    if (idx === -1) throw new Error("Producto no encontrado");

    const newStock = prods[idx].stock + delta;
    return this.updateProduct(id, { stock: newStock });
  },

  async deleteProduct(id: number): Promise<{ success: boolean }> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id)
          .eq("user_id", currentUserId);
        if (!error) {
          let prods = getLocalItems<Product>("products");
          prods = prods.filter(p => p.id !== id);
          saveLocalItems("products", prods);
          return { success: true };
        }
      } catch (err) {
        console.warn("Supabase product delete failed, removing locally:", err);
      }
    }

    let prods = getLocalItems<Product>("products");
    prods = prods.filter(p => p.id !== id);
    saveLocalItems("products", prods);
    return { success: true };
  },

  // Fabricar Tanda (Taller Production)
  async executeFabricacion(recipeId: number, batches: number): Promise<any> {
    const recs = getLocalItems<Recipe>("recipes");
    const insList = getLocalItems<Insumo>("insumos");
    const prods = getLocalItems<Product>("products");

    const recipe = recs.find(r => r.id === recipeId);
    if (!recipe) throw new Error("Receta no encontrada");

    // Verify availability
    const missing: string[] = [];
    const insumoUpdates: { id: number; required: number; has: number; name: string }[] = [];

    recipe.ingredients.forEach(ing => {
      const ins = insList.find(i => i.id === ing.insumoId);
      if (!ins) throw new Error("Materia prima no encontrada.");

      const required = ing.quantityUsed * batches;
      if (ins.quantity < required) {
        missing.push(`${ins.name}: Requieres ${required}${ins.unit}, tienes ${ins.quantity}${ins.unit}`);
      } else {
        insumoUpdates.push({ id: ins.id, required, has: ins.quantity, name: ins.name });
      }
    });

    if (missing.length > 0) {
      throw new Error("Insumos insuficientes:\n" + missing.join("\n"));
    }

    // Process local ingredient deduction
    for (const update of insumoUpdates) {
      await this.updateInsumo(update.id, {
        name: update.name,
        quantity: update.has - update.required,
        unit: insList.find(i => i.id === update.id)!.unit,
        totalCost: insList.find(i => i.id === update.id)!.totalCost
      });
    }

    // Increase products stock
    const finalQtyProduced = recipe.yield * batches;
    let targetProduct = prods.find(p => p.recipeId === recipe.id);
    if (!targetProduct) {
      targetProduct = prods.find(p => p.name.toLowerCase() === recipe.name.toLowerCase());
    }

    if (targetProduct) {
      await this.updateProduct(targetProduct.id, {
        stock: targetProduct.stock + finalQtyProduced,
        cost: recipe.costPerPiece
      });
    } else {
      targetProduct = await this.createProduct({
        recipeId: recipe.id,
        name: recipe.name,
        stock: finalQtyProduced,
        price: parseFloat(recipe.suggestedPrice.toFixed(2)),
        cost: recipe.costPerPiece,
      });
    }

    // Log transaction movement
    const loggedTx = await this.createTransaction({
      type: "expense",
      amount: 0,
      description: `Fabricación Taller: ${batches} tanda(s) de ${recipe.name} (+${finalQtyProduced} unidades fabricadas)`,
      date: new Date().toISOString().split("T")[0],
    });

    return {
      success: true,
      batchesManufactured: batches,
      qtyProduced: finalQtyProduced,
      product: targetProduct,
      transaction: loggedTx
    };
  },

  // Transactions Ledger
  async getTransactions(): Promise<Transaction[]> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", currentUserId)
          .order("id", { ascending: false });
        if (!error && data) {
          return data as Transaction[];
        }
      } catch (err) {
        console.warn("Supabase fetch failed for transactions, returning local cache:", err);
      }
    }
    return getLocalItems<Transaction>("transactions");
  },

  async createTransaction(data: { type: string; amount: number; description: string; date?: string }): Promise<Transaction> {
    const newTx: Transaction = {
      id: Date.now(),
      type: data.type as any,
      amount: data.amount,
      description: data.description,
      date: data.date || new Date().toISOString().split("T")[0],
    };

    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data: inserted, error } = await supabase
          .from("transactions")
          .insert([{ ...newTx, user_id: currentUserId }])
          .select()
          .single();
        if (!error && inserted) {
          const txs = getLocalItems<Transaction>("transactions");
          txs.unshift(inserted);
          saveLocalItems("transactions", txs);
          return inserted as Transaction;
        }
      } catch (err) {
        console.warn("Supabase transaction save failed, logging locally:", err);
      }
    }

    const txs = getLocalItems<Transaction>("transactions");
    txs.unshift(newTx);
    saveLocalItems("transactions", txs);
    return newTx;
  },

  async deleteTransaction(id: number | string): Promise<{ success: boolean }> {
    let tx: Transaction | undefined;
    const txs = getLocalItems<Transaction>("transactions");
    tx = txs.find(t => String(t.id) === String(id));

    if (!tx && currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) {
          tx = data as Transaction;
        }
      } catch (err) {
        console.warn("Failed to fetch transaction from Supabase:", err);
      }
    }

    // Correcting stock / restoring quantity if it was a Stock Update transaction
    if (tx) {
      // format: "Compra de Materia Prima (Actualización Stock): +500.0g de Harina de Trigo"
      const match = tx.description.match(/Compra de Materia Prima \(Actualización Stock\):\s*\+([\d.]+)\s*(\w+)?\s*de\s*(.+)/i);
      if (match) {
        const qtyAdded = parseFloat(match[1]);
        const insumoName = match[3].trim();

        const insumos = getLocalItems<Insumo>("insumos");
        const insumoIdx = insumos.findIndex(i => i.name.toLowerCase() === insumoName.toLowerCase());
        if (insumoIdx !== -1) {
          const insumo = insumos[insumoIdx];
          const newQty = Math.max(0, insumo.quantity - qtyAdded);
          insumo.quantity = newQty;
          insumos[insumoIdx] = insumo;
          saveLocalItems("insumos", insumos);

          if (currentUserId && currentUserId !== "local-demo-user") {
            try {
              await supabase
                .from("insumos")
                .update({ quantity: newQty })
                .eq("id", insumo.id)
                .eq("user_id", currentUserId);
            } catch (err) {
              console.warn("Supabase update for corrected stock failed:", err);
            }
          }
        }
      }
    }

    if (currentUserId && currentUserId !== "local-demo-user") {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id)
        .eq("user_id", currentUserId);
      if (error) {
        console.error("Supabase transaction delete failed:", error);
        throw new Error(`No se pudo eliminar la transacción de la base de datos: ${error.message}`);
      }
    }

    const filtered = txs.filter(t => String(t.id) !== String(id));
    saveLocalItems("transactions", filtered);
    return { success: true };
  },

  async checkoutCart(items: { productId: number; qty: number; selectedPriceType?: "public" | "wholesale" | "promo" }[], clientName?: string): Promise<any> {
    const prods = getLocalItems<Product>("products");
    let totalSaleRevenue = 0;
    let totalCostInsumos = 0;
    const salesDescriptions: string[] = [];

    for (const item of items) {
      const prod = prods.find(p => p.id === item.productId);
      if (!prod) throw new Error("Producto no encontrado");

      await this.updateProduct(prod.id, {
        stock: prod.stock - item.qty
      });
      
      let itemRevenue = 0;
      let priceLabel = "";
      if (item.selectedPriceType === "wholesale" && prod.priceWholesale !== undefined && prod.priceWholesale !== null) {
        itemRevenue = Number(prod.priceWholesale) * item.qty;
        priceLabel = " (Mayorista)";
      } else if (item.selectedPriceType === "promo" && prod.pricePromo !== undefined && prod.pricePromo !== null) {
        const pQty = prod.promoQty || 1;
        if (pQty > 1) {
          if (item.qty >= pQty) {
            const numPromos = Math.floor(item.qty / pQty);
            const leftovers = item.qty % pQty;
            itemRevenue = (numPromos * Number(prod.pricePromo)) + (leftovers * prod.price);
            priceLabel = ` (Promo x${pQty})`;
          } else {
            itemRevenue = prod.price * item.qty;
            priceLabel = " (Púb - Falta mín. promo)";
          }
        } else {
          itemRevenue = Number(prod.pricePromo) * item.qty;
          priceLabel = " (Promo)";
        }
      } else {
        itemRevenue = prod.price * item.qty;
      }
      
      totalSaleRevenue += itemRevenue;
      
      const itemCost = (prod.cost || 0) * item.qty;
      totalCostInsumos += itemCost;
      
      salesDescriptions.push(`${item.qty}x ${prod.name}${priceLabel}`);
    }

    const totalProfit = totalSaleRevenue - totalCostInsumos;

    // Log movement with separated cost and profit encoded in the description
    const baseDescription = `Venta Caja: ${salesDescriptions.join(", ")}` + (clientName ? ` (Cliente: ${clientName})` : "");
    const description = `${baseDescription} | Costo: ${totalCostInsumos.toFixed(2)} | Ganancia: ${totalProfit.toFixed(2)}`;

    const loggedTx = await this.createTransaction({
      type: "sale",
      amount: totalSaleRevenue,
      description,
      date: new Date().toISOString().split("T")[0],
    });

    return { success: true, revenue: totalSaleRevenue, transaction: loggedTx };
  },

  async resetDatabase(mode: "clear" | "reset" = "reset"): Promise<{ success: boolean }> {
    // Clear localStorage specific tables for active user
    safeStorage.removeItem(`es_biz_insumos_user_${currentUserId}`);
    safeStorage.removeItem(`es_biz_recipes_user_${currentUserId}`);
    safeStorage.removeItem(`es_biz_products_user_${currentUserId}`);
    safeStorage.removeItem(`es_biz_transactions_user_${currentUserId}`);
    safeStorage.removeItem(`es_biz_clients_user_${currentUserId}`);
    safeStorage.removeItem(`es_biz_profile_user_${currentUserId}`);

    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        // Attempt to clean remote tables in Supabase
        await supabase.from("transactions").delete().eq("user_id", currentUserId);
        await supabase.from("products").delete().eq("user_id", currentUserId);
        await supabase.from("recipes").delete().eq("user_id", currentUserId);
        await supabase.from("insumos").delete().eq("user_id", currentUserId);
        await supabase.from("clients").delete().eq("user_id", currentUserId);
      } catch (err) {
        console.warn("Could not wipe remote Supabase tables:", err);
      }
    }

    if (mode === "clear") {
      safeStorage.setItem(`es_biz_is_seeded_user_${currentUserId}`, "true");
    } else {
      safeStorage.removeItem(`es_biz_is_seeded_user_${currentUserId}`);
      ensureLocalDemoDataSeeded();
    }
    return { success: true };
  },

  // Clients
  async getClients(): Promise<Client[]> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("user_id", currentUserId)
          .order("id", { ascending: false });
        if (!error && data) {
          return data as Client[];
        }
      } catch (err) {
        console.warn("Supabase fetch failed for clients, returning local cache:", err);
      }
    }
    return getLocalItems<Client>("clients");
  },

  async createClient(data: { name: string; phone?: string; email?: string; lat?: number; lng?: number }): Promise<Client> {
    const newClient: Client = {
      id: Date.now(),
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      lat: data.lat || null,
      lng: data.lng || null,
    };

    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { data: inserted, error } = await supabase
          .from("clients")
          .insert([{ ...newClient, user_id: currentUserId }])
          .select()
          .single();
        if (!error && inserted) {
          const list = getLocalItems<Client>("clients");
          list.unshift(inserted);
          saveLocalItems("clients", list);
          return inserted as Client;
        }
      } catch (err) {
        console.warn("Supabase client create failed, saving locally:", err);
      }
    }

    const list = getLocalItems<Client>("clients");
    list.unshift(newClient);
    saveLocalItems("clients", list);
    return newClient;
  },

  async deleteClient(id: number): Promise<{ success: boolean }> {
    if (currentUserId && currentUserId !== "local-demo-user") {
      try {
        const { error } = await supabase
          .from("clients")
          .delete()
          .eq("id", id)
          .eq("user_id", currentUserId);
        if (!error) {
          let list = getLocalItems<Client>("clients");
          list = list.filter(c => c.id !== id);
          saveLocalItems("clients", list);
          return { success: true };
        }
      } catch (err) {
        console.warn("Supabase client delete failed, removing locally:", err);
      }
    }

    let list = getLocalItems<Client>("clients");
    list = list.filter(c => c.id !== id);
    saveLocalItems("clients", list);
    return { success: true };
  },

  // AI Assistant advice
  async askAiAdvisor(prompt: string): Promise<string> {
    // If online, can fall back to custom server assistant or direct smart analysis
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!data.error && data.response) {
        return data.response;
      }
    } catch (e) {
      // Offline fallback smart tips simulator using financial analysis
    }

    const insList = getLocalItems<Insumo>("insumos");
    const prods = getLocalItems<Product>("products");
    const lowStockList = insList.filter(i => i.quantity < 1000).map(i => i.name);
    
    let tips = `**[MODO MULTIUSUARIO SUPABASE]**\n\n¡Hola! Como estás operando desde tu cuenta multiusuario, he analizado tus datos actuales en el navegador:\n\n`;
    if (lowStockList.length > 0) {
      tips += `⚠️ **Alerta de Stock Crítico:** Tienes bajo stock de materia prima en: *${lowStockList.join(", ")}*. Sería aconsejable reponer antes de iniciar la próxima tanda de producción en el taller.\n\n`;
    } else {
      tips += `✅ **Inventario Estable:** Tus materias primas cargadas en tu despensa tienen buenos niveles de stock.\n\n`;
    }

    const lowMarginProds = prods.filter(p => p.price < p.cost * 1.5);
    if (lowMarginProds.length > 0) {
      tips += `📈 **Oportunidad de Margen:** Tus productos *${lowMarginProds.map(p => p.name).join(", ")}* tienen márgenes de ganancia menores al 50%. Te recomiendo recalcular tus recetas en el taller o ajustar su precio de venta sugerido.\n\n`;
    } else {
      tips += `🌟 **Márgenes de Excelencia:** Tu catálogo actual de ventas posee excelentes márgenes de rentabilidad sobre costo (+150% promedio).\n\n`;
    }

    tips += `Tus datos de ventas y gastos se vinculan de manera segura a tu ID de usuario de Supabase (\`${currentUserId}\`) de forma totalmente aislada.`;
    return tips;
  }
};
