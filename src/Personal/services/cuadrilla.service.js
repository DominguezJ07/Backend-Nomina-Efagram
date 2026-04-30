const Cuadrilla = require('../models/cuadrilla.model');
// ✅ REMOVIDO: ya no se importa Persona porque no hay lookups a BD de personas
const { ApiError } = require('../../middlewares/errorHandler');

class CuadrillaService {
  /**
   * Validar que una cuadrilla exista
   * (sin cambios — sigue buscando por ObjectId de cuadrilla en BD propia)
   */
  async validateCuadrillaExists(cuadrillaId) {
    const cuadrilla = await Cuadrilla.findById(cuadrillaId);
    if (!cuadrilla) {
      throw new ApiError(404, 'Cuadrilla no encontrada');
    }
    return cuadrilla;
  }

  /**
   * ✅ CAMBIADO: antes buscaba el supervisor por ObjectId en BD de Persona.
   *    Ahora solo valida que el objeto tenga los campos mínimos requeridos,
   *    ya que el supervisor viene de una API externa y no se almacena en BD local.
   */
  validateSupervisor(supervisorObj) {
    if (!supervisorObj || typeof supervisorObj !== 'object') {
      throw new ApiError(400, 'El supervisor debe ser un objeto');
    }
    if (!supervisorObj.cc || String(supervisorObj.cc).trim() === '') {
      throw new ApiError(400, 'La cédula del supervisor es obligatoria');
    }
    if (!supervisorObj.name || String(supervisorObj.name).trim() === '') {
      throw new ApiError(400, 'El nombre del supervisor es obligatorio');
    }
    return supervisorObj;
  }

  /**
   * ✅ CAMBIADO: antes buscaba la persona por ObjectId en BD de Persona.
   *    Ahora solo valida que el objeto tenga los campos mínimos requeridos,
   *    ya que las personas vienen de una API externa y no se almacenan en BD local.
   */
  validatePersona(personaObj) {
    if (!personaObj || typeof personaObj !== 'object') {
      throw new ApiError(400, 'La persona debe ser un objeto');
    }
    if (!personaObj.cc || String(personaObj.cc).trim() === '') {
      throw new ApiError(400, 'La cédula de la persona es obligatoria');
    }
    if (!personaObj.name || String(personaObj.name).trim() === '') {
      throw new ApiError(400, 'El nombre de la persona es obligatorio');
    }
    return personaObj;
  }

  /**
   * ✅ CAMBIADO: antes recibía array de ObjectIds y hacía lookups a BD.
   *    Ahora recibe array de objetos persona desde API externa.
   */
  async agregarMiembros(cuadrillaId, personasObjs) {
    const cuadrilla = await this.validateCuadrillaExists(cuadrillaId);

    for (const personaObj of personasObjs) {
      this.validatePersona(personaObj);
      await cuadrilla.agregarMiembro(personaObj);
    }

    // ✅ REMOVIDO: .populate() ya no necesario, datos están embebidos
    return cuadrilla;
  }

  /**
   * ✅ CAMBIADO: antes filtraba por supervisor (ObjectId) y hacía .populate().
   *    Ahora filtra por CC del supervisor embebido.
   */
  async getCuadrillasBySupervisor(supervisorCc) {
    return await Cuadrilla.find({
      'supervisor.cc': supervisorCc,
      activa: true
    }).sort({ nombre: 1 });
    // ✅ REMOVIDO: .populate('supervisor'), .populate('nucleo'), .populate('miembros.persona')
  }

  /**
   * ✅ NUEVO: obtener cuadrillas por núcleo (usando id embebido)
   */
  async getCuadrillasByNucleo(nucleoId) {
    return await Cuadrilla.find({
      'nucleo.id': nucleoId,
      activa: true
    }).sort({ nombre: 1 });
  }
}

module.exports = new CuadrillaService();