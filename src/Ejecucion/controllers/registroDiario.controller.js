const RegistroDiario = require('../models/registroDiario.model');
const registroDiarioService = require('../services/registroDiario.service');
const semanaService = require('../../ControlSemanal/services/semana.service');
const Persona = require('../../Personal/models/persona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los registros diarios
 * @route   GET /api/v1/registros-diarios
 * @access  Private
 */
const getRegistros = asyncHandler(async (req, res) => {
  const { trabajador, pal, fecha_inicio, fecha_fin, estado } = req.query;

  console.log('Query params:', req.query);
  console.log('Trabajador:', trabajador);

  const filter = {};
  if (trabajador) filter.trabajador = trabajador;
  if (pal) filter.proyecto_actividad_lote = pal;
  if (estado) filter.estado = estado;

  console.log('Filter:', filter);

  if (fecha_inicio && fecha_fin) {
    filter.fecha = {
      $gte: new Date(fecha_inicio),
      $lte: new Date(fecha_fin)
    };
  }

  const registros = await RegistroDiario.find(filter)
    .populate('trabajador')
    .populate('proyecto_actividad_lote')
    .populate('cuadrilla')
    .populate('registrado_por')
    .sort({ fecha: -1 });

  console.log('Registros encontrados:', registros.length);

  res.status(200).json({
    success: true,
    count: registros.length,
    data: registros
  });
});

/**
 * @desc    Obtener un registro diario por ID
 * @route   GET /api/v1/registros-diarios/:id
 * @access  Private
 */
const getRegistro = asyncHandler(async (req, res) => {
  const registro = await RegistroDiario.findById(req.params.id)
    .populate('trabajador')
    .populate('proyecto_actividad_lote')
    .populate('cuadrilla')
    .populate('registrado_por')
    .populate('editado_por');

  if (!registro) {
    throw new ApiError(404, 'Registro no encontrado');
  }

  res.status(200).json({
    success: true,
    data: registro
  });
});

/**
 * @desc    Crear registro diario
 * @route   POST /api/v1/registros-diarios
 * @access  Private (Admin, Jefe, Supervisor)
 */
const createRegistro = asyncHandler(async (req, res) => {
  const { fecha, trabajador, proyecto_actividad_lote, cuadrilla, cantidad_ejecutada, horas_trabajadas, hora_inicio, hora_fin, observaciones, registrado_por } = req.body;

  // Obtener persona del usuario autenticado (OPCIONAL)
  const persona = await Persona.findOne({ usuario: req.user.id });
  const registradoPorId = persona ? persona._id : (registrado_por || null);

  // Verificar acceso del supervisor (si es supervisor)
  if (req.user.roles.includes('SUPERVISOR') && persona) {
    const tieneAcceso = await registroDiarioService.verificarAccesoSupervisor(
      persona._id,
      proyecto_actividad_lote
    );

    if (!tieneAcceso) {
      throw new ApiError(403, 'No tiene acceso a este PAL');
    }
  }

  // Validar que no exista registro duplicado
  await registroDiarioService.validarRegistroUnico(fecha, trabajador, proyecto_actividad_lote);

  // Generar código
  const count = await RegistroDiario.countDocuments();
  const codigo = `REG-${new Date(fecha).toISOString().split('T')[0].replace(/-/g, '')}-${String(count + 1).padStart(4, '0')}`;

  // Crear registro
  const registro = await RegistroDiario.create({
    codigo,
    fecha,
    trabajador,
    proyecto_actividad_lote,
    cuadrilla,
    cantidad_ejecutada,
    horas_trabajadas,
    hora_inicio,
    hora_fin,
    registrado_por: registradoPorId,
    observaciones
  });

  // Actualizar cantidad ejecutada del PAL
  await registroDiarioService.actualizarCantidadPAL(proyecto_actividad_lote);

  // Obtener o crear semana operativa
  //const semanaService = require('../services/semana.service');
  //await semanaService.getOrCreateSemana(new Date(fecha), proyecto_actividad_lote);

  await registro.populate(['trabajador', 'proyecto_actividad_lote', 'cuadrilla', 'registrado_por']);

  res.status(201).json({
    success: true,
    message: 'Registro diario creado exitosamente',
    data: registro
  });
});

/**
 * @desc    Actualizar registro diario
 * @route   PUT /api/v1/registros-diarios/:id
 * @access  Private (Admin, Jefe, Supervisor)
 */
const updateRegistro = asyncHandler(async (req, res) => {
  let registro = await RegistroDiario.findById(req.params.id);

  if (!registro) {
    throw new ApiError(404, 'Registro no encontrado');
  }

  // Obtener persona (OPCIONAL)
  const persona = await Persona.findOne({ usuario: req.user.id });
  
  // Verificar permisos de edición
  if (persona) {
    const resultado = registroDiarioService.puedeEditar(registro, req.user.roles);

    if (!resultado.puede) {
      throw new ApiError(403, resultado.motivo);
    }
  }

  const { cantidad_ejecutada, horas_trabajadas, hora_inicio, hora_fin, observaciones, motivo_edicion } = req.body;

  // Actualizar campos
  if (cantidad_ejecutada !== undefined) registro.cantidad_ejecutada = cantidad_ejecutada;
  if (horas_trabajadas !== undefined) registro.horas_trabajadas = horas_trabajadas;
  if (hora_inicio !== undefined) registro.hora_inicio = hora_inicio;
  if (hora_fin !== undefined) registro.hora_fin = hora_fin;
  if (observaciones !== undefined) registro.observaciones = observaciones;

  // Marcar como editado
  if (persona && motivo_edicion) {
    registro.editado = true;
    registro.fecha_edicion = new Date();
    registro.editado_por = persona._id;
    registro.motivo_edicion = motivo_edicion;
  }

  await registro.save();

  // Actualizar cantidad del PAL
  await registroDiarioService.actualizarCantidadPAL(registro.proyecto_actividad_lote);

  await registro.populate(['trabajador', 'proyecto_actividad_lote', 'cuadrilla', 'registrado_por', 'editado_por']);

  res.status(200).json({
    success: true,
    message: 'Registro actualizado exitosamente',
    data: registro
  });
});

/**
 * @desc    Eliminar un registro diario
 * @route   DELETE /api/v1/registros-diarios/:id
 * @access  Private (Admin, Jefe)
 */
const deleteRegistro = asyncHandler(async (req, res) => {
  const registro = await registroDiarioService.validateRegistroExists(req.params.id);

  const palId = registro.proyecto_actividad_lote;
  await registro.deleteOne();

  // Actualizar cantidad del PAL
  await registroDiarioService.actualizarCantidadPAL(palId);

  res.status(200).json({
    success: true,
    message: 'Registro eliminado exitosamente'
  });
});

/**
 * @desc    Obtener resumen de trabajador en un período
 * @route   GET /api/v1/registros-diarios/resumen/:trabajadorId
 * @access  Private
 */
const getResumenTrabajador = asyncHandler(async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    throw new ApiError(400, 'Las fechas de inicio y fin son obligatorias');
  }

  const resumen = await registroDiarioService.getResumenTrabajador(
    req.params.trabajadorId,
    new Date(fecha_inicio),
    new Date(fecha_fin)
  );

  res.status(200).json({
    success: true,
    data: resumen
  });
});

/**
 * @desc    Obtener registros de una semana
 * @route   GET /api/v1/registros-diarios/semana/:semanaId
 * @access  Private
 */
const getRegistrosSemana = asyncHandler(async (req, res) => {
  const SemanaOperativa = require('../../ControlSemanal/models/semanaOperativa.model');
  const semana = await SemanaOperativa.findById(req.params.semanaId);

  if (!semana) {
    throw new ApiError(404, 'Semana no encontrada');
  }

  const registros = await registroDiarioService.getRegistrosSemana(
    semana.fecha_inicio,
    semana.fecha_fin
  );

  res.status(200).json({
    success: true,
    count: registros.length,
    semana: {
      codigo: semana.codigo,
      fecha_inicio: semana.fecha_inicio,
      fecha_fin: semana.fecha_fin,
      estado: semana.estado
    },
    data: registros
  });
});

module.exports = {
  getRegistros,
  getRegistro,
  createRegistro,
  updateRegistro,
  deleteRegistro,
  getResumenTrabajador,
  getRegistrosSemana
};