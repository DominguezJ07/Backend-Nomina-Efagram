const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getSemanas,
  getSemana,
  getSemanaActual,
  createSemana,
  updateSemana,
  cerrarSemana,
  puedeObtenerSemana,
  abrirSemana
} = require('../controllers/semanaOperativa.controller');

const router = express.Router();

// Validaciones
const semanaValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .trim()
    .toUpperCase(),
  body('fecha_inicio')
    .notEmpty()
    .withMessage('La fecha de inicio es obligatoria')
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('fecha_fin')
    .notEmpty()
    .withMessage('La fecha de fin es obligatoria')
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('año')
    .notEmpty()
    .withMessage('El año es obligatorio')
    .isInt({ min: 2020, max: 2100 })
    .withMessage('Año inválido'),
  body('numero_semana')
    .notEmpty()
    .withMessage('El número de semana es obligatorio')
    .isInt({ min: 1, max: 53 })
    .withMessage('Número de semana inválido'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas especiales (antes de :id)
router.get('/actual', getSemanaActual);

router.post('/:id/cerrar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  cerrarSemana
);

router.get('/:id/puede-cerrar',
  validateMongoId('id'),
  puedeObtenerSemana
);

router.post('/:id/abrir',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  abrirSemana
);

// Rutas CRUD
router.get('/', getSemanas);
router.get('/:id', validateMongoId('id'), getSemana);

router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  semanaValidation,
  createSemana
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updateSemana
);

module.exports = router;