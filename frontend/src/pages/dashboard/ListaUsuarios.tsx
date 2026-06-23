// src/pages/dashboard/ListaUsuarios.tsx
import { useState, useEffect, useCallback } from "react";
import { 
  HiOutlineUserGroup, 
  HiOutlineMail, 
  HiOutlineShieldCheck, 
  HiOutlineShieldExclamation, 
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineLockClosed,
  HiOutlineLockOpen,
  HiOutlinePhone,
  HiOutlineOfficeBuilding,
  HiChevronUp,
  HiChevronDown,
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlineClock,
  HiChevronLeft,
  HiChevronRight,
  HiPlus,
  HiRefresh 
} from "react-icons/hi";

interface Usuario {
  _id: string; 
  name: string;
  email: string;
  role: "superadmin" | "admin" | "consejo" | "propietario" | "inquilino";
  estado: "activo" | "pendiente" | "inactivo"; 
  unidadFuncional?: string;
  telefono?: string;
}

type ColumnaOrdenable = "name" | "unidadFuncional";
type DireccionOrden = "asc" | "desc";

interface ConfiguracionOrden {
  columna: ColumnaOrdenable | null;
  direccion: DireccionOrden;
}

export default function ListaUsuarios() {
  // Inicialización perezosa limpia para evitar evaluaciones en render
  const [tieneAcceso] = useState<boolean>(() => {
    try {
      const userString = localStorage.getItem("user");
      if (!userString) return false;
      const currentUser = JSON.parse(userString);
      return currentUser?.role === "admin" || currentUser?.role === "superadmin";
    } catch {
      return false;
    }
  });

  // Estados base
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros, paginación y ordenamiento
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos"); 
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  const [orden, setOrden] = useState<ConfiguracionOrden>({
    columna: "name",
    direccion: "asc",
  });

// 🎯 El fetch detecta dinámicamente si estás en localhost o desde el celular usando una IP
  const cargarUsuarios = useCallback(async () => {
    try {
      // 1. Obtenemos el hostname actual (ej: "localhost" o "192.168.0.50")
      const hostname = window.location.hostname;
      
      // 2. Construimos la URL del Backend usando ese mismo hostname pero apuntando al puerto 5000
      const baseUrl = `http://${hostname}:5000`;

      const respuesta = await fetch(`${baseUrl}/api/users`);
      const resultado = await respuesta.json();

      if (resultado.success) {
        setUsuarios(resultado.users);
        setError(null);
      } else {
        setError(resultado.message || "Error al recuperar las cuentas.");
      }
    } catch (err) {
      console.error("Error en fetch de usuarios:", err);
      setError("No se pudo establecer conexión con el servidor backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 🎯 Sincronización libre de llamadas sincrónicas al inicio
  useEffect(() => {
    let activo = true;

    if (tieneAcceso) {
      // Forzamos a que se ejecute en la siguiente microtarea para que React no proteste por renderizado concurrente
      Promise.resolve().then(() => {
        if (activo) {
          cargarUsuarios();
        }
      });
    } else {
      // Si no tiene acceso, bajamos la bandera de loading asíncronamente para matar el "cascading render"
      Promise.resolve().then(() => {
        if (activo) {
          setLoading(false);
        }
      });
    }

    return () => {
      activo = false;
    };
  }, [tieneAcceso, cargarUsuarios]);

  const manejarCambioBusqueda = (valor: string) => {
    setBusqueda(valor);
    setPaginaActual(1);
  };

  const manejarCambioRol = (valor: string) => {
    setFiltroRol(valor);
    setPaginaActual(1);
  };

  const manejarCambioEstado = (valor: string) => {
    setFiltroEstado(valor); 
    setPaginaActual(1);
  };

  const toggleEstadoUsuario = (id: string) => {
    setUsuarios(prevUsuarios =>
      prevUsuarios.map(u => {
        if (u._id === id) {
          const nuevoEstado = u.estado === "inactivo" ? "activo" : "inactivo";
          return { ...u, estado: nuevoEstado };
        }
        return u;
      })
    );
  };

  const manejarEditar = (usuario: Usuario) => {
    console.log("Abriendo edición para el usuario:", usuario);
  };

  const manejarAltaUsuario = () => {
    console.log("Abrir formulario o modal de alta de usuario");
  };

  const renderBadgeRol = (role: string) => {
    const estilos: Record<string, string> = {
      superadmin: "bg-purple-50 text-purple-700 border-purple-200/60",
      admin: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      consejo: "bg-blue-50 text-blue-700 border-blue-200/60",
      propietario: "bg-amber-50 text-amber-700 border-amber-200/60",
      inquilino: "bg-slate-100 text-slate-700 border-slate-300/60",
    };

    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${estilos[role] || estilos.inquilino}`}>
        {role}
      </span>
    );
  };

  const renderCeldaEstado = (estado: "activo" | "pendiente" | "inactivo") => {
    switch (estado) {
      case "activo":
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
            <HiOutlineShieldCheck className="w-4 h-4 shrink-0" />
            <span>Activa</span>
          </div>
        );
      case "pendiente":
        return (
          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs animate-pulse">
            <HiOutlineClock className="w-4 h-4 shrink-0" />
            <span>Pendiente</span>
          </div>
        );
      case "inactivo":
        return (
          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
            <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
            <span>Inactiva</span>
          </div>
        );
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const coincideTexto =
      u.name.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      (u.unidadFuncional && u.unidadFuncional.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideRol = filtroRol === "todos" || u.role === filtroRol;
    const coincideEstado = filtroEstado === "todos" || u.estado === filtroEstado;

    return coincideTexto && coincideRol && coincideEstado;
  });

  const usuariosOrdenadosYFiltrados = [...usuariosFiltrados].sort((a, b) => {
    if (!orden.columna) return 0;
    const valorA = a[orden.columna] || "";
    const valorB = b[orden.columna] || "";

    if (valorA < valorB) return orden.direccion === "asc" ? -1 : 1;
    if (valorA > valorB) return orden.direccion === "asc" ? 1 : -1;
    return 0;
  });

  const indiceUltimoItem = paginaActual * ITEMS_POR_PAGINA;
  const indicePrimerItem = indiceUltimoItem - ITEMS_POR_PAGINA;
  const usuariosPaginados = usuariosOrdenadosYFiltrados.slice(indicePrimerItem, indiceUltimoItem);

  const totalPaginas = Math.ceil(usuariosOrdenadosYFiltrados.length / ITEMS_POR_PAGINA) || 1;

  const manejarClickOrden = (columna: ColumnaOrdenable) => {
    setOrden(prevOrden => ({
      columna,
      direccion: prevOrden.columna === columna && prevOrden.direccion === "asc" ? "desc" : "asc",
    }));
  };

  const renderIconoOrden = (columna: ColumnaOrdenable) => {
    if (orden.columna !== columna) {
      return <div className="w-4 h-4 text-slate-300 opacity-50 group-hover:opacity-100"><HiChevronDown/></div>;
    }
    return orden.direccion === "asc" ? <HiChevronUp className="w-4 h-4 text-slate-900" /> : <HiChevronDown className="w-4 h-4 text-slate-900" />;
  };

  // Render condicional para usuarios sin permisos
  if (!tieneAcceso) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
          <HiOutlineShieldExclamation className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Acceso Restringido</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Esta sección está reservada exclusivamente para la administración central de Consorcia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Listado de Usuarios
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Visualizá, filtrá y controlá las cuentas activas que tienen acceso al ecosistema del consorcio.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start sm:self-center w-full sm:w-auto">
          <div className="hidden md:flex px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl items-center gap-2">
            <HiOutlineUserGroup className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Total: {usuarios.length}</span>
          </div>

          <button
            onClick={() => { setLoading(true); cargarUsuarios(); }}
            disabled={loading}
            title="Actualizar listado"
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer group flex items-center justify-center"
          >
            <HiRefresh className={`w-5 h-5 ${loading ? "animate-spin text-teal-600" : "group-hover:rotate-180 transition-transform duration-500"}`} />
          </button>

          <button
            onClick={manejarAltaUsuario}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-slate-900/10 hover:shadow transition-all active:scale-[0.98] cursor-pointer"
          >
            <HiPlus className="w-5 h-5" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Barra de Herramientas Unificada */}
      <div className="flex flex-col lg:flex-row gap-3 w-full">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
            <HiOutlineSearch className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => manejarCambioBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email o UF..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition shadow-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-56">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <HiOutlineFilter className="w-5 h-5" />
            </span>
            <select
              value={filtroRol}
              onChange={(e) => manejarCambioRol(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition appearance-none cursor-pointer shadow-sm"
            >
              <option value="todos">Todos los roles</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Admin</option>
              <option value="consejo">Consejo de Administración</option>
              <option value="propietario">Propietario</option>
              <option value="inquilino">Inquilino</option>
            </select>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
              <HiChevronDown className="w-4 h-4" />
            </span>
          </div>

          <div className="relative w-full sm:w-52">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
              <HiOutlineEye className="w-5 h-5" />
            </span>
            <select
              value={filtroEstado}
              onChange={(e) => manejarCambioEstado(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition appearance-none cursor-pointer shadow-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Solo Activas</option>
              <option value="pendiente">Solo Pendientes</option>
              <option value="inactivo">Solo Inactivas</option>
            </select>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
              <HiChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Estados de Carga y Errores */}
      {loading && usuarios.length === 0 ? (
        <div className="py-20 text-center text-sm font-medium text-slate-500 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-3"></div>
          Cargando listado de usuarios desde MongoDB Atlas...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center gap-2">
          <HiOutlineShieldExclamation className="w-8 h-8 text-red-500" />
          <span>{error}</span>
          <button 
            onClick={() => { setLoading(true); cargarUsuarios(); }} 
            className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Reintentar conexión
          </button>
        </div>
      ) : (
        /* Tabla Principal */
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10" />
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-slate-900"
                    onClick={() => manejarClickOrden("name")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Usuario / Nombre</span>
                      {renderIconoOrden("name")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Rol Asignado</th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-slate-900"
                    onClick={() => manejarClickOrden("unidadFuncional")}
                  >
                    <div className="flex items-center gap-1">
                      <span>U. Funcional</span>
                      {renderIconoOrden("unidadFuncional")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-sm text-slate-700">
                {usuariosPaginados.length > 0 ? (
                  usuariosPaginados.map((u) => (
                    <tr key={u._id} className={`hover:bg-slate-50/40 transition-colors ${u.estado === "inactivo" ? "bg-slate-50/40 opacity-75" : ""}`}>
                      <td className={`px-6 py-4 font-bold ${u.estado === "inactivo" ? "text-slate-500 line-through font-medium" : "text-slate-900"}`}>
                        {u.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <div className="flex items-center gap-2">
                          <HiOutlineMail className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className={u.estado === "inactivo" ? "line-through" : ""}>{u.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{renderBadgeRol(u.role)}</td>
                      <td className="px-6 py-4 text-slate-600 font-bold">
                        {u.unidadFuncional ? (
                          <div className="flex items-center gap-1.5">
                            <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className={u.estado === "inactivo" ? "line-through font-medium text-slate-400" : ""}>{u.unidadFuncional}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {u.telefono ? (
                          <div className="flex items-center gap-1.5">
                            <HiOutlinePhone className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className={u.estado === "inactivo" ? "line-through" : ""}>{u.telefono}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-normal">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{renderCeldaEstado(u.estado)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => manejarEditar(u)}
                            title="Editar usuario"
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleEstadoUsuario(u._id)}
                            title={u.estado === "inactivo" ? "Activar cuenta" : "Desactivar cuenta"}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              u.estado === "inactivo"
                                ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                                : "hover:bg-red-50 text-slate-400 hover:text-red-600"
                            }`}
                          >
                            {u.estado === "inactivo" ? <HiOutlineLockClosed className="w-4 h-4" /> : <HiOutlineLockOpen className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400 font-medium">
                      No se encontraron usuarios con los criterios seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer del Paginador */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
            <div className="text-xs font-bold text-slate-500 tracking-wide uppercase">
              Mostrando <span className="text-slate-800">{usuariosFiltrados.length > 0 ? indicePrimerItem + 1 : 0}</span> al{" "}
              <span className="text-slate-800">{Math.min(indiceUltimoItem, usuariosFiltrados.length)}</span> de{" "}
              <span className="text-slate-800">{usuariosFiltrados.length}</span> resultados filtrados
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                disabled={paginaActual === 1}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed shadow-sm cursor-pointer"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPaginas }, (_, index) => {
                const numeroPagina = index + 1;
                const esActiva = paginaActual === numeroPagina;
                return (
                  <button
                    key={numeroPagina}
                    onClick={() => setPaginaActual(numeroPagina)}
                    className={`min-w-[36px] h-9 text-xs font-bold rounded-xl transition cursor-pointer ${
                      esActiva
                        ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
                        : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
                    }`}
                  >
                    {numeroPagina}
                  </button>
                );
              })}

              <button
                onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                disabled={paginaActual === totalPaginas}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed shadow-sm cursor-pointer"
              >
                <HiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}