// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Ruta para iniciar sesión: POST /api/users/login
router.post('/login', userController.loginUser);

// Ruta para obtener el listado de usuarios: GET /api/users
router.get('/', userController.getUsers);

// Ruta para dar de alta un usuario: POST /api/users
router.post('/', userController.crearUsuario);

// Ruta para activar/inactivar un usuario: PATCH /api/users/:id/status
router.patch('/:id/status', userController.toggleStatus);

// 🆕 Ruta para eliminar definitivamente un usuario: DELETE /api/users/:id
// Proteger con middleware de admin en el futuro al igual que las anteriores
router.delete('/:id', userController.eliminarUsuario);

module.exports = router;