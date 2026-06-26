// frontend/src/pages/dashboard/ModalConfirmacion.tsx
import { memo } from "react";
import { HiExclamation, HiX } from "react-icons/hi";

interface ModalConfirmacionProps {
  abierto: boolean;
  titulo: string;
  mensaje: string;
  nombreUsuario: string;
  onCerrar: () => void;
  onConfirmar: () => void;
  loading?: boolean;
}

export default memo(function ModalConfirmacion({
  abierto,
  titulo,
  mensaje,
  nombreUsuario,
  onCerrar,
  onConfirmar,
  loading = false,
}: ModalConfirmacionProps) {
  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo desenfocado y oscuro */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={!loading ? onCerrar : undefined}
      />

      {/* Contenedor del Modal */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Botón Cerrar */}
        <button
          onClick={onCerrar}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
        >
          <HiX className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Ícono de Alerta Crítica */}
            <div className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
              <HiExclamation className="w-6 h-6" />
            </div>

            {/* Textos */}
            <div className="space-y-1.5 flex-1">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                {titulo}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {mensaje}{" "}
                <strong className="text-slate-900 font-bold">
                  {nombreUsuario}
                </strong>
                ? Esta acción impactará de inmediato y no se puede revertir.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones del Footer */}
        <div className="bg-slate-50/70 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCerrar}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={onConfirmar}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm shadow-red-600/10 transition active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Eliminando...</span>
              </>
            ) : (
              <span>Eliminar Cuenta</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});