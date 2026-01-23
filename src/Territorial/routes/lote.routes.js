const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getLotes,
  getLote,
  getJerarquiaLote,
  createLote,
  updateLote,
  deleteLote
} = require('../controllers/lote.controller');

const router = express.Router();

// Validaciones
const loteValidation = [
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
  body('finca')
    .notEmpty()
    .withMessage('La finca es obligatoria')
    .isMongoId()
    .withMessage('ID de finca inválido'),
  body('area')
    .notEmpty()
    .withMessage('El área es obligatoria')
    .isFloat({ min: 0.01 })
    .withMessage('El área debe ser mayor a 0'),
  body('pendiente')
    .optional()
    .isIn(['Plana', 'Ondulada', 'Quebrada', 'Escarpada'])
    .withMessage('Pendiente inválida'),
  body('accesibilidad')
    .optional()
    .isIn(['Buena', 'Regular', 'Difícil'])
    .withMessage('Accesibilidad inválida'),
  validateRequest
];

// Rutas públicas
router.get('/', getLotes);
router.get('/:id', validateMongoId('id'), getLote);
router.get('/:id/jerarquia', validateMongoId('id'), getJerarquiaLote);

// Rutas protegidas
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.ADMIN_FINCA, ROLES.SUPERVISOR),
  loteValidation,
  createLote
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.ADMIN_FINCA, ROLES.SUPERVISOR),
  validateMongoId('id'),
  loteValidation,
  updateLote
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteLote
);

module.exports = router;