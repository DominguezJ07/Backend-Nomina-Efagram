const PrecioNegociado = require('../models/precioNegociado.model');
const palService = require('../services/pal.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los precios negociados
 * @route   GET /api/v1/precios-negociados
 * @access  Private
 */
const getPreciosNegociados = asyncHandler(async (req, res) => {
  const { pal, activo } = req.query;

  const filter = {};
  if (pal) filter.proyecto_actividad_lote = pal;
  if (activo !== undefined) filter.activo = activo === 'true';

  const precios = await PrecioNegociado.find(filter)
    .populate('proyecto_actividad_lote')
    .populate('negociado_por')
    .populate('autorizado_por')
    .sort({ version: -1 });

  res.status(200).json({
    success: true,
    count: precios.length,
    data: precios
  });
});

/**
 * @desc    Obtener historial de precios de un PAL
 * @route   GET /api/v1/precios-negociados/historial/:palId
 * @access  Private
 */
const getHistorialPrecios = asyncHandler(async (req, res) => {
  const precios = await PrecioNegociado.find({
    proyecto_actividad_lote: req.params.palId
  })
    .populate('negociado_por')
    .populate('autorizado_por')
    .sort({ version: -1 });

  res.status(200).json({
    success: true,
    count: precios.length,
    data: precios
  });
});

/**
 * @desc    Crear/Negociar un precio
 * @route   POST /api/v1/precios-negociados
 * @access  Private (Admin, Jefe, Supervisor)
 */
const createPrecioNegociado = asyncHandler(async (req, res) => {
  // Validar que el PAL exista
  await palService.validatePALExists(req.body.proyecto_actividad_lote);

  // Si no viene negociado_por, usar el usuario autenticado
  if (!req.body.negociado_por && req.user) {
    // Buscar la persona vinculada al usuario
    const Persona = require('../../Personal/models/persona.model');
    const persona = await Persona.findOne({ usuario: req.user.id });
    if (persona) {
      req.body.negociado_por = persona._id;
    }
  }

  const precio = await PrecioNegociado.create(req.body);
  await precio.populate(['proyecto_actividad_lote', 'negociado_por', 'autorizado_por']);

  res.status(201).json({
    success: true,
    message: 'Precio negociado exitosamente',
    data: precio
  });
});

module.exports = {
  getPreciosNegociados,
  getHistorialPrecios,
  createPrecioNegociado
};
