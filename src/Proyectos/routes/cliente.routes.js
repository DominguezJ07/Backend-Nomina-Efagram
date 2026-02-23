const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente
} = require('../controllers/cliente.controller');

const router = express.Router();

// ── Validaciones para CREAR ───────────────────────────────
const clienteCreateValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .trim()
    .toUpperCase(),
  body('nit')
    .notEmpty()
    .withMessage('El NIT es obligatorio')
    .trim(),
  body('razon_social')
    .notEmpty()
    .withMessage('La razón social es obligatoria')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('La razón social debe tener entre 3 y 200 caracteres'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Email inválido'),
  body('contacto_email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Email de contacto inválido'),
  validateRequest
];

// ── Validaciones para EDITAR ──────────────────────────────
const clienteUpdateValidation = [
  body('codigo')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .notEmpty()
    .withMessage('El código no puede quedar vacío'),
  body('nit')
    .optional({ values: 'falsy' })
    .trim()
    .notEmpty()
    .withMessage('El NIT no puede quedar vacío'),
  body('razon_social')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('La razón social debe tener entre 3 y 200 caracteres'),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Email inválido'),
  body('contacto_email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Email de contacto inválido'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// ── Consulta (todos los roles autenticados) ───────────────
router.get('/', getClientes);
router.get('/:id', validateMongoId('id'), getCliente);

// ── Crear (Admin y Jefe) ──────────────────────────────────
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  clienteCreateValidation,
  createCliente
);

// ── Editar (Admin y Jefe) ─────────────────────────────────
router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  clienteUpdateValidation,
  updateCliente
);

// ── Desactivar (Admin y Jefe) — FIX: se agrega JEFE_OPERACIONES ──
router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteCliente
);

module.exports = router;