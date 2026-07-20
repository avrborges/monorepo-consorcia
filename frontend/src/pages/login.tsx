// src/pages/login.tsx
import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AxiosError } from "axios";
import { MdErrorOutline } from "react-icons/md";
import { CiCircleCheck } from "react-icons/ci";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineMail, HiOutlineLockClosed } from "react-icons/hi";

import AuthLayout from "@/components/layout/AuthLayout";

// 🎯 Capa de servicios (Fase 3)
import { userService } from "@/services";

// 🎯 Helpers de sesión (Fase 4)
import { guardarSesion } from "@/lib/session";

// 🎯 Hook para título dinámico de pestaña (Tanda 1 UX)
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Tipos de respuesta compartidos entre backend y frontend
import type { ErrorResponse } from "@shared/types";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const REMEMBER_EMAIL_KEY = "consorcia_remember_email";

/* ============================================================
 * PREFETCH ESTRATÉGICO
 * ============================================================ */

/**
 * Precarga en paralelo los chunks del dashboard mientras el usuario
 * ve el mensaje "Redirigiendo..." tras un login exitoso.
 *
 * Cuando navegue a /dashboard, los chunks ya estarán en la caché
 * del navegador → transición sin flash del SplashScreen.
 */
const prefetchDashboardChunks = (): void => {
  // Fire-and-forget: no await, ignoramos errores intencionalmente
  void import("@/components/layout/DashboardLayout");
  void import("@/pages/dashboard/Overview");
};

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function Login() {
  // 🎯 Título dinámico de la pestaña
  useDocumentTitle("Iniciar sesión");

  const navigate = useNavigate();

  // 🎯 Recuperar email guardado si existe (feature "Recordarme")
  const emailGuardado = localStorage.getItem(REMEMBER_EMAIL_KEY) || "";

  const [email, setEmail] = useState(emailGuardado);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState<boolean>(Boolean(emailGuardado));
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const redirectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (
    e: SyntheticEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const result = await userService.login(email.trim(), password);

      setSuccessMsg(result.message);
      guardarSesion(result.token, result.user);

      // 🎯 Persistir o limpiar email según checkbox "Recordarme"
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      // 🚀 Precargar los chunks del dashboard en paralelo
      prefetchDashboardChunks();

      // 🎯 Redirect inteligente: volver a la ruta original (si venía de un 401)
      const rutaOriginal = sessionStorage.getItem("redirect_after_login");
      sessionStorage.removeItem("redirect_after_login");

      const destino = rutaOriginal && !rutaOriginal.startsWith("/login")
        ? rutaOriginal
        : "/dashboard";

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate(destino);
      }, 1500);
    } catch (error: unknown) {
      console.error("Error durante el inicio de sesión:", error);

      if (error instanceof AxiosError && error.response?.data) {
        const errorData = error.response.data as ErrorResponse;
        setErrorMsg(errorData.message || "Credenciales inválidas.");
      } else {
        setErrorMsg(
          "No fue posible conectarse con el servidor. Intente nuevamente."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactClick = (): void => {
    if (isLoading) return;
    console.log("Contacto pendiente de implementar.");
  };

  return (
    <AuthLayout
      title="Bienvenido de nuevo"
      subtitle="Ingresa tus credenciales para acceder al panel administrativo."
    >
      {/* Contenedor tipo Card para Mobile: Agrupa y rompe el fondo plano */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 shadow-xl shadow-slate-200/50">

        {/* Mensajes de feedback */}
        {errorMsg && (
          <div
            className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 animate-in fade-in zoom-in-95 duration-200"
            role="alert"
            aria-live="polite"
          >
            <MdErrorOutline className="shrink-0 text-lg" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="mb-5 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-medium text-teal-700 animate-in fade-in zoom-in-95 duration-200"
            role="status"
            aria-live="polite"
          >
            <CiCircleCheck className="shrink-0 text-lg" />
            <span>{successMsg} Redirigiendo...</span>
          </div>
        )}

        {/* Formulario */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
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
                autoFocus={!emailGuardado}
                disabled={isLoading}
                autoComplete="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(errorMsg)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-800 shadow-sm transition-all focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-300"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Contraseña
              </label>

              <Link
                to="/olvide-password"
                className={`text-xs font-bold text-teal-600 transition-colors hover:text-teal-700 ${
                  isLoading ? "opacity-50 pointer-events-none" : "cursor-pointer"
                }`}
                aria-disabled={isLoading}
                tabIndex={isLoading ? -1 : undefined}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <HiOutlineLockClosed className="w-5 h-5" />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoFocus={Boolean(emailGuardado)}
                disabled={isLoading}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errorMsg)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 py-3 font-mono text-sm text-slate-800 shadow-sm transition-all focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-200"
              />

              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <HiOutlineEyeOff className="w-5 h-5" />
                ) : (
                  <HiOutlineEye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* 🎯 Checkbox "Recordarme" */}
          <div className="flex items-center gap-2">
            <input
              id="rememberMe"
              type="checkbox"
              disabled={isLoading}
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
            <label
              htmlFor="rememberMe"
              className="text-xs font-semibold text-slate-500 cursor-pointer select-none"
            >
              Recordar mi correo electrónico
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#1e6f65] py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/20 transition-all hover:bg-[#16524b] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
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
                <span>Validando...</span>
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>
      </div>

      {/* Footer del login refinado */}
      <div className="mt-8 text-center p-4 bg-slate-50/60 rounded-xl border border-slate-100/80">
        <p className="text-xs font-semibold text-slate-500">
          ¿Tu consorcio aún no cuenta con el servicio?{" "}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleContactClick}
            className="font-bold text-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Hablemos
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}