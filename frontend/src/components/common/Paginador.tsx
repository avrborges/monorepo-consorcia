import { useMemo } from "react";
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
}: PaginadorProps) {
  const paginas = useMemo(
    () => rangoPaginacion(paginaActual, totalPaginas),
    [paginaActual, totalPaginas]
  );

  return (
    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
      {/* Resumen de resultados */}
      <div className="text-xs font-bold text-slate-500 tracking-wide uppercase">
        Mostrando{" "}
        <span className="text-slate-800">
          {totalFiltrados > 0 ? indicePrimerItem + 1 : 0}
        </span>{" "}
        al{" "}
        <span className="text-slate-800">
          {Math.min(indiceUltimoItem, totalFiltrados)}
        </span>{" "}
        de <span className="text-slate-800">{totalFiltrados}</span> resultados
        filtrados
      </div>

      {/* Controles de paginación */}
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={() => onCambioPagina(Math.max(paginaActual - 1, 1))}
          disabled={paginaActual === 1}
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          <HiChevronLeft className="w-4 h-4" />
        </button>

        {paginas.map((p, i) =>
          p === "..." ? (
            <span
              key={`dots-${i}`}
              className="px-2 text-slate-400 text-xs font-bold"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onCambioPagina(p)}
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
          onClick={() =>
            onCambioPagina(Math.min(paginaActual + 1, totalPaginas))
          }
          disabled={paginaActual === totalPaginas}
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed shadow-sm cursor-pointer"
        >
          <HiChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}