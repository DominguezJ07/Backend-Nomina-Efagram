const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getCargos,
  getCargo,
  createCargo,
  updateCargo,
  deleteCargo
} = require('../controllers/cargo.controller');

const router = express.Router();

// ── Validaciones CREAR ─────────────────────────────────────
const cargoCreateValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .isInt({ min: 1 }).withMessage('El código debe ser un número entero mayor a 0')
    .toInt(),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('activo')
    .optional()
    .isBoolean().withMessage('El estado debe ser verdadero o falso'),
  validateRequest
];

// ── Validaciones EDITAR ────────────────────────────────────
const cargoUpdateValidation = [
  body('codigo')
    .optional()
    .isInt({ min: 1 }).withMessage('El código debe ser un número entero mayor a 0')
    .toInt(),
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('activo')
    .optional()
    .isBoolean().withMessage('El estado debe ser verdadero o falso'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Consulta (todos los roles autenticados) ────────────────
router.get('/', getCargos);
router.get('/:id', validateMongoId('id'), getCargo);

// ── Crear (Admin, Jefe) ────────────────────────────────────
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  cargoCreateValidation,
  createCargo
);

// ── Editar (Admin, Jefe) ───────────────────────────────────
router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  cargoUpdateValidation,
  updateCargo
);

// ── Desactivar (Admin) ─────────────────────────────────────
router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteCargo
);

module.exports = router;