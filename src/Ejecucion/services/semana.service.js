const SemanaOperativa = require('../../ControlSemanal/models/semanaOperativa.model');
const { DateTime } = require('luxon');

class SemanaService {
  /**
   * Obtener o crear semana operativa para una fecha
   */
  async getOrCreateSemana(fecha) {
    const fechaDT = DateTime.fromJSDate(fecha).setZone('America/Bogota');
    
    // Buscar el jueves de la semana
    let juevesInicio = fechaDT;
    while (juevesInicio.weekday !== 4) {
      juevesInicio = juevesInicio.minus({ days: 1 });
    }
    juevesInicio = juevesInicio.startOf('day');
    
    const juevesFin = juevesInicio.plus({ days: 6 }).endOf('day');
    
    // Buscar si ya existe
    let semana = await SemanaOperativa.findOne({
      fecha_inicio: juevesInicio.toJSDate(),
      fecha_fin: juevesFin.toJSDate()
    });
    
    // Si no existe, crear
    if (!semana) {
      const codigo = `SEM-${juevesInicio.year}-${String(juevesInicio.weekNumber).padStart(2, '0')}`;
      
      semana = await SemanaOperativa.create({
        codigo,
        fecha_inicio: juevesInicio.toJSDate(),
        fecha_fin: juevesFin.toJSDate(),
        año: juevesInicio.year,
        numero_semana: juevesInicio.weekNumber,
        estado: 'ABIERTA'
      });
    }
    
    return semana;
  }
}

module.exports = new SemanaService();