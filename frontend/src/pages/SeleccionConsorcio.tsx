// src/pages/SeleccionConsorcio.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { HiOutlineOfficeBuilding, HiOutlineArrowRight } from "react-icons/hi";
import { FiArrowLeft } from "react-icons/fi";

import AuthLayout from "@/components/layout/AuthLayout";

// 🎯 Capa de servicios
import { userService } from "@/services";

// 🎯 Helpers de sesión (multi-tenant)
import {
  getSeleccionPendiente,
  limpiarSeleccionPendiente,
  guardarSesion,
  limpiarSesion,
  type SeleccionPendiente,
} from "@/lib/session";

// 🎯 Hook para título dinámico de pestaña
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Tipos de respuesta compartidos
import type { ErrorResponse } from "@shared/types";

// 🎯 Formateo de rol para mostrar en la UI
import { formatearRol } from "@/lib/session";
import type { Rol } from "@shared/types";

export default function SeleccionConsorcio() {
  useDocumentTitle("Elegí un consorcio");

  const navigate = useNavigate();

  // 🎯 Lazy init: leemos la selección pendiente UNA sola vez al montar,
  //    sin setState en un effect (evita cascading renders).
  const [pendiente] = useState<SeleccionPendiente | null>(() =>
    getSeleccionPendiente()
  );
  const [recordarEleccion, setRecordarEleccion] = useState<boolean>(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🎯 Si no hay selección pendiente (acceso directo a la URL), redirigir
  //    al login. El effect SOLO hace navegación (efecto externo), no setState.
  useEffect(() => {
    if (
      !pendiente ||
      !pendiente.membresiasDisponibles ||
      pendiente.membresiasDisponibles.length === 0
    ) {
      navigate("/login", { replace: true });
    }
  }, [pendiente, navigate]);

  const handleElegirConsorcio = async (consorcioId: string) => {
    if (procesandoId) return;

    setProcesandoId(consorcioId);
    setError(null);

    try {
      const data = await userService.cambiarConsorcio(consorcioId, recordarEleccion);

      // Guardar sesión completa con el consorcio elegido
      guardarSesion(data.token, data.user, {
        activeConsorcio: data.activeConsorcio,
        roleEnConsorcioActivo: data.roleEnConsorcioActivo,
        rolGlobal: data.rolGlobal,
      });

      // Limpiar la selección pendiente (ya no se necesita)
      limpiarSeleccionPendiente();

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ErrorResponse>;
      setError(
        axiosError.response?.data?.message ||
          "No se pudo ingresar al consorcio seleccionado. Intentá nuevamente."
      );
      setProcesandoId(null);
    }
  };

  const handleVolverAlLogin = () => {
    limpiarSeleccionPendiente();
    limpiarSesion();
    navigate("/login", { replace: true });
  };

  // Mientras carga la selección pendiente (o si no hay), no renderizamos nada
  if (!pendiente) {
    return null;
  }

  const nombreUsuario = pendiente.user.name?.split(" ")[0] || "Usuario";

  return (
    <AuthLayout
      title={`¡Hola, ${nombreUsuario}! 👋`}
      subtitle="Tenés acceso a varios consorcios. Elegí a cuál querés ingresar."
    >
      <div className="space-y-4">
        {error && (
          <div
            className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {/* Lista de consorcios disponibles */}
        <div className="space-y-2.5" role="list" aria-label="Consorcios disponibles">
          {pendiente.membresiasDisponibles.map((m) => {
            const estaProcesando = procesandoId === m.consorcio._id;
            const deshabilitado = Boolean(procesandoId) && !estaProcesando;

            return (
              <button
                key={m._id}
                type="button"
                role="listitem"
                disabled={Boolean(procesandoId)}
                onClick={() => handleElegirConsorcio(m.consorcio._id)}
                className={`w-full flex items-center gap-3 p-4 bg-white border rounded-xl text-left transition-all shadow-sm ${
                  estaProcesando
                    ? "border-teal-500 ring-2 ring-teal-500/20"
                    : "border-slate-200 hover:border-teal-400 hover:shadow-md"
                } ${deshabilitado ? "opacity-40" : "cursor-pointer"} disabled:cursor-not-allowed`}
                aria-label={`Ingresar a ${m.consorcio.nombre} como ${formatearRol(m.role as Rol)}`}
              >
                <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 text-slate-500">
                  <HiOutlineOfficeBuilding className="w-5 h-5" />
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-900 truncate">
                    {m.consorcio.nombre}
                  </span>
                  <span className="block text-xs text-slate-500 truncate">
                    {m.consorcio.direccion} · {formatearRol(m.role as Rol)}
                  </span>
                </span>

                <span className="shrink-0 text-slate-300">
                  {estaProcesando ? (
                    <svg
                      className="animate-spin h-5 w-5 text-teal-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <HiOutlineArrowRight className="w-5 h-5" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Checkbox recordar elección */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="recordarEleccion"
            type="checkbox"
            disabled={Boolean(procesandoId)}
            checked={recordarEleccion}
            onChange={(e) => setRecordarEleccion(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <label
            htmlFor="recordarEleccion"
            className="text-xs font-semibold text-slate-500 cursor-pointer select-none"
          >
            Recordar mi elección para la próxima vez
          </label>
        </div>

        {/* Volver al login */}
        <div className="text-center pt-2">
          <button
            type="button"
            disabled={Boolean(procesandoId)}
            onClick={handleVolverAlLogin}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiArrowLeft aria-hidden="true" />
            Volver al login
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}