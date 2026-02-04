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
  puedeObtenerProyecto
} = require('../controllers/proyecto.controller');

const router = express.Router();

// Validaciones
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

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta
router.get('/', getProyectos);
router.get('/:id', validateMongoId('id'), getProyecto);
router.get('/:id/resumen', validateMongoId('id'), getResumenProyecto);
router.get('/:id/puede-cerrar', validateMongoId('id'), puedeObtenerProyecto);

// Rutas de modificación
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