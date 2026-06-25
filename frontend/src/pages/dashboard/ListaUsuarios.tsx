import { useState, useEffect, useCallback, useMemo } from "react";
import {
  HiOutlineUserGroup,
  HiOutlineShieldExclamation,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineEye,
  HiChevronDown,
  HiPlus,
  HiRefresh,
} from "react-icons/hi";

// 🌟 Componentes separados
import FormAltaUsuario from "./FormAltaUsuario";
import UsuariosTable from "./UsuariosTable";
import Paginador from "./Paginador";

/* ============================================================
 * TIPOS (exportados para reutilizar en subcomponentes)
 * ============================================================ */
export type Rol =
  | "superadmin"
  | "admin"
  | "consejo"
  | "propietario"
  | "inquilino";

export type EstadoUsuario = "activo" | "pendiente" | "inactivo";

export interface Usuario {
  _id: string;
  name: string;
  email: string;
  role: Rol;
  estado: EstadoUsuario;
  unidadFuncional?: string;
  telefono?: string;
}

export type ColumnaOrdenable = "name" | "unidadFuncional";
export type DireccionOrden = "asc" | "desc";

export interface ConfiguracionOrden {
  columna: ColumnaOrdenable | null;
  direccion: DireccionOrden;
}

interface UsuariosResponse {
  success: boolean;
  users?: Usuario[];
  message?: string;
}

/* ============================================================
 * CONSTANTES
 * ============================================================ */
const ITEMS_POR_PAGINA = 10;
const DEBOUNCE_MS = 250;

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
 * HELPERS
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
 * HELPER DE RED PURO (sin setState, sin efectos secundarios)
 * Vive fuera del componente para no recrearse en cada render.
 * ============================================================ */
async function fetchUsuariosRequest(
  signal?: AbortSignal
): Promise<UsuariosResponse> {
  const respuesta = await fetch(`${getBaseUrl()}/api/users`, { signal });
  return (await respuesta.json()) as UsuariosResponse;
}

/* ============================================================
 * HOOK: debounce
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
 * COMPONENTE PRINCIPAL
 * ============================================================ */
