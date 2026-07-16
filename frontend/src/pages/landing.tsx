// src/pages/landing.tsx
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

function Landing() {
  // 🎯 Título dinámico de la pestaña
  useDocumentTitle("Bienvenido");

  return (
    <div className="relative min-h-screen bg-[#0b132b] bg-consorcia-grid overflow-hidden">
      {/* 🎨 Glows decorativos — invisibles para screen readers */}
      <div
        aria-hidden="true"
        className="absolute -top-20 -left-20 w-70 h-70 sm:w-150 sm:h-150 bg-glow-radial pointer-events-none mix-blend-screen opacity-60"
      />
      <div
        aria-hidden="true"
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[320px] h-80 sm:w-200 sm:h-125 bg-glow-purple animate-glow-slow pointer-events-none mix-blend-screen will-change-transform"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[5%] right-[-10%] w-[50%] h-[50%] bg-glow-radial pointer-events-none mix-blend-screen"
      />

      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
        </main>
      </div>

      {/* 🎯 Respeta la preferencia del usuario por movimiento reducido
          (útil para personas con vestibular disorders o migrañas) */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-glow-slow {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Landing;