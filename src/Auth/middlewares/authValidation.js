const { body } = require('express-validator');
const { ROLES } = require('../../config/constants');

const registerValidation = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  
  body('apellidos')
    .notEmpty()
    .withMessage('Los apellidos son obligatorios')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Los apellidos deben tener entre 2 y 50 caracteres'),
  
  body('email')
    .notEmpty()
    .withMessage('El email es obligatorio')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
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
  
  body('telefono')
    .optional()
    .trim()
    .isLength({ min: 7, max: 15 })
    .withMessage('El teléfono debe tener entre 7 y 15 dígitos'),
  
  body('roles')
    .optional()
    .isArray()
    .withMessage('Los roles deben ser un array')
    .custom((value) => {
      const validRoles = Object.values(ROLES);
      return value.every(role => validRoles.includes(role));
    })
    .withMessage('Roles inválidos')
];

const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage('El email es obligatorio')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es obligatoria'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('La nueva contraseña es obligatoria')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número')
];

module.exports = {
  registerValidation,
  loginValidation,
  changePasswordValidation
};