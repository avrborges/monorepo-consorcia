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
const SeleccionConsorcio = lazy(() => import("@/pages/SeleccionConsorcio"));
const DashboardLayout = lazy(() => import("@/components/layout/DashboardLayout"));
const Overview = lazy(() => import("@/pages/dashboard/Overview"));
const ListaUsuarios = lazy(() => import("@/pages/dashboard/ListaUsuarios"));
const MapaEdificio = lazy(() => import("@/pages/dashboard/MapaEdificio"));
const Auditoria = lazy(() => import("@/pages/dashboard/Auditoria"));
const ConfiguracionConsorcio = lazy(() => import("@/pages/dashboard/ConfiguracionConsorcio")); // 🆕 M6.0
const ConsorciosABM = lazy(() => import("@/pages/dashboard/ConsorciosABM")); // 🆕 M6.4b

// 🔴 EAGER — ProtectedRoute es un guard chico, sin costo mantenerlo eager
import ProtectedRoute from "@/components/layout/ProtectedRoute";

// 🎯 Helpers y hooks centralizados
import { estaAutenticado } from "@/lib/session";
import { useIsMobile } from "@/hooks/useIsMobile";

/* ============================================================
 * SCROLL TO TOP EN CADA CAMBIO DE RUTA
 * ============================================================ */
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

          {/* 🆕 Selección de consorcio (casos C1/D1 del login multi-tenant) */}
          <Route path="/seleccionar-consorcio" element={<SeleccionConsorcio />} />

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

              {/* Sub-rutas exclusivas de superadmin — auditoría y configuración */}
              <Route
                element={
                  <ProtectedRoute rolesPermitidos={["superadmin"]} />
                }
              >
                <Route path="auditoria" element={<Auditoria />} />
                {/* 🆕 M6.0 — Configuración / Datos del Consorcio */}
                <Route path="configuracion" element={<ConfiguracionConsorcio />} />
              </Route>

              {/* 🆕 M6.4b — ABM de consorcios: EXCLUSIVO super_admin_global */}
              <Route element={<ProtectedRoute requiereSuperGlobal />}>
                <Route path="consorcios" element={<ConsorciosABM />} />
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
