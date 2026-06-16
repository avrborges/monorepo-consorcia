// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
  // Leemos directamente el almacenamiento en cada intento de renderizado
  const token = localStorage.getItem("token");
  const location = useLocation();

  // Si no hay token, lo expulsamos al login inmediatamente
  // Guardamos la ubicación de origen por si queremos redirigirlo de vuelta después
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si hay token, se le da acceso al Dashboard
  return <Outlet />;
}