// src/App.tsx
import { Navbar } from "./components/landing/Navbar";
import { Hero } from "./components/landing/Hero";

function App() {
  return (
    /* Contenedor Base con fondo oscuro y cuadrícula */
    <div className="relative min-h-screen bg-[#0b132b] bg-consorcia-grid overflow-hidden">
      
      {/* CAPA DE EFECTOS GLOW (Luces ambientales animadas) */}
      
      {/* Resplandor Superior Izquierdo */}
      <div className="absolute -top-20 -left-20 w-[280px] h-[280px] sm:w-[600px] sm:h-[600px] bg-glow-radial pointer-events-none mix-blend-screen opacity-60" />

      {/* Resplandor Central (Detrás del Isotipo) - AQUÍ LLAMAMOS A LA ANIMACIÓN LENTA */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[320px] h-[320px] sm:w-[800px] sm:h-[500px] bg-glow-purple animate-glow-slow pointer-events-none mix-blend-screen will-change-transform" />
      
      {/* Resplandor Lateral Derecho Inferior */}
      <div className="absolute bottom-[5%] -right-[10%] w-[50%] h-[50%] bg-glow-radial pointer-events-none mix-blend-screen" />

      {/* CONTENIDO (Sobre las luces gracias a z-10) */}
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
        </main>
      </div>
    </div>
  );
}

export default App;