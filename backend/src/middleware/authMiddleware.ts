// backend/src/middleware/authMiddleware.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import User, { type RolUsuario } from "../models/User";
import Membresia from "../models/Membresia";

/* ============================================================
 * TIPOS
 * ============================================================ */

/**
 * Estructura esperada del payload del JWT.
 *
 * 🆕 Multi-tenant (Fase M2.6): el token ahora incluye rolGlobal,
 * activeConsorcioId y roleEnConsorcioActivo. El campo `id` sigue
 * siendo la fuente de verdad para identificar al usuario.
 */
interface AuthTokenPayload extends JwtPayload {
  id: string;
  rolGlobal?: "user" | "super_admin_global";
  activeConsorcioId?: string;
  roleEnConsorcioActivo?: RolUsuario;
}

/* ============================================================
 * HELPERS
 * ============================================================ */

/**
 * Extrae el token JWT desde el header Authorization.
 * Formato esperado: Authorization: Bearer TOKEN
 */
const extraerToken = (req: Request): string | null => {
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
const protegerPorRoles = (rolesPermitidos: RolUsuario[] = []): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
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

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthTokenPayload;

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

      if (usuario.estado === "inactivo") {
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

      // 🆕 Multi-tenant (Fase M2.6.4): adjuntamos el activeConsorcioId del token
      //    al request para que los controllers puedan scopear queries (usado en M2.8).
      if (decoded.activeConsorcioId) {
        req.activeConsorcioId = decoded.activeConsorcioId;
      }

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
export const protegerAdmin: RequestHandler = protegerPorRoles(["admin", "superadmin"]);

/**
 * Rutas exclusivas para Super Admin.
 */
export const protegerSuperAdmin: RequestHandler = protegerPorRoles(["superadmin"]);

/**
 * 🆕 Rutas accesibles por CUALQUIER usuario autenticado (Fase M2.6.4).
 *
 * Valida sesión válida (token + usuario activo) sin filtrar por rol.
 * Útil para acciones que cualquier usuario logueado puede hacer,
 * como cambiar de consorcio activo o ver su propio perfil.
 */
export const protegerAutenticado: RequestHandler = protegerPorRoles([
  "superadmin",
  "admin",
  "consejo",
  "propietario",
  "inquilino",
]);

/* ============================================================
 * MIDDLEWARE: Scope de consorcio (Fase M2.7)
 * ============================================================
 *
 * Garantiza el aislamiento multi-tenant. Se encadena DESPUÉS de un
 * middleware de identidad (protegerAdmin, protegerAutenticado, etc.).
 *
 * Lógica:
 * 1. Si el usuario es `super_admin_global` → bypass (accede a cualquier consorcio).
 * 2. Si no hay `activeConsorcioId` en el token → 403.
 * 3. Si el usuario no tiene membresía activa en ese consorcio → 403.
 * 4. Caso contrario → next() (acceso permitido al consorcio activo).
 *
 * Deja disponible `req.activeConsorcioId` (ya adjuntado por el middleware
 * de identidad) para que los controllers scopeen sus queries (Fase M2.8).
 */
export const scopeConsorcio: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const usuario = req.user;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "No autorizado. Iniciá sesión nuevamente.",
      });
    }

    // 1️⃣ Bypass para super_admin_global: puede operar sobre cualquier consorcio.
    if (usuario.rolGlobal === "super_admin_global") {
      return next();
    }

    // 2️⃣ Validar que el token traiga un consorcio activo
    const activeConsorcioId = req.activeConsorcioId;
    if (!activeConsorcioId) {
      return res.status(403).json({
        success: false,
        message:
          "No hay un consorcio activo en tu sesión. Volvé a iniciar sesión y seleccioná un consorcio.",
      });
    }

    // 3️⃣ Validar que el usuario tenga membresía activa en ese consorcio
    const membresia = await Membresia.findOne({
      userId: usuario._id,
      consorcioId: activeConsorcioId,
      estado: "activa",
    });

    if (!membresia) {
      return res.status(403).json({
        success: false,
        message: "No tenés acceso a este consorcio.",
      });
    }

    // 4️⃣ Acceso permitido al consorcio activo
    return next();
  } catch (error) {
    console.error("Error en scopeConsorcio:", error);
    return res.status(500).json({
      success: false,
      message: "Error al validar el acceso al consorcio.",
    });
  }
};