// src/pages/dashboard/ListaUsuarios.tsx
import { useState } from "react";
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
  HiPlus
} from "react-icons/hi";

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "consejo" | "propietario" | "inquilino";
  estado: "activo" | "pendiente" | "suspendido";
  estadoAnterior?: "activo" | "pendiente";
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
  const userString = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : { role: "inquilino" };
  const tieneAcceso = currentUser.role === "admin" || currentUser.role === "superadmin";

  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  const [orden, setOrden] = useState<ConfiguracionOrden>({
    columna: "name",
    direccion: "asc",
  });

  const [usuarios, setUsuarios] = useState<Usuario[]>([
    { id: "1", name: "Super Admin", email: "superadmin@consorcia.com.ar", role: "superadmin", estado: "activo" },
    { id: "2", name: "Alejandro Borges", email: "admin@consorcia.com.ar", role: "admin", estado: "activo" },
    { id: "3", name: "Carlos Gómez", email: "consejo@consorcia.com.ar", role: "consejo", estado: "activo", unidadFuncional: "UF 14 - 4° B", telefono: "11-3456-7890" },
    { id: "4", name: "Propietario Prueba", email: "propietario@consorcia.com.ar", role: "propietario", estado: "pendiente", unidadFuncional: "UF 02 - PB A", telefono: "11-9876-5432" },
    { id: "5", name: "Inquilino Prueba", email: "inquilino@consorcia.com.ar", role: "inquilino", estado: "suspendido", estadoAnterior: "pendiente", unidadFuncional: "UF 22 - 6° C", telefono: "11-5555-1234" },
    { id: "6", name: "Ana Martínez", email: "amartinez@consorcia.com.ar", role: "propietario", estado: "activo", unidadFuncional: "UF 05 - 1° A", telefono: "11-2233-4455" },
    { id: "7", name: "Beatriz Rossi", email: "brossi@consorcia.com.ar", role: "inquilino", estado: "activo", unidadFuncional: "UF 18 - 5° A", telefono: "11-6677-8899" },
    { id: "8", name: "Daniel Delgado", email: "ddelgado@consorcia.com.ar", role: "propietario", estado: "pendiente", unidadFuncional: "UF 09 - 2° B", telefono: "11-4455-6677" },
    { id: "9", name: "Elena Fernandez", email: "efernandez@consorcia.com.ar", role: "consejo", estado: "activo", unidadFuncional: "UF 11 - 3° A", telefono: "11-8899-0011" },
    { id: "10", name: "Facundo Herrera", email: "fherrera@consorcia.com.ar", role: "inquilino", estado: "activo", unidadFuncional: "UF 20 - 5° C", telefono: "11-1122-3344" },
    { id: "11", name: "Gabriela López", email: "glopez@consorcia.com.ar", role: "propietario", estado: "activo", unidadFuncional: "UF 03 - PB B", telefono: "11-9988-7766" },
    { id: "12", name: "Hugo Medina", email: "hmedina@consorcia.com.ar", role: "inquilino", estado: "pendiente", unidadFuncional: "UF 15 - 4° C", telefono: "11-7766-5544" },
  ]);

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
        if (u.id === id) {
          if (u.estado === "suspendido") {
            return { ...u, estado: u.estadoAnterior || "activo", estadoAnterior: undefined };
          } else {
            return { ...u, estado: "suspendido", estadoAnterior: u.estado };
          }
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

  const renderCeldaEstado = (estado: "activo" | "pendiente" | "suspendido") => {
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
      case "suspendido":
        return (
          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
            <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
            <span>Suspendida</span>
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
        
        {/* Contenedor del Botón de Alta y Contador Total */}
        <div className="flex items-center gap-3 self-start sm:self-center w-full sm:w-auto">
          <div className="hidden md:flex px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl items-center gap-2">
            <HiOutlineUserGroup className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Total: {usuarios.length}</span>
          </div>

          {/* Botón para Alta de Usuario */}
          <button
            onClick={manejarAltaUsuario}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-slate-900/10 hover:shadow transition-all active:scale-[0.98] cursor-pointer"
          >
            <HiPlus className="w-5 h-5" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Barra de Herramientas Unificada (Buscador + Filtros) */}
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
          {/* Filtro Rol */}
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

          {/* Filtro Estado */}
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
              <option value="suspendido">Solo Suspendidas</option>
            </select>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
              <HiChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
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
                  <tr key={u.id} className={`hover:bg-slate-50/40 transition-colors ${u.estado === "suspendido" ? "bg-slate-50/40 opacity-75" : ""}`}>
                    <td className={`px-6 py-4 font-bold ${u.estado === "suspendido" ? "text-slate-500 line-through font-medium" : "text-slate-900"}`}>
                      {u.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-2">
                        <HiOutlineMail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className={u.estado === "suspendido" ? "line-through" : ""}>{u.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{renderBadgeRol(u.role)}</td>
                    <td className="px-6 py-4 text-slate-600 font-bold">
                      {u.unidadFuncional ? (
                        <div className="flex items-center gap-1.5">
                          <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className={u.estado === "suspendido" ? "line-through font-medium text-slate-400" : ""}>{u.unidadFuncional}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {u.telefono ? (
                        <div className="flex items-center gap-1.5">
                          <HiOutlinePhone className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className={u.estado === "suspendido" ? "line-through" : ""}>{u.telefono}</span>
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
                          onClick={() => toggleEstadoUsuario(u.id)}
                          title={u.estado === "suspendido" ? "Activar cuenta" : "Desactivar cuenta"}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            u.estado === "suspendido"
                              ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                              : "hover:bg-red-50 text-slate-400 hover:text-red-600"
                          }`}
                        >
                          {u.estado === "suspendido" ? <HiOutlineLockClosed className="w-4 h-4" /> : <HiOutlineLockOpen className="w-4 h-4" />}
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
    </div>
  );
}