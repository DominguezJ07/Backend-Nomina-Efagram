const ActividadCatalogo = require('../models/actividadCatalogo.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * ======================================================
 * @desc    Obtener todas las actividades
 * @route   GET /api/v1/actividades
 * @access  Private
 * ======================================================
 * Query params opcionales:
 *  - activa=true | false | all
 *  - categoria=CONTROL_MALEZA
 *  - search=texto
 */
const getActividades = asyncHandler(async (req, res) => {
  const { activa, categoria, search } = req.query;

  const filter = {};

  // 🔹 Filtro por estado (por defecto solo activas)
  if (!activa || activa === 'true') {
    filter.activa = true;
  } else if (activa === 'false') {
    filter.activa = false;
  }
  // Si activa === 'all' no se agrega filtro

  // 🔹 Filtro por categoría
  if (categoria) {
    filter.categoria = categoria;
  }

  // 🔹 Búsqueda por código o nombre
  if (search) {
    filter.$or = [
      { codigo: { $regex: search, $options: 'i' } },
      { nombre: { $regex: search, $options: 'i' } }
    ];
  }

  const actividades = await ActividadCatalogo
    .find(filter)
    .sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: actividades.length,
    data: actividades
  });
});

/**
 * ======================================================
 * @desc    Obtener una actividad por ID
 * @route   GET /api/v1/actividades/:id
 * @access  Private
 * ======================================================
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
 * ======================================================
 * @desc    Crear una actividad
 * @route   POST /api/v1/actividades
 * @access  Private (Admin, Jefe)
 * ======================================================
 */
const createActividad = asyncHandler(async (req, res) => {
  const { codigo } = req.body;

  // 🔹 Normalizar código a mayúsculas
  const codigoNormalizado = codigo?.toUpperCase().trim();

  const exists = await ActividadCatalogo.findOne({ codigo: codigoNormalizado });
  if (exists) {
    throw new ApiError(409, 'El código de actividad ya existe');
  }

  const actividad = await ActividadCatalogo.create({
    ...req.body,
    codigo: codigoNormalizado
  });

  res.status(201).json({
    success: true,
    message: 'Actividad creada exitosamente',
    data: actividad
  });
});

/**
 * ======================================================
 * @desc    Actualizar una actividad
 * @route   PUT /api/v1/actividades/:id
 * @access  Private (Admin, Jefe)
 * ======================================================
 */
const updateActividad = asyncHandler(async (req, res) => {
  const actividadExistente = await ActividadCatalogo.findById(req.params.id);

  if (!actividadExistente) {
    throw new ApiError(404, 'Actividad no encontrada');
  }

  // 🔹 Si actualizan código, validar duplicado
  if (req.body.codigo) {
    const codigoNormalizado = req.body.codigo.toUpperCase().trim();

    const existeCodigo = await ActividadCatalogo.findOne({
      codigo: codigoNormalizado,
      _id: { $ne: req.params.id }
    });

    if (existeCodigo) {
      throw new ApiError(409, 'El código ya está en uso por otra actividad');
    }

    req.body.codigo = codigoNormalizado;
  }

  const actividadActualizada = await ActividadCatalogo.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: 'Actividad actualizada exitosamente',
    data: actividadActualizada
  });
});

/**
 * ======================================================
 * @desc    Desactivar una actividad (Soft Delete)
 * @route   DELETE /api/v1/actividades/:id
 * @access  Private (Admin)
 * ======================================================
 */
const deleteActividad = asyncHandler(async (req, res) => {
  const actividad = await ActividadCatalogo.findById(req.params.id);

  if (!actividad) {
    throw new ApiError(404, 'Actividad no encontrada');
  }

  if (!actividad.activa) {
    throw new ApiError(400, 'La actividad ya está desactivada');
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
