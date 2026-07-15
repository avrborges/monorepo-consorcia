// src/services/auditService.ts
import api from "@/api";

import type {
  AuditLog,
  AccionAuditoria,
  AuditLogsResponse,
} from "@shared/types";

/* ============================================================
 * SERVICIO DE AUDITORÍA
 * ============================================================ */

export const auditService = {
  /**
   * Obtener el historial completo de auditoría (limitado a 100 registros más recientes)
   * GET /users/audit-logs
   *
   * ⚠️ Endpoint restringido a superadmin.
   * El backend responde con logs ordenados por timestamp descendente.
   *
   * @param signal - AbortSignal opcional para cancelar el request
   */
  getLogs: async (signal?: AbortSignal) => {
    const { data } = await api.get<AuditLogsResponse>("/users/audit-logs", {
      signal,
    });
    return data;
  },
};

/* ============================================================
 * EXPORTS ÚTILES
 * ============================================================ */

// Re-exportamos los tipos de dominio útiles para consumo en componentes
export type { AuditLog, AccionAuditoria };