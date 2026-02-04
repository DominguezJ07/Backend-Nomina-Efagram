const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getCuadrillas,
  getCuadrilla,
  createCuadrilla,
  updateCuadrilla,
  agregarMiembros,
  removerMiembro,
  deleteCuadrilla
} = require('../controllers/cuadrilla.controller');

const router = express.Router();

// Validaciones para crear
const createCuadrillaValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .trim()
    .toUpperCase(),
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .trim(),
  body('supervisor')
    .notEmpty()
    .withMessage('El supervisor es obligatorio')
    .isMongoId()
    .withMessage('ID de supervisor inválido'),
  body('nucleo')
    .optional()
    .isMongoId()
    .withMessage('ID de núcleo inválido'),
  body('miembros')
    .optional()
    .isArray()
    .withMessage('Los miembros deben ser un array'),
  validateRequest
];

// Validaciones para actualizar
const updateCuadrillaValidation = [
  body('codigo')
    .optional()
    .trim()
    .toUpperCase(),
  body('nombre')
    .optional()
    .trim(),
  body('supervisor')
    .optional()
    .isMongoId()
    .withMessage('ID de supervisor inválido'),
  body('nucleo')
    .optional()
    .isMongoId()
    .withMessage('ID de núcleo inválido'),
  body('activa')
    .optional()
    .isBoolean()
    .withMessage('El campo activa debe ser verdadero o falso'),
  body('observaciones')
    .optional()
    .trim(),
  validateRequest
];

// Validación para agregar miembros
const agregarMiembrosValidation = [
  body('personalId')
    .notEmpty()
    .withMessage('El ID de la persona es obligatorio'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta
router.get('/', getCuadrillas);
router.get('/:id', validateMongoId('id'), getCuadrilla);

// Rutas de modificación
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  createCuadrillaValidation,
  createCuadrilla
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updateCuadrillaValidation,
  updateCuadrilla
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteCuadrilla
);

router.post(
  '/:id/miembros',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  agregarMiembrosValidation,
  agregarMiembros
);

router.delete(
  '/:id/miembros/:personaId',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  validateMongoId('personaId'),
  removerMiembro
);

module.exports = router;