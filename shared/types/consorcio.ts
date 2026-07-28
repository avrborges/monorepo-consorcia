// shared/types/consorcio.ts

/**
 * Representación pública de un Consorcio (edificio administrado por CONSORCIA).
 *
 * Este es el tenant raíz del sistema multi-tenant. Todos los demás objetos
 * (Unidades, Membresías, Auditoría, Expensas) son propiedad de un Consorcio
 * específico y sólo son accesibles por usuarios con membresía activa en él.
 */
export interface Consorcio {
  _id: string;

  /** Nombre visible del edificio (ej: "Edificio Talcahuano 500") */
  nombre: string;

  /** Dirección de la calle (ej: "Talcahuano 500") */
  direccion: string;

  /** CUIT del consorcio (formato: XX-XXXXXXXX-X). Opcional. */
  cuit?: string;

  /** Localidad (ej: "CABA", "San Isidro") */
  localidad?: string;

  /** Provincia */
  provincia?: string;

  /** Código postal */
  codigoPostal?: string;

  /**
   * Notas administrativas internas (visibles solo para superadmin/admin).
   * Útil para observaciones sobre el edificio.
   */
  notas?: string;

  /**
   * true = consorcio activo (operativo)
   * false = consorcio deshabilitado (los usuarios no pueden acceder, pero
   * los datos históricos se preservan para auditoría/legal).
   */
  activo: boolean;

  createdAt?: string;
  updatedAt?: string;
}