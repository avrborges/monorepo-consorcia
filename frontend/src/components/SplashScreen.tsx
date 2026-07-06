// src/components/SplashScreen.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// Importamos tu isotipo real apuntando a la ruta correspondiente
import consorciaLogo from "../assets/img/consorcia.png";

export default function SplashScreen() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1.6 segundos para una transición ágil hacia el Login
    const timer = setTimeout(() => {
      setIsVisible(false);
      navigate("/login");
    }, 1600);

    return () => clearTimeout(timer);
  }, [navigate]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-[#0b132b] z-9999 flex items-center justify-center animate-screen-fade">
      
      {/* Contenedor central con animaciones fluidas */}
      <div className="flex flex-col items-center text-center select-none animate-brand-entrance">
        
        {/* IMAGEN DE TU LOGO REAL (con escala y un brillo sutil al entrar) */}
        <div className="mb-5 relative">
          <img 
            src={consorciaLogo} 
            alt="Consorcia Logo" 
            className="w-16 h-auto drop-shadow-[0_4px_12px_rgba(252,163,17,0.15)] object-contain"
          />
        </div>

        {/* NOMBRE DE LA MARCA (Refinado en escala) */}
        <h1 className="text-2xl font-extrabold tracking-[0.25em] text-white uppercase pl-[0.25em]">
          Consor
          <span className="text-[#fca311]">cia</span>
        </h1>
        
        {/* ESLOGAN */}
        <p className="text-[9px] text-slate-400/40 font-semibold uppercase tracking-[0.45em] mt-3">
          Gestión Inteligente
        </p>
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
      `}</style>
    </div>
  );
}