import os
import sys
from typing import List, Dict, Any, Optional
from supabase import create_client, Client

# ==========================================
# CONFIGURACIÓN DEL CLIENTE DE SUPABASE
# ==========================================

# Se obtienen las credenciales de variables de entorno con fallback a las provistas por el usuario
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://kplblyjyxbtwugpmdujl.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_N714O3C1hPp9oP4Hxx1lGQ_HIW7clGZ")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Las variables de entorno SUPABASE_URL o SUPABASE_KEY no están configuradas.", file=sys.stderr)
    # No detenemos la ejecución inmediatamente para permitir que el script se cargue,
    # pero avisamos al desarrollador.

# Inicialización del cliente de Supabase
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error crítico al inicializar el cliente de Supabase: {e}", file=sys.stderr)
    supabase = None


# ==========================================
# 1. CREAR UN NUEVO USUARIO
# ==========================================
def crear_usuario(nombre: str, email: str, password_hash: Optional[str] = None, rol: str = "admin") -> Dict[str, Any]:
    """
    Inserta un nuevo usuario en la tabla 'usuarios'.
    
    :param nombre: Nombre completo o razón social del usuario.
    :param email: Correo electrónico único.
    :param password_hash: Hash de la contraseña del usuario.
    :param rol: Rol del usuario (por defecto 'admin', alternativo 'empleado').
    :return: El registro del usuario recién creado en formato JSON/dict.
    """
    if not supabase:
        raise ConnectionError("El cliente de Supabase no está inicializado.")
    
    try:
        response = supabase.table("usuarios").insert({
            "nombre": nombre,
            "email": email.strip().lower(),
            "password_hash": password_hash,
            "rol": rol
        }).execute()
        
        # En supabase-py v2, response.data contiene la lista de elementos afectados/insertados
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            raise ValueError("No se recibieron datos del usuario registrado.")
            
    except Exception as err:
        print(f"[Error] No se pudo crear el usuario {email}: {err}", file=sys.stderr)
        raise err


# ==========================================
# 2. REGISTRAR UNA VENTA Y DETALLES (TRANSACCIÓN SEGURA)
# ==========================================
def registrar_venta_con_detalles(
    usuario_id: str,
    total: float,
    ganancia_neta: float,
    detalles: List[Dict[str, Any]],
    cliente_id: Optional[str] = None,
    metodo_pago: str = "Efectivo",
    estado: str = "completada"
) -> Dict[str, Any]:
    """
    Registra una venta en la tabla 'ventas' e inserta atómicamente sus detalles 
    en la tabla 'detalles_venta'. 
    
    Dado que las llamadas HTTP REST de Supabase no soportan "BEGIN TRANSACTION" tradicionales
    de forma directa a nivel de SDK de cliente, implementamos una estrategia segura de dos fases
    con reversión manual (Rollback) en caso de fallo, y documentamos abajo cómo hacerlo a nivel base
    de datos mediante RPC (Remote Procedure Call) para máxima atomicidad.
    
    :param usuario_id: UUID del usuario dueño de la venta.
    :param total: Monto total facturado.
    :param ganancia_neta: Ganancia neta calculada (Total - Costo acumulado).
    :param detalles: Lista de diccionarios, cada uno representando un producto comprado.
                     Ejemplo: [{'producto_id': 'UUID', 'cantidad': 2, 'precio_unitario': 150.00, 'subtotal': 300.00}]
    :param cliente_id: UUID opcional del cliente.
    :param metodo_pago: Método de pago ('Efectivo', 'Transferencia', etc.).
    :param estado: Estado del pedido ('completada', 'pendiente', 'cancelada').
    :return: Un diccionario con el registro de la 'venta' y la lista de 'detalles' creados.
    """
    if not supabase:
        raise ConnectionError("El cliente de Supabase no está inicializado.")
        
    if not detalles or len(detalles) == 0:
        raise ValueError("Se requiere al menos un detalle de producto para registrar la venta.")

    venta_creada = None
    detalles_insertados = []
    
    try:
        # FASE 1: Registrar el encabezado de la venta
        payload_venta = {
            "usuario_id": usuario_id,
            "cliente_id": cliente_id,
            "total": total,
            "ganancia_neta": ganancia_neta,
            "metodo_pago": metodo_pago,
            "estado": estado
        }
        
        res_venta = supabase.table("ventas").insert(payload_venta).execute()
        
        if not res_venta.data or len(res_venta.data) == 0:
            raise RuntimeError("La venta no pudo ser creada en la base de datos.")
            
        venta_creada = res_venta.data[0]
        venta_id = venta_creada["id"]
        
        # FASE 2: Preparar y registrar masivamente los detalles de la venta vinculados a la venta_id
        payload_detalles = []
        for det in detalles:
            payload_detalles.append({
                "venta_id": venta_id,
                "producto_id": det["producto_id"],
                "cantidad": int(det["cantidad"]),
                "precio_unitario": float(det["precio_unitario"]),
                "subtotal": float(det["subtotal"])
            })
            
        res_detalles = supabase.table("detalles_venta").insert(payload_detalles).execute()
        detalles_insertados = res_detalles.data
        
        return {
            "success": True,
            "venta": venta_creada,
            "detalles": detalles_insertados
        }
        
    except Exception as err:
        print(f"[Error en Transacción] Ocurrió un error al registrar la venta: {err}", file=sys.stderr)
        
        # ROLLBACK MANUAL: Si se creó la venta pero fallaron los detalles, eliminamos la venta huérfana
        if venta_creada and "id" in venta_creada:
            print(f"[Rollback] Deshaciendo la venta huérfana con ID {venta_creada['id']}...", file=sys.stderr)
            try:
                supabase.table("ventas").delete().eq("id", venta_creada["id"]).execute()
                print("[Rollback] Venta eliminada con éxito para mantener integridad.", file=sys.stderr)
            except Exception as rollback_err:
                print(f"[Crítico] Falló el rollback de la venta {venta_creada['id']}: {rollback_err}", file=sys.stderr)
                
        raise err


