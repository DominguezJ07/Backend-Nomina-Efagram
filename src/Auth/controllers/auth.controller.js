const User = require('../models/user.model');
const { generateToken } = require('../../utils/jwtUtils');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const logger = require('../../utils/logger');

/**
 * @desc    Registrar nuevo usuario
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, nombre, roles } = req.body;

  // Verificar si el usuario ya existe
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, 'El usuario ya existe');
  }

  // Crear usuario
  const user = await User.create({
    email,
    password,
    nombre,
    roles: roles || ['TRABAJADOR']
  });

  // Generar token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      user: {
        _id: user._id,
        email: user.email,
        nombre: user.nombre,
        roles: user.roles
      },
      token
    }
  });
});

/**
 * @desc    Login de usuario
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validar que vengan email y password
  if (!email || !password) {
    throw new ApiError(400, 'Por favor proporcione email y contraseña');
  }

  // Buscar usuario activo con password
  const user = await User.findActiveByEmail(email);

  if (!user) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  // Verificar password
  const isPasswordValid = await user.matchPassword(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Credenciales inválidas');
  }

  // Actualizar último acceso
  user.ultimo_acceso = new Date();
  await user.save();

  logger.info(`Usuario autenticado: ${user.email}`);

  // Generar token
  const token = generateToken({
    id: user._id,
    email: user.email,
    roles: user.roles,
    nombre: user.nombre
  });

  res.status(200).json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: user.toPublicJSON(),
      token
    }
  });
});

/**
 * @desc    Obtener usuario actual
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  res.status(200).json({
    success: true,
    data: user.toPublicJSON()
  });
});

/**
 * @desc    Actualizar perfil de usuario
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
const updateMe = asyncHandler(async (req, res) => {
  // Campos que el usuario puede actualizar
  const fieldsToUpdate = {
    nombre: req.body.nombre,
    apellidos: req.body.apellidos,
    telefono: req.body.telefono
  };

  // Eliminar campos undefined
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  res.status(200).json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: user.toPublicJSON()
  });
});

/**
 * @desc    Cambiar contraseña
 * @route   PUT /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Por favor proporcione la contraseña actual y la nueva');
  }

  // Obtener usuario con password
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  // Verificar contraseña actual
  const isPasswordValid = await user.matchPassword(currentPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Contraseña actual incorrecta');
  }

  // Actualizar contraseña
  user.password = newPassword;
  await user.save();

  logger.info(`Contraseña cambiada para usuario: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

/**
 * @desc    Logout (invalidar token - lado cliente)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  logger.info(`Usuario desconectado: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Logout exitoso'
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  logout
};