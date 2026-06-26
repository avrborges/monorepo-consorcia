// src/pages/ActivarCuenta.tsx
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AxiosError } from "axios"; // Importamos el tipo de error de Axios
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

  // CORRECCIÓN: Tipado de FormEvent específico para HTMLFormElement
const handleActivar = async (e: React.SyntheticEvent) => {
  e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/users/activar", { token, password });
      setSuccess(true);
      
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: unknown) {
      // CORRECCIÓN: Tipado robusto para el error sin usar 'any'
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
            // Se agregó text-slate-800 para visibilidad y font-mono para alineación
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
            // Se agregó text-slate-800 para visibilidad y font-mono para alineación
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm"
            />
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-[#1e6f65] text-white font-bold rounded-xl hover:bg-[#16524b] transition shadow-lg shadow-teal-900/20 disabled:opacity-50"
        >
            {loading ? "Activando..." : "Activar Cuenta"}
        </button>
        </form>
      )}
    </AuthLayout>
  );
}