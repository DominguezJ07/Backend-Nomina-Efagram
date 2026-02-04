const express = require('express');
const { body, query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getRegistros,
  getRegistro,
  createRegistro,
  updateRegistro,
  deleteRegistro,
  getResumenTrabajador,
  getRegistrosSemana
} = require('../controllers/registroDiario.controller');

const router = express.Router();

// Validaciones
const registroValidation = [
  body('fecha')
    .notEmpty()
    .withMessage('La fecha es obligatoria')
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('trabajador')
    .notEmpty()
    .withMessage('El trabajador es obligatorio')
    .isMongoId()
    .withMessage('ID de trabajador inválido'),
  body('proyecto_actividad_lote')
    .notEmpty()
    .withMessage('El PAL es obligatorio')
    .isMongoId()
    .withMessage('ID de PAL inválido'),
  body('cantidad_ejecutada')
    .notEmpty()
    .withMessage('La cantidad ejecutada es obligatoria')
    .isFloat({ min: 0 })
    .withMessage('La cantidad debe ser un número positivo'),
  body('horas_trabajadas')
    .optional()
    .isFloat({ min: 0, max: 24 })
    .withMessage('Las horas deben estar entre 0 y 24'),
  body('cuadrilla')
    .optional()
    .isMongoId()
    .withMessage('ID de cuadrilla inválido'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas especiales
router.get('/resumen/:trabajadorId',
  validateMongoId('trabajadorId'),
  [
    query('fecha_inicio').notEmpty().withMessage('Fecha inicio obligatoria').isISO8601(),
    query('fecha_fin').notEmpty().withMessage('Fecha fin obligatoria').isISO8601(),
    validateRequest
  ],
  getResumenTrabajador
);

router.get('/semana/:semanaId',
  validateMongoId('semanaId'),
  getRegistrosSemana
);

// Rutas CRUD
router.get('/', getRegistros);
router.get('/:id', validateMongoId('id'), getRegistro);

router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  registroValidation,
  createRegistro
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  updateRegistro
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteRegistro
);

module.exports = router;