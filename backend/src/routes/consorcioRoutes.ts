// backend/src/routes/consorcioRoutes.ts
import { Router } from "express";

import {
  getConsorcio,
  updateConsorcio,
  listarConsorcios, // M6.1
  crearConsorcio, // M6.1
  toggleEstadoConsorcio, // M6.1
  listarAdministradores, // 🆕 M6.3
  asignarAdministrador, // 🆕 M6.3
  revocarAdministrador, // 🆕 M6.3
} from "../controllers/consorcioController";

// 🔑 Middlewares de protección + scope multi-tenant
import { protegerAutenticado, scopeConsorcio } from "../middleware/authMiddleware";

const router: Router = Router();

// Identidad + scope multi-tenant para todas las rutas de consorcios:
// 1. protegerAutenticado → valida sesión (token + usuario activo) sin filtrar por rol.
//    El gating fino (superadmin / super_admin_global según el método) se hace
//    en el controller, porque un super_admin_global puede no tener role === "superadmin".
// 2. scopeConsorcio → valida acceso al consorcio activo (bypass super_admin_global).
router.use(protegerAutenticado);
router.use(scopeConsorcio);

// 📋 Listar todos los consorcios (ABM) — solo super_admin_global (M6.1)
router.get("/", listarConsorcios);

// ➕ Crear un nuevo consorcio (ABM) — solo super_admin_global (M6.1)
router.post("/", crearConsorcio);

// 👥 Administradores de un consorcio (M6.3) — solo super_admin_global.
//    Van ANTES de "/:id" genérico para que no las tape (aunque son más específicas).
router.get("/:id/administradores", listarAdministradores);
router.post("/:id/administradores", asignarAdministrador);
router.delete("/:id/administradores/:membresiaId", revocarAdministrador);

// 📄 Obtener los datos completos de un consorcio (para precargar el form de edición)
router.get("/:id", getConsorcio);

// ✏️ Editar los datos de un consorcio (M6.0)
router.put("/:id", updateConsorcio);

// 🔄 Activar / desactivar un consorcio (baja lógica) — solo super_admin_global (M6.1)
router.patch("/:id/estado", toggleEstadoConsorcio);

export default router;
