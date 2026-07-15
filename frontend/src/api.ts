// src/api.ts
import axios, { AxiosError } from "axios";

// 🎯 Tipos de respuesta compartidos entre backend y frontend
import type { LoginResponse, SuccessResponse } from "@shared/types";

/* ============================================================
 * CONFIGURACIÓN DE BASE URL
 * ============================================================ */

/**
 * Determina la URL base del backend de forma flexible:
 *  1. Si existe VITE_API_URL en el entorno → la usa (producción / staging).
 *  2. En su defecto → construye una URL relativa al hostname actual (desarrollo local + red LAN).
 */
const obtenerBaseUrl = (): string => {
  const fromEnv = import.meta.env?.VITE_API_URL as string | undefined;
  if (fromEnv) return `${fromEnv.replace(/\/$/, "")}/api`;
  return `http://${window.location.hostname}:5000/api`;
};

/* ============================================================
 * INSTANCIA DE AXIOS
 * ============================================================ */

const api = axios.create({
  baseURL: obtenerBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

/* ============================================================
 * INTERCEPTORES
 * ============================================================ */

/**
 * REQUEST: adjunta el token JWT si está disponible en localStorage.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE: maneja globalmente los errores 401 (token expirado o inválido).
 * Limpia la sesión y redirige al login preservando la ruta destino
 * para retomar navegación después del re-login.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const rutaActual = window.location.pathname;

      // Evitamos loops de redirección si ya estamos en el login
      if (!rutaActual.startsWith("/login") && !rutaActual.startsWith("/activar-cuenta")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

/* ============================================================
 * SERVICIO: LOGIN
 * ============================================================ */

/**
 * Realiza el request de login y retorna el resultado tipado.
 * En caso de error del backend, retorna el shape { success: false, message }
 * para que el componente pueda mostrar el mensaje sin manejar excepciones.
 */
export const loginRequest = async (
  email: string,
  password: string
): Promise<LoginResponse | SuccessResponse> => {
  try {
    const response = await api.post<LoginResponse>("/users/login", { email, password });
    return response.data;
  } catch (error: unknown) {
    // Si es un error de axios con response, devolvemos el shape del backend
    if (error instanceof AxiosError && error.response) {
      return error.response.data as SuccessResponse;
    }
    // Fallback genérico (network error, timeout, etc.)
    return { success: false, message: "Error al conectar con el servidor" };
  }
};