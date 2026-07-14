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
 * Modelamos ambas aquí para consistencia y autocompletado.
 */

/* ============================================================
 * Respuestas genéricas
 * ============================================================ */

export interface SuccessResponse {
  success: boolean;
  message: string;
}

export interface OkResponse {
  ok: boolean;
  msg: string;
}

/* ============================================================
 * Respuestas de Usuarios
 * ============================================================ */

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: Persona;
}

export interface UsuariosListResponse {
  success: boolean;
  users: Persona[];
}

export interface UsuarioResponse {
  success: boolean;
  message: string;
  user: Persona;
}

export interface AuditLogsResponse {
  success: boolean;
  logs: AuditLog[];
}

/* ============================================================
 * Respuestas de Unidades
 * ============================================================ */

export interface UnidadesListResponse {
  ok: boolean;
  unidades: UnidadFuncional[];
}

export interface UnidadResponse {
  ok: boolean;
  msg: string;
  unidad: UnidadFuncional;
}

export interface EliminarUnidadResponse {
  ok: boolean;
  msg: string;
  idEliminado: string;
}