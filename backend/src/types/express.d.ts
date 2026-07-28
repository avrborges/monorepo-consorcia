// backend/src/types/express.d.ts
import type { UserDocument } from "../models/User";

/**
 * Extiende el tipo Request de Express para incluir datos de autenticación
 * y contexto multi-tenant inyectados por `authMiddleware`.
 *
 * - req.user: documento completo del usuario (sin password), inyectado
 *   tras validar el JWT.
 * - req.activeConsorcioId: ID del consorcio activo del usuario, extraído
 *   del JWT multi-tenant (Fase M2.6.4). Los controllers lo usan para
 *   scopear queries por consorcio (Fase M2.8).
 */
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
      activeConsorcioId?: string;
    }
  }
}

// Este export vacío convierte el archivo en un módulo (necesario para declare global)
export {};