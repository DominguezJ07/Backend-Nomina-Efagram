const avanceMetasService = require('../services/avanceMetas.service');
const controlSemanalService = require('../services/controlSemanal.service');
const nominaCalculadaService = require('../services/nominaCalculada.service');
const { asyncHandler } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener reporte de avance de metas
 * @route   GET /api/v1/reportes/avance-metas
 * @access  Private
 */
const getReporteAvanceMetas = asyncHandler(async (req, res) => {
  const { proyecto_id, fecha_inicio, fecha_fin } = req.query;

  const reporte = await avanceMetasService.getAvanceMetasPorProyecto(
    proyecto_id,
    fecha_inicio,
    fecha_fin
  );

  res.status(200).json({
    success: true,
    data: reporte
  });
});

/**
 * @desc    Obtener reporte por actividad
 * @route   GET /api/v1/reportes/por-actividad
 * @access  Private
 */
const getReportePorActividad = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  const reporte = await avanceMetasService.getAvancePorActividad(
    fecha_inicio,
    fecha_fin
  );

  res.status(200).json({
    success: true,
    data: reporte
  });
});

/**
 * @desc    Obtener reporte consolidado de semana
 * @route   GET /api/v1/reportes/semana/:semanaId
 * @access  Private
 */
const getReporteSemana = asyncHandler(async (req, res) => {
  const reporte = await controlSemanalService.getReporteConsolidadoSemana(
    req.params.semanaId
  );

  res.status(200).json({
    success: true,
    data: reporte
  });
});

/**
 * @desc    Comparar dos semanas operativas
 * @route   GET /api/v1/reportes/comparar-semanas
 * @access  Private
 */
const compararSemanas = asyncHandler(async (req, res) => {
  const { semana1, semana2 } = req.query;

  if (!semana1 || !semana2) {
    return res.status(400).json({
      success: false,
      message: 'Se requieren los IDs de ambas semanas'
    });
  }

  const comparacion = await controlSemanalService.compararSemanas(semana1, semana2);

  res.status(200).json({
    success: true,
    data: comparacion
  });
});

/**
 * @desc    Calcular nómina de un trabajador
 * @route   GET /api/v1/reportes/nomina/:trabajadorId
 * @access  Private
 */
const getNominaTrabajador = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({
      success: false,
      message: 'Se requieren fecha_inicio y fecha_fin'
    });
  }

  const nomina = await nominaCalculadaService.calcularNominaPorTrabajador(
    req.params.trabajadorId,
    fecha_inicio,
    fecha_fin
  );

  res.status(200).json({
    success: true,
    data: nomina
  });
});

/**
 * @desc    Obtener resumen general de nómina
 * @route   GET /api/v1/reportes/nomina-general
 * @access  Private
 */
const getResumenNominaGeneral = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({
      success: false,
      message: 'Se requieren fecha_inicio y fecha_fin'
    });
  }

  const resumen = await nominaCalculadaService.getResumenNominaGeneral(
    fecha_inicio,
    fecha_fin
  );

  res.status(200).json({
    success: true,
    data: resumen
  });
});

/**
 * @desc    Obtener dashboard general con todos los reportes
 * @route   GET /api/v1/reportes/dashboard
 * @access  Private
 */
const getDashboardGeneral = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  // Ejecutar todos los reportes en paralelo
  const [avanceMetas, porActividad, nominaGeneral] = await Promise.all([
    avanceMetasService.getAvanceMetasPorProyecto(null, fecha_inicio, fecha_fin),
    avanceMetasService.getAvancePorActividad(fecha_inicio, fecha_fin),
    nominaCalculadaService.getResumenNominaGeneral(fecha_inicio, fecha_fin)
  ]);

  res.status(200).json({
    success: true,
    data: {
      avance_metas: avanceMetas,
      por_actividad: porActividad,
      nomina_general: nominaGeneral
    }
  });
});

module.exports = {
  getReporteAvanceMetas,
  getReportePorActividad,
  getReporteSemana,
  compararSemanas,
  getNominaTrabajador,
  getResumenNominaGeneral,
  getDashboardGeneral
};