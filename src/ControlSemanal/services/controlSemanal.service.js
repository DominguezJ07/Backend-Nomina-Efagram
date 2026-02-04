const SemanaOperativa = require('../models/semanaOperativa.model');
const consolidadoService = require('./consolidado.service');
const indicadorService = require('./indicador.service');
const alertaService = require('./alerta.service');
const { ApiError } = require('../../middlewares/errorHandler');

class ControlSemanalService {
  /**
   * Procesar semana completa (consolidados + indicadores + alertas)
   */
  async procesarSemanaCompleta(semanaId, procesadoPorId) {
    const semana = await SemanaOperativa.findById(semanaId);
    if (!semana) {
      throw new ApiError(404, 'Semana no encontrada');
    }

    if (semana.estado === 'CERRADA') {
      throw new ApiError(400, 'La semana ya está cerrada');
    }

    const resultado = {
      semana: semana.codigo,
      consolidados: [],
      indicadores: [],
      alertas: []
    };

    try {
      // 1. Generar consolidados
      const consolidados = await consolidadoService.generarConsolidadosSemana(
        semanaId,
        procesadoPorId
      );
      resultado.consolidados = consolidados;

      // 2. Generar indicadores globales
      const indicadorGlobal = await indicadorService.generarIndicadoresGlobales(semanaId);
      resultado.indicadores.push(indicadorGlobal);

      // 3. Generar alertas
      const alertas = await alertaService.generarAlertasSemana(semanaId);
      resultado.alertas = alertas;

      return resultado;
    } catch (error) {
      throw new ApiError(500, `Error al procesar semana: ${error.message}`);
    }
  }

  /**
   * Obtener resumen ejecutivo de una semana
   */
  async getResumenEjecutivo(semanaId) {
    const semana = await SemanaOperativa.findById(semanaId);
    if (!semana) {
      throw new ApiError(404, 'Semana no encontrada');
    }

    const ConsolidadoSemanal = require('../models/consolidadoSemanal.model');
    const IndicadorDesempeño = require('../models/indicadorDesempeño.model');
    const AlertaSemanal = require('../models/alertaSemanal.model');

    // Consolidados
    const totalConsolidados = await ConsolidadoSemanal.countDocuments({
      semana_operativa: semanaId
    });

    const consolidadosAprobados = await ConsolidadoSemanal.countDocuments({
      semana_operativa: semanaId,
      estado: 'APROBADO'
    });

    // Indicadores
    const indicadorGlobal = await IndicadorDesempeño.findOne({
      semana_operativa: semanaId,
      tipo_alcance: 'GLOBAL'
    });

    // Alertas
    const alertasPorNivel = await AlertaSemanal.aggregate([
      { $match: { semana_operativa: semana._id } },
      {
        $group: {
          _id: '$nivel',
          count: { $sum: 1 }
        }
      }
    ]);

    const alertasPorEstado = await AlertaSemanal.aggregate([
      { $match: { semana_operativa: semana._id } },
      {
        $group: {
          _id: '$estado',
          count: { $sum: 1 }
        }
      }
    ]);

    // Trabajadores destacados (top 5)
    const topTrabajadores = await ConsolidadoSemanal.find({
      semana_operativa: semanaId,
      estado: { $in: ['APROBADO', 'CONSOLIDADO'] }
    })
      .populate('trabajador')
      .sort({ porcentaje_rendimiento: -1 })
      .limit(5);

    // Trabajadores con bajo rendimiento
    const bajoRendimiento = await ConsolidadoSemanal.find({
      semana_operativa: semanaId,
      porcentaje_rendimiento: { $lt: 60 }
    })
      .populate('trabajador')
      .sort({ porcentaje_rendimiento: 1 });

    return {
      semana: {
        codigo: semana.codigo,
        fecha_inicio: semana.fecha_inicio,
        fecha_fin: semana.fecha_fin,
        estado: semana.estado
      },
      consolidados: {
        total: totalConsolidados,
        aprobados: consolidadosAprobados,
        pendientes: totalConsolidados - consolidadosAprobados
      },
      indicadores: indicadorGlobal || null,
      alertas: {
        porNivel: alertasPorNivel,
        porEstado: alertasPorEstado,
        total: alertasPorNivel.reduce((sum, a) => sum + a.count, 0)
      },
      trabajadores: {
        destacados: topTrabajadores,
        bajoRendimiento: bajoRendimiento
      }
    };
  }

