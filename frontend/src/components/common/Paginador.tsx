// src/components/common/Paginador.tsx
import { useMemo, useEffect } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";

/* ============================================================
 * HELPER: rango de páginas con elipsis
 * ============================================================ */
function rangoPaginacion(actual: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (actual <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (actual >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", actual - 1, actual, actual + 1, "...", total];
}

/* ============================================================
 * PROPS DEL COMPONENTE
 * ============================================================ */
interface PaginadorProps {
  paginaActual: number;
  totalPaginas: number;
  indicePrimerItem: number;
  indiceUltimoItem: number;
  totalFiltrados: number;
  onCambioPagina: (pagina: number) => void;
  /**
   * Si es true, habilita los atajos de teclado ← y → para navegar entre páginas.
   * Default: true.
   */
  atajosTecladoHabilitados?: boolean;
}

/* ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================ */
export default function Paginador({
  paginaActual,
  totalPaginas,
  indicePrimerItem,
  indiceUltimoItem,
  totalFiltrados,
  onCambioPagina,
  atajosTecladoHabilitados = true,
}: PaginadorProps) {
  const paginas = useMemo(
    () => rangoPaginacion(paginaActual, totalPaginas),
    [paginaActual, totalPaginas]
  );

  const puedeIrAtras = paginaActual > 1;
  const puedeIrAdelante = paginaActual < totalPaginas;

  /* ------------------------------------------------------------
   * 🎯 Atajos de teclado ← y → para navegar entre páginas
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!atajosTecladoHabilitados) return;
    if (totalPaginas <= 1) return;

    const manejarTecla = (e: KeyboardEvent) => {
      // No interceptar si el usuario está tipeando en un input/select/textarea
      const target = e.target as HTMLElement;
      const esInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (esInput) return;

      if (e.key === "ArrowLeft" && puedeIrAtras) {
        e.preventDefault();
        onCambioPagina(Math.max(paginaActual - 1, 1));
      } else if (e.key === "ArrowRight" && puedeIrAdelante) {
        e.preventDefault();
        onCambioPagina(Math.min(paginaActual + 1, totalPaginas));
      }
    };

    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [atajosTecladoHabilitados, paginaActual, totalPaginas, puedeIrAtras, puedeIrAdelante, onCambioPagina]);

  const itemInicial = totalFiltrados > 0 ? indicePrimerItem + 1 : 0;
  const itemFinal = Math.min(indiceUltimoItem, totalFiltrados);

  return (
    <nav
      aria-label="Paginación de resultados"
      className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none"
    >
      {/* Resumen de resultados — anunciado por screen reader al cambiar */}
      <div
        className="text-xs font-bold text-slate-500 tracking-wide uppercase"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Mostrando{" "}
        <span className="text-slate-800">{itemInicial}</span>{" "}
        al{" "}
        <span className="text-slate-800">{itemFinal}</span>{" "}
        de <span className="text-slate-800">{totalFiltrados}</span> resultados filtrados
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={() => onCambioPagina(Math.max(paginaActual - 1, 1))}
          disabled={!puedeIrAtras}
          aria-label={
            puedeIrAtras
              ? `Ir a la página anterior (página ${paginaActual - 1})`
              : "Ya estás en la primera página"
          }
          title={
            atajosTecladoHabilitados
              ? "Página anterior (←)"
              : "Página anterior"
          }
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          <HiChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>

        {paginas.map((p, i) =>
          p === "..." ? (
            <span
              key={`dots-${i}`}
              aria-hidden="true"
              className="px-2 text-slate-400 text-xs font-bold"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onCambioPagina(p)}
              aria-label={`Ir a la página ${p} de ${totalPaginas}`}
              aria-current={paginaActual === p ? "page" : undefined}
              className={`min-w-9 h-9 text-xs font-bold rounded-xl transition cursor-pointer ${
                paginaActual === p
                  ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
                  : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onCambioPagina(Math.min(paginaActual + 1, totalPaginas))}
          disabled={!puedeIrAdelante}
          aria-label={
            puedeIrAdelante
              ? `Ir a la página siguiente (página ${paginaActual + 1})`
              : "Ya estás en la última página"
          }
          title={
            atajosTecladoHabilitados
              ? "Página siguiente (→)"
              : "Página siguiente"
          }
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          <HiChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}