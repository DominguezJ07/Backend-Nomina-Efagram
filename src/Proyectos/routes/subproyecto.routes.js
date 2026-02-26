const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getSubproyectos,
  getSubproyecto,
  createSubproyecto,
  updateSubproyecto,
  deleteSubproyecto,
  getNucleosDisponibles,
} = require('../controllers/subproyecto.controller');

const router = express.Router();
router.use(authenticate);

const validacion = [
  body('codigo').notEmpty().withMessage('Código obligatorio').trim().toUpperCase(),
  body('nombre').notEmpty().withMessage('Nombre obligatorio').trim(),
  body('proyecto').notEmpty().isMongoId().withMessage('Proyecto inválido'),
  validateRequest,
];

router.get('/', getSubproyectos);
router.get('/:id', validateMongoId('id'), getSubproyecto);
router.get('/:id/nucleos-disponibles', validateMongoId('id'), getNucleosDisponibles);
router.post('/', authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES), validacion, createSubproyecto);
router.put('/:id', authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES), validateMongoId('id'), updateSubproyecto);
router.delete('/:id', authorize(ROLES.ADMIN_SISTEMA), validateMongoId('id'), deleteSubproyecto);

module.exports = router;