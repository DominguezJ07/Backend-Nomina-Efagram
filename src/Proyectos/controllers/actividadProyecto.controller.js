const ActividadProyecto = require('../models/actividadProyecto.model');
const Proyecto = require('../models/proyecto.model');
const { getMongoId } = require('../utils/objectId.helper');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * GET /api/v1/actividades-proyecto?proyecto=id&intervencion=tipo&estado=ABIERTA
 */
const getActividadesProyecto = asyncHandler(async (req, res) => {
  const { proyecto, intervencion, estado } = req.query;

  const filter = {};
  if (proyecto) filter.proyecto = proyecto;
  if (intervencion) filter.intervencion = intervencion;
  if (estado) filter.estado = estado;

  const actividades = await ActividadProyecto.find(filter)
    .populate('actividad', 'nombre codigo unidad_medida categoria')
    .populate('cliente', 'nombre razon_social')
    .populate('supervisor', 'nombres apellidos')
    .populate('intervencion', 'nombre codigo')
    .sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    count: actividades.length,
    data: actividades,
  });
});

/**
 * GET /api/v1/actividades-proyecto/:id
 */
const getActividadProyecto = asyncHandler(async (req, res) => {
  const act = await ActividadProyecto.findById(req.params.id)
    .populate('actividad')
    .populate('cliente')
    .populate('supervisor')
    .populate('proyecto', 'codigo nombre zona')
    .populate('intervencion', 'nombre codigo');

  if (!act) throw new ApiError(404, 'Actividad de proyecto no encontrada');

  res.status(200).json({ success: true, data: act });
});

/**
 * POST /api/v1/actividades-proyecto
 */
const createActividadProyecto = asyncHandler(async (req, res) => {
    const {
    proyecto, actividad, actividad_id,
    intervencion, intervencion_id,
    cliente, cliente_id_bloque,
    supervisor, supervisor_id,
    precio_unitario, cantidad_total, cantidad, unidad, observaciones,
  } = req.body;

  const proyectoId = getMongoId(proyecto);
  const actividadId = getMongoId(actividad || actividad_id);
  const intervencionId = getMongoId(intervencion || intervencion_id);
  const clienteId = getMongoId(cliente || cliente_id_bloque);
  const supervisorId = getMongoId(supervisor || supervisor_id);

  const proyectoDoc = await Proyecto.findById(proyectoId);
  if (!proyectoDoc) throw new ApiError(404, 'Proyecto no encontrado');

  const cantidadTotal = Number(cantidad_total ?? cantidad ?? 0);

  const actividadDoc = await ActividadProyecto.create({
    proyecto: proyectoId,
    actividad: actividadId,
    intervencion: intervencionId,
    cliente: clienteId,
    supervisor: supervisorId,
    precio_unitario: Number(precio_unitario) || 0,
    cantidad_total: cantidadTotal,
    unidad: unidad || 'UNIDAD',
    observaciones,
  });

  await actividadDoc.populate([
    { path: 'actividad', select: 'nombre codigo unidad_medida' },
    { path: 'cliente', select: 'nombre razon_social' },
    { path: 'supervisor', select: 'nombres apellidos' },
    { path: 'intervencion', select: 'nombre codigo' },
  ]);

  res.status(201).json({
    success: true,
    message: 'Actividad de proyecto creada exitosamente',
    data: actividadDoc,
  });
});

/**
 * PUT /api/v1/actividades-proyecto/:id
 */
const updateActividadProyecto = asyncHandler(async (req, res) => {
  const act = await ActividadProyecto.findById(req.params.id);
  if (!act) throw new ApiError(404, 'Actividad de proyecto no encontrada');

  if (act.estado === 'CERRADA') {
    throw new ApiError(400, 'No se puede modificar una actividad cerrada');
  }

  // No permitir reducir cantidad_total por debajo de lo ya asignado
  const nuevaCantidadTotal = req.body.cantidad_total !== undefined
    ? Number(req.body.cantidad_total)
    : req.body.cantidad !== undefined
      ? Number(req.body.cantidad)
      : undefined;

  if (nuevaCantidadTotal !== undefined && nuevaCantidadTotal < act.cantidad_asignada) {
    throw new ApiError(
      400,
      `La cantidad total (${nuevaCantidadTotal}) no puede ser menor a la ya asignada (${act.cantidad_asignada})`
    );
  }

  const updateData = { ...req.body };
  if (nuevaCantidadTotal !== undefined) {
    updateData.cantidad_total = nuevaCantidadTotal;
  }
  if (req.body.cantidad !== undefined && req.body.cantidad_total === undefined) {
    updateData.cantidad_total = nuevaCantidadTotal;
  }

  Object.assign(act, updateData);
  await act.save();

  await act.populate([
    { path: 'actividad', select: 'nombre codigo unidad_medida' },
    { path: 'cliente', select: 'nombre razon_social' },
    { path: 'intervencion', select: 'nombre codigo' },
  ]);

  res.status(200).json({
    success: true,
    message: 'Actividad actualizada correctamente',
    data: act,
  });
});

/**
 * DELETE /api/v1/actividades-proyecto/:id
 */
const deleteActividadProyecto = asyncHandler(async (req, res) => {
  const act = await ActividadProyecto.findById(req.params.id);
  if (!act) throw new ApiError(404, 'Actividad de proyecto no encontrada');

  if (act.cantidad_asignada > 0) {
    throw new ApiError(
      400,
      'No se puede eliminar una actividad que ya tiene cantidades asignadas a subproyectos'
    );
  }

  await act.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Actividad eliminada correctamente',
    data: {},
  });
});

/**
 * GET /api/v1/actividades-proyecto/disponibles/:proyectoId
 * Retorna solo actividades ABIERTAS con cantidad disponible > 0
 */
const getActividadesDisponibles = asyncHandler(async (req, res) => {
  const { proyectoId } = req.params;
  const { intervencion } = req.query;

  const filter = {
    proyecto: proyectoId,
    estado: 'ABIERTA',
  };
  if (intervencion) filter.intervencion = intervencion;

  const actividades = await ActividadProyecto.find(filter)
    .populate('actividad', 'nombre codigo unidad_medida categoria')
    .populate('cliente', 'nombre razon_social')
    .populate('intervencion', 'nombre codigo')
    .sort({ createdAt: 1 });

  // Filtrar solo las que tienen cantidad disponible
  const disponibles = actividades.filter(
    (a) => a.cantidad_total - a.cantidad_asignada > 0
  );

  res.status(200).json({
    success: true,
    count: disponibles.length,
    data: disponibles,
  });
});

module.exports = {
  getActividadesProyecto,
  getActividadProyecto,
  createActividadProyecto,
  updateActividadProyecto,
  deleteActividadProyecto,
  getActividadesDisponibles,
};