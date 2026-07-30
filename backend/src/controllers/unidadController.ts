// backend/src/controllers/unidadController.ts
import type { Request, Response } from "express";
import { Types } from "mongoose";

import UnidadFuncional, {
  type EstadoOcupacion,
} from "../models/UnidadFuncional";
import User from "../models/User";
// 🆕 M5.1: modelo de Ocupación con historial (creado en M1.3)
import Ocupacion from "../models/Ocupacion";
import { registrarLog } from "../services/loggerService";

/* ============================================================
 * ⚠️ SUPUESTOS SOBRE EL MODELO Ocupacion (M1.3) — M5.1
 * ============================================================
 *
 * Este controlador asume la siguiente forma del modelo `Ocupacion`.
 * Si alguno difiere en tu models/Ocupacion.ts, es un fix de 1 línea:
 *
 *   1. Export default llamado `Ocupacion` en "../models/Ocupacion".
 *   2. Campos: { unidadId: ObjectId, userId: ObjectId,
 *                tipo: "propietario" | "inquilino",
 *                desde: Date, hasta: Date | null }.
 *   3. Ocupación ACTIVA ⇔ `hasta === null`.
 *
 * NO se asume que Ocupacion tenga `consorcioId`: el scope multi-tenant
 * se garantiza porque la UF ya fue validada contra el consorcio activo
 * antes de tocar sus ocupaciones (scope vía `unidadId`).
 * ============================================================ */

/**
 * Tipo local de ocupación. Debe coincidir con el enum `tipo` del modelo.
 */
type TipoOcupacion = "propietario" | "inquilino";

/**
 * 🆕 M5.4.2 — Tipo del `req` esperado por `registrarLog`, extraído de su
 * propia firma. Evita conflictos entre los distintos generics de `Request`
 * de Express (Request<ParamsId>, Request<unknown, ...>, etc.) al pasar `req`
 * a los helpers de ocupación instrumentados con auditoría.
 */
type LoggerReq = Parameters<typeof registrarLog>[0]["req"];

/* ============================================================
 * TIPOS DE PAYLOAD
 * ============================================================ */

interface CrearUnidadBody {
  piso?: string;
  departamento?: string;
  coeficiente?: number;
  estadoOcupacion?: EstadoOcupacion;
}

interface VincularHabitantesBody {
  propietarioId?: string | null;
  inquilinoId?: string | null;
}

interface ParamsId {
  id: string;
}

/* ============================================================
 * HELPER: Serializar mensaje de error de forma segura
 * ============================================================ */

const obtenerMensajeError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

/* ============================================================
 * HELPER: Validar que exista un consorcio activo en la sesión
 * ============================================================
 *
 * Todos los handlers de unidades operan dentro del consorcio activo
 * (incluido el super_admin_global, que opera sobre el consorcio que
 * eligió en el selector — Opción A del diseño multi-tenant).
 *
 * Recibe una interface mínima (solo `activeConsorcioId`) para no depender
 * de los generics del tipo `Request` de Express. Esto evita conflictos
 * cuando los handlers tipan `Request<ParamsId, ...>` o `Request<unknown, ...>`.
 *
 * Retorna el consorcioId como string, o null si no está presente.
 */
interface RequestConConsorcio {
  activeConsorcioId?: string;
}

const obtenerConsorcioActivo = (req: RequestConConsorcio): string | null => {
  return req.activeConsorcioId || null;
};

/* ============================================================
 * 🆕 HELPERS DE OCUPACIÓN (M5.1 — dual-write con historial)
 *      + AUDITORÍA GRANULAR (M5.4.2)
 * ============================================================
 *
 * Estos helpers son la base de la migración a `Ocupacion`. En M5.1 se
 * ejecutan EN PARALELO a la sincronización legacy (propietario/inquilino
 * en UnidadFuncional) para no romper el frontend actual.
 *
 * M5.4.2 — Auditoría granular (granularidad A, TipoEntidad "UNIDAD"):
 *   - Cada apertura de ocupación emite OCUPACION_CREADA.
 *   - Cada cierre de ocupación emite OCUPACION_CERRADA (una por ocupación).
 *   - Los helpers reciben `req` + `nombreEntidad` para autocontener su
 *     auditoría (cubre vincularHabitantes y eliminarUnidad sin duplicar).
 *   - Los nombres de ocupantes se resuelven en el momento del evento y se
 *     guardan como snapshot INMUTABLE (sobreviven al borrado del usuario).
 */

