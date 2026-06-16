// src/components/DashboardLayout.tsx
import { useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { HiChartPie, HiMenu, HiX } from "react-icons/hi"; 
import { FaSignOutAlt } from "react-icons/fa";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { name: "Usuario", role: "admin" };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    { name: "Panel de Control", path: "/dashboard", icon: <HiChartPie className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-800 antialiased relative">
      
      {/* 1. CAPA OSCURA DE FONDO (BACKDROP PARA MÓVILES) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. BARRA LATERAL (SIDEBAR ENFOCADO EN PERFIL) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#0b132b] text-slate-300 flex flex-col justify-between shadow-xl transition-transform duration-300
        w-64 border-r border-white/[0.03]
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:relative md:translate-x-0 shrink-0
      `}>
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* SECCIÓN SUPERIOR: PERFIL DE USUARIO PRINCIPAL */}
          <div className="py-8 px-4 flex flex-col items-center text-center border-b border-white/[0.04] shrink-0 relative">
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition md:hidden p-1"
            >
              <HiX className="w-5 h-5" />
            </button>

            <div className="relative">
              {/* Avatar circular */}
              <div className="h-14 w-14 rounded-full bg-white/[0.06] text-white border border-white/[0.1] flex items-center justify-center font-black text-lg shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {/* Indicador de estado online */}
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0b132b]" />
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-100 tracking-wide truncate max-w-full px-2">
              {user.name}
            </h3>
            
            <span className="mt-1 text-[9px] text-[#fca311] font-extrabold uppercase tracking-widest bg-[#fca311]/10 px-2 py-0.5 rounded-full border border-[#fca311]/20">
              {user.role}
            </span>
          </div>

          {/* MENÚ DE NAVEGACIÓN */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar mt-2">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 group ${
                      isActive 
                        ? "bg-white/[0.07] text-white font-semibold" 
                        : "text-slate-400/80 hover:bg-white/[0.02] hover:text-slate-200"
                    }`}
                  >
                    <span className={`transition-colors ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`}>
                      {item.icon}
                    </span>
                    <span className="truncate text-[13.5px] tracking-wide">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* PIE DEL SIDEBAR: BOTÓN CERRAR SESIÓN */}
        <div className="p-3 border-t border-white/[0.04] bg-transparent shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400/70 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition duration-150 group cursor-pointer"
          >
            <FaSignOutAlt className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
            <span className="font-semibold text-[13.5px] tracking-wide">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENEDOR DERECHO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 3. 🆕 BARRA SUPERIOR ULTRA LIMPIA (SIN SOMBRA, BORDE MINIMALISTA) */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-600 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 md:hidden transition"
            >
              <HiMenu className="w-6 h-6" />
            </button>
            
            <div className="flex items-center space-x-3 select-none">
              <span className="text-xl font-black tracking-wider text-[#0b132b]">
                CONSOR<span className="text-[#fca311]">CIA</span>
              </span>
              {/* Separador vertical suavizado */}
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase hidden sm:block">
                Panel de Control
              </h2>
            </div>
          </div>
        </header>

        {/* 4. CONTENEDOR DEL CONTENIDO VARIABLE */}
        <main className="p-4 sm:p-8 flex-1 overflow-y-auto max-w-[1600px] w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* ESTILOS ADICIONALES */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 99px;
        }
      `}</style>

    </div>
  );
}