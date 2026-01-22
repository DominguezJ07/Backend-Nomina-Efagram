const { DateTime } = require('luxon');
const { SEMANA_OPERATIVA } = require('../config/constants');

/**
 * Obtener la fecha del jueves más reciente (inicio de semana operativa)
 * @param {Date|String} date - Fecha de referencia
 * @returns {Date} Fecha del jueves de inicio
 */
const getStartOfWeek = (date = new Date()) => {
  const dt = DateTime.fromJSDate(new Date(date)).setZone('America/Bogota');
  
  // Si es jueves, retornar el mismo día
  if (dt.weekday === SEMANA_OPERATIVA.DIA_INICIO + 1) { // luxon usa 1-7, JS usa 0-6
    return dt.startOf('day').toJSDate();
  }
  
  // Calcular días hasta el jueves anterior
  let daysToSubtract = (dt.weekday + 7 - (SEMANA_OPERATIVA.DIA_INICIO + 1)) % 7;
  if (daysToSubtract === 0) daysToSubtract = 7;
  
  return dt.minus({ days: daysToSubtract }).startOf('day').toJSDate();
};

/**
 * Obtener la fecha del próximo miércoles (fin de semana operativa)
 * @param {Date|String} date - Fecha de referencia
 * @returns {Date} Fecha del miércoles de cierre
 */
const getEndOfWeek = (date = new Date()) => {
  const startOfWeek = getStartOfWeek(date);
  const dt = DateTime.fromJSDate(startOfWeek).setZone('America/Bogota');
  
  // Sumar 6 días (jueves + 6 = miércoles siguiente)
  return dt.plus({ days: 6 }).endOf('day').toJSDate();
};

/**
 * Obtener el rango completo de la semana operativa (jueves-miércoles)
 * @param {Date|String} date - Fecha de referencia
 * @returns {Object} { inicio, fin }
 */
const getWeekRange = (date = new Date()) => {
  return {
    inicio: getStartOfWeek(date),
    fin: getEndOfWeek(date)
  };
};

/**
 * Verificar si una fecha está dentro de una semana operativa específica
 * @param {Date|String} date - Fecha a verificar
 * @param {Date|String} weekStart - Inicio de la semana
 * @returns {Boolean}
 */
const isDateInWeek = (date, weekStart) => {
  const dateToCheck = DateTime.fromJSDate(new Date(date)).setZone('America/Bogota');
  const start = DateTime.fromJSDate(new Date(weekStart)).setZone('America/Bogota');
  const end = start.plus({ days: 6 });
  
  return dateToCheck >= start && dateToCheck <= end;
};

/**
 * Formatear fecha en formato colombiano
 * @param {Date|String} date - Fecha a formatear
 * @returns {String} Fecha formateada (DD/MM/YYYY)
 */
const formatDateCO = (date) => {
  const dt = DateTime.fromJSDate(new Date(date)).setZone('America/Bogota');
  return dt.toFormat('dd/MM/yyyy');
};

/**
 * Formatear fecha y hora en formato colombiano
 * @param {Date|String} date - Fecha a formatear
 * @returns {String} Fecha y hora formateada (DD/MM/YYYY HH:mm:ss)
 */
const formatDateTimeCO = (date) => {
  const dt = DateTime.fromJSDate(new Date(date)).setZone('America/Bogota');
  return dt.toFormat('dd/MM/yyyy HH:mm:ss');
};

/**
 * Obtener el número de semana del año
 * @param {Date|String} date - Fecha de referencia
 * @returns {Number} Número de semana
 */
const getWeekNumber = (date = new Date()) => {
  const dt = DateTime.fromJSDate(new Date(date)).setZone('America/Bogota');
  return dt.weekNumber;
};

/**
 * Calcular diferencia en días entre dos fechas
 * @param {Date|String} startDate - Fecha inicial
 * @param {Date|String} endDate - Fecha final
 * @returns {Number} Días de diferencia
 */
const getDaysDifference = (startDate, endDate) => {
  const start = DateTime.fromJSDate(new Date(startDate)).setZone('America/Bogota');
  const end = DateTime.fromJSDate(new Date(endDate)).setZone('America/Bogota');
  
  return Math.floor(end.diff(start, 'days').days);
};

/**
 * Verificar si una fecha es válida
 * @param {*} date - Valor a verificar
 * @returns {Boolean}
 */
const isValidDate = (date) => {
  try {
    const dt = DateTime.fromJSDate(new Date(date));
    return dt.isValid;
  } catch {
    return false;
  }
};

/**
 * Obtener fecha actual en zona horaria de Colombia
 * @returns {Date}
 */
const getNowCO = () => {
  return DateTime.now().setZone('America/Bogota').toJSDate();
};

/**
 * Verificar si una fecha es jueves
 * @param {Date|String} date - Fecha a verificar
 * @returns {Boolean}
 */
const isThursday = (date) => {
  const dt = DateTime.fromJSDate(new Date(date)).setZone('America/Bogota');
  return dt.weekday === 4; // Jueves es 4 en luxon (lunes=1)
};

/**
 * Generar array de semanas para un rango de fechas
 * @param {Date|String} startDate - Fecha inicial
 * @param {Date|String} endDate - Fecha final
 * @returns {Array} Array de objetos { inicio, fin }
 */
const generateWeeksInRange = (startDate, endDate) => {
  const weeks = [];
  let currentStart = getStartOfWeek(startDate);
  const end = new Date(endDate);
  
  while (currentStart <= end) {
    const weekEnd = getEndOfWeek(currentStart);
    weeks.push({
      inicio: currentStart,
      fin: weekEnd
    });
    
    // Siguiente semana (jueves + 7 días)
    currentStart = DateTime.fromJSDate(currentStart)
      .plus({ days: 7 })
      .toJSDate();
  }
  
  return weeks;
};

/**
 * Obtener el nombre del día de la semana en español
 * @param {Date|String} date - Fecha
 * @returns {String} Nombre del día
 */
const getDayNameES = (date) => {
  const dt = DateTime.fromJSDate(new Date(date)).setZone('America/Bogota');
  return dt.setLocale('es').toFormat('cccc'); // "jueves", "viernes", etc.
};

module.exports = {
  getStartOfWeek,
  getEndOfWeek,
  getWeekRange,
  isDateInWeek,
  formatDateCO,
  formatDateTimeCO,
  getWeekNumber,
  getDaysDifference,
  isValidDate,
  getNowCO,
  isThursday,
  generateWeeksInRange,
  getDayNameES
};
