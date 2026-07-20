// src/pages/OlvidePassword.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { HiOutlineMail, HiCheckCircle } from "react-icons/hi";
import { FiArrowLeft } from "react-icons/fi";

import AuthLayout from "@/components/layout/AuthLayout";

// 🎯 Capa de servicios (Fase 3)
import { userService } from "@/services";

// 🎯 Hook para título dinámico de pestaña (Tanda 1 UX)
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Tipos de respuesta compartidos entre backend y frontend
import type { ErrorResponse } from "@shared/types";

export default function OlvidePassword() {
  useDocumentTitle("Recuperar contraseña");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || loading) return;

    setLoading(true);

    try {
      await userService.olvidePassword(email.trim().toLowerCase());
      // 🛡️ Éxito garantizado (backend siempre responde 200 con mensaje genérico)
      setEnviado(true);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ErrorResponse>;
      setError(
        axiosError.response?.data?.message ||
          "No se pudo procesar tu solicitud. Intentá nuevamente en unos minutos."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle="Ingresá tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña."
    >
      {enviado ? (
        <div
          className="text-center p-6 bg-teal-50 border border-teal-200 rounded-xl animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-teal-100 rounded-full">
            <HiCheckCircle className="w-7 h-7 text-teal-600" />
          </div>
          <p className="text-teal-700 font-bold">¡Solicitud recibida!</p>
          <p className="text-sm text-teal-600 mt-2 leading-relaxed">
            Si el correo electrónico existe en nuestros registros, recibirás un
            mensaje con las instrucciones para restablecer tu contraseña.
          </p>
          <p className="text-xs text-teal-600/80 mt-3 italic">
            Revisá también la carpeta de spam por las dudas.
          </p>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 mt-6 text-xs font-bold text-teal-700 hover:text-teal-900 underline underline-offset-2 transition-colors"
          >
            <FiArrowLeft aria-hidden="true" />
            Volver al login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error && (
            <div
              className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold text-slate-500 uppercase mb-2"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <HiOutlineMail className="w-5 h-5" />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                disabled={loading}
                autoComplete="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(error)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-800 shadow-sm transition-all focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="w-full py-3 bg-[#1e6f65] text-white font-bold rounded-xl hover:bg-[#16524b] transition shadow-lg shadow-teal-900/20 disabled:opacity-40 disabled:hover:bg-[#1e6f65] disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Enviando...</span>
              </>
            ) : (
              "Enviar instrucciones"
            )}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              <FiArrowLeft aria-hidden="true" />
              Volver al login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}