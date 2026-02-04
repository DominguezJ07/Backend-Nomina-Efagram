const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getPersonas,
  getPersona,
  createPersona,
  updatePersona,
  retirarPersona,
  vincularUsuario
} = require('../controllers/persona.controller');

const router = express.Router();

// Validaciones
const personaValidation = [
  body('tipo_doc')
    .notEmpty()
    .withMessage('El tipo de documento es obligatorio')
    .isIn(['CC', 'CE', 'TI', 'PA'])
    .withMessage('Tipo de documento inválido'),
  body('num_doc')
    .notEmpty()
    .withMessage('El número de documento es obligatorio')
    .trim()
    .isLength({ min: 5, max: 20 })
    .withMessage('El número de documento debe tener entre 5 y 20 caracteres'),
  body('nombres')
    .notEmpty()
    .withMessage('Los nombres son obligatorios')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Los nombres deben tener entre 2 y 100 caracteres'),
  body('apellidos')
    .notEmpty()
    .withMessage('Los apellidos son obligatorios')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Los apellidos deben tener entre 2 y 100 caracteres'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
  body('tipo_contrato')
    .optional()
    .isIn(['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZ', 'TEMPORAL'])
    .withMessage('Tipo de contrato inválido'),
  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta (todos los roles autenticados)
router.get('/', getPersonas);
router.get('/:id', validateMongoId('id'), getPersona);

// Rutas de modificación (solo Admin y RRHH)
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  personaValidation,
  createPersona
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  personaValidation,
  updatePersona
);

router.post(
  '/:id/retirar',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  validateMongoId('id'),
  body('motivo').notEmpty().withMessage('El motivo es obligatorio'),
  validateRequest,
  retirarPersona
);

router.post(
  '/:id/vincular-usuario',
  authorize(ROLES.ADMIN_SISTEMA),
  validateMongoId('id'),
  body('usuarioId').isMongoId().withMessage('ID de usuario inválido'),
  validateRequest,
  vincularUsuario
);

module.exports = router;