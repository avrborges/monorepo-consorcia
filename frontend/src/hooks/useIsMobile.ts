// src/hooks/useIsMobile.ts
import { useEffect, useState } from "react";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

const DEFAULT_BREAKPOINT = 768;

/* ============================================================
 * HOOK
 * ============================================================ */

/**
 * Hook reactivo para detectar si el viewport actual es mobile.
 *
 * Usa `matchMedia` internamente para escuchar cambios en tiempo real
 * (resize, rotación de pantalla, etc.) sin recalcular en cada render.
 *
 * @param breakpoint - Ancho en px por debajo del cual se considera mobile (default: 768)
 * @returns `true` si el viewport es mobile, `false` en caso contrario.
 *
 * @example
 *   const isMobile = useIsMobile();
 *   if (isMobile) return <BottomSheet />;
 *
 *   // Con breakpoint custom:
 *   const esSmall = useIsMobile(640);
 */
export function useIsMobile(breakpoint = DEFAULT_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [breakpoint]);

  return isMobile;
}