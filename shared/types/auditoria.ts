// shared/types/auditoria.ts

/**
 * Tipos de acciones que se registran en el historial de auditoría.
 */
export type AccionAuditoria =
  | "USUARIO_CREADO"
  | "USUARIO_EDITADO"
  | "USUARIO_ELIMINADO";

/**
 * Detalles de un registro de auditoría.
 */
export interface AuditLogDetalles {
  nombreUsuario: string;
  cambios: Record<string, unknown>;
}

/**
 * Representación pública de un registro de auditoría.
 */
export interface AuditLog {
  _id: string;
  adminId: string;
  adminName: string;
  accion: AccionAuditoria;
  targetUserId: string;
  detalles: AuditLogDetalles;
  timestamp: string;
}