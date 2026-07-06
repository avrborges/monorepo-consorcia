// backend/src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Extrae el token JWT desde el header Authorization.
 * Formato esperado:
 * Authorization: Bearer TOKEN
 */
const extraerToken = (req) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.split(" ")[1];

  return token || null;
};

/**
 * Middleware genérico para proteger rutas según roles permitidos.
 */
const protegerPorRoles = (rolesPermitidos = []) => {
  return async (req, res, next) => {
    try {
      const token = extraerToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No autorizado, no se proporcionó ningún token de acceso.",
        });
      }

      if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET no está configurado en las variables de entorno.");

        return res.status(500).json({
          success: false,
          message: "Error de configuración del servidor.",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded || !decoded.id) {
        return res.status(401).json({
          success: false,
          message: "Token inválido. Iniciá sesión nuevamente.",
        });
      }

      const usuario = await User.findById(decoded.id).select("-password");

      if (!usuario) {
        return res.status(401).json({
          success: false,
          message: "Usuario no encontrado. Iniciá sesión nuevamente.",
        });
      }

      if (usuario.estado === "pendiente") {
        return res.status(403).json({
          success: false,
          message: "La cuenta aún no está activada.",
        });
      }

      if (usuario.estado === "inactivo" || usuario.estado === "inactive") {
        return res.status(403).json({
          success: false,
          message: "La cuenta se encuentra inactiva.",
        });
      }

      const tieneRolPermitido = rolesPermitidos.includes(usuario.role);

      if (!tieneRolPermitido) {
        return res.status(403).json({
          success: false,
          message: "Acceso denegado. No tenés permisos suficientes para realizar esta acción.",
        });
      }

      req.user = usuario;

      return next();
    } catch (error) {
      console.error("Error de autenticación en authMiddleware:", error);

      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado. Iniciá sesión nuevamente.",
      });
    }
  };
};

/* ============================================================
 * MIDDLEWARES EXPORTADOS
 * ============================================================ */

/**
 * Rutas accesibles por Admin y Super Admin.
 */
const protegerAdmin = protegerPorRoles(["admin", "superadmin"]);

/**
 * Rutas exclusivas para Super Admin.
 */
const protegerSuperAdmin = protegerPorRoles(["superadmin"]);

module.exports = {
  protegerAdmin,
  protegerSuperAdmin,
};