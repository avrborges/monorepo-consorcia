// shared/types/auditoria.ts

/**
 * Tipo de entidad sobre la que se ejecutó la acción auditada.
 * Permite filtrar y agrupar logs en el frontend.
 */
export type TipoEntidad = "USUARIO" | "UNIDAD" | "CONSORCIO";

/**
 * Tipos de acciones que se registran en el historial de auditoría.
 *
 * Convención de naming: `<ENTIDAD>_<VERBO_PASADO>`
 */
export type AccionAuditoria =
  // 🎯 Acciones sobre usuarios
  | "USUARIO_CREADO"
  | "USUARIO_EDITADO"
  | "USUARIO_ELIMINADO"
  // 🎯 Acciones sobre unidades funcionales
  | "UNIDAD_CREADA"
  | "UNIDAD_EDITADA"
  | "UNIDAD_ELIMINADA"
  | "HABITANTES_VINCULADOS"
  // 🎯 Acciones sobre ocupaciones (auditadas bajo TipoEntidad "UNIDAD")
  | "OCUPACION_CREADA"
  | "OCUPACION_CERRADA"
  // 🎯 Acciones sobre consorcios (M6.0 + M6)
  | "CONSORCIO_EDITADO"
  | "CONSORCIO_CREADO"
  | "CONSORCIO_ACTIVADO"
  | "CONSORCIO_DESACTIVADO"
  // 🆕 M6.3 — Asignación de administradores a un consorcio (vía Membresia,
  // auditadas bajo TipoEntidad "CONSORCIO", entidadId = consorcioId)
  | "ADMIN_ASIGNADO"
  | "ADMIN_REVOCADO";

/**
 * Detalles del registro de auditoría.
 *
 * @field nombreEntidad - Nombre legible de la entidad afectada
 *                        (ej: "Juan Pérez" para usuarios, "Piso 2 Depto A" para unidades)
 * @field cambios - Objeto con los cambios aplicados. Estructura libre según el contexto.
 */
export interface AuditLogDetalles {
  nombreEntidad: string;
  cambios?: Record<string, unknown>;
}

/**
 * Representación pública de un registro de auditoría.
 *
 * @field entidadId - ID de la entidad afectada (usuario o unidad)
 * @field tipoEntidad - Discriminador del tipo de entidad
 * @field consorcioId - Consorcio al que pertenece el registro (Fase M2.3)
 */
export interface AuditLog {
  _id: string;

  /**
   * 🆕 Consorcio al que pertenece este registro de auditoría (Fase M2.3).
   *
   * Actualmente opcional para no romper el sistema durante la migración.
   * Se hace obligatorio en Fase M2.5 después de que el script de
   * migración #2 pueble este campo en todos los logs existentes.
   *
   * Los superadmins solo pueden ver logs de SU consorcio.
   * El `super_admin_global` puede ver logs de cualquier consorcio.
   */
  consorcioId?: string;

  adminId: string;
  adminName: string;
  accion: AccionAuditoria;
  tipoEntidad: TipoEntidad;
  entidadId: string;
  detalles: AuditLogDetalles;
  timestamp: string;
}

/* ============================================================
 * HELPERS DE TIPO (útiles para narrowing en componentes)
 * ============================================================ */

/**
 * Acciones específicas de la entidad "USUARIO".
 */
export type AccionUsuario = Extract<
  AccionAuditoria,
  "USUARIO_CREADO" | "USUARIO_EDITADO" | "USUARIO_ELIMINADO"
>;

/**
 * Acciones específicas de la entidad "UNIDAD".
 *
 * Incluye las acciones de ocupación, que se auditan bajo
 * TipoEntidad "UNIDAD" (entidadId = unidadId).
 */
export type AccionUnidad = Extract<
  AccionAuditoria,
  | "UNIDAD_CREADA"
  | "UNIDAD_EDITADA"
  | "UNIDAD_ELIMINADA"
  | "HABITANTES_VINCULADOS"
  | "OCUPACION_CREADA"
  | "OCUPACION_CERRADA"
>;

/**
 * Acciones específicas de la entidad "CONSORCIO".
 *
 * Incluye el ABM (crear, activar, desactivar) además de editar, y la
 * gestión de administradores (asignar/revocar vía Membresia — M6.3).
 */
export type AccionConsorcio = Extract<
  AccionAuditoria,
  | "CONSORCIO_EDITADO"
  | "CONSORCIO_CREADO"
  | "CONSORCIO_ACTIVADO"
  | "CONSORCIO_DESACTIVADO"
  | "ADMIN_ASIGNADO"
  | "ADMIN_REVOCADO"
>;
