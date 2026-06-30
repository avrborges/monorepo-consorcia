// src/pages/dashboard/HistorialAuditoria.tsx
import { useEffect, useState } from "react";
import { HiOutlineChip, HiOutlineUserAdd, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineRefresh } from "react-icons/hi";

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
  // 🛠️ Inicializamos en true para evitar el setState síncrono al montar el efecto
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    } finally { // 🛠️ Corregido el error de tipeo (doble 'l')
      setLoading(false);
    }
  };

  // 🛠️ Estructura limpia para el useEffect que evita renderizados en cascada y race conditions
  useEffect(() => {
    let activo = true;

    const inicializar = async () => {
      if (activo) {
        await cargarLogs(false);
      }
    };

    inicializar();

    return () => {
      activo = false;
    };
  }, []);

  const getIconoAccion = (accion: string) => {
    switch (accion) {
      case "USUARIO_CREADO": return <HiOutlineUserAdd className="w-4 h-4 text-emerald-600" />;
      case "USUARIO_EDITADO": return <HiOutlinePencilAlt className="w-4 h-4 text-amber-600" />;
      case "USUARIO_ELIMINADO": return <HiOutlineTrash className="w-4 h-4 text-red-600" />;
      default: return <HiOutlineChip className="w-4 h-4 text-slate-600" />;
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

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm w-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">Historial de Auditoría</h3>
          <p className="text-xs text-slate-500 font-medium">Registro de acciones críticas sobre las cuentas del consorcio.</p>
        </div>
        <button
          type="button"
          onClick={() => cargarLogs(true)} // 🛠️ Pasa true para refrescar manualmente de forma segura
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          <HiOutlineRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && logs.length === 0 && (
        <div className="py-12 text-center text-xs font-semibold text-slate-400 animate-pulse">Cargando logs de auditoría...</div>
      )}

      {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl mb-4">{error}</div>}

      {!loading && logs.length === 0 && !error && (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">No hay movimientos registrados.</div>
      )}

      {/* ⏳ CONTENEDOR DE LA LÍNEA DE TIEMPO */}
      <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-5 max-h-150 overflow-y-auto pr-3 scrollbar-thin">
        {logs.map((log) => (
          <div key={log._id} className="relative group">
            <div className="absolute -left-8.75 top-0.5 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm transition duration-200">
              {getIconoAccion(log.accion)}
            </div>

            <div className="bg-slate-50/50 group-hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100 transition duration-200">
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

              {/* 🛠️ Validación segura contra objetos indefinidos u obsoletos */}
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