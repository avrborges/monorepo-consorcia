// shared/types/ocupacion.ts

/**
 * Tipo de ocupación que un usuario tiene sobre una unidad funcional.
 *
 * - `propietario`: dueño legal de la UF (tiene derecho de propiedad y
 *   responsabilidad de pago de expensas por defecto).
 * - `inquilino`: ocupante temporal por contrato de alquiler.
 *
 * NOTA: un usuario puede ser SIMULTÁNEAMENTE propietario e inquilino de
 * la misma UF? En teoría no debería, pero el modelo lo permite si algún
 * caso raro lo requiere (ej: propietario que a su vez alquila a otro,
 * pero como convención NO se hace).
 */
export type TipoOcupacion = "propietario" | "inquilino";

/**
 * Representación pública de una Ocupacion.
 *
 * Es la relación N:N entre User y UnidadFuncional con historial de fechas.
 * Reemplaza los campos `propietario` e `inquilino` que actualmente están
 * en el modelo UnidadFuncional (migración en Fase M5).
 *
 * Ventajas del modelo con historial:
 * - Soporta múltiples propietarios simultáneos (matrimonio, sucesión).
 * - Soporta múltiples inquilinos simultáneos (co-locatarios).
 * - Preserva el historial legal ("¿Quién era propietario en marzo 2024?").
 * - Habilita expensas retroactivas exactas por período de ocupación.
 */
export interface Ocupacion {
  _id: string;
  unidadId: string;
  userId: string;
  tipo: TipoOcupacion;

  /**
   * Fecha en la que comienza la ocupación (ISO string).
   * Al crear una nueva ocupación, si no se especifica, se usa la fecha actual.
   */
  desde: string;

  /**
   * Fecha en la que termina la ocupación (ISO string).
   * - `null`: ocupación ACTIVA (el usuario sigue ocupando la UF hoy).
   * - Date: ocupación FINALIZADA (histórica).
   */
  hasta: string | null;

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Ocupacion con los datos del usuario populados.
 * Se usa en el MapaEdificio y detalle de UF para mostrar nombres.
 */
export interface OcupacionConUsuario extends Ocupacion {
  usuario: {
    _id: string;
    name: string;
    email: string;
    telefono?: string;
  };
}

/**
 * Ocupacion con los datos de la unidad populados.
 * Se usa en el portal del propietario/inquilino para listar "Mis Unidades".
 */
export interface OcupacionConUnidad extends Ocupacion {
  unidad: {
    _id: string;
    consorcioId: string;
    piso: string;
    departamento: string;
    coeficiente: number;
  };
}