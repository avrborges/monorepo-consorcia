// src/hooks/useConsorcio.ts
import { useState } from "react";

import {
  getConsorcioActivo,
  getRoleEnConsorcioActivo,
  getRolGlobal,
  esSuperAdminGlobal,
  type ConsorcioActivoSesion,
} from "@/lib/session";

import type { RolMembresia, RolGlobal } from "@shared/types";

/* ============================================================
 * TIPOS
 * ============================================================ */

export interface UseConsorcioResult {
  /** El consorcio activo actual, o null si no hay sesión */
  consorcioActivo: ConsorcioActivoSesion | null;
  /** Nombre del consorcio activo (o fallback "Consorcio") */
  nombreConsorcio: string;
  /** Rol del usuario en el consorcio activo (multi-tenant), o null */
  roleEnConsorcio: RolMembresia | null;
  /** Rol global del usuario ("user" | "super_admin_global"), o null */
  rolGlobal: RolGlobal | null;
  /** true si el usuario es super_admin_global */
  esSuperAdminGlobal: boolean;
}

/* ============================================================
 * HOOK
 * ============================================================ */

/**
 * Hook que expone el contexto de consorcio activo (multi-tenant).
 *
 * Lee de la capa de sesión (session.ts). Como el cambio de consorcio
 * recarga la app completa (window.location), el valor se inicializa una
 * vez al montar y es estable durante toda la vida del componente.
 *
 * @example
 *   const { nombreConsorcio, roleEnConsorcio, esSuperAdminGlobal } = useConsorcio();
 *   <h1>Estás en {nombreConsorcio}</h1>
 */
export function useConsorcio(): UseConsorcioResult {
  // Lazy init: se lee una sola vez al montar (estable hasta el próximo reload)
  const [consorcioActivo] = useState<ConsorcioActivoSesion | null>(() =>
    getConsorcioActivo()
  );
  const [roleEnConsorcio] = useState<RolMembresia | null>(() =>
    getRoleEnConsorcioActivo()
  );
  const [rolGlobal] = useState<RolGlobal | null>(() => getRolGlobal());
  const [superAdminGlobal] = useState<boolean>(() => esSuperAdminGlobal());

  return {
    consorcioActivo,
    nombreConsorcio: consorcioActivo?.nombre || "Consorcio",
    roleEnConsorcio,
    rolGlobal,
    esSuperAdminGlobal: superAdminGlobal,
  };
}