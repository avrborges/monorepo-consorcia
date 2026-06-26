// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Ruta para iniciar sesión: POST /api/users/login
router.post('/login', userController.loginUser);

// Ruta para obtener el listado de usuarios: GET /api/users
// Nota: Más adelante, cuando implementemos el middleware de verificación de JWT,
// protegeremos esta ruta para que solo admins puedan consultar la nómina.
router.get('/', userController.getUsers);

// 🆕 Ruta para dar de alta un usuario: POST /api/users
// Al igual que el listado, en el futuro se protegerá con el middleware de rol de administrador.
router.post('/', userController.crearUsuario);

module.exports = router;