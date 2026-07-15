import { pgTable, serial, text, integer, timestamp, real, uuid, varchar, numeric, boolean, date, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users table (linked to Firebase UID)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase Auth UID
  email: text("email").notNull(),
  bizName: text("biz_name"), // Name of the business
  password: text("password"), // Passwords for custom email/password fallback users
  isSeeded: integer("is_seeded").default(0).notNull(), // Track if seeded to prevent auto-re-seeding
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Insumos table (Raw materials)
export const insumos = pgTable("insumos_legacy", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  quantity: real("quantity").default(0).notNull(), // Current physical inventory stock
  unit: text("unit").notNull(), // g, ml, kg, litros, m, unidades
  totalCost: real("total_cost").default(0).notNull(), // Cost of purchase
  unitCost: real("unit_cost").default(0).notNull(), // Unit price (e.g. $/gram)
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Recipes table (Formulations for workshops)
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  yield: integer("yield").default(1).notNull(), // Number of individual items produced by this recipe batch
  suggestedPrice: real("suggested_price").default(0).notNull(),
  marginPercent: real("margin_percent").default(0).notNull(), // e.g. 150%
  costPerPiece: real("cost_per_piece").default(0).notNull(), // Recipe cost / yield
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Recipe Ingredients (Link table)
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .references(() => recipes.id, { onDelete: "cascade" })
    .notNull(),
  insumoId: integer("insumo_id")
    .references(() => insumos.id, { onDelete: "cascade" })
    .notNull(),
  quantityUsed: real("quantity_used").notNull(), // Amount used from raw material in this recipe batch
});

// 5. Products table (Catalog)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipeId: integer("recipe_id")
    .references(() => recipes.id, { onDelete: "set null" }), // Optional recipe link
  name: text("name").notNull(),
  stock: integer("stock").default(0).notNull(), // Finished products ready to sell
  price: real("price").notNull(), // Selling price
  priceWholesale: real("price_wholesale"), // Wholesale price
  pricePromo: real("price_promo"), // Promotional price
  promoQty: integer("promo_qty").default(1), // Quantity associated with the promo (e.g., 2, 3...)
  cost: real("cost").default(0).notNull(), // Production cost per piece
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Transactions table (Cash Ledger / Book of entries)
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // 'sale', 'purchase', 'expense', 'adjustment'
  amount: real("amount").notNull(), // Positive for sale, negative for others
  description: text("description").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Clients table (Customers with geographic location)
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations declarations
export const usersRelations = relations(users, ({ many }) => ({
  insumos: many(insumos),
  recipes: many(recipes),
  products: many(products),
  transactions: many(transactions),
  clients: many(clients),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, { fields: [recipes.userId], references: [users.id] }),
  ingredients: many(recipeIngredients),
  products: many(products),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
  insumo: one(insumos, { fields: [recipeIngredients.insumoId], references: [insumos.id] }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  recipe: one(recipes, { fields: [products.recipeId], references: [recipes.id] }),
}));

export const insumosRelations = relations(insumos, ({ one, many }) => ({
  user: one(users, { fields: [insumos.userId], references: [users.id] }),
  recipeIngredients: many(recipeIngredients),
}));

// ==========================================
// NEW SQL SCHEMAS REQUESTED BY THE USER
// ==========================================

// 1. USUARIOS Y AUTENTICACIÓN
export const usuariosSql = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  rol: varchar("rol", { length: 20 }).default("admin"), // 'admin', 'empleado'
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

// 2. CLIENTES (Con geolocalización para Leaflet)
export const clientesSql = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuariosSql.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  telefono: varchar("telefono", { length: 30 }),
  email: varchar("email", { length: 150 }),
  direccion: text("direccion"),
  latitud: numeric("latitud", { precision: 10, scale: 8 }),   // Para mapas/Leaflet
  longitud: numeric("longitud", { precision: 11, scale: 8 }),  // Para mapas/Leaflet
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

