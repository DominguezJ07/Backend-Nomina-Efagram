const UserService = require('../services/user.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const { ROLES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * @desc    Obtener todos los usuarios con filtros
 * @route   GET /api/v1/users
 * @access  Private (Admin, Talento Humano, Supervisor)
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, activo, rol } = req.query;

  const filtros = {
    page,
    limit,
    search,
    activo,
    rol
  };

  const resultado = await UserService.obtenerTodos(filtros);

  res.status(200).json({
    success: true,
    data: resultado
  });
});

/**
 * @desc    Obtener usuario por ID
 * @route   GET /api/v1/users/:id
 * @access  Private (Admin o propio usuario)
 */
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verificar permisos: admin o propio usuario
  if (!req.user.roles.includes(ROLES.ADMIN_SISTEMA) && req.user.id !== id) {
    throw new ApiError(403, 'No tienes permisos para ver este usuario');
  }

  const usuario = await UserService.obtenerPorId(id);

  res.status(200).json({
    success: true,
    data: usuario
  });
});

/**
 * @desc    Crear nuevo usuario
 * @route   POST /api/v1/users
 * @access  Private (Admin, Talento Humano)
 */
const createUser = asyncHandler(async (req, res) => {
  const { nombre, email, password, roles, avatar } = req.body;

  // Validar datos requeridos
  if (!nombre || !email || !password) {
    throw new ApiError(400, 'Nombre, email y contraseña son requeridos');
  }

  const resultado = await UserService.crear(
    { nombre, email, password, roles, avatar },
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: 'Usuario creado exitosamente',
    data: resultado
  });
});

/**
 * @desc    Actualizar usuario
 * @route   PUT /api/v1/users/:id
 * @access  Private (Admin o propio usuario)
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const datosActualizacion = req.body;

  // Verificar permisos: admin o propio usuario
  if (!req.user.roles.includes(ROLES.ADMIN_SISTEMA) && req.user.id !== id) {
    throw new ApiError(403, 'No tienes permisos para actualizar este usuario');
  }

  // Si no es admin, no puede cambiar roles ni estado activo
  if (!req.user.roles.includes(ROLES.ADMIN_SISTEMA)) {
    delete datosActualizacion.roles;
    delete datosActualizacion.activo;
  }

  const usuarioActualizado = await UserService.actualizar(
    id,
    datosActualizacion,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Usuario actualizado exitosamente',
    data: usuarioActualizado
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

  if (!newPassword) {
    throw new ApiError(400, 'La nueva contraseña es requerida');
  }

  // Verificar permisos: admin o propio usuario
  if (!req.user.roles.includes(ROLES.ADMIN_SISTEMA) && req.user.id !== id) {
    throw new ApiError(403, 'No tienes permisos para cambiar la contraseña de este usuario');
  }

  await UserService.cambiarPassword(id, newPassword, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

/**
 * @desc    Cambiar roles de usuario
 * @route   PUT /api/v1/users/:id/roles
 * @access  Private (Admin)
 */
const changeUserRoles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;

  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    throw new ApiError(400, 'Roles válidos son requeridos');
  }

  const usuarioActualizado = await UserService.cambiarRoles(
    id,
    roles,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Roles del usuario actualizados exitosamente',
    data: usuarioActualizado
  });
});

/**
 * @desc    Desactivar usuario
 * @route   PUT /api/v1/users/:id/deactivate
 * @access  Private (Admin, Talento Humano)
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await UserService.desactivar(id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Usuario desactivado exitosamente'
  });
});

/**
 * @desc    Activar usuario
 * @route   PUT /api/v1/users/:id/activate
 * @access  Private (Admin, Talento Humano)
 */
const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await UserService.activar(id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Usuario activado exitosamente'
  });
});

/**
 * @desc    Eliminar usuario (hard delete)
 * @route   DELETE /api/v1/users/:id
 * @access  Private (Admin)
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await UserService.eliminar(id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Usuario eliminado exitosamente'
  });
});

/**
 * @desc    Obtener estadísticas de usuarios
 * @route   GET /api/v1/users/stats/dashboard
 * @access  Private (Admin)
 */
const getUserStats = asyncHandler(async (req, res) => {
  const estadisticas = await UserService.obtenerEstadisticas();

  res.status(200).json({
    success: true,
    data: estadisticas
  });
});

/**
 * @desc    Obtener lista de roles disponibles con sus descripciones
 * @route   GET /api/v1/users/roles/list
 * @access  Private (cualquier usuario autenticado)
 */
const getRolesList = asyncHandler(async (req, res) => {
  const { ROLE_DESCRIPTIONS } = require('../../config/permissions');

  const rolesDisponibles = Object.entries(ROLE_DESCRIPTIONS).map(([key, info]) => ({
    id: key,
    ...info
  }));

  res.status(200).json({
    success: true,
    data: {
      roles: rolesDisponibles
    }
  });
});

/**
 * @desc    Obtener permisos de un rol específico
 * @route   GET /api/v1/users/roles/:rol/permissions
 * @access  Private (Admin)
 */
const getRolePermissions = asyncHandler(async (req, res) => {
  const { rol } = req.params;
  const { getPermissionsByRole, ROLE_DESCRIPTIONS } = require('../../config/permissions');

  if (!Object.values(ROLES).includes(rol)) {
    throw new ApiError(400, `Rol inválido: ${rol}`);
  }

  const permisos = getPermissionsByRole(rol);
  const info = ROLE_DESCRIPTIONS[rol];

  res.status(200).json({
    success: true,
    data: {
      rol,
      info,
      permisos,
      totalPermisos: permisos.length
    }
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  changeUserPassword,
  changeUserRoles,
  deactivateUser,
  activateUser,
  deleteUser,
  getUserStats,
  getRolesList,
  getRolePermissions
};