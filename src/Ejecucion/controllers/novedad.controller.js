const Novedad = require('../models/novedad.model');
const Persona = require('../../Personal/models/persona.model');
const Cuadrilla = require('../../Personal/models/cuadrilla.model');
const Finca = require('../../Territorial/models/finca.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

// ========================================
// POPULATE REUTILIZABLE
// ========================================
const POPULATE_NOVEDAD = [
  { path: 'trabajador', select: 'nombre apellido documento' },
  { path: 'cuadrilla', select: 'nombre codigo' },
  { path: 'finca', select: 'nombre codigo' },
  { path: 'registrado_por', select: 'nombre apellido' },
  { path: 'aprobado_por', select: 'nombre apellido' }
];

// ========================================
// HELPERS
// ========================================

/**
 * Resuelve la persona que registra a partir del usuario autenticado o fallbacks del body
 */
const resolverRegistrador = async (userId, body) => {
  let persona = await Persona.findOne({ usuario: userId });
  if (persona) return persona;

  if (body.registrado_por) {
    persona = await Persona.findById(body.registrado_por);
    if (!persona) throw new ApiError(404, 'La persona que registra no existe');
    return persona;
  }

  if (body.trabajador) {
    persona = await Persona.findById(body.trabajador);
    if (!persona) throw new ApiError(404, 'El trabajador especificado no existe');
    return persona;
  }

  persona = await Persona.findOne();
  if (!persona) throw new ApiError(500, 'No hay personas registradas en el sistema');
  return persona;
};

/**
 * Resuelve la persona que aprueba/rechaza
 */
const resolverAprobador = async (userId, body, novedad) => {
  let persona = await Persona.findOne({ usuario: userId });
  if (persona) return persona;

  if (body.aprobado_por) {
    persona = await Persona.findById(body.aprobado_por);
    if (!persona) throw new ApiError(404, 'La persona que aprueba no existe');
    return persona;
  }

  if (novedad.registrado_por) {
    persona = await Persona.findById(novedad.registrado_por);
    if (persona) return persona;
  }

  persona = await Persona.findOne();
  if (!persona) throw new ApiError(500, 'No hay personas registradas en el sistema');
  return persona;
};

// ========================================
// CONTROLLERS
// ========================================

/**
 * @desc    Obtener todas las novedades (con filtros)
 * @route   GET /api/v1/novedades
 * @access  Private
 * @query   trabajador, tipo, estado, cuadrilla, finca, fecha_inicio, fecha_fin
 */
const getNovedades = asyncHandler(async (req, res) => {
  const { trabajador, tipo, estado, cuadrilla, finca, fecha_inicio, fecha_fin } = req.query;

  const filter = {};

  if (trabajador) filter.trabajador = trabajador;
  if (tipo) filter.tipo = tipo;
  if (estado) filter.estado = estado;

  // ✅ NUEVO: filtro por cuadrilla
  if (cuadrilla) filter.cuadrilla = cuadrilla;

  // ✅ NUEVO: filtro por finca
  if (finca) filter.finca = finca;

  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  const novedades = await Novedad.find(filter)
    .populate(POPULATE_NOVEDAD)
    .sort({ fecha: -1 });

  res.status(200).json({
    success: true,
    count: novedades.length,
    data: novedades
  });
});

/**
 * @desc    Obtener una novedad por ID
 * @route   GET /api/v1/novedades/:id
 * @access  Private
 */
const getNovedad = asyncHandler(async (req, res) => {
  const novedad = await Novedad.findById(req.params.id)
    .populate(POPULATE_NOVEDAD);

  if (!novedad) throw new ApiError(404, 'Novedad no encontrada');

  res.status(200).json({ success: true, data: novedad });
});

/**
 * @desc    Crear una novedad
 * @route   POST /api/v1/novedades
 * @access  Private (Supervisor, Jefe, Admin, RRHH)
 */
const createNovedad = asyncHandler(async (req, res) => {
  const personaRegistrador = await resolverRegistrador(req.user.id, req.body);

  // Verificar que el trabajador existe
  const trabajadorExiste = await Persona.findById(req.body.trabajador);
  if (!trabajadorExiste) throw new ApiError(404, 'El trabajador especificado no existe');

  // ✅ NUEVO: Verificar cuadrilla si se envía
  if (req.body.cuadrilla) {
    const cuadrillaExiste = await Cuadrilla.findById(req.body.cuadrilla);
    if (!cuadrillaExiste) throw new ApiError(404, 'La cuadrilla especificada no existe');
  }

  // ✅ NUEVO: Verificar finca si se envía
  if (req.body.finca) {
    const fincaExiste = await Finca.findById(req.body.finca);
    if (!fincaExiste) throw new ApiError(404, 'La finca especificada no existe');
  }

  // Generar código único
  const fecha = new Date(req.body.fecha);
  const fechaStr = fecha.toISOString().split('T')[0].replace(/-/g, '');
  const fechaInicioDia = new Date(fecha);
  fechaInicioDia.setHours(0, 0, 0, 0);
  const fechaFinDia = new Date(fecha);
  fechaFinDia.setHours(23, 59, 59, 999);

  const count = await Novedad.countDocuments({
    fecha: { $gte: fechaInicioDia, $lt: fechaFinDia }
  });

  const codigo = `NOV-${fechaStr}-${String(count + 1).padStart(4, '0')}`;

  const novedadData = {
    ...req.body,
    codigo,
    registrado_por: personaRegistrador._id
  };

  const novedad = await Novedad.create(novedadData);
  await novedad.populate(POPULATE_NOVEDAD);

  res.status(201).json({
    success: true,
    message: 'Novedad creada exitosamente',
    data: novedad
  });
});

/**
 * @desc    Actualizar una novedad
 * @route   PUT /api/v1/novedades/:id
 * @access  Private (Admin, Jefe, RRHH)
 */
const updateNovedad = asyncHandler(async (req, res) => {
  let novedad = await Novedad.findById(req.params.id);
  if (!novedad) throw new ApiError(404, 'Novedad no encontrada');

  if (novedad.estado !== 'PENDIENTE' && !req.user.roles.includes('ADMIN_SISTEMA')) {
    throw new ApiError(400, 'No se puede editar una novedad que ya fue procesada');
  }

  if (req.body.trabajador && req.body.trabajador !== novedad.trabajador.toString()) {
    const trabajadorExiste = await Persona.findById(req.body.trabajador);
    if (!trabajadorExiste) throw new ApiError(404, 'El trabajador especificado no existe');
  }

  // ✅ NUEVO: validar cuadrilla en actualización
  if (req.body.cuadrilla) {
    const cuadrillaExiste = await Cuadrilla.findById(req.body.cuadrilla);
    if (!cuadrillaExiste) throw new ApiError(404, 'La cuadrilla especificada no existe');
  }

  // ✅ NUEVO: validar finca en actualización
  if (req.body.finca) {
    const fincaExiste = await Finca.findById(req.body.finca);
    if (!fincaExiste) throw new ApiError(404, 'La finca especificada no existe');
  }

  novedad = await Novedad.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate(POPULATE_NOVEDAD);

  res.status(200).json({
    success: true,
    message: 'Novedad actualizada exitosamente',
    data: novedad
  });
});

/**
 * @desc    Aprobar una novedad
 * @route   POST /api/v1/novedades/:id/aprobar
 * @access  Private (Jefe, Admin, RRHH)
 */
const aprobarNovedad = asyncHandler(async (req, res) => {
  const novedad = await Novedad.findById(req.params.id);
  if (!novedad) throw new ApiError(404, 'Novedad no encontrada');
  if (novedad.estado !== 'PENDIENTE') throw new ApiError(400, 'Solo se pueden aprobar novedades pendientes');

  const personaAprobador = await resolverAprobador(req.user.id, req.body, novedad);
  await novedad.aprobar(personaAprobador._id);
  await novedad.populate(POPULATE_NOVEDAD);

  res.status(200).json({
    success: true,
    message: 'Novedad aprobada exitosamente',
    data: novedad
  });
});

/**
 * @desc    Rechazar una novedad
 * @route   POST /api/v1/novedades/:id/rechazar
 * @access  Private (Jefe, Admin, RRHH)
 */
const rechazarNovedad = asyncHandler(async (req, res) => {
  const { motivo } = req.body;
  if (!motivo || motivo.trim() === '') throw new ApiError(400, 'El motivo de rechazo es obligatorio');

  const novedad = await Novedad.findById(req.params.id);
  if (!novedad) throw new ApiError(404, 'Novedad no encontrada');
  if (novedad.estado !== 'PENDIENTE') throw new ApiError(400, 'Solo se pueden rechazar novedades pendientes');

  const personaAprobador = await resolverAprobador(req.user.id, req.body, novedad);
  await novedad.rechazar(personaAprobador._id, motivo);
  await novedad.populate(POPULATE_NOVEDAD);

  res.status(200).json({
    success: true,
    message: 'Novedad rechazada',
    data: novedad
  });
});

/**
 * @desc    Eliminar una novedad
 * @route   DELETE /api/v1/novedades/:id
 * @access  Private (Admin, Jefe)
 */
const deleteNovedad = asyncHandler(async (req, res) => {
  const novedad = await Novedad.findById(req.params.id);
  if (!novedad) throw new ApiError(404, 'Novedad no encontrada');

  if (novedad.estado === 'APROBADA' && !req.user.roles.includes('ADMIN_SISTEMA')) {
    throw new ApiError(400, 'No se pueden eliminar novedades aprobadas');
  }

  await novedad.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Novedad eliminada exitosamente',
    data: null
  });
});

