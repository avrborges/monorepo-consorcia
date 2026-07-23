// src/hooks/useAuth.ts
import { useState, useCallback } from "react";

import {
  getUsuarioSesion,
  getToken,
  limpiarSesion,
  limpiarSesionPrevia,
} from "@/lib/session";

import type { Persona, Rol } from "@shared/types";

/* ============================================================
 * TIPOS
 * ============================================================ */

/**
 * Estado y acciones expuestos por el hook `useAuth`.
 */
export interface UseAuthResult {
  /** El usuario logueado, o null si no hay sesión */
  usuario: Persona | null;
  /** Rol del usuario logueado, o null si no hay sesión */
  rol: Rol | null;
  /** Token JWT actual, o null si no hay sesión */
  token: string | null;
  /** true si hay una sesión activa (token presente) */
  isAutenticado: boolean;
  /** true si el usuario tiene rol admin o superadmin */
  esAdmin: boolean;
  /** true si el usuario tiene rol superadmin */
  esSuperAdmin: boolean;
  /**
   * Verifica si el usuario logueado tiene alguno de los roles permitidos.
   * @example tieneRol(["admin", "superadmin"])
   */
  tieneRol: (rolesPermitidos: Rol[]) => boolean;
  /**
   * Cierra la sesión (limpia sessionStorage + flag) y redirige a /login.
   */
  logout: () => void;
}

/* ============================================================
 * HOOK
 * ============================================================ */

/**
 * Hook reactivo que expone el estado de sesión del usuario.
 *
 * Consume los helpers puros de `lib/session.ts` y provee estado
 * reactivo listo para usar en componentes React.
 *
 * 🔐 SEGURIDAD: La sesión se persiste en sessionStorage (no localStorage),
 * lo que significa que se limpia automáticamente al cerrar la pestaña.
 *
 * ⚠️ NOTA: A partir del cambio a sessionStorage, cada pestaña tiene su
 * propia sesión independiente. El multi-tab sync (evento `storage`) queda
 * desactivado por diseño del navegador — sessionStorage no dispara ese
 * evento cross-tab.
 *
 * @example
 *   const { usuario, rol, esAdmin, logout } = useAuth();
 *   if (esAdmin) { ... }
 *   <button onClick={logout}>Cerrar sesión</button>
 */
export function useAuth(): UseAuthResult {
  // Estado reactivo inicializado desde sessionStorage
  const [usuario, setUsuario] = useState<Persona | null>(() => getUsuarioSesion());
  const [token, setTokenState] = useState<string | null>(() => getToken());

  /**
   * Cierra la sesión limpiamente y redirige a /login.
   *
   * Además de limpiar la sesión activa, borra el flag "had_session" para que
   * si el usuario vuelve a entrar a `/`, vea la Landing/SplashScreen como
   * primera visita (empieza de cero).
   */
  const logout = useCallback(() => {
    limpiarSesion();
    limpiarSesionPrevia();
    setUsuario(null);
    setTokenState(null);
    window.location.href = "/login";
  }, []);

  /**
   * Verifica si el usuario logueado tiene alguno de los roles permitidos.
   */
  const tieneRol = useCallback(
    (rolesPermitidos: Rol[]): boolean => {
      if (!usuario) return false;
      return rolesPermitidos.includes(usuario.role);
    },
    [usuario]
  );

  const rol = usuario?.role ?? null;
  const isAutenticado = Boolean(token);
  const esAdmin = rol === "admin" || rol === "superadmin";
  const esSuperAdmin = rol === "superadmin";

  return {
    usuario,
    rol,
    token,
    isAutenticado,
    esAdmin,
    esSuperAdmin,
    tieneRol,
    logout,
  };
}