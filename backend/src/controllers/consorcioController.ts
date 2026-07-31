// backend/src/controllers/consorcioController.ts
import type { Request, Response } from "express";
import { Types } from "mongoose";

import Consorcio from "../models/Consorcio";
import Membresia from "../models/Membresia"; // 🆕 M6.3
import User, { type UserDocument } from "../models/User"; // 🆕 M6.3 (User además del type)
import { registrarLog } from "../services/loggerService";

/* ============================================================
 * TIPOS DE PAYLOAD
 * ============================================================ */

interface ParamsId {
  id: string;
}

// 🆕 M6.3 — Params con id de consorcio + id de membresía (revocar)
interface ParamsAdmin {
  id: string;
  membresiaId: string;
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

// 🆕 M6.1 — Payload de creación de consorcio
interface CrearConsorcioBody {
  nombre?: string;
  direccion?: string;
  cuit?: string;
  localidad?: string;
  provincia?: string;
  codigoPostal?: string;
  notas?: string;
}

// 🆕 M6.1 — Payload del toggle de estado (activar/desactivar)
interface ToggleEstadoBody {
  activo?: boolean;
}

// 🆕 M6.3 — Payload para asignar un administrador a un consorcio
interface AsignarAdminBody {
  email?: string;
  role?: "admin" | "superadmin";
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

// 🆕 M6.3 — Roles administrativos que se pueden asignar/revocar desde el ABM.
//    (propietario/inquilino provienen de la asignación de unidades, no de acá)
const ROLES_ADMINISTRATIVOS = ["admin", "superadmin"] as const;
type RolAdministrativo = (typeof ROLES_ADMINISTRATIVOS)[number];

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

/**
 * 🆕 M6.1 — Gating estricto del ABM de consorcios.
 * Crear, listar y activar/desactivar consorcios es EXCLUSIVO del
 * super_admin_global (a diferencia de editar, que también permite superadmin).
 */
const esSoloSuperGlobal = (req: RequestConAuth): boolean => {
  return esSuperGlobal(req);
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
 * 🆕 MÉTODO: Listar todos los consorcios (M6.1)
 * ============================================================
 *
 * Devuelve TODOS los consorcios (activos e inactivos) para el ABM.
 * Permisos: EXCLUSIVO super_admin_global.
 * Orden: activos primero, luego por nombre ascendente.
 */
export const listarConsorcios = async (
  req: Request,
  res: Response
) => {
  try {
    // 🔒 Solo super_admin_global puede listar el universo de consorcios.
    if (!esSoloSuperGlobal(req)) {
      return res.status(403).json({
        ok: false,
        msg: "Solo el administrador global puede listar los consorcios.",
      });
    }

    // Activos primero (activo: -1 → true antes que false), luego por nombre.
    const consorcios = await Consorcio.find({}).sort({ activo: -1, nombre: 1 });

    return res.status(200).json({
      ok: true,
      consorcios,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al listar los consorcios.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * 🆕 MÉTODO: Crear un nuevo consorcio (M6.1)
 * ============================================================
 *
 * Permisos: EXCLUSIVO super_admin_global.
 * Auditoría: registra CONSORCIO_CREADO con snapshot de los datos iniciales.
 * El nuevo consorcio nace activo (activo: true por default del schema).
 */
export const crearConsorcio = async (
  req: Request<unknown, unknown, CrearConsorcioBody>,
  res: Response
) => {
  try {
    // 🔒 Solo super_admin_global puede crear consorcios.
    if (!esSoloSuperGlobal(req)) {
      return res.status(403).json({
        ok: false,
        msg: "Solo el administrador global puede crear consorcios.",
      });
    }

    const {
      nombre,
      direccion,
      cuit,
      localidad,
      provincia,
      codigoPostal,
      notas,
    } = req.body;

    // Validación mínima de obligatorios (el schema valida en profundidad).
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        msg: "El nombre del consorcio es obligatorio.",
      });
    }
    if (!direccion || !direccion.trim()) {
      return res.status(400).json({
        ok: false,
        msg: "La dirección del consorcio es obligatoria.",
      });
    }

    const nuevoConsorcio = new Consorcio({
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      cuit: (cuit ?? "").trim(),
      localidad: (localidad ?? "").trim(),
      provincia: (provincia ?? "").trim(),
      codigoPostal: (codigoPostal ?? "").trim(),
      notas: (notas ?? "").trim(),
      // activo: true → viene por default del schema
    });

    await nuevoConsorcio.save();

    // 🎯 Auditoría: CONSORCIO_CREADO con snapshot de los datos iniciales.
    await registrarLog({
      req,
      accion: "CONSORCIO_CREADO",
      tipoEntidad: "CONSORCIO",
      entidadId: nuevoConsorcio._id,
      detalles: {
        nombreEntidad: nuevoConsorcio.nombre,
        cambios: {
          nombre: nuevoConsorcio.nombre,
          direccion: nuevoConsorcio.direccion,
          cuit: nuevoConsorcio.cuit,
          localidad: nuevoConsorcio.localidad,
          provincia: nuevoConsorcio.provincia,
          codigoPostal: nuevoConsorcio.codigoPostal,
        },
      },
    });

    return res.status(201).json({
      ok: true,
      msg: "Consorcio creado con éxito.",
      consorcio: nuevoConsorcio,
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
      msg: "Error al crear el consorcio.",
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

/* ============================================================
 * 🆕 MÉTODO: Activar / desactivar un consorcio (M6.1)
 * ============================================================
 *
 * Baja LÓGICA: nunca se borra el consorcio. Se alterna el campo `activo`.
 * Un consorcio inactivo preserva todos sus datos (unidades, ocupaciones,
 * auditoría) para trazabilidad legal, pero sus usuarios no pueden acceder.
 *
 * Permisos: EXCLUSIVO super_admin_global.
 * Auditoría: CONSORCIO_ACTIVADO o CONSORCIO_DESACTIVADO según el nuevo estado.
 *
 * El body puede traer `{ activo: boolean }` para forzar un estado; si no
 * viene, se hace toggle del estado actual.
 */
export const toggleEstadoConsorcio = async (
  req: Request<ParamsId, unknown, ToggleEstadoBody>,
  res: Response
) => {
  try {
    // 🔒 Solo super_admin_global puede cambiar el estado de un consorcio.
    if (!esSoloSuperGlobal(req)) {
      return res.status(403).json({
        ok: false,
        msg: "Solo el administrador global puede activar o desactivar consorcios.",
      });
    }

    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El identificador del consorcio no tiene un formato válido.",
      });
    }

    const consorcio = await Consorcio.findById(id);

    if (!consorcio) {
      return res.status(404).json({
        ok: false,
        msg: "El consorcio no existe.",
      });
    }

    const estadoAnterior = consorcio.activo;
    // Si el body trae `activo` explícito, lo usamos; si no, toggle.
    const nuevoEstado =
      typeof req.body.activo === "boolean" ? req.body.activo : !estadoAnterior;

    // Sin cambio real de estado → no tocamos la base ni auditamos.
    if (nuevoEstado === estadoAnterior) {
      return res.status(200).json({
        ok: true,
        msg: `El consorcio ya se encuentra ${estadoAnterior ? "activo" : "inactivo"}.`,
        consorcio,
      });
    }

    consorcio.activo = nuevoEstado;
    await consorcio.save();

    // 🎯 Auditoría: acción según el nuevo estado.
    await registrarLog({
      req,
      accion: nuevoEstado ? "CONSORCIO_ACTIVADO" : "CONSORCIO_DESACTIVADO",
      tipoEntidad: "CONSORCIO",
      entidadId: consorcio._id,
      detalles: {
        nombreEntidad: consorcio.nombre,
        cambios: {
          estadoAnterior: estadoAnterior ? "activo" : "inactivo",
          estadoNuevo: nuevoEstado ? "activo" : "inactivo",
        },
      },
    });

    return res.status(200).json({
      ok: true,
      msg: `Consorcio ${nuevoEstado ? "activado" : "desactivado"} con éxito.`,
      consorcio,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al cambiar el estado del consorcio.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * 🆕 MÉTODO: Listar administradores de un consorcio (M6.3)
 * ============================================================
 *
 * Devuelve las membresías ACTIVAS con rol administrativo (admin/superadmin)
 * de un consorcio, con el usuario populado (name/email).
 * Permisos: EXCLUSIVO super_admin_global.
 */
export const listarAdministradores = async (
  req: Request<ParamsId>,
  res: Response
) => {
  try {
    if (!esSoloSuperGlobal(req)) {
      return res.status(403).json({
        ok: false,
        msg: "Solo el administrador global puede ver los administradores del consorcio.",
      });
    }

    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El identificador del consorcio no tiene un formato válido.",
      });
    }

    const consorcio = await Consorcio.findById(id).select("_id");
    if (!consorcio) {
      return res.status(404).json({
        ok: false,
        msg: "El consorcio no existe.",
      });
    }

    // Membresías administrativas activas, con el usuario populado.
    const administradores = await Membresia.find({
      consorcioId: consorcio._id,
      role: { $in: ROLES_ADMINISTRATIVOS },
      estado: "activa",
    })
      .populate("userId", "name email telefono")
      .sort({ role: 1, createdAt: 1 });

    return res.status(200).json({
      ok: true,
      administradores,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al listar los administradores del consorcio.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * 🆕 MÉTODO: Asignar un administrador a un consorcio (M6.3)
 * ============================================================
 *
 * Busca un usuario existente por email y le crea (o reactiva) una membresía
 * administrativa (admin/superadmin) en el consorcio.
 *
 * Idempotencia: si ya existe una membresía de ese {userId, consorcioId, role}:
 *   - activa   → responde que ya es administrador (sin duplicar).
 *   - inactiva → la REACTIVA (estado: "activa") en vez de crear otra.
 *
 * Permisos: EXCLUSIVO super_admin_global.
 * Auditoría: ADMIN_ASIGNADO (TipoEntidad CONSORCIO, entidadId = consorcioId).
 */
export const asignarAdministrador = async (
  req: Request<ParamsId, unknown, AsignarAdminBody>,
  res: Response
) => {
  try {
    if (!esSoloSuperGlobal(req)) {
      return res.status(403).json({
        ok: false,
        msg: "Solo el administrador global puede asignar administradores.",
      });
    }

    const { id } = req.params;
    const { email, role } = req.body;

    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El identificador del consorcio no tiene un formato válido.",
      });
    }

    // Validación del email
    if (!email || !email.trim()) {
      return res.status(400).json({
        ok: false,
        msg: "El email del usuario es obligatorio.",
      });
    }

    // Validación del rol administrativo
    if (!role || !ROLES_ADMINISTRATIVOS.includes(role as RolAdministrativo)) {
      return res.status(400).json({
        ok: false,
        msg: "El rol debe ser 'admin' o 'superadmin'.",
      });
    }

    const consorcio = await Consorcio.findById(id).select("_id nombre");
    if (!consorcio) {
      return res.status(404).json({
        ok: false,
        msg: "El consorcio no existe.",
      });
    }

    // Buscar el usuario por email (debe existir)
    const usuario = await User.findOne({ email: email.trim().toLowerCase() }).select(
      "_id name email"
    );
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: `No existe ningún usuario con el email "${email.trim()}".`,
      });
    }

    // ¿Ya existe una membresía de este {userId, consorcioId, role}?
    const membresiaExistente = await Membresia.findOne({
      userId: usuario._id,
      consorcioId: consorcio._id,
      role,
    });

    let membresia;
    if (membresiaExistente) {
      if (membresiaExistente.estado === "activa") {
        return res.status(400).json({
          ok: false,
          msg: `${usuario.name} ya es ${role} de este consorcio.`,
        });
      }
      // Estaba inactiva → la reactivamos (idempotencia, sin duplicar).
      membresiaExistente.estado = "activa";
      await membresiaExistente.save();
      membresia = membresiaExistente;
    } else {
      // No existe → creamos la membresía administrativa.
      membresia = await Membresia.create({
        userId: usuario._id,
        consorcioId: consorcio._id,
        role,
        estado: "activa",
        esDefault: false,
      });
    }

    // 🎯 Auditoría: ADMIN_ASIGNADO (snapshot inmutable del usuario + rol).
    await registrarLog({
      req,
      accion: "ADMIN_ASIGNADO",
      tipoEntidad: "CONSORCIO",
      entidadId: consorcio._id,
      detalles: {
        nombreEntidad: consorcio.nombre,
        cambios: {
          membresiaId: membresia._id.toString(),
          userId: usuario._id.toString(),
          userNombre: usuario.name,
          userEmail: usuario.email,
          role,
        },
      },
    });

    return res.status(201).json({
      ok: true,
      msg: `${usuario.name} asignado como ${role} con éxito.`,
      membresia,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al asignar el administrador.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * 🆕 MÉTODO: Revocar un administrador de un consorcio (M6.3)
 * ============================================================
 *
 * Baja LÓGICA de la membresía (estado: "inactiva"). NO se borra: preserva
 * el historial para trazabilidad legal.
 *
 * Permisos: EXCLUSIVO super_admin_global.
 * Auditoría: ADMIN_REVOCADO (TipoEntidad CONSORCIO, entidadId = consorcioId).
 */
export const revocarAdministrador = async (
  req: Request<ParamsAdmin>,
  res: Response
) => {
  try {
    if (!esSoloSuperGlobal(req)) {
      return res.status(403).json({
        ok: false,
        msg: "Solo el administrador global puede revocar administradores.",
      });
    }

    const { id, membresiaId } = req.params;

    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(membresiaId)) {
      return res.status(400).json({
        ok: false,
        msg: "Identificador de consorcio o membresía inválido.",
      });
    }

    const consorcio = await Consorcio.findById(id).select("_id nombre");
    if (!consorcio) {
      return res.status(404).json({
        ok: false,
        msg: "El consorcio no existe.",
      });
    }

    // Buscar la membresía y validar que pertenezca a este consorcio.
    const membresia = await Membresia.findOne({
      _id: membresiaId,
      consorcioId: consorcio._id,
    }).populate("userId", "name email");

    if (!membresia) {
      return res.status(404).json({
        ok: false,
        msg: "La membresía no existe o no pertenece a este consorcio.",
      });
    }

    // Solo revocamos roles administrativos.
    if (!ROLES_ADMINISTRATIVOS.includes(membresia.role as RolAdministrativo)) {
      return res.status(400).json({
        ok: false,
        msg: "Solo se pueden revocar administradores (admin/superadmin).",
      });
    }

    // Ya estaba inactiva → nada que hacer.
    if (membresia.estado === "inactiva") {
      return res.status(200).json({
        ok: true,
        msg: "El administrador ya se encontraba revocado.",
        membresia,
      });
    }

    // Resolver el nombre del usuario para el snapshot (populado arriba).
    const userPop = membresia.userId as unknown as {
      _id: Types.ObjectId;
      name?: string;
      email?: string;
    } | null;

    // Baja lógica.
    membresia.estado = "inactiva";
    await membresia.save();

    // 🎯 Auditoría: ADMIN_REVOCADO (snapshot inmutable).
    await registrarLog({
      req,
      accion: "ADMIN_REVOCADO",
      tipoEntidad: "CONSORCIO",
      entidadId: consorcio._id,
      detalles: {
        nombreEntidad: consorcio.nombre,
        cambios: {
          membresiaId: membresia._id.toString(),
          userId: userPop?._id?.toString() ?? null,
          userNombre: userPop?.name ?? null,
          userEmail: userPop?.email ?? null,
          role: membresia.role,
        },
      },
    });

    return res.status(200).json({
      ok: true,
      msg: "Administrador revocado con éxito.",
      membresia,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al revocar el administrador.",
      error: obtenerMensajeError(error),
    });
  }
};
