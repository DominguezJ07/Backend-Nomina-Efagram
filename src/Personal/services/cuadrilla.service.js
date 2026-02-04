const Cuadrilla = require('../models/cuadrilla.model');
const Persona = require('../models/persona.model');
const { ApiError } = require('../../middlewares/errorHandler');

class CuadrillaService {
  /**
   * Validar que una cuadrilla exista
   */
  async validateCuadrillaExists(cuadrillaId) {
    const cuadrilla = await Cuadrilla.findById(cuadrillaId);
    if (!cuadrilla) {
      throw new ApiError(404, 'Cuadrilla no encontrada');
    }
    return cuadrilla;
  }

  /**
   * Validar que el supervisor sea una persona válida
   */
  async validateSupervisor(personaId) {
    const persona = await Persona.findById(personaId);
    if (!persona) {
      throw new ApiError(404, 'Supervisor no encontrado');
    }
    if (persona.estado !== 'ACTIVO') {
      throw new ApiError(400, 'El supervisor no está activo');
    }
    return persona;
  }

  /**
   * Validar que una persona exista y esté activa
   */
  async validatePersona(personaId) {
    const persona = await Persona.findById(personaId);
    if (!persona) {
      throw new ApiError(404, `Persona ${personaId} no encontrada`);
    }
    if (persona.estado !== 'ACTIVO') {
      throw new ApiError(400, `La persona ${persona.nombreCompleto} no está activa`);
    }
    return persona;
  }

  /**
   * Agregar múltiples miembros a una cuadrilla
   */
  async agregarMiembros(cuadrillaId, personasIds) {
    const cuadrilla = await this.validateCuadrillaExists(cuadrillaId);

    for (const personaId of personasIds) {
      await this.validatePersona(personaId);
      await cuadrilla.agregarMiembro(personaId);
    }

    await cuadrilla.populate('miembros.persona');
    await cuadrilla.populate('supervisor');
    await cuadrilla.populate('nucleo');
    
    return cuadrilla;
  }

  /**
   * Obtener cuadrillas por supervisor
   */
  async getCuadrillasBySupervisor(supervisorId) {
    return await Cuadrilla.find({ supervisor: supervisorId, activa: true })
      .populate('supervisor')
      .populate('nucleo')
      .populate('miembros.persona');
  }
}

module.exports = new CuadrillaService();