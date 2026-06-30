// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// 🛡️ IMPORTANTE: Importamos el middleware de protección de rutas administrativas
const { protegerAdmin } = require('../middleware/authMiddleware');

// --- RUTAS PÚBLICAS ---
router.post('/login', userController.loginUser);

// Nueva ruta pública para que el usuario active su cuenta desde el link
router.post('/activar', userController.activarCuenta);

// --- RUTAS ADMINISTRATIVAS (Todas protegidas con protegerAdmin) ---

// 📝 NUEVO: Ruta para obtener el historial de auditoría del consorcio
router.get('/audit-logs', protegerAdmin, userController.getAuditLogs);

// Ruta para obtener el listado de usuarios
router.get('/', protegerAdmin, userController.getUsers);

// Ruta para dar de alta un usuario
router.post('/', protegerAdmin, userController.crearUsuario);

// Ruta para reenviar la invitación de un usuario pendiente/expirado
router.post('/:id/reenviar-invitacion', protegerAdmin, userController.reenviarInvitacion);

// Ruta para activar/inactivar un usuario
router.patch('/:id/status', protegerAdmin, userController.toggleStatus);

// Ruta para eliminar definitivamente un usuario
router.delete('/:id', protegerAdmin, userController.eliminarUsuario);

// Ruta para actualizar datos
router.put("/:id", protegerAdmin, userController.updateUser);

module.exports = router;