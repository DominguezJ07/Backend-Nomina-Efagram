const Lote = require('../models/lote.model');
const territorialService = require('../services/territorial.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los lotes
 * @route   GET /api/v1/lotes
 * @access  Public
 */
const getLotes = asyncHandler(async (req, res) => {
  const { activo, finca } = req.query;
  
  const filter = {};
  if (activo !== undefined) filter.activo = activo === 'true';
  if (finca) filter.finca = finca;

  const lotes = await Lote.find(filter)
    .populate({
      path: 'finca',
      populate: {
        path: 'nucleo',
        populate: { path: 'zona' }
      }
    })
    .sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: lotes.length,
    data: lotes
  });
});

/**
 * @desc    Obtener un lote por ID
 * @route   GET /api/v1/lotes/:id
 * @access  Public
 */
const getLote = asyncHandler(async (req, res) => {
  const lote = await Lote.findById(req.params.id).populate({
    path: 'finca',
    populate: {
      path: 'nucleo',
      populate: { path: 'zona' }
    }
  });

  if (!lote) {
    throw new ApiError(404, 'Lote no encontrado');
  }

  res.status(200).json({
    success: true,
    data: lote
  });
});

/**
 * @desc    Obtener jerarquía completa de un lote
 * @route   GET /api/v1/lotes/:id/jerarquia
 * @access  Public
 */
const getJerarquiaLote = asyncHandler(async (req, res) => {
  const jerarquia = await territorialService.getJerarquiaCompleta(req.params.id);

  res.status(200).json({
    success: true,
    data: jerarquia
  });
});

/**
 * @desc    Crear un lote
 * @route   POST /api/v1/lotes
 * @access  Private (Admin)
 */
const createLote = asyncHandler(async (req, res) => {
  // Validar que la finca exista
  await territorialService.validateFincaExists(req.body.finca);

  const lote = await Lote.create(req.body);
  await lote.populate({
    path: 'finca',
    populate: {
      path: 'nucleo',
      populate: { path: 'zona' }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Lote creado exitosamente',
    data: lote
  });
});

/**
 * @desc    Actualizar un lote
 * @route   PUT /api/v1/lotes/:id
 * @access  Private (Admin)
 */
const updateLote = asyncHandler(async (req, res) => {
  let lote = await Lote.findById(req.params.id);

  if (!lote) {
    throw new ApiError(404, 'Lote no encontrado');
  }

  // Si se cambia la finca, validar que exista
  if (req.body.finca && req.body.finca !== lote.finca.toString()) {
    await territorialService.validateFincaExists(req.body.finca);
  }

  lote = await Lote.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate({
    path: 'finca',
    populate: {
      path: 'nucleo',
      populate: { path: 'zona' }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Lote actualizado exitosamente',
    data: lote
  });
});

/**
 * @desc    Desactivar un lote
 * @route   DELETE /api/v1/lotes/:id
 * @access  Private (Admin)
 */
const deleteLote = asyncHandler(async (req, res) => {
  const lote = await Lote.findById(req.params.id);

  if (!lote) {
    throw new ApiError(404, 'Lote no encontrado');
  }

  lote.activo = false;
  await lote.save();

  res.status(200).json({
    success: true,
    message: 'Lote desactivado exitosamente',
    data: lote
  });
});

module.exports = {
  getLotes,
  getLote,
  getJerarquiaLote,
  createLote,
  updateLote,
  deleteLote
};