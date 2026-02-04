const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getAlertas,
  getAlerta,
  generarAlertasSemana,
  createAlerta,
  resolverAlerta,
  updateEstadoAlerta,
  getAlertasBySemana
} = require('../controllers/alerta.controller');

const router = express.Router();

// Validaciones
const alertaValidation = [
  body('semana_operativa')
    .notEmpty()
    .withMessage('La semana operativa es obligatoria')
    .isMongoId()
    .withMessage('ID de semana inválido'),
  body('tipo')
    .notEmpty()
    .withMessage('El tipo es obligatorio')
    .isIn(['BAJO_RENDIMIENTO', 'META_NO_CUMPLIDA', 'ALTA_INASISTENCIA', 'RETRASO_PROYECTO', 'SOBRECOSTO', 'OTRO'])
    .withMessage('Tipo de alerta inválido'),
  body('nivel')
    .notEmpty()
    .withMessage('El nivel es obligatorio')
    .isIn(['BAJA', 'MEDIA', 'ALTA', 'CRITICA'])
    .withMessage('Nivel inválido'),
  body('entidad_tipo')
    .notEmpty()
    .withMessage('El tipo de entidad es obligatorio')
    .isIn(['TRABAJADOR', 'PAL', 'PROYECTO', 'CUADRILLA'])
    .withMessage('Tipo de entidad inválido'),
  body('entidad_id')
    .notEmpty()
    .withMessage('La entidad es obligatoria')
    .isMongoId()
    .withMessage('ID de entidad inválido'),
  body('titulo')
    .notEmpty()
    .withMessage('El título es obligatorio')
    .trim(),
  body('descripcion')
    .notEmpty()
    .withMessage('La descripción es obligatoria')
    .trim(),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas especiales (antes de :id)
router.post(
  '/generar-semana',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  [
    body('semana')
      .notEmpty()
      .withMessage('La semana es obligatoria')
      .isMongoId()
      .withMessage('ID de semana inválido'),
    validateRequest
  ],
  generarAlertasSemana
);

router.get(
  '/semana/:semanaId',
  validateMongoId('semanaId'),
  getAlertasBySemana
);

router.post(
  '/:id/resolver',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  [
    body('comentario')
      .notEmpty()
      .withMessage('El comentario es obligatorio')
      .trim(),
    validateRequest
  ],
  resolverAlerta
);

router.put(
  '/:id/estado',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  [
    body('estado')
      .notEmpty()
      .withMessage('El estado es obligatorio')
      .isIn(['PENDIENTE', 'EN_REVISION', 'RESUELTA', 'IGNORADA'])
      .withMessage('Estado inválido'),
    validateRequest
  ],
  updateEstadoAlerta
);

// Rutas CRUD
router.get('/', getAlertas);
router.get('/:id', validateMongoId('id'), getAlerta);

router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  alertaValidation,
  createAlerta
);

module.exports = router;