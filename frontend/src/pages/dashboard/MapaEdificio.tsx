import { useState, useEffect, useMemo } from "react";
import { 
  HiOutlineOfficeBuilding, 
  HiOutlineUser, 
  HiOutlineTrendingUp,
  HiOutlineExclamationCircle,
  HiX,
  HiCheck,
  HiPlus
} from "react-icons/hi";
import api from "../../api"; 

export type EstadoOcupacion = "propietario" | "inquilino" | "vacio";

export interface Persona {
  _id: string;
  name: string;
  email: string;
  telefono?: string;
  role: string;
}

export interface UnidadFuncional {
  _id: string;
  piso: string;
  departamento: string;
  coeficiente: number;
  estadoOcupacion: EstadoOcupacion;
  propietario?: Persona;
  inquilino?: Persona;
  metrosCuadrados?: number;
  notas?: string;
}

export default function MapaEdificio() {
  const [unidades, setUnidades] = useState<UnidadFuncional[]>([]);
  const [usuariosSistema, setUsuariosSistema] = useState<Persona[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState<UnidadFuncional | null>(null);
  
  // Estados para el alta de nueva unidad
  const [mostrarFormAlta, setMostrarFormAlta] = useState<boolean>(false);
  const [nuevoPiso, setNuevoPiso] = useState<string>("");
  const [nuevoDepto, setNuevoDepto] = useState<string>("");
  const [nuevoCoeficiente, setNuevoCoeficiente] = useState<string>("0.05");
  const [creandoUnidad, setCreandoUnidad] = useState<boolean>(false);

  // Estados para el Drawer de asignación de habitantes
  const [drawerAbierto, setDrawerAbierto] = useState<boolean>(false);
  const [nuevoPropietarioId, setNuevoPropietarioId] = useState<string>("");
  const [nuevoInquilinoId, setNuevoInquilinoId] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);

  // Carga inicial de datos asíncrona adaptada a Axios
  useEffect(() => {
    let activo = true;

    const inicializarMapa = async () => {
      try {
        const [resUnidades, resUsuarios] = await Promise.all([
          api.get("/unidades"),
          api.get("/users")
        ]);

        if (!activo) return;

        const dataUnidades = resUnidades.data;
        const dataUsuarios = resUsuarios.data;

        if (dataUnidades && dataUnidades.ok && dataUnidades.unidades) {
          setUnidades(dataUnidades.unidades);
        } else if (Array.isArray(dataUnidades)) {
          setUnidades(dataUnidades);
        } else if (dataUnidades && Array.isArray(dataUnidades.unidades)) {
          setUnidades(dataUnidades.unidades);
        }
        
        if (dataUsuarios && dataUsuarios.success && dataUsuarios.users) {
          setUsuariosSistema(dataUsuarios.users);
        } else if (Array.isArray(dataUsuarios)) {
          setUsuariosSistema(dataUsuarios);
        }
      } catch (error) {
        console.error("Error al cargar los datos del edificio con Axios:", error);
      } finally {
        if (activo) setCargando(false);
      }
    };

    inicializarMapa();

    return () => {
      activo = false;
    };
  }, []);

  // Manejador para enviar el formulario de Alta (POST) con Axios
  const handleCrearUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoPiso || !nuevoDepto) return;
    setCreandoUnidad(true);

    try {
      const res = await api.post("/unidades", {
        piso: nuevoPiso,
        departamento: nuevoDepto,
        coeficiente: parseFloat(nuevoCoeficiente) || 0,
        estadoOcupacion: "vacio"
      });

      const data = res.data;
      const unidadCreada = data.unidad || data;

      if (unidadCreada && unidadCreada._id) {
        setUnidades((prev) => [...prev, unidadCreada]);
        setNuevoPiso("");
        setNuevoDepto("");
        setNuevoCoeficiente("0.05");
        setMostrarFormAlta(false);
      }
    } catch (error) {
      console.error("Error al crear la unidad funcional:", error);
    } finally {
      setCreandoUnidad(false);
    }
  };

  const abrirGestionHabitantes = () => {
    if (!unidadSeleccionada) return;
    setNuevoPropietarioId(unidadSeleccionada.propietario?._id || "");
    setNuevoInquilinoId(unidadSeleccionada.inquilino?._id || "");
    setDrawerAbierto(true);
  };

  // Guardado/Modificación de habitantes (PUT) con Axios
  const guardarHabitantes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidadSeleccionada) return;
    setGuardando(true);

    try {
      const res = await api.put(`/unidades/${unidadSeleccionada._id}/vincular`, {
        propietarioId: nuevoPropietarioId || null,
        inquilinoId: nuevoInquilinoId || null,
      });

      const data = res.data;
      if (data.ok && data.unidad) {
        setUnidades((prev) => prev.map((u) => (u._id === data.unidad._id ? data.unidad : u)));
        setUnidadSeleccionada(data.unidad);
        setDrawerAbierto(false);
      }
    } catch (error) {
      console.error("Error al vincular habitantes:", error);
    } finally {
      setGuardando(false);
    }
  };

  // Bloquear scroll vertical absoluto únicamente para Mobile/Drawer
  useEffect(() => {
    const interactivoAbierto = drawerAbierto || (unidadSeleccionada !== null && window.innerWidth < 1024);
    
    if (interactivoAbierto) {
      document.body.style.overflow = "hidden";
      const style = document.createElement("style");
      style.id = "bloqueo-scroll-modal";
      style.innerHTML = `
        body, html, main, #root, .flex-1, [class*="overflow-y-auto"] { 
          overflow: hidden !important; 
        }
      `;
      document.head.appendChild(style);
    } else {
      document.body.style.overflow = "";
      document.getElementById("bloqueo-scroll-modal")?.remove();
    }

    return () => {
      document.body.style.overflow = "";
      document.getElementById("bloqueo-scroll-modal")?.remove();
    };
  }, [drawerAbierto, unidadSeleccionada]);

  const edificioEstructurado = useMemo(() => {
    const grupos: Record<string, UnidadFuncional[]> = {};
    unidades.forEach((u) => {
      if (!grupos[u.piso]) grupos[u.piso] = [];
      grupos[u.piso].push(u);
    });
    Object.keys(grupos).forEach((piso) => {
      grupos[piso].sort((a, b) => a.departamento.localeCompare(b.departamento));
    });
    return Object.entries(grupos).sort((a, b) => {
      const numA = parseInt(a[0], 10);
      const numB = parseInt(b[0], 10);
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numB - numA;
    });
  }, [unidades]);

  if (cargando) {
    return (
      <div className="flex h-60 items-center justify-center text-slate-400 font-medium">
        Cargando plano estructural del consorcio...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 lg:p-6 min-h-screen bg-slate-50/50 pb-28 lg:pb-6">
      
      {/* SECCIÓN DEL MAPA (Ocupa 2/3 en desktop) */}
      <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-4 lg:p-6 shadow-xs flex flex-col justify-between">
        <div>
          {/* HEADER DE LA SECCIÓN (Adaptivo) */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4 lg:mb-6">
            <div>
              <h2 className="text-lg lg:text-xl font-black text-slate-900 flex items-center gap-2">
                <HiOutlineOfficeBuilding className="w-5 h-5 text-slate-500 hidden sm:inline" />
                Mapa de Unidades
              </h2>
              <p className="text-slate-400 text-[11px] lg:text-xs font-medium mt-0.5">
                Visualización estructural por pisos y habitabilidad.
              </p>
            </div>
            
            {/* Botón adaptivo: Estilo "Nuevo Usuario" en mobile, estilo clásico en desktop */}
            <button
              onClick={() => setMostrarFormAlta(!mostrarFormAlta)}
              className="flex items-center justify-center gap-2 transition cursor-pointer shrink-0 active:scale-[0.99]
                /* Estilos Mobile (Idéntico a Nuevo Usuario) */
                w-full bg-[#0f172a] hover:bg-slate-800 text-white text-sm font-bold py-3.5 px-6 rounded-2xl
                /* Estilos Desktop (Se revierte al original en pantallas grandes) */
                lg:w-auto lg:bg-slate-900 lg:hover:bg-slate-800 lg:text-xs lg:py-2 lg:px-3 lg:rounded-xl"
            >
              {mostrarFormAlta ? (
                <>
                  <HiX className="w-4 h-4" />
                  <span>Cerrar</span>
                </>
              ) : (
                <>
                  <span className="text-lg font-light leading-none -mt-0.5 lg:hidden">+</span>
                  <HiPlus className="w-4 h-4 hidden lg:inline" />
                  <span>Nueva Unidad</span>
                </>
              )}
            </button>
          </div>

          {/* Formulario rápido colapsable para crear U.F. */}
          {mostrarFormAlta && (
            <form onSubmit={handleCrearUnidad} className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap gap-4 items-end animate-in fade-in duration-200">
              <div className="w-24">
                <label className="block text-slate-600 font-bold text-[11px] uppercase mb-1">Piso</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 1, PB"
                  value={nuevoPiso}
                  onChange={(e) => setNuevoPiso(e.target.value)}
                  className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-900"
                />
              </div>
              <div className="w-28">
                <label className="block text-slate-600 font-bold text-[11px] uppercase mb-1">Dpto / Nro</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: A, 102"
                  value={nuevoDepto}
                  onChange={(e) => setNuevoDepto(e.target.value)}
                  className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-900"
                />
              </div>
              <div className="w-32">
                <label className="block text-slate-600 font-bold text-[11px] uppercase mb-1">Coeficiente</label>
                <input
                  type="number"
                  step="0.00001"
                  required
                  value={nuevoCoeficiente}
                  onChange={(e) => setNuevoCoeficiente(e.target.value)}
                  className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={creandoUnidad}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs h-9 px-4 rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <HiCheck className="w-4 h-4" />
                <span>{creandoUnidad ? "Creando..." : "Guardar"}</span>
              </button>
            </form>
          )}

          {/* Referencias rápidas */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-8 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-[10px] lg:text-xs font-bold uppercase tracking-wider max-w-fit">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /> 
              <span className="text-emerald-700">Propietario</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-100" /> 
              <span className="text-blue-700">Inquilino</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-slate-100" /> 
              <span className="text-slate-500">Vacío</span>
            </div>
          </div>
        </div>

        {/* Contenedor del Mapa (Centrado y enriquecido para Desktop) */}
        <div className="flex-1 flex flex-col justify-center py-6">
          <div className="flex flex-col gap-4 max-w-2xl mx-auto border-l-2 lg:border-l-4 border-slate-200 pl-4 lg:pl-8 w-full">
            {edificioEstructurado.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50 w-full">
                No se encontraron unidades funcionales registradas. Usá "Nueva Unidad" para empezar.
              </div>
            ) : (
              edificioEstructurado.map(([piso, dptos]) => (
                <div key={piso} className="flex items-center gap-4 group">
                  <div className="w-12 lg:w-16 text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-slate-900 transition-colors shrink-0">
                    {piso === "0" || piso.toLowerCase() === "pb" ? "P. Baja" : `Piso ${piso}`}
                  </div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {dptos.map((u) => {
                      const esSeleccionada = unidadSeleccionada?._id === u._id;
                      const estado = u.estadoOcupacion?.toLowerCase();
                      
                      let clasesOcupacion: string;
                      if (estado === "inquilino" || !!u.inquilino) {
                        clasesOcupacion = "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100/80 shadow-xs";
                      } else if (estado === "propietario" || !!u.propietario) {
                        clasesOcupacion = "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80 shadow-xs";
                      } else {
                        clasesOcupacion = "bg-slate-50 border-slate-200 text-slate-400 border-dashed hover:bg-slate-100";
                      }

                      return (
                        <button
                          key={u._id}
                          onClick={() => setUnidadSeleccionada(u)}
                          className={`px-3 py-2 lg:py-3 rounded-xl border text-xs lg:text-sm font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center min-w-14 lg:min-w-20 h-10 lg:h-14 ${clasesOcupacion} ${
                            esSeleccionada ? "ring-2 ring-slate-900 ring-offset-2 scale-105" : "hover:scale-[1.02]"
                          }`}
                        >
                          {u.departamento}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA: PANEL LATERAL DE DETALLE (Persistente en Desktop, Bottom Sheet en Mobile) */}
      <div className="w-full lg:col-span-1">
        {unidadSeleccionada ? (
          <div 
            className="fixed lg:sticky lg:top-6 inset-0 lg:inset-auto z-40 lg:z-0 flex items-end lg:items-start w-full shrink-0"
            role="dialog"
          >
            {/* Backdrop exclusivo para Mobile */}
            <div 
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs lg:hidden transition-opacity"
              onClick={() => setUnidadSeleccionada(null)}
            />

            {/* Tarjeta de Contenido */}
            <div className="relative w-full bg-white border border-slate-200 rounded-t-3xl lg:rounded-2xl p-5 shadow-2xl lg:shadow-xs animate-in slide-in-from-bottom lg:animate-none z-10 max-h-[85vh] lg:max-h-[calc(100vh-3rem)] overflow-y-auto">
              
              {/* Tirador visual de arrastre superior solo para mobile */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 lg:hidden" onClick={() => setUnidadSeleccionada(null)} />

              <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Detalle de Unidad</span>
                  <h3 className="text-xl lg:text-2xl font-black text-slate-900 mt-0.5">
                    {unidadSeleccionada.piso === "0" || unidadSeleccionada.piso.toLowerCase() === "pb" ? "" : `${unidadSeleccionada.piso}°`} 
                    "{unidadSeleccionada.departamento}"
                  </h3>
                </div>
                {/* Botón Cerrar: Útil en desktop y mobile */}
                <button 
                  onClick={() => setUnidadSeleccionada(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <HiOutlineTrendingUp className="w-3.5 h-3.5" /> Coeficiente de Expensas
                  </label>
                  <p className="text-slate-900 font-bold text-sm mt-0.5">
                    {(unidadSeleccionada.coeficiente * 100).toFixed(2)}% ({unidadSeleccionada.coeficiente})
                  </p>
                </div>

                <div className="h-px bg-slate-100" />

                <div>
                  <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <HiOutlineUser className="w-3.5 h-3.5" /> Propietario
                  </label>
                  {unidadSeleccionada.propietario ? (
                    <div className="mt-1">
                      <p className="text-slate-900 font-bold text-sm">{unidadSeleccionada.propietario.name}</p>
                      <p className="text-slate-500 text-xs truncate">{unidadSeleccionada.propietario.email}</p>
                    </div>
                  ) : (
                    <p className="text-amber-600 font-medium text-xs mt-1 italic flex items-center gap-1">
                      <HiOutlineExclamationCircle className="w-3.5 h-3.5" /> Sin propietario asignado
                    </p>
                  )}
                </div>

                {(unidadSeleccionada.estadoOcupacion === "inquilino" || !!unidadSeleccionada.inquilino) && (
                  <div>
                    <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <HiOutlineUser className="w-3.5 h-3.5 text-blue-500" /> Inquilino Ocupante
                    </label>
                    {unidadSeleccionada.inquilino ? (
                      <div className="mt-1">
                        <p className="text-slate-900 font-bold text-sm">{unidadSeleccionada.inquilino.name}</p>
                        <p className="text-slate-500 text-xs truncate">{unidadSeleccionada.inquilino.email}</p>
                      </div>
                    ) : (
                      <p className="text-slate-400 font-medium text-xs mt-1 italic">Cargando inquilino...</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 pb-2 lg:pb-0">
                <button 
                  onClick={abrirGestionHabitantes}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer active:scale-[0.98]"
                >
                  Gestionar Habitantes
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Estado Vacío en Desktop cuando no hay unidad seleccionada */
          <div className="hidden lg:flex border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-medium text-xs h-[320px] flex-col items-center justify-center gap-3 bg-white shadow-xs lg:sticky lg:top-6">
            <HiOutlineOfficeBuilding className="w-10 h-10 text-slate-300" />
            <span className="max-w-[200px] leading-relaxed">
              Seleccioná un departamento del mapa para ver y gestionar sus habitantes, expensas y datos de ocupación.
            </span>
          </div>
        )}
      </div>

      {/* DRAWER LATERAL: GESTIONAR HABITANTES (Sin alteraciones estructurales) */}
      {drawerAbierto && unidadSeleccionada && (
        <div 
          className="fixed inset-0 z-50 overflow-hidden" 
          role="dialog" 
          aria-modal="true"
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setDrawerAbierto(false)}
          />

          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <form 
              onSubmit={guardarHabitantes}
              className="w-screen max-w-md transform bg-white shadow-2xl transition-all duration-300 ease-in-out animate-in slide-in-from-right flex flex-col justify-between"
            >
              {/* Header fijo */}
              <div className="border-b border-slate-100 p-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900">
                    Asignar Habitantes: {unidadSeleccionada.piso === "0" || unidadSeleccionada.piso.toLowerCase() === "pb" ? "" : `${unidadSeleccionada.piso}°`} "{unidadSeleccionada.departamento}"
                  </h4>
                  <button 
                    type="button"
                    onClick={() => setDrawerAbierto(false)} 
                    className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer rounded-lg hover:bg-slate-50"
                  >
                    <HiX className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenido / Campos */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1.5">
                    Propietario de la Unidad
                  </label>
                  <select
                    value={nuevoPropietarioId}
                    onChange={(e) => setNuevoPropietarioId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-900 shadow-xs"
                  >
                    <option value="">-- Sin Propietario / Vacío --</option>
                    {usuariosSistema.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold text-xs mb-1.5">
                    Inquilino / Ocupante (Opcional)
                  </label>
                  <select
                    value={nuevoInquilinoId}
                    onChange={(e) => setNuevoInquilinoId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-900 shadow-xs"
                  >
                    <option value="">-- Sin Inquilino --</option>
                    {usuariosSistema.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer fijo del Formulario */}
              <div className="border-t border-slate-100 p-6 bg-slate-50/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerAbierto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-slate-900/10"
                >
                  <HiCheck className="w-4 h-4" />
                  <span>{guardando ? "Guardando..." : "Confirmar Cambios"}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}