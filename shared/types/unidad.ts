// shared/types/unidad.ts

import type { Persona } from "./persona";

/**
 * Estados posibles de ocupación de una unidad funcional.
 */
export type EstadoOcupacion = "propietario" | "inquilino" | "vacio";

/**
 * Representación pública de una Unidad Funcional.
 *
 * Los campos `propietario` e `inquilino` pueden venir:
 *  - Como string (ID crudo) si la API no populó el usuario.
 *  - Como Persona (objeto embebido) si la API llamó a `.populate(...)`.
 *  - Como null cuando no hay habitante asignado.
 */
export interface UnidadFuncional {
  _id: string;
  piso: string;
  departamento: string;
  coeficiente: number;
  estadoOcupacion: EstadoOcupacion;
  propietario?: string | Persona | null;
  inquilino?: string | Persona | null;
  metrosCuadrados?: number;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
}