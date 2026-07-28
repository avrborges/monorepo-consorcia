// backend/src/services/loggerService.ts
import type { Types } from "mongoose";

import AuditLog from "../models/AuditLog";
import type { UserDocument } from "../models/User";

// 🎯 Tipos de dominio compartidos entre backend y frontend
import type {
  AccionAuditoria,
  TipoEntidad,
  AuditLogDetalles,
} from "@shared/types";

/* ============================================================
 * TIPOS
 * ============================================================ */

/**
 * Interface mínima que necesita `registrarLog` de la petición.
 * Al no depender del tipo genérico `Request` de Express (con sus 5 slots
 * de params/body/query), evitamos incompatibilidades cuando los
 * controllers tipan `Request<unknown, unknown, MiBody>`.
 *
 * 🆕 Multi-tenant (Fase M2.8.1): incluye `activeConsorcioId` que el
 * authMiddleware adjunta desde el JWT, para scopear el log por consorcio.
 */
interface RequestConUsuario {
  user?: UserDocument;
  activeConsorcioId?: string;
}

/**
 * Parámetros para registrar una entrada de auditoría.
 */
interface RegistrarLogParams {
  /** Petición Express con `req.user` y `req.activeConsorcioId` cargados por el middleware */
  req: RequestConUsuario;
  /** Tipo de acción ejecutada (ej: "USUARIO_CREADO", "UNIDAD_ELIMINADA") */
  accion: AccionAuditoria;
  /** Tipo de entidad afectada ("USUARIO" | "UNIDAD") */
  tipoEntidad: TipoEntidad;
  /** ID de la entidad afectada (usuario o unidad) */
  entidadId: Types.ObjectId | string;
  /** Detalles del cambio */
  detalles: AuditLogDetalles;
  /**
   * 🆕 Override opcional del consorcio (Fase M2.8.1).
   *
   * Si se provee, tiene prioridad sobre `req.activeConsorcioId`. Útil para
   * casos donde la acción afecta a un consorcio distinto del activo (raro),
   * o para acciones del super_admin_global que operan sobre un consorcio
   * específico pasado explícitamente.
   */
  consorcioId?: Types.ObjectId | string;
}

/* ============================================================
 * SERVICIO
 * ============================================================ */

/**
 * Registra una acción de administración en la base de datos de auditoría.
 *
 * 🆕 Multi-tenant: el log se asocia a un consorcio. La prioridad de
 * resolución del consorcio es:
 *   1. `params.consorcioId` (override explícito), si se provee.
 *   2. `req.activeConsorcioId` (del JWT), en la mayoría de los casos.
 *
 * Si no se puede determinar el consorcio, el log NO se guarda (se emite
 * un warning) para no violar la restricción `required` del modelo AuditLog.
 *
 * @param params Objeto con todos los parámetros necesarios.
 *
 * @example
 *   await registrarLog({
 *     req,
 *     accion: "USUARIO_CREADO",
 *     tipoEntidad: "USUARIO",
 *     entidadId: nuevoUsuario._id,
 *     detalles: {
 *       nombreEntidad: nuevoUsuario.name,
 *       cambios: { email: "juan@mail.com", role: "propietario" },
 *     },
 *   });
 */
export const registrarLog = async ({
  req,
  accion,
  tipoEntidad,
  entidadId,
  detalles,
  consorcioId,
}: RegistrarLogParams): Promise<void> => {
  try {
    // 🛡️ Validación de seguridad: extraemos el admin desde el middleware de autenticación
    const adminId = req.user?._id;
    const adminName = req.user?.name || "Administrador del Sistema";

    if (!adminId) {
      console.warn(
        `[Logger Warning]: Se intentó registrar la acción ${accion} pero no se detectó un usuario autenticado en la petición.`
      );
      return;
    }

    // 🆕 Resolver el consorcio del log (prioridad: override explícito > token)
    const consorcioResuelto = consorcioId || req.activeConsorcioId;

    if (!consorcioResuelto) {
      console.warn(
        `[Logger Warning]: Se intentó registrar la acción ${accion} pero no se pudo determinar el consorcio (sin consorcioId ni activeConsorcioId). El log no se guardó.`
      );
      return;
    }

    await AuditLog.create({
      consorcioId: consorcioResuelto,
      adminId,
      adminName,
      accion,
      tipoEntidad,
      entidadId,
      detalles,
    });
  } catch (error) {
    // Catch silencioso: un error al escribir el log nunca debe romper la experiencia del cliente final
    console.error("[Logger Error]: No se pudo guardar el registro de auditoría:", error);
  }
};