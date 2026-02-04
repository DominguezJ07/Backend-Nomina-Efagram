const express = require('express');
const { body, query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getConsolidados,
  getConsolidado,
  generarConsolidado,
  generarConsolidadosSemana,
  getConsolidadosByTrabajador,
  aprobarConsolidado,
  updateConsolidado
} = require('../controllers/consolidado.controller');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas especiales (antes de :id)
router.post(
  '/generar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  [
    body('semana')
      .notEmpty()
      .withMessage('La semana es obligatoria')
      .isMongoId()
      .withMessage('ID de semana inválido'),
    body('trabajador')
      .notEmpty()
      .withMessage('El trabajador es obligatorio')
      .isMongoId()
      .withMessage('ID de trabajador inválido'),
    body('pal')
      .notEmpty()
      .withMessage('El PAL es obligatorio')
      .isMongoId()
      .withMessage('ID de PAL inválido'),
    validateRequest
  ],
  generarConsolidado
);

router.post(
  '/generar-semana',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  [
    body('semana')
      .notEmpty()
      .withMessage('La semana es obligatoria')
      .isMongoId()
      .withMessage('ID de semana inválido'),
    validateRequest
  ],
  generarConsolidadosSemana
);

router.get(
  '/trabajador/:trabajadorId',
  validateMongoId('trabajadorId'),
  [
    query('fecha_inicio').notEmpty().withMessage('Fecha inicio obligatoria').isISO8601(),
    query('fecha_fin').notEmpty().withMessage('Fecha fin obligatoria').isISO8601(),
    validateRequest
  ],
  getConsolidadosByTrabajador
);

router.post(
  '/:id/aprobar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  aprobarConsolidado
);

// Rutas CRUD
router.get('/', getConsolidados);
router.get('/:id', validateMongoId('id'), getConsolidado);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updateConsolidado
);

module.exports = router;