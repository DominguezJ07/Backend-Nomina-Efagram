const Finca = require('../models/finca.model');
const Zona = require('../models/zona.model');
const Nucleo = require('../models/nucleo.model');
const territorialService = require('../services/territorial.service');
const codigoTerritorialService = require('../services/codigoTerritorial.service');
const fincaBulkService = require('../services/fincaBulk.service');
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
 * @desc    Obtener siguiente código de finca por núcleo
 * @route   GET /api/v1/fincas/next-code?nucleo=...
 * @access  Private
 */
const getNextFincaCodigo = asyncHandler(async (req, res) => {
  const { nucleo } = req.query;

  if (!nucleo) {
    throw new ApiError(400, 'El núcleo es obligatorio para calcular el siguiente código');
  }

  await territorialService.validateNucleoExists(nucleo);

  const next = await codigoTerritorialService.getNextFincaCodigo(nucleo);

  res.status(200).json({
    success: true,
    data: next
  });
});

/**
 * @desc    Obtener data para plantilla de carga masiva de fincas
 * @route   GET /api/v1/fincas/bulk/template-data
 * @access  Private
 */
const getFincasBulkTemplateData = asyncHandler(async (_req, res) => {
  const [zonas, nucleos, fincas] = await Promise.all([
    Zona.find({}).sort({ codigo: 1 }).lean(),
    Nucleo.find({})
      .populate('zona')
      .sort({ codigo: 1 })
      .lean(),
    Finca.find({})
      .populate({
        path: 'nucleo',
        populate: { path: 'zona' }
      })
      .sort({ codigo: 1 })
      .lean()
  ]);

  res.status(200).json({
    success: true,
    data: {
      zonas,
      nucleos,
      fincas
    }
  });
});

/**
 * @desc    Procesar carga masiva de fincas
 * @route   POST /api/v1/fincas/bulk/upsert
 * @access  Private
 */
const bulkUpsertFincas = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

  if (!rows.length) {
    throw new ApiError(400, 'Debes enviar al menos una fila para procesar');
  }

  const result = await fincaBulkService.processRows(rows);

  res.status(200).json({
    success: true,
    message: 'Carga masiva procesada',
    data: result
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
  await territorialService.validateNucleoExists(req.body.nucleo);

  const payload = { ...req.body };

  if (!payload.codigo) {
    const next = await codigoTerritorialService.getNextFincaCodigo(payload.nucleo);
    payload.codigo = next.raw;
  }

  const finca = await Finca.create(payload);
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
  getNextFincaCodigo,
  getFincasBulkTemplateData,
  bulkUpsertFincas,
  getFinca,
  createFinca,
  updateFinca,
  deleteFinca,
  getLotesByFinca
};
