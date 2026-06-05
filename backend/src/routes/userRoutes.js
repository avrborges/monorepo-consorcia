// backend/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Ruta para iniciar sesión: POST /api/users/login
router.post('/login', userController.loginUser);

module.exports = router;