export default function ListaUsuarios() {
  // ✅ Inicializadores lazy: la función se ejecuta UNA SOLA VEZ al montar.
  // Esto reemplaza el uso problemático de useRef durante render.
  const [tieneAcceso] = useState<boolean>(verificarAcceso);
  const [loading, setLoading] = useState<boolean>(verificarAcceso);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState<boolean>(false);

  const [busqueda, setBusqueda] = useState("");
  const busquedaDebounced = useDebounce(busqueda, DEBOUNCE_MS);

  const [filtroRol, setFiltroRol] = useState<Rol | "todos">("todos");
  const [filtroEstado, setFiltroEstado] = useState<EstadoUsuario | "todos">(
    "todos"
  );

  const [orden, setOrden] = useState<ConfiguracionOrden>({
    columna: "name",
    direccion: "asc",
  });

  const [paginaActual, setPaginaActual] = useState(1);

  /* ------------------------------------------------------------
   * Carga inicial
   * Patrón seguro: función async declarada DENTRO del effect.
   * El linter reconoce que los setState ocurren después de await.
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!tieneAcceso) {
      return;
    }

    const controller = new AbortController();

    const cargar = async () => {
      try {
        const resultado = await fetchUsuariosRequest(controller.signal);

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
    };

    void cargar();

    return () => controller.abort();
  }, [tieneAcceso]);

  /* ------------------------------------------------------------
   * Recarga manual (handler de evento → puede setear loading=true)
   * ------------------------------------------------------------ */
  const recargarUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resultado = await fetchUsuariosRequest();

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

  /* ------------------------------------------------------------
   * Filtrado + ordenamiento
   * ------------------------------------------------------------ */
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

  /* ------------------------------------------------------------
   * Reset de página al cambiar filtros
   *
   * ✅ Patrón oficial de React: "Adjusting state while rendering"
   *    https://react.dev/learn/you-might-not-need-an-effect
   *
   * Usamos useState (NO useRef) para guardar la clave previa.
   * Llamar a setState durante render ES válido para derivar estado;
   * React descarta el render en curso y vuelve a renderizar.
   * ------------------------------------------------------------ */
  const claveFiltros = `${busquedaDebounced}|${filtroRol}|${filtroEstado}`;
  const [claveFiltrosPrevia, setClaveFiltrosPrevia] = useState(claveFiltros);

  if (claveFiltrosPrevia !== claveFiltros) {
    setClaveFiltrosPrevia(claveFiltros);
    setPaginaActual(1);
  }

  /* ------------------------------------------------------------
   * Cálculos derivados de paginación
   * ------------------------------------------------------------ */
  const totalPaginas = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / ITEMS_POR_PAGINA)
  );

  const paginaEfectiva = Math.min(Math.max(paginaActual, 1), totalPaginas);
  const indicePrimerItem = (paginaEfectiva - 1) * ITEMS_POR_PAGINA;
  const indiceUltimoItem = indicePrimerItem + ITEMS_POR_PAGINA;

  const usuariosPaginados = useMemo(
    () => usuariosFiltrados.slice(indicePrimerItem, indiceUltimoItem),
    [usuariosFiltrados, indicePrimerItem, indiceUltimoItem]
  );

  /* ------------------------------------------------------------
   * Handlers
   * ------------------------------------------------------------ */
  const toggleEstadoUsuario = useCallback((id: string) => {
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
    // TODO: abrir modal en modo edición
  }, []);

  const manejarAltaUsuario = useCallback(() => {
    setModalAbierto(true);
  }, []);

  const manejarCerrarModal = useCallback(() => {
    setModalAbierto(false);
  }, []);

  const manejarClickOrden = useCallback((columna: ColumnaOrdenable) => {
    setOrden((prev) => ({
      columna,
      direccion:
        prev.columna === columna && prev.direccion === "asc" ? "desc" : "asc",
    }));
  }, []);

  /* ------------------------------------------------------------
   * Guard: sin acceso
   * ------------------------------------------------------------ */
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

  /* ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------ */
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Listado de Usuarios
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">
            Visualizá, filtrá y controlá las cuentas activas que tienen acceso
            al ecosistema del consorcio.
          </p>
        </div>

        {/* 🌟 OPTIMIZACIÓN: Se añade 'shrink-0' para que el bloque de acciones no se deforme 
            y se cambia a 'lg:self-center' para coordinar el quiebre de pantalla de forma prolija */}
        <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-start lg:self-center w-full lg:w-auto justify-end">
          <div className="hidden md:flex px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl items-center gap-2 shrink-0">
            <HiOutlineUserGroup className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">
              Total: {usuarios.length}
            </span>
          </div>

          <button
            onClick={recargarUsuarios}
            disabled={loading}
            title="Actualizar listado"
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer group flex items-center justify-center shrink-0"
          >
            <HiRefresh
              className={`w-5 h-5 ${
                loading
                  ? "animate-spin text-teal-600"
                  : "group-hover:rotate-180 transition-transform duration-500"
              }`}
            />
          </button>

          {/* 🌟 DETALLE CLAVE: Se incorpora 'whitespace-nowrap' para prohibir terminantemente 
              que el texto "Nuevo Usuario" se divida en dos renglones */}
          <button
            onClick={manejarAltaUsuario}
            className="w-full lg:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-slate-900/10 hover:shadow transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
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

          <UsuariosTable
            usuarios={usuariosPaginados}
            orden={orden}
            onClickOrden={manejarClickOrden}
            onEditar={manejarEditar}
            onToggleEstado={toggleEstadoUsuario}
          />

          <Paginador
            paginaActual={paginaEfectiva}
            totalPaginas={totalPaginas}
            indicePrimerItem={indicePrimerItem}
            indiceUltimoItem={indiceUltimoItem}
            totalFiltrados={usuariosFiltrados.length}
            onCambioPagina={setPaginaActual}
          />
        </div>
      )}

      {/* Modal de alta */}
      <FormAltaUsuario
        modalAbierto={modalAbierto}
        onCerrar={manejarCerrarModal}
        onUsuarioCreado={recargarUsuarios}
      />
    </div>
  );
}