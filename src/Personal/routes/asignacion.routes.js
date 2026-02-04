const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');

// Controladores
const {
  getAsignaciones,
  getAsignacion,
  createAsignacion,
  updateAsignacion,
  finalizarAsignacion,
  verificarAcceso
} = require('../controllers/asignacionSupervisor.controller');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/asignaciones-supervisor
 * @desc    Obtener todas las asignaciones
 * @access  Private
 */
router.get('/', getAsignaciones);

/**
 * @route   GET /api/v1/asignaciones-supervisor/:id
 * @desc    Obtener asignación por ID
 * @access  Private
 */
router.get('/:id', validateMongoId('id'), getAsignacion);

/**
 * @route   POST /api/v1/asignaciones-supervisor
 * @desc    Crear asignación de supervisor
 * @access  Private (Admin, Jefe)
 */
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  [
    body('supervisor')
      .notEmpty()
      .withMessage('El supervisor es obligatorio')
      .isMongoId()
      .withMessage('ID de supervisor inválido'),
    body('nucleo')
      .notEmpty()
      .withMessage('El núcleo es obligatorio')
      .isMongoId()
      .withMessage('ID de núcleo inválido'),
    body('finca')
      .optional()
      .isMongoId()
      .withMessage('ID de finca inválido'),
    body('lote')
      .optional()
      .isMongoId()
      .withMessage('ID de lote inválido'),
    body('fecha_inicio')
      .optional()
      .isISO8601()
      .withMessage('Fecha de inicio inválida'),
    body('observaciones')
      .optional()
      .trim(),
    validateRequest
  ],
  createAsignacion
);

/**
 * @route   PUT /api/v1/asignaciones-supervisor/:id
 * @desc    Actualizar asignación
 * @access  Private (Admin, Jefe)
 */
router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updateAsignacion
);

/**
 * @route   POST /api/v1/asignaciones-supervisor/:id/finalizar
 * @desc    Finalizar asignación
 * @access  Private (Admin, Jefe)
 */
router.post(
  '/:id/finalizar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  finalizarAsignacion
);

/**
 * @route   GET /api/v1/asignaciones-supervisor/verificar-acceso/:supervisorId/:loteId
 * @desc    Verificar acceso de supervisor a lote
 * @access  Private
 */
router.get(
  '/verificar-acceso/:supervisorId/:loteId',
  validateMongoId('supervisorId'),
  validateMongoId('loteId'),
  verificarAcceso
);

/**
 * @route   GET /api/v1/asignaciones-supervisor/supervisor/:supervisorId
 * @desc    Obtener asignaciones de un supervisor
 * @access  Private
 */
router.get(
  '/supervisor/:supervisorId',
  validateMongoId('supervisorId'),
  async (req, res) => {
    const AsignacionSupervisor = require('../models/asignacionSupervisor.model');
    
    const asignaciones = await AsignacionSupervisor.getAsignacionesBySupervisor(
      req.params.supervisorId
    );

    res.status(200).json({
      success: true,
      count: asignaciones.length,
      data: asignaciones
    });
  }
);

module.exports = router;