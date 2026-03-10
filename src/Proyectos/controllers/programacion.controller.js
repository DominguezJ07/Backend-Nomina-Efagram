// ==========================================
// CONTROLADOR: PROGRAMACIÓN
// ==========================================

const Programacion = require('../models/programacion.model');
const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const Contrato = require('../../Contratos/models/contrato.model');

// ── 1. OBTENER TODAS LAS PROGRAMACIONES ─────────────────────────────
exports.getProgramaciones = async (req, res) => {
  try {
    const { estado, skip = 0, limit = 50 } = req.query;
    const filtro = {};
    if (estado) filtro.estado = estado;

    const total = await Programacion.countDocuments(filtro);
    const programaciones = await Programacion.find(filtro)
      .populate('contrato', 'codigo')
      .populate('actividad', 'nombre')
      .populate('finca', 'nombre')
      .populate('lote', 'nombre')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        programaciones,
        pagination: {
          total,
          skip: parseInt(skip),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener programaciones', error: error.message });
  }
};

// ── 2. OBTENER UNA PROGRAMACIÓN POR ID ──────────────────────────────
exports.getProgramacionById = async (req, res) => {
  try {
    const programacion = await Programacion.findById(req.params.id)
      .populate('contrato')
      .populate('actividad')
      .populate('finca')
      .populate('lote');

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

// ── 3. CREAR NUEVA PROGRAMACIÓN ──────────────────────────────────────
// FIXES:
//  - contrato no tiene cantidad_proyectada/valor_proyectado: se toman del body o default 1/0
//  - validador de fecha en modelo rechazaba hoy: se precalcula fecha_final y se usa Programacion.create()
//  - creaba registros en serie (lento): ahora Promise.all en paralelo
exports.createProgramacion = async (req, res) => {
  try {
    const { contrato_id, fecha_inicial, cantidad_proyectada, valor_proyectado, observaciones } = req.body;
    const usuario_id = req.user?.id || null;

    const contrato = await Contrato.findById(contrato_id)
      .populate('finca')
      .populate('actividades')
      .populate('lotes');

    if (!contrato) {
      return res.status(404).json({ success: false, message: 'Contrato no encontrado' });
    }

    if (contrato.estado === 'CANCELADO' || contrato.estado === 'CERRADO') {
      return res.status(400).json({
        success: false,
        message: `No se puede programar un contrato en estado ${contrato.estado}`,
      });
    }

    const actividad = contrato.actividades?.[0];
    const lote      = contrato.lotes?.[0];

    if (!actividad || !lote) {
      return res.status(400).json({
        success: false,
        message: 'El contrato debe tener al menos una actividad y un lote asignados',
      });
    }

    // Normalizar fecha al mediodía para evitar problemas de zona horaria
    const fechaInicio = new Date(fecha_inicial);
    fechaInicio.setHours(12, 0, 0, 0);

    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + 6);

    const cantProyectada = parseFloat(cantidad_proyectada) || 1;
    const valProyectado  = parseFloat(valor_proyectado)   || 0;

    // Usar create() con fecha_final precalculada para saltear el validator del modelo
    const programacion = await Programacion.create({
      contrato:            contrato_id,
      fecha_inicial:       fechaInicio,
      fecha_final:         fechaFin,
      actividad:           actividad._id,
      finca:               contrato.finca._id,
      lote:                lote._id,
      cantidad_proyectada: cantProyectada,
      valor_proyectado:    valProyectado,
      creado_por:          usuario_id,
      observaciones:       observaciones || '',
    });

    // Crear 7 registros diarios con insertMany (bypasea hooks para evitar race condition)
    const registrosData = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + i);
      return {
        programacion:       programacion._id,
        fecha,
        cantidad_ejecutada: 0,
        estado:             'PENDIENTE',
        registrado_por:     usuario_id,
        validado:           false,
        observaciones:      '',
      };
    });
    const registrosDiarios = await RegistroDiarioProgramacion.insertMany(registrosData, { ordered: true });

    await programacion.populate([
      { path: 'contrato',  select: 'codigo' },
      { path: 'actividad', select: 'nombre' },
      { path: 'finca',     select: 'nombre' },
      { path: 'lote',      select: 'nombre' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Programación creada exitosamente',
      data: { programacion, registros_diarios: registrosDiarios },
    });
  } catch (error) {
    console.error('Error createProgramacion:', error);
    res.status(400).json({ success: false, message: 'Error al crear programación', error: error.message });
  }
};

// ── 4. ACTUALIZAR PROGRAMACIÓN ───────────────────────────────────────
exports.updateProgramacion = async (req, res) => {
  try {
    const { observaciones, estado } = req.body;
    const usuario_id = req.user?.id || null;

    const programacion = await Programacion.findById(req.params.id);
    if (!programacion) {
      return res.status(404).json({ success: false, message: 'Programación no encontrada' });
    }

    if (observaciones !== undefined) programacion.observaciones = observaciones;
    if (estado !== undefined)        programacion.estado         = estado;
    programacion.actualizado_por = usuario_id;

    await programacion.save();
    await programacion.populate('contrato', 'codigo');
    await programacion.populate('actividad', 'nombre');

    res.json({ success: true, message: 'Programación actualizada', data: programacion });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error al actualizar', error: error.message });
  }
};

// ── 5. REGISTROS DIARIOS DE UNA PROGRAMACIÓN ─────────────────────────
exports.getRegistrosDiarios = async (req, res) => {
  try {
    const registros = await RegistroDiarioProgramacion.find({
      programacion: req.params.programacion_id,
    }).sort({ fecha: 1 });

    res.json({ success: true, data: registros });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener registros', error: error.message });
  }
};

// ── 6. RESUMEN DE UNA PROGRAMACIÓN ──────────────────────────────────
exports.getResumen = async (req, res) => {
  try {
    const programacion = await Programacion.findById(req.params.id)
      .populate('contrato', 'codigo')
      .populate('actividad', 'nombre')
      .populate('finca',     'nombre')
      .populate('lote',      'nombre');

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
        cantidad_ejecutada_total: programacion.cantidad_ejecutada_total,
        porcentaje_cumplimiento:  programacion.porcentaje_cumplimiento,
        registros_diarios: registros.map(r => ({
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

// ── 7. PROGRAMACIONES POR CONTRATO ──────────────────────────────────
exports.getProgramacionesPorContrato = async (req, res) => {
  try {
    const programaciones = await Programacion.find({ contrato: req.params.contrato_id })
      .populate('actividad', 'nombre')
      .populate('finca',     'nombre')
      .populate('lote',      'nombre')
      .sort({ fecha_inicial: -1 });

    res.json({ success: true, data: programaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};

// ── 8. ELIMINAR PROGRAMACIÓN ─────────────────────────────────────────
exports.deleteProgramacion = async (req, res) => {
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

// ── 9. PROGRAMACIONES ACTIVAS ────────────────────────────────────────
exports.getProgramacionesActivas = async (req, res) => {
  try {
    const programaciones = await Programacion.find({ estado: 'ACTIVA' })
      .populate('contrato',  'codigo')
      .populate('actividad', 'nombre')
      .populate('finca',     'nombre')
      .populate('lote',      'nombre')
      .sort({ fecha_final: 1 });

    res.json({ success: true, data: programaciones });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
};