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

// Validaciones
const actividadValidation = [
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
    .isIn(['PREPARACION_TERRENO', 'SIEMBRA', 'MANTENIMIENTO', 'CONTROL_MALEZA', 'FERTILIZACION', 'PODAS', 'OTRO'])
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
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta
router.get('/', getActividades);
router.get('/:id', validateMongoId('id'), getActividad);

// Rutas de modificación
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  actividadValidation,
  createActividad
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  actividadValidation,
  updateActividad
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteActividad
);

module.exports = router;