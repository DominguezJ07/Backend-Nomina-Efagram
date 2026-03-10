// ==========================================
// RUTAS: PROGRAMACIÓN
// ==========================================
// Descripción: Endpoints para gestionar programaciones
// Ubicación: src/Proyectos/routes/programacion.routes.js

const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const programacionController = require('../controllers/programacion.controller');

const router = express.Router();

// ── Aplicar autenticación a todas las rutas ─────────────────────────
router.use(authenticate);

// ────────────────────────────────────────────────────────────────────
// 1. GET: Obtener todas las programaciones
// ────────────────────────────────────────────────────────────────────
router.get(
  '/',
  programacionController.getProgramaciones
);

// ────────────────────────────────────────────────────────────────────
// 2. GET: Obtener programaciones activas
// ────────────────────────────────────────────────────────────────────
router.get(
  '/activas',
  programacionController.getProgramacionesActivas
);

// ────────────────────────────────────────────────────────────────────
// 3. GET: Obtener programaciones por contrato
// ────────────────────────────────────────────────────────────────────
router.get(
  '/contrato/:contrato_id',
  validateMongoId('contrato_id'),
  programacionController.getProgramacionesPorContrato
);

// ────────────────────────────────────────────────────────────────────
// 4. POST: Crear nueva programación
// ────────────────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('contrato_id')
      .notEmpty()
      .isMongoId()
      .withMessage('Contrato inválido'),
    body('fecha_inicial')
      .notEmpty()
      .isISO8601()
      .withMessage('Fecha inicial inválida'),
    validateRequest,
  ],
  programacionController.createProgramacion
);

// ────────────────────────────────────────────────────────────────────
// 5. GET: Obtener programación por ID
// ────────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  validateMongoId('id'),
  programacionController.getProgramacionById
);

// ────────────────────────────────────────────────────────────────────
// 6. GET: Obtener resumen de programación
// ────────────────────────────────────────────────────────────────────
router.get(
  '/:id/resumen',
  validateMongoId('id'),
  programacionController.getResumen
);

// ────────────────────────────────────────────────────────────────────
// 7. GET: Obtener registros diarios
// ────────────────────────────────────────────────────────────────────
router.get(
  '/:programacion_id/registros-diarios',
  validateMongoId('programacion_id'),
  programacionController.getRegistrosDiarios
);

// ────────────────────────────────────────────────────────────────────
// 8. PUT: Actualizar programación
// ────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  [
    validateMongoId('id'),
    body('observaciones')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Las observaciones no deben exceder 500 caracteres'),
    body('estado')
      .optional()
      .isIn(['ACTIVA', 'COMPLETADA', 'CANCELADA', 'PAUSADA'])
      .withMessage('Estado inválido'),
    validateRequest,
  ],
  programacionController.updateProgramacion
);

// ────────────────────────────────────────────────────────────────────
// 9. DELETE: Eliminar programación
// ────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  [
    validateMongoId('id'),
    authorize(ROLES.ADMIN_SISTEMA, ROLES.SUPERVISOR),
  ],
  programacionController.deleteProgramacion
);

module.exports = router;