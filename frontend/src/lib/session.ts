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
 * - sessionStorage: guarda el token JWT, el usuario y el contexto de
 *   consorcio activo. Se limpia automáticamente al cerrar la pestaña.
 *
 * - localStorage: guarda un flag "had_session" persistente para el RootHandler.
 *
 * ⚠️ Este archivo NO usa React. Es JavaScript puro.
 */

import type { Persona, Rol, RolMembresia, RolGlobal } from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const TOKEN_KEY = "token";
const USER_KEY = "user";
const HAD_SESSION_KEY = "consorcia_had_session";

// 🆕 Multi-tenant (Fase M3.2)
const ACTIVE_CONSORCIO_KEY = "consorcia_active_consorcio";
const ROLE_EN_CONSORCIO_KEY = "consorcia_role_en_consorcio";
const ROL_GLOBAL_KEY = "consorcia_rol_global";
const SELECCION_PENDIENTE_KEY = "consorcia_seleccion_pendiente";

/* ============================================================
 * TIPOS MULTI-TENANT (Fase M3.2)
 * ============================================================ */

/**
 * Datos mínimos del consorcio activo, guardados tras el login/cambio.
 */
export interface ConsorcioActivoSesion {
  _id: string;
  nombre: string;
  direccion: string;
}

/**
 * Extras de sesión que acompañan al token en el flujo multi-tenant.
 */
export interface SesionExtras {
  activeConsorcio: ConsorcioActivoSesion;
  roleEnConsorcioActivo: RolMembresia;
  rolGlobal: RolGlobal;
}

/**
 * Membresía disponible en el selector post-login (shape simplificado
 * para no depender del tipo completo de shared en esta capa).
 */
export interface MembresiaSeleccion {
  _id: string;
  role: RolMembresia;
  esDefault: boolean;
  consorcio: {
    _id: string;
    nombre: string;
    direccion: string;
  };
}

/**
 * Payload que se guarda temporalmente cuando el login devuelve
 * "requiereSeleccionConsorcio" (casos C1/D1). La pantalla de selección
 * lo lee para mostrar las opciones.
 */
export interface SeleccionPendiente {
  user: Persona;
  rolGlobal: RolGlobal;
  membresiasDisponibles: MembresiaSeleccion[];
}

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
 * CONSORCIO ACTIVO (multi-tenant) — se guarda en sessionStorage
 * ============================================================ */

/**
 * Guarda el contexto de consorcio activo (tras login o cambio de consorcio).
 */
export const setConsorcioActivoSesion = (extras: SesionExtras): void => {
  try {
    sessionStorage.setItem(ACTIVE_CONSORCIO_KEY, JSON.stringify(extras.activeConsorcio));
    sessionStorage.setItem(ROLE_EN_CONSORCIO_KEY, extras.roleEnConsorcioActivo);
    sessionStorage.setItem(ROL_GLOBAL_KEY, extras.rolGlobal);
  } catch {
    /* silent */
  }
};

/**
 * 🆕 M6.0 — Actualiza SOLO los datos del consorcio activo cacheado
 * (nombre / dirección), preservando roles y demás contexto de sesión.
 *
 * Se usa tras editar los datos del consorcio en "Configuración", para que
 * el topbar (SelectorConsorcio) y el resto de pantallas reflejen el nombre
 * nuevo sin necesidad de re-loguear.
 */
export const actualizarConsorcioActivoSesion = (
  datos: Partial<Pick<ConsorcioActivoSesion, "nombre" | "direccion">>
): void => {
  try {
    const actual = getConsorcioActivo();
    if (!actual) return;

    const actualizado: ConsorcioActivoSesion = {
      ...actual,
      ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
      ...(datos.direccion !== undefined ? { direccion: datos.direccion } : {}),
    };

    sessionStorage.setItem(ACTIVE_CONSORCIO_KEY, JSON.stringify(actualizado));
  } catch {
    /* silent */
  }
};

/**
 * Retorna el consorcio activo actual, o null si no hay.
 */
