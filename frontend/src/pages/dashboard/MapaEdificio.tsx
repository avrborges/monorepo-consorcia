// src/pages/dashboard/MapaEdificio.tsx
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

  // Estados para el Modal de asignación de habitantes
  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [nuevoPropietarioId, setNuevoPropietarioId] = useState<string>("");
  const [nuevoInquilinoId, setNuevoInquilinoId] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);

  // Carga inicial de datos asíncrona
  useEffect(() => {
    let activo = true;

    const inicializarMapa = async () => {
      try {
        const token = localStorage.getItem("token");
        
        const [resUnidades, resUsuarios] = await Promise.all([
          fetch("http://localhost:5000/api/unidades", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:5000/api/users", {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);

        const dataUnidades = await resUnidades.json();
        const dataUsuarios = await resUsuarios.json();

        if (!activo) return;

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
        console.error("Error al cargar los datos del edificio:", error);
      } finally {
        if (activo) setCargando(false);
      }
    };

    inicializarMapa();

    return () => {
      activo = false;
    };
  }, []);

  // Manejador para enviar el formulario de Alta de Unidad Funcional (POST)
  const handleCrearUnidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoPiso || !nuevoDepto) return;
    setCreandoUnidad(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/unidades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          piso: nuevoPiso,
          departamento: nuevoDepto,
          coeficiente: parseFloat(nuevoCoeficiente) || 0,
          estadoOcupacion: "vacio" // Se crea vacía por defecto
        }),
      });

      const data = await res.json();
      
      // Maneja si la API responde con la unidad envuelta o directa
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
    setModalAbierto(true);
  };

  const guardarHabitantes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unidadSeleccionada) return;
    setGuardando(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/unidades/${unidadSeleccionada._id}/vincular`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propietarioId: nuevoPropietarioId || null,
          inquilinoId: nuevoInquilinoId || null,
        }),
      });

      const data = await res.json();
      if (data.ok && data.unidad) {
        setUnidades((prev) => prev.map((u) => (u._id === data.unidad._id ? data.unidad : u)));
        setUnidadSeleccionada(data.unidad);
        setModalAbierto(false);
      }
    } catch (error) {
      console.error("Error al vincular habitantes:", error);
    } finally {
      setGuardando(false);
    }
  };

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
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen bg-slate-50/50">
      
      {/* SECCIÓN DEL MAPA */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <HiOutlineOfficeBuilding className="w-5 h-5 text-slate-500" />
              Mapa de Unidades Funcionales
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1">
              Visualización estructural por pisos y estados de habitabilidad.
            </p>
          </div>
          
          <button
            onClick={() => setMostrarFormAlta(!mostrarFormAlta)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
          >
            {mostrarFormAlta ? <HiX className="w-4 h-4" /> : <HiPlus className="w-4 h-4" />}
            <span>Nueva Unidad</span>
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
        <div className="flex flex-wrap gap-4 mb-8 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-50 border border-emerald-200" /> <span className="text-emerald-700">Propietario</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-blue-50 border border-blue-200" /> <span className="text-blue-700">Inquilino</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-slate-50 border border-slate-200 border-dashed" /> <span className="text-slate-500">Vacío</span></div>
        </div>

        {/* Contenedor del Mapa */}
        <div className="flex flex-col gap-3 max-w-3xl mx-auto border-l-4 border-slate-300 pl-4">
          {edificioEstructurado.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              No se encontraron unidades funcionales registradas. Usá el botón "Nueva Unidad" de arriba para dar de alta la primera.
            </div>
          ) : (
            edificioEstructurado.map(([piso, dptos]) => (
              <div key={piso} className="flex items-center gap-4 group">
                <div className="w-14 text-right text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
                  {piso === "0" || piso.toLowerCase() === "pb" ? "P. Baja" : `Piso ${piso}`}
                </div>
                <div className="flex flex-wrap gap-2.5 flex-1">
                  {dptos.map((u) => {
                    const esSeleccionada = unidadSeleccionada?._id === u._id;
                    
                    let clasesOcupacion: string;
                    if (u.estadoOcupacion === "propietario") {
                      clasesOcupacion = "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80 shadow-xs";
                    } else if (u.estadoOcupacion === "inquilino") {
                      clasesOcupacion = "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100/80 shadow-xs";
                    } else {
                      clasesOcupacion = "bg-slate-50 border-slate-200 text-slate-400 border-dashed hover:bg-slate-100";
                    }

                    return (
                      <button
                        key={u._id}
                        onClick={() => setUnidadSeleccionada(u)}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center min-w-16 h-12 ${clasesOcupacion} ${
                          esSeleccionada ? "ring-2 ring-slate-900 ring-offset-2 scale-105" : ""
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

      {/* PANEL LATERAL DE DETALLE */}
      <div className="w-full lg:w-80 shrink-0">
        {unidadSeleccionada ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs sticky top-6">
            <div className="border-b border-slate-100 pb-4 mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Detalle de Unidad</span>
              <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                {unidadSeleccionada.piso === "0" || unidadSeleccionada.piso.toLowerCase() === "pb" ? "" : `${unidadSeleccionada.piso}°`} 
                "{unidadSeleccionada.departamento}"
              </h3>
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

              {unidadSeleccionada.estadoOcupacion === "inquilino" && (
                <div>
                  <label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <HiOutlineUser className="w-3.5 h-3.5 text-blue-500" /> Inquilino Ocupante
                  </label>
                  {unidadSeleccionada.inquilino ? (
                    <div className="mt-1">
                      <p className="text-slate-900 font-bold text-sm">{unidadSeleccionada.inquilino.name}</p>
                      <p className="text-slate-500 text-xs truncate">{unidadSeleccionada.inquilino.email}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button 
                onClick={abrirGestionHabitantes}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Gestionar Habitantes
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 font-medium text-xs h-48 flex flex-col items-center justify-center gap-2">
            <HiOutlineOfficeBuilding className="w-8 h-8 text-slate-300" />
            <span>Seleccioná una unidad del mapa para ver su información de contacto.</span>
          </div>
        )}
      </div>

      {/* MODAL: GESTIONAR HABITANTES */}
      {modalAbierto && unidadSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h4 className="text-base font-bold text-slate-900">
                Asignar Habitantes: {unidadSeleccionada.piso}° "{unidadSeleccionada.departamento}"
              </h4>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer">
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarHabitantes} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold text-xs mb-1.5">Propietario de la Unidad</label>
                <select
                  value={nuevoPropietarioId}
                  onChange={(e) => setNuevoPropietarioId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-900"
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
                <label className="block text-slate-700 font-bold text-xs mb-1.5">Inquilino / Ocupante (Opcional)</label>
                <select
                  value={nuevoInquilinoId}
                  onChange={(e) => setNuevoInquilinoId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-900"
                >
                  <option value="">-- Sin Inquilino --</option>
                  {usuariosSistema.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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