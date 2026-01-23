const express = require('express');
const { body, param, query } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getZonas,
  getZona,
  getZonaByCodigo,
  createZona,
  updateZona,
  deleteZona,
  getNucleosByZona
} = require('../controllers/zona.controller');

const router = express.Router();

// Validaciones
const zonaValidation = [
  body('codigo')
    .isInt({ min: 1, max: 3 })
    .withMessage('El código debe ser 1 (Norte), 2 (Sur) o 3 (Centro)'),
  body('nombre')
    .isIn(['Norte', 'Sur', 'Centro'])
    .withMessage('El nombre debe ser Norte, Sur o Centro'),
  validateRequest
];

// Rutas públicas (solo lectura)
router.get('/', getZonas);
router.get('/codigo/:codigo', getZonaByCodigo);
router.get('/:id', validateMongoId('id'), getZona);
router.get('/:id/nucleos', validateMongoId('id'), getNucleosByZona);

// Rutas protegidas (solo admin y jefe de operaciones)
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  zonaValidation,
  createZona
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  zonaValidation,
  updateZona
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  deleteZona
);

module.exports = router;