/**
 * Cierra (setea `hasta = new Date()`) todas las ocupaciones ACTIVAS de una
 * unidad, opcionalmente filtrando por tipo. NO borra registros: preserva el
 * historial para trazabilidad legal.
 *
 * M5.4.2 (Opción 2A): antes de cerrar en bulk (`updateMany`, eficiente),
 * se hace un `find` previo para saber QUÉ ocupaciones se cierran y poder
 * auditar cada una individualmente (granularidad A).
 */
const cerrarOcupacionesActivas = async (
  unidadId: Types.ObjectId,
  tipo: TipoOcupacion | undefined,
  req: LoggerReq,
  nombreEntidad: string
): Promise<void> => {
  const filtro: Record<string, unknown> = { unidadId, hasta: null };
  if (tipo) filtro.tipo = tipo;

  // 2A — find previo: necesitamos los documentos para auditar cada cierre.
  const activas = await Ocupacion.find(filtro).select("_id userId tipo desde");

  // Nada activo → nada que cerrar ni auditar (evita un updateMany no-op).
  if (activas.length === 0) return;

  const hasta = new Date();

  // Cierre en bulk (eficiente).
  await Ocupacion.updateMany(filtro, { $set: { hasta } });

  // Resolución de nombres INMUTABLE en una sola query $in.
  const userIds = activas.map((oc) => oc.userId);
  const usuarios = await User.find({ _id: { $in: userIds } }).select("name");
  const nombrePorId = new Map<string, string>();
  usuarios.forEach((u) => {
    nombrePorId.set(u._id.toString(), u.name);
  });

  // Log por cada ocupación cerrada (granularidad A).
  await Promise.all(
    activas.map((oc) =>
      registrarLog({
        req,
        accion: "OCUPACION_CERRADA",
        tipoEntidad: "UNIDAD",
        entidadId: unidadId,
        detalles: {
          nombreEntidad,
          cambios: {
            ocupacionId: oc._id.toString(),
            userId: oc.userId.toString(),
            userNombre: nombrePorId.get(oc.userId.toString()) || null,
            tipo: oc.tipo,
            desde: oc.desde,
            hasta,
          },
        },
      })
    )
  );
};

/**
 * Crea una ocupación ACTIVA (`hasta = null`) desde el momento actual.
 *
 * M5.4.2: emite OCUPACION_CREADA con snapshot inmutable del ocupante.
 */
const crearOcupacion = async (
  unidadId: Types.ObjectId,
  userId: Types.ObjectId,
  tipo: TipoOcupacion,
  req: LoggerReq,
  nombreEntidad: string
): Promise<void> => {
  const desde = new Date();

  const ocupacion = await Ocupacion.create({
    unidadId,
    userId,
    tipo,
    desde,
    hasta: null,
  });

  // Resolución de nombre INMUTABLE del ocupante recién vinculado.
  const user = await User.findById(userId).select("name");
  const userNombre = user?.name || null;

  await registrarLog({
    req,
    accion: "OCUPACION_CREADA",
    tipoEntidad: "UNIDAD",
    entidadId: unidadId,
    detalles: {
      nombreEntidad,
      cambios: {
        ocupacionId: ocupacion._id.toString(),
        userId: userId.toString(),
        userNombre,
        tipo,
        desde,
      },
    },
  });
};

/**
 * Sincroniza la ocupación de un `tipo` para una unidad, comparando el
 * ocupante anterior con el nuevo:
 *   - Si NO cambió, no hace nada (evita cerrar/reabrir innecesariamente).
 *   - Si cambió, cierra las ocupaciones activas de ese tipo y, si hay
 *     ocupante nuevo, crea la ocupación correspondiente.
 *
 * M5.4.2: propaga `req` + `nombreEntidad` a los helpers para su auditoría.
 */
