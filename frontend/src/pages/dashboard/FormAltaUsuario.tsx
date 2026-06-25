// src/components/dashboard/FormAltaUsuario.tsx
import React, { useState } from "react";
import { HiOutlineShieldExclamation as ShieldIcon, HiX as CloseIcon, HiOutlineUserAdd as AddIcon, HiChevronDown as DownIcon } from "react-icons/hi";

interface FormAltaUsuarioProps {
  modalAbierto: boolean;
  onCerrar: () => void;
  onUsuarioCreado: () => void;
}

export default function FormAltaUsuario({ modalAbierto, onCerrar, onUsuarioCreado }: FormAltaUsuarioProps) {
  // Estados del Formulario de Alta
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("inquilino");
  const [unidadFuncional, setUnidadFuncional] = useState("");
  const [telefono, setTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!modalAbierto) return null;

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);

    if (!name.trim() || !email.trim()) {
      setError("El nombre y el correo electrónico son obligatorios.");
      setGuardando(false);
      return;
    }

    try {
      const hostname = window.location.hostname;
      const baseUrl = `http://${hostname}:5000`;

      const respuesta = await fetch(`${baseUrl}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role,
          unidadFuncional: unidadFuncional || undefined,
          telefono: telefono || undefined,
        }),
      });

      const resultado = await respuesta.json();

      if (resultado.success) {
        // Limpiar campos antes de salir
        setName("");
        setEmail("");
        setRole("inquilino");
        setUnidadFuncional("");
        setTelefono("");
        onUsuarioCreado(); // Refresca la lista de usuarios en el padre
        onCerrar();        // Cierra el modal
      } else {
        setError(resultado.message || "Error al registrar el usuario.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red. No se pudo conectar con el servidor backend.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header del Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-900">
            <AddIcon className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-black tracking-tight">Dar de Alta Nuevo Usuario</h3>
          </div>
          <button 
            onClick={() => { onCerrar(); setError(null); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={manejarSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs font-bold text-red-600">
              <ShieldIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre Completo */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nombre Completo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Juan Pérez"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Correo Electrónico *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@consorcia.com"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
            />
          </div>

          {/* Rol Asignado */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rol en el Consorcio</label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition appearance-none cursor-pointer"
              >
                <option value="inquilino">Inquilino</option>
                <option value="propietario">Propietario</option>
                <option value="consejo">Consejo de Administración</option>
                <option value="admin">Administrador</option>
                <option value="superadmin">Superadmin</option>
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
                <DownIcon className="w-4 h-4" />
              </span>
            </div>
          </div>

          {/* Campos responsivos: Unidad Funcional y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Unidad Funcional</label>
              <input
                type="text"
                value={unidadFuncional}
                onChange={(e) => setUnidadFuncional(e.target.value)}
                placeholder="Ej: Piso 4 Dpto B"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teléfono de Contacto</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: +54 11 ...."
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
              />
            </div>
          </div>

          {/* Footer Acciones */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 select-none">
            <button
              type="button"
              disabled={guardando}
              onClick={() => { onCerrar(); setError(null); }}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm shadow-slate-900/10 hover:shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Registrar Cuenta</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}