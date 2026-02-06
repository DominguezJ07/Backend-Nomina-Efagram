const AsignacionSupervisor = require('../models/asignacionSupervisor.model');
const Persona = require('../models/persona.model');
const Lote = require('../../Territorial/models/lote.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las asignaciones
 * @route   GET /api/v1/asignaciones-supervisor
 * @access  Private
 */
const getAsignaciones = asyncHandler(async (req, res) => {
  const { activa, supervisor, lote } = req.query;

  const filter = {};
  if (activa !== undefined) filter.activa = activa === 'true';
  if (supervisor) filter.supervisor = supervisor;
  if (lote) filter.lote = lote;

  const asignaciones = await AsignacionSupervisor.find(filter)
    .populate('supervisor', 'nombres apellidos cedula')
    .populate({
      path: 'lote',
      select: 'codigo nombre area finca',
      populate: {
        path: 'finca',
        select: 'codigo nombre'
      }
    })
    .sort({ fecha_inicio: -1 });

  res.status(200).json({
    success: true,
    count: asignaciones.length,
    data: asignaciones
  });
});

/**
 * @desc    Obtener asignaciones de un supervisor específico
 * @route   GET /api/v1/asignaciones-supervisor/supervisor/:supervisorId
 * @access  Private
 */
const getAsignacionesBySupervisor = asyncHandler(async (req, res) => {
  const { supervisorId } = req.params;
  const { activa } = req.query;

  // Validar que el supervisor existe
  const supervisor = await Persona.findById(supervisorId);
  if (!supervisor) {
    throw new ApiError(404, 'Supervisor no encontrado');
  }

  const filter = { supervisor: supervisorId };
  if (activa !== undefined) filter.activa = activa === 'true';

  const asignaciones = await AsignacionSupervisor.find(filter)
    .populate('supervisor', 'nombres apellidos cedula')
    .populate({
      path: 'lote',
      select: 'codigo nombre area finca',
      populate: {
        path: 'finca',
        select: 'codigo nombre'
      }
    })
    .sort({ fecha_inicio: -1 });

  res.status(200).json({
    success: true,
    count: asignaciones.length,
    supervisor: {
      id: supervisor._id,
      nombre: `${supervisor.nombres} ${supervisor.apellidos}`,
      cedula: supervisor.cedula
    },
    data: asignaciones
  });
});

/**
 * @desc    Obtener una asignación por ID
 * @route   GET /api/v1/asignaciones-supervisor/:id
 * @access  Private
 */
const getAsignacion = asyncHandler(async (req, res) => {
  const asignacion = await AsignacionSupervisor.findById(req.params.id)
    .populate('supervisor', 'nombres apellidos cedula')
    .populate({
      path: 'lote',
      select: 'codigo nombre area finca',
      populate: {
        path: 'finca',
        select: 'codigo nombre'
      }
    });

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  res.status(200).json({
    success: true,
    data: asignacion
  });
});

/**
 * @desc    Crear una asignación de supervisor
 * @route   POST /api/v1/asignaciones-supervisor
 * @access  Private (Admin, Jefe Operaciones)
 */
const createAsignacion = asyncHandler(async (req, res) => {
  const { supervisor, lote, fecha_inicio, observaciones } = req.body;

  // Validar que el supervisor existe y está activo
  const supervisorDoc = await Persona.findById(supervisor);
  if (!supervisorDoc) {
    throw new ApiError(404, 'Supervisor no encontrado');
  }
  if (supervisorDoc.estado !== 'ACTIVO') {
    throw new ApiError(400, 'El supervisor no está activo');
  }

  // Validar que el lote existe y está activo
  const loteDoc = await Lote.findById(lote);
  if (!loteDoc) {
    throw new ApiError(404, 'Lote no encontrado');
  }
  if (!loteDoc.activo) {
    throw new ApiError(400, 'El lote no está activo');
  }

  // Verificar si ya existe una asignación activa para este lote
  const asignacionExistente = await AsignacionSupervisor.findOne({
    lote: lote,
    activa: true
  });

  if (asignacionExistente) {
    throw new ApiError(409, 'Ya existe una asignación activa para este lote');
  }

  // Crear la asignación
  const asignacion = await AsignacionSupervisor.create({
    supervisor,
    lote,
    fecha_inicio: fecha_inicio || new Date(),
    observaciones,
    activa: true
  });

  // Populate para respuesta
  await asignacion.populate('supervisor', 'nombres apellidos cedula');
  await asignacion.populate({
    path: 'lote',
    select: 'codigo nombre area finca',
    populate: {
      path: 'finca',
      select: 'codigo nombre'
    }
  });

  res.status(201).json({
    success: true,
    message: 'Asignación creada exitosamente',
    data: asignacion
  });
});

/**
 * @desc    Actualizar una asignación
 * @route   PUT /api/v1/asignaciones-supervisor/:id
 * @access  Private (Admin, Jefe Operaciones)
 */
const updateAsignacion = asyncHandler(async (req, res) => {
  const asignacion = await AsignacionSupervisor.findById(req.params.id);

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  // Si se cambia el supervisor, validar que exista
  if (req.body.supervisor && req.body.supervisor !== asignacion.supervisor.toString()) {
    const supervisor = await Persona.findById(req.body.supervisor);
    if (!supervisor) {
      throw new ApiError(404, 'Supervisor no encontrado');
    }
    if (supervisor.estado !== 'ACTIVO') {
      throw new ApiError(400, 'El supervisor no está activo');
    }
  }

  // Si se cambia el lote, validar que exista
  if (req.body.lote) {
    const loteDoc = await Lote.findById(req.body.lote);
    if (!loteDoc) {
      throw new ApiError(404, 'Lote no encontrado');
    }
    if (!loteDoc.activo) {
      throw new ApiError(400, 'El lote no está activo');
    }

    // Verificar que no haya otra asignación activa para ese lote
    if (req.body.lote !== asignacion.lote.toString()) {
      const asignacionExistente = await AsignacionSupervisor.findOne({
        lote: req.body.lote,
        activa: true,
        _id: { $ne: req.params.id }
      });

      if (asignacionExistente) {
        throw new ApiError(409, 'Ya existe una asignación activa para este lote');
      }
    }
  }

  // Actualizar campos permitidos
  const camposPermitidos = ['supervisor', 'lote', 'fecha_inicio', 'observaciones'];
  camposPermitidos.forEach(campo => {
    if (req.body[campo] !== undefined) {
      asignacion[campo] = req.body[campo];
    }
  });

  await asignacion.save();
  await asignacion.populate('supervisor', 'nombres apellidos cedula');
  await asignacion.populate({
    path: 'lote',
    select: 'codigo nombre area finca',
    populate: {
      path: 'finca',
      select: 'codigo nombre'
    }
  });

  res.status(200).json({
    success: true,
    message: 'Asignación actualizada exitosamente',
    data: asignacion
  });
});

/**
 * @desc    Finalizar una asignación
 * @route   POST /api/v1/asignaciones-supervisor/:id/finalizar
 * @access  Private (Admin, Jefe Operaciones)
 */
const finalizarAsignacion = asyncHandler(async (req, res) => {
  // ✅ CORREGIDO: Buscar sin populate primero
  const asignacion = await AsignacionSupervisor.findById(req.params.id);

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  if (!asignacion.activa) {
    throw new ApiError(400, 'La asignación ya está finalizada');
  }

  const { fecha_fin, observaciones } = req.body;

  // ✅ CORREGIDO: Actualizar directamente en lugar de usar el método
  asignacion.activa = false;
  asignacion.fecha_fin = fecha_fin || new Date();
  
  if (observaciones) {
    asignacion.observaciones = observaciones;
  }

  // Guardar cambios
  await asignacion.save();

  // Ahora sí hacer populate para la respuesta
  await asignacion.populate('supervisor', 'nombres apellidos cedula');
  await asignacion.populate({
    path: 'lote',
    select: 'codigo nombre area finca',
    populate: {
      path: 'finca',
      select: 'codigo nombre'
    }
  });

  res.status(200).json({
    success: true,
    message: 'Asignación finalizada exitosamente',
    data: asignacion
  });
});

/**
 * @desc    Eliminar una asignación (solo si no está activa)
 * @route   DELETE /api/v1/asignaciones-supervisor/:id
 * @access  Private (Admin)
 */
const deleteAsignacion = asyncHandler(async (req, res) => {
  const asignacion = await AsignacionSupervisor.findById(req.params.id);

  if (!asignacion) {
    throw new ApiError(404, 'Asignación no encontrada');
  }

  if (asignacion.activa) {
    throw new ApiError(400, 'No se puede eliminar una asignación activa. Primero finalízala.');
  }

  await asignacion.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Asignación eliminada exitosamente'
  });
});

module.exports = {
  getAsignaciones,
  getAsignacionesBySupervisor,
  getAsignacion,
  createAsignacion,
  updateAsignacion,
  finalizarAsignacion,
  deleteAsignacion
};