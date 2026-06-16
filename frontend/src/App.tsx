// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/landing";
import Login from "./pages/login";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout"; // 🆕 Importamos el Layout real
import Overview from "./pages/dashboard/Overview"; // 🆕 Importamos la vista interna

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔓 RUTAS PÚBLICAS */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* 🔒 RUTAS PROTEGIDAS Y ANIDADAS */}
        <Route element={<ProtectedRoute />}>
          {/* DashboardLayout envolverá a todas las sub-rutas internas */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            {/* Index significa que cargará por defecto al entrar a /dashboard */}
            <Route index element={<Overview />} />
            
            {/* Ejemplo de cómo agregarás módulos en el futuro:
            <Route path="expensas" element={<Expensas />} /> 
            <Route path="usuarios" element={<Usuarios />} /> */}
          </Route>
        </Route>

        {/* 🔄 REDIRECCIÓN COMODÍN */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;