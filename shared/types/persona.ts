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

import type { RolGlobal } from "./membresia";

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
   * 🔴 DEPRECADO en multi-tenant — Referencia a UF única.
   *
   * Se agregó en la Fase 1 del sprint mono-tenant "Consistencia
   * Usuarios ↔ Unidades" y funciona hoy. Con el refactor multi-tenant
   * (Fase M5), un usuario podrá tener múltiples ocupaciones en distintos
   * consorcios, por lo que se migrará al modelo `Ocupacion`.
   *
   * - `null` o `undefined`: usuario sin unidad asignada.
   * - `string`: ObjectId de la Unidad Funcional (serializado como string).
   */
  unidadId?: string | null;

  /**
   * 🆕 Rol GLOBAL del usuario en el sistema (Fase M2.1).
   *
   * - `user`: usuario normal — su acceso depende de sus `Membresia`s
   *   activas en consorcios específicos.
   * - `super_admin_global`: dueño de la administradora, ve todos los
   *   consorcios y puede realizar ABM sobre ellos. Se crea solo por
   *   seed manual (no desde la UI).
   *
   * Default: `"user"`.
   */
  rolGlobal?: RolGlobal;

  telefono?: string;
  debeCambiarPassword?: boolean;
  tokenExpiracion?: string;
  createdAt?: string;
  updatedAt?: string;
}