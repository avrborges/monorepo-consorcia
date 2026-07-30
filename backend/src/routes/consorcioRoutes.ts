// backend/src/routes/consorcioRoutes.ts
import { Router } from "express";

import {
  getConsorcio,
  updateConsorcio,
} from "../controllers/consorcioController";

// 🔑 Middlewares de protección + scope multi-tenant
import { protegerAutenticado, scopeConsorcio } from "../middleware/authMiddleware";

const router: Router = Router();

// Identidad + scope multi-tenant para todas las rutas de consorcios:
// 1. protegerAutenticado → valida sesión (token + usuario activo) sin filtrar por rol.
//    El gating fino (solo superadmin / super_admin_global) se hace en el controller.
// 2. scopeConsorcio → valida acceso al consorcio activo (bypass super_admin_global).
router.use(protegerAutenticado);
router.use(scopeConsorcio);

// 📄 Obtener los datos completos de un consorcio (para precargar el form de edición)
router.get("/:id", getConsorcio);

// ✏️ Editar los datos de un consorcio (M6.0)
router.put("/:id", updateConsorcio);

export default router;   // 👈 ESTA LÍNEA es la que falta en tu archivo