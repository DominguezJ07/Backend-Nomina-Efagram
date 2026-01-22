const jwt = require('jsonwebtoken');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-this';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Generar un token JWT
 * @param {Object} payload - Datos a incluir en el token
 * @param {String} expiresIn - Tiempo de expiración (opcional)
 * @returns {String} Token JWT
 */
const generateToken = (payload, expiresIn = JWT_EXPIRE) => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn,
      issuer: 'EFAGRAM-Nomina',
      audience: 'EFAGRAM-API'
    });

    return token;
  } catch (error) {
    logger.error('Error generando token JWT', { error: error.message });
    throw new Error('Error al generar token de autenticación');
  }
};

/**
 * Verificar y decodificar un token JWT
 * @param {String} token - Token a verificar
 * @returns {Object} Payload decodificado
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'EFAGRAM-Nomina',
      audience: 'EFAGRAM-API'
    });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else {
      logger.error('Error verificando token JWT', { error: error.message });
      throw new Error('Error al verificar token');
    }
  }
};

/**
 * Decodificar un token sin verificar (útil para debugging)
 * @param {String} token - Token a decodificar
 * @returns {Object} Payload decodificado
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decodificando token', { error: error.message });
    return null;
  }
};

/**
 * Generar token de refresh (mayor duración)
 * @param {Object} payload - Datos a incluir
 * @returns {String} Refresh token
 */
const generateRefreshToken = (payload) => {
  return generateToken(payload, '30d');
};

/**
 * Verificar si un token está próximo a expirar
 * @param {String} token - Token a verificar
 * @param {Number} minutesThreshold - Minutos de umbral
 * @returns {Boolean} true si está próximo a expirar
 */
const isTokenExpiringSoon = (token, minutesThreshold = 15) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return false;

    const expirationTime = decoded.exp * 1000; // Convertir a milisegundos
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;
    const thresholdMs = minutesThreshold * 60 * 1000;

    return timeUntilExpiration <= thresholdMs && timeUntilExpiration > 0;
  } catch (error) {
    return false;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  isTokenExpiringSoon
};