import { FiArrowUpRight } from "react-icons/fi";
import logo from "../../assets/img/consorcia.png";

export const Navbar = () => {
  return (
    <nav className="w-full absolute top-0 left-0 z-50 bg-transparent">
      {/* Añadimos 'relative' al contenedor para que el posicionamiento absoluto del logo funcione en mobile */}
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center relative">
        
        {/* Logo: Centrado absoluto en mobile, estático a la izquierda en desktop */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
          <img src={logo} alt="Consorcia" className="h-8 w-auto" />
          <span className="text-xl font-bold tracking-wider text-white">
            CONSOR<span className="text-orange-400">CIA</span>
          </span>
        </div>

        {/* Acciones: 'hidden' por defecto (mobile) y 'flex' a partir de pantallas medianas (md) */}
        <div className="hidden md:flex items-center gap-4 ml-auto">
          <button className="text-gray-300 hover:text-white px-4 py-2 text-sm font-medium border border-gray-700/50 rounded-lg bg-slate-900/40 backdrop-blur-sm transition">
            Iniciar sesión
          </button>
          <button className="bg-teal-700 hover:bg-teal-600 text-white px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-1 transition">
            Registrarse <FiArrowUpRight />
          </button>
        </div>
      </div>
    </nav>
  );
};