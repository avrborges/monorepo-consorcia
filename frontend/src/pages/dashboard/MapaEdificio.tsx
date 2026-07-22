// src/pages/dashboard/MapaEdificio.tsx
import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineOfficeBuilding,
  HiOutlineUser,
  HiOutlineTrendingUp,
  HiOutlineExclamationCircle,
  HiX,
  HiCheck,
  HiOutlineTrash,
} from "react-icons/hi";

// 🎯 Capa de servicios (Fase 3)
import { userService, unidadService } from "@/services";

// 🎯 Hook para título dinámico de pestaña (Tanda 1 UX)
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Modal de confirmación estilizado (usado en drawer habitantes)
import ModalConfirmacion from "@/components/common/ModalConfirmacion";

// 🎯 Tipos de dominio compartidos entre backend y frontend
import type { Persona, UnidadFuncional } from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const STORAGE_KEY_UNIDAD_SELECCIONADA = "consorcia_mapa_unidad_seleccionada";

// 🎯 Tolerancia para validar coeficiente total (0.01%)
const COEFICIENTE_TOLERANCIA = 0.0001;

type UnidadPopulada = Omit<UnidadFuncional, "propietario" | "inquilino"> & {
  propietario?: Persona | null;
  inquilino?: Persona | null;
};

/* ============================================================
 * HELPERS
 * ============================================================ */


/* ============================================================
 * SUBCOMPONENTE: DetalleUnidad
 * ============================================================ */
