const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES, TIPOS_NOVEDAD } = require('../../config/constants');
const {
  getNovedades,
  getNovedad,
  createNovedad,
  crearNoTrabajado, // 👈 AGREGADO
  updateNovedad,
  aprobarNovedad,
  rechazarNovedad,
  deleteNovedad,
  getNovedadesByTrabajador,
  getNovedadesByCuadrilla,
  getNovedadesByFinca,
  getResumenHorasLluvia
} = require('../controllers/novedad.controller');

const router = express.Router();

// ========================================
// VALIDACIONES
// ========================================

const novedadValidation = [
  body('fecha')
    .notEmpty().withMessage('La fecha es obligatoria')
    .isISO8601().withMessage('Fecha inválida'),

  body('trabajador')
    .notEmpty().withMessage('El trabajador es obligatorio')
    .isMongoId().withMessage('ID de trabajador inválido'),

  body('cuadrilla')
    .optional()
    .isMongoId().withMessage('ID de cuadrilla inválido'),

  body('finca')
    .optional()
    .isMongoId().withMessage('ID de finca inválido'),

  body('tipo')
    .notEmpty().withMessage('El tipo es obligatorio')
    .isIn(Object.values(TIPOS_NOVEDAD)).withMessage('Tipo de novedad inválido'),

  body('descripcion')
    .notEmpty().withMessage('La descripción es obligatoria')
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('La descripción debe tener entre 10 y 500 caracteres'),

  body('horas')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 24 }).withMessage('Las horas deben estar entre 0 y 24'),

  body('dias')
    .optional()
    .isFloat({ min: 0.5 }).withMessage('Los días deben ser al menos 0.5'),

  body('afecta_nomina')
    .optional()
    .isBoolean().withMessage('afecta_nomina debe ser verdadero o falso'),

  body('requiere_aprobacion')
    .optional()
    .isBoolean().withMessage('requiere_aprobacion debe ser verdadero o falso'),

  body('fecha_inicio')
    .optional()
    .isISO8601().withMessage('Fecha de inicio inválida'),

  body('fecha_fin')
    .optional()
    .isISO8601().withMessage('Fecha fin inválida')
    .custom((value, { req }) => {
      if (req.body.fecha_inicio && value) {
        if (new Date(value) < new Date(req.body.fecha_inicio)) {
          throw new Error('La fecha fin no puede ser anterior a la fecha inicio');
        }
      }
      return true;
    }),

  body('documento_soporte')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('El documento de soporte no puede exceder 255 caracteres'),

  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Las observaciones no pueden exceder 1000 caracteres'),

  body('registrado_por')
    .optional()
    .isMongoId().withMessage('ID de registrado_por inválido'),

  validateRequest
];

const novedadUpdateValidation = [
  body('fecha').optional().isISO8601().withMessage('Fecha inválida'),
  body('trabajador').optional().isMongoId().withMessage('ID de trabajador inválido'),
  body('cuadrilla').optional().isMongoId().withMessage('ID de cuadrilla inválido'),
  body('finca').optional().isMongoId().withMessage('ID de finca inválido'),
  body('tipo').optional().isIn(Object.values(TIPOS_NOVEDAD)).withMessage('Tipo de novedad inválido'),
  body('descripcion').optional().trim().isLength({ min: 10, max: 500 }).withMessage('La descripción debe tener entre 10 y 500 caracteres'),
  body('horas').optional({ nullable: true }).isFloat({ min: 0, max: 24 }).withMessage('Las horas deben estar entre 0 y 24'),
  body('dias').optional().isFloat({ min: 0.5 }).withMessage('Los días deben ser al menos 0.5'),
  body('afecta_nomina').optional().isBoolean().withMessage('afecta_nomina debe ser verdadero o falso'),
  body('fecha_inicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').optional().isISO8601().withMessage('Fecha fin inválida'),
  validateRequest
];

const rechazarValidation = [
  body('motivo')
    .notEmpty().withMessage('El motivo es obligatorio')
    .trim()
    .isLength({ min: 10, max: 500 }).withMessage('El motivo debe tener entre 10 y 500 caracteres'),
  body('aprobado_por').optional().isMongoId().withMessage('ID de aprobado_por inválido'),
  validateRequest
];

const aprobarValidation = [
  body('aprobado_por').optional().isMongoId().withMessage('ID de aprobado_por inválido'),
  validateRequest
];

// ========================================
// RUTAS
// ========================================

router.use(authenticate);

// ESPECIALES

router.get('/resumen/horas-lluvia', getResumenHorasLluvia);

router.get('/trabajador/:trabajadorId',
  validateMongoId('trabajadorId'),
  getNovedadesByTrabajador
);

router.get('/cuadrilla/:cuadrillaId',
  validateMongoId('cuadrillaId'),
  getNovedadesByCuadrilla
);

router.get('/finca/:fincaId',
  validateMongoId('fincaId'),
  getNovedadesByFinca
);

// 🔥 NUEVA RUTA NO TRABAJADO
router.post('/no-trabajado',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR, ROLES.TALENTO_HUMANO),
  crearNoTrabajado
);

// ACCIONES

router.post('/:id/aprobar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  aprobarValidation,
  aprobarNovedad
);

router.post('/:id/rechazar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  rechazarValidation,
  rechazarNovedad
);

// CRUD

router.get('/', getNovedades);

router.get('/:id',
  validateMongoId('id'),
  getNovedad
);

router.post('/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR, ROLES.TALENTO_HUMANO),
  novedadValidation,
  createNovedad
);

router.put('/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  novedadUpdateValidation,
  updateNovedad
);

router.delete('/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteNovedad
);

module.exports = router;