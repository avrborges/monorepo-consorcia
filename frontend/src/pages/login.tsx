import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdErrorOutline } from "react-icons/md";
import { CiCircleCheck } from "react-icons/ci";
import AuthLayout from "../components/AuthLayout";
import { loginRequest } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const result = await loginRequest(email, password);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg(result.message);
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));
      setTimeout(() => navigate("/dashboard"), 1500);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <AuthLayout 
      title="Bienvenido de nuevo" 
      subtitle="Ingresa tus credenciales para acceder al panel administrativo."
    >
      {/* Mensajes de feedback */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2">
          <MdErrorOutline className="text-lg shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-medium text-teal-700">
          <CiCircleCheck className="text-lg shrink-0" />
          <span>{successMsg} Redirigiendo...</span>
        </div>
      )}

      {/* Formulario */}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo electrónico</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            // ✅ Se agregó text-slate-800 para visibilidad
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm"
          />
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
            <a href="#" className="text-xs text-teal-600 hover:text-teal-700 font-bold transition-colors">¿Olvidaste tu contraseña?</a>
          </div>
          <input 
            type="password" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            // ✅ Se agregó text-slate-800 y font-mono
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 transition-all shadow-sm"
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full py-3 bg-[#1e6f65] text-white font-bold rounded-xl hover:bg-[#16524b] transition shadow-lg shadow-teal-900/20"
        >
          {isLoading ? "Validando..." : "Iniciar sesión"}
        </button>
      </form>

      <p className="text-center lg:text-left text-sm text-slate-500 mt-8 font-semibold">
        ¿Tu consorcio aún no cuenta con el servicio?{" "}
        <a href="#" className="text-teal-600 font-bold hover:text-teal-700">Hablemos</a>
      </p>
    </AuthLayout>
  );
}