// shared/types/ocupacion.ts
import type { Persona } from "./persona";

/**
 * Tipo de ocupación de una unidad funcional.
 * Debe mantenerse alineado con el modelo backend `Ocupacion`.
 */
export type TipoOcupacion = "propietario" | "inquilino";

/**
 * Ocupación "cruda" tal como vive en la colección `ocupaciones`.
 * Las fechas viajan como string ISO a través de la API.
 */
export interface Ocupacion {
  _id: string;
  unidadId: string;
  userId: string;
  tipo: TipoOcupacion;
  desde: string; // ISO date
  hasta: string | null; // null = ocupación activa/vigente
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Ocupación con el `userId` populado (para el historial en DetalleUnidad).
 * El populate del backend selecciona name/email/telefono.
 */
export interface OcupacionPopulada extends Omit<Ocupacion, "userId"> {
  userId: Pick<Persona, "_id" | "name" | "email" | "telefono"> | null;
}

/**
 * Respuesta del endpoint GET /unidades/:id/ocupaciones (M5.3.1).
 */
export interface GetOcupacionesResponse {
  ok: boolean;
  ocupaciones?: OcupacionPopulada[];
  msg?: string;
  error?: string;
}
