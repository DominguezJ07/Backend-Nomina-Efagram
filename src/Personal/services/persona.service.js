const Persona = require('../models/persona.model');
const User = require('../../Auth/models/user.model');
const { ApiError } = require('../../middlewares/errorHandler');

class PersonaService {
  /**
   * Validar que una persona exista
   */
  async validatePersonaExists(personaId) {
    const persona = await Persona.findById(personaId);
    if (!persona) {
      throw new ApiError(404, 'Persona no encontrada');
    }
    return persona;
  }

  /**
   * Validar que el documento no esté duplicado
   */
  async validateDocumentoUnico(num_doc, personaId = null) {
    const query = { num_doc };
    if (personaId) {
      query._id = { $ne: personaId };
    }

    const exists = await Persona.findOne(query);
    if (exists) {
      throw new ApiError(409, 'El número de documento ya está registrado');
    }
  }

  /**
   * Vincular persona con usuario
   */
  async vincularUsuario(personaId, usuarioId) {
    const persona = await this.validatePersonaExists(personaId);
    
    // Verificar que el usuario exista
    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      throw new ApiError(404, 'Usuario no encontrado');
    }

    // Verificar que el usuario no esté vinculado a otra persona
    const personaVinculada = await Persona.findOne({ 
      usuario: usuarioId, 
      _id: { $ne: personaId } 
    });

    if (personaVinculada) {
      throw new ApiError(409, 'El usuario ya está vinculado a otra persona');
    }

    persona.usuario = usuarioId;
    await persona.save();

    return persona;
  }

  /**
   * Obtener personas por estado
   */
  async getPersonasByEstado(estado) {
    return await Persona.find({ estado }).sort({ apellidos: 1 });
  }

  /**
   * Retirar persona
   */
  async retirarPersona(personaId, motivo) {
    const persona = await this.validatePersonaExists(personaId);

    if (persona.estado === 'RETIRADO') {
      throw new ApiError(400, 'La persona ya está retirada');
    }

    persona.estado = 'RETIRADO';
    persona.fecha_retiro = new Date();
    persona.motivo_retiro = motivo;

    await persona.save();

    return persona;
  }
}

module.exports = new PersonaService();