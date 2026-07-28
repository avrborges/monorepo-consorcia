// backend/src/models/Consorcio.ts
import mongoose, { Schema, Model, HydratedDocument } from "mongoose";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

/**
 * Regex laxo para CUIT (11 dígitos con o sin guiones).
 * No valida el dígito verificador — solo formato.
 */
const REGEX_CUIT = /^[0-9]{2}-?[0-9]{8}-?[0-9]{1}$/;

/* ============================================================
 * INTERFACES
 * ============================================================ */

/**
 * Estructura de datos de un Consorcio (sin métodos de Mongoose).
 * Sirve como contrato del dominio en el backend.
 */
export interface IConsorcio {
  nombre: string;
  direccion: string;
  cuit: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
  notas: string;
  activo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Tipo del Model.
 */
export type ConsorcioModel = Model<IConsorcio>;

/**
 * Tipo del documento hidratado.
 */
export type ConsorcioDocument = HydratedDocument<IConsorcio>;

/* ============================================================
 * SCHEMA
 * ============================================================ */

const consorcioSchema = new Schema<IConsorcio, ConsorcioModel>(
  {
    nombre: {
      type: String,
      required: [true, "El nombre del consorcio es obligatorio."],
      trim: true,
      minlength: [3, "El nombre debe tener al menos 3 caracteres."],
      maxlength: [120, "El nombre no puede superar los 120 caracteres."],
      index: true,
    },

    direccion: {
      type: String,
      required: [true, "La dirección es obligatoria."],
      trim: true,
      maxlength: [200, "La dirección no puede superar los 200 caracteres."],
    },

    cuit: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: (value: string) => value === "" || REGEX_CUIT.test(value),
        message: "El CUIT no tiene un formato válido (ej: 30-12345678-9).",
      },
    },

    localidad: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "La localidad no puede superar los 80 caracteres."],
    },

    provincia: {
      type: String,
      trim: true,
      default: "",
      maxlength: [80, "La provincia no puede superar los 80 caracteres."],
    },

    codigoPostal: {
      type: String,
      trim: true,
      default: "",
      maxlength: [12, "El código postal no puede superar los 12 caracteres."],
    },

    notas: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Las notas no pueden superar los 500 caracteres."],
    },

    activo: {
      type: Boolean,
      default: true,
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
 * Búsqueda por nombre (ordenado alfabéticamente).
 * Útil para el selector post-login.
 */
consorcioSchema.index({ nombre: 1 });

/**
 * Búsqueda por estado + nombre (para listar consorcios activos ordenados).
 */
consorcioSchema.index({ activo: 1, nombre: 1 });

/* ============================================================
 * EXPORT
 * ============================================================ */

const Consorcio =
  (mongoose.models.Consorcio as ConsorcioModel) ||
  mongoose.model<IConsorcio, ConsorcioModel>("Consorcio", consorcioSchema);

export default Consorcio;