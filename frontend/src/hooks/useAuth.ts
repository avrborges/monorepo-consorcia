// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";

import {
  getUsuarioSesion,
  getToken,
  limpiarSesion,
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
   * Cierra la sesión (limpia localStorage) y redirige a /login.
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
 * Se sincroniza automáticamente entre pestañas del navegador
 * escuchando el evento `storage` de la Web API.
 *
 * @example
 *   const { usuario, rol, esAdmin, logout } = useAuth();
 *   if (esAdmin) { ... }
 *   <button onClick={logout}>Cerrar sesión</button>
 */
export function useAuth(): UseAuthResult {
  // Estado reactivo inicializado desde localStorage
  const [usuario, setUsuario] = useState<Persona | null>(() => getUsuarioSesion());
  const [token, setTokenState] = useState<string | null>(() => getToken());

  /**
   * Sincroniza el estado con localStorage.
   * Se dispara al abrir/cerrar sesión en otra pestaña del navegador.
   */
  useEffect(() => {
    const sincronizar = () => {
      setUsuario(getUsuarioSesion());
      setTokenState(getToken());
    };

    window.addEventListener("storage", sincronizar);
    return () => window.removeEventListener("storage", sincronizar);
  }, []);

  /**
   * Cierra la sesión limpiamente y redirige a /login.
   *
   * Uso: <button onClick={logout}>Cerrar sesión</button>
   */
  const logout = useCallback(() => {
    limpiarSesion();
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