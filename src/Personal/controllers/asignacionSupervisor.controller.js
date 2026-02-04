const AsignacionSupervisor = require('../models/asignacionSupervisor.model');
const asignacionService = require('../services/asignacion.service');
const personaService = require('../services/persona.service');
const territorialService = require('../../Territorial/services/territorial.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las asignaciones de supervisores
 * @route   GET /api/v1/asignaciones-supervisor
 * @access  Private
 */
const getAsignaciones = asyncHandler(async (req, res) => {
  const { supervisor, nucleo, activa } = req.query;

  const filter = {};
  if (supervisor) filter.supervisor = supervisor;
  if (nucleo) filter.nucleo = nucleo;
  if (activa !== undefined) filter.activa = activa === 'true';

  const asignaciones = await AsignacionSupervisor.find(filter)
    .populate('supervisor')
    .populate('zona')
    .populate('nucleo')
    .populate('finca')
    .populate('lote')
    .sort({ fecha_inicio: -1 });

  res.status(200).json({
    success: true,
    count: asignaciones.length,
    data: asignaciones
  });
});

/**
 * @desc    Obtener una asignación por ID
 * @route   GET /api/v1/asignaciones-supervisor/:id
 * @access  Private
 */
const getAsignacion = asyncHandler(async (req, res) => {
  const asignacion = await AsignacionSupervisor.findById(req.params.id)
    .populate('supervisor')
    .populate('zona')
    .populate('nucleo')
    .populate('finca')
    .populate('lote');

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  res.status(200).json({
    success: true,
    data: asignacion
  });
});

/**
 * @desc    Crear una asignación de supervisor
 * @route   POST /api/v1/asignaciones-supervisor
 * @access  Private (Admin, Jefe Operaciones)
 */
const createAsignacion = asyncHandler(async (req, res) => {
  // Validar que el supervisor exista
  await personaService.validatePersonaExists(req.body.supervisor);

  // Validar que el núcleo exista
  await territorialService.validateNucleoExists(req.body.nucleo);

  // Si se asigna finca, validar que pertenezca al núcleo
  if (req.body.finca) {
    await territorialService.validateFincaExists(req.body.finca, req.body.nucleo);
  }

  // Si se asigna lote, validar que pertenezca a la finca
  if (req.body.lote) {
    if (!req.body.finca) {
      throw new ApiError(400, 'Debe especificar la finca para asignar un lote');
    }
    await territorialService.validateLoteExists(req.body.lote, req.body.finca);
  }

  const asignacion = await AsignacionSupervisor.create(req.body);
  await asignacion.populate(['supervisor', 'zona', 'nucleo', 'finca', 'lote']);

  res.status(201).json({
    success: true,
    message: 'Asignación creada exitosamente',
    data: asignacion
  });
});

/**
 * @desc    Actualizar una asignación
 * @route   PUT /api/v1/asignaciones-supervisor/:id
 * @access  Private (Admin, Jefe Operaciones)
 */
const updateAsignacion = asyncHandler(async (req, res) => {
  let asignacion = await AsignacionSupervisor.findById(req.params.id);

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  asignacion = await AsignacionSupervisor.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['supervisor', 'zona', 'nucleo', 'finca', 'lote']);

  res.status(200).json({
    success: true,
    message: 'Asignación actualizada exitosamente',
    data: asignacion
  });
});

/**
 * @desc    Finalizar una asignación
 * @route   POST /api/v1/asignaciones-supervisor/:id/finalizar
 * @access  Private (Admin, Jefe Operaciones)
 */
const finalizarAsignacion = asyncHandler(async (req, res) => {
  const asignacion = await AsignacionSupervisor.findById(req.params.id);

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  if (!asignacion.activa) {
    throw new ApiError(400, 'La asignación ya está finalizada');
  }

  asignacion.activa = false;
  asignacion.fecha_fin = new Date();
  await asignacion.save();

  res.status(200).json({
    success: true,
    message: 'Asignación finalizada exitosamente',
    data: asignacion
  });
});

/**
 * @desc    Verificar acceso de supervisor a un lote
 * @route   GET /api/v1/asignaciones-supervisor/verificar-acceso/:supervisorId/:loteId
 * @access  Private
 */
const verificarAcceso = asyncHandler(async (req, res) => {
  const { supervisorId, loteId } = req.params;

  const tieneAcceso = await asignacionService.verificarAccesoSupervisor(supervisorId, loteId);

  res.status(200).json({
    success: true,
    data: {
      tieneAcceso,
      supervisor: supervisorId,
      lote: loteId
    }
  });
});

module.exports = {
  getAsignaciones,
  getAsignacion,
  createAsignacion,
  updateAsignacion,
  finalizarAsignacion,
  verificarAcceso
};