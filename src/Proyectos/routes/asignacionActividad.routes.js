const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getAsignaciones,
  createAsignacion,
  updateAsignacion,
  cancelarAsignacion,
} = require('../controllers/asignacionActividad.controller');

const router = express.Router();
router.use(authenticate);

const validacion = [
  body('subproyecto').notEmpty().isMongoId().withMessage('Subproyecto inválido'),
  body('actividad_proyecto').notEmpty().isMongoId().withMessage('Actividad de proyecto inválida'),
  body('cantidad_asignada')
    .notEmpty()
    .isFloat({ min: 0.01 })
    .withMessage('Cantidad debe ser mayor a 0'),
  validateRequest,
];

router.get('/', getAsignaciones);
router.post('/', validacion, createAsignacion);
router.put('/:id', validateMongoId('id'), updateAsignacion);
router.delete('/:id', validateMongoId('id'), cancelarAsignacion);

module.exports = router;