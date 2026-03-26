const Nucleo = require('../models/nucleo.model');
const territorialService = require('../services/territorial.service');
const codigoTerritorialService = require('../services/codigoTerritorial.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los núcleos
 * @route   GET /api/v1/nucleos
 * @access  Public
 */
const getNucleos = asyncHandler(async (req, res) => {
  const { activo, zona } = req.query;
  
  const filter = {};
  if (activo !== undefined) filter.activo = activo === 'true';
  if (zona) filter.zona = zona;

  const nucleos = await Nucleo.find(filter)
    .populate('zona')
    .sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: nucleos.length,
    data: nucleos
  });
});

/**
 * @desc    Obtener siguiente código de núcleo por zona
 * @route   GET /api/v1/nucleos/next-code?zona=...
 * @access  Private
 */
const getNextNucleoCodigo = asyncHandler(async (req, res) => {
  const { zona } = req.query;

  if (!zona) {
    throw new ApiError(400, 'La zona es obligatoria para calcular el siguiente código');
  }

  await territorialService.validateZonaExists(zona);

  const next = await codigoTerritorialService.getNextNucleoCodigo(zona);

  res.status(200).json({
    success: true,
    data: next
  });
});

/**
 * @desc    Obtener un núcleo por ID
 * @route   GET /api/v1/nucleos/:id
 * @access  Public
 */
const getNucleo = asyncHandler(async (req, res) => {
  const nucleo = await Nucleo.findById(req.params.id)
    .populate('zona')
    .populate('fincas');

  if (!nucleo) {
    throw new ApiError(404, 'Núcleo no encontrado');
  }

  res.status(200).json({
    success: true,
    data: nucleo
  });
});

/**
 * @desc    Crear un núcleo
 * @route   POST /api/v1/nucleos
 * @access  Private (Admin)
 */
const createNucleo = asyncHandler(async (req, res) => {
  await territorialService.validateZonaExists(req.body.zona);

  const payload = { ...req.body };

  if (!payload.codigo) {
    const next = await codigoTerritorialService.getNextNucleoCodigo(payload.zona);
    payload.codigo = next.raw;
  }

  const nucleo = await Nucleo.create(payload);
  await nucleo.populate('zona');

  res.status(201).json({
    success: true,
    message: 'Núcleo creado exitosamente',
    data: nucleo
  });
});

/**
 * @desc    Actualizar un núcleo
 * @route   PUT /api/v1/nucleos/:id
 * @access  Private (Admin)
 */
const updateNucleo = asyncHandler(async (req, res) => {
  let nucleo = await Nucleo.findById(req.params.id);

  if (!nucleo) {
    throw new ApiError(404, 'Núcleo no encontrado');
  }

  if (req.body.zona && req.body.zona !== nucleo.zona.toString()) {
    await territorialService.validateZonaExists(req.body.zona);
  }

  nucleo = await Nucleo.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('zona');

  res.status(200).json({
    success: true,
    message: 'Núcleo actualizado exitosamente',
    data: nucleo
  });
});

/**
 * @desc    Desactivar un núcleo
 * @route   DELETE /api/v1/nucleos/:id
 * @access  Private (Admin)
 */
const deleteNucleo = asyncHandler(async (req, res) => {
  const nucleo = await Nucleo.findById(req.params.id);

  if (!nucleo) {
    throw new ApiError(404, 'Núcleo no encontrado');
  }

  nucleo.activo = false;
  await nucleo.save();

  res.status(200).json({
    success: true,
    message: 'Núcleo desactivado exitosamente',
    data: nucleo
  });
});

/**
 * @desc    Obtener fincas de un núcleo
 * @route   GET /api/v1/nucleos/:id/fincas
 * @access  Public
 */
const getFincasByNucleo = asyncHandler(async (req, res) => {
  const nucleo = await Nucleo.findById(req.params.id).populate('fincas');

  if (!nucleo) {
    throw new ApiError(404, 'Núcleo no encontrado');
  }

  res.status(200).json({
    success: true,
    count: nucleo.fincas.length,
    data: nucleo.fincas
  });
});

module.exports = {
  getNucleos,
  getNextNucleoCodigo,
  getNucleo,
  createNucleo,
  updateNucleo,
  deleteNucleo,
  getFincasByNucleo
};