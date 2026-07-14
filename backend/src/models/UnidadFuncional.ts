// backend/src/models/UnidadFuncional.ts
import mongoose, { Schema, Model, HydratedDocument, Types } from "mongoose";
import type { IUser } from "./User";

/* ============================================================
 * TIPOS
 * ============================================================ */

export type EstadoOcupacion = "propietario" | "inquilino" | "vacio";

/* ============================================================
 * INTERFACE
 * ============================================================ */

/**
 * Estructura de datos de una Unidad Funcional (sin métodos ni props internas de Mongoose).
 * Sirve como contrato del dominio para el resto del backend.
 *
 * Los campos `propietario` e `inquilino` pueden ser:
 *  - `Types.ObjectId` cuando la unidad se lee sin populate.
 *  - `IUser` cuando la unidad se lee con `.populate("propietario")`.
 *  - `null` cuando la unidad está vacía o sin habitante asignado.
 */
export interface IUnidadFuncional {
  piso: string;
  departamento: string;
  coeficiente: number;
  propietario: Types.ObjectId | IUser | null;
  inquilino: Types.ObjectId | IUser | null;
  estadoOcupacion: EstadoOcupacion;
  metrosCuadrados: number;
  notas?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Tipo del Model.
 * (No tenemos métodos de instancia, pero lo definimos para consistencia con User.)
 */
export type UnidadFuncionalModel = Model<IUnidadFuncional>;

/**
 * Documento hidratado (con `.save()`, `.populate()`, `_id`, etc.).
 * Usalo en controllers cuando trabajes con una unidad obtenida de la DB.
 */
export type UnidadFuncionalDocument = HydratedDocument<IUnidadFuncional>;

/* ============================================================
 * SCHEMA
 * ============================================================ */
const UnidadFuncionalSchema = new Schema<IUnidadFuncional, UnidadFuncionalModel>(
  {
    piso: {
      type: String,
      required: [true, "El piso es obligatorio."],
      trim: true,
    },
    departamento: {
      type: String,
      required: [true, "El departamento es obligatorio."],
      trim: true,
    },
    coeficiente: {
      type: Number,
      required: [true, "El coeficiente es obligatorio para calcular las expensas."],
      min: [0, "El coeficiente no puede ser negativo."],
      max: [1, "El coeficiente no puede ser mayor a 1."],
    },
    propietario: {
      type: Schema.Types.ObjectId,
      ref: "User", // Debe coincidir exactamente con el nombre de tu modelo en User.ts
      default: null,
    },
    inquilino: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    estadoOcupacion: {
      type: String,
      enum: ["propietario", "inquilino", "vacio"],
      default: "vacio",
    },
    metrosCuadrados: {
      type: Number,
      default: 0,
    },
    notas: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================================================
 * ÍNDICES
 * ============================================================ */

// Índice compuesto único: no puede existir dos veces, por ejemplo, "Piso 2 Dpto A"
UnidadFuncionalSchema.index({ piso: 1, departamento: 1 }, { unique: true });

/* ============================================================
 * EXPORT
 * ============================================================ */
const UnidadFuncional =
  (mongoose.models.UnidadFuncional as UnidadFuncionalModel) ||
  mongoose.model<IUnidadFuncional, UnidadFuncionalModel>(
    "UnidadFuncional",
    UnidadFuncionalSchema
  );

export default UnidadFuncional;