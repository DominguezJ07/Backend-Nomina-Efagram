const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getFincas,
  getFinca,
  createFinca,
  updateFinca,
  deleteFinca,
  getLotesByFinca
} = require('../controllers/finca.controller');

const router = express.Router();

// Validaciones
const fincaValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .isLength({ min: 2, max: 20 })
    .withMessage('El código debe tener entre 2 y 20 caracteres')
    .trim()
    .toUpperCase(),
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres')
    .trim(),
  body('nucleo')
    .notEmpty()
    .withMessage('El núcleo es obligatorio')
    .isMongoId()
    .withMessage('ID de núcleo inválido'),
  body('area_total')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El área debe ser un número positivo'),
  validateRequest
];

// Rutas públicas
router.get('/', getFincas);
router.get('/:id', validateMongoId('id'), getFinca);
router.get('/:id/lotes', validateMongoId('id'), getLotesByFinca);

// Rutas protegidas
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.ADMIN_FINCA),
  fincaValidation,
  createFinca
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.ADMIN_FINCA),
  validateMongoId('id'),
  fincaValidation,
  updateFinca
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteFinca
);

module.exports = router;