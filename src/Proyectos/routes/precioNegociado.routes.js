const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getPreciosNegociados,
  getHistorialPrecios,
  createPrecioNegociado
} = require('../controllers/precioNegociado.controller');

const router = express.Router();

// Validaciones para crear precio negociado
const precioNegociadoValidation = [
  body('proyecto_actividad_lote')
    .notEmpty()
    .withMessage('El PAL es obligatorio')
    .isMongoId()
    .withMessage('ID de PAL inválido'),
  body('precio_acordado')
    .notEmpty()
    .withMessage('El precio acordado es obligatorio')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('fecha_negociacion')
    .optional()
    .isISO8601()
    .withMessage('Fecha de negociación inválida'),
  body('negociado_por')
    .optional()
    .isMongoId()
    .withMessage('ID de negociador inválido'),
  body('autorizado_por')
    .optional()
    .isMongoId()
    .withMessage('ID de autorizador inválido'),
  body('motivo')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('El motivo no puede exceder 500 caracteres'),
  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta (cualquier usuario autenticado)
router.get('/', getPreciosNegociados);
router.get('/historial/:palId', validateMongoId('palId'), getHistorialPrecios);

// Rutas de modificación (solo roles autorizados)
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  precioNegociadoValidation,
  createPrecioNegociado
);

module.exports = router;