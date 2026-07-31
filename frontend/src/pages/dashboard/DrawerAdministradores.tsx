// src/pages/dashboard/DrawerAdministradores.tsx
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  HiX,
  HiOutlineUserGroup,
  HiOutlineMail,
  HiOutlineExclamationCircle,
  HiOutlineTrash,
  HiCheck,
} from "react-icons/hi";

// 🎯 Capa de servicios (M6.3)
import { consorcioService } from "@/services";
import type {
  AdministradorPopulado,
  AsignarAdminPayload,
} from "@/services/consorcioService";

// 🎯 Tipo de dominio
import type { Consorcio } from "@shared/types";

/* ============================================================
 * TIPOS
 * ============================================================ */

interface DrawerAdministradoresProps {
  /** Consorcio cuyos administradores se gestionan. Si es null, el drawer está cerrado. */
  consorcio: Consorcio | null;
  /** Callback para cerrar el drawer. */
  onCerrar: () => void;
}

type RolAdmin = AsignarAdminPayload["role"];

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function DrawerAdministradores({
  consorcio,
  onCerrar,
}: DrawerAdministradoresProps) {
  const [administradores, setAdministradores] = useState<AdministradorPopulado[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario de alta
  const [email, setEmail] = useState<string>("");
  const [rol, setRol] = useState<RolAdmin>("admin");
  const [asignando, setAsignando] = useState<boolean>(false);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [exitoAlta, setExitoAlta] = useState<string | null>(null);

  // Revocación en curso (membresiaId)
  const [revocando, setRevocando] = useState<string | null>(null);

  const consorcioId = consorcio?._id;

  /* ------------------------------------------------------------
   * Carga de administradores al abrir
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!consorcioId) return;

    const controller = new AbortController();
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await consorcioService.getAdministradores(consorcioId, controller.signal);
        if (!activo) return;
        if (data.ok && data.administradores) {
          setAdministradores(data.administradores);
        } else {
          setError(data.msg || "No se pudieron cargar los administradores.");
        }
      } catch (err) {
        if ((err as { code?: string })?.code === "ERR_CANCELED") return;
        if (activo) setError("Error de conexión al cargar los administradores.");
      } finally {
        if (activo) setCargando(false);
      }
    };

    void cargar();

    return () => {
      activo = false;
      controller.abort();
    };
  }, [consorcioId]);

  /* ------------------------------------------------------------
   * Bloqueo de scroll del body mientras el drawer está abierto
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!consorcioId) return;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [consorcioId]);

  /* ------------------------------------------------------------
   * Cierre con Escape
   * ------------------------------------------------------------ */
  useEffect(() => {
    if (!consorcioId) return;
    const manejarEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !asignando && !revocando) onCerrar();
    };
    document.addEventListener("keydown", manejarEscape);
    return () => document.removeEventListener("keydown", manejarEscape);
  }, [consorcioId, asignando, revocando, onCerrar]);

  /* ------------------------------------------------------------
   * Asignar administrador
   * ------------------------------------------------------------ */
  const handleAsignar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!consorcioId) return;

      if (!email.trim()) {
        setErrorAlta("El email es obligatorio.");
        return;
      }

      setAsignando(true);
      setErrorAlta(null);
      setExitoAlta(null);

      try {
        const data = await consorcioService.asignarAdministrador(consorcioId, {
          email: email.trim(),
          role: rol,
        });

        if (data.ok) {
          setExitoAlta(data.msg || "Administrador asignado con éxito.");
          setEmail("");
          // Refrescar el listado
          const refresh = await consorcioService.getAdministradores(consorcioId);
          if (refresh.ok && refresh.administradores) {
            setAdministradores(refresh.administradores);
          }
        } else {
          setErrorAlta(data.msg || "No se pudo asignar el administrador.");
        }
      } catch (err) {
        const msg =
          (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg ||
          "Error al asignar el administrador.";
        setErrorAlta(msg);
      } finally {
        setAsignando(false);
      }
    },
    [consorcioId, email, rol]
  );

  /* ------------------------------------------------------------
   * Revocar administrador
   * ------------------------------------------------------------ */
  const handleRevocar = useCallback(
    async (membresiaId: string) => {
      if (!consorcioId || revocando) return;
      setRevocando(membresiaId);
      setError(null);

      try {
        const data = await consorcioService.revocarAdministrador(consorcioId, membresiaId);
        if (data.ok) {
          setAdministradores((prev) => prev.filter((a) => a._id !== membresiaId));
        } else {
          setError(data.msg || "No se pudo revocar el administrador.");
        }
      } catch (err) {
        const msg =
          (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg ||
          "Error al revocar el administrador.";
        setError(msg);
      } finally {
        setRevocando(null);
      }
    },
    [consorcioId, revocando]
  );

  // Drawer cerrado → no renderizamos nada.
  if (!consorcio) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-120 overflow-hidden flex items-end lg:items-start lg:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-admins-titulo"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={() => !asignando && !revocando && onCerrar()}
        aria-label="Cerrar panel de administradores"
      />

      {/* Panel */}
      <div className="relative w-full lg:w-[28rem] h-[88vh] lg:h-screen bg-white shadow-2xl rounded-t-3xl lg:rounded-none flex flex-col animate-in slide-in-from-bottom lg:slide-in-from-right duration-300 z-10">
        {/* Handle mobile */}
        <div
          className="w-12 h-1 bg-slate-200 rounded-full mx-auto my-4 lg:hidden cursor-pointer"
          onClick={onCerrar}
          role="button"
          aria-label="Cerrar panel"
        />

        {/* Header */}
        <div className="border-b border-slate-100 p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 id="drawer-admins-titulo" className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
                <HiOutlineUserGroup className="w-5 h-5 text-slate-400" />
                Administradores
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{consorcio.nombre}</p>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar panel de administradores"
              className="text-slate-400 hover:text-slate-600 transition p-1.5 cursor-pointer rounded-lg hover:bg-slate-50 shrink-0"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulario de alta */}
        <form onSubmit={handleAsignar} className="p-5 md:p-6 border-b border-slate-100 space-y-3">
          {errorAlta && (
            <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold rounded-lg" role="alert">
              <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorAlta}</span>
            </div>
          )}
          {exitoAlta && (
            <div className="flex items-start gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-lg" role="status">
              <HiCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{exitoAlta}</span>
            </div>
          )}

          <div>
            <label htmlFor="admin-email" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
              Email del usuario
            </label>
            <div className="relative">
              <HiOutlineMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorAlta(null); setExitoAlta(null); }}
                placeholder="usuario@ejemplo.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label htmlFor="admin-rol" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                Rol
              </label>
            <select
            id="admin-rol"
            value={rol}
            onChange={(e) => setRol(e.target.value as RolAdmin)}
            className="w-full px-3 py-2.5 text-sm text-slate-800 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition cursor-pointer"
            >
            <option value="admin" className="text-slate-800">Admin</option>
            <option value="superadmin" className="text-slate-800">Superadmin</option>
            </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={asignando}
                className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition cursor-pointer active:scale-[0.98] disabled:opacity-50 shadow-md shadow-slate-900/10 whitespace-nowrap"
              >
                <span className="text-sm leading-none">+</span>
                <span>{asignando ? "Asignando..." : "Asignar"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Listado de administradores */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2 p-2.5 bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold rounded-lg" role="alert">
              <HiOutlineExclamationCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {cargando ? (
            <p className="text-center text-xs font-semibold text-slate-400 py-8 animate-pulse" role="status">
              Cargando administradores...
            </p>
          ) : administradores.length === 0 ? (
            <p className="text-center text-xs font-semibold text-slate-400 py-8">
              Este consorcio no tiene administradores asignados.
            </p>
          ) : (
            <ul className="space-y-2">
              {administradores.map((admin) => {
                const estaRevocando = revocando === admin._id;
                const nombre = admin.userId?.name ?? "Usuario eliminado";
                const email = admin.userId?.email ?? "—";

                return (
                  <li key={admin._id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 font-black text-sm uppercase">
                      {nombre.charAt(0)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">{nombre}</p>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                          admin.role === "superadmin"
                            ? "text-violet-700 bg-violet-50 border border-violet-100"
                            : "text-teal-700 bg-teal-50 border border-teal-100"
                        }`}>
                          {admin.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevocar(admin._id)}
                      disabled={estaRevocando}
                      aria-label={`Revocar a ${nombre}`}
                      className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 border border-red-200 py-1.5 px-2.5 rounded-lg transition cursor-pointer disabled:opacity-50"
                    >
                      <HiOutlineTrash className="w-3.5 h-3.5" />
                      <span>{estaRevocando ? "..." : "Revocar"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
