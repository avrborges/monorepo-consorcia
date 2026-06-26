import { memo, useState, useEffect, useRef } from "react";
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
  HiOutlineTrash,
  HiDotsVertical, // 🆕 Nuevo ícono para los tres puntos
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
      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs shrink-0">
        <HiOutlineShieldCheck className="w-4 h-4 shrink-0" />
        <span>Activa</span>
      </div>
    );
  }
  if (estado === "pendiente") {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs animate-pulse shrink-0">
        <HiOutlineClock className="w-4 h-4 shrink-0" />
        <span>Pendiente</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs shrink-0">
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
  onEliminar: (usuario: Usuario) => void;
}

/* ============================================================
 * COMPONENTE PRINCIPAL OPTIMIZADO
 * ============================================================ */
export default function UsuariosTable({
  usuarios,
  orden,
  onClickOrden,
  onEditar,
  onToggleEstado,
  onEliminar,
}: UsuariosTableProps) {
  // 🆕 Rastrea qué ID de usuario tiene el menú desplegable abierto
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // 🆕 Cerrar el menú si se hace clic en cualquier otra parte de la pantalla
  useEffect(() => {
    function manejarClickAfuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setMenuAbiertoId(null);
      }
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, []);

  const toggleMenu = (id: string) => {
    setMenuAbiertoId((prev) => (prev === id ? null : id));
  };

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
    // 🆕 Agregamos la ref y overflow-visible para que el menú flotante no se corte
    <div ref={contenedorRef} className="overflow-visible">
      <table className="w-full min-w-237.5 text-left border-collapse layout-auto">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-100">
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
            
            <th 
              className="hidden xl:table-cell px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-slate-900"
              onClick={() => onClickOrden("unidadFuncional")}
            >
              <div className="flex items-center gap-1">
                <span>U.F.</span>
                {renderIconoOrden("unidadFuncional")}
              </div>
            </th>
            
            <th className="hidden lg:table-cell px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Teléfono
            </th>
            
            <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Estado
            </th>
            
            <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-20 min-w-20">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 font-medium text-sm text-slate-700">
          {usuarios.length > 0 ? (
            usuarios.map((u) => {
              const esInactivo = u.estado === "inactivo";
              const elMenuEstaAbierto = menuAbiertoId === u._id;

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
                    <div className="flex items-center gap-2 max-w-60 truncate" title={u.email}>
                      <HiOutlineMail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className={`${esInactivo ? "line-through" : ""} truncate`}>
                        {u.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <BadgeRol role={u.role} />
                  </td>
                  
                  <td className="hidden xl:table-cell px-4 py-4 text-slate-600 font-bold">
                    {u.unidadFuncional ? (
                      <div className="flex items-center gap-1.5">
                        <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className={esInactivo ? "line-through font-medium text-slate-400" : ""}>
                          {u.unidadFuncional}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-normal">-</span>
                    )}
                  </td>
                  
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
                  
                  {/* 🆕 Celda de Acciones Reestructurada con Menú Desplegable */}
                  <td className="px-4 py-4 text-right overflow-visible relative">
                    <div className="flex items-center justify-end relative">
                      
                      {/* Botón de Tres Puntos */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMenu(u._id);
                        }}
                        title="Ver acciones"
                        className={`p-2 rounded-xl transition cursor-pointer ${
                          elMenuEstaAbierto 
                            ? "bg-slate-900 text-white shadow-sm" 
                            : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <HiDotsVertical className="w-4 h-4" />
                      </button>

                      {/* Menú Desplegable Flotante */}
                      {elMenuEstaAbierto && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200/80 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
                          
                          {/* Opción Editar */}
                          <button
                            onClick={() => {
                              setMenuAbiertoId(null);
                              onEditar(u);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                          >
                            <HiOutlinePencil className="w-4 h-4 text-slate-400" />
                            <span>Editar Datos</span>
                          </button>

                          {/* Opción Cambiar Estado */}
                          <button
                            onClick={() => {
                              setMenuAbiertoId(null);
                              onToggleEstado(u._id);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                          >
                            {esInactivo ? (
                              <>
                                <HiOutlineLockOpen className="w-4 h-4 text-emerald-500" />
                                <span className="text-slate-700">Activar Cuenta</span>
                              </>
                            ) : (
                              <>
                                <HiOutlineLockClosed className="w-4 h-4 text-slate-400" />
                                <span className="text-slate-700">Inactivar Cuenta</span>
                              </>
                            )}
                          </button>

                          <div className="h-px bg-slate-100 my-1" />

                          {/* Opción Eliminar Definitivo */}
                          <button
                            onClick={() => {
                              setMenuAbiertoId(null);
                              onEliminar(u); // Dispara al modal de confirmación del padre
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition cursor-pointer"
                          >
                            <HiOutlineTrash className="w-4 h-4 text-red-500" />
                            <span>Eliminar Usuario</span>
                          </button>

                        </div>
                      )}

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