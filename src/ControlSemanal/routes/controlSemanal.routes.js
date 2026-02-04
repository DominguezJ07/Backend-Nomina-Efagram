const express = require('express');
const { body, query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  procesarSemana,
  getResumenEjecutivo,
  compararSemanas,
  getTendencias,
  validarCierre
} = require('../controllers/controlSemanal.controller');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Procesar semana completa
router.post(
  '/procesar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  [
    body('semana')
      .notEmpty()
      .withMessage('La semana es obligatoria')
      .isMongoId()
      .withMessage('ID de semana inválido'),
    validateRequest
  ],
  procesarSemana
);

// Resumen ejecutivo
router.get(
  '/resumen/:semanaId',
  validateMongoId('semanaId'),
  getResumenEjecutivo
);

// Comparar semanas
router.get(
  '/comparar',
  [
    query('semana1').notEmpty().withMessage('Semana 1 obligatoria').isMongoId(),
    query('semana2').notEmpty().withMessage('Semana 2 obligatoria').isMongoId(),
    validateRequest
  ],
  compararSemanas
);

// Tendencias
router.get(
  '/tendencias',
  [
    query('fecha_inicio').notEmpty().withMessage('Fecha inicio obligatoria').isISO8601(),
    query('fecha_fin').notEmpty().withMessage('Fecha fin obligatoria').isISO8601(),
    validateRequest
  ],
  getTendencias
);

// Validar cierre
router.get(
  '/validar-cierre/:semanaId',
  validateMongoId('semanaId'),
  validarCierre
);

module.exports = router;