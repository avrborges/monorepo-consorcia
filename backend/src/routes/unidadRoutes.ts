// backend/src/routes/unidadRoutes.ts
import { Router } from "express";

import {
  crearUnidad,
  getUnidades,
  vincularHabitantes,
  eliminarUnidad,
} from "../controllers/unidadController";

// 🔑 Middleware de protección para admins y superadmins
import { protegerAdmin } from "../middleware/authMiddleware";

const router: Router = Router();

// Protegemos todos los endpoints de las Unidades Funcionales para admins y superadmins
router.use(protegerAdmin);

router.post("/", crearUnidad);
router.get("/", getUnidades);
router.put("/:id/vincular", vincularHabitantes);
router.delete("/:id", eliminarUnidad); // 🗑️ Endpoint para eliminar una unidad funcional

export default router;