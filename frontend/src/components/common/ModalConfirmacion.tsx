// src/components/common/ModalConfirmacion.tsx
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { HiOutlineTrash, HiOutlineExclamationCircle } from "react-icons/hi";

/* ============================================================
 * TIPOS
 * ============================================================ */

export type VarianteModal = "peligro" | "advertencia";

interface ModalConfirmacionProps {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  nombreUsuario: string;
  onCerrar: () => void;
  onConfirmar: () => void;
  loading: boolean;
  /** Texto del botón principal. Default: "Eliminar Cuenta" */
  labelConfirmar?: string;
  /** Texto del botón durante loading. Default: "Eliminando..." */
  labelCargando?: string;
  /** Texto que aparece después del `nombreUsuario`. Default: "? Esta acción no se puede revertir." */
  textoFinal?: string;
  /** Variante visual del modal. Default: "peligro" (rojo) */
  variante?: VarianteModal;
  /** Ícono personalizado. Si no se pasa, se elige según la variante. */
  icono?: ReactNode;
}

/* ============================================================
 * ESTILOS POR VARIANTE
 * ============================================================ */

const ESTILOS_VARIANTE: Record<
  VarianteModal,
  {
    iconoContainer: string;
    icono: ReactNode;
    botonPrincipal: string;
  }
> = {
  peligro: {
    iconoContainer: "bg-red-50 text-red-600",
    icono: <HiOutlineTrash className="w-6 h-6" />,
    botonPrincipal:
      "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/10",
  },
  advertencia: {
    iconoContainer: "bg-amber-50 text-amber-600",
    icono: <HiOutlineExclamationCircle className="w-6 h-6" />,
    botonPrincipal:
      "bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/10",
  },
};

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function ModalConfirmacion({
  abierto,
  titulo,
  mensaje,
  nombreUsuario,
  onCerrar,
  onConfirmar,
  loading,
  labelConfirmar = "Eliminar Cuenta",
  labelCargando = "Eliminando...",
  textoFinal = "? Esta acción no se puede revertir.",
  variante = "peligro",
  icono,
}: ModalConfirmacionProps) {
  // 1. Inicializamos con el valor actual de 'abierto'.
  // Evitamos sincronizar hacia "true" en el useEffect de forma síncrona.
  const [debeRenderizar, setDebeRenderizar] = useState(abierto);

  // 2. Si 'abierto' cambia a true, forzamos que se renderice inmediatamente.
  if (abierto && !debeRenderizar) {
    setDebeRenderizar(true);
  }

  useEffect(() => {
    if (abierto) {
      // Bloquea el scroll del fondo
      document.body.style.overflow = "hidden";
    } else {
      // Si se cierra, esperamos a que termine la animación de opacidad/desplazamiento
      // antes de desmontarlo por completo.
      const timer = setTimeout(() => {
        setDebeRenderizar(false);
      }, 200);

      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [abierto]);

  /* ------------------------------------------------------------
   * Accesibilidad por teclado: Escape para cerrar, Enter para confirmar
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!abierto) return;

    const manejarTecla = (e: KeyboardEvent) => {
      if (loading) return;

      if (e.key === "Escape") {
        onCerrar();
      } else if (e.key === "Enter") {
        // Solo si el usuario no está tipeando en un input/textarea
        const target = e.target as HTMLElement;
        const esInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT";

        if (!esInput) {
          e.preventDefault();
          onConfirmar();
        }
      }
    };

    window.addEventListener("keydown", manejarTecla);
    return () => window.removeEventListener("keydown", manejarTecla);
  }, [abierto, loading, onCerrar, onConfirmar]);

  if (!debeRenderizar) return null;

  const estilos = ESTILOS_VARIANTE[variante];
  const iconoAMostrar = icono ?? estilos.icono;

  return createPortal(
    <div
      className="fixed inset-0 z-999 flex items-end justify-center md:items-center p-0 md:p-4 isolation-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirmacion-titulo"
      aria-describedby="modal-confirmacion-mensaje"
    >

      {/* OVERLAY */}
      <div
        onClick={!loading ? onCerrar : undefined}
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 ${
          abierto ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* CONTENEDOR ADAPTATIVO */}
      <div
        className={`relative w-full md:max-w-md bg-white p-6 shadow-2xl transition-all duration-200 rounded-t-2xl md:rounded-2xl pb-8 md:pb-6 ${
          abierto
            ? "translate-y-0 md:scale-100 opacity-100"
            : "translate-y-full md:translate-y-0 md:scale-95 opacity-0"
        }`}
      >
        {/* Indicador superior táctil */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 md:hidden" />

        {/* Cuerpo informativo */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 shrink-0 ${estilos.iconoContainer}`}
          >
            {iconoAMostrar}
          </div>

          <h3
            id="modal-confirmacion-titulo"
            className="text-lg font-black text-slate-900 tracking-tight mb-2"
          >
            {titulo}
          </h3>

          <p
            id="modal-confirmacion-mensaje"
            className="text-sm text-slate-500 font-medium leading-relaxed mb-6"
          >
            {mensaje}{" "}
            <span className="font-bold text-slate-800 break-all">
              {nombreUsuario}
            </span>
            {textoFinal}
          </p>
        </div>

        {/* Acciones del Modal */}
        <div className="flex flex-col-reverse md:flex-row md:justify-end gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCerrar}
            className="w-full md:w-auto px-5 py-3 md:py-2 text-sm font-bold text-slate-600 bg-slate-100 md:bg-transparent hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-all cursor-pointer text-center"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirmar}
            className={`w-full md:w-auto px-5 py-3 md:py-2 text-sm font-bold disabled:opacity-50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${estilos.botonPrincipal}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{labelCargando}</span>
              </>
            ) : (
              <span>{labelConfirmar}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}