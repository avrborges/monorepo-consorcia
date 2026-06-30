// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// --- RUTAS PÚBLICAS ---
router.post('/login', userController.loginUser);

// 🆕 Nueva ruta pública para que el usuario active su cuenta desde el link
router.post('/activar', userController.activarCuenta);

// --- RUTAS ADMINISTRATIVAS ---
// Ruta para obtener el listado de usuarios
router.get('/', userController.getUsers);

// Ruta para dar de alta un usuario
router.post('/', userController.crearUsuario);

// Ruta para reenviar la invitación de un usuario pendiente/expirado
router.post('/:id/reenviar-invitacion', userController.reenviarInvitacion);

// Ruta para activar/inactivar un usuario
router.patch('/:id/status', userController.toggleStatus);

// Ruta para eliminar definitivamente un usuario
router.delete('/:id', userController.eliminarUsuario);

// Ruta para actualizar datos
router.put("/:id", userController.updateUser);

module.exports = router;