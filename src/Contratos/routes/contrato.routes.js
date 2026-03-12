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
  getActividadesDisponiblesSubproyecto,
} = require('../controllers/contrato.controller');

const router = express.Router();

// ── Validación de actividades (array de objetos con cantidad y precio) ──
const actividadItemValidation = [
  body('actividades').isArray({ min: 1 }).withMessage('Debe incluir al menos una actividad'),
  body('actividades.*.actividad').isMongoId().withMessage('ID de actividad inválido'),
  body('actividades.*.cantidad')
    .isFloat({ gt: 0 }).withMessage('La cantidad debe ser mayor a 0'),
  body('actividades.*.precio_unitario')
    .isFloat({ min: 0 }).withMessage('El precio unitario debe ser >= 0'),
];

// ── Validaciones crear ────────────────────────────────────────────
const createContratoValidation = [
  body('codigo').notEmpty().withMessage('El código es obligatorio').trim().toUpperCase(),
  body('subproyecto').notEmpty().isMongoId().withMessage('ID de subproyecto inválido'),
  body('finca').notEmpty().isMongoId().withMessage('ID de finca inválido'),
  body('lotes')
    .isArray({ min: 1 }).withMessage('Debe seleccionar al menos un lote')
    .custom((v) => v.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Uno o más IDs de lote son inválidos'),
  ...actividadItemValidation,
  body('cuadrilla').notEmpty().isMongoId().withMessage('ID de cuadrilla inválido'),
  body('fecha_inicio').notEmpty().isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').optional({ nullable: true }).isISO8601().withMessage('Fecha de fin inválida'),
  body('observaciones').optional().trim(),
  validateRequest,
];

// ── Validaciones actualizar ───────────────────────────────────────
const updateContratoValidation = [
  body('codigo').optional().trim().toUpperCase(),
  body('subproyecto').optional().isMongoId().withMessage('ID de subproyecto inválido'),
  body('finca').optional().isMongoId().withMessage('ID de finca inválido'),
  body('lotes')
    .optional()
    .isArray({ min: 1 }).withMessage('Debe enviar al menos un lote')
    .custom((v) => v.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Uno o más IDs de lote son inválidos'),
  body('actividades').optional().isArray({ min: 1 }),
  body('actividades.*.actividad').optional().isMongoId(),
  body('actividades.*.cantidad').optional().isFloat({ gt: 0 }),
  body('actividades.*.precio_unitario').optional().isFloat({ min: 0 }),
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

router.use(authenticate);

// ── Consultas ─────────────────────────────────────────────────────
router.get('/', getContratos);
router.get('/:id', validateMongoId('id'), getContrato);
router.get(
  '/:id/trabajadores-disponibles',
  validateMongoId('id'),
  [query('q').optional().trim(), validateRequest],
  getTrabajadoresDisponibles
);

// ── Actividades disponibles de un subproyecto para armar un contrato ──
router.get(
  '/subproyecto/:subproyectoId/actividades-disponibles',
  validateMongoId('subproyectoId'),
  [query('excludeContratoId').optional().isMongoId(), validateRequest],
  getActividadesDisponiblesSubproyecto
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