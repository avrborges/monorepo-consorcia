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
 */
interface RequestConUsuario {
  user?: UserDocument;
}

/**
 * Parámetros para registrar una entrada de auditoría.
 */
interface RegistrarLogParams {
  /** Petición Express con `req.user` cargado por el middleware de auth */
  req: RequestConUsuario;
  /** Tipo de acción ejecutada (ej: "USUARIO_CREADO", "UNIDAD_ELIMINADA") */
  accion: AccionAuditoria;
  /** Tipo de entidad afectada ("USUARIO" | "UNIDAD") */
  tipoEntidad: TipoEntidad;
  /** ID de la entidad afectada (usuario o unidad) */
  entidadId: Types.ObjectId | string;
  /** Detalles del cambio */
  detalles: AuditLogDetalles;
}

/* ============================================================
 * SERVICIO
 * ============================================================ */

/**
 * Registra una acción de administración en la base de datos de auditoría.
 *
 * @param params Objeto con todos los parámetros necesarios.
 *
 * @example
 *   // Registrar creación de usuario:
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
 *
 * @example
 *   // Registrar creación de unidad funcional:
 *   await registrarLog({
 *     req,
 *     accion: "UNIDAD_CREADA",
 *     tipoEntidad: "UNIDAD",
 *     entidadId: nuevaUnidad._id,
 *     detalles: {
 *       nombreEntidad: `Piso ${piso} Depto ${departamento}`,
 *       cambios: { coeficiente, estadoOcupacion },
 *     },
 *   });
 */
export const registrarLog = async ({
  req,
  accion,
  tipoEntidad,
  entidadId,
  detalles,
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

    await AuditLog.create({
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