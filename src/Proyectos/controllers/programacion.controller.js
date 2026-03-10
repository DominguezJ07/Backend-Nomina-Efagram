// ==========================================
// CONTROLADOR: PROGRAMACIÓN
// ==========================================
// Descripción: Lógica de negocio para gestionar programaciones
// Ubicación: src/Proyectos/controllers/programacion.controller.js

const Programacion = require('../models/programacion.model');
const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const Contrato = require('../../Contratos/models/contrato.model');

// ────────────────────────────────────────────────────────────────────
// 1. OBTENER TODAS LAS PROGRAMACIONES
// ────────────────────────────────────────────────────────────────────
exports.getProgramaciones = async (req, res) => {
  try {
    const { estado, skip = 0, limit = 10, search } = req.query;

    // Construir filtro
    let filtro = {};
    if (estado) filtro.estado = estado;
    if (search) {
      filtro.$or = [
        { 'contrato.codigo': { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Programacion.countDocuments(filtro);
    const programaciones = await Programacion.find(filtro)
      .populate('contrato', 'codigo')
      .populate('actividad', 'nombre')
      .populate('finca', 'nombre')
      .populate('lote', 'nombre')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ fecha_inicial: -1 });

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
    res.status(500).json({
      success: false,
      message: 'Error al obtener programaciones',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 2. OBTENER UNA PROGRAMACIÓN POR ID
// ────────────────────────────────────────────────────────────────────
exports.getProgramacionById = async (req, res) => {
  try {
    const { id } = req.params;

    const programacion = await Programacion.findById(id)
      .populate('contrato')
      .populate('actividad')
      .populate('finca')
      .populate('lote')
      .populate('creado_por', 'nombre email')
      .populate('actualizado_por', 'nombre email');

    if (!programacion) {
      return res.status(404).json({
        success: false,
        message: 'Programación no encontrada',
      });
    }

    // Obtener registros diarios
    const registrosDiarios = await RegistroDiarioProgramacion.find({
      programacion: id,
    }).sort({ fecha: 1 });

    res.json({
      success: true,
      data: {
        programacion,
        registros_diarios: registrosDiarios,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener programación',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 3. CREAR NUEVA PROGRAMACIÓN
// ────────────────────────────────────────────────────────────────────
exports.createProgramacion = async (req, res) => {
  try {
    const { contrato_id, fecha_inicial } = req.body;
    const usuario_id = req.user?.id || null;

    // Validar que el contrato existe
    const contrato = await Contrato.findById(contrato_id)
      .populate('finca')
      .populate('actividades')
      .populate('lotes');

    if (!contrato) {
      return res.status(404).json({
        success: false,
        message: 'Contrato no encontrado',
      });
    }

    // Tomar la primera actividad y lote del contrato
    const actividad = contrato.actividades?.[0];
    const lote = contrato.lotes?.[0];

    if (!actividad || !lote) {
      return res.status(400).json({
        success: false,
        message: 'El contrato debe tener al menos una actividad y un lote',
      });
    }

    // Crear nueva programación
    const programacion = new Programacion({
      contrato: contrato_id,
      fecha_inicial: new Date(fecha_inicial),
      actividad: actividad._id,
      finca: contrato.finca._id,
      lote: lote._id,
      cantidad_proyectada: contrato.cantidad_proyectada || 0,
      valor_proyectado: contrato.valor_proyectado || 0,
      creado_por: usuario_id,
    });

    await programacion.save();

    // Crear 7 registros diarios (PENDIENTE)
    const registrosDiarios = [];
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(fecha_inicial);
      fecha.setDate(fecha.getDate() + i);

      const registro = new RegistroDiarioProgramacion({
        programacion: programacion._id,
        fecha: new Date(fecha.setHours(0, 0, 0, 0)),
        cantidad_ejecutada: 0,
        estado: 'PENDIENTE',
        registrado_por: usuario_id,
      });

      await registro.save();
      registrosDiarios.push(registro);
    }

    // Poblar referencia
    await programacion.populate('contrato', 'codigo');
    await programacion.populate('actividad', 'nombre');
    await programacion.populate('finca', 'nombre');
    await programacion.populate('lote', 'nombre');

    res.status(201).json({
      success: true,
      message: 'Programación creada exitosamente',
      data: {
        programacion,
        registros_diarios: registrosDiarios,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al crear programación',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 4. ACTUALIZAR PROGRAMACIÓN
// ────────────────────────────────────────────────────────────────────
exports.updateProgramacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones, estado } = req.body;
    const usuario_id = req.user?.id || null;

    const programacion = await Programacion.findById(id);

    if (!programacion) {
      return res.status(404).json({
        success: false,
        message: 'Programación no encontrada',
      });
    }

    // Solo permitir actualizar ciertos campos
    if (observaciones !== undefined) programacion.observaciones = observaciones;
    if (estado !== undefined) programacion.estado = estado;

    programacion.actualizado_por = usuario_id;
    await programacion.save();

    await programacion.populate('contrato', 'codigo');
    await programacion.populate('actividad', 'nombre');

    res.json({
      success: true,
      message: 'Programación actualizada exitosamente',
      data: programacion,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al actualizar programación',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 5. OBTENER REGISTROS DIARIOS DE UNA PROGRAMACIÓN
// ────────────────────────────────────────────────────────────────────
exports.getRegistrosDiarios = async (req, res) => {
  try {
    const { programacion_id } = req.params;

    const registros = await RegistroDiarioProgramacion.find({
      programacion: programacion_id,
    })
      .populate('registrado_por', 'nombre email')
      .populate('validado_por', 'nombre email')
      .sort({ fecha: 1 });

    res.json({
      success: true,
      data: registros,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros diarios',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 6. OBTENER RESUMEN/PROGRESO DE UNA PROGRAMACIÓN
// ────────────────────────────────────────────────────────────────────
exports.getResumen = async (req, res) => {
  try {
    const { id } = req.params;

    const programacion = await Programacion.findById(id)
      .populate('contrato', 'codigo')
      .populate('actividad', 'nombre')
      .populate('finca', 'nombre')
      .populate('lote', 'nombre');

    if (!programacion) {
      return res.status(404).json({
        success: false,
        message: 'Programación no encontrada',
      });
    }

    const registros = await RegistroDiarioProgramacion.find({
      programacion: id,
    }).sort({ fecha: 1 });

    const resumen = {
      _id: programacion._id,
      contrato: programacion.contrato?.codigo,
      actividad: programacion.actividad?.nombre,
      finca: programacion.finca?.nombre,
      lote: programacion.lote?.nombre,
      fecha_inicial: programacion.fecha_inicial,
      fecha_final: programacion.fecha_final,
      semana: programacion.semana,
      estado: programacion.estado,
      cantidad_proyectada: programacion.cantidad_proyectada,
      cantidad_ejecutada_total: programacion.cantidad_ejecutada_total,
      porcentaje_cumplimiento: programacion.porcentaje_cumplimiento,
      dias_restantes: programacion.dias_restantes,
      estado_semana: programacion.estado_semana,
      registros_diarios: registros.map(r => ({
        _id: r._id,
        fecha: r.fecha,
        dia: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][new Date(r.fecha).getDay()],
        cantidad_ejecutada: r.cantidad_ejecutada,
        estado: r.estado,
        observaciones: r.observaciones,
      })),
    };

    res.json({
      success: true,
      data: resumen,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 7. OBTENER PROGRAMACIONES POR CONTRATO
// ────────────────────────────────────────────────────────────────────
exports.getProgramacionesPorContrato = async (req, res) => {
  try {
    const { contrato_id } = req.params;

    const programaciones = await Programacion.find({
      contrato: contrato_id,
    })
      .populate('actividad', 'nombre')
      .populate('finca', 'nombre')
      .populate('lote', 'nombre')
      .sort({ fecha_inicial: -1 });

    res.json({
      success: true,
      data: programaciones,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener programaciones',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 8. ELIMINAR PROGRAMACIÓN
// ────────────────────────────────────────────────────────────────────
exports.deleteProgramacion = async (req, res) => {
  try {
    const { id } = req.params;

    const programacion = await Programacion.findByIdAndDelete(id);

    if (!programacion) {
      return res.status(404).json({
        success: false,
        message: 'Programación no encontrada',
      });
    }

    // Eliminar también sus registros diarios
    await RegistroDiarioProgramacion.deleteMany({ programacion: id });

    res.json({
      success: true,
      message: 'Programación eliminada exitosamente',
      data: programacion,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar programación',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 9. OBTENER PROGRAMACIONES ACTIVAS
// ────────────────────────────────────────────────────────────────────
exports.getProgramacionesActivas = async (req, res) => {
  try {
    const programaciones = await Programacion.find({
      estado: 'ACTIVA',
    })
      .populate('contrato', 'codigo')
      .populate('actividad', 'nombre')
      .populate('finca', 'nombre')
      .populate('lote', 'nombre')
      .sort({ fecha_final: 1 });

    res.json({
      success: true,
      data: programaciones,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener programaciones activas',
      error: error.message,
    });
  }
};