/**
 * @desc    Obtener novedades por trabajador
 * @route   GET /api/v1/novedades/trabajador/:trabajadorId
 * @access  Private
 */
const getNovedadesByTrabajador = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  const trabajador = await Persona.findById(req.params.trabajadorId);
  if (!trabajador) throw new ApiError(404, 'Trabajador no encontrado');

  const filter = { trabajador: req.params.trabajadorId };

  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  const novedades = await Novedad.find(filter)
    .populate(POPULATE_NOVEDAD)
    .sort({ fecha: -1 });

  res.status(200).json({
    success: true,
    count: novedades.length,
    data: novedades
  });
});

/**
 * @desc    Obtener novedades por cuadrilla
 * @route   GET /api/v1/novedades/cuadrilla/:cuadrillaId
 * @access  Private
 */
const getNovedadesByCuadrilla = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin, tipo } = req.query;

  const cuadrilla = await Cuadrilla.findById(req.params.cuadrillaId);
  if (!cuadrilla) throw new ApiError(404, 'Cuadrilla no encontrada');

  const filter = { cuadrilla: req.params.cuadrillaId };

  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  if (tipo) filter.tipo = tipo;

  const novedades = await Novedad.find(filter)
    .populate(POPULATE_NOVEDAD)
    .sort({ fecha: -1 });

  res.status(200).json({
    success: true,
    count: novedades.length,
    data: novedades
  });
});

