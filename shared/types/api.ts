// shared/types/api.ts

import type { Persona } from "./persona";
import type { UnidadFuncional } from "./unidad";
import type { AuditLog } from "./auditoria";

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
 * Respuestas de Usuarios
 * ============================================================ */

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