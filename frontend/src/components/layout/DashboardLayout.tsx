// src/components/layout/DashboardLayout.tsx
import { useState, useCallback, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  HiChartPie,
  HiMenu,
  HiX,
  HiOutlineUserGroup,
  HiOutlineOfficeBuilding,
} from "react-icons/hi";
import { FaSignOutAlt } from "react-icons/fa";

// 🎯 Hook de sesión centralizado (Fase 4)
import { useAuth } from "@/hooks/useAuth";

// 🎯 Hook para título dinámico de pestaña (Tanda 1 UX)
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/* ============================================================
 * PREFETCH AL HOVER
 * ============================================================ */

/**
 * Mapa de rutas → función de import dinámico del chunk correspondiente.
 * Al pasar el mouse (o tap en mobile) sobre un link, se dispara la
 * descarga del chunk en background. Cuando el usuario hace click,
 * el chunk ya está en caché → transición instantánea.
 */
const CHUNK_PREFETCHERS: Record<string, () => Promise<unknown>> = {
  "/dashboard/unidades": () => import("@/pages/dashboard/MapaEdificio"),
  "/dashboard/usuarios": () => import("@/pages/dashboard/ListaUsuarios"),
};

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function DashboardLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 🎯 Título default del layout — cada sub-página lo sobrescribe cuando se monta
  useDocumentTitle("Dashboard");

  // 🎯 Todo lo de sesión pasa por useAuth
  const { usuario, rol, esAdmin, logout } = useAuth();

  // Fallbacks defensivos si por algún motivo la sesión no está cargada aún
  const nombreCompleto = usuario?.name || "Usuario";
  const rolMostrado = rol || "admin";

  /* ------------------------------------------------------------
   * Prefetch con cache — evita disparar el import más de una vez
   * ------------------------------------------------------------ */
  const chunksPrefetcheados = useRef<Set<string>>(new Set());

  const prefetchChunk = useCallback((path: string) => {
    if (chunksPrefetcheados.current.has(path)) return;

    const prefetcher = CHUNK_PREFETCHERS[path];
    if (!prefetcher) return;

    chunksPrefetcheados.current.add(path);
    // Fire-and-forget: ignoramos errores intencionalmente
    void prefetcher();
  }, []);

  const menuItems = [
    {
      name: "Panel de Control",
      path: "/dashboard",
      icon: <HiChartPie className="w-5 h-5" />,
    },
  ];

  // Restringimos la visibilidad de las herramientas estructurales para administradores
  if (esAdmin) {
    menuItems.push({
      name: "Unidades Funcionales",
      path: "/dashboard/unidades",
      icon: <HiOutlineOfficeBuilding className="w-5 h-5" />,
    });

    menuItems.push({
      name: "Lista de Usuarios",
      path: "/dashboard/usuarios",
      icon: <HiOutlineUserGroup className="w-5 h-5" />,
    });
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#f8fafc] flex font-sans text-slate-800 antialiased relative">
      {/* 1. CAPA OSCURA DE FONDO (BACKDROP PARA MÓVILES) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 2. BARRA LATERAL (ESTILO ASIMÉTRICO PREMIUM) */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 bg-[#0b132b] text-slate-300 flex flex-col justify-between shadow-xl transition-transform duration-300
        w-64 border-r border-white/3 h-full
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 shrink-0
      `}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* SECCIÓN SUPERIOR: PERFIL DE USUARIO PRINCIPAL */}
          <div className="py-8 px-4 flex flex-col items-center text-center border-b border-white/4 shrink-0 relative">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition md:hidden p-1"
              aria-label="Cerrar menú lateral"
            >
              <HiX className="w-5 h-5" />
            </button>

            <div className="relative">
              {/* Avatar circular */}
              <div className="h-14 w-14 rounded-full bg-white/6 text-white border border-white/10 flex items-center justify-center font-black text-lg shadow-md">
                {nombreCompleto.charAt(0).toUpperCase()}
              </div>
              {/* Indicador de estado online */}
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#0b132b]" />
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-100 tracking-wide truncate max-w-full px-2">
              {nombreCompleto}
            </h3>

            <span className="mt-1 text-[9px] text-[#fca311] font-extrabold uppercase tracking-widest bg-[#fca311]/10 px-2 py-0.5 rounded-full border border-[#fca311]/20">
              {rolMostrado}
            </span>
          </div>

          {/* MENÚ DE NAVEGACIÓN ESTILO ASIMÉTRICO */}
          <div className="flex-1 overflow-y-auto pl-3 py-3 pr-0 custom-scrollbar mt-2">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const tienePrefetch = Boolean(CHUNK_PREFETCHERS[item.path]);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    // 🚀 Prefetch al hover (desktop) y al touchstart (mobile)
                    onMouseEnter={tienePrefetch ? () => prefetchChunk(item.path) : undefined}
                    onTouchStart={tienePrefetch ? () => prefetchChunk(item.path) : undefined}
                    onFocus={tienePrefetch ? () => prefetchChunk(item.path) : undefined}
                    className={`flex items-center space-x-3 px-4 py-3 transition-all duration-150 group relative ${
                      isActive
                        ? "bg-[#f8fafc] text-slate-900 font-bold rounded-l-xl border-l-4 border-[#fca311]"
                        : "text-slate-400/80 hover:bg-white/2 hover:text-slate-200 rounded-l-xl mr-3"
                    }`}
                  >
                    {/* Ícono dinámico */}
                    <span
                      className={`transition-colors ${
                        isActive
                          ? "text-[#0b132b]"
                          : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {/* Texto del ítem */}
                    <span className="truncate text-[13.5px] tracking-wide">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* PIE DEL SIDEBAR: BOTÓN CERRAR SESIÓN */}
        <div className="p-3 border-t border-white/4 bg-transparent shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400/70 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition duration-150 group cursor-pointer"
          >
            <FaSignOutAlt className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
            <span className="font-semibold text-[13.5px] tracking-wide">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* CONTENEDOR DERECHO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* 3. BARRA SUPERIOR ULTRA LIMPIA */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-600 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 md:hidden transition"
              aria-label="Abrir menú lateral"
            >
              <HiMenu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-3 select-none">
              <span className="text-xl font-black tracking-wider text-[#0b132b]">
                CONSOR<span className="text-[#fca311]">CIA</span>
              </span>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase hidden sm:block">
                Panel de Control
              </h2>
            </div>
          </div>
        </header>

        {/* 4. CONTENEDOR DEL CONTENIDO VARIABLE */}
        <main className="p-4 sm:p-8 flex-1 overflow-y-auto w-full mx-auto animate-fade-in min-h-0">
          <div className="max-w-400 mx-auto">
            <Outlet />
          </div>
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