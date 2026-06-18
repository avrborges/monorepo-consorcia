// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/landing";
import Login from "./pages/login";
import SplashScreen from "./components/SplashScreen"; // 🆕 Importamos el SplashScreen móvil
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout"; 
import Overview from "./pages/dashboard/Overview"; 

// 🆕 Componente Guardián de Entrada Raíz
function RootHandler() {
  // Detectamos si es pantalla móvil (menor a 768px)
  const isMobile = window.innerWidth < 768;

  // Si es celular, renderiza el SplashScreen (que se encargará del redireccionamiento tras 2.5s)
  // Si es escritorio, renderiza la Landing Page normal
  return isMobile ? <SplashScreen /> : <Landing />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔓 RUTAS PÚBLICAS */}
        {/* 🆕 Ahora "/" decide inteligentemente qué mostrar según el dispositivo */}
        <Route path="/" element={<RootHandler />} />
        
        <Route path="/login" element={<Login />} />

        {/* 🔒 RUTAS PROTEGIDAS Y ANIDADAS */}
        <Route element={<ProtectedRoute />}>
          {/* DashboardLayout envolverá a todas las sub-rutas internas */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            {/* Index significa que cargará por defecto al entrar a /dashboard */}
            <Route index element={<Overview />} />
          </Route>
        </Route>

        {/* 🔄 REDIRECCIÓN COMODÍN */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;