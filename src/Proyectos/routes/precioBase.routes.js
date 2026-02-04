const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getPreciosBase,
  getPrecioBase,
  createPrecioBase,
  updatePrecioBase
} = require('../controllers/precioBase.controller');

const router = express.Router();

// Validaciones
const precioBaseValidation = [
  body('actividad')
    .notEmpty()
    .withMessage('La actividad es obligatoria')
    .isMongoId()
    .withMessage('ID de actividad inválido'),
  body('cliente')
    .notEmpty()
    .withMessage('El cliente es obligatorio')
    .isMongoId()
    .withMessage('ID de cliente inválido'),
  body('precio_cliente')
    .notEmpty()
    .withMessage('El precio al cliente es obligatorio')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('precio_base_trabajador')
    .notEmpty()
    .withMessage('El precio base al trabajador es obligatorio')
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número positivo'),
  body('fecha_vigencia_desde')
    .optional()
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('fecha_vigencia_hasta')
    .optional()
    .isISO8601()
    .withMessage('Fecha inválida'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta
router.get('/', getPreciosBase);
router.get('/:id', validateMongoId('id'), getPrecioBase);

// Rutas de modificación
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  precioBaseValidation,
  createPrecioBase
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  precioBaseValidation,
  updatePrecioBase
);

module.exports = router;