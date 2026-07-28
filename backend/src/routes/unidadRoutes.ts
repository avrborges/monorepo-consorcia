// backend/src/routes/unidadRoutes.ts
import { Router } from "express";

import {
  crearUnidad,
  getUnidades,
  vincularHabitantes,
  eliminarUnidad,
} from "../controllers/unidadController";

// 🔑 Middlewares de protección + scope multi-tenant
import { protegerAdmin, scopeConsorcio } from "../middleware/authMiddleware";

const router: Router = Router();

// Protegemos todos los endpoints de Unidades Funcionales:
// 1. protegerAdmin  → valida identidad (admin/superadmin) + adjunta req.activeConsorcioId
// 2. scopeConsorcio → valida acceso al consorcio activo (bypass super_admin_global)
router.use(protegerAdmin);
router.use(scopeConsorcio);

router.post("/", crearUnidad);
router.get("/", getUnidades);
router.put("/:id/vincular", vincularHabitantes);
router.delete("/:id", eliminarUnidad); // 🗑️ Endpoint para eliminar una unidad funcional

export default router;
