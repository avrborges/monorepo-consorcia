// src/api.ts
import axios, { AxiosError } from "axios";

import { limpiarSesion } from "@/lib/session";

/* ============================================================
 * CONFIGURACIÓN DE BASE URL
 * ============================================================ */

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
 * Limpia la sesión y redirige al login, guardando la ruta actual
 * en sessionStorage para volver ahí tras el re-login exitoso.
 */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const rutaActual = window.location.pathname + window.location.search;

      if (!rutaActual.startsWith("/login") && !rutaActual.startsWith("/activar-cuenta")) {
        // 🎯 Guardamos la ruta destino para volver después del login
        sessionStorage.setItem("redirect_after_login", rutaActual);

        limpiarSesion();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;