// src/pages/dashboard/ConfiguracionConsorcio.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  HiOutlineOfficeBuilding,
  HiCheck,
  HiOutlineExclamationCircle,
} from "react-icons/hi";

// 🎯 Capa de servicios (Fase 3)
import { consorcioService } from "@/services";
import type { ActualizarConsorcioPayload } from "@/services";

// 🎯 Hook para título dinámico de pestaña
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// 🎯 Hook de contexto de consorcio activo (Fase M4)
import { useConsorcio } from "@/hooks/useConsorcio";

// 🆕 M6.0 — Sincronización del consorcio activo cacheado en sesión
import { actualizarConsorcioActivoSesion } from "@/lib/session";

/* ============================================================
 * CONSTANTES
 * ============================================================ */

// Estado inicial vacío del formulario (todos los campos como string).
const FORM_VACIO: Required<ActualizarConsorcioPayload> = {
  nombre: "",
  direccion: "",
  cuit: "",
  localidad: "",
  provincia: "",
  codigoPostal: "",
  notas: "",
};

type FormConsorcio = Required<ActualizarConsorcioPayload>;

/* ============================================================
 * COMPONENTE
 * ============================================================ */

export default function ConfiguracionConsorcio() {
  useDocumentTitle("Configuración del Consorcio");

  // 🎯 Consorcio activo — de acá sale el _id a editar.
  const { consorcioActivo } = useConsorcio();
  const consorcioId = consorcioActivo?._id;

  const [form, setForm] = useState<FormConsorcio>(FORM_VACIO);

  // Snapshot de los valores originales (para detectar cambios sin guardar).
  // Es `useState` (no `useRef`) porque se lee durante el render para
  // habilitar/deshabilitar el botón "Guardar" (regla react-hooks/refs).
  const [valoresIniciales, setValoresIniciales] = useState<FormConsorcio | null>(null);

  const [cargando, setCargando] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  /* ------------------------------------------------------------
   * Carga inicial: precargar el form con los datos del consorcio
   * ------------------------------------------------------------ */
  useEffect(() => {
    // Si no hay consorcio activo, no hacemos fetch. El caso se maneja como
    // una rama del render (sin setState síncrono → regla set-state-in-effect).
    if (!consorcioId) return;

    const controller = new AbortController();
    let activo = true;

    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const data = await consorcioService.getById(consorcioId, controller.signal);
        if (!activo) return;

        if (data.ok && data.consorcio) {
          const c = data.consorcio;
          const precargado: FormConsorcio = {
            nombre: c.nombre ?? "",
            direccion: c.direccion ?? "",
            cuit: c.cuit ?? "",
            localidad: c.localidad ?? "",
            provincia: c.provincia ?? "",
            codigoPostal: c.codigoPostal ?? "",
            notas: c.notas ?? "",
          };
          setForm(precargado);
          setValoresIniciales(precargado);
        } else {
          setError(data.msg || "No se pudieron cargar los datos del consorcio.");
        }
      } catch (err) {
        if ((err as { code?: string })?.code === "ERR_CANCELED") return;
        if (activo) setError("Error de conexión al cargar los datos del consorcio.");
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
   * Handler genérico de inputs
   * ------------------------------------------------------------ */
  const handleChange = useCallback(
    (campo: keyof FormConsorcio) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const valor = e.target.value;
        setForm((prev) => ({ ...prev, [campo]: valor }));
        // Al editar, limpiamos mensajes previos de éxito/error.
        setExito(null);
        setError(null);
      },
    []
  );

  /* ------------------------------------------------------------
   * ¿Hay cambios sin guardar? (valor derivado — se lee en el render)
   * ------------------------------------------------------------ */
  const hayCambios = useMemo<boolean>(() => {
    if (!valoresIniciales) return false;
    return (Object.keys(form) as (keyof FormConsorcio)[]).some(
      (k) => form[k].trim() !== valoresIniciales[k].trim()
    );
  }, [form, valoresIniciales]);

  /* ------------------------------------------------------------
   * Guardar cambios
   * ------------------------------------------------------------ */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!consorcioId) return;

      // Validación mínima en cliente (el backend valida en profundidad).
      if (!form.nombre.trim()) {
        setError("El nombre del consorcio es obligatorio.");
        return;
      }
      if (!form.direccion.trim()) {
        setError("La dirección es obligatoria.");
        return;
      }

      setGuardando(true);
      setError(null);
      setExito(null);

      try {
        const payload: ActualizarConsorcioPayload = {
          nombre: form.nombre.trim(),
          direccion: form.direccion.trim(),
          cuit: form.cuit.trim(),
          localidad: form.localidad.trim(),
          provincia: form.provincia.trim(),
          codigoPostal: form.codigoPostal.trim(),
          notas: form.notas.trim(),
        };

        const data = await consorcioService.update(consorcioId, payload);

        if (data.ok && data.consorcio) {
          const c = data.consorcio;
          const actualizado: FormConsorcio = {
            nombre: c.nombre ?? "",
            direccion: c.direccion ?? "",
            cuit: c.cuit ?? "",
            localidad: c.localidad ?? "",
            provincia: c.provincia ?? "",
            codigoPostal: c.codigoPostal ?? "",
            notas: c.notas ?? "",
          };

          // 🆕 M6.0 — ¿Cambiaron los datos que se muestran en el topbar/sesión?
          //    (nombre o dirección). Si sí, hay que sincronizar el cache de
          //    sesión y recargar para que TODA la app refleje el cambio.
          const cambioContextoSesion =
            (valoresIniciales?.nombre.trim() ?? "") !== actualizado.nombre.trim() ||
            (valoresIniciales?.direccion.trim() ?? "") !== actualizado.direccion.trim();

          setForm(actualizado);
          setValoresIniciales(actualizado);

          if (cambioContextoSesion) {
            // Actualizamos el consorcio activo cacheado y recargamos la app,
            // igual que el patrón de "cambiar de consorcio" (SelectorConsorcio).
            actualizarConsorcioActivoSesion({
              nombre: actualizado.nombre,
              direccion: actualizado.direccion,
            });
            window.location.reload();
            return;
          }

          setExito(data.msg || "Datos del consorcio actualizados con éxito.");
        } else {
          setError(data.msg || "No se pudieron guardar los cambios.");
        }
      } catch (err) {
        // El backend responde 400 con msg si hay validación fallida (ej: CUIT).
        const msg =
          (err as { response?: { data?: { msg?: string } } })?.response?.data?.msg ||
          "Error al guardar los cambios.";
        setError(msg);
      } finally {
        setGuardando(false);
      }
    },
    [consorcioId, form, valoresIniciales]
  );

  /* ------------------------------------------------------------
   * Render
   * ------------------------------------------------------------ */

  // Caso "sin consorcio activo": rama derivada del render (no usa estado),
  // debe evaluarse ANTES que `cargando` porque el efecto no hace fetch aquí.
  if (!consorcioId) {
    return (
      <div
        className="flex h-60 items-center justify-center gap-2 text-slate-400 font-medium text-sm"
        role="alert"
        aria-live="polite"
      >
        <HiOutlineExclamationCircle className="w-5 h-5" />
        No hay un consorcio activo en tu sesión.
      </div>
    );
  }

  if (cargando) {
    return (
      <div
        className="flex h-60 items-center justify-center text-slate-400 font-medium"
        role="status"
        aria-live="polite"
      >
        Cargando datos del consorcio...
      </div>
    );
  }

  return (
    <div>
      {/* CABECERA */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-[32px] font-extrabold tracking-tight text-[#0f172a] flex items-center gap-2.5">
          <HiOutlineOfficeBuilding className="w-7 h-7 text-slate-400" />
          Configuración del Consorcio
        </h1>
        <p className="text-[#64748b] text-xs md:text-sm mt-1">
          Editá los datos generales y administrativos del consorcio activo.
        </p>
      </div>

      {/* FORMULARIO — ancho completo, alineado con el header (patrón ListaUsuarios) */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-xs w-full"
      >
        {/* Mensaje de error */}
        {error && (
          <div
            className="mb-6 flex items-start gap-2 p-3.5 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl"
            role="alert"
            aria-live="polite"
          >
            <HiOutlineExclamationCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Mensaje de éxito */}
        {exito && (
          <div
            className="mb-6 flex items-start gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl"
            role="status"
            aria-live="polite"
          >
            <HiCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{exito}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Nombre (obligatorio, ancho completo) */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="consorcio-nombre" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
              Nombre del Consorcio <span className="text-red-500">*</span>
            </label>
            <input
              id="consorcio-nombre"
              type="text"
              required
              value={form.nombre}
              onChange={handleChange("nombre")}
              placeholder="Ej: Edificio Talcahuano 500"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
            />
          </div>

          {/* Dirección (obligatorio, ancho completo) */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="consorcio-direccion" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
              Dirección <span className="text-red-500">*</span>
            </label>
            <input
              id="consorcio-direccion"
              type="text"
              required
              value={form.direccion}
              onChange={handleChange("direccion")}
              placeholder="Ej: Talcahuano 500"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
            />
          </div>

          {/* CUIT */}
          <div>
            <label htmlFor="consorcio-cuit" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
              CUIT
            </label>
            <input
              id="consorcio-cuit"
              type="text"
              value={form.cuit}
              onChange={handleChange("cuit")}
              placeholder="30-12345678-9"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
            />
          </div>

          {/* Código Postal */}
          <div>
            <label htmlFor="consorcio-cp" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
              Código Postal
            </label>
            <input
              id="consorcio-cp"
              type="text"
              value={form.codigoPostal}
              onChange={handleChange("codigoPostal")}
              placeholder="Ej: 1425"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
            />
          </div>

          {/* Localidad */}
          <div>
            <label htmlFor="consorcio-localidad" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
              Localidad
            </label>
            <input
              id="consorcio-localidad"
              type="text"
              value={form.localidad}
              onChange={handleChange("localidad")}
              placeholder="Ej: CABA"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
            />
          </div>

          {/* Provincia */}
          <div>
            <label htmlFor="consorcio-provincia" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
              Provincia
            </label>
            <input
              id="consorcio-provincia"
              type="text"
              value={form.provincia}
              onChange={handleChange("provincia")}
              placeholder="Ej: Buenos Aires"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition"
            />
          </div>

          {/* Notas (ancho completo) */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label htmlFor="consorcio-notas" className="block text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1.5">
              Notas administrativas
            </label>
            <textarea
              id="consorcio-notas"
              rows={4}
              value={form.notas}
              onChange={handleChange("notas")}
              placeholder="Observaciones internas sobre el edificio (visibles solo para administradores)."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 transition resize-y"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-end gap-3">
          <span className="text-[11px] font-semibold text-slate-400 mr-auto">
            {hayCambios ? "Tenés cambios sin guardar." : "Sin cambios pendientes."}
          </span>
          <button
            type="submit"
            disabled={guardando || !hayCambios}
            className="flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-slate-800 text-white text-xs font-bold py-3 px-6 rounded-xl transition cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10"
          >
            <HiCheck className="w-4 h-4" />
            <span>{guardando ? "Guardando..." : "Guardar cambios"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
