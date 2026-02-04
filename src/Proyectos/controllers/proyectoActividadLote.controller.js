const ProyectoActividadLote = require('../models/proyectoActividadLote.model');
const palService = require('../services/pal.service');
const metaValidationService = require('../services/metaValidation.service');
const proyectoService = require('../services/proyecto.service');
const territorialService = require('../../Territorial/services/territorial.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const { ESTADOS_PAL } = require('../../config/constants');

/**
 * @desc    Obtener todos los PALs
 * @route   GET /api/v1/pals
 * @access  Private
 */
const getPALs = asyncHandler(async (req, res) => {
  const { proyecto, lote, actividad, estado, supervisor } = req.query;

  const filter = {};
  if (proyecto) filter.proyecto = proyecto;
  if (lote) filter.lote = lote;
  if (actividad) filter.actividad = actividad;
  if (estado) filter.estado = estado;
  if (supervisor) filter.supervisor_asignado = supervisor;

  const pals = await ProyectoActividadLote.find(filter)
    .populate('proyecto')
    .populate('lote')
    .populate('actividad')
    .populate('supervisor_asignado')
    .sort({ fecha_inicio_planificada: -1 });

  res.status(200).json({
    success: true,
    count: pals.length,
    data: pals
  });
});

/**
 * @desc    Obtener un PAL por ID
 * @route   GET /api/v1/pals/:id
 * @access  Private
 */
const getPAL = asyncHandler(async (req, res) => {
  const pal = await ProyectoActividadLote.findById(req.params.id)
    .populate('proyecto')
    .populate('lote')
    .populate('actividad')
    .populate('supervisor_asignado');

  if (!pal) {
    throw new ApiError(404, 'PAL no encontrado');
  }

  res.status(200).json({
    success: true,
    data: pal
  });
});

/**
 * @desc    Crear un PAL
 * @route   POST /api/v1/pals
 * @access  Private (Admin, Jefe)
 */
const createPAL = asyncHandler(async (req, res) => {
  // Validar que el proyecto exista
  await proyectoService.validateProyectoExists(req.body.proyecto);

  // Validar que el lote exista
  await territorialService.validateLoteExists(req.body.lote);

  // Validar fechas
  metaValidationService.validateFechasPAL(
    req.body.fecha_inicio_planificada,
    req.body.fecha_fin_planificada
  );

  const pal = await ProyectoActividadLote.create(req.body);
  await pal.populate(['proyecto', 'lote', 'actividad', 'supervisor_asignado']);

  res.status(201).json({
    success: true,
    message: 'PAL creado exitosamente',
    data: pal
  });
});

/**
 * @desc    Actualizar un PAL
 * @route   PUT /api/v1/pals/:id
 * @access  Private (Admin, Jefe)
 */
const updatePAL = asyncHandler(async (req, res) => {
  let pal = await palService.validatePALExists(req.params.id);

  // Si se intenta cambiar la meta, validar que solo aumente
  if (req.body.meta_minima && req.body.meta_minima !== pal.meta_minima) {
    metaValidationService.validateMetaIncremento(pal.meta_minima, req.body.meta_minima);
  }

  pal = await ProyectoActividadLote.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['proyecto', 'lote', 'actividad', 'supervisor_asignado']);

  res.status(200).json({
    success: true,
    message: 'PAL actualizado exitosamente',
    data: pal
  });
});

/**
 * @desc    Aumentar meta mínima de un PAL
 * @route   POST /api/v1/pals/:id/aumentar-meta
 * @access  Private (Admin, Jefe)
 */
const aumentarMeta = asyncHandler(async (req, res) => {
  const { nuevaMeta, motivo } = req.body;

  if (!nuevaMeta) {
    throw new ApiError(400, 'La nueva meta es obligatoria');
  }

  if (!motivo) {
    throw new ApiError(400, 'El motivo es obligatorio');
  }

  const pal = await palService.aumentarMeta(req.params.id, nuevaMeta, motivo);

  res.status(200).json({
    success: true,
    message: 'Meta aumentada exitosamente',
    data: pal
  });
});

/**
 * @desc    Actualizar cantidad ejecutada
 * @route   PUT /api/v1/pals/:id/cantidad-ejecutada
 * @access  Private (Admin, Jefe, Supervisor)
 */
