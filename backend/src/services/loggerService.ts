// backend/src/services/loggerService.ts
import type { Types } from "mongoose";

import AuditLog, {
  type AccionAuditoria,
  type IAuditLogDetalles,
} from "../models/AuditLog";
import type { UserDocument } from "../models/User";

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

/* ============================================================
 * SERVICIO
 * ============================================================ */

/**
 * Registra una acción de administración en la base de datos de auditoría.
 *
 * @param req         Objeto con `req.user` cargado por el middleware de auth.
 * @param accion      Tipo de acción (ej: "USUARIO_CREADO", "USUARIO_EDITADO")
 * @param targetUserId ID del usuario afectado
 * @param detalles    Objeto con `{ nombreUsuario, cambios }`
 */
export const registrarLog = async (
  req: RequestConUsuario,
  accion: AccionAuditoria,
  targetUserId: Types.ObjectId | string,
  detalles: IAuditLogDetalles
): Promise<void> => {
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
      targetUserId,
      detalles,
    });
  } catch (error) {
    // Catch silencioso: un error al escribir el log nunca debe romper la experiencia del cliente final
    console.error("[Logger Error]: No se pudo guardar el registro de auditoría:", error);
  }
};