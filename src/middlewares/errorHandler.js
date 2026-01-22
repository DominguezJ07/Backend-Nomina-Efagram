const logger = require('../utils/logger');

/**
 * Clase personalizada para errores de API
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de manejo de errores
 */
const errorHandler = (err, req, res, next) => { 
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  let details = err.details || null;

  // Errores de Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Error de validación';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `ID inválido: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Registro duplicado';
    const field = Object.keys(err.keyPattern)[0];
    details = { field, message: `El valor para '${field}' ya existe` };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // Log del error
  if (statusCode >= 500) {
    logger.error('Error del servidor', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?.id
    });
  } else {
    logger.warn('Error de cliente', {
      message: err.message,
      statusCode,
      url: req.originalUrl,
      method: req.method
    });
  }

  // Respuesta al cliente
  const response = {
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};

/**
 * Middleware para rutas no encontradas
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Ruta no encontrada: ${req.originalUrl}`);
  next(error);
};

/**
 * Wrapper para funciones async (evita try-catch repetitivos)
 * @param {Function} fn - Función async a ejecutar
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  ApiError
};