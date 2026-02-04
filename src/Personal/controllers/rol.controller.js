const Rol = require('../models/rol.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const { ROLES } = require('../../config/constants');

/**
 * @desc    Obtener todos los roles
 * @route   GET /api/v1/roles
 * @access  Private
 */
const getRoles = asyncHandler(async (req, res) => {
  const { activo } = req.query;

  const filter = {};
  if (activo !== undefined) {
    filter.activo = activo === 'true';
  }

  const roles = await Rol.find(filter).sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: roles.length,
    data: roles
  });
});

/**
 * @desc    Obtener un rol por ID
 * @route   GET /api/v1/roles/:id
 * @access  Private
 */
const getRol = asyncHandler(async (req, res) => {
  const rol = await Rol.findById(req.params.id);

  if (!rol) {
    throw new ApiError(404, 'Rol no encontrado');
  }

  res.status(200).json({
    success: true,
    data: rol
  });
});

/**
 * @desc    Obtener un rol por código
 * @route   GET /api/v1/roles/codigo/:codigo
 * @access  Private
 */
const getRolByCodigo = asyncHandler(async (req, res) => {
  const rol = await Rol.findOne({ codigo: req.params.codigo.toUpperCase() });

  if (!rol) {
    throw new ApiError(404, 'Rol no encontrado');
  }

  res.status(200).json({
    success: true,
    data: rol
  });
});

/**
 * @desc    Crear un rol
 * @route   POST /api/v1/roles
 * @access  Private (Admin)
 */
const createRol = asyncHandler(async (req, res) => {
  // Verificar que el código no exista
  const rolExists = await Rol.findOne({ codigo: req.body.codigo });

  if (rolExists) {
    throw new ApiError(409, 'El código de rol ya existe');
  }

  const rol = await Rol.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Rol creado exitosamente',
    data: rol
  });
});

/**
 * @desc    Actualizar un rol
 * @route   PUT /api/v1/roles/:id
 * @access  Private (Admin)
 */
const updateRol = asyncHandler(async (req, res) => {
  const rol = await Rol.findById(req.params.id);

  if (!rol) {
    throw new ApiError(404, 'Rol no encontrado');
  }

  // Verificar si el código está cambiando y si ya existe
  if (req.body.codigo && req.body.codigo !== rol.codigo) {
    const existeCodigo = await Rol.findOne({ 
      codigo: req.body.codigo,
      _id: { $ne: req.params.id }
    });
    
    if (existeCodigo) {
      throw new ApiError(409, 'El código de rol ya existe');
    }
  }

  // Actualizar solo los campos permitidos
  const camposPermitidos = ['codigo', 'nombre', 'descripcion', 'permisos', 'activo'];
  camposPermitidos.forEach(campo => {
    if (req.body[campo] !== undefined) {
      rol[campo] = req.body[campo];
    }
  });

  await rol.save();

  res.status(200).json({
    success: true,
    message: 'Rol actualizado exitosamente',
    data: rol
  });
});

/**
 * @desc    Desactivar un rol
 * @route   DELETE /api/v1/roles/:id
 * @access  Private (Admin)
 */
const deleteRol = asyncHandler(async (req, res) => {
  const rol = await Rol.findById(req.params.id);

  if (!rol) {
    throw new ApiError(404, 'Rol no encontrado');
  }

  if (!rol.activo) {
    throw new ApiError(400, 'El rol ya está desactivado');
  }

  rol.activo = false;
  await rol.save();

  res.status(200).json({
    success: true,
    message: 'Rol desactivado exitosamente',
    data: rol
  });
});

/**
 * @desc    Agregar permisos a un rol
 * @route   POST /api/v1/roles/:id/permisos
 * @access  Private (Admin)
 */
const agregarPermisos = asyncHandler(async (req, res) => {
  const { permisos } = req.body;

  if (!permisos || !Array.isArray(permisos)) {
    throw new ApiError(400, 'Debe proporcionar un array de permisos');
  }

  const rol = await Rol.findById(req.params.id);

  if (!rol) {
    throw new ApiError(404, 'Rol no encontrado');
  }

  // Agregar permisos únicos
  permisos.forEach(permiso => {
    if (!rol.permisos.includes(permiso)) {
      rol.permisos.push(permiso);
    }
  });

  await rol.save();

  res.status(200).json({
    success: true,
    message: 'Permisos agregados exitosamente',
    data: rol
  });
});

/**
 * @desc    Remover permisos de un rol
 * @route   DELETE /api/v1/roles/:id/permisos
 * @access  Private (Admin)
 */
const removerPermisos = asyncHandler(async (req, res) => {
  const { permisos } = req.body;

  if (!permisos || !Array.isArray(permisos)) {
    throw new ApiError(400, 'Debe proporcionar un array de permisos');
  }

  const rol = await Rol.findById(req.params.id);

  if (!rol) {
    throw new ApiError(404, 'Rol no encontrado');
  }

  // Remover permisos
  rol.permisos = rol.permisos.filter(p => !permisos.includes(p));
  await rol.save();

  res.status(200).json({
    success: true,
    message: 'Permisos removidos exitosamente',
    data: rol
  });
});

module.exports = {
  getRoles,
  getRol,
  getRolByCodigo,
  createRol,
  updateRol,
  deleteRol,
  agregarPermisos,
  removerPermisos
};