# ==========================================
# 3. CONSULTAR INSUMOS POR USUARIO ACTUAL
# ==========================================
def obtener_insumos_por_usuario(usuario_id: str) -> List[Dict[str, Any]]:
    """
    Obtiene todos los insumos y materias primas de un usuario específico.
    
    :param usuario_id: UUID del usuario dueño de los insumos.
    :return: Lista de insumos registrados de ese usuario.
    """
    if not supabase:
        raise ConnectionError("El cliente de Supabase no está inicializado.")
        
    try:
        response = supabase.table("insumos") \
            .select("*") \
            .eq("usuario_id", usuario_id) \
            .order("nombre", desc=False) \
            .execute()
            
        return response.data if response.data is not None else []
        
    except Exception as err:
        print(f"[Error] Falló la consulta de insumos para el usuario {usuario_id}: {err}", file=sys.stderr)
        raise err


# ==========================================
# 4. REGISTRAR MOVIMIENTO DE INVENTARIO
# ==========================================
def registrar_movimiento_inventario(
    usuario_id: str,
    tipo_item: str,
    item_id: str,
    tipo_movimiento: str,
    cantidad: float,
    motivo: Optional[str] = None
) -> Dict[str, Any]:
    """
    Inserta un nuevo movimiento en la tabla 'movimientos_inventario' para auditar 
    entradas, salidas, mermas o producción de stock.
    
    :param usuario_id: UUID del usuario que realiza la acción.
    :param tipo_item: Tipo de elemento, debe ser 'producto' o 'insumo'.
    :param item_id: UUID del insumo o producto afectado.
    :param tipo_movimiento: Dirección del flujo ('entrada', 'salida', 'fabricacion', 'ajuste').
    :param cantidad: Cantidad numérica afectada en formato decimal/float.
    :param motivo: Descripción o justificación textual opcional del movimiento.
    :return: El registro insertado.
    """
    if not supabase:
        raise ConnectionError("El cliente de Supabase no está inicializado.")
        
    # Validación simple de negocio
    tipo_item_clean = tipo_item.strip().lower()
    tipo_mov_clean = tipo_movimiento.strip().lower()
    
    if tipo_item_clean not in ["producto", "insumo"]:
        raise ValueError("tipo_item debe ser estrictamente 'producto' o 'insumo'.")
        
    if tipo_mov_clean not in ["entrada", "salida", "fabricacion", "ajuste"]:
        raise ValueError("tipo_movimiento debe ser estrictamente 'entrada', 'salida', 'fabricacion' o 'ajuste'.")

    try:
        payload = {
            "usuario_id": usuario_id,
            "tipo_item": tipo_item_clean,
            "item_id": item_id,
            "tipo_movimiento": tipo_mov_clean,
            "cantidad": cantidad,
            "motivo": motivo
        }
        
        response = supabase.table("movimientos_inventario").insert(payload).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            raise ValueError("No se recibieron datos confirmando la inserción del movimiento.")
            
    except Exception as err:
        print(f"[Error] Falló el registro de movimiento para {tipo_item} (ID: {item_id}): {err}", file=sys.stderr)
        raise err


# ==========================================
# EJEMPLO DE IMPLEMENTACIÓN DE PRUEBA
# ==========================================
if __name__ == "__main__":
    print("=== FinanzasPro: Modulo de Conexión de Base de Datos Py ===")
    print(f"URL del Servidor: {SUPABASE_URL}")
    print("Para probar este archivo, instala las dependencias utilizando:")
    print("   pip install supabase dotenv-python")
    print("Y ejecuta en tu consola:")
    print("   python database.py")
    
    # Ejemplo de uso conceptual:
    # 
    # try:
    #     # 1. Crear un usuario de prueba
    #     usr = crear_usuario(
    #         nombre="Emilce Torres", 
    #         email="emilce_test@finanzaspro.com", 
    #         password_hash="pbkdf2:sha256:...", 
    #         rol="admin"
    #     )
    #     uid = usr["id"]
    #     print(f"Usuario registrado exitosamente con ID: {uid}")
    #
    #     # 2. Consultar insumos
    #     insumos = obtener_insumos_por_usuario(uid)
    #     print(f"Insumos del usuario: {len(insumos)} encontrados.")
    #
    #     # 3. Registrar venta de prueba con rollback automático si algo falla
    #     compra = registrar_venta_con_detalles(
    #         usuario_id=uid,
    #         total=2500.00,
    #         ganancia_neta=1200.00,
    #         detalles=[
    #             {"producto_id": "8e27a9a6-abcd-1234-836d-20d0e065f3bc", "cantidad": 2, "precio_unitario": 1250.00, "subtotal": 2500.00}
    #         ],
    #         metodo_pago="Transferencia"
    #     )
    #     print("Venta registrada perfectamente:", compra)
    #
    # except Exception as e:
    #     print("Ocurrió un error controlado durante las pruebas:", e)
