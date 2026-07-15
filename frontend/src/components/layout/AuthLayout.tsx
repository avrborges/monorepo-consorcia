import logo from "../../assets/img/consorcia.png";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-[#0b132b] lg:bg-transparent">
      
      {/* ─── PANEL IZQUIERDO (OSCURO - SOLO DESKTOP) ─── */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-[#0b132b] border-r border-white/5">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <FiArrowLeft /> Volver
        </Link>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Consorcia" className="h-14 w-auto" />
            <span className="text-3xl font-extrabold text-white">CONSOR<span className="text-[#fca311]">CIA</span></span>
          </div>
          <h1 className="text-4xl font-extrabold text-white">
            Gestiona tu comunidad <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-400 to-blue-400">en un solo lugar.</span>
          </h1>
        </div>
        <p className="text-slate-600 text-xs">© 2026 CONSORCIA • by ARTHEMYSA</p>
      </div>

      {/* ─── PANEL DERECHO / CONTENEDOR PRINCIPAL (MOBILE Y DESKTOP) ─── */}
      {/* En mobile usa un fondo degradado oscuro de marca; en desktop vuelve a ser bg-white */}
      <div className="relative flex flex-col items-center justify-start lg:justify-center p-6 sm:p-8 bg-linear-to-b from-[#1c2541] to-[#0b132b] lg:bg-none lg:bg-white min-h-screen lg:min-h-0">
        
        {/* 🌟 BARRA SUPERIOR EXCLUSIVA PARA MOBILE */}
        <div className="w-full max-w-md flex items-center justify-between lg:hidden mb-8 pt-4 shrink-0">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Consorcia" className="h-8 w-auto" />
            <span className="text-lg font-black text-white tracking-wider">CONSOR<span className="text-[#fca311]">CIA</span></span>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <FiArrowLeft /> Volver
          </Link>
        </div>

        {/* 🌟 TARJETA ENVOLVENTE */}
        <div className="w-full max-w-md bg-white lg:bg-transparent p-6 sm:p-8 lg:p-0 rounded-2xl border border-white/5 lg:border-none shadow-2xl shadow-black/40 lg:shadow-none my-auto lg:my-0">
          <div className="mb-6 lg:mb-8">
            {/* Los títulos cambian a blanco en mobile para contrastar con el fondo si no estuvieran en la tarjeta */}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
          </div>
          {children}
        </div>

        {/* Footer móvil sutil */}
        <p className="block lg:hidden text-center text-[10px] font-medium text-slate-500/80 mt-8 pb-2">
          © 2026 CONSORCIA • by ARTHEMYSA
        </p>
      </div>

    </div>
  );
}