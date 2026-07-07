import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase.ts";
import { apiService, setApiAuth, setLocalModeOnly, getIsLocalMode, getBizName } from "./lib/api.ts";
import { Insumo, Recipe, Product, Transaction, Client } from "./types.ts";

// Views imports
import Ventas from "./components/Ventas.tsx";
import Insumos from "./components/Insumos.tsx";
import Fabricacion from "./components/Fabricacion.tsx";
import ProductosCatalog from "./components/ProductosCatalog.tsx";
import MapaClientes from "./components/MapaClientes.tsx";

import {
  Sparkles,
  LayoutDashboard,
  ShoppingBag,
  Layers,
  Wrench,
  Package,
  MapPin,
  FileText,
  Clock,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Edit2,
  Check,
  RotateCcw,
  WifiOff,
  CloudLightning,
  AlertCircle
} from "lucide-react";

export default function App() {
  // Global Data States
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Auth / Session States
  const [user, setUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [bizName, setBizName] = useState("Mi Taller Gastronómico");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingBizName, setEditingBizName] = useState(false);
  const [newBizNameInput, setNewBizNameInput] = useState("");

  // Email/Password Auth Form States
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [bizNameInput, setBizNameInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");
  const [hasLocalDataToMigrate, setHasLocalDataToMigrate] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState<string | null>(null);

  // Navigation state
  const [activeTab, setActiveTab] = useState("ventas");
  const [systemError, setSystemError] = useState("");

  const checkLocalData = () => {
    try {
      const insKey = `es_biz_insumos_user_local-demo-user`;
      const recKey = `es_biz_recipes_user_local-demo-user`;
      const txKey = `es_biz_transactions_user_local-demo-user`;
      const cliKey = `es_biz_clients_user_local-demo-user`;
      
      const hasIns = localStorage.getItem(insKey);
      const hasRec = localStorage.getItem(recKey);
      const hasTx = localStorage.getItem(txKey);
      const hasCli = localStorage.getItem(cliKey);

      if (hasIns || hasRec || hasTx || hasCli) {
        setHasLocalDataToMigrate(true);
      } else {
        setHasLocalDataToMigrate(false);
      }
    } catch (e) {
      console.warn("Could not check local storage for migration:", e);
    }
  };

  const handleMigrateData = async () => {
    setIsMigrating(true);
    setMigrationSuccess(null);
    try {
      const res = await apiService.migrateLocalDataToCloud();
      if (res.success) {
        setMigrationSuccess(
          `¡Excelente! Se han migrado todos tus datos de forma segura a la base de datos de la nube: ${res.stats.insumos} insumos, ${res.stats.recipes} recetas de fabricación, ${res.stats.products} productos, ${res.stats.transactions} transacciones/ventas y ${res.stats.clients} ubicaciones de georreferencia.`
        );
        setHasLocalDataToMigrate(false);
        await loadAllData();
      }
    } catch (err: any) {
      console.error("Migration failed:", err);
      setSystemError("No se pudieron migrar los datos locales a la base de datos PostgreSQL.");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismissMigration = () => {
    try {
      localStorage.removeItem(`es_biz_insumos_user_local-demo-user`);
      localStorage.removeItem(`es_biz_recipes_user_local-demo-user`);
      localStorage.removeItem(`es_biz_products_user_local-demo-user`);
      localStorage.removeItem(`es_biz_transactions_user_local-demo-user`);
      localStorage.removeItem(`es_biz_clients_user_local-demo-user`);
      localStorage.removeItem(`es_biz_profile_user_local-demo-user`);
      localStorage.setItem(`es_biz_is_seeded_user_local-demo-user`, "true");
      setHasLocalDataToMigrate(false);
    } catch (e) {
      console.warn("Could not dismiss migration:", e);
    }
  };

  // Synchronize all data pools
  const loadAllData = async () => {
    try {
      const [insList, recsList, prodsList, txsList, clientsList] = await Promise.all([
        apiService.getInsumos(),
        apiService.getRecipes(),
        apiService.getProducts(),
        apiService.getTransactions(),
        apiService.getClients()
      ]);

      setInsumos(insList);
      setRecipes(recsList);
      setProducts(prodsList);
      setTransactions(txsList);
      setClients(clientsList);

      setBizName(getBizName());

      if (user && user.uid !== "local-demo-user" && !isLocalMode) {
        checkLocalData();
      }
    } catch (err: any) {
      console.error("Error loading data streams:", err);
      setSystemError("No se pudo cargar la base de datos de PostgreSQL en la nube.");
    }
  };

  // Hybrid Auth Sync (supports Supabase Auth & Custom Backup Auth)
  useEffect(() => {
    let isUnmounted = false;

    // Listen to Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthLoading(true);
      setSystemError("");

      if (session && session.user) {
        const supabaseUser = session.user;
        const displayName = supabaseUser.user_metadata?.display_name || supabaseUser.email?.split("@")[0] || "Usuario";
        const userBizName = supabaseUser.user_metadata?.biz_name || "Mi Taller Gastronómico";

        setApiAuth(session.access_token, supabaseUser.id, userBizName);
        setIsLocalMode(false);

        if (!isUnmounted) {
          setUser({
            id: Date.now(),
            uid: supabaseUser.id,
            email: supabaseUser.email || "",
            displayName: displayName,
            bizName: userBizName
          });
          setBizName(userBizName);
          setIsLocalMode(false);
        }
      } else {
        // Fallback to custom backend session if it exists in localStorage
        const savedToken = localStorage.getItem("finanzas_pro_custom_token");
        const savedUserJson = localStorage.getItem("finanzas_pro_custom_user");
        if (savedToken && savedUserJson) {
          try {
            const savedUser = JSON.parse(savedUserJson);
            setApiAuth(savedToken, savedUser.uid, savedUser.bizName);
            setIsLocalMode(false);
            if (!isUnmounted) {
              setUser(savedUser);
              setBizName(savedUser.bizName || "Mi Taller Gastronómico");
              setIsLocalMode(false);
            }
            setIsAuthLoading(false);
            return;
          } catch (err) {
            console.error("Error restoring custom user session:", err);
          }
        }

        // Safe Offline Local mode by default if not signed in
        setLocalModeOnly(true);
        if (!isUnmounted) {
          setUser(null);
          setIsLocalMode(true);
        }
      }

      setIsAuthLoading(false);
    });

    return () => {
      isUnmounted = true;
      subscription.unsubscribe();
    };
  }, []);

  // Trigger loading state once auth mode is stabilized
  useEffect(() => {
    if (!isAuthLoading) {
      loadAllData();
    }
  }, [user, isAuthLoading, isLocalMode]);

  // Auth Action Handlers
  const getFriendlyErrorMessage = (err: any, context: "login" | "signup" | "resend"): string => {
    const msg = err.message?.toLowerCase() || "";
    const status = err.status;

    if (msg.includes("rate limit") || msg.includes("rate_limit") || msg.includes("too many requests") || msg.includes("exceeded") || status === 429) {
      return "¡Límite de envíos excedido! Has realizado demasiadas solicitudes en poco tiempo. Por seguridad, por favor espera unos minutos antes de intentar de nuevo. Recuerda que puedes hacer clic arriba en 'Ingresar en Modo Demostración Local' para probar la aplicación al instante.";
    }

    if (context === "login") {
      const isUnconfirmed = msg.includes("email not confirmed") || 
                            msg.includes("confirmar su correo") || 
                            (status === 400 && msg.includes("confirm"));
      if (isUnconfirmed) {
        return "Tu correo electrónico no ha sido confirmado aún. Por favor revisa tu bandeja de entrada o haz clic en el botón de abajo para reenviar el correo de confirmación.";
      }
      if (msg.includes("invalid login credentials") || msg.includes("invalid credentials") || msg.includes("correo o contraseña incorrectos")) {
        return "Correo o contraseña incorrectos. Por favor, verifica tus datos e intenta nuevamente.";
      }
    }

    if (context === "signup") {
      if (msg.includes("already registered") || msg.includes("user already exists") || msg.includes("ya registrado")) {
        return "Este correo electrónico ya está registrado. Intenta iniciar sesión o usa un correo diferente.";
      }
      if (msg.includes("weak password") || msg.includes("password should be")) {
        return "La contraseña es muy corta o débil. Debe tener al menos 6 caracteres.";
      }
    }

    return err.message || "Ocurrió un error inesperado. Por favor, vuelve a intentarlo.";
  };

  const handleResendConfirmation = async (email: string) => {
    if (!email) return;
    setIsResending(true);
    setResendSuccess("");
    setAuthError("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });
      if (error) throw error;
      setResendSuccess("¡Correo de confirmación reenviado con éxito! Por favor revisa tu bandeja de entrada.");
    } catch (err: any) {
      console.error(err);
      setAuthError(getFriendlyErrorMessage(err, "resend"));
    } finally {
      setIsResending(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");
    setResendSuccess("");
    if (!emailInput.trim() || !passwordInput || !displayNameInput.trim() || !bizNameInput.trim()) {
      setAuthError("Por favor, completa todos los campos requeridos.");
      return;
    }
    setIsAuthLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput,
          displayName: displayNameInput.trim(),
          bizName: bizNameInput.trim()
        })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        localStorage.setItem("finanzas_pro_custom_token", resData.token);
        localStorage.setItem("finanzas_pro_custom_user", JSON.stringify(resData.user));
        
        setApiAuth(resData.token, resData.user.uid, resData.user.bizName);
        setIsLocalMode(false);
        setUser({
          id: Date.now(),
          uid: resData.user.uid,
          email: resData.user.email,
          displayName: resData.user.displayName,
          bizName: resData.user.bizName
        });
        setBizName(resData.user.bizName);
        setEmailInput("");
        setPasswordInput("");
        setDisplayNameInput("");
        setBizNameInput("");
        setAuthSuccessMsg("¡Registro exitoso! Tu cuenta ha sido creada en la nube y sincronizada.");
        return;
      } else if (resData.error && resData.error.includes("ya está registrado")) {
        // If already registered, let's try to log them in instead
        console.log("Email already registered. Attempting login...");
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailInput.trim(),
            password: passwordInput
          })
        });
        const loginData = await loginResponse.json();
        if (loginResponse.ok && loginData.success) {
          localStorage.setItem("finanzas_pro_custom_token", loginData.token);
          localStorage.setItem("finanzas_pro_custom_user", JSON.stringify(loginData.user));
          
          setApiAuth(loginData.token, loginData.user.uid, loginData.user.bizName);
          setIsLocalMode(false);
          setUser({
            id: Date.now(),
            uid: loginData.user.uid,
            email: loginData.user.email,
            displayName: loginData.user.displayName,
            bizName: loginData.user.bizName
          });
          setBizName(loginData.user.bizName);
          setEmailInput("");
          setPasswordInput("");
          setDisplayNameInput("");
          setBizNameInput("");
          setAuthSuccessMsg("¡Sesión iniciada con éxito! Esta cuenta ya estaba registrada.");
          return;
        } else {
          throw new Error("Esta cuenta ya está registrada, pero la contraseña no coincide.");
        }
      } else {
        throw new Error(resData.error || "Fallo en el registro.");
      }
    } catch (err: any) {
      console.error("Custom backend registration failed:", err);
      setAuthError(err.message || "No se pudo registrar la cuenta en la nube. Por favor, intenta de nuevo.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");
    setResendSuccess("");
    if (!emailInput.trim() || !passwordInput) {
      setAuthError("Por favor, ingresa correo y contraseña.");
      return;
    }
    setIsAuthLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          password: passwordInput
        })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        localStorage.setItem("finanzas_pro_custom_token", resData.token);
        localStorage.setItem("finanzas_pro_custom_user", JSON.stringify(resData.user));
        
        setApiAuth(resData.token, resData.user.uid, resData.user.bizName);
        setIsLocalMode(false);
        setUser({
          id: Date.now(),
          uid: resData.user.uid,
          email: resData.user.email,
          displayName: resData.user.displayName,
          bizName: resData.user.bizName
        });
        setBizName(resData.user.bizName);
        setEmailInput("");
        setPasswordInput("");
        setAuthSuccessMsg("¡Sesión iniciada con éxito!");
        return;
      } else {
        // If they entered credentials but they aren't registered yet in our backup backend, let's offer auto-registration
        if (resData.error && (resData.error.includes("incorrectos") || resData.error.includes("no encontrado") || resData.error.includes("no existe"))) {
          console.log("Account not found. Automatically creating a secure cloud account for you...");
          const regResponse = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: emailInput.trim(),
              password: passwordInput,
              displayName: emailInput.trim().split("@")[0] || "Usuario",
              bizName: "Mi Taller Gastronómico"
            })
          });
          const regData = await regResponse.json();
          if (regResponse.ok && regData.success) {
            localStorage.setItem("finanzas_pro_custom_token", regData.token);
            localStorage.setItem("finanzas_pro_custom_user", JSON.stringify(regData.user));
            
            setApiAuth(regData.token, regData.user.uid, regData.user.bizName);
            setIsLocalMode(false);
            setUser({
              id: Date.now(),
              uid: regData.user.uid,
              email: regData.user.email,
              displayName: regData.user.displayName,
              bizName: regData.user.bizName
            });
            setBizName(regData.user.bizName);
            setEmailInput("");
            setPasswordInput("");
            setAuthSuccessMsg("¡Bienvenido! Hemos registrado e iniciado sesión de tu cuenta en la nube automáticamente.");
            return;
          } else {
            throw new Error(resData.error || "Correo o contraseña incorrectos.");
          }
        }
        throw new Error(resData.error || "Error al iniciar sesión.");
      }
    } catch (err: any) {
      console.error("Custom backend login failed:", err);
      setAuthError(err.message || "Fallo en la autenticación. Por favor, verifica tus datos.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setSystemError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.warn("Auth Popup blocked or failed. Degrading gracefully to Local Storage...", err);
      // Degrade to safe LocalStorage mode
      setLocalModeOnly(true);
      setIsLocalMode(true);
      setUser({ id: Date.now(), uid: "local-demo-user", displayName: "Materia Prima Demo", email: "demo@demo.com", bizName: "Mi Taller Gastronómico" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleOfflineTrial = () => {
    setLocalModeOnly(true);
    setIsLocalMode(true);
    setUser({ id: Date.now(), uid: "local-demo-user", displayName: "Materia Prima Demo", email: "demo@demo.com", bizName: "Mi Taller Gastronómico" });
    setIsAuthLoading(false);
    loadAllData();
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    } finally {
      // Clear custom auth states
      localStorage.removeItem("finanzas_pro_custom_token");
      localStorage.removeItem("finanzas_pro_custom_user");

      // Clear states completely
      setApiAuth(null, "local-demo-user", null);
      setLocalModeOnly(true);
      setIsLocalMode(true);
      setUser(null);
      setActiveTab("ventas");
      setBizName("Mi Taller Gastronómico");
      try {
        localStorage.removeItem(`es_biz_insumos_user_local-demo-user`);
        localStorage.removeItem(`es_biz_recipes_user_local-demo-user`);
        localStorage.removeItem(`es_biz_products_user_local-demo-user`);
        localStorage.removeItem(`es_biz_transactions_user_local-demo-user`);
        localStorage.removeItem(`es_biz_clients_user_local-demo-user`);
        localStorage.removeItem(`es_biz_profile_user_local-demo-user`);
      } catch (storageErr) {
        console.warn("Could not clear localStorage due to security restrictions:", storageErr);
      }
    }
  };

  const handleUpdateBizName = async () => {
    if (!newBizNameInput.trim()) return;
    try {
      await apiService.updateProfile(newBizNameInput.trim());
      setBizName(newBizNameInput.trim());
      setEditingBizName(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Auth Gateway Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <h1 className="text-xl font-bold text-slate-950 font-display">FinanzasPro v5.0</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider animate-pulse">Sincronizando sistemas y bases de datos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-indigo-600 selection:text-white">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-100 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
          <div className="text-center">
            <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-150 uppercase tracking-wider">
              Sistema Multi-inquilino 100% Aislado
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-4 font-display">FinanzasPro</h1>
            <p className="text-xs text-slate-400 mt-1">Gestor de Negocios Inteligente de Taller y Producción</p>
          </div>

          {/* Tab selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => { setAuthTab("login"); setAuthError(""); }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${authTab === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setAuthTab("register"); setAuthError(""); }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${authTab === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Registrarse
            </button>
          </div>

          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex flex-col gap-2 text-xs text-rose-600 font-medium animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
              {(authError.includes("no ha sido confirmado") || authError.toLowerCase().includes("not confirmed") || authError.toLowerCase().includes("confirm")) && emailInput.trim() && (
                <button
                  type="button"
                  disabled={isResending}
                  onClick={() => handleResendConfirmation(emailInput.trim())}
                  className="mt-1 self-start bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isResending ? "Reenviando..." : "Reenviar correo de confirmación"}
                </button>
              )}
            </div>
          )}

          {authSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs text-emerald-600 font-medium animate-in fade-in slide-in-from-top-1">
              <Check className="w-4 h-4 shrink-0 text-emerald-500 font-bold" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {resendSuccess && (
            <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl flex items-center gap-2 text-xs text-teal-700 font-medium animate-in fade-in slide-in-from-top-1">
              <Check className="w-4 h-4 shrink-0 text-teal-500 font-bold" />
              <span>{resendSuccess}</span>
            </div>
          )}

          {authTab === "login" ? (
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Ingresar a Mi Cuenta
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tu Nombre</label>
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={e => setDisplayNameInput(e.target.value)}
                    placeholder="Ej. Emilce"
                    required
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Emprendimiento</label>
                  <input
                    type="text"
                    value={bizNameInput}
                    onChange={e => setBizNameInput(e.target.value)}
                    placeholder="Ej. Mi Taller"
                    required
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all text-slate-800 placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-950 hover:bg-slate-850 active:bg-black text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all cursor-pointer"
              >
                Crear Mi Cuenta & Base de Datos Aislada
              </button>
            </form>
          )}

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-150"></div>
            <span className="px-3 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Otras Opciones</span>
            <div className="flex-1 border-t border-slate-150"></div>
          </div>

          <div className="space-y-2.5">
            {/* Google Authentication */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              Ingresar con Cuenta de Google
            </button>

            {/* Local Storage Offline Mode */}
            <button
              onClick={handleOfflineTrial}
              className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-150 text-indigo-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer border border-indigo-150"
            >
              <WifiOff className="w-4 h-4 text-indigo-500" />
              Probar sin Cuenta (Modo Local de Pruebas)
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            FinanzasPro protege la privacidad de tu negocio con aislamiento absoluto. Al registrarte se inicializa tu propia base de datos dedicada. En modo de prueba local, los datos residen únicamente en tu navegador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Resilient Mode top warning banner if in Local Storage mode */}
      {isLocalMode && (
        <div className="bg-indigo-50 text-indigo-700 border-b border-indigo-100/50 px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0 text-indigo-500" />
          <span>Estás operando en <b>Modo Almacenamiento Local Seguro</b>. Tus registros se conservarán únicamente en este navegador.</span>
          <button
            onClick={handleGoogleSignIn}
            className="underline text-[10px] hover:text-indigo-900 font-bold uppercase tracking-wider ml-1 cursor-pointer"
          >
            Sincronizar con la Nube (Google)
          </button>
        </div>
      )}

      {!isLocalMode && hasLocalDataToMigrate && (
        <div className="bg-amber-50 text-amber-900 border-b border-amber-200 px-4 py-3 text-center text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-center gap-2">
            <CloudLightning className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
            <span>⚠️ Se detectaron datos locales sin sincronizar (ventas, despensa de insumos, taller de fabricación, productos finales y georreferencia). ¿Deseas migrarlos a tu base de datos en la nube?</span>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={handleMigrateData}
              disabled={isMigrating}
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold py-1 px-3.5 rounded-lg text-[10px] transition-all cursor-pointer uppercase tracking-wider shadow-xs disabled:opacity-50"
            >
              {isMigrating ? "Migrando..." : "📤 Migrar Datos"}
            </button>
            <button
              onClick={handleDismissMigration}
              className="text-amber-600 hover:text-amber-800 text-[10px] font-bold uppercase tracking-wider px-2 cursor-pointer"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {migrationSuccess && (
        <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-4 py-3 text-center text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
          <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
          <span>{migrationSuccess}</span>
          <button
            onClick={() => setMigrationSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 text-[10px] font-bold uppercase ml-2 underline cursor-pointer"
          >
            Aceptar
          </button>
        </div>
      )}

      {/* Main Core Header Bar */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-[100] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md font-display font-black text-lg tracking-tight">
              FP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                {editingBizName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newBizNameInput}
                      onChange={e => setNewBizNameInput(e.target.value)}
                      placeholder="Ej. Mi Taller"
                      className="px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800"
                    />
                    <button
                      onClick={handleUpdateBizName}
                      className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase">{bizName}</h1>
                    <button
                      onClick={() => {
                        setNewBizNameInput(bizName);
                        setEditingBizName(true);
                      }}
                      className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Editar nombre del taller"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-medium">FinanzasPro v5.0 - Gestor Inteligente</p>
            </div>
          </div>

          {/* User Profile dropdown panel */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center uppercase shadow">
                {user.displayName ? user.displayName.slice(0, 2) : "EM"}
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">{user.displayName || "Emprendedor"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-150 shadow-xl py-2 z-[9999] animate-in fade-in slide-in-from-top-1">
                <div className="px-4 py-2 border-b border-slate-50 text-xs">
                  <p className="font-bold text-slate-900 truncate">{user.displayName || "Invitado"}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{user.email || "modo-offline@demo.com"}</p>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/50 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión / Salir
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Navigation upper tab control */}
      <nav className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
            
            {/* Nav tabs */}

            <button
              onClick={() => setActiveTab("ventas")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "ventas" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Ventas
            </button>

            <button
              onClick={() => setActiveTab("insumos")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "insumos" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <Layers className="w-3.5 h-3.5" />
              Despensa Insumos
            </button>

            <button
              onClick={() => setActiveTab("fabricacion")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "fabricacion" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Taller Fabricación
            </button>

            <button
              onClick={() => setActiveTab("productos")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "productos" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <Package className="w-3.5 h-3.5" />
              Productos Finales
            </button>

            <button
              onClick={() => setActiveTab("mapa")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${activeTab === "mapa" ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Georreferencia
            </button>

          </div>
        </div>
      </nav>

      {/* Main Content Stage View container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* System level warning banner if any database offline */}
        {systemError && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>⚠️ {systemError} Operando provisionalmente en almacenamiento local temporal.</span>
          </div>
        )}

        {/* Dynamic Route views resolver */}
        <div className="animate-in fade-in duration-200">


          {activeTab === "ventas" && (
            <Ventas
              products={products}
              transactions={transactions}
              onSaleComplete={loadAllData}
            />
          )}

          {activeTab === "insumos" && (
            <Insumos
              insumos={insumos}
              onInsumosChange={loadAllData}
            />
          )}

          {activeTab === "fabricacion" && (
            <Fabricacion
              insumos={insumos}
              recipes={recipes}
              onFabricacionComplete={loadAllData}
            />
          )}

          {activeTab === "productos" && (
            <ProductosCatalog
              products={products}
              setProducts={setProducts}
              onProductsChange={loadAllData}
            />
          )}

          {activeTab === "mapa" && (
            <MapaClientes
              clients={clients}
              onClientAdded={loadAllData}
              onClientDeleted={loadAllData}
            />
          )}
        </div>

      </main>

      {/* Humble aesthetic footer */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400">
        <p>© 2026 FinanzasPro v5.0 — Diseñado para el taller productivo y el emprendimiento artesanal.</p>
        <p className="text-[9px] mt-1 font-mono text-slate-300">Base de datos PostgreSQL georreferenciada con OpenStreetMap y AI Studio.</p>
      </footer>

    </div>
  );
}
