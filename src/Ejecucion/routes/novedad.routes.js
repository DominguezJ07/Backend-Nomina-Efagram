const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES, TIPOS_NOVEDAD } = require('../../config/constants');
const {
  getNovedades,
  getNovedad,
  createNovedad,
  updateNovedad,
  aprobarNovedad,
  rechazarNovedad,
  deleteNovedad,
  getNovedadesByTrabajador
} = require('../controllers/novedad.controller');

const router = express.Router();

// Validaciones
const novedadValidation = [
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
  body('tipo')
    .notEmpty()
    .withMessage('El tipo es obligatorio')
    .isIn(Object.values(TIPOS_NOVEDAD))
    .withMessage('Tipo de novedad inválido'),
  body('descripcion')
    .notEmpty()
    .withMessage('La descripción es obligatoria')
    .trim(),
  body('dias')
    .optional()
    .isFloat({ min: 0.5 })
    .withMessage('Los días deben ser al menos 0.5'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas especiales
router.get('/trabajador/:trabajadorId',
  validateMongoId('trabajadorId'),
  getNovedadesByTrabajador
);

router.post('/:id/aprobar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  aprobarNovedad
);

router.post('/:id/rechazar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  [
    body('motivo').notEmpty().withMessage('El motivo es obligatorio'),
    validateRequest
  ],
  rechazarNovedad
);

// Rutas CRUD
router.get('/', getNovedades);
router.get('/:id', validateMongoId('id'), getNovedad);

router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR, ROLES.TALENTO_HUMANO),
  novedadValidation,
  createNovedad
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  updateNovedad
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteNovedad
);

module.exports = router;