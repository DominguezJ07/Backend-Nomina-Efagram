const Novedad = require('../models/novedad.model');
const Persona = require('../../Personal/models/persona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las novedades
 * @route   GET /api/v1/novedades
 * @access  Private
 */
const getNovedades = asyncHandler(async (req, res) => {
  const { trabajador, tipo, estado, fecha_inicio, fecha_fin } = req.query;

  const filter = {};
  if (trabajador) filter.trabajador = trabajador;
  if (tipo) filter.tipo = tipo;
  if (estado) filter.estado = estado;

  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  const novedades = await Novedad.find(filter)
    .populate('trabajador')
    .populate('registrado_por')
    .populate('aprobado_por')
    .sort({ fecha: -1 });

  res.status(200).json({
    success: true,
    count: novedades.length,
    data: novedades
  });
});

/**
 * @desc    Obtener una novedad por ID
 * @route   GET /api/v1/novedades/:id
 * @access  Private
 */
const getNovedad = asyncHandler(async (req, res) => {
  const novedad = await Novedad.findById(req.params.id)
    .populate('trabajador')
    .populate('registrado_por')
    .populate('aprobado_por');

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  res.status(200).json({
    success: true,
    data: novedad
  });
});

/**
 * @desc    Crear una novedad
 * @route   POST /api/v1/novedades
 * @access  Private (Supervisor, Jefe, Admin, RRHH)
 */
const createNovedad = asyncHandler(async (req, res) => {
  // Obtener persona del usuario autenticado
  const persona = await Persona.findOne({ usuario: req.user.id });
  if (!persona) {
    throw new ApiError(404, 'Persona no encontrada para el usuario autenticado');
  }

  // Generar código único
  const fecha = new Date(req.body.fecha);
  const fechaStr = fecha.toISOString().split('T')[0].replace(/-/g, '');
  const count = await Novedad.countDocuments({ fecha });
  const codigo = `NOV-${fechaStr}-${String(count + 1).padStart(4, '0')}`;

  // Crear novedad
  const novedad = await Novedad.create({
    ...req.body,
    codigo,
    registrado_por: persona._id
  });

  await novedad.populate(['trabajador', 'registrado_por']);

  res.status(201).json({
    success: true,
    message: 'Novedad creada exitosamente',
    data: novedad
  });
});

/**
 * @desc    Actualizar una novedad
 * @route   PUT /api/v1/novedades/:id
 * @access  Private (Admin, Jefe, RRHH)
 */
const updateNovedad = asyncHandler(async (req, res) => {
  let novedad = await Novedad.findById(req.params.id);

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  // No permitir editar si ya está aprobada o rechazada
  if (novedad.estado !== 'PENDIENTE' && !req.user.roles.includes('ADMIN_SISTEMA')) {
    throw new ApiError(400, 'No se puede editar una novedad que ya fue procesada');
  }

  novedad = await Novedad.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['trabajador', 'registrado_por', 'aprobado_por']);

  res.status(200).json({
    success: true,
    message: 'Novedad actualizada exitosamente',
    data: novedad
  });
});

/**
 * @desc    Aprobar una novedad
 * @route   POST /api/v1/novedades/:id/aprobar
 * @access  Private (Jefe, Admin, RRHH)
 */
const aprobarNovedad = asyncHandler(async (req, res) => {
  const novedad = await Novedad.findById(req.params.id);

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  if (novedad.estado !== 'PENDIENTE') {
    throw new ApiError(400, 'Solo se pueden aprobar novedades pendientes');
  }

  const persona = await Persona.findOne({ usuario: req.user.id });
  await novedad.aprobar(persona._id);

  await novedad.populate(['trabajador', 'registrado_por', 'aprobado_por']);

  res.status(200).json({
    success: true,
    message: 'Novedad aprobada exitosamente',
    data: novedad
  });
});

/**
 * @desc    Rechazar una novedad
 * @route   POST /api/v1/novedades/:id/rechazar
 * @access  Private (Jefe, Admin, RRHH)
 */
const rechazarNovedad = asyncHandler(async (req, res) => {
  const { motivo } = req.body;

  if (!motivo) {
    throw new ApiError(400, 'El motivo de rechazo es obligatorio');
  }

  const novedad = await Novedad.findById(req.params.id);

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  if (novedad.estado !== 'PENDIENTE') {
    throw new ApiError(400, 'Solo se pueden rechazar novedades pendientes');
  }

  const persona = await Persona.findOne({ usuario: req.user.id });
  await novedad.rechazar(persona._id, motivo);

  await novedad.populate(['trabajador', 'registrado_por', 'aprobado_por']);

  res.status(200).json({
    success: true,
    message: 'Novedad rechazada',
    data: novedad
  });
});

/**
 * @desc    Eliminar una novedad
 * @route   DELETE /api/v1/novedades/:id
 * @access  Private (Admin, Jefe)
 */
const deleteNovedad = asyncHandler(async (req, res) => {
  const novedad = await Novedad.findById(req.params.id);

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  await novedad.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Novedad eliminada exitosamente'
  });
});

/**
 * @desc    Obtener novedades por trabajador
 * @route   GET /api/v1/novedades/trabajador/:trabajadorId
 * @access  Private
 */
const getNovedadesByTrabajador = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  const filter = { trabajador: req.params.trabajadorId };

  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  const novedades = await Novedad.find(filter)
    .populate('registrado_por')
    .populate('aprobado_por')
    .sort({ fecha: -1 });

  res.status(200).json({
    success: true,
    count: novedades.length,
    data: novedades
  });
});

module.exports = {
  getNovedades,
  getNovedad,
  createNovedad,
  updateNovedad,
  aprobarNovedad,
  rechazarNovedad,
  deleteNovedad,
  getNovedadesByTrabajador
};