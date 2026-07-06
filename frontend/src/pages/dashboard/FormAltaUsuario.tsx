// src/components/dashboard/FormAltaUsuario.tsx
import { useState, startTransition, useEffect } from "react";
import { createPortal } from "react-dom"; // 🎯 IMPORTACIÓN CLAVE
import { HiOutlineUser, HiOutlineMail, HiOutlinePhone, HiOutlineOfficeBuilding } from "react-icons/hi";
import type { Usuario, Rol } from "./ListaUsuarios";

interface FormAltaUsuarioProps {
  modalAbierto: boolean;
  onCerrar: () => void;
  onUsuarioCreado: () => void; 
  usuarioEditando?: Usuario | null; 
}

const getBaseUrl = (): string => {
  return (import.meta.env?.VITE_API_URL as string) || `http://${window.location.hostname}:5000`;
};

export default function FormAltaUsuario({
  modalAbierto,
  onCerrar,
  onUsuarioCreado,
  usuarioEditando,
}: FormAltaUsuarioProps) {
  
  const [name, setName] = useState(() => usuarioEditando?.name || "");
  const [email, setEmail] = useState(() => usuarioEditando?.email || "");
  const [role, setRole] = useState<Rol>(() => usuarioEditando?.role || "propietario");

  const [uf, setUf] = useState(() => {
    const raw = usuarioEditando?.unidadFuncional || "";
    let ufPura = raw.replace(/Piso\s+[^\s]+/i, "").replace(/Dto\s+[^\s]+/i, "").trim();
    if (ufPura.toLowerCase().startsWith("uf")) ufPura = ufPura.replace(/^uf\s*/i, "").trim();
    return ufPura;
  });

  const [piso, setPiso] = useState(() => {
    const raw = usuarioEditando?.unidadFuncional || "";
    const match = raw.match(/Piso\s+([^\s]+)/i);
    return match ? match[1] : "";
  });

  const [dto, setDto] = useState(() => {
    const raw = usuarioEditando?.unidadFuncional || "";
    const match = raw.match(/Dto\s+([^\s]+)/i);
    return match ? match[1] : "";
  });

  const [codigoPais, setCodigoPais] = useState(() => {
    const rawTel = usuarioEditando?.telefono || "";
    const match = rawTel.match(/^(\+[0-9]{1,3})/);
    return match ? match[1] : (rawTel ? "" : "+54");
  });

  const [telefonoLocal, setTelefonoLocal] = useState(() => {
    const rawTel = usuarioEditando?.telefono || "";
    const match = rawTel.match(/^(\+[0-9]{1,3})/);
    return match ? rawTel.substring(match[1].length).trim() : rawTel;
  });

  const [loading, setLoading] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const esEdicion = Boolean(usuarioEditando);

  useEffect(() => {
    if (modalAbierto) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [modalAbierto]);

  if (!modalAbierto) return null;

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; 
    
    setErrorForm(null);

    const nombreLimpio = name.trim();
    const emailLimpio = email.trim().toLowerCase();
    const ufLimpia = uf.trim();
    const pisoLimpio = piso.trim();
    const dtoLimpio = dto.trim();
    const codPaisLimpio = codigoPais.trim();
    const telLocalLimpio = telefonoLocal.trim();

    if (nombreLimpio.length < 3) {
      setErrorForm("El nombre completo debe tener al menos 3 caracteres.");
      return;
    }

    if (telLocalLimpio) {
      const regexCodPais = /^\+?[0-9]{1,4}$/;
      if (!regexCodPais.test(codPaisLimpio)) {
        setErrorForm("El código de país no es válido. Ej: +54");
        return;
      }

      const regexTelLocal = /^[0-9\s\-()]+$/;
      if (!regexTelLocal.test(telLocalLimpio)) {
        setErrorForm("El número de teléfono local solo puede contener números, espacios o guiones.");
        return;
      }

      if (telLocalLimpio.length < 6) {
        setErrorForm("El número de teléfono parece demasiado corto.");
        return;
      }
    }

    setLoading(true);

    const partesUf: string[] = [];
    if (ufLimpia) partesUf.push(`UF ${ufLimpia}`);
    if (pisoLimpio) partesUf.push(`Piso ${pisoLimpio}`);
    if (dtoLimpio) partesUf.push(`Dto ${dtoLimpio}`);
    const ufCompuesta = partesUf.join(" ");

    let telUnificado = "";
    if (telLocalLimpio) {
      const prefix = codPaisLimpio 
        ? (codPaisLimpio.startsWith("+") ? codPaisLimpio : `+${codPaisLimpio}`)
        : "";
      telUnificado = prefix ? `${prefix} ${telLocalLimpio}` : telLocalLimpio;
    }

    const payload = {
      name: nombreLimpio,
      email: emailLimpio,
      role,
      unidadFuncional: ufCompuesta,
      telefono: telUnificado,
    };

    try {
      const token = localStorage.getItem("token");
      const url = esEdicion 
        ? `${getBaseUrl()}/api/users/${usuarioEditando?._id}` 
        : `${getBaseUrl()}/api/users`;
        
      const respuesta = await fetch(url, {
        method: esEdicion ? "PUT" : "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const resultado = await respuesta.json();

      if (resultado.success) {
        onUsuarioCreado();
        onCerrar();
      } else {
        setErrorForm(resultado.message || "Ocurrió un error en la solicitud.");
      }
    } catch (err) {
      console.error("Error en submit de usuario:", err);
      setErrorForm("Error de conexión con el servidor backend.");
    } finally {
      setLoading(false);
    }
  };

  // 🎯 PORTAL DE REACT: Renderiza el HTML directamente bajo el <body> para independizarlo de layouts padres limitados
  return createPortal(
    <div className="fixed inset-0 z-[999] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0 -z-10" onClick={onCerrar} />

      {/* Al estar montado sobre el body, h-screen tomará de forma estricta la altura total del navegador sin cortarse */}
      <div className="bg-white w-full max-w-md h-screen flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 ease-out border-l border-slate-100 shadow-2xl">
        
        {/* Encabezado */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {esEdicion ? "Editar Datos del Usuario" : "Registrar Nuevo Usuario"}
            </h3>
            <button 
              type="button" 
              onClick={onCerrar} 
              className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {esEdicion 
              ? "Modificá la información asignada de este miembro del consorcio." 
              : "Se le enviará un correo electrónico para que configure su contraseña de acceso."}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={manejarSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Zona de inputs con scroll independiente */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {errorForm && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl animate-in fade-in zoom-in-95 duration-200">
                {errorForm}
              </div>
            )}

            {/* Input Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre Completo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><HiOutlineUser className="w-4 h-4" /></span>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition" />
              </div>
            </div>

            {/* Input Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><HiOutlineMail className="w-4 h-4" /></span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@correo.com" className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition" />
              </div>
            </div>

            {/* Selector de Rol */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rol Asignado</label>
              <select value={role} onChange={(e) => startTransition(() => setRole(e.target.value as Rol))} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 transition appearance-none cursor-pointer">
                <option value="propietario">Propietario</option>
                <option value="consejo">Consejo de Administración</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Grilla Datos de la Unidad Funcional */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">U. Funcional</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400"><HiOutlineOfficeBuilding className="w-3.5 h-3.5" /></span>
                  <input type="text" value={uf} onChange={(e) => setUf(e.target.value)} placeholder="Ej. 12" className="w-full pl-8 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition" />
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Piso</label>
                <input type="text" value={piso} onChange={(e) => setPiso(e.target.value)} placeholder="Ej. 3" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition" />
              </div>

              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Depto</label>
                <input type="text" value={dto} onChange={(e) => setDto(e.target.value)} placeholder="Ej. B" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition" />
              </div>
            </div>

            {/* Grilla para Teléfono */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cód. País</label>
                <input 
                  type="text" 
                  value={codigoPais} 
                  onChange={(e) => setCodigoPais(e.target.value)} 
                  placeholder="+54" 
                  className="w-full px-2.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 text-center focus:outline-none focus:border-slate-900 transition" 
                />
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Teléfono (Opcional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <HiOutlinePhone className="w-4 h-4" />
                  </span>
                  <input 
                    type="tel" 
                    value={telefonoLocal} 
                    onChange={(e) => setTelefonoLocal(e.target.value)} 
                    placeholder="Ej. 11 2345 6789" 
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Acciones (Permanecen visibles abajo en todo momento) */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onCerrar} disabled={loading} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer">
              {loading ? "Guardando..." : esEdicion ? "Guardar Cambios" : "Dar de Alta"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body // Nodo del DOM destino del Portal
  );
}