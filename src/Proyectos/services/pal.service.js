const ProyectoActividadLote = require('../models/proyectoActividadLote.model');
const PrecioNegociado = require('../models/precioNegociado.model');
const { ApiError } = require('../../middlewares/errorHandler');
const { ESTADOS_PAL } = require('../../config/constants');

class PALService {
  /**
   * Validar que un PAL exista
   */
  async validatePALExists(palId) {
    const pal = await ProyectoActividadLote.findById(palId);
    if (!pal) {
      throw new ApiError(404, 'PAL no encontrado');
    }
    return pal;
  }

  /**
   * Actualizar cantidad ejecutada
   */
  async actualizarCantidadEjecutada(palId, cantidad) {
    const pal = await this.validatePALExists(palId);

    if (pal.estado === ESTADOS_PAL.CANCELADA) {
      throw new ApiError(400, 'No se puede actualizar un PAL cancelado');
    }

    if (cantidad < 0) {
      throw new ApiError(400, 'La cantidad no puede ser negativa');
    }

    pal.cantidad_ejecutada = cantidad;

    // Actualizar estado automáticamente
    if (cantidad >= pal.meta_minima && pal.estado !== ESTADOS_PAL.CUMPLIDA) {
      pal.estado = ESTADOS_PAL.CUMPLIDA;
      pal.fecha_fin_real = new Date();
    } else if (cantidad > 0 && pal.estado === ESTADOS_PAL.PENDIENTE) {
      pal.estado = ESTADOS_PAL.EN_EJECUCION;
      pal.fecha_inicio_real = pal.fecha_inicio_real || new Date();
    }

    await pal.save();

    return pal;
  }

  /**
   * Obtener precio vigente de un PAL
   */
  async getPrecioVigente(palId) {
    const precioVigente = await PrecioNegociado.findOne({
      proyecto_actividad_lote: palId,
      activo: true
    })
      .populate('negociado_por')
      .populate('autorizado_por')
      .sort({ version: -1 });

    return precioVigente;
  }

  /**
   * Verificar si cumplió meta mínima
   */
  async verificarCumplimientoMeta(palId) {
    const pal = await this.validatePALExists(palId);

    return {
      cumplioMeta: pal.cumplioMeta,
      metaMinima: pal.meta_minima,
      cantidadEjecutada: pal.cantidad_ejecutada,
      porcentajeAvance: pal.porcentajeAvance,
      faltante: Math.max(0, pal.meta_minima - pal.cantidad_ejecutada)
    };
  }

  /**
   * Aumentar meta mínima (REGLA: solo puede aumentar)
   */
  async aumentarMeta(palId, nuevaMeta, motivo) {
    const pal = await this.validatePALExists(palId);

    if (nuevaMeta <= pal.meta_minima) {
      throw new ApiError(400, 'La nueva meta debe ser mayor a la actual');
    }

    pal.meta_minima = nuevaMeta;
    pal.observaciones = `${pal.observaciones || ''}\n[Meta aumentada] ${motivo}`.trim();

    await pal.save();

    return pal;
  }
}

module.exports = new PALService();
