const PrecioBaseActividad = require('../models/precioBaseActividad.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los precios base
 * @route   GET /api/v1/precios-base
 * @access  Private
 */
const getPreciosBase = asyncHandler(async (req, res) => {
  const { actividad, cliente, activo } = req.query;

  const filter = {};
  if (actividad) filter.actividad = actividad;
  if (cliente) filter.cliente = cliente;
  if (activo !== undefined) filter.activo = activo === 'true';

  const precios = await PrecioBaseActividad.find(filter)
    .populate('actividad')
    .populate('cliente')
    .sort({ fecha_vigencia_desde: -1 });

  res.status(200).json({
    success: true,
    count: precios.length,
    data: precios
  });
});

/**
 * @desc    Obtener un precio base por ID
 * @route   GET /api/v1/precios-base/:id
 * @access  Private
 */
const getPrecioBase = asyncHandler(async (req, res) => {
  const precio = await PrecioBaseActividad.findById(req.params.id)
    .populate('actividad')
    .populate('cliente');

  if (!precio) {
    throw new ApiError(404, 'Precio base no encontrado');
  }

  res.status(200).json({
    success: true,
    data: precio
  });
});

/**
 * @desc    Crear un precio base
 * @route   POST /api/v1/precios-base
 * @access  Private (Admin, Jefe)
 */
const createPrecioBase = asyncHandler(async (req, res) => {
  const precio = await PrecioBaseActividad.create(req.body);
  await precio.populate(['actividad', 'cliente']);

  res.status(201).json({
    success: true,
    message: 'Precio base creado exitosamente',
    data: precio
  });
});

/**
 * @desc    Actualizar un precio base
 * @route   PUT /api/v1/precios-base/:id
 * @access  Private (Admin, Jefe)
 */
const updatePrecioBase = asyncHandler(async (req, res) => {
  let precio = await PrecioBaseActividad.findById(req.params.id);

  if (!precio) {
    throw new ApiError(404, 'Precio base no encontrado');
  }

  precio = await PrecioBaseActividad.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['actividad', 'cliente']);

  res.status(200).json({
    success: true,
    message: 'Precio base actualizado exitosamente',
    data: precio
  });
});

module.exports = {
  getPreciosBase,
  getPrecioBase,
  createPrecioBase,
  updatePrecioBase
};