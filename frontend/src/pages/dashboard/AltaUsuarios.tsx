// src/pages/dashboard/AltaUsuarios.tsx
import { useState } from "react";
import { HiOutlineUserAdd, HiOutlineMail, HiOutlineLockClosed, HiOutlineUserGroup, HiOutlineShieldExclamation } from "react-icons/hi";

export default function AltaUsuarios() {
  // 1. Recuperamos el usuario logueado para validar permisos en la vista
  const userString = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : { role: "inquilino" };

  // Estados para el formulario
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "propietario", // Valor por defecto válido
  });
  
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  // 2. Hard-Guard de interfaz: Si no es admin o superadmin, mostramos pantalla de acceso denegado
  const tieneAcceso = currentUser.role === "admin" || currentUser.role === "superadmin";

  if (!tieneAcceso) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
          {/* 💡 CORREGIDO: Usamos el ícono importado arriba */}
          <HiOutlineShieldExclamation className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Acceso Restringido</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Esta sección está reservada exclusivamente para el Administrador o Super Administrador de Consorcia.
        </p>
      </div>
    );
  }

  // Manejo de cambios en los inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });

    // Aquí irá la conexión a tu endpoint posterior
    console.log("Datos enviados al alta:", formData);
    
    // Simulación de guardado por ahora
    setTimeout(() => {
      setStatus({
        type: "success",
        message: `¡Usuario ${formData.name} registrado con éxito como ${formData.role.toUpperCase()}! 🎉`,
      });
      setFormData({ name: "", email: "", password: "", role: "propietario" });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Encabezado */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          Alta de Co-propietarios y Consejo
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Registrá nuevos miembros dentro del consorcio activo. Los inquilinos se gestionan desde el perfil de propietario.
        </p>
      </div>

      {/* Alertas de Estado */}
      {status.message && (
        <div className={`p-4 rounded-xl text-sm font-bold border ${
          status.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800" 
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {status.message}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
        
        {/* Campo: Nombre Completo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <HiOutlineUserAdd className="w-5 h-5" />
            </span>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej. Juan Pérez"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Campo: Correo Electrónico */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <HiOutlineMail className="w-5 h-5" />
            </span>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="juan.perez@email.com"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Campo: Contraseña Temporal */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña Temporal</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              {/* 💡 CORREGIDO: Cambiamos HiOutlineLock por el candado cerrado */}
              <HiOutlineLockClosed className="w-5 h-5" />
            </span>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Campo: Selector de Rol */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rol Asignado</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <HiOutlineUserGroup className="w-5 h-5" />
            </span>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition appearance-none cursor-pointer"
            >
              <option value="propietario">Propietario / Copropietario</option>
              <option value="consejo">Consejo de Administración</option>
            </select>
          </div>
        </div>

        {/* Botón Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-sm tracking-wide shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Procesando alta..." : "Confirmar y Dar de Alta"}
        </button>

      </form>
    </div>
  );
}