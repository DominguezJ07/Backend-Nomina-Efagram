const controlSemanalService = require('../services/controlSemanal.service');
const Persona = require('../../Personal/models/persona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Procesar semana completa
 * @route   POST /api/v1/control-semanal/procesar
 * @access  Private (Admin, Jefe)
 */
const procesarSemana = asyncHandler(async (req, res) => {
  const { semana } = req.body;

  if (!semana) {
    throw new ApiError(400, 'La semana es obligatoria');
  }

  // Obtener persona del usuario autenticado (OPCIONAL)
  const persona = await Persona.findOne({ usuario: req.user.id });
  const procesadoPorId = persona ? persona._id : null;

  const resultado = await controlSemanalService.procesarSemanaCompleta(
    semana,
    procesadoPorId
  );

  res.status(200).json({
    success: true,
    message: 'Semana procesada exitosamente',
    data: resultado
  });
});

/**
 * @desc    Obtener resumen ejecutivo
 * @route   GET /api/v1/control-semanal/resumen/:semanaId
 * @access  Private
 */
const getResumenEjecutivo = asyncHandler(async (req, res) => {
  const resumen = await controlSemanalService.getResumenEjecutivo(req.params.semanaId);

  res.status(200).json({
    success: true,
    data: resumen
  });
});

/**
 * @desc    Comparar dos semanas
 * @route   GET /api/v1/control-semanal/comparar
 * @access  Private
 */
const compararSemanas = asyncHandler(async (req, res) => {
  const { semana1, semana2 } = req.query;

  if (!semana1 || !semana2) {
    throw new ApiError(400, 'Se requieren dos semanas para comparar');
  }

  const comparacion = await controlSemanalService.compararSemanas(semana1, semana2);

  res.status(200).json({
    success: true,
    data: comparacion
  });
});

/**
 * @desc    Obtener tendencias de rendimiento
 * @route   GET /api/v1/control-semanal/tendencias
 * @access  Private
 */
const getTendencias = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    throw new ApiError(400, 'Las fechas son obligatorias');
  }

  const tendencias = await controlSemanalService.getTendenciasRendimiento(
    new Date(fecha_inicio),
    new Date(fecha_fin)
  );

  res.status(200).json({
    success: true,
    count: tendencias.length,
    data: tendencias
  });
});

/**
 * @desc    Validar si puede cerrar semana
 * @route   GET /api/v1/control-semanal/validar-cierre/:semanaId
 * @access  Private
 */
const validarCierre = asyncHandler(async (req, res) => {
  const validacion = await controlSemanalService.validarCierreSemana(req.params.semanaId);

  res.status(200).json({
    success: true,
    data: validacion
  });
});

module.exports = {
  procesarSemana,
  getResumenEjecutivo,
  compararSemanas,
  getTendencias,
  validarCierre
};
