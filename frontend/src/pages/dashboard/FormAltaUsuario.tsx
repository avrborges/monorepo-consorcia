// src/pages/dashboard/FormAltaUsuario.tsx
import { useState, startTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineOfficeBuilding,
} from "react-icons/hi";

// 🎯 Cliente HTTP con interceptors JWT + manejo global de 401
import api from "../../api";

// 🎯 Tipos de dominio compartidos entre backend y frontend
import type { Persona, Rol } from "@shared/types";

interface FormAltaUsuarioProps {
  modalAbierto: boolean;
  onCerrar: () => void;
  onUsuarioCreado: () => void;
  usuarioEditando?: Persona | null;
}

/**
 * Respuesta esperada del backend al crear o editar un usuario.
 */
interface CrearOEditarUsuarioResponse {
  success: boolean;
  message?: string;
  user?: Persona;
}

export default function FormAltaUsuario({
  modalAbierto,
  onCerrar,
  onUsuarioCreado,
  usuarioEditando,
}: FormAltaUsuarioProps) {
  // 🧠 Parseo inicial de datos directamente en la fase de inicialización de estados (Evita el useEffect)
  const esEdicion = Boolean(usuarioEditando);

  const [name, setName] = useState(() => usuarioEditando?.name || "");
  const [email, setEmail] = useState(() => usuarioEditando?.email || "");
  const [role, setRole] = useState<Rol>(() => usuarioEditando?.role || "propietario");
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Parseo inicial de la Unidad Funcional
  const [uf, setUf] = useState(() => {
    const rawUf = usuarioEditando?.unidadFuncional || "";
    let ufPura = rawUf.replace(/Piso\s+[^\s]+/i, "").replace(/Dto\s+[^\s]+/i, "").trim();
    if (ufPura.toLowerCase().startsWith("uf")) ufPura = ufPura.replace(/^uf\s*/i, "").trim();
    return ufPura;
  });

  const [piso, setPiso] = useState(() => {
    const rawUf = usuarioEditando?.unidadFuncional || "";
    const pisoMatch = rawUf.match(/Piso\s+([^\s]+)/i);
    return pisoMatch ? pisoMatch[1] : "";
  });

  const [dto, setDto] = useState(() => {
    const rawUf = usuarioEditando?.unidadFuncional || "";
    const dtoMatch = rawUf.match(/Dto\s+([^\s]+)/i);
    return dtoMatch ? dtoMatch[1] : "";
  });

  // Parseo inicial del teléfono
  const [codigoPais, setCodigoPais] = useState(() => {
    const rawTel = usuarioEditando?.telefono || "";
    const telMatch = rawTel.match(/^(\+[0-9]{1,3})/);
    return telMatch ? telMatch[1] : rawTel ? "" : "+54";
  });

  const [telefonoLocal, setTelefonoLocal] = useState(() => {
    const rawTel = usuarioEditando?.telefono || "";
    const telMatch = rawTel.match(/^(\+[0-9]{1,3})/);
    return telMatch ? rawTel.substring(telMatch[1].length).trim() : rawTel;
  });

  const primerInputRef = useRef<HTMLInputElement>(null);

  // ✨ Este efecto se encarga EXCLUSIVAMENTE de interacciones con sistemas externos (DOM / Teclado)
  useEffect(() => {
    if (!modalAbierto) return;

    // Bloquear scroll
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    // Manejar tecla Escape
    const manejarTeclaEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCerrar();
    };
    window.addEventListener("keydown", manejarTeclaEscape);

    // Autofoco inteligente diferido
    const timer = setTimeout(() => primerInputRef.current?.focus(), 150);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", manejarTeclaEscape);
      clearTimeout(timer);
    };
  }, [modalAbierto, loading, onCerrar]);

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
      if (!/^\+?[0-9]{1,4}$/.test(codPaisLimpio)) {
        setErrorForm("El código de país no es válido. Ej: +54");
        return;
      }
      if (!/^[0-9\s\-()]+$/.test(telLocalLimpio)) {
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
        ? codPaisLimpio.startsWith("+")
          ? codPaisLimpio
          : `+${codPaisLimpio}`
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
      const { data } = esEdicion
        ? await api.put<CrearOEditarUsuarioResponse>(`/users/${usuarioEditando?._id}`, payload)
        : await api.post<CrearOEditarUsuarioResponse>("/users", payload);

      if (data.success) {
        onUsuarioCreado();
        onCerrar();
      } else {
        setErrorForm(data.message || "Ocurrió un error en la solicitud.");
      }
    } catch (err) {
      console.error("Error en submit de usuario:", err);
      setErrorForm("Error de conexión con el servidor backend.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-999 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="absolute inset-0 -z-10" onClick={() => !loading && onCerrar()} />

      <div className="bg-white w-full max-w-md h-screen flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 ease-out border-l border-slate-100 shadow-2xl">
        {/* Encabezado */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              {esEdicion ? "Editar Datos del Usuario" : "Registrar Nuevo Usuario"}
            </h3>
            <button
              type="button"
              disabled={loading}
              onClick={onCerrar}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
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
          <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {errorForm && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl animate-in fade-in zoom-in-95 duration-200">
                {errorForm}
              </div>
            )}

            {/* Input Nombre */}
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre Completo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><HiOutlineUser className="w-4 h-4" /></span>
                <input id="name" ref={primerInputRef} required disabled={loading} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
            </div>

            {/* Input Email */}
            <div>
              <label htmlFor="user-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><HiOutlineMail className="w-4 h-4" /></span>
                <input id="user-email" required disabled={loading} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@correo.com" className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
            </div>

            {/* Selector de Rol */}
            <div>
              <label htmlFor="role" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rol Asignado</label>
              <select id="role" disabled={loading} value={role} onChange={(e) => startTransition(() => setRole(e.target.value as Rol))} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 transition appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400">
                <option value="propietario">Propietario</option>
                <option value="consejo">Consejo de Administración</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Grilla Datos de la Unidad Funcional */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="uf" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">U. Funcional</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400"><HiOutlineOfficeBuilding className="w-3.5 h-3.5" /></span>
                  <input id="uf" disabled={loading} type="text" value={uf} onChange={(e) => setUf(e.target.value)} placeholder="Ej. 12" className="w-full pl-8 pr-2 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>

              <div>
                <label htmlFor="piso" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Piso</label>
                <input id="piso" disabled={loading} type="text" value={piso} onChange={(e) => setPiso(e.target.value)} placeholder="Ej. 3" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400" />
              </div>

              <div>
                <label htmlFor="dto" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Depto</label>
                <input id="dto" disabled={loading} type="text" value={dto} onChange={(e) => setDto(e.target.value)} placeholder="Ej. B" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
            </div>

            {/* Grilla para Teléfono */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label htmlFor="codigoPais" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Cód. País</label>
                <input id="codigoPais" disabled={loading} type="text" value={codigoPais} onChange={(e) => setCodigoPais(e.target.value)} placeholder="+54" className="w-full px-2.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 text-center focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400" />
              </div>

              <div className="col-span-3">
                <label htmlFor="telefonoLocal" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Teléfono (Opcional)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><HiOutlinePhone className="w-4 h-4" /></span>
                  <input id="telefonoLocal" disabled={loading} type="tel" value={telefonoLocal} onChange={(e) => setTelefonoLocal(e.target.value)} placeholder="Ej. 11 2345 6789" className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button type="button" onClick={onCerrar} disabled={loading} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition shadow-sm disabled:opacity-70 cursor-pointer flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : esEdicion ? (
                "Guardar Cambios"
              ) : (
                "Dar de Alta"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}