const sincronizarOcupacion = async (
  unidadId: Types.ObjectId,
  tipo: TipoOcupacion,
  ocupanteAnteriorId: string | null,
  ocupanteNuevoId: string | null,
  req: LoggerReq,
  nombreEntidad: string
): Promise<void> => {
  // Sin cambios → no tocamos el historial
  if (ocupanteAnteriorId === ocupanteNuevoId) return;

  // Cerramos la(s) ocupación(es) activa(s) de este tipo
  await cerrarOcupacionesActivas(unidadId, tipo, req, nombreEntidad);

  // Si hay un ocupante nuevo, abrimos su ocupación
  if (ocupanteNuevoId) {
    await crearOcupacion(
      unidadId,
      new Types.ObjectId(ocupanteNuevoId),
      tipo,
      req,
      nombreEntidad
    );
  }
};

/* ============================================================
 * MÉTODO: Obtener las unidades funcionales del consorcio activo
 * ============================================================ */
export const getUnidades = async (req: Request, res: Response) => {
  try {
    const consorcioId = obtenerConsorcioActivo(req);

    if (!consorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "No hay un consorcio activo en tu sesión.",
      });
    }

    // 🆕 Scope multi-tenant (Fase M2.8.2): solo UF del consorcio activo
    const unidades = await UnidadFuncional.find({ consorcioId })
      .populate("propietario", "name email telefono")
      .populate("inquilino", "name email telefono")
      .sort({ piso: 1, departamento: 1 });

    return res.status(200).json({
      ok: true,
      unidades,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener las unidades funcionales.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * 🆕 MÉTODO: Historial de ocupaciones de una unidad (Fase M5.3.1)
 * ============================================================
 *
 * Devuelve el historial completo de ocupaciones de una UF (activas e
 * históricas). El scope multi-tenant se garantiza validando que la UF
 * pertenezca al consorcio activo ANTES de leer `Ocupacion` (que no tiene
 * consorcioId propio — el scope va vía `unidadId`, diseño M5.1).
 *
 * Orden: activas (hasta: null) primero, luego por `desde` descendente,
 * dejando arriba lo más reciente para el timeline del DetalleUnidad.
 */
export const getOcupacionesUnidad = async (
  req: Request<ParamsId>,
  res: Response
) => {
  try {
    const consorcioId = obtenerConsorcioActivo(req);

    if (!consorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "No hay un consorcio activo en tu sesión.",
      });
    }

    const { id } = req.params;

    // 🛡️ Validación defensiva del ObjectId antes de tocar la base
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        msg: "El identificador de la unidad no tiene un formato válido.",
      });
    }

    // 🔒 Scope multi-tenant: validar que la UF pertenezca al consorcio activo
    //    ANTES de leer su historial (Ocupacion no tiene consorcioId propio).
    const unidad = await UnidadFuncional.findOne({
      _id: id,
      consorcioId,
    }).select("_id");

    if (!unidad) {
      return res.status(404).json({
        ok: false,
        msg: "La unidad no existe o no pertenece a tu consorcio activo.",
      });
    }

    // Historial completo:
    //   - `hasta: 1` → los null (activas) preceden a las fechas.
    //   - `desde: -1` → dentro de cada grupo, lo más reciente arriba.
    const ocupaciones = await Ocupacion.find({ unidadId: unidad._id })
      .populate("userId", "name email telefono")
      .sort({ hasta: 1, desde: -1 });

    return res.status(200).json({
      ok: true,
      ocupaciones,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al obtener el historial de ocupaciones de la unidad.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * MÉTODO: Crear una nueva Unidad Funcional
 * ============================================================ */
export const crearUnidad = async (
  req: Request<unknown, unknown, CrearUnidadBody>,
  res: Response
) => {
  try {
    const { piso, departamento, coeficiente, estadoOcupacion } = req.body;

    const consorcioId = obtenerConsorcioActivo(req);
    if (!consorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "No hay un consorcio activo en tu sesión.",
      });
    }

    if (!piso || !departamento) {
      return res.status(400).json({
        ok: false,
        msg: "El piso y el departamento son datos obligatorios.",
      });
    }

    // 🆕 Scope multi-tenant: la unicidad de "Piso X Depto Y" es POR CONSORCIO
    const unidadExistente = await UnidadFuncional.findOne({
      consorcioId,
      piso,
      departamento,
    });
    if (unidadExistente) {
      return res.status(400).json({
        ok: false,
        msg: `La unidad ${piso}° "${departamento}" ya se encuentra registrada en este consorcio.`,
      });
    }

    const nuevaUnidad = new UnidadFuncional({
      consorcioId, // 🆕 obligatorio (Fase M2.5)
      piso,
      departamento,
      coeficiente: coeficiente || 0,
      estadoOcupacion: estadoOcupacion || "vacio",
    });

    await nuevaUnidad.save();

    // 🎯 Registrar acción en el Log de Auditoría
    await registrarLog({
      req,
      accion: "UNIDAD_CREADA",
      tipoEntidad: "UNIDAD",
      entidadId: nuevaUnidad._id,
      detalles: {
        nombreEntidad: `Piso ${nuevaUnidad.piso} Depto ${nuevaUnidad.departamento}`,
        cambios: {
          piso: nuevaUnidad.piso,
          departamento: nuevaUnidad.departamento,
          coeficiente: nuevaUnidad.coeficiente,
          estadoOcupacion: nuevaUnidad.estadoOcupacion,
        },
      },
    });

    return res.status(201).json({
      ok: true,
      msg: "Unidad funcional dada de alta con éxito.",
      unidad: nuevaUnidad,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al dar de alta la unidad funcional.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * MÉTODO: Vincular / desvincular usuarios (propietario/inquilino) a una U.F.
 * ============================================================ */
export const vincularHabitantes = async (
  req: Request<ParamsId, unknown, VincularHabitantesBody>,
  res: Response
) => {
  const { id } = req.params;
  const { propietarioId, inquilinoId } = req.body;

  try {
    const consorcioId = obtenerConsorcioActivo(req);
    if (!consorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "No hay un consorcio activo en tu sesión.",
      });
    }

    // 🛡️ Validación defensiva de ObjectIds
    if (propietarioId && !Types.ObjectId.isValid(propietarioId)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del propietario no tiene un formato válido.",
      });
    }
    if (inquilinoId && !Types.ObjectId.isValid(inquilinoId)) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del inquilino no tiene un formato válido.",
      });
    }

    const unidad = await UnidadFuncional.findById(id);

    if (!unidad) {
      return res.status(404).json({
        ok: false,
        msg: "Unidad funcional no encontrada.",
      });
    }

    // 🆕 Scope multi-tenant: la UF debe pertenecer al consorcio activo
    if (unidad.consorcioId?.toString() !== consorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "Esta unidad funcional no pertenece a tu consorcio activo.",
      });
    }

    // 🎯 Snapshot de valores anteriores para auditoría (IDs)
    const propietarioAnteriorId = unidad.propietario?.toString() || null;
    const inquilinoAnteriorId = unidad.inquilino?.toString() || null;
    const estadoOcupacionAnterior = unidad.estadoOcupacion;

    // 🎯 Resolver nombres ANTES de mutar — 1 sola query para hasta 4 IDs
    const idsAResolver = [
      propietarioAnteriorId,
      propietarioId || null,
      inquilinoAnteriorId,
      inquilinoId || null,
    ].filter((idStr): idStr is string => Boolean(idStr));

    const usuariosParaNombres =
      idsAResolver.length > 0
        ? await User.find({ _id: { $in: idsAResolver } }).select("name")
        : [];

    // Map de id → name para lookup O(1)
    const nombrePorId = new Map<string, string>();
    usuariosParaNombres.forEach((u) => {
      nombrePorId.set(u._id.toString(), u.name);
    });

    const resolverNombre = (idStr: string | null): string | null =>
      idStr ? nombrePorId.get(idStr) || null : null;

    // Asignación de referencias (si viene vacío o null, se limpia la U.F.)
    unidad.propietario = propietarioId ? new Types.ObjectId(propietarioId) : null;
    unidad.inquilino = inquilinoId ? new Types.ObjectId(inquilinoId) : null;

    // Lógica automática de estado de ocupación
    if (unidad.inquilino) {
      unidad.estadoOcupacion = "inquilino";
    } else if (unidad.propietario) {
      unidad.estadoOcupacion = "propietario";
    } else {
      unidad.estadoOcupacion = "vacio";
    }

    await unidad.save();

    // Populamos para retornar el objeto completo actualizado al frontend
    const unidadActualizada = await UnidadFuncional.findById(id)
      .populate("propietario", "name email telefono role")
      .populate("inquilino", "name email telefono role");

    // 🎯 Sincronizar user.unidadId Y user.unidadFuncional (Fase 3 + fix legacy)
    const unidadIdStr = unidad._id.toString();
    const ufTextoDerivado = `Piso ${unidad.piso} Depto ${unidad.departamento}`;

    interface CambioUser {
      unidadId: string | null;
      unidadFuncional: string;
    }
    const cambiosDeUsers = new Map<string, CambioUser>();

    // Nuevos vinculados apuntan a esta unidad + texto derivado
    if (propietarioId) {
      cambiosDeUsers.set(propietarioId, {
        unidadId: unidadIdStr,
        unidadFuncional: ufTextoDerivado,
      });
    }
    if (inquilinoId) {
      cambiosDeUsers.set(inquilinoId, {
        unidadId: unidadIdStr,
        unidadFuncional: ufTextoDerivado,
      });
    }

    // Set de nuevos IDs para saber quién sigue vinculado
    const nuevosIds = new Set(
      [propietarioId, inquilinoId].filter((idStr): idStr is string => Boolean(idStr))
    );

    // Anteriores que ya no están → limpiar ambos campos
    if (propietarioAnteriorId && !nuevosIds.has(propietarioAnteriorId)) {
      cambiosDeUsers.set(propietarioAnteriorId, { unidadId: null, unidadFuncional: "" });
    }
    if (inquilinoAnteriorId && !nuevosIds.has(inquilinoAnteriorId)) {
      cambiosDeUsers.set(inquilinoAnteriorId, { unidadId: null, unidadFuncional: "" });
    }

    // Ejecutar todos los updates en paralelo
    if (cambiosDeUsers.size > 0) {
      await Promise.all(
        Array.from(cambiosDeUsers.entries()).map(([userId, cambio]) =>
          User.findByIdAndUpdate(userId, {
            unidadId: cambio.unidadId,
            unidadFuncional: cambio.unidadFuncional,
          })
        )
      );
    }

    // 🆕 M5.1 — DUAL-WRITE al modelo Ocupacion (historial con desde/hasta).
    //     Se ejecuta DESPUÉS de la sincronización legacy para no alterar el
    //     comportamiento actual del frontend. Solo toca el historial cuando
    //     el ocupante de un tipo efectivamente cambió.
    //     M5.4.2 — cada apertura/cierre queda auditado dentro de los helpers.
    const nombreEntidadUnidad = `Piso ${unidad.piso} Depto ${unidad.departamento}`;
    await Promise.all([
      sincronizarOcupacion(
        unidad._id,
        "propietario",
        propietarioAnteriorId,
        propietarioId || null,
        req,
        nombreEntidadUnidad
      ),
      sincronizarOcupacion(
        unidad._id,
        "inquilino",
        inquilinoAnteriorId,
        inquilinoId || null,
        req,
        nombreEntidadUnidad
      ),
    ]);

    // 🎯 Registrar acción en el Log de Auditoría con IDs + nombres snapshot (INMUTABLE)
    await registrarLog({
      req,
      accion: "HABITANTES_VINCULADOS",
      tipoEntidad: "UNIDAD",
      entidadId: unidad._id,
      detalles: {
        nombreEntidad: `Piso ${unidad.piso} Depto ${unidad.departamento}`,
        cambios: {
          // Propietario
          propietarioAnterior: propietarioAnteriorId,
          propietarioAnteriorNombre: resolverNombre(propietarioAnteriorId),
          propietarioNuevo: propietarioId || null,
          propietarioNuevoNombre: resolverNombre(propietarioId || null),
          // Inquilino
          inquilinoAnterior: inquilinoAnteriorId,
          inquilinoAnteriorNombre: resolverNombre(inquilinoAnteriorId),
          inquilinoNuevo: inquilinoId || null,
          inquilinoNuevoNombre: resolverNombre(inquilinoId || null),
          // Estado ocupación
          estadoAnterior: estadoOcupacionAnterior,
          estadoNuevo: unidad.estadoOcupacion,
        },
      },
    });

    return res.status(200).json({
      ok: true,
      msg: "Habitantes vinculados correctamente.",
      unidad: unidadActualizada,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al procesar la vinculación.",
      error: obtenerMensajeError(error),
    });
  }
};

