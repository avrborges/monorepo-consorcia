// src/pages/dashboard/Auditoria.tsx
import { HiOutlineShieldExclamation } from "react-icons/hi";

// 🎯 Hook de sesión centralizado (Fase 4)
import { useAuth } from "@/hooks/useAuth";

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
 */
export default function Auditoria() {
  // 🎯 Título dinámico de la pestaña
  useDocumentTitle("Auditoría");

  // 🛡️ Guard defensivo — la ruta ya está protegida a nivel de router,
  //     pero mantenemos esta capa como salvaguarda extra.
  const { esSuperAdmin } = useAuth();

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
        </div>
      </div>

      {/* Componente existente sin cambios */}
      <HistorialAuditoria />
    </div>
  );
}