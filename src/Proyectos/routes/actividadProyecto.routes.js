const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getActividadesProyecto,
  getActividadProyecto,
  createActividadProyecto,
  updateActividadProyecto,
  deleteActividadProyecto,
  getActividadesDisponibles,
} = require('../controllers/actividadProyecto.controller');

const router = express.Router();
router.use(authenticate);

const validacion = [
  body('proyecto').notEmpty().isMongoId().withMessage('Proyecto inválido'),
  body('actividad').notEmpty().isMongoId().withMessage('Actividad inválida'),
  body('intervencion')
    .notEmpty()
    .isIn(['mantenimiento', 'no_programadas', 'establecimiento'])
    .withMessage('Intervención inválida'),
  body('cantidad_total')
    .notEmpty()
    .isFloat({ min: 0.01 })
    .withMessage('Cantidad total debe ser mayor a 0'),
  validateRequest,
];

router.get('/', getActividadesProyecto);
router.get('/disponibles/:proyectoId', getActividadesDisponibles);
router.get('/:id', validateMongoId('id'), getActividadProyecto);
router.post('/', authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES), validacion, createActividadProyecto);
router.put('/:id', authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES), validateMongoId('id'), updateActividadProyecto);
router.delete('/:id', authorize(ROLES.ADMIN_SISTEMA), validateMongoId('id'), deleteActividadProyecto);

module.exports = router;