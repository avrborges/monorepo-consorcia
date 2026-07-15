// src/api.ts
import axios, { AxiosError } from "axios";

import { limpiarSesion } from "./lib/session";

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

/**
 * Cliente HTTP compartido por toda la aplicación.
 *
 * ⚠️ NO usar directamente desde componentes.
 * Toda la lógica de dominio debe pasar por la capa `src/services/*`.
 *
 * Este archivo es puramente infraestructura de transporte:
 *  - Base URL
 *  - Headers por defecto
 *  - Interceptor de request (JWT auto-inject)
 *  - Interceptor de response (manejo global de 401)
 */
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
 * Limpia la sesión y redirige al login.
 *
 * Excluye las rutas /login y /activar-cuenta para evitar loops
 * (esos endpoints legítimamente pueden devolver 401 con credenciales inválidas).
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const rutaActual = window.location.pathname;

      if (!rutaActual.startsWith("/login") && !rutaActual.startsWith("/activar-cuenta")) {
        limpiarSesion();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;