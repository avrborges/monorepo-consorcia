// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

// Función auxiliar para parsear y validar JWT de forma segura
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  try {
    // Un JWT válido siempre tiene 3 partes separadas por puntos
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decodificamos el payload (la parte del medio)
    const payload = JSON.parse(atob(parts[1]));
    
    // Si el token tiene fecha de expiración ('exp'), verificamos que no haya pasado
    if (payload.exp) {
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    }
    
    return true; 
  } catch (error) {
    console.error("Error al validar el token de sesión:", error);
    return false; // Si falla el parseo, el token está corrupto
  }
}

export default function ProtectedRoute() {
  const token = localStorage.getItem("token");
  const location = useLocation();

  // 💡 Ahora validamos la existencia Y la integridad/expiración del token
  if (!isTokenValid(token)) {
    // Limpiamos basura en caso de que el token haya estado corrupto/expirado
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}