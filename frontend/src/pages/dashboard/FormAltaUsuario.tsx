// src/components/dashboard/FormAltaUsuario.tsx
import React, { useState } from "react";
import { 
  HiOutlineUser, 
  HiOutlineMail, 
  HiOutlineBriefcase, 
  HiOutlineShieldExclamation, 
  HiX, 
  HiChevronDown 
} from "react-icons/hi";
import api from "../../api";

interface FormAltaUsuarioProps {
  modalAbierto: boolean;
  onCerrar: () => void;
  onUsuarioCreado: () => void;
}

const ESTADO_INICIAL = {
  name: "",
  email: "",
  role: "propietario",
  ufNumero: "",
  piso: "",
  depto: "",
  codigoPais: "+54",
  numeroTelefono: ""
};

export default function FormAltaUsuario({ modalAbierto, onCerrar, onUsuarioCreado }: FormAltaUsuarioProps) {
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!modalAbierto) return null;

  const limpiarErrorCampo = (campo: string) => {
    setErrors(prev => {
      const nuevosErrores = { ...prev };
      delete nuevosErrores[campo];
      return nuevosErrores;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      limpiarErrorCampo(name);
    }
  };

  const reiniciarFormulario = () => {
    setFormData(ESTADO_INICIAL);
    setGeneralError(null);
    setErrors({});
  };

  const validarFormulario = (): boolean => {
    const nuevosErrores: { [key: string]: string } = {};
    const { name, email, ufNumero, numeroTelefono } = formData;

    if (!name.trim()) {
      nuevosErrores.name = "El nombre completo es obligatorio.";
    } else if (name.trim().length < 3) {
      nuevosErrores.name = "Debe tener al menos 3 caracteres.";
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name.trim())) {
      nuevosErrores.name = "Solo se permiten letras y espacios.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      nuevosErrores.email = "Ingresa un correo electrónico válido.";
    }

    if (ufNumero.trim() && !/^\d+$/.test(ufNumero.trim())) {
      nuevosErrores.ufNumero = "La UF debe ser un número entero.";
    }

    if (numeroTelefono.trim() && !/^\d+$/.test(numeroTelefono.replace(/\s+/g, ""))) {
      nuevosErrores.numeroTelefono = "El teléfono solo puede contener números.";
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validarFormulario()) return;

    setGuardando(true);
    const { name, email, role, ufNumero, piso, depto, codigoPais, numeroTelefono } = formData;

    const partesUF = [
      ufNumero.trim() ? `UF ${ufNumero.trim()}` : "",
      piso.trim() ? `Piso ${piso.trim()}` : "",
      depto.trim() ? `Dpto ${depto.trim()}` : ""
    ].filter(Boolean);
    const unidadFuncionalCompuesta = partesUF.join(" - ").replace("Piso  - Dpto", "Piso ");

    const telefonoUnificado = numeroTelefono.trim()
      ? `${codigoPais.trim().startsWith("+") ? codigoPais.trim() : `+${codigoPais.trim()}`} ${numeroTelefono.trim().replace(/\s+/g, "")}`
      : undefined;

    try {
      await api.post('/users', {
        name: name.trim(),
        email: email.trim(),
        role,
        unidadFuncional: unidadFuncionalCompuesta || undefined,
        telefono: telefonoUnificado,
      });

      reiniciarFormulario();
      onUsuarioCreado(); 
      onCerrar();        
    } catch (err: unknown) {
      console.error(err);
      const errorData = err as { response?: { data?: { message?: string } } };
      setGeneralError(errorData.response?.data?.message || "Error al registrar el usuario en el sistema.");
    } finally {
      setGuardando(false);
    }
  };

  const manejarCierreCompleto = () => {
    if (!guardando) {
      reiniciarFormulario();
      onCerrar();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={manejarCierreCompleto}
    >
      <div 
        className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300 pointer-events-auto"
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="space-y-1 pr-4">
            <div className="flex items-center gap-2.5 text-slate-900">
              <div className="p-1.5 bg-slate-100 rounded-lg text-slate-700">
                <HiOutlineUser className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold tracking-tight">Alta Nuevo Usuario</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed pl-8">
              Formulario para dar de alta a usuarios, se enviará una invitación por correo.
            </p>
          </div>
          <button 
            type="button"
            onClick={manejarCierreCompleto}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer shrink-0"
          >
            <HiX className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del Formulario - Se agrega autoComplete="off" global */}
        <form 
          id="form-alta-usuario" 
          onSubmit={manejarSubmit} 
          autoComplete="off" 
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {generalError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs font-bold text-red-600 animate-in fade-in duration-150">
              <HiOutlineShieldExclamation className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Campo: Nombre Completo */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre Completo *</label>
            <div className="relative">
              <span className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors ${errors.name ? 'text-red-400' : 'text-slate-400'}`}>
                <HiOutlineUser className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                name="name" 
                id="alta-user-name"
                required 
                autoComplete="disabled"
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Ej: Juan Pérez" 
                className={`w-full pl-10 pr-3 py-2 bg-white border rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition shadow-sm ${
                  errors.name 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900'
                }`} 
              />
            </div>
            {errors.name && <p className="text-[11px] text-red-600 font-bold pl-1">{errors.name}</p>}
          </div>

          {/* Campo: Email */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico *</label>
            <div className="relative">
              <span className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors ${errors.email ? 'text-red-400' : 'text-slate-400'}`}>
                <HiOutlineMail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                name="email" 
                id="alta-user-email"
                required 
                autoComplete="new-email"
                value={formData.email} 
                onChange={handleChange} 
                placeholder="ejemplo@consorcia.com" 
                className={`w-full pl-10 pr-3 py-2 bg-white border rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition shadow-sm ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900'
                }`} 
              />
            </div>
            {errors.email && <p className="text-[11px] text-red-600 font-bold pl-1">{errors.email}</p>}
          </div>

          {/* Campo: Rol */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rol en el Consorcio</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <HiOutlineBriefcase className="w-4 h-4" />
              </span>
              <select name="role" value={formData.role} onChange={handleChange} className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition appearance-none cursor-pointer shadow-sm">
                <option value="propietario">Propietario</option>
                <option value="consejo">Consejo de Administración</option>
                <option value="admin">Administrador</option>
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <HiChevronDown className="w-4 h-4" />
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-1" />

          {/* Grilla de Ubicación */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">N° UF</label>
              <input 
                type="text" 
                name="ufNumero" 
                id="alta-user-uf"
                autoComplete="dont-track"
                value={formData.ufNumero} 
                onChange={handleChange} 
                placeholder="Ej: 14" 
                className={`w-full px-3 py-2 bg-white border rounded-xl text-sm text-center text-slate-800 ${
                  errors.ufNumero ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-slate-900'
                }`} 
              />
            </div>
            <div className="space-y-1 col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Piso</label>
              <input type="text" name="piso" id="alta-user-piso" autoComplete="off" value={formData.piso} onChange={handleChange} placeholder="Ej: 4" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-center text-slate-800 focus:border-slate-900 focus:outline-none" />
            </div>
            <div className="space-y-1 col-span-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Dpto</label>
              <input type="text" name="depto" id="alta-user-depto" autoComplete="off" value={formData.depto} onChange={handleChange} placeholder="Ej: B" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-center text-slate-800 focus:border-slate-900 focus:outline-none" />
            </div>
            {errors.ufNumero && <p className="text-[11px] text-red-600 font-bold col-span-3 pl-1">{errors.ufNumero}</p>}
          </div>

          {/* Campo: Teléfono de Contacto */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teléfono de Contacto</label>
            <div className="grid grid-cols-[100px_1fr] gap-2.5">
              <input type="text" name="codigoPais" id="alta-user-codpais" autoComplete="off" value={formData.codigoPais} onChange={handleChange} placeholder="+54" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-center font-bold text-slate-800 focus:border-slate-900 focus:outline-none" />
              <input 
                type="tel" 
                name="numeroTelefono" 
                id="alta-user-tel"
                autoComplete="new-phone"
                value={formData.numeroTelefono} 
                onChange={handleChange} 
                placeholder="Ej: 11 5234 5678" 
                className={`w-full px-3 py-2 bg-white border rounded-xl text-sm text-slate-800 ${
                  errors.numeroTelefono ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-slate-900'
                }`} 
              />
            </div>
            {errors.numeroTelefono && <p className="text-[11px] text-red-600 font-bold pl-1">{errors.numeroTelefono}</p>}
          </div>
        </form>

        {/* Acciones */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/30">
          <button 
            type="button" 
            disabled={guardando} 
            onClick={manejarCierreCompleto} 
            className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="form-alta-usuario" 
            disabled={guardando} 
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {guardando ? "Registrando..." : "Registrar Cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}