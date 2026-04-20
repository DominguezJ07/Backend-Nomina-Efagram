/**
 * Middleware centralizado para gestión de usuarios
 * Maneja autenticación, autorización y validación de permisos basado en roles
 * Roles principales: SUPERVISOR y ADMINISTRADOR
 */

const { verifyToken } = require('../utils/jwtUtils');
const User = require('../Auth/models/user.model');
const { PERMISSIONS, ROLE_DESCRIPTIONS } = require('../config/permissions');
const logger = require('../utils/logger');
const { ROLES } = require('../config/constants');

/**
 * Middleware de autenticación mejorado
 * Verifica token JWT y carga información del usuario desde BD
 */
const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación requerido',
        code: 'NO_TOKEN'
      });
    }

    // Extraer token
    const token = authHeader.split(' ')[1];

    // Verificar token
    const decoded = verifyToken(token);

    // Obtener usuario actual de BD para tener datos frescos
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      logger.warn(`Token válido pero usuario no encontrado: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.activo) {
      logger.warn(`Intento de acceso de usuario inactivo: ${user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Usuario inactivo',
        code: 'USER_INACTIVE'
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      nombre: user.nombre,
      roles: user.roles || [],
      avatar: user.avatar,
      activo: user.activo,
      createdAt: user.createdAt
    };

    // Registrar acceso
    logger.info(`Usuario autenticado: ${user.email} - Roles: ${user.roles.join(', ')}`);

    // Actualizar último acceso
    if (user.ultimo_acceso) {
      const ahora = new Date();
      const diferencia = ahora - user.ultimo_acceso;
      // Actualizar solo cada 5 minutos
      if (diferencia > 5 * 60 * 1000) {
        user.ultimo_acceso = ahora;
        user.save().catch(err => logger.error('Error actualizando último acceso', err));
      }
    }

    next();
  } catch (error) {
    logger.error('Error en autenticación', { error: error.message });

    return res.status(401).json({
      success: false,
      message: error.message || 'Token inválido o expirado',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware de autorización por roles
 * Verifica que el usuario tenga al menos uno de los roles requeridos
 * @param {...String} rolesPermitidos - Roles permitidos (argumentos individuales)
 * @returns {Function} Middleware
 */
const authorize = (...rolesPermitidos) => {
  return (req, res, next) => {
    try {
      // Verificar que exista usuario autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Verificar que tenga roles
      if (!req.user.roles || req.user.roles.length === 0) {
        logger.warn(`Usuario ${req.user.id} sin roles asignados`);
        return res.status(403).json({
          success: false,
          message: 'Usuario sin roles asignados',
          code: 'NO_ROLES'
        });
      }

      // Verificar que tenga al menos uno de los roles permitidos
      const tienePermiso = req.user.roles.some(rol => rolesPermitidos.includes(rol));

      if (!tienePermiso) {
        logger.warn(
          `Acceso denegado para usuario ${req.user.email}`,
          `Roles: ${req.user.roles.join(', ')} | Requeridos: ${rolesPermitidos.join(', ')}`
        );

        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso',
          code: 'INSUFFICIENT_PERMISSIONS',
          rolesRequeridos: rolesPermitidos,
          rolesActuales: req.user.roles
        });
      }

      next();
    } catch (error) {
      logger.error('Error en autorización', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Error en verificación de permisos',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Middleware de validación de permisos granulares
 * Verifica que el usuario tenga permiso para una acción específica
 * @param {String} accion - Acción a validar (ej: 'users:create')
 * @returns {Function} Middleware
 */
const checkPermission = (accion) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
          code: 'NOT_AUTHENTICATED'
        });
      }

      // Obtener roles permitidos para esta acción
      const rolesPermitidos = PERMISSIONS[accion];

      if (!rolesPermitidos || rolesPermitidos.length === 0) {
        logger.warn(`Acción no definida en permisos: ${accion}`);
        return res.status(500).json({
          success: false,
          message: 'Acción no configurada',
          code: 'ACTION_NOT_CONFIGURED'
        });
      }

      // Verificar que tenga al menos uno de los roles permitidos
      const tienePermiso = req.user.roles.some(rol => rolesPermitidos.includes(rol));

      if (!tienePermiso) {
        logger.warn(
          `Acceso denegado a acción: ${accion} | Usuario: ${req.user.email}`,
          `Roles: ${req.user.roles.join(', ')}`
        );

        return res.status(403).json({
          success: false,
          message: `No tienes permisos para: ${accion}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          accion,
          rolesRequeridos: rolesPermitidos,
          rolesActuales: req.user.roles
        });
      }

      next();
    } catch (error) {
      logger.error('Error en checkPermission', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Error en verificación de permisos',
        code: 'PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Middleware para verificar que es el propietario del recurso o ADMIN
 * Útil para operaciones que afectan solo al propio usuario o admins
 * @returns {Function} Middleware
 */
const checkOwnerOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userId = req.params.id;
    const isOwner = req.user.id === userId;
    const isAdmin = req.user.roles.includes(ROLES.ADMIN_SISTEMA);

    if (!isOwner && !isAdmin) {
      logger.warn(
        `Intento de acceso no autorizado: ${req.user.email} intentando acceder a ${userId}`
      );

      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  } catch (error) {
    logger.error('Error en checkOwnerOrAdmin', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Error en verificación de permisos',
      code: 'PERMISSION_ERROR'
    });
  }
};

/**
 * Middleware que verifica si es SUPERVISOR o ADMIN
 * @returns {Function} Middleware
 */
const isSupervisorOrAdmin = (req, res, next) => {
  return authorize(ROLES.SUPERVISOR, ROLES.ADMIN_SISTEMA)(req, res, next);
};

/**
 * Middleware que verifica si es ADMIN
 * @returns {Function} Middleware
 */
const isAdmin = (req, res, next) => {
  return authorize(ROLES.ADMIN_SISTEMA)(req, res, next);
};

/**
 * Middleware que verifica si es TALENTO HUMANO
 * @returns {Function} Middleware
 */
const isTalentoHumano = (req, res, next) => {
  return authorize(ROLES.TALENTO_HUMANO)(req, res, next);
};

/**
 * Obtener información de un rol
 * @param {String} rol - Nombre del rol
 * @returns {Object} Información del rol
 */
const getRoleInfo = (rol) => {
  return ROLE_DESCRIPTIONS[rol] || {
    nombre: rol,
    descripcion: 'Rol sin descripción',
    nivel: 999,
    color: '#CCCCCC'
  };
};

/**
 * Middleware para obtener lista de permisos disponibles
 * @param {String} rol - Rol a consultar
 * @returns {Array} Lista de permisos
 */
const getPermissionsByRole = (rol) => {
  return Object.entries(PERMISSIONS)
    .filter(([_, roles]) => roles.includes(rol))
    .map(([accion, _]) => accion);
};

module.exports = {
  authenticate,
  authorize,
  checkPermission,
  checkOwnerOrAdmin,
  isSupervisorOrAdmin,
  isAdmin,
  isTalentoHumano,
  getRoleInfo,
  getPermissionsByRole
};
