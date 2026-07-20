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
} from "../controllers/userController";

// 🛡️ Importamos ambos middlewares de protección
import {
  protegerAdmin,
  protegerSuperAdmin,
} from "../middleware/authMiddleware";

const router: Router = Router();

/* ============================================================
 * RUTAS PÚBLICAS
 * ============================================================ */
router.post("/login", loginUser);
router.post("/activar", activarCuenta);

// Recuperación de contraseña — usuario no autenticado
router.post("/olvide-password", olvidePassword);
router.post("/reset-password", resetPassword);

/* ============================================================
 * RUTAS ADMINISTRATIVAS
 * ============================================================ */

// 🔐 Solo el Super Admin puede consultar el historial de auditoría
router.get("/audit-logs", protegerSuperAdmin, getAuditLogs);

// Rutas accesibles tanto por Admin como por Super Admin
router.get("/", protegerAdmin, getUsers);
router.post("/", protegerAdmin, crearUsuario);
router.post("/:id/reenviar-invitacion", protegerAdmin, reenviarInvitacion);
router.patch("/:id/status", protegerAdmin, toggleStatus);
router.delete("/:id", protegerAdmin, eliminarUsuario);
router.put("/:id", protegerAdmin, updateUser);

export default router;