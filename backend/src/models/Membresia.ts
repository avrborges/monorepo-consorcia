// backend/src/models/Membresia.ts
import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";

import type { RolMembresia, EstadoMembresia } from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const ROLES_MEMBRESIA_VALIDOS: RolMembresia[] = [
  "superadmin",
  "admin",
  "consejo",
  "propietario",
  "inquilino",
];

const ESTADOS_MEMBRESIA_VALIDOS: EstadoMembresia[] = ["activa", "inactiva"];

/* ============================================================
 * INTERFACES
 * ============================================================ */

/**
 * Estructura de datos de una Membresia en el backend.
 */
export interface IMembresia {
  userId: Types.ObjectId;
  consorcioId: Types.ObjectId;
  role: RolMembresia;
  estado: EstadoMembresia;

  /**
   * 🆕 Flag "consorcio default" del usuario (Fase M2.6.2).
   *
   * Regla: cada userId puede tener MÁXIMO UNA membresía con esDefault: true.
   * Se garantiza en la capa de servicio (loginUser + cambiarConsorcio).
   */
  esDefault: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Tipo del Model.
 */
export type MembresiaModel = Model<IMembresia>;

/**
 * Tipo del documento hidratado.
 */
export type MembresiaDocument = HydratedDocument<IMembresia>;

/* ============================================================
 * SCHEMA
 * ============================================================ */

const membresiaSchema = new Schema<IMembresia, MembresiaModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del usuario es obligatorio."],
      index: true,
    },

    consorcioId: {
      type: Schema.Types.ObjectId,
      ref: "Consorcio",
      required: [true, "El ID del consorcio es obligatorio."],
      index: true,
    },

    role: {
      type: String,
      required: [true, "El rol de la membresía es obligatorio."],
      enum: {
        values: ROLES_MEMBRESIA_VALIDOS,
        message: "El rol de la membresía no es válido.",
      },
      index: true,
    },

    estado: {
      type: String,
      required: [true, "El estado de la membresía es obligatorio."],
      enum: {
        values: ESTADOS_MEMBRESIA_VALIDOS,
        message: "El estado de la membresía no es válido.",
      },
      default: "activa",
      index: true,
    },

    /**
     * 🆕 Flag "consorcio default" (Fase M2.6.2).
     * Default false. Se actualiza desde el flujo de login o cambio de consorcio.
     */
    esDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ============================================================
 * ÍNDICES COMPUESTOS
 * ============================================================ */

/**
 * Índice principal para el selector post-login:
 * "¿Qué consorcios tiene disponibles este usuario?"
 *
 * Query típica: Membresia.find({ userId, estado: "activa" }).populate("consorcioId")
 */
membresiaSchema.index({ userId: 1, estado: 1 });

/**
 * Índice para consultas administrativas dentro de un consorcio:
 * "¿Quiénes son los admins de este consorcio?"
 *
 * Query típica: Membresia.find({ consorcioId, role: "admin", estado: "activa" })
 */
membresiaSchema.index({ consorcioId: 1, role: 1, estado: 1 });

/**
 * Índice para prevenir búsquedas costosas por combinación exacta:
 * "¿Este user tiene rol X en este consorcio?"
 *
 * NOTA: No es único porque decidimos permitir múltiples roles del mismo
 * usuario en el mismo consorcio (decisión #2). Ejemplo: Alejandro puede
 * ser `admin` Y `propietario` en el mismo edificio simultáneamente.
 */
membresiaSchema.index({ userId: 1, consorcioId: 1, role: 1 });

/**
 * 🆕 Índice para consultas del "consorcio default" del usuario (Fase M2.6.2).
 * Query típica: Membresia.findOne({ userId, esDefault: true, estado: "activa" })
 */
membresiaSchema.index({ userId: 1, esDefault: 1, estado: 1 });

/* ============================================================
 * EXPORT
 * ============================================================ */

const Membresia =
  (mongoose.models.Membresia as MembresiaModel) ||
  mongoose.model<IMembresia, MembresiaModel>("Membresia", membresiaSchema);

export default Membresia;