// src/hooks/useDocumentTitle.ts
import { useEffect } from "react";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const APP_NAME = "CONSORCIA";
const DEFAULT_TITLE = `${APP_NAME} — Gestión Inteligente`;

/* ============================================================
 * HOOK
 * ============================================================ */

/**
 * Actualiza el título de la pestaña del navegador (`document.title`)
 * durante el ciclo de vida del componente.
 *
 * Al montar: setea `${title} — CONSORCIA` como título.
 * Al desmontar: restaura el título anterior.
 *
 * @param title - Texto descriptivo de la página (sin sufijo).
 *
 * @example
 *   // Dentro de un componente de página:
 *   useDocumentTitle("Usuarios");
 *   // → La pestaña muestra: "Usuarios — CONSORCIA"
 *
 * @example
 *   // Título vacío o undefined → usa el título default de la app
 *   useDocumentTitle();
 *   // → La pestaña muestra: "CONSORCIA — Gestión Inteligente"
 */
export const useDocumentTitle = (title?: string): void => {
  useEffect(() => {
    const previous = document.title;

    document.title = title ? `${title} — ${APP_NAME}` : DEFAULT_TITLE;

    return () => {
      document.title = previous;
    };
  }, [title]);
};