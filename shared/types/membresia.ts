// shared/types/membresia.ts

/**
 * Rol GLOBAL del usuario (independiente de cualquier consorcio).
 *
 * - `user`: usuario normal — su acceso depende de las membresías activas
 *   que tenga en consorcios específicos.
 * - `super_admin_global`: dueño de la administradora. Puede ver TODOS los
 *   consorcios del sistema y realizar ABM sobre ellos. Se crea solo por
 *   seed inicial, NO desde la UI.
 *
 * NOTA: este rol vive en el modelo User (no en Membresia). Determina si el
 * usuario puede saltarse el scope de consorcio.
 */
export type RolGlobal = "user" | "super_admin_global";

/**
 * Rol del usuario DENTRO de un consorcio específico.
 *
 * Un usuario puede tener múltiples membresías en el mismo consorcio
 * (ej: `admin` Y `propietario` en el mismo edificio). Decisión #2 del
 * refactor multi-tenant.
 */
export type RolMembresia =
  | "superadmin"    // Superadmin del CONSORCIO (no del sistema global)
  | "admin"         // Administrador operativo del edificio
  | "consejo"       // Miembro del consejo de administración
  | "propietario"   // Propietario de al menos 1 UF en este consorcio
  | "inquilino";    // Inquilino en al menos 1 UF en este consorcio

/**
 * Estado de la membresía.
 *
 * - `activa`: el usuario puede acceder al consorcio con este rol.
 * - `inactiva`: la membresía existe pero no da acceso (histórico legal,
 *   ex-propietarios, admins removidos, etc.). Los datos se preservan
 *   para trazabilidad.
 */
export type EstadoMembresia = "activa" | "inactiva";

/**
 * Representación pública de una Membresia.
 *
 * Es la relación N:N entre User y Consorcio, con un rol específico.
 * Un mismo par (userId, consorcioId) puede tener múltiples membresías
 * (una por cada rol distinto que ejerza en ese consorcio).
 */
export interface Membresia {
  _id: string;
  userId: string;
  consorcioId: string;
  role: RolMembresia;
  estado: EstadoMembresia;

  /**
   * 🆕 Flag "consorcio default" del usuario (Fase M2.6.2).
   *
   * - `true`: al hacer login, el usuario entra directo a este consorcio
   *   sin ver el selector.
   * - `false`: si el usuario tiene múltiples membresías activas, verá
   *   el selector en cada login hasta que marque una como default.
   *
   * Regla de negocio: cada `userId` puede tener MÁXIMO UNA membresía
   * con `esDefault: true` simultáneamente. Se garantiza en la capa
   * de servicio (no con índice único, porque los usuarios con 1 sola
   * membresía pueden legítimamente tener esDefault: false).
   */
  esDefault: boolean;

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Membresia con los datos del consorcio populados.
 * Se usa en el selector post-login para mostrar el nombre del consorcio.
 */
export interface MembresiaConConsorcio extends Membresia {
  consorcio: {
    _id: string;
    nombre: string;
    direccion: string;
    activo: boolean;
  };
}