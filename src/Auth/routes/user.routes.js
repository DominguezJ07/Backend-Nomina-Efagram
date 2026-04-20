const express = require('express');
const { body, param } = require('express-validator');
const { validateRequest } = require('../../middlewares/validateRequest');
const { authenticate, authorize, checkPermission } = require('../../middlewares/authMiddleware');
const { ROLES } = require('../../config/constants');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  changeUserRoles,
  deactivateUser,
  activateUser,
  getUserStats,
  getRolesList,
  getRolePermissions
} = require('../controllers/user.controller');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   GET /api/v1/users/stats/dashboard
 * @desc    Obtener estadísticas de usuarios
 * @access  Private (Admin)
 */
router.get(
  '/stats/dashboard',
  authorize(ROLES.ADMIN_SISTEMA),
  getUserStats
);

/**
 * @route   GET /api/v1/users/roles/list
 * @desc    Obtener lista de roles disponibles
 * @access  Private
 */
router.get(
  '/roles/list',
  getRolesList
);

/**
 * @route   GET /api/v1/users/roles/:rol/permissions
 * @desc    Obtener permisos de un rol específico
 * @access  Private (Admin)
 */
router.get(
  '/roles/:rol/permissions',
  authorize(ROLES.ADMIN_SISTEMA),
  [
    param('rol')
      .notEmpty()
      .withMessage('El rol es obligatorio'),
    validateRequest
  ],
  getRolePermissions
);

/**
 * @route   GET /api/v1/users
 * @desc    Obtener todos los usuarios
 * @access  Private (Admin, Talento Humano, Supervisor)
 */
router.get(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO, ROLES.SUPERVISOR),
  getUsers
);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Obtener usuario por ID
 * @access  Private (Admin o propio usuario)
 */
router.get(
  '/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    validateRequest
  ],
  getUser
);

/**
 * @route   POST /api/v1/users
 * @desc    Crear nuevo usuario
 * @access  Private (Admin, Talento Humano)
 */
router.post(
  '/',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  [
    body('nombre')
      .notEmpty()
      .withMessage('El nombre es obligatorio')
      .isLength({ min: 2, max: 50 })
      .withMessage('El nombre debe tener entre 2 y 50 caracteres')
      .trim(),
    body('email')
      .notEmpty()
      .withMessage('El email es obligatorio')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es obligatoria')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('roles')
      .optional()
      .isArray()
      .withMessage('Los roles deben ser un array'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('El avatar debe ser una URL válida'),
    validateRequest
  ],
  createUser
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Actualizar usuario
 * @access  Private (Admin o propio usuario)
 */
router.put(
  '/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    body('nombre')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('El nombre debe tener entre 2 y 50 caracteres')
      .trim(),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('roles')
      .optional()
      .isArray()
      .withMessage('Los roles deben ser un array'),
    body('avatar')
      .optional()
      .isURL()
      .withMessage('El avatar debe ser una URL válida'),
    body('activo')
      .optional()
      .isBoolean()
      .withMessage('El campo activo debe ser un booleano'),
    validateRequest
  ],
  updateUser
);

/**
 * @route   PUT /api/v1/users/:id/roles
 * @desc    Cambiar roles de usuario
 * @access  Private (Admin)
 */
router.put(
  '/:id/roles',
  authorize(ROLES.ADMIN_SISTEMA),
  [
    param('id')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    body('roles')
      .isArray()
      .withMessage('Los roles deben ser un array')
      .notEmpty()
      .withMessage('Debe proporcionar al menos un rol'),
    validateRequest
  ],
  changeUserRoles
);

/**
 * @route   PUT /api/v1/users/:id/password
 * @desc    Cambiar contraseña de usuario
 * @access  Private (Admin o propio usuario)
 */
router.put(
  '/:id/password',
  [
    param('id')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    body('newPassword')
      .notEmpty()
      .withMessage('La nueva contraseña es obligatoria')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres'),
    validateRequest
  ],
  changeUserPassword
);

/**
 * @route   PUT /api/v1/users/:id/deactivate
 * @desc    Desactivar usuario
 * @access  Private (Admin, Talento Humano)
 */
router.put(
  '/:id/deactivate',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  [
    param('id')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    validateRequest
  ],
  deactivateUser
);

/**
 * @route   PUT /api/v1/users/:id/activate
 * @desc    Activar usuario
 * @access  Private (Admin, Talento Humano)
 */
router.put(
  '/:id/activate',
  authorize(ROLES.ADMIN_SISTEMA, ROLES.TALENTO_HUMANO),
  [
    param('id')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    validateRequest
  ],
  activateUser
);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Eliminar usuario (hard delete)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authorize(ROLES.ADMIN_SISTEMA),
  [
    param('id')
      .isMongoId()
      .withMessage('ID de usuario inválido'),
    validateRequest
  ],
  deleteUser
);

module.exports = router;