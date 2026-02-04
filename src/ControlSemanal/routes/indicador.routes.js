const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getIndicadores,
  getIndicador,
  generarIndicadoresGlobales,
  generarIndicadoresProyecto,
  getIndicadoresBySemana
} = require('../controllers/indicador.controller');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas especiales (antes de :id)
router.post(
  '/generar-globales',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  [
    body('semana')
      .notEmpty()
      .withMessage('La semana es obligatoria')
      .isMongoId()
      .withMessage('ID de semana inválido'),
    validateRequest
  ],
  generarIndicadoresGlobales
);

router.post(
  '/generar-proyecto',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  [
    body('semana')
      .notEmpty()
      .withMessage('La semana es obligatoria')
      .isMongoId()
      .withMessage('ID de semana inválido'),
    body('proyecto')
      .notEmpty()
      .withMessage('El proyecto es obligatorio')
      .isMongoId()
      .withMessage('ID de proyecto inválido'),
    validateRequest
  ],
  generarIndicadoresProyecto
);

router.get(
  '/semana/:semanaId',
  validateMongoId('semanaId'),
  getIndicadoresBySemana
);

// Rutas CRUD
router.get('/', getIndicadores);
router.get('/:id', validateMongoId('id'), getIndicador);

module.exports = router;