// src/lib/session.ts

/**
 * Capa de acceso a la sesión persistente en localStorage.
 *
 * Este módulo es la ÚNICA fuente de verdad para leer/escribir/limpiar
 * la sesión del usuario. Todos los componentes, hooks e interceptors
 * deben consumir estos helpers en vez de acceder a localStorage directo.
 *
 * ⚠️ Este archivo NO usa React. Es JavaScript puro para poder consumirse
 * desde interceptors, scripts y tests unitarios sin JSDOM.
 */

import type { Persona, Rol } from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const TOKEN_KEY = "token";
const USER_KEY = "user";

/* ============================================================
 * TOKEN (JWT)
 * ============================================================ */

/**
 * Obtiene el token JWT actual desde localStorage.
 * Retorna null si no hay sesión activa.
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Guarda el token JWT en localStorage.
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/* ============================================================
 * USUARIO (Persona)
 * ============================================================ */

/**
 * Obtiene el usuario logueado desde localStorage.
 * Retorna null si no hay sesión o si los datos están corruptos.
 *
 * @returns El objeto `Persona` completo, o `null` si no hay sesión válida.
 */
export const getUsuarioSesion = (): Persona | null => {
  try {
    const userString = localStorage.getItem(USER_KEY);
    if (!userString) return null;
    return JSON.parse(userString) as Persona;
  } catch {
    return null;
  }
};

/**
 * Guarda el usuario en localStorage.
 * Se serializa como JSON automáticamente.
 */
export const setUsuarioSesion = (usuario: Persona): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
};

/* ============================================================
 * SESIÓN COMPLETA
 * ============================================================ */

/**
 * Guarda toda la sesión de una vez (token + usuario).
 * Uso típico: después de un login exitoso.
 */
export const guardarSesion = (token: string, usuario: Persona): void => {
  setToken(token);
  setUsuarioSesion(usuario);
};

/**
 * Limpia toda la sesión de localStorage.
 * Uso típico: logout manual o interceptor de 401.
 */
export const limpiarSesion = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/* ============================================================
 * CONSULTAS DE ESTADO
 * ============================================================ */

/**
 * Determina si hay una sesión activa (token presente).
 * NO valida si el token expiró — eso lo maneja el backend + interceptor 401.
 */
export const estaAutenticado = (): boolean => {
  return Boolean(getToken());
};

/**
 * Retorna el rol del usuario logueado, o null si no hay sesión.
 */
export const getRolSesion = (): Rol | null => {
  return getUsuarioSesion()?.role ?? null;
};

/**
 * Verifica si el usuario logueado tiene alguno de los roles permitidos.
 *
 * @example
 *   if (tieneRolPermitido(["admin", "superadmin"])) { ... }
 */
export const tieneRolPermitido = (rolesPermitidos: Rol[]): boolean => {
  const rol = getRolSesion();
  if (!rol) return false;
  return rolesPermitidos.includes(rol);
};

/* ============================================================
 * HELPERS DE FORMATEO
 * ============================================================ */

/**
 * Formatea el rol para mostrarlo en la UI (capitaliza + traduce si aplica).
 *
 * @example
 *   formatearRol("superadmin") // "Superadmin"
 *   formatearRol("consejo")    // "Consejo"
 */
export const formatearRol = (rol: Rol): string => {
  const traducciones: Record<Rol, string> = {
    superadmin: "Superadmin",
    admin: "Admin",
    consejo: "Consejo",
    propietario: "Propietario",
    inquilino: "Inquilino",
  };
  return traducciones[rol] || rol;
};