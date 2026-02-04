const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middlewares/authMiddleware');
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
} = require('../controllers/pal.controller');

const router = express.Router();

// Middleware de validación
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * @route   GET /api/v1/pals/atrasados
 * @desc    Obtener PALs atrasados
 * @access  Private
 */
router.get('/atrasados', authenticate, getPalsAtrasados);

/**
 * @route   GET /api/v1/pals/resumen-cumplimiento
 * @desc    Obtener resumen de cumplimiento
 * @access  Private
 */
router.get('/resumen-cumplimiento', authenticate, getResumenCumplimiento);

/**
 * @route   GET /api/v1/pals
 * @desc    Obtener todos los PALs
 * @access  Private
 */
router.get('/', authenticate, getPALs);

/**
 * @route   GET /api/v1/pals/:id
 * @desc    Obtener un PAL por ID
 * @access  Private
 */
router.get('/:id', authenticate, getPAL);

/**
 * @route   POST /api/v1/pals
 * @desc    Crear un PAL
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  [
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
      .withMessage('La meta mínima debe ser un número mayor o igual a 0'),
    body('fecha_inicio_planificada')
      .notEmpty()
      .withMessage('La fecha de inicio planificada es obligatoria')
      .isISO8601()
      .withMessage('Fecha de inicio inválida'),
    body('fecha_fin_planificada')
      .optional()
      .isISO8601()
      .withMessage('Fecha de fin inválida'),
    body('supervisor_asignado')
      .optional()
      .isMongoId()
      .withMessage('ID de supervisor inválido'),
    body('prioridad')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('La prioridad debe estar entre 1 y 5'),
    handleValidationErrors
  ],
  createPAL
);

/**
 * @route   PUT /api/v1/pals/:id
 * @desc    Actualizar un PAL
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  [
    body('meta_minima')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('La meta mínima debe ser un número mayor o igual a 0'),
    body('fecha_inicio_planificada')
      .optional()
      .isISO8601()
      .withMessage('Fecha de inicio inválida'),
    body('fecha_fin_planificada')
      .optional()
      .isISO8601()
      .withMessage('Fecha de fin inválida'),
    body('supervisor_asignado')
      .optional()
      .isMongoId()
      .withMessage('ID de supervisor inválido'),
    body('prioridad')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('La prioridad debe estar entre 1 y 5'),
    handleValidationErrors
  ],
  updatePAL
);

/**
 * @route   POST /api/v1/pals/:id/aumentar-meta
 * @desc    Aumentar meta mínima de un PAL
 * @access  Private
 */
router.post(
  '/:id/aumentar-meta',
  authenticate,
  [
    body('nuevaMeta')
      .notEmpty()
      .withMessage('La nueva meta es obligatoria')
      .isFloat({ min: 0 })
      .withMessage('La nueva meta debe ser un número mayor o igual a 0'),
    body('motivo')
      .notEmpty()
      .withMessage('El motivo es obligatorio')
      .trim()
      .isLength({ min: 10 })
      .withMessage('El motivo debe tener al menos 10 caracteres'),
    handleValidationErrors
  ],
  aumentarMeta
);

/**
 * @route   PUT /api/v1/pals/:id/cantidad-ejecutada
 * @desc    Actualizar cantidad ejecutada
 * @access  Private
 */
router.put(
  '/:id/cantidad-ejecutada',
  authenticate,
  [
    body('cantidad')
      .notEmpty()
      .withMessage('La cantidad es obligatoria')
      .isFloat({ min: 0 })
      .withMessage('La cantidad debe ser un número mayor o igual a 0'),
    handleValidationErrors
  ],
  actualizarCantidadEjecutada
);

/**
 * @route   GET /api/v1/pals/:id/verificar-meta
 * @desc    Verificar cumplimiento de meta
 * @access  Private
 */
router.get('/:id/verificar-meta', authenticate, verificarCumplimientoMeta);

/**
 * @route   GET /api/v1/pals/:id/precio-vigente
 * @desc    Obtener precio vigente de un PAL
 * @access  Private
 */
router.get('/:id/precio-vigente', authenticate, getPrecioVigente);

/**
 * @route   POST /api/v1/pals/:id/marcar-cumplida
 * @desc    Marcar PAL como cumplida
 * @access  Private
 */
router.post('/:id/marcar-cumplida', authenticate, marcarCumplida);

/**
 * @route   POST /api/v1/pals/:id/cancelar
 * @desc    Cancelar un PAL
 * @access  Private
 */
router.post(
  '/:id/cancelar',
  authenticate,
  [
    body('motivo')
      .notEmpty()
      .withMessage('El motivo de cancelación es obligatorio')
      .trim()
      .isLength({ min: 10 })
      .withMessage('El motivo debe tener al menos 10 caracteres'),
    handleValidationErrors
  ],
  cancelarPAL
);

module.exports = router;