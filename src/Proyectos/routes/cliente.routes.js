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

// Validaciones
const clienteValidation = [
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
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta (todos los roles autenticados)
router.get('/', getClientes);
router.get('/:id', validateMongoId('id'), getCliente);

// Rutas de modificación (solo Admin y Jefe)
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  clienteValidation,
  createCliente
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  clienteValidation,
  updateCliente
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteCliente
);

module.exports = router;