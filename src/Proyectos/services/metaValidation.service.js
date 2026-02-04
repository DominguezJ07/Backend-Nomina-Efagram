const ProyectoActividadLote = require('../models/proyectoActividadLote.model');
const RegistroDiario = require('../../Ejecucion/models/registroDiario.model'); // Futuro
const { ApiError } = require('../../middlewares/errorHandler');
const { ESTADOS_PAL } = require('../../config/constants');

class MetaValidationService {
  /**
   * Validar que la nueva meta sea mayor a la actual
   */
  validateMetaIncremento(metaActual, nuevaMeta) {
    if (nuevaMeta <= metaActual) {
      throw new ApiError(400, `La nueva meta (${nuevaMeta}) debe ser mayor a la actual (${metaActual})`);
    }
    return true;
  }

  /**
   * Validar que un PAL pueda marcarse como CUMPLIDA
   * REGLA: Solo puede marcarse como cumplida si alcanzó la meta mínima
   */
  async validatePuedeCumplir(pal) {
    if (!pal.meta_minima || pal.meta_minima <= 0) {
      throw new ApiError(400, 'No se puede marcar como CUMPLIDA sin tener una meta mínima definida');
    }

    if (pal.cantidad_ejecutada < pal.meta_minima) {
      throw new ApiError(400, 
        `No se puede marcar como CUMPLIDA. Ejecutado: ${pal.cantidad_ejecutada}, Meta: ${pal.meta_minima}`
      );
    }

    return true;
  }

  /**
   * Validar que un periodo pueda cerrarse
   * REGLA: No puede cerrar si hay PALs sin cumplir meta
   */
  async validateCierrePeriodo(fechaInicio, fechaFin, proyectoId = null) {
    const query = {
      fecha_inicio_planificada: { $gte: fechaInicio },
      fecha_fin_planificada: { $lte: fechaFin },
      estado: { $nin: [ESTADOS_PAL.CUMPLIDA, ESTADOS_PAL.CANCELADA] }
    };

    if (proyectoId) {
      query.proyecto = proyectoId;
    }

    const palsIncumplidos = await ProyectoActividadLote.find(query)
      .populate('proyecto')
      .populate('actividad')
      .populate('lote');

    const palsSinCumplirMeta = palsIncumplidos.filter(pal => {
      return pal.cantidad_ejecutada < pal.meta_minima;
    });

    if (palsSinCumplirMeta.length > 0) {
      return {
        puede: false,
        motivo: `Hay ${palsSinCumplirMeta.length} PAL(s) sin cumplir meta mínima`,
        pals: palsSinCumplirMeta.map(p => ({
          codigo: p.codigo,
          proyecto: p.proyecto?.nombre,
          actividad: p.actividad?.nombre,
          lote: p.lote?.nombre,
          metaMinima: p.meta_minima,
          ejecutado: p.cantidad_ejecutada,
          faltante: p.meta_minima - p.cantidad_ejecutada
        }))
      };
    }

    return {
      puede: true,
      motivo: 'Todas las metas mínimas han sido cumplidas',
      pals: []
    };
  }

  /**
   * Calcular resumen de cumplimiento de metas en un rango de fechas
   */
  async getResumenCumplimiento(fechaInicio, fechaFin, filtros = {}) {
    const query = {
      fecha_inicio_planificada: { $gte: fechaInicio },
      fecha_fin_planificada: { $lte: fechaFin },
      ...filtros
    };

    const pals = await ProyectoActividadLote.find(query)
      .populate('proyecto')
      .populate('actividad')
      .populate('lote');

    const total = pals.length;
    const cumplidas = pals.filter(p => p.estado === ESTADOS_PAL.CUMPLIDA).length;
    const enEjecucion = pals.filter(p => p.estado === ESTADOS_PAL.EN_EJECUCION).length;
    const pendientes = pals.filter(p => p.estado === ESTADOS_PAL.PENDIENTE).length;
    const conMetaCumplida = pals.filter(p => p.cumplioMeta).length;
    const sinCumplirMeta = pals.filter(p => !p.cumplioMeta && p.estado !== ESTADOS_PAL.CANCELADA).length;

    return {
      total,
      cumplidas,
      enEjecucion,
      pendientes,
      conMetaCumplida,
      sinCumplirMeta,
      porcentajeCumplimiento: total > 0 ? Math.round((cumplidas / total) * 100) : 0,
      porcentajeMetaCumplida: total > 0 ? Math.round((conMetaCumplida / total) * 100) : 0
    };
  }

  /**
   * Obtener PALs bloqueados para cierre
   */
  async getPalsBloqueadosParaCierre(fechaInicio, fechaFin) {
    const validacion = await this.validateCierrePeriodo(fechaInicio, fechaFin);
    
    if (validacion.puede) {
      return [];
    }

    return validacion.pals;
  }

  /**
   * Validar coherencia de fechas en PAL
   */
  validateFechasPAL(fechaInicio, fechaFin) {
    if (fechaFin && fechaFin < fechaInicio) {
      throw new ApiError(400, 'La fecha fin no puede ser anterior a la fecha de inicio');
    }
    return true;
  }

  /**
   * Verificar si un PAL está atrasado
   */
  isPALAtrasado(pal) {
    const hoy = new Date();
    
    if (pal.fecha_fin_planificada && hoy > pal.fecha_fin_planificada) {
      if (pal.estado !== ESTADOS_PAL.CUMPLIDA && pal.estado !== ESTADOS_PAL.CANCELADA) {
        return {
          atrasado: true,
          diasAtraso: Math.ceil((hoy - pal.fecha_fin_planificada) / (1000 * 60 * 60 * 24)),
          porcentajeAvance: pal.porcentajeAvance
        };
      }
    }

    return {
      atrasado: false,
      diasAtraso: 0,
      porcentajeAvance: pal.porcentajeAvance
    };
  }

  /**
   * Obtener PALs atrasados
   */
  async getPalsAtrasados(proyectoId = null) {
    const query = {
      estado: { $nin: [ESTADOS_PAL.CUMPLIDA, ESTADOS_PAL.CANCELADA] },
      fecha_fin_planificada: { $lt: new Date() }
    };

    if (proyectoId) {
      query.proyecto = proyectoId;
    }

    const pals = await ProyectoActividadLote.find(query)
      .populate('proyecto')
      .populate('actividad')
      .populate('lote');

    return pals.map(pal => ({
      ...pal.toObject(),
      atrasoInfo: this.isPALAtrasado(pal)
    }));
  }
}

module.exports = new MetaValidationService();