// backend/src/models/AuditLog.ts
import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

import type {
  AccionAuditoria,
  TipoEntidad,
  AuditLogDetalles,
} from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const ACCIONES_AUDITORIA: AccionAuditoria[] = [
  "USUARIO_CREADO",
  "USUARIO_EDITADO",
  "USUARIO_ELIMINADO",
  "UNIDAD_CREADA",
  "UNIDAD_EDITADA",
  "UNIDAD_ELIMINADA",
  "HABITANTES_VINCULADOS",
];

const TIPOS_ENTIDAD: TipoEntidad[] = ["USUARIO", "UNIDAD"];

/* ============================================================
 * INTERFACES
 * ============================================================ */

/**
 * Subdocumento `detalles` del registro de auditoría.
 *
 * `cambios` es Mixed → permite guardar cualquier estructura de payload
 * (por ejemplo, diffs entre valores anteriores y nuevos).
 */
export interface IAuditLogDetalles extends AuditLogDetalles {}

/**
 * Estructura de datos de un registro de auditoría.
 * Sirve como contrato del dominio para el resto del backend.
 */
export interface IAuditLog {
  adminId: Types.ObjectId;
  adminName: string;
  accion: AccionAuditoria;
  tipoEntidad: TipoEntidad;
  entidadId: Types.ObjectId;
  detalles: IAuditLogDetalles;
  timestamp: Date;
}

/**
 * Tipo del Model.
 */
export type AuditLogModel = Model<IAuditLog>;

/**
 * Documento hidratado (con `.save()`, `_id`, etc.).
 */
export type AuditLogDocument = HydratedDocument<IAuditLog>;

/* ============================================================
 * SCHEMA
 * ============================================================ */
const auditLogSchema = new Schema<IAuditLog, AuditLogModel>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del administrador es obligatorio."],
      index: true,
    },

    adminName: {
      type: String,
      required: [true, "El nombre del administrador es obligatorio."],
      trim: true,
      maxlength: [100, "El nombre del administrador no puede superar los 100 caracteres."],
    },

    accion: {
      type: String,
      required: [true, "La acción de auditoría es obligatoria."],
      enum: {
        values: ACCIONES_AUDITORIA,
        message: "La acción de auditoría no es válida.",
      },
      index: true,
    },

    // 🆕 Tipo de entidad afectada (USUARIO o UNIDAD)
    tipoEntidad: {
      type: String,
      required: [true, "El tipo de entidad es obligatorio."],
      enum: {
        values: TIPOS_ENTIDAD,
        message: "El tipo de entidad no es válido.",
      },
      index: true,
    },

    // 🔄 Renombrado de targetUserId — ahora es genérico (usuario o unidad)
    entidadId: {
      type: Schema.Types.ObjectId,
      required: [true, "El ID de la entidad afectada es obligatorio."],
      index: true,
    },

    detalles: {
      // 🔄 Renombrado de nombreUsuario a nombreEntidad
      nombreEntidad: {
        type: String,
        required: [true, "El nombre de la entidad afectada es obligatorio."],
        trim: true,
        maxlength: [200, "El nombre de la entidad no puede superar los 200 caracteres."],
      },

      cambios: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

/* ============================================================
 * ÍNDICES COMPUESTOS
 * ============================================================ */

/**
 * Optimiza la pantalla de historial (últimos movimientos ordenados por timestamp).
 */
auditLogSchema.index({ timestamp: -1 });

/**
 * Optimiza filtros por tipo de entidad + fecha (nuevo caso de uso).
 * Ej: "Últimas modificaciones sobre UNIDADES en el último mes".
 */
auditLogSchema.index({ tipoEntidad: 1, timestamp: -1 });

/**
 * Optimiza búsquedas por acción y fecha.
 */
auditLogSchema.index({ accion: 1, timestamp: -1 });

/**
 * Optimiza búsquedas por entidad afectada (usuario o unidad).
 */
auditLogSchema.index({ entidadId: 1, timestamp: -1 });

/**
 * Optimiza búsquedas por administrador.
 */
auditLogSchema.index({ adminId: 1, timestamp: -1 });

/* ============================================================
 * EXPORT
 * ============================================================ */
const AuditLog =
  (mongoose.models.AuditLog as AuditLogModel) ||
  mongoose.model<IAuditLog, AuditLogModel>("AuditLog", auditLogSchema);

export default AuditLog;