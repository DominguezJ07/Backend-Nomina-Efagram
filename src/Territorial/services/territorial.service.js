const Zona = require('../models/zona.model');
const Nucleo = require('../models/nucleo.model');
const Finca = require('../models/finca.model');
const Lote = require('../models/lote.model');
const { ApiError } = require('../../middlewares/errorHandler');

class TerritorialService {
 
  /**
   * Validar que una zona exista
   */
  async validateZonaExists(zonaId) {
    const zona = await Zona.findById(zonaId);
    if (!zona) {
      throw new ApiError(404, 'Zona no encontrada');
    }
    return zona;
  }

  /**
   * Validar que un núcleo exista y pertenezca a la zona
   */
  async validateNucleoExists(nucleoId, zonaId = null) {
    const nucleo = await Nucleo.findById(nucleoId).populate('zona');
    if (!nucleo) {
      throw new ApiError(404, 'Núcleo no encontrado');
    }
    
    if (zonaId && nucleo.zona._id.toString() !== zonaId.toString()) {
      throw new ApiError(400, 'El núcleo no pertenece a la zona especificada');
    }
    
    return nucleo;
  }

  /**
   * Validar que una finca exista y pertenezca al núcleo
   */
  async validateFincaExists(fincaId, nucleoId = null) {
    const finca = await Finca.findById(fincaId).populate('nucleo');
    if (!finca) {
      throw new ApiError(404, 'Finca no encontrada');
    }
    
    if (nucleoId && finca.nucleo._id.toString() !== nucleoId.toString()) {
      throw new ApiError(400, 'La finca no pertenece al núcleo especificado');
    }
    
    return finca;
  }

  /**
   * Validar que un lote exista y pertenezca a la finca
   */
  async validateLoteExists(loteId, fincaId = null) {
    const lote = await Lote.findById(loteId).populate('finca');
    if (!lote) {
      throw new ApiError(404, 'Lote no encontrado');
    }
    
    if (fincaId && lote.finca._id.toString() !== fincaId.toString()) {
      throw new ApiError(400, 'El lote no pertenece a la finca especificada');
    }
    
    return lote;
  }

  /**
   * Obtener jerarquía completa desde un lote
   */
  async getJerarquiaCompleta(loteId) {
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

    return {
      lote: {
        id: lote._id,
        codigo: lote.codigo,
        nombre: lote.nombre,
        area: lote.area
      },
      finca: {
        id: lote.finca._id,
        codigo: lote.finca.codigo,
        nombre: lote.finca.nombre
      },
      nucleo: {
        id: lote.finca.nucleo._id,
        codigo: lote.finca.nucleo.codigo,
        nombre: lote.finca.nucleo.nombre
      },
      zona: {
        id: lote.finca.nucleo.zona._id,
        codigo: lote.finca.nucleo.zona.codigo,
        nombre: lote.finca.nucleo.zona.nombre
      }
    };
  }
}

module.exports = new TerritorialService();