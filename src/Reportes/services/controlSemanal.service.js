const SemanaOperativa = require('../../ControlSemanal/models/semanaOperativa.model');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');

/**
 * Obtener reporte consolidado de semana operativa
 */
const getReporteConsolidadoSemana = async (semanaId) => {
  try {
    const semana = await SemanaOperativa.findById(semanaId).lean();

    if (!semana) {
      throw new Error('Semana operativa no encontrada');
    }

    // Obtener registros de la semana
    const registros = await RegistroDiario.find({
      fecha: {
        $gte: semana.fecha_inicio,
        $lte: semana.fecha_fin
      }
    })
      .populate('trabajador')
      .populate('proyecto_actividad_lote')
      .populate('cuadrilla')
      .lean();

    // Estadísticas generales
    const totalRegistros = registros.length;
    const trabajadoresUnicos = [...new Set(registros.map(r => r.trabajador?._id?.toString()))].length;
    const totalHorasTrabajadas = registros.reduce((sum, r) => sum + (r.horas_trabajadas || 0), 0);
    const totalCantidadEjecutada = registros.reduce((sum, r) => sum + (r.cantidad_ejecutada || 0), 0);

    // Registros por estado
    const porEstado = {
      aprobados: registros.filter(r => r.estado === 'APROBADO').length,
      pendientes: registros.filter(r => r.estado === 'PENDIENTE').length,
      rechazados: registros.filter(r => r.estado === 'RECHAZADO').length
    };

    // Registros por día
    const porDia = {};
    registros.forEach(r => {
      const dia = new Date(r.fecha).toISOString().split('T')[0];
      porDia[dia] = (porDia[dia] || 0) + 1;
    });

    return {
      semana: {
        codigo: semana.codigo,
        fecha_inicio: semana.fecha_inicio,
        fecha_fin: semana.fecha_fin,
        estado: semana.estado
      },
      estadisticas: {
        total_registros: totalRegistros,
        trabajadores_activos: trabajadoresUnicos,
        total_horas_trabajadas: totalHorasTrabajadas,
        total_cantidad_ejecutada: totalCantidadEjecutada,
        promedio_horas_por_registro: totalRegistros > 0
          ? (totalHorasTrabajadas / totalRegistros).toFixed(2)
          : 0
      },
      distribucion_por_estado: porEstado,
      registros_por_dia: porDia,
      registros_detallados: registros
    };
  } catch (error) {
    throw new Error(`Error al generar reporte de semana: ${error.message}`);
  }
};

/**
 * Comparar semanas operativas
 */
const compararSemanas = async (semanaId1, semanaId2) => {
  try {
    const [reporte1, reporte2] = await Promise.all([
      getReporteConsolidadoSemana(semanaId1),
      getReporteConsolidadoSemana(semanaId2)
    ]);

    return {
      semana_1: reporte1,
      semana_2: reporte2,
      comparacion: {
        diferencia_registros: reporte2.estadisticas.total_registros - reporte1.estadisticas.total_registros,
        diferencia_trabajadores: reporte2.estadisticas.trabajadores_activos - reporte1.estadisticas.trabajadores_activos,
        diferencia_horas: reporte2.estadisticas.total_horas_trabajadas - reporte1.estadisticas.total_horas_trabajadas,
        diferencia_cantidad: reporte2.estadisticas.total_cantidad_ejecutada - reporte1.estadisticas.total_cantidad_ejecutada
      }
    };
  } catch (error) {
    throw new Error(`Error al comparar semanas: ${error.message}`);
  }
};

module.exports = {
  getReporteConsolidadoSemana,
  compararSemanas
};