const AsignacionSupervisor = require('../models/asignacionSupervisor.model');
const Persona = require('../models/persona.model');
const Lote = require('../../Territorial/models/lote.model'); // ✅ RUTA CORRECTA
const { ApiError } = require('../../middlewares/errorHandler');

class AsignacionSupervisorService {
  /**
   * Validar que una asignación exista
   */
  async validateAsignacionExists(asignacionId) {
    const asignacion = await AsignacionSupervisor.findById(asignacionId);
    if (!asignacion) {
      throw new ApiError(404, 'Asignación no encontrada');
    }
    return asignacion;
  }

  /**
   * Obtener asignaciones activas de un supervisor
   */
  async getAsignacionesActivasBySupervisor(supervisorId) {
    return await AsignacionSupervisor.find({
      supervisor: supervisorId,
      activa: true
    })
      .populate({
        path: 'lote',
        select: 'codigo nombre area finca',
        populate: {
          path: 'finca',
          select: 'codigo nombre nucleo',
          populate: {
            path: 'nucleo',
            select: 'codigo nombre'
          }
        }
      })
      .sort({ fecha_inicio: -1 });
  }

  /**
   * Obtener el supervisor actual de un lote
   */
  async getSupervisorActualDelLote(loteId) {
    const asignacion = await AsignacionSupervisor.findOne({
      lote: loteId,
      activa: true
    }).populate('supervisor', 'nombres apellidos cedula');

    return asignacion ? asignacion.supervisor : null;
  }

  /**
   * Verificar si un supervisor tiene asignaciones activas
   */
  async supervisorTieneAsignacionesActivas(supervisorId) {
    const count = await AsignacionSupervisor.countDocuments({
      supervisor: supervisorId,
      activa: true
    });
    return count > 0;
  }

  /**
   * Obtener historial de asignaciones de un lote
   */
  async getHistorialLote(loteId) {
    return await AsignacionSupervisor.find({ lote: loteId })
      .populate('supervisor', 'nombres apellidos cedula')
      .populate({
        path: 'lote',
        select: 'codigo nombre area finca',
        populate: {
          path: 'finca',
          select: 'codigo nombre'
        }
      })
      .sort({ fecha_inicio: -1 });
  }

  /**
   * Reasignar lote a otro supervisor
   */
  async reasignarLote(loteId, nuevoSupervisorId, observaciones = null) {
    // Validar que el nuevo supervisor existe
    const supervisor = await Persona.findById(nuevoSupervisorId);
    if (!supervisor) {
      throw new ApiError(404, 'Supervisor no encontrado');
    }
    if (supervisor.estado !== 'ACTIVO') {
      throw new ApiError(400, 'El supervisor no está activo');
    }

    // Validar que el lote existe
    const lote = await Lote.findById(loteId);
    if (!lote) {
      throw new ApiError(404, 'Lote no encontrado');
    }
    if (!lote.activo) {
      throw new ApiError(400, 'El lote no está activo');
    }

    // Finalizar asignación actual si existe
    const asignacionActual = await AsignacionSupervisor.findOne({
      lote: loteId,
      activa: true
    });

    if (asignacionActual) {
      await asignacionActual.finalizar();
      if (observaciones) {
        asignacionActual.observaciones = 
          (asignacionActual.observaciones || '') + 
          ` | Reasignado: ${observaciones}`;
        await asignacionActual.save();
      }
    }

    // Crear nueva asignación
    const nuevaAsignacion = await AsignacionSupervisor.create({
      supervisor: nuevoSupervisorId,
      lote: loteId,
      fecha_inicio: new Date(),
      observaciones: observaciones || 'Reasignación de lote'
    });

    await nuevaAsignacion.populate('supervisor', 'nombres apellidos cedula');
    await nuevaAsignacion.populate({
      path: 'lote',
      select: 'codigo nombre area finca',
      populate: {
        path: 'finca',
        select: 'codigo nombre nucleo',
        populate: {
          path: 'nucleo',
          select: 'codigo nombre'
        }
      }
    });

    return {
      asignacionAnterior: asignacionActual,
      nuevaAsignacion
    };
  }

  /**
   * Obtener estadísticas de asignaciones de un supervisor
   */
  async getEstadisticasSupervisor(supervisorId) {
    // Validar que el supervisor existe
    const supervisor = await Persona.findById(supervisorId);
    if (!supervisor) {
      throw new ApiError(404, 'Supervisor no encontrado');
    }

    const asignacionesActivas = await AsignacionSupervisor.countDocuments({
      supervisor: supervisorId,
      activa: true
    });

    const asignacionesFinalizadas = await AsignacionSupervisor.countDocuments({
      supervisor: supervisorId,
      activa: false
    });

    const asignaciones = await AsignacionSupervisor.find({
      supervisor: supervisorId,
      activa: true
    }).populate('lote', 'area');

    const areaTotalHectareas = asignaciones.reduce((total, asig) => {
      return total + (asig.lote?.area || 0);
    }, 0);

    return {
      asignacionesActivas,
      asignacionesFinalizadas,
      totalAsignaciones: asignacionesActivas + asignacionesFinalizadas,
      areaTotalHectareas
    };
  }
}

module.exports = new AsignacionSupervisorService();