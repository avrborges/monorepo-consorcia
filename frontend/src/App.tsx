// src/App.tsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/landing";
import Login from "./pages/login";
import ActivarCuenta from "./pages/ActivarCuenta";
import SplashScreen from "@/components/SplashScreen";

import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import Overview from "./pages/dashboard/Overview";
import ListaUsuarios from "./pages/dashboard/ListaUsuarios";
import MapaEdificio from "./pages/dashboard/MapaEdificio";

// 🎯 Helper de sesión centralizado (Fase 4)
import { estaAutenticado } from "@/lib/session";

/* ============================================================
 * CONSTANTES
 * ============================================================ */
const MOBILE_BREAKPOINT = 768;

/* ============================================================
 * HOOK: detección reactiva de mobile (via matchMedia)
 * ============================================================ */
function useIsMobile(breakpoint = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}

/* ============================================================
 * GUARDIÁN DE LA RUTA RAÍZ
 * ============================================================ */
function RootHandler() {
  const isMobile = useIsMobile();
  if (estaAutenticado()) {
    return <Navigate to="/dashboard" replace />;
  }
  return isMobile ? <SplashScreen /> : <Landing />;
}

/* ============================================================
 * FALLBACK 404 / RUTA NO ENCONTRADA
 * ============================================================ */
function NotFoundRedirect() {
  const destino = estaAutenticado() ? "/dashboard" : "/login";
  return <Navigate to={destino} replace />;
}

/* ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================ */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ============================================================
         * RUTAS PÚBLICAS
         * ============================================================ */}
        <Route path="/" element={<RootHandler />} />
        <Route path="/login" element={<Login />} />
        <Route path="/activar-cuenta" element={<ActivarCuenta />} />

        {/* ============================================================
         * RUTAS PROTEGIDAS — cualquier usuario autenticado
         * ============================================================ */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />

            {/* Sub-rutas de gestión (solo admin y superadmin) */}
            <Route
              element={
                <ProtectedRoute rolesPermitidos={["admin", "superadmin"]} />
              }
            >
              <Route path="usuarios" element={<ListaUsuarios />} />
              <Route path="unidades" element={<MapaEdificio />} />
            </Route>
          </Route>
        </Route>

        {/* ============================================================
         * FALLBACK 404
         * ============================================================ */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;