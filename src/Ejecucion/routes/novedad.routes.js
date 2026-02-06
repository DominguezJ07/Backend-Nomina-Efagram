const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES, TIPOS_NOVEDAD } = require('../../config/constants');
const {
  getNovedades,
  getNovedad,
  createNovedad,
  updateNovedad,
  aprobarNovedad,
  rechazarNovedad,
  deleteNovedad,
  getNovedadesByTrabajador
} = require('../controllers/novedad.controller');

const router = express.Router();

// Validaciones para crear/actualizar novedad
const novedadValidation = [
  body('fecha')
    .notEmpty()
    .withMessage('La fecha es obligatoria')
    .isISO8601()
    .withMessage('Fecha inválida')
    .custom((value) => {
      const fecha = new Date(value);
      if (isNaN(fecha.getTime())) {
        throw new Error('Formato de fecha inválido');
      }
      return true;
    }),
  
  body('trabajador')
    .notEmpty()
    .withMessage('El trabajador es obligatorio')
    .isMongoId()
    .withMessage('ID de trabajador inválido'),
  
  body('tipo')
    .notEmpty()
    .withMessage('El tipo es obligatorio')
    .isIn(Object.values(TIPOS_NOVEDAD))
    .withMessage('Tipo de novedad inválido'),
  
  body('descripcion')
    .notEmpty()
    .withMessage('La descripción es obligatoria')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
  
  body('dias')
    .optional()
    .isFloat({ min: 0.5 })
    .withMessage('Los días deben ser al menos 0.5'),
  
  body('afecta_nomina')
    .optional()
    .isBoolean()
    .withMessage('afecta_nomina debe ser verdadero o falso'),
  
  body('requiere_aprobacion')
    .optional()
    .isBoolean()
    .withMessage('requiere_aprobacion debe ser verdadero o falso'),
  
  body('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  
  body('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('Fecha fin inválida')
    .custom((value, { req }) => {
      if (req.body.fecha_inicio && value) {
        const inicio = new Date(req.body.fecha_inicio);
        const fin = new Date(value);
        if (fin < inicio) {
          throw new Error('La fecha fin no puede ser anterior a la fecha inicio');
        }
      }
      return true;
    }),
  
  body('documento_soporte')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('El documento de soporte no puede exceder 255 caracteres'),
  
  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden exceder 1000 caracteres'),
  
  body('registrado_por')
    .optional()
    .isMongoId()
    .withMessage('ID de registrado_por inválido'),
  
  validateRequest
];

// Validaciones para actualizar (campos opcionales)
const novedadUpdateValidation = [
  body('fecha')
    .optional()
    .isISO8601()
    .withMessage('Fecha inválida'),
  
  body('trabajador')
    .optional()
    .isMongoId()
    .withMessage('ID de trabajador inválido'),
  
  body('tipo')
    .optional()
    .isIn(Object.values(TIPOS_NOVEDAD))
    .withMessage('Tipo de novedad inválido'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
  
  body('dias')
    .optional()
    .isFloat({ min: 0.5 })
    .withMessage('Los días deben ser al menos 0.5'),
  
  body('afecta_nomina')
    .optional()
    .isBoolean()
    .withMessage('afecta_nomina debe ser verdadero o falso'),
  
  body('fecha_inicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  
  body('fecha_fin')
    .optional()
    .isISO8601()
    .withMessage('Fecha fin inválida'),
  
  validateRequest
];

// Validación para rechazo
const rechazarValidation = [
  body('motivo')
    .notEmpty()
    .withMessage('El motivo es obligatorio')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('El motivo debe tener entre 10 y 500 caracteres'),
  
  body('aprobado_por')
    .optional()
    .isMongoId()
    .withMessage('ID de aprobado_por inválido'),
  
  validateRequest
];

// Validación para aprobación
const aprobarValidation = [
  body('aprobado_por')
    .optional()
    .isMongoId()
    .withMessage('ID de aprobado_por inválido'),
  
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// ============ RUTAS ESPECIALES (deben ir antes de las rutas con :id) ============

// Obtener novedades por trabajador
router.get('/trabajador/:trabajadorId',
  validateMongoId('trabajadorId'),
  getNovedadesByTrabajador
);

// ============ RUTAS DE ACCIONES ============

// Aprobar novedad
router.post('/:id/aprobar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  aprobarValidation,
  aprobarNovedad
);

// Rechazar novedad
router.post('/:id/rechazar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  rechazarValidation,
  rechazarNovedad
);

// ============ RUTAS CRUD BÁSICAS ============

// Obtener todas las novedades (con filtros opcionales en query params)
router.get('/', 
  getNovedades
);

// Obtener una novedad por ID
router.get('/:id', 
  validateMongoId('id'), 
  getNovedad
);

// Crear nueva novedad
router.post('/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR, ROLES.TALENTO_HUMANO),
  novedadValidation,
  createNovedad
);

// Actualizar novedad
router.put('/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  novedadUpdateValidation,
  updateNovedad
);

// Eliminar novedad
router.delete('/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteNovedad
);

module.exports = router;