const DetalleUnidad = memo(
  ({
    unidad,
    onCerrar,
    onGestionar,
    onEliminar,
    eliminando,
  }: {
    unidad: UnidadPopulada;
    onCerrar: () => void;
    onGestionar: () => void;
    onEliminar: (id: string) => Promise<void>;
    eliminando: boolean;
  }) => {
    const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

    const handleIntentarEliminar = () => {
      if (confirmandoBorrado) {
        onEliminar(unidad._id);
      } else {
        setConfirmandoBorrado(true);
      }
    };

    return (
      <div className="w-full bg-white border border-slate-200 lg:rounded-2xl p-6 shadow-xs max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-start">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Detalle de Unidad</span>
            <h3 className="text-xl lg:text-2xl font-black text-slate-900 mt-0.5">
              {unidad.piso === "0" || unidad.piso.toLowerCase() === "pb"
                ? `P. Baja "${unidad.departamento}"`
                : `Piso ${unidad.piso}° "${unidad.departamento}"`}
            </h3>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar detalle de la unidad"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <HiOutlineTrendingUp className="w-3.5 h-3.5" /> Coeficiente de Expensas
            </label>
            <p className="text-slate-900 font-bold text-sm mt-0.5">
              {(unidad.coeficiente * 100).toFixed(2)}% ({unidad.coeficiente})
            </p>
          </div>

          <div className="h-px bg-slate-100" />

          <div>
            <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <HiOutlineUser className="w-3.5 h-3.5" /> Propietario
            </label>
            {unidad.propietario ? (
              <div className="mt-1">
                <p className="text-slate-900 font-bold text-sm">{unidad.propietario.name}</p>
                <p className="text-slate-500 text-xs truncate">{unidad.propietario.email}</p>
              </div>
            ) : (
              <p className="text-amber-600 font-medium text-xs mt-1 italic flex items-center gap-1">
                <HiOutlineExclamationCircle className="w-3.5 h-3.5" /> Sin propietario asignado
              </p>
            )}
          </div>

          {(unidad.estadoOcupacion === "inquilino" || !!unidad.inquilino) && (
            <div>
              <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <HiOutlineUser className="w-3.5 h-3.5 text-blue-500" /> Inquilino Ocupante
              </label>
              {unidad.inquilino ? (
                <div className="mt-1">
                  <p className="text-slate-900 font-bold text-sm">{unidad.inquilino.name}</p>
                  <p className="text-slate-500 text-xs truncate">{unidad.inquilino.email}</p>
                </div>
              ) : (
                <p className="text-slate-400 font-medium text-xs mt-1 italic">Cargando inquilino...</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
          <button
            onClick={onGestionar}
            className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl transition cursor-pointer active:scale-[0.98] shadow-lg shadow-slate-900/10"
          >
            Gestionar Habitantes
          </button>

          <button
            onClick={handleIntentarEliminar}
            disabled={eliminando}
            className={`w-full font-bold text-xs py-3 rounded-xl transition cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5 border ${
              confirmandoBorrado
                ? "bg-red-600 hover:bg-red-700 text-white border-transparent animate-pulse"
                : "bg-white hover:bg-red-50 text-red-600 border-red-200"
            } disabled:opacity-50`}
          >
            <HiOutlineTrash className="w-4 h-4 shrink-0" />
            <span>
              {eliminando
                ? "Eliminando..."
                : confirmandoBorrado
                ? "¿Confirmar Eliminación?"
                : "Eliminar Unidad"}
            </span>
          </button>

          {confirmandoBorrado && (
            <button
              onClick={() => setConfirmandoBorrado(false)}
              className="w-full text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 transition py-1 cursor-pointer"
            >
              Cancelar acción
            </button>
          )}
        </div>
      </div>
    );
  }
);

DetalleUnidad.displayName = "DetalleUnidad";

/* ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================ */
export default function MapaEdificio() {
  useDocumentTitle("Unidades funcionales");

  const [unidades, setUnidades] = useState<UnidadPopulada[]>([]);
  const [usuariosSistema, setUsuariosSistema] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadPopulada | null>(null);
  const [eliminandoUnidad, setEliminandoUnidad] = useState<boolean>(false);

  const [mostrarFormAlta, setMostrarFormAlta] = useState<boolean>(false);
  const [nuevoPiso, setNuevoPiso] = useState<string>("");
  const [nuevoDepto, setNuevoDepto] = useState<string>("");
  const [nuevoCoeficiente, setNuevoCoeficiente] = useState<string>("0.05");
  const [creandoUnidad, setCreandoUnidad] = useState<boolean>(false);

  const [drawerAbierto, setDrawerAbierto] = useState<boolean>(false);
  const [nuevoPropietarioId, setNuevoPropietarioId] = useState<string>("");
  const [nuevoInquilinoId, setNuevoInquilinoId] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);

  const [mostrarConfirmarCierreDrawer, setMostrarConfirmarCierreDrawer] = useState<boolean>(false);

  const valoresInicialesDrawer = useRef<{ propietarioId: string; inquilinoId: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let activo = true;

    const inicializarMapa = async () => {
      try {
        const [dataUnidades, dataUsuarios] = await Promise.all([
          unidadService.getAll(controller.signal),
          userService.getAll(controller.signal),
        ]);

        if (!activo) return;

        if (dataUnidades.ok && dataUnidades.unidades) {
          const unidadesPop = dataUnidades.unidades as UnidadPopulada[];
          setUnidades(unidadesPop);

          try {
            const idPersistido = sessionStorage.getItem(STORAGE_KEY_UNIDAD_SELECCIONADA);
            if (idPersistido) {
              const encontrada = unidadesPop.find((u) => u._id === idPersistido);
              if (encontrada) {
                setUnidadSeleccionada(encontrada);
              }
            }
          } catch { /* silent */ }
        }

        if (dataUsuarios.success && dataUsuarios.users) {
          setUsuariosSistema(dataUsuarios.users);
        }
      } catch (error) {
        if ((error as { code?: string })?.code === "ERR_CANCELED") return;
        console.error("Error al cargar los datos del edificio:", error);
      } finally {
        if (activo) setCargando(false);
      }
    };

    void inicializarMapa();

    return () => {
      activo = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    try {
      if (unidadSeleccionada) {
        sessionStorage.setItem(STORAGE_KEY_UNIDAD_SELECCIONADA, unidadSeleccionada._id);
      } else {
        sessionStorage.removeItem(STORAGE_KEY_UNIDAD_SELECCIONADA);
      }
    } catch { /* silent */ }
  }, [unidadSeleccionada]);

  const handleCrearUnidad = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!nuevoPiso || !nuevoDepto) return;
      setCreandoUnidad(true);

      try {
        const data = await unidadService.create({
          piso: nuevoPiso,
          departamento: nuevoDepto,
          coeficiente: parseFloat(nuevoCoeficiente) || 0,
          estadoOcupacion: "vacio",
        });

        if (data.ok && data.unidad) {
          setUnidades((prev) => [...prev, data.unidad as UnidadPopulada]);
          setNuevoPiso("");
          setNuevoDepto("");
          setNuevoCoeficiente("0.05");
          setMostrarFormAlta(false);
        }
      } catch (error) {
        console.error("Error al crear la unidad funcional:", error);
      } finally {
        setCreandoUnidad(false);
      }
    },
    [nuevoPiso, nuevoDepto, nuevoCoeficiente]
  );

  const handleEliminarUnidad = useCallback(async (id: string) => {
    setEliminandoUnidad(true);
    try {
      const data = await unidadService.delete(id);
      if (data.ok) {
        setUnidades((prev) => prev.filter((u) => u._id !== id));
        setUnidadSeleccionada(null);
      }
    } catch (error) {
      console.error("Error al eliminar la unidad funcional:", error);
    } finally {
      setEliminandoUnidad(false);
    }
  }, []);

  const abrirGestionHabitantes = useCallback(() => {
    if (!unidadSeleccionada) return;
    const propInicial = unidadSeleccionada.propietario?._id || "";
    const inqInicial = unidadSeleccionada.inquilino?._id || "";
    setNuevoPropietarioId(propInicial);
    setNuevoInquilinoId(inqInicial);
    valoresInicialesDrawer.current = { propietarioId: propInicial, inquilinoId: inqInicial };
    setDrawerAbierto(true);
  }, [unidadSeleccionada]);

  const drawerTieneCambios = useCallback((): boolean => {
    if (!valoresInicialesDrawer.current) return false;
    return (
      nuevoPropietarioId !== valoresInicialesDrawer.current.propietarioId ||
      nuevoInquilinoId !== valoresInicialesDrawer.current.inquilinoId
    );
  }, [nuevoPropietarioId, nuevoInquilinoId]);

  const intentarCerrarDrawer = useCallback(() => {
    if (guardando) return;
    if (drawerTieneCambios()) {
      setMostrarConfirmarCierreDrawer(true);
      return;
    }
    setDrawerAbierto(false);
  }, [guardando, drawerTieneCambios]);

  const confirmarDescartarCambiosDrawer = useCallback(() => {
    setMostrarConfirmarCierreDrawer(false);
    setDrawerAbierto(false);
  }, []);

  const cancelarCierreDrawer = useCallback(() => {
    setMostrarConfirmarCierreDrawer(false);
  }, []);

  const guardarHabitantes = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!unidadSeleccionada) return;
      setGuardando(true);

      try {
        const data = await unidadService.vincularHabitantes(unidadSeleccionada._id, {
          propietarioId: nuevoPropietarioId || null,
          inquilinoId: nuevoInquilinoId || null,
        });

        if (data.ok && data.unidad) {
          const unidadActualizada = data.unidad as UnidadPopulada;
          setUnidades((prev) =>
            prev.map((u) => (u._id === unidadActualizada._id ? unidadActualizada : u))
          );
          setUnidadSeleccionada(unidadActualizada);
          setDrawerAbierto(false);
        }
      } catch (error) {
        console.error("Error al vincular habitantes:", error);
      } finally {
        setGuardando(false);
      }
    },
    [unidadSeleccionada, nuevoPropietarioId, nuevoInquilinoId]
  );

  const handleCerrarDetalle = useCallback(() => {
    setUnidadSeleccionada(null);
  }, []);

  useEffect(() => {
    const manejarEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (mostrarConfirmarCierreDrawer) return;

      if (drawerAbierto) {
        intentarCerrarDrawer();
      } else if (unidadSeleccionada) {
        handleCerrarDetalle();
      }
    };

    document.addEventListener("keydown", manejarEscape);
    return () => document.removeEventListener("keydown", manejarEscape);
  }, [drawerAbierto, unidadSeleccionada, mostrarConfirmarCierreDrawer, intentarCerrarDrawer, handleCerrarDetalle]);

  useEffect(() => {
    const evaluarScroll = () => {
      const esPantallaPequeña = window.innerWidth < 1024;
      const interactivoAbierto = drawerAbierto || (unidadSeleccionada !== null && esPantallaPequeña);

      if (interactivoAbierto) {
        document.documentElement.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
      } else {
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }
    };

    evaluarScroll();
    window.addEventListener("resize", evaluarScroll);
    return () => {
      window.removeEventListener("resize", evaluarScroll);
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [drawerAbierto, unidadSeleccionada]);

  const edificioEstructurado = useMemo(() => {
    const grupos: Record<string, UnidadPopulada[]> = {};
    unidades.forEach((u) => {
      if (!grupos[u.piso]) grupos[u.piso] = [];
      grupos[u.piso].push(u);
    });
    Object.keys(grupos).forEach((piso) => {
      grupos[piso].sort((a, b) => a.departamento.localeCompare(b.departamento));
    });
    return Object.entries(grupos).sort((a, b) => {
      const numA = parseInt(a[0], 10);
      const numB = parseInt(b[0], 10);
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numB - numA;
    });
  }, [unidades]);

  // 🎯 Mejora 2: Contadores por estado de ocupación
  const contadoresEstado = useMemo(() => {
    const conteo = { propietario: 0, inquilino: 0, vacio: 0 };
    unidades.forEach((u) => {
      if (u.inquilino) conteo.inquilino++;
      else if (u.propietario) conteo.propietario++;
      else conteo.vacio++;
    });
    return conteo;
  }, [unidades]);

  // 🎯 Mejora 1: Coeficiente total del edificio con validación
  const coeficienteInfo = useMemo(() => {
    const total = unidades.reduce((acc, u) => acc + (u.coeficiente || 0), 0);
    const totalPct = total * 100;
    const diff = 1 - total;
    const diffPct = Math.abs(diff) * 100;

    if (Math.abs(diff) < COEFICIENTE_TOLERANCIA) {
      return { estado: "balanceado" as const, totalPct, diffPct: 0 };
    }
    if (diff > 0) {
      return { estado: "falta" as const, totalPct, diffPct };
    }
    return { estado: "excede" as const, totalPct, diffPct };
  }, [unidades]);

  const generarAriaLabelUnidad = (u: UnidadPopulada): string => {
    const ubicacion =
      u.piso === "0" || u.piso.toLowerCase() === "pb"
        ? `Planta baja departamento ${u.departamento}`
        : `Piso ${u.piso} departamento ${u.departamento}`;

    let estado = "vacío";
    if (u.inquilino) {
      estado = `ocupado por inquilino ${u.inquilino.name}`;
    } else if (u.propietario) {
      estado = `ocupado por propietario ${u.propietario.name}`;
    }

    return `${ubicacion}, ${estado}. Click para ver detalle.`;
  };

  if (cargando) {
    return (
      <div
        className="flex h-60 items-center justify-center text-slate-400 font-medium"
        role="status"
        aria-live="polite"
      >
        Cargando plano estructural del consorcio...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50/50 min-h-screen pb-28 lg:pb-6">
      {/* 1. CABECERA */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight text-[#0f172a]">
            Unidades Funcionales
          </h1>
          <p className="text-[#64748b] text-xs md:text-sm mt-1">
            Visualizá, filtrá y controlá la distribución y habitabilidad de las unidades del consorcio.
          </p>
        </div>

        <button
          onClick={() => setMostrarFormAlta((prev) => !prev)}
          aria-label={mostrarFormAlta ? "Cerrar formulario de nueva unidad" : "Abrir formulario para crear nueva unidad"}
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
              <span>Nueva Unidad</span>
            </>
          )}
        </button>
      </div>

      {/* 2. SOLAPAS DE NAVEGACIÓN */}
      <div className="border-b border-slate-200 mb-6 md:mb-8">
        <div className="flex">
          <span className="border-b-2 border-slate-900 pb-3 px-1 text-xs font-bold text-slate-900 cursor-default tracking-wide uppercase">
            Lista de Unidades
          </span>
        </div>
      </div>

      {/* Formulario rápido colapsable para crear U.F. */}
      {mostrarFormAlta && (
        <form onSubmit={handleCrearUnidad} className="mb-8 bg-white border border-slate-200 p-5 rounded-2xl flex flex-wrap gap-4 items-end shadow-xs animate-in fade-in duration-200">
          <div className="w-24">
            <label htmlFor="nueva-unidad-piso" className="block text-slate-600 font-bold text-[11px] uppercase mb-1">Piso</label>
            <input id="nueva-unidad-piso" type="text" required placeholder="Ej: 1" value={nuevoPiso} onChange={(e) => setNuevoPiso(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-900" />
          </div>
          <div className="w-28">
            <label htmlFor="nueva-unidad-depto" className="block text-slate-600 font-bold text-[11px] uppercase mb-1">Dpto / Nro</label>
            <input id="nueva-unidad-depto" type="text" required placeholder="Ej: A" value={nuevoDepto} onChange={(e) => setNuevoDepto(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-900" />
          </div>
          <div className="w-32">
            <label htmlFor="nueva-unidad-coef" className="block text-slate-600 font-bold text-[11px] uppercase mb-1">Coeficiente</label>
            <input id="nueva-unidad-coef" type="number" step="0.00001" required value={nuevoCoeficiente} onChange={(e) => setNuevoCoeficiente(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-900" />
          </div>
          <button type="submit" disabled={creandoUnidad} className="bg-[#0f172a] hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs h-9.5 px-4 rounded-lg transition flex items-center gap-1.5 cursor-pointer">
            <HiCheck className="w-4 h-4" />
            <span>{creandoUnidad ? "Creando..." : "Guardar"}</span>
          </button>
        </form>
      )}

      {/* 3. GRID ASIMÉTRICO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAPA */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <HiOutlineOfficeBuilding className="w-5 h-5 text-slate-400" />
              <h2 className="text-base lg:text-lg font-bold text-slate-900">Mapa de Unidades</h2>
            </div>

            {/* Referencias + Contadores + Coeficiente total */}
            <div className="flex flex-wrap gap-2 mb-6 md:mb-8" role="list" aria-label="Referencias de colores y estado del mapa">
              {/* 🎯 Mejora 2: Píldoras con contador */}
              <div role="listitem" className="flex items-center gap-1.5 bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-extrabold text-[#047857] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                Propietario ({contadoresEstado.propietario})
              </div>
              <div role="listitem" className="flex items-center gap-1.5 bg-[#eff6ff] border border-[#bfdbfe] px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-extrabold text-[#1d4ed8] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                Inquilino ({contadoresEstado.inquilino})
              </div>
              <div role="listitem" className="flex items-center gap-1.5 bg-[#f8fafc] border border-[#e2e8f0] px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-extrabold text-[#64748b] uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#cbd5e1]" />
                Vacío ({contadoresEstado.vacio})
              </div>

              {/* 🎯 Mejora 1: Coeficiente total con validación */}
              {unidades.length > 0 && (
                <div
                  role="listitem"
                  aria-label={`Coeficiente total del edificio: ${coeficienteInfo.totalPct.toFixed(2)}%${
                    coeficienteInfo.estado === "balanceado"
                      ? ", balanceado"
                      : coeficienteInfo.estado === "falta"
                      ? `, falta ${coeficienteInfo.diffPct.toFixed(2)}%`
                      : `, excede ${coeficienteInfo.diffPct.toFixed(2)}%`
                  }`}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider border ${
                    coeficienteInfo.estado === "balanceado"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                  title={
                    coeficienteInfo.estado === "balanceado"
                      ? "El coeficiente total del edificio suma exactamente 100%."
                      : coeficienteInfo.estado === "falta"
                      ? `El coeficiente total es del ${coeficienteInfo.totalPct.toFixed(2)}%. Faltan ${coeficienteInfo.diffPct.toFixed(2)} puntos porcentuales para llegar al 100%.`
                      : `El coeficiente total es del ${coeficienteInfo.totalPct.toFixed(2)}%. Excede el 100% en ${coeficienteInfo.diffPct.toFixed(2)} puntos porcentuales.`
                  }
                >
                  {coeficienteInfo.estado === "balanceado" ? (
                    <HiCheck className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <HiOutlineExclamationCircle className="w-3 h-3" aria-hidden="true" />
                  )}
                  <span>
                    Coef. total: {coeficienteInfo.totalPct.toFixed(2)}%
                    {coeficienteInfo.estado === "falta" && ` (falta ${coeficienteInfo.diffPct.toFixed(2)}%)`}
                    {coeficienteInfo.estado === "excede" && ` (excede ${coeficienteInfo.diffPct.toFixed(2)}%)`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Plano Estructural */}
          <div className="flex-1 flex flex-col justify-center py-2">
            <div className="flex flex-col gap-4 md:gap-5 max-w-2xl mx-auto border-l-2 border-slate-100 pl-4 md:pl-6 w-full">
              {edificioEstructurado.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50 w-full">
                  No hay unidades cargadas en el sistema.
                </div>
              ) : (
                edificioEstructurado.map(([piso, dptos]) => (
                  <div key={piso} className="flex items-center gap-4 md:gap-6 group">
                    <div className="w-14 md:w-16 text-left text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-slate-900 transition-colors shrink-0">
                      {piso === "0" || piso.toLowerCase() === "pb" ? "P. Baja" : `Piso ${piso}`}
                    </div>
                    <div className="flex flex-wrap gap-2 md:gap-2.5 flex-1">
                      {dptos.map((u) => {
                        const esSeleccionada = unidadSeleccionada?._id === u._id;
                        const estado = u.estadoOcupacion?.toLowerCase();

                        let clasesOcupacion: string;
                        if (estado === "inquilino" || !!u.inquilino) {
                          clasesOcupacion = "bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8] hover:bg-[#dbeafe]/80";
                        } else if (estado === "propietario" || !!u.propietario) {
                          clasesOcupacion = "bg-[#ecfdf5] border-[#a7f3d0] text-[#047857] hover:bg-[#d1fae5]/80";
                        } else {
                          clasesOcupacion = "bg-[#f8fafc] border-[#e2e8f0] text-[#64748b] border-dashed hover:bg-[#f1f5f9]";
                        }

                        // 🎯 Indicador de ocupación (dot sutil en esquina)
                        const tieneInquilino = !!u.inquilino;
                        const tienePropietario = !!u.propietario;
                        const claseDot = tieneInquilino
                          ? "bg-blue-500"
                          : tienePropietario
                          ? "bg-emerald-500"
                          : "";

                        return (
                          <button
                            key={u._id}
                            onClick={() => setUnidadSeleccionada(u)}
                            aria-label={generarAriaLabelUnidad(u)}
                            aria-pressed={esSeleccionada}
                            className={`relative px-3 rounded-xl border text-xs lg:text-sm font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center min-w-12 md:min-w-16 h-10.5 md:h-12.5 ${clasesOcupacion} ${
                              esSeleccionada ? "ring-2 ring-slate-900 ring-offset-2 scale-105" : "hover:scale-[1.02]"
                            }`}
                          >
                            {u.departamento}
                            {claseDot && (
                              <span
                                aria-hidden="true"
                                className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${claseDot} shadow-sm`}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* DETALLE LATERAL / BOTTOM SHEET */}
        <div className="w-full lg:col-span-1">
          {unidadSeleccionada ? (
            <>
              <div className="hidden lg:block lg:sticky lg:top-6 z-0 w-full shrink-0">
                <DetalleUnidad
                  key={unidadSeleccionada._id}
                  unidad={unidadSeleccionada}
                  onCerrar={handleCerrarDetalle}
                  onGestionar={abrirGestionHabitantes}
                  onEliminar={handleEliminarUnidad}
                  eliminando={eliminandoUnidad}
                />
              </div>

              {createPortal(
                <div
                  className="fixed inset-x-0 bottom-0 z-110 flex items-end justify-center lg:hidden w-screen h-screen pointer-events-none"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Detalle de la unidad ${unidadSeleccionada.departamento}`}
                >
                  <div
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity pointer-events-auto"
                    onClick={handleCerrarDetalle}
                    aria-label="Cerrar detalle"
                  />
                  <div className="relative w-full bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 ease-out z-10 max-h-[85vh] overflow-y-auto pointer-events-auto pb-12">
                    <div
                      className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 cursor-pointer"
                      onClick={handleCerrarDetalle}
                      role="button"
                      aria-label="Cerrar detalle"
                    />
                    <DetalleUnidad
                      key={unidadSeleccionada._id}
                      unidad={unidadSeleccionada}
                      onCerrar={handleCerrarDetalle}
                      onGestionar={abrirGestionHabitantes}
                      onEliminar={handleEliminarUnidad}
                      eliminando={eliminandoUnidad}
                    />
                  </div>
                </div>,
                document.body
              )}
            </>
          ) : (
            <div className="hidden lg:flex border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-medium text-xs h-80 flex-col items-center justify-center gap-3 bg-white shadow-xs lg:sticky lg:top-6">
              <HiOutlineOfficeBuilding className="w-10 h-10 text-slate-300" />
              <span className="max-w-50 leading-relaxed text-[#64748b]">
                Seleccioná un departamento del mapa para ver y gestionar sus habitantes, expensas y datos de ocupación.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* GESTIÓN DE HABITANTES (DRAWER / BOTTOM SHEET) */}
      {drawerAbierto &&
        unidadSeleccionada &&
        createPortal(
          <div
            className="fixed inset-0 z-120 overflow-hidden flex items-end lg:items-start lg:justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-habitantes-titulo"
          >
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={intentarCerrarDrawer}
              aria-label="Cerrar drawer"
            />
            <form
              onSubmit={guardarHabitantes}
              className="relative w-full lg:w-96 h-[85vh] lg:h-screen bg-white shadow-2xl rounded-t-3xl lg:rounded-none transition-all duration-300 ease-in-out animate-in slide-in-from-bottom lg:slide-in-from-bottom-0 lg:slide-in-from-right flex flex-col justify-between z-10"
            >
              <div>
                <div
                  className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 lg:hidden cursor-pointer"
                  onClick={intentarCerrarDrawer}
                  role="button"
                  aria-label="Cerrar drawer"
                />
                <div className="border-b border-slate-100 p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <h4
                      id="drawer-habitantes-titulo"
                      className="text-sm md:text-base font-black text-slate-900"
                    >
                      Asignar Habitantes:{" "}
                      {unidadSeleccionada.piso === "0" || unidadSeleccionada.piso.toLowerCase() === "pb"
                        ? ""
                        : `${unidadSeleccionada.piso}°`}{" "}
                      "{unidadSeleccionada.departamento}"
                    </h4>
                    <button
                      type="button"
                      onClick={intentarCerrarDrawer}
                      aria-label="Cerrar formulario de asignación de habitantes"
                      className="text-slate-400 hover:text-slate-600 transition p-1.5 cursor-pointer rounded-lg hover:bg-slate-50"
                    >
                      <HiX className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-5 md:p-6 space-y-5 overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-12rem)]">
                  <div>
                    <label htmlFor="drawer-propietario" className="block text-slate-700 font-bold text-xs mb-1.5 uppercase tracking-wider">
                      Propietario de la Unidad
                    </label>
                    <select
                      id="drawer-propietario"
                      value={nuevoPropietarioId}
                      onChange={(e) => setNuevoPropietarioId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-900 shadow-xs"
                    >
                      <option value="">-- Sin Propietario / Vacío --</option>
                      {usuariosSistema.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="drawer-inquilino" className="block text-slate-700 font-bold text-xs mb-1.5 uppercase tracking-wider">
                      Inquilino / Ocupante (Opcional)
                    </label>
                    <select
                      id="drawer-inquilino"
                      value={nuevoInquilinoId}
                      onChange={(e) => setNuevoInquilinoId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-900 shadow-xs"
                    >
                      <option value="">-- Sin Inquilino --</option>
                      {usuariosSistema.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 p-5 md:p-6 bg-slate-50/50 flex items-center justify-end gap-3 pb-10 md:pb-6">
                <button
                  type="button"
                  onClick={intentarCerrarDrawer}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2.5 text-xs font-bold bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-slate-900/10"
                >
                  <HiCheck className="w-4 h-4" />
                  <span>{guardando ? "Guardando..." : "Confirmar Cambios"}</span>
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      {/* Modal de confirmación de cierre del drawer con cambios sin guardar */}
      <ModalConfirmacion
        abierto={mostrarConfirmarCierreDrawer}
        titulo="¿Descartar los cambios?"
        mensaje="Tenés cambios sin guardar en la asignación de habitantes de"
        nombreUsuario={
          unidadSeleccionada
            ? `${
                unidadSeleccionada.piso === "0" || unidadSeleccionada.piso.toLowerCase() === "pb"
                  ? "P. Baja"
                  : `Piso ${unidadSeleccionada.piso}°`
              } "${unidadSeleccionada.departamento}"`
            : "la unidad"
        }
        labelConfirmar="Descartar cambios"
        labelCargando="Descartando..."
        textoFinal=". Si continuás, se perderán los datos ingresados."
        variante="advertencia"
        onCerrar={cancelarCierreDrawer}
        onConfirmar={confirmarDescartarCambiosDrawer}
        loading={false}
      />
    </div>
  );
}