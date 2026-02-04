const express = require('express');
const { body } = require('express-validator');
const { validateRequest } = require('../../middlewares/validateRequest');
const { authenticate } = require('../../middlewares/authMiddleware');
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  logout
} = require('../controllers/auth.controller');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 */
router.post(
  '/register',
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
    validateRequest
  ],
  register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login de usuario
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .notEmpty()
      .withMessage('El email es obligatorio')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es obligatoria'),
    validateRequest
  ],
  login
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route   PUT /api/v1/auth/me
 * @desc    Actualizar perfil del usuario
 * @access  Private
 */
router.put(
  '/me',
  authenticate,
  [
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
    validateRequest
  ],
  updateMe
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Cambiar contraseña
 * @access  Private
 */
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('La contraseña actual es obligatoria'),
    body('newPassword')
      .notEmpty()
      .withMessage('La nueva contraseña es obligatoria')
      .isLength({ min: 6 })
      .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
    validateRequest
  ],
  changePassword
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
router.post('/logout', authenticate, logout);

module.exports = router;