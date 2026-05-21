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
  getProgresoContrato,
  getActividadesDisponiblesSubproyecto,
} = require('../controllers/contrato.controller');

const router = express.Router();

const actividadItemValidation = [
  body('actividades').isArray({ min: 1 }).withMessage('Debe incluir al menos una actividad'),
  body('actividades.*.actividad').isMongoId().withMessage('ID de actividad inválido'),
  body('actividades.*.cantidad').isFloat({ gt: 0 }).withMessage('La cantidad debe ser mayor a 0'),
  body('actividades.*.precio_unitario').isFloat({ min: 0 }).withMessage('El precio debe ser >= 0'),
];

const createContratoValidation = [
  body('codigo').notEmpty().withMessage('El código es obligatorio').trim().toUpperCase(),
  body('subproyecto').notEmpty().isMongoId().withMessage('ID de subproyecto inválido'),
  body('finca')
    .notEmpty()
    .custom((value) => value && typeof value === 'object' && !Array.isArray(value))
    .withMessage('La finca debe enviarse como objeto'),
  // ✅ CAMBIO: lotes ahora son objetos embebidos { nombre }, no MongoIds
  body('lotes')
    .isArray({ min: 1 }).withMessage('Debe agregar al menos un lote')
    .custom((v) => v.every((l) => l && typeof l === 'object' && typeof l.nombre === 'string' && l.nombre.trim().length > 0))
    .withMessage('Cada lote debe tener un nombre válido'),
  body('lotes.*.nombre')
    .notEmpty().withMessage('El nombre del lote es obligatorio')
    .isString().withMessage('El nombre del lote debe ser texto')
    .trim(),
  ...actividadItemValidation,
  body('cuadrillas')
    .isArray({ min: 1 }).withMessage('Debe asignar al menos una cuadrilla')
    .custom((v) => v.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage('Uno o más IDs de cuadrilla son inválidos'),
  body('fecha_inicio')
  .optional({ nullable: true, checkFalsy: true })
  .isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Fecha de fin inválida'),
  body('observaciones').optional().trim(),
  body('estado').optional().isIn(['PENDIENTE', 'BORRADOR', 'ACTIVO', 'CERRADO', 'CANCELADO']).withMessage('Estado inválido'),
  validateRequest,
];

const updateContratoValidation = [
  body('codigo').optional().trim().toUpperCase(),
  body('subproyecto').optional().isMongoId(),
  body('finca')
    .optional()
    .custom((value) => value && typeof value === 'object' && !Array.isArray(value))
    .withMessage('La finca debe enviarse como objeto'),
  // ✅ CAMBIO: lotes ahora son objetos embebidos { nombre }, no MongoIds
  body('lotes')
    .optional()
    .isArray({ min: 1 })
    .custom((v) => v.every((l) => l && typeof l === 'object' && typeof l.nombre === 'string' && l.nombre.trim().length > 0))
    .withMessage('Cada lote debe tener un nombre válido'),
  body('actividades').optional().isArray({ min: 1 }),
  body('actividades.*.actividad').optional().isMongoId(),
  body('actividades.*.cantidad').optional().isFloat({ gt: 0 }),
  body('actividades.*.precio_unitario').optional().isFloat({ min: 0 }),
  body('cuadrillas').optional().isArray({ min: 1 })
    .custom((v) => v.every((id) => /^[0-9a-fA-F]{24}$/.test(id))),
  body('fecha_inicio').optional().isISO8601(),
  body('fecha_fin')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601().withMessage('Fecha de fin inválida'),
  body('estado').optional().isIn(['PENDIENTE', 'BORRADOR', 'ACTIVO', 'CERRADO', 'CANCELADO']),
  body('observaciones').optional().trim(),
  validateRequest,
];

router.use(authenticate);

router.get('/', getContratos);

// Ruta de actividades disponibles — ANTES de /:id para que Express no lo confunda
router.get(
  '/subproyecto/:subproyectoId/actividades-disponibles',
  validateMongoId('subproyectoId'),
  [query('excludeContratoId').optional().isMongoId(), validateRequest],
  getActividadesDisponiblesSubproyecto
);

// Ruta de progreso de contrato — ANTES de /:id para que Express no lo confunda
router.get(
  '/:id/progreso',
  validateMongoId('id'),
  getProgresoContrato
);

router.get('/:id', validateMongoId('id'), getContrato);

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