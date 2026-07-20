// src/services/userService.ts
import api from "@/api";

import type {
  Persona,
  Rol,
  EstadoUsuario,
  LoginResponse,
  ErrorResponse,
  SuccessResponse,
  UsuariosListResponse,
  UsuarioResponse,
} from "@shared/types";

/* ============================================================
 * TIPOS DE PAYLOAD (Request)
 * ============================================================ */

export interface CrearUsuarioPayload {
  name: string;
  email: string;
  role: Rol;
  unidadFuncional?: string;
  telefono?: string;
}

export interface ActualizarUsuarioPayload {
  name?: string;
  email?: string;
  role?: Rol;
  unidadFuncional?: string;
  telefono?: string;
}

export interface ActivarCuentaPayload {
  token: string;
  password: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

/* ============================================================
 * TIPOS DE RESPUESTA ESPECÍFICOS (para endpoints sin shape en shared)
 * ============================================================ */

interface ToggleStatusResponse {
  success: true;
  message: string;
  estado: EstadoUsuario;
}

/* ============================================================
 * SERVICIO DE USUARIOS
 * ============================================================ */

export const userService = {
  /**
   * Autenticación — POST /users/login
   *
   * Nota: en el proyecto ya existe `loginRequest` en `api.ts`.
   * Este método está aquí para consolidar la interfaz, pero
   * `loginRequest` sigue funcionando durante la migración.
   */
  login: async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>("/users/login", {
      email,
      password,
    });
    return data;
  },

  /**
   * Activación de cuenta desde el link del correo — POST /users/activar
   */
  activarCuenta: async (payload: ActivarCuentaPayload) => {
    const { data } = await api.post<SuccessResponse>("/users/activar", payload);
    return data;
  },

  /**
   * Solicitar recuperación de contraseña — POST /users/olvide-password
   *
   * 🛡️ El backend SIEMPRE responde 200 con mensaje genérico, exista o no
   * el email (previene enumeración de usuarios). El componente puede tratar
   * cualquier respuesta exitosa como éxito garantizado.
   */
  olvidePassword: async (email: string) => {
    const { data } = await api.post<SuccessResponse>("/users/olvide-password", {
      email,
    });
    return data;
  },

  /**
   * Confirmar reset de contraseña con token — POST /users/reset-password
   *
   * Se llama desde la página `/reset-password?token=xxx` con la nueva
   * contraseña que el usuario ingresó.
   */
  resetPassword: async (payload: ResetPasswordPayload) => {
    const { data } = await api.post<SuccessResponse>(
      "/users/reset-password",
      payload
    );
    return data;
  },

  /**
   * Listar todos los usuarios (admin) — GET /users
   *
   * @param signal - AbortSignal opcional para cancelar el request
   */
  getAll: async (signal?: AbortSignal) => {
    const { data } = await api.get<UsuariosListResponse>("/users", { signal });
    return data;
  },

  /**
   * Crear un nuevo usuario — POST /users
   */
  create: async (payload: CrearUsuarioPayload) => {
    const { data } = await api.post<UsuarioResponse>("/users", payload);
    return data;
  },

  /**
   * Actualizar datos de un usuario existente — PUT /users/:id
   */
  update: async (id: string, payload: ActualizarUsuarioPayload) => {
    const { data } = await api.put<UsuarioResponse>(`/users/${id}`, payload);
    return data;
  },

  /**
   * Alternar estado activo/inactivo — PATCH /users/:id/status
   */
  toggleStatus: async (id: string) => {
    const { data } = await api.patch<ToggleStatusResponse>(
      `/users/${id}/status`
    );
    return data;
  },

  /**
   * Eliminar un usuario definitivamente — DELETE /users/:id
   */
  delete: async (id: string) => {
    const { data } = await api.delete<SuccessResponse>(`/users/${id}`);
    return data;
  },

  /**
   * Reenviar correo de invitación a usuario pendiente
   * POST /users/:id/reenviar-invitacion
   */
  reenviarInvitacion: async (id: string) => {
    const { data } = await api.post<SuccessResponse>(
      `/users/${id}/reenviar-invitacion`
    );
    return data;
  },
};

/* ============================================================
 * EXPORTS ÚTILES
 * ============================================================ */

// Re-exportamos los tipos de respuesta útiles para narrowing en componentes
export type { Persona, ErrorResponse };