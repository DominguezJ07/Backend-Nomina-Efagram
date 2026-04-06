const Subproyecto = require('../models/subproyecto.model');
const Proyecto = require('../models/proyecto.model');
const Nucleo = require('../../Territorial/models/nucleo.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
const HorasNoTrabajadas = require('../../HorasNoTrabajadas/models/HorasNoTrabajadas.model');

/**
 * GET /api/v1/subproyectos?proyecto=id
 */
const getSubproyectos = asyncHandler(async (req, res) => {
  const { proyecto, estado } = req.query;

  const filter = {};
  if (proyecto) filter.proyecto = proyecto;
  if (estado) filter.estado = estado;

  const subproyectos = await Subproyecto.find(filter)
    .populate('proyecto', 'codigo nombre zona')
    .populate('nucleos', 'codigo nombre')
    .populate('supervisor', 'nombres apellidos')
    .populate('cliente', 'nombre razon_social')
    .sort({ createdAt: -1 });

  // 🔥 NUEVO: Agregar horas trabajadas y no trabajadas
  const subproyectosConHoras = await Promise.all(
    subproyectos.map(async (sub) => {

      // 🟢 HORAS TRABAJADAS
      const horasTrabajadas = await RegistroDiario.aggregate([
        {
          $match: {
            subproyectoId: sub._id
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$horasTrabajadas" } // ⚠️ Verifica este campo en tu modelo
          }
        }
      ]);

      // 🔴 HORAS NO TRABAJADAS
      const horasNoTrabajadas = await HorasNoTrabajadas.aggregate([
        {
          $match: {
            subproyectoId: sub._id
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$horas" }
          }
        }
      ]);

      return {
        ...sub.toObject(),
        horasTrabajadas: horasTrabajadas[0]?.total || 0,
        horasNoTrabajadas: horasNoTrabajadas[0]?.total || 0
      };
    })
  );

  res.status(200).json({
    success: true,
    count: subproyectosConHoras.length,
    data: subproyectosConHoras,
  });
});

/**
 * GET /api/v1/subproyectos/:id
 */
const getSubproyecto = asyncHandler(async (req, res) => {
  const sub = await Subproyecto.findById(req.params.id)
    .populate({ path: 'proyecto', populate: { path: 'zona', select: 'nombre codigo' } })
    .populate('nucleos', 'codigo nombre zona')
    .populate('supervisor', 'nombres apellidos cargo')
    .populate('cliente', 'nombre razon_social');

  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');

  res.status(200).json({ success: true, data: sub });
});

/**
 * POST /api/v1/subproyectos
 */
const createSubproyecto = asyncHandler(async (req, res) => {
  const {
    codigo, nombre, proyecto: proyectoId, nucleos,
    supervisor, cliente, fecha_inicio, fecha_fin_estimada, observaciones,
  } = req.body;

  const proyecto = await Proyecto.findById(proyectoId).populate('zona');
  if (!proyecto) throw new ApiError(404, 'Proyecto no encontrado');
  if (!proyecto.zona) throw new ApiError(400, 'El proyecto no tiene zona asignada');

  if (nucleos && nucleos.length > 0) {
    const nucleosDocs = await Nucleo.find({ _id: { $in: nucleos } });
    for (const nucleo of nucleosDocs) {
      if (nucleo.zona.toString() !== proyecto.zona._id.toString() &&
          nucleo.zona.toString() !== proyecto.zona.toString()) {
        throw new ApiError(
          400,
          `El núcleo "${nucleo.nombre}" no pertenece a la zona del proyecto`
        );
      }
    }
  }

  const sub = await Subproyecto.create({
    codigo: codigo.trim().toUpperCase(),
    nombre: nombre.trim(),
    proyecto: proyectoId,
    nucleos: nucleos || [],
    supervisor: supervisor || null,
    cliente: cliente || null,
    fecha_inicio: fecha_inicio || null,
    fecha_fin_estimada: fecha_fin_estimada || null,
    observaciones,
  });

  await sub.populate([
    { path: 'proyecto', select: 'codigo nombre' },
    { path: 'nucleos', select: 'codigo nombre' },
    { path: 'supervisor', select: 'nombres apellidos' },
    { path: 'cliente', select: 'nombre razon_social' },
  ]);

  res.status(201).json({
    success: true,
    message: 'Subproyecto creado exitosamente',
    data: sub,
  });
});

/**
 * PUT /api/v1/subproyectos/:id
 */
const updateSubproyecto = asyncHandler(async (req, res) => {
  const sub = await Subproyecto.findById(req.params.id).populate('proyecto');
  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');

  if (sub.estado === 'CERRADO') {
    throw new ApiError(400, 'No se puede modificar un subproyecto cerrado');
  }

  if (req.body.nucleos && req.body.nucleos.length > 0) {
    const proyecto = await Proyecto.findById(sub.proyecto._id || sub.proyecto);
    if (proyecto?.zona) {
      const nucleosDocs = await Nucleo.find({ _id: { $in: req.body.nucleos } });
      for (const nucleo of nucleosDocs) {
        if (nucleo.zona.toString() !== proyecto.zona.toString()) {
          throw new ApiError(
            400,
            `El núcleo "${nucleo.nombre}" no pertenece a la zona del proyecto`
          );
        }
      }
    }
  }

  Object.assign(sub, req.body);
  await sub.save();

  await sub.populate([
    { path: 'proyecto', select: 'codigo nombre' },
    { path: 'nucleos', select: 'codigo nombre' },
    { path: 'supervisor', select: 'nombres apellidos' },
    { path: 'cliente', select: 'nombre razon_social' },
  ]);

  res.status(200).json({
    success: true,
    message: 'Subproyecto actualizado correctamente',
    data: sub,
  });
});

/**
 * DELETE /api/v1/subproyectos/:id
 */
const deleteSubproyecto = asyncHandler(async (req, res) => {
  const AsignacionActividad = require('../models/asignacionActividad.model');
  const sub = await Subproyecto.findById(req.params.id);
  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');

  const tieneAsignaciones = await AsignacionActividad.countDocuments({
    subproyecto: req.params.id,
  });

  if (tieneAsignaciones > 0) {
    throw new ApiError(
      400,
      `No se puede eliminar. Tiene ${tieneAsignaciones} actividades asignadas.`
    );
  }

  await sub.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Subproyecto eliminado correctamente',
    data: {},
  });
});

/**
 * GET /api/v1/subproyectos/:id/nucleos-disponibles
 */
const getNucleosDisponibles = asyncHandler(async (req, res) => {
  const sub = await Subproyecto.findById(req.params.id).populate({
    path: 'proyecto',
    select: 'zona',
  });

  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');

  const zonaId = sub.proyecto?.zona;
  if (!zonaId) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const nucleos = await Nucleo.find({ zona: zonaId, activo: true })
    .select('codigo nombre zona')
    .sort({ nombre: 1 });

  res.status(200).json({
    success: true,
    count: nucleos.length,
    data: nucleos
  });
});

module.exports = {
  getSubproyectos,
  getSubproyecto,
  createSubproyecto,
  updateSubproyecto,
  deleteSubproyecto,
  getNucleosDisponibles,
};