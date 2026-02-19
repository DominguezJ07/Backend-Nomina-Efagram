const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES, UNIDADES_MEDIDA } = require('../../config/constants');
const {
  getActividades,
  getActividad,
  createActividad,
  updateActividad,
  deleteActividad
} = require('../controllers/actividadCatalogo.controller');

const router = express.Router();

/* =====================================================
   🔹 VALIDACIÓN PARA CREAR ACTIVIDAD
===================================================== */
const actividadCreateValidation = [
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

  body('categoria')
    .optional()
    .isIn([
      'PREPARACION_TERRENO',
      'SIEMBRA',
      'MANTENIMIENTO',
      'CONTROL_MALEZA',
      'FERTILIZACION',
      'PODAS',
      'OTRO'
    ])
    .withMessage('Categoría inválida'),

  body('unidad_medida')
    .notEmpty()
    .withMessage('La unidad de medida es obligatoria')
    .isIn(Object.values(UNIDADES_MEDIDA))
    .withMessage('Unidad de medida inválida'),

  body('rendimiento_diario_estimado')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El rendimiento debe ser un número positivo'),

  body('descripcion')
    .optional()
    .trim(),

  body('observaciones')
    .optional()
    .trim(),

  validateRequest
];

/* =====================================================
   🔹 VALIDACIÓN PARA ACTUALIZAR ACTIVIDAD
   (NO se permite modificar código)
===================================================== */
const actividadUpdateValidation = [
  body('codigo')
    .not()
    .exists()
    .withMessage('El código no puede modificarse'),

  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('El nombre debe tener entre 3 y 200 caracteres'),

  body('categoria')
    .optional()
    .isIn([
      'PREPARACION_TERRENO',
      'SIEMBRA',
      'MANTENIMIENTO',
      'CONTROL_MALEZA',
      'FERTILIZACION',
      'PODAS',
      'OTRO'
    ])
    .withMessage('Categoría inválida'),

  body('unidad_medida')
    .optional()
    .isIn(Object.values(UNIDADES_MEDIDA))
    .withMessage('Unidad de medida inválida'),

  body('rendimiento_diario_estimado')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El rendimiento debe ser un número positivo'),

  body('descripcion')
    .optional()
    .trim(),

  body('observaciones')
    .optional()
    .trim(),

  validateRequest
];

/* =====================================================
   🔹 AUTENTICACIÓN GLOBAL
===================================================== */
router.use(authenticate);

/* =====================================================
   🔹 RUTAS DE CONSULTA
===================================================== */
router.get('/', getActividades);
router.get('/:id', validateMongoId('id'), getActividad);

/* =====================================================
   🔹 RUTAS DE MODIFICACIÓN
===================================================== */

// Crear actividad
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  actividadCreateValidation,
  createActividad
);

// Actualizar actividad
router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  actividadUpdateValidation,
  updateActividad
);

// Desactivar actividad (soft delete)
router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteActividad
);

module.exports = router;
