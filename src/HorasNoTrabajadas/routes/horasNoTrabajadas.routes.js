const express = require('express');
const router = express.Router();
const controller = require('../controllers/horasNoTrabajadas.controller');

// Crear horas no trabajadas
router.post('/', controller.crear);

// Obtener horas por mes
router.get('/mensual', controller.obtenerPorMes);

module.exports = router;
