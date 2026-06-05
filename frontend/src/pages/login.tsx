// src/pages/Login.tsx
import { Link } from "react-router-dom";
import logo from "../assets/img/consorcia.png";

export default function Login() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      {/* Sutil resplandor de fondo para el login */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-900/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Tarjeta de Login */}
      <div className="w-full max-w-md bg-slate-900/40 border border-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl z-10">
        
        {/* Encabezado / Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2 mb-4 hover:opacity-90 transition-opacity">
            <img src={logo} alt="Consorcia" className="h-8 w-auto" />
            <span className="text-xl font-bold tracking-wider text-white">
              CONSOR<span className="text-orange-400">CIA</span>
            </span>
          </Link>
          <h2 className="text-2xl font-semibold text-white">Bienvenido de nuevo</h2>
          <p className="text-sm text-slate-400 mt-1">Ingresa a tu cuenta de administración</p>
        </div>

        {/* Formulario */}
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Correo electrónico
            </label>
            <input 
              type="email" 
              placeholder="nombre@tu-edificio.com"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Contraseña
              </label>
              <a href="#" className="text-xs text-teal-400 hover:underline">¿La olvidaste?</a>
            </div>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition"
            />
          </div>

          <button className="w-full bg-[#1e6f65] hover:bg-[#238377] text-white py-3 rounded-xl font-medium transition duration-300 shadow-lg shadow-teal-900/20 cursor-pointer">
            Iniciar sesión
          </button>
        </form>

        {/* Registro opcional */}
        <p className="text-center text-sm text-slate-400 mt-6">
          ¿Tu consorcio no tiene cuenta?{" "}
          <a href="#" className="text-teal-400 font-medium hover:underline">Registrarse</a>
        </p>
      </div>
    </div>
  );
}