// src/pages/dashboard/Overview.tsx
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { formatearRol } from "@/lib/session";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Retorna un saludo contextual según la hora del día.
 *
 * @example
 *   getSaludoContextual(new Date("2026-07-14T09:00:00")) → "¡Buenos días"
 *   getSaludoContextual(new Date("2026-07-14T15:00:00")) → "¡Buenas tardes"
 *   getSaludoContextual(new Date("2026-07-14T22:00:00")) → "¡Buenas noches"
 */
const getSaludoContextual = (fecha: Date): string => {
  const hora = fecha.getHours();
  if (hora >= 5 && hora < 13) return "¡Buenos días";
  if (hora >= 13 && hora < 20) return "¡Buenas tardes";
  return "¡Buenas noches";
};

/**
 * Formatea una fecha al formato descriptivo en español con capitalización.
 */
const formatearFechaDescriptiva = (fecha: Date): string => {
  const raw = fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function Overview() {
  useDocumentTitle("Panel de Control");
  const { usuario, rol } = useAuth();

  // 🎯 Nota: el contexto de consorcio activo se muestra en el topbar
  //    (SelectorConsorcio), no aquí, para evitar redundancia y dejar el
  //    dashboard despejado de cara a futuros widgets.

  // 🎯 Fecha reactiva: se actualiza si el usuario deja la app abierta
  //    y cambia el día (por ejemplo, cruza la medianoche).
  const [ahora, setAhora] = useState<Date>(() => new Date());

  useEffect(() => {
    // Actualiza la fecha cada minuto — costo negligible, previene desfases
    const intervalo = window.setInterval(() => {
      setAhora(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  // Fallbacks defensivos si la sesión no tiene datos válidos
  const nombreCompleto = usuario?.name || "Usuario";
  const rolFormateado = rol ? formatearRol(rol) : "Admin";
  const primerNombre = nombreCompleto.split(" ")[0];

  // 🎯 Saludo contextual según hora del día
  const saludo = getSaludoContextual(ahora);

  // Fecha formateada + ISO para el atributo datetime
  const fechaVisible = formatearFechaDescriptiva(ahora);
  const fechaISO = ahora.toISOString();

  return (
    <div>
      {/* HEADER INTEGRADO - Variante Horizontal Forzada */}
      <header
        className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5"
        aria-label="Encabezado del panel de control"
      >
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {saludo}, {primerNombre}! <span aria-hidden="true">👋</span>
          </h1>
          <time
            dateTime={fechaISO}
            className="text-xs sm:text-sm text-slate-500 font-medium block"
          >
            {fechaVisible}
          </time>
        </div>

        {/* El Badge se acopla a la derecha fijamente en cualquier resolución */}
        <div
          className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full flex items-center gap-2 shrink-0"
          role="status"
          aria-label={`Estado de sesión: activo. Rol: ${rolFormateado}.`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
            aria-hidden="true"
          />
          <span className="text-[10px] sm:text-[11px] font-black text-emerald-700 uppercase tracking-wider">
            Activo • {rolFormateado}
          </span>
        </div>
      </header>
    </div>
  );
}
