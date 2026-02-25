const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getIntervenciones,
  getIntervencion,
  createIntervencion,
  updateIntervencion,
  deleteIntervencion
} = require('../controllers/intervencion.controller');

const router = express.Router();

// ── Validaciones CREAR ────────────────────────────────────
const intervencionCreateValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .trim()
    .toUpperCase()
    .isLength({ min: 2, max: 20 }).withMessage('El código debe tener entre 2 y 20 caracteres'),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('proceso')
    .notEmpty().withMessage('El proceso es obligatorio')
    .isMongoId().withMessage('El proceso debe ser un ID válido'),
  body('descripcion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('La descripción no puede superar 500 caracteres'),
  validateRequest
];

// ── Validaciones EDITAR ───────────────────────────────────
const intervencionUpdateValidation = [
  body('codigo')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .isLength({ min: 2, max: 20 }).withMessage('El código debe tener entre 2 y 20 caracteres'),
  body('nombre')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('proceso')
    .optional({ values: 'falsy' })
    .isMongoId().withMessage('El proceso debe ser un ID válido'),
  body('descripcion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 }).withMessage('La descripción no puede superar 500 caracteres'),
  body('activo')
    .optional()
    .isBoolean().withMessage('El estado debe ser verdadero o falso'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Consulta (todos los roles autenticados) ───────────────
router.get('/', getIntervenciones);
router.get('/:id', validateMongoId('id'), getIntervencion);

// ── Crear (Admin, Jefe) ───────────────────────────────────
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  intervencionCreateValidation,
  createIntervencion
);

// ── Editar (Admin, Jefe) ──────────────────────────────────
router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  intervencionUpdateValidation,
  updateIntervencion
);

// ── Desactivar (Admin) ────────────────────────────────────
router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteIntervencion
);

module.exports = router;