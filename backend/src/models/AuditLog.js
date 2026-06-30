// backend/src/models/AuditLog.js
const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    accion: {
      type: String,
      required: true,
      enum: ["USUARIO_CREADO", "USUARIO_EDITADO", "USUARIO_ELIMINADO"], // Asegura consistencia de términos
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    detalles: {
      nombreUsuario: { type: String, required: true },
      cambios: { type: mongoose.Schema.Types.Mixed }, // Permite guardar cualquier estructura JSON flexible
    },
    timestamp: {
      type: Date,
      default: Date.now, // Se graba automáticamente la hora del servidor al insertarse
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model("AuditLog", AuditLogSchema);