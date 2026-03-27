const express = require('express');
const { body, param } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getActividades,
  getActividad,
  getActividadesByIntervencion,
  createActividad,
  updateActividad,
  deleteActividad
} = require('../controllers/actividadCatalogo.controller');

const router = express.Router();

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

  body('intervencion')
    .notEmpty()
    .withMessage('La intervención es obligatoria')
    .isMongoId()
    .withMessage('La intervención no es válida'),

  body('precio_base')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('El precio base no puede ser negativo'),

  body('descripcion')
    .optional()
    .trim(),

  body('observaciones')
    .optional()
    .trim(),

  validateRequest
];

const actividadUpdateValidation = [
  body('codigo')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase(),

  body('nombre')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('El nombre debe tener entre 3 y 200 caracteres'),

  body('intervencion')
    .optional()
    .isMongoId()
    .withMessage('La intervención no es válida'),

  body('precio_base')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('El precio base no puede ser negativo'),

  body('descripcion')
    .optional()
    .trim(),

  body('observaciones')
    .optional()
    .trim(),

  validateRequest
];

router.use(authenticate);

router.get('/', getActividades);

router.get(
  '/intervencion/:intervencionId',
  param('intervencionId').isMongoId().withMessage('Intervención inválida'),
  validateRequest,
  getActividadesByIntervencion
);

router.get('/:id', validateMongoId('id'), getActividad);

router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  actividadCreateValidation,
  createActividad
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  actividadUpdateValidation,
  updateActividad
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteActividad
);

module.exports = router;