const SemanaOperativa = require('../models/semanaOperativa.model');
const { ApiError } = require('../../middlewares/errorHandler');
const { DateTime } = require('luxon');

class SemanaService {
  /**
   * Calcular el rango de una semana jueves-jueves
   */
  calcularSemanaJueves(fecha) {
    const dt = DateTime.fromJSDate(fecha).setZone('America/Bogota');
    
    // Encontrar el jueves anterior o actual
    let juevesInicio = dt;
    while (juevesInicio.weekday !== 4) { // 4 = jueves
      juevesInicio = juevesInicio.minus({ days: 1 });
    }
    juevesInicio = juevesInicio.startOf('day');
    
    // El jueves siguiente
    const juevesFin = juevesInicio.plus({ days: 6 }).endOf('day');
    
    return {
      inicio: juevesInicio.toJSDate(),
      fin: juevesFin.toJSDate()
    };
  }

  /**
   * Obtener o crear semana operativa para una fecha
   */
  async getOrCreateSemana(fecha) {
    const rango = this.calcularSemanaJueves(fecha);
    
    let semana = await SemanaOperativa.findOne({
      fecha_inicio: rango.inicio,
      fecha_fin: rango.fin
    });

    if (!semana) {
      const dt = DateTime.fromJSDate(fecha).setZone('America/Bogota');
      const año = dt.year;
      const numeroSemana = dt.weekNumber;

      semana = await SemanaOperativa.create({
        codigo: `SEM-${año}-${String(numeroSemana).padStart(2, '0')}`,
        fecha_inicio: rango.inicio,
        fecha_fin: rango.fin,
        año,
        numero_semana: numeroSemana,
        estado: 'ABIERTA'
      });
    }

    return semana;
  }

  /**
   * Verificar si una semana puede cerrarse
   */
  async puedeObtenerSemana(semanaId) {
    return await SemanaOperativa.puedeObtener(semanaId);
  }

  /**
   * Cerrar semana operativa
   */
  async cerrarSemana(semanaId, cerradoPorId) {
    const validacion = await this.puedeObtenerSemana(semanaId);
    
    if (!validacion.puede) {
      throw new ApiError(400, validacion.motivo, validacion.pals);
    }

    const semana = await SemanaOperativa.findById(semanaId);
    if (!semana) {
      throw new ApiError(404, 'Semana no encontrada');
    }

    if (semana.estado === 'CERRADA') {
      throw new ApiError(400, 'La semana ya está cerrada');
    }

    await semana.cerrar(cerradoPorId);
    return semana;
  }

  /**
   * Obtener semana actual
   */
  async getSemanaActual() {
    let semana = await SemanaOperativa.getSemanaActual();
    
    if (!semana) {
      // Crear semana actual si no existe
      semana = await this.getOrCreateSemana(new Date());
    }
    
    return semana;
  }

  /**
   * Obtener semanas de un período
   */
  async getSemanasRango(fechaInicio, fechaFin) {
    return await SemanaOperativa.find({
      $or: [
        { fecha_inicio: { $gte: fechaInicio, $lte: fechaFin } },
        { fecha_fin: { $gte: fechaInicio, $lte: fechaFin } },
        {
          fecha_inicio: { $lte: fechaInicio },
          fecha_fin: { $gte: fechaFin }
        }
      ]
    }).sort({ fecha_inicio: -1 });
  }
}

module.exports = new SemanaService();