const ActividadCatalogo = require('../models/actividadCatalogo.model');
const Intervencion = require('../../Catalogos/models/intervencion.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * ======================================================
 * @desc    Obtener todas las actividades
 * @route   GET /api/v1/actividades
 * @access  Private
 * ======================================================
 */
const getActividades = asyncHandler(async (req, res) => {
  const { activa, intervencion, search } = req.query;

  const filter = {};

  if (!activa || activa === 'true') {
    filter.activa = true;
  } else if (activa === 'false') {
    filter.activa = false;
  }

  if (intervencion) {
    filter.intervencion = intervencion;
  }

  if (search) {
    filter.$or = [
      { codigo: { $regex: search, $options: 'i' } },
      { nombre: { $regex: search, $options: 'i' } }
    ];
  }

  const actividades = await ActividadCatalogo.find(filter)
    .populate('intervencion', 'codigo nombre activo')
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
  const actividad = await ActividadCatalogo.findById(req.params.id)
    .populate('intervencion', 'codigo nombre activo');

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
 * @desc    Obtener actividades activas por intervención
 * @route   GET /api/v1/actividades/intervencion/:intervencionId
 * @access  Private
 * ======================================================
 */
const getActividadesByIntervencion = asyncHandler(async (req, res) => {
  const { intervencionId } = req.params;

  const actividades = await ActividadCatalogo.find({
    intervencion: intervencionId,
    activa: true
  })
    .populate('intervencion', 'codigo nombre activo')
    .sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: actividades.length,
    data: actividades
  });
});

/**
 * ======================================================
 * @desc    Crear una actividad
 * @route   POST /api/v1/actividades
 * @access  Private
 * ======================================================
 */
const createActividad = asyncHandler(async (req, res) => {
  const {
    codigo,
    nombre,
    intervencion,
    precio_base,
    descripcion,
    observaciones,
    activa,
    categoria,
    unidad_medida,
    rendimiento_diario_estimado
  } = req.body;

  const codigoNormalizado = codigo?.toUpperCase().trim();

  const exists = await ActividadCatalogo.findOne({ codigo: codigoNormalizado });
  if (exists) {
    throw new ApiError(409, 'El código de actividad ya existe');
  }

  const intervencionExiste = await Intervencion.findById(intervencion);
  if (!intervencionExiste) {
    throw new ApiError(404, 'La intervención seleccionada no existe');
  }

  const actividad = await ActividadCatalogo.create({
    codigo: codigoNormalizado,
    nombre: nombre?.trim(),
    intervencion,
    precio_base: Number(precio_base) || 0,
    descripcion: descripcion?.trim() || '',
    observaciones: observaciones?.trim() || '',
    activa: activa !== undefined ? Boolean(activa) : true,

    // compatibilidad temporal
    categoria: categoria || null,
    unidad_medida: unidad_medida || null,
    rendimiento_diario_estimado:
      rendimiento_diario_estimado !== undefined &&
      rendimiento_diario_estimado !== null &&
      rendimiento_diario_estimado !== ''
        ? Number(rendimiento_diario_estimado)
        : null
  });

  await actividad.populate('intervencion', 'codigo nombre activo');

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
 * @access  Private
 * ======================================================
 */
const updateActividad = asyncHandler(async (req, res) => {
  const actividadExistente = await ActividadCatalogo.findById(req.params.id);

  if (!actividadExistente) {
    throw new ApiError(404, 'Actividad no encontrada');
  }

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

  if (req.body.intervencion) {
    const intervencionExiste = await Intervencion.findById(req.body.intervencion);
    if (!intervencionExiste) {
      throw new ApiError(404, 'La intervención seleccionada no existe');
    }
  }

  if (req.body.precio_base !== undefined) {
    req.body.precio_base = Number(req.body.precio_base) || 0;
  }

  const actividadActualizada = await ActividadCatalogo.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  ).populate('intervencion', 'codigo nombre activo');

  res.status(200).json({
    success: true,
    message: 'Actividad actualizada exitosamente',
    data: actividadActualizada
  });
});

/**
 * ======================================================
 * @desc    Desactivar una actividad
 * @route   DELETE /api/v1/actividades/:id
 * @access  Private
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

  await actividad.populate('intervencion', 'codigo nombre activo');

  res.status(200).json({
    success: true,
    message: 'Actividad desactivada exitosamente',
    data: actividad
  });
});

module.exports = {
  getActividades,
  getActividad,
  getActividadesByIntervencion,
  createActividad,
  updateActividad,
  deleteActividad
};