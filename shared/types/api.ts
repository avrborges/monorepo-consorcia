// shared/types/api.ts

import type { Persona, Rol } from "./persona";
import type { UnidadFuncional } from "./unidad";
import type { AuditLog } from "./auditoria";
import type { RolMembresia, RolGlobal } from "./membresia";

/**
 * Wrappers de respuesta estándar del backend.
 *
 * El backend usa dos convenciones:
 *  - Rutas de usuarios: `{ success, message, ... }`
 *  - Rutas de unidades: `{ ok, msg, ... }`
 *
 * ⚠️ Los campos `success` y `ok` están tipados como literales `true` / `false`
 * para permitir discriminated union narrowing:
 *
 *     if (result.success) {
 *       // TS sabe que aquí result es LoginResponse (no ErrorResponse)
 *       result.token  // ✅ autocompletado
 *     }
 */

/* ============================================================
 * Respuestas genéricas (users)
 * ============================================================ */

export interface SuccessResponse {
  success: true;
  message: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
}

/* ============================================================
 * Respuestas genéricas (unidades)
 * ============================================================ */

export interface OkResponse {
  ok: true;
  msg: string;
}

export interface OkErrorResponse {
  ok: false;
  msg: string;
}

/* ============================================================
 * MULTI-TENANT: Tipos de apoyo para login y cambio de consorcio
 * ============================================================ */

/**
 * Datos mínimos del consorcio populados en el response del login.
 * Se usa en `LoginConToken.activeConsorcio` y en el selector de consorcios.
 */
export interface ConsorcioActivo {
  _id: string;
  nombre: string;
  direccion: string;
}

/**
 * Membresía disponible del usuario en el selector post-login.
 *
 * Se muestra cuando el usuario tiene múltiples membresías activas sin default,
 * o cuando el super_admin_global entra por primera vez.
 */
export interface MembresiaDisponibleLogin {
  _id: string;                    // membresiaId (único identificador de la membresía)
  role: RolMembresia;             // Rol específico del usuario en ese consorcio
  esDefault: boolean;             // true si es la membresía marcada como default
  consorcio: ConsorcioActivo;     // Datos del consorcio (populado)
}

/* ============================================================
 * MULTI-TENANT: Respuestas del login (discriminated union)
 * ============================================================
 *
 * El login puede resolver en 3 shapes distintas:
 *
 * 1. LoginConToken               → Casos B, C2, D2 (sesión lista con token)
 * 2. RequiereSeleccionConsorcio  → Casos C1, D1 (elegir consorcio)
 * 3. ErrorSinMembresias          → Caso A (usuario sin acceso)
 *
 * El frontend hace narrowing con `success` y con `"requiereSeleccionConsorcio" in data`.
 */

/**
 * CASO A — Usuario sin membresías activas.
 * Devuelve error explícito para que el frontend muestre mensaje al usuario.
 */
export interface ErrorSinMembresias {
  success: false;
  message: string;
  motivo: "SIN_MEMBRESIAS";  // Discriminador extra para narrowing preciso
}

/**
 * CASOS B, C2, D2 — Sesión lista con token.
 * El usuario ya tiene un consorcio activo (único o default) y recibe todo lo necesario.
 */
export interface LoginConToken {
  success: true;
  message: string;
  token: string;
  user: Persona;
  activeConsorcio: ConsorcioActivo;
  roleEnConsorcioActivo: RolMembresia;
  rolGlobal: RolGlobal;
}

/**
 * CASOS C1, D1 — Requiere selección de consorcio.
 * El usuario tiene múltiples membresías activas y no eligió default.
 * El frontend debe mostrar pantalla de selección.
 */
export interface RequiereSeleccionConsorcio {
  success: true;
  requiereSeleccionConsorcio: true;
  membresiasDisponibles: MembresiaDisponibleLogin[];
  user: Persona;
  rolGlobal: RolGlobal;
}

/**
 * Discriminated union del response del login (multi-tenant).
 *
 * Uso en el frontend:
 *   const data = await userService.login(email, password);
 *
 *   if (!data.success) {
 *     mostrarError(data.message);  // ErrorSinMembresias
 *   } else if ("requiereSeleccionConsorcio" in data) {
 *     mostrarSelector(data.membresiasDisponibles);  // C1/D1
 *   } else {
 *     guardarToken(data.token);  // LoginConToken (B/C2/D2)
 *     redirigirAlDashboard();
 *   }
 */
export type LoginResponseMultiTenant =
  | LoginConToken
  | RequiereSeleccionConsorcio
  | ErrorSinMembresias;

/* ============================================================
 * MULTI-TENANT: Cambiar consorcio activo
 * ============================================================ */

/**
 * Payload del endpoint POST /users/cambiar-consorcio.
 *
 * @field consorcioId - ID del consorcio al que se quiere cambiar
 * @field marcarComoDefault - Si true, actualiza el `esDefault` de la membresía
 *                            (para próximos logins)
 */
export interface CambiarConsorcioBody {
  consorcioId: string;
  marcarComoDefault?: boolean;
}

/**
 * Respuesta del endpoint POST /users/cambiar-consorcio.
 * Retorna un JWT nuevo con `activeConsorcioId` actualizado.
 */
export interface CambiarConsorcioResponse {
  success: true;
  message: string;
  token: string;
  user: Persona;
  activeConsorcio: ConsorcioActivo;
  roleEnConsorcioActivo: RolMembresia;
  rolGlobal: RolGlobal;
}

/* ============================================================
 * Respuestas de Usuarios (LEGACY - mono-tenant)
 * ============================================================
 *
 * ⚠️ NOTA MULTI-TENANT: Este `LoginResponse` es el shape actual mono-tenant.
 * Se mantiene por compatibilidad con el frontend actual hasta M3, donde
 * se migrará el consumidor a `LoginResponseMultiTenant` (discriminated union).
 *
 * El backend en M2.6 va a devolver el shape multi-tenant, pero el tipo
 * `LoginResponse` legacy es un subset compatible con `LoginConToken` para
 * que el frontend actual siga funcionando durante la transición.
 */

export interface LoginResponse {
  success: true;
  message: string;
  token: string;
  user: Persona;
}

export interface UsuariosListResponse {
  success: true;
  users: Persona[];
}

export interface UsuarioResponse {
  success: true;
  message: string;
  user: Persona;
}

export interface AuditLogsResponse {
  success: true;
  logs: AuditLog[];
}

/* ============================================================
 * Respuestas de Unidades
 * ============================================================ */

export interface UnidadesListResponse {
  ok: true;
  unidades: UnidadFuncional[];
}

export interface UnidadResponse {
  ok: true;
  msg: string;
  unidad: UnidadFuncional;
}

export interface EliminarUnidadResponse {
  ok: true;
  msg: string;
  idEliminado: string;
}

/* ============================================================
 * Type helper marker (evitar warning de import no usado)
 * ============================================================ */

// El import de `Rol` puede quedar sin uso directo pero es útil como
// referencia para consumidores del archivo. Este tipo lo re-exporta
// implícitamente sin generar el warning.
export type _RolMarker = Rol;