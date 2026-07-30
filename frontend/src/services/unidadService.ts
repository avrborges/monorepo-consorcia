// src/services/unidadService.ts
import api from "@/api";

import type {
  UnidadFuncional,
  EstadoOcupacion,
  UnidadesListResponse,
  UnidadResponse,
  EliminarUnidadResponse,
  GetOcupacionesResponse, // 🆕 M5.3.1
} from "@shared/types";

/* ============================================================
 * TIPOS DE PAYLOAD (Request)
 * ============================================================ */

export interface CrearUnidadPayload {
  piso: string;
  departamento: string;
  coeficiente: number;
  estadoOcupacion?: EstadoOcupacion;
}

export interface VincularHabitantesPayload {
  propietarioId: string | null;
  inquilinoId: string | null;
}

/* ============================================================
 * SERVICIO DE UNIDADES FUNCIONALES
 * ============================================================ */

export const unidadService = {
  /**
   * Listar todas las unidades funcionales — GET /unidades
   *
   * El backend responde con propietario/inquilino populados como Persona.
   *
   * @param signal - AbortSignal opcional para cancelar el request
   */
  getAll: async (signal?: AbortSignal) => {
    const { data } = await api.get<UnidadesListResponse>("/unidades", {
      signal,
    });
    return data;
  },

  /**
   * 🆕 M5.3.1: Historial de ocupaciones de una unidad — GET /unidades/:id/ocupaciones
   *
   * Devuelve todas las ocupaciones (activas e históricas) de la UF, con el
   * usuario populado (name/email/telefono). Activas (hasta: null) primero,
   * luego por fecha `desde` descendente.
   *
   * @param unidadId - ID de la unidad funcional
   * @param signal   - AbortSignal opcional para cancelar el request
   */
  getOcupaciones: async (
    unidadId: string,
    signal?: AbortSignal
  ) => {
    const { data } = await api.get<GetOcupacionesResponse>(
      `/unidades/${unidadId}/ocupaciones`,
      { signal }
    );
    return data;
  },

  /**
   * Crear una nueva unidad funcional — POST /unidades
   */
  create: async (payload: CrearUnidadPayload) => {
    const { data } = await api.post<UnidadResponse>("/unidades", payload);
    return data;
  },

  /**
   * Vincular propietario e inquilino a una unidad — PUT /unidades/:id/vincular
   *
   * Pasar `null` en `propietarioId` o `inquilinoId` desvincula al habitante.
   * El backend actualiza automáticamente el `estadoOcupacion` según las refs.
   */
  vincularHabitantes: async (
    id: string,
    payload: VincularHabitantesPayload
  ) => {
    const { data } = await api.put<UnidadResponse>(
      `/unidades/${id}/vincular`,
      payload
    );
    return data;
  },

  /**
   * Eliminar una unidad funcional — DELETE /unidades/:id
   */
  delete: async (id: string) => {
    const { data } = await api.delete<EliminarUnidadResponse>(
      `/unidades/${id}`
    );
    return data;
  },
};

/* ============================================================
 * EXPORTS ÚTILES
 * ============================================================ */

// Re-exportamos los tipos de dominio útiles para consumo en componentes
export type { UnidadFuncional, EstadoOcupacion };
