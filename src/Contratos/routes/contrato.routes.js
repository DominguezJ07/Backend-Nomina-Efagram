const express = require('express');
const { body, query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getContratos,
  getContrato,
  createContrato,
  updateContrato,
  deleteContrato,
  getTrabajadoresDisponibles,
} = require('../controllers/contrato.controller');

const router = express.Router();

// ── Validaciones crear ────────────────────────────────────────────
const createContratoValidation = [
  body('codigo')
    .notEmpty().withMessage('El código es obligatorio')
    .trim()
    .toUpperCase(),
  body('finca')
    .notEmpty().withMessage('La finca es obligatoria')
    .isMongoId().withMessage('ID de finca inválido'),
  body('lotes')
    .isArray({ min: 1 }).withMessage('Debe seleccionar al menos un lote')
    .custom((v) => v.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Uno o más IDs de lote son inválidos'),
  body('actividades')
    .isArray({ min: 1 }).withMessage('Debe seleccionar al menos una actividad')
    .custom((v) => v.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Uno o más IDs de actividad son inválidos'),
  body('cuadrilla')
    .notEmpty().withMessage('La cuadrilla es obligatoria')
    .isMongoId().withMessage('ID de cuadrilla inválido'),
  body('fecha_inicio')
    .notEmpty().withMessage('La fecha de inicio es obligatoria')
    .isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin')
    .optional({ nullable: true })
    .isISO8601().withMessage('Fecha de fin inválida'),
  body('observaciones')
    .optional()
    .trim(),
  validateRequest,
];

// ── Validaciones actualizar ───────────────────────────────────────
const updateContratoValidation = [
  body('codigo').optional().trim().toUpperCase(),
  body('finca').optional().isMongoId().withMessage('ID de finca inválido'),
  body('lotes')
    .optional()
    .isArray({ min: 1 }).withMessage('Debe enviar al menos un lote')
    .custom((v) => v.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Uno o más IDs de lote son inválidos'),
  body('actividades')
    .optional()
    .isArray({ min: 1 }).withMessage('Debe enviar al menos una actividad')
    .custom((v) => v.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Uno o más IDs de actividad son inválidos'),
  body('cuadrilla').optional().isMongoId().withMessage('ID de cuadrilla inválido'),
  body('fecha_inicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').optional({ nullable: true }).isISO8601().withMessage('Fecha de fin inválida'),
  body('estado')
    .optional()
    .isIn(['BORRADOR', 'ACTIVO', 'CERRADO', 'CANCELADO'])
    .withMessage('Estado inválido'),
  body('observaciones').optional().trim(),
  validateRequest,
];

// ── Todas las rutas requieren autenticación ───────────────────────
router.use(authenticate);

// ── Consultas ─────────────────────────────────────────────────────
router.get('/', getContratos);
router.get('/:id', validateMongoId('id'), getContrato);
router.get(
  '/:id/trabajadores-disponibles',
  validateMongoId('id'),
  [
    query('q').optional().trim(),
    validateRequest,
  ],
  getTrabajadoresDisponibles
);

// ── Mutaciones ────────────────────────────────────────────────────
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  createContratoValidation,
  createContrato
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  updateContratoValidation,
  updateContrato
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteContrato
);

module.exports = router;