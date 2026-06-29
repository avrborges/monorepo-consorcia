// src/pages/ActivarCuenta.tsx
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { HiCheckCircle, HiXCircle } from "react-icons/hi"; // Íconos para el checklist
import AuthLayout from "../components/AuthLayout";
import api from "../api";

export default function ActivarCuenta() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Evaluaciones booleanas en tiempo de render para el checklist
  const tieneMinimoCaracteres = password.length >= 6;
  const tieneMayuscula = /[A-Z]/.test(password);
  const tieneNumeroOEspecial = /[\d\W]/.test(password);
  const coincidenContrasenas = password.length > 0 && password === confirmPassword;

  // El formulario es válido solo si se cumplen todas las condiciones
  const esFormularioValido = 
    tieneMinimoCaracteres && 
    tieneMayuscula && 
    tieneNumeroOEspecial && 
    coincidenContrasenas;

  const handleActivar = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);

    if (!esFormularioValido) return;

    setLoading(true);

    try {
      await api.post("/users/activar", { token, password });
      setSuccess(true);
      
      setTimeout(() => {
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
        <p className="text-red-500 text-sm">El enlace de activación no es válido.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Activar tu cuenta" 
      subtitle="Por favor, define tu contraseña para ingresar a Consorcia."
    >
      {success ? (
        <div className="text-center p-6 bg-teal-50 border border-teal-200 rounded-xl">
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nueva contraseña</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmar contraseña</label>
            <input 
              type="password" 
              required 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm"
            />
          </div>

          {/* Checklist de requerimientos visuales */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl space-y-2 text-xs font-semibold">
            <p className="text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Requerimientos de seguridad:</p>
            
            <div className={`flex items-center gap-2 transition-colors duration-200 ${tieneMinimoCaracteres ? "text-emerald-600" : "text-slate-400"}`}>
              {tieneMinimoCaracteres ? <HiCheckCircle className="w-4 h-4 shrink-0" /> : <HiXCircle className="w-4 h-4 shrink-0 text-slate-300" />}
              <span>Mínimo de 6 caracteres</span>
            </div>

            <div className={`flex items-center gap-2 transition-colors duration-200 ${tieneMayuscula ? "text-emerald-600" : "text-slate-400"}`}>
              {tieneMayuscula ? <HiCheckCircle className="w-4 h-4 shrink-0" /> : <HiXCircle className="w-4 h-4 shrink-0 text-slate-300" />}
              <span>Al menos una letra mayúscula</span>
            </div>

            <div className={`flex items-center gap-2 transition-colors duration-200 ${tieneNumeroOEspecial ? "text-emerald-600" : "text-slate-400"}`}>
              {tieneNumeroOEspecial ? <HiCheckCircle className="w-4 h-4 shrink-0" /> : <HiXCircle className="w-4 h-4 shrink-0 text-slate-300" />}
              <span>Al menos un número o carácter especial</span>
            </div>

            <div className={`flex items-center gap-2 transition-colors duration-200 ${coincidenContrasenas ? "text-emerald-600" : "text-slate-400"}`}>
              {coincidenContrasenas ? <HiCheckCircle className="w-4 h-4 shrink-0" /> : <HiXCircle className="w-4 h-4 shrink-0 text-slate-300" />}
              <span>Las contraseñas coinciden entre sí</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!esFormularioValido || loading}
            className="w-full py-3 bg-[#1e6f65] text-white font-bold rounded-xl hover:bg-[#16524b] transition shadow-lg shadow-teal-900/20 disabled:opacity-40 disabled:hover:bg-[#1e6f65] disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Activando..." : "Activar Cuenta"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}