const User = require('../models/user.model');
const { generateToken } = require('../../utils/jwtUtils');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const { ROLES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * @desc    Obtener todos los usuarios
 * @route   GET /api/v1/users
 * @access  Private (Admin)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, activo } = req.query;

  const query = {};

  // Filtro por búsqueda (nombre o email)
  if (search) {
    query.$or = [
      { nombre: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Filtro por estado activo
  if (activo !== undefined) {
    query.activo = activo === 'true';
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
  });
});

/**
 * @desc    Obtener usuario por ID
 * @route   GET /api/v1/users/:id
 * @access  Private (Admin o propio usuario)
 */
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id).select('-password');

  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  // Verificar permisos: admin o propio usuario
  if (!req.user.roles.includes(ROLES.ADMIN_SISTEMA) && req.user.id !== id) {
    throw new ApiError(403, 'No tienes permisos para ver este usuario');
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

/**
 * @desc    Crear nuevo usuario
 * @route   POST /api/v1/users
 * @access  Private (Admin)
 */
const createUser = asyncHandler(async (req, res) => {
  const { nombre, email, password, roles, avatar } = req.body;

  // Verificar si el usuario ya existe
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, 'El usuario ya existe');
  }

  // Crear usuario
  const user = await User.create({
    nombre,
    email,
    password,
    roles: roles || [ROLES.TRABAJADOR],
    avatar
  });

  // Generar token
  const token = generateToken({
    id: user._id,
    email: user.email,
    roles: user.roles,
    nombre: user.nombre
  });

  logger.info(`Usuario creado: ${user.email} por ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Usuario creado exitosamente',
    data: {
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        roles: user.roles,
        activo: user.activo,
        avatar: user.avatar
      },
      token
    }
  });
});

/**
 * @desc    Actualizar usuario
 * @route   PUT /api/v1/users/:id
 * @access  Private (Admin o propio usuario)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, email, roles, avatar, activo } = req.body;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  // Verificar permisos: admin o propio usuario
  if (!req.user.roles.includes(ROLES.ADMIN_SISTEMA) && req.user.id !== id) {
    throw new ApiError(403, 'No tienes permisos para actualizar este usuario');
  }

  // Si no es admin, no puede cambiar roles ni estado activo
  if (!req.user.roles.includes(ROLES.ADMIN_SISTEMA)) {
    delete req.body.roles;
    delete req.body.activo;
  }

  // Verificar email único si se cambia
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      throw new ApiError(400, 'El email ya está en uso');
    }
  }

  // Actualizar usuario
  Object.assign(user, req.body);
  await user.save();

  logger.info(`Usuario actualizado: ${user.email} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Usuario actualizado exitosamente',
    data: {
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        roles: user.roles,
        activo: user.activo,
        avatar: user.avatar
      }
    }
  });
});

/**
 * @desc    Eliminar usuario (soft delete)
 * @route   DELETE /api/v1/users/:id
 * @access  Private (Admin)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  // No permitir eliminar admin sistema
  if (user.roles.includes(ROLES.ADMIN_SISTEMA)) {
    throw new ApiError(400, 'No se puede eliminar un usuario administrador del sistema');
  }

  // Soft delete
  user.activo = false;
  await user.save();

  logger.info(`Usuario eliminado (soft): ${user.email} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Usuario eliminado exitosamente'
  });
});

/**
 * @desc    Cambiar contraseña de usuario
 * @route   PUT /api/v1/users/:id/password
 * @access  Private (Admin o propio usuario)
 */
const changeUserPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  // Verificar permisos: admin o propio usuario
  if (!req.user.roles.includes(ROLES.ADMIN_SISTEMA) && req.user.id !== id) {
    throw new ApiError(403, 'No tienes permisos para cambiar la contraseña de este usuario');
  }

  user.password = newPassword;
  await user.save();

  logger.info(`Contraseña cambiada para usuario: ${user.email} por ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword
};