const SemanaOperativa = require('../models/semanaOperativa.model');
const semanaService = require('../services/semana.service');
const Persona = require('../../Personal/models/persona.model');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

// ─────────────────────────────────────────────────────────────────
// HELPER: calcula registros y cumplimiento para cada semana
// Estos campos no existen en el modelo; se calculan en tiempo real
// ─────────────────────────────────────────────────────────────────
async function enrichSemanas(semanas) {
  return Promise.all(semanas.map(async (s) => {
    const obj = s.toObject ? s.toObject() : { ...s };
    try {
      // Total de registros diarios dentro del rango de la semana
      const totalRegistros = await RegistroDiario.countDocuments({
        fecha: { $gte: s.fecha_inicio, $lte: s.fecha_fin }
      });

      // PALs con registros en la semana (para calcular cumplimiento promedio)
      const palIds = await RegistroDiario.distinct('proyecto_actividad_lote', {
        fecha: { $gte: s.fecha_inicio, $lte: s.fecha_fin },
        proyecto_actividad_lote: { $ne: null }
      });

      let cumplimiento = null;
      if (palIds.length > 0) {
        const pals = await ProyectoActividadLote.find({ _id: { $in: palIds } });
        if (pals.length > 0) {
          const totalPct = pals.reduce((acc, pal) => {
            if (!pal.meta_minima || pal.meta_minima === 0) return acc;
            return acc + Math.min(100, Math.round((pal.cantidad_ejecutada / pal.meta_minima) * 100));
          }, 0);
          cumplimiento = Math.round(totalPct / pals.length);
        }
      }

      obj.registros    = totalRegistros;
      obj.cumplimiento = cumplimiento;
    } catch (_) {
      obj.registros    = 0;
      obj.cumplimiento = null;
    }
    return obj;
  }));
}

/**
 * @desc    Obtener todas las semanas operativas
 * @route   GET /api/v1/semanas
 * @access  Private
 */
const getSemanas = asyncHandler(async (req, res) => {
  const { año, estado, fecha_inicio, fecha_fin } = req.query;

  const filter = {};
  if (año) filter.año = parseInt(año);
  if (estado) filter.estado = estado;

  if (fecha_inicio && fecha_fin) {
    filter.$or = [
      { fecha_inicio: { $gte: new Date(fecha_inicio), $lte: new Date(fecha_fin) } },
      { fecha_fin:    { $gte: new Date(fecha_inicio), $lte: new Date(fecha_fin) } }
    ];
  }

  const semanas = await SemanaOperativa.find(filter)
    .populate('proyecto')
    .populate('nucleo')
    .populate('cerrada_por')
    .sort({ fecha_inicio: -1 });

  // Enriquecer con registros y cumplimiento calculados
  const enriched = await enrichSemanas(semanas);

  res.status(200).json({
    success: true,
    count: enriched.length,
    data: enriched
  });
});

/**
 * @desc    Obtener una semana operativa por ID
 * @route   GET /api/v1/semanas/:id
 * @access  Private
 */
const getSemana = asyncHandler(async (req, res) => {
  const semana = await SemanaOperativa.findById(req.params.id)
    .populate('proyecto')
    .populate('nucleo')
    .populate('cerrada_por');

  if (!semana) {
    throw new ApiError(404, 'Semana no encontrada');
  }

  const [enriched] = await enrichSemanas([semana]);

  res.status(200).json({
    success: true,
    data: enriched
  });
});

/**
 * @desc    Obtener semana actual
 * @route   GET /api/v1/semanas/actual
 * @access  Private
 */
const getSemanaActual = asyncHandler(async (req, res) => {
  const semana = await semanaService.getSemanaActual();

  res.status(200).json({
    success: true,
    data: semana
  });
});

/**
 * @desc    Crear una semana operativa
 * @route   POST /api/v1/semanas
 * @access  Private (Admin, Jefe)
 */
