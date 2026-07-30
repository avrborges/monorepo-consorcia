// backend/src/controllers/consorcioController.ts
import type { Request, Response } from "express";
import { Types } from "mongoose";

import Consorcio from "../models/Consorcio";
import type { UserDocument } from "../models/User";
import { registrarLog } from "../services/loggerService";

/* ============================================================
 * TIPOS DE PAYLOAD
 * ============================================================ */

interface ParamsId {
  id: string;
}

interface UpdateConsorcioBody {
  nombre?: string;
  direccion?: string;
  cuit?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  notas?: string;
}

/* ============================================================
 * CONSTANTES
 * ============================================================ */

/**
 * Campos del consorcio que se permiten editar en M6.0.
 * NO se incluye `activo`: activar/desactivar se maneja en el ABM (M6).
 */
const CAMPOS_EDITABLES = [
  "nombre",
  "direccion",
  "cuit",
  "localidad",
  "provincia",
  "codigoPostal",
  "notas",
] as const;

type CampoEditable = (typeof CAMPOS_EDITABLES)[number];

// Todos los campos editables son `string` en IConsorcio → tipo auxiliar
// para asignarlos de forma type-safe sobre el documento hidratado.
type RegistroEditable = Record<CampoEditable, string>;

/* ============================================================
 * HELPERS
 * ============================================================ */

const obtenerMensajeError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

/**
 * Interface mínima con los datos de auth que necesitan los helpers.
 *
 * Recibir esta interface (en vez del tipo `Request` completo) evita los
 * conflictos con los generics de Express (`Request<ParamsId, ...>` vs
 * `Request<ParamsDictionary, ...>`), igual que el patrón `RequestConConsorcio`
 * usado en unidadController.
 */
interface RequestConAuth {
  user?: UserDocument;
  activeConsorcioId?: string;
}

/**
 * Determina si el usuario del request puede gestionar consorcios.
 * Regla M6.0: solo `superadmin` (de su consorcio) o `super_admin_global`.
 */
const puedeGestionarConsorcio = (req: RequestConAuth): boolean => {
  const usuario = req.user;
  if (!usuario) return false;
  return usuario.role === "superadmin" || usuario.rolGlobal === "super_admin_global";
};

/**
 * Determina si el usuario es super_admin_global (bypass de scope).
 */
const esSuperGlobal = (req: RequestConAuth): boolean => {
  return req.user?.rolGlobal === "super_admin_global";
};

/* ============================================================
 * MÉTODO: Obtener los datos completos de un consorcio (M6.0)
 * ============================================================
 *
 * Usado por la pantalla "Configuración del Consorcio" para precargar el
 * formulario con los datos actuales (el ConsorcioActivoSesion del token
 * solo trae _id/nombre/direccion, insuficiente para editar cuit, etc.).
 */
export const getConsorcio = async (
  req: Request<ParamsId>,
  res: Response
) => {
  try {
    // 🔒 Gating fino: solo superadmin o super_admin_global
    if (!puedeGestionarConsorcio(req)) {
      return res.status(403).json({
        ok: false,
        msg: "No tenés permisos para ver la configuración del consorcio.",
      });
    }

    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El identificador del consorcio no tiene un formato válido.",
      });
    }

    // 🔒 Scope: un superadmin solo puede ver SU consorcio activo.
    //    El super_admin_global puede ver cualquiera.
    if (!esSuperGlobal(req) && id !== req.activeConsorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "Solo podés ver los datos de tu consorcio activo.",
      });
    }

    const consorcio = await Consorcio.findById(id);

    if (!consorcio) {
      return res.status(404).json({
        ok: false,
        msg: "El consorcio no existe.",
      });
    }

    return res.status(200).json({
      ok: true,
      consorcio,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener los datos del consorcio.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * MÉTODO: Editar los datos de un consorcio (M6.0)
 * ============================================================
 *
 * Permisos: solo `superadmin` (limitado a su consorcio activo) o
 * `super_admin_global` (cualquier consorcio).
 *
 * Auditoría: registra CONSORCIO_EDITADO con snapshot anterior/nuevo por
 * cada campo efectivamente modificado (mismo patrón que HABITANTES_VINCULADOS).
 * Si no hubo cambios reales, NO audita.
 */
export const updateConsorcio = async (
  req: Request<ParamsId, unknown, UpdateConsorcioBody>,
  res: Response
) => {
  try {
    // 🔒 Gating fino: solo superadmin o super_admin_global
    if (!puedeGestionarConsorcio(req)) {
      return res.status(403).json({
        ok: false,
        msg: "No tenés permisos para editar el consorcio.",
      });
    }

    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El identificador del consorcio no tiene un formato válido.",
      });
    }

    // 🔒 Scope: un superadmin solo puede editar SU consorcio activo.
    //    El super_admin_global puede editar cualquiera.
    if (!esSuperGlobal(req) && id !== req.activeConsorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "Solo podés editar los datos de tu consorcio activo.",
      });
    }

    const consorcio = await Consorcio.findById(id);

    if (!consorcio) {
      return res.status(404).json({
        ok: false,
        msg: "El consorcio no existe.",
      });
    }

    // 🎯 Detección de cambios: solo procesamos campos enviados como string
    //    que difieran del valor actual. Construimos el snapshot anterior/nuevo
    //    para la auditoría (patrón consistente con HABITANTES_VINCULADOS).
    const cambios: Record<string, unknown> = {};

    for (const campo of CAMPOS_EDITABLES) {
      const raw = req.body[campo];
      // Solo aceptamos strings; undefined (campo no enviado) se ignora.
      if (typeof raw !== "string") continue;

      const nuevoValor = raw.trim();
      const valorActual = ((consorcio as unknown as RegistroEditable)[campo] ?? "") as string;

      if (nuevoValor !== valorActual) {
        cambios[`${campo}Anterior`] = valorActual;
        cambios[`${campo}Nuevo`] = nuevoValor;
        (consorcio as unknown as RegistroEditable)[campo] = nuevoValor;
      }
    }

    // Sin cambios reales → no tocamos la base ni auditamos.
    if (Object.keys(cambios).length === 0) {
      return res.status(200).json({
        ok: true,
        msg: "No se detectaron cambios para guardar.",
        consorcio,
      });
    }

    // 💾 Guardar (dispara los validators del schema: CUIT, minlength, etc.)
    await consorcio.save();

    // 🎯 Auditoría inmutable: CONSORCIO_EDITADO con snapshot de lo modificado.
    await registrarLog({
      req,
      accion: "CONSORCIO_EDITADO",
      tipoEntidad: "CONSORCIO",
      entidadId: consorcio._id,
      detalles: {
        nombreEntidad: consorcio.nombre,
        cambios,
      },
    });

    return res.status(200).json({
      ok: true,
      msg: "Datos del consorcio actualizados con éxito.",
      consorcio,
    });
  } catch (error) {
    // Errores de validación de Mongoose → 400 (CUIT inválido, nombre corto, etc.)
    if (error instanceof Error && error.name === "ValidationError") {
      return res.status(400).json({
        ok: false,
        msg: "Hay datos inválidos en el formulario.",
        error: obtenerMensajeError(error),
      });
    }

    return res.status(500).json({
      ok: false,
      msg: "Error al actualizar los datos del consorcio.",
      error: obtenerMensajeError(error),
    });
  }
};
