const ConsolidadoSemanal = require('../models/consolidadoSemanal.model');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
const Novedad = require('../../Ejecucion/models/novedad.model');
const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const ActividadCatalogo = require('../../Proyectos/models/actividadCatalogo.model');
const { ApiError } = require('../../middlewares/errorHandler');

class ConsolidadoService {
  /**
   * Generar consolidado semanal para un trabajador y PAL
   */
  async generarConsolidado(semanaId, trabajadorId, palId, consolidadoPorId, estado = null) {  // ← AGREGADO parámetro estado
    // Obtener la semana operativa
    const SemanaOperativa = require('../models/semanaOperativa.model');
    const semana = await SemanaOperativa.findById(semanaId);
    if (!semana) {
      throw new ApiError(404, 'Semana operativa no encontrada');
    }

    // Obtener el PAL con su actividad
    const pal = await ProyectoActividadLote.findById(palId).populate('actividad');
    if (!pal) {
      throw new ApiError(404, 'PAL no encontrado');
    }

    // Obtener registros diarios del trabajador en la semana
    const registros = await RegistroDiario.find({
      trabajador: trabajadorId,
      proyecto_actividad_lote: palId,
      fecha: { $gte: semana.fecha_inicio, $lte: semana.fecha_fin },
      estado: { $in: ['APROBADO', 'CORREGIDO'] }
    });

    // Calcular métricas
    const dias_trabajados = registros.length;
    const total_horas = registros.reduce((sum, reg) => sum + reg.horas_trabajadas, 0);
    const total_ejecutado = registros.reduce((sum, reg) => sum + reg.cantidad_ejecutada, 0);

    // Obtener novedades del trabajador en la semana
    const novedades = await Novedad.find({
      trabajador: trabajadorId,
      fecha: { $gte: semana.fecha_inicio, $lte: semana.fecha_fin },
      estado: { $in: ['APROBADA', 'PENDIENTE'] }
    });

    const dias_con_novedad = novedades.reduce((sum, nov) => sum + nov.dias, 0);

    // Rendimiento esperado (de la actividad)
    const rendimiento_esperado = pal.actividad?.rendimiento_diario_estimado || 0;

    // Generar código
    const count = await ConsolidadoSemanal.countDocuments({ semana_operativa: semanaId });
    const codigo = `CONS-${semana.codigo}-${String(count + 1).padStart(4, '0')}`;

    // Verificar si ya existe
    let consolidado = await ConsolidadoSemanal.findOne({
      semana_operativa: semanaId,
      trabajador: trabajadorId,
      proyecto_actividad_lote: palId
    });

    const consolidadoData = {
      dias_trabajados,
      total_horas,
      total_ejecutado,
      rendimiento_esperado,
      dias_con_novedad,
      fecha_consolidacion: new Date(),
      estado: estado || 'CONSOLIDADO'  // ← MODIFICADO: Usar el estado enviado o 'CONSOLIDADO' por defecto
    };

    // Solo agregar consolidado_por si existe
    if (consolidadoPorId) {
      consolidadoData.consolidado_por = consolidadoPorId;
    }

    if (consolidado) {
      // Actualizar existente
      Object.assign(consolidado, consolidadoData);
    } else {
      // Crear nuevo
      consolidado = await ConsolidadoSemanal.create({
        codigo,
        semana_operativa: semanaId,
        trabajador: trabajadorId,
        proyecto_actividad_lote: palId,
        ...consolidadoData
      });
    }

    await consolidado.save();
    await consolidado.populate(['trabajador', 'proyecto_actividad_lote', 'consolidado_por']);

    return consolidado;
  }

  /**
   * Generar consolidados para toda una semana
   */
  async generarConsolidadosSemana(semanaId, consolidadoPorId) {
    const SemanaOperativa = require('../models/semanaOperativa.model');
    const semana = await SemanaOperativa.findById(semanaId);
    if (!semana) {
      throw new ApiError(404, 'Semana operativa no encontrada');
    }

    // Obtener todos los registros únicos de trabajador-PAL en la semana
    const registros = await RegistroDiario.find({
      fecha: { $gte: semana.fecha_inicio, $lte: semana.fecha_fin },
      estado: { $in: ['APROBADO', 'CORREGIDO'] }
    });

    if (registros.length === 0) {
      throw new ApiError(404, 'No hay registros diarios para esta semana');
    }

    // Obtener combinaciones únicas de trabajador-PAL
    const combinaciones = new Map();
    registros.forEach(reg => {
      const key = `${reg.trabajador.toString()}-${reg.proyecto_actividad_lote.toString()}`;
      if (!combinaciones.has(key)) {
        combinaciones.set(key, {
          trabajador: reg.trabajador,
          pal: reg.proyecto_actividad_lote
        });
      }
    });

    const consolidados = [];

    // Generar consolidado para cada combinación trabajador-PAL
    for (const [key, combo] of combinaciones) {
      try {
        const consolidado = await this.generarConsolidado(
          semanaId,
          combo.trabajador,
          combo.pal,
          consolidadoPorId
        );
        consolidados.push(consolidado);
      } catch (error) {
        console.error(`Error generando consolidado para ${key}:`, error.message);
        // Continuar con los demás aunque falle uno
      }
    }

    return consolidados;
  }

  /**
   * Obtener consolidados por trabajador
   */
  async getConsolidadosByTrabajador(trabajadorId, fechaInicio, fechaFin) {
    const SemanaOperativa = require('../models/semanaOperativa.model');
    
    const semanas = await SemanaOperativa.find({
      $or: [
        { fecha_inicio: { $gte: fechaInicio, $lte: fechaFin } },
        { fecha_fin: { $gte: fechaInicio, $lte: fechaFin } }
      ]
    });

    const semanaIds = semanas.map(s => s._id);

    return await ConsolidadoSemanal.find({
      trabajador: trabajadorId,
      semana_operativa: { $in: semanaIds }
    })
      .populate('semana_operativa')
      .populate('proyecto_actividad_lote')
      .sort({ 'semana_operativa.fecha_inicio': -1 });
  }
}

module.exports = new ConsolidadoService();