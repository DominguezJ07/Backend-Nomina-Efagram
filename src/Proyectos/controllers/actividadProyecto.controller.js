const ActividadProyecto = require('../models/actividadProyecto.model');
const Proyecto = require('../models/proyecto.model');
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
    .sort({ intervencion: 1, createdAt: 1 });

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
    .populate('proyecto', 'codigo nombre zona');

  if (!act) throw new ApiError(404, 'Actividad de proyecto no encontrada');

  res.status(200).json({ success: true, data: act });
});

/**
 * POST /api/v1/actividades-proyecto
 */
const createActividadProyecto = asyncHandler(async (req, res) => {
  const {
    proyecto, actividad, intervencion, cliente, supervisor,
    precio_unitario, cantidad_total, unidad, observaciones,
  } = req.body;

  const proyectoDoc = await Proyecto.findById(proyecto);
  if (!proyectoDoc) throw new ApiError(404, 'Proyecto no encontrado');

  const actividadDoc = await ActividadProyecto.create({
    proyecto, actividad, intervencion, cliente, supervisor,
    precio_unitario: Number(precio_unitario) || 0,
    cantidad_total: Number(cantidad_total),
    unidad: unidad || 'UNIDAD',
    observaciones,
  });

  await actividadDoc.populate([
    { path: 'actividad', select: 'nombre codigo unidad_medida' },
    { path: 'cliente', select: 'nombre razon_social' },
    { path: 'supervisor', select: 'nombres apellidos' },
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
  if (req.body.cantidad_total !== undefined) {
    const nueva = Number(req.body.cantidad_total);
    if (nueva < act.cantidad_asignada) {
      throw new ApiError(
        400,
        `La cantidad total (${nueva}) no puede ser menor a la ya asignada (${act.cantidad_asignada})`
      );
    }
  }

  Object.assign(act, req.body);
  await act.save();

  await act.populate([
    { path: 'actividad', select: 'nombre codigo unidad_medida' },
    { path: 'cliente', select: 'nombre razon_social' },
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
    .sort({ intervencion: 1 });

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