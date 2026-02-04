const IndicadorDesempeño = require('../models/indicadorDesempeño.model');
const ConsolidadoSemanal = require('../models/consolidadoSemanal.model');
const AlertaSemanal = require('../models/alertaSemanal.model');
const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const { ApiError } = require('../../middlewares/errorHandler');

class IndicadorService {
  /**
   * Generar indicadores globales de una semana
   */
  async generarIndicadoresGlobales(semanaId) {
    const consolidados = await ConsolidadoSemanal.find({
      semana_operativa: semanaId,
      estado: { $in: ['CONSOLIDADO', 'APROBADO', 'CERRADO'] }
    });

    const trabajadoresUnicos = new Set(consolidados.map(c => c.trabajador.toString()));
    const total_trabajadores = trabajadoresUnicos.size;
    const total_dias_trabajados = consolidados.reduce((sum, c) => sum + c.dias_trabajados, 0);
    const total_horas = consolidados.reduce((sum, c) => sum + c.total_horas, 0);
    const total_produccion = consolidados.reduce((sum, c) => sum + c.total_ejecutado, 0);

    const promedio_diario_general = total_dias_trabajados > 0
      ? total_produccion / total_dias_trabajados
      : 0;

    // PALs
    const palsUnicos = new Set(consolidados.map(c => c.proyecto_actividad_lote.toString()));
    const palsIds = Array.from(palsUnicos);
    const pals = await ProyectoActividadLote.find({ _id: { $in: palsIds } });
    
    const pals_asignados = pals.length;
    const pals_cumplidos = pals.filter(p => p.cumplioMeta).length;
    const porcentaje_cumplimiento = pals_asignados > 0
      ? (pals_cumplidos / pals_asignados) * 100
      : 0;

    // Clasificación de trabajadores
    const clasificaciones = {
      EXCELENTE: 0,
      BUENO: 0,
      REGULAR: 0,
      BAJO: 0
    };

    consolidados.forEach(c => {
      const clasificacion = c.clasificacion_rendimiento;
      if (clasificacion === 'EXCELENTE') clasificaciones.EXCELENTE++;
      else if (clasificacion === 'BUENO') clasificaciones.BUENO++;
      else if (clasificacion === 'REGULAR') clasificaciones.REGULAR++;
      else clasificaciones.BAJO++;
    });

    // Alertas
    const alertas = await AlertaSemanal.find({ semana_operativa: semanaId });
    const total_alertas = alertas.length;
    const alertas_criticas = alertas.filter(a => a.nivel === 'CRITICA').length;

    // Generar código
    const SemanaOperativa = require('../models/semanaOperativa.model');
    const semana = await SemanaOperativa.findById(semanaId);
    const codigo = `IND-${semana.codigo}-GLOBAL`;

    // Crear o actualizar indicador
    let indicador = await IndicadorDesempeño.findOne({
      semana_operativa: semanaId,
      tipo_alcance: 'GLOBAL'
    });

    const data = {
      codigo,
      semana_operativa: semanaId,
      tipo_alcance: 'GLOBAL',
      total_trabajadores,
      total_dias_trabajados,
      total_horas,
      total_produccion,
      promedio_diario_general,
      pals_asignados,
      pals_cumplidos,
      porcentaje_cumplimiento,
      trabajadores_excelentes: clasificaciones.EXCELENTE,
      trabajadores_buenos: clasificaciones.BUENO,
      trabajadores_regulares: clasificaciones.REGULAR,
      trabajadores_bajos: clasificaciones.BAJO,
      total_alertas,
      alertas_criticas
    };

    if (indicador) {
      Object.assign(indicador, data);
      await indicador.save();
    } else {
      indicador = await IndicadorDesempeño.create(data);
    }

    return indicador;
  }

  /**
   * Generar indicadores por proyecto
   */
  async generarIndicadoresProyecto(semanaId, proyectoId) {
    const consolidados = await ConsolidadoSemanal.find({
      semana_operativa: semanaId,
      estado: { $in: ['CONSOLIDADO', 'APROBADO', 'CERRADO'] }
    }).populate('proyecto_actividad_lote');

    // Filtrar por proyecto
    const consolidadosProyecto = consolidados.filter(c =>
      c.proyecto_actividad_lote?.proyecto?.toString() === proyectoId.toString()
    );

    // Similar al global pero filtrado
    const trabajadoresUnicos = new Set(consolidadosProyecto.map(c => c.trabajador.toString()));
    const total_trabajadores = trabajadoresUnicos.size;
    const total_produccion = consolidadosProyecto.reduce((sum, c) => sum + c.total_ejecutado, 0);

    // ... similar al método anterior pero con datos del proyecto

    const SemanaOperativa = require('../models/semanaOperativa.model');
    const semana = await SemanaOperativa.findById(semanaId);
    const Proyecto = require('../../Proyectos/models/proyecto.model');
    const proyecto = await Proyecto.findById(proyectoId);
    
    const codigo = `IND-${semana.codigo}-PROY-${proyecto.codigo}`;

    let indicador = await IndicadorDesempeño.findOne({
      semana_operativa: semanaId,
      tipo_alcance: 'PROYECTO',
      referencia: proyectoId
    });

    const data = {
      codigo,
      semana_operativa: semanaId,
      tipo_alcance: 'PROYECTO',
      referencia: proyectoId,
      tipo_referencia: 'Proyecto',
      total_trabajadores,
      total_produccion
      // ... más datos
    };

    if (indicador) {
      Object.assign(indicador, data);
      await indicador.save();
    } else {
      indicador = await IndicadorDesempeño.create(data);
    }

    return indicador;
  }
}

module.exports = new IndicadorService();