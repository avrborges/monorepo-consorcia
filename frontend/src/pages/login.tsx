// src/pages/login.tsx
import { guardarSesion } from "../lib/session";
import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { MdErrorOutline } from "react-icons/md";
import { CiCircleCheck } from "react-icons/ci";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineMail, HiOutlineLockClosed } from "react-icons/hi";

import AuthLayout from "../components/layout/AuthLayout";

// 🎯 Capa de servicios (Fase 3)
import { userService } from "../services";

// 🎯 Tipos de respuesta compartidos entre backend y frontend
import type { ErrorResponse } from "@shared/types";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error: unknown) {
      console.error("Error durante el inicio de sesión:", error);

      if (error instanceof AxiosError && error.response?.data) {
        // Error del backend con shape { success: false, message: string }
        const errorData = error.response.data as ErrorResponse;
        setErrorMsg(errorData.message || "Credenciales inválidas.");
      } else {
        // Network error / timeout / desconexión
        setErrorMsg(
          "No fue posible conectarse con el servidor. Intente nuevamente."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = (): void => {
    if (isLoading) return;
    console.log("Recuperar contraseña pendiente de implementar.");
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
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600 animate-in fade-in zoom-in-95 duration-200">
            <MdErrorOutline className="shrink-0 text-lg" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-medium text-teal-700 animate-in fade-in zoom-in-95 duration-200">
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
              {/* Ícono de Email */}
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <HiOutlineMail className="w-5 h-5" />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                disabled={isLoading}
                autoComplete="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

              <button
                type="button"
                disabled={isLoading}
                onClick={handleForgotPasswordClick}
                className="text-xs font-bold text-teal-600 transition-colors hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="relative">
              {/* Ícono de Password */}
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <HiOutlineLockClosed className="w-5 h-5" />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                disabled={isLoading}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 py-3 font-mono text-sm text-slate-800 shadow-sm transition-all focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed placeholder:text-slate-200"
              />

              <button
                type="button"
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <HiOutlineEyeOff className="w-5 h-5" />
                ) : (
                  <HiOutlineEye className="w-5 h-5" />
                )}
              </button>
            </div>
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