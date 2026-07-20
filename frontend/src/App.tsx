// src/App.tsx
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

// 🔴 EAGER — Páginas críticas de arranque (login y splash)
import Login from "@/pages/login";
import SplashScreen from "@/components/SplashScreen";

// 🟢 LAZY — Páginas post-login o secundarias (chunks separados)
const Landing = lazy(() => import("@/pages/landing"));
const ActivarCuenta = lazy(() => import("@/pages/ActivarCuenta"));
const OlvidePassword = lazy(() => import("@/pages/OlvidePassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const DashboardLayout = lazy(() => import("@/components/layout/DashboardLayout"));
const Overview = lazy(() => import("@/pages/dashboard/Overview"));
const ListaUsuarios = lazy(() => import("@/pages/dashboard/ListaUsuarios"));
const MapaEdificio = lazy(() => import("@/pages/dashboard/MapaEdificio"));
const Auditoria = lazy(() => import("@/pages/dashboard/Auditoria"));

// 🔴 EAGER — ProtectedRoute es un guard chico, sin costo mantenerlo eager
import ProtectedRoute from "@/components/layout/ProtectedRoute";

// 🎯 Helpers y hooks centralizados
import { estaAutenticado } from "@/lib/session";
import { useIsMobile } from "@/hooks/useIsMobile";

/* ============================================================
 * SCROLL TO TOP EN CADA CAMBIO DE RUTA
 * ============================================================
 *
 * Al navegar entre páginas, si el usuario estaba scrolleado hacia abajo,
 * la nueva página se abre en el mismo scroll (comportamiento default de SPAs).
 * Este componente resetea el scroll al top con cada cambio de pathname.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
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
      {/* 🔝 Resetea el scroll al top al navegar entre rutas */}
      <ScrollToTop />

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
          <Route path="/olvide-password" element={<OlvidePassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ============================================================
          * RUTAS PROTEGIDAS — cualquier usuario autenticado
          * ============================================================ */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />

              {/* Sub-rutas de gestión (admin y superadmin) */}
              <Route
                element={
                  <ProtectedRoute rolesPermitidos={["admin", "superadmin"]} />
                }
              >
                <Route path="usuarios" element={<ListaUsuarios />} />
                <Route path="unidades" element={<MapaEdificio />} />
              </Route>

              {/* Sub-ruta exclusiva de auditoría (solo superadmin) */}
              <Route
                element={
                  <ProtectedRoute rolesPermitidos={["superadmin"]} />
                }
              >
                <Route path="auditoria" element={<Auditoria />} />
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