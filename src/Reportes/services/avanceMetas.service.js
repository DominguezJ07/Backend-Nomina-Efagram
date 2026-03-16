const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');

/**
 * Obtener reporte de avance de metas por proyecto
 */
const getAvanceMetasPorProyecto = async (proyectoId, fechaInicio, fechaFin) => {
  try {
    // Filtros base
    const filtro = {};
    if (proyectoId) {
      filtro.proyecto = proyectoId;
    }

    // Obtener todos los PALs
    const pals = await ProyectoActividadLote.find(filtro)
      .populate('proyecto')
      .populate('actividad')
      .populate('lote')
      .lean();

    // Calcular avance por cada PAL
    const reporteDetallado = await Promise.all(
      pals.map(async (pal) => {
        // Calcular cantidad ejecutada en el rango de fechas
        const filtroRegistros = {
          proyecto_actividad_lote: pal._id
        };

        if (fechaInicio && fechaFin) {
          filtroRegistros.fecha = {
            $gte: new Date(fechaInicio),
            $lte: new Date(fechaFin)
          };
        }

        const registros = await RegistroDiario.find(filtroRegistros).lean();
        const cantidadEjecutadaPeriodo = registros.reduce(
          (sum, r) => sum + (r.cantidad_ejecutada || 0),
          0
        );

        const porcentajeAvance = pal.meta_minima > 0
          ? ((pal.cantidad_ejecutada / pal.meta_minima) * 100).toFixed(2)
          : 0;

        return {
          pal_codigo: pal.codigo,
          proyecto: pal.proyecto?.nombre || 'N/A',
          actividad: pal.actividad?.nombre || 'N/A',
          lote: pal.lote?.codigo || 'N/A',
          meta_minima: pal.meta_minima,
          cantidad_ejecutada_total: pal.cantidad_ejecutada,
          cantidad_ejecutada_periodo: cantidadEjecutadaPeriodo,
          porcentaje_avance: parseFloat(porcentajeAvance),
          estado: pal.estado,
          faltante: Math.max(0, pal.meta_minima - pal.cantidad_ejecutada)
        };
      })
    );

    // Resumen general
    const totalMeta = reporteDetallado.reduce((sum, item) => sum + item.meta_minima, 0);
    const totalEjecutado = reporteDetallado.reduce(
      (sum, item) => sum + item.cantidad_ejecutada_total,
      0
    );
    const porcentajeGeneral = totalMeta > 0
      ? ((totalEjecutado / totalMeta) * 100).toFixed(2)
      : 0;

    return {
      resumen: {
        total_pals: reporteDetallado.length,
        meta_total: totalMeta,
        ejecutado_total: totalEjecutado,
        porcentaje_avance_general: parseFloat(porcentajeGeneral),
        pals_cumplidos: reporteDetallado.filter(p => p.estado === 'CUMPLIDA').length,
        pals_en_ejecucion: reporteDetallado.filter(p => p.estado === 'EN_EJECUCION').length,
        pals_pendientes: reporteDetallado.filter(p => p.estado === 'PENDIENTE').length
      },
      detalle: reporteDetallado
    };
  } catch (error) {
    throw new Error(`Error al generar reporte de avance de metas: ${error.message}`);
  }
};

/**
 * Obtener avance por actividad
 */
const getAvancePorActividad = async (fechaInicio, fechaFin) => {
  try {
    const pals = await ProyectoActividadLote.find()
      .populate('actividad')
      .lean();

    // Agrupar por actividad
    const agrupado = {};

    pals.forEach(pal => {
      const actividadNombre = pal.actividad?.nombre || 'Sin actividad';
      
      if (!agrupado[actividadNombre]) {
        agrupado[actividadNombre] = {
          actividad: actividadNombre,
          total_pals: 0,
          meta_total: 0,
          ejecutado_total: 0
        };
      }

      agrupado[actividadNombre].total_pals++;
      agrupado[actividadNombre].meta_total += pal.meta_minima || 0;
      agrupado[actividadNombre].ejecutado_total += pal.cantidad_ejecutada || 0;
    });

    // Convertir a array y calcular porcentajes
    const resultado = Object.values(agrupado).map(item => ({
      ...item,
      porcentaje_avance: item.meta_total > 0
        ? ((item.ejecutado_total / item.meta_total) * 100).toFixed(2)
        : 0
    }));

    return resultado;
  } catch (error) {
    throw new Error(`Error al generar reporte por actividad: ${error.message}`);
  }
};

module.exports = {
  getAvanceMetasPorProyecto,
  getAvancePorActividad
};