const AsignacionTrabajador = require('../models/asignacionTrabajador.model');
const asignacionService = require('../services/asignacion.service');
const personaService = require('../services/persona.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las asignaciones de trabajadores
 * @route   GET /api/v1/asignaciones-trabajador
 * @access  Private
 */
const getAsignaciones = asyncHandler(async (req, res) => {
  const { trabajador, cuadrilla, activa } = req.query;

  const filter = {};
  if (trabajador) filter.trabajador = trabajador;
  if (cuadrilla) filter.cuadrilla = cuadrilla;
  if (activa !== undefined) filter.activa = activa === 'true';

  const asignaciones = await AsignacionTrabajador.find(filter)
    .populate('trabajador')
    .populate('proyecto_actividad_lote')
    .populate('cuadrilla')
    .sort({ fecha_inicio: -1 });

  res.status(200).json({
    success: true,
    count: asignaciones.length,
    data: asignaciones
  });
});

/**
 * @desc    Obtener una asignación por ID
 * @route   GET /api/v1/asignaciones-trabajador/:id
 * @access  Private
 */
const getAsignacion = asyncHandler(async (req, res) => {
  const asignacion = await AsignacionTrabajador.findById(req.params.id)
    .populate('trabajador')
    .populate('proyecto_actividad_lote')
    .populate('cuadrilla');

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  res.status(200).json({
    success: true,
    data: asignacion
  });
});

/**
 * @desc    Crear una asignación de trabajador
 * @route   POST /api/v1/asignaciones-trabajador
 * @access  Private (Admin, Jefe Operaciones, Supervisor)
 */
const createAsignacion = asyncHandler(async (req, res) => {
  // Validar que el trabajador exista
  await personaService.validatePersonaExists(req.body.trabajador);

  // Verificar solapamiento de horarios
  const haySolapamiento = await asignacionService.verificarSolapamientoHorario(
    req.body.trabajador,
    req.body.fecha_inicio || new Date(),
    req.body.horario?.hora_entrada || '07:00',
    req.body.horario?.hora_salida || '17:00'
  );

  if (haySolapamiento) {
    throw new ApiError(409, 'El trabajador ya tiene una asignación en ese horario');
  }

  const asignacion = await AsignacionTrabajador.create(req.body);
  await asignacion.populate(['trabajador', 'proyecto_actividad_lote', 'cuadrilla']);

  res.status(201).json({
    success: true,
    message: 'Asignación creada exitosamente',
    data: asignacion
  });
});

/**
 * @desc    Actualizar una asignación
 * @route   PUT /api/v1/asignaciones-trabajador/:id
 * @access  Private (Admin, Jefe Operaciones, Supervisor)
 */
const updateAsignacion = asyncHandler(async (req, res) => {
  let asignacion = await AsignacionTrabajador.findById(req.params.id);

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  asignacion = await AsignacionTrabajador.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['trabajador', 'proyecto_actividad_lote', 'cuadrilla']);

  res.status(200).json({
    success: true,
    message: 'Asignación actualizada exitosamente',
    data: asignacion
  });
});

/**
 * @desc    Finalizar asignaciones de un trabajador
 * @route   POST /api/v1/asignaciones-trabajador/finalizar/:trabajadorId
 * @access  Private (Admin, Jefe Operaciones)
 */
const finalizarAsignaciones = asyncHandler(async (req, res) => {
  const { motivo } = req.body;

  if (!motivo) {
    throw new ApiError(400, 'El motivo es obligatorio');
  }

  const cantidad = await asignacionService.finalizarAsignaciones(
    req.params.trabajadorId,
    new Date(),
    motivo
  );

  res.status(200).json({
    success: true,
    message: `${cantidad} asignación(es) finalizada(s) exitosamente`,
    data: {
      trabajador: req.params.trabajadorId,
      cantidad
    }
  });
});

module.exports = {
  getAsignaciones,
  getAsignacion,
  createAsignacion,
  updateAsignacion,
  finalizarAsignaciones
};