// backend/src/types/express.d.ts
import type { UserDocument } from "../models/User";

/**
 * Extiende el tipo Request de Express para incluir el usuario autenticado.
 * El campo `req.user` es inyectado por `authMiddleware` tras validar el JWT.
 *
 * Contiene el documento completo del usuario (sin el campo password).
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

// Este export vacío convierte el archivo en un módulo (necesario para `declare global`)
export {};