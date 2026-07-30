// src/pages/dashboard/Auditoria.tsx
import { HiOutlineShieldExclamation, HiOutlineOfficeBuilding } from "react-icons/hi";

// 🎯 Hook de sesión centralizado (Fase 4)
import { useAuth } from "@/hooks/useAuth";

// 🎯 Hook multi-tenant (M4) — consorcio activo, rol contextual y rol global
import { useConsorcio } from "@/hooks/useConsorcio";

// 🎯 Hook para título dinámico de pestaña (Tanda 1 UX)
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Componente ya existente — solo cambiamos su ubicación de acceso
import HistorialAuditoria from "./HistorialAuditoria";

/**
 * Página dedicada al Historial de Auditoría.
 *
 * Anteriormente accesible como pestaña dentro de la Lista de Usuarios,
 * ahora tiene su propia entrada en el sidebar exclusiva para superadmin.
 *
 * Preserva toda la funcionalidad del componente HistorialAuditoria
 * (auto-refresh, filtros persistidos, copiar log, etc.).
 *
 * 🎯 M4 (multi-tenant): la auditoría ya viene scopeada por consorcio en el
 *    backend (scopeConsorcio). En el frontend forzamos el re-fetch al cambiar
 *    de consorcio remontando HistorialAuditoria mediante `key={consorcioId}`,
 *    sin necesidad de modificar el componente interno.
 */
export default function Auditoria() {
  // 🎯 Título dinámico de la pestaña
  useDocumentTitle("Auditoría");

  // 🛡️ Guard defensivo — la ruta ya está protegida a nivel de router,
  //     pero mantenemos esta capa como salvaguarda extra.
  const { esSuperAdmin } = useAuth();

  // 🎯 Multi-tenant (M4): consorcio activo. Usamos su id como "clave de
  //    remontaje" para HistorialAuditoria y su nombre para el badge del
  //    encabezado, coherente con ListaUsuarios y MapaEdificio.
  const { consorcioActivo, esSuperAdminGlobal } = useConsorcio();
  const consorcioId = consorcioActivo?._id ?? null;
  const consorcioNombre = consorcioActivo?.nombre ?? null;

  if (!esSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
          <HiOutlineShieldExclamation className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Acceso Restringido
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          El Historial de Auditoría es una función exclusiva de la
          administración central de Consorcia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado de página consistente con el resto del dashboard */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Historial de Auditoría
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">
            Trazabilidad completa de las acciones críticas sobre las cuentas y
            unidades funcionales del consorcio.
          </p>

          {/* 🎯 M4: Indicador del consorcio activo (contexto multi-tenant) */}
          {consorcioNombre && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-lg">
              <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-500">
                Consorcio activo:
              </span>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[16rem]">
                {consorcioNombre}
              </span>
              {esSuperAdminGlobal && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 bg-teal-50 border border-teal-100 rounded px-1.5 py-0.5">
                  Global
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Componente existente — sin cambios internos.
          🎯 M4: `key={consorcioId}` fuerza el remontaje al cambiar de
          consorcio, disparando un fetch fresco de la auditoría scopeada. */}
      <HistorialAuditoria key={consorcioId ?? "sin-consorcio"} />
    </div>
  );
}
