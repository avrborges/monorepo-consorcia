// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.tsx";

/* ============================================================
 * MANEJO GLOBAL DE ERRORES NO CAPTURADOS
 * ============================================================
 *
 * Loguea al console cualquier error/promise no capturada durante
 * el ciclo de vida de la app. Útil para debugging en desarrollo
 * y para futura integración con servicios como Sentry.
 */

if (import.meta.env.DEV) {
  window.addEventListener("error", (event) => {
    console.error("[GlobalError]", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[UnhandledPromise]", event.reason);
  });
}

/* ============================================================
 * MONTAJE DE LA APP
 * ============================================================ */

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "No se encontró el elemento raíz #root en index.html. Verificá que existe <div id='root'></div>."
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);