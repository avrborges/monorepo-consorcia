// src/pages/Login.tsx
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import logo from "../assets/img/consorcia.png";

export default function Login() {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
      
      {/* ─── SECCIÓN IZQUIERDA: ESTILO LANDING OSCURO (Solo visible en Desktop) ─── */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-[#0b132b] bg-consorcia-grid overflow-hidden border-r border-white/5">
        
        {/* Capa de efectos Glow */}
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-glow-radial pointer-events-none mix-blend-screen opacity-70" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-glow-purple animate-glow-slow pointer-events-none mix-blend-screen opacity-50" />
        
        {/* Header de la sección izquierda */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 group text-slate-400 hover:text-white transition-colors">
            <FiArrowLeft className="transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Volver</span>
          </Link>
        </div>

        {/* Contenido Central Branding */}
        <div className="relative z-10 max-w-md my-auto space-y-6">
          <div className="flex items-center gap-3 animate-fade-in">
            <img src={logo} alt="Consorcia" className="h-14 w-auto drop-shadow-[0_0_20px_rgba(56,189,248,0.3)]" />
            <span className="text-3xl font-extrabold tracking-wider text-white">
              CONSOR<span className="text-orange-400">CIA</span>
            </span>
          </div>
          
          <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Gestiona tu comunidad <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">
              en un solo lugar.
            </span>
          </h1>
          
          <p className="text-slate-400 text-lg font-light leading-relaxed">
            Accede a tus expensas, reportes, documentos y canales de comunicación de manera 100% online y transparente.
          </p>
        </div>

        {/* Footer de la sección izquierda */}
        <div className="relative z-10 text-xs text-slate-600 tracking-wider">
          © 2026 CONSORCIA • by ARTHEMYSA
        </div>
      </div>


      {/* ─── SECCIÓN DERECHA: FORMULARIO DE LOGIN (PANEL CLARO) ─── */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-slate-50 relative selection:bg-teal-500/20">
        
        {/* Botón de volver atrás visible solo en Mobile (Adaptado a fondo claro) */}
        <Link to="/" className="lg:hidden absolute top-6 left-6 inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium">
          <FiArrowLeft /> Volver
        </Link>

        {/* Contenedor del Formulario (Tarjeta flotante en mobile, limpio en desktop) */}
        <div className="w-full max-w-md bg-white lg:bg-transparent border border-slate-200/80 lg:border-none p-8 sm:p-10 lg:p-0 rounded-2xl shadow-xl shadow-slate-200/50 lg:shadow-none z-10">
          
          {/* Logo visible solo en Mobile (Versión con texto oscuro) */}
          <div className="flex flex-col items-center lg:items-start mb-8">
            <div className="lg:hidden flex items-center gap-2 mb-4">
              <img src={logo} alt="Consorcia" className="h-7 w-auto filter drop-shadow-sm" />
              <span className="text-lg font-bold tracking-wider text-slate-900">
                CONSOR<span className="text-orange-500">CIA</span>
              </span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-center lg:text-left">
              Bienvenido de nuevo
            </h2>
            <p className="text-sm text-slate-500 mt-2 text-center lg:text-left">
              Ingresa tus credenciales para acceder al panel administrativo.
            </p>
          </div>

          {/* Formulario con mejoras de contraste y máscara */}
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            
            {/* Campo: Correo Electrónico */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Correo electrónico
              </label>
              <input 
                type="email" 
                required
                placeholder="nombre@tu-edificio.com"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm 
                           text-slate-800 placeholder-slate-400/80
                           focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 
                           transition-all duration-200 shadow-sm"
              />
            </div>

            {/* Campo: Contraseña */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Contraseña
                </label>
                <a href="#" className="text-xs text-teal-600 hover:text-teal-700 font-semibold transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input 
                type="password" 
                required
                placeholder="Password"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm 
                           text-slate-800 placeholder-slate-400/80
                           focus:outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 
                           transition-all duration-200 shadow-sm
                           font-mono"
              />
            </div>

            {/* Recordarme Checkbox */}
            <div className="flex items-center gap-2 py-1">
              <input 
                type="checkbox" 
                id="remember" 
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500/20 cursor-pointer w-4 h-4 transition"
              />
              <label htmlFor="remember" className="text-sm text-slate-600 cursor-pointer select-none font-medium">
                Recordar mi sesión
              </label>
            </div>

            {/* Botón Ingresar */}
            <button type="submit" className="w-full bg-[#1e6f65] hover:bg-[#16524b] text-white py-3 rounded-xl font-semibold transition duration-300 shadow-lg shadow-teal-700/10 hover:scale-[1.01] active:scale-[0.99] cursor-pointer mt-2">
              Iniciar sesión
            </button>
          </form>

          {/* Enlace de Registro */}
          <p className="text-center lg:text-left text-sm text-slate-500 mt-8 font-medium">
            ¿Tu consorcio aún no cuenta con el servicio?{" "}
            <a href="#" className="text-teal-600 font-bold hover:text-teal-700 transition-colors">
              Hablemos
            </a>
          </p>
        </div>
      </div>

    </div>
  );
}