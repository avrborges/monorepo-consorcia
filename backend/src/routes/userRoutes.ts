// backend/src/routes/userRoutes.ts
import { Router } from "express";

import {
  loginUser,
  activarCuenta,
  getAuditLogs,
  getUsers,
  crearUsuario,
  reenviarInvitacion,
  toggleStatus,
  eliminarUsuario,
  updateUser,
  olvidePassword,
  resetPassword,
  cambiarConsorcio,
  misConsorcios
} from "../controllers/userController";

// 🛡️ Middlewares de protección + scope multi-tenant
import {
  protegerAdmin,
  protegerSuperAdmin,
  protegerAutenticado,
  scopeConsorcio,
} from "../middleware/authMiddleware";

const router: Router = Router();

/* ============================================================
 * RUTAS PÚBLICAS (sin scope de consorcio)
 * ============================================================ */
router.post("/login", loginUser);
router.post("/activar", activarCuenta);

// Recuperación de contraseña — usuario no autenticado
router.post("/olvide-password", olvidePassword);
router.post("/reset-password", resetPassword);

/* ============================================================
 * RUTAS DE USUARIO AUTENTICADO (cualquier rol)
 * ============================================================ */

// 🔄 Cambiar consorcio activo (multi-tenant)
router.post("/cambiar-consorcio", protegerAutenticado, cambiarConsorcio);

// 🏢 Listar consorcios del usuario (para el selector del topbar)
router.get("/mis-consorcios", protegerAutenticado, misConsorcios);

/* ============================================================
 * RUTAS ADMINISTRATIVAS (con scope de consorcio)
 * ============================================================
 *
 * Patrón de encadenamiento:
 *   1. protegerAdmin / protegerSuperAdmin → valida identidad + adjunta activeConsorcioId
 *   2. scopeConsorcio → valida acceso al consorcio activo (bypass super_admin_global)
 */

// 🔐 Solo el Super Admin puede consultar el historial de auditoría del consorcio
router.get("/audit-logs", protegerSuperAdmin, scopeConsorcio, getAuditLogs);

// Rutas accesibles tanto por Admin como por Super Admin
router.get("/", protegerAdmin, scopeConsorcio, getUsers);
router.post("/", protegerAdmin, scopeConsorcio, crearUsuario);
router.post("/:id/reenviar-invitacion", protegerAdmin, scopeConsorcio, reenviarInvitacion);
router.patch("/:id/status", protegerAdmin, scopeConsorcio, toggleStatus);
router.delete("/:id", protegerAdmin, scopeConsorcio, eliminarUsuario);
router.put("/:id", protegerAdmin, scopeConsorcio, updateUser);

export default router;