const express = require('express');
const { validateRequest } = require('../../middlewares/validateRequest');
const { authenticate } = require('../../middlewares/authMiddleware');
const {
  registerValidation,
  loginValidation,
  changePasswordValidation
} = require('../middlewares/authValidation');
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  logout
} = require('../controllers/auth.controller');

const router = express.Router();

// Rutas públicas
router.post('/register', registerValidation, validateRequest, register);
router.post('/login', loginValidation, validateRequest, login);

// Rutas protegidas
router.use(authenticate); // Todas las rutas siguientes requieren autenticación

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/change-password', changePasswordValidation, validateRequest, changePassword);
router.post('/logout', logout);

module.exports = router;


