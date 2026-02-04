const Proyecto = require('../models/proyecto.model');
const proyectoService = require('../services/proyecto.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los proyectos
 * @route   GET /api/v1/proyectos
 * @access  Private
 */
const getProyectos = asyncHandler(async (req, res) => {
  const { cliente, estado } = req.query;

  const filter = {};
  if (cliente) filter.cliente = cliente;
  if (estado) filter.estado = estado;

  const proyectos = await Proyecto.find(filter)
    .populate('cliente')
    .populate('responsable')
    .sort({ fecha_inicio: -1 });

  res.status(200).json({
    success: true,
    count: proyectos.length,
    data: proyectos
  });
});

/**
 * @desc    Obtener un proyecto por ID
 * @route   GET /api/v1/proyectos/:id
 * @access  Private
 */
const getProyecto = asyncHandler(async (req, res) => {
  const proyecto = await Proyecto.findById(req.params.id)
    .populate('cliente')
    .populate('responsable');

  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }

  res.status(200).json({
    success: true,
    data: proyecto
  });
});

/**
 * @desc    Obtener resumen de un proyecto
 * @route   GET /api/v1/proyectos/:id/resumen
 * @access  Private
 */
const getResumenProyecto = asyncHandler(async (req, res) => {
  const resumen = await proyectoService.getResumenProyecto(req.params.id);

  res.status(200).json({
    success: true,
    data: resumen
  });
});

/**
 * @desc    Crear un proyecto
 * @route   POST /api/v1/proyectos
 * @access  Private (Admin, Jefe)
 */
const createProyecto = asyncHandler(async (req, res) => {
  // Validar que el cliente exista
  await proyectoService.validateClienteExists(req.body.cliente);

  const proyecto = await Proyecto.create(req.body);
  await proyecto.populate(['cliente', 'responsable']);

  res.status(201).json({
    success: true,
    message: 'Proyecto creado exitosamente',
    data: proyecto
  });
});

/**
 * @desc    Actualizar un proyecto
 * @route   PUT /api/v1/proyectos/:id
 * @access  Private (Admin, Jefe)
 */
const updateProyecto = asyncHandler(async (req, res) => {
  let proyecto = await proyectoService.validateProyectoExists(req.params.id);

  proyecto = await Proyecto.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['cliente', 'responsable']);

  res.status(200).json({
    success: true,
    message: 'Proyecto actualizado exitosamente',
    data: proyecto
  });
});

/**
 * @desc    Cerrar un proyecto
 * @route   POST /api/v1/proyectos/:id/cerrar
 * @access  Private (Admin, Jefe)
 */
const cerrarProyecto = asyncHandler(async (req, res) => {
  const proyecto = await proyectoService.cerrarProyecto(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Proyecto cerrado exitosamente',
    data: proyecto
  });
});

/**
 * @desc    Verificar si puede cerrar proyecto
 * @route   GET /api/v1/proyectos/:id/puede-cerrar
 * @access  Private
 */
const puedeObtenerProyecto = asyncHandler(async (req, res) => {
  const validacion = await proyectoService.puedeObtenerProyecto(req.params.id);

  res.status(200).json({
    success: true,
    data: validacion
  });
});

module.exports = {
  getProyectos,
  getProyecto,
  getResumenProyecto,
  createProyecto,
  updateProyecto,
  cerrarProyecto,
  puedeObtenerProyecto
};

