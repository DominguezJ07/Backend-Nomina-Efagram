const express = require('express');
const { body, query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES, ESTADOS_PROYECTO, TIPOS_CONTRATO } = require('../../config/constants');
const {
  getProyectos,
  getProyecto,
  getResumenProyecto,
  createProyecto,
  updateProyecto,
  cerrarProyecto,
  puedeObtenerProyecto,
  // ===== NUEVAS FUNCIONES DE PRESUPUESTO =====
  actualizarPresupuestoAnual,
  obtenerPresupuestoAnual,
  obtenerResumenPresupuestos
} = require('../controllers/proyecto.controller');

const router = express.Router();

// ====================================================================
// VALIDACIONES EXISTENTES
// ====================================================================

const proyectoValidation = [
  body('codigo')
    .notEmpty()
    .withMessage('El código es obligatorio')
    .trim()
    .toUpperCase(),
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('El nombre debe tener entre 3 y 200 caracteres'),
  body('cliente')
    .notEmpty()
    .withMessage('El cliente es obligatorio')
    .isMongoId()
    .withMessage('ID de cliente inválido'),
  body('fecha_inicio')
    .notEmpty()
    .withMessage('La fecha de inicio es obligatoria')
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  body('fecha_fin_estimada')
    .optional()
    .isISO8601()
    .withMessage('Fecha fin estimada inválida'),
  body('tipo_contrato')
    .optional()
    .isIn(Object.values(TIPOS_CONTRATO))
    .withMessage('Tipo de contrato inválido'),
  body('estado')
    .optional()
    .isIn(Object.values(ESTADOS_PROYECTO))
    .withMessage('Estado inválido'),
  body('responsable')
    .optional()
    .isMongoId()
    .withMessage('ID de responsable inválido'),
  validateRequest
];

// ====================================================================
// NUEVAS VALIDACIONES PARA PRESUPUESTO ANUAL
// ====================================================================

const presupuestoAnualValidation = [
  body('cantidad_actividades_planeadas')
    .notEmpty()
    .withMessage('La cantidad de actividades planeadas es obligatoria')
    .isInt({ min: 0 })
    .withMessage('La cantidad debe ser un número entero positivo'),
  
  body('monto_presupuestado')
    .notEmpty()
    .withMessage('El monto presupuestado es obligatorio')
    .isFloat({ min: 0 })
    .withMessage('El monto debe ser un número positivo'),
  
  body('año_fiscal')
    .notEmpty()
    .withMessage('El año fiscal es obligatorio')
    .isInt({ min: 2020, max: 2100 })
    .withMessage('El año fiscal debe estar entre 2020 y 2100'),
  
  body('observaciones_presupuesto')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Las observaciones no pueden exceder 500 caracteres'),
  
  // Validaciones para desglose por intervención (opcional)
  body('presupuesto_por_intervencion.mantenimiento.cantidad_actividades')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La cantidad de actividades de mantenimiento debe ser positiva'),
  
  body('presupuesto_por_intervencion.mantenimiento.monto_presupuestado')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto de mantenimiento debe ser positivo'),
  
  body('presupuesto_por_intervencion.no_programadas.cantidad_actividades')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La cantidad de actividades no programadas debe ser positiva'),
  
  body('presupuesto_por_intervencion.no_programadas.monto_presupuestado')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto de no programadas debe ser positivo'),
  
  body('presupuesto_por_intervencion.establecimiento.cantidad_actividades')
    .optional()
    .isInt({ min: 0 })
    .withMessage('La cantidad de actividades de establecimiento debe ser positiva'),
  
  body('presupuesto_por_intervencion.establecimiento.monto_presupuestado')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El monto de establecimiento debe ser positivo'),
  
  validateRequest
];

// ====================================================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ====================================================================

router.use(authenticate);

// ====================================================================
// RUTAS DE PRESUPUESTO ANUAL (DEBEN IR ANTES DE LAS RUTAS CON :id)
// ====================================================================

// Obtener resumen de presupuestos de todos los proyectos
router.get(
  '/presupuestos/resumen',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  obtenerResumenPresupuestos
);

// ====================================================================
// RUTAS DE CONSULTA EXISTENTES
// ====================================================================

router.get('/', getProyectos);
router.get('/:id', validateMongoId('id'), getProyecto);
router.get('/:id/resumen', validateMongoId('id'), getResumenProyecto);
router.get('/:id/puede-cerrar', validateMongoId('id'), puedeObtenerProyecto);

// ====================================================================
// RUTAS DE PRESUPUESTO ANUAL ESPECÍFICAS DE UN PROYECTO
// ====================================================================

// Actualizar presupuesto anual de un proyecto específico (solo admin)
router.put(
  '/:id/presupuesto-anual',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  presupuestoAnualValidation,
  actualizarPresupuestoAnual
);

// Obtener presupuesto anual con métricas de un proyecto
router.get(
  '/:id/presupuesto-anual',
  validateMongoId('id'),
  obtenerPresupuestoAnual
);

// ====================================================================
// RUTAS DE MODIFICACIÓN EXISTENTES
// ====================================================================

router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  proyectoValidation,
  createProyecto
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  proyectoValidation,
  updateProyecto
);

router.post(
  '/:id/cerrar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  cerrarProyecto
);

module.exports = router;