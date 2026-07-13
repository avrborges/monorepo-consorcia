const express = require('express');
const router = express.Router();
const unidadController = require('../controllers/unidadController');
const { protegerAdmin } = require('../middleware/authMiddleware'); // 🔑 Importación exacta de tu middleware operativo

// Protegemos todos los endpoints de las Unidades Funcionales para admins y superadmins
router.use(protegerAdmin); 

router.get('/', unidadController.getUnidades);
router.put('/:id/vincular', unidadController.vincularHabitantes);

module.exports = router;