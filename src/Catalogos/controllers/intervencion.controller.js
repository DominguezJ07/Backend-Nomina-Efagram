const Intervencion = require('../models/intervencion.model');
const Proceso = require('../models/proceso.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las intervenciones
 * @route   GET /api/v1/intervenciones
 * @access  Private
 */
const getIntervenciones = asyncHandler(async (req, res) => {
  const { activo, proceso } = req.query;

  const filter = {};
  if (activo !== undefined) filter.activo = activo === 'true';
  if (proceso) filter.proceso = proceso;

  const intervenciones = await Intervencion.find(filter)
    .populate('proceso', 'codigo nombre activo')
    .sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: intervenciones.length,
    data: intervenciones
  });
});

/**
 * @desc    Obtener una intervención por ID
 * @route   GET /api/v1/intervenciones/:id
 * @access  Private
 */
const getIntervencion = asyncHandler(async (req, res) => {
  const intervencion = await Intervencion.findById(req.params.id).populate(
    'proceso',
    'codigo nombre activo'
  );

  if (!intervencion) {
    throw new ApiError(404, 'Intervención no encontrada');
  }

  res.status(200).json({
    success: true,
    data: intervencion
  });
});

/**
 * @desc    Crear una intervención
 * @route   POST /api/v1/intervenciones
 * @access  Private (Admin, Jefe)
 */
const createIntervencion = asyncHandler(async (req, res) => {
  // Verificar que el proceso exista y esté activo
  const proceso = await Proceso.findById(req.body.proceso);
  if (!proceso) {
    throw new ApiError(404, 'El proceso especificado no existe');
  }
  if (!proceso.activo) {
    throw new ApiError(409, 'El proceso especificado está inactivo');
  }

  // Verificar que el código no exista
  const codigoExiste = await Intervencion.findOne({
    codigo: req.body.codigo?.toUpperCase()
  });
  if (codigoExiste) {
    throw new ApiError(409, 'Ya existe una intervención con ese código');
  }

  const intervencion = await Intervencion.create(req.body);
  await intervencion.populate('proceso', 'codigo nombre activo');

  res.status(201).json({
    success: true,
    message: 'Intervención creada exitosamente',
    data: intervencion
  });
});

/**
 * @desc    Actualizar una intervención
 * @route   PUT /api/v1/intervenciones/:id
 * @access  Private (Admin, Jefe)
 */
const updateIntervencion = asyncHandler(async (req, res) => {
  let intervencion = await Intervencion.findById(req.params.id);

  if (!intervencion) {
    throw new ApiError(404, 'Intervención no encontrada');
  }

  // Si se cambia el proceso, validar que exista y esté activo
  if (req.body.proceso && req.body.proceso !== intervencion.proceso.toString()) {
    const proceso = await Proceso.findById(req.body.proceso);
    if (!proceso) {
      throw new ApiError(404, 'El proceso especificado no existe');
    }
    if (!proceso.activo) {
      throw new ApiError(409, 'El proceso especificado está inactivo');
    }
  }

  // Si se cambia el código, verificar que no esté en uso
  if (req.body.codigo && req.body.codigo.toUpperCase() !== intervencion.codigo) {
    const codigoExiste = await Intervencion.findOne({
      codigo: req.body.codigo.toUpperCase()
    });
    if (codigoExiste) {
      throw new ApiError(409, 'Ya existe una intervención con ese código');
    }
  }

  intervencion = await Intervencion.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('proceso', 'codigo nombre activo');

  res.status(200).json({
    success: true,
    message: 'Intervención actualizada exitosamente',
    data: intervencion
  });
});

/**
 * @desc    Desactivar una intervención
 * @route   DELETE /api/v1/intervenciones/:id
 * @access  Private (Admin)
 */
const deleteIntervencion = asyncHandler(async (req, res) => {
  const intervencion = await Intervencion.findById(req.params.id);

  if (!intervencion) {
    throw new ApiError(404, 'Intervención no encontrada');
  }

  intervencion.activo = false;
  await intervencion.save();

  res.status(200).json({
    success: true,
    message: 'Intervención desactivada exitosamente',
    data: intervencion
  });
});

module.exports = {
  getIntervenciones,
  getIntervencion,
  createIntervencion,
  updateIntervencion,
  deleteIntervencion
};