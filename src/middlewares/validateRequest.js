const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware para validar los resultados de express-validator
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn('Validación fallida', {
      url: req.originalUrl,
      method: req.method,
      errors: formattedErrors
    });

    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: formattedErrors
    });
  }

  next();
};

/**
 * Middleware para sanitizar datos de entrada
 * Elimina propiedades no permitidas del body
 * @param {Array<String>} allowedFields - Campos permitidos
 */
const sanitizeBody = (allowedFields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const sanitized = {};
      
      allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          sanitized[field] = req.body[field];
        }
      });

      req.body = sanitized;
    }

    next();
  };
};

/**
 * Middleware para validar IDs de MongoDB
 */
const validateMongoId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

    if (!mongoIdRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: `ID inválido: ${id}`,
        field: paramName
      });
    }

    next();
  };
};

module.exports = {
  validateRequest,
  sanitizeBody,
  validateMongoId
};
