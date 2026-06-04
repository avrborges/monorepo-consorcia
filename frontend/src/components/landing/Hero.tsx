import { 
  FiCreditCard, FiFileText, FiBell, 
  FiBarChart2, FiHome, FiCpu, 
  FiTool, FiCheckSquare, FiArrowRight 
} from "react-icons/fi";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import logo from "../../assets/img/consorcia.png";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-12 px-4 overflow-hidden bg-grid-pattern">
      
      {/* Luces de fondo (Glow effects) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Isotipo central */}
      <div className="mb-10 animate-fade-in relative">
        {/* Capa de brillo extra detrás (opcional pero premium) */}
        <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full scale-150" />
        
        <img 
          src={logo} 
          alt="Icono Consorcia" 
          className="relative h-28 w-auto drop-shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-transform hover:scale-105 duration-700" 
        />
      </div>

      {/* Textos Principales */}
        <h1 className="text-4xl sm:text-4xl md:text-6xl font-extrabold text-center max-w-3xl leading-tight tracking-tight text-white">
        Tu edificio, <span className="text-orange-300 font-bold">sin papeles</span> <br />
        ni sorpresas.
        </h1>
      
      <p className="mt-8 text-slate-300/80 text-center max-w-xl text-lg font-light leading-relaxed">
        La plataforma que conecta propietarios, inquilinos y administradores en un solo lugar.
      </p>

      {/* Botones de Acción (CTAs) */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto px-4 mt-8">
        <button className="w-full bg-[#1e6f65] text-white py-3 px-6 rounded-xl font-medium ...">
          Comenzar gratis →
        </button>
        <button className="w-full bg-transparent border border-white/10 text-white py-3 px-6 rounded-xl font-medium ...">
          Ya tengo cuenta
        </button>
      </div>

      {/* Tags de Características (Pills) */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-xl mx-auto px-4 mt-12">        <Tag icon={<FiCreditCard />} text="Expensas digitales" />
        <Tag icon={<FiFileText />} text="Actas y documentos" />
        <Tag icon={<FiBell />} text="Avisos al instante" />
        <Tag icon={<FiBarChart2 />} text="Reportes claros" />
        <Tag icon={<FiHome />} text="Por unidad" />
        <Tag icon={<FiCpu />} text="100% online" />
        <Tag icon={<FiTool />} text="Gestión de reclamos" />
        <div className="w-full flex justify-center mt-1">
          <Tag icon={<FiCheckSquare />} text="Encuestas y votaciones" />
        </div>
      </div>

      {/* Sección Disponible en (App Stores) */}
      <div className="mt-16 text-center">
        <span className="text-xs uppercase tracking-widest text-gray-500 font-bold block mb-4">
          Disponible en
        </span>
        <div className="flex gap-4 justify-center">
          {/* App Store */}
          <a href="#" className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 hover:border-slate-700 px-5 py-2 rounded-xl transition text-left group">
            <FaApple className="text-2xl text-white group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase leading-none">Descargar en</p>
              <p className="text-sm font-semibold text-white leading-tight">App Store</p>
            </div>
          </a>
          {/* Google Play */}
          <a href="#" className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 hover:border-slate-700 px-5 py-2 rounded-xl transition text-left group">
            <FaGooglePlay className="text-xl text-white group-hover:scale-110 transition-transform" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase leading-none">Disponible en</p>
              <p className="text-sm font-semibold text-white leading-tight">Google Play</p>
            </div>
          </a>
        </div>
      </div>

      {/* Footer minúsculo */}
      <footer className="mt-20 text-[11px] text-slate-500 tracking-wider">
        by ARTHEMYSA • v1.0.0
      </footer>
    </section>
  );
};

// Subcomponente interno auxiliar para los Tags estilizados
const Tag = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-3 bg-slate-900/40 border border-white/15 px-5 py-2.5 rounded-full text-[13px] text-slate-300 hover:text-white hover:border-white/20 hover:bg-slate-800/60 transition-all duration-300 backdrop-blur-md cursor-default shadow-sm">
    <span className="text-blue-400/80">{icon}</span>
    <span className="font-medium tracking-wide">{text}</span>
  </div>
);