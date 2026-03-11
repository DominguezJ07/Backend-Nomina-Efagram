// ==========================================
// CONTROLADOR: REGISTRO DIARIO PROGRAMACIÓN — CORREGIDO
// ==========================================
// BUG CRÍTICO CORREGIDO:
//
// "Error al actualizar registros" al guardar el modal:
//
//   La cadena de llamadas era:
//   registro.save()
//     → post('save') hook en RegistroDiarioProgramacion
//       → programacion.actualizarPorcentaje()
//         → programacion.save()
//           → pre('save') de Programacion (hook de duplicados)
//             → findOne() dentro del hook → ERROR o deadlock
//
//   FIX: Usar findByIdAndUpdate() en lugar de save() para bypassear
//   todos los hooks. Calcular y actualizar el porcentaje manualmente
//   con una sola operación updateOne() al final, sin disparar hooks.

const mongoose                   = require('mongoose');
const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const Programacion               = require('../models/programacion.model');

// Helper: recalcular y actualizar totales de la programación (sin hooks)
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

  // ✅ updateOne bypasea todos los pre-save hooks
  await Programacion.updateOne(
    { _id: programacion_id },
    {
      $set: {
        cantidad_ejecutada_total: totalEjecutado,
        porcentaje_cumplimiento:  porcentaje,
        estado:                   nuevoEstado,
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
    if (estado)          filtro.estado        = estado;

    const total    = await RegistroDiarioProgramacion.countDocuments(filtro);
    const registros = await RegistroDiarioProgramacion.find(filtro)
      .populate('programacion',  'contrato')
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
      .populate('validado_por',   'nombre email');

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
    const { programacion_id, fecha, cantidad_ejecutada, observaciones } = req.body;
    const usuario_id = req.user?.id || null;

    const programacion = await Programacion.findById(programacion_id);
    if (!programacion) {
      return res.status(404).json({ success: false, message: 'Programación no encontrada' });
    }

    const registro = await RegistroDiarioProgramacion.create({
      programacion:       programacion_id,
      fecha:              new Date(fecha),
      cantidad_ejecutada: cantidad_ejecutada || 0,
      observaciones:      observaciones || '',
      registrado_por:     usuario_id,
    });

    await recalcularProgramacion(programacion_id);

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
    const { cantidad_ejecutada, observaciones } = req.body;

    const cantidad  = cantidad_ejecutada !== undefined ? Math.max(0, cantidad_ejecutada) : undefined;
    const nuevoEstado = cantidad !== undefined ? (cantidad > 0 ? 'COMPLETADO' : 'PENDIENTE') : undefined;

    const update = {};
    if (cantidad      !== undefined) update.cantidad_ejecutada = cantidad;
    if (nuevoEstado   !== undefined) update.estado             = nuevoEstado;
    if (observaciones !== undefined) update.observaciones      = observaciones;

    // ✅ findByIdAndUpdate bypasea hooks — sin cadena de saves problemática
    const registro = await RegistroDiarioProgramacion.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: false }
    );

    if (!registro) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    await recalcularProgramacion(registro.programacion);

    res.json({ success: true, message: 'Registro actualizado', data: registro });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, error: error.message });
  }
};

// ── 5. ACTUALIZAR MÚLTIPLES REGISTROS (MODAL) ────────────────────────
// ✅ FIX PRINCIPAL: usa findByIdAndUpdate en lugar de save()
//    para evitar la cadena hooks que causaba el error
exports.updateMultiplesRegistros = async (req, res) => {
  try {
    const { registros } = req.body;

    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un array de registros' });
    }

    let programacion_id = null;
    const resultados    = [];

    // ✅ Actualizar todos con findByIdAndUpdate (sin disparar hooks)
    for (const item of registros) {
      if (!item.id) {
        resultados.push({ id: item.id, success: false, message: 'ID requerido' });
        continue;
      }

      const cantidad    = item.cantidad_ejecutada !== undefined ? Math.max(0, item.cantidad_ejecutada) : 0;
      const estadoCalc  = cantidad > 0 ? 'COMPLETADO' : 'PENDIENTE';

      const update = {
        cantidad_ejecutada: cantidad,
        estado:             estadoCalc,
      };
      if (item.observaciones !== undefined) update.observaciones = item.observaciones;

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
        id:                 item.id,
        success:            true,
        cantidad_ejecutada: registro.cantidad_ejecutada,
        estado:             registro.estado,
      });
    }

    // ✅ Recalcular programación UNA sola vez al final (sin hooks)
    if (programacion_id) {
      await recalcularProgramacion(programacion_id);
    }

    res.json({
      success: true,
      message: 'Registros actualizados exitosamente',
      data:    resultados,
    });
  } catch (error) {
    console.error('Error updateMultiplesRegistros:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error al actualizar registros',
      error:   error.message,
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

    const dias = registros.map((r, idx) => ({
      _id:                r._id,
      numero_dia:         idx + 1,
      dia_semana:         DIAS[new Date(r.fecha).getDay()],
      fecha:              r.fecha,
      cantidad_ejecutada: r.cantidad_ejecutada,
      estado:             r.estado,
      observaciones:      r.observaciones,
    }));

    res.json({
      success: true,
      data: {
        programacion_id,
        cantidad_proyectada:      programacion.cantidad_proyectada,
        cantidad_ejecutada_total: programacion.cantidad_ejecutada_total,
        porcentaje_cumplimiento:  programacion.porcentaje_cumplimiento,
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
        completados:     registros.filter(r => r.estado === 'COMPLETADO').length,
        pendientes:      registros.filter(r => r.estado === 'PENDIENTE').length,
        parciales:       registros.filter(r => r.estado === 'PARCIAL').length,
        cantidad_total:  registros.reduce((s, r) => s + (r.cantidad_ejecutada || 0), 0),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};