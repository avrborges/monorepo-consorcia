// src/pages/dashboard/FormAltaUsuario.tsx
import { useState, startTransition, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineOfficeBuilding,
} from "react-icons/hi";

// 🎯 Capa de servicios (Fase 3)
import { userService, unidadService } from "@/services";
import type {
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
} from "@/services";

// 🎯 Modal de confirmación estilizado (misma que usamos para eliminar)
import ModalConfirmacion from "@/components/common/ModalConfirmacion";

// 🎯 Tipos de dominio compartidos entre backend y frontend
import type { Persona, Rol, UnidadFuncional } from "@shared/types";

interface FormAltaUsuarioProps {
  modalAbierto: boolean;
  onCerrar: () => void;
  onUsuarioCreado: () => void;
  usuarioEditando?: Persona | null;
}

/* ============================================================
 * COMPONENTE
 * ============================================================ */

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

  // 🎯 Estado del modal de confirmación de cierre
  const [mostrarConfirmarCierre, setMostrarConfirmarCierre] = useState(false);

  // 🎯 Selección de Unidad Funcional (nuevo modelo consistente - Fase 2)
  const [unidadesDisponibles, setUnidadesDisponibles] = useState<UnidadFuncional[]>([]);
  const [cargandoUnidades, setCargandoUnidades] = useState<boolean>(false);
  const [unidadIdSeleccionada, setUnidadIdSeleccionada] = useState<string>(() => {
    const rawUnidadId = usuarioEditando?.unidadId;
    return typeof rawUnidadId === "string" ? rawUnidadId : "";
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

  /* ------------------------------------------------------------
   * Detección de cambios sin guardar
   * ------------------------------------------------------------ */

  const [valoresIniciales] = useState(() => ({
    name: usuarioEditando?.name || "",
    email: usuarioEditando?.email || "",
    role: (usuarioEditando?.role || "propietario") as Rol,
    unidadId: unidadIdSeleccionada,
    codigoPais,
    telefonoLocal,
  }));

  const tieneCambios =
    name !== valoresIniciales.name ||
    email !== valoresIniciales.email ||
    role !== valoresIniciales.role ||
    unidadIdSeleccionada !== valoresIniciales.unidadId ||
    codigoPais !== valoresIniciales.codigoPais ||
    telefonoLocal !== valoresIniciales.telefonoLocal;

  /**
   * Intenta cerrar el drawer. Si hay cambios sin guardar, muestra el
   * modal de confirmación estilizado en vez de cerrar directamente.
   */
  const intentarCerrar = useCallback((): void => {
    if (loading) return;

    if (tieneCambios) {
      setMostrarConfirmarCierre(true);
      return;
    }

    onCerrar();
  }, [loading, tieneCambios, onCerrar]);

  /**
   * Confirmación explícita del usuario para descartar los cambios y cerrar.
   */
  const confirmarDescartarCambios = useCallback((): void => {
    setMostrarConfirmarCierre(false);
    onCerrar();
  }, [onCerrar]);

  /**
   * Cancelar el cierre → volver al drawer sin perder los cambios.
   */
  const cancelarCierre = useCallback((): void => {
    setMostrarConfirmarCierre(false);
  }, []);

  // ✨ Este efecto se encarga EXCLUSIVAMENTE de interacciones con sistemas externos (DOM / Teclado)
  useEffect(() => {
    if (!modalAbierto) return;

    // Bloquear scroll
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    // Manejar tecla Escape (con confirmación si hay cambios sin guardar)
    const manejarTeclaEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading && !mostrarConfirmarCierre) {
        intentarCerrar();
      }
    };
    window.addEventListener("keydown", manejarTeclaEscape);

    // Autofoco inteligente diferido
    const timer = setTimeout(() => primerInputRef.current?.focus(), 150);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", manejarTeclaEscape);
      clearTimeout(timer);
    };
  }, [modalAbierto, loading, mostrarConfirmarCierre, intentarCerrar]);

  // 🎯 Cargar unidades disponibles al abrir el modal (Fase 2)
  useEffect(() => {
    if (!modalAbierto) return;

    let activo = true;
    const cargarUnidades = async () => {
      setCargandoUnidades(true);
      try {
        const data = await unidadService.getAll();
        if (!activo) return;
        if (data.ok && data.unidades) {
          // Ordenar por piso (numérico) y luego departamento (alfabético)
          const ordenadas = [...data.unidades].sort((a, b) => {
            const pisoA = parseInt(a.piso, 10);
            const pisoB = parseInt(b.piso, 10);
            if (!isNaN(pisoA) && !isNaN(pisoB) && pisoA !== pisoB) return pisoA - pisoB;
            return a.departamento.localeCompare(b.departamento);
          });
          setUnidadesDisponibles(ordenadas);
        }
      } catch (err) {
        console.error("Error al cargar unidades:", err);
      } finally {
        if (activo) setCargandoUnidades(false);
      }
    };

    void cargarUnidades();

    return () => {
      activo = false;
    };
  }, [modalAbierto]);

  if (!modalAbierto) return null;

  const manejarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setErrorForm(null);
    const nombreLimpio = name.trim();
    const emailLimpio = email.trim().toLowerCase();
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

    // 🎯 Derivar el texto legacy de UF a partir de la unidad seleccionada
    const unidadSeleccionada = unidadIdSeleccionada
      ? unidadesDisponibles.find((u) => u._id === unidadIdSeleccionada)
      : null;

    const ufCompuesta = unidadSeleccionada
      ? `Piso ${unidadSeleccionada.piso} Depto ${unidadSeleccionada.departamento}`
      : "";

    let telUnificado = "";
    if (telLocalLimpio) {
      const prefix = codPaisLimpio
        ? codPaisLimpio.startsWith("+")
          ? codPaisLimpio
          : `+${codPaisLimpio}`
        : "";
      telUnificado = prefix ? `${prefix} ${telLocalLimpio}` : telLocalLimpio;
    }

    try {
      if (esEdicion && usuarioEditando) {
        const payload: ActualizarUsuarioPayload = {
          name: nombreLimpio,
          email: emailLimpio,
          role,
          unidadFuncional: ufCompuesta,
          unidadId: unidadIdSeleccionada || null,
          telefono: telUnificado,
        };
        const data = await userService.update(usuarioEditando._id, payload);

        if (data.success) {
          onUsuarioCreado();
          onCerrar();
        } else {
          setErrorForm("Ocurrió un error en la solicitud.");
        }
      } else {
        const payload: CrearUsuarioPayload = {
          name: nombreLimpio,
          email: emailLimpio,
          role,
          unidadFuncional: ufCompuesta,
          unidadId: unidadIdSeleccionada || null,
          telefono: telUnificado,
        };
        const data = await userService.create(payload);

        if (data.success) {
          onUsuarioCreado();
          onCerrar();
        } else {
          setErrorForm("Ocurrió un error en la solicitud.");
        }
      }
    } catch (err) {
      console.error("Error en submit de usuario:", err);
      setErrorForm("Error de conexión con el servidor backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-999 flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="form-alta-usuario-titulo"
        >
          <div className="absolute inset-0 -z-10" onClick={intentarCerrar} />

          <div className="bg-white w-full max-w-md h-screen flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 ease-out border-l border-slate-100 shadow-2xl">
            {/* Encabezado */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center justify-between">
                <h3
                  id="form-alta-usuario-titulo"
                  className="text-lg font-black text-slate-900 tracking-tight"
                >
                  {esEdicion ? "Editar Datos del Usuario" : "Registrar Nuevo Usuario"}
                </h3>
                <button
                  type="button"
                  disabled={loading}
                  onClick={intentarCerrar}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                  aria-label="Cerrar formulario"
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
            <form onSubmit={manejarSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden" noValidate>
              <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                {errorForm && (
                  <div
                    className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl animate-in fade-in zoom-in-95 duration-200"
                    role="alert"
                    aria-live="polite"
                  >
                    {errorForm}
                  </div>
                )}

                {/* Input Nombre */}
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><HiOutlineUser className="w-4 h-4" /></span>
                    <input
                      id="name"
                      ref={primerInputRef}
                      required
                      disabled={loading}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      aria-invalid={Boolean(errorForm)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* Input Email */}
                <div>
                  <label htmlFor="user-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400"><HiOutlineMail className="w-4 h-4" /></span>
                    <input
                      id="user-email"
                      required
                      disabled={loading}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="juan@correo.com"
                      aria-invalid={Boolean(errorForm)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* Selector de Rol */}
                <div>
                  <label htmlFor="role" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Rol Asignado</label>
                  <select
                    id="role"
                    disabled={loading}
                    value={role}
                    onChange={(e) => startTransition(() => setRole(e.target.value as Rol))}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 transition appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="propietario">Propietario</option>
                    <option value="consejo">Consejo de Administración</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* Selector de Unidad Funcional (Opción B: mostrar todas con estado) */}
                <div>
                  <label htmlFor="unidadId" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Unidad Funcional
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                      <HiOutlineOfficeBuilding className="w-4 h-4" />
                    </span>
                    <select
                      id="unidadId"
                      disabled={loading || cargandoUnidades}
                      value={unidadIdSeleccionada}
                      onChange={(e) => setUnidadIdSeleccionada(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-slate-900 transition appearance-none cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">— Sin unidad asignada —</option>
                      {unidadesDisponibles.map((u) => {
                        const propietario = typeof u.propietario === "object" && u.propietario !== null ? u.propietario : null;
                        const inquilino = typeof u.inquilino === "object" && u.inquilino !== null ? u.inquilino : null;
                        let sufijo = "";
                        if (inquilino) sufijo = ` — Ocupada por ${inquilino.name}`;
                        else if (propietario) sufijo = ` — Propietario: ${propietario.name}`;
                        return (
                          <option key={u._id} value={u._id}>
                            Piso {u.piso} — Depto {u.departamento}{sufijo}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  {cargandoUnidades && (
                    <p className="mt-1 text-[10px] text-slate-400 italic">Cargando unidades disponibles...</p>
                  )}
                  {!cargandoUnidades && unidadesDisponibles.length === 0 && (
                    <p className="mt-1 text-[10px] text-amber-600 italic">No hay unidades funcionales cargadas todavía.</p>
                  )}
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
                <button type="button" onClick={intentarCerrar} disabled={loading} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40">
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
      )}

      {/* Modal de confirmación de cierre con cambios sin guardar */}
      <ModalConfirmacion
        abierto={mostrarConfirmarCierre}
        titulo="¿Descartar los cambios?"
        mensaje="Tenés cambios sin guardar en el formulario de"
        nombreUsuario={esEdicion && usuarioEditando ? usuarioEditando.name : "un nuevo usuario"}
        onCerrar={cancelarCierre}
        onConfirmar={confirmarDescartarCambios}
        loading={false}
      />
    </>
  );
}