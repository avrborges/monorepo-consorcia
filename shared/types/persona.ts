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

  /**
   * 🔴 DEPRECADO — Campo legacy de texto libre.
   *
   * Se mantiene por compatibilidad con datos existentes y para no romper
   * el frontend durante la migración. Se eliminará en la Fase 6.
   *
   * A partir de la Fase 2, el frontend deja de escribir en este campo
   * y usa `unidadId` en su lugar.
   */
  unidadFuncional?: string;

  /**
   * 🆕 Referencia a la Unidad Funcional a la que está vinculado el usuario.
   *
   * - `null` o `undefined`: usuario sin unidad asignada (admins, superadmins,
   *   o usuarios propietarios/inquilinos aún no vinculados)
   * - `string`: ObjectId de la Unidad Funcional (serializado como string
   *   por el backend antes de enviar al frontend)
   *
   * La validación de existencia se hace en el backend al crear/editar.
   */
  unidadId?: string | null;

  telefono?: string;
  debeCambiarPassword?: boolean;
  tokenExpiracion?: string;
  createdAt?: string;
  updatedAt?: string;
}