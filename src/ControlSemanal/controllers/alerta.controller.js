const AlertaSemanal = require('../models/alertaSemanal.model');
const alertaService = require('../services/alerta.service');
const Persona = require('../../Personal/models/persona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las alertas
 * @route   GET /api/v1/alertas
 * @access  Private
 */
const getAlertas = asyncHandler(async (req, res) => {
  const { semana, tipo, nivel, estado, entidad_tipo } = req.query;

  const filter = {};
  if (semana) filter.semana_operativa = semana;
  if (tipo) filter.tipo = tipo;
  if (nivel) filter.nivel = nivel;
  if (estado) filter.estado = estado;
  if (entidad_tipo) filter.entidad_tipo = entidad_tipo;

  const alertas = await AlertaSemanal.find(filter)
    .populate('semana_operativa')
    .populate('entidad_id')
    .populate('resuelto_por')
    .sort({ nivel: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: alertas.length,
    data: alertas
  });
});

/**
 * @desc    Obtener una alerta por ID
 * @route   GET /api/v1/alertas/:id
 * @access  Private
 */
const getAlerta = asyncHandler(async (req, res) => {
  const alerta = await AlertaSemanal.findById(req.params.id)
    .populate('semana_operativa')
    .populate('entidad_id')
    .populate('resuelto_por');

  if (!alerta) {
    throw new ApiError(404, 'Alerta no encontrada');
  }

  res.status(200).json({
    success: true,
    data: alerta
  });
});

/**
 * @desc    Generar alertas automáticas para una semana
 * @route   POST /api/v1/alertas/generar-semana
 * @access  Private (Admin, Jefe)
 */
const generarAlertasSemana = asyncHandler(async (req, res) => {
  const { semana } = req.body;

  if (!semana) {
    throw new ApiError(400, 'La semana es obligatoria');
  }

  const alertas = await alertaService.generarAlertasSemana(semana);

  res.status(201).json({
    success: true,
    message: `${alertas.length} alertas generadas exitosamente`,
    count: alertas.length,
    data: alertas
  });
});

/**
 * @desc    Crear una alerta manualmente
 * @route   POST /api/v1/alertas
 * @access  Private (Admin, Jefe, Supervisor)
 */
const createAlerta = asyncHandler(async (req, res) => {
  const alerta = await alertaService.crearAlerta(req.body);

  await alerta.populate(['semana_operativa', 'entidad_id']);

  res.status(201).json({
    success: true,
    message: 'Alerta creada exitosamente',
    data: alerta
  });
});

/**
 * @desc    Resolver una alerta
 * @route   POST /api/v1/alertas/:id/resolver
 * @access  Private (Admin, Jefe, Supervisor)
 */
const resolverAlerta = asyncHandler(async (req, res) => {
  const { comentario } = req.body;

  if (!comentario) {
    throw new ApiError(400, 'El comentario de resolución es obligatorio');
  }

  const alerta = await AlertaSemanal.findById(req.params.id);

  if (!alerta) {
    throw new ApiError(404, 'Alerta no encontrada');
  }

  // Buscar persona asociada al usuario, si no existe usar el ID del usuario directamente
  let persona = await Persona.findOne({ usuario: req.user.id });
  const resuelto_por = persona ? persona._id : req.user.id;

  await alerta.resolver(resuelto_por, comentario);

  await alerta.populate(['semana_operativa', 'entidad_id', 'resuelto_por']);

  res.status(200).json({
    success: true,
    message: 'Alerta resuelta exitosamente',
    data: alerta
  });
});

/**
 * @desc    Actualizar estado de alerta
 * @route   PUT /api/v1/alertas/:id/estado
 * @access  Private (Admin, Jefe)
 */
const updateEstadoAlerta = asyncHandler(async (req, res) => {
  const { estado } = req.body;

  if (!estado) {
    throw new ApiError(400, 'El estado es obligatorio');
  }

  const alerta = await AlertaSemanal.findById(req.params.id);

  if (!alerta) {
    throw new ApiError(404, 'Alerta no encontrada');
  }

  alerta.estado = estado;
  await alerta.save();

  await alerta.populate(['semana_operativa', 'entidad_id', 'resuelto_por']);

  res.status(200).json({
    success: true,
    message: 'Estado de alerta actualizado',
    data: alerta
  });
});

/**
 * @desc    Obtener alertas por semana
 * @route   GET /api/v1/alertas/semana/:semanaId
 * @access  Private
 */
const getAlertasBySemana = asyncHandler(async (req, res) => {
  const { nivel, estado } = req.query;

  const filter = { semana_operativa: req.params.semanaId };
  if (nivel) filter.nivel = nivel;
  if (estado) filter.estado = estado;

  const alertas = await AlertaSemanal.find(filter)
    .populate('entidad_id')
    .populate('resuelto_por')
    .sort({ nivel: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: alertas.length,
    data: alertas
  });
});

module.exports = {
  getAlertas,
  getAlerta,
  generarAlertasSemana,
  createAlerta,
  resolverAlerta,
  updateEstadoAlerta,
  getAlertasBySemana
};