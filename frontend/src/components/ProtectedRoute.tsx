// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

// 1. Definimos la interfaz para que TypeScript acepte la propiedad opcional
interface ProtectedRouteProps {
  rolesPermitidos?: string[];
}

// Función auxiliar para parsear y validar JWT de forma segura
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    
    if (payload.exp) {
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    }
    
    return true; 
  } catch (error) {
    console.error("Error al validar el token de sesión:", error);
    return false;
  }
}

// Función auxiliar para extraer el rol de manera segura
function obtenerRolUsuario(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    return payload.role || null; // 💡 Ajustá 'role' según cómo venga nombrado en tu JWT payload
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ rolesPermitidos }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  // 1. Verificación primaria de autenticación
  if (!isTokenValid(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Verificación secundaria de autorización por rol
  if (rolesPermitidos) {
    const rolUsuario = obtenerRolUsuario(token);

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      // Si no tiene el rol necesario, lo mandamos al index del dashboard de forma segura
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}