export const getConsorcioActivo = (): ConsorcioActivoSesion | null => {
  try {
    const raw = sessionStorage.getItem(ACTIVE_CONSORCIO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsorcioActivoSesion;
  } catch {
    return null;
  }
};

/**
 * Retorna el rol del usuario EN EL CONSORCIO ACTIVO, o null si no hay.
 * En multi-tenant, este es el rol "efectivo" para permisos de UI.
 */
export const getRoleEnConsorcioActivo = (): RolMembresia | null => {
  const raw = sessionStorage.getItem(ROLE_EN_CONSORCIO_KEY);
  return (raw as RolMembresia) || null;
};

/**
 * Retorna el rol GLOBAL del usuario ("user" | "super_admin_global"), o null.
 */
export const getRolGlobal = (): RolGlobal | null => {
  const raw = sessionStorage.getItem(ROL_GLOBAL_KEY);
  return (raw as RolGlobal) || null;
};

/**
 * true si el usuario es super_admin_global.
 */
export const esSuperAdminGlobal = (): boolean => {
  return getRolGlobal() === "super_admin_global";
};

/* ============================================================
 * SELECCIÓN PENDIENTE DE CONSORCIO (casos C1/D1)
 * ============================================================ */

/**
 * Guarda temporalmente los datos necesarios para la pantalla de selección
 * de consorcio (cuando el login devuelve requiereSeleccionConsorcio).
 */
export const guardarSeleccionPendiente = (data: SeleccionPendiente): void => {
  try {
    sessionStorage.setItem(SELECCION_PENDIENTE_KEY, JSON.stringify(data));
  } catch {
    /* silent */
  }
};

/**
 * Lee los datos de selección pendiente (usado por la pantalla SeleccionConsorcio).
 * Retorna null si no hay selección pendiente.
 */
export const getSeleccionPendiente = (): SeleccionPendiente | null => {
  try {
    const raw = sessionStorage.getItem(SELECCION_PENDIENTE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SeleccionPendiente;
  } catch {
    return null;
  }
};

/**
 * Limpia los datos de selección pendiente (tras elegir un consorcio).
 */
export const limpiarSeleccionPendiente = (): void => {
  try {
    sessionStorage.removeItem(SELECCION_PENDIENTE_KEY);
  } catch {
    /* silent */
  }
};

/* ============================================================
 * FLAG "HAD SESSION" — se guarda en localStorage (persistente)
 * ============================================================ */

export const marcarSesionPrevia = (): void => {
  try {
    localStorage.setItem(HAD_SESSION_KEY, "true");
  } catch {
    /* silent - modo incógnito puede fallar */
  }
};

export const limpiarSesionPrevia = (): void => {
  try {
    localStorage.removeItem(HAD_SESSION_KEY);
  } catch {
    /* silent */
  }
};

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
 * Guarda toda la sesión de una vez (token + usuario + flag + contexto de consorcio).
 *
 * 🆕 Fase M3.2: el 3° parámetro `extras` es opcional y guarda el consorcio
 * activo, el rol en ese consorcio y el rol global. Es opcional para
 * compatibilidad con cualquier llamada previa de 2 argumentos.
 *
 * Uso típico: después de un login exitoso (caso B/C2/D2) o cambio de consorcio.
 */
export const guardarSesion = (
  token: string,
  usuario: Persona,
  extras?: SesionExtras
): void => {
  setToken(token);
  setUsuarioSesion(usuario);
  marcarSesionPrevia();

  if (extras) {
    setConsorcioActivoSesion(extras);
  }
};

/**
 * Limpia la sesión de sessionStorage (token + usuario + contexto consorcio).
 * NO limpia el flag "had_session" — eso se hace explícitamente en el logout manual.
 *
 * Uso típico: interceptor de 401 (sesión expiró en backend).
 */
export const limpiarSesion = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  // 🆕 Limpiar contexto multi-tenant
  sessionStorage.removeItem(ACTIVE_CONSORCIO_KEY);
  sessionStorage.removeItem(ROLE_EN_CONSORCIO_KEY);
  sessionStorage.removeItem(ROL_GLOBAL_KEY);
  sessionStorage.removeItem(SELECCION_PENDIENTE_KEY);
};

/* ============================================================
 * CONSULTAS DE ESTADO
 * ============================================================ */

/**
 * Determina si hay una sesión activa (token presente).
 */
export const estaAutenticado = (): boolean => {
  return Boolean(getToken());
};

/**
 * Retorna el rol legacy del usuario logueado, o null si no hay sesión.
 *
 * ⚠️ En multi-tenant, para permisos de UI conviene usar
 * `getRoleEnConsorcioActivo()` (el rol en el consorcio activo).
 * Este getter se mantiene por compatibilidad.
 */
export const getRolSesion = (): Rol | null => {
  return getUsuarioSesion()?.role ?? null;
};

/**
 * Verifica si el usuario logueado tiene alguno de los roles permitidos.
 *
 * 🆕 Multi-tenant: valida contra el rol en el consorcio activo si existe,
 * con fallback al rol legacy del usuario.
 *
 * @example
 *   if (tieneRolPermitido(["admin", "superadmin"])) { ... }
 */
export const tieneRolPermitido = (rolesPermitidos: Rol[]): boolean => {
  const rolEnConsorcio = getRoleEnConsorcioActivo();
  const rol = (rolEnConsorcio as Rol) || getRolSesion();
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