  /**
   * Comparar rendimiento entre semanas
   */
  async compararSemanas(semanaId1, semanaId2) {
    const IndicadorDesempeño = require('../models/indicadorDesempeño.model');

    const indicador1 = await IndicadorDesempeño.findOne({
      semana_operativa: semanaId1,
      tipo_alcance: 'GLOBAL'
    }).populate('semana_operativa');

    const indicador2 = await IndicadorDesempeño.findOne({
      semana_operativa: semanaId2,
      tipo_alcance: 'GLOBAL'
    }).populate('semana_operativa');

    if (!indicador1 || !indicador2) {
      throw new ApiError(404, 'No se encontraron indicadores para comparar');
    }

    const calcularDiferencia = (val1, val2) => {
      if (val2 === 0) return 0;
      return ((val1 - val2) / val2) * 100;
    };

    return {
      semana1: {
        codigo: indicador1.semana_operativa.codigo,
        indicadores: indicador1
      },
      semana2: {
        codigo: indicador2.semana_operativa.codigo,
        indicadores: indicador2
      },
      diferencias: {
        trabajadores: calcularDiferencia(
          indicador1.total_trabajadores,
          indicador2.total_trabajadores
        ),
        produccion: calcularDiferencia(
          indicador1.total_produccion,
          indicador2.total_produccion
        ),
        cumplimiento: calcularDiferencia(
          indicador1.porcentaje_cumplimiento,
          indicador2.porcentaje_cumplimiento
        ),
        alertas: calcularDiferencia(
          indicador1.total_alertas,
          indicador2.total_alertas
        )
      }
    };
  }

  /**
   * Obtener tendencias de rendimiento
   */
  async getTendenciasRendimiento(fechaInicio, fechaFin) {
    const ConsolidadoSemanal = require('../models/consolidadoSemanal.model');

    const semanas = await SemanaOperativa.find({
      fecha_inicio: { $gte: fechaInicio },
      fecha_fin: { $lte: fechaFin }
    }).sort({ fecha_inicio: 1 });

    const tendencias = [];

    for (const semana of semanas) {
      const consolidados = await ConsolidadoSemanal.find({
        semana_operativa: semana._id
      });

      if (consolidados.length > 0) {
        const promedioRendimiento = consolidados.reduce(
          (sum, c) => sum + c.porcentaje_rendimiento,
          0
        ) / consolidados.length;

        const promedioCumplimiento = consolidados.filter(
          c => c.cumplio_meta_semanal
        ).length / consolidados.length * 100;

        tendencias.push({
          semana: semana.codigo,
          fecha: semana.fecha_inicio,
          promedioRendimiento: Math.round(promedioRendimiento),
          promedioCumplimiento: Math.round(promedioCumplimiento),
          totalTrabajadores: new Set(consolidados.map(c => c.trabajador.toString())).size
        });
      }
    }

    return tendencias;
  }

  /**
   * Validar si una semana puede cerrarse
   */
  async validarCierreSemana(semanaId) {
    const semana = await SemanaOperativa.findById(semanaId);
    if (!semana) {
      throw new ApiError(404, 'Semana no encontrada');
    }

    const validaciones = {
      puede: true,
      motivos: [],
      advertencias: []
    };

    const ConsolidadoSemanal = require('../models/consolidadoSemanal.model');
    const AlertaSemanal = require('../models/alertaSemanal.model');

    // 1. Verificar que existan consolidados
    const consolidados = await ConsolidadoSemanal.countDocuments({
      semana_operativa: semanaId
    });

    if (consolidados === 0) {
      validaciones.puede = false;
      validaciones.motivos.push('No hay consolidados generados para esta semana');
    }

    // 2. Verificar consolidados pendientes
    const consolidadosPendientes = await ConsolidadoSemanal.countDocuments({
      semana_operativa: semanaId,
      estado: 'BORRADOR'
    });

    if (consolidadosPendientes > 0) {
      validaciones.advertencias.push(
        `Hay ${consolidadosPendientes} consolidado(s) en borrador`
      );
    }

    // 3. Verificar alertas críticas pendientes
    const alertasCriticas = await AlertaSemanal.countDocuments({
      semana_operativa: semanaId,
      nivel: 'CRITICA',
      estado: 'PENDIENTE'
    });

    if (alertasCriticas > 0) {
      validaciones.advertencias.push(
        `Hay ${alertasCriticas} alerta(s) crítica(s) sin resolver`
      );
    }

    // 4. Verificar metas de PALs (de la semana operativa original)
    const RegistroDiario = require('../../Ejecucion/models/registroDiario.model');
    const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');

    const registros = await RegistroDiario.find({
      fecha: { $gte: semana.fecha_inicio, $lte: semana.fecha_fin }
    }).distinct('proyecto_actividad_lote');

    const palsIncumplidos = [];

    for (const palId of registros) {
      const pal = await ProyectoActividadLote.findById(palId);
      if (pal && !pal.cumplioMeta && pal.estado !== 'CANCELADA') {
        palsIncumplidos.push({
          codigo: pal.codigo,
          avance: pal.porcentajeAvance
        });
      }
    }

    if (palsIncumplidos.length > 0) {
      validaciones.puede = false;
      validaciones.motivos.push(
        `Hay ${palsIncumplidos.length} PAL(s) sin cumplir meta mínima`
      );
      validaciones.palsIncumplidos = palsIncumplidos;
    }

    return validaciones;
  }
}

module.exports = new ControlSemanalService();