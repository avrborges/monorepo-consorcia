// src/pages/dashboard/HistorialAuditoria.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import {
  HiOutlineChip,
  HiOutlineUserAdd,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiSearch,
  HiX,
  HiCheck,
  HiBell,
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlineHome,
} from "react-icons/hi";

// 🎯 Capa de servicios (Fase 3)
import { auditService } from "@/services";

// 🎯 Tipos de dominio compartidos entre backend y frontend
import type { AuditLog, AccionAuditoria, TipoEntidad } from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const AUTO_REFRESH_MS = 60 * 1000; // 60 segundos
const FEEDBACK_COPIADO_MS = 2000;

// 🎯 Claves para persistir filtros en sessionStorage
const STORAGE_KEY_BUSQUEDA = "consorcia_auditoria_busqueda";
const STORAGE_KEY_ACCION = "consorcia_auditoria_accion";
const STORAGE_KEY_ENTIDAD = "consorcia_auditoria_entidad";
const STORAGE_KEY_DESDE = "consorcia_auditoria_desde";
const STORAGE_KEY_HASTA = "consorcia_auditoria_hasta";

const VALORES_ACCION_VALIDOS: readonly (AccionAuditoria | "TODOS")[] = [
  "TODOS",
  "USUARIO_CREADO",
  "USUARIO_EDITADO",
  "USUARIO_ELIMINADO",
  "UNIDAD_CREADA",
  "UNIDAD_EDITADA",
  "UNIDAD_ELIMINADA",
  "HABITANTES_VINCULADOS",
];

const VALORES_ENTIDAD_VALIDOS: readonly (TipoEntidad | "TODOS")[] = [
  "TODOS",
  "USUARIO",
  "UNIDAD",
];

/* ============================================================
 * HELPERS
 * ============================================================ */

function leerFiltroPersistido<T extends string>(
  key: string,
  valoresPermitidos: readonly T[],
  defaultValue: T
): T {
  try {
    const valor = sessionStorage.getItem(key);
    if (valor && (valoresPermitidos as readonly string[]).includes(valor)) {
      return valor as T;
    }
  } catch {
    /* silent */
  }
  return defaultValue;
}

