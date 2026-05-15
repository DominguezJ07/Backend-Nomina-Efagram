const Subproyecto = require('../models/subproyecto.model');
const Proyecto = require('../models/proyecto.model');
const Nucleo = require('../../Territorial/models/nucleo.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');
const { getMongoId } = require('../utils/objectId.helper');
const { sanitizeNucleos } = require('../utils/sanitizer');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
const HorasNoTrabajadas = require('../../HorasNoTrabajadas/models/HorasNoTrabajadas.model');
const { validateCuadrillas } = require('../../Contratos/services/contrato.service');

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
    cuadrillas = [],
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

  const nucleosDocs = sanitizeNucleos(nucleos);
  const nucleoIds = nucleosDocs.map((n) => getMongoId(n.id)).filter(Boolean);

  // Validar y normalizar cuadrillas (si vienen como IDs)
  let cuadrillaIdsNormalized = [];
  if (cuadrillas && cuadrillas.length > 0) {
    const validated = await validateCuadrillas(cuadrillas);
    cuadrillaIdsNormalized = validated.map(c => c._id);
  }

  const sub = await Subproyecto.create({
    codigo: String(codigo).trim().toUpperCase(),
    nombre: String(nombre).trim(),

    proyecto_id: proyecto._id,

    proyecto: {
      codigo: proyecto.codigo || null,
      nombre: proyecto.nombre || null,
    },

    nucleo_ids: nucleoIds,

    nucleos: nucleosDocs,
    cuadrillas: cuadrillaIdsNormalized,

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
  const sub = await Subproyecto.findById(req.params.id);
  if (!sub) throw new ApiError(404, 'Subproyecto no encontrado');

  if (sub.estado === 'CERRADO') {
    throw new ApiError(400, 'No se puede modificar un subproyecto cerrado');
  }

  Object.assign(sub, req.body);

  if (req.body.nucleos !== undefined) {
    const normalizedNucleos = sanitizeNucleos(req.body.nucleos);
    sub.nucleos = normalizedNucleos;
    sub.nucleo_ids = normalizedNucleos.map((n) => getMongoId(n.id)).filter(Boolean);
  }

  if (req.body.cuadrillas !== undefined) {
    const validated = await validateCuadrillas(req.body.cuadrillas);
    sub.cuadrillas = validated.map(c => c._id);
  }

  await sub.save();

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