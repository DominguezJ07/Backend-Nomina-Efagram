const ActividadCatalogo = require('../models/actividadCatalogo.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las actividades
 * @route   GET /api/v1/actividades
 * @access  Private
 */
const getActividades = asyncHandler(async (req, res) => {
  const { activa, categoria } = req.query;

  const filter = {};
  if (activa !== undefined) filter.activa = activa === 'true';
  if (categoria) filter.categoria = categoria;

  const actividades = await ActividadCatalogo.find(filter).sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: actividades.length,
    data: actividades
  });
});

/**
 * @desc    Obtener una actividad por ID
 * @route   GET /api/v1/actividades/:id
 * @access  Private
 */
const getActividad = asyncHandler(async (req, res) => {
  const actividad = await ActividadCatalogo.findById(req.params.id);

  if (!actividad) {
    throw new ApiError(404, 'Actividad no encontrada');
  }

  res.status(200).json({
    success: true,
    data: actividad
  });
});

/**
 * @desc    Crear una actividad
 * @route   POST /api/v1/actividades
 * @access  Private (Admin, Jefe)
 */
const createActividad = asyncHandler(async (req, res) => {
  // Verificar que el código no exista
  const exists = await ActividadCatalogo.findOne({ codigo: req.body.codigo });
  if (exists) {
    throw new ApiError(409, 'El código de actividad ya existe');
  }

  const actividad = await ActividadCatalogo.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Actividad creada exitosamente',
    data: actividad
  });
});

/**
 * @desc    Actualizar una actividad
 * @route   PUT /api/v1/actividades/:id
 * @access  Private (Admin, Jefe)
 */
const updateActividad = asyncHandler(async (req, res) => {
  let actividad = await ActividadCatalogo.findById(req.params.id);

  if (!actividad) {
    throw new ApiError(404, 'Actividad no encontrada');
  }

  actividad = await ActividadCatalogo.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Actividad actualizada exitosamente',
    data: actividad
  });
});

/**
 * @desc    Desactivar una actividad
 * @route   DELETE /api/v1/actividades/:id
 * @access  Private (Admin)
 */
const deleteActividad = asyncHandler(async (req, res) => {
  const actividad = await ActividadCatalogo.findById(req.params.id);

  if (!actividad) {
    throw new ApiError(404, 'Actividad no encontrada');
  }

  actividad.activa = false;
  await actividad.save();

  res.status(200).json({
    success: true,
    message: 'Actividad desactivada exitosamente',
    data: actividad
  });
});

module.exports = {
  getActividades,
  getActividad,
  createActividad,
  updateActividad,
  deleteActividad
};



 