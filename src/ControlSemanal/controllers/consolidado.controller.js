const ConsolidadoSemanal = require('../models/consolidadoSemanal.model');
const consolidadoService = require('../services/consolidado.service');
const Persona = require('../../Personal/models/persona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los consolidados
 * @route   GET /api/v1/consolidados
 * @access  Private
 */
const getConsolidados = asyncHandler(async (req, res) => {
  const { semana, trabajador, pal, estado } = req.query;

  const filter = {};
  if (semana) filter.semana_operativa = semana;
  if (trabajador) filter.trabajador = trabajador;
  if (pal) filter.proyecto_actividad_lote = pal;
  if (estado) filter.estado = estado;

  const consolidados = await ConsolidadoSemanal.find(filter)
    .populate('semana_operativa')
    .populate('trabajador')
    .populate('proyecto_actividad_lote')
    .populate('consolidado_por')
    .sort({ 'semana_operativa.fecha_inicio': -1 });

  res.status(200).json({
    success: true,
    count: consolidados.length,
    data: consolidados
  });
});

/**
 * @desc    Obtener un consolidado por ID
 * @route   GET /api/v1/consolidados/:id
 * @access  Private
 */
const getConsolidado = asyncHandler(async (req, res) => {
  const consolidado = await ConsolidadoSemanal.findById(req.params.id)
    .populate('semana_operativa')
    .populate('trabajador')
    .populate('proyecto_actividad_lote')
    .populate('consolidado_por');

  if (!consolidado) {
    throw new ApiError(404, 'Consolidado no encontrado');
  }

  res.status(200).json({
    success: true,
    data: consolidado
  });
});

/**
 * @desc    Generar consolidado para un trabajador y PAL
 * @route   POST /api/v1/consolidados/generar
 * @access  Private (Admin, Jefe, Supervisor)
 */
const generarConsolidado = asyncHandler(async (req, res) => {
  const { semana, trabajador, pal, estado } = req.body;  // ← Agregar estado

  // Obtener persona del usuario autenticado (OPCIONAL)
  const persona = await Persona.findOne({ usuario: req.user.id });
  const consolidadoPorId = persona ? persona._id : null;

  const consolidado = await consolidadoService.generarConsolidado(
    semana,
    trabajador,
    pal,
    consolidadoPorId,
    estado  // ← Pasar estado al servicio
  );

  res.status(201).json({
    success: true,
    message: 'Consolidado generado exitosamente',
    data: consolidado
  });
});

/**
 * @desc    Generar consolidados para toda una semana
 * @route   POST /api/v1/consolidados/generar-semana
 * @access  Private (Admin, Jefe)
 */
const generarConsolidadosSemana = asyncHandler(async (req, res) => {
  const { semana } = req.body;

  if (!semana) {
    throw new ApiError(400, 'La semana es obligatoria');
  }

  // Obtener persona del usuario autenticado (OPCIONAL)
  const persona = await Persona.findOne({ usuario: req.user.id });
  const consolidadoPorId = persona ? persona._id : null;

  const consolidados = await consolidadoService.generarConsolidadosSemana(
    semana,
    consolidadoPorId
  );

  res.status(201).json({
    success: true,
    message: `${consolidados.length} consolidados generados exitosamente`,
    count: consolidados.length,
    data: consolidados
  });
});

/**
 * @desc    Obtener consolidados por trabajador
 * @route   GET /api/v1/consolidados/trabajador/:trabajadorId
 * @access  Private
 */
const getConsolidadosByTrabajador = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    throw new ApiError(400, 'Las fechas son obligatorias');
  }

  const consolidados = await consolidadoService.getConsolidadosByTrabajador(
    req.params.trabajadorId,
    new Date(fecha_inicio),
    new Date(fecha_fin)
  );

  res.status(200).json({
    success: true,
    count: consolidados.length,
    data: consolidados
  });
});

/**
 * @desc    Aprobar un consolidado
 * @route   POST /api/v1/consolidados/:id/aprobar
 * @access  Private (Admin, Jefe)
 */
const aprobarConsolidado = asyncHandler(async (req, res) => {
  const consolidado = await ConsolidadoSemanal.findById(req.params.id);

  if (!consolidado) {
    throw new ApiError(404, 'Consolidado no encontrado');
  }

  if (consolidado.estado === 'CERRADO') {
    throw new ApiError(400, 'No se puede aprobar un consolidado cerrado');
  }

  consolidado.estado = 'APROBADO';
  await consolidado.save();

  await consolidado.populate(['semana_operativa', 'trabajador', 'proyecto_actividad_lote']);

  res.status(200).json({
    success: true,
    message: 'Consolidado aprobado exitosamente',
    data: consolidado
  });
});

/**
 * @desc    Actualizar un consolidado
 * @route   PUT /api/v1/consolidados/:id
 * @access  Private (Admin, Jefe)
 */
const updateConsolidado = asyncHandler(async (req, res) => {
  let consolidado = await ConsolidadoSemanal.findById(req.params.id);

  if (!consolidado) {
    throw new ApiError(404, 'Consolidado no encontrado');
  }

  if (consolidado.estado === 'CERRADO') {
    throw new ApiError(400, 'No se puede modificar un consolidado cerrado');
  }

  consolidado = await ConsolidadoSemanal.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['semana_operativa', 'trabajador', 'proyecto_actividad_lote', 'consolidado_por']);

  res.status(200).json({
    success: true,
    message: 'Consolidado actualizado exitosamente',
    data: consolidado
  });
});

module.exports = {
  getConsolidados,
  getConsolidado,
  generarConsolidado,
  generarConsolidadosSemana,
  getConsolidadosByTrabajador,
  aprobarConsolidado,
  updateConsolidado
};