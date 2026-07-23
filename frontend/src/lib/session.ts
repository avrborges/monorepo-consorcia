// src/lib/session.ts

/**
 * Capa de acceso a la sesión del usuario.
 *
 * Este módulo es la ÚNICA fuente de verdad para leer/escribir/limpiar
 * la sesión del usuario. Todos los componentes, hooks e interceptors
 * deben consumir estos helpers en vez de acceder a los storages directo.
 *
 * 🔐 SEGURIDAD (2 storages con propósitos distintos):
 *
 * - sessionStorage: guarda el token JWT y el usuario. Se limpia automáticamente
 *   al cerrar la pestaña del navegador. Cumple el requerimiento de que en PCs
 *   compartidas la sesión no persista entre reaperturas.
 *
 * - localStorage: guarda un flag "had_session" persistente para que el
 *   RootHandler pueda distinguir entre:
 *     · Primera visita del usuario → mostrar Landing/SplashScreen
 *     · Usuario que cerró pestaña sin logout → redirect directo a /login
 *   El flag se limpia solo con logout manual.
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
const HAD_SESSION_KEY = "consorcia_had_session";

/* ============================================================
 * TOKEN (JWT) — se guarda en sessionStorage
 * ============================================================ */

export const getToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

/* ============================================================
 * USUARIO (Persona) — se guarda en sessionStorage
 * ============================================================ */

export const getUsuarioSesion = (): Persona | null => {
  try {
    const userString = sessionStorage.getItem(USER_KEY);
    if (!userString) return null;
    return JSON.parse(userString) as Persona;
  } catch {
    return null;
  }
};

export const setUsuarioSesion = (usuario: Persona): void => {
  sessionStorage.setItem(USER_KEY, JSON.stringify(usuario));
};

/* ============================================================
 * FLAG "HAD SESSION" — se guarda en localStorage (persistente)
 * ============================================================ */

/**
 * Marca que el usuario tuvo una sesión activa en este dispositivo.
 * Se llama automáticamente desde `guardarSesion` después de un login exitoso.
 */
export const marcarSesionPrevia = (): void => {
  try {
    localStorage.setItem(HAD_SESSION_KEY, "true");
  } catch {
    /* silent - modo incógnito puede fallar */
  }
};

/**
 * Limpia el flag de sesión previa.
 * Se llama al hacer logout manual (para que la próxima vez que entre
 * a `/` vea la Landing/SplashScreen como primera visita).
 */
export const limpiarSesionPrevia = (): void => {
  try {
    localStorage.removeItem(HAD_SESSION_KEY);
  } catch {
    /* silent */
  }
};

/**
 * Determina si el usuario tuvo sesión previa en este dispositivo.
 * Uso: el RootHandler decide si mostrar landing/splash o redirigir a /login.
 */
export const tuvoSesionPrevia = (): boolean => {
  try {
    return localStorage.getItem(HAD_SESSION_KEY) === "true";
  } catch {
    return false;
  }
};

/* ============================================================
 * SESIÓN COMPLETA
 * ============================================================ */

/**
 * Guarda toda la sesión de una vez (token + usuario + flag persistente).
 * Uso típico: después de un login exitoso.
 */
export const guardarSesion = (token: string, usuario: Persona): void => {
  setToken(token);
  setUsuarioSesion(usuario);
  marcarSesionPrevia();
};

/**
 * Limpia la sesión de sessionStorage (token + usuario).
 * NO limpia el flag "had_session" — eso se hace explícitamente en el logout manual.
 *
 * Uso típico: interceptor de 401 (sesión expiró en backend).
 */
export const limpiarSesion = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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