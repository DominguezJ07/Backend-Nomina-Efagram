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

  const filter = {};
  if (trabajador) filter.trabajador = trabajador;
  if (pal) filter.proyecto_actividad_lote = pal;
  if (estado) filter.estado = estado;

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
 * @desc    Crear un registro diario
 * @route   POST /api/v1/registros-diarios
 * @access  Private (Supervisor, Jefe, Admin)
 */
const createRegistro = asyncHandler(async (req, res) => {
  // Obtener persona del usuario autenticado
  const persona = await Persona.findOne({ usuario: req.user.id });
  if (!persona) {
    throw new ApiError(404, 'Persona no encontrada para el usuario autenticado');
  }

  // Verificar que el supervisor tenga acceso al lote
  await registroDiarioService.verificarAccesoSupervisor(persona._id, req.body.proyecto_actividad_lote);

  // Validar que no exista un registro duplicado
  await registroDiarioService.validarRegistroUnico(
    req.body.fecha,
    req.body.trabajador,
    req.body.proyecto_actividad_lote
  );

  // Generar código único
  const fecha = new Date(req.body.fecha);
  const fechaStr = fecha.toISOString().split('T')[0].replace(/-/g, '');
  const count = await RegistroDiario.countDocuments({ fecha });
  const codigo = `RD-${fechaStr}-${String(count + 1).padStart(4, '0')}`;

  // Crear registro
  const registro = await RegistroDiario.create({
    ...req.body,
    codigo,
    registrado_por: persona._id
  });

  // Actualizar cantidad ejecutada del PAL
  await registroDiarioService.actualizarCantidadPAL(req.body.proyecto_actividad_lote);

  // Crear o actualizar semana operativa
  await semanaService.getOrCreateSemana(req.body.fecha);

  await registro.populate(['trabajador', 'proyecto_actividad_lote', 'cuadrilla', 'registrado_por']);

  res.status(201).json({
    success: true,
    message: 'Registro creado exitosamente',
    data: registro
  });
});

/**
 * @desc    Actualizar un registro diario
 * @route   PUT /api/v1/registros-diarios/:id
 * @access  Private (Supervisor hasta jueves, Jefe después)
 */
const updateRegistro = asyncHandler(async (req, res) => {
  const registro = await registroDiarioService.validateRegistroExists(req.params.id);

  // Verificar permisos de edición
  const validacion = registroDiarioService.puedeEditar(registro, req.user.roles);
  if (!validacion.puede) {
    throw new ApiError(403, validacion.motivo);
  }

  // Obtener persona del usuario
  const persona = await Persona.findOne({ usuario: req.user.id });

  // Marcar como editado si es una modificación sustancial
  if (req.body.cantidad_ejecutada && req.body.cantidad_ejecutada !== registro.cantidad_ejecutada) {
    await registro.marcarEditado(persona._id, req.body.motivo_edicion || 'Corrección de cantidad');
  }

  // Actualizar campos
  Object.assign(registro, req.body);
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