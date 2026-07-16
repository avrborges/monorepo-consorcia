// src/components/SplashScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Importamos tu isotipo real apuntando a la ruta correspondiente
import consorciaLogo from "../assets/img/consorcia.png";

/* ============================================================
 * PROPS
 * ============================================================ */

interface SplashScreenProps {
  /**
   * Si es true, redirige a /login después de `duracionMs`.
   * Default: true (preserva el comportamiento original como bienvenida mobile).
   *
   * IMPORTANTE: pasar `false` cuando se usa como fallback de Suspense,
   * para que no interrumpa la carga de chunks lentos.
   */
  redirigirALogin?: boolean;
  /**
   * Mensaje contextual opcional bajo el eslogan.
   * Ejemplos: "Cargando dashboard...", "Preparando datos...", "Verificando sesión..."
   */
  mensaje?: string;
  /**
   * Duración total del splash en milisegundos antes de disparar el redirect.
   * Default: 1600ms.
   */
  duracionMs?: number;
}

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function SplashScreen({
  redirigirALogin = true,
  mensaje,
  duracionMs = 1600,
}: SplashScreenProps = {}) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Si el redirect está desactivado, no seteamos timer (uso como fallback de Suspense)
    if (!redirigirALogin) return;

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      navigate("/login");
    }, duracionMs);

    return () => window.clearTimeout(timer);
  }, [navigate, redirigirALogin, duracionMs]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-[#0b132b] z-9999 flex items-center justify-center animate-screen-fade"
      role="status"
      aria-live="polite"
      aria-label={mensaje || "Bienvenido a Consorcia"}
    >
      {/* Contenedor central con animaciones fluidas */}
      <div className="flex flex-col items-center text-center select-none animate-brand-entrance">
        {/* IMAGEN DE TU LOGO REAL (con escala y un brillo sutil al entrar) */}
        <div className="mb-5 relative">
          <img
            src={consorciaLogo}
            alt="Isotipo de Consorcia"
            className="w-16 h-auto drop-shadow-[0_4px_12px_rgba(252,163,17,0.15)] object-contain"
          />
        </div>

        {/* NOMBRE DE LA MARCA (Refinado en escala) */}
        <h1 className="text-2xl font-extrabold tracking-[0.25em] text-white uppercase pl-[0.25em]">
          Consor
          <span className="text-[#fca311]">cia</span>
        </h1>

        {/* ESLOGAN */}
        <p
          className="text-[9px] text-slate-400/40 font-semibold uppercase tracking-[0.45em] mt-3"
          aria-hidden="true"
        >
          Gestión Inteligente
        </p>

        {/* 🎯 Mensaje contextual opcional */}
        {mensaje && (
          <p className="text-[10px] text-slate-400/60 font-medium mt-6 animate-in fade-in duration-500 delay-500">
            {mensaje}
          </p>
        )}
      </div>

      {/* Estilos e interpolaciones CSS de alto rendimiento */}
      <style>{`
        @keyframes brandEntrance {
          0% {
            opacity: 0;
            filter: blur(8px) brightness(1.5);
            transform: scale(0.93);
          }
          35% {
            opacity: 1;
            filter: blur(0px) brightness(1);
            transform: scale(1);
          }
          100% {
            opacity: 1;
            transform: scale(1.02);
          }
        }

        @keyframes screenFade {
          0% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }

        .animate-brand-entrance {
          animation: brandEntrance 1.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-screen-fade {
          animation: screenFade 1.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 🎯 Respeta la preferencia del usuario por movimiento reducido
           (útil para personas con vestibular disorders o migrañas) */
        @media (prefers-reduced-motion: reduce) {
          .animate-brand-entrance,
          .animate-screen-fade {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}