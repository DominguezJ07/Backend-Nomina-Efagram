const AlertaSemanal = require('../models/alertaSemanal.model');
const ConsolidadoSemanal = require('../models/consolidadoSemanal.model');
const ProyectoActividadLote = require('../../Proyectos/models/proyectoActividadLote.model');
const { ApiError } = require('../../middlewares/errorHandler');

class AlertaService {
  /**
   * Generar alertas automáticas para una semana
   */
  async generarAlertasSemana(semanaId) {
    const alertas = [];

    // 1. Alertas por bajo rendimiento
    const consolidados = await ConsolidadoSemanal.find({
      semana_operativa: semanaId,
      estado: { $in: ['CONSOLIDADO', 'APROBADO'] }
    }).populate('trabajador');

    for (const consolidado of consolidados) {
      if (consolidado.porcentaje_rendimiento < 60 && consolidado.dias_trabajados >= 3) {
        const alerta = await this.crearAlerta({
          semana_operativa: semanaId,
          tipo: 'BAJO_RENDIMIENTO',
          nivel: consolidado.porcentaje_rendimiento < 40 ? 'CRITICA' : 'MEDIA',
          entidad_tipo: 'TRABAJADOR',
          entidad_id: consolidado.trabajador._id,
          entidad_referencia: 'Persona',
          titulo: `Bajo rendimiento: ${consolidado.trabajador.nombres}`,
          descripcion: `El trabajador tiene un rendimiento del ${consolidado.porcentaje_rendimiento.toFixed(1)}% vs esperado`,
          valor_actual: consolidado.promedio_diario,
          valor_esperado: consolidado.rendimiento_esperado,
          diferencia: consolidado.rendimiento_esperado - consolidado.promedio_diario,
          accion_sugerida: 'Revisar asignación de tareas y capacitación'
        });
        alertas.push(alerta);
      }
    }

    // 2. Alertas por metas no cumplidas
    const pals = await ProyectoActividadLote.find({
      estado: { $in: ['EN_EJECUCION', 'PENDIENTE'] }
    }).populate('proyecto');

    for (const pal of pals) {
      if (!pal.cumplioMeta && pal.porcentajeAvance < 50) {
        const alerta = await this.crearAlerta({
          semana_operativa: semanaId,
          tipo: 'META_NO_CUMPLIDA',
          nivel: pal.porcentajeAvance < 25 ? 'CRITICA' : 'ALTA',
          entidad_tipo: 'PAL',
          entidad_id: pal._id,
          entidad_referencia: 'ProyectoActividadLote',
          titulo: `Meta no cumplida: ${pal.codigo}`,
          descripcion: `El PAL tiene un avance del ${pal.porcentajeAvance}%`,
          valor_actual: pal.cantidad_ejecutada,
          valor_esperado: pal.meta_minima,
          diferencia: pal.meta_minima - pal.cantidad_ejecutada,
          accion_sugerida: 'Aumentar recursos o replantear meta'
        });
        alertas.push(alerta);
      }
    }

    return alertas;
  }

  /**
   * Crear una alerta
   */
  async crearAlerta(data) {
    const SemanaOperativa = require('../models/semanaOperativa.model');
    const semana = await SemanaOperativa.findById(data.semana_operativa);
    
    const count = await AlertaSemanal.countDocuments({ semana_operativa: data.semana_operativa });
    const codigo = `ALT-${semana.codigo}-${String(count + 1).padStart(4, '0')}`;

    // Verificar si ya existe una alerta similar
    const existe = await AlertaSemanal.findOne({
      semana_operativa: data.semana_operativa,
      entidad_tipo: data.entidad_tipo,
      entidad_id: data.entidad_id,
      tipo: data.tipo,
      estado: { $in: ['PENDIENTE', 'EN_REVISION'] }
    });

    if (existe) {
      return existe;
    }

    const alerta = await AlertaSemanal.create({
      ...data,
      codigo
    });

    return alerta;
  }
}
module.exports = new AlertaService();