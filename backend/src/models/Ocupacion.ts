// backend/src/models/Ocupacion.ts
import {
  Schema,
  model,
  Types,
  type HydratedDocument,
  type Model,
} from "mongoose";

/* ============================================================
 * MODELO: Ocupacion (M5.1.0)
 * ============================================================
 *
 * Representa la relación N:N entre una Unidad Funcional y un Usuario a lo
 * largo del tiempo, con historial legal mediante `desde` / `hasta`.
 *
 * Reemplaza (progresivamente, vía dual-write en M5) los campos legacy
 * `propietario` / `inquilino` de UnidadFuncional.
 *
 * Reglas de negocio:
 *   - Una ocupación está ACTIVA ⇔ `hasta === null`.
 *   - Al cerrarse una ocupación se setea `hasta = new Date()` (NUNCA se
 *     borra el registro → trazabilidad legal inmutable).
 *   - Una unidad puede tener MÚLTIPLES propietarios simultáneos activos
 *     (copropiedad), por eso NO hay índice único sobre {unidadId, tipo}.
 *   - El scope multi-tenant se garantiza a través de `unidadId` (la UF ya
 *     está scopeada por consorcio), por lo que este modelo NO incluye
 *     `consorcioId` propio.
 * ============================================================ */

/**
 * Tipo de ocupación. Coincide con el `type TipoOcupacion` usado en
 * unidadController.ts (M5.1).
 */
export type TipoOcupacion = "propietario" | "inquilino";

export const TIPOS_OCUPACION: readonly TipoOcupacion[] = [
  "propietario",
  "inquilino",
] as const;

/* ------------------------------------------------------------
 * Interface del documento (datos crudos)
 * ------------------------------------------------------------ */
export interface IOcupacion {
  unidadId: Types.ObjectId;
  userId: Types.ObjectId;
  tipo: TipoOcupacion;
  desde: Date;
  /** `null` ⇒ ocupación vigente. Fecha ⇒ ocupación cerrada (historial). */
  hasta: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Documento hidratado de Mongoose para tipado estricto en los controllers. */
export type OcupacionDocument = HydratedDocument<IOcupacion>;

/* ------------------------------------------------------------
 * Schema
 * ------------------------------------------------------------ */
const ocupacionSchema = new Schema<IOcupacion>(
  {
    unidadId: {
      type: Schema.Types.ObjectId,
      ref: "UnidadFuncional",
      required: [true, "La ocupación debe referenciar una Unidad Funcional."],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "La ocupación debe referenciar un Usuario."],
      index: true,
    },
    tipo: {
      type: String,
      enum: {
        values: TIPOS_OCUPACION as TipoOcupacion[],
        message: "El tipo de ocupación '{VALUE}' no es válido.",
      },
      required: [true, "El tipo de ocupación es obligatorio."],
    },
    desde: {
      type: Date,
      required: [true, "La fecha de inicio de la ocupación es obligatoria."],
      default: () => new Date(),
    },
    hasta: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    collection: "ocupaciones",
  }
);

/* ------------------------------------------------------------
 * Índices compuestos
 * ------------------------------------------------------------ */

// Consulta más frecuente (M5.1): ocupaciones ACTIVAS de una unidad por tipo.
//   { unidadId, hasta: null }  y  { unidadId, tipo, hasta: null }
ocupacionSchema.index({ unidadId: 1, tipo: 1, hasta: 1 });

// Historial de ocupaciones de un usuario ordenado por antigüedad.
ocupacionSchema.index({ userId: 1, hasta: 1 });

// Barrido temporal general (reportes por rango de fechas).
ocupacionSchema.index({ unidadId: 1, desde: -1 });

/* ------------------------------------------------------------
 * Validación de integridad temporal
 * ------------------------------------------------------------ */
// 🎯 Hook síncrono SIN `next`: al lanzar un Error, Mongoose aborta la
//    validación automáticamente. Este enfoque evita el choque de overloads
//    de `pre()` en TypeScript strict (el overload de query middleware exigía
//    `RegExp | "createCollection"` para el primer argumento).
ocupacionSchema.pre("validate", function (this: OcupacionDocument) {
  if (this.hasta && this.desde && this.hasta < this.desde) {
    throw new Error(
      "La fecha de fin (hasta) no puede ser anterior a la fecha de inicio (desde)."
    );
  }
});

/* ------------------------------------------------------------
 * Modelo
 * ------------------------------------------------------------ */
export type OcupacionModel = Model<IOcupacion>;

const Ocupacion: OcupacionModel = model<IOcupacion>("Ocupacion", ocupacionSchema);

export default Ocupacion;
