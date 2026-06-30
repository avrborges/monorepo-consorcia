// backend/src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protegerAdmin = async (req, res, next) => {
  let token;

  // El token suele viajar en los headers como 'Authorization: Bearer TOKEN'
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extraemos el token del string "Bearer <token>"
      token = req.headers.authorization.split(" ")[1];

      // Decodificamos el token usando la clave secreta de tu .env
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscamos al usuario en la base de datos (excluyendo la contraseña)
      req.user = await User.findById(decoded.id).select("-password");

      // Verificamos estrictamente si es administrador
      if (req.user && req.user.role === "admin") {
        return next(); // Tiene permisos, dejamos continuar la petición hacia el controlador
      } else {
        return res.status(403).json({ success: false, message: "Acceso denegado. Se requieren permisos de administrador." });
      }

    } catch (error) {
      console.error("Error de autenticación en middleware:", error);
      return res.status(401).json({ success: false, message: "Token inválido o expirado. Iniciá sesión nuevamente." });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "No autorizado, no se proporcionó ningún token de acceso." });
  }
};

module.exports = { protegerAdmin };