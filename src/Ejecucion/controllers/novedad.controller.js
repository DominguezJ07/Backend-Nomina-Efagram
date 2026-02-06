const Novedad = require('../models/novedad.model');
const Persona = require('../../Personal/models/persona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todas las novedades
 * @route   GET /api/v1/novedades
 * @access  Private
 */
const getNovedades = asyncHandler(async (req, res) => {
  const { trabajador, tipo, estado, fecha_inicio, fecha_fin } = req.query;

  const filter = {};
  
  // Filtro por trabajador
  if (trabajador) {
    filter.trabajador = trabajador;
  }
  
  // Filtro por tipo
  if (tipo) {
    filter.tipo = tipo;
  }
  
  // Filtro por estado
  if (estado) {
    filter.estado = estado;
  }

  // Filtro por rango de fechas
  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  const novedades = await Novedad.find(filter)
    .populate('trabajador', 'nombre apellido documento')
    .populate('registrado_por', 'nombre apellido')
    .populate('aprobado_por', 'nombre apellido')
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
    .populate('trabajador')
    .populate('registrado_por')
    .populate('aprobado_por');

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  res.status(200).json({
    success: true,
    data: novedad
  });
});

/**
 * @desc    Crear una novedad
 * @route   POST /api/v1/novedades
 * @access  Private (Supervisor, Jefe, Admin, RRHH)
 */
const createNovedad = asyncHandler(async (req, res) => {
  // Intentar obtener persona del usuario autenticado
  // Si no existe, usar el trabajador como registrado_por o el primer ID del body
  let personaRegistrador = await Persona.findOne({ usuario: req.user.id });
  
  // Si no hay persona asociada al usuario, buscar alternativas
  if (!personaRegistrador) {
    // Opción 1: Si viene registrado_por en el body, usarlo
    if (req.body.registrado_por) {
      personaRegistrador = await Persona.findById(req.body.registrado_por);
      if (!personaRegistrador) {
        throw new ApiError(404, 'La persona que registra no existe');
      }
    } 
    // Opción 2: Usar el trabajador como registrador
    else if (req.body.trabajador) {
      personaRegistrador = await Persona.findById(req.body.trabajador);
      if (!personaRegistrador) {
        throw new ApiError(404, 'El trabajador especificado no existe');
      }
    }
    // Opción 3: Buscar cualquier persona en el sistema
    else {
      personaRegistrador = await Persona.findOne();
      if (!personaRegistrador) {
        throw new ApiError(500, 'No hay personas registradas en el sistema. Debe crear al menos una persona primero.');
      }
    }
  }

  // Verificar que el trabajador existe
  const trabajadorExiste = await Persona.findById(req.body.trabajador);
  if (!trabajadorExiste) {
    throw new ApiError(404, 'El trabajador especificado no existe');
  }

  // Generar código único
  const fecha = new Date(req.body.fecha);
  const fechaStr = fecha.toISOString().split('T')[0].replace(/-/g, '');
  const count = await Novedad.countDocuments({
    fecha: {
      $gte: new Date(fecha.setHours(0, 0, 0, 0)),
      $lt: new Date(fecha.setHours(23, 59, 59, 999))
    }
  });
  const codigo = `NOV-${fechaStr}-${String(count + 1).padStart(4, '0')}`;

  // Crear novedad
  const novedadData = {
    ...req.body,
    codigo,
    registrado_por: personaRegistrador._id
  };

  const novedad = await Novedad.create(novedadData);

  // Poblar las referencias para la respuesta
  await novedad.populate([
    { path: 'trabajador', select: 'nombre apellido documento' },
    { path: 'registrado_por', select: 'nombre apellido' }
  ]);

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

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  // No permitir editar si ya está aprobada o rechazada (excepto admin)
  if (novedad.estado !== 'PENDIENTE' && !req.user.roles.includes('ADMIN_SISTEMA')) {
    throw new ApiError(400, 'No se puede editar una novedad que ya fue procesada');
  }

  // Si se está cambiando el trabajador, verificar que existe
  if (req.body.trabajador && req.body.trabajador !== novedad.trabajador.toString()) {
    const trabajadorExiste = await Persona.findById(req.body.trabajador);
    if (!trabajadorExiste) {
      throw new ApiError(404, 'El trabajador especificado no existe');
    }
  }

  novedad = await Novedad.findByIdAndUpdate(
    req.params.id,
    req.body,
    { 
      new: true, 
      runValidators: true 
    }
  ).populate([
    { path: 'trabajador', select: 'nombre apellido documento' },
    { path: 'registrado_por', select: 'nombre apellido' },
    { path: 'aprobado_por', select: 'nombre apellido' }
  ]);

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

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  if (novedad.estado !== 'PENDIENTE') {
    throw new ApiError(400, 'Solo se pueden aprobar novedades pendientes');
  }

  // Intentar obtener persona del usuario autenticado
  let personaAprobador = await Persona.findOne({ usuario: req.user.id });
  
  // Si no hay persona asociada al usuario, buscar alternativas
  if (!personaAprobador) {
    // Opción 1: Si viene aprobado_por en el body, usarlo
    if (req.body.aprobado_por) {
      personaAprobador = await Persona.findById(req.body.aprobado_por);
      if (!personaAprobador) {
        throw new ApiError(404, 'La persona que aprueba no existe');
      }
    }
    // Opción 2: Usar el registrado_por de la novedad
    else if (novedad.registrado_por) {
      personaAprobador = await Persona.findById(novedad.registrado_por);
      if (!personaAprobador) {
        throw new ApiError(404, 'No se encontró una persona válida para aprobar');
      }
    }
    // Opción 3: Buscar cualquier persona
    else {
      personaAprobador = await Persona.findOne();
      if (!personaAprobador) {
        throw new ApiError(500, 'No hay personas registradas en el sistema');
      }
    }
  }

  // Usar el método del modelo para aprobar
  await novedad.aprobar(personaAprobador._id);

  // Poblar las referencias
  await novedad.populate([
    { path: 'trabajador', select: 'nombre apellido documento' },
    { path: 'registrado_por', select: 'nombre apellido' },
    { path: 'aprobado_por', select: 'nombre apellido' }
  ]);

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

  if (!motivo || motivo.trim() === '') {
    throw new ApiError(400, 'El motivo de rechazo es obligatorio');
  }

  const novedad = await Novedad.findById(req.params.id);

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  if (novedad.estado !== 'PENDIENTE') {
    throw new ApiError(400, 'Solo se pueden rechazar novedades pendientes');
  }

  // Intentar obtener persona del usuario autenticado
  let personaAprobador = await Persona.findOne({ usuario: req.user.id });
  
  // Si no hay persona asociada al usuario, buscar alternativas
  if (!personaAprobador) {
    // Opción 1: Si viene aprobado_por en el body, usarlo
    if (req.body.aprobado_por) {
      personaAprobador = await Persona.findById(req.body.aprobado_por);
      if (!personaAprobador) {
        throw new ApiError(404, 'La persona que rechaza no existe');
      }
    }
    // Opción 2: Usar el registrado_por de la novedad
    else if (novedad.registrado_por) {
      personaAprobador = await Persona.findById(novedad.registrado_por);
      if (!personaAprobador) {
        throw new ApiError(404, 'No se encontró una persona válida para rechazar');
      }
    }
    // Opción 3: Buscar cualquier persona
    else {
      personaAprobador = await Persona.findOne();
      if (!personaAprobador) {
        throw new ApiError(500, 'No hay personas registradas en el sistema');
      }
    }
  }

  // Usar el método del modelo para rechazar
  await novedad.rechazar(personaAprobador._id, motivo);

  // Poblar las referencias
  await novedad.populate([
    { path: 'trabajador', select: 'nombre apellido documento' },
    { path: 'registrado_por', select: 'nombre apellido' },
    { path: 'aprobado_por', select: 'nombre apellido' }
  ]);

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

  if (!novedad) {
    throw new ApiError(404, 'Novedad no encontrada');
  }

  // Opcional: validar que no se puedan eliminar novedades aprobadas
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

  // Verificar que el trabajador existe
  const trabajador = await Persona.findById(req.params.trabajadorId);
  if (!trabajador) {
    throw new ApiError(404, 'Trabajador no encontrado');
  }

  const filter = { trabajador: req.params.trabajadorId };

  // Filtro por rango de fechas
  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  const novedades = await Novedad.find(filter)
    .populate('registrado_por', 'nombre apellido')
    .populate('aprobado_por', 'nombre apellido')
    .sort({ fecha: -1 });

  res.status(200).json({
    success: true,
    count: novedades.length,
    data: novedades
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
  getNovedadesByTrabajador
};