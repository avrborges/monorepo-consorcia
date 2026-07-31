// src/pages/dashboard/ConsorciosABM.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  HiOutlineOfficeBuilding,
  HiOutlineExclamationCircle,
  HiCheck,
  HiX,
  HiOutlineLockClosed,
  HiOutlineUserGroup, // 🆕 M6.5 — botón "Administradores"
} from "react-icons/hi";

// 🎯 Capa de servicios (Fase 3)
import { consorcioService } from "@/services";
import type { CrearConsorcioPayload } from "@/services";

// 🎯 Hook para título dinámico de pestaña
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Contexto de consorcio activo / rol global (guard defensivo)
import { useConsorcio } from "@/hooks/useConsorcio";

// 🆕 M6.5 — Drawer de gestión de administradores por consorcio
import DrawerAdministradores from "./DrawerAdministradores";

// 🎯 Tipo de dominio compartido
import type { Consorcio } from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const FORM_ALTA_VACIO: CrearConsorcioPayload = {
  nombre: "",
  direccion: "",
  cuit: "",
  localidad: "",
  provincia: "",
  codigoPostal: "",
  notas: "",
};

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function ConsorciosABM() {
  useDocumentTitle("Gestión de Consorcios");

  // 🔒 Guard defensivo: esta pantalla es exclusiva del super_admin_global.
  const { esSuperAdminGlobal } = useConsorcio();

  const [consorcios, setConsorcios] = useState<Consorcio[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario de alta (colapsable)
  const [mostrarFormAlta, setMostrarFormAlta] = useState<boolean>(false);
  const [formAlta, setFormAlta] = useState<CrearConsorcioPayload>(FORM_ALTA_VACIO);
  const [creando, setCreando] = useState<boolean>(false);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);

  // Estado del toggle en curso (id del consorcio que se está activando/desactivando)
  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);

  // 🆕 M6.5 — Consorcio cuyo drawer de administradores está abierto (null = cerrado)
  const [consorcioAdmins, setConsorcioAdmins] = useState<Consorcio | null>(null);

  /* ------------------------------------------------------------
   * Carga inicial del listado
   * ------------------------------------------------------------ */
  useEffect(() => {
    // Si no es super global, no cargamos nada. El caso se maneja como una
    // rama del render (guard de acceso), sin setState síncrono en el efecto
    // (regla react-hooks/set-state-in-effect).
    if (!esSuperAdminGlobal) return;

    const controller = new AbortController();
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await consorcioService.getAll(controller.signal);
        if (!activo) return;

        if (data.ok && data.consorcios) {
          setConsorcios(data.consorcios);
        } else {
          setError(data.msg || "No se pudieron cargar los consorcios.");
        }
      } catch (err) {
        if ((err as { code?: string })?.code === "ERR_CANCELED") return;
        if (activo) setError("Error de conexión al cargar los consorcios.");
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargar();

    return () => {
      activo = false;
      controller.abort();
    };
  }, [esSuperAdminGlobal]);

  /* ------------------------------------------------------------
   * Contadores (activos / inactivos)
   * ------------------------------------------------------------ */
  const contadores = useMemo(() => {
    const activos = consorcios.filter((c) => c.activo).length;
    return { activos, inactivos: consorcios.length - activos, total: consorcios.length };
  }, [consorcios]);

  /* ------------------------------------------------------------
   * Handler de inputs del form de alta
   * ------------------------------------------------------------ */
  const handleChangeAlta = useCallback(
    (campo: keyof CrearConsorcioPayload) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const valor = e.target.value;
        setFormAlta((prev) => ({ ...prev, [campo]: valor }));
        setErrorAlta(null);
      },
    []
  );

  /* ------------------------------------------------------------
   * Crear consorcio
   * ------------------------------------------------------------ */
  const handleCrear = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formAlta.nombre.trim()) {
        setErrorAlta("El nombre del consorcio es obligatorio.");
        return;
      }
      if (!formAlta.direccion.trim()) {
        setErrorAlta("La dirección es obligatoria.");
        return;
      }

      setCreando(true);
      setErrorAlta(null);

      try {
        const payload: CrearConsorcioPayload = {
          nombre: formAlta.nombre.trim(),
          direccion: formAlta.direccion.trim(),
          cuit: formAlta.cuit?.trim() || "",
          localidad: formAlta.localidad?.trim() || "",
          provincia: formAlta.provincia?.trim() || "",
          codigoPostal: formAlta.codigoPostal?.trim() || "",
          notas: formAlta.notas?.trim() || "",
        };

        const data = await consorcioService.create(payload);

        if (data.ok && data.consorcio) {
          // Insertamos y reordenamos: activos primero, luego por nombre.
          setConsorcios((prev) =>
            [...prev, data.consorcio as Consorcio].sort((a, b) => {
              if (a.activo !== b.activo) return a.activo ? -1 : 1;
              return a.nombre.localeCompare(b.nombre);
            })
          );
          setFormAlta(FORM_ALTA_VACIO);
          setMostrarFormAlta(false);
        } else {
          setErrorAlta(data.msg || "No se pudo crear el consorcio.");
        }
      } catch (err) {
        const msg =
          (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg ||
          "Error al crear el consorcio.";
        setErrorAlta(msg);
      } finally {
        setCreando(false);
      }
    },
    [formAlta]
  );

  /* ------------------------------------------------------------
   * Activar / desactivar (baja lógica)
   * ------------------------------------------------------------ */
  const handleToggleEstado = useCallback(
    async (consorcio: Consorcio) => {
      if (cambiandoEstado) return;
      setCambiandoEstado(consorcio._id);
      setError(null);

      try {
        const nuevoEstado = !consorcio.activo;
        const data = await consorcioService.toggleEstado(consorcio._id, nuevoEstado);

        if (data.ok && data.consorcio) {
          const actualizado = data.consorcio as Consorcio;
          setConsorcios((prev) =>
            prev
              .map((c) => (c._id === actualizado._id ? actualizado : c))
              .sort((a, b) => {
                if (a.activo !== b.activo) return a.activo ? -1 : 1;
                return a.nombre.localeCompare(b.nombre);
              })
          );
        } else {
          setError(data.msg || "No se pudo cambiar el estado del consorcio.");
        }
      } catch (err) {
        const msg =
          (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg ||
          "Error al cambiar el estado del consorcio.";
        setError(msg);
      } finally {
        setCambiandoEstado(null);
      }
    },
    [cambiandoEstado]
  );

  /* ------------------------------------------------------------
   * Render — guard de acceso
   * ------------------------------------------------------------ */
  if (!esSuperAdminGlobal) {
    return (
      <div
        className="flex h-60 flex-col items-center justify-center gap-3 text-slate-400 font-medium text-sm"
        role="alert"
        aria-live="polite"
      >
        <HiOutlineLockClosed className="w-8 h-8 text-slate-300" />
        <span>Esta sección es exclusiva del administrador global.</span>
      </div>
    );
  }

  return (
    <div>
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight text-[#0f172a] flex items-center gap-2.5">
            <HiOutlineOfficeBuilding className="w-7 h-7 text-slate-400" />
            Gestión de Consorcios
          </h1>
          <p className="text-[#64748b] text-xs md:text-sm mt-1">
            Alta, listado y activación/desactivación de los consorcios de la plataforma.
          </p>
        </div>

        <button
          onClick={() => setMostrarFormAlta((prev) => !prev)}
          aria-expanded={mostrarFormAlta}
          className="flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold py-3 px-5 rounded-xl transition cursor-pointer active:scale-[0.99] shrink-0"
        >
          {mostrarFormAlta ? (
            <>
              <HiX className="w-4 h-4" />
              <span>Cerrar Formulario</span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold leading-none">+</span>
              <span>Nuevo Consorcio</span>
            </>
          )}
        </button>
      </div>

      {/* Píldoras de contadores */}
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Activos ({contadores.activos})
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          Inactivos ({contadores.inactivos})
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
          Total ({contadores.total})
        </div>
      </div>

      {/* FORMULARIO DE ALTA (colapsable) */}
      {mostrarFormAlta && (
        <form
          onSubmit={handleCrear}
          className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-in fade-in duration-200"
        >
          {errorAlta && (
            <div
              className="mb-5 flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl"
              role="alert"
            >
              <HiOutlineExclamationCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorAlta}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Nombre */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="alta-nombre" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                Nombre del Consorcio <span className="text-red-500">*</span>
              </label>
              <input
                id="alta-nombre"
                type="text"
                required
                value={formAlta.nombre}
                onChange={handleChangeAlta("nombre")}
                placeholder="Ej: Edificio Talcahuano 500"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
              />
            </div>

            {/* Dirección */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="alta-direccion" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                Dirección <span className="text-red-500">*</span>
              </label>
              <input
                id="alta-direccion"
                type="text"
                required
                value={formAlta.direccion}
                onChange={handleChangeAlta("direccion")}
                placeholder="Ej: Talcahuano 500"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
              />
            </div>

            {/* CUIT */}
            <div>
              <label htmlFor="alta-cuit" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                CUIT
              </label>
              <input
                id="alta-cuit"
                type="text"
                value={formAlta.cuit}
                onChange={handleChangeAlta("cuit")}
                placeholder="30-12345678-9"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
              />
            </div>

            {/* Código Postal */}
            <div>
              <label htmlFor="alta-cp" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                Código Postal
              </label>
              <input
                id="alta-cp"
                type="text"
                value={formAlta.codigoPostal}
                onChange={handleChangeAlta("codigoPostal")}
                placeholder="Ej: 1425"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
              />
            </div>

            {/* Localidad */}
            <div>
              <label htmlFor="alta-localidad" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                Localidad
              </label>
              <input
                id="alta-localidad"
                type="text"
                value={formAlta.localidad}
                onChange={handleChangeAlta("localidad")}
                placeholder="Ej: CABA"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
              />
            </div>

            {/* Provincia */}
            <div>
              <label htmlFor="alta-provincia" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                Provincia
              </label>
              <input
                id="alta-provincia"
                type="text"
                value={formAlta.provincia}
                onChange={handleChangeAlta("provincia")}
                placeholder="Ej: Buenos Aires"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
              />
            </div>

            {/* Notas */}
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="alta-notas" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                Notas administrativas
              </label>
              <textarea
                id="alta-notas"
                rows={3}
                value={formAlta.notas}
                onChange={handleChangeAlta("notas")}
                placeholder="Observaciones internas sobre el edificio."
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition resize-y"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setMostrarFormAlta(false);
                setFormAlta(FORM_ALTA_VACIO);
                setErrorAlta(null);
              }}
              className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creando}
              className="flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-5 rounded-xl transition cursor-pointer active:scale-[0.99] disabled:opacity-50 shadow-md shadow-slate-900/10"
            >
              <HiCheck className="w-4 h-4" />
              <span>{creando ? "Creando..." : "Crear Consorcio"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ERROR GLOBAL */}
      {error && (
        <div
          className="mb-4 flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl"
          role="alert"
        >
          <HiOutlineExclamationCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* LISTADO */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs w-full overflow-hidden">
        {cargando ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-400 animate-pulse" role="status" aria-live="polite">
            Cargando consorcios...
          </div>
        ) : consorcios.length === 0 ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-400">
            No hay consorcios registrados. Creá el primero con "Nuevo Consorcio".
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {consorcios.map((c) => {
              const estaCambiando = cambiandoEstado === c._id;
              return (
                <li key={c._id} className="flex items-center gap-4 p-4 md:px-6 hover:bg-slate-50/50 transition">
                  {/* Ícono */}
                  <span
                    className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${
                      c.activo ? "bg-[#0b132b] text-[#fca311]" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <HiOutlineOfficeBuilding className="w-5 h-5" />
                  </span>

                  {/* Datos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-900 truncate">{c.nombre}</p>
                      {c.activo ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                          Activo
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {c.direccion}
                      {c.localidad ? ` · ${c.localidad}` : ""}
                      {c.cuit ? ` · CUIT ${c.cuit}` : ""}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* 🆕 M6.5 — Gestionar administradores */}
                    <button
                      type="button"
                      onClick={() => setConsorcioAdmins(c)}
                      aria-label={`Gestionar administradores de ${c.nombre}`}
                      className="flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer active:scale-[0.98]"
                    >
                      <HiOutlineUserGroup className="w-4 h-4" />
                      <span className="hidden sm:inline">Administradores</span>
                    </button>

                    {/* Acción: activar / desactivar */}
                    <button
                      type="button"
                      onClick={() => handleToggleEstado(c)}
                      disabled={estaCambiando}
                      className={`text-xs font-bold py-2 px-3.5 rounded-xl border transition cursor-pointer active:scale-[0.98] disabled:opacity-50 ${
                        c.activo
                          ? "bg-white hover:bg-red-50 text-red-600 border-red-200"
                          : "bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {estaCambiando
                        ? "Guardando..."
                        : c.activo
                        ? "Desactivar"
                        : "Activar"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 🆕 M6.5 — Drawer de gestión de administradores */}
      <DrawerAdministradores
        consorcio={consorcioAdmins}
        onCerrar={() => setConsorcioAdmins(null)}
      />
    </div>
  );
}
