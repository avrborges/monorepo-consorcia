import logo from "../assets/img/consorcia.png";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-linear-to-br from-[#1c2541] to-[#0b132b] lg:from-transparent lg:to-transparent">
      {/* ─── PANEL IZQUIERDO (OSCURO) ─── */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-[#0b132b] border-r border-white/5">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <FiArrowLeft /> Volver
        </Link>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Consorcia" className="h-14 w-auto" />
            <span className="text-3xl font-extrabold text-white">CONSOR<span className="text-[#fca311]">CIA</span></span>
          </div>
          <h1 className="text-4xl font-extrabold text-white">Gestiona tu comunidad <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-400 to-blue-400">en un solo lugar.</span>
          </h1>
        </div>
        <p className="text-slate-600 text-xs">© 2026 CONSORCIA • by ARTHEMYSA</p>
      </div>

      {/* ─── PANEL DERECHO (FORMULARIO) ─── */}
      <div className="flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}