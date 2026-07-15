// src/pages/dashboard/Overview.tsx
import type { Persona } from "@shared/types";

/**
 * Lee y parsea de forma segura el usuario desde localStorage.
 * Retorna null si no existe o si el JSON está corrupto.
 */
const obtenerUsuarioSesion = (): Persona | null => {
  try {
    const userString = localStorage.getItem("user");
    if (!userString) return null;
    return JSON.parse(userString) as Persona;
  } catch {
    return null;
  }
};

export default function Overview() {
  const user = obtenerUsuarioSesion();

  // Fallback defensivo si la sesión no tiene datos válidos
  const nombreCompleto = user?.name || "Usuario";
  const rol = user?.role || "admin";

  // Fecha actual formateada en minúsculas nativas
  const rawDate = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Capitalizamos solo el primer carácter del día de la semana para un acabado limpio
  const today = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <div>
      {/* HEADER INTEGRADO - Variante Horizontal Forzada */}
      <div className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            ¡Hola, {nombreCompleto.split(" ")[0]}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">{today}</p>
        </div>

        {/* El Badge se acopla a la derecha fijamente en cualquier resolución */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full flex items-center gap-2 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] sm:text-[11px] font-black text-emerald-700 uppercase tracking-wider">
            Activo • {rol}
          </span>
        </div>
      </div>
    </div>
  );
}