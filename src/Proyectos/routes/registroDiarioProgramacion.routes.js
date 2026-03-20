// ==========================================
// RUTAS: REGISTRO DIARIO PROGRAMACIÓN
// ==========================================
// Descripción: Endpoints para gestionar registros diarios
// Ubicación: src/Proyectos/routes/registroDiarioProgramacion.routes.js

const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const registroDiarioController = require('../controllers/registroDiarioProgramacion.controller');

const router = express.Router();

// ── Aplicar autenticación a todas las rutas ─────────────────────────
router.use(authenticate);

// ────────────────────────────────────────────────────────────────────
// 1. GET: Obtener todos los registros diarios
// ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  registroDiarioController.getRegistrosDiarios
);

// ────────────────────────────────────────────────────────────────────
// 2. GET: Obtener registros de una semana completa
// ────────────────────────────────────────────────────────────────────
router.get(
  '/semana/:programacion_id',
  validateMongoId('programacion_id'),
  registroDiarioController.getRegistrosSemana
);

// ────────────────────────────────────────────────────────────────────
// 3. GET: Obtener estadísticas
// ────────────────────────────────────────────────────────────────────
router.get(
  '/estadisticas/:programacion_id',
  validateMongoId('programacion_id'),
  registroDiarioController.getEstadisticas
);

// ────────────────────────────────────────────────────────────────────
// 4. POST: Crear registro diario
// ────────────────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('programacion_id')
      .notEmpty()
      .isMongoId()
      .withMessage('Programación inválida'),
    body('fecha')
      .notEmpty()
      .isISO8601()
      .withMessage('Fecha inválida'),
    body('cantidad_ejecutada')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cantidad debe ser mayor o igual a 0'),
    body('observaciones')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Observaciones no deben exceder 300 caracteres'),
    body('tiempo_detenido')
      .optional()
      .isFloat({ min: 0, max: 24 })
      .withMessage('Tiempo detenido debe estar entre 0 y 24 horas'),
    body('motivo_detencion')
      .optional()
      .isIn(['LLUVIA','FALLA_EQUIPO','ACCIDENTE','FESTIVO','ENFERMEDAD','SUSPENSION_TRABAJO','PROBLEMAS_ORDEN_PUBLICO','OTRO'])
      .withMessage('Motivo de detención inválido'),
    body('motivo_detencion_otro')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('El detalle no debe exceder 200 caracteres'),
    validateRequest,
  ],
  registroDiarioController.createRegistroDiario
);

// ────────────────────────────────────────────────────────────────────
// 5. POST: Actualizar múltiples registros (IMPORTANTE: para el modal)
// ────────────────────────────────────────────────────────────────────
router.post(
  '/actualizar-multiples',
  [
    body('registros')
      .isArray({ min: 1 })
      .withMessage('Se requiere un array de registros'),
    body('registros.*.id')
      .notEmpty()
      .isMongoId()
      .withMessage('ID de registro inválido'),
    body('registros.*.cantidad_ejecutada')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cantidad debe ser mayor o igual a 0'),
    body('registros.*.tiempo_detenido')
      .optional()
      .isFloat({ min: 0, max: 24 })
      .withMessage('Tiempo detenido debe estar entre 0 y 24 horas'),
    body('registros.*.motivo_detencion')
      .optional()
      .isIn(['LLUVIA','FALLA_EQUIPO','ACCIDENTE','FESTIVO','ENFERMEDAD','SUSPENSION_TRABAJO','PROBLEMAS_ORDEN_PUBLICO','OTRO'])
      .withMessage('Motivo de detención inválido'),
    body('registros.*.motivo_detencion_otro')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('El detalle no debe exceder 200 caracteres'),
    validateRequest,
  ],
  registroDiarioController.updateMultiplesRegistros
);

// ────────────────────────────────────────────────────────────────────
// 6. GET: Obtener registro por ID
// ────────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  validateMongoId('id'),
  registroDiarioController.getRegistroDiarioById
);

// ────────────────────────────────────────────────────────────────────
// 7. PUT: Actualizar registro diario
// ────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  [
    validateMongoId('id'),
    body('cantidad_ejecutada')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cantidad debe ser mayor o igual a 0'),
    body('observaciones')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Observaciones no deben exceder 300 caracteres'),
    body('tiempo_detenido')
      .optional()
      .isFloat({ min: 0, max: 24 })
      .withMessage('Tiempo detenido debe estar entre 0 y 24 horas'),
    body('motivo_detencion')
      .optional()
      .isIn(['LLUVIA','FALLA_EQUIPO','ACCIDENTE','FESTIVO','ENFERMEDAD','SUSPENSION_TRABAJO','PROBLEMAS_ORDEN_PUBLICO','OTRO'])
      .withMessage('Motivo de detención inválido'),
    body('motivo_detencion_otro')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('El detalle no debe exceder 200 caracteres'),
    validateRequest,
  ],
  registroDiarioController.updateRegistroDiario
);

// ────────────────────────────────────────────────────────────────────
// 8. PUT: Validar registro
// ────────────────────────────────────────────────────────────────────
router.put(
  '/:id/validar',
  [
    validateMongoId('id'),
    authorize(ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR),
  ],
  registroDiarioController.validarRegistro
);

// ────────────────────────────────────────────────────────────────────
// 9. DELETE: Eliminar registro
// ────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  [
    validateMongoId('id'),
    authorize(ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR),
  ],
  registroDiarioController.deleteRegistroDiario
);

module.exports = router;