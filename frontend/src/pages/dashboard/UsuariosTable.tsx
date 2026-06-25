import { memo } from "react";
import {
  HiOutlineMail,
  HiOutlineShieldCheck,
  HiOutlinePencil,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlinePhone,
  HiOutlineOfficeBuilding,
  HiChevronUp,
  HiChevronDown,
  HiOutlineClock,
} from "react-icons/hi";

import type {
  Usuario,
  Rol,
  EstadoUsuario,
  ConfiguracionOrden,
  ColumnaOrdenable,
} from "./ListaUsuarios";

/* ============================================================
 * ESTILOS DE BADGE POR ROL
 * ============================================================ */
const ESTILOS_ROL: Record<Rol, string> = {
  superadmin: "bg-purple-50 text-purple-700 border-purple-200/60",
  admin: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  consejo: "bg-blue-50 text-blue-700 border-blue-200/60",
  propietario: "bg-amber-50 text-amber-700 border-amber-200/60",
  inquilino: "bg-slate-100 text-slate-700 border-slate-300/60",
};

/* ============================================================
 * SUBCOMPONENTES MEMOIZADOS
 * ============================================================ */
const BadgeRol = memo(({ role }: { role: Rol }) => (
  <span
    className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
      ESTILOS_ROL[role] ?? ESTILOS_ROL.inquilino
    }`}
  >
    {role}
  </span>
));
BadgeRol.displayName = "BadgeRol";

const CeldaEstado = memo(({ estado }: { estado: EstadoUsuario }) => {
  if (estado === "activo") {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
        <HiOutlineShieldCheck className="w-4 h-4 shrink-0" />
        <span>Activa</span>
      </div>
    );
  }
  if (estado === "pendiente") {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs animate-pulse">
        <HiOutlineClock className="w-4 h-4 shrink-0" />
        <span>Pendiente</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
      <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
      <span>Inactiva</span>
    </div>
  );
});
CeldaEstado.displayName = "CeldaEstado";

/* ============================================================
 * PROPS DEL COMPONENTE
 * ============================================================ */
interface UsuariosTableProps {
  usuarios: Usuario[];
  orden: ConfiguracionOrden;
  onClickOrden: (columna: ColumnaOrdenable) => void;
  onEditar: (usuario: Usuario) => void;
  onToggleEstado: (id: string) => void;
}

/* ============================================================
 * COMPONENTE PRINCIPAL MODIFICADO
 * ============================================================ */
export default function UsuariosTable({
  usuarios,
  orden,
  onClickOrden,
  onEditar,
  onToggleEstado,
}: UsuariosTableProps) {
  const renderIconoOrden = (columna: ColumnaOrdenable) => {
    if (orden.columna !== columna) {
      return (
        <HiChevronDown className="w-4 h-4 text-slate-300 opacity-50 group-hover:opacity-100" />
      );
    }
    return orden.direccion === "asc" ? (
      <HiChevronUp className="w-4 h-4 text-slate-900" />
    ) : (
      <HiChevronDown className="w-4 h-4 text-slate-900" />
    );
  };

  return (
    // 1. Quitamos el overflow-x-auto de acá (ya lo maneja el padre de forma limpia)
    // 2. Agregamos un min-w-[950px] para asegurar legibilidad cuando se achica la pantalla
    <div>
      <table className="w-full min-w-[950px] text-left border-collapse layout-fixed">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-100">
            {/* Optimizamos los paddings horizontales de px-6 a px-4 para dar más aire */}
            <th
              className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-slate-900"
              onClick={() => onClickOrden("name")}
            >
              <div className="flex items-center gap-1">
                <span>Usuario / Nombre</span>
                {renderIconoOrden("name")}
              </div>
            </th>
            <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Correo Electrónico
            </th>
            <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rol Asignado
            </th>
            
            {/* 🌟 COLUMNA RESPONSIVA: Se oculta en notebooks estándar si se reduce el espacio */}
            <th 
              className="hidden xl:table-cell px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-slate-900"
              onClick={() => onClickOrden("unidadFuncional")}
            >
              <div className="flex items-center gap-1">
                <span>U.F.</span>
                {renderIconoOrden("unidadFuncional")}
              </div>
            </th>
            
            {/* 🌟 COLUMNA RESPONSIVA: Se oculta desde pantallas grandes (lg) hacia abajo */}
            <th className="hidden lg:table-cell px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Teléfono
            </th>
            
            <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 font-medium text-sm text-slate-700">
          {usuarios.length > 0 ? (
            usuarios.map((u) => {
              const esInactivo = u.estado === "inactivo";
              return (
                <tr
                  key={u._id}
                  className={`hover:bg-slate-50/40 transition-colors ${
                    esInactivo ? "bg-slate-50/40 opacity-75" : ""
                  }`}
                >
                  <td
                    className={`px-4 py-4 font-bold ${
                      esInactivo
                        ? "text-slate-500 line-through font-medium"
                        : "text-slate-900"
                    }`}
                  >
                    {u.name}
                  </td>
                  <td className="px-4 py-4 text-slate-500">
                    <div className="flex items-center gap-2 max-w-[200px] truncate" title={u.email}>
                      <HiOutlineMail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className={`${esInactivo ? "line-through" : ""} truncate`}>
                        {u.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <BadgeRol role={u.role} />
                  </td>
                  
                  {/* Replicamos exactamente las clases 'hidden xl:table-cell' para mantener consistencia */}
                  <td className="hidden xl:table-cell px-4 py-4 text-slate-600 font-bold">
                    {u.unidadFuncional ? (
                      <div className="flex items-center gap-1.5">
                        <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400 shrink-0" />
                        <span
                          className={
                            esInactivo
                              ? "line-through font-medium text-slate-400"
                              : ""
                          }
                        >
                          {u.unidadFuncional}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-normal">-</span>
                    )}
                  </td>
                  
                  {/* Replicamos las clases 'hidden lg:table-cell' */}
                  <td className="hidden lg:table-cell px-4 py-4 text-slate-500">
                    {u.telefono ? (
                      <div className="flex items-center gap-1.5">
                        <HiOutlinePhone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className={esInactivo ? "line-through" : ""}>
                          {u.telefono}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-normal">-</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4">
                    <CeldaEstado estado={u.estado} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditar(u)}
                        title="Editar usuario"
                        className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      >
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleEstado(u._id)}
                        title={
                          esInactivo ? "Activar cuenta" : "Desactivar cuenta"
                        }
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          esInactivo
                            ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                            : "hover:bg-red-50 text-slate-400 hover:text-red-600"
                        }`}
                      >
                        {esInactivo ? (
                          <HiOutlineLockClosed className="w-4 h-4" />
                        ) : (
                          <HiOutlineLockOpen className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-10 text-center text-sm text-slate-400 font-medium"
              >
                No se encontraron usuarios con los criterios seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}