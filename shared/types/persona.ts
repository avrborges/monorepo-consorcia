// shared/types/persona.ts

/**
 * Tipos públicos de Persona / Usuario.
 * Estos tipos son la fuente única de verdad y se consumen tanto
 * desde el backend (para tipar respuestas) como desde el frontend
 * (para tipar el estado y las llamadas API).
 *
 * ⚠️ IMPORTANTE: Este archivo NO incluye campos sensibles como
 * `password` o `tokenActivacion`. Esos viven solo en los modelos
 * internos del backend (backend/src/models/User.ts).
 */

export type Rol =
  | "superadmin"
  | "admin"
  | "consejo"
  | "propietario"
  | "inquilino";

export type EstadoUsuario = "activo" | "inactivo" | "pendiente";

/**
 * Representación pública de un usuario/persona.
 * Es lo que el frontend puede ver y manipular.
 */
export interface Persona {
  _id: string;
  name: string;
  email: string;
  role: Rol;
  estado: EstadoUsuario;
  unidadFuncional?: string;
  telefono?: string;
  debeCambiarPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}