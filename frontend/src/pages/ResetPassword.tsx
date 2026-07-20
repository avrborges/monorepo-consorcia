// src/pages/ResetPassword.tsx
import { useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { AxiosError } from "axios";
import { HiCheckCircle } from "react-icons/hi";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import { FiArrowLeft } from "react-icons/fi";

import AuthLayout from "@/components/layout/AuthLayout";

// 🎯 Capa de servicios (Fase 3)
import { userService } from "@/services";

// 🎯 Hook para título dinámico de pestaña (Tanda 1 UX)
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Tipos de respuesta compartidos entre backend y frontend
import type { ErrorResponse } from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const REDIRECT_DELAY_MS = 3000;

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function ResetPassword() {
  useDocumentTitle("Restablecer contraseña");

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 🎯 Detección de Caps Lock activo
  const [capsLockActivo, setCapsLockActivo] = useState(false);

  const redirectTimeoutRef = useRef<number | null>(null);

  // Limpieza del temporizador para evitar memory leaks
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const tieneMinimoCaracteres = password.length >= 6;
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumeroOEspecial = /[\d\W]/.test(password);
  const coincidenContrasenas = password.length > 0 && password === confirmPassword;

  const esFormularioValido =
    tieneMinimoCaracteres &&
    tieneMayuscula &&
    tieneNumeroOEspecial &&
    coincidenContrasenas;

  /**
   * Detecta si Caps Lock está activo al escribir en cualquiera de los inputs de password.
   */
  const detectarCapsLock = (e: KeyboardEvent<HTMLInputElement>): void => {
    setCapsLockActivo(e.getModifierState("CapsLock"));
  };

  const handleReset = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!esFormularioValido || loading || !token) return;

    setLoading(true);

    try {
      await userService.resetPassword({ token, password });
      setSuccess(true);

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/login");
      }, REDIRECT_DELAY_MS);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<ErrorResponse>;
      setError(
        axiosError.response?.data?.message ||
          "No se pudo restablecer la contraseña. Intentá nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Permite al usuario ir al login inmediatamente sin esperar los 3 segundos
   * del redirect automático tras el reset exitoso.
   */
  const irAlLoginAhora = (): void => {
    if (redirectTimeoutRef.current !== null) {
      window.clearTimeout(redirectTimeoutRef.current);
    }
    navigate("/login");
  };

  // 🛡️ Sin token → pantalla de error con link para solicitar uno nuevo
  if (!token) {
    return (
      <AuthLayout
        title="Enlace inválido"
        subtitle="El enlace de recuperación no es válido o ha expirado."
      >
        <div
          className="p-4 bg-red-50 border border-red-100 rounded-xl text-center"
          role="alert"
          aria-live="polite"
        >
          <p className="text-red-600 text-sm font-medium leading-relaxed">
            No pudimos procesar tu solicitud porque el enlace no contiene un
            token válido. Por favor, solicitá uno nuevo desde la página de
            recuperación de contraseña.
          </p>

          <Link
            to="/olvide-password"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-red-700 hover:text-red-900 underline underline-offset-2 transition-colors"
          >
            <FiArrowLeft aria-hidden="true" />
            Solicitar nuevo enlace
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Restablecer contraseña"
      subtitle="Elegí una nueva contraseña segura para tu cuenta de Consorcia."
    >
      {success ? (
        <div
          className="text-center p-6 bg-teal-50 border border-teal-200 rounded-xl animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-teal-100 rounded-full">
            <HiCheckCircle className="w-7 h-7 text-teal-600" />
          </div>
          <p className="text-teal-700 font-bold">¡Contraseña restablecida!</p>
          <p className="text-sm text-teal-600 mt-2">
            Ya podés iniciar sesión con tu nueva contraseña.
          </p>
          <p className="text-xs text-teal-600/80 mt-2">Redirigiendo al login...</p>

          <button
            type="button"
            onClick={irAlLoginAhora}
            className="mt-4 text-xs font-bold text-teal-700 hover:text-teal-900 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Ir al login ahora
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-5" noValidate>
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
            <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                disabled={loading}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={detectarCapsLock}
                onKeyDown={detectarCapsLock}
                aria-invalid={Boolean(error)}
                aria-describedby="requisitos-password"
                className="w-full border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-800 font-mono focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>

            {/* Aviso sutil de Caps Lock activo */}
            {capsLockActivo && (
              <p
                className="mt-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wider"
                role="status"
                aria-live="polite"
              >
                ⚠ Bloq Mayús está activado
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-500 uppercase mb-2">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                disabled={loading}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyUp={detectarCapsLock}
                onKeyDown={detectarCapsLock}
                aria-invalid={Boolean(error)}
                aria-describedby="requisitos-password"
                className="w-full border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-800 font-mono focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50"
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Checklist constructivo y sutil */}
          <div
            id="requisitos-password"
            className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-2.5 text-xs font-semibold"
            aria-label="Requerimientos de seguridad para la contraseña"
          >
            <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Requerimientos de seguridad:</p>

            <div className={`flex items-center gap-2 transition-colors duration-200 ${tieneMinimoCaracteres ? "text-emerald-600" : "text-slate-400"}`}>
              {tieneMinimoCaracteres ? <HiCheckCircle className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
              <span>Mínimo de 6 caracteres</span>
            </div>

            <div className={`flex items-center gap-2 transition-colors duration-200 ${tieneMayuscula ? "text-emerald-600" : "text-slate-400"}`}>
              {tieneMayuscula ? <HiCheckCircle className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
              <span>Al menos una letra mayúscula</span>
            </div>

            <div className={`flex items-center gap-2 transition-colors duration-200 ${tieneNumeroOEspecial ? "text-emerald-600" : "text-slate-400"}`}>
              {tieneNumeroOEspecial ? <HiCheckCircle className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
              <span>Al menos un número o carácter especial</span>
            </div>

            <div className={`flex items-center gap-2 transition-colors duration-200 ${coincidenContrasenas ? "text-emerald-600" : "text-slate-400"}`}>
              {coincidenContrasenas ? <HiCheckCircle className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />}
              <span>Las contraseñas coinciden entre sí</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!esFormularioValido || loading}
            className="w-full py-3 bg-[#1e6f65] text-white font-bold rounded-xl hover:bg-[#16524b] transition shadow-lg shadow-teal-900/20 disabled:opacity-40 disabled:hover:bg-[#1e6f65] disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Restableciendo...</span>
              </>
            ) : (
              "Restablecer contraseña"
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
