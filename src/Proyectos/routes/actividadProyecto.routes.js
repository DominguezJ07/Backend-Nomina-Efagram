const express = require('express');
const mongoose = require('mongoose');
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
  body('actividad').custom((value, { req }) => {
    const id = value || req.body.actividad_id;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      throw new Error('Actividad inválida');
    }
    return true;
  }),
  body('intervencion').custom((value, { req }) => {
    const id = value || req.body.intervencion_id;
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      throw new Error('Intervención inválida — debe ser un ID válido');
    }
    return true;
  }),
  body('cantidad_total').custom((value, { req }) => {
    const cantidad = Number(value ?? req.body.cantidad ?? 0);
    if (!cantidad || cantidad <= 0) {
      throw new Error('Cantidad total debe ser mayor a 0');
    }
    return true;
  }),
  validateRequest,
];

router.get('/', getActividadesProyecto);
router.get('/disponibles/:proyectoId', getActividadesDisponibles);
router.get('/:id', validateMongoId('id'), getActividadProyecto);
router.post('/', authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES), validacion, createActividadProyecto);
router.put('/:id', authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES), validateMongoId('id'), updateActividadProyecto);
router.delete('/:id', authorize(ROLES.ADMIN_SISTEMA), validateMongoId('id'), deleteActividadProyecto);

module.exports = router;