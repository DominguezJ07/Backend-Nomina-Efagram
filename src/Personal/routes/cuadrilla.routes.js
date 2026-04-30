const express = require('express');
const { body } = require('express-validator');
const { validateRequest, validateMongoId } = require('../../middlewares/validateRequest');
const { authenticate, authorize } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getCuadrillas,
  getCuadrilla,
  createCuadrilla,
  updateCuadrilla,
  agregarMiembros,
  removerMiembro,
  deleteCuadrilla
} = require('../controllers/cuadrilla.controller');

const router = express.Router();

// ─────────────────────────────────────────────
// Validaciones para crear
// ─────────────────────────────────────────────
const createCuadrillaValidation = [
  body('codigo')
    .optional()
    .trim()
    .toUpperCase(),
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .trim(),

  // ✅ CAMBIADO: supervisor ya no es MongoId, es un objeto
  body('supervisor')
    .notEmpty()
    .withMessage('El supervisor es obligatorio')
    .isObject()
    .withMessage('El supervisor debe ser un objeto'),
  body('supervisor.cc')
    .notEmpty()
    .withMessage('La cédula del supervisor es obligatoria')
    .trim(),
  body('supervisor.name')
    .notEmpty()
    .withMessage('El nombre del supervisor es obligatorio')
    .trim(),

  // ✅ CAMBIADO: nucleo ya no es MongoId, es un objeto opcional
  body('nucleo')
    .optional({ nullable: true })
    .isObject()
    .withMessage('El núcleo debe ser un objeto'),
  body('nucleo.id')
    .if(body('nucleo').exists({ checkNull: false }))
    .notEmpty()
    .withMessage('El id del núcleo es obligatorio'),
  body('nucleo.nombre')
    .if(body('nucleo').exists({ checkNull: false }))
    .notEmpty()
    .withMessage('El nombre del núcleo es obligatorio'),

  body('miembros')
    .optional()
    .isArray()
    .withMessage('Los miembros deben ser un array'),

  validateRequest
];

// ─────────────────────────────────────────────
// Validaciones para actualizar
// ─────────────────────────────────────────────
const updateCuadrillaValidation = [
  body('codigo')
    .optional()
    .trim()
    .toUpperCase(),
  body('nombre')
    .optional()
    .trim(),

  // ✅ CAMBIADO: supervisor ya no es MongoId, es un objeto opcional
  body('supervisor')
    .optional()
    .isObject()
    .withMessage('El supervisor debe ser un objeto'),
  body('supervisor.cc')
    .if(body('supervisor').exists())
    .notEmpty()
    .withMessage('La cédula del supervisor es obligatoria'),
  body('supervisor.name')
    .if(body('supervisor').exists())
    .notEmpty()
    .withMessage('El nombre del supervisor es obligatorio'),

  // ✅ CAMBIADO: nucleo ya no es MongoId, es un objeto opcional (acepta null para desasignar)
  body('nucleo')
    .optional({ nullable: true })
    .isObject()
    .withMessage('El núcleo debe ser un objeto'),
  body('nucleo.id')
    .if(body('nucleo').exists({ checkNull: false }))
    .notEmpty()
    .withMessage('El id del núcleo es obligatorio'),
  body('nucleo.nombre')
    .if(body('nucleo').exists({ checkNull: false }))
    .notEmpty()
    .withMessage('El nombre del núcleo es obligatorio'),

  body('activa')
    .optional()
    .isBoolean()
    .withMessage('El campo activa debe ser verdadero o falso'),
  body('observaciones')
    .optional()
    .trim(),

  validateRequest
];

// ─────────────────────────────────────────────
// Validaciones para agregar miembro
// ─────────────────────────────────────────────
const agregarMiembrosValidation = [
  // ✅ CAMBIADO: antes era { personaId: MongoId }, ahora es { persona: objeto }
  body('persona')
    .notEmpty()
    .withMessage('Los datos de la persona son obligatorios')
    .isObject()
    .withMessage('La persona debe ser un objeto'),
  body('persona.cc')
    .notEmpty()
    .withMessage('La cédula de la persona es obligatoria')
    .trim(),
  body('persona.name')
    .notEmpty()
    .withMessage('El nombre de la persona es obligatorio')
    .trim(),

  validateRequest
];

// Todas las rutas requieren autenticación
router.use(authenticate);

// Rutas de consulta
router.get('/', getCuadrillas);
router.get('/:id', validateMongoId('id'), getCuadrilla);

// Rutas de modificación
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  createCuadrillaValidation,
  createCuadrilla
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  updateCuadrillaValidation,
  updateCuadrilla
);

router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES),
  validateMongoId('id'),
  deleteCuadrilla
);

router.post(
  '/:id/miembros',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  agregarMiembrosValidation,
  agregarMiembros
);

// ✅ CAMBIADO: param era :personaId (MongoId), ahora es :cc (cédula string)
//    También se removió validateMongoId('personaId') porque CC no es un ObjectId
router.delete(
  '/:id/miembros/:cc',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.JEFE_OPERACIONES, ROLES.SUPERVISOR),
  validateMongoId('id'),
  removerMiembro
);

module.exports = router;