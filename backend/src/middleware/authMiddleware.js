// backend/src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 🛡️ Middleware para rutas accesibles por Admin y Super Admin
const protegerAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (req.user && (req.user.role === "admin" || req.user.role === "superadmin")) {
        return next();
      } else {
        return res.status(403).json({ 
          success: false, 
          message: "Acceso denegado. Se requieren privilegios de administración." 
        });
      }
    } catch (error) {
      console.error("Error de autenticación en middleware admin:", error);
      return res.status(401).json({ 
        success: false, 
        message: "Token inválido o expirado. Iniciá sesión nuevamente." 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "No autorizado, no se proporcionó ningún token de acceso." 
    });
  }
};

// 👑 NUEVO: Middleware exclusivo para el rol Super Admin
const protegerSuperAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      // Verificación estricta de Super Admin
      if (req.user && req.user.role === "superadmin") {
        return next();
      } else {
        return res.status(403).json({ 
          success: false, 
          message: "Acceso denegado. Esta acción requiere permisos exclusivos de Super Admin." 
        });
      }
    } catch (error) {
      console.error("Error de autenticación en middleware superadmin:", error);
      return res.status(401).json({ 
        success: false, 
        message: "Token inválido o expirado. Iniciá sesión nuevamente." 
      });
    }
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "No autorizado, no se proporcionó ningún token de acceso." 
    });
  }
};

module.exports = { protegerAdmin, protegerSuperAdmin };