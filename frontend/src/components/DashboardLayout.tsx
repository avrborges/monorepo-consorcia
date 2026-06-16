// src/components/DashboardLayout.tsx
import { useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { HiChartPie, HiMenu, HiX } from "react-icons/hi"; // 🆕 Importamos iconos de menú
import { FaSignOutAlt } from "react-icons/fa";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 🆕 En mobile arranca cerrado (false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { name: "Usuario", role: "admin" };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    { name: "Inicio / Resumen", path: "/dashboard", icon: <HiChartPie className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-slate-800 antialiased relative">
      
      {/* 🆕 1. CAPA OSCURA DE FONDO (BACKDROP) - Solo se muestra en mobile cuando el menú está abierto */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)} // Si tocan fuera del menú, se cierra
        />
      )}

      {/* 2. BARRA LATERAL (SIDEBAR ADAPTATIVO MOBILE/DESKTOP) */}
        <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#0b132b] text-slate-200 flex flex-col justify-between shadow-xl transition-transform duration-300
        w-72 md:w-64 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:relative md:translate-x-0
        `}>
        <div>
          {/* Header del Sidebar */}
          <div className="p-5 flex items-center justify-between border-b border-slate-800 h-16 bg-[#070d20]">
            <span className="text-xl font-black tracking-wider text-white">CONSOR<span className="text-[#fca311]">CIA</span></span>
            
            {/* Botón para cerrar el menú en celulares */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="text-slate-400 hover:text-white transition md:hidden"
            >
              <HiX className="w-6 h-6" />
            </button>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-3 mt-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)} // 🆕 Cierra el menú al hacer clic en mobile
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive 
                      ? "bg-[#1c2541] text-[#00b4d8] font-bold border-l-4 border-[#00b4d8] rounded-l-none" 
                      : "text-slate-400 hover:bg-[#1c2541]/50 hover:text-slate-200"
                  }`}
                >
                  <span className={`transition-transform duration-150 ${isActive ? "scale-110 text-[#00b4d8]" : "text-slate-400 group-hover:text-slate-200 group-hover:scale-110"}`}>
                    {item.icon}
                  </span>
                  <span className="truncate text-[14px]">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Botón de Cerrar Sesión */}
        <div className="p-3 border-t border-slate-800 bg-[#070d20]/45">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-950/20 hover:text-red-300 rounded-xl transition duration-150 group"
          >
            <FaSignOutAlt className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span className="font-medium text-[14px]">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENEDOR DERECHO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* 3. BARRA SUPERIOR (NAVBAR RESPONSIVO) */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 shadow-sm">
          
          {/* Botón de apertura Hambuguesa en Mobile / Título en Escritorio */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 md:hidden transition"
            >
              <HiMenu className="w-6 h-6" />
            </button>
            <h2 className="text-sm font-bold tracking-wide text-slate-400 uppercase hidden sm:block">Consorcia Panel</h2>
          </div>

          {/* Perfil de Usuario */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="text-right">
              {/* truncate evita que nombres largos pisen la interfaz en pantallas muy chicas */}
              <p className="text-xs sm:text-sm font-bold text-slate-800 max-w-[100px] sm:max-w-none truncate">{user.name}</p>
              <p className="text-[9px] sm:text-[10px] text-amber-700 font-extrabold uppercase tracking-widest bg-amber-50 border border-amber-200 px-1.5 sm:px-2 py-0.5 rounded-md inline-block">
                {user.role}
              </p>
            </div>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#0b132b] text-[#00b4d8] border border-[#1c2541] flex items-center justify-center font-black text-xs sm:text-sm shadow-md flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* 4. CONTENEDOR DEL CONTENIDO VARIABLE (Ajustado padding para celulares) */}
        <main className="p-4 sm:p-8 flex-1 overflow-y-auto max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
}