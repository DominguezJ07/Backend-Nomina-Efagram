const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getNucleos,
  getNextNucleoCodigo,
  getNucleo,
  createNucleo,
  updateNucleo,
  deleteNucleo,
  getFincasByNucleo
} = require('../controllers/nucleo.controller');

const router = express.Router();

const createNucleoValidation = [
  body('codigo')
    .optional()
    .isLength({ min: 2, max: 20 })
    .withMessage('El código debe tener entre 2 y 20 caracteres')
    .trim()
    .toUpperCase(),
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres')
    .trim(),
  body('zona')
    .notEmpty()
    .withMessage('La zona es obligatoria')
    .isMongoId()
    .withMessage('ID de zona inválido'),
  validateRequest
];

const updateNucleoValidation = [
  body('codigo')
    .optional()
    .isLength({ min: 2, max: 20 })
    .withMessage('El código debe tener entre 2 y 20 caracteres')
    .trim()
    .toUpperCase(),
  body('nombre')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres')
    .trim(),
  body('zona')
    .optional()
    .isMongoId()
    .withMessage('ID de zona inválido'),
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser verdadero o falso'),
  validateRequest
];

router.get('/', getNucleos);
router.get('/next-code', authenticate, authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES), getNextNucleoCodigo);
router.get('/:id', validateMongoId('id'), getNucleo);
router.get('/:id/fincas', validateMongoId('id'), getFincasByNucleo);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  createNucleoValidation,
  createNucleo
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updateNucleoValidation,
  updateNucleo
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteNucleo
);

module.exports = router;