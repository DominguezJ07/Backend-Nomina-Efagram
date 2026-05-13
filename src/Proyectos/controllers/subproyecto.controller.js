const Subproyecto = require('../models/subproyecto.model');
const Proyecto = require('../models/proyecto.model');
const Nucleo = require('../../Territorial/models/nucleo.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const { getMongoId, idsEqual } = require('../utils/objectId.helper');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
const HorasNoTrabajadas = require('../../HorasNoTrabajadas/models/HorasNoTrabajadas.model');

/**
 * GET /api/v1/subproyectos?proyecto=id
 */
const getSubproyectos = asyncHandler(async (req, res) => {
  const { proyecto, estado } = req.query;

  const filter = {};
  if (proyecto) {
    const proyectoId = getMongoId(proyecto);
    if (proyectoId) {
      filter.proyecto_id = proyectoId;
    } else {
      filter['proyecto.codigo'] = proyecto;
    }
  }
  if (estado) filter.estado = estado;

  const subproyectos = await Subproyecto.find(filter)
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
  const sub = await Subproyecto.findById(req.params.id);

  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');

  res.status(200).json({ success: true, data: sub });
});

/**
 * POST /api/v1/subproyectos
 */
const createSubproyecto = asyncHandler(async (req, res) => {
  const {
    codigo,
    nombre,
    proyecto: proyectoId,
    nucleos = [],
    supervisor,
    cliente,
    fecha_inicio,
    fecha_fin_estimada,
    observaciones,
  } = req.body;

  if (!codigo || !String(codigo).trim()) {
    throw new ApiError(400, 'El código es obligatorio');
  }

  if (!nombre || !String(nombre).trim()) {
    throw new ApiError(400, 'El nombre es obligatorio');
  }

  const proyectoMongoId = getMongoId(proyectoId);

  if (!proyectoMongoId) {
    throw new ApiError(400, 'Proyecto inválido');
  }

  const proyecto = await Proyecto.findById(proyectoMongoId).lean();

  if (!proyecto) {
    throw new ApiError(404, 'Proyecto no encontrado');
  }

  const zonaProyectoId = getMongoId(proyecto.zona);

  let nucleosDocs = [];

  if (Array.isArray(nucleos) && nucleos.length > 0) {
    const nucleosIds = nucleos.map(getMongoId).filter(Boolean);

    nucleosDocs = await Nucleo.find({ _id: { $in: nucleosIds } }).lean();

    if (nucleosDocs.length !== nucleosIds.length) {
      throw new ApiError(400, 'Uno o más núcleos no existen');
    }

    if (zonaProyectoId) {
      for (const nucleo of nucleosDocs) {
        const zonaNucleoId = getMongoId(nucleo.zona);

        if (zonaNucleoId && !idsEqual(zonaNucleoId, zonaProyectoId)) {
          throw new ApiError(
            400,
            `El núcleo "${nucleo.nombre}" no pertenece a la zona del proyecto`
          );
        }
      }
    }
  }

  const sub = await Subproyecto.create({
    codigo: String(codigo).trim().toUpperCase(),
    nombre: String(nombre).trim(),

    proyecto_id: proyecto._id,

    proyecto: {
      codigo: proyecto.codigo || null,
      nombre: proyecto.nombre || null,
    },

    nucleo_ids: nucleosDocs.map((n) => n._id),

    nucleos: nucleosDocs.map((n) => ({
      id: String(n._id),
      codigo: n.codigo || null,
      nombre: n.nombre || null,
    })),

    supervisor: supervisor && typeof supervisor === 'object'
      ? {
          nombre: supervisor.nombre || supervisor.name || supervisor.nombres || null,
          documento: supervisor.documento || supervisor.cc || supervisor.num_doc || null,
        }
      : {
          nombre: null,
          documento: supervisor ? String(supervisor) : null,
        },

    cliente: cliente && typeof cliente === 'object'
      ? {
          nombre: cliente.nombre || cliente.razon_social || cliente.nombre_comercial || null,
          nit: cliente.nit || null,
        }
      : {
          nombre: null,
          nit: null,
        },

    fecha_inicio: fecha_inicio || null,
    fecha_fin_estimada: fecha_fin_estimada || null,
    observaciones,
  });

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