const express = require('express');
const { query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getReporteAvanceMetas,
  getReportePorActividad,
  getReporteSemana,
  compararSemanas,
  getNominaTrabajador,
  getResumenNominaGeneral,
  getDashboardGeneral
} = require('../controllers/reportes.controller');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Validación de fechas
const validarFechas = [
  query('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('fecha_inicio debe ser una fecha válida'),
  query('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('fecha_fin debe ser una fecha válida'),
  validateRequest
];

/**
 * Rutas de Reportes Generales
 */

// Dashboard general (reporte completo)
router.get(
  '/dashboard',
  validarFechas,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.ADMIN_FINCA),
  getDashboardGeneral
);

// Avance de metas
router.get(
  '/avance-metas',
  [
    query('proyecto_id').optional().isMongoId().withMessage('ID de proyecto inválido'),
    ...validarFechas
  ],
  getReporteAvanceMetas
);

// Reporte por actividad
router.get(
  '/por-actividad',
  validarFechas,
  getReportePorActividad
);

/**
 * Rutas de Control Semanal
 */

// Reporte de semana específica
router.get(
  '/semana/:semanaId',
  validateMongoId('semanaId'),
  getReporteSemana
);

// Comparar dos semanas
router.get(
  '/comparar-semanas',
  [
    query('semana1').notEmpty().isMongoId().withMessage('ID de semana1 inválido'),
    query('semana2').notEmpty().isMongoId().withMessage('ID de semana2 inválido'),
    validateRequest
  ],
  compararSemanas
);

/**
 * Rutas de Nómina
 */

// Nómina de trabajador específico
router.get(
  '/nomina/:trabajadorId',
  [
    validateMongoId('trabajadorId'),
    query('fecha_inicio').notEmpty().withMessage('fecha_inicio es obligatoria'),
    query('fecha_fin').notEmpty().withMessage('fecha_fin es obligatoria'),
    ...validarFechas
  ],
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  getNominaTrabajador
);

// Resumen general de nómina
router.get(
  '/nomina-general',
  [
    query('fecha_inicio').notEmpty().withMessage('fecha_inicio es obligatoria'),
    query('fecha_fin').notEmpty().withMessage('fecha_fin es obligatoria'),
    ...validarFechas
  ],
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  getResumenNominaGeneral
);

module.exports = router;