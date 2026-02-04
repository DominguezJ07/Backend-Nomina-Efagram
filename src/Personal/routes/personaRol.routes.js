const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getPersonaRoles,
  getRolesByPersona,
  asignarRol,
  removerRol
} = require('../controllers/personaRol.controller');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta
router.get(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  getPersonaRoles
);

router.get(
  '/persona/:personaId',
  validateMongoId('personaId'),
  getRolesByPersona
);

// Rutas de modificación
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  [
    body('persona').isMongoId().withMessage('ID de persona inválido'),
    body('rol').isMongoId().withMessage('ID de rol inválido'),
    body('fecha_asignacion').optional().isISO8601().withMessage('Fecha inválida'),
    validateRequest
  ],
  asignarRol
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  removerRol
);

module.exports = router;