const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getRoles,
  getRol,
  getRolByCodigo,
  createRol,
  updateRol,
  deleteRol,
  agregarPermisos,
  removerPermisos
} = require('../controllers/rol.controller');

const router = express.Router();

// Validaciones para crear
const createRolValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .trim()
    .toUpperCase(),
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('descripcion')
    .optional()
    .trim(),
  body('permisos')
    .optional()
    .isArray()
    .withMessage('Los permisos deben ser un array'),
  validateRequest
];

// Validaciones para actualizar (campos opcionales)
const updateRolValidation = [
  body('codigo')
    .optional()
    .trim()
    .toUpperCase(),
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('descripcion')
    .optional()
    .trim(),
  body('permisos')
    .optional()
    .isArray()
    .withMessage('Los permisos deben ser un array'),
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser verdadero o falso'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta (todos los roles autenticados)
router.get('/', getRoles);
router.get('/codigo/:codigo', getRolByCodigo);
router.get('/:id', validateMongoId('id'), getRol);

// Rutas de modificación (solo Admin)
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA),
  createRolValidation,
  createRol
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  updateRolValidation,
  updateRol
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteRol
);

router.post(
  '/:id/permisos',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  body('permisos').isArray().withMessage('Los permisos deben ser un array'),
  validateRequest,
  agregarPermisos
);

router.delete(
  '/:id/permisos',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  body('permisos').isArray().withMessage('Los permisos deben ser un array'),
  validateRequest,
  removerPermisos
);

module.exports = router;