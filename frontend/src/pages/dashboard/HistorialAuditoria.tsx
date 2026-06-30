// src/pages/dashboard/HistorialAuditoria.tsx
import { useEffect, useState } from "react";
import { HiOutlineChip, HiOutlineUserAdd, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineRefresh, HiSearch, HiX } from "react-icons/hi";

interface LogItem {
  _id: string;
  adminName: string;
  accion: "USUARIO_CREADO" | "USUARIO_EDITADO" | "USUARIO_ELIMINADO";
  detalles: {
    nombreUsuario: string;
    cambios?: Record<string, unknown>;
  };
  timestamp: string;
}

export default function HistorialAuditoria() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 🛠️ Estados para Filtros
  const [busqueda, setBusqueda] = useState<string>("");
  const [filtroAccion, setFiltroAccion] = useState<string>("TODOS");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");

  const cargarLogs = async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    setError(null);
    try {
      const baseUrl = (import.meta.env?.VITE_API_URL as string) || `http://${window.location.hostname}:5000`;
      const token = localStorage.getItem("token"); 

      const res = await fetch(`${baseUrl}/api/users/audit-logs`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      } else {
        setError(data.message || "No se pudo cargar el historial.");
      }
    } catch (err) {
      console.error("Error al cargar logs:", err);
      setError("Error de conexión con el servidor.");
    } finally { 
      setLoading(false);
    }
  };

  useEffect(() => {
    let activo = true;
    const inicializar = async () => {
      if (activo) {
        await cargarLogs(false);
      }
    };
    void inicializar();
    return () => {
      activo = false;
    };
  }, []);

  const getIconoAccion = (accion: string) => {
    switch (accion) {
      case "USUARIO_CREADO": return <HiOutlineUserAdd className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "USUARIO_EDITADO": return <HiOutlinePencilAlt className="w-4 h-4 text-amber-600 shrink-0" />;
      case "USUARIO_ELIMINADO": return <HiOutlineTrash className="w-4 h-4 text-red-600 shrink-0" />;
      default: return <HiOutlineChip className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  const getEstilosCirculo = (accion: string) => {
    switch (accion) {
      case "USUARIO_CREADO": return "bg-emerald-50 border-emerald-200 text-emerald-600";
      case "USUARIO_EDITADO": return "bg-amber-50 border-amber-200 text-amber-600";
      case "USUARIO_ELIMINADO": return "bg-red-50 border-red-200 text-red-600";
      default: return "bg-slate-50 border-slate-200 text-slate-600";
    }
  };

  const traducirCambios = (cambios?: Record<string, unknown>) => {
    if (!cambios) return null;
    const labels: Record<string, string> = {
      name: "Nombre", email: "Email", role: "Rol", 
      unidadFuncional: "UF", telefono: "Teléfono", estado: "Estado"
    };
    return Object.entries(cambios)
        .map(([key, val]) => `${labels[key] || key}: "${String(val)}"`)
        .join(" | ");
  };

  // 🎯 Filtrado Multi-Criterio
  const logsFiltrados = logs.filter((log) => {
    const cumpleAccion = filtroAccion === "TODOS" || log.accion === filtroAccion;
    
    const texto = busqueda.toLowerCase().trim();
    const cumpleBusqueda = 
      !texto || 
      log.adminName.toLowerCase().includes(texto) || 
      log.detalles.nombreUsuario.toLowerCase().includes(texto);

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

    return cumpleAccion && cumpleBusqueda && cumpleDesde && cumpleHasta;
  });

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroAccion("TODOS");
    setFechaDesde("");
    setFechaHasta("");
  };

  const tieneFiltrosActivos = busqueda || filtroAccion !== "TODOS" || fechaDesde || fechaHasta;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm w-full animate-in fade-in duration-200">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">Historial de Auditoría</h3>
          <p className="text-xs text-slate-500 font-medium">Registro de acciones críticas sobre las cuentas del consorcio.</p>
        </div>
        <button
          type="button"
          onClick={() => cargarLogs(true)} 
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          <HiOutlineRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 🛠️ BARRA DE FILTROS EN UN SOLO RENGLÓN */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-3 mb-6 p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
        
        {/* Buscador principal (ocupa el resto de la línea) */}
        <div className="relative flex-1 min-w-[200px]">
          <HiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por usuario o admin..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-300 transition"
          />
        </div>

        {/* Selector de Acciones */}
        <div className="w-full sm:w-auto md:w-44 shrink-0">
          <select
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-slate-300 transition cursor-pointer"
          >
            <option value="TODOS">Todas las acciones</option>
            <option value="USUARIO_CREADO">Altas</option>
            <option value="USUARIO_EDITADO">Modificaciones</option>
            <option value="USUARIO_ELIMINADO">Bajas</option>
          </select>
        </div>

        {/* Inputs de Fechas */}
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full sm:w-36 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-slate-300 transition cursor-pointer"
          />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">al</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-full sm:w-36 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-slate-300 transition cursor-pointer"
          />
        </div>

        {/* Botón Limpiar compacto */}
        {tieneFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer shrink-0"
          >
            <HiX className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {loading && logs.length === 0 && (
        <div className="py-12 text-center text-xs font-semibold text-slate-400 animate-pulse">Cargando logs de auditoría...</div>
      )}

      {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl mb-4">{error}</div>}

      {!loading && logs.length === 0 && !error && (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">No hay movimientos registrados.</div>
      )}

      {!loading && logs.length > 0 && logsFiltrados.length === 0 && (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          No se encontraron movimientos que coincidan con los filtros aplicados.
        </div>
      )}

      {/* ⏳ LISTADO DEL HISTORIAL */}
      <div className="relative space-y-4 max-h-150 overflow-y-auto pr-3 scrollbar-thin">
        {logsFiltrados.map((log) => (
          <div key={log._id} className="flex items-start gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-150">
            
            {/* ÍCONO DE ACCIÓN */}
            <div className={`mt-2 w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white shadow-sm transition duration-200 shrink-0 ${getEstilosCirculo(log.accion)}`}>
              {getIconoAccion(log.accion)}
            </div>

            {/* Tarjeta de log */}
            <div className="flex-1 bg-slate-50/50 group-hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100 transition duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-800">{log.adminName}</span>
                <span className="text-[10px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleString("es-AR")}</span>
              </div>
              
              <p className="text-xs text-slate-600 font-medium mt-1">
                {log.accion === "USUARIO_CREADO" && "Dio de alta a: "}
                {log.accion === "USUARIO_EDITADO" && "Modificó a: "}
                {log.accion === "USUARIO_ELIMINADO" && "Eliminó a: "}
                <span className="font-bold text-slate-700">{log.detalles.nombreUsuario}</span>
              </p>

              {log.detalles.cambios && Object.keys(log.detalles.cambios || {}).length > 0 && (
                <div className="mt-2 text-[10px] bg-white border border-slate-100 rounded-lg py-1 px-2.5 font-mono text-slate-500 wrap-break-word">
                  {traducirCambios(log.detalles.cambios)}
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}