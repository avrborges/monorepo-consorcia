// src/services/index.ts

/**
 * Barrel export de la capa de servicios.
 *
 * Permite consumir cualquier servicio desde un único import:
 *
 *     import { userService, unidadService, auditService, consorcioService } from "@/services";
 *
 * También re-exporta los tipos de payload para tipar estados/formularios:
 *
 *     import type { CrearUsuarioPayload } from "@/services";
 */

/* ============================================================
 * SERVICIOS
 * ============================================================ */

export { userService } from "./userService";
export { unidadService } from "./unidadService";
export { auditService } from "./auditService";
export { consorcioService } from "./consorcioService"; // 🆕 M6.0

/* ============================================================
 * TIPOS DE PAYLOAD (Request)
 * ============================================================ */

export type {
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
  ActivarCuentaPayload,
} from "./userService";

export type {
  CrearUnidadPayload,
  VincularHabitantesPayload,
} from "./unidadService";

export type {
  ActualizarConsorcioPayload, // 🆕 M6.0
} from "./consorcioService";
