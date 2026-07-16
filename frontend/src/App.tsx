// src/App.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// 🔴 EAGER — Páginas críticas de arranque (login y splash)
import Login from "@/pages/login";
import SplashScreen from "@/components/SplashScreen";

// 🟢 LAZY — Páginas post-login o secundarias (chunks separados)
const Landing = lazy(() => import("@/pages/landing"));
const ActivarCuenta = lazy(() => import("@/pages/ActivarCuenta"));
const DashboardLayout = lazy(() => import("@/components/layout/DashboardLayout"));
const Overview = lazy(() => import("@/pages/dashboard/Overview"));
const ListaUsuarios = lazy(() => import("@/pages/dashboard/ListaUsuarios"));
const MapaEdificio = lazy(() => import("@/pages/dashboard/MapaEdificio"));

// 🔴 EAGER — ProtectedRoute es un guard chico, sin costo mantenerlo eager
import ProtectedRoute from "@/components/layout/ProtectedRoute";

// 🎯 Helpers y hooks centralizados
import { estaAutenticado } from "@/lib/session";
import { useIsMobile } from "@/hooks/useIsMobile";

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
      {/*
        🎯 Suspense boundary global.
        Mientras un chunk lazy se descarga, se muestra SplashScreen.
        Esto evita pantalla en blanco durante la transición.
      */}
      <Suspense fallback={<SplashScreen />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;