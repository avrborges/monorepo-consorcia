// src/components/layout/SelectorConsorcio.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { HiOutlineOfficeBuilding, HiChevronDown, HiCheck } from "react-icons/hi";

import { userService, consorcioService } from "@/services";
import {
  getConsorcioActivo,
  guardarSesion,
  type ConsorcioActivoSesion,
} from "@/lib/session";

// 🎯 Rol global (super_admin_global) para decidir qué consorcios listar (M6.6)
import { useConsorcio } from "@/hooks/useConsorcio";

/* ============================================================
 * TIPOS
 * ============================================================ */

/**
 * 🆕 M6.6 — Shape común normalizado para el selector.
 *
 * Unifica las 2 fuentes de datos:
 *   - misConsorcios() → { membresiaId, consorcio: {_id, nombre, direccion} }  (usuario normal)
 *   - getAll()        → Consorcio[] con {_id, nombre, direccion, activo}       (super_admin_global)
 */
interface ConsorcioSeleccionable {
  _id: string;
  nombre: string;
  direccion: string;
}

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function SelectorConsorcio() {
  // 🆕 M6.6 — el super global ve TODOS los consorcios; el resto solo los suyos.
  const { esSuperAdminGlobal } = useConsorcio();

  const [consorcios, setConsorcios] = useState<ConsorcioSeleccionable[]>([]);
  const [activo] = useState<ConsorcioActivoSesion | null>(() => getConsorcioActivo());
  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [cargado, setCargado] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🎯 Cargar los consorcios disponibles al montar (según el rol global)
  useEffect(() => {
    let vivo = true;

    const cargar = async () => {
      try {
        if (esSuperAdminGlobal) {
          // 🆕 M6.6 — Super global: todos los consorcios ACTIVOS del sistema.
          const data = await consorcioService.getAll();
          if (!vivo) return;
          if (data.ok && data.consorcios) {
            const seleccionables: ConsorcioSeleccionable[] = data.consorcios
              .filter((c) => c.activo)
              .map((c) => ({ _id: c._id, nombre: c.nombre, direccion: c.direccion }));
            setConsorcios(seleccionables);
          }
        } else {
          // Usuario normal: solo los consorcios donde tiene membresía activa.
          const data = await userService.misConsorcios();
          if (!vivo) return;
          if (data.success) {
            const seleccionables: ConsorcioSeleccionable[] = data.consorcios.map((c) => ({
              _id: c.consorcio._id,
              nombre: c.consorcio.nombre,
              direccion: c.consorcio.direccion,
            }));
            setConsorcios(seleccionables);
          }
        }
      } catch (err) {
        console.error("Error al cargar consorcios:", err);
      } finally {
        if (vivo) setCargado(true);
      }
    };

    void cargar();
    return () => {
      vivo = false;
    };
  }, [esSuperAdminGlobal]);

  // 🎯 Cerrar el dropdown al hacer click afuera
  useEffect(() => {
    if (!abierto) return;
    const manejarClickAfuera = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", manejarClickAfuera);
    return () => document.removeEventListener("mousedown", manejarClickAfuera);
  }, [abierto]);

  const handleCambiar = useCallback(
    async (consorcioId: string) => {
      // Si ya es el activo, solo cerrar
      if (activo?._id === consorcioId) {
        setAbierto(false);
        return;
      }
      if (cambiando) return;

      setCambiando(consorcioId);
      try {
        // Cambio temporal (no marca default)
        const data = await userService.cambiarConsorcio(consorcioId, false);

        guardarSesion(data.token, data.user, {
          activeConsorcio: data.activeConsorcio,
          roleEnConsorcioActivo: data.roleEnConsorcioActivo,
          rolGlobal: data.rolGlobal,
        });

        // 🔄 Recargar la app para refrescar todos los datos scopeados
        //    (unidades, usuarios, auditoría del nuevo consorcio).
        window.location.href = "/dashboard";
      } catch (err) {
        console.error("Error al cambiar de consorcio:", err);
        setCambiando(null);
      }
    },
    [activo, cambiando]
  );

  const nombreActivo = activo?.nombre || "Consorcio";

  // Mientras carga, mostramos el nombre del activo sin dropdown
  if (!cargado || consorcios.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-slate-600">
        <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold truncate max-w-40">{nombreActivo}</span>
      </div>
    );
  }

  // Si solo hay 1 consorcio → texto informativo (sin dropdown)
  if (consorcios.length === 1) {
    return (
      <div className="flex items-center gap-1.5 text-slate-600">
        <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold truncate max-w-40">{nombreActivo}</span>
      </div>
    );
  }

  // Si hay múltiples consorcios → dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
      >
        <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-bold truncate max-w-40">{nombreActivo}</span>
        <HiChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {esSuperAdminGlobal ? "Consorcios (Super Admin)" : "Cambiar de consorcio"}
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {consorcios.map((c) => {
              const esActivo = activo?._id === c._id;
              const estaCambiando = cambiando === c._id;

              return (
                <button
                  key={c._id}
                  type="button"
                  role="option"
                  aria-selected={esActivo}
                  disabled={Boolean(cambiando)}
                  onClick={() => handleCambiar(c._id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition ${
                    esActivo ? "bg-teal-50" : "hover:bg-slate-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                >
                  <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-500">
                    <HiOutlineOfficeBuilding className="w-4 h-4" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-800 truncate">
                      {c.nombre}
                    </span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {c.direccion}
                    </span>
                  </span>
                  {estaCambiando ? (
                    <svg className="animate-spin h-4 w-4 text-teal-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : esActivo ? (
                    <HiCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
