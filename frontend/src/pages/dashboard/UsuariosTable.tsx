// src/components/dashboard/UsuariosTable.tsx
import { memo, useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
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
  HiDotsVertical,
  HiOutlinePaperAirplane,
  HiCheck,
} from "react-icons/hi";

// 🎯 Tipos de dominio compartidos entre backend y frontend
import type { Persona, Rol, EstadoUsuario } from "@shared/types";

// 🎨 Tipos de UI específicos del ordenamiento de la tabla (viven en ListaUsuarios)
import type { ConfiguracionOrden, ColumnaOrdenable } from "./ListaUsuarios";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const FEEDBACK_COPIADO_MS = 2000;

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
  usuarios: Persona[];
  orden: ConfiguracionOrden;
  onClickOrden: (columna: ColumnaOrdenable) => void;
  onEditar: (usuario: Persona) => void;
  onToggleEstado: (id: string) => void;
  onEliminar: (usuario: Persona) => void;
  onReenviarInvitacion: (id: string) => Promise<void>;
}

/* ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================ */
export default function UsuariosTable({
  usuarios,
  orden,
  onClickOrden,
  onEditar,
  onToggleEstado,
  onEliminar,
  onReenviarInvitacion,
}: UsuariosTableProps) {
  const [menuAbiertoId, setMenuAbiertoId] = useState<string | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // 🎯 Estado para el feedback visual del email copiado
  const [emailCopiadoId, setEmailCopiadoId] = useState<string | null>(null);
  const timeoutCopiadoRef = useRef<number | null>(null);

  const ahoraMs = new Date().getTime();

  /* ------------------------------------------------------------
   * Click afuera del menú kebab → cerrar
   * ------------------------------------------------------------ */
  useEffect(() => {
    function manejarClickAfuera(evento: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(evento.target as Node)) {
        setMenuAbiertoId(null);
      }
    }
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, []);

  /* ------------------------------------------------------------
   * 🎯 Escape → cerrar menú kebab si está abierto
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (menuAbiertoId === null) return;

    const manejarEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAbiertoId(null);
      }
    };

    document.addEventListener("keydown", manejarEscape);
    return () => document.removeEventListener("keydown", manejarEscape);
  }, [menuAbiertoId]);

  /* ------------------------------------------------------------
   * 🎯 Limpieza del timeout de feedback de copiado al desmontar
   * ------------------------------------------------------------ */
  useEffect(() => {
    return () => {
      if (timeoutCopiadoRef.current !== null) {
        window.clearTimeout(timeoutCopiadoRef.current);
      }
    };
  }, []);

  const toggleMenu = (id: string) => {
    setMenuAbiertoId((prev) => (prev === id ? null : id));
  };

  /* ------------------------------------------------------------
   * 🎯 Copiar email al portapapeles con feedback visual
   * ------------------------------------------------------------ */
  const copiarEmail = async (email: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(email);
      setEmailCopiadoId(id);

      // Cancelar timeout anterior si el usuario clickea múltiples emails rápido
      if (timeoutCopiadoRef.current !== null) {
        window.clearTimeout(timeoutCopiadoRef.current);
      }

      timeoutCopiadoRef.current = window.setTimeout(() => {
        setEmailCopiadoId(null);
        timeoutCopiadoRef.current = null;
      }, FEEDBACK_COPIADO_MS);
    } catch (err) {
      // navigator.clipboard puede fallar en contextos no seguros (HTTP sin localhost)
      console.error("No se pudo copiar el email al portapapeles:", err);
    }
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

  /**
   * 🎯 Determina el valor de aria-sort para una columna dada.
   * "ascending" | "descending" | "none"
   */
  const getAriaSort = (columna: ColumnaOrdenable): "ascending" | "descending" | "none" => {
    if (orden.columna !== columna) return "none";
    return orden.direccion === "asc" ? "ascending" : "descending";
  };

  /**
   * 🎯 Handler de teclado para headers ordenables (Enter/Space).
   */
  const manejarTeclaOrden = (
    e: KeyboardEvent<HTMLTableCellElement>,
    columna: ColumnaOrdenable
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClickOrden(columna);
    }
  };

  return (
    <div ref={contenedorRef} className="w-full overflow-x-auto overflow-y-hidden min-h-0">
      <table className="w-full min-w-237.5 text-left border-collapse layout-auto">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-100">
            <th
              scope="col"
              role="button"
              tabIndex={0}
              aria-sort={getAriaSort("name")}
              className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-slate-900"
              onClick={() => onClickOrden("name")}
              onKeyDown={(e) => manejarTeclaOrden(e, "name")}
            >
              <div className="flex items-center gap-1">
                <span>Usuario / Nombre</span>
                {renderIconoOrden("name")}
              </div>
            </th>
            <th scope="col" className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Correo Electrónico
            </th>
            <th scope="col" className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rol Asignado
            </th>

            <th
              scope="col"
              role="button"
              tabIndex={0}
              aria-sort={getAriaSort("unidadFuncional")}
              className="hidden xl:table-cell px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-slate-900"
              onClick={() => onClickOrden("unidadFuncional")}
              onKeyDown={(e) => manejarTeclaOrden(e, "unidadFuncional")}
            >
              <div className="flex items-center gap-1">
                <span>U.F.</span>
                {renderIconoOrden("unidadFuncional")}
              </div>
            </th>

            <th scope="col" className="hidden lg:table-cell px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Teléfono
            </th>

            <th scope="col" className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Estado
            </th>

            <th scope="col" className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-20 min-w-20">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 font-medium text-sm text-slate-700">
          {usuarios.length > 0 ? (
            usuarios.map((u, indice) => {
              const esInactivo = u.estado === "inactivo";
              const esPendiente = u.estado === "pendiente";
              const elMenuEstaAbierto = menuAbiertoId === u._id;
              const emailFueCopiado = emailCopiadoId === u._id;

              const esUltimaFila = usuarios.length > 2 && indice >= usuarios.length - 2;

              const fechaExpiracion = u.tokenExpiracion ? new Date(u.tokenExpiracion).getTime() : 0;
              const estaExpirado = esPendiente && ahoraMs > fechaExpiracion;

              const filaAtenuada = esInactivo || estaExpirado;

              // Variable de control para atenuar las celdas de texto individuales sin afectar las acciones
              const claseOpacidad = filaAtenuada ? "opacity-40" : "";

              return (
                <tr
                  key={u._id}
                  className={`hover:bg-slate-50 transition-colors ${
                    filaAtenuada ? "bg-slate-50/20" : ""
                  }`}
                >
                  <td className={`px-4 py-4 font-bold ${claseOpacidad} ${filaAtenuada ? "text-slate-400 line-through font-medium" : "text-slate-900"}`}>
                    {u.name}
                  </td>

                  {/* 🎯 Celda de email — click para copiar con feedback visual */}
                  <td className={`px-4 py-4 text-slate-500 ${claseOpacidad}`}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void copiarEmail(u.email, u._id);
                      }}
                      title={emailFueCopiado ? "¡Email copiado!" : `Click para copiar: ${u.email}`}
                      aria-label={
                        emailFueCopiado
                          ? `Email de ${u.name} copiado al portapapeles`
                          : `Copiar email de ${u.name}`
                      }
                      className="flex items-center gap-2 max-w-60 text-left cursor-pointer transition-colors"
                    >
                      {emailFueCopiado ? (
                        <HiCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                      ) : (
                        <HiOutlineMail className={`w-4 h-4 shrink-0 ${filaAtenuada ? "text-slate-300" : "text-slate-400"}`} />
                      )}
                      <span
                        className={`truncate transition-colors ${
                          emailFueCopiado
                            ? "text-emerald-600 font-bold"
                            : filaAtenuada
                            ? "line-through text-slate-400"
                            : ""
                        }`}
                      >
                        {u.email}
                      </span>
                    </button>
                  </td>

                  <td className={`px-4 py-4 ${claseOpacidad}`}>
                    <BadgeRol role={u.role} />
                  </td>

                  <td className={`hidden xl:table-cell px-4 py-4 text-slate-600 font-bold ${claseOpacidad}`}>
                    {u.unidadFuncional ? (
                      <div className="flex items-center gap-1.5">
                        <HiOutlineOfficeBuilding className={`w-4 h-4 shrink-0 ${filaAtenuada ? "text-slate-300" : "text-slate-400"}`} />
                        <span className={filaAtenuada ? "line-through font-medium text-slate-400" : ""}>
                          {u.unidadFuncional}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-normal select-none">-</span>
                    )}
                  </td>

                  <td className={`hidden lg:table-cell px-4 py-4 text-slate-500 ${claseOpacidad}`}>
                    {u.telefono ? (
                      <div className="flex items-center gap-1.5">
                        <HiOutlinePhone className={`w-4 h-4 shrink-0 ${filaAtenuada ? "text-slate-300" : "text-slate-400"}`} />
                        <span className={filaAtenuada ? "line-through text-slate-400" : ""}>
                          {u.telefono}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300 font-normal select-none">-</span>
                    )}
                  </td>

                  <td className={`px-4 py-4 ${claseOpacidad}`}>
                    {estaExpirado ? (
                      <div
                        className="flex items-center gap-1.5 text-rose-500/90 font-bold text-xs shrink-0 cursor-help"
                        title="El enlace de invitación enviado por correo caducó (límite de 24 hs)."
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <span>Expirada</span>
                      </div>
                    ) : (
                      <CeldaEstado estado={u.estado} />
                    )}
                  </td>

                  {/* Esta celda de acciones se mantiene sin claseOpacidad para que el menú flote al 100% */}
                  <td className="px-4 py-4 text-right relative">
                    <div className="flex items-center justify-end relative">

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMenu(u._id);
                        }}
                        title="Ver acciones"
                        aria-label={`Acciones para ${u.name}`}
                        aria-haspopup="menu"
                        aria-expanded={elMenuEstaAbierto}
                        className={`p-2 rounded-xl transition cursor-pointer ${
                          elMenuEstaAbierto
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                      >
                        <HiDotsVertical className="w-4 h-4" />
                      </button>

                      {elMenuEstaAbierto && (
                        <div
                          role="menu"
                          aria-orientation="vertical"
                          aria-label={`Acciones disponibles para ${u.name}`}
                          className={`absolute right-0 w-52 bg-white border border-slate-200/80 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in duration-150 ${
                            esUltimaFila
                              ? "bottom-full mb-1 origin-bottom-right slide-in-from-bottom-2"
                              : "top-full mt-1 origin-top-right slide-in-from-top-2"
                          }`}
                        >
                          {esPendiente && (
                            <button
                              role="menuitem"
                              onClick={async () => {
                                setMenuAbiertoId(null);
                                await onReenviarInvitacion(u._id);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-bold text-teal-700 hover:bg-teal-50 flex items-center gap-2.5 transition cursor-pointer"
                            >
                              <HiOutlinePaperAirplane className="w-4 h-4 text-teal-500 rotate-45" />
                              <span>{estaExpirado ? "Renovar Enlace" : "Reenviar Invitación"}</span>
                            </button>
                          )}

                          <button
                            role="menuitem"
                            onClick={() => {
                              setMenuAbiertoId(null);
                              onEditar(u);
                            }}
                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition cursor-pointer"
                          >
                            <HiOutlinePencil className="w-4 h-4 text-slate-400" />
                            <span>Editar Datos</span>
                          </button>

                          {!estaExpirado && (
                            <button
                              role="menuitem"
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
                          )}

                          <div className="h-px bg-slate-100 my-1" role="separator" />

                          <button
                            role="menuitem"
                            onClick={() => {
                              setMenuAbiertoId(null);
                              onEliminar(u);
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
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400 font-medium">
                No se encontraron usuarios con los criterios seleccionados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}