const express = require('express');
const { body, param, query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getZonas,
  getZona,
  getZonaByCodigo,
  createZona,
  updateZona,
  deleteZona,
  getNucleosByZona
} = require('../controllers/zona.controller');

const router = express.Router();

// Validaciones para crear
const createZonaValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .isInt({ min: 1, max: 99 })
    .withMessage('El código debe ser un número entre 1 y 99 (ej: 1, 05, 23, 99)'),
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isString()
    .trim(),
  body('descripcion')
    .optional()
    .isString()
    .trim(),
  validateRequest
];

// Validaciones para actualizar (campos opcionales)
const updateZonaValidation = [
  body('codigo')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('El código debe ser un número entre 1 y 99'),
  body('nombre')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacío'),
  body('descripcion')
    .optional()
    .isString()
    .trim(),
  body('activa')
    .optional()
    .isBoolean()
    .withMessage('El campo activa debe ser verdadero o falso'),
  validateRequest
];

// Rutas públicas (solo lectura)
router.get('/', getZonas);
router.get('/codigo/:codigo', getZonaByCodigo);
router.get('/:id', validateMongoId('id'), getZona);
router.get('/:id/nucleos', validateMongoId('id'), getNucleosByZona);

// Rutas protegidas
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  createZonaValidation,
  createZona
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updateZonaValidation,
  updateZona
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteZona
);

module.exports = router;  