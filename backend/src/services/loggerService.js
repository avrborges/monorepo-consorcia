// backend/src/services/loggerService.js
const AuditLog = require("../models/AuditLog");

/**
 * Registra una acción de administración en la base de datos de auditoría.
 * @param {Object} req - Objeto de petición Express (requiere que req.user esté cargado por tu middleware de auth)
 * @param {string} accion - Tipo de acción (Ej: "USUARIO_CREADO", "USUARIO_EDITADO")
 * @param {string} targetUserId - ID del usuario afectado
 * @param {Object} detalles - Objeto con el { nombreUsuario, cambios }
 */
const registrarLog = async (req, accion, targetUserId, detalles) => {
  try {
    // 🛡️ Validación de seguridad: Extraemos el admin desde el middleware de autenticación de tu app
    const adminId = req.user?._id;
    const adminName = req.user?.name || "Administrador del Sistema";

    if (!adminId) {
      console.warn(`[Logger Warning]: Se intentó registrar la acción ${accion} pero no se detectó un usuario autenticado en la petición.`);
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
    // Usamos un catch silencioso para que un error al escribir el log nunca rompa la experiencia del cliente final
    console.error("[Logger Error]: No se pudo guardar el registro de auditoría:", error);
  }
};

module.exports = { registrarLog };