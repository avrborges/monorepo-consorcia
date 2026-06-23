// src/pages/dashboard/ListaUsuarios.tsx
import { useState, useEffect, useCallback, useMemo, memo } from "react";
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
  HiRefresh,
} from "react-icons/hi";

/* ============================================================
 *  TIPOS
 * ============================================================ */
type Rol = "superadmin" | "admin" | "consejo" | "propietario" | "inquilino";
type EstadoUsuario = "activo" | "pendiente" | "inactivo";

interface Usuario {
  _id: string;
  name: string;
  email: string;
  role: Rol;
  estado: EstadoUsuario;
  unidadFuncional?: string;
  telefono?: string;
}

type ColumnaOrdenable = "name" | "unidadFuncional";
type DireccionOrden = "asc" | "desc";

interface ConfiguracionOrden {
  columna: ColumnaOrdenable | null;
  direccion: DireccionOrden;
}

interface UsuariosResponse {
  success: boolean;
  users?: Usuario[];
  message?: string;
}

/* ============================================================
 *  CONSTANTES
 * ============================================================ */
const ITEMS_POR_PAGINA = 10;
const DEBOUNCE_MS = 250;

const ESTILOS_ROL: Record<Rol, string> = {
  superadmin: "bg-purple-50 text-purple-700 border-purple-200/60",
  admin: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  consejo: "bg-blue-50 text-blue-700 border-blue-200/60",
  propietario: "bg-amber-50 text-amber-700 border-amber-200/60",
  inquilino: "bg-slate-100 text-slate-700 border-slate-300/60",
};

const OPCIONES_ROL: { value: Rol | "todos"; label: string }[] = [
  { value: "todos", label: "Todos los roles" },
  { value: "superadmin", label: "Superadmin" },
  { value: "admin", label: "Admin" },
  { value: "consejo", label: "Consejo de Administración" },
  { value: "propietario", label: "Propietario" },
  { value: "inquilino", label: "Inquilino" },
];

const OPCIONES_ESTADO: { value: EstadoUsuario | "todos"; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "activo", label: "Solo Activas" },
  { value: "pendiente", label: "Solo Pendientes" },
  { value: "inactivo", label: "Solo Inactivas" },
];

/* ============================================================
 *  HELPERS
 * ============================================================ */
const getBaseUrl = (): string => {
  const fromEnv = import.meta.env?.VITE_API_URL as string | undefined;
  if (fromEnv) return fromEnv;
  return `http://${window.location.hostname}:5000`;
};

const verificarAcceso = (): boolean => {
  try {
    const userString = localStorage.getItem("user");
    if (!userString) return false;
    const currentUser = JSON.parse(userString);
    return currentUser?.role === "admin" || currentUser?.role === "superadmin";
  } catch {
    return false;
  }
};

/* ============================================================
 *  SUBCOMPONENTES MEMOIZADOS
 * ============================================================ */
