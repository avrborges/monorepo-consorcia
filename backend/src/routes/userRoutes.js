// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 🛡️ Importamos ambos middlewares de protección
const { protegerAdmin, protegerSuperAdmin } = require('../middleware/authMiddleware');

// --- RUTAS PÚBLICAS ---
router.post('/login', userController.loginUser);
router.post('/activar', userController.activarCuenta);

// --- RUTAS ADMINISTRATIVAS ---

// 🔐 MODIFICADO: Ahora solo el Super Admin puede consultar el historial de auditoría
router.get('/audit-logs', protegerSuperAdmin, userController.getAuditLogs);

// Rutas accesibles tanto por Admin como por Super Admin
router.get('/', protegerAdmin, userController.getUsers);
router.post('/', protegerAdmin, userController.crearUsuario);
router.post('/:id/reenviar-invitacion', protegerAdmin, userController.reenviarInvitacion);
router.patch('/:id/status', protegerAdmin, userController.toggleStatus);
router.delete('/:id', protegerAdmin, userController.eliminarUsuario);
router.put("/:id", protegerAdmin, userController.updateUser);

module.exports = router;