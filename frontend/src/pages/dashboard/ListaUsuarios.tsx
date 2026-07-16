// src/pages/dashboard/ListaUsuarios.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

// 🎯 Capa de servicios (Fase 3)
import { userService } from "@/services";

// 🎯 Hook de sesión centralizado (Fase 4)
import { useAuth } from "@/hooks/useAuth";

// 🎯 Hook para título dinámico de pestaña (Tanda 1 UX)
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Tipos de dominio compartidos entre backend y frontend
import type { Persona, Rol, EstadoUsuario } from "@shared/types";

// Componentes reutilizables
import Paginador from "@/components/common/Paginador";
import ModalConfirmacion from "@/components/common/ModalConfirmacion";

// Componentes de la vista
import FormAltaUsuario from "./FormAltaUsuario";
import UsuariosTable from "./UsuariosTable";
import HistorialAuditoria from "./HistorialAuditoria";

/* ============================================================
 * TIPOS LOCALES (específicos del componente)
 * ============================================================ */
export type ColumnaOrdenable = "name" | "unidadFuncional";
export type DireccionOrden = "asc" | "desc";

export interface ConfiguracionOrden {
  columna: ColumnaOrdenable | null;
  direccion: DireccionOrden;
}

type PestanaActiva = "lista" | "auditoria";

/* ============================================================
 * CONSTANTES
 * ============================================================ */
const ITEMS_POR_PAGINA = 10;
const DEBOUNCE_MS = 250;

// 🎯 Claves para persistir estado en sessionStorage (se limpian al cerrar el navegador)
const STORAGE_KEY_BUSQUEDA = "consorcia_lista_busqueda";
const STORAGE_KEY_ROL = "consorcia_lista_filtro_rol";
const STORAGE_KEY_ESTADO = "consorcia_lista_filtro_estado";
const STORAGE_KEY_PESTANA = "consorcia_lista_pestana";

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
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/**
 * Recupera un valor de sessionStorage con validación de tipo.
 * Si el valor guardado no está entre los permitidos, retorna el default.
 */
function leerFiltroPersistido<T extends string>(
  key: string,
  valoresPermitidos: readonly T[],
  defaultValue: T
): T {
  try {
    const valor = sessionStorage.getItem(key);
    if (valor && (valoresPermitidos as readonly string[]).includes(valor)) {
      return valor as T;
    }
  } catch {
    // sessionStorage puede fallar en modo incógnito, etc.
  }
  return defaultValue;
}

const VALORES_ROL_VALIDOS: readonly (Rol | "todos")[] = [
  "todos", "superadmin", "admin", "consejo", "propietario", "inquilino",
];

const VALORES_ESTADO_VALIDOS: readonly (EstadoUsuario | "todos")[] = [
  "todos", "activo", "pendiente", "inactivo",
];

const VALORES_PESTANA_VALIDOS: readonly PestanaActiva[] = ["lista", "auditoria"];

/* ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================ */
export default function ListaUsuarios() {
  // 🎯 Título dinámico de la pestaña
  useDocumentTitle("Usuarios");

  // 🎯 Sesión centralizada via useAuth
  const { esAdmin, esSuperAdmin } = useAuth();

  const [loading, setLoading] = useState<boolean>(esAdmin);
  const [usuarios, setUsuarios] = useState<Persona[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 📝 Gestión de pestañas activas (persistida en sessionStorage)
  const [pestanaActiva, setPestanaActiva] = useState<PestanaActiva>(() =>
    leerFiltroPersistido(STORAGE_KEY_PESTANA, VALORES_PESTANA_VALIDOS, "lista")
  );

  const [modalAbierto, setModalAbierto] = useState<boolean>(false);
  const [usuarioParaEliminar, setUsuarioParaEliminar] = useState<Persona | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<Persona | null>(null);

  // 🎯 Filtros persistidos en sessionStorage
  const [busqueda, setBusqueda] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_BUSQUEDA) || "";
    } catch {
      return "";
    }
  });
  const busquedaDebounced = useDebounce(busqueda, DEBOUNCE_MS);

  const [filtroRol, setFiltroRol] = useState<Rol | "todos">(() =>
    leerFiltroPersistido(STORAGE_KEY_ROL, VALORES_ROL_VALIDOS, "todos")
  );
  const [filtroEstado, setFiltroEstado] = useState<EstadoUsuario | "todos">(() =>
    leerFiltroPersistido(STORAGE_KEY_ESTADO, VALORES_ESTADO_VALIDOS, "todos")
  );

  const [orden, setOrden] = useState<ConfiguracionOrden>({
    columna: "name",
    direccion: "asc",
  });

  const [paginaActual, setPaginaActual] = useState(1);

  // 🎯 Ref al input de búsqueda para atajos de teclado
  const inputBusquedaRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------
   * Persistencia de filtros y tab en sessionStorage
   * ------------------------------------------------------------ */
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_BUSQUEDA, busqueda);
    } catch { /* silent */ }
  }, [busqueda]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_ROL, filtroRol);
    } catch { /* silent */ }
  }, [filtroRol]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_ESTADO, filtroEstado);
    } catch { /* silent */ }
  }, [filtroEstado]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_PESTANA, pestanaActiva);
    } catch { /* silent */ }
  }, [pestanaActiva]);

  /* ------------------------------------------------------------
   * Carga inicial (usando userService con AbortController)
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!esAdmin) return;

    const controller = new AbortController();

    const cargar = async () => {
      try {
        const data = await userService.getAll(controller.signal);

        if (data.success && data.users) {
          setUsuarios(data.users);
          setError(null);
        } else {
          setError("Error al recuperar las cuentas.");
        }
      } catch (err) {
        if ((err as { code?: string })?.code === "ERR_CANCELED") return;
        console.error("Error en fetch de usuarios:", err);
        setError("No se pudo establecer conexión con el servidor backend.");
      } finally {
        setLoading(false);
      }
    };

    void cargar();

    return () => controller.abort();
  }, [esAdmin]);

  /* ------------------------------------------------------------
   * Recarga manual
   * ------------------------------------------------------------ */
  const recargarUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.getAll();

      if (data.success && data.users) {
        setUsuarios(data.users);
      } else {
        setError("Error al recuperar las cuentas.");
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

  // 🛠️ Optimización: Reseteo controlado de paginación basado en mutaciones de filtros
  const [filtrosPrevios, setFiltrosPrevios] = useState({
    busquedaDebounced,
    filtroRol,
    filtroEstado,
  });

  if (
    filtrosPrevios.busquedaDebounced !== busquedaDebounced ||
    filtrosPrevios.filtroRol !== filtroRol ||
    filtrosPrevios.filtroEstado !== filtroEstado
  ) {
    setFiltrosPrevios({ busquedaDebounced, filtroRol, filtroEstado });
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
   * Handlers usando userService
   * ------------------------------------------------------------ */

  /**
   * 🎯 Toggle con OPTIMISTIC UPDATE:
   * 1. Cambia el estado en UI inmediatamente (feedback instantáneo).
   * 2. Manda el request al backend.
   * 3. Si falla, revierte el cambio y muestra error.
   */
  const toggleEstadoUsuario = useCallback(async (id: string) => {
    setError(null);

    // Snapshot del estado actual (para revertir en caso de fallo)
    let estadoAnterior: EstadoUsuario | null = null;

    setUsuarios((prev) =>
      prev.map((u) => {
        if (u._id !== id) return u;
        estadoAnterior = u.estado;
        const nuevoEstadoOptimista: EstadoUsuario =
          u.estado === "activo" ? "inactivo" : "activo";
        return { ...u, estado: nuevoEstadoOptimista };
      })
    );

    try {
      const data = await userService.toggleStatus(id);

      if (data.success && data.estado) {
        // Sincronizamos con el estado real que devolvió el backend
        const estadoConfirmado = data.estado;
        setUsuarios((prev) =>
          prev.map((u) => (u._id === id ? { ...u, estado: estadoConfirmado } : u))
        );
      } else {
        // Revertir al estado anterior
        if (estadoAnterior !== null) {
          const estadoARevertir = estadoAnterior;
          setUsuarios((prev) =>
            prev.map((u) => (u._id === id ? { ...u, estado: estadoARevertir } : u))
          );
        }
        setError("No se pudo cambiar el estado de la cuenta.");
      }
    } catch (err) {
      console.error("Error al mutar el estado del usuario:", err);
      // Revertir al estado anterior
      if (estadoAnterior !== null) {
        const estadoARevertir = estadoAnterior;
        setUsuarios((prev) =>
          prev.map((u) => (u._id === id ? { ...u, estado: estadoARevertir } : u))
        );
      }
      setError("Error de comunicación. No se pudo impactar el cambio en el servidor.");
    }
  }, []);

  const manejarReenviarInvitacion = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userService.reenviarInvitacion(id);

      if (data.success) {
        const refresco = await userService.getAll();
        if (refresco.success && refresco.users) {
          setUsuarios(refresco.users);
        }
      } else {
        setError("No se pudo reenviar el correo de invitación.");
      }
    } catch (err) {
      console.error("Error al reenviar la invitación:", err);
      setError("Error de comunicación. No se pudo procesar el reenvío.");
    } finally {
      setLoading(false);
    }
  }, []);

  const manejarAperturaBorrado = useCallback((usuario: Persona) => {
    setUsuarioParaEliminar(usuario);
  }, []);

  const manejarCerrarBorrado = useCallback(() => {
    setUsuarioParaEliminar(null);
  }, []);

  const ejecutarEliminacionDefinitiva = useCallback(async () => {
    if (!usuarioParaEliminar) return;

    setLoading(true);
    setError(null);
    const idAEliminar = usuarioParaEliminar._id;

    try {
      const data = await userService.delete(idAEliminar);

      if (data.success) {
        setUsuarios((prev) => prev.filter((u) => u._id !== idAEliminar));
        setUsuarioParaEliminar(null);
      } else {
        setError("No se pudo eliminar al usuario.");
      }
    } catch (err) {
      console.error("Error al eliminar el usuario de Atlas:", err);
      setError("Error de comunicación. No se pudo eliminar el registro en el servidor.");
    } finally {
      setLoading(false);
    }
  }, [usuarioParaEliminar]);

  const manejarEditar = useCallback((usuario: Persona) => {
    setUsuarioEditando(usuario);
    setModalAbierto(true);
  }, []);

  const manejarAltaUsuario = useCallback(() => {
    setUsuarioEditando(null);
    setModalAbierto(true);
  }, []);

  const manejarCerrarModal = useCallback(() => {
    setModalAbierto(false);
    setUsuarioEditando(null);
  }, []);

  const manejarClickOrden = useCallback((columna: ColumnaOrdenable) => {
    setOrden((prev) => ({
      columna,
      direccion:
        prev.columna === columna && prev.direccion === "asc" ? "desc" : "asc",
    }));
  }, []);

  /* ------------------------------------------------------------
   * 🎯 Atajos de teclado globales
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!esAdmin) return;

    const manejarAtajo = (e: KeyboardEvent) => {
      // No disparar atajos si hay un modal abierto
      if (modalAbierto || usuarioParaEliminar !== null) return;

      // Ctrl + K → foco en búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputBusquedaRef.current?.focus();
        inputBusquedaRef.current?.select();
      }

      // Ctrl + N → nuevo usuario
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        manejarAltaUsuario();
      }
    };

    window.addEventListener("keydown", manejarAtajo);
    return () => window.removeEventListener("keydown", manejarAtajo);
  }, [esAdmin, modalAbierto, usuarioParaEliminar, manejarAltaUsuario]);

  if (!esAdmin) {
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
            aria-label="Actualizar listado de usuarios"
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

          <button
            onClick={manejarAltaUsuario}
            title="Nuevo usuario (Ctrl+N)"
            className="w-full lg:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-slate-900/10 hover:shadow transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
          >
            <HiPlus className="w-5 h-5" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* 🎛️ CONTROL DE PESTAÑAS (TABS) */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setPestanaActiva("lista")}
          className={`pb-3 transition-all relative cursor-pointer ${
            pestanaActiva === "lista"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          Lista de Usuarios
        </button>

        {/* 🔐 RENDERIZADO CONDICIONAL: Solo visible para superadmin */}
        {esSuperAdmin && (
          <button
            type="button"
            onClick={() => setPestanaActiva("auditoria")}
            className={`pb-3 transition-all relative cursor-pointer ${
              pestanaActiva === "auditoria"
                ? "text-slate-900 border-b-2 border-slate-900"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Historial de Auditoría
          </button>
        )}
      </div>

      {/* 🔄 RENDERIZADO DE CONTENIDO SEGÚN TAB */}
      {pestanaActiva === "lista" ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Barra de herramientas */}
          <div className="flex flex-col lg:flex-row gap-3 w-full items-center">
            <div className="relative w-full lg:flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <HiOutlineSearch className="w-5 h-5" />
              </span>
              <input
                ref={inputBusquedaRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, email o UF..."
                title="Buscar (Ctrl+K)"
                aria-label="Buscar usuarios (Ctrl+K)"
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition shadow-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
              {/* Filtro Rol */}
              <div className="relative w-full sm:w-56 shrink-0">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <HiOutlineFilter className="w-5 h-5" />
                </span>
                <select
                  value={filtroRol}
                  onChange={(e) => setFiltroRol(e.target.value as Rol | "todos")}
                  aria-label="Filtrar por rol"
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
              <div className="relative w-full sm:w-52 shrink-0">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <HiOutlineEye className="w-5 h-5" />
                </span>
                <select
                  value={filtroEstado}
                  onChange={(e) =>
                    setFiltroEstado(e.target.value as EstadoUsuario | "todos")
                  }
                  aria-label="Filtrar por estado"
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

          {/* Estado de carga u obtención de datos */}
          {loading && usuarios.length === 0 ? (
            <div className="py-20 text-center text-sm font-medium text-slate-500 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-3" />
              Cargando listado de usuarios desde MongoDB Atlas...
            </div>
          ) : error ? (
            <div
              className="p-6 text-center text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center gap-2"
              role="alert"
              aria-live="polite"
            >
              <HiOutlineShieldExclamation className="w-8 h-8 text-red-500" />
              <span>{error}</span>
              <button
                type="button"
                onClick={recargarUsuarios}
                className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Reintentar conexión
              </button>
            </div>
          ) : (
            /* 🎨 CONTENEDOR OPTIMIZADO: Evita el desborde y scroll vertical en el layout del dashboard */
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col min-h-0 relative">
              {loading && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10" />
              )}

              {/* Contenedor de la tabla aislado para scroll horizontal en resoluciones móviles */}
              <div className="w-full overflow-x-auto overflow-y-hidden min-h-0">
                <UsuariosTable
                  usuarios={usuariosPaginados}
                  orden={orden}
                  onClickOrden={manejarClickOrden}
                  onEditar={manejarEditar}
                  onToggleEstado={toggleEstadoUsuario}
                  onEliminar={manejarAperturaBorrado}
                  onReenviarInvitacion={manejarReenviarInvitacion}
                />
              </div>

              {/* Paginación anclada de manera estática al pie de la tarjeta */}
              <div className="border-t border-slate-100 bg-slate-50/50 rounded-b-2xl shrink-0">
                <Paginador
                  paginaActual={paginaEfectiva}
                  totalPaginas={totalPaginas}
                  indicePrimerItem={indicePrimerItem}
                  indiceUltimoItem={indiceUltimoItem}
                  totalFiltrados={usuariosFiltrados.length}
                  onCambioPagina={setPaginaActual}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 📝 Vista exclusiva del Historial de Auditoría */
        <HistorialAuditoria />
      )}

      {/* Modales correspondientes */}
      <FormAltaUsuario
        key={modalAbierto ? `abierto-${usuarioEditando?._id || "alta"}` : "cerrado"}
        modalAbierto={modalAbierto}
        onCerrar={manejarCerrarModal}
        onUsuarioCreado={recargarUsuarios}
        usuarioEditando={usuarioEditando}
      />

      <ModalConfirmacion
        abierto={usuarioParaEliminar !== null}
        titulo="¿Eliminar usuario definitivamente?"
        mensaje="¿Estás completamente seguro de que querés eliminar permanentemente a"
        nombreUsuario={usuarioParaEliminar?.name || ""}
        onCerrar={manejarCerrarBorrado}
        onConfirmar={ejecutarEliminacionDefinitiva}
        loading={loading && usuarios.length > 0}
      />
    </div>
  );
}