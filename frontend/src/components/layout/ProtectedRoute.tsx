// src/components/layout/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

// 🎯 Helpers de sesión centralizados (Fase 4)
import {
  getToken,
  limpiarSesion,
  tieneRolPermitido,
  esSuperAdminGlobal, // 🆕 M6.4b — gating por rol global
} from "@/lib/session";

// 🎯 Tipos de dominio compartidos entre backend y frontend
import type { Rol } from "@shared/types";

/* ============================================================
 * TIPOS
 * ============================================================ */

interface ProtectedRouteProps {
  /**
   * Roles permitidos para acceder a la ruta protegida.
   * Si no se especifica, cualquier usuario autenticado tiene acceso.
   *
   * @example
   *   <ProtectedRoute rolesPermitidos={["admin", "superadmin"]} />
   */
  rolesPermitidos?: Rol[];

  /**
   * 🆕 M6.4b — Si es true, la ruta es EXCLUSIVA del super_admin_global.
   * Se valida contra el rol GLOBAL (rolGlobal), no contra el role de
   * membresía. Útil para el ABM de consorcios.
   *
   * @example
   *   <ProtectedRoute requiereSuperGlobal />
   */
  requiereSuperGlobal?: boolean;
}

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Valida el JWT en el cliente:
 *  - Estructura correcta (3 partes separadas por punto)
 *  - Payload parseable
 *  - `exp` en el futuro (si está presente)
 *
 * ⚠️ Esta validación es solo defensiva del lado del cliente.
 *    El backend siempre valida en cada request vía middleware.
 */
function esTokenValido(token: string | null): boolean {
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));

    if (payload.exp) {
      const ahoraSegundos = Date.now() / 1000;
      return payload.exp > ahoraSegundos;
    }

    // Si el token no tiene expiración, lo consideramos válido
    return true;
  } catch (error) {
    console.error("Error al validar el token de sesión:", error);
    return false;
  }
}

/* ============================================================
 * COMPONENTE
 * ============================================================ */

/**
 * Guard de rutas protegidas.
 *
 * Verifica:
 *  1. **Autenticación**: token válido y no expirado
 *  2. **Autorización**: si `rolesPermitidos` está definido, valida el rol del usuario;
 *     si `requiereSuperGlobal` es true, valida que sea super_admin_global.
 *
 * Si falla la autenticación:
 *  - Limpia la sesión
 *  - Guarda la ruta actual en `sessionStorage` para volver post-login
 *  - Redirige a `/login`
 *
 * Si falla la autorización:
 *  - Redirige al índice del dashboard (sin limpiar sesión)
 */
export default function ProtectedRoute({
  rolesPermitidos,
  requiereSuperGlobal = false,
}: ProtectedRouteProps) {
  const token = getToken();
  const location = useLocation();

  const autenticado = esTokenValido(token);

  // 🎯 Efecto lateral: si el token es inválido, limpiar sesión y guardar ruta destino
  useEffect(() => {
    if (!autenticado && token !== null) {
      // Solo limpiamos si había un token — evita loops innecesarios en usuarios sin sesión
      limpiarSesion();

      // Preservamos la ruta original para post-login redirect
      const rutaActual = location.pathname + location.search;
      if (!rutaActual.startsWith("/login") && !rutaActual.startsWith("/activar-cuenta")) {
        try {
          sessionStorage.setItem("redirect_after_login", rutaActual);
        } catch {
          /* silent */
        }
      }
    }
  }, [autenticado, token, location]);

  /* ------------------------------------------------------------
   * 1. Verificación de autenticación
   * ------------------------------------------------------------ */
  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  /* ------------------------------------------------------------
   * 2. Autorización EXCLUSIVA de super_admin_global (M6.4b)
   * ------------------------------------------------------------ */
  if (requiereSuperGlobal) {
    if (!esSuperAdminGlobal()) {
      // No es super global → al índice del dashboard.
      return <Navigate to="/dashboard" replace />;
    }
  }

  /* ------------------------------------------------------------
   * 3. Verificación de autorización por rol
   * ------------------------------------------------------------ */
  if (rolesPermitidos && rolesPermitidos.length > 0) {
    if (!tieneRolPermitido(rolesPermitidos)) {
      // No tiene el rol necesario → mandamos al índice del dashboard
      // (donde sí puede acceder — Overview no requiere rol específico)
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}
