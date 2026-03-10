// ==========================================
// CONTROLADOR: REGISTRO DIARIO PROGRAMACIÓN
// ==========================================
// Descripción: Lógica para gestionar registros diarios de ejecución
// Ubicación: src/Proyectos/controllers/registroDiarioProgramacion.controller.js

const RegistroDiarioProgramacion = require('../models/registroDiarioProgramacion.model');
const Programacion = require('../models/programacion.model');

// ────────────────────────────────────────────────────────────────────
// 1. OBTENER TODOS LOS REGISTROS DIARIOS
// ────────────────────────────────────────────────────────────────────
exports.getRegistrosDiarios = async (req, res) => {
  try {
    const { programacion_id, estado, skip = 0, limit = 50 } = req.query;

    let filtro = {};
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
      data: {
        registros,
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
      message: 'Error al obtener registros diarios',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 2. OBTENER UN REGISTRO DIARIO POR ID
// ────────────────────────────────────────────────────────────────────
exports.getRegistroDiarioById = async (req, res) => {
  try {
    const { id } = req.params;

    const registro = await RegistroDiarioProgramacion.findById(id)
      .populate('programacion')
      .populate('registrado_por', 'nombre email')
      .populate('validado_por', 'nombre email');

    if (!registro) {
      return res.status(404).json({
        success: false,
        message: 'Registro diario no encontrado',
      });
    }

    res.json({
      success: true,
      data: registro,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener registro diario',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 3. CREAR REGISTRO DIARIO
// ────────────────────────────────────────────────────────────────────
exports.createRegistroDiario = async (req, res) => {
  try {
    const { programacion_id, fecha, cantidad_ejecutada, observaciones } = req.body;
    const usuario_id = req.user?.id || null;

    // Validar que la programación existe
    const programacion = await Programacion.findById(programacion_id);
    if (!programacion) {
      return res.status(404).json({
        success: false,
        message: 'Programación no encontrada',
      });
    }

    // Validar que no existe ya un registro para ese día
    const existente = await RegistroDiarioProgramacion.findOne({
      programacion: programacion_id,
      fecha: {
        $gte: new Date(fecha).setHours(0, 0, 0, 0),
        $lt: new Date(fecha).setHours(23, 59, 59, 999),
      },
    });

    if (existente) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un registro para este día en esta programación',
      });
    }

    // Crear registro
    const registro = new RegistroDiarioProgramacion({
      programacion: programacion_id,
      fecha: new Date(fecha),
      cantidad_ejecutada: cantidad_ejecutada || 0,
      observaciones: observaciones || '',
      registrado_por: usuario_id,
    });

    await registro.save();

    // Actualizar programación (se hace automáticamente en el middleware)
    await programacion.populate('contrato', 'codigo');

    res.status(201).json({
      success: true,
      message: 'Registro diario creado exitosamente',
      data: registro,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al crear registro diario',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 4. ACTUALIZAR CANTIDAD EJECUTADA
// ────────────────────────────────────────────────────────────────────
exports.updateRegistroDiario = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad_ejecutada, observaciones } = req.body;

    const registro = await RegistroDiarioProgramacion.findById(id);

    if (!registro) {
      return res.status(404).json({
        success: false,
        message: 'Registro diario no encontrado',
      });
    }

    // Actualizar cantidad
    if (cantidad_ejecutada !== undefined) {
      registro.cantidad_ejecutada = Math.max(0, cantidad_ejecutada);
    }

    // Actualizar observaciones
    if (observaciones !== undefined) {
      registro.observaciones = observaciones;
    }

    await registro.save();
    // El middleware post('save') actualiza automáticamente la Programación

    res.json({
      success: true,
      message: 'Registro diario actualizado exitosamente',
      data: registro,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al actualizar registro diario',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 5. ACTUALIZAR MÚLTIPLES REGISTROS (IMPORTANTE PARA MODAL)
// ────────────────────────────────────────────────────────────────────
exports.updateMultiplesRegistros = async (req, res) => {
  try {
    const { registros } = req.body;
    // registros = [
    //   { id: "...", cantidad_ejecutada: 50, observaciones: "..." },
    //   { id: "...", cantidad_ejecutada: 45, observaciones: "..." },
    //   ...
    // ]

    if (!Array.isArray(registros) || registros.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de registros para actualizar',
      });
    }

    const resultados = [];
    let programacion_id = null;

    for (const item of registros) {
      const registro = await RegistroDiarioProgramacion.findById(item.id);

      if (!registro) {
        resultados.push({
          id: item.id,
          success: false,
          message: 'Registro no encontrado',
        });
        continue;
      }

      // Guardar programación_id para actualizar después
      if (!programacion_id) {
        programacion_id = registro.programacion;
      }

      // Actualizar cantidad
      if (item.cantidad_ejecutada !== undefined) {
        registro.cantidad_ejecutada = Math.max(0, item.cantidad_ejecutada);
      }

      // Actualizar observaciones
      if (item.observaciones !== undefined) {
        registro.observaciones = item.observaciones;
      }

      await registro.save();

      resultados.push({
        id: item.id,
        success: true,
        cantidad_ejecutada: registro.cantidad_ejecutada,
        estado: registro.estado,
      });
    }

    // Actualizar la programación una sola vez
    if (programacion_id) {
      const programacion = await Programacion.findById(programacion_id);
      if (programacion) {
        await programacion.actualizarPorcentaje();
      }
    }

    res.json({
      success: true,
      message: 'Registros actualizados exitosamente',
      data: resultados,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al actualizar registros',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 6. OBTENER REGISTROS DE UNA SEMANA COMPLETA
// ────────────────────────────────────────────────────────────────────
exports.getRegistrosSemana = async (req, res) => {
  try {
    const { programacion_id } = req.params;

    const programacion = await Programacion.findById(programacion_id);

    if (!programacion) {
      return res.status(404).json({
        success: false,
        message: 'Programación no encontrada',
      });
    }

    const registros = await RegistroDiarioProgramacion.find({
      programacion: programacion_id,
    })
      .populate('registrado_por', 'nombre email')
      .sort({ fecha: 1 });

    // Mapear a estructura de días
    const dias = registros.map((r, idx) => ({
      _id: r._id,
      numero_dia: idx + 1,
      dia_semana: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][
        new Date(r.fecha).getDay()
      ],
      fecha: r.fecha,
      cantidad_ejecutada: r.cantidad_ejecutada,
      estado: r.estado,
      observaciones: r.observaciones,
    }));

    res.json({
      success: true,
      data: {
        programacion_id,
        cantidad_proyectada: programacion.cantidad_proyectada,
        cantidad_ejecutada_total: programacion.cantidad_ejecutada_total,
        porcentaje_cumplimiento: programacion.porcentaje_cumplimiento,
        dias,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros de la semana',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 7. VALIDAR REGISTRO
// ────────────────────────────────────────────────────────────────────
exports.validarRegistro = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.user?.id || null;

    const registro = await RegistroDiarioProgramacion.findById(id);

    if (!registro) {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado',
      });
    }

    registro.validado = true;
    registro.validado_por = usuario_id;
    registro.fecha_validacion = new Date();

    await registro.save();

    res.json({
      success: true,
      message: 'Registro validado exitosamente',
      data: registro,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al validar registro',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 8. ELIMINAR REGISTRO DIARIO
// ────────────────────────────────────────────────────────────────────
exports.deleteRegistroDiario = async (req, res) => {
  try {
    const { id } = req.params;

    const registro = await RegistroDiarioProgramacion.findByIdAndDelete(id);

    if (!registro) {
      return res.status(404).json({
        success: false,
        message: 'Registro no encontrado',
      });
    }

    // Actualizar programación
    const programacion = await Programacion.findById(registro.programacion);
    if (programacion) {
      await programacion.actualizarPorcentaje();
    }

    res.json({
      success: true,
      message: 'Registro eliminado exitosamente',
      data: registro,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error al eliminar registro',
      error: error.message,
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// 9. OBTENER ESTAD​ÍSTICAS DE REGISTROS
// ────────────────────────────────────────────────────────────────────
exports.getEstadisticas = async (req, res) => {
  try {
    const { programacion_id } = req.params;

    const registros = await RegistroDiarioProgramacion.find({
      programacion: programacion_id,
    });

    const estadisticas = {
      total_registros: registros.length,
      completados: registros.filter(r => r.estado === 'COMPLETADO').length,
      pendientes: registros.filter(r => r.estado === 'PENDIENTE').length,
      parciales: registros.filter(r => r.estado === 'PARCIAL').length,
      cantidad_total: registros.reduce((sum, r) => sum + (r.cantidad_ejecutada || 0), 0),
    };

    res.json({
      success: true,
      data: estadisticas,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message,
    });
  }
};