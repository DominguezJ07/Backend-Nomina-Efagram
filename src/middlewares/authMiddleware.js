const { verifyToken } = require('../utils/jwtUtils');
const logger = require('../utils/logger');
const { MENSAJES_ERROR } = require('../config/constants');

/**
 * Middleware de autenticación
 * Verifica que el token JWT sea válido
 */
const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido'
      });
    }

    // Extraer token
    const token = authHeader.split(' ')[1];

    // Verificar token
    const decoded = verifyToken(token);

    // Agregar información del usuario al request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles || [],
      nombre: decoded.nombre
    };

    next();
  } catch (error) {
    logger.error('Error en autenticación', { error: error.message });
    
    return res.status(401).json({
      success: false,
      message: error.message || MENSAJES_ERROR.TOKEN_INVALIDO
    });
  }
};

/**
 * Middleware de autorización por roles
 * Verifica que el usuario tenga al menos uno de los roles requeridos
 * @param {Array<String>} rolesPermitidos - Array de roles permitidos
 */
const authorize = (...rolesPermitidos) => {
  return (req, res, next) => {
    try {
      // Verificar que exista usuario autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: MENSAJES_ERROR.NO_AUTORIZADO
        });
      }

      // Verificar que tenga roles
      if (!req.user.roles || req.user.roles.length === 0) {
        logger.warn(`Usuario ${req.user.id} sin roles asignados`);
        return res.status(403).json({
          success: false,
          message: MENSAJES_ERROR.NO_AUTORIZADO
        });
      }

      // Verificar que tenga al menos uno de los roles permitidos
      const tienePermiso = req.user.roles.some(rol => 
        rolesPermitidos.includes(rol)
      );

      if (!tienePermiso) {
        logger.warn(`Acceso denegado para usuario ${req.user.id} con roles: ${req.user.roles.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: MENSAJES_ERROR.NO_AUTORIZADO,
          rolesRequeridos: rolesPermitidos,
          rolesActuales: req.user.roles
        });
      }

      next();
    } catch (error) {
      logger.error('Error en autorización', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Error en verificación de permisos'
      });
    }
  };
};

/**
 * Middleware opcional de autenticación
 * Intenta autenticar pero no falla si no hay token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);

      req.user = {
        id: decoded.id,
        email: decoded.email,
        roles: decoded.roles || [],
        nombre: decoded.nombre
      };
    }
     
    next();
  } catch (error) {
    // Continuar sin autenticar
    next();
  }
};

/**
 * Middleware para verificar que el usuario es el mismo
 * o tiene permisos de administrador
 * @param {String} paramName - Nombre del parámetro que contiene el ID del usuario
 */
const isSelfOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: MENSAJES_ERROR.NO_AUTORIZADO
        });
      }

      const targetUserId = req.params[paramName];
      const isAdmin = req.user.roles.includes('ADMIN_SISTEMA');
      const isSelf = req.user.id === targetUserId;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'Solo puedes acceder a tu propia información'
        });
      }

      next();
    } catch (error) {
      logger.error('Error en verificación de permisos', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Error en verificación de permisos'
      });
    }
  };
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  isSelfOrAdmin
};