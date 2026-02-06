const SemanaOperativa = require('../models/semanaOperativa.model');
const semanaService = require('../services/semana.service');
const Persona = require('../../Personal/models/persona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las semanas operativas
 * @route   GET /api/v1/semanas
 * @access  Private
 */
const getSemanas = asyncHandler(async (req, res) => {
  const { año, estado, fecha_inicio, fecha_fin } = req.query;

  const filter = {};
  if (año) filter.año = parseInt(año);
  if (estado) filter.estado = estado;

  if (fecha_inicio && fecha_fin) {
    filter.$or = [
      { fecha_inicio: { $gte: new Date(fecha_inicio), $lte: new Date(fecha_fin) } },
      { fecha_fin: { $gte: new Date(fecha_inicio), $lte: new Date(fecha_fin) } }
    ];
  }

  const semanas = await SemanaOperativa.find(filter)
    .populate('proyecto')
    .populate('nucleo')
    .populate('cerrada_por')
    .sort({ fecha_inicio: -1 });

  res.status(200).json({
    success: true,
    count: semanas.length,
    data: semanas
  });
});

/**
 * @desc    Obtener una semana operativa por ID
 * @route   GET /api/v1/semanas/:id
 * @access  Private
 */
const getSemana = asyncHandler(async (req, res) => {
  const semana = await SemanaOperativa.findById(req.params.id)
    .populate('proyecto')
    .populate('nucleo')
    .populate('cerrada_por');

  if (!semana) {
    throw new ApiError(404, 'Semana no encontrada');
  }

  res.status(200).json({
    success: true,
    data: semana
  });
});

/**
 * @desc    Obtener semana actual
 * @route   GET /api/v1/semanas/actual
 * @access  Private
 */
const getSemanaActual = asyncHandler(async (req, res) => {
  const semana = await semanaService.getSemanaActual();

  res.status(200).json({
    success: true,
    data: semana
  });
});

/**
 * @desc    Crear una semana operativa
 * @route   POST /api/v1/semanas
 * @access  Private (Admin, Jefe)
 */
const createSemana = asyncHandler(async (req, res) => {
  // Validar que no exista una semana con el mismo rango
  const existente = await SemanaOperativa.findOne({
    fecha_inicio: req.body.fecha_inicio,
    fecha_fin: req.body.fecha_fin
  });

  if (existente) {
    throw new ApiError(409, 'Ya existe una semana con este rango de fechas');
  }

  const semana = await SemanaOperativa.create(req.body);
  await semana.populate(['proyecto', 'nucleo']);

  res.status(201).json({
    success: true,
    message: 'Semana creada exitosamente',
    data: semana
  });
});

/**
 * @desc    Actualizar una semana operativa
 * @route   PUT /api/v1/semanas/:id
 * @access  Private (Admin, Jefe)
 */
const updateSemana = asyncHandler(async (req, res) => {
  let semana = await SemanaOperativa.findById(req.params.id);

  if (!semana) {
    throw new ApiError(404, 'Semana no encontrada');
  }

  if (semana.estado === 'CERRADA' && !req.user.roles.includes('ADMIN_SISTEMA')) {
    throw new ApiError(400, 'No se puede modificar una semana cerrada');
  }

  semana = await SemanaOperativa.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['proyecto', 'nucleo', 'cerrada_por']);

  res.status(200).json({
    success: true,
    message: 'Semana actualizada exitosamente',
    data: semana
  });
});

/**
 * @desc    Cerrar una semana operativa
 * @route   POST /api/v1/semanas/:id/cerrar
 * @access  Private (Admin, Jefe)
 */
const cerrarSemana = asyncHandler(async (req, res) => {
  // Buscar persona asociada al usuario
  let persona = await Persona.findOne({ usuario: req.user.id });
  
  // Si no existe persona asociada, usar el ID del usuario directamente
  // Esto permite que administradores sin perfil de persona puedan cerrar semanas
  const cerradoPorId = persona ? persona._id : req.user.id;

  const semana = await semanaService.cerrarSemana(req.params.id, cerradoPorId);

  await semana.populate(['proyecto', 'nucleo', 'cerrada_por']);

  res.status(200).json({
    success: true,
    message: 'Semana cerrada exitosamente',
    data: semana
  });
});

/**
 * @desc    Verificar si una semana puede cerrarse
 * @route   GET /api/v1/semanas/:id/puede-cerrar
 * @access  Private
 */
const puedeObtenerSemana = asyncHandler(async (req, res) => {
  const validacion = await semanaService.puedeObtenerSemana(req.params.id);

  res.status(200).json({
    success: true,
    data: validacion
  });
});

/**
 * @desc    Abrir una semana cerrada (solo Admin)
 * @route   POST /api/v1/semanas/:id/abrir
 * @access  Private (Admin)
 */
const abrirSemana = asyncHandler(async (req, res) => {
  const semana = await SemanaOperativa.findById(req.params.id);

  if (!semana) {
    throw new ApiError(404, 'Semana no encontrada');
  }

  if (semana.estado !== 'CERRADA') {
    throw new ApiError(400, 'La semana no está cerrada');
  }

  semana.estado = 'ABIERTA';
  semana.cerrada_por = null;
  semana.fecha_cierre = null;
  await semana.save();

  res.status(200).json({
    success: true,
    message: 'Semana reabierta exitosamente',
    data: semana
  });
});

module.exports = {
  getSemanas,
  getSemana,
  getSemanaActual,
  createSemana,
  updateSemana,
  cerrarSemana,
  puedeObtenerSemana,
  abrirSemana
};