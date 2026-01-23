const Finca = require('../models/finca.model');
const territorialService = require('../services/territorial.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las fincas
 * @route   GET /api/v1/fincas
 * @access  Public
 */
const getFincas = asyncHandler(async (req, res) => {
  const { activa, nucleo } = req.query;
  
  const filter = {};
  if (activa !== undefined) filter.activa = activa === 'true';
  if (nucleo) filter.nucleo = nucleo;

  const fincas = await Finca.find(filter)
    .populate({
      path: 'nucleo',
      populate: { path: 'zona' }
    })
    .sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: fincas.length,
    data: fincas
  });
});

/**
 * @desc    Obtener una finca por ID
 * @route   GET /api/v1/fincas/:id
 * @access  Public
 */
const getFinca = asyncHandler(async (req, res) => {
  const finca = await Finca.findById(req.params.id)
    .populate({
      path: 'nucleo',
      populate: { path: 'zona' }
    })
    .populate('lotes');

  if (!finca) {
    throw new ApiError(404, 'Finca no encontrada');
  }

  res.status(200).json({
    success: true,
    data: finca
  });
});

/**
 * @desc    Crear una finca
 * @route   POST /api/v1/fincas
 * @access  Private (Admin)
 */
const createFinca = asyncHandler(async (req, res) => {
  // Validar que el núcleo exista
  await territorialService.validateNucleoExists(req.body.nucleo);

  const finca = await Finca.create(req.body);
  await finca.populate({
    path: 'nucleo',
    populate: { path: 'zona' }
  });

  res.status(201).json({
    success: true,
    message: 'Finca creada exitosamente',
    data: finca
  });
});

/**
 * @desc    Actualizar una finca
 * @route   PUT /api/v1/fincas/:id
 * @access  Private (Admin)
 */
const updateFinca = asyncHandler(async (req, res) => {
  let finca = await Finca.findById(req.params.id);

  if (!finca) {
    throw new ApiError(404, 'Finca no encontrada');
  }

  // Si se cambia el núcleo, validar que exista
  if (req.body.nucleo && req.body.nucleo !== finca.nucleo.toString()) {
    await territorialService.validateNucleoExists(req.body.nucleo);
  }

  finca = await Finca.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate({
    path: 'nucleo',
    populate: { path: 'zona' }
  });

  res.status(200).json({
    success: true,
    message: 'Finca actualizada exitosamente',
    data: finca
  });
});

/**
 * @desc    Desactivar una finca
 * @route   DELETE /api/v1/fincas/:id
 * @access  Private (Admin)
 */
const deleteFinca = asyncHandler(async (req, res) => {
  const finca = await Finca.findById(req.params.id);

  if (!finca) {
    throw new ApiError(404, 'Finca no encontrada');
  }

  finca.activa = false;
  await finca.save();

  res.status(200).json({
    success: true,
    message: 'Finca desactivada exitosamente',
    data: finca
  });
});

/**
 * @desc    Obtener lotes de una finca
 * @route   GET /api/v1/fincas/:id/lotes
 * @access  Public
 */
const getLotesByFinca = asyncHandler(async (req, res) => {
  const finca = await Finca.findById(req.params.id).populate('lotes');

  if (!finca) {
    throw new ApiError(404, 'Finca no encontrada');
  }

  res.status(200).json({
    success: true,
    count: finca.lotes.length,
    data: finca.lotes
  });
});

module.exports = {
  getFincas,
  getFinca,
  createFinca,
  updateFinca,
  deleteFinca,
  getLotesByFinca
};