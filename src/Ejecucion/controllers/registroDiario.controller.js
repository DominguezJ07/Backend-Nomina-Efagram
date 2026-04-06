const RegistroDiario = require('../models/registroDiario.model');
const registroDiarioService = require('../services/registroDiario.service');
const semanaService = require('../../ControlSemanal/services/semana.service');
const Persona = require('../../Personal/models/persona.model');
const { asyncHandler, ApiError } = require('../../middlewares/errorHandler');

/**
 * @desc    Obtener todos los registros diarios
 */
const getRegistros = asyncHandler(async (req, res) => {
  const { trabajador, pal, fecha_inicio, fecha_fin, estado, subproyecto } = req.query;

  const filter = {};
  if (trabajador) filter.trabajador = trabajador;
  if (pal) filter.proyecto_actividad_lote = pal;
  if (estado) filter.estado = estado;
  if (subproyecto) filter.subproyecto = subproyecto;

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
    .populate('subproyecto') // 🔥 NUEVO
    .populate('registrado_por')
    .sort({ fecha: -1 });

  res.status(200).json({
    success: true,
    count: registros.length,
    data: registros
  });
});

/**
 * @desc    Obtener un registro por ID
 */
const getRegistro = asyncHandler(async (req, res) => {
  const registro = await RegistroDiario.findById(req.params.id)
    .populate('trabajador')
    .populate({
      path: 'proyecto_actividad_lote',
      populate: [
        { path: 'actividad' },
        { path: 'lote' }
      ]
    })
    .populate({
      path: 'cuadrilla',
      populate: [
        { path: 'supervisor' },
        { path: 'miembros.persona' }
      ]
    })
    .populate('subproyecto') // 🔥 NUEVO
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
 */
const createRegistro = asyncHandler(async (req, res) => {
  const {
    fecha,
    subproyecto, // 🔥 NUEVO
    trabajador,
    proyecto_actividad_lote,
    cuadrilla,
    cantidad_ejecutada,
    horas_trabajadas,
    hora_inicio,
    hora_fin,
    observaciones,
    registrado_por,
    estado
  } = req.body;

  // 🔥 VALIDACIÓN CLAVE
  if (!subproyecto) {
    throw new ApiError(400, 'El subproyecto es obligatorio');
  }

  const persona = await Persona.findOne({ usuario: req.user.id });
  const registradoPorId = persona ? persona._id : (registrado_por || null);

  if (req.user.roles.includes('SUPERVISOR') && persona) {
    await registroDiarioService.verificarAccesoSupervisor(
      persona._id,
      proyecto_actividad_lote
    );
  }

  if (trabajador) {
    await registroDiarioService.validarRegistroUnico(
      fecha,
      trabajador,
      proyecto_actividad_lote
    );
  }

  const count = await RegistroDiario.countDocuments();
  const codigo = `REG-${new Date(fecha).toISOString().split('T')[0].replace(/-/g, '')}-${String(count + 1).padStart(4, '0')}`;

  const registro = await RegistroDiario.create({
    codigo,
    fecha,
    subproyecto, // 🔥 CLAVE
    trabajador: trabajador || null,
    proyecto_actividad_lote,
    cuadrilla,
    cantidad_ejecutada,
    horas_trabajadas,
    hora_inicio,
    hora_fin,
    registrado_por: registradoPorId,
    estado,
    observaciones
  });

  await registroDiarioService.actualizarCantidadPAL(proyecto_actividad_lote);

  await registro.populate([
    'trabajador',
    'proyecto_actividad_lote',
    'subproyecto', // 🔥 NUEVO
    { path: 'cuadrilla', populate: [{ path: 'supervisor' }, { path: 'miembros.persona' }] },
    'registrado_por'
  ]);

  res.status(201).json({
    success: true,
    message: 'Registro diario creado exitosamente',
    data: registro
  });
});

/**
 * @desc    Actualizar registro diario
 */
const updateRegistro = asyncHandler(async (req, res) => {
  let registro = await RegistroDiario.findById(req.params.id);

  if (!registro) {
    throw new ApiError(404, 'Registro no encontrado');
  }

  const persona = await Persona.findOne({ usuario: req.user.id });

  if (persona) {
    const resultado = registroDiarioService.puedeEditar(registro, req.user.roles);
    if (!resultado.puede) {
      throw new ApiError(403, resultado.motivo);
    }
  }

  const {
    cantidad_ejecutada,
    horas_trabajadas,
    hora_inicio,
    hora_fin,
    observaciones,
    motivo_edicion,
    estado
  } = req.body;

  if (cantidad_ejecutada !== undefined) registro.cantidad_ejecutada = cantidad_ejecutada;
  if (horas_trabajadas !== undefined)   registro.horas_trabajadas = horas_trabajadas;
  if (hora_inicio !== undefined)        registro.hora_inicio = hora_inicio;
  if (hora_fin !== undefined)           registro.hora_fin = hora_fin;
  if (observaciones !== undefined)      registro.observaciones = observaciones;
  if (estado !== undefined)             registro.estado = estado;

  if (motivo_edicion) {
    registro.editado = true;
    registro.fecha_edicion = new Date();
    registro.editado_por = persona ? persona._id : null;
    registro.motivo_edicion = motivo_edicion;
  }

  await registro.save();

  await registroDiarioService.actualizarCantidadPAL(registro.proyecto_actividad_lote);

  await registro.populate([
    'trabajador',
    'proyecto_actividad_lote',
    'subproyecto', // 🔥 NUEVO
    { path: 'cuadrilla', populate: [{ path: 'supervisor' }, { path: 'miembros.persona' }] },
    'registrado_por',
    'editado_por'
  ]);

  res.status(200).json({
    success: true,
    message: 'Registro actualizado exitosamente',
    data: registro
  });
});

/**
 * @desc    Eliminar registro
 */
const deleteRegistro = asyncHandler(async (req, res) => {
  const registro = await registroDiarioService.validateRegistroExists(req.params.id);
  const palId = registro.proyecto_actividad_lote;

  await registro.deleteOne();
  await registroDiarioService.actualizarCantidadPAL(palId);

  res.status(200).json({
    success: true,
    message: 'Registro eliminado exitosamente'
  });
});

/**
 * @desc    Resumen por trabajador
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
 * @desc    Registros por semana
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
