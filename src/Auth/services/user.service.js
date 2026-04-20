const User = require('../models/user.model');
const { generateToken, generateRefreshToken } = require('../../utils/jwtUtils');
const { ROLES } = require('../../config/constants');
const logger = require('../../utils/logger');

/**
 * Servicio centralizado para gestión de usuarios
 */
class UserService {
  /**
   * Obtener todos los usuarios con filtros
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Object>} Usuarios y paginación
   */
  static async obtenerTodos(filtros = {}) {
    try {
      const { page = 1, limit = 10, search, activo, rol } = filtros;

      const query = {};

      // Filtro por búsqueda (nombre o email)
      if (search) {
        query.$or = [
          { nombre: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Filtro por estado activo
      if (activo !== undefined) {
        query.activo = activo === true || activo === 'true';
      }

      // Filtro por rol
      if (rol) {
        query.roles = { $in: [rol] };
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const usuarios = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await User.countDocuments(query);

      return {
        usuarios,
        paginacion: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      logger.error('Error en obtenerTodos', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   * @param {String} id - ID del usuario
   * @returns {Promise<Object>} Usuario encontrado
   */
  static async obtenerPorId(id) {
    try {
      const usuario = await User.findById(id).select('-password').lean();

      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      return usuario;
    } catch (error) {
      logger.error('Error en obtenerPorId', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener usuario por email
   * @param {String} email - Email del usuario
   * @returns {Promise<Object>} Usuario encontrado
   */
  static async obtenerPorEmail(email) {
    try {
      const usuario = await User.findOne({ email }).lean();
      return usuario;
    } catch (error) {
      logger.error('Error en obtenerPorEmail', { error: error.message });
      throw error;
    }
  }

  /**
   * Crear nuevo usuario
   * @param {Object} datos - Datos del usuario
   * @param {String} creadoPor - ID del usuario que lo crea
   * @returns {Promise<Object>} Usuario creado y token
   */
  static async crear(datos, creadoPor = null) {
    try {
      const { nombre, email, password, roles = [ROLES.TRABAJADOR], avatar } = datos;

      // Validar que el email sea único
      const usuarioExistente = await User.findOne({ email });
      if (usuarioExistente) {
        throw new Error('El email ya está registrado');
      }

      // Validar roles
      const rolesValidos = Array.isArray(roles) ? roles : [roles];
      rolesValidos.forEach(rol => {
        if (!Object.values(ROLES).includes(rol)) {
          throw new Error(`Rol inválido: ${rol}`);
        }
      });

      // Crear usuario
      const usuarioNuevo = new User({
        nombre,
        email,
        password,
        roles: rolesValidos,
        avatar: avatar || null
      });

      await usuarioNuevo.save();

      // Generar tokens
      const tokenPayload = {
        id: usuarioNuevo._id.toString(),
        email: usuarioNuevo.email,
        roles: usuarioNuevo.roles,
        nombre: usuarioNuevo.nombre
      };

      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Registrar en log
      logger.info(`Usuario creado: ${email} (Roles: ${rolesValidos.join(', ')})`, {
        creadoPor
      });

      return {
        usuario: {
          _id: usuarioNuevo._id,
          nombre: usuarioNuevo.nombre,
          email: usuarioNuevo.email,
          roles: usuarioNuevo.roles,
          activo: usuarioNuevo.activo,
          avatar: usuarioNuevo.avatar,
          createdAt: usuarioNuevo.createdAt
        },
        tokens: {
          token,
          refreshToken
        }
      };
    } catch (error) {
      logger.error('Error en crear', { error: error.message });
      throw error;
    }
  }

  /**
   * Actualizar usuario
   * @param {String} id - ID del usuario
   * @param {Object} datos - Datos a actualizar
   * @param {String} actualizadoPor - ID del usuario que actualiza
   * @returns {Promise<Object>} Usuario actualizado
   */
  static async actualizar(id, datos, actualizadoPor = null) {
    try {
      const usuario = await User.findById(id);

      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      // Validar email si se cambia
      if (datos.email && datos.email !== usuario.email) {
        const emailExistente = await User.findOne({ email: datos.email });
        if (emailExistente) {
          throw new Error('El email ya está en uso');
        }
      }

      // Validar roles si se actualicen
      if (datos.roles) {
        const rolesValidos = Array.isArray(datos.roles) ? datos.roles : [datos.roles];
        rolesValidos.forEach(rol => {
          if (!Object.values(ROLES).includes(rol)) {
            throw new Error(`Rol inválido: ${rol}`);
          }
        });
      }

      // Actualizar campos permitidos
      const camposActualizables = ['nombre', 'email', 'roles', 'avatar', 'activo'];
      camposActualizables.forEach(campo => {
        if (datos[campo] !== undefined) {
          usuario[campo] = datos[campo];
        }
      });

      await usuario.save();

      logger.info(`Usuario actualizado: ${usuario.email}`, {
        actualizadoPor,
        cambios: datos
      });

      return {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        roles: usuario.roles,
        activo: usuario.activo,
        avatar: usuario.avatar,
        updatedAt: usuario.updatedAt
      };
    } catch (error) {
      logger.error('Error en actualizar', { error: error.message });
      throw error;
    }
  }

  /**
   * Cambiar contraseña de usuario
   * @param {String} id - ID del usuario
   * @param {String} nuevaPassword - Nueva contraseña
   * @param {String} cambiadaPor - ID del usuario que la cambia
   * @returns {Promise<void>}
   */
  static async cambiarPassword(id, nuevaPassword, cambiadaPor = null) {
    try {
      const usuario = await User.findById(id);

      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      if (!nuevaPassword || nuevaPassword.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      usuario.password = nuevaPassword;
      await usuario.save();

      logger.info(`Contraseña cambiada para: ${usuario.email}`, {
        cambiadaPor
      });
    } catch (error) {
      logger.error('Error en cambiarPassword', { error: error.message });
      throw error;
    }
  }

  /**
   * Cambiar rol de usuario
   * @param {String} id - ID del usuario
   * @param {Array<String>} nuevosRoles - Nuevos roles
   * @param {String} cambiadoPor - ID del usuario que lo realiza
   * @returns {Promise<Object>} Usuario actualizado
   */
  static async cambiarRoles(id, nuevosRoles, cambiadoPor = null) {
    try {
      // No permitir cambiar el rol del último admin
      const usuario = await User.findById(id);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      const rolesValidos = Array.isArray(nuevosRoles) ? nuevosRoles : [nuevosRoles];

      // Validar que sea admin del sistema
      if (usuario.roles.includes(ROLES.ADMIN_SISTEMA)) {
        const otrosAdmins = await User.countDocuments({
          _id: { $ne: id },
          roles: { $in: [ROLES.ADMIN_SISTEMA] },
          activo: true
        });

        if (otrosAdmins === 0 && !rolesValidos.includes(ROLES.ADMIN_SISTEMA)) {
          throw new Error('No puedes remover el rol de administrador del último admin del sistema');
        }
      }

      rolesValidos.forEach(rol => {
        if (!Object.values(ROLES).includes(rol)) {
          throw new Error(`Rol inválido: ${rol}`);
        }
      });

      usuario.roles = rolesValidos;
      await usuario.save();

      logger.info(`Roles cambiados para: ${usuario.email}`, {
        cambiadoPor,
        rolesAnteriores: usuario.roles,
        rolesNuevos: rolesValidos
      });

      return {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        roles: usuario.roles,
        activo: usuario.activo
      };
    } catch (error) {
      logger.error('Error en cambiarRoles', { error: error.message });
      throw error;
    }
  }

  /**
   * Desactivar usuario (soft delete)
   * @param {String} id - ID del usuario
   * @param {String} desactivadoPor - ID del usuario que lo desactiva
   * @returns {Promise<void>}
   */
  static async desactivar(id, desactivadoPor = null) {
    try {
      const usuario = await User.findById(id);

      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      // Validar que no sea el único admin
      if (usuario.roles.includes(ROLES.ADMIN_SISTEMA)) {
        const otrosAdmins = await User.countDocuments({
          _id: { $ne: id },
          roles: { $in: [ROLES.ADMIN_SISTEMA] },
          activo: true
        });

        if (otrosAdmins === 0) {
          throw new Error('No puedes desactivar el último administrador del sistema');
        }
      }

      usuario.activo = false;
      await usuario.save();

      logger.info(`Usuario desactivado: ${usuario.email}`, {
        desactivadoPor
      });
    } catch (error) {
      logger.error('Error en desactivar', { error: error.message });
      throw error;
    }
  }

  /**
   * Activar usuario
   * @param {String} id - ID del usuario
   * @param {String} activadoPor - ID del usuario que lo activa
   * @returns {Promise<void>}
   */
  static async activar(id, activadoPor = null) {
    try {
      const usuario = await User.findById(id);

      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      usuario.activo = true;
      await usuario.save();

      logger.info(`Usuario activado: ${usuario.email}`, {
        activadoPor
      });
    } catch (error) {
      logger.error('Error en activar', { error: error.message });
      throw error;
    }
  }

  /**
   * Eliminar usuario (hard delete - solo admin)
   * @param {String} id - ID del usuario
   * @param {String} eliminadoPor - ID del usuario que lo elimina
   * @returns {Promise<void>}
   */
  static async eliminar(id, eliminadoPor = null) {
    try {
      const usuario = await User.findById(id);

      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      // No permitir eliminar admin del sistema
      if (usuario.roles.includes(ROLES.ADMIN_SISTEMA)) {
        const otrosAdmins = await User.countDocuments({
          _id: { $ne: id },
          roles: { $in: [ROLES.ADMIN_SISTEMA] }
        });

        if (otrosAdmins === 0) {
          throw new Error('No puedes eliminar el último administrador del sistema');
        }
      }

      await User.deleteOne({ _id: id });

      logger.info(`Usuario eliminado: ${usuario.email}`, {
        eliminadoPor
      });
    } catch (error) {
      logger.error('Error en eliminar', { error: error.message });
      throw error;
    }
  }

  /**
   * Generar nuevo token para un usuario
   * @param {String} id - ID del usuario
   * @returns {Promise<Object>} Nuevos tokens
   */
  static async generarNuevoToken(id) {
    try {
      const usuario = await User.findById(id).lean();

      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      if (!usuario.activo) {
        throw new Error('El usuario está inactivo');
      }

      const tokenPayload = {
        id: usuario._id.toString(),
        email: usuario.email,
        roles: usuario.roles,
        nombre: usuario.nombre
      };

      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      return {
        token,
        refreshToken
      };
    } catch (error) {
      logger.error('Error en generarNuevoToken', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de usuarios
   * @returns {Promise<Object>} Estadísticas
   */
  static async obtenerEstadisticas() {
    try {
      const totalUsuarios = await User.countDocuments();
      const usuariosActivos = await User.countDocuments({ activo: true });
      const usuariosInactivos = await User.countDocuments({ activo: false });
      
      const porRol = {};
      for (const [rol] of Object.entries(ROLES)) {
        porRol[rol] = await User.countDocuments({ roles: { $in: [rol] } });
      }

      return {
        totalUsuarios,
        usuariosActivos,
        usuariosInactivos,
        porRol
      };
    } catch (error) {
      logger.error('Error en obtenerEstadisticas', { error: error.message });
      throw error;
    }
  }
}

module.exports = UserService;
