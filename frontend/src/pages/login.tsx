import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";
import { MdErrorOutline } from "react-icons/md";
import { CiCircleCheck } from "react-icons/ci";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

import AuthLayout from "../components/AuthLayout";
import { loginRequest } from "../api";

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
      const result = await loginRequest(email.trim(), password);

      if (result.success) {
        setSuccessMsg(result.message);

        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));

        redirectTimeoutRef.current = window.setTimeout(() => {
          navigate("/dashboard");
        }, 1500);

        return;
      }

      setErrorMsg(result.message);
    } catch (error) {
      console.error("Error durante el inicio de sesión:", error);

      setErrorMsg(
        "No fue posible conectarse con el servidor. Intente nuevamente."
      );
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
      {/* Mensajes de feedback */}
      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">
          <MdErrorOutline className="shrink-0 text-lg" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-medium text-teal-700">
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

          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus // 🎯 Autofoco inteligente al cargar la pantalla
            disabled={isLoading}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition-all focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
          />
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
              className="text-xs font-bold text-teal-600 transition-colors hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              disabled={isLoading}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-3 font-mono text-sm text-slate-800 shadow-sm transition-all focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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

        {/* 🎯 Botón optimizado con flex, gap y spinner animado */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#1e6f65] py-3 font-bold text-white shadow-lg shadow-teal-900/20 transition hover:bg-[#16524b] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg 
                className="animate-spin h-5 w-5 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                ></circle>
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Validando...</span>
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm font-semibold text-slate-500 lg:text-left">
        ¿Tu consorcio aún no cuenta con el servicio?{" "}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleContactClick}
          className="font-bold text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Hablemos
        </button>
      </p>
    </AuthLayout>
  );
}