// 3. INSUMOS Y MATERIA PRIMA
export const insumosSql = pgTable("insumos", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuariosSql.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  unidadMedida: varchar("unidad_medida", { length: 20 }).notNull(), // 'gr', 'ml', 'unidades', etc.
  costoUnitario: numeric("costo_unitario", { precision: 12, scale: 2 }).notNull().default("0.00"),
  stockActual: numeric("stock_actual", { precision: 10, scale: 2 }).notNull().default("0.00"),
  stockMinimo: numeric("stock_minimo", { precision: 10, scale: 2 }).default("0.00"), // Para alertas de stock
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

// 4. PRODUCTOS TERMINADOS
export const productosSql = pgTable("productos", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuariosSql.id, { onDelete: "cascade" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: text("descripcion"),
  precioVenta: numeric("precio_venta", { precision: 12, scale: 2 }).notNull().default("0.00"),
  costoCalculado: numeric("costo_calculado", { precision: 12, scale: 2 }).default("0.00"), // Suma del costo de sus insumos
  stockActual: integer("stock_actual").notNull().default(0),
  stockMinimo: integer("stock_minimo").default(0), // Alerta de stock crítico
  esFabricado: boolean("es_fabricado").default(true),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

// 5. RECETAS / FABRICACIÓN POR LOTES (Relación Producto <-> Insumo)
export const recetasFabricacionSql = pgTable("recetas_fabricacion", {
  id: uuid("id").primaryKey().defaultRandom(),
  productoId: uuid("producto_id").references(() => productosSql.id, { onDelete: "cascade" }),
  insumoId: uuid("insumo_id").references(() => insumosSql.id, { onDelete: "restrict" }),
  cantidadRequerida: numeric("cantidad_requerida", { precision: 10, scale: 2 }).notNull(), // Cantidad de insumo por 1 producto
}, (t) => [
  unique().on(t.productoId, t.insumoId),
]);

// 6. VENTAS
export const ventasSql = pgTable("ventas", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuariosSql.id, { onDelete: "cascade" }),
  clienteId: uuid("cliente_id").references(() => clientesSql.id, { onDelete: "set null" }),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  gananciaNeta: numeric("ganancia_neta", { precision: 12, scale: 2 }).notNull(), // (Total Venta - Costo Total)
  metodoPago: varchar("metodo_pago", { length: 50 }).default("Efectivo"), // 'Efectivo', 'Transferencia', etc.
  estado: varchar("estado", { length: 20 }).default("completada"),   // 'completada', 'pendiente', 'cancelada'
  fecha: timestamp("fecha", { withTimezone: true }).defaultNow(),
});

// 7. DETALLE DE VENTAS
export const detallesVentaSql = pgTable("detalles_venta", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventaId: uuid("venta_id").references(() => ventasSql.id, { onDelete: "cascade" }),
  productoId: uuid("producto_id").references(() => productosSql.id, { onDelete: "restrict" }),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: numeric("precio_unitario", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// 8. GASTOS GENERALES Y OPERATIVOS (Punto de Equilibrio)
export const gastosSql = pgTable("gastos", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuariosSql.id, { onDelete: "cascade" }),
  concepto: varchar("concepto", { length: 150 }).notNull(),
  categoria: varchar("categoria", { length: 50 }).notNull(), // 'Fijo' (Alquiler, Luz) o 'Variable'
  monto: numeric("monto", { precision: 12, scale: 2 }).notNull(),
  fecha: date("fecha").defaultNow(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

// 9. HISTORIAL DE MOVIMIENTOS DE INVENTARIO
export const movimientosInventarioSql = pgTable("movimientos_inventario", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuariosSql.id, { onDelete: "cascade" }),
  tipoItem: varchar("tipo_item", { length: 20 }).notNull(), // 'producto' o 'insumo'
  itemId: uuid("item_id").notNull(),
  tipoMovimiento: varchar("tipo_movimiento", { length: 20 }).notNull(), // 'entrada', 'salida', 'fabricacion', 'ajuste'
  cantidad: numeric("cantidad", { precision: 10, scale: 2 }).notNull(),
  motivo: text("motivo"),
  fecha: timestamp("fecha", { withTimezone: true }).defaultNow(),
});
