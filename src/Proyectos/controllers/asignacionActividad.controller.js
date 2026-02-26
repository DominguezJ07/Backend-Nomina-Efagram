const AsignacionActividad = require('../models/asignacionActividad.model');
const ActividadProyecto = require('../models/actividadProyecto.model');
const Subproyecto = require('../models/subproyecto.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * GET /api/v1/asignaciones?subproyecto=id&actividad_proyecto=id
 */
const getAsignaciones = asyncHandler(async (req, res) => {
  const { subproyecto, actividad_proyecto } = req.query;

  const filter = {};
  if (subproyecto) filter.subproyecto = subproyecto;
  if (actividad_proyecto) filter.actividad_proyecto = actividad_proyecto;

  const asignaciones = await AsignacionActividad.find(filter)
    .populate({
      path: 'actividad_proyecto',
      populate: { path: 'actividad', select: 'nombre codigo unidad_medida' },
    })
    .populate('subproyecto', 'codigo nombre')
    .sort({ createdAt: -1 });

  // Enriquecer con porcentaje
  const data = asignaciones.map((a) => {
    const obj = a.toObject();
    const total = a.actividad_proyecto?.cantidad_total || 0;
    obj.porcentaje = total > 0
      ? Math.round((a.cantidad_asignada / total) * 100)
      : 0;
    return obj;
  });

  res.status(200).json({ success: true, count: data.length, data });
});

/**
 * POST /api/v1/asignaciones
 * Crea una asignación y actualiza cantidad_asignada en ActividadProyecto
 */
const createAsignacion = asyncHandler(async (req, res) => {
  const { subproyecto, actividad_proyecto, cantidad_asignada, observaciones } = req.body;

  // Validar subproyecto
  const sub = await Subproyecto.findById(subproyecto);
  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');
  if (sub.estado !== 'ACTIVO') {
    throw new ApiError(400, 'El subproyecto no está activo');
  }

  // Validar actividad del proyecto
  const actProyecto = await ActividadProyecto.findById(actividad_proyecto);
  if (!actProyecto) throw new ApiError(404, 'Actividad de proyecto no encontrada');

  if (actProyecto.estado === 'CERRADA') {
    throw new ApiError(400, 'Esta actividad ya está cerrada. La cantidad total ha sido completamente asignada.');
  }

  // Validar que la cantidad no exceda lo disponible
  const disponible = actProyecto.cantidad_total - actProyecto.cantidad_asignada;
  const cantidad = Number(cantidad_asignada);

  if (cantidad <= 0) {
    throw new ApiError(400, 'La cantidad asignada debe ser mayor a 0');
  }

  if (cantidad > disponible) {
    throw new ApiError(
      400,
      `La cantidad (${cantidad}) excede la disponible (${disponible.toFixed(2)}). ` +
      `Total: ${actProyecto.cantidad_total}, Ya asignado: ${actProyecto.cantidad_asignada}`
    );
  }

  // Verificar que este subproyecto no tenga ya esta actividad asignada
  const yaExiste = await AsignacionActividad.findOne({
    subproyecto,
    actividad_proyecto,
    estado: { $ne: 'CANCELADA' },
  });
  if (yaExiste) {
    throw new ApiError(
      400,
      'Este subproyecto ya tiene asignada esta actividad. Edita la asignación existente.'
    );
  }

  // Crear asignación
  const asignacion = await AsignacionActividad.create({
    subproyecto,
    actividad_proyecto,
    cantidad_asignada: cantidad,
    observaciones,
  });

  // ─── LÓGICA CRÍTICA: actualizar cantidad_asignada en ActividadProyecto ───
  actProyecto.cantidad_asignada += cantidad;

  // Si llega al 100% → cerrar actividad automáticamente
  if (actProyecto.cantidad_asignada >= actProyecto.cantidad_total) {
    actProyecto.estado = 'CERRADA';
    actProyecto.cantidad_asignada = actProyecto.cantidad_total; // no exceder
  }

  await actProyecto.save();

  await asignacion.populate([
    {
      path: 'actividad_proyecto',
      populate: { path: 'actividad', select: 'nombre codigo unidad_medida' },
    },
    { path: 'subproyecto', select: 'codigo nombre' },
  ]);

  const obj = asignacion.toObject();
  obj.porcentaje = Math.round((cantidad / actProyecto.cantidad_total) * 100);
  obj.actividad_proyecto_actualizada = {
    _id: actProyecto._id,
    cantidad_total: actProyecto.cantidad_total,
    cantidad_asignada: actProyecto.cantidad_asignada,
    cantidad_disponible: actProyecto.cantidad_total - actProyecto.cantidad_asignada,
    estado: actProyecto.estado,
    porcentaje_asignado: Math.round(
      (actProyecto.cantidad_asignada / actProyecto.cantidad_total) * 100
    ),
  };

  res.status(201).json({
    success: true,
    message: actProyecto.estado === 'CERRADA'
      ? '✅ Asignación creada. La actividad ha sido CERRADA (100% asignado).'
      : 'Asignación creada exitosamente',
    data: obj,
  });
});

/**
 * PUT /api/v1/asignaciones/:id
 */
const updateAsignacion = asyncHandler(async (req, res) => {
  const asignacion = await AsignacionActividad.findById(req.params.id);
  if (!asignacion) throw new ApiError(404, 'Asignación no encontrada');

  if (asignacion.estado === 'CANCELADA') {
    throw new ApiError(400, 'No se puede modificar una asignación cancelada');
  }

  const actProyecto = await ActividadProyecto.findById(asignacion.actividad_proyecto);
  if (!actProyecto) throw new ApiError(404, 'Actividad de proyecto no encontrada');

  // Si cambia la cantidad, recalcular
  if (req.body.cantidad_asignada !== undefined) {
    const nuevaCantidad = Number(req.body.cantidad_asignada);
    const diferencia = nuevaCantidad - asignacion.cantidad_asignada;

    const disponibleConEsta =
      actProyecto.cantidad_total - actProyecto.cantidad_asignada + asignacion.cantidad_asignada;

    if (nuevaCantidad > disponibleConEsta) {
      throw new ApiError(
        400,
        `La cantidad (${nuevaCantidad}) excede la disponible (${disponibleConEsta.toFixed(2)})`
      );
    }

    // Actualizar en ActividadProyecto
    actProyecto.cantidad_asignada = Math.max(
      0,
      actProyecto.cantidad_asignada + diferencia
    );

    // Reabrir si ya no está al 100%
    if (actProyecto.cantidad_asignada < actProyecto.cantidad_total) {
      actProyecto.estado = 'ABIERTA';
    }
    if (actProyecto.cantidad_asignada >= actProyecto.cantidad_total) {
      actProyecto.estado = 'CERRADA';
    }

    await actProyecto.save();
    asignacion.cantidad_asignada = nuevaCantidad;
  }

  if (req.body.observaciones !== undefined) asignacion.observaciones = req.body.observaciones;
  if (req.body.estado !== undefined) asignacion.estado = req.body.estado;

  await asignacion.save();

  res.status(200).json({
    success: true,
    message: 'Asignación actualizada correctamente',
    data: asignacion,
  });
});

/**
 * DELETE /api/v1/asignaciones/:id  (cancela y devuelve la cantidad)
 */
const cancelarAsignacion = asyncHandler(async (req, res) => {
  const asignacion = await AsignacionActividad.findById(req.params.id);
  if (!asignacion) throw new ApiError(404, 'Asignación no encontrada');

  if (asignacion.estado === 'CANCELADA') {
    throw new ApiError(400, 'La asignación ya está cancelada');
  }

  const actProyecto = await ActividadProyecto.findById(asignacion.actividad_proyecto);
  if (actProyecto) {
    // Devolver la cantidad al pool disponible
    actProyecto.cantidad_asignada = Math.max(
      0,
      actProyecto.cantidad_asignada - asignacion.cantidad_asignada
    );
    // Reabrir si estaba cerrada
    if (actProyecto.estado === 'CERRADA') {
      actProyecto.estado = 'ABIERTA';
    }
    await actProyecto.save();
  }

  asignacion.estado = 'CANCELADA';
  await asignacion.save();

  res.status(200).json({
    success: true,
    message: 'Asignación cancelada. La cantidad fue devuelta al pool disponible.',
    data: asignacion,
  });
});

module.exports = {
  getAsignaciones,
  createAsignacion,
  updateAsignacion,
  cancelarAsignacion,
};