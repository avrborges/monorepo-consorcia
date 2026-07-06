import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { HiCheckCircle } from "react-icons/hi";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi"; // Íconos para la visibilidad
import AuthLayout from "../components/AuthLayout";
import api from "../api";

export default function ActivarCuenta() {
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

  const handleActivar = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!esFormularioValido || loading) return;

    setLoading(true);

    try {
      await api.post("/users/activar", { token, password });
      setSuccess(true);
      
      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(
        axiosError.response?.data?.message || "Error al activar la cuenta."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Error" subtitle="Token inválido o expirado.">
        <p className="text-red-500 text-sm font-medium">El enlace de activación no es válido.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Activar tu cuenta" 
      subtitle="Por favor, define tu contraseña para ingresar a Consorcia."
    >
      {success ? (
        <div className="text-center p-6 bg-teal-50 border border-teal-200 rounded-xl animate-fade-in">
          <p className="text-teal-700 font-bold">¡Cuenta activada con éxito!</p>
          <p className="text-sm text-teal-600 mt-2">Redirigiendo al login...</p>
        </div>
      ) : (
        <form onSubmit={handleActivar} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
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
                className="w-full border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-800 font-mono focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50"
              >
                {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
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
                className="w-full border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-800 font-mono focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 disabled:opacity-50"
              >
                {showConfirmPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Checklist constructivo y sutil */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-2.5 text-xs font-semibold">
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
                <span>Activando cuenta...</span>
              </>
            ) : (
              "Activar Cuenta"
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}