// ==========================================
// CONTROLADOR: REGISTRO DIARIO PROGRAMACIÓN — CORREGIDO
// ==========================================

const mongoose                   = require('mongoose');
const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const Programacion               = require('../models/programacion.model');
const cascadaProgresoService     = require('../services/cascadaProgreso.service');

const normalizarFechaUTC = (fecha) => {
  const d = new Date(fecha);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const calcularEstadoRegistro = ({
  cantidad_ejecutada = 0,
  tiempo_detenido = 0,
  motivo_detencion = null,
  motivo_detencion_otro = '',
}) => {
  const cantidad = Number(cantidad_ejecutada) || 0;
  const tiempo = Number(tiempo_detenido) || 0;
  const motivo = motivo_detencion || null;
  const detalle = String(motivo_detencion_otro || '').trim();

  if (cantidad > 0) return 'COMPLETADO';
  if (tiempo > 0 && (motivo || detalle)) return 'COMPLETADO';

  return 'PENDIENTE';
};

const normalizarMotivoDetencion = (motivo) => {
  if (!motivo) return null;

  const limpio = String(motivo).trim();

  const mapa = {
    LLUVIA: 'lluvia',
    TRAFICO: 'trafico',
    FALLA_EQUIPO: 'falla_equipo',
    ACCIDENTE: 'accidente',
    ORDEN_CLIENTE: 'orden_cliente',
    DESCANSO: 'descanso',
    OTRO: 'otro',

    lluvia: 'lluvia',
    trafico: 'trafico',
    falla_equipo: 'falla_equipo',
    accidente: 'accidente',
    orden_cliente: 'orden_cliente',
    descanso: 'descanso',
    otro: 'otro',
  };

  return mapa[limpio] || mapa[limpio.toUpperCase()] || null;
};

// Helper: recalcular y actualizar totales de la programación
const recalcularProgramacion = async (programacion_id) => {
  const registros = await RegistroDiarioProgramacion.find({ programacion: programacion_id });
  const totalEjecutado = registros.reduce((s, r) => s + (r.cantidad_ejecutada || 0), 0);

  const prog = await Programacion.findById(programacion_id);
  if (!prog) return;

  const porcentaje = prog.cantidad_proyectada > 0
    ? Math.round((totalEjecutado / prog.cantidad_proyectada) * 100)
    : 0;

  const completados = registros.filter(r => r.estado === 'COMPLETADO').length;
  const nuevoEstado = (completados === 7 && prog.estado === 'ACTIVA') ? 'COMPLETADA' : prog.estado;

  await Programacion.updateOne(
    { _id: programacion_id },
    {
      $set: {
        cantidad_ejecutada_total: totalEjecutado,
        porcentaje_cumplimiento: porcentaje,
        estado: nuevoEstado,
      },
    }
  );
};

// ── 1. OBTENER TODOS LOS REGISTROS ──────────────────────────────────
exports.getRegistrosDiarios = async (req, res) => {
  try {
    const { programacion_id, estado, skip = 0, limit = 50 } = req.query;
    const filtro = {};
    if (programacion_id) filtro.programacion = programacion_id;
    if (estado) filtro.estado = estado;

    const total = await RegistroDiarioProgramacion.countDocuments(filtro);
    const registros = await RegistroDiarioProgramacion.find(filtro)
      .populate('programacion', 'contrato')
      .populate('registrado_por', 'nombre email')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ fecha: -1 });

    res.json({
      success: true,
      data: { registros, pagination: { total, skip: parseInt(skip), limit: parseInt(limit) } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener registros', error: error.message });
  }
};

// ── 2. OBTENER REGISTRO POR ID ───────────────────────────────────────
exports.getRegistroDiarioById = async (req, res) => {
  try {
    const registro = await RegistroDiarioProgramacion.findById(req.params.id)
      .populate('programacion')
      .populate('registrado_por', 'nombre email')
      .populate('validado_por', 'nombre email');

    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }
    res.json({ success: true, data: registro });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// ── 3. CREAR REGISTRO DIARIO ─────────────────────────────────────────
exports.createRegistroDiario = async (req, res) => {
  try {
    const {
      programacion_id,
      fecha,
      cantidad_ejecutada,
      observaciones,
      tiempo_detenido,
      motivo_detencion,
      motivo_detencion_otro,
    } = req.body;
    const usuario_id = req.user?.id || null;

    const programacion = await Programacion.findById(programacion_id);
    if (!programacion) {
      return res.status(404).json({ success: false, message: 'Programación no encontrada' });
    }

    const motivoNormalizado = normalizarMotivoDetencion(motivo_detencion);

    if ((Number(tiempo_detenido) || 0) > 0 && !motivoNormalizado && !String(motivo_detencion_otro || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar el motivo de detención cuando hay tiempo detenido',
      });
    }

    if (motivoNormalizado === 'otro' && !String(motivo_detencion_otro || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar el detalle cuando el motivo es OTRO',
      });
    }

    const estadoCalculado = calcularEstadoRegistro({
      cantidad_ejecutada,
      tiempo_detenido,
      motivo_detencion: motivoNormalizado,
      motivo_detencion_otro,
    });

    const registro = await RegistroDiarioProgramacion.create({
      programacion: programacion_id,
      fecha: new Date(fecha),
      cantidad_ejecutada: cantidad_ejecutada || 0,
      observaciones: observaciones || '',
      tiempo_detenido: tiempo_detenido || 0,
      motivo_detencion: (Number(tiempo_detenido) || 0) > 0 ? (motivoNormalizado || null) : null,
      motivo_detencion_otro: (Number(tiempo_detenido) || 0) > 0 ? (motivo_detencion_otro || '') : '',
      estado: estadoCalculado,
      registrado_por: usuario_id,
    });

    // 🔥 DISPARA CASCADA: Programación → Contrato → Subproyecto → Proyecto
    await cascadaProgresoService.dispararCascada(programacion_id);

    res.status(201).json({ success: true, message: 'Registro creado', data: registro });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Ya existe un registro para este día' });
    }
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── 4. ACTUALIZAR UN REGISTRO ────────────────────────────────────────
exports.updateRegistroDiario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cantidad_ejecutada,
      observaciones,
      tiempo_detenido,
      motivo_detencion,
      motivo_detencion_otro,
    } = req.body;

    const registroActual = await RegistroDiarioProgramacion.findById(id);
    if (!registroActual) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    const cantidad = cantidad_ejecutada !== undefined
      ? Math.max(0, Number(cantidad_ejecutada) || 0)
      : registroActual.cantidad_ejecutada;

    const tiempo = tiempo_detenido !== undefined
      ? Math.max(0, Number(tiempo_detenido) || 0)
      : registroActual.tiempo_detenido;

    const motivo = tiempo === 0
      ? null
      : (
          motivo_detencion !== undefined
            ? normalizarMotivoDetencion(motivo_detencion)
            : (registroActual.motivo_detencion || null)
        );

    const detalleOtro = tiempo === 0
      ? ''
      : (
          motivo_detencion_otro !== undefined
            ? (motivo_detencion_otro || '')
            : (registroActual.motivo_detencion_otro || '')
        );

    if (tiempo > 0 && !motivo && !String(detalleOtro || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar el motivo de detención cuando hay tiempo detenido',
      });
    }

    if (motivo === 'otro' && !String(detalleOtro || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar el detalle cuando el motivo es OTRO',
      });
    }

    const estadoCalculado = calcularEstadoRegistro({
      cantidad_ejecutada: cantidad,
      tiempo_detenido: tiempo,
      motivo_detencion: motivo,
      motivo_detencion_otro: detalleOtro,
    });

    const update = {
      cantidad_ejecutada: cantidad,
      tiempo_detenido: tiempo,
      motivo_detencion: motivo,
      motivo_detencion_otro: detalleOtro,
      estado: estadoCalculado,
    };

    if (observaciones !== undefined) {
      update.observaciones = observaciones;
    }

    const registro = await RegistroDiarioProgramacion.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: false }
    );

    // 🔥 DISPARA CASCADA: Programación → Contrato → Subproyecto → Proyecto
    await cascadaProgresoService.dispararCascada(registro.programacion);

    res.json({
      success: true,
      message: 'Registro actualizado',
      data: registro,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── 5. ACTUALIZAR MÚLTIPLES REGISTROS (MODAL) ────────────────────────
exports.updateMultiplesRegistros = async (req, res) => {
  try {
    const { registros } = req.body;

    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un array de registros' });
    }

    let programacion_id = null;
    const resultados = [];

    for (const item of registros) {
      if (!item.id) {
        resultados.push({ id: item.id, success: false, message: 'ID requerido' });
        continue;
      }

      const registroActual = await RegistroDiarioProgramacion.findById(item.id);
      if (!registroActual) {
        resultados.push({ id: item.id, success: false, message: 'Registro no encontrado' });
        continue;
      }

      const cantidad = item.cantidad_ejecutada !== undefined
        ? Math.max(0, Number(item.cantidad_ejecutada) || 0)
        : registroActual.cantidad_ejecutada;

      const tiempo = item.tiempo_detenido !== undefined
        ? Math.max(0, Number(item.tiempo_detenido) || 0)
        : registroActual.tiempo_detenido;

      const motivo = tiempo === 0
        ? null
        : (
            item.motivo_detencion !== undefined
              ? normalizarMotivoDetencion(item.motivo_detencion)
              : (registroActual.motivo_detencion || null)
          );

      const detalleOtro = tiempo === 0
        ? ''
        : (
            item.motivo_detencion_otro !== undefined
              ? (item.motivo_detencion_otro || '')
              : (registroActual.motivo_detencion_otro || '')
          );

      if (tiempo > 0 && !motivo && !String(detalleOtro || '').trim()) {
        resultados.push({
          id: item.id,
          success: false,
          message: 'Debe especificar el motivo de detención cuando hay tiempo detenido',
        });
        continue;
      }

      if (motivo === 'otro' && !String(detalleOtro || '').trim()) {
        resultados.push({
          id: item.id,
          success: false,
          message: 'Debe especificar el detalle cuando el motivo es OTRO',
        });
        continue;
      }

      const estadoCalculado = calcularEstadoRegistro({
        cantidad_ejecutada: cantidad,
        tiempo_detenido: tiempo,
        motivo_detencion: motivo,
        motivo_detencion_otro: detalleOtro,
      });

      const update = {
        cantidad_ejecutada: cantidad,
        tiempo_detenido: tiempo,
        motivo_detencion: motivo,
        motivo_detencion_otro: detalleOtro,
        estado: estadoCalculado,
      };

      if (item.observaciones !== undefined) {
        update.observaciones = item.observaciones;
      }

      const registro = await RegistroDiarioProgramacion.findByIdAndUpdate(
        item.id,
        { $set: update },
        { new: true, runValidators: false }
      );

      if (!registro) {
        resultados.push({ id: item.id, success: false, message: 'Registro no encontrado' });
        continue;
      }

      if (!programacion_id) programacion_id = registro.programacion;

      resultados.push({
        id: registro._id,
        success: true,
        cantidad_ejecutada: registro.cantidad_ejecutada,
        estado: registro.estado,
        observaciones: registro.observaciones,
        tiempo_detenido: registro.tiempo_detenido,
        motivo_detencion: registro.motivo_detencion,
        motivo_detencion_otro: registro.motivo_detencion_otro,
      });
    }

    if (programacion_id) {
      await recalcularProgramacion(programacion_id);
    }

    const errores = resultados.filter(r => !r.success);

    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errores.map(err => ({
          field: `registros[${resultados.findIndex(r => r.id?.toString() === err.id?.toString())}].motivo_detencion`,
          message: err.message,
          value: null,
        })),
        data: resultados,
      });
    }

    res.json({
      success: true,
      message: 'Registros actualizados exitosamente',
      data: resultados,
    });
  } catch (error) {
    console.error('Error updateMultiplesRegistros:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al actualizar registros',
      error: error.message,
    });
  }
};

