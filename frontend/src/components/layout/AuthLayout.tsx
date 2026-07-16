// src/components/layout/AuthLayout.tsx
import logo from "../../assets/img/consorcia.png";
import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-[#0b132b] lg:bg-transparent">

      {/* ─── PANEL IZQUIERDO (OSCURO - SOLO DESKTOP) ───
          Contenido secundario / decorativo del layout, semánticamente aside */}
      <aside
        className="hidden lg:flex relative flex-col justify-between p-12 bg-[#0b132b] border-r border-white/5"
        aria-label="Presentación de Consorcia"
      >
        <Link
          to="/"
          aria-label="Volver a la página de inicio"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <FiArrowLeft aria-hidden="true" /> Volver
        </Link>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Isotipo de Consorcia" className="h-14 w-auto" />
            <span className="text-3xl font-extrabold text-white" aria-hidden="true">
              CONSOR<span className="text-[#fca311]">CIA</span>
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-white">
            Gestiona tu comunidad <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-teal-400 to-blue-400">
              en un solo lugar.
            </span>
          </h2>
        </div>

        <footer className="text-slate-600 text-xs">
          © 2026 CONSORCIA • by ARTHEMYSA
        </footer>
      </aside>

      {/* ─── PANEL DERECHO / CONTENEDOR PRINCIPAL (MOBILE Y DESKTOP) ─── */}
      {/* En mobile usa un fondo degradado oscuro de marca; en desktop vuelve a ser bg-white */}
      <div className="relative flex flex-col items-center justify-start lg:justify-center p-6 sm:p-8 bg-linear-to-b from-[#1c2541] to-[#0b132b] lg:bg-none lg:bg-white min-h-screen lg:min-h-0">

        {/* 🌟 BARRA SUPERIOR EXCLUSIVA PARA MOBILE */}
        <div className="w-full max-w-md flex items-center justify-between lg:hidden mb-8 pt-4 shrink-0">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Isotipo de Consorcia" className="h-8 w-auto" />
            <span className="text-lg font-black text-white tracking-wider" aria-hidden="true">
              CONSOR<span className="text-[#fca311]">CIA</span>
            </span>
          </div>
          <Link
            to="/"
            aria-label="Volver a la página de inicio"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <FiArrowLeft aria-hidden="true" /> Volver
          </Link>
        </div>

        {/* 🌟 TARJETA ENVOLVENTE — Contenido principal de la página */}
        <main className="w-full max-w-md bg-white lg:bg-transparent p-6 sm:p-8 lg:p-0 rounded-2xl border border-white/5 lg:border-none shadow-2xl shadow-black/40 lg:shadow-none my-auto lg:my-0">
          <div className="mb-6 lg:mb-8">
            {/* h1 real de la página (el que representa la identidad de esta ruta) */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
          </div>
          {children}
        </main>

        {/* Footer móvil sutil */}
        <footer className="block lg:hidden text-center text-[10px] font-medium text-slate-500/80 mt-8 pb-2">
          © 2026 CONSORCIA • by ARTHEMYSA
        </footer>
      </div>

    </div>
  );
}