function leerStringPersistido(key: string, defaultValue: string): string {
  try {
    return sessionStorage.getItem(key) || defaultValue;
  } catch {
    return defaultValue;
  }
}

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function HistorialAuditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [logsNuevosCount, setLogsNuevosCount] = useState<number>(0);
  const cantidadLogsPreviaRef = useRef<number>(0);

  const [logCopiadoId, setLogCopiadoId] = useState<string | null>(null);
  const timeoutCopiadoRef = useRef<number | null>(null);

  // 🛠️ Filtros (persistidos en sessionStorage)
  const [busqueda, setBusqueda] = useState<string>(() =>
    leerStringPersistido(STORAGE_KEY_BUSQUEDA, "")
  );
  const [filtroAccion, setFiltroAccion] = useState<AccionAuditoria | "TODOS">(() =>
    leerFiltroPersistido(STORAGE_KEY_ACCION, VALORES_ACCION_VALIDOS, "TODOS")
  );
  // 🆕 Filtro por tipo de entidad
  const [filtroEntidad, setFiltroEntidad] = useState<TipoEntidad | "TODOS">(() =>
    leerFiltroPersistido(STORAGE_KEY_ENTIDAD, VALORES_ENTIDAD_VALIDOS, "TODOS")
  );
  const [fechaDesde, setFechaDesde] = useState<string>(() =>
    leerStringPersistido(STORAGE_KEY_DESDE, "")
  );
  const [fechaHasta, setFechaHasta] = useState<string>(() =>
    leerStringPersistido(STORAGE_KEY_HASTA, "")
  );

  /* ------------------------------------------------------------
   * Persistencia de filtros en sessionStorage
   * ------------------------------------------------------------ */
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_BUSQUEDA, busqueda); } catch { /* silent */ }
  }, [busqueda]);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_ACCION, filtroAccion); } catch { /* silent */ }
  }, [filtroAccion]);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_ENTIDAD, filtroEntidad); } catch { /* silent */ }
  }, [filtroEntidad]);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_DESDE, fechaDesde); } catch { /* silent */ }
  }, [fechaDesde]);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY_HASTA, fechaHasta); } catch { /* silent */ }
  }, [fechaHasta]);

  /* ------------------------------------------------------------
   * Carga de logs
   * ------------------------------------------------------------ */
  const cargarLogs = useCallback(
    async (opciones: { esRefreshVisible?: boolean; esAutoRefresh?: boolean } = {}) => {
      const { esRefreshVisible = false, esAutoRefresh = false } = opciones;

      if (esRefreshVisible) setLoading(true);
      if (!esAutoRefresh) setError(null);

      try {
        const data = await auditService.getLogs();

        if (data.success) {
          const nuevos = data.logs;

          if (esAutoRefresh && cantidadLogsPreviaRef.current > 0) {
            const diferencia = nuevos.length - cantidadLogsPreviaRef.current;
            if (diferencia > 0) {
              setLogsNuevosCount((prev) => prev + diferencia);
            }
          }

          cantidadLogsPreviaRef.current = nuevos.length;
          setLogs(nuevos);
          if (!esAutoRefresh) setError(null);
        } else {
          if (!esAutoRefresh) setError("No se pudo cargar el historial.");
        }
      } catch (err) {
        console.error("Error al cargar logs:", err);
        if (!esAutoRefresh) setError("Error de conexión con el servidor.");
      } finally {
        if (esRefreshVisible) setLoading(false);
        if (!esRefreshVisible && !esAutoRefresh) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let activo = true;
    const inicializar = async () => {
      if (activo) await cargarLogs();
    };
    void inicializar();
    return () => { activo = false; };
  }, [cargarLogs]);

  /* ------------------------------------------------------------
   * Auto-refresh cada 60s (solo si tab visible)
   * ------------------------------------------------------------ */
  useEffect(() => {
    const intervaloId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void cargarLogs({ esAutoRefresh: true });
      }
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervaloId);
  }, [cargarLogs]);

  useEffect(() => {
    const manejarVisibilidad = () => {
      if (document.visibilityState === "visible") {
        void cargarLogs({ esAutoRefresh: true });
      }
    };
    document.addEventListener("visibilitychange", manejarVisibilidad);
    return () => document.removeEventListener("visibilitychange", manejarVisibilidad);
  }, [cargarLogs]);

  useEffect(() => {
    return () => {
      if (timeoutCopiadoRef.current !== null) {
        window.clearTimeout(timeoutCopiadoRef.current);
      }
    };
  }, []);

  const recargarManual = useCallback(async () => {
    await cargarLogs({ esRefreshVisible: true });
    setLogsNuevosCount(0);
  }, [cargarLogs]);

  const reconocerLogsNuevos = useCallback(() => {
    setLogsNuevosCount(0);
  }, []);

  /**
   * 🎯 Copia los detalles del log al portapapeles.
   */
  const copiarLog = async (log: AuditLog): Promise<void> => {
    const detalles = [
      `Fecha: ${new Date(log.timestamp).toLocaleString("es-AR")}`,
      `Admin: ${log.adminName}`,
      `Acción: ${log.accion}`,
      `Tipo: ${log.tipoEntidad}`,
      `Entidad: ${log.detalles.nombreEntidad}`,
    ];

    if (log.detalles.cambios && Object.keys(log.detalles.cambios).length > 0) {
      detalles.push(`Cambios: ${traducirCambios(log.detalles.cambios)}`);
    }

    const texto = detalles.join(" | ");

    try {
      await navigator.clipboard.writeText(texto);
      setLogCopiadoId(log._id);

      if (timeoutCopiadoRef.current !== null) {
        window.clearTimeout(timeoutCopiadoRef.current);
      }

      timeoutCopiadoRef.current = window.setTimeout(() => {
        setLogCopiadoId(null);
        timeoutCopiadoRef.current = null;
      }, FEEDBACK_COPIADO_MS);
    } catch (err) {
      console.error("No se pudo copiar el log al portapapeles:", err);
    }
  };

  /* ------------------------------------------------------------
   * 🎨 Íconos por acción (ampliado con acciones de unidades)
   * ------------------------------------------------------------ */
  const getIconoAccion = (accion: AccionAuditoria) => {
    switch (accion) {
      case "USUARIO_CREADO":
        return <HiOutlineUserAdd className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "USUARIO_EDITADO":
        return <HiOutlinePencilAlt className="w-4 h-4 text-amber-600 shrink-0" />;
      case "USUARIO_ELIMINADO":
        return <HiOutlineTrash className="w-4 h-4 text-red-600 shrink-0" />;
      case "UNIDAD_CREADA":
        return <HiOutlineOfficeBuilding className="w-4 h-4 text-teal-600 shrink-0" />;
      case "UNIDAD_EDITADA":
        return <HiOutlinePencilAlt className="w-4 h-4 text-blue-600 shrink-0" />;
      case "UNIDAD_ELIMINADA":
        return <HiOutlineTrash className="w-4 h-4 text-rose-600 shrink-0" />;
      case "HABITANTES_VINCULADOS":
        return <HiOutlineUserGroup className="w-4 h-4 text-indigo-600 shrink-0" />;
      default:
        return <HiOutlineChip className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  /* ------------------------------------------------------------
   * 🎨 Estilos del círculo por acción (ampliado)
   * ------------------------------------------------------------ */
  const getEstilosCirculo = (accion: AccionAuditoria) => {
    switch (accion) {
      case "USUARIO_CREADO":
        return "bg-emerald-50 border-emerald-200 text-emerald-600";
      case "USUARIO_EDITADO":
        return "bg-amber-50 border-amber-200 text-amber-600";
      case "USUARIO_ELIMINADO":
        return "bg-red-50 border-red-200 text-red-600";
      case "UNIDAD_CREADA":
        return "bg-teal-50 border-teal-200 text-teal-600";
      case "UNIDAD_EDITADA":
        return "bg-blue-50 border-blue-200 text-blue-600";
      case "UNIDAD_ELIMINADA":
        return "bg-rose-50 border-rose-200 text-rose-600";
      case "HABITANTES_VINCULADOS":
        return "bg-indigo-50 border-indigo-200 text-indigo-600";
      default:
        return "bg-slate-50 border-slate-200 text-slate-600";
    }
  };

  /* ------------------------------------------------------------
   * 📝 Traducción del texto principal de la acción
   * ------------------------------------------------------------ */
  const getTextoAccion = (accion: AccionAuditoria): string => {
    switch (accion) {
      case "USUARIO_CREADO":
        return "Dio de alta al usuario: ";
      case "USUARIO_EDITADO":
        return "Modificó al usuario: ";
      case "USUARIO_ELIMINADO":
        return "Eliminó al usuario: ";
      case "UNIDAD_CREADA":
        return "Dio de alta la unidad: ";
      case "UNIDAD_EDITADA":
        return "Modificó la unidad: ";
      case "UNIDAD_ELIMINADA":
        return "Eliminó la unidad: ";
      case "HABITANTES_VINCULADOS":
        return "Modificó los habitantes de: ";
      default:
        return "Acción sobre: ";
    }
  };

  /* ------------------------------------------------------------
   * 🌐 Traducción inteligente de "cambios"
   * Detecta si un campo es una referencia de habitante y usa
   * el nombre snapshot si está disponible (auditoría inmutable).
   * ------------------------------------------------------------ */
  const traducirCambios = (cambios?: Record<string, unknown>): string | null => {
    if (!cambios) return null;

    // Labels legibles por campo
    const labels: Record<string, string> = {
      // Usuarios
      name: "Nombre",
      email: "Email",
      role: "Rol",
      unidadFuncional: "UF",
      telefono: "Teléfono",
      estado: "Estado",
      // Unidades (crear/eliminar)
      piso: "Piso",
      departamento: "Depto",
      coeficiente: "Coeficiente",
      estadoOcupacion: "Ocupación",
      propietarioId: "Propietario ID",
      inquilinoId: "Inquilino ID",
      propietarioNombre: "Propietario",
      inquilinoNombre: "Inquilino",
      // Habitantes vinculados
      propietarioAnterior: "Propietario anterior (ID)",
      propietarioAnteriorNombre: "Propietario anterior",
      propietarioNuevo: "Propietario nuevo (ID)",
      propietarioNuevoNombre: "Propietario nuevo",
      inquilinoAnterior: "Inquilino anterior (ID)",
      inquilinoAnteriorNombre: "Inquilino anterior",
      inquilinoNuevo: "Inquilino nuevo (ID)",
      inquilinoNuevoNombre: "Inquilino nuevo",
      estadoAnterior: "Estado anterior",
      estadoNuevo: "Estado nuevo",
    };

    // 🎯 Filtrado inteligente:
    // Si existe un campo `xxxNombre`, ocultamos su versión ID correspondiente.
    // Ejemplo: si hay `propietarioNuevoNombre`, ocultamos `propietarioNuevo` (el ID crudo).
    const camposConNombreDisponible = new Set<string>();
    Object.keys(cambios).forEach((key) => {
      if (key.endsWith("Nombre")) {
        // Extraer el campo base: "propietarioNuevoNombre" → "propietarioNuevo"
        const campoBase = key.replace(/Nombre$/, "");
        camposConNombreDisponible.add(campoBase);
      }
    });

    return Object.entries(cambios)
      .filter(([key, val]) => {
        // Si este campo tiene un `xxxNombre` correspondiente, lo ocultamos
        if (camposConNombreDisponible.has(key)) return false;
        // Ocultamos valores null (sin información útil)
        if (val === null || val === undefined) return false;
        return true;
      })
      .map(([key, val]) => {
        const label = labels[key] || key;
        // Formatear el valor
        let valorFormateado: string;
        if (val === "") {
          valorFormateado = "(vacío)";
        } else {
          valorFormateado = String(val);
        }
        return `${label}: "${valorFormateado}"`;
      })
      .join(" | ");
  };

  /* ------------------------------------------------------------
   * 🎯 Filtrado Multi-Criterio
   * ------------------------------------------------------------ */
  const logsFiltrados = logs.filter((log) => {
    // Filtro por tipo de entidad
    const cumpleEntidad = filtroEntidad === "TODOS" || log.tipoEntidad === filtroEntidad;

    // Filtro por acción
    const cumpleAccion = filtroAccion === "TODOS" || log.accion === filtroAccion;

    // Filtro por texto libre
    const texto = busqueda.toLowerCase().trim();
    const cumpleBusqueda =
      !texto ||
      log.adminName.toLowerCase().includes(texto) ||
      log.detalles.nombreEntidad.toLowerCase().includes(texto);

    // Filtro por fecha desde
    const logFecha = new Date(log.timestamp);

    let cumpleDesde = true;
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      desde.setHours(0, 0, 0, 0);
      cumpleDesde = logFecha >= desde;
    }

    let cumpleHasta = true;
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      cumpleHasta = logFecha <= hasta;
    }

    return cumpleEntidad && cumpleAccion && cumpleBusqueda && cumpleDesde && cumpleHasta;
  });

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroAccion("TODOS");
    setFiltroEntidad("TODOS");
    setFechaDesde("");
    setFechaHasta("");
  };

  const tieneFiltrosActivos =
    busqueda ||
    filtroAccion !== "TODOS" ||
    filtroEntidad !== "TODOS" ||
    fechaDesde ||
    fechaHasta;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm w-full animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">Historial de Auditoría</h3>
          <p className="text-xs text-slate-500 font-medium">Registro de acciones críticas sobre las cuentas y unidades del consorcio.</p>
        </div>
        <button
          type="button"
          onClick={recargarManual}
          disabled={loading}
          title="Actualizar historial"
          aria-label="Actualizar historial de auditoría"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          <HiOutlineRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Banner de logs nuevos detectados */}
      {logsNuevosCount > 0 && (
        <div
          className="mb-4 flex items-center justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-amber-700 text-xs font-bold">
            <HiBell className="w-4 h-4 shrink-0" />
            <span>
              {logsNuevosCount === 1
                ? "Hay 1 registro nuevo desde tu última visita."
                : `Hay ${logsNuevosCount} registros nuevos desde tu última visita.`}
            </span>
          </div>
          <button
            type="button"
            onClick={reconocerLogsNuevos}
            className="text-xs font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 transition cursor-pointer shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-3 mb-6 p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
        {/* Buscador */}
        <div className="relative flex-1 min-w-50">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por entidad o admin..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar en historial de auditoría"
            className="w-full pl-10 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300 transition"
          />
        </div>

        {/* 🆕 Filtro por Entidad */}
        <div className="w-full sm:w-auto md:w-36 shrink-0">
          <select
            value={filtroEntidad}
            onChange={(e) => setFiltroEntidad(e.target.value as TipoEntidad | "TODOS")}
            aria-label="Filtrar por tipo de entidad"
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-slate-300 transition cursor-pointer"
          >
            <option value="TODOS">Todas las entidades</option>
            <option value="USUARIO">Usuarios</option>
            <option value="UNIDAD">Unidades</option>
          </select>
        </div>

        {/* Selector de Acciones */}
        <div className="w-full sm:w-auto md:w-52 shrink-0">
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value as AccionAuditoria | "TODOS")}
            aria-label="Filtrar por tipo de acción"
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-slate-300 transition cursor-pointer"
          >
            <option value="TODOS">Todas las acciones</option>
            <optgroup label="Usuarios">
              <option value="USUARIO_CREADO">Altas de usuario</option>
              <option value="USUARIO_EDITADO">Modif. usuarios</option>
              <option value="USUARIO_ELIMINADO">Bajas de usuario</option>
            </optgroup>
            <optgroup label="Unidades">
              <option value="UNIDAD_CREADA">Altas de unidad</option>
              <option value="UNIDAD_EDITADA">Modif. unidades</option>
              <option value="UNIDAD_ELIMINADA">Bajas de unidad</option>
              <option value="HABITANTES_VINCULADOS">Vinculación habitantes</option>
            </optgroup>
          </select>
        </div>

        {/* Inputs de Fechas */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            aria-label="Fecha desde"
            className="w-full sm:w-36 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-slate-300 transition cursor-pointer"
          />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">al</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            aria-label="Fecha hasta"
            className="w-full sm:w-36 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-slate-300 transition cursor-pointer"
          />
        </div>

        {/* Botón Limpiar */}
        {tieneFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            aria-label="Limpiar todos los filtros"
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer shrink-0"
          >
            <HiX className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {loading && logs.length === 0 && (
        <div
          className="py-12 text-center text-xs font-semibold text-slate-400 animate-pulse"
          role="status"
          aria-live="polite"
        >
          Cargando logs de auditoría...
        </div>
      )}

      {error && (
        <div
          className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl mb-4"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {!loading && logs.length === 0 && !error && (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          No hay movimientos registrados.
        </div>
      )}

      {!loading && logs.length > 0 && logsFiltrados.length === 0 && (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          No se encontraron movimientos que coincidan con los filtros aplicados.
        </div>
      )}

      {/* LISTADO DEL HISTORIAL */}
      <div className="relative space-y-4 max-h-150 overflow-y-auto pr-3 scrollbar-thin">
        {logsFiltrados.map((log) => {
          const logCopiado = logCopiadoId === log._id;
          const iconoTipoEntidad =
            log.tipoEntidad === "UNIDAD" ? (
              <HiOutlineHome className="w-3 h-3" />
            ) : (
              <HiOutlineUserAdd className="w-3 h-3" />
            );

          return (
            <div key={log._id} className="flex items-start gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className={`mt-2 w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white shadow-sm transition duration-200 shrink-0 ${getEstilosCirculo(log.accion)}`}>
                {getIconoAccion(log.accion)}
              </div>

              <button
                type="button"
                onClick={() => void copiarLog(log)}
                title={logCopiado ? "¡Detalles copiados!" : "Click para copiar los detalles del registro"}
                aria-label={`Registro de ${log.adminName}: ${log.accion} sobre ${log.detalles.nombreEntidad}. Click para copiar detalles.`}
                className={`flex-1 text-left p-3.5 rounded-xl border transition duration-200 cursor-pointer ${
                  logCopiado
                    ? "bg-emerald-50 border-emerald-200 group-hover:bg-emerald-50"
                    : "bg-slate-50/50 group-hover:bg-slate-50 border-slate-100"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${logCopiado ? "text-emerald-700" : "text-slate-800"}`}>
                      {log.adminName}
                    </span>
                    {/* 🆕 Chip pequeño indicando tipo de entidad */}
                    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      log.tipoEntidad === "UNIDAD"
                        ? "bg-teal-50 text-teal-700 border border-teal-100"
                        : "bg-slate-50 text-slate-700 border border-slate-100"
                    }`}>
                      {iconoTipoEntidad}
                      {log.tipoEntidad}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {logCopiado && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        <HiCheck className="w-3 h-3" />
                        Copiado
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(log.timestamp).toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>

                <p className={`text-xs font-medium mt-1 ${logCopiado ? "text-emerald-700" : "text-slate-600"}`}>
                  {getTextoAccion(log.accion)}
                  <span className={`font-bold ${logCopiado ? "text-emerald-800" : "text-slate-700"}`}>
                    {log.detalles.nombreEntidad}
                  </span>
                </p>

                {log.detalles.cambios && Object.keys(log.detalles.cambios || {}).length > 0 && (
                  <div className={`mt-2 text-[10px] rounded-lg py-1 px-2.5 font-mono wrap-break-word border ${
                    logCopiado
                      ? "bg-white border-emerald-100 text-emerald-700"
                      : "bg-white border-slate-100 text-slate-500"
                  }`}>
                    {traducirCambios(log.detalles.cambios)}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}