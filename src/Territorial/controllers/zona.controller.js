const Zona = require('../models/zona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las zonas
 * @route   GET /api/v1/zonas
 * @access  Public
 */
const getZonas = asyncHandler(async (req, res) => {
  const { activa } = req.query;
  
  const filter = {};
  if (activa !== undefined) {
    filter.activa = activa === 'true';
  }

  const zonas = await Zona.find(filter).sort({ codigo: 1 });

  res.status(200).json({
    success: true,
    count: zonas.length,
    data: zonas
  });
});

/**
 * @desc    Obtener una zona por ID
 * @route   GET /api/v1/zonas/:id
 * @access  Public
 */
const getZona = asyncHandler(async (req, res) => {
  const zona = await Zona.findById(req.params.id).populate('nucleos');

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  res.status(200).json({
    success: true,
    data: zona
  });
});

/**
 * @desc    Obtener zona por código
 * @route   GET /api/v1/zonas/codigo/:codigo
 * @access  Public
 */
const getZonaByCodigo = asyncHandler(async (req, res) => {
  const zona = await Zona.findByCodigo(parseInt(req.params.codigo));

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  res.status(200).json({
    success: true,
    data: zona
  });
});

/**
 * @desc    Crear una zona
 * @route   POST /api/v1/zonas
 * @access  Private (Admin)
 */
const createZona = asyncHandler(async (req, res) => {
  const zona = await Zona.create(req.body);

  res.status(201).json({
    success: true,
    message: 'Zona creada exitosamente',
    data: zona
  });
});

/**
 * @desc    Actualizar una zona
 * @route   PUT /api/v1/zonas/:id
 * @access  Private (Admin)
 */
const updateZona = asyncHandler(async (req, res) => {
  let zona = await Zona.findById(req.params.id);

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  zona = await Zona.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Zona actualizada exitosamente',
    data: zona
  });
});

/**
 * @desc    Desactivar una zona (soft delete)
 * @route   DELETE /api/v1/zonas/:id
 * @access  Private (Admin)
 */
const deleteZona = asyncHandler(async (req, res) => {
  const zona = await Zona.findById(req.params.id);

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  zona.activa = false;
  await zona.save();

  res.status(200).json({
    success: true,
    message: 'Zona desactivada exitosamente',
    data: zona
  });
});

/**
 * @desc    Obtener núcleos de una zona
 * @route   GET /api/v1/zonas/:id/nucleos
 * @access  Public
 */
const getNucleosByZona = asyncHandler(async (req, res) => {
  const zona = await Zona.findById(req.params.id).populate('nucleos');

  if (!zona) {
    throw new ApiError(404, 'Zona no encontrada');
  }

  res.status(200).json({
    success: true,
    count: zona.nucleos.length,
    data: zona.nucleos
  });
});

module.exports = {
  getZonas,
  getZona,
  getZonaByCodigo,
  createZona,
  updateZona,
  deleteZona,
  getNucleosByZona
};