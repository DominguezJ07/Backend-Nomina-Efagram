const Persona = require('../models/persona.model');
const User = require('../../Auth/models/user.model');
const { ApiError } = require('../../middlewares/errorHandler');

class PersonaService {
  /**
   * Validar que una persona exista
   */
  async validatePersonaExists(personaId) {
    const persona = await Persona.findById(personaId)
      .populate('finca')
      .populate('proceso')
      .populate('supervisor', 'nombres apellidos num_doc cargo');

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
   * Obtener listado de personas
   */
  async getPersonas(filters = {}) {
    const query = {};

    if (filters.estado) query.estado = filters.estado;
    if (filters.finca) query.finca = filters.finca;
    if (filters.proceso) query.proceso = filters.proceso;
    if (filters.supervisor) query.supervisor = filters.supervisor;
    if (filters.tipo_contrato) query.tipo_contrato = filters.tipo_contrato;

    return await Persona.find(query)
      .populate('finca')
      .populate('proceso')
      .populate('supervisor', 'nombres apellidos num_doc cargo')
      .sort({ apellidos: 1, nombres: 1 });
  }

  /**
   * Obtener una persona por ID
   */
  async getPersonaById(personaId) {
    return await Persona.findById(personaId)
      .populate('finca')
      .populate('proceso')
      .populate('supervisor', 'nombres apellidos num_doc cargo');
  }

  /**
   * Crear persona
   */
  async createPersona(data) {
    await this.validateDocumentoUnico(data.num_doc);

    const persona = await Persona.create(data);

    return await Persona.findById(persona._id)
      .populate('finca')
      .populate('proceso')
      .populate('supervisor', 'nombres apellidos num_doc cargo');
  }

  /**
   * Actualizar persona
   */
  async updatePersona(personaId, data) {
    const persona = await this.validatePersonaExists(personaId);

    if (data.num_doc && data.num_doc !== persona.num_doc) {
      await this.validateDocumentoUnico(data.num_doc, personaId);
    }

    Object.keys(data).forEach((key) => {
      persona[key] = data[key];
    });

    await persona.save();

    return await Persona.findById(persona._id)
      .populate('finca')
      .populate('proceso')
      .populate('supervisor', 'nombres apellidos num_doc cargo');
  }

  /**
   * Buscar personas
   */
  async buscarPersonas(q) {
    const regex = new RegExp(q, 'i');

    return await Persona.find({
      $or: [
        { num_doc: regex },
        { nombres: regex },
        { apellidos: regex },
        { cargo: regex },
        { email: regex },
      ]
    })
      .populate('finca')
      .populate('proceso')
      .populate('supervisor', 'nombres apellidos num_doc cargo')
      .sort({ apellidos: 1, nombres: 1 });
  }

  /**
   * Vincular persona con usuario
   */
  async vincularUsuario(personaId, usuarioId) {
    const persona = await this.validatePersonaExists(personaId);

    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      throw new ApiError(404, 'Usuario no encontrado');
    }

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
    return await Persona.find({ estado })
      .populate('finca')
      .populate('proceso')
      .populate('supervisor', 'nombres apellidos num_doc cargo')
      .sort({ apellidos: 1, nombres: 1 });
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