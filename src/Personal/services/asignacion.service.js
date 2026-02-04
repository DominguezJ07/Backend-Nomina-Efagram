const AsignacionSupervisor = require('../models/asignacionSupervisor.model');
const AsignacionTrabajador = require('../models/asignacionTrabajador.model');
const Lote = require('../../Territorial/models/lote.model');
const { ApiError } = require('../../middlewares/errorHandler');

class AsignacionService {
  /**
   * Verificar si un supervisor tiene acceso a un lote
   */
  async verificarAccesoSupervisor(supervisorId, loteId) {
    // Obtener el lote con su jerarquía completa
    const lote = await Lote.findById(loteId).populate({
      path: 'finca',
      populate: {
        path: 'nucleo',
        populate: { path: 'zona' }
      }
    });

    if (!lote) {
      throw new ApiError(404, 'Lote no encontrado');
    }

    // Buscar asignaciones activas del supervisor
    const asignaciones = await AsignacionSupervisor.find({
      supervisor: supervisorId,
      activa: true
    });

    for (const asig of asignaciones) {
      // Si está asignado al lote específico
      if (asig.lote && asig.lote.toString() === loteId.toString()) {
        return true;
      }

      // Si está asignado a la finca del lote
      if (asig.finca && asig.finca.toString() === lote.finca._id.toString()) {
        return true;
      }

      // Si está asignado al núcleo del lote
      if (asig.nucleo && asig.nucleo.toString() === lote.finca.nucleo._id.toString()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Verificar solapamiento de horarios para un trabajador
   */
  async verificarSolapamientoHorario(trabajadorId, fecha, horaInicio, horaFin, asignacionIdExcluir = null) {
    const query = {
      trabajador: trabajadorId,
      activa: true,
      fecha_inicio: { $lte: fecha }
    };

    if (asignacionIdExcluir) {
      query._id = { $ne: asignacionIdExcluir };
    }

    const asignaciones = await AsignacionTrabajador.find(query);

    for (const asig of asignaciones) {
      // Si la fecha fin existe y es anterior a la fecha consultada, no hay solapamiento
      if (asig.fecha_fin && asig.fecha_fin < fecha) {
        continue;
      }

      // Verificar solapamiento de horarios
      const inicioAsig = asig.horario.hora_entrada;
      const finAsig = asig.horario.hora_salida;

      if (
        (horaInicio >= inicioAsig && horaInicio < finAsig) ||
        (horaFin > inicioAsig && horaFin <= finAsig) ||
        (horaInicio <= inicioAsig && horaFin >= finAsig)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Finalizar asignaciones de un trabajador en una fecha
   */
  async finalizarAsignaciones(trabajadorId, fecha, motivo) {
    const asignaciones = await AsignacionTrabajador.find({
      trabajador: trabajadorId,
      activa: true
    });

    for (const asig of asignaciones) {
      asig.activa = false;
      asig.fecha_fin = fecha;
      asig.observaciones = motivo;
      await asig.save();
    }

    return asignaciones.length;
  }
}

module.exports = new AsignacionService();