// ── 6. REGISTROS DE SEMANA COMPLETA ──────────────────────────────────
exports.getRegistrosSemana = async (req, res) => {
  try {
    const { programacion_id } = req.params;

    const programacion = await Programacion.findById(programacion_id);
    if (!programacion) {
      return res.status(404).json({ success: false, message: 'Programación no encontrada' });
    }

    const registros = await RegistroDiarioProgramacion.find({ programacion: programacion_id })
      .sort({ fecha: 1 });

    const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hoy = normalizarFechaUTC(new Date());

    const dias = registros.map((r, idx) => {
      const fechaNormalizada = normalizarFechaUTC(r.fecha);
      const es_hoy = fechaNormalizada.getTime() === hoy.getTime();
      const es_pasado = fechaNormalizada.getTime() < hoy.getTime();
      const es_futuro = fechaNormalizada.getTime() > hoy.getTime();

      return {
        _id: r._id,
        numero_dia: idx + 1,
        dia_semana: DIAS[new Date(r.fecha).getUTCDay()],
        fecha: r.fecha,
        cantidad_ejecutada: r.cantidad_ejecutada,
        estado: r.estado,
        observaciones: r.observaciones,
        tiempo_detenido: r.tiempo_detenido,
        motivo_detencion: r.motivo_detencion,
        motivo_detencion_otro: r.motivo_detencion_otro,
        es_hoy,
        es_pasado,
        es_futuro,
      };
    });

    const registroHoy = dias.find((d) => d.es_hoy) || null;

    res.json({
      success: true,
      data: {
        programacion_id,
        cantidad_proyectada: programacion.cantidad_proyectada,
        cantidad_ejecutada_total: programacion.cantidad_ejecutada_total,
        porcentaje_cumplimiento: programacion.porcentaje_cumplimiento,
        hoy: hoy.toISOString(),
        registro_hoy_pendiente: registroHoy ? registroHoy.estado !== 'COMPLETADO' : false,
        registro_hoy_estado: registroHoy ? registroHoy.estado : null,
        dias,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// ── 7. VALIDAR REGISTRO ──────────────────────────────────────────────
exports.validarRegistro = async (req, res) => {
  try {
    const usuario_id = req.user?.id || null;

    const registro = await RegistroDiarioProgramacion.findByIdAndUpdate(
      req.params.id,
      { $set: { validado: true, validado_por: usuario_id, fecha_validacion: new Date() } },
      { new: true }
    );

    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }
    res.json({ success: true, message: 'Registro validado', data: registro });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── 8. ELIMINAR REGISTRO ─────────────────────────────────────────────
exports.deleteRegistroDiario = async (req, res) => {
  try {
    const registro = await RegistroDiarioProgramacion.findByIdAndDelete(req.params.id);
    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }
    await recalcularProgramacion(registro.programacion);
    res.json({ success: true, message: 'Registro eliminado', data: registro });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── 9. ESTADÍSTICAS ──────────────────────────────────────────────────
exports.getEstadisticas = async (req, res) => {
  try {
    const registros = await RegistroDiarioProgramacion.find({
      programacion: req.params.programacion_id,
    });

    res.json({
      success: true,
      data: {
        total_registros: registros.length,
        completados: registros.filter(r => r.estado === 'COMPLETADO').length,
        pendientes: registros.filter(r => r.estado === 'PENDIENTE').length,
        parciales: registros.filter(r => r.estado === 'PARCIAL').length,
        cantidad_total: registros.reduce((s, r) => s + (r.cantidad_ejecutada || 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};