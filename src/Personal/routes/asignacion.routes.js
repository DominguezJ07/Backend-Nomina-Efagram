const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getAsignaciones,
  getAsignacionesBySupervisor,
  getAsignacion,
  createAsignacion,
  updateAsignacion,
  finalizarAsignacion,
  deleteAsignacion
} = require('../controllers/asignacionSupervisor.controller'); // ← CAMBIADO AQUÍ

const router = express.Router();

// Validaciones para crear asignación
const createAsignacionValidation = [
  body('supervisor')
    .notEmpty()
    .withMessage('El supervisor es obligatorio')
    .isMongoId()
    .withMessage('ID de supervisor inválido'),
  body('lote')
    .notEmpty()
    .withMessage('El lote es obligatorio')
    .isMongoId()
    .withMessage('ID de lote inválido'),
  body('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido')
    .toDate(),
  body('observaciones')
    .optional()
    .trim(),
  validateRequest
];

// Validaciones para actualizar asignación
const updateAsignacionValidation = [
  body('supervisor')
    .optional()
    .isMongoId()
    .withMessage('ID de supervisor inválido'),
  body('lote')
    .optional()
    .isMongoId()
    .withMessage('ID de lote inválido'),
  body('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido')
    .toDate(),
  body('observaciones')
    .optional()
    .trim(),
  validateRequest
];

// Validaciones para finalizar asignación
const finalizarAsignacionValidation = [
  body('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido')
    .toDate(),
  body('observaciones')
    .optional()
    .trim(),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta
router.get('/', getAsignaciones);

router.get(
  '/supervisor/:supervisorId',
  validateMongoId('supervisorId'),
  getAsignacionesBySupervisor
);

router.get(
  '/:id',
  validateMongoId('id'),
  getAsignacion
);

// Rutas de modificación
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  createAsignacionValidation,
  createAsignacion
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updateAsignacionValidation,
  updateAsignacion
);

router.post(
  '/:id/finalizar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  finalizarAsignacionValidation,
  finalizarAsignacion
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteAsignacion
);

module.exports = router;