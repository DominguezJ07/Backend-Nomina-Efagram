const express = require('express');
const { body, query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES, ESTADOS_PAL } = require('../../config/constants');
const {
  getPALs,
  getPAL,
  createPAL,
  updatePAL,
  aumentarMeta,
  actualizarCantidadEjecutada,
  verificarCumplimientoMeta,
  getPrecioVigente,
  marcarCumplida,
  cancelarPAL,
  getPalsAtrasados,
  getResumenCumplimiento
} = require('../controllers/proyectoActividadLote.controller');

const router = express.Router();

// Validaciones
const palValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .trim()
    .toUpperCase(),
  body('proyecto')
    .notEmpty()
    .withMessage('El proyecto es obligatorio')
    .isMongoId()
    .withMessage('ID de proyecto inválido'),
  body('lote')
    .notEmpty()
    .withMessage('El lote es obligatorio')
    .isMongoId()
    .withMessage('ID de lote inválido'),
  body('actividad')
    .notEmpty()
    .withMessage('La actividad es obligatoria')
    .isMongoId()
    .withMessage('ID de actividad inválido'),
  body('meta_minima')
    .notEmpty()
    .withMessage('La meta mínima es obligatoria')
    .isFloat({ min: 0 })
    .withMessage('La meta mínima debe ser un número positivo'),
  body('fecha_inicio_planificada')
    .notEmpty()
    .withMessage('La fecha de inicio planificada es obligatoria')
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('fecha_fin_planificada')
    .optional()
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('estado')
    .optional()
    .isIn(Object.values(ESTADOS_PAL))
    .withMessage('Estado inválido'),
  body('supervisor_asignado')
    .optional()
    .isMongoId()
    .withMessage('ID de supervisor inválido'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas especiales (antes de :id para evitar conflictos)
router.get('/atrasados', getPalsAtrasados);
router.get('/resumen-cumplimiento', 
  [
    query('fechaInicio').notEmpty().withMessage('Fecha inicio obligatoria').isISO8601(),
    query('fechaFin').notEmpty().withMessage('Fecha fin obligatoria').isISO8601(),
    validateRequest
  ],
  getResumenCumplimiento
);

// Rutas de consulta
router.get('/', getPALs);
router.get('/:id', validateMongoId('id'), getPAL);
router.get('/:id/verificar-meta', validateMongoId('id'), verificarCumplimientoMeta);
router.get('/:id/precio-vigente', validateMongoId('id'), getPrecioVigente);

// Rutas de modificación
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  palValidation,
  createPAL
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updatePAL
);

router.post(
  '/:id/aumentar-meta',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  [
    body('nuevaMeta').isFloat({ min: 0 }).withMessage('Nueva meta inválida'),
    body('motivo').notEmpty().withMessage('El motivo es obligatorio'),
    validateRequest
  ],
  aumentarMeta
);

router.put(
  '/:id/cantidad-ejecutada',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  [
    body('cantidad').isFloat({ min: 0 }).withMessage('Cantidad inválida'),
    validateRequest
  ],
  actualizarCantidadEjecutada
);

router.post(
  '/:id/marcar-cumplida',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  marcarCumplida
);

router.post(
  '/:id/cancelar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  [
    body('motivo').notEmpty().withMessage('El motivo es obligatorio'),
    validateRequest
  ],
  cancelarPAL
);

module.exports = router;