/**
 * @desc    Obtener novedades por finca
 * @route   GET /api/v1/novedades/finca/:fincaId
 * @access  Private
 */
const getNovedadesByFinca = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin, tipo } = req.query;

  const finca = await Finca.findById(req.params.fincaId);
  if (!finca) throw new ApiError(404, 'Finca no encontrada');

  const filter = { finca: req.params.fincaId };

  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  if (tipo) filter.tipo = tipo;

  const novedades = await Novedad.find(filter)
    .populate(POPULATE_NOVEDAD)
    .sort({ fecha: -1 });

  res.status(200).json({
    success: true,
    count: novedades.length,
    data: novedades
  });
});

/**
 * @desc    Obtener resumen de horas perdidas por lluvia
 * @route   GET /api/v1/novedades/resumen/horas-lluvia
 * @access  Private
 * @query   finca, fecha_inicio, fecha_fin
 */
const getResumenHorasLluvia = asyncHandler(async (req, res) => {
  const { finca, fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    throw new ApiError(400, 'Se requieren fecha_inicio y fecha_fin');
  }

  const matchFilter = {
    tipo: 'LLUVIA',
    estado: { $ne: 'RECHAZADA' },
    horas: { $ne: null },
    fecha: {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    }
  };

  if (finca) {
    const mongoose = require('mongoose');
    matchFilter.finca = new mongoose.Types.ObjectId(finca);
  }

  const resumen = await Novedad.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          finca: '$finca',
          fecha: { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } }
        },
        total_horas_perdidas: { $sum: '$horas' },
        cantidad_eventos: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'fincas',
        localField: '_id.finca',
        foreignField: '_id',
        as: 'finca_info'
      }
    },
    { $sort: { '_id.fecha': -1 } }
  ]);

  const total_horas = resumen.reduce((acc, r) => acc + r.total_horas_perdidas, 0);

  res.status(200).json({
    success: true,
    total_horas_perdidas: total_horas,
    detalle: resumen
  });
});

module.exports = {
  getNovedades,
  getNovedad,
  createNovedad,
  updateNovedad,
  aprobarNovedad,
  rechazarNovedad,
  deleteNovedad,
  getNovedadesByTrabajador,
  getNovedadesByCuadrilla,
  getNovedadesByFinca,
  getResumenHorasLluvia
};