const createSemana = asyncHandler(async (req, res) => {
  const existente = await SemanaOperativa.findOne({
    fecha_inicio: req.body.fecha_inicio,
    fecha_fin: req.body.fecha_fin
  });

  if (existente) {
    throw new ApiError(409, 'Ya existe una semana con este rango de fechas');
  }

  const semana = await SemanaOperativa.create(req.body);
  await semana.populate(['proyecto', 'nucleo']);

  res.status(201).json({
    success: true,
    message: 'Semana creada exitosamente',
    data: semana
  });
});

/**
 * @desc    Actualizar una semana operativa
 * @route   PUT /api/v1/semanas/:id
 * @access  Private (Admin, Jefe)
 */
const updateSemana = asyncHandler(async (req, res) => {
  let semana = await SemanaOperativa.findById(req.params.id);

  if (!semana) {
    throw new ApiError(404, 'Semana no encontrada');
  }

  if (semana.estado === 'CERRADA' && !req.user.roles.includes('ADMIN_SISTEMA')) {
    throw new ApiError(400, 'No se puede modificar una semana cerrada');
  }

  semana = await SemanaOperativa.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(['proyecto', 'nucleo', 'cerrada_por']);

  res.status(200).json({
    success: true,
    message: 'Semana actualizada exitosamente',
    data: semana
  });
});

/**
 * @desc    Eliminar una semana operativa
 * @route   DELETE /api/v1/semanas/:id
 * @access  Private (Admin)
 */
const deleteSemana = asyncHandler(async (req, res) => {
  const semana = await SemanaOperativa.findById(req.params.id);

  if (!semana) {
    throw new ApiError(404, 'Semana no encontrada');
  }

  if (semana.estado === 'CERRADA') {
    throw new ApiError(400, 'No se puede eliminar una semana cerrada');
  }

  await SemanaOperativa.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Semana eliminada exitosamente'
  });
});

/**
 * @desc    Cerrar una semana operativa
 * @route   POST /api/v1/semanas/:id/cerrar
 * @access  Private (Admin, Jefe)
 */
const cerrarSemana = asyncHandler(async (req, res) => {
  let persona = await Persona.findOne({ usuario: req.user.id });
  const cerradoPorId = persona ? persona._id : req.user.id;

  const semana = await semanaService.cerrarSemana(req.params.id, cerradoPorId);
  await semana.populate(['proyecto', 'nucleo', 'cerrada_por']);

  res.status(200).json({
    success: true,
    message: 'Semana cerrada exitosamente',
    data: semana
  });
});

/**
 * @desc    Verificar si una semana puede cerrarse
 * @route   GET /api/v1/semanas/:id/puede-cerrar
 * @access  Private
 */
const puedeObtenerSemana = asyncHandler(async (req, res) => {
  const validacion = await semanaService.puedeObtenerSemana(req.params.id);

  res.status(200).json({
    success: true,
    data: validacion
  });
});

/**
 * @desc    Abrir una semana cerrada (solo Admin)
 * @route   POST /api/v1/semanas/:id/abrir
 * @access  Private (Admin)
 */
const abrirSemana = asyncHandler(async (req, res) => {
  const semana = await SemanaOperativa.findById(req.params.id);

  if (!semana) {
    throw new ApiError(404, 'Semana no encontrada');
  }

  if (semana.estado !== 'CERRADA') {
    throw new ApiError(400, 'La semana no está cerrada');
  }

  semana.estado = 'ABIERTA';
  semana.cerrada_por = null;
  semana.fecha_cierre = null;
  await semana.save();

  res.status(200).json({
    success: true,
    message: 'Semana reabierta exitosamente',
    data: semana
  });
});

module.exports = {
  getSemanas,
  getSemana,
  getSemanaActual,
  createSemana,
  updateSemana,
  deleteSemana,   // ← NUEVO
  cerrarSemana,
  puedeObtenerSemana,
  abrirSemana
};