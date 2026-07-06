// backend/src/models/AuditLog.js
const mongoose = require("mongoose");

/* ============================================================
 * CONSTANTES
 * ============================================================ */
const ACCIONES_AUDITORIA = [
  "USUARIO_CREADO",
  "USUARIO_EDITADO",
  "USUARIO_ELIMINADO",
];

/* ============================================================
 * SCHEMA
 * ============================================================ */
const AuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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
        type: mongoose.Schema.Types.Mixed,
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
 * Ejemplo:
 * USUARIO_CREADO entre dos fechas.
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
module.exports =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);