const actualizarCantidadEjecutada = asyncHandler(async (req, res) => {
  const { cantidad } = req.body;

  if (cantidad === undefined || cantidad === null) {
    throw new ApiError(400, 'La cantidad es obligatoria');
  }

  const pal = await palService.actualizarCantidadEjecutada(req.params.id, cantidad);

  res.status(200).json({
    success: true,
    message: 'Cantidad ejecutada actualizada exitosamente',
    data: pal
  });
});

/**
 * @desc    Verificar cumplimiento de meta
 * @route   GET /api/v1/pals/:id/verificar-meta
 * @access  Private
 */
const verificarCumplimientoMeta = asyncHandler(async (req, res) => {
  const verificacion = await palService.verificarCumplimientoMeta(req.params.id);

  res.status(200).json({
    success: true,
    data: verificacion
  });
});

/**
 * @desc    Obtener precio vigente de un PAL
 * @route   GET /api/v1/pals/:id/precio-vigente
 * @access  Private
 */
const getPrecioVigente = asyncHandler(async (req, res) => {
  const precio = await palService.getPrecioVigente(req.params.id);

  res.status(200).json({
    success: true,
    data: precio
  });
});

/**
 * @desc    Marcar PAL como cumplida
 * @route   POST /api/v1/pals/:id/marcar-cumplida
 * @access  Private (Admin, Jefe, Supervisor)
 */
const marcarCumplida = asyncHandler(async (req, res) => {
  const pal = await palService.validatePALExists(req.params.id);

  // Validar que cumplió la meta
  await metaValidationService.validatePuedeCumplir(pal);

  pal.estado = ESTADOS_PAL.CUMPLIDA;
  pal.fecha_fin_real = new Date();
  await pal.save();

  res.status(200).json({
    success: true,
    message: 'PAL marcado como cumplido',
    data: pal
  });
});

/**
 * @desc    Cancelar un PAL
 * @route   POST /api/v1/pals/:id/cancelar
 * @access  Private (Admin, Jefe)
 */
const cancelarPAL = asyncHandler(async (req, res) => {
  const { motivo } = req.body;

  if (!motivo) {
    throw new ApiError(400, 'El motivo de cancelación es obligatorio');
  }

  const pal = await palService.validatePALExists(req.params.id);

  if (pal.estado === ESTADOS_PAL.CANCELADA) {
    throw new ApiError(400, 'El PAL ya está cancelado');
  }

  pal.estado = ESTADOS_PAL.CANCELADA;
  pal.observaciones = `${pal.observaciones || ''}\n[CANCELADO] ${motivo}`.trim();
  await pal.save();

  res.status(200).json({
    success: true,
    message: 'PAL cancelado exitosamente',
    data: pal
  });
});

/**
 * @desc    Obtener PALs atrasados
 * @route   GET /api/v1/pals/atrasados
 * @access  Private
 */
const getPalsAtrasados = asyncHandler(async (req, res) => {
  const { proyecto } = req.query;

  const palsAtrasados = await metaValidationService.getPalsAtrasados(proyecto);

  res.status(200).json({
    success: true,
    count: palsAtrasados.length,
    data: palsAtrasados
  });
});

/**
 * @desc    Obtener resumen de cumplimiento
 * @route   GET /api/v1/pals/resumen-cumplimiento
 * @access  Private
 */
const getResumenCumplimiento = asyncHandler(async (req, res) => {
  const { fechaInicio, fechaFin, proyecto } = req.query;

  if (!fechaInicio || !fechaFin) {
    throw new ApiError(400, 'Las fechas de inicio y fin son obligatorias');
  }

  const filtros = {};
  if (proyecto) filtros.proyecto = proyecto;

  const resumen = await metaValidationService.getResumenCumplimiento(
    new Date(fechaInicio),
    new Date(fechaFin),
    filtros
  );

  res.status(200).json({
    success: true,
    data: resumen
  });
});

module.exports = {
  getPALs,
  getPAL,
  createPAL,
  updatePAL,
  aumentarMeta,
  actualizarCantidadEjecutada,
  verificarCumplimientoMeta,
  getPrecioVigente,
  marcarCumplida,
  cancelarPAL,
  getPalsAtrasados,
  getResumenCumplimiento
};