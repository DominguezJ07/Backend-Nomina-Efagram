/**
 * programacion.controller.js
 * Ruta: src/Proyectos/controllers/programacion.controller.js
 *
 * ✅ Sin populate
 * ✅ Sin ObjectId en subdocumentos
 * ✅ Transformación con .map() antes de guardar
 * ✅ Sanitización completa del req.body
 */

const mongoose                   = require('mongoose');
const Programacion               = require('../models/programacion.model');
const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const Contrato                   = require('../../Contratos/models/contrato.model');
const { getMongoId }             = require('../utils/objectId.helper');
const {
  sanitizeContratoRef,
  sanitizeFinca,
  sanitizeLote,
  sanitizePersona,
  _str,
  _num,
} = require('../utils/sanitizer');

// ── Verificar conexión ────────────────────────────────────────
const checkDB = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ success: false, message: 'Base de datos no disponible.' });
    return false;
  }
  return true;
};

const normalizarFechaUTC = (fecha) => {
  const d = new Date(fecha);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const obtenerEstadoHoyMap = async (programacionIds = []) => {
  if (!programacionIds.length) return new Map();

  const hoy    = normalizarFechaUTC(new Date());
  const manana = new Date(hoy);
  manana.setUTCDate(manana.getUTCDate() + 1);

  const registros = await RegistroDiarioProgramacion.find({
    programacion: { $in: programacionIds },
    fecha:        { $gte: hoy, $lt: manana },
  }).select('programacion estado').lean();

  const map = new Map();
  for (const r of registros) {
    map.set(String(r.programacion), r.estado || 'PENDIENTE');
  }
  return map;
};

// ── 1. GET TODAS ──────────────────────────────────────────────
exports.getProgramaciones = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const { estado, skip = 0, limit = 50 } = req.query;
    const filtro = {};
    if (estado && ['ACTIVA', 'COMPLETADA', 'CANCELADA', 'PAUSADA'].includes(estado)) {
      filtro.estado = estado;
    }

    const total          = await Programacion.countDocuments(filtro);
    const programaciones = await Programacion.find(filtro)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const estadoHoyMap = await obtenerEstadoHoyMap(programaciones.map((p) => p._id));

    const data = programaciones.map((p) => ({
      ...p,
      registro_hoy_estado: estadoHoyMap.get(String(p._id)) || null,
    }));

    res.json({
      success: true,
      data: {
        programaciones: data,
        pagination: {
          total,
          skip:  parseInt(skip),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener programaciones', error: error.message });
  }
};

// ── 2. GET POR ID ─────────────────────────────────────────────
exports.getProgramacionById = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const programacion = await Programacion.findById(req.params.id).lean();
    if (!programacion) {
      return res.status(404).json({ success: false, message: 'Programación no encontrada' });
    }

    const registrosDiarios = await RegistroDiarioProgramacion.find({
      programacion: req.params.id,
    }).sort({ fecha: 1 });

    res.json({ success: true, data: { programacion, registros_diarios: registrosDiarios } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener programación', error: error.message });
  }
};

// ── 3. CREAR ──────────────────────────────────────────────────
/**
 * Body esperado:
 * {
 *   contrato:            { codigo: "CON-001", nombre: "Contrato XYZ" },
 *   actividad:           { nombre: "Poda", codigo: "ACT-01", unidad: "hectareas" },
 *   finca:               { nombre: "Finca El Paraíso", codigo: "F-01" },
 *   lote:                { nombre: "Lote 3A", codigo: "L-3A" },
 *   fecha_inicial:       "2024-03-01",
 *   cantidad_proyectada: 10,
 *   valor_proyectado:    500000,
 *   observaciones:       "...",
 *   creado_por:          { nombre: "Juan", documento: "123456" }
 * }
 */
exports.createProgramacion = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const contratoId = getMongoId(req.body.contrato_id || req.body.contrato);

    if (!contratoId) {
      return res.status(400).json({ success: false, message: 'El contrato es obligatorio' });
    }

    const contrato = await Contrato.findById(contratoId)
      .populate('subproyecto', 'codigo nombre')
      .populate('actividades.actividad', 'codigo nombre unidad_medida')
      .lean();

    if (!contrato) {
      return res.status(404).json({ success: false, message: 'Contrato no encontrado' });
    }

    // ── Transformación y sanitización — NO se usa req.body directo ──
    const data = {
      // Snapshot del contrato
      contrato: {
        codigo: contrato.codigo || null,
        nombre: contrato.subproyecto?.nombre || contrato.codigo || null,
      },

      // Snapshot de la finca
      finca: {
        id: contrato.finca?.id || null,
        codigo: contrato.finca?.codigo || null,
        nombre: contrato.finca?.nombre || null,
      },

      // Actividad con .map() si viene como array, o como objeto simple
      actividad: {
        nombre: _str(req.body.actividad?.nombre, null),
        codigo: _str(req.body.actividad?.codigo, ''),
        unidad: _str(req.body.actividad?.unidad, 'hectareas'),
      },

      lote:      sanitizeLote(req.body.lote,             'lote'),

      fecha_inicial:       req.body.fecha_inicial,
      cantidad_proyectada: _num(req.body.cantidad_proyectada, 1),
      valor_proyectado:    _num(req.body.valor_proyectado,    0),
      observaciones:       _str(req.body.observaciones,       ''),

      // Persona opcional
      creado_por: req.body.creado_por
        ? sanitizePersona(req.body.creado_por, 'creado_por')
        : null,
    };

    if (!data.fecha_inicial) {
      return res.status(400).json({ success: false, message: 'La fecha inicial es obligatoria' });
    }

    const fechaInicio = new Date(data.fecha_inicial);
    fechaInicio.setUTCHours(12, 0, 0, 0);

    const fechaFin = new Date(fechaInicio);
    fechaFin.setUTCDate(fechaFin.getUTCDate() + 6);

    const programacion = await Programacion.create({
      ...data,
      fecha_inicial: fechaInicio,
      fecha_final:   fechaFin,
    });

    // Generar 7 registros diarios
    const registrosData = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(fechaInicio);
      fecha.setUTCDate(fecha.getUTCDate() + i);
      fecha.setUTCHours(12, 0, 0, 0);
      return {
        programacion:          programacion._id,
        fecha,
        cantidad_ejecutada:    0,
        estado:                'PENDIENTE',
        validado:              false,
        observaciones:         '',
        tiempo_detenido:       0,
        motivo_detencion:      null,
        motivo_detencion_otro: '',
      };
    });

    const registrosDiarios = await RegistroDiarioProgramacion.insertMany(
      registrosData,
      { ordered: true }
    );

    res.status(201).json({
      success: true,
      message: 'Programación creada exitosamente. Se generaron 7 registros diarios.',
      data:    { programacion, registros_diarios: registrosDiarios },
    });
  } catch (error) {
    console.error('Error createProgramacion:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Ya existe una programación para este contrato en esta fecha.' });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(400).json({ success: false, message: error.message || 'Error al crear programación' });
  }
};