const BadgeRol = memo(({ role }: { role: Rol }) => (
  <span
    className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${
      ESTILOS_ROL[role] ?? ESTILOS_ROL.inquilino
    }`}
  >
    {role}
  </span>
));

const CeldaEstado = memo(({ estado }: { estado: EstadoUsuario }) => {
  if (estado === "activo") {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
        <HiOutlineShieldCheck className="w-4 h-4 shrink-0" />
        <span>Activa</span>
      </div>
    );
  }
  if (estado === "pendiente") {
    return (
      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs animate-pulse">
        <HiOutlineClock className="w-4 h-4 shrink-0" />
        <span>Pendiente</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs">
      <HiOutlineLockClosed className="w-4 h-4 shrink-0" />
      <span>Inactiva</span>
    </div>
  );
});

/* ============================================================
 *  HOOK: debounce
 * ============================================================ */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ============================================================
 *  HELPER: rango de páginas con elipsis
 * ============================================================ */
function rangoPaginacion(actual: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (actual <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (actual >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", actual - 1, actual, actual + 1, "...", total];
}

/* ============================================================
 *  COMPONENTE PRINCIPAL
 * ============================================================ */
export default function ListaUsuarios() {
  // 🎯 Inicialización perezosa para arrancar con el valor correcto desde el primer render
  const [tieneAcceso] = useState<boolean>(verificarAcceso);
  const [loading, setLoading] = useState<boolean>(() => verificarAcceso());

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, DEBOUNCE_MS);

  const [filtroRol, setFiltroRol] = useState<Rol | "todos">("todos");
  const [filtroEstado, setFiltroEstado] = useState<EstadoUsuario | "todos">(
    "todos"
  );
  const [paginaActual, setPaginaActual] = useState(1);

  const [orden, setOrden] = useState<ConfiguracionOrden>({
    columna: "name",
    direccion: "asc",
  });

  /* ----------------- FETCH inicial: TODO inline dentro del effect -----------------
   * ✅ El linter "react-hooks/set-state-in-effect" solo ve la función async inline
   * y entiende que todos los setState ocurren después del primer await
   * (en microtask), por lo que NO los marca como cascading renders.
   * ----------------------------------------------------------------------------- */
  useEffect(() => {
    if (!tieneAcceso) return;

    const controller = new AbortController();

    (async () => {
      try {
        const respuesta = await fetch(`${getBaseUrl()}/api/users`, {
          signal: controller.signal,
        });
        const resultado: UsuariosResponse = await respuesta.json();

        if (resultado.success && resultado.users) {
          setUsuarios(resultado.users);
          setError(null);
        } else {
          setError(resultado.message || "Error al recuperar las cuentas.");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Error en fetch de usuarios:", err);
        setError("No se pudo establecer conexión con el servidor backend.");
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [tieneAcceso]);

  /* ----------------- Recarga manual (handler, no effect) -----------------
   * Esta función SOLO se invoca desde onClick (Refrescar / Reintentar).
   * Como no se llama desde un useEffect, puede setear loading=true al inicio
   * sin generar el warning del linter.
   * ---------------------------------------------------------------------- */
  const recargarUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const respuesta = await fetch(`${getBaseUrl()}/api/users`);
      const resultado: UsuariosResponse = await respuesta.json();

      if (resultado.success && resultado.users) {
        setUsuarios(resultado.users);
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

  /* ----------------- FILTRADO + ORDEN (memoizados) ----------------- */
  const usuariosFiltrados = useMemo(() => {
    const q = busquedaDebounced.trim().toLowerCase();

    const filtrados = usuarios.filter((u) => {
      const coincideTexto =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.unidadFuncional?.toLowerCase().includes(q) ?? false);

      const coincideRol = filtroRol === "todos" || u.role === filtroRol;
      const coincideEstado =
        filtroEstado === "todos" || u.estado === filtroEstado;
      return coincideTexto && coincideRol && coincideEstado;
    });

    if (!orden.columna) return filtrados;

    const col = orden.columna;
    const factor = orden.direccion === "asc" ? 1 : -1;
    return [...filtrados].sort(
      (a, b) =>
        (a[col] ?? "").localeCompare(b[col] ?? "", "es", {
          sensitivity: "base",
        }) * factor
    );
  }, [usuarios, busquedaDebounced, filtroRol, filtroEstado, orden]);

  /* ----------------- PAGINACIÓN ----------------- */
  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / ITEMS_POR_PAGINA)
  );

  // 🎯 Patrón oficial: "ajustar estado durante el render" (reemplaza useEffect)
  const [filtrosAnteriores, setFiltrosAnteriores] = useState({
    q: busquedaDebounced,
    rol: filtroRol as Rol | "todos",
    estado: filtroEstado as EstadoUsuario | "todos",
  });

  if (
    filtrosAnteriores.q !== busquedaDebounced ||
    filtrosAnteriores.rol !== filtroRol ||
    filtrosAnteriores.estado !== filtroEstado
  ) {
    setFiltrosAnteriores({
      q: busquedaDebounced,
      rol: filtroRol,
      estado: filtroEstado,
    });
    setPaginaActual(1);
  }

  // 🎯 Clamp de página: derivado en render, sin efecto
  const paginaEfectiva = Math.min(Math.max(paginaActual, 1), totalPaginas);

  const indicePrimerItem = (paginaEfectiva - 1) * ITEMS_POR_PAGINA;
  const indiceUltimoItem = indicePrimerItem + ITEMS_POR_PAGINA;

  const usuariosPaginados = useMemo(
    () => usuariosFiltrados.slice(indicePrimerItem, indiceUltimoItem),
    [usuariosFiltrados, indicePrimerItem, indiceUltimoItem]
  );

  const paginas = useMemo(
    () => rangoPaginacion(paginaEfectiva, totalPaginas),
    [paginaEfectiva, totalPaginas]
  );

  /* ----------------- HANDLERS ----------------- */
  const toggleEstadoUsuario = useCallback((id: string) => {
    // ⚠️ TODO: persistir cambio en backend (PATCH /api/users/:id)
    setUsuarios((prev) =>
      prev.map((u) =>
        u._id === id
          ? { ...u, estado: u.estado === "inactivo" ? "activo" : "inactivo" }
          : u
      )
    );
  }, []);

  const manejarEditar = useCallback((usuario: Usuario) => {
    console.log("Abriendo edición para el usuario:", usuario);
  }, []);

  const manejarAltaUsuario = useCallback(() => {
    console.log("Abrir formulario o modal de alta de usuario");
  }, []);

  const manejarClickOrden = useCallback((columna: ColumnaOrdenable) => {
    setOrden((prev) => ({
      columna,
      direccion:
        prev.columna === columna && prev.direccion === "asc" ? "desc" : "asc",
    }));
  }, []);

  const renderIconoOrden = (columna: ColumnaOrdenable) => {
    if (orden.columna !== columna) {
      return (
        <HiChevronDown className="w-4 h-4 text-slate-300 opacity-50 group-hover:opacity-100" />
      );
    }
    return orden.direccion === "asc" ? (
      <HiChevronUp className="w-4 h-4 text-slate-900" />
    ) : (
      <HiChevronDown className="w-4 h-4 text-slate-900" />
    );
  };

  /* ----------------- ACCESO RESTRINGIDO ----------------- */
  if (!tieneAcceso) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
          <HiOutlineShieldExclamation className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          Acceso Restringido
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          Esta sección está reservada exclusivamente para la administración
          central de Consorcia.
        </p>
      </div>
    );
  }

  /* ----------------- RENDER ----------------- */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Listado de Usuarios
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Visualizá, filtrá y controlá las cuentas activas que tienen acceso
            al ecosistema del consorcio.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center w-full sm:w-auto">
          <div className="hidden md:flex px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl items-center gap-2">
            <HiOutlineUserGroup className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">
              Total: {usuarios.length}
            </span>
          </div>

          <button
            onClick={recargarUsuarios}
            disabled={loading}
            title="Actualizar listado"
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer group flex items-center justify-center"
          >
            <HiRefresh
              className={`w-5 h-5 ${
                loading
                  ? "animate-spin text-teal-600"
                  : "group-hover:rotate-180 transition-transform duration-500"
              }`}
            />
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

      {/* Barra de herramientas */}
      <div className="flex flex-col lg:flex-row gap-3 w-full">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
            <HiOutlineSearch className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
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
              onChange={(e) => setFiltroRol(e.target.value as Rol | "todos")}
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition appearance-none cursor-pointer shadow-sm"
            >
              {OPCIONES_ROL.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
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
              onChange={(e) =>
                setFiltroEstado(e.target.value as EstadoUsuario | "todos")
              }
              className="w-full pl-11 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition appearance-none cursor-pointer shadow-sm"
            >
              {OPCIONES_ESTADO.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-400">
              <HiChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Estado: loading inicial / error / tabla */}
      {loading && usuarios.length === 0 ? (
        <div className="py-20 text-center text-sm font-medium text-slate-500 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-3" />
          Cargando listado de usuarios desde MongoDB Atlas...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center gap-2">
          <HiOutlineShieldExclamation className="w-8 h-8 text-red-500" />
          <span>{error}</span>
          <button
            onClick={recargarUsuarios}
            className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Reintentar conexión
          </button>
        </div>
      ) : (
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
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Correo Electrónico
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Rol Asignado
                  </th>
                  <th
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-slate-900"
                    onClick={() => manejarClickOrden("unidadFuncional")}
                  >
                    <div className="flex items-center gap-1">
                      <span>U. Funcional</span>
                      {renderIconoOrden("unidadFuncional")}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-sm text-slate-700">
                {usuariosPaginados.length > 0 ? (
                  usuariosPaginados.map((u) => {
                    const esInactivo = u.estado === "inactivo";
                    return (
                      <tr
                        key={u._id}
                        className={`hover:bg-slate-50/40 transition-colors ${
                          esInactivo ? "bg-slate-50/40 opacity-75" : ""
                        }`}
                      >
                        <td
                          className={`px-6 py-4 font-bold ${
                            esInactivo
                              ? "text-slate-500 line-through font-medium"
                              : "text-slate-900"
                          }`}
                        >
                          {u.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          <div className="flex items-center gap-2">
                            <HiOutlineMail className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className={esInactivo ? "line-through" : ""}>
                              {u.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <BadgeRol role={u.role} />
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-bold">
                          {u.unidadFuncional ? (
                            <div className="flex items-center gap-1.5">
                              <HiOutlineOfficeBuilding className="w-4 h-4 text-slate-400 shrink-0" />
                              <span
                                className={
                                  esInactivo
                                    ? "line-through font-medium text-slate-400"
                                    : ""
                                }
                              >
                                {u.unidadFuncional}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {u.telefono ? (
                            <div className="flex items-center gap-1.5">
                              <HiOutlinePhone className="w-4 h-4 text-slate-400 shrink-0" />
                              <span
                                className={esInactivo ? "line-through" : ""}
                              >
                                {u.telefono}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <CeldaEstado estado={u.estado} />
                        </td>
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
                              title={
                                esInactivo
                                  ? "Activar cuenta"
                                  : "Desactivar cuenta"
                              }
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                esInactivo
                                  ? "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                                  : "hover:bg-red-50 text-slate-400 hover:text-red-600"
                              }`}
                            >
                              {esInactivo ? (
                                <HiOutlineLockClosed className="w-4 h-4" />
                              ) : (
                                <HiOutlineLockOpen className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-slate-400 font-medium"
                    >
                      No se encontraron usuarios con los criterios
                      seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginador con elipsis */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
            <div className="text-xs font-bold text-slate-500 tracking-wide uppercase">
              Mostrando{" "}
              <span className="text-slate-800">
                {usuariosFiltrados.length > 0 ? indicePrimerItem + 1 : 0}
              </span>{" "}
              al{" "}
              <span className="text-slate-800">
                {Math.min(indiceUltimoItem, usuariosFiltrados.length)}
              </span>{" "}
              de{" "}
              <span className="text-slate-800">{usuariosFiltrados.length}</span>{" "}
              resultados filtrados
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                disabled={paginaEfectiva === 1}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed shadow-sm cursor-pointer"
              >
                <HiChevronLeft className="w-4 h-4" />
              </button>

              {paginas.map((p, i) =>
                p === "..." ? (
                  <span
                    key={`dots-${i}`}
                    className="px-2 text-slate-400 text-xs font-bold"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPaginaActual(p)}
                    className={`min-w-9 h-9 text-xs font-bold rounded-xl transition cursor-pointer ${
                      paginaEfectiva === p
                        ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
                        : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() =>
                  setPaginaActual((p) => Math.min(p + 1, totalPaginas))
                }
                disabled={paginaEfectiva === totalPaginas}
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