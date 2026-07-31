// src/services/consorcioService.ts
import api from "@/api";

import type {
  Consorcio,
  GetConsorcioResponse,
  ConsorcioResponse,
  ConsorciosListResponse, // 🆕 M6.1
  Membresia,
  Persona,
} from "@shared/types";

/* ============================================================
 * TIPOS DE PAYLOAD (Request)
 * ============================================================ */

/**
 * Campos editables del consorcio (M6.0 — edición del consorcio activo).
 * Todos opcionales: se envían solo los que el usuario modificó.
 */
export interface ActualizarConsorcioPayload {
  nombre?: string;
  direccion?: string;
  cuit?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  notas?: string;
}

/**
 * 🆕 M6.1 — Datos para crear un consorcio nuevo (ABM).
 * `nombre` y `direccion` son obligatorios; el resto opcional.
 */
export interface CrearConsorcioPayload {
  nombre: string;
  direccion: string;
  cuit?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  notas?: string;
}

/**
 * 🆕 M6.3 — Datos para asignar un administrador a un consorcio.
 * `role` solo puede ser administrativo (admin/superadmin).
 */
export interface AsignarAdminPayload {
  email: string;
  role: "admin" | "superadmin";
}

/* ============================================================
 * TIPOS DE RESPUESTA (M6.3 — administradores)
 * ============================================================ */

/**
 * 🆕 M6.3 — Membresía administrativa con el usuario populado.
 * El backend devuelve `userId` populado con name/email/telefono.
 */
export interface AdministradorPopulado extends Omit<Membresia, "userId"> {
  userId: Pick<Persona, "_id" | "name" | "email" | "telefono"> | null;
}

/**
 * 🆕 M6.3 — Respuesta de GET /consorcios/:id/administradores
 */
export interface AdministradoresListResponse {
  ok: boolean;
  administradores?: AdministradorPopulado[];
  msg?: string;
  error?: string;
}

/**
 * 🆕 M6.3 — Respuesta de POST/DELETE de administradores (una membresía).
 */
export interface MembresiaResponse {
  ok: boolean;
  membresia?: Membresia;
  msg?: string;
  error?: string;
}

/* ============================================================
 * SERVICIO DE CONSORCIOS
 * ============================================================ */

export const consorcioService = {
  /**
   * 🆕 M6.1 — Listar todos los consorcios (ABM) — GET /consorcios
   *
   * Devuelve todos los consorcios (activos e inactivos). Solo accesible
   * para super_admin_global (validado en el backend).
   *
   * @param signal - AbortSignal opcional para cancelar el request
   */
  getAll: async (signal?: AbortSignal) => {
    const { data } = await api.get<ConsorciosListResponse>("/consorcios", { signal });
    return data;
  },

  /**
   * Obtener los datos completos de un consorcio — GET /consorcios/:id (M6.0)
   *
   * Usado por la pantalla "Configuración del Consorcio" para precargar el form.
   */
  getById: async (id: string, signal?: AbortSignal) => {
    const { data } = await api.get<GetConsorcioResponse>(`/consorcios/${id}`, { signal });
    return data;
  },

  /**
   * 🆕 M6.1 — Crear un nuevo consorcio (ABM) — POST /consorcios
   *
   * Solo super_admin_global. El backend audita CONSORCIO_CREADO.
   */
  create: async (payload: CrearConsorcioPayload) => {
    const { data } = await api.post<ConsorcioResponse>("/consorcios", payload);
    return data;
  },

  /**
   * Editar los datos de un consorcio — PUT /consorcios/:id (M6.0)
   *
   * El backend audita CONSORCIO_EDITADO.
   */
  update: async (id: string, payload: ActualizarConsorcioPayload) => {
    const { data } = await api.put<ConsorcioResponse>(`/consorcios/${id}`, payload);
    return data;
  },

  /**
   * 🆕 M6.1 — Activar / desactivar un consorcio (baja lógica) —
   * PATCH /consorcios/:id/estado
   *
   * Solo super_admin_global. Si se pasa `activo`, fuerza ese estado;
   * si se omite, el backend hace toggle. Audita CONSORCIO_ACTIVADO /
   * CONSORCIO_DESACTIVADO.
   *
   * @param id     - ID del consorcio
   * @param activo - (opcional) estado deseado; si se omite, toggle
   */
  toggleEstado: async (id: string, activo?: boolean) => {
    const { data } = await api.patch<ConsorcioResponse>(
      `/consorcios/${id}/estado`,
      activo === undefined ? {} : { activo }
    );
    return data;
  },

  /* ------------------------------------------------------------
   * 🆕 M6.3 — Gestión de administradores del consorcio
   * ------------------------------------------------------------ */

  /**
   * Listar los administradores (admin/superadmin) activos de un consorcio —
   * GET /consorcios/:id/administradores
   *
   * Solo super_admin_global. Devuelve las membresías con el usuario populado.
   */
  getAdministradores: async (id: string, signal?: AbortSignal) => {
    const { data } = await api.get<AdministradoresListResponse>(
      `/consorcios/${id}/administradores`,
      { signal }
    );
    return data;
  },

  /**
   * Asignar un administrador a un consorcio (por email) —
   * POST /consorcios/:id/administradores
   *
   * Solo super_admin_global. El backend busca el usuario por email, crea o
   * reactiva la membresía administrativa, y audita ADMIN_ASIGNADO.
   */
  asignarAdministrador: async (id: string, payload: AsignarAdminPayload) => {
    const { data } = await api.post<MembresiaResponse>(
      `/consorcios/${id}/administradores`,
      payload
    );
    return data;
  },

  /**
   * Revocar un administrador de un consorcio (baja lógica) —
   * DELETE /consorcios/:id/administradores/:membresiaId
   *
   * Solo super_admin_global. Marca la membresía como inactiva y audita
   * ADMIN_REVOCADO.
   */
  revocarAdministrador: async (id: string, membresiaId: string) => {
    const { data } = await api.delete<MembresiaResponse>(
      `/consorcios/${id}/administradores/${membresiaId}`
    );
    return data;
  },
};

/* ============================================================
 * EXPORTS ÚTILES
 * ============================================================ */

// Re-exportamos el tipo de dominio útil para consumo en componentes
export type { Consorcio };