// ── 4. ACTUALIZAR ─────────────────────────────────────────────
exports.updateProgramacion = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const programacion = await Programacion.findById(req.params.id);
    if (!programacion) {
      return res.status(404).json({ success: false, message: 'Programación no encontrada' });
    }

    // ✅ Whitelist de campos mutables — no se usa req.body directo
    const ESTADOS_VALIDOS = ['ACTIVA', 'COMPLETADA', 'CANCELADA', 'PAUSADA'];

    if (req.body.observaciones !== undefined) {
      programacion.observaciones = _str(req.body.observaciones, '');
    }
    if (req.body.estado !== undefined) {
      if (!ESTADOS_VALIDOS.includes(req.body.estado)) {
        return res.status(400).json({ success: false, message: 'Estado inválido' });
      }
      programacion.estado = req.body.estado;
    }
    if (req.body.actualizado_por) {
      programacion.actualizado_por = sanitizePersona(req.body.actualizado_por, 'actualizado_por');
    }

    await programacion.save();
    res.json({ success: true, message: 'Programación actualizada', data: programacion });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// ── 5. REGISTROS DIARIOS ──────────────────────────────────────
exports.getRegistrosDiarios = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const registros = await RegistroDiarioProgramacion.find({
      programacion: req.params.programacion_id,
    }).sort({ fecha: 1 });

    res.json({ success: true, data: registros });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener registros', error: error.message });
  }
};

