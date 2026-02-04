const IndicadorDesempeño = require('../models/indicadorDesempeño.model');
const indicadorService = require('../services/indicador.service');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los indicadores
 * @route   GET /api/v1/indicadores
 * @access  Private
 */
const getIndicadores = asyncHandler(async (req, res) => {
  const { semana, tipo_alcance } = req.query;

  const filter = {};
  if (semana) filter.semana_operativa = semana;
  if (tipo_alcance) filter.tipo_alcance = tipo_alcance;

  const indicadores = await IndicadorDesempeño.find(filter)
    .populate('semana_operativa')
    .populate('referencia')
    .sort({ 'semana_operativa.fecha_inicio': -1 });

  res.status(200).json({
    success: true,
    count: indicadores.length,
    data: indicadores
  });
});

/**
 * @desc    Obtener un indicador por ID
 * @route   GET /api/v1/indicadores/:id
 * @access  Private
 */
const getIndicador = asyncHandler(async (req, res) => {
  const indicador = await IndicadorDesempeño.findById(req.params.id)
    .populate('semana_operativa')
    .populate('referencia');

  if (!indicador) {
    throw new ApiError(404, 'Indicador no encontrado');
  }

  res.status(200).json({
    success: true,
    data: indicador
  });
});

/**
 * @desc    Generar indicadores globales de una semana
 * @route   POST /api/v1/indicadores/generar-globales
 * @access  Private (Admin, Jefe)
 */
const generarIndicadoresGlobales = asyncHandler(async (req, res) => {
  const { semana } = req.body;

  if (!semana) {
    throw new ApiError(400, 'La semana es obligatoria');
  }

  const indicador = await indicadorService.generarIndicadoresGlobales(semana);

  res.status(201).json({
    success: true,
    message: 'Indicadores globales generados exitosamente',
    data: indicador
  });
});

/**
 * @desc    Generar indicadores por proyecto
 * @route   POST /api/v1/indicadores/generar-proyecto
 * @access  Private (Admin, Jefe)
 */
const generarIndicadoresProyecto = asyncHandler(async (req, res) => {
  const { semana, proyecto } = req.body;

  if (!semana || !proyecto) {
    throw new ApiError(400, 'La semana y el proyecto son obligatorios');
  }

  const indicador = await indicadorService.generarIndicadoresProyecto(semana, proyecto);

  res.status(201).json({
    success: true,
    message: 'Indicadores de proyecto generados exitosamente',
    data: indicador
  });
});

/**
 * @desc    Obtener indicadores de una semana
 * @route   GET /api/v1/indicadores/semana/:semanaId
 * @access  Private
 */
const getIndicadoresBySemana = asyncHandler(async (req, res) => {
  const indicadores = await IndicadorDesempeño.find({
    semana_operativa: req.params.semanaId
  })
    .populate('semana_operativa')
    .populate('referencia');

  res.status(200).json({
    success: true,
    count: indicadores.length,
    data: indicadores
  });
});

module.exports = {
  getIndicadores,
  getIndicador,
  generarIndicadoresGlobales,
  generarIndicadoresProyecto,
  getIndicadoresBySemana
};