/* ============================================================
 * MÉTODO: Eliminar una Unidad Funcional por su ID
 * ============================================================ */
export const eliminarUnidad = async (
  req: Request<ParamsId>,
  res: Response
) => {
  try {
    const { id } = req.params;

    const consorcioId = obtenerConsorcioActivo(req);
    if (!consorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "No hay un consorcio activo en tu sesión.",
      });
    }

    const unidad = await UnidadFuncional.findById(id);
    if (!unidad) {
      return res.status(404).json({
        ok: false,
        msg: "La unidad funcional no existe o ya fue eliminada.",
      });
    }

    // 🆕 Scope multi-tenant: la UF debe pertenecer al consorcio activo
    if (unidad.consorcioId?.toString() !== consorcioId) {
      return res.status(403).json({
        ok: false,
        msg: "Esta unidad funcional no pertenece a tu consorcio activo.",
      });
    }

    // 🎯 Resolver nombres de habitantes antes de borrar (snapshot INMUTABLE)
    const propietarioIdBorrado = unidad.propietario?.toString() || null;
    const inquilinoIdBorrado = unidad.inquilino?.toString() || null;

    const idsAResolver = [propietarioIdBorrado, inquilinoIdBorrado].filter(
      (idStr): idStr is string => Boolean(idStr)
    );

    const usuariosParaNombres =
      idsAResolver.length > 0
        ? await User.find({ _id: { $in: idsAResolver } }).select("name")
        : [];

    const nombrePorId = new Map<string, string>();
    usuariosParaNombres.forEach((u) => {
      nombrePorId.set(u._id.toString(), u.name);
    });

    // 🎯 Snapshot completo antes de borrar (para el log de auditoría)
    const snapshotUnidad = {
      piso: unidad.piso,
      departamento: unidad.departamento,
      coeficiente: unidad.coeficiente,
      estadoOcupacion: unidad.estadoOcupacion,
      propietarioId: propietarioIdBorrado,
      propietarioNombre: propietarioIdBorrado
        ? nombrePorId.get(propietarioIdBorrado) || null
        : null,
      inquilinoId: inquilinoIdBorrado,
      inquilinoNombre: inquilinoIdBorrado
        ? nombrePorId.get(inquilinoIdBorrado) || null
        : null,
    };

    // 🎯 Sincronización: limpiar user.unidadId Y user.unidadFuncional de todos
    //    los usuarios vinculados a esta UF (Fase 3.2 — consistencia bidireccional)
    await User.updateMany(
      { unidadId: unidad._id },
      { $set: { unidadId: null, unidadFuncional: "" } }
    );

    // 🆕 M5.1 — Cerrar TODAS las ocupaciones activas de la unidad antes de
    //     borrarla. NO se eliminan los registros de Ocupacion: quedan con
    //     `hasta` seteado, preservando el historial (trazabilidad legal).
    //     M5.4.2 — cada cierre emite su OCUPACION_CERRADA dentro del helper.
    await cerrarOcupacionesActivas(
      unidad._id,
      undefined,
      req,
      `Piso ${snapshotUnidad.piso} Depto ${snapshotUnidad.departamento}`
    );

    // Eliminamos la unidad
    await UnidadFuncional.findByIdAndDelete(id);

    // 🎯 Registrar acción en el Log de Auditoría (con snapshot completo pre-borrado)
    await registrarLog({
      req,
      accion: "UNIDAD_ELIMINADA",
      tipoEntidad: "UNIDAD",
      entidadId: unidad._id,
      detalles: {
        nombreEntidad: `Piso ${snapshotUnidad.piso} Depto ${snapshotUnidad.departamento}`,
        cambios: snapshotUnidad,
      },
    });

    return res.status(200).json({
      ok: true,
      msg: "Unidad funcional eliminada con éxito.",
      idEliminado: id,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      msg: "Error al eliminar la unidad funcional.",
      error: obtenerMensajeError(error),
    });
  }
};