// ── 6. RESUMEN ────────────────────────────────────────────────
exports.getResumen = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const programacion = await Programacion.findById(req.params.id).lean();
    if (!programacion) {
      return res.status(404).json({ success: false, message: 'Programación no encontrada' });
    }

    const registros = await RegistroDiarioProgramacion.find({
      programacion: req.params.id,
    }).sort({ fecha: 1 });

    const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    res.json({
      success: true,
      data: {
        _id:                      programacion._id,
        contrato:                 programacion.contrato?.codigo,
        actividad:                programacion.actividad?.nombre,
        finca:                    programacion.finca?.nombre,
        lote:                     programacion.lote?.nombre,
        fecha_inicial:            programacion.fecha_inicial,
        fecha_final:              programacion.fecha_final,
        semana:                   programacion.semana,
        estado:                   programacion.estado,
        cantidad_proyectada:      programacion.cantidad_proyectada,
        valor_proyectado:         programacion.valor_proyectado,
        cantidad_ejecutada_total: programacion.cantidad_ejecutada_total,
        porcentaje_cumplimiento:  programacion.porcentaje_cumplimiento,
        registros_diarios: registros.map((r) => ({
          _id:                r._id,
          fecha:              r.fecha,
          dia:                DIAS[new Date(r.fecha).getDay()],
          cantidad_ejecutada: r.cantidad_ejecutada,
          estado:             r.estado,
          observaciones:      r.observaciones,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener resumen', error: error.message });
  }
};

// ── 7. POR CÓDIGO DE CONTRATO ─────────────────────────────────
exports.getProgramacionesPorContrato = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const codigo = _str(req.params.contrato_codigo, '').toUpperCase();
    if (!codigo) {
      return res.status(400).json({ success: false, message: 'El código del contrato es obligatorio' });
    }

    const programaciones = await Programacion.find({ 'contrato.codigo': codigo })
      .sort({ fecha_inicial: -1 })
      .lean();

    const estadoHoyMap = await obtenerEstadoHoyMap(programaciones.map((p) => p._id));

    const data = programaciones.map((p) => ({
      ...p,
      registro_hoy_estado: estadoHoyMap.get(String(p._id)) || null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// ── 8. ELIMINAR ───────────────────────────────────────────────
exports.deleteProgramacion = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const programacion = await Programacion.findByIdAndDelete(req.params.id);
    if (!programacion) {
      return res.status(404).json({ success: false, message: 'Programación no encontrada' });
    }

    await RegistroDiarioProgramacion.deleteMany({ programacion: req.params.id });

    res.json({ success: true, message: 'Programación eliminada', data: programacion });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar', error: error.message });
  }
};

// ── 9. ACTIVAS ────────────────────────────────────────────────
exports.getProgramacionesActivas = async (req, res) => {
  if (!checkDB(res)) return;
  try {
    const programaciones = await Programacion.find({ estado: 'ACTIVA' })
      .sort({ fecha_final: 1 })
      .lean();

    const estadoHoyMap = await obtenerEstadoHoyMap(programaciones.map((p) => p._id));

    const data = programaciones.map((p) => ({
      ...p,
      registro_hoy_estado: estadoHoyMap.get(String(p._id)) || null,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};