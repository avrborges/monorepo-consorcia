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

/* ============================================================
 * 🆕 M6.0 — RESPUESTAS DE LA API DE CONSORCIOS
 * ============================================================ */

/**
 * Respuesta de GET /consorcios/:id (M6.0) — precarga del formulario
 * de la pantalla "Configuración del Consorcio".
 */
export interface GetConsorcioResponse {
  ok: boolean;
  consorcio?: Consorcio;
  msg?: string;
  error?: string;
}

/**
 * Respuesta de PUT /consorcios/:id (M6.0), POST /consorcios (M6.1) y
 * PATCH /consorcios/:id/estado (M6.1) — resultado con el consorcio afectado.
 */
export interface ConsorcioResponse {
  ok: boolean;
  consorcio?: Consorcio;
  msg?: string;
  error?: string;
}

/* ============================================================
 * 🆕 M6.1 — ABM de consorcios
 * ============================================================ */

/**
 * Respuesta de GET /consorcios (M6.1) — listado completo de consorcios
 * (activos e inactivos) para el ABM del super_admin_global.
 */
export interface ConsorciosListResponse {
  ok: boolean;
  consorcios?: Consorcio[];
  msg?: string;
  error?: string;
}
