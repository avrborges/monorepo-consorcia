// backend/src/models/AuditLog.ts
import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

/* ============================================================
 * TIPOS Y CONSTANTES
 * ============================================================ */

export type AccionAuditoria =
  | "USUARIO_CREADO"
  | "USUARIO_EDITADO"
  | "USUARIO_ELIMINADO";

const ACCIONES_AUDITORIA: AccionAuditoria[] = [
  "USUARIO_CREADO",
  "USUARIO_EDITADO",
  "USUARIO_ELIMINADO",
];

/* ============================================================
 * INTERFACES
 * ============================================================ */

/**
 * Subdocumento `detalles` del registro de auditoría.
 *
 * `cambios` es Mixed → permite guardar cualquier estructura de payload
 * (por ejemplo, diffs entre valores anteriores y nuevos).
 */
export interface IAuditLogDetalles {
  nombreUsuario: string;
  cambios: Record<string, unknown>;
}

/**
 * Estructura de datos de un registro de auditoría.
 * Sirve como contrato del dominio para el resto del backend.
 */
export interface IAuditLog {
  adminId: Types.ObjectId;
  adminName: string;
  accion: AccionAuditoria;
  targetUserId: Types.ObjectId;
  detalles: IAuditLogDetalles;
  timestamp: Date;
}

/**
 * Tipo del Model.
 */
export type AuditLogModel = Model<IAuditLog>;

/**
 * Documento hidratado (con `.save()`, `_id`, etc.).
 * Usalo en controllers cuando trabajes con un registro obtenido de la DB.
 */
export type AuditLogDocument = HydratedDocument<IAuditLog>;

/* ============================================================
 * SCHEMA
 * ============================================================ */
const AuditLogSchema = new Schema<IAuditLog, AuditLogModel>(
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

    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del usuario afectado es obligatorio."],
      index: true,
    },

    detalles: {
      nombreUsuario: {
        type: String,
        required: [true, "El nombre del usuario afectado es obligatorio."],
        trim: true,
        maxlength: [100, "El nombre del usuario afectado no puede superar los 100 caracteres."],
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
 * Optimiza la pantalla de historial, donde normalmente consultamos:
 * - últimos movimientos
 * - ordenados por timestamp descendente
 */
AuditLogSchema.index({ timestamp: -1 });

/**
 * Optimiza búsquedas futuras por acción y fecha.
 * Ejemplo: USUARIO_CREADO entre dos fechas.
 */
AuditLogSchema.index({ accion: 1, timestamp: -1 });

/**
 * Optimiza búsquedas futuras por usuario afectado.
 */
AuditLogSchema.index({ targetUserId: 1, timestamp: -1 });

/**
 * Optimiza búsquedas futuras por administrador.
 */
AuditLogSchema.index({ adminId: 1, timestamp: -1 });

/* ============================================================
 * EXPORT
 * ============================================================ */
const AuditLog =
  (mongoose.models.AuditLog as AuditLogModel) ||
  mongoose.model<IAuditLog, AuditLogModel>("AuditLog", AuditLogSchema);

export default AuditLog;