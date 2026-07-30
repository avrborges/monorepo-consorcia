// src/services/consorcioService.ts
import api from "@/api";

import type {
  Consorcio,
  GetConsorcioResponse,
  ConsorcioResponse,
} from "@shared/types";

export interface ActualizarConsorcioPayload {
  nombre?: string;
  direccion?: string;
  cuit?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  notas?: string;
}

export const consorcioService = {
  getById: async (id: string, signal?: AbortSignal) => {
    const { data } = await api.get<GetConsorcioResponse>(`/consorcios/${id}`, { signal });
    return data;
  },

  update: async (id: string, payload: ActualizarConsorcioPayload) => {
    const { data } = await api.put<ConsorcioResponse>(`/consorcios/${id}`, payload);
    return data;
